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

export async function handler() {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_DATABASE_ID;

    const requestsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Requests_Master!A:S`;
    const filesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Requests_Files!A:G`;

    const requestsResult = await googleJsonFetch(requestsUrl, {
      scopes: SHEETS_SCOPE,
    });

    let filesResult = { values: [] };
    try {
      filesResult = await googleJsonFetch(filesUrl, {
        scopes: SHEETS_SCOPE,
      });
    } catch {
      filesResult = { values: [] };
    }

    const requestRows = requestsResult.values || [];
    if (requestRows.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          requests: [],
        }),
      };
    }

    const headers = requestRows[0];
    const dataRows = requestRows.slice(1);

    const headerMap = {};
    headers.forEach((header, index) => {
      headerMap[normalizeHeader(header)] = index;
    });

    const fileRows = filesResult.values || [];
    const fileDataRows = fileRows.slice(1);

    const fileCountMap = {};
    for (const row of fileDataRows) {
      const requestId = row[0] || "";
      if (!requestId) continue;
      fileCountMap[requestId] = (fileCountMap[requestId] || 0) + 1;
    }

    const requests = dataRows
      .map((row) => {
        const requestId = getCell(row, headerMap, "RequestID", "Request ID");

        return {
          RequestID: requestId,
          CreatedDate: getCell(row, headerMap, "CreatedDate", "Created Date"),
          CreatedBy: getCell(row, headerMap, "CreatedBy", "Created By"),
          Status: getCell(row, headerMap, "Status") || "Draft",
          CustomerName: getCell(row, headerMap, "CustomerName", "Customer Name"),
          ContactPerson: getCell(row, headerMap, "ContactPerson", "Contact Person"),
          CountryMarket: getCell(row, headerMap, "CountryMarket", "Country Market"),
          DeliveryLocation: getCell(row, headerMap, "DeliveryLocation", "Delivery Location"),
          ProjectName: getCell(row, headerMap, "ProjectName", "Project Name"),
          ProjectType: getCell(row, headerMap, "ProjectType", "Project Type"),
          ProductType: getCell(row, headerMap, "ProductType", "Product Type"),
          ProductMaterial: getCell(row, headerMap, "ProductMaterial", "Product Material"),
          DecorationType: getCell(row, headerMap, "DecorationType", "Decoration Type"),
          PayloadJSON: getCell(row, headerMap, "PayloadJSON", "Payload JSON"),
          DriveFolderID: getCell(row, headerMap, "DriveFolderID", "Drive Folder ID"),
          TargetSellingPrice: getCell(row, headerMap, "TargetSellingPrice"),
          ForecastAnnualVolume: getCell(row, headerMap, "ForecastAnnualVolume"),
          AnnualTurnover: getCell(row, headerMap, "AnnualTurnover"),
          Thumbnail: getCell(row, headerMap, "Thumbnail"),
          FileCount: fileCountMap[requestId] || 0,
        };
      })
      .filter((item) => item.RequestID);

    requests.sort((a, b) => {
      const aDate = new Date(a.CreatedDate || 0).getTime();
      const bDate = new Date(b.CreatedDate || 0).getTime();
      return bDate - aDate;
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        requests,
      }),
    };
  } catch (error) {
    console.error("LIST REQUESTS ERROR:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
}