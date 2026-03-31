const { getPricingWorkspaceByRequestId, upsertPricingWorkspace } = require("./_sheet");

const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const requestId = body?.requestId || "";
    const oldPassword = body?.oldPassword || "";
    const newPassword = body?.newPassword || "";

    if (!requestId || !oldPassword || !newPassword) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "Missing required fields",
        }),
      };
    }

    const existing = await getPricingWorkspaceByRequestId(requestId);

    if (!existing) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: "Workspace not found",
        }),
      };
    }

    if ((existing.WorkspacePassword || "") !== oldPassword) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "Old password is incorrect",
        }),
      };
    }

    await upsertPricingWorkspace({
      RequestID: requestId,
      WorkspacePassword: newPassword,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
      }),
    };
  } catch (err) {
    console.error("CHANGE PRICING WORKSPACE PASSWORD ERROR:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: err.message || "Failed to change workspace password",
      }),
    };
  }
};

module.exports = { handler };