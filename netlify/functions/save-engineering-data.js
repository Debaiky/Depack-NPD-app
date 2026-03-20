/* eslint-env node */
import { googleJsonFetch } from "./_google-rest.js";

const SHEETS_SCOPE = ["https://www.googleapis.com/auth/spreadsheets"];

export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");

    const requestId = body?.requestId || "";
    const status = body?.status || "Under Engineering Review";
    const engineerName = body?.engineerName || "";
    const engineeringData = body?.engineeringData || {};
    const note = body?.note || "";

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

    const existing = await googleJsonFetch(readUrl, {
      scopes: SHEETS_SCOPE,
    });

    const rows = existing.values || [];
    let rowIndex = -1;

    for (let i = 1; i < rows.length; i++) {
      if ((rows[i][0] || "") === requestId) {
        rowIndex = i + 1;
        break;
      }
    }

    const row = [
      requestId,
      status,
      engineerName,
      new Date().toISOString(),
      JSON.stringify(engineeringData),
      note,
    ];

    if (rowIndex === -1) {
      const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Engineering_Data!A:F:append?valueInputOption=USER_ENTERED`;

      await googleJsonFetch(appendUrl, {
        method: "POST",
        scopes: SHEETS_SCOPE,
        body: {
          values: [row],
        },
      });
    } else {
      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Engineering_Data!A${rowIndex}:F${rowIndex}?valueInputOption=USER_ENTERED`;

      await googleJsonFetch(updateUrl, {
        method: "PUT",
        scopes: SHEETS_SCOPE,
        body: {
          values: [row],
        },
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
      }),
    };
  } catch (error) {
    console.error("SAVE ENGINEERING DATA ERROR:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
}