const { getPricingScenariosByRequestId } = require("./_sheet");

const handler = async (event) => {
  try {
    const requestId = event.queryStringParameters?.requestId || "";

    if (!requestId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "Missing requestId",
        }),
      };
    }

    const scenarios = await getPricingScenariosByRequestId(requestId);

    scenarios.sort((a, b) => {
      const da = a.CreatedDate || "";
      const db = b.CreatedDate || "";
      return da < db ? 1 : -1;
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        scenarios,
      }),
    };
  } catch (err) {
    console.error("LIST PRICING SCENARIOS ERROR:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: err.message || "Failed to list pricing scenarios",
      }),
    };
  }
};

module.exports = { handler };