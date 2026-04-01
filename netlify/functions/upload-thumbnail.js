/* eslint-env node */
const { google } = require("googleapis");
const { Readable } = require("stream");

const DRIVE_SCOPE = ["https://www.googleapis.com/auth/drive"];

async function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email:
        process.env.NETLIFY_GOOGLE_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL,
      private_key: (
        process.env.NETLIFY_GOOGLE_PRIVATE_KEY ||
        process.env.GOOGLE_PRIVATE_KEY ||
        ""
      ).replace(/\\n/g, "\n"),
    },
    scopes: DRIVE_SCOPE,
  });

  return google.drive({ version: "v3", auth });
}

const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    const base64 = body?.base64 || "";
    const fileName = body?.fileName || `thumbnail-${Date.now()}.png`;
    const parentFolderId =
  body?.folderId ||
  process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID ||
  "";

    console.log("UPLOAD THUMBNAIL start");
    console.log("UPLOAD THUMBNAIL fileName:", fileName);
    console.log("UPLOAD THUMBNAIL parentFolderId:", parentFolderId);
    console.log("UPLOAD THUMBNAIL hasBase64:", Boolean(base64));

    if (!base64) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "Missing base64 image",
        }),
      };
    }

    if (!parentFolderId) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: "Missing GOOGLE_DRIVE_ROOT_FOLDER_ID",
        }),
      };
    }

    const drive = await getDriveClient();

    // Verify parent folder is accessible
    const parentMeta = await drive.files.get({
      fileId: parentFolderId,
      fields: "id,name,driveId,parents",
      supportsAllDrives: true,
    });

    console.log("UPLOAD THUMBNAIL parent folder found:", parentMeta.data);

    const cleanBase64 = base64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");

    const file = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [parentFolderId],
      },
      media: {
        mimeType: "image/png",
        body: Readable.from(buffer),
      },
      fields: "id,name,webViewLink,webContentLink",
      supportsAllDrives: true,
    });

    console.log("UPLOAD THUMBNAIL created file:", file.data);

    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
      supportsAllDrives: true,
    });

    const fileUrl = `https://drive.google.com/thumbnail?id=${file.data.id}&sz=w1000`;

    console.log("UPLOAD THUMBNAIL success URL:", fileUrl);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        fileId: file.data.id,
        url: fileUrl,
      }),
    };
  } catch (error) {
    console.error("UPLOAD THUMBNAIL ERROR:", error?.response?.data || error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error?.response?.data?.error?.message || error.message,
      }),
    };
  }
};

module.exports = { handler };