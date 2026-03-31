/* eslint-env node */
import { googleJsonFetch } from "./_google-rest.js";

const SHEETS_SCOPE = ["https://www.googleapis.com/auth/spreadsheets"];

export async function handler(event) {
  try {
    const requestId = String(event.queryStringParameters?.requestId || "").trim();
    const spreadsheetId = process.env.GOOGLE_SHEETS_DATABASE_ID;

    if (!requestId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "Missing requestId",
        }),
      };
    }

    const [reqCustRes, custRes] = await Promise.all([
      googleJsonFetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Request_Customers!A:D`,
        { scopes: SHEETS_SCOPE }
      ),
      googleJsonFetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Customers_Master!A:J`,
        { scopes: SHEETS_SCOPE }
      ),
    ]);

    const reqCustRows = reqCustRes.values || [];
    const custRows = custRes.values || [];

    const customerMap = new Map();

    for (let i = 1; i < custRows.length; i += 1) {
      const row = custRows[i];
      const customerId = row[0] || "";
      if (!customerId) continue;

      customerMap.set(customerId, {
        customerId: row[0] || "",
        customerName: row[1] || "",
        contactPerson: row[2] || "",
        contactEmail: row[3] || "",
        contactPhone: row[4] || "",
        countryMarket: row[5] || "",
        deliveryLocation: row[6] || "",
        createdAt: row[7] || "",
        updatedAt: row[8] || "",
        notes: row[9] || "",
      });
    }

    const linked = [];
    for (let i = 1; i < reqCustRows.length; i += 1) {
      const row = reqCustRows[i];
      if ((row[0] || "") !== requestId) continue;

      const customerId = row[1] || "";
      const fallbackName = row[2] || "";

      linked.push(
        customerMap.get(customerId) || {
          customerId,
          customerName: fallbackName,
          contactPerson: "",
          contactEmail: "",
          contactPhone: "",
          countryMarket: "",
          deliveryLocation: "",
          createdAt: "",
          updatedAt: "",
          notes: "",
        }
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        customers: linked,
      }),
    };
  } catch (error) {
    console.error("GET REQUEST CUSTOMERS ERROR:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
}