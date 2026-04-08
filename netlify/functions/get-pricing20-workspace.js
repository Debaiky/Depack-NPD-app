const { getObjectByKey } = require("./_pricing20-sheet");

const WORKSPACE_SHEET = "PRICING20_WORKSPACES";

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

    const requestId = String(
      event.queryStringParameters?.requestId || ""
    ).trim();

    if (!requestId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "Missing requestId",
        }),
      };
    }

    const workspace = await getObjectByKey(
      WORKSPACE_SHEET,
      "requestId",
      requestId
    );

    if (!workspace) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: "Pricing 2.0 workspace not found",
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        workspace,
      }),
    };
  } catch (error) {
    console.error("get-pricing20-workspace error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message || "Failed to load Pricing 2.0 workspace",
      }),
    };
  }
};