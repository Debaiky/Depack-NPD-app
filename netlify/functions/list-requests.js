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

    const requestsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Requests_Master!A:O`;
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
        const createdDate = getCell(row, headerMap, "CreatedDate", "Created Date");
        const createdBy = getCell(row, headerMap, "CreatedBy", "Created By");
        const status = getCell(row, headerMap, "Status");
        const customerName = getCell(row, headerMap, "CustomerName", "Customer Name");
        const contactPerson = getCell(row, headerMap, "ContactPerson", "Contact Person");
        const countryMarket = getCell(row, headerMap, "CountryMarket", "Country Market");
        const deliveryLocation = getCell(row, headerMap, "DeliveryLocation", "Delivery Location");
        const projectName = getCell(row, headerMap, "ProjectName", "Project Name");
        const projectType = getCell(row, headerMap, "ProjectType", "Project Type");
        const productType = getCell(row, headerMap, "ProductType", "Product Type");
        const productMaterial = getCell(row, headerMap, "ProductMaterial", "Product Material");
        const decorationType = getCell(row, headerMap, "DecorationType", "Decoration Type");
        const payloadJson = getCell(row, headerMap, "PayloadJSON", "Payload JSON");
        const driveFolderId = getCell(row, headerMap, "DriveFolderID", "Drive Folder ID");

        return {
          RequestID: requestId,
          CreatedDate: createdDate,
          CreatedBy: createdBy,
          Status: status || "Draft",
          CustomerName: customerName,
          ContactPerson: contactPerson,
          CountryMarket: countryMarket,
          DeliveryLocation: deliveryLocation,
          ProjectName: projectName,
          ProjectType: projectType,
          ProductType: productType,
          ProductMaterial: productMaterial,
          DecorationType: decorationType,
          PayloadJSON: payloadJson,
          DriveFolderID: driveFolderId,
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