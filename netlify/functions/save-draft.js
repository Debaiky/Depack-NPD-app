/* eslint-env node */
const { googleJsonFetch } = require("./_google-rest");

const SHEETS_SCOPE = ["https://www.googleapis.com/auth/spreadsheets"];

const trimPayloadForSheet = (body) => {
  const clean = structuredClone(body || {});

  if (clean.product) {
    clean.product.productThumbnailBase64 = "";
    clean.product.productThumbnailPreview = "";
  }

  return clean;
};

const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const spreadsheetId = process.env.GOOGLE_SHEETS_DATABASE_ID;

    const requestId = body?.metadata?.requestId || "";
    const createdAt = body?.metadata?.createdAt || new Date().toISOString();
    const createdBy = body?.metadata?.createdBy || "";
    const status = body?.metadata?.status || "Draft";
    const driveFolderId = body?.metadata?.driveFolderId || "";

    const customer = body?.customer || {};
    const product = body?.product || {};
    const decoration = body?.decoration || {};

    const payloadForSheet = trimPayloadForSheet(body);
    const payloadJson = JSON.stringify(payloadForSheet);

    const row = [
      requestId, // A
      createdAt, // B
      createdBy, // C
      status, // D
      customer.customerName || "", // E
      customer.contactPerson || "", // F
      customer.countryMarket || "", // G
      customer.deliveryLocation || "", // H
      customer.projectName || "", // I
      customer.targetSellingPrice || "", // J
      customer.forecastAnnualVolume || "", // K
      product.productType || "", // L
      product.productMaterial || product.sheetMaterial || "", // M
      decoration.decorationType || "", // N
      payloadJson, // O
      driveFolderId, // P
    ];

    const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Requests_Master!A:P`;
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

    if (rowIndex === -1) {
      const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Requests_Master!A:P:append?valueInputOption=USER_ENTERED`;
      await googleJsonFetch(appendUrl, {
        method: "POST",
        scopes: SHEETS_SCOPE,
        body: {
          values: [row],
        },
      });
    } else {
      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Requests_Master!A${rowIndex}:P${rowIndex}?valueInputOption=USER_ENTERED`;
      await googleJsonFetch(updateUrl, {
        method: "PUT",
        scopes: SHEETS_SCOPE,
        body: {
          values: [row],
        },
      });
    }

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