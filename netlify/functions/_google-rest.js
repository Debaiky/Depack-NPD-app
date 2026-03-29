/* eslint-env node */
const crypto = require("crypto");

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function getServiceAccountAccessToken(scopes = []) {
  const clientEmail =
    process.env.NETLIFY_GOOGLE_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;

  const privateKey = (
    process.env.NETLIFY_GOOGLE_PRIVATE_KEY ||
    process.env.GOOGLE_PRIVATE_KEY ||
    ""
  ).replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error("Missing Google service account credentials");
  }

  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const claimSet = {
    iss: clientEmail,
    scope: Array.isArray(scopes) ? scopes.join(" ") : String(scopes || ""),
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const unsignedToken =
    `${base64UrlEncode(JSON.stringify(header))}.` +
    `${base64UrlEncode(JSON.stringify(claimSet))}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();

  const signature = signer.sign(privateKey);
  const jwt = `${unsignedToken}.${base64UrlEncode(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const text = await res.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    throw new Error(`Google token error ${res.status}: ${JSON.stringify(data)}`);
  }

  if (!data.access_token) {
    throw new Error("No access_token returned from Google");
  }

  return data.access_token;
}

async function googleJsonFetch(url, options = {}) {
  const {
    method = "GET",
    body,
    scopes = [],
    headers = {},
  } = options;

  const accessToken = await getServiceAccountAccessToken(scopes);

  const finalHeaders = {
    Authorization: `Bearer ${accessToken}`,
    ...headers,
  };

  let finalBody;

  if (body !== undefined && body !== null) {
    finalHeaders["Content-Type"] = "application/json";
    finalBody = JSON.stringify(body);
  }

  const res = await fetch(url, {
    method,
    headers: finalHeaders,
    body: finalBody,
  });

  const text = await res.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    throw new Error(`Google API error ${res.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

module.exports = {
  googleJsonFetch,
  getServiceAccountAccessToken,
};