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

const getPrimaryCustomer = (body) => {
  if (Array.isArray(body?.customers) && body.customers.length > 0) {
    return body.customers[0];
  }

  if (body?.customer) {
    return body.customer;
  }

  return {};
};

const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const spreadsheetId = process.env.GOOGLE_SHEETS_DATABASE_ID;

    const primaryCustomer = getPrimaryCustomer(body);

    const requestId = body?.metadata?.requestId || "";
    const createdAt = body?.metadata?.createdAt || new Date().toISOString();
    const createdBy = body?.metadata?.createdBy || "";
    const status = body?.metadata?.status || "Draft";
    const driveFolderId = body?.metadata?.driveFolderId || "";

    const targetSellingPrice =
      primaryCustomer?.targetSellingPrice ||
      body?.customer?.targetSellingPrice ||
      "";

    const forecastAnnualVolume =
      primaryCustomer?.forecastAnnualVolume ||
      body?.customer?.forecastAnnualVolume ||
      "";

    const annualTurnover =
      (parseFloat(String(targetSellingPrice).replace(/,/g, "")) || 0) *
      (parseFloat(String(forecastAnnualVolume).replace(/,/g, "")) || 0);

    const payloadForSheet = trimPayloadForSheet(body);
    const payloadJson = JSON.stringify(payloadForSheet);

    const row = [
      requestId,
      createdAt,
      createdBy,
      status,
      primaryCustomer?.customerName || "",
      primaryCustomer?.contactPerson || "",
      primaryCustomer?.countryMarket || "",
      primaryCustomer?.deliveryLocation || "",
      body?.project?.projectName || body?.customer?.projectName || "",
      "New product",
      body?.product?.productType || "",
      body?.product?.productType === "Sheet Roll"
        ? body?.product?.sheetMaterial || ""
        : body?.product?.productMaterial || "",
      body?.decoration?.decorationType || "",
      payloadJson,
      driveFolderId,
      targetSellingPrice,
      forecastAnnualVolume,
      annualTurnover || "",
      body?.product?.productThumbnailPreview || "",
    ];

    const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Requests_Master!A:A`;
    const existing = await googleJsonFetch(getUrl, {
      scopes: SHEETS_SCOPE,
    });

    const rows = existing.values || [];
    let rowIndex = -1;

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === requestId) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) {
      const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Requests_Master!A:S:append?valueInputOption=USER_ENTERED`;
      await googleJsonFetch(appendUrl, {
        method: "POST",
        scopes: SHEETS_SCOPE,
        body: {
          values: [row],
        },
      });
    } else {
      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Requests_Master!A${rowIndex}:S${rowIndex}?valueInputOption=USER_ENTERED`;
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
        message: rowIndex === -1 ? "Draft created successfully" : "Draft updated successfully",
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