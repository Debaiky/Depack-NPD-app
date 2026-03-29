const { google } = require("googleapis");

const SHEET_ID = process.env.GOOGLE_SHEETS_DATABASE_ID;
const CLIENT_EMAIL =
  process.env.NETLIFY_GOOGLE_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;

const PRIVATE_KEY = (
  process.env.NETLIFY_GOOGLE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY || ""
).replace(/\\n/g, "\n");

const SCENARIO_SHEET = "Pricing_Scenarios";

async function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: CLIENT_EMAIL,
    key: PRIVATE_KEY,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  await auth.authorize();

  return google.sheets({
    version: "v4",
    auth,
  });
}

async function getAllScenarioRows() {
  const sheets = await getSheetsClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SCENARIO_SHEET}!A:K`,
  });

  const rows = res.data.values || [];
  if (rows.length === 0) return [];

  const headers = rows[0];

  return rows.slice(1).map((row, idx) => {
    const obj = { _rowIndex: idx + 2 };
    headers.forEach((h, i) => {
      obj[h] = row[i] || "";
    });
    return obj;
  });
}

function makePricingId(requestId, existingRows) {
  const related = existingRows.filter((r) => r.RequestID === requestId);
  const next = related.length + 1;
  return `${requestId}-P${String(next).padStart(3, "0")}`;
}

async function appendScenarioRow(rowObj) {
  const sheets = await getSheetsClient();

  const row = [
    rowObj.PricingID || "",
    rowObj.RequestID || "",
    rowObj.ScenarioName || "",
    rowObj.ScenarioNote || "",
    rowObj.CreatedBy || "",
    rowObj.CreatedDate || "",
    rowObj.ScenarioStatus || "",
    rowObj.PricingJSON || "",
    rowObj.TotalCostPer1000 || "",
    rowObj.SellingPricePer1000 || "",
    rowObj.MarginPct || "",
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${SCENARIO_SHEET}!A:K`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [row],
    },
  });
}

async function updateScenarioRow(rowIndex, rowObj) {
  const sheets = await getSheetsClient();

  const row = [
    rowObj.PricingID || "",
    rowObj.RequestID || "",
    rowObj.ScenarioName || "",
    rowObj.ScenarioNote || "",
    rowObj.CreatedBy || "",
    rowObj.CreatedDate || "",
    rowObj.ScenarioStatus || "",
    rowObj.PricingJSON || "",
    rowObj.TotalCostPer1000 || "",
    rowObj.SellingPricePer1000 || "",
    rowObj.MarginPct || "",
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${SCENARIO_SHEET}!A${rowIndex}:K${rowIndex}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [row],
    },
  });
}

module.exports = {
  getAllScenarioRows,
  appendScenarioRow,
  updateScenarioRow,
  makePricingId,
};