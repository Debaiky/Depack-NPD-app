const { upsertEngineeringRow } = require("./_sheet");

const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    const {
      requestId,
      status,
      engineerName,
      engineeringData,
      note,
    } = body;

    if (!requestId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "Missing requestId",
        }),
      };
    }

    await upsertEngineeringRow({
      RequestID: requestId,
      Status: status || "",
      EngineerName: engineerName || "",
      SavedAt: new Date().toISOString(),
      EngineeringJSON: JSON.stringify(engineeringData || {}),
      Note: note || "",
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
      }),
    };
  } catch (err) {
    console.error("SAVE ENGINEERING DATA ERROR:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: err.message || "Failed to save engineering data",
      }),
    };
  }
};

module.exports = { handler };