const {
  getRequestRowById,
  getPricingScenariosByRequestId,
} = require("./_sheet");

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

    const requestRow = await getRequestRowById(requestId);

    if (!requestRow) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: "Request not found",
        }),
      };
    }

    const scenarios = await getPricingScenariosByRequestId(requestId);

    scenarios.sort((a, b) => {
      const da = a.CreatedDate || "";
      const db = b.CreatedDate || "";
      return da < db ? 1 : -1;
    });

    const workspacePassword =
      scenarios.find((s) => s.WorkspacePassword)?.WorkspacePassword || "";

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        request: requestRow,
        scenarios,
        workspacePassword,
      }),
    };
  } catch (err) {
    console.error("GET PRICING WORKSPACE ERROR:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: err.message || "Failed to load pricing workspace",
      }),
    };
  }
};

module.exports = { handler };