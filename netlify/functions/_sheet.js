/* eslint-env node */
import { google } from "googleapis";

function getAuth() {
  return new google.auth.JWT({
    email: process.env.NETLIFY_GOOGLE_CLIENT_EMAIL,
    key: process.env.NETLIFY_GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export async function getSheetsClient() {
  const auth = getAuth();
  await auth.authorize();
  return google.sheets({ version: "v4", auth });
}

export async function findRequestRowById(spreadsheetId, requestId) {
  const sheets = await getSheetsClient();

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Requests_Master!A:O",
  });

  const rows = existing.data.values || [];
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
  const sheets = await getSheetsClient();

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Requests_Master!O${rowIndex}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[folderId]],
    },
  });
}