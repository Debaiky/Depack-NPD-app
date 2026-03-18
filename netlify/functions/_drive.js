/* eslint-env node */
import { google } from "googleapis";

export function getDriveAuth() {
  return new google.auth.JWT({
    email: process.env.NETLIFY_GOOGLE_CLIENT_EMAIL,
    key: process.env.NETLIFY_GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
}

export async function getDriveClient() {
  const auth = getDriveAuth();
  await auth.authorize();

  return google.drive({
    version: "v3",
    auth,
  });
}

export async function findFolderByName(drive, name, parentId) {
  const q = [
    "mimeType = 'application/vnd.google-apps.folder'",
    `name = '${name.replace(/'/g, "\\'")}'`,
    `'${parentId}' in parents`,
    "trashed = false",
  ].join(" and ");

  const res = await drive.files.list({
    q,
    fields: "files(id, name)",
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });

  return res.data.files?.[0] || null;
}

export async function createFolder(drive, name, parentId) {
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id, name",
    supportsAllDrives: true,
  });

  return res.data;
}

export async function getOrCreateFolder(drive, name, parentId) {
  const existing = await findFolderByName(drive, name, parentId);
  if (existing) return existing;
  return createFolder(drive, name, parentId);
}