/* eslint-env node */
import { googleJsonFetch } from "./_google-rest.js";

const SHEETS_SCOPE = ["https://www.googleapis.com/auth/spreadsheets"];

const generateCustomerId = () => `CUST-${Date.now()}`;

function normalize(value) {
  return String(value || "").trim().toLowerCase();
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

    const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Customers_Master!A:I`;
    const existing = await googleJsonFetch(getUrl, {
      scopes: SHEETS_SCOPE,
    });

    const rows = existing.values || [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] || [];
      const rowName = normalize(row[1]);
      const rowEmail = normalize(row[3]);

      if (rowName === normalize(customerName) && rowEmail === normalize(contactEmail)) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            success: true,
            alreadyExists: true,
            customer: {
              CustomerID: row[0] || "",
              CustomerName: row[1] || "",
              ContactPerson: row[2] || "",
              ContactEmail: row[3] || "",
              ContactPhone: row[4] || "",
              CountryMarket: row[5] || "",
              DeliveryLocation: row[6] || "",
              Notes: row[7] || "",
              CreatedAt: row[8] || "",
            },
          }),
        };
      }
    }

    const newCustomer = [
      generateCustomerId(),
      customerName,
      contactPerson,
      contactEmail,
      contactPhone,
      countryMarket,
      deliveryLocation,
      notes,
      new Date().toISOString(),
    ];

    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Customers_Master!A:I:append?valueInputOption=USER_ENTERED`;

    await googleJsonFetch(appendUrl, {
      method: "POST",
      scopes: SHEETS_SCOPE,
      body: {
        values: [newCustomer],
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        alreadyExists: false,
        customer: {
          CustomerID: newCustomer[0],
          CustomerName: newCustomer[1],
          ContactPerson: newCustomer[2],
          ContactEmail: newCustomer[3],
          ContactPhone: newCustomer[4],
          CountryMarket: newCustomer[5],
          DeliveryLocation: newCustomer[6],
          Notes: newCustomer[7],
          CreatedAt: newCustomer[8],
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