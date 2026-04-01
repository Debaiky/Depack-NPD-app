/* eslint-env node */
const { google } = require("googleapis");

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

    const base64 = body?.base64;
    const fileName = body?.fileName || `thumbnail-${Date.now()}.png`;
    const parentFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

    if (!base64) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "Missing base64 image",
        }),
      };
    }

    const drive = await getDriveClient();

    const buffer = Buffer.from(
      base64.replace(/^data:image\/\w+;base64,/, ""),
      "base64"
    );

    const file = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [parentFolderId],
      },
      media: {
        mimeType: "image/png",
        body: require("stream").Readable.from(buffer),
      },
    });

    // Make file public
    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    const fileUrl = `https://drive.google.com/uc?id=${file.data.id}`;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        fileId: file.data.id,
        url: fileUrl,
      }),
    };
  } catch (error) {
    console.error("UPLOAD THUMBNAIL ERROR:", error);

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