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

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        scenarios,
      }),
    };
  } catch (err) {
    console.error("LIST PRICING ERROR:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: err.message,
      }),
    };
  }
};

module.exports = { handler };