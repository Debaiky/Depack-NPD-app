/* eslint-env node */
import { googleJsonFetch } from "./_google-rest.js";

const SHEETS_SCOPE = ["https://www.googleapis.com/auth/spreadsheets"];

export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");

    const requestId = body?.requestId || "";
    const fileName = body?.fileName || "";
    const fileType = body?.fileType || "";
    const category = body?.category || "";
    const driveFileId = body?.driveFileId || "";
    const driveLink = body?.driveLink || "";

    if (!requestId || !fileName || !driveFileId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "Missing requestId, fileName or driveFileId",
        }),
      };
    }

    const spreadsheetId = process.env.GOOGLE_SHEETS_DATABASE_ID;

    const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Requests_Files!A:G`;

    const existing = await googleJsonFetch(readUrl, {
      scopes: SHEETS_SCOPE,
    });

    const rows = existing.values || [];
    const dataRows = rows.slice(1);

    const alreadyExists = dataRows.some((row) => {
      return (
        (row[0] || "") === requestId &&
        (row[1] || "") === fileName &&
        (row[4] || "") === driveFileId
      );
    });

    if (alreadyExists) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          skipped: true,
          message: "File record already exists",
        }),
      };
    }

    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Requests_Files!A:G:append?valueInputOption=USER_ENTERED`;

    await googleJsonFetch(appendUrl, {
      method: "POST",
      scopes: SHEETS_SCOPE,
      body: {
        values: [[
          requestId,
          fileName,
          fileType,
          category,
          driveFileId,
          driveLink,
          new Date().toISOString(),
        ]],
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
      }),
    };
  } catch (error) {
    console.error("SAVE FILE RECORD ERROR:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
}