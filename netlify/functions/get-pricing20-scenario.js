const { getObjectByKey, listObjects } = require("./_pricing20-sheet");

const SCENARIO_SHEET = "PRICING20_SCENARIOS";

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "GET") {
      return {
        statusCode: 405,
        body: JSON.stringify({
          success: false,
          error: "Method not allowed",
        }),
      };
    }

    const requestId = String(event.queryStringParameters?.requestId || "").trim();
    const scenarioId = String(event.queryStringParameters?.scenarioId || "").trim();

    if (!scenarioId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "Missing scenarioId",
        }),
      };
    }

    let row = await getObjectByKey(SCENARIO_SHEET, "scenarioId", scenarioId);

    if (!row && requestId) {
      const rows = await listObjects(SCENARIO_SHEET);
      row = rows.find(
        (r) =>
          String(r.requestId || "").trim() === requestId &&
          String(r.scenarioId || "").trim() === scenarioId
      );
    }

    if (!row) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: "Scenario not found",
        }),
      };
    }

    let scenarioData = {};
    try {
      scenarioData = row.scenarioDataJson
        ? JSON.parse(row.scenarioDataJson)
        : {};
    } catch (parseError) {
      console.error("Failed to parse scenarioDataJson:", parseError);
      scenarioData = {};
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        row,
        scenarioData,
      }),
    };
  } catch (error) {
    console.error("get-pricing20-scenario error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message || "Failed to load Pricing 2.0 scenario",
      }),
    };
  }
};