const { google } = require("googleapis");

/* ================= CONFIG ================= */

const SHEET_ID = process.env.GOOGLE_SHEETS_DATABASE_ID;

const REQUESTS_SHEET = "Requests_Master";
const ENGINEERING_SHEET = "Engineering_Data";
const PRICING_SHEET = "Pricing_Scenarios";
const PRICING_WORKSPACES_SHEET = "Pricing_Workspaces";

/* ================= AUTH ================= */

async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email:
        process.env.NETLIFY_GOOGLE_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL,
      private_key: (
        process.env.NETLIFY_GOOGLE_PRIVATE_KEY ||
        process.env.GOOGLE_PRIVATE_KEY ||
        ""
      ).replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

/* ================= GENERIC HELPERS ================= */

async function getSheetValues(sheetName) {
  const sheets = await getSheetsClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!A:ZZ`,
  });

  return res.data.values || [];
}

function rowsToObjects(rows) {
  if (!rows || rows.length === 0) return [];

  const headers = rows[0];
  return rows.slice(1).map((row, idx) => {
    const obj = { _rowIndex: idx + 2 };
    headers.forEach((h, i) => {
      obj[h] = row[i] || "";
    });
    return obj;
  });
}

async function getAllRows(sheetName) {
  const rows = await getSheetValues(sheetName);
  return rowsToObjects(rows);
}

async function appendRow(sheetName, data) {
  const sheets = await getSheetsClient();
  const rows = await getSheetValues(sheetName);

  if (!rows.length) {
    throw new Error(`Sheet ${sheetName} is empty or missing headers`);
  }

  const headers = rows[0];
  const row = headers.map((h) => data[h] ?? "");

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!A:ZZ`,
    valueInputOption: "RAW",
    requestBody: {
      values: [row],
    },
  });

  return true;
}

async function updateRowByIndex(sheetName, rowIndex, data) {
  const sheets = await getSheetsClient();
  const rows = await getSheetValues(sheetName);

  if (!rows.length) {
    throw new Error(`Sheet ${sheetName} is empty or missing headers`);
  }

  const headers = rows[0];
  const currentRow = rows[rowIndex - 1] || new Array(headers.length).fill("");

  headers.forEach((h, i) => {
    if (Object.prototype.hasOwnProperty.call(data, h)) {
      currentRow[i] = data[h] ?? "";
    }
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!A${rowIndex}:ZZ${rowIndex}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [currentRow],
    },
  });

  return true;
}

async function findRowIndexByField(sheetName, fieldName, fieldValue) {
  const rows = await getSheetValues(sheetName);

  if (!rows.length) return null;

  const headers = rows[0];
  const fieldIndex = headers.indexOf(fieldName);

  if (fieldIndex === -1) {
    throw new Error(`Field ${fieldName} not found in ${sheetName}`);
  }

  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][fieldIndex] || "") === fieldValue) {
      return i + 1;
    }
  }

  return null;
}

async function getRowByField(sheetName, fieldName, fieldValue) {
  const rows = await getAllRows(sheetName);
  return rows.find((r) => r[fieldName] === fieldValue) || null;
}

/* ================= REQUESTS MASTER ================= */

async function findRequestRowById(requestId) {
  return await findRowIndexByField(REQUESTS_SHEET, "RequestID", requestId);
}

async function getRequestRowById(requestId) {
  return await getRowByField(REQUESTS_SHEET, "RequestID", requestId);
}

async function updateRequestRow(requestId, fields) {
  const rowIndex = await findRequestRowById(requestId);

  if (!rowIndex) {
    throw new Error("Request not found");
  }

  return await updateRowByIndex(REQUESTS_SHEET, rowIndex, fields);
}

/* ================= ENGINEERING DATA ================= */

async function findEngineeringRowByRequestId(requestId) {
  return await findRowIndexByField(ENGINEERING_SHEET, "RequestID", requestId);
}

async function getEngineeringRowByRequestId(requestId) {
  return await getRowByField(ENGINEERING_SHEET, "RequestID", requestId);
}

async function upsertEngineeringRow({
  RequestID,
  Status,
  EngineerName,
  SavedAt,
  EngineeringJSON,
  Note,
}) {
  const existingRowIndex = await findEngineeringRowByRequestId(RequestID);

  const rowData = {
    RequestID: RequestID || "",
    Status: Status || "",
    EngineerName: EngineerName || "",
    SavedAt: SavedAt || "",
    EngineeringJSON: EngineeringJSON || "",
    Note: Note || "",
  };

  if (existingRowIndex) {
    return await updateRowByIndex(ENGINEERING_SHEET, existingRowIndex, rowData);
  }

  return await appendRow(ENGINEERING_SHEET, rowData);
}

/* ================= PRICING WORKSPACES ================= */

async function getPricingWorkspaceByRequestId(requestId) {
  return await getRowByField(PRICING_WORKSPACES_SHEET, "RequestID", requestId);
}

async function findPricingWorkspaceRowByRequestId(requestId) {
  return await findRowIndexByField(PRICING_WORKSPACES_SHEET, "RequestID", requestId);
}

async function upsertPricingWorkspace({
  RequestID,
  WorkspacePassword,
}) {
  const rowData = {
    RequestID: RequestID || "",
    WorkspacePassword: WorkspacePassword || "",
  };

  const existingRowIndex = await findPricingWorkspaceRowByRequestId(RequestID);

  if (existingRowIndex) {
    return await updateRowByIndex(PRICING_WORKSPACES_SHEET, existingRowIndex, rowData);
  }

  return await appendRow(PRICING_WORKSPACES_SHEET, rowData);
}

/* ================= PRICING SCENARIOS ================= */

async function getPricingScenariosByRequestId(requestId) {
  const rows = await getAllRows(PRICING_SHEET);
  return rows.filter((r) => r.RequestID === requestId);
}

async function getPricingScenarioById(pricingId) {
  return await getRowByField(PRICING_SHEET, "PricingID", pricingId);
}

async function findPricingScenarioRowById(pricingId) {
  return await findRowIndexByField(PRICING_SHEET, "PricingID", pricingId);
}

function makePricingId(requestId, existingRows) {
  const related = existingRows.filter((r) => r.RequestID === requestId);
  const next = related.length + 1;
  return `${requestId}-P${String(next).padStart(3, "0")}`;
}

async function upsertPricingScenario({
  PricingID,
  RequestID,
  ScenarioName,
  ScenarioNote,
  CreatedBy,
  CreatedDate,
  ScenarioStatus,
  PricingJSON,
  TotalCostPer1000,
  SellingPricePer1000,
  MarginPct,
  CompareSelected,
  ScenarioCurrency,
  UsdEgp,
  EurUsd,
}) {
  const rowData = {
    PricingID: PricingID || "",
    RequestID: RequestID || "",
    ScenarioName: ScenarioName || "",
    ScenarioNote: ScenarioNote || "",
    CreatedBy: CreatedBy || "",
    CreatedDate: CreatedDate || "",
    ScenarioStatus: ScenarioStatus || "",
    PricingJSON: PricingJSON || "",
    TotalCostPer1000: TotalCostPer1000 || "",
    SellingPricePer1000: SellingPricePer1000 || "",
    MarginPct: MarginPct || "",
    CompareSelected: CompareSelected || "No",
    ScenarioCurrency: ScenarioCurrency || "",
    UsdEgp: UsdEgp || "",
    EurUsd: EurUsd || "",
  };

  const existingRowIndex = PricingID
    ? await findPricingScenarioRowById(PricingID)
    : null;

  if (existingRowIndex) {
    return await updateRowByIndex(PRICING_SHEET, existingRowIndex, rowData);
  }

  return await appendRow(PRICING_SHEET, rowData);
}

/* ================= EXPORTS ================= */

module.exports = {
  getSheetsClient,
  getAllRows,
  appendRow,
  updateRowByIndex,
  findRowIndexByField,
  getRowByField,

  findRequestRowById,
  getRequestRowById,
  updateRequestRow,

  findEngineeringRowByRequestId,
  getEngineeringRowByRequestId,
  upsertEngineeringRow,

  getPricingWorkspaceByRequestId,
  findPricingWorkspaceRowByRequestId,
  upsertPricingWorkspace,

  getPricingScenariosByRequestId,
  getPricingScenarioById,
  findPricingScenarioRowById,
  makePricingId,
  upsertPricingScenario,
};