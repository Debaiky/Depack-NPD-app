/* eslint-env node */
import { googleJsonFetch } from "./_google-rest.js";

const SHEETS_SCOPE = ["https://www.googleapis.com/auth/spreadsheets"];

export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    const spreadsheetId = process.env.GOOGLE_SHEETS_DATABASE_ID;

    const requestId = String(body.requestId || "").trim();
    const customers = Array.isArray(body.customers) ? body.customers : [];

    if (!requestId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "Missing requestId",
        }),
      };
    }

    const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Request_Customers!A:D`;
    const existing = await googleJsonFetch(readUrl, { scopes: SHEETS_SCOPE });
    const rows = existing.values || [];

    const filteredExisting = rows.filter((row, idx) => {
      if (idx === 0) return true;
      return String(row[0] || "").trim() !== requestId;
    });

    const now = new Date().toISOString();

    const newRows = customers.map((c) => [
      requestId,
      c.customerId || "",
      c.customerName || "",
      now,
    ]);

    const finalRows = [filteredExisting[0] || ["RequestID", "CustomerID", "CustomerName", "AddedAt"], ...filteredExisting.slice(1), ...newRows];

    const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Request_Customers!A:D:clear`;
    await googleJsonFetch(clearUrl, {
      method: "POST",
      scopes: SHEETS_SCOPE,
      body: {},
    });

    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Request_Customers!A:D?valueInputOption=USER_ENTERED`;
    await googleJsonFetch(updateUrl, {
      method: "PUT",
      scopes: SHEETS_SCOPE,
      body: {
        values: finalRows,
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
      }),
    };
  } catch (error) {
    console.error("SAVE REQUEST CUSTOMERS ERROR:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
}