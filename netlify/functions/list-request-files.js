/* eslint-env node */
import { googleJsonFetch } from "./_google-rest.js";

const SHEETS_SCOPE = ["https://www.googleapis.com/auth/spreadsheets"];

export async function handler(event) {
  try {
    const requestId = event.queryStringParameters?.requestId;
    const spreadsheetId = process.env.GOOGLE_SHEETS_DATABASE_ID;

    if (!requestId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "Missing requestId",
        }),
      };
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Requests_Files!A:G`;

    const data = await googleJsonFetch(url, {
      scopes: SHEETS_SCOPE,
    });

    const rows = data.values || [];
    const fileRows = rows.slice(1);

    const files = fileRows
      .map((row, index) => ({
        rowIndex: index + 2,
        requestId: row[0] || "",
        fileName: row[1] || "",
        fileType: row[2] || "",
        category: row[3] || "",
        driveFileId: row[4] || "",
        driveLink: row[5] || "",
        uploadedAt: row[6] || "",
      }))
      .filter((file) => file.requestId === requestId && file.driveFileId);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        files,
      }),
    };
  } catch (error) {
    console.error("LIST REQUEST FILES ERROR:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
}