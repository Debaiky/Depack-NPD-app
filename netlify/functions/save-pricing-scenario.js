const {
  getPricingScenariosByRequestId,
  makePricingId,
  upsertPricingScenario,
} = require("./_sheet");

const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    const {
      requestId,
      pricingId,
      scenarioName,
      scenarioNote,
      createdBy,
      scenarioStatus,
      pricingData,
      totalCostPer1000,
      sellingPricePer1000,
      marginPct,
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

    const existingRows = await getPricingScenariosByRequestId(requestId);
    const finalPricingId = pricingId || makePricingId(requestId, existingRows);

    let createdDate = new Date().toISOString();
    const existing = existingRows.find((r) => r.PricingID === finalPricingId);
    if (existing?.CreatedDate) {
      createdDate = existing.CreatedDate;
    }

    await upsertPricingScenario({
      PricingID: finalPricingId,
      RequestID: requestId,
      ScenarioName: scenarioName || "Scenario",
      ScenarioNote: scenarioNote || "",
      CreatedBy: createdBy || "",
      CreatedDate: createdDate,
      ScenarioStatus: scenarioStatus || "Draft",
      PricingJSON: JSON.stringify(pricingData || {}),
      TotalCostPer1000: totalCostPer1000 || "",
      SellingPricePer1000: sellingPricePer1000 || "",
      MarginPct: marginPct || "",
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        pricingId: finalPricingId,
      }),
    };
  } catch (err) {
    console.error("SAVE PRICING SCENARIO ERROR:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: err.message || "Failed to save pricing scenario",
      }),
    };
  }
};

module.exports = { handler };