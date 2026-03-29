const { updateRow, findRequestRowById } = require("./_sheet");

const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    const { requestId, status, engineerName, engineeringData } = body;

    if (!requestId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "Missing requestId",
        }),
      };
    }

    const rowIndex = await findRequestRowById(requestId);

    if (!rowIndex) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: "Request not found",
        }),
      };
    }

    await updateRow(requestId, {
      EngineeringStatus: status || "",
      EngineerName: engineerName || "",
      EngineeringData: JSON.stringify(engineeringData || {}),
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