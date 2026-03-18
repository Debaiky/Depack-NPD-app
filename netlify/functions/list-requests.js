/* eslint-env node */
import { google } from "googleapis";

function getAuth() {
  return new google.auth.JWT({
    email: process.env.NETLIFY_GOOGLE_CLIENT_EMAIL,
    key: process.env.NETLIFY_GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export async function handler() {
  try {
    const auth = getAuth();
    await auth.authorize();

    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_DATABASE_ID;

    const requestsResult = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Requests_Master!A:O",
    });

    const filesResult = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Requests_Files!A:G",
    });

    const requestRows = requestsResult.data.values || [];
    const requestHeaders = requestRows[0] || [];
    const requestDataRows = requestRows.slice(1);

    const fileRows = filesResult.data.values || [];
    const fileDataRows = fileRows.slice(1);

    const fileCountMap = {};

    for (const row of fileDataRows) {
      const requestId = row[0] || "";
      if (!requestId) continue;
      fileCountMap[requestId] = (fileCountMap[requestId] || 0) + 1;
    }

    const requests = requestDataRows.map((row) => {
      const obj = {};
      requestHeaders.forEach((header, index) => {
        obj[header] = row[index] || "";
      });

      obj.FileCount = fileCountMap[obj.RequestID] || 0;
      return obj;
    });

    requests.sort((a, b) => {
      const aDate = new Date(a.CreatedDate || 0).getTime();
      const bDate = new Date(b.CreatedDate || 0).getTime();
      return bDate - aDate;
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        requests,
      }),
    };
  } catch (error) {
    console.error("LIST REQUESTS ERROR:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
}