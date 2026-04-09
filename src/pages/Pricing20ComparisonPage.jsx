import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

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

function convertEgpToSelected(valueEgp, selectedCurrency, usdEgp, eurUsd) {
  if (selectedCurrency === "USD") return egpToUsd(valueEgp, usdEgp);
  if (selectedCurrency === "EUR") return egpToEur(valueEgp, usdEgp, eurUsd);
  return n(valueEgp);
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

function buildAutoNote(label, baseValue, comparisonValue, suffix = "") {
  const base = n(baseValue);
  const comp = n(comparisonValue);
  const diff = comp - base;

  if (diff === 0) return "No change.";
  if (!base && !comp) return "No change.";

  const direction = diff > 0 ? "increased" : "decreased";
  const absDiff = Math.abs(diff);
  const pct =
    base !== 0 ? `${fmt((absDiff / Math.abs(base)) * 100, 2)}%` : "n/a";

  return `${label} ${direction} by ${fmt(absDiff, 3)}${suffix ? ` ${suffix}` : ""} (${pct}).`;
}

function buildPricing20Metrics(requestData, scenarioData) {
  const scenarioSetup = scenarioData?.scenarioSetup || {};
  const scenarioEngineering = scenarioData?.scenarioEngineering || {};
  const pricing20Data = scenarioData?.pricing20Data || {};

  const isSheet = detectCase(requestData) === "sheet";
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

  const selectedFreightOption =
    freightOptions.find((row) => row.value === freight.selectedOption) || null;

  const materialPerTon = materialRows.reduce((sum, row) => {
    const unitPriceEgp = currencyToEgp(
      row.priceInCurrency,
      row.currency,
      assumptions.usdEgp,
      assumptions.eurUsd
    );
    return sum + n(row.sourceConsumptionKgPerTon) * unitPriceEgp;
  }, 0);

  const materialBasis = isSheet
    ? materialPerTon
    : perTonToPer1000(
        materialPerTon,
        operational.productWeightG || productWeightG,
        operational.sheetUtilizationPct || sheetUtilPct
      );

  const sheetPackagingBasis = isSheet
    ? sheetPackagingRows.reduce((sum, row) => {
        const unitPriceEgp = currencyToEgp(
          row.priceInCurrency,
          row.currency,
          assumptions.usdEgp,
          assumptions.eurUsd
        );
        const costPerRoll = n(row.sourceConsumptionPerRoll) * unitPriceEgp;
        const costPerTon =
          (n(operational.rollWeightKg) || sheetRollWeightKg) > 0
            ? costPerRoll / ((n(operational.rollWeightKg) || sheetRollWeightKg) / 1000)
            : 0;
        return sum + costPerTon;
      }, 0)
    : 0;

  const intermediatePackagingBasis = !isSheet
    ? intermediatePackagingRows.reduce((sum, row) => {
        const unitPriceEgp = currencyToEgp(
          row.priceInCurrency,
          row.currency,
          assumptions.usdEgp,
          assumptions.eurUsd
        );
        const noOfUses = n(row.sourceNoOfUses) || 1;
        const costPerRoll =
          (n(row.sourceConsumptionPerRoll) * unitPriceEgp) / noOfUses;
        const costPerTon =
          (n(operational.rollWeightKg) || sheetRollWeightKg) > 0
            ? costPerRoll / ((n(operational.rollWeightKg) || sheetRollWeightKg) / 1000)
            : 0;

        return (
          sum +
          perTonToPer1000(
            costPerTon,
            operational.productWeightG || productWeightG,
            operational.sheetUtilizationPct || sheetUtilPct
          )
        );
      }, 0)
    : 0;

  const thermoPackagingBasis = !isSheet
    ? thermoPackagingRows.reduce((sum, row) => {
        const unitPriceEgp = currencyToEgp(
          row.priceInCurrency,
          row.currency,
          assumptions.usdEgp,
          assumptions.eurUsd
        );
        const noOfUses = n(row.sourceNoOfUses) || 1;
        const costPer1000 =
          (n(operational.pcsPerCarton) || pcsPerCarton) > 0
            ? ((n(row.sourceConsumptionPerCarton) * unitPriceEgp) /
                noOfUses /
                (n(operational.pcsPerCarton) || pcsPerCarton)) *
              1000
            : 0;
        return sum + costPer1000;
      }, 0)
    : 0;

  let decorationBasis = 0;
  if (!isSheet && decoration.enabled) {
    if (decoration.type === "Printing") {
      const inkConsumption = n(decoration?.printing?.inkConsumptionGPer1000);
      const inkPriceEgp = currencyToEgp(
        decoration?.printing?.inkPricePerKgCurrency,
        decoration?.printing?.currency,
        assumptions.usdEgp,
        assumptions.eurUsd
      );
      decorationBasis = (inkConsumption * inkPriceEgp) / 1000;
    } else if (decoration.type === "Shrink Sleeve") {
      const sleeveCostPerKgEgp = currencyToEgp(
        decoration?.sleeve?.sleeveCostPerKgCurrency,
        decoration?.sleeve?.currency,
        assumptions.usdEgp,
        assumptions.eurUsd
      );
      const sleevesPerKg = n(decoration?.sleeve?.sleevesPerKg);
      decorationBasis = sleevesPerKg > 0 ? (1000 / sleevesPerKg) * sleeveCostPerKgEgp : 0;
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

      decorationBasis =
        blankConsumption * blankUnitPriceEgp * 1000 +
        bottomConsumption * bottomUnitPriceEgp * 1000;
    }
  }

  const packagingBasis = isSheet
    ? sheetPackagingBasis
    : intermediatePackagingBasis + thermoPackagingBasis;

  const wasteBasis = wasteRows.reduce((sum, row) => {
    let baseCost = 0;

    if (row.id === "waste-material") {
      baseCost = materialBasis;
    } else if (row.id === "waste-packaging") {
      baseCost = sheetPackagingBasis;
    } else if (row.id === "waste-intermediate-packaging") {
      baseCost = intermediatePackagingBasis;
    } else if (row.id === "waste-thermo-packaging") {
      baseCost = thermoPackagingBasis;
    } else if (row.id === "waste-decoration") {
      baseCost = decorationBasis;
    }

    return sum + (n(row.ratePct) / 100) * baseCost;
  }, 0);

  const freightBasis = freightRows.reduce((sum, row) => {
    const tripCostEgp = currencyToEgp(
      row.tripCostCurrency,
      row.currency,
      assumptions.usdEgp,
      assumptions.eurUsd
    );

    const qtyPerTrip = isSheet
      ? n(selectedFreightOption?.tons)
      : n(selectedFreightOption?.pcs);

    const itemBasis =
      qtyPerTrip > 0
        ? isSheet
          ? tripCostEgp / qtyPerTrip
          : (tripCostEgp / qtyPerTrip) * 1000
        : 0;

    return sum + itemBasis;
  }, 0);

  const workingCapitalBasis = workingCapitalRows.reduce((sum, row) => {
    const dso = n(row.dso);
    const dio = n(row.dio);
    const dpo = n(row.dpo);
    const interestRatePct = n(row.interestRatePct);
    const effectivePct = ((dso + dio - dpo) * interestRatePct) / 365;

    let baseCost = 0;

    if (row.id === "wc-material") {
      baseCost = materialBasis;
    } else if (row.id === "wc-packaging") {
      baseCost = isSheet ? sheetPackagingBasis : packagingBasis;
    } else if (row.id === "wc-decoration") {
      baseCost = decorationBasis;
    }

    return sum + baseCost * (effectivePct / 100);
  }, 0);

  let amortizationBasis = 0;
  let amortizedPortion = 0;
  let nonAmortizedPortion = 0;
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
      amortizedPortion += valueInEgp;
    } else {
      nonAmortizedPortion += valueInEgp;
    }

    const qty = n(row.amortizationQty);
    if (row.amortized === true && qty > 0) {
      amortizationBasis += isSheet ? valueInEgp / qty : (valueInEgp / qty) * 1000;
    }
  });

  const otherCostsBeforeConversion =
    materialBasis +
    packagingBasis +
    (isSheet ? 0 : decorationBasis) +
    wasteBasis +
    freightBasis +
    workingCapitalBasis +
    amortizationBasis;

  const valueEgp = currencyToEgp(
    conversion.valueInCurrency,
    conversion.currency,
    assumptions.usdEgp,
    assumptions.eurUsd
  );

  let conversionBasis = 0;
  let salesPriceEgp = 0;
  let dailyExtrusionConversionEgp = 0;
  let dailyThermoConversionEgp = 0;

  if (isSheet) {
    if (conversion.mode === "required_daily_extrusion_conversion") {
      conversionBasis =
        n(operational.productivityTonsPerDay) > 0
          ? valueEgp / n(operational.productivityTonsPerDay)
          : 0;
      salesPriceEgp = otherCostsBeforeConversion + conversionBasis;
      dailyExtrusionConversionEgp = valueEgp;
    } else if (conversion.mode === "required_sales_price_per_ton") {
      salesPriceEgp = valueEgp;
      conversionBasis = salesPriceEgp - otherCostsBeforeConversion;
      dailyExtrusionConversionEgp =
        conversionBasis *
        n(operational.productivityTonsPerDay || extrusionTonsPerDay);
    } else {
      conversionBasis = valueEgp;
      salesPriceEgp = otherCostsBeforeConversion + conversionBasis;
      dailyExtrusionConversionEgp =
        conversionBasis *
        n(operational.productivityTonsPerDay || extrusionTonsPerDay);
    }
  } else {
    if (conversion.mode === "required_daily_thermo_conversion") {
      conversionBasis =
        n(operational.pcsProducedPerDay) > 0
          ? (valueEgp / n(operational.pcsProducedPerDay)) * 1000
          : 0;
      salesPriceEgp = otherCostsBeforeConversion + conversionBasis;
      dailyThermoConversionEgp = valueEgp;
    } else if (conversion.mode === "required_daily_extrusion_conversion") {
      const tonsPerDay =
        n(operational.extrusionProductivityTonsPerDay) || extrusionTonsPerDay;

      const sheetKgPerDay =
        n(operational.sheetRollConsumedPerDayKg) || requiredSheetKgPerDay;

      const pcsPerDay =
        n(operational.pcsProducedPerDay) || thermoPcsPerDay;

      conversionBasis =
        tonsPerDay > 0 && pcsPerDay > 0
          ? (valueEgp / tonsPerDay) * (sheetKgPerDay / 1000) / pcsPerDay * 1000
          : 0;

      salesPriceEgp = otherCostsBeforeConversion + conversionBasis;
      dailyExtrusionConversionEgp = valueEgp;
    } else if (conversion.mode === "required_sales_price_per_1000") {
      salesPriceEgp = valueEgp;
      conversionBasis = salesPriceEgp - otherCostsBeforeConversion;

      dailyExtrusionConversionEgp =
        conversionBasis *
        (n(operational.pcsProducedPerDay || thermoPcsPerDay) / 1000);

      dailyThermoConversionEgp =
        conversionBasis *
        (n(operational.pcsProducedPerDay || thermoPcsPerDay) / 1000);
    } else {
      conversionBasis = valueEgp;
      salesPriceEgp = otherCostsBeforeConversion + conversionBasis;

      dailyExtrusionConversionEgp =
        conversionBasis *
        (n(operational.pcsProducedPerDay || thermoPcsPerDay) / 1000);

      dailyThermoConversionEgp =
        conversionBasis *
        (n(operational.pcsProducedPerDay || thermoPcsPerDay) / 1000);
    }
  }

  const expectedAnnualVolume = n(commercial.expectedAnnualVolume);
  const annualTurnoverEgp = expectedAnnualVolume * salesPriceEgp;
  const annualConversionEgp = expectedAnnualVolume * conversionBasis;

  const annualContributionTotal =
    expectedAnnualVolume * (conversionBasis + amortizationBasis);

  const annualContributionNonAmortized =
    expectedAnnualVolume * conversionBasis;

  const paybackTotalYears =
    annualContributionTotal > 0 ? totalInvestment / annualContributionTotal : 0;

  const paybackNonAmortizedYears =
    annualContributionNonAmortized > 0
      ? nonAmortizedPortion / annualContributionNonAmortized
      : 0;

  return {
    scenarioName: scenarioSetup?.scenarioName || "",
    scenarioNote: scenarioSetup?.scenarioNote || scenarioSetup?.scenarioDescription || "",
    isSheet,
    basisLabel,
    assumptions: {
      usdEgp: assumptions?.usdEgp || "",
      eurUsd: assumptions?.eurUsd || "",
      dso: assumptions?.dso || "",
      dio: assumptions?.dio || "",
      dpo: assumptions?.dpo || "",
      interestRatePct: assumptions?.interestRatePct || "",
    },
    raw: {
      productWeightG: n(operational.productWeightG || productWeightG),
      expectedAnnualVolume,
    },
    costs: {
      material: materialBasis,
      packaging: packagingBasis,
      waste: wasteBasis,
      decoration: decorationBasis,
      freight: freightBasis,
      workingCapital: workingCapitalBasis,
      amortization: amortizationBasis,
      conversion: conversionBasis,
      salesPrice: salesPriceEgp,
    },
    investments: {
      amortizedPortion,
      nonAmortizedPortion,
      totalInvestment,
    },
    commercial: {
      annualTurnoverEgp,
      annualConversionEgp,
      paybackTotalYears,
      paybackNonAmortizedYears,
    },
    daily: {
      thermoforming: dailyThermoConversionEgp,
      extrusion: dailyExtrusionConversionEgp,
    },
    conversionPct: salesPriceEgp > 0 ? (conversionBasis / salesPriceEgp) * 100 : 0,
  };
}

function buildMoneyRow(label, baseEgp, compEgp, baseMetrics, compMetrics, currency, bold = false) {
  const baseValue = convertEgpToSelected(
    baseEgp,
    currency,
    baseMetrics.assumptions.usdEgp,
    baseMetrics.assumptions.eurUsd
  );

  const compValue = convertEgpToSelected(
    compEgp,
    currency,
    compMetrics.assumptions.usdEgp,
    compMetrics.assumptions.eurUsd
  );

  const diff = compValue - baseValue;
  const pct = baseValue !== 0 ? (diff / baseValue) * 100 : null;

  return {
    type: "data",
    label,
    base: `${fmt(baseValue, 3)} ${currency}`,
    comparison: `${fmt(compValue, 3)} ${currency}`,
    difference: `${diff >= 0 ? "+" : ""}${fmt(diff, 3)} ${currency}`,
    pct: pct === null ? "—" : `${diff >= 0 ? "+" : ""}${fmt(pct, 2)}%`,
    notes: buildAutoNote(label, baseValue, compValue, currency),
    bold,
  };
}

function buildNumberRow(label, baseValue, compValue, suffix = "", bold = false) {
  const diff = n(compValue) - n(baseValue);
  const pct = n(baseValue) !== 0 ? (diff / n(baseValue)) * 100 : null;

  return {
    type: "data",
    label,
    base: `${fmt(baseValue, 3)}${suffix}`,
    comparison: `${fmt(compValue, 3)}${suffix}`,
    difference: `${diff >= 0 ? "+" : ""}${fmt(diff, 3)}${suffix}`,
    pct: pct === null ? "—" : `${diff >= 0 ? "+" : ""}${fmt(pct, 2)}%`,
    notes: buildAutoNote(label, baseValue, compValue, suffix.trim()),
    bold,
  };
}

function buildTextRow(label, baseValue, compValue, bold = false) {
  return {
    type: "data",
    label,
    base: baseValue || "—",
    comparison: compValue || "—",
    difference: "—",
    pct: "—",
    notes:
      String(baseValue || "").trim() === String(compValue || "").trim()
        ? "No change."
        : "Text value changed.",
    bold,
  };
}

function buildSectionRow(label) {
  return {
    type: "section",
    label,
  };
}

function Pricing20ComparisonPage() {
  const { requestId } = useParams();

  const [loading, setLoading] = useState(true);
  const [requestData, setRequestData] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [baseScenarioId, setBaseScenarioId] = useState("");
  const [comparisonScenarioId, setComparisonScenarioId] = useState("");
  const [comparisonCurrency, setComparisonCurrency] = useState("EGP");
  const [baseScenarioData, setBaseScenarioData] = useState(null);
  const [comparisonScenarioData, setComparisonScenarioData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const [requestRes, scenariosRes] = await Promise.all([
          fetch(`/.netlify/functions/get-request?requestId=${requestId}`),
          fetch(`/.netlify/functions/list-pricing20-scenarios?requestId=${requestId}`),
        ]);

        const requestJson = await requestRes.json();
        const scenariosJson = await scenariosRes.json();

        const requestPayload = requestJson.success ? requestJson.payload || {} : {};
        const scenarioRows = scenariosJson.success ? scenariosJson.scenarios || [] : [];

        const sorted = [...scenarioRows].sort((a, b) => {
          const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return bTime - aTime;
        });

        setRequestData(requestPayload);
        setScenarios(sorted);

        if (sorted.length > 0) {
          setBaseScenarioId(sorted[0].scenarioId || "");
        }

        if (sorted.length > 1) {
          setComparisonScenarioId(sorted[1].scenarioId || "");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load comparison page.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [requestId]);

  useEffect(() => {
    const loadScenario = async (scenarioId, setter) => {
      if (!scenarioId) {
        setter(null);
        return;
      }

      try {
        const res = await fetch(
          `/.netlify/functions/get-pricing20-scenario?requestId=${requestId}&scenarioId=${scenarioId}`
        );
        const json = await res.json();

        if (json.success) {
          setter(json.scenarioData || null);
        } else {
          setter(null);
        }
      } catch (err) {
        console.error(err);
        setter(null);
      }
    };

    loadScenario(baseScenarioId, setBaseScenarioData);
    loadScenario(comparisonScenarioId, setComparisonScenarioData);
  }, [requestId, baseScenarioId, comparisonScenarioId]);

  const baseMetrics = useMemo(() => {
    if (!requestData || !baseScenarioData) return null;
    return buildPricing20Metrics(requestData, baseScenarioData);
  }, [requestData, baseScenarioData]);

  const comparisonMetrics = useMemo(() => {
    if (!requestData || !comparisonScenarioData) return null;
    return buildPricing20Metrics(requestData, comparisonScenarioData);
  }, [requestData, comparisonScenarioData]);

  const rows = useMemo(() => {
    if (!baseMetrics || !comparisonMetrics) return [];

    const basisLabel = baseMetrics.basisLabel;

    return [
      buildSectionRow("Overview"),
      buildTextRow("Base Scenario", baseMetrics.scenarioName, comparisonMetrics.scenarioName),
      buildNumberRow(
        `Expected annual volume (${baseMetrics.isSheet ? "tons" : "x1000 pcs"})`,
        baseMetrics.raw.expectedAnnualVolume,
        comparisonMetrics.raw.expectedAnnualVolume
      ),

      buildSectionRow("Assumptions"),
      buildTextRow("Scenario note", baseMetrics.scenarioNote, comparisonMetrics.scenarioNote),
      buildNumberRow("USD/EGP Rate", baseMetrics.assumptions.usdEgp, comparisonMetrics.assumptions.usdEgp),
      buildNumberRow("EUR/USD Rate", baseMetrics.assumptions.eurUsd, comparisonMetrics.assumptions.eurUsd),
      buildNumberRow("DSO", baseMetrics.assumptions.dso, comparisonMetrics.assumptions.dso),
      buildNumberRow("DIO", baseMetrics.assumptions.dio, comparisonMetrics.assumptions.dio),
      buildNumberRow("DPO", baseMetrics.assumptions.dpo, comparisonMetrics.assumptions.dpo),
      buildNumberRow(
        "Interest Rate",
        baseMetrics.assumptions.interestRatePct,
        comparisonMetrics.assumptions.interestRatePct,
        " %"
      ),
      buildNumberRow(
        "Product weight",
        baseMetrics.raw.productWeightG,
        comparisonMetrics.raw.productWeightG,
        " g"
      ),

      buildSectionRow("Price Breakdown"),
      buildMoneyRow(
        `Material cost per ${basisLabel}`,
        baseMetrics.costs.material,
        comparisonMetrics.costs.material,
        baseMetrics,
        comparisonMetrics,
        comparisonCurrency
      ),
      buildMoneyRow(
        `Total packaging cost per ${basisLabel}`,
        baseMetrics.costs.packaging,
        comparisonMetrics.costs.packaging,
        baseMetrics,
        comparisonMetrics,
        comparisonCurrency
      ),
      !baseMetrics.isSheet
        ? buildMoneyRow(
            `Decoration cost per ${basisLabel}`,
            baseMetrics.costs.decoration,
            comparisonMetrics.costs.decoration,
            baseMetrics,
            comparisonMetrics,
            comparisonCurrency
          )
        : null,
      buildMoneyRow(
        `Total waste cost per ${basisLabel}`,
        baseMetrics.costs.waste,
        comparisonMetrics.costs.waste,
        baseMetrics,
        comparisonMetrics,
        comparisonCurrency
      ),
      buildMoneyRow(
        `Working capital cost per ${basisLabel}`,
        baseMetrics.costs.workingCapital,
        comparisonMetrics.costs.workingCapital,
        baseMetrics,
        comparisonMetrics,
        comparisonCurrency
      ),
      buildMoneyRow(
        `Amortization cost per ${basisLabel}`,
        baseMetrics.costs.amortization,
        comparisonMetrics.costs.amortization,
        baseMetrics,
        comparisonMetrics,
        comparisonCurrency
      ),
      buildMoneyRow(
        `Conversion cost per ${basisLabel}`,
        baseMetrics.costs.conversion,
        comparisonMetrics.costs.conversion,
        baseMetrics,
        comparisonMetrics,
        comparisonCurrency
      ),
      buildMoneyRow(
        `Sales price per ${basisLabel}`,
        baseMetrics.costs.salesPrice,
        comparisonMetrics.costs.salesPrice,
        baseMetrics,
        comparisonMetrics,
        comparisonCurrency,
        true
      ),

      buildSectionRow("Investment"),
      buildMoneyRow(
        "Amortized portion",
        baseMetrics.investments.amortizedPortion,
        comparisonMetrics.investments.amortizedPortion,
        baseMetrics,
        comparisonMetrics,
        comparisonCurrency
      ),
      buildMoneyRow(
        "Non amortized portion",
        baseMetrics.investments.nonAmortizedPortion,
        comparisonMetrics.investments.nonAmortizedPortion,
        baseMetrics,
        comparisonMetrics,
        comparisonCurrency
      ),
      buildMoneyRow(
        "Total investment cost",
        baseMetrics.investments.totalInvestment,
        comparisonMetrics.investments.totalInvestment,
        baseMetrics,
        comparisonMetrics,
        comparisonCurrency,
        true
      ),

      buildSectionRow("Payback"),
      buildNumberRow(
        "Payback for total investment",
        baseMetrics.commercial.paybackTotalYears,
        comparisonMetrics.commercial.paybackTotalYears,
        " years"
      ),
      buildNumberRow(
        "Payback years for non amortized investment",
        baseMetrics.commercial.paybackNonAmortizedYears,
        comparisonMetrics.commercial.paybackNonAmortizedYears,
        " years"
      ),

      buildSectionRow("Annual"),
      buildMoneyRow(
        "Annual turnover",
        baseMetrics.commercial.annualTurnoverEgp,
        comparisonMetrics.commercial.annualTurnoverEgp,
        baseMetrics,
        comparisonMetrics,
        comparisonCurrency
      ),
      buildMoneyRow(
        "Annual conversion",
        baseMetrics.commercial.annualConversionEgp,
        comparisonMetrics.commercial.annualConversionEgp,
        baseMetrics,
        comparisonMetrics,
        comparisonCurrency
      ),

      buildSectionRow("Conversion Detail"),
      buildMoneyRow(
        "Daily thermoforming conversion price",
        baseMetrics.daily.thermoforming,
        comparisonMetrics.daily.thermoforming,
        baseMetrics,
        comparisonMetrics,
        comparisonCurrency
      ),
      buildMoneyRow(
        "Daily extrusion conversion price",
        baseMetrics.daily.extrusion,
        comparisonMetrics.daily.extrusion,
        baseMetrics,
        comparisonMetrics,
        comparisonCurrency
      ),
      buildMoneyRow(
        `Conversion cost per ${basisLabel}`,
        baseMetrics.costs.conversion,
        comparisonMetrics.costs.conversion,
        baseMetrics,
        comparisonMetrics,
        comparisonCurrency
      ),
    ].filter(Boolean);
  }, [baseMetrics, comparisonMetrics, comparisonCurrency]);

  const swapScenarios = () => {
    setBaseScenarioId(comparisonScenarioId);
    setComparisonScenarioId(baseScenarioId);
  };

  if (loading) {
    return <div className="p-6">Loading scenario comparison...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!requestData) {
    return <div className="p-6">Request not found.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Pricing 2.0
              </div>
              <div className="text-2xl font-semibold">Scenario Comparison</div>
              <div className="text-sm text-gray-500">
                {requestData?.project?.projectName || requestId} • Request: {requestId}
              </div>
            </div>

            <Link
              to={`/pricing20/${requestId}`}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100 bg-white"
            >
              ← Back to Workspace
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <label className="block">
              <div className="text-xs text-gray-500 mb-1">Comparison Currency</div>
              <select
                className="w-full border rounded-lg p-2"
                value={comparisonCurrency}
                onChange={(e) => setComparisonCurrency(e.target.value)}
              >
                <option value="EGP">EGP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </label>

            <label className="block">
              <div className="text-xs text-gray-500 mb-1">Base Scenario</div>
              <select
                className="w-full border rounded-lg p-2"
                value={baseScenarioId}
                onChange={(e) => setBaseScenarioId(e.target.value)}
              >
                <option value="">Select</option>
                {scenarios.map((row) => (
                  <option key={row.scenarioId} value={row.scenarioId}>
                    {row.scenarioName || row.scenarioId}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <div className="text-xs text-gray-500 mb-1">Comparison Scenario</div>
              <select
                className="w-full border rounded-lg p-2"
                value={comparisonScenarioId}
                onChange={(e) => setComparisonScenarioId(e.target.value)}
              >
                <option value="">Select</option>
                {scenarios.map((row) => (
                  <option key={row.scenarioId} value={row.scenarioId}>
                    {row.scenarioName || row.scenarioId}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={swapScenarios}
                className="w-full rounded-lg border px-4 py-2 text-sm hover:bg-gray-100 bg-white"
              >
                Switch Scenarios
              </button>
            </div>
          </div>
        </div>

        {scenarios.length < 2 ? (
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-orange-700">
            You need at least 2 scenarios in this workspace to compare them.
          </div>
        ) : !baseMetrics || !comparisonMetrics ? (
          <div className="rounded-xl border bg-white p-4 text-gray-500">
            Select both scenarios to view the comparison.
          </div>
        ) : (
          <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
            <div className="overflow-auto">
              <table className="w-full text-sm border-collapse min-w-[1200px]">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="text-left p-3 font-semibold">Item</th>
                    <th className="text-left p-3 font-semibold">
                      {baseMetrics.scenarioName || "Base Scenario"}
                    </th>
                    <th className="text-left p-3 font-semibold">
                      {comparisonMetrics.scenarioName || "Comparison Scenario"}
                    </th>
                    <th className="text-left p-3 font-semibold">Difference</th>
                    <th className="text-left p-3 font-semibold">% change</th>
                    <th className="text-left p-3 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) =>
                    row.type === "section" ? (
                      <tr key={`${row.label}-${idx}`} className="bg-blue-50 border-b">
                        <td colSpan={6} className="p-3 font-semibold text-blue-900">
                          {row.label}
                        </td>
                      </tr>
                    ) : (
                      <tr
                        key={`${row.label}-${idx}`}
                        className={`border-b ${row.bold ? "font-semibold bg-gray-50" : ""}`}
                      >
                        <td className="p-3">{row.label}</td>
                        <td className="p-3">{row.base}</td>
                        <td className="p-3">{row.comparison}</td>
                        <td className="p-3">{row.difference}</td>
                        <td className="p-3">{row.pct}</td>
                        <td className="p-3 text-gray-600">{row.notes}</td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} export default Pricing20ComparisonPage;
export { Pricing20ComparisonPage };
