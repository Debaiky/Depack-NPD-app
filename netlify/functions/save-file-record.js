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

    const {
      requestId,
      fileName,
      fileType,
      category,
      driveFileId,
      driveLink,
    } = body;

    const auth = getAuth();
    await auth.authorize();

    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_DATABASE_ID;

    const row = [
      requestId,
      fileName,
      fileType,
      category,
      driveFileId,
      driveLink,
      new Date().toISOString(),
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Requests_Files!A:G",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [row],
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
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