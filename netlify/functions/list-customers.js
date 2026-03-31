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

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Customers_Master!A:J`;

    const data = await googleJsonFetch(url, { scopes: SHEETS_SCOPE });
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
    const bodyRows = rows.slice(1);

    const headerMap = {};
    headers.forEach((h, i) => {
      headerMap[normalizeHeader(h)] = i;
    });

    const customers = bodyRows
      .map((row) => ({
        customerId: getCell(row, headerMap, "CustomerID", "Customer Id"),
        customerName: getCell(row, headerMap, "CustomerName", "Customer Name"),
        contactPerson: getCell(row, headerMap, "ContactPerson", "Contact Person"),
        contactEmail: getCell(row, headerMap, "ContactEmail", "Contact Email"),
        contactPhone: getCell(row, headerMap, "ContactPhone", "Contact Phone"),
        countryMarket: getCell(row, headerMap, "CountryMarket", "Country Market"),
        deliveryLocation: getCell(row, headerMap, "DeliveryLocation", "Delivery Location"),
        createdAt: getCell(row, headerMap, "CreatedAt", "Created At"),
        updatedAt: getCell(row, headerMap, "UpdatedAt", "Updated At"),
        notes: getCell(row, headerMap, "Notes"),
      }))
      .filter((x) => x.customerId || x.customerName);

    customers.sort((a, b) =>
      String(a.customerName || "").localeCompare(String(b.customerName || ""))
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