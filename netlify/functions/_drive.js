/* eslint-env node */
const {
  googleJsonFetch,
  getServiceAccountAccessToken,
} = require("./_google-rest");

const DRIVE_SCOPE = ["https://www.googleapis.com/auth/drive"];

async function findFolderByName(name, parentId) {
  const safeName = String(name).replace(/'/g, "\\'");
  const q = [
    "mimeType = 'application/vnd.google-apps.folder'",
    `name = '${safeName}'`,
    `'${parentId}' in parents`,
    "trashed = false",
  ].join(" and ");

  const url =
    "https://www.googleapis.com/drive/v3/files" +
    `?q=${encodeURIComponent(q)}` +
    "&fields=files(id,name)" +
    "&includeItemsFromAllDrives=true" +
    "&supportsAllDrives=true";

  const data = await googleJsonFetch(url, {
    scopes: DRIVE_SCOPE,
  });

  return data.files?.[0] || null;
}

async function createFolder(name, parentId) {
  const url = "https://www.googleapis.com/drive/v3/files?supportsAllDrives=true";

  const data = await googleJsonFetch(url, {
    method: "POST",
    scopes: DRIVE_SCOPE,
    body: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
  });

  return {
    id: data.id,
    name: data.name,
  };
}

async function getOrCreateFolder(name, parentId) {
  const existing = await findFolderByName(name, parentId);
  if (existing) return existing;
  return await createFolder(name, parentId);
}

async function findFileByName(fileName, parentId) {
  const safeName = String(fileName).replace(/'/g, "\\'");
  const q = [
    `name = '${safeName}'`,
    `'${parentId}' in parents`,
    "trashed = false",
  ].join(" and ");

  const url =
    "https://www.googleapis.com/drive/v3/files" +
    `?q=${encodeURIComponent(q)}` +
    "&fields=files(id,name,webViewLink,mimeType)" +
    "&includeItemsFromAllDrives=true" +
    "&supportsAllDrives=true";

  const data = await googleJsonFetch(url, {
    scopes: DRIVE_SCOPE,
  });

  return data.files?.[0] || null;
}

async function deleteDriveFile(fileId) {
  const accessToken = await getServiceAccountAccessToken(DRIVE_SCOPE);

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive delete error ${res.status}: ${text}`);
  }

  return true;
}

async function uploadFileToDrive({ folderId, fileName, mimeType, base64 }) {
  const existing = await findFileByName(fileName, folderId);

  if (existing) {
    return {
      id: existing.id,
      name: existing.name,
      webViewLink: existing.webViewLink || "",
      mimeType: existing.mimeType || mimeType || "application/octet-stream",
      alreadyExists: true,
    };
  }

  const accessToken = await getServiceAccountAccessToken(DRIVE_SCOPE);
  const metadata = {
    name: fileName,
    parents: [folderId],
  };

  const boundary = "depack-boundary-" + Date.now();
  const fileBuffer = Buffer.from(base64, "base64");

  const part1 =
    `--${boundary}\r\n` +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    `${JSON.stringify(metadata)}\r\n`;

  const part2 =
    `--${boundary}\r\n` +
    `Content-Type: ${mimeType || "application/octet-stream"}\r\n\r\n`;

  const end = `\r\n--${boundary}--`;

  const bodyBuffer = Buffer.concat([
    Buffer.from(part1, "utf8"),
    Buffer.from(part2, "utf8"),
    fileBuffer,
    Buffer.from(end, "utf8"),
  ]);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink,mimeType",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: bodyBuffer,
    }
  );

  const text = await res.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    throw new Error(`Drive upload error ${res.status}: ${JSON.stringify(data)}`);
  }

  return {
    ...data,
    alreadyExists: false,
  };
}

module.exports = {
  findFolderByName,
  createFolder,
  getOrCreateFolder,
  findFileByName,
  deleteDriveFile,
  uploadFileToDrive,
};