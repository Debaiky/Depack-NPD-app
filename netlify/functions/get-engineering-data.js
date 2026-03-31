const { getEngineeringRowByRequestId } = require("./_sheet");

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

    const row = await getEngineeringRowByRequestId(requestId);

    if (!row) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          engineeringData: {},
          status: "",
          engineerName: "",
          note: "",
          savedAt: "",
        }),
      };
    }

    let engineeringData = {};
    try {
      engineeringData = row.EngineeringJSON
        ? JSON.parse(row.EngineeringJSON)
        : {};
    } catch (e) {
      engineeringData = {};
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        engineeringData,
        status: row.Status || "",
        engineerName: row.EngineerName || "",
        note: row.Note || "",
        savedAt: row.SavedAt || "",
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