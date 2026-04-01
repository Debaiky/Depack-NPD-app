const { getOrCreateFolder } = require("./_drive");
const { getRequestRowById, updateRequestRow } = require("./_sheet");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const requestId = body?.requestId || "";

    console.log("ENSURE REQUEST FOLDER BODY:", body);
    console.log("ENSURE REQUEST FOLDER requestId:", requestId);

    if (!requestId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "Missing requestId",
        }),
      };
    }

    let existingRequest = null;

    for (let i = 0; i < 4; i += 1) {
      existingRequest = await getRequestRowById(requestId);
      console.log(`ENSURE REQUEST FOLDER lookup attempt ${i + 1}:`, existingRequest);

      if (existingRequest) break;

      await sleep(1200);
    }

    if (!existingRequest) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: `Request not found for requestId: ${requestId}`,
        }),
      };
    }

    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

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

      if (!requestFolder?.id) {
        throw new Error("Failed to create or fetch request folder");
      }

      await updateRequestRow(requestId, {
        DriveFolderID: requestFolder.id,
      });
    }

    const samplePhotos = await getOrCreateFolder("01 Sample Photos", requestFolder.id);
    const decorationArtwork = await getOrCreateFolder("02 Decoration Artwork", requestFolder.id);
    const gluePatterns = await getOrCreateFolder("03 Glue Pattern Diagrams", requestFolder.id);
    const packagingArtwork = await getOrCreateFolder("04 Packaging Artwork", requestFolder.id);
    const customerBriefs = await getOrCreateFolder("05 Customer Briefs", requestFolder.id);

    console.log("ENSURE REQUEST FOLDER SUCCESS:", {
      requestId,
      requestFolderId: requestFolder.id,
    });

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