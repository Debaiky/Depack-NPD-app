const { getPricingWorkspaceByRequestId, upsertPricingWorkspace } = require("./_sheet");

const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const requestId = body?.requestId || "";
    const password = body?.password || "";

    if (!requestId || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "Missing requestId or password",
        }),
      };
    }

    const existing = await getPricingWorkspaceByRequestId(requestId);

    if (existing?.WorkspacePassword) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "Workspace password already exists",
        }),
      };
    }

    await upsertPricingWorkspace({
      RequestID: requestId,
      WorkspacePassword: password,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
      }),
    };
  } catch (err) {
    console.error("SET PRICING WORKSPACE PASSWORD ERROR:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: err.message || "Failed to set workspace password",
      }),
    };
  }
};

module.exports = { handler };
