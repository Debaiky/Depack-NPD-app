/* eslint-env node */
import { googleJsonFetch } from "./_google-rest.js";

const SHEETS_SCOPE = ["https://www.googleapis.com/auth/spreadsheets"];

function normalizeHeader(header) {
  return String(header || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizeValue(value) {
  return String(value || "").trim().toLowerCase();
}

function makeCustomerId() {
  return `CUST-${Date.now()}`;
}

export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    const spreadsheetId = process.env.GOOGLE_SHEETS_DATABASE_ID;

    const customerName = String(body.customerName || "").trim();
    const contactPerson = String(body.contactPerson || "").trim();
    const contactEmail = String(body.contactEmail || "").trim();
    const contactPhone = String(body.contactPhone || "").trim();
    const countryMarket = String(body.countryMarket || "").trim();
    const deliveryLocation = String(body.deliveryLocation || "").trim();
    const notes = String(body.notes || "").trim();

    if (
      !customerName ||
      !contactPerson ||
      !contactEmail ||
      !contactPhone ||
      !countryMarket ||
      !deliveryLocation
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "Missing required customer fields",
        }),
      };
    }

    const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Customers_Master!A:J`;
    const existing = await googleJsonFetch(readUrl, { scopes: SHEETS_SCOPE });

    const rows = existing.values || [];
    const now = new Date().toISOString();

    if (rows.length === 0) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: "Customers_Master sheet is empty or missing headers",
        }),
      };
    }

    const headers = rows[0];
    const headerMap = {};
    headers.forEach((h, i) => {
      headerMap[normalizeHeader(h)] = i;
    });

    let foundRowIndex = -1;
    for (let i = 1; i < rows.length; i += 1) {
      const row = rows[i];
      const rowCustomerName = normalizeValue(row[headerMap[normalizeHeader("CustomerName")]]);
      const rowContactEmail = normalizeValue(row[headerMap[normalizeHeader("ContactEmail")]]);
      const rowCountryMarket = normalizeValue(row[headerMap[normalizeHeader("CountryMarket")]]);

      if (
        rowCustomerName === normalizeValue(customerName) &&
        rowContactEmail === normalizeValue(contactEmail) &&
        rowCountryMarket === normalizeValue(countryMarket)
      ) {
        foundRowIndex = i + 1;
        break;
      }
    }

    if (foundRowIndex !== -1) {
      const existingRow = rows[foundRowIndex - 1];
      const customer = {
        customerId: existingRow[headerMap[normalizeHeader("CustomerID")]] || "",
        customerName: existingRow[headerMap[normalizeHeader("CustomerName")]] || customerName,
        contactPerson: existingRow[headerMap[normalizeHeader("ContactPerson")]] || contactPerson,
        contactEmail: existingRow[headerMap[normalizeHeader("ContactEmail")]] || contactEmail,
        contactPhone: existingRow[headerMap[normalizeHeader("ContactPhone")]] || contactPhone,
        countryMarket: existingRow[headerMap[normalizeHeader("CountryMarket")]] || countryMarket,
        deliveryLocation:
          existingRow[headerMap[normalizeHeader("DeliveryLocation")]] || deliveryLocation,
        createdAt: existingRow[headerMap[normalizeHeader("CreatedAt")]] || "",
        updatedAt: existingRow[headerMap[normalizeHeader("UpdatedAt")]] || "",
        notes: existingRow[headerMap[normalizeHeader("Notes")]] || "",
      };

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          alreadyExists: true,
          customer,
        }),
      };
    }

    const customerId = makeCustomerId();

    const newRow = [
      customerId,
      customerName,
      contactPerson,
      contactEmail,
      contactPhone,
      countryMarket,
      deliveryLocation,
      now,
      now,
      notes,
    ];

    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Customers_Master!A:J:append?valueInputOption=USER_ENTERED`;

    await googleJsonFetch(appendUrl, {
      method: "POST",
      scopes: SHEETS_SCOPE,
      body: {
        values: [newRow],
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        alreadyExists: false,
        customer: {
          customerId,
          customerName,
          contactPerson,
          contactEmail,
          contactPhone,
          countryMarket,
          deliveryLocation,
          createdAt: now,
          updatedAt: now,
          notes,
        },
      }),
    };
  } catch (error) {
    console.error("SAVE CUSTOMER ERROR:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
}