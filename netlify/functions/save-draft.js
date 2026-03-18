/* eslint-env node */
import { google } from "googleapis";

function getAuth() {
  return new google.auth.JWT({
    email: process.env.NETLIFY_GOOGLE_CLIENT_EMAIL,
    key: process.env.NETLIFY_GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");

    const auth = getAuth();
    await auth.authorize();

    const sheets = google.sheets({ version: "v4", auth });
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

    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Requests_Master!A:A",
    });

    const rows = existing.data.values || [];
    let rowIndex = -1;

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === requestId) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "Requests_Master!A:O",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [row],
        },
      });
    } else {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Requests_Master!A${rowIndex}:O${rowIndex}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
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