const { listObjects } = require("./_pricing20-sheet");

const SCENARIO_SHEET = "PRICING20_SCENARIOS";

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "GET") {
      return {
        statusCode: 405,
        body: JSON.stringify({ success: false, error: "Method not allowed" }),
      };
    }

    const requestId = String(
      event.queryStringParameters?.requestId || ""
    ).trim();

    const rows = await listObjects(SCENARIO_SHEET);

    const filtered = requestId
      ? rows.filter((row) => String(row.requestId || "") === requestId)
      : rows;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        scenarios: filtered.map((row) => ({
          scenarioId: row.scenarioId || "",
          requestId: row.requestId || "",
          scenarioName: row.scenarioName || "",
          createdBy: row.createdBy || "",
          scenarioDate: row.scenarioDate || "",
          scenarioStatus: row.scenarioStatus || "",
          updatedAt: row.updatedAt || "",
          createdAt: row.createdAt || "",
        })),
      }),
    };
  } catch (error) {
    console.error("list-pricing20-scenarios error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message || "Failed to list Pricing 2.0 scenarios",
      }),
    };
  }
};