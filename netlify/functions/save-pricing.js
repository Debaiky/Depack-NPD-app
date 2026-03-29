const { updateRow } = require("./_sheet");

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    const { requestId, pricingData } = body;

    if (!requestId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: "Missing requestId" }),
      };
    }

    await updateRow(requestId, {
      PricingData: JSON.stringify(pricingData),
      Status: "PRICING_COMPLETED",
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error("SAVE PRICING ERROR:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};