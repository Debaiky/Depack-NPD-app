import { useEffect, useMemo } from "react";

function toNum(v) {
  const n = parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isNaN(n) ? 0 : n;
}

function fmt(v, d = 3) {
  const num = Number(v || 0);
  return num.toLocaleString(undefined, {
    maximumFractionDigits: d,
    minimumFractionDigits: 0,
  });
}

function getIsSheet(requestData) {
  return requestData?.product?.productType === "Sheet Roll";
}

function Input({ value, onChange, placeholder = "" }) {
  return (
    <input
      className="w-full border rounded-lg px-3 py-2"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

function SelectInput({ value, onChange, options = [] }) {
  return (
    <select
      className="w-full border rounded-lg px-3 py-2"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => {
        const valueKey = typeof o === "string" ? o : o.value;
        const labelKey = typeof o === "string" ? o : o.label;
        return (
          <option key={valueKey} value={valueKey}>
            {labelKey}
          </option>
        );
      })}
    </select>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      {children}
    </label>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="border rounded-xl p-3 bg-white">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium break-words">{value}</div>
    </div>
  );
}

function SectionNote({ children, tone = "gray" }) {
  const styles = {
    gray: "border-gray-200 bg-gray-50 text-gray-700",
    red: "border-red-200 bg-red-50 text-red-700",
    orange: "border-orange-200 bg-orange-50 text-orange-700",
    green: "border-green-200 bg-green-50 text-green-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
  };

  return <div className={`rounded-xl border p-3 text-sm ${styles[tone]}`}>{children}</div>;
}

function getPctOfTotal(value, total) {
  return total > 0 ? (toNum(value) / total) * 100 : 0;
}

export default function PricingResultsTab({
  requestData,
  scenarioEngineering,
  bomData,
  investmentsData,
  resultsData,
  setResultsData,
}) {
  const isSheet = getIsSheet(requestData);

  useEffect(() => {
    if (isSheet) {
      const allowed = ["extrusionPerDay", "conversionPerTon", "salesPricePerTon"];
      if (!allowed.includes(resultsData?.mode)) {
        setResultsData((prev) => ({
          ...(prev || {}),
          mode: "conversionPerTon",
          inputs: {
            requiredExtrusionConversionPerDay:
              prev?.inputs?.requiredExtrusionConversionPerDay || "",
            requiredConversionCostPerTon:
              prev?.inputs?.requiredConversionCostPerTon || "",
            requiredSalesPricePerTon:
              prev?.inputs?.requiredSalesPricePerTon || "",
          },
          summary: prev?.summary || {},
        }));
      }
    } else {
      const allowed = [
        "extrusionPerDay",
        "thermoPerDay",
        "conversionPer1000",
        "sellingPricePer1000",
      ];

      if (!allowed.includes(resultsData?.mode)) {
        setResultsData((prev) => ({
          ...(prev || {}),
          mode: "conversionPer1000",
          inputs: {
            requiredExtrusionConversionPerDay:
              prev?.inputs?.requiredExtrusionConversionPerDay || "",
            requiredThermoConversionPerDay:
              prev?.inputs?.requiredThermoConversionPerDay || "",
            requiredConversionCostPer1000:
              prev?.inputs?.requiredConversionCostPer1000 || "",
            requiredSellingPricePer1000:
              prev?.inputs?.requiredSellingPricePer1000 || "",
          },
          summary: prev?.summary || {},
        }));
      }
    }
  }, [isSheet, resultsData?.mode, setResultsData]);

  const extrusionProductivityTonPerDay = toNum(
    scenarioEngineering?.extrusion?.tonsPerDay24h
  );

  const thermoProductivityPcsPerDay = toNum(
    scenarioEngineering?.thermo?.pcsPerDay24h
  );

  const unitWeightG = toNum(
    scenarioEngineering?.thermo?.unitWeight_g || requestData?.product?.productWeightG
  );

  const sheetUtilPct = toNum(scenarioEngineering?.thermo?.sheetUtilizationPct);
  const sheetUtilFactor = sheetUtilPct > 0 ? sheetUtilPct / 100 : 1;

  const thermoConsumptionTonPerDay =
    !isSheet && thermoProductivityPcsPerDay > 0 && unitWeightG > 0 && sheetUtilFactor > 0
      ? ((thermoProductivityPcsPerDay * unitWeightG) / 1000 / sheetUtilFactor) / 1000
      : 0;

  const materialBase = isSheet
    ? toNum(bomData?.material?.summary?.materialBaseCostPerTon)
    : toNum(bomData?.material?.summary?.materialBaseCostPer1000);

  const materialWaste = isSheet
    ? toNum(bomData?.material?.summary?.materialWasteCostPerTon)
    : toNum(bomData?.material?.summary?.materialWasteCostPer1000);

  const packagingBase = isSheet
    ? toNum(bomData?.packaging?.summary?.packagingBaseCostPerTon)
    : toNum(bomData?.packaging?.summary?.packagingBaseCostPer1000);

  const packagingWaste = isSheet
    ? toNum(bomData?.packaging?.summary?.packagingWasteCostPerTon)
    : toNum(bomData?.packaging?.summary?.packagingWasteCostPer1000);

  const decorationBase = !isSheet
    ? toNum(bomData?.decoration?.summary?.decorationCostPer1000)
    : 0;

  const decorationWaste = !isSheet
    ? toNum(bomData?.decoration?.summary?.decorationWasteCostPer1000)
    : 0;

  const workingCapital = isSheet
    ? toNum(bomData?.workingCapital?.summary?.workingCapitalCostPerTon)
    : toNum(bomData?.workingCapital?.summary?.workingCapitalCostPer1000);

  const freight = isSheet
    ? toNum(bomData?.freight?.summary?.freightCostPerTon)
    : toNum(bomData?.freight?.summary?.freightCostPer1000);

  const amortization = isSheet
    ? toNum(investmentsData?.summary?.amortizationCostPerTon)
    : toNum(investmentsData?.summary?.amortizationCostPer1000);

  const wasteCost = materialWaste + packagingWaste + decorationWaste;

  const baseCostWithoutConversion =
    materialBase +
    packagingBase +
    decorationBase +
    wasteCost +
    workingCapital +
    freight +
    amortization;

  const computedSummary = useMemo(() => {
    if (isSheet) {
      const mode = resultsData?.mode || "conversionPerTon";
      const inputs = resultsData?.inputs || {};

      let requiredExtrusionConversionPerDay = 0;
      let requiredConversionCostPerTon = 0;
      let requiredSalesPricePerTon = 0;

      if (mode === "extrusionPerDay") {
        requiredExtrusionConversionPerDay = toNum(
          inputs.requiredExtrusionConversionPerDay
        );
        requiredConversionCostPerTon =
          extrusionProductivityTonPerDay > 0
            ? requiredExtrusionConversionPerDay / extrusionProductivityTonPerDay
            : 0;
        requiredSalesPricePerTon =
          baseCostWithoutConversion + requiredConversionCostPerTon;
      } else if (mode === "salesPricePerTon") {
        requiredSalesPricePerTon = toNum(inputs.requiredSalesPricePerTon);
        requiredConversionCostPerTon =
          requiredSalesPricePerTon - baseCostWithoutConversion;
        if (requiredConversionCostPerTon < 0) requiredConversionCostPerTon = 0;
        requiredExtrusionConversionPerDay =
          requiredConversionCostPerTon * extrusionProductivityTonPerDay;
      } else {
        requiredConversionCostPerTon = toNum(inputs.requiredConversionCostPerTon);
        requiredExtrusionConversionPerDay =
          requiredConversionCostPerTon * extrusionProductivityTonPerDay;
        requiredSalesPricePerTon =
          baseCostWithoutConversion + requiredConversionCostPerTon;
      }

      const totalPrice = requiredSalesPricePerTon;

      const costBreakdown = [
        {
          key: "material",
          label: "Material Cost / Ton",
          value: materialBase,
          pct: getPctOfTotal(materialBase, totalPrice),
        },
        {
          key: "packaging",
          label: "Packaging Cost / Ton",
          value: packagingBase,
          pct: getPctOfTotal(packagingBase, totalPrice),
        },
        {
          key: "waste",
          label: "Waste Cost / Ton",
          value: wasteCost,
          pct: getPctOfTotal(wasteCost, totalPrice),
        },
        {
          key: "workingCapital",
          label: "Working Capital Cost / Ton",
          value: workingCapital,
          pct: getPctOfTotal(workingCapital, totalPrice),
        },
        {
          key: "freight",
          label: "Freight Cost / Ton",
          value: freight,
          pct: getPctOfTotal(freight, totalPrice),
        },
        {
          key: "amortization",
          label: "Amortization Cost / Ton",
          value: amortization,
          pct: getPctOfTotal(amortization, totalPrice),
        },
        {
          key: "conversion",
          label: "Conversion Cost / Ton",
          value: requiredConversionCostPerTon,
          pct: getPctOfTotal(requiredConversionCostPerTon, totalPrice),
        },
      ];

      return {
        isSheet: true,
        extrusionProductivityTonPerDay,
        baseCostWithoutConversion,
        requiredExtrusionConversionPerDay,
        requiredConversionCostPerTon,
        requiredSalesPricePerTon,
        costBreakdown,
      };
    }

    const mode = resultsData?.mode || "conversionPer1000";
    const inputs = resultsData?.inputs || {};

    let requiredExtrusionConversionPerDay = 0;
    let requiredThermoConversionPerDay = 0;
    let requiredConversionCostPer1000 = 0;
    let requiredSellingPricePer1000 = 0;

    if (mode === "extrusionPerDay") {
      requiredExtrusionConversionPerDay = toNum(
        inputs.requiredExtrusionConversionPerDay
      );

      requiredThermoConversionPerDay =
        extrusionProductivityTonPerDay > 0
          ? (requiredExtrusionConversionPerDay / extrusionProductivityTonPerDay) *
            thermoConsumptionTonPerDay
          : 0;

      requiredConversionCostPer1000 =
        thermoProductivityPcsPerDay > 0
          ? (requiredThermoConversionPerDay / thermoProductivityPcsPerDay) * 1000
          : 0;

      requiredSellingPricePer1000 =
        baseCostWithoutConversion + requiredConversionCostPer1000;
    } else if (mode === "thermoPerDay") {
      requiredThermoConversionPerDay = toNum(
        inputs.requiredThermoConversionPerDay
      );

      requiredConversionCostPer1000 =
        thermoProductivityPcsPerDay > 0
          ? (requiredThermoConversionPerDay / thermoProductivityPcsPerDay) * 1000
          : 0;

      requiredExtrusionConversionPerDay =
        thermoConsumptionTonPerDay > 0
          ? (requiredThermoConversionPerDay / thermoConsumptionTonPerDay) *
            extrusionProductivityTonPerDay
          : 0;

      requiredSellingPricePer1000 =
        baseCostWithoutConversion + requiredConversionCostPer1000;
    } else if (mode === "sellingPricePer1000") {
      requiredSellingPricePer1000 = toNum(inputs.requiredSellingPricePer1000);

      requiredConversionCostPer1000 =
        requiredSellingPricePer1000 - baseCostWithoutConversion;

      if (requiredConversionCostPer1000 < 0) requiredConversionCostPer1000 = 0;

      requiredThermoConversionPerDay =
        (requiredConversionCostPer1000 * thermoProductivityPcsPerDay) / 1000;

      requiredExtrusionConversionPerDay =
        thermoConsumptionTonPerDay > 0
          ? (requiredThermoConversionPerDay / thermoConsumptionTonPerDay) *
            extrusionProductivityTonPerDay
          : 0;
    } else {
      requiredConversionCostPer1000 = toNum(
        inputs.requiredConversionCostPer1000
      );

      requiredThermoConversionPerDay =
        (requiredConversionCostPer1000 * thermoProductivityPcsPerDay) / 1000;

      requiredExtrusionConversionPerDay =
        thermoConsumptionTonPerDay > 0
          ? (requiredThermoConversionPerDay / thermoConsumptionTonPerDay) *
            extrusionProductivityTonPerDay
          : 0;

      requiredSellingPricePer1000 =
        baseCostWithoutConversion + requiredConversionCostPer1000;
    }

    const totalPrice = requiredSellingPricePer1000;

    const costBreakdown = [
      {
        key: "material",
        label: "Material Cost / 1000 pcs",
        value: materialBase,
        pct: getPctOfTotal(materialBase, totalPrice),
      },
      {
        key: "packaging",
        label: "Packaging Cost / 1000 pcs",
        value: packagingBase,
        pct: getPctOfTotal(packagingBase, totalPrice),
      },
      {
        key: "decoration",
        label: "Decoration Cost / 1000 pcs",
        value: decorationBase,
        pct: getPctOfTotal(decorationBase, totalPrice),
      },
      {
        key: "waste",
        label: "Waste Cost / 1000 pcs",
        value: wasteCost,
        pct: getPctOfTotal(wasteCost, totalPrice),
      },
      {
        key: "workingCapital",
        label: "Working Capital Cost / 1000 pcs",
        value: workingCapital,
        pct: getPctOfTotal(workingCapital, totalPrice),
      },
      {
        key: "freight",
        label: "Freight Cost / 1000 pcs",
        value: freight,
        pct: getPctOfTotal(freight, totalPrice),
      },
      {
        key: "amortization",
        label: "Amortization Cost / 1000 pcs",
        value: amortization,
        pct: getPctOfTotal(amortization, totalPrice),
      },
      {
        key: "conversion",
        label: "Conversion Cost / 1000 pcs",
        value: requiredConversionCostPer1000,
        pct: getPctOfTotal(requiredConversionCostPer1000, totalPrice),
      },
    ];

    return {
      isSheet: false,
      extrusionProductivityTonPerDay,
      thermoProductivityPcsPerDay,
      thermoConsumptionTonPerDay,
      baseCostWithoutConversion,
      requiredExtrusionConversionPerDay,
      requiredThermoConversionPerDay,
      requiredConversionCostPer1000,
      requiredSellingPricePer1000,
      costBreakdown,
    };
  }, [
    isSheet,
    resultsData,
    extrusionProductivityTonPerDay,
    thermoProductivityPcsPerDay,
    thermoConsumptionTonPerDay,
    baseCostWithoutConversion,
    materialBase,
    packagingBase,
    decorationBase,
    wasteCost,
    workingCapital,
    freight,
    amortization,
  ]);

  useEffect(() => {
    setResultsData((prev) => ({
      ...(prev || {}),
      summary: computedSummary,
    }));
  }, [computedSummary, setResultsData]);

  const updateMode = (value) => {
    setResultsData((prev) => ({
      ...(prev || {}),
      mode: value,
    }));
  };

  const updateInput = (key, value) => {
    setResultsData((prev) => ({
      ...(prev || {}),
      inputs: {
        ...(prev?.inputs || {}),
        [key]: value,
      },
    }));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
        <h3 className="font-semibold">Results Input Logic</h3>

        <SectionNote tone="blue">
          Enter any one target input and the system will calculate the rest dynamically.
        </SectionNote>

        {isSheet ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Calculation Mode">
                <SelectInput
                  value={resultsData?.mode || "conversionPerTon"}
                  onChange={updateMode}
                  options={[
                    {
                      value: "extrusionPerDay",
                      label: "Required Extrusion Conversion / Day",
                    },
                    {
                      value: "conversionPerTon",
                      label: "Required Conversion Cost / Ton",
                    },
                    {
                      value: "salesPricePerTon",
                      label: "Required Sales Price / Ton",
                    },
                  ]}
                />
              </Field>

              {resultsData?.mode === "extrusionPerDay" && (
                <Field label="Required Extrusion Conversion / Day">
                  <Input
                    value={resultsData?.inputs?.requiredExtrusionConversionPerDay}
                    onChange={(v) =>
                      updateInput("requiredExtrusionConversionPerDay", v)
                    }
                  />
                </Field>
              )}

              {resultsData?.mode === "conversionPerTon" && (
                <Field label="Required Conversion Cost / Ton">
                  <Input
                    value={resultsData?.inputs?.requiredConversionCostPerTon}
                    onChange={(v) => updateInput("requiredConversionCostPerTon", v)}
                  />
                </Field>
              )}

              {resultsData?.mode === "salesPricePerTon" && (
                <Field label="Required Sales Price / Ton">
                  <Input
                    value={resultsData?.inputs?.requiredSalesPricePerTon}
                    onChange={(v) => updateInput("requiredSalesPricePerTon", v)}
                  />
                </Field>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <InfoTile
                label="Extrusion Productivity / Day"
                value={`${fmt(computedSummary.extrusionProductivityTonPerDay, 3)} ton/day`}
              />
              <InfoTile
                label="Required Extrusion Conversion / Day"
                value={`${fmt(computedSummary.requiredExtrusionConversionPerDay, 3)} EGP/day`}
              />
              <InfoTile
                label="Required Conversion Cost / Ton"
                value={`${fmt(computedSummary.requiredConversionCostPerTon, 3)} EGP`}
              />
              <InfoTile
                label="Required Sales Price / Ton"
                value={`${fmt(computedSummary.requiredSalesPricePerTon, 3)} EGP`}
              />
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Calculation Mode">
                <SelectInput
                  value={resultsData?.mode || "conversionPer1000"}
                  onChange={updateMode}
                  options={[
                    {
                      value: "extrusionPerDay",
                      label: "Required Extrusion Conversion / Day",
                    },
                    {
                      value: "thermoPerDay",
                      label: "Required Thermoforming Conversion / Day",
                    },
                    {
                      value: "conversionPer1000",
                      label: "Required Conversion Cost / 1000 pcs",
                    },
                    {
                      value: "sellingPricePer1000",
                      label: "Required Selling Price / 1000 pcs",
                    },
                  ]}
                />
              </Field>

              {resultsData?.mode === "extrusionPerDay" && (
                <Field label="Required Extrusion Conversion / Day">
                  <Input
                    value={resultsData?.inputs?.requiredExtrusionConversionPerDay}
                    onChange={(v) =>
                      updateInput("requiredExtrusionConversionPerDay", v)
                    }
                  />
                </Field>
              )}

              {resultsData?.mode === "thermoPerDay" && (
                <Field label="Required Thermoforming Conversion / Day">
                  <Input
                    value={resultsData?.inputs?.requiredThermoConversionPerDay}
                    onChange={(v) =>
                      updateInput("requiredThermoConversionPerDay", v)
                    }
                  />
                </Field>
              )}

              {resultsData?.mode === "conversionPer1000" && (
                <Field label="Required Conversion Cost / 1000 pcs">
                  <Input
                    value={resultsData?.inputs?.requiredConversionCostPer1000}
                    onChange={(v) =>
                      updateInput("requiredConversionCostPer1000", v)
                    }
                  />
                </Field>
              )}

              {resultsData?.mode === "sellingPricePer1000" && (
                <Field label="Required Selling Price / 1000 pcs">
                  <Input
                    value={resultsData?.inputs?.requiredSellingPricePer1000}
                    onChange={(v) =>
                      updateInput("requiredSellingPricePer1000", v)
                    }
                  />
                </Field>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <InfoTile
                label="Extrusion Productivity / Day"
                value={`${fmt(computedSummary.extrusionProductivityTonPerDay, 3)} ton/day`}
              />
              <InfoTile
                label="Thermo Productivity / Day"
                value={`${fmt(computedSummary.thermoProductivityPcsPerDay, 0)} pcs/day`}
              />
              <InfoTile
                label="Thermo Tons Consumed / Day"
                value={`${fmt(computedSummary.thermoConsumptionTonPerDay, 3)} ton/day`}
              />
              <InfoTile
                label="Required Conversion Cost / 1000 pcs"
                value={`${fmt(computedSummary.requiredConversionCostPer1000, 3)} EGP`}
              />
              <InfoTile
                label="Required Thermo Conversion / Day"
                value={`${fmt(computedSummary.requiredThermoConversionPerDay, 3)} EGP/day`}
              />
              <InfoTile
                label="Required Extrusion Conversion / Day"
                value={`${fmt(computedSummary.requiredExtrusionConversionPerDay, 3)} EGP/day`}
              />
              <InfoTile
                label="Required Selling Price / 1000 pcs"
                value={`${fmt(computedSummary.requiredSellingPricePer1000, 3)} EGP`}
              />
            </div>
          </>
        )}
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
        <h3 className="font-semibold">
          {isSheet ? "Sheet Results Breakdown" : "Non-Sheet Results Breakdown"}
        </h3>

        <div className="space-y-2 text-sm">
          {computedSummary.costBreakdown?.map((row) => (
            <div
              key={row.key}
              className="flex items-center justify-between gap-3 border-b pb-2"
            >
              <span>{row.label}</span>
              <span className="font-medium">
                {fmt(row.value, 3)} EGP{" "}
                <span className="text-gray-500">({fmt(row.pct, 2)}%)</span>
              </span>
            </div>
          ))}

          <div className="flex items-center justify-between gap-3 pt-2 text-base font-semibold">
            <span>{isSheet ? "Total Sales Price / Ton" : "Total Selling Price / 1000 pcs"}</span>
            <span>
              {isSheet
                ? `${fmt(computedSummary.requiredSalesPricePerTon, 3)} EGP`
                : `${fmt(computedSummary.requiredSellingPricePer1000, 3)} EGP`}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
        <h3 className="font-semibold">Results Summary</h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <InfoTile
            label={isSheet ? "Material Cost / Ton" : "Material Cost / 1000 pcs"}
            value={`${fmt(materialBase, 3)} EGP`}
          />
          <InfoTile
            label={isSheet ? "Packaging Cost / Ton" : "Packaging Cost / 1000 pcs"}
            value={`${fmt(packagingBase, 3)} EGP`}
          />
          {!isSheet && (
            <InfoTile
              label="Decoration Cost / 1000 pcs"
              value={`${fmt(decorationBase, 3)} EGP`}
            />
          )}
          <InfoTile
            label={isSheet ? "Waste Cost / Ton" : "Waste Cost / 1000 pcs"}
            value={`${fmt(wasteCost, 3)} EGP`}
          />
          <InfoTile
            label={isSheet ? "Working Capital / Ton" : "Working Capital / 1000 pcs"}
            value={`${fmt(workingCapital, 3)} EGP`}
          />
          <InfoTile
            label={isSheet ? "Freight / Ton" : "Freight / 1000 pcs"}
            value={`${fmt(freight, 3)} EGP`}
          />
          <InfoTile
            label={isSheet ? "Amortization / Ton" : "Amortization / 1000 pcs"}
            value={`${fmt(amortization, 3)} EGP`}
          />
          <InfoTile
            label={isSheet ? "Conversion / Ton" : "Conversion / 1000 pcs"}
            value={`${
              isSheet
                ? fmt(computedSummary.requiredConversionCostPerTon, 3)
                : fmt(computedSummary.requiredConversionCostPer1000, 3)
            } EGP`}
          />
        </div>

        <SectionNote tone="green">
          {isSheet
            ? `Required Sales Price / Ton = ${fmt(
                computedSummary.requiredSalesPricePerTon,
                3
              )} EGP`
            : `Required Selling Price / 1000 pcs = ${fmt(
                computedSummary.requiredSellingPricePer1000,
                3
              )} EGP`}
        </SectionNote>
      </div>
    </div>
  );
}