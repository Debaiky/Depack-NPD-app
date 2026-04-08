const { upsertObject } = require("./_pricing20-sheet");

const SCENARIO_SHEET = "PRICING20_SCENARIOS";

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({
          success: false,
          error: "Method not allowed",
        }),
      };
    }

    const body = JSON.parse(event.body || "{}");

    const requestId = String(body.requestId || "").trim();
    const scenarioId = String(
      body.scenarioId || body.pricing20Id || ""
    ).trim();

    if (!requestId || !scenarioId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "Missing requestId or scenarioId",
        }),
      };
    }

    const scenarioData = body.scenarioData || body.pricing20Data || {};
    const scenarioSetup = scenarioData.scenarioSetup || {};

    const record = {
      requestId,
      scenarioId,
      pricing20Id: scenarioId,
      scenarioName: body.scenarioName || scenarioSetup.scenarioName || "",
      createdBy: body.createdBy || scenarioSetup.createdBy || "",
      scenarioDate: body.scenarioDate || scenarioSetup.scenarioDate || "",
      scenarioStatus:
        body.scenarioStatus || scenarioSetup.scenarioStatus || "Draft",
      scenarioDataJson: JSON.stringify(scenarioData || {}),
    };

    const saved = await upsertObject(SCENARIO_SHEET, "scenarioId", record);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        scenarioId,
        pricing20Id: scenarioId,
        row: saved,
      }),
    };
  } catch (error) {
    console.error("save-pricing20-scenario error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message || "Failed to save Pricing 2.0 scenario",
      }),
    };
  }
};