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
    if (idx !== undefined) return row[idx] || "";
  }
  return "";
}

export async function handler() {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_DATABASE_ID;

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Customers_Master!A:I`;

    const data = await googleJsonFetch(url, {
      scopes: SHEETS_SCOPE,
    });

    const rows = data.values || [];
    if (rows.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          customers: [],
        }),
      };
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    const headerMap = {};
    headers.forEach((header, index) => {
      headerMap[normalizeHeader(header)] = index;
    });

    const customers = dataRows
      .map((row) => ({
        CustomerID: getCell(row, headerMap, "CustomerID", "Customer ID"),
        CustomerName: getCell(row, headerMap, "CustomerName", "Customer Name"),
        ContactPerson: getCell(row, headerMap, "ContactPerson", "Contact Person"),
        ContactEmail: getCell(row, headerMap, "ContactEmail", "Contact Email"),
        ContactPhone: getCell(row, headerMap, "ContactPhone", "Contact Phone"),
        CountryMarket: getCell(row, headerMap, "CountryMarket", "Country Market"),
        DeliveryLocation: getCell(row, headerMap, "DeliveryLocation", "Delivery Location"),
        Notes: getCell(row, headerMap, "Notes"),
        CreatedAt: getCell(row, headerMap, "CreatedAt", "Created At"),
      }))
      .filter((c) => c.CustomerName);

    customers.sort((a, b) =>
      (a.CustomerName || "").localeCompare(b.CustomerName || "")
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        customers,
      }),
    };
  } catch (error) {
    console.error("LIST CUSTOMERS ERROR:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
}