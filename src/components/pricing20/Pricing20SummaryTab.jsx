import { useMemo } from "react";

function n(v) {
  const x = parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isNaN(x) ? 0 : x;
}

function fmt(v, d = 3) {
  if (v === "" || v === null || v === undefined || Number.isNaN(Number(v))) {
    return "—";
  }
  return Number(v).toLocaleString(undefined, {
    maximumFractionDigits: d,
    minimumFractionDigits: 0,
  });
}

function currencyToEgp(value, currency, usdEgp, eurUsd) {
  const amount = n(value);
  const curr = String(currency || "EGP").trim().toUpperCase();

  if (curr === "USD") return amount * n(usdEgp);
  if (curr === "EUR") return amount * n(eurUsd) * n(usdEgp);
  return amount;
}

function egpToUsd(value, usdEgp) {
  const rate = n(usdEgp);
  if (!rate) return 0;
  return n(value) / rate;
}

function egpToEur(value, usdEgp, eurUsd) {
  const eurToUsd = n(eurUsd);
  if (!eurToUsd) return 0;
  const usd = egpToUsd(value, usdEgp);
  return usd / eurToUsd;
}

function perTonToPer1000(perTon, productWeightG, sheetUtilPct) {
  const weightG = n(productWeightG);
  const util = n(sheetUtilPct) > 0 ? n(sheetUtilPct) / 100 : 1;
  if (!weightG || !util) return 0;
  return (n(perTon) * weightG) / (1000 * util);
}

function detectCase(requestData) {
  return requestData?.product?.productType === "Sheet Roll" ? "sheet" : "non_sheet";
}

function pctOf(value, base) {
  const b = n(base);
  if (!b) return 0;
  return (n(value) / b) * 100;
}

function getPcsPerCarton(scenarioEngineering) {
  const pcsPerStack = n(scenarioEngineering?.packaging?.primary?.pcsPerStack);
  const stacksPerPrimary = n(scenarioEngineering?.packaging?.primary?.stacksPerPrimary);
  const primariesPerSecondary = n(
    scenarioEngineering?.packaging?.secondary?.primariesPerSecondary
  );

  return pcsPerStack * stacksPerPrimary * primariesPerSecondary;
}

function getProductWeightG(requestData, scenarioEngineering) {
  return (
    n(scenarioEngineering?.thermo?.unitWeight_g) ||
    n(requestData?.product?.productWeightG) ||
    0
  );
}

function getSheetUtilPct(scenarioEngineering) {
  return n(scenarioEngineering?.thermo?.sheetUtilizationPct) || 100;
}

function buildPieGradient(segments) {
  const total = segments.reduce((sum, s) => sum + n(s.value), 0);
  if (!total) {
    return "conic-gradient(#e5e7eb 0deg 360deg)";
  }

  let current = 0;
  const parts = segments.map((segment) => {
    const start = current;
    const angle = (n(segment.value) / total) * 360;
    current += angle;
    return `${segment.color} ${start}deg ${current}deg`;
  });

  return `conic-gradient(${parts.join(", ")})`;
}

function Section({ title, children }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-4">
      <h3 className="font-semibold text-base">{title}</h3>
      {children}
    </div>
  );
}

function LineTable({ rows, showPercent = true }) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="text-left p-2 font-semibold">Item</th>
            <th className="text-right p-2 font-semibold">EGP</th>
            <th className="text-right p-2 font-semibold">USD</th>
            <th className="text-right p-2 font-semibold">EUR</th>
            {showPercent ? (
              <th className="text-right p-2 font-semibold">% of Selling Price</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.label}
              className={`border-b ${row.bold ? "font-semibold" : ""}`}
            >
              <td className="p-2">{row.label}</td>
              <td className="p-2 text-right">{row.egp}</td>
              <td className="p-2 text-right">{row.usd}</td>
              <td className="p-2 text-right">{row.eur}</td>
              {showPercent ? (
                <td className="p-2 text-right">{row.pct}</td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Pricing20SummaryTab({
  requestData,
  scenarioEngineering,
  pricing20Data,
}) {
  const caseType = detectCase(requestData);
  const isSheet = caseType === "sheet";
  const basisLabel = isSheet ? "ton" : "1000 pcs";

  const assumptions = pricing20Data?.assumptions || {};
  const operational = pricing20Data?.operational || {};
  const materialRows = pricing20Data?.materialRows || [];
  const sheetPackagingRows = pricing20Data?.sheetPackagingRows || [];
  const intermediatePackagingRows = pricing20Data?.intermediatePackagingRows || [];
  const thermoPackagingRows = pricing20Data?.thermoPackagingRows || [];
  const decoration = pricing20Data?.decoration || {};
  const wasteRows = pricing20Data?.wasteRows || [];
  const freight = pricing20Data?.freight || {};
  const freightRows = pricing20Data?.freightRows || [];
  const workingCapitalRows = pricing20Data?.workingCapitalRows || [];
  const amortizationRows = pricing20Data?.amortizationRows || [];
  const conversion = pricing20Data?.conversion || {};
  const commercial = pricing20Data?.commercial || {};

  const engineeringRefs = useMemo(() => {
    const productWeightG = getProductWeightG(requestData, scenarioEngineering);
    const sheetUtilPct = getSheetUtilPct(scenarioEngineering);
    const pcsPerCarton = getPcsPerCarton(scenarioEngineering);

    const sheetRollWeightKg =
      n(scenarioEngineering?.sheetPackaging?.rollWeight_kg) ||
      n(scenarioEngineering?.sheetSpecs?.rollTargetWeight_kg);

    const extrusionTonsPerDay =
      n(scenarioEngineering?.extrusion?.tonsPerDay24h) || 0;

    const thermoPcsPerDay =
      n(scenarioEngineering?.thermo?.pcsPerDay24h) || 0;

    const requiredSheetKgPerDay =
      n(scenarioEngineering?.thermo?.sheetUtilizationPct) > 0
        ? (thermoPcsPerDay * productWeightG) / 1000 / (sheetUtilPct / 100)
        : 0;

    const freightOptionCandidates = [
      {
        value: "container20",
        label: "20ft Dry Container",
        tons: n(scenarioEngineering?.freight?.container20_netWeight_kg) / 1000,
        pcs: n(scenarioEngineering?.freight?.container20_pcs),
      },
      {
        value: "container40",
        label: "40ft Dry Container",
        tons: n(scenarioEngineering?.freight?.container40_netWeight_kg) / 1000,
        pcs: n(scenarioEngineering?.freight?.container40_pcs),
      },
      {
        value: "container40hc",
        label: "40ft High Cube",
        tons: n(scenarioEngineering?.freight?.container40hc_netWeight_kg) / 1000,
        pcs: n(scenarioEngineering?.freight?.container40hc_pcs),
      },
      {
        value: "smallTruck",
        label: "Small Truck",
        tons: n(scenarioEngineering?.freight?.smallTruck_netWeight_kg) / 1000,
        pcs: n(scenarioEngineering?.freight?.smallTruck_pcs),
      },
      {
        value: "mediumTruck",
        label: "Medium Truck",
        tons: n(scenarioEngineering?.freight?.mediumTruck_netWeight_kg) / 1000,
        pcs: n(scenarioEngineering?.freight?.mediumTruck_pcs),
      },
      {
        value: "largeTruck",
        label: "Large Truck",
        tons: n(scenarioEngineering?.freight?.largeTruck_netWeight_kg) / 1000,
        pcs: n(scenarioEngineering?.freight?.largeTruck_pcs),
      },
      {
        value: "doubleTrailer",
        label: "Double Trailer",
        tons: n(scenarioEngineering?.freight?.doubleTrailer_netWeight_kg) / 1000,
        pcs: n(scenarioEngineering?.freight?.doubleTrailer_pcs),
      },
    ];

    const freightOptions = freightOptionCandidates.filter((row) =>
      isSheet ? row.tons > 0 : row.pcs > 0
    );

    return {
      productWeightG,
      sheetUtilPct,
      pcsPerCarton,
      sheetRollWeightKg,
      extrusionTonsPerDay,
      thermoPcsPerDay,
      requiredSheetKgPerDay,
      freightOptions,
    };
  }, [requestData, scenarioEngineering, isSheet]);

  const selectedFreightOption = useMemo(() => {
    return (
      engineeringRefs.freightOptions.find(
        (row) => row.value === freight.selectedOption
      ) || null
    );
  }, [engineeringRefs.freightOptions, freight.selectedOption]);

  const materialTotals = useMemo(() => {
    const perTon = materialRows.reduce((sum, row) => {
      const unitPriceEgp = currencyToEgp(
        row.priceInCurrency,
        row.currency,
        assumptions.usdEgp,
        assumptions.eurUsd
      );
      return sum + n(row.sourceConsumptionKgPerTon) * unitPriceEgp;
    }, 0);

    const per1000 = perTonToPer1000(
      perTon,
      operational.productWeightG || engineeringRefs.productWeightG,
      operational.sheetUtilizationPct || engineeringRefs.sheetUtilPct
    );

    return {
      perTon,
      per1000,
      basis: isSheet ? perTon : per1000,
    };
  }, [
    materialRows,
    assumptions.usdEgp,
    assumptions.eurUsd,
    operational.productWeightG,
    operational.sheetUtilizationPct,
    engineeringRefs.productWeightG,
    engineeringRefs.sheetUtilPct,
    isSheet,
  ]);

  const sheetPackagingTotals = useMemo(() => {
    if (!isSheet) return { basis: 0 };

    const rollWeightKg = n(operational.rollWeightKg) || engineeringRefs.sheetRollWeightKg;

    const basis = sheetPackagingRows.reduce((sum, row) => {
      const unitPriceEgp = currencyToEgp(
        row.priceInCurrency,
        row.currency,
        assumptions.usdEgp,
        assumptions.eurUsd
      );
      const costPerRoll = n(row.sourceConsumptionPerRoll) * unitPriceEgp;
      const costPerTon = rollWeightKg > 0 ? costPerRoll / (rollWeightKg / 1000) : 0;
      return sum + costPerTon;
    }, 0);

    return { basis };
  }, [
    isSheet,
    sheetPackagingRows,
    assumptions.usdEgp,
    assumptions.eurUsd,
    operational.rollWeightKg,
    engineeringRefs.sheetRollWeightKg,
  ]);

  const intermediatePackagingTotals = useMemo(() => {
    if (isSheet) return { basis: 0 };

    const rollWeightKg = n(operational.rollWeightKg) || engineeringRefs.sheetRollWeightKg;

    const basis = intermediatePackagingRows.reduce((sum, row) => {
      const unitPriceEgp = currencyToEgp(
        row.priceInCurrency,
        row.currency,
        assumptions.usdEgp,
        assumptions.eurUsd
      );
      const noOfUses = n(row.sourceNoOfUses) || 1;
      const costPerRoll =
        (n(row.sourceConsumptionPerRoll) * unitPriceEgp) / noOfUses;
      const costPerTon = rollWeightKg > 0 ? costPerRoll / (rollWeightKg / 1000) : 0;
      const costPer1000 = perTonToPer1000(
        costPerTon,
        operational.productWeightG || engineeringRefs.productWeightG,
        operational.sheetUtilizationPct || engineeringRefs.sheetUtilPct
      );
      return sum + costPer1000;
    }, 0);

    return { basis };
  }, [
    isSheet,
    intermediatePackagingRows,
    assumptions.usdEgp,
    assumptions.eurUsd,
    operational.rollWeightKg,
    operational.productWeightG,
    operational.sheetUtilizationPct,
    engineeringRefs.sheetRollWeightKg,
    engineeringRefs.productWeightG,
    engineeringRefs.sheetUtilPct,
  ]);

  const thermoPackagingTotals = useMemo(() => {
    if (isSheet) return { basis: 0 };

    const pcsPerCarton = n(operational.pcsPerCarton) || engineeringRefs.pcsPerCarton;

    const basis = thermoPackagingRows.reduce((sum, row) => {
      const unitPriceEgp = currencyToEgp(
        row.priceInCurrency,
        row.currency,
        assumptions.usdEgp,
        assumptions.eurUsd
      );
      const noOfUses = n(row.sourceNoOfUses) || 1;
      const costPer1000 =
        pcsPerCarton > 0
          ? ((n(row.sourceConsumptionPerCarton) * unitPriceEgp) / noOfUses / pcsPerCarton) *
            1000
          : 0;
      return sum + costPer1000;
    }, 0);

    return { basis };
  }, [
    isSheet,
    thermoPackagingRows,
    assumptions.usdEgp,
    assumptions.eurUsd,
    operational.pcsPerCarton,
    engineeringRefs.pcsPerCarton,
  ]);

  const decorationSummary = useMemo(() => {
    if (isSheet || !decoration.enabled) return { basis: 0 };

    let basis = 0;

    if (decoration.type === "Printing") {
      const inkConsumption = n(decoration?.printing?.inkConsumptionGPer1000);
      const inkPriceEgp = currencyToEgp(
        decoration?.printing?.inkPricePerKgCurrency,
        decoration?.printing?.currency,
        assumptions.usdEgp,
        assumptions.eurUsd
      );
      basis = (inkConsumption * inkPriceEgp) / 1000;
    } else if (decoration.type === "Shrink Sleeve") {
      const sleeveCostPerKgEgp = currencyToEgp(
        decoration?.sleeve?.sleeveCostPerKgCurrency,
        decoration?.sleeve?.currency,
        assumptions.usdEgp,
        assumptions.eurUsd
      );
      const sleevesPerKg = n(decoration?.sleeve?.sleevesPerKg);
      basis = sleevesPerKg > 0 ? (1000 / sleevesPerKg) * sleeveCostPerKgEgp : 0;
    } else if (decoration.type === "Hybrid") {
      const blankConsumption = n(decoration?.hybrid?.blankConsumptionPerCup);
      const blankUnitPriceEgp = currencyToEgp(
        decoration?.hybrid?.blankUnitPriceCurrency,
        decoration?.hybrid?.blankCurrency,
        assumptions.usdEgp,
        assumptions.eurUsd
      );
      const bottomConsumption = n(decoration?.hybrid?.bottomConsumptionPerCup);
      const bottomUnitPriceEgp = currencyToEgp(
        decoration?.hybrid?.bottomUnitPriceCurrency,
        decoration?.hybrid?.bottomCurrency,
        assumptions.usdEgp,
        assumptions.eurUsd
      );

      basis =
        blankConsumption * blankUnitPriceEgp * 1000 +
        bottomConsumption * bottomUnitPriceEgp * 1000;
    }

    return { basis };
  }, [isSheet, decoration, assumptions.usdEgp, assumptions.eurUsd]);

  const packagingBasis = isSheet
    ? sheetPackagingTotals.basis
    : intermediatePackagingTotals.basis + thermoPackagingTotals.basis;

  const wasteTotals = useMemo(() => {
    const basis = wasteRows.reduce((sum, row) => {
      let baseCost = 0;

      if (row.id === "waste-material") {
        baseCost = materialTotals.basis;
      } else if (row.id === "waste-packaging") {
        baseCost = sheetPackagingTotals.basis;
      } else if (row.id === "waste-intermediate-packaging") {
        baseCost = intermediatePackagingTotals.basis;
      } else if (row.id === "waste-thermo-packaging") {
        baseCost = thermoPackagingTotals.basis;
      } else if (row.id === "waste-decoration") {
        baseCost = decorationSummary.basis;
      }

      return sum + (n(row.ratePct) / 100) * baseCost;
    }, 0);

    return { basis };
  }, [
    wasteRows,
    materialTotals.basis,
    sheetPackagingTotals.basis,
    intermediatePackagingTotals.basis,
    thermoPackagingTotals.basis,
    decorationSummary.basis,
  ]);

  const freightTotals = useMemo(() => {
    const qtyPerTrip = isSheet
      ? n(selectedFreightOption?.tons)
      : n(selectedFreightOption?.pcs);

    const basis = freightRows.reduce((sum, row) => {
      const tripCostEgp = currencyToEgp(
        row.tripCostCurrency,
        row.currency,
        assumptions.usdEgp,
        assumptions.eurUsd
      );

      const itemBasis =
        qtyPerTrip > 0
          ? isSheet
            ? tripCostEgp / qtyPerTrip
            : (tripCostEgp / qtyPerTrip) * 1000
          : 0;

      return sum + itemBasis;
    }, 0);

    return { basis };
  }, [
    freightRows,
    selectedFreightOption,
    assumptions.usdEgp,
    assumptions.eurUsd,
    isSheet,
  ]);

  const workingCapitalTotals = useMemo(() => {
    const basis = workingCapitalRows.reduce((sum, row) => {
      const dso = n(row.dso);
      const dio = n(row.dio);
      const dpo = n(row.dpo);
      const interestRatePct = n(row.interestRatePct);
      const effectivePct = ((dso + dio - dpo) * interestRatePct) / 365;

      let baseCost = 0;

      if (row.id === "wc-material") {
        baseCost = materialTotals.basis;
      } else if (row.id === "wc-packaging") {
        baseCost = isSheet
          ? sheetPackagingTotals.basis
          : intermediatePackagingTotals.basis + thermoPackagingTotals.basis;
      } else if (row.id === "wc-decoration") {
        baseCost = decorationSummary.basis;
      }

      return sum + baseCost * (effectivePct / 100);
    }, 0);

    return { basis };
  }, [
    workingCapitalRows,
    isSheet,
    materialTotals.basis,
    sheetPackagingTotals.basis,
    intermediatePackagingTotals.basis,
    thermoPackagingTotals.basis,
    decorationSummary.basis,
  ]);

  const amortizationTotals = useMemo(() => {
    let basis = 0;
    let amortizedInvestment = 0;
    let nonAmortizedInvestment = 0;
    let totalInvestment = 0;

    amortizationRows.forEach((row) => {
      const valueInEgp = currencyToEgp(
        row.valueInCurrency,
        row.currency,
        assumptions.usdEgp,
        assumptions.eurUsd
      );

      totalInvestment += valueInEgp;

      if (row.amortized === true) {
        amortizedInvestment += valueInEgp;
      } else {
        nonAmortizedInvestment += valueInEgp;
      }

      const amortizationQty = n(row.amortizationQty);
      const itemBasis =
        row.amortized === true && amortizationQty > 0
          ? isSheet
            ? valueInEgp / amortizationQty
            : (valueInEgp / amortizationQty) * 1000
          : 0;

      basis += itemBasis;
    });

    return {
      basis,
      amortizedInvestment,
      nonAmortizedInvestment,
      totalInvestment,
    };
  }, [amortizationRows, assumptions.usdEgp, assumptions.eurUsd, isSheet]);

  const otherCostsBeforeConversion =
    materialTotals.basis +
    packagingBasis +
    decorationSummary.basis +
    wasteTotals.basis +
    freightTotals.basis +
    workingCapitalTotals.basis +
    amortizationTotals.basis;

  const conversionSummary = useMemo(() => {
    const valueEgp = currencyToEgp(
      conversion.valueInCurrency,
      conversion.currency,
      assumptions.usdEgp,
      assumptions.eurUsd
    );

    let conversionPriceEgp = 0;
    let salesPriceEgp = 0;
    let dailyExtrusionConversionEgp = 0;
    let dailyThermoConversionEgp = 0;

    if (isSheet) {
      if (conversion.mode === "required_daily_extrusion_conversion") {
        conversionPriceEgp =
          n(operational.productivityTonsPerDay) > 0
            ? valueEgp / n(operational.productivityTonsPerDay)
            : 0;
        salesPriceEgp = otherCostsBeforeConversion + conversionPriceEgp;
        dailyExtrusionConversionEgp = valueEgp;
      } else if (conversion.mode === "required_sales_price_per_ton") {
        salesPriceEgp = valueEgp;
        conversionPriceEgp = salesPriceEgp - otherCostsBeforeConversion;
        dailyExtrusionConversionEgp =
          conversionPriceEgp *
          n(operational.productivityTonsPerDay || engineeringRefs.extrusionTonsPerDay);
      } else {
        conversionPriceEgp = valueEgp;
        salesPriceEgp = otherCostsBeforeConversion + conversionPriceEgp;
        dailyExtrusionConversionEgp =
          conversionPriceEgp *
          n(operational.productivityTonsPerDay || engineeringRefs.extrusionTonsPerDay);
      }
    } else {
      if (conversion.mode === "required_daily_thermo_conversion") {
        conversionPriceEgp =
          n(operational.pcsProducedPerDay) > 0
            ? (valueEgp / n(operational.pcsProducedPerDay)) * 1000
            : 0;
        salesPriceEgp = otherCostsBeforeConversion + conversionPriceEgp;
        dailyThermoConversionEgp = valueEgp;
      } else if (conversion.mode === "required_daily_extrusion_conversion") {
        const tonsPerDay =
          n(operational.extrusionProductivityTonsPerDay) ||
          engineeringRefs.extrusionTonsPerDay;
        const sheetKgPerDay =
          n(operational.sheetRollConsumedPerDayKg) ||
          engineeringRefs.requiredSheetKgPerDay;
        const pcsPerDay =
          n(operational.pcsProducedPerDay) ||
          engineeringRefs.thermoPcsPerDay;

        conversionPriceEgp =
          tonsPerDay > 0 && pcsPerDay > 0
            ? (valueEgp / tonsPerDay) * (sheetKgPerDay / 1000) / pcsPerDay * 1000
            : 0;

        salesPriceEgp = otherCostsBeforeConversion + conversionPriceEgp;
        dailyExtrusionConversionEgp = valueEgp;
      } else if (conversion.mode === "required_sales_price_per_1000") {
        salesPriceEgp = valueEgp;
        conversionPriceEgp = salesPriceEgp - otherCostsBeforeConversion;

        dailyExtrusionConversionEgp =
          conversionPriceEgp *
          (n(operational.pcsProducedPerDay || engineeringRefs.thermoPcsPerDay) / 1000);

        dailyThermoConversionEgp =
          conversionPriceEgp *
          (n(operational.pcsProducedPerDay || engineeringRefs.thermoPcsPerDay) / 1000);
      } else {
        conversionPriceEgp = valueEgp;
        salesPriceEgp = otherCostsBeforeConversion + conversionPriceEgp;

        dailyExtrusionConversionEgp =
          conversionPriceEgp *
          (n(operational.pcsProducedPerDay || engineeringRefs.thermoPcsPerDay) / 1000);

        dailyThermoConversionEgp =
          conversionPriceEgp *
          (n(operational.pcsProducedPerDay || engineeringRefs.thermoPcsPerDay) / 1000);
      }
    }

    return {
      conversionPriceEgp,
      salesPriceEgp,
      dailyExtrusionConversionEgp,
      dailyThermoConversionEgp,
    };
  }, [
    conversion,
    assumptions.usdEgp,
    assumptions.eurUsd,
    isSheet,
    operational,
    engineeringRefs.extrusionTonsPerDay,
    engineeringRefs.requiredSheetKgPerDay,
    engineeringRefs.thermoPcsPerDay,
    otherCostsBeforeConversion,
  ]);

  const sellingPrice = n(conversionSummary.salesPriceEgp);
  const expectedAnnualVolume = n(commercial.expectedAnnualVolume);

  const annualTurnoverEgp = expectedAnnualVolume * sellingPrice;
  const annualConversionEgp =
    expectedAnnualVolume * n(conversionSummary.conversionPriceEgp);

  const annualContributionTotal =
    expectedAnnualVolume *
    (n(conversionSummary.conversionPriceEgp) + n(amortizationTotals.basis));

  const annualContributionNonAmortized =
    expectedAnnualVolume * n(conversionSummary.conversionPriceEgp);

  const paybackTotalYears =
    annualContributionTotal > 0
      ? n(amortizationTotals.totalInvestment) / annualContributionTotal
      : 0;

  const paybackNonAmortizedYears =
    annualContributionNonAmortized > 0
      ? n(amortizationTotals.nonAmortizedInvestment) / annualContributionNonAmortized
      : 0;

  const costBreakdownRows = [
    {
      label: `Material cost per ${basisLabel}`,
      value: materialTotals.basis,
      color: "#16a34a",
    },
    {
      label: `Total packaging cost per ${basisLabel}`,
      value: packagingBasis,
      color: "#f59e0b",
    },
    ...(isSheet
      ? []
      : [
          {
            label: `Decoration cost per ${basisLabel}`,
            value: decorationSummary.basis,
            color: "#3b82f6",
          },
        ]),
    {
      label: `Total waste cost per ${basisLabel}`,
      value: wasteTotals.basis,
      color: "#ef4444",
    },
    ...(freightTotals.basis > 0
      ? [
          {
            label: `Freight cost per ${basisLabel}`,
            value: freightTotals.basis,
            color: "#14b8a6",
          },
        ]
      : []),
    {
      label: `Working capital cost per ${basisLabel}`,
      value: workingCapitalTotals.basis,
      color: "#8b5cf6",
    },
    {
      label: `Amortization cost per ${basisLabel}`,
      value: amortizationTotals.basis,
      color: "#6366f1",
    },
    {
      label: `Conversion cost per ${basisLabel}`,
      value: conversionSummary.conversionPriceEgp,
      color: "#6b7280",
    },
  ];

  const tableRows = [
    ...costBreakdownRows.map((row) => ({
      label: row.label,
      egp: fmt(row.value, 3),
      usd: fmt(egpToUsd(row.value, assumptions.usdEgp), 3),
      eur: fmt(egpToEur(row.value, assumptions.usdEgp, assumptions.eurUsd), 3),
      pct: `${fmt(pctOf(row.value, sellingPrice), 2)}%`,
    })),
    {
      label: `Sales price per ${basisLabel}`,
      egp: fmt(sellingPrice, 3),
      usd: fmt(egpToUsd(sellingPrice, assumptions.usdEgp), 3),
      eur: fmt(egpToEur(sellingPrice, assumptions.usdEgp, assumptions.eurUsd), 3),
      pct: "100%",
      bold: true,
    },
  ];

  const investmentRows = [
    {
      label: "Amortized portion",
      egp: fmt(amortizationTotals.amortizedInvestment, 3),
      usd: fmt(egpToUsd(amortizationTotals.amortizedInvestment, assumptions.usdEgp), 3),
      eur: fmt(egpToEur(amortizationTotals.amortizedInvestment, assumptions.usdEgp, assumptions.eurUsd), 3),
    },
    {
      label: "Non amortized portion",
      egp: fmt(amortizationTotals.nonAmortizedInvestment, 3),
      usd: fmt(egpToUsd(amortizationTotals.nonAmortizedInvestment, assumptions.usdEgp), 3),
      eur: fmt(egpToEur(amortizationTotals.nonAmortizedInvestment, assumptions.usdEgp, assumptions.eurUsd), 3),
    },
    {
      label: "Total investment cost",
      egp: fmt(amortizationTotals.totalInvestment, 3),
      usd: fmt(egpToUsd(amortizationTotals.totalInvestment, assumptions.usdEgp), 3),
      eur: fmt(egpToEur(amortizationTotals.totalInvestment, assumptions.usdEgp, assumptions.eurUsd), 3),
      bold: true,
    },
  ];

  const commercialRows = [
    {
      label: `Expected annual volume (${isSheet ? "tons" : "x1000 pcs"})`,
      egp: fmt(expectedAnnualVolume, 3),
      usd: "—",
      eur: "—",
    },
    {
      label: "Payback for total investment",
      egp: paybackTotalYears > 0 ? `${fmt(paybackTotalYears, 3)} years` : "—",
      usd: "—",
      eur: "—",
    },
    {
      label: "Payback for non amortized investment",
      egp:
        paybackNonAmortizedYears > 0
          ? `${fmt(paybackNonAmortizedYears, 3)} years`
          : "—",
      usd: "—",
      eur: "—",
    },
    {
      label: "Annual turnover",
      egp: fmt(annualTurnoverEgp, 3),
      usd: fmt(egpToUsd(annualTurnoverEgp, assumptions.usdEgp), 3),
      eur: fmt(egpToEur(annualTurnoverEgp, assumptions.usdEgp, assumptions.eurUsd), 3),
    },
    {
      label: "Annual conversion",
      egp: fmt(annualConversionEgp, 3),
      usd: fmt(egpToUsd(annualConversionEgp, assumptions.usdEgp), 3),
      eur: fmt(egpToEur(annualConversionEgp, assumptions.usdEgp, assumptions.eurUsd), 3),
    },
  ];

  const dailyConversionRows = isSheet
    ? [
        {
          label: "Daily Extrusion Conversion Price",
          egp: fmt(conversionSummary.dailyExtrusionConversionEgp, 3),
          usd: fmt(
            egpToUsd(conversionSummary.dailyExtrusionConversionEgp, assumptions.usdEgp),
            3
          ),
          eur: fmt(
            egpToEur(
              conversionSummary.dailyExtrusionConversionEgp,
              assumptions.usdEgp,
              assumptions.eurUsd
            ),
            3
          ),
        },
      ]
    : [
        {
          label: "Daily Thermoforming Conversion Price",
          egp: fmt(conversionSummary.dailyThermoConversionEgp, 3),
          usd: fmt(
            egpToUsd(conversionSummary.dailyThermoConversionEgp, assumptions.usdEgp),
            3
          ),
          eur: fmt(
            egpToEur(
              conversionSummary.dailyThermoConversionEgp,
              assumptions.usdEgp,
              assumptions.eurUsd
            ),
            3
          ),
        },
        {
          label: "Daily Extrusion Conversion Price",
          egp: fmt(conversionSummary.dailyExtrusionConversionEgp, 3),
          usd: fmt(
            egpToUsd(conversionSummary.dailyExtrusionConversionEgp, assumptions.usdEgp),
            3
          ),
          eur: fmt(
            egpToEur(
              conversionSummary.dailyExtrusionConversionEgp,
              assumptions.usdEgp,
              assumptions.eurUsd
            ),
            3
          ),
        },
      ];

  const pieSegments = costBreakdownRows.filter((row) => n(row.value) > 0);

  return (
    <div className="space-y-6">
      <Section title="Summary Breakdown">
        <LineTable rows={tableRows} />
      </Section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Section title="Cost Component Pie Chart">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div
              className="w-64 h-64 rounded-full border shadow-sm shrink-0"
              style={{
                background: buildPieGradient(pieSegments),
              }}
            />

            <div className="w-full space-y-2">
              {pieSegments.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-3 border-b pb-2 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-sm shrink-0"
                      style={{ backgroundColor: row.color }}
                    />
                    <span className="truncate">{row.label}</span>
                  </div>

                  <div className="text-right shrink-0">
                    {fmt(pctOf(row.value, sellingPrice), 2)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Daily Conversion Summary">
          <LineTable rows={dailyConversionRows} showPercent={false} />
        </Section>
      </div>

      <Section title="Investment Summary">
        <LineTable rows={investmentRows} showPercent={false} />
      </Section>

      <Section title="Commercial Summary">
        <LineTable rows={commercialRows} showPercent={false} />
      </Section>
    </div>
  );
}export { Pricing20SummaryTab };