/* eslint-env node */
import { googleJsonFetch } from "./_google-rest.js";

const SHEETS_SCOPE = ["https://www.googleapis.com/auth/spreadsheets"];

export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    const spreadsheetId = process.env.GOOGLE_SHEETS_DATABASE_ID;

    const requestId = body?.metadata?.requestId || "";
    const createdAt = body?.metadata?.createdAt || new Date().toISOString();
    const createdBy = body?.metadata?.createdBy || "";
    const status = body?.metadata?.status || "Draft";
    const driveFolderId = body?.metadata?.driveFolderId || "";

    const row = [
      requestId,
      createdAt,
      createdBy,
      status,
      body?.customer?.customerName || "",
      body?.customer?.contactPerson || "",
      body?.customer?.countryMarket || "",
      body?.customer?.deliveryLocation || "",
      body?.customer?.projectName || "",
      body?.customer?.projectType || "",
      body?.product?.productType || "",
      body?.product?.productMaterial || "",
      body?.decoration?.decorationType || "",
      JSON.stringify(body),
      driveFolderId,
    ];

    const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Requests_Master!A:A`;
    const existing = await googleJsonFetch(getUrl, {
      scopes: SHEETS_SCOPE,
    });

    const rows = existing.values || [];
    let rowIndex = -1;

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === requestId) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) {
      const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Requests_Master!A:O:append?valueInputOption=USER_ENTERED`;
      await googleJsonFetch(appendUrl, {
        method: "POST",
        scopes: SHEETS_SCOPE,
        body: {
          values: [row],
        },
      });
    } else {
      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Requests_Master!A${rowIndex}:O${rowIndex}?valueInputOption=USER_ENTERED`;
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
        message: rowIndex === -1 ? "Draft created successfully" : "Draft updated successfully",
        requestId,
      }),
    };
  } catch (error) {
    console.error("SAVE DRAFT ERROR:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
}