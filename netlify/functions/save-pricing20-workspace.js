const { upsertObject } = require("./_pricing20-sheet");

const WORKSPACE_SHEET = "PRICING20_WORKSPACES";

const handler = async (event) => {
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

    if (!requestId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "Missing requestId",
        }),
      };
    }

    const engineeringSnapshot =
      body.engineeringSnapshot ||
      body.engineeringData ||
      {};

    const record = {
      requestId,
      status: body.status || "Pending pricing",
      customerName: body.customerName || "",
      projectName: body.projectName || "",
      productName: body.productName || "",
      productType: body.productType || "",
      material: body.material || "",
      thumbnailUrl: body.thumbnailUrl || "",
      thumbnailBase64: body.thumbnailBase64 || "",
      engineeringSnapshotSize: JSON.stringify(engineeringSnapshot).length,
      hasEngineeringSnapshot: "Yes",
    };

    const saved = await upsertObject(WORKSPACE_SHEET, "requestId", record);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        requestId,
        workspace: saved,
      }),
    };
  } catch (error) {
    console.error("save-pricing20-workspace error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message || "Failed to save Pricing 2.0 workspace",
      }),
    };
  }
};

module.exports = { handler };