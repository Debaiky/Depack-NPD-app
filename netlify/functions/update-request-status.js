const { updateRequestRow } = require("./_sheet");

const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { requestId, status } = body;

    if (!requestId || !status) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "Missing requestId or status",
        }),
      };
    }

    await updateRequestRow(requestId, {
      Status: status,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
      }),
    };
  } catch (err) {
    console.error("UPDATE REQUEST STATUS ERROR:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: err.message || "Failed to update request status",
      }),
    };
  }
};

module.exports = { handler };