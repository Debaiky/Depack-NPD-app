const { getPricingScenarioById } = require("./_sheet");

const handler = async (event) => {
  try {
    const pricingId = event.queryStringParameters?.pricingId || "";

    if (!pricingId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "Missing pricingId",
        }),
      };
    }

    const scenario = await getPricingScenarioById(pricingId);

    if (!scenario) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: "Scenario not found",
        }),
      };
    }

    let pricingData = {};
    try {
      pricingData = scenario.PricingJSON ? JSON.parse(scenario.PricingJSON) : {};
    } catch (e) {
      pricingData = {};
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        scenario,
        pricingData,
      }),
    };
  } catch (err) {
    console.error("GET PRICING SCENARIO ERROR:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: err.message || "Failed to get pricing scenario",
      }),
    };
  }
};

module.exports = { handler };