/* eslint-env node */
import { Readable } from "node:stream";
import { getDriveClient } from "./_drive.js";

export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");

    const folderId = body?.folderId;
    const fileName = body?.fileName;
    const mimeType = body?.mimeType || "application/octet-stream";
    const base64 = body?.base64;

    if (!folderId || !fileName || !base64) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "Missing folderId, fileName, or base64",
        }),
      };
    }

    const drive = await getDriveClient();
    const buffer = Buffer.from(base64, "base64");
    const stream = Readable.from(buffer);

    const result = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: stream,
      },
      fields: "id, name, webViewLink",
      supportsAllDrives: true,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        file: result.data,
      }),
    };
  } catch (error) {
    console.error("UPLOAD DRIVE FILE ERROR:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
}