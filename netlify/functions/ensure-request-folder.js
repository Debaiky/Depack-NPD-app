/* eslint-env node */
import { getOrCreateFolder } from "./_drive.js";
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
    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

    const existingRequest = await findRequestRowById(spreadsheetId, requestId);

    let requestFolderId = existingRequest?.row?.[14] || "";
    let requestFolder;

    if (requestFolderId) {
      requestFolder = {
        id: requestFolderId,
        name: requestId,
      };
    } else {
      requestFolder = await getOrCreateFolder(requestId, rootFolderId);

      if (existingRequest?.rowIndex) {
        await updateDriveFolderId(spreadsheetId, existingRequest.rowIndex, requestFolder.id);
      }
    }

    const samplePhotos = await getOrCreateFolder("01 Sample Photos", requestFolder.id);
    const decorationArtwork = await getOrCreateFolder("02 Decoration Artwork", requestFolder.id);
    const gluePatterns = await getOrCreateFolder("03 Glue Pattern Diagrams", requestFolder.id);
    const packagingArtwork = await getOrCreateFolder("04 Packaging Artwork", requestFolder.id);
    const customerBriefs = await getOrCreateFolder("05 Customer Briefs", requestFolder.id);

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