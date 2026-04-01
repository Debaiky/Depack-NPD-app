/* eslint-env node */
const { googleJsonFetch } = require("./_google-rest");

const SHEETS_SCOPE = ["https://www.googleapis.com/auth/spreadsheets"];

/* ================= HELPERS ================= */

const trimPayloadForSheet = (body) => {
  const clean = structuredClone(body || {});

  // ❌ remove heavy base64 image to avoid 50k cell limit
  if (clean.product) {
    clean.product.productThumbnailBase64 = "";
    clean.product.productThumbnailPreview = "";
  }

  return clean;
};

const toNumber = (value) => {
  const n = parseFloat(String(value ?? "").replace(/,/g, ""));
  return Number.isNaN(n) ? 0 : n;
};

const getPrimaryCustomer = (body) => {
  if (
    Array.isArray(body?.customer?.customers) &&
    body.customer.customers.length > 0
  ) {
    return body.customer.customers[0];
  }
  return {};
};

/* ================= HANDLER ================= */

const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const spreadsheetId = process.env.GOOGLE_SHEETS_DATABASE_ID;

    const primaryCustomer = getPrimaryCustomer(body);

    const requestId = body?.metadata?.requestId || "";

    if (!requestId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "Missing requestId",
        }),
      };
    }

    const createdAt =
      body?.metadata?.createdAt || new Date().toISOString();
    const createdBy = body?.metadata?.createdBy || "";
    const status = body?.metadata?.status || "Draft";
    const driveFolderId = body?.metadata?.driveFolderId || "";

    const targetSellingPrice = body?.project?.targetSellingPrice || "";
    const forecastAnnualVolume =
      body?.project?.forecastAnnualVolume || "";

    const annualTurnover =
      toNumber(targetSellingPrice) *
      toNumber(forecastAnnualVolume);

    const payloadForSheet = trimPayloadForSheet(body);
    let payloadJson = JSON.stringify(payloadForSheet);

    // 🚨 Safety: prevent >50k characters
    if (payloadJson.length > 45000) {
      console.warn("Payload too large, truncating...");
      payloadJson = payloadJson.slice(0, 45000);
    }

    const row = [
      requestId, // A
      createdAt, // B
      createdBy, // C
      status, // D
      primaryCustomer?.customerName || "", // E
      primaryCustomer?.contactPerson || "", // F
      primaryCustomer?.countryMarket || "", // G
      primaryCustomer?.deliveryLocation || "", // H
      body?.project?.projectName || "", // I
      "New product", // J
      body?.product?.productType || "", // K
      body?.product?.productType === "Sheet Roll"
        ? body?.product?.sheetMaterial || ""
        : body?.product?.productMaterial || "", // L
      body?.decoration?.decorationType || "", // M
      payloadJson, // N
      driveFolderId, // O
      targetSellingPrice, // P
      forecastAnnualVolume, // Q
      annualTurnover || "", // R
      body?.product?.productThumbnailUrl || "", // S ✅ keep URL only
    ];

    console.log("SAVE DRAFT requestId:", requestId);

    /* ================= CHECK EXISTING ================= */

    const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Requests_Master!A:A`;

    const existing = await googleJsonFetch(getUrl, {
      scopes: SHEETS_SCOPE,
    });

    const rows = existing.values || [];
    let rowIndex = -1;

    for (let i = 1; i < rows.length; i++) {
      if ((rows[i][0] || "") === requestId) {
        rowIndex = i + 1;
        break;
      }
    }

    /* ================= UPSERT ================= */

    if (rowIndex === -1) {
      console.log("Creating new draft row");

      const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Requests_Master!A:S:append?valueInputOption=USER_ENTERED`;

      await googleJsonFetch(appendUrl, {
        method: "POST",
        scopes: SHEETS_SCOPE,
        body: {
          values: [row],
        },
      });
    } else {
      console.log("Updating existing draft row:", rowIndex);

      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Requests_Master!A${rowIndex}:S${rowIndex}?valueInputOption=USER_ENTERED`;

      await googleJsonFetch(updateUrl, {
        method: "PUT",
        scopes: SHEETS_SCOPE,
        body: {
          values: [row],
        },
      });
    }

    console.log("SAVE DRAFT SUCCESS:", requestId);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message:
          rowIndex === -1
            ? "Draft created successfully"
            : "Draft updated successfully",
        requestId,
      }),
    };
  } catch (error) {
    console.error("SAVE DRAFT ERROR:", error);

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