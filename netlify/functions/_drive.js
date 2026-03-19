export async function deleteDriveFile(fileId) {
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