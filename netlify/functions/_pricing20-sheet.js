const crypto = require("crypto");

const GOOGLE_SHEETS_DATABASE_ID =
  process.env.GOOGLE_SHEETS_DATABASE_ID ||
  process.env.NETLIFY_GOOGLE_SHEETS_DATABASE_ID ||
  process.env.GOOGLE_SHEET_ID ||
  "";

const GOOGLE_CLIENT_EMAIL =
  process.env.NETLIFY_GOOGLE_CLIENT_EMAIL ||
  process.env.GOOGLE_CLIENT_EMAIL ||
  "";

const GOOGLE_PRIVATE_KEY = (
  process.env.NETLIFY_GOOGLE_PRIVATE_KEY ||
  process.env.GOOGLE_PRIVATE_KEY ||
  ""
).replace(/\\n/g, "\n");

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

const tokenCache = {
  accessToken: null,
  expiresAt: 0,
};

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);

  if (tokenCache.accessToken && tokenCache.expiresAt > now + 60) {
    return tokenCache.accessToken;
  }

  if (!GOOGLE_SHEETS_DATABASE_ID) {
    throw new Error("Missing GOOGLE_SHEETS_DATABASE_ID");
  }

  if (!GOOGLE_CLIENT_EMAIL) {
    throw new Error("Missing GOOGLE_CLIENT_EMAIL");
  }

  if (!GOOGLE_PRIVATE_KEY) {
    throw new Error("Missing GOOGLE_PRIVATE_KEY");
  }

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const payload = {
    iss: GOOGLE_CLIENT_EMAIL,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now,
  };

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(
    JSON.stringify(payload)
  )}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();

  const signature = signer.sign(GOOGLE_PRIVATE_KEY, "base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const assertion = `${unsigned}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(
      `Failed to get Google access token: ${json.error || res.statusText}`
    );
  }

  tokenCache.accessToken = json.access_token;
  tokenCache.expiresAt = now + Number(json.expires_in || 3600);

  return tokenCache.accessToken;
}

async function sheetsRequest(path, options = {}) {
  const token = await getAccessToken();

  const res = await fetch(
    `${SHEETS_API_BASE}/${GOOGLE_SHEETS_DATABASE_ID}/${path}`,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    }
  );

  if (res.status === 204) return {};

  const text = await res.text();
  const json = text ? JSON.parse(text) : {};

  if (!res.ok) {
    throw new Error(
      `Google Sheets API error (${res.status}): ${json.error?.message || text}`
    );
  }

  return json;
}

function quoteSheetTitle(title) {
  return `'${String(title).replace(/'/g, "''")}'`;
}

async function getSpreadsheetMeta() {
  return await sheetsRequest("");
}

async function ensureSheetExists(title) {
  const meta = await getSpreadsheetMeta();
  const exists = (meta.sheets || []).some(
    (s) => s?.properties?.title === title
  );

  if (exists) return;

  await sheetsRequest(":batchUpdate", {
    method: "POST",
    body: JSON.stringify({
      requests: [
        {
          addSheet: {
            properties: {
              title,
              gridProperties: {
                rowCount: 2000,
                columnCount: 100,
              },
            },
          },
        },
      ],
    }),
  });
}

async function getRawValues(title) {
  await ensureSheetExists(title);

  const range = encodeURIComponent(`${quoteSheetTitle(title)}!A:ZZ`);
  const json = await sheetsRequest(`values/${range}`);
  return json.values || [];
}

async function clearSheet(title) {
  await ensureSheetExists(title);

  const range = encodeURIComponent(`${quoteSheetTitle(title)}!A:ZZ`);
  await sheetsRequest(`values/${range}:clear`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

async function writeValues(title, matrix) {
  await ensureSheetExists(title);

  const range = encodeURIComponent(`${quoteSheetTitle(title)}!A1`);
  await sheetsRequest(`values/${range}?valueInputOption=USER_ENTERED`, {
    method: "PUT",
    body: JSON.stringify({
      range: `${title}!A1`,
      majorDimension: "ROWS",
      values: matrix,
    }),
  });
}

function rowsToObjects(values) {
  if (!values || values.length === 0) return [];

  const headers = values[0] || [];
  const dataRows = values.slice(1);

  return dataRows.map((row, index) => {
    const obj = { __rowNumber: index + 2 };
    headers.forEach((header, i) => {
      obj[header] = row[i] ?? "";
    });
    return obj;
  });
}

function buildHeaderList(objects) {
  const seen = new Set();
  const headers = [];

  objects.forEach((obj) => {
    Object.keys(obj || {}).forEach((key) => {
      if (key === "__rowNumber") return;
      if (!seen.has(key)) {
        seen.add(key);
        headers.push(key);
      }
    });
  });

  return headers;
}

async function listObjects(sheetTitle) {
  const values = await getRawValues(sheetTitle);
  return rowsToObjects(values);
}

async function getObjectByKey(sheetTitle, keyField, keyValue) {
  const rows = await listObjects(sheetTitle);
  return rows.find(
    (row) => String(row?.[keyField] || "") === String(keyValue || "")
  );
}

async function writeObjects(sheetTitle, objects) {
  const rows = objects || [];
  const headers = buildHeaderList(rows);

  await clearSheet(sheetTitle);

  if (headers.length === 0) return;

  const matrix = [
    headers,
    ...rows.map((row) => headers.map((h) => row?.[h] ?? "")),
  ];

  await writeValues(sheetTitle, matrix);
}

async function upsertObject(sheetTitle, keyField, data) {
  const existingRows = await listObjects(sheetTitle);
  const nowIso = new Date().toISOString();

  const index = existingRows.findIndex(
    (row) => String(row?.[keyField] || "") === String(data?.[keyField] || "")
  );

  if (index >= 0) {
    const merged = {
      ...existingRows[index],
      ...data,
      createdAt: existingRows[index].createdAt || data.createdAt || nowIso,
      updatedAt: nowIso,
    };
    delete merged.__rowNumber;
    existingRows[index] = merged;
  } else {
    existingRows.push({
      ...data,
      createdAt: data.createdAt || nowIso,
      updatedAt: nowIso,
    });
  }

  await writeObjects(
    sheetTitle,
    existingRows.map((row) => {
      const cleaned = { ...row };
      delete cleaned.__rowNumber;
      return cleaned;
    })
  );

  return await getObjectByKey(sheetTitle, keyField, data[keyField]);
}

module.exports = {
  listObjects,
  getObjectByKey,
  upsertObject,
};