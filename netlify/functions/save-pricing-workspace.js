const { google } = require("googleapis");
const crypto = require("crypto");

const SHEET_NAME = "PricingWorkspaces";

const HEADERS = [
  "RequestID",
  "WorkspaceID",
  "Status",
  "CustomerName",
  "ProjectName",
  "ProductName",
  "ProductType",
  "Material",
  "ThumbnailUrl",
  "ThumbnailBase64",
  "CreatedAt",
  "UpdatedAt",
];

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

function cleanValue(value) {
  if (value === undefined || value === null) return "";
  return String(value);
}

function normalizePrivateKey(key) {
  return String(key || "").replace(/\\n/g, "\n");
}

function makeWorkspaceId(requestId) {
  const safe = cleanValue(requestId).replace(/[^a-zA-Z0-9_-]/g, "");
  const short = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `PW-${safe || "REQ"}-${short}`;
}

async function getSheetsClient() {
  const clientEmail = process.env.NETLIFY_GOOGLE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.NETLIFY_GOOGLE_PRIVATE_KEY);

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Missing Google credentials. Check NETLIFY_GOOGLE_CLIENT_EMAIL and NETLIFY_GOOGLE_PRIVATE_KEY."
    );
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  await auth.authorize();

  return google.sheets({
    version: "v4",
    auth,
  });
}

async function ensureSheetExists(sheets, spreadsheetId) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
  });

  const sheetExists = (meta.data.sheets || []).some(
    (s) => s.properties && s.properties.title === SHEET_NAME
  );

  if (!sheetExists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: SHEET_NAME,
              },
            },
          },
        ],
      },
    });
  }
}

async function ensureHeaders(sheets, spreadsheetId) {
  const read = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!1:1`,
  });

  const firstRow = read.data.values?.[0] || [];
  const needsHeaders =
    firstRow.length === 0 ||
    HEADERS.some((header, idx) => cleanValue(firstRow[idx]) !== header);

  if (needsHeaders) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAME}!1:1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [HEADERS],
      },
    });
  }
}

function rowToObject(headers, row) {
  const obj = {};
  headers.forEach((header, idx) => {
    obj[header] = row[idx] || "";
  });
  return obj;
}

function objectToRow(headers, obj) {
  return headers.map((header) => cleanValue(obj[header]));
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return json(405, { success: false, error: "Method not allowed" });
    }

    const spreadsheetId = process.env.GOOGLE_SHEETS_DATABASE_ID;
    if (!spreadsheetId) {
      return json(500, {
        success: false,
        error: "Missing GOOGLE_SHEETS_DATABASE_ID",
      });
    }

    const body = JSON.parse(event.body || "{}");

    const requestId = cleanValue(body.requestId).trim();
    if (!requestId) {
      return json(400, {
        success: false,
        error: "requestId is required",
      });
    }

    const status = cleanValue(body.status || "Pending pricing");
    const customerName = cleanValue(body.customerName);
    const projectName = cleanValue(body.projectName);
    const productName = cleanValue(body.productName);
    const productType = cleanValue(body.productType);
    const material = cleanValue(body.material);
    const thumbnailUrl = cleanValue(body.thumbnailUrl);
    const thumbnailBase64 = cleanValue(body.thumbnailBase64);

    const now = new Date().toISOString();

    const sheets = await getSheetsClient();

    await ensureSheetExists(sheets, spreadsheetId);
    await ensureHeaders(sheets, spreadsheetId);

    const read = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_NAME}!A:Z`,
    });

    const rows = read.data.values || [];
    const headers = rows[0] || HEADERS;
    const dataRows = rows.slice(1);

    const existingIndex = dataRows.findIndex((row) => cleanValue(row[0]) === requestId);

    if (existingIndex >= 0) {
      const sheetRowNumber = existingIndex + 2;
      const existing = rowToObject(headers, dataRows[existingIndex]);

      const updatedRow = {
        ...existing,
        RequestID: requestId,
        WorkspaceID: cleanValue(existing.WorkspaceID) || makeWorkspaceId(requestId),
        Status: status,
        CustomerName: customerName || existing.CustomerName || "",
        ProjectName: projectName || existing.ProjectName || "",
        ProductName: productName || existing.ProductName || "",
        ProductType: productType || existing.ProductType || "",
        Material: material || existing.Material || "",
        ThumbnailUrl: thumbnailUrl || existing.ThumbnailUrl || "",
        ThumbnailBase64: thumbnailBase64 || existing.ThumbnailBase64 || "",
        CreatedAt: cleanValue(existing.CreatedAt) || now,
        UpdatedAt: now,
      };

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_NAME}!A${sheetRowNumber}:L${sheetRowNumber}`,
        valueInputOption: "RAW",
        requestBody: {
          values: [objectToRow(HEADERS, updatedRow)],
        },
      });

      return json(200, {
        success: true,
        mode: "updated",
        workspaceId: updatedRow.WorkspaceID,
        rowNumber: sheetRowNumber,
      });
    }

    const newRow = {
      RequestID: requestId,
      WorkspaceID: makeWorkspaceId(requestId),
      Status: status,
      CustomerName: customerName,
      ProjectName: projectName,
      ProductName: productName,
      ProductType: productType,
      Material: material,
      ThumbnailUrl: thumbnailUrl,
      ThumbnailBase64: thumbnailBase64,
      CreatedAt: now,
      UpdatedAt: now,
    };

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_NAME}!A:L`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [objectToRow(HEADERS, newRow)],
      },
    });

    return json(200, {
      success: true,
      mode: "created",
      workspaceId: newRow.WorkspaceID,
    });
  } catch (error) {
    console.error("save-pricing-workspace error:", error);
    return json(500, {
      success: false,
      error: error.message || "Failed to save pricing workspace",
    });
  }
};