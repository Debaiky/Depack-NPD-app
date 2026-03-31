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

function safeJsonParse(value) {
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}

export async function handler() {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_DATABASE_ID;

    const requestsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Requests_Master!A:P`;
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
        const status = getCell(row, headerMap, "Status") || "Draft";
        const projectName = getCell(row, headerMap, "ProjectName", "Project Name");
        const customerSummary = getCell(row, headerMap, "CustomerSummary", "Customer Summary");
        const customerProductCode = getCell(
          row,
          headerMap,
          "CustomerProductCode",
          "Customer Product Code"
        );
        const targetSellingPrice = getCell(
          row,
          headerMap,
          "TargetSellingPrice",
          "Target Selling Price"
        );
        const currency = getCell(row, headerMap, "Currency");
        const forecastAnnualQty = getCell(
          row,
          headerMap,
          "ForecastAnnualQty",
          "Forecast Annual Qty"
        );
        const expectedAnnualTurnover = getCell(
          row,
          headerMap,
          "ExpectedAnnualTurnover",
          "Expected Annual Turnover"
        );
        const productType = getCell(row, headerMap, "ProductType", "Product Type");
        const payloadJson = getCell(row, headerMap, "PayloadJSON", "Payload JSON");
        const driveFolderId = getCell(row, headerMap, "DriveFolderID", "Drive Folder ID");
        const productThumbnailFileName = getCell(
          row,
          headerMap,
          "ProductThumbnailFileName",
          "Product Thumbnail File Name"
        );
        const productThumbnailDriveLink = getCell(
          row,
          headerMap,
          "ProductThumbnailDriveLink",
          "Product Thumbnail Drive Link"
        );

        const payload = safeJsonParse(payloadJson);
        const thumbPreview =
          payload?.product?.productThumbnailPreview ||
          (payload?.product?.productThumbnailBase64
            ? `data:image/*;base64,${payload.product.productThumbnailBase64}`
            : "");

        return {
          RequestID: requestId,
          CreatedDate: createdDate,
          CreatedBy: createdBy,
          Status: status,
          ProjectName: projectName || "Untitled Project",
          CustomerSummary: customerSummary || "—",
          CustomerProductCode: customerProductCode || "",
          TargetSellingPrice: targetSellingPrice || "",
          Currency: currency || "",
          ForecastAnnualQty: forecastAnnualQty || "",
          ExpectedAnnualTurnover: expectedAnnualTurnover || "",
          ProductType: productType || "",
          PayloadJSON: payloadJson,
          DriveFolderID: driveFolderId,
          ProductThumbnailFileName: productThumbnailFileName || "",
          ProductThumbnailDriveLink: productThumbnailDriveLink || "",
          ProductThumbnailPreview: thumbPreview || "",
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