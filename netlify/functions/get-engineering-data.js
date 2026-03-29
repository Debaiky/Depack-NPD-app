const { getRowByRequestId } = require("./_sheet");

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

    const row = await getRowByRequestId(requestId);

    if (!row) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: "Request not found",
        }),
      };
    }

    let engineeringData = {};
    try {
      engineeringData = row.EngineeringData ? JSON.parse(row.EngineeringData) : {};
    } catch (e) {
      engineeringData = {};
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        engineerName: row.EngineerName || "",
        status: row.EngineeringStatus || "",
        engineeringData,
      }),
    };
  } catch (err) {
    console.error("GET ENGINEERING DATA ERROR:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: err.message || "Failed to get engineering data",
      }),
    };
  }
};

module.exports = { handler };