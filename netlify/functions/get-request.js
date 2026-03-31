/* eslint-env node */
import { googleJsonFetch } from "./_google-rest.js";

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

export async function handler(event) {
  try {
    const requestId = event.queryStringParameters?.requestId || "";

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

    const requestsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Requests_Master!A:S`;

    const requestsResult = await googleJsonFetch(requestsUrl, {
      scopes: SHEETS_SCOPE,
    });

    const requestRows = requestsResult.values || [];

    if (requestRows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: "No data found in Requests_Master",
        }),
      };
    }

    const headers = requestRows[0];
    const dataRows = requestRows.slice(1);

    const headerMap = {};
    headers.forEach((header, index) => {
      headerMap[normalizeHeader(header)] = index;
    });

    const foundRow = dataRows.find((row) => {
      const rowRequestId = getCell(row, headerMap, "RequestID", "Request ID");
      return rowRequestId === requestId;
    });

    if (!foundRow) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: "Request not found",
        }),
      };
    }

    const request = {
      RequestID: getCell(foundRow, headerMap, "RequestID", "Request ID"),
      CreatedDate: getCell(foundRow, headerMap, "CreatedDate", "Created Date"),
      CreatedBy: getCell(foundRow, headerMap, "CreatedBy", "Created By"),
      Status: getCell(foundRow, headerMap, "Status") || "Draft",
      CustomerName: getCell(foundRow, headerMap, "CustomerName", "Customer Name"),
      ContactPerson: getCell(foundRow, headerMap, "ContactPerson", "Contact Person"),
      CountryMarket: getCell(foundRow, headerMap, "CountryMarket", "Country Market"),
      DeliveryLocation: getCell(foundRow, headerMap, "DeliveryLocation", "Delivery Location"),
      ProjectName: getCell(foundRow, headerMap, "ProjectName", "Project Name"),
      ProjectType: getCell(foundRow, headerMap, "ProjectType", "Project Type"),
      ProductType: getCell(foundRow, headerMap, "ProductType", "Product Type"),
      ProductMaterial: getCell(foundRow, headerMap, "ProductMaterial", "Product Material"),
      DecorationType: getCell(foundRow, headerMap, "DecorationType", "Decoration Type"),
      PayloadJSON: getCell(foundRow, headerMap, "PayloadJSON", "Payload JSON"),
      DriveFolderID: getCell(foundRow, headerMap, "DriveFolderID", "Drive Folder ID"),
      TargetSellingPrice: getCell(foundRow, headerMap, "TargetSellingPrice"),
      ForecastAnnualVolume: getCell(foundRow, headerMap, "ForecastAnnualVolume"),
      AnnualTurnover: getCell(foundRow, headerMap, "AnnualTurnover"),
      Thumbnail: getCell(foundRow, headerMap, "Thumbnail"),
    };

    let payload = {};
    try {
      payload = JSON.parse(request.PayloadJSON || "{}");
    } catch (parseError) {
      console.error("Failed to parse PayloadJSON:", parseError);
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
}