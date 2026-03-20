/* eslint-env node */
import { googleJsonFetch } from "./_google-rest.js";

const SHEETS_SCOPE = ["https://www.googleapis.com/auth/spreadsheets"];

export async function handler(event) {
  try {
    const requestId = event.queryStringParameters?.requestId || "";

    if (!requestId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "Missing requestId",
        }),
      };
    }

    const spreadsheetId = process.env.GOOGLE_SHEETS_DATABASE_ID;

    const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Engineering_Data!A:F`;

    const data = await googleJsonFetch(readUrl, {
      scopes: SHEETS_SCOPE,
    });

    const rows = data.values || [];

    for (let i = 1; i < rows.length; i++) {
      if ((rows[i][0] || "") === requestId) {
        let engineeringJson = {};
        try {
          engineeringJson = JSON.parse(rows[i][4] || "{}");
        } catch {
          engineeringJson = {};
        }

        return {
          statusCode: 200,
          body: JSON.stringify({
            success: true,
            requestId: rows[i][0] || "",
            status: rows[i][1] || "",
            engineerName: rows[i][2] || "",
            savedAt: rows[i][3] || "",
            engineeringData: engineeringJson,
            note: rows[i][5] || "",
          }),
        };
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        engineeringData: null,
      }),
    };
  } catch (error) {
    console.error("GET ENGINEERING DATA ERROR:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
}