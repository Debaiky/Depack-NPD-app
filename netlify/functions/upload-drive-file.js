/* eslint-env node */
import { uploadFileToDrive } from "./_drive.js";

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

    const file = await uploadFileToDrive({
      folderId,
      fileName,
      mimeType,
      base64,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        file,
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