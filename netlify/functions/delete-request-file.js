/* eslint-env node */
import { googleJsonFetch } from "./_google-rest.js";
import { deleteDriveFile } from "./_drive.js";

const SHEETS_SCOPE = ["https://www.googleapis.com/auth/spreadsheets"];

export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    const { rowIndex, driveFileId } = body;
    const spreadsheetId = process.env.GOOGLE_SHEETS_DATABASE_ID;

    if (!rowIndex || !driveFileId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "Missing rowIndex or driveFileId",
        }),
      };
    }

    await deleteDriveFile(driveFileId);

    const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Requests_Files!A${rowIndex}:G${rowIndex}?valueInputOption=USER_ENTERED`;

    await googleJsonFetch(clearUrl, {
      method: "PUT",
      scopes: SHEETS_SCOPE,
      body: {
        values: [["", "", "", "", "", "", ""]],
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
      }),
    };
  } catch (error) {
    console.error("DELETE REQUEST FILE ERROR:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
}