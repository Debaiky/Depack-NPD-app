/* eslint-env node */
const { getOrCreateFolder } = require("./_drive");
const { getRequestRowById, updateRequestRow } = require("./_sheet");

const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const requestId = body?.requestId;

    console.log("ensure-request-folder body:", body);
    console.log("ensure-request-folder requestId:", requestId);

    if (!requestId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "Missing requestId",
        }),
      };
    }

    const existingRequest = await getRequestRowById(requestId);
    console.log("ensure-request-folder existingRequest:", existingRequest);

    if (!existingRequest) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: "Request not found",
        }),
      };
    }

    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
    console.log("ensure-request-folder rootFolderId exists:", Boolean(rootFolderId));

    if (!rootFolderId) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: "Missing GOOGLE_DRIVE_ROOT_FOLDER_ID",
        }),
      };
    }

    let requestFolderId = existingRequest?.DriveFolderID || "";
    let requestFolder;

    if (requestFolderId) {
      requestFolder = {
        id: requestFolderId,
        name: requestId,
      };
    } else {
      requestFolder = await getOrCreateFolder(requestId, rootFolderId);
      console.log("ensure-request-folder created request folder:", requestFolder);

      await updateRequestRow(requestId, {
        DriveFolderID: requestFolder.id,
      });
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
};

module.exports = { handler };