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
    const requestId = event.queryStringParameters?.requestId;

    if (!requestId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "Missing requestId",
        }),
      };
    }

    const auth = getAuth();
    await auth.authorize();

    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_DATABASE_ID;

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Requests_Master!A:N",
    });

    const rows = result.data.values || [];
    const headers = rows[0] || [];
    const dataRows = rows.slice(1);

    const found = dataRows.find((row) => row[0] === requestId);

    if (!found) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: "Request not found",
        }),
      };
    }

    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = found[index] || "";
    });

    let payload = {};
    try {
      payload = JSON.parse(obj.PayloadJSON || "{}");
    } catch {
      payload = {};
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        request: obj,
        payload,
      }),
    };
  } catch (error) {
    console.error("GET REQUEST ERROR:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
}