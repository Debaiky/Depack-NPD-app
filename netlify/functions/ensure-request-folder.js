/* eslint-env node */
import { getDriveClient, getOrCreateFolder } from "./_drive.js";
import { findRequestRowById, updateDriveFolderId } from "./_sheet.js";

export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    const requestId = body?.requestId;

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
    const existingRequest = await findRequestRowById(spreadsheetId, requestId);

    const drive = await getDriveClient();
    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

    let requestFolderId = existingRequest?.row?.[14] || ""; // column O = index 14

    let requestFolder;

    if (requestFolderId) {
      requestFolder = { id: requestFolderId, name: requestId };
    } else {
      requestFolder = await getOrCreateFolder(drive, requestId, rootFolderId);

      if (existingRequest?.rowIndex) {
        await updateDriveFolderId(spreadsheetId, existingRequest.rowIndex, requestFolder.id);
      }
    }

    const samplePhotos = await getOrCreateFolder(drive, "01 Sample Photos", requestFolder.id);
    const decorationArtwork = await getOrCreateFolder(drive, "02 Decoration Artwork", requestFolder.id);
    const gluePatterns = await getOrCreateFolder(drive, "03 Glue Pattern Diagrams", requestFolder.id);
    const packagingArtwork = await getOrCreateFolder(drive, "04 Packaging Artwork", requestFolder.id);
    const customerBriefs = await getOrCreateFolder(drive, "05 Customer Briefs", requestFolder.id);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        requestFolder,
        subfolders: {
          samplePhotos,
          decorationArtwork,
          gluePatterns,
          packagingArtwork,
          customerBriefs,
        },
      }),
    };
  } catch (error) {
    console.error("ENSURE REQUEST FOLDER ERROR:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
}