const {
  getAllScenarioRows,
  appendScenarioRow,
  updateScenarioRow,
  makePricingId,
} = require("./_pricing-scenarios");

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

    const rows = await getAllScenarioRows();

    let finalPricingId = pricingId;
    const now = new Date().toISOString();

    const existing = pricingId
      ? rows.find((r) => r.PricingID === pricingId && r.RequestID === requestId)
      : null;

    if (existing) {
      await updateScenarioRow(existing._rowIndex, {
        PricingID: existing.PricingID,
        RequestID: requestId,
        ScenarioName: scenarioName || existing.ScenarioName || "Scenario",
        ScenarioNote: scenarioNote || "",
        CreatedBy: createdBy || existing.CreatedBy || "",
        CreatedDate: existing.CreatedDate || now,
        ScenarioStatus: scenarioStatus || existing.ScenarioStatus || "Draft",
        PricingJSON: JSON.stringify(pricingData || {}),
        TotalCostPer1000: totalCostPer1000 || "",
        SellingPricePer1000: sellingPricePer1000 || "",
        MarginPct: marginPct || "",
      });

      finalPricingId = existing.PricingID;
    } else {
      finalPricingId = makePricingId(requestId, rows);

      await appendScenarioRow({
        PricingID: finalPricingId,
        RequestID: requestId,
        ScenarioName: scenarioName || "Scenario",
        ScenarioNote: scenarioNote || "",
        CreatedBy: createdBy || "",
        CreatedDate: now,
        ScenarioStatus: scenarioStatus || "Draft",
        PricingJSON: JSON.stringify(pricingData || {}),
        TotalCostPer1000: totalCostPer1000 || "",
        SellingPricePer1000: sellingPricePer1000 || "",
        MarginPct: marginPct || "",
      });
    }

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