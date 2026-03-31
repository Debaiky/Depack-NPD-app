/* eslint-env node */
const { googleJsonFetch } = require("./_google-rest");

const SHEETS_SCOPE = ["https://www.googleapis.com/auth/spreadsheets"];

function normalizeHeader(header) {
  return String(header || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function getCell(row, headerMap, ...possibleHeaders) {
  for (const name of possibleHeaders) {
    const idx = headerMap[normalizeHeader(name)];
    if (idx !== undefined) {
      return row[idx] || "";
    }
  }
  return "";
}

const handler = async (event) => {
  try {
    const requestId = event.queryStringParameters?.requestId;

    if (!requestId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "Missing requestId",
        }),
      };
    }

    const spreadsheetId = process.env.GOOGLE_SHEETS_DATABASE_ID;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Requests_Master!A:P`;

    const data = await googleJsonFetch(url, {
      scopes: SHEETS_SCOPE,
    });

    const rows = data.values || [];
    if (rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: "No data found in Requests_Master",
        }),
      };
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    const headerMap = {};
    headers.forEach((header, index) => {
      headerMap[normalizeHeader(header)] = index;
    });

    const found = dataRows.find((row) => {
      const rowRequestId = getCell(row, headerMap, "RequestID", "Request ID");
      return rowRequestId === requestId;
    });

    if (!found) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: "Request not found",
        }),
      };
    }

    const request = {
      RequestID: getCell(found, headerMap, "RequestID", "Request ID"),
      CreatedDate: getCell(found, headerMap, "CreatedDate", "Created Date"),
      CreatedBy: getCell(found, headerMap, "CreatedBy", "Created By"),
      Status: getCell(found, headerMap, "Status") || "Draft",
      CustomerName: getCell(found, headerMap, "CustomerName", "Customer Name"),
      ContactPerson: getCell(found, headerMap, "ContactPerson", "Contact Person"),
      CountryMarket: getCell(found, headerMap, "CountryMarket", "Country Market"),
      DeliveryLocation: getCell(found, headerMap, "DeliveryLocation", "Delivery Location"),
      ProjectName: getCell(found, headerMap, "ProjectName", "Project Name"),
      TargetSellingPrice: getCell(found, headerMap, "TargetSellingPrice", "Target Selling Price"),
      ForecastAnnualVolume: getCell(found, headerMap, "ForecastAnnualVolume", "Forecast Annual Volume"),
      ProductType: getCell(found, headerMap, "ProductType", "Product Type"),
      ProductMaterial: getCell(found, headerMap, "ProductMaterial", "Product Material"),
      DecorationType: getCell(found, headerMap, "DecorationType", "Decoration Type"),
      PayloadJSON: getCell(found, headerMap, "PayloadJSON", "Payload JSON"),
      DriveFolderID: getCell(found, headerMap, "DriveFolderID", "Drive Folder ID"),
    };

    let payload = {};
    try {
      payload = JSON.parse(request.PayloadJSON || "{}");
    } catch {
      payload = {};
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        request,
        payload,
      }),
    };
  } catch (error) {
    console.error("GET REQUEST ERROR:", error);

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