/* eslint-env node */
import { googleJsonFetch } from "./_google-rest.js";

const SHEETS_SCOPE = ["https://www.googleapis.com/auth/spreadsheets"];

export async function findRequestRowById(spreadsheetId, requestId) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Requests_Master!A:O`;

  const data = await googleJsonFetch(url, {
    scopes: SHEETS_SCOPE,
  });

  const rows = data.values || [];
  const headers = rows[0] || [];

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === requestId) {
      return {
        rowIndex: i + 1,
        headers,
        row: rows[i],
      };
    }
  }

  return null;
}

export async function updateDriveFolderId(spreadsheetId, rowIndex, folderId) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Requests_Master!O${rowIndex}?valueInputOption=USER_ENTERED`;

  await googleJsonFetch(url, {
    method: "PUT",
    scopes: SHEETS_SCOPE,
    body: {
      values: [[folderId]],
    },
  });
}