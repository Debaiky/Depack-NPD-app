import { useEffect, useMemo } from "react";

function n(v) {
  const x = parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isNaN(x) ? 0 : x;
}

function fmt(v, d = 3) {
  if (v === "" || v === null || v === undefined || Number.isNaN(Number(v))) return "—";
  return Number(v).toLocaleString(undefined, {
    maximumFractionDigits: d,
    minimumFractionDigits: 0,
  });
}

function uid(prefix = "row") {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
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

function isDifferent(a, b) {
  return String(a ?? "").trim() !== String(b ?? "").trim();
}

function mergeRowsById(existingRows = [], desiredRows = []) {
  const existingMap = new Map((existingRows || []).map((row) => [row.id, row]));
  return desiredRows.map((row) => ({
    ...row,
    ...(existingMap.get(row.id) || {}),
  }));
}

function buildGroupedMaterialRows(scenarioEngineering) {
  const ms = scenarioEngineering?.materialSheet || {};
  const layerAPct = n(ms.layerAPct) / 100;
  const layerBPct = 1 - layerAPct;

  const grouped = new Map();

  (ms.layerA || []).forEach((row) => {
    const name = String(row?.name || "").trim();
    const pct = n(row?.pct) / 100;
    if (!name || pct <= 0) return;

    if (!grouped.has(name)) {
      grouped.set(name, {
        name,
        pctLayerA: 0,
        pctLayerB: 0,
      });
    }

    grouped.get(name).pctLayerA += pct;
  });

  (ms.layerB || []).forEach((row) => {
    const name = String(row?.name || "").trim();
    const pct = n(row?.pct) / 100;
    if (!name || pct <= 0) return;

    if (!grouped.has(name)) {
      grouped.set(name, {
        name,
        pctLayerA: 0,
        pctLayerB: 0,
      });
    }

    grouped.get(name).pctLayerB += pct;
  });

  const coatingUsed = String(ms.coatingUsed || "No") === "Yes";
  const coatingWeight = n(ms.coatingWeight_g_m2);
  const density = n(ms.density);
  const thicknessMic = n(scenarioEngineering?.sheetSpecs?.thickness_mic);

  const plasticWeightPerM2 =
    density > 0 && thicknessMic > 0 ? density * thicknessMic : 0;

  const totalWeightPerM2 = plasticWeightPerM2 + (coatingUsed ? coatingWeight : 0);
  const coatingShare = totalWeightPerM2 > 0 ? coatingWeight / totalWeightPerM2 : 0;
  const plasticShare = 1 - coatingShare;

  const rows = Array.from(grouped.values()).map((item, idx) => {
    const totalPct =
      item.pctLayerA * layerAPct +
      item.pctLayerB * layerBPct;

    return {
      id: `material-${idx + 1}-${item.name}`,
      name: item.name,
      unit: "per Kg",
      sourceConsumptionKgPerTon: totalPct * 1000 * plasticShare,
      priceInCurrency: "",
      currency: "EGP",
    };
  });

  if (coatingUsed && String(ms.coatingName || "").trim()) {
    rows.push({
      id: `material-coating-${ms.coatingName}`,
      name: ms.coatingName,
      unit: "per Kg",
      sourceConsumptionKgPerTon: coatingShare * 1000,
      priceInCurrency: "",
      currency: "EGP",
    });
  }

  if (!rows.length) {
    rows.push(
      {
        id: "material-1",
        name: "Material 1 from Material BOM",
        unit: "per Kg",
        sourceConsumptionKgPerTon: 0,
        priceInCurrency: "",
        currency: "EGP",
      },
      {
        id: "material-2",
        name: "Material 2 from Material BOM",
        unit: "per Kg",
        sourceConsumptionKgPerTon: 0,
        priceInCurrency: "",
        currency: "EGP",
      },
      {
        id: "material-3",
        name: "Material 3 from Material BOM",
        unit: "per Kg",
        sourceConsumptionKgPerTon: 0,
        priceInCurrency: "",
        currency: "EGP",
      }
    );
  }

  return rows;
}

function buildSheetPackagingRows(scenarioEngineering) {
  const sheetPackaging = scenarioEngineering?.sheetPackaging || {};

  const rollsPerPallet = n(sheetPackaging.rollsPerPallet);
  const labelsPerRoll = n(sheetPackaging.labelsPerRoll);
  const separatorsPerPallet = n(sheetPackaging.separatorsPerPallet);
  const foamLengthPerPallet = n(sheetPackaging.foamLength_m);
  const strapLengthPerPallet = n(sheetPackaging.strapLength_m);
  const stretchKgPerPallet = n(sheetPackaging.stretchKgPerPallet);
  const coreUses = n(sheetPackaging.coreUses) || 1;
  const palletUses = n(sheetPackaging.palletUses) || 1;

  const perRollDivisor = rollsPerPallet > 0 ? rollsPerPallet : 1;

  return [
    {
      id: "sheet-pack-core",
      name: "Core",
      unit: "per unit",
      sourceConsumptionPerRoll: 1,
      sourceNoOfUses: coreUses,
      priceInCurrency: "",
      currency: "EGP",
    },
    {
      id: "sheet-pack-label",
      name: "Label",
      unit: "per unit",
      sourceConsumptionPerRoll: labelsPerRoll,
      sourceNoOfUses: 1,
      priceInCurrency: "",
      currency: "EGP",
    },
    {
      id: "sheet-pack-separators",
      name: "Separators",
      unit: "per unit",
      sourceConsumptionPerRoll: separatorsPerPallet / perRollDivisor,
      sourceNoOfUses: 1,
      priceInCurrency: "",
      currency: "EGP",
    },
    {
      id: "sheet-pack-foam",
      name: "Foam Sheet",
      unit: "per m",
      sourceConsumptionPerRoll: foamLengthPerPallet / perRollDivisor,
      sourceNoOfUses: 1,
      priceInCurrency: "",
      currency: "EGP",
    },
    {
      id: "sheet-pack-strap",
      name: "Strap",
      unit: "per m",
      sourceConsumptionPerRoll: strapLengthPerPallet / perRollDivisor,
      sourceNoOfUses: 1,
      priceInCurrency: "",
      currency: "EGP",
    },
    {
      id: "sheet-pack-pallet",
      name: "Pallet",
      unit: "per unit",
      sourceConsumptionPerRoll: rollsPerPallet > 0 ? 1 / rollsPerPallet : 0,
      sourceNoOfUses: palletUses,
      priceInCurrency: "",
      currency: "EGP",
    },
    {
      id: "sheet-pack-stretch",
      name: "Stretch Film",
      unit: "per Kg",
      sourceConsumptionPerRoll: stretchKgPerPallet / perRollDivisor,
      sourceNoOfUses: 1,
      priceInCurrency: "",
      currency: "EGP",
    },
    {
      id: "sheet-pack-others",
      name: "Others",
      unit: "per pallet",
      sourceConsumptionPerRoll: 1,
      sourceNoOfUses: 1,
      priceInCurrency: "",
      currency: "EGP",
    },
  ];
}

function buildIntermediatePackagingRowsForNonSheet(scenarioEngineering) {
  const sheetPackaging = scenarioEngineering?.sheetPackaging || {};
  const rollsPerPallet = n(sheetPackaging.rollsPerPallet);
  const labelsPerRoll = n(sheetPackaging.labelsPerRoll);
  const separatorsPerPallet = n(sheetPackaging.separatorsPerPallet);
  const foamLengthPerPallet = n(sheetPackaging.foamLength_m);
  const strapLengthPerPallet = n(sheetPackaging.strapLength_m);
  const stretchKgPerPallet = n(sheetPackaging.stretchKgPerPallet);
  const coreUses = n(sheetPackaging.coreUses) || 1;
  const palletUses = n(sheetPackaging.palletUses) || 1;
  const perRollDivisor = rollsPerPallet > 0 ? rollsPerPallet : 1;

  return [
    {
      id: "inter-pack-core",
      name: "Core",
      unit: "per unit",
      sourceConsumptionPerRoll: 1,
      sourceNoOfUses: coreUses,
      priceInCurrency: "",
      currency: "EGP",
    },
    {
      id: "inter-pack-label",
      name: "Label",
      unit: "per unit",
      sourceConsumptionPerRoll: labelsPerRoll,
      sourceNoOfUses: 1,
      priceInCurrency: "",
      currency: "EGP",
    },
    {
      id: "inter-pack-separators",
      name: "Separators",
      unit: "per unit",
      sourceConsumptionPerRoll: separatorsPerPallet / perRollDivisor,
      sourceNoOfUses: 1,
      priceInCurrency: "",
      currency: "EGP",
    },
    {
      id: "inter-pack-foam",
      name: "Foam Sheet",
      unit: "per m",
      sourceConsumptionPerRoll: foamLengthPerPallet / perRollDivisor,
      sourceNoOfUses: 1,
      priceInCurrency: "",
      currency: "EGP",
    },
    {
      id: "inter-pack-strap",
      name: "Strap",
      unit: "per m",
      sourceConsumptionPerRoll: strapLengthPerPallet / perRollDivisor,
      sourceNoOfUses: 1,
      priceInCurrency: "",
      currency: "EGP",
    },
    {
      id: "inter-pack-stretch",
      name: "Stretch Film",
      unit: "per Kg",
      sourceConsumptionPerRoll: stretchKgPerPallet / perRollDivisor,
      sourceNoOfUses: 1,
      priceInCurrency: "",
      currency: "EGP",
    },
    {
      id: "inter-pack-pallet",
      name: "Pallet",
      unit: "per unit",
      sourceConsumptionPerRoll: rollsPerPallet > 0 ? 1 / rollsPerPallet : 0,
      sourceNoOfUses: palletUses,
      priceInCurrency: "",
      currency: "EGP",
    },
    {
      id: "inter-pack-others",
      name: "Others",
      unit: "per pallet",
      sourceConsumptionPerRoll: 1,
      sourceNoOfUses: 1,
      priceInCurrency: "",
      currency: "EGP",
    },
  ];
}

function buildThermoPackagingRows(scenarioEngineering) {
  const primary = scenarioEngineering?.packaging?.primary || {};
  const secondary = scenarioEngineering?.packaging?.secondary || {};
  const pallet = scenarioEngineering?.packaging?.pallet || {};

  return [
    {
      id: "thermo-pack-bag",
      name: "Bag / Sleeve",
      unit: "per unit",
      sourceConsumptionPerCarton: n(secondary.primariesPerSecondary),
      sourceNoOfUses: 1,
      priceInCurrency: "",
      currency: "EGP",
    },
    {
      id: "thermo-pack-carton",
      name: "Carton Box",
      unit: "per unit",
      sourceConsumptionPerCarton: 1,
      sourceNoOfUses: 1,
      priceInCurrency: "",
      currency: "EGP",
    },
    {
      id: "thermo-pack-label",
      name: "Labels",
      unit: "per unit",
      sourceConsumptionPerCarton: n(secondary.labelsPerBox),
      sourceNoOfUses: 1,
      priceInCurrency: "",
      currency: "EGP",
    },
    {
      id: "thermo-pack-tape",
      name: "Tape",
      unit: "per m",
      sourceConsumptionPerCarton: 0,
      sourceNoOfUses: 1,
      priceInCurrency: "",
      currency: "EGP",
    },
    {
      id: "thermo-pack-pallet",
      name: "Pallet",
      unit: "per unit",
      sourceConsumptionPerCarton:
        n(pallet.boxesPerPallet) > 0 ? 1 / n(pallet.boxesPerPallet) : 0,
      sourceNoOfUses: 1,
      priceInCurrency: "",
      currency: "EGP",
    },
    {
      id: "thermo-pack-others",
      name: "Others",
      unit: "per pallet",
      sourceConsumptionPerCarton: 1,
      sourceNoOfUses: 1,
      priceInCurrency: "",
      currency: "EGP",
    },
  ];
}

function buildDefaultFreightRows() {
  return [
    {
      id: "freight-local",
      name: "Local Transportation",
      tripCostCurrency: "",
      currency: "EGP",
      priceInEgp: "",
    },
    {
      id: "freight-shipping",
      name: "Shipping Cost",
      tripCostCurrency: "",
      currency: "EGP",
      priceInEgp: "",
    },
    {
      id: "freight-thc",
      name: "THC Cost",
      tripCostCurrency: "",
      currency: "EGP",
      priceInEgp: "",
    },
    {
      id: "freight-other",
      name: "Other Costs",
      tripCostCurrency: "",
      currency: "EGP",
      priceInEgp: "",
    },
  ];
}

function buildDefaultWasteRows(caseType) {
  if (caseType === "sheet") {
    return [
      { id: "waste-material", name: "Material Waste", ratePct: "" },
      { id: "waste-packaging", name: "Packaging Waste", ratePct: "" },
    ];
  }

  return [
    { id: "waste-material", name: "Material Waste", ratePct: "" },
    {
      id: "waste-intermediate-packaging",
      name: "Intermediate Sheet Packaging Waste",
      ratePct: "",
    },
    {
      id: "waste-thermo-packaging",
      name: "Thermoforming Packaging Waste",
      ratePct: "",
    },
    {
      id: "waste-decoration",
      name: "Decoration Waste",
      ratePct: "",
    },
  ];
}

function buildDefaultWorkingCapitalRows(caseType, assumptions) {
  const base = {
    dso: assumptions?.dso || "",
    dio: assumptions?.dio || "",
    dpo: assumptions?.dpo || "",
    interestRatePct: assumptions?.interestRatePct || "",
  };

  if (caseType === "sheet") {
    return [
      { id: "wc-material", name: "Material WC", ...base },
      { id: "wc-packaging", name: "Packaging Material WC", ...base },
    ];
  }

  return [
    { id: "wc-material", name: "Material WC", ...base },
    { id: "wc-packaging", name: "Total Packaging Material WC", ...base },
    { id: "wc-decoration", name: "Decoration Material WC", ...base },
  ];
}

function buildDefaultAmortizationRows(scenarioEngineering) {
  const investments = Array.isArray(scenarioEngineering?.investments)
    ? scenarioEngineering.investments
    : [];

  if (!investments.length) {
    return [
      {
        id: uid("amort"),
        name: "Investment line 1",
        valueInCurrency: "",
        currency: "EGP",
        amortized: false,
        amortizationQty: "",
      },
    ];
  }

  return investments.map((row, idx) => ({
    id: row.id || `amort-${idx + 1}`,
    name: row.name || `Investment ${idx + 1}`,
    valueInCurrency: row.value || "",
    currency: row.currency || "EGP",
    amortized: false,
    amortizationQty: "",
  }));
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

function getDecorationType(requestData, scenarioEngineering) {
  const reqType =
    requestData?.product?.productType === "Sheet Roll"
      ? "No decoration"
      : requestData?.decoration?.decorationType || "No decoration";

  if (reqType && reqType !== "No decoration") return reqType;

  if (scenarioEngineering?.decorationEngineering?.enabled) {
    if (scenarioEngineering?.decorationEngineering?.print) return "Dry offset printing";
    if (scenarioEngineering?.decorationEngineering?.sleeve) return "Shrink sleeve";
    if (scenarioEngineering?.decorationEngineering?.hybrid) return "Hybrid cup";
  }

  return "No decoration";
}

function toneClasses(mode) {
  const map = {
    editable_from_engineering: "bg-gray-100 border-gray-300",
    locked_engineering: "bg-orange-100 border-orange-300",
    calculated: "bg-green-100 border-green-300",
    user: "bg-blue-100 border-blue-300",
  };

  return map[mode] || map.user;
}

function CompactInput({
  label,
  value,
  onChange,
  mode = "user",
  suffix = "",
  referenceValue,
  placeholder = "",
}) {
  const readOnly = mode === "locked_engineering" || mode === "calculated";
  const showOverride =
    mode === "editable_from_engineering" &&
    referenceValue !== undefined &&
    String(referenceValue).trim() !== "" &&
    isDifferent(value, referenceValue);

  return (
    <label className="block space-y-1">
      <div className="text-xs text-gray-600">{label}</div>
      <input
        className={`w-full rounded-lg border px-3 py-2 text-sm ${toneClasses(mode)}`}
        value={value ?? ""}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
      />
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] text-gray-500">{suffix}</div>
        {showOverride ? (
          <div className="text-[11px] text-orange-700 font-medium">Override vs engineering</div>
        ) : null}
      </div>
    </label>
  );
}

function StatCard({ title, value, tone = "gray" }) {
  const tones = {
    gray: "bg-gray-50 border-gray-200",
    blue: "bg-blue-50 border-blue-200",
    green: "bg-green-50 border-green-200",
    orange: "bg-orange-50 border-orange-200",
    red: "bg-red-50 border-red-200",
    purple: "bg-purple-50 border-purple-200",
    teal: "bg-teal-50 border-teal-200",
  };

  return (
    <div className={`rounded-xl border p-3 ${tones[tone] || tones.gray}`}>
      <div className="text-xs text-gray-500">{title}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function Section({ title, tone = "gray", children }) {
  const tones = {
    gray: "border-gray-200 bg-white",
    blue: "border-blue-200 bg-blue-50/40",
    green: "border-green-200 bg-green-50/40",
    orange: "border-orange-200 bg-orange-50/40",
    red: "border-red-200 bg-red-50/40",
    purple: "border-purple-200 bg-purple-50/40",
    teal: "border-teal-200 bg-teal-50/40",
  };

  return (
    <div className={`rounded-2xl border p-4 space-y-4 shadow-sm ${tones[tone] || tones.gray}`}>
      <div className="font-semibold">{title}</div>
      {children}
    </div>
  );
}

export default function Pricing20PricingTab({
  requestData,
  scenarioEngineering,
  pricing20Data,
  setPricing20Data,
}) {
  const caseType = detectCase(requestData);
  const isSheet = caseType === "sheet";

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

  const requestedDecorationType = getDecorationType(requestData, scenarioEngineering);

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
      n(scenarioEngineering?.freight?.palletWeight_kg) > 0 && false
        ? 0
        : n(
            scenarioEngineering?.thermo?.sheetUtilizationPct
              ? scenarioEngineering?.thermo?.requiredSheetKgPerDay24h
              : 0
          ) || 0;

    const freightOptionCandidates = [
      {
        key: "container20",
        label: "20ft Dry Container",
        tons: n(scenarioEngineering?.freight?.container20_netWeight_kg) / 1000,
        pcs: n(scenarioEngineering?.freight?.container20_pcs),
      },
      {
        key: "container40",
        label: "40ft Dry Container",
        tons: n(scenarioEngineering?.freight?.container40_netWeight_kg) / 1000,
        pcs: n(scenarioEngineering?.freight?.container40_pcs),
      },
      {
        key: "container40hc",
        label: "40ft High Cube",
        tons: n(scenarioEngineering?.freight?.container40hc_netWeight_kg) / 1000,
        pcs: n(scenarioEngineering?.freight?.container40hc_pcs),
      },
      {
        key: "smallTruck",
        label: "Small Truck",
        tons: n(scenarioEngineering?.freight?.smallTruck_netWeight_kg) / 1000,
        pcs: n(scenarioEngineering?.freight?.smallTruck_pcs),
      },
      {
        key: "mediumTruck",
        label: "Medium Truck",
        tons: n(scenarioEngineering?.freight?.mediumTruck_netWeight_kg) / 1000,
        pcs: n(scenarioEngineering?.freight?.mediumTruck_pcs),
      },
      {
        key: "largeTruck",
        label: "Large Truck",
        tons: n(scenarioEngineering?.freight?.largeTruck_netWeight_kg) / 1000,
        pcs: n(scenarioEngineering?.freight?.largeTruck_pcs),
      },
      {
        key: "doubleTrailer",
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
      requiredSheetKgPerDay:
        n(scenarioEngineering?.thermo?.sheetUtilizationPct) > 0
          ? (thermoPcsPerDay * productWeightG) / 1000 / (sheetUtilPct / 100)
          : 0,
      freightOptions,
    };
  }, [requestData, scenarioEngineering, isSheet]);

  useEffect(() => {
    setPricing20Data((prev) => {
      const next = { ...(prev || {}) };

      const nextAssumptions = {
        baseCurrency: next.assumptions?.baseCurrency || "EGP",
        eurUsd: next.assumptions?.eurUsd || "",
        usdEgp: next.assumptions?.usdEgp || "",
        interestRatePct: next.assumptions?.interestRatePct || "",
        dso: next.assumptions?.dso || "",
        dio: next.assumptions?.dio || "",
        dpo: next.assumptions?.dpo || "",
      };

      const opDefaults = isSheet
        ? {
            machine: scenarioEngineering?.extrusion?.lineName || "Breyer",
            efficiencyPct: scenarioEngineering?.extrusion?.efficiencyPct || "",
            rollWeightKg:
              scenarioEngineering?.sheetPackaging?.rollWeight_kg ||
              scenarioEngineering?.sheetSpecs?.rollTargetWeight_kg ||
              "",
            rollsPerPallet: scenarioEngineering?.sheetPackaging?.rollsPerPallet || "",
            weightPerPalletKg:
              n(scenarioEngineering?.sheetPackaging?.rollWeight_kg ||
                scenarioEngineering?.sheetSpecs?.rollTargetWeight_kg) *
                n(scenarioEngineering?.sheetPackaging?.rollsPerPallet) || "",
            productivityTonsPerDay: scenarioEngineering?.extrusion?.tonsPerDay24h || "",
          }
        : {
            thermoMachine: scenarioEngineering?.thermo?.machineName || "",
            cavities: scenarioEngineering?.thermo?.cavities || "",
            cpm: scenarioEngineering?.thermo?.cpm || "",
            sheetUtilizationPct: scenarioEngineering?.thermo?.sheetUtilizationPct || "",
            thermoEfficiencyPct: scenarioEngineering?.thermo?.efficiencyPct || "",
            productWeightG:
              scenarioEngineering?.thermo?.unitWeight_g ||
              requestData?.product?.productWeightG ||
              "",
            pcsProducedPerDay: scenarioEngineering?.thermo?.pcsPerDay24h || "",
            sheetRollConsumedPerDayKg: engineeringRefs.requiredSheetKgPerDay || "",
            extrusionMachine: scenarioEngineering?.extrusion?.lineName || "Breyer",
            extrusionEfficiencyPct: scenarioEngineering?.extrusion?.efficiencyPct || "",
            rollWeightKg:
              scenarioEngineering?.sheetPackaging?.rollWeight_kg ||
              scenarioEngineering?.sheetSpecs?.rollTargetWeight_kg ||
              "",
            extrusionProductivityTonsPerDay:
              scenarioEngineering?.extrusion?.tonsPerDay24h || "",
            decorationType: requestedDecorationType,
            pcsPerStack: scenarioEngineering?.packaging?.primary?.pcsPerStack || "",
            stacksPerPrimary: scenarioEngineering?.packaging?.primary?.stacksPerPrimary || "",
            primariesPerCarton:
              scenarioEngineering?.packaging?.secondary?.primariesPerSecondary || "",
            cartonsPerPallet: scenarioEngineering?.packaging?.pallet?.boxesPerPallet || "",
            pcsPerCarton: engineeringRefs.pcsPerCarton || "",
          };

      const desiredMaterialRows = buildGroupedMaterialRows(scenarioEngineering);
      const desiredSheetPackagingRows = buildSheetPackagingRows(scenarioEngineering);
      const desiredIntermediateRows = buildIntermediatePackagingRowsForNonSheet(
        scenarioEngineering
      );
      const desiredThermoRows = buildThermoPackagingRows(scenarioEngineering);
      const desiredWasteRows = buildDefaultWasteRows(caseType);
      const desiredWorkingCapitalRows = buildDefaultWorkingCapitalRows(
        caseType,
        nextAssumptions
      );
      const desiredAmortRows = buildDefaultAmortizationRows(scenarioEngineering);
      const desiredFreightRows = buildDefaultFreightRows();

      let changed = false;

      if (JSON.stringify(next.assumptions || {}) !== JSON.stringify(nextAssumptions)) {
        next.assumptions = {
          ...(next.assumptions || {}),
          ...nextAssumptions,
        };
        changed = true;
      }

      if (JSON.stringify(next.operational || {}) !== JSON.stringify({ ...(next.operational || {}), ...opDefaults })) {
        next.operational = {
          ...(next.operational || {}),
          ...opDefaults,
        };
        changed = true;
      }

      const mergedMaterialRows = mergeRowsById(next.materialRows || [], desiredMaterialRows);
      if (JSON.stringify(next.materialRows || []) !== JSON.stringify(mergedMaterialRows)) {
        next.materialRows = mergedMaterialRows;
        changed = true;
      }

      const mergedSheetPackagingRows = mergeRowsById(
        next.sheetPackagingRows || [],
        desiredSheetPackagingRows
      );
      if (JSON.stringify(next.sheetPackagingRows || []) !== JSON.stringify(mergedSheetPackagingRows)) {
        next.sheetPackagingRows = mergedSheetPackagingRows;
        changed = true;
      }

      const mergedIntermediateRows = mergeRowsById(
        next.intermediatePackagingRows || [],
        desiredIntermediateRows
      );
      if (
        JSON.stringify(next.intermediatePackagingRows || []) !==
        JSON.stringify(mergedIntermediateRows)
      ) {
        next.intermediatePackagingRows = mergedIntermediateRows;
        changed = true;
      }

      const mergedThermoRows = mergeRowsById(next.thermoPackagingRows || [], desiredThermoRows);
      if (JSON.stringify(next.thermoPackagingRows || []) !== JSON.stringify(mergedThermoRows)) {
        next.thermoPackagingRows = mergedThermoRows;
        changed = true;
      }

      const mergedWasteRows = mergeRowsById(next.wasteRows || [], desiredWasteRows);
      if (JSON.stringify(next.wasteRows || []) !== JSON.stringify(mergedWasteRows)) {
        next.wasteRows = mergedWasteRows;
        changed = true;
      }

      const mergedFreightRows = mergeRowsById(next.freightRows || [], desiredFreightRows);
      if (JSON.stringify(next.freightRows || []) !== JSON.stringify(mergedFreightRows)) {
        next.freightRows = mergedFreightRows;
        changed = true;
      }

      const mergedWorkingCapitalRows = mergeRowsById(
        next.workingCapitalRows || [],
        desiredWorkingCapitalRows
      );
      if (
        JSON.stringify(next.workingCapitalRows || []) !==
        JSON.stringify(mergedWorkingCapitalRows)
      ) {
        next.workingCapitalRows = mergedWorkingCapitalRows;
        changed = true;
      }

      const mergedAmortRows = mergeRowsById(next.amortizationRows || [], desiredAmortRows);
      if (JSON.stringify(next.amortizationRows || []) !== JSON.stringify(mergedAmortRows)) {
        next.amortizationRows = mergedAmortRows;
        changed = true;
      }

      if (!next.decoration) {
        next.decoration = {
          enabled: requestedDecorationType !== "No decoration",
          type:
            requestedDecorationType === "Dry offset printing"
              ? "Printing"
              : requestedDecorationType === "Shrink sleeve"
              ? "Shrink Sleeve"
              : requestedDecorationType === "Hybrid cup"
              ? "Hybrid"
              : "Printing",

          printing: {
            inkConsumptionGPer1000:
              scenarioEngineering?.decorationEngineering?.print?.inkWeightPer1000Cups || "",
            inkPricePerKgCurrency: "",
            currency: "EGP",
          },
          sleeve: {
            sleeveCostPerKgCurrency: "",
            sleevesPerKg: "",
            currency: "EGP",
          },
          hybrid: {
            blankConsumptionPerCup: "1",
            blankUnitPriceCurrency: "",
            blankCurrency: "EGP",
            bottomConsumptionPerCup: "1",
            bottomUnitPriceCurrency: "",
            bottomCurrency: "EGP",
          },
        };
        changed = true;
      }

      if (!next.freight) {
        next.freight = {
          selectedOption: engineeringRefs.freightOptions?.[0]?.key || "",
        };
        changed = true;
      }

      if (!next.conversion) {
        next.conversion = isSheet
          ? {
              mode: "required_conversion_per_ton",
              valueInCurrency: "",
              currency: "EGP",
            }
          : {
              mode: "required_conversion_per_1000",
              valueInCurrency: "",
              currency: "EGP",
            };
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [
    setPricing20Data,
    scenarioEngineering,
    requestData,
    caseType,
    isSheet,
    requestedDecorationType,
    engineeringRefs.requiredSheetKgPerDay,
    engineeringRefs.pcsPerCarton,
    engineeringRefs.freightOptions,
  ]);

  const updateRoot = (key, patch) => {
    setPricing20Data((prev) => ({
      ...(prev || {}),
      [key]: {
        ...((prev || {})[key] || {}),
        ...patch,
      },
    }));
  };

  const updateRowGroup = (groupKey, rowId, patch) => {
    setPricing20Data((prev) => ({
      ...(prev || {}),
      [groupKey]: ((prev || {})[groupKey] || []).map((row) =>
        row.id === rowId ? { ...row, ...patch } : row
      ),
    }));
  };

  const addAmortizationRow = () => {
    setPricing20Data((prev) => ({
      ...(prev || {}),
      amortizationRows: [
        ...(((prev || {}).amortizationRows) || []),
        {
          id: uid("amort"),
          name: "Additional Investment",
          valueInCurrency: "",
          currency: "EGP",
          amortized: false,
          amortizationQty: "",
        },
      ],
    }));
  };

  const removeAmortizationRow = (rowId) => {
    setPricing20Data((prev) => ({
      ...(prev || {}),
      amortizationRows: (((prev || {}).amortizationRows) || []).filter(
        (row) => row.id !== rowId
      ),
    }));
  };

  const selectedFreightOption = useMemo(() => {
    return (
      engineeringRefs.freightOptions.find(
        (row) => row.key === freight.selectedOption
      ) || null
    );
  }, [engineeringRefs.freightOptions, freight.selectedOption]);

  const materialComputedRows = useMemo(() => {
    return materialRows.map((row) => {
      const unitPriceEgp = currencyToEgp(
        row.priceInCurrency,
        row.currency,
        assumptions.usdEgp,
        assumptions.eurUsd
      );

      const totalCostPerTon = n(row.sourceConsumptionKgPerTon) * unitPriceEgp;
      const totalCostPer1000 = perTonToPer1000(
        totalCostPerTon,
        engineeringRefs.productWeightG,
        engineeringRefs.sheetUtilPct
      );

      const priceBase = isSheet ? n(commercialSummary.salesPriceEgp) : n(commercialSummary.salesPriceEgp);
      const percentOfPrice =
        priceBase > 0
          ? ((isSheet ? totalCostPerTon : totalCostPer1000) / priceBase) * 100
          : 0;

      return {
        ...row,
        unitPriceEgp,
        totalCostPerTon,
        totalCostPer1000,
        percentOfPrice,
        totalCostUsd: isSheet
          ? egpToUsd(totalCostPerTon, assumptions.usdEgp)
          : egpToUsd(totalCostPer1000, assumptions.usdEgp),
        totalCostEur: isSheet
          ? egpToEur(totalCostPerTon, assumptions.usdEgp, assumptions.eurUsd)
          : egpToEur(totalCostPer1000, assumptions.usdEgp, assumptions.eurUsd),
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    materialRows,
    assumptions.usdEgp,
    assumptions.eurUsd,
    engineeringRefs.productWeightG,
    engineeringRefs.sheetUtilPct,
    isSheet,
  ]);

  const materialTotals = useMemo(() => {
    return {
      egp: isSheet
        ? materialComputedRows.reduce((sum, row) => sum + row.totalCostPerTon, 0)
        : materialComputedRows.reduce((sum, row) => sum + row.totalCostPer1000, 0),
    };
  }, [materialComputedRows, isSheet]);

  const sheetPackagingComputedRows = useMemo(() => {
    if (!isSheet) return [];

    const rollWeightKg =
      n(operational.rollWeightKg) || engineeringRefs.sheetRollWeightKg;

    return sheetPackagingRows.map((row) => {
      const unitPriceEgp = currencyToEgp(
        row.priceInCurrency,
        row.currency,
        assumptions.usdEgp,
        assumptions.eurUsd
      );

      const consumptionPerRoll = n(row.sourceConsumptionPerRoll);
      const noOfUses = n(row.sourceNoOfUses) || 1;
      const costPerRoll = (consumptionPerRoll * unitPriceEgp) / noOfUses;
      const costPerTon = rollWeightKg > 0 ? costPerRoll / (rollWeightKg / 1000) : 0;

      return {
        ...row,
        unitPriceEgp,
        costPerRoll,
        costPerTon,
        percentOfPrice:
          n(commercialSummary.salesPriceEgp) > 0
            ? (costPerTon / n(commercialSummary.salesPriceEgp)) * 100
            : 0,
        costUsd: egpToUsd(costPerTon, assumptions.usdEgp),
        costEur: egpToEur(costPerTon, assumptions.usdEgp, assumptions.eurUsd),
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isSheet,
    sheetPackagingRows,
    operational.rollWeightKg,
    engineeringRefs.sheetRollWeightKg,
    assumptions.usdEgp,
    assumptions.eurUsd,
  ]);

  const sheetPackagingTotals = useMemo(() => {
    return {
      egp: sheetPackagingComputedRows.reduce((sum, row) => sum + row.costPerTon, 0),
    };
  }, [sheetPackagingComputedRows]);

  const intermediatePackagingComputedRows = useMemo(() => {
    if (isSheet) return [];

    const rollWeightKg =
      n(operational.rollWeightKg) || engineeringRefs.sheetRollWeightKg;

    return intermediatePackagingRows.map((row) => {
      const unitPriceEgp = currencyToEgp(
        row.priceInCurrency,
        row.currency,
        assumptions.usdEgp,
        assumptions.eurUsd
      );

      const consumptionPerRoll = n(row.sourceConsumptionPerRoll);
      const noOfUses = n(row.sourceNoOfUses) || 1;
      const costPerRoll = (consumptionPerRoll * unitPriceEgp) / noOfUses;
      const costPerTon = rollWeightKg > 0 ? costPerRoll / (rollWeightKg / 1000) : 0;
      const costPer1000 = perTonToPer1000(
        costPerTon,
        operational.productWeightG || engineeringRefs.productWeightG,
        operational.sheetUtilizationPct || engineeringRefs.sheetUtilPct
      );

      return {
        ...row,
        unitPriceEgp,
        costPerRoll,
        costPerTon,
        costPer1000,
        percentOfPrice:
          n(commercialSummary.salesPriceEgp) > 0
            ? (costPer1000 / n(commercialSummary.salesPriceEgp)) * 100
            : 0,
        costUsd: egpToUsd(costPer1000, assumptions.usdEgp),
        costEur: egpToEur(costPer1000, assumptions.usdEgp, assumptions.eurUsd),
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isSheet,
    intermediatePackagingRows,
    operational.rollWeightKg,
    operational.productWeightG,
    operational.sheetUtilizationPct,
    engineeringRefs.sheetRollWeightKg,
    engineeringRefs.productWeightG,
    engineeringRefs.sheetUtilPct,
    assumptions.usdEgp,
    assumptions.eurUsd,
  ]);

  const intermediatePackagingTotals = useMemo(() => {
    return {
      egp: intermediatePackagingComputedRows.reduce((sum, row) => sum + row.costPer1000, 0),
      perTon: intermediatePackagingComputedRows.reduce((sum, row) => sum + row.costPerTon, 0),
    };
  }, [intermediatePackagingComputedRows]);

  const thermoPackagingComputedRows = useMemo(() => {
    if (isSheet) return [];

    const pcsPerCarton = n(operational.pcsPerCarton) || engineeringRefs.pcsPerCarton;

    return thermoPackagingRows.map((row) => {
      const unitPriceEgp = currencyToEgp(
        row.priceInCurrency,
        row.currency,
        assumptions.usdEgp,
        assumptions.eurUsd
      );

      const consumptionPerCarton = n(row.sourceConsumptionPerCarton);
      const noOfUses = n(row.sourceNoOfUses) || 1;
      const costPer1000 =
        pcsPerCarton > 0
          ? ((consumptionPerCarton * unitPriceEgp) / noOfUses / pcsPerCarton) * 1000
          : 0;

      return {
        ...row,
        unitPriceEgp,
        costPer1000,
        percentOfPrice:
          n(commercialSummary.salesPriceEgp) > 0
            ? (costPer1000 / n(commercialSummary.salesPriceEgp)) * 100
            : 0,
        costUsd: egpToUsd(costPer1000, assumptions.usdEgp),
        costEur: egpToEur(costPer1000, assumptions.usdEgp, assumptions.eurUsd),
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isSheet,
    thermoPackagingRows,
    operational.pcsPerCarton,
    engineeringRefs.pcsPerCarton,
    assumptions.usdEgp,
    assumptions.eurUsd,
  ]);

  const thermoPackagingTotals = useMemo(() => {
    return {
      egp: thermoPackagingComputedRows.reduce((sum, row) => sum + row.costPer1000, 0),
    };
  }, [thermoPackagingComputedRows]);

  const decorationSummary = useMemo(() => {
    if (isSheet || !decoration.enabled) {
      return {
        egp: 0,
        usd: 0,
        eur: 0,
        percentOfPrice: 0,
      };
    }

    let totalEgp = 0;

    if (decoration.type === "Printing") {
      const inkConsumption = n(decoration?.printing?.inkConsumptionGPer1000);
      const inkPriceEgp = currencyToEgp(
        decoration?.printing?.inkPricePerKgCurrency,
        decoration?.printing?.currency,
        assumptions.usdEgp,
        assumptions.eurUsd
      );

      totalEgp = (inkConsumption * inkPriceEgp) / 1000;
    }

    if (decoration.type === "Shrink Sleeve") {
      const sleeveCostPerKgEgp = currencyToEgp(
        decoration?.sleeve?.sleeveCostPerKgCurrency,
        decoration?.sleeve?.currency,
        assumptions.usdEgp,
        assumptions.eurUsd
      );

      const sleevesPerKg = n(decoration?.sleeve?.sleevesPerKg);
      totalEgp = sleevesPerKg > 0 ? (1000 / sleevesPerKg) * sleeveCostPerKgEgp : 0;
    }

    if (decoration.type === "Hybrid") {
      const blankConsumption = n(decoration?.hybrid?.blankConsumptionPerCup) || 0;
      const blankUnitPriceEgp = currencyToEgp(
        decoration?.hybrid?.blankUnitPriceCurrency,
        decoration?.hybrid?.blankCurrency,
        assumptions.usdEgp,
        assumptions.eurUsd
      );

      const bottomConsumption = n(decoration?.hybrid?.bottomConsumptionPerCup) || 0;
      const bottomUnitPriceEgp = currencyToEgp(
        decoration?.hybrid?.bottomUnitPriceCurrency,
        decoration?.hybrid?.bottomCurrency,
        assumptions.usdEgp,
        assumptions.eurUsd
      );

      totalEgp =
        blankConsumption * blankUnitPriceEgp * 1000 +
        bottomConsumption * bottomUnitPriceEgp * 1000;
    }

    return {
      egp: totalEgp,
      usd: egpToUsd(totalEgp, assumptions.usdEgp),
      eur: egpToEur(totalEgp, assumptions.usdEgp, assumptions.eurUsd),
      percentOfPrice:
        n(commercialSummary.salesPriceEgp) > 0
          ? (totalEgp / n(commercialSummary.salesPriceEgp)) * 100
          : 0,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSheet, decoration, assumptions.usdEgp, assumptions.eurUsd]);

  const wasteComputedRows = useMemo(() => {
    return wasteRows.map((row) => {
      let baseCost = 0;

      if (row.id === "waste-material") {
        baseCost = materialTotals.egp;
      } else if (row.id === "waste-packaging") {
        baseCost = sheetPackagingTotals.egp;
      } else if (row.id === "waste-intermediate-packaging") {
        baseCost = intermediatePackagingTotals.egp;
      } else if (row.id === "waste-thermo-packaging") {
        baseCost = thermoPackagingTotals.egp;
      } else if (row.id === "waste-decoration") {
        baseCost = decorationSummary.egp;
      }

      const totalEgp = (n(row.ratePct) / 100) * baseCost;

      return {
        ...row,
        baseCost,
        totalEgp,
        percentOfPrice:
          n(commercialSummary.salesPriceEgp) > 0
            ? (totalEgp / n(commercialSummary.salesPriceEgp)) * 100
            : 0,
        usd: egpToUsd(totalEgp, assumptions.usdEgp),
        eur: egpToEur(totalEgp, assumptions.usdEgp, assumptions.eurUsd),
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    wasteRows,
    materialTotals.egp,
    sheetPackagingTotals.egp,
    intermediatePackagingTotals.egp,
    thermoPackagingTotals.egp,
    decorationSummary.egp,
    assumptions.usdEgp,
    assumptions.eurUsd,
  ]);

  const wasteTotals = useMemo(() => {
    return {
      egp: wasteComputedRows.reduce((sum, row) => sum + row.totalEgp, 0),
    };
  }, [wasteComputedRows]);

  const freightComputedRows = useMemo(() => {
    const qtyPerTrip = isSheet
      ? n(selectedFreightOption?.tons)
      : n(selectedFreightOption?.pcs);

    return freightRows.map((row) => {
      const priceInEgp = currencyToEgp(
        row.tripCostCurrency,
        row.currency,
        assumptions.usdEgp,
        assumptions.eurUsd
      );

      const totalEgp = qtyPerTrip > 0
        ? isSheet
          ? priceInEgp / qtyPerTrip
          : (priceInEgp / qtyPerTrip) * 1000
        : 0;

      return {
        ...row,
        priceInEgp,
        qtyPerTrip,
        totalEgp,
        percentOfPrice:
          n(commercialSummary.salesPriceEgp) > 0
            ? (totalEgp / n(commercialSummary.salesPriceEgp)) * 100
            : 0,
        usd: egpToUsd(totalEgp, assumptions.usdEgp),
        eur: egpToEur(totalEgp, assumptions.usdEgp, assumptions.eurUsd),
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    freightRows,
    isSheet,
    selectedFreightOption,
    assumptions.usdEgp,
    assumptions.eurUsd,
  ]);

  const freightTotals = useMemo(() => {
    return {
      egp: freightComputedRows.reduce((sum, row) => sum + row.totalEgp, 0),
    };
  }, [freightComputedRows]);

  const workingCapitalComputedRows = useMemo(() => {
    return workingCapitalRows.map((row) => {
      const dso = n(row.dso);
      const dio = n(row.dio);
      const dpo = n(row.dpo);
      const interestRatePct = n(row.interestRatePct);
      const effectivePct = ((dso + dio - dpo) * interestRatePct) / 365;

      let baseCost = 0;

      if (row.id === "wc-material") {
        baseCost = materialTotals.egp;
      } else if (row.id === "wc-packaging") {
        baseCost = isSheet
          ? sheetPackagingTotals.egp
          : intermediatePackagingTotals.egp + thermoPackagingTotals.egp;
      } else if (row.id === "wc-decoration") {
        baseCost = decorationSummary.egp;
      }

      const totalEgp = baseCost * (effectivePct / 100);

      return {
        ...row,
        effectivePct,
        baseCost,
        totalEgp,
        percentOfPrice:
          n(commercialSummary.salesPriceEgp) > 0
            ? (totalEgp / n(commercialSummary.salesPriceEgp)) * 100
            : 0,
        usd: egpToUsd(totalEgp, assumptions.usdEgp),
        eur: egpToEur(totalEgp, assumptions.usdEgp, assumptions.eurUsd),
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    workingCapitalRows,
    materialTotals.egp,
    sheetPackagingTotals.egp,
    intermediatePackagingTotals.egp,
    thermoPackagingTotals.egp,
    decorationSummary.egp,
    assumptions.usdEgp,
    assumptions.eurUsd,
  ]);

  const workingCapitalTotals = useMemo(() => {
    return {
      egp: workingCapitalComputedRows.reduce((sum, row) => sum + row.totalEgp, 0),
    };
  }, [workingCapitalComputedRows]);

  const amortizationComputedRows = useMemo(() => {
    return amortizationRows.map((row) => {
      const valueInEgp = currencyToEgp(
        row.valueInCurrency,
        row.currency,
        assumptions.usdEgp,
        assumptions.eurUsd
      );

      const amortizationQty = n(row.amortizationQty);
      const isOn = row.amortized === true;

      const totalEgp =
        isOn && amortizationQty > 0
          ? isSheet
            ? valueInEgp / amortizationQty
            : (valueInEgp / amortizationQty) * 1000
          : 0;

      return {
        ...row,
        valueInEgp,
        totalEgp,
        percentOfPrice:
          n(commercialSummary.salesPriceEgp) > 0
            ? (totalEgp / n(commercialSummary.salesPriceEgp)) * 100
            : 0,
        usd: egpToUsd(totalEgp, assumptions.usdEgp),
        eur: egpToEur(totalEgp, assumptions.usdEgp, assumptions.eurUsd),
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amortizationRows, assumptions.usdEgp, assumptions.eurUsd, isSheet]);

  const amortizationTotals = useMemo(() => {
    return {
      egp: amortizationComputedRows.reduce((sum, row) => sum + row.totalEgp, 0),
    };
  }, [amortizationComputedRows]);

  const salesPriceEgpManual = currencyToEgp(
    conversion.salesPriceValueInCurrency,
    conversion.salesPriceCurrency,
    assumptions.usdEgp,
    assumptions.eurUsd
  );

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
      const totalOtherCosts =
        materialTotals.egp +
        sheetPackagingTotals.egp +
        wasteTotals.egp +
        freightTotals.egp +
        workingCapitalTotals.egp +
        amortizationTotals.egp;

      if (conversion.mode === "required_daily_extrusion_conversion") {
        conversionPriceEgp =
          n(operational.productivityTonsPerDay) > 0
            ? valueEgp / n(operational.productivityTonsPerDay)
            : 0;
        salesPriceEgp = totalOtherCosts + conversionPriceEgp;
        dailyExtrusionConversionEgp = valueEgp;
      } else if (conversion.mode === "required_sales_price_per_ton") {
        salesPriceEgp = valueEgp;
        conversionPriceEgp = salesPriceEgp - totalOtherCosts;
        dailyExtrusionConversionEgp =
          conversionPriceEgp * n(operational.productivityTonsPerDay || engineeringRefs.extrusionTonsPerDay);
      } else {
        conversionPriceEgp = valueEgp;
        salesPriceEgp = totalOtherCosts + conversionPriceEgp;
        dailyExtrusionConversionEgp =
          conversionPriceEgp * n(operational.productivityTonsPerDay || engineeringRefs.extrusionTonsPerDay);
      }
    } else {
      const totalOtherCosts =
        materialTotals.egp +
        intermediatePackagingTotals.egp +
        thermoPackagingTotals.egp +
        decorationSummary.egp +
        wasteTotals.egp +
        freightTotals.egp +
        workingCapitalTotals.egp +
        amortizationTotals.egp;

      if (conversion.mode === "required_daily_thermo_conversion") {
        conversionPriceEgp =
          n(operational.pcsProducedPerDay) > 0
            ? (valueEgp / n(operational.pcsProducedPerDay)) * 1000
            : 0;
        salesPriceEgp = totalOtherCosts + conversionPriceEgp;
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

        salesPriceEgp = totalOtherCosts + conversionPriceEgp;
        dailyExtrusionConversionEgp = valueEgp;
      } else if (conversion.mode === "required_sales_price_per_1000") {
        salesPriceEgp = valueEgp;
        conversionPriceEgp = salesPriceEgp - totalOtherCosts;
        dailyExtrusionConversionEgp =
          conversionPriceEgp *
          (n(operational.pcsProducedPerDay || engineeringRefs.thermoPcsPerDay) / 1000);
        dailyThermoConversionEgp =
          conversionPriceEgp *
          (n(operational.pcsProducedPerDay || engineeringRefs.thermoPcsPerDay) / 1000);
      } else {
        conversionPriceEgp = valueEgp;
        salesPriceEgp = totalOtherCosts + conversionPriceEgp;
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
      conversionPct:
        salesPriceEgp > 0 ? (conversionPriceEgp / salesPriceEgp) * 100 : 0,
      salesPriceUsd: egpToUsd(salesPriceEgp, assumptions.usdEgp),
      salesPriceEur: egpToEur(salesPriceEgp, assumptions.usdEgp, assumptions.eurUsd),
      conversionUsd: egpToUsd(conversionPriceEgp, assumptions.usdEgp),
      conversionEur: egpToEur(conversionPriceEgp, assumptions.usdEgp, assumptions.eurUsd),
      dailyExtrusionConversionEgp,
      dailyThermoConversionEgp,
      dailyExtrusionConversionUsd: egpToUsd(dailyExtrusionConversionEgp, assumptions.usdEgp),
      dailyExtrusionConversionEur: egpToEur(
        dailyExtrusionConversionEgp,
        assumptions.usdEgp,
        assumptions.eurUsd
      ),
      dailyThermoConversionUsd: egpToUsd(dailyThermoConversionEgp, assumptions.usdEgp),
      dailyThermoConversionEur: egpToEur(
        dailyThermoConversionEgp,
        assumptions.usdEgp,
        assumptions.eurUsd
      ),
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
    materialTotals.egp,
    sheetPackagingTotals.egp,
    intermediatePackagingTotals.egp,
    thermoPackagingTotals.egp,
    decorationSummary.egp,
    wasteTotals.egp,
    freightTotals.egp,
    workingCapitalTotals.egp,
    amortizationTotals.egp,
  ]);

  const commercialSummary = conversionSummary;

  const summarySplit = useMemo(() => {
    return isSheet
      ? [
          { label: "Material", value: materialTotals.egp, tone: "green" },
          { label: "Packaging", value: sheetPackagingTotals.egp, tone: "orange" },
          { label: "Waste", value: wasteTotals.egp, tone: "red" },
          { label: "Freight", value: freightTotals.egp, tone: "teal" },
          { label: "Working Capital", value: workingCapitalTotals.egp, tone: "purple" },
          { label: "Amortization", value: amortizationTotals.egp, tone: "blue" },
          { label: "Conversion", value: conversionSummary.conversionPriceEgp, tone: "gray" },
        ]
      : [
          { label: "Material", value: materialTotals.egp, tone: "green" },
          { label: "Intermediate Packaging", value: intermediatePackagingTotals.egp, tone: "orange" },
          { label: "Thermo Packaging", value: thermoPackagingTotals.egp, tone: "orange" },
          { label: "Decoration", value: decorationSummary.egp, tone: "blue" },
          { label: "Waste", value: wasteTotals.egp, tone: "red" },
          { label: "Freight", value: freightTotals.egp, tone: "teal" },
          { label: "Working Capital", value: workingCapitalTotals.egp, tone: "purple" },
          { label: "Amortization", value: amortizationTotals.egp, tone: "blue" },
          { label: "Conversion", value: conversionSummary.conversionPriceEgp, tone: "gray" },
        ];
  }, [
    isSheet,
    materialTotals.egp,
    sheetPackagingTotals.egp,
    intermediatePackagingTotals.egp,
    thermoPackagingTotals.egp,
    decorationSummary.egp,
    wasteTotals.egp,
    freightTotals.egp,
    workingCapitalTotals.egp,
    amortizationTotals.egp,
    conversionSummary.conversionPriceEgp,
  ]);

  return (
    <div className="space-y-6">
      <Section title={`Pricing 2.0 - ${isSheet ? "Case A Sheet Roll" : "Case B Not Sheet"}`} tone="blue">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <StatCard title={isSheet ? "Sales Price / Ton" : "Sales Price / 1000 pcs"} value={`${fmt(commercialSummary.salesPriceEgp, 2)} EGP`} tone="blue" />
          <StatCard title={isSheet ? "Conversion / Ton" : "Conversion / 1000 pcs"} value={`${fmt(commercialSummary.conversionPriceEgp, 2)} EGP`} tone="purple" />
          <StatCard title="Conversion %" value={`${fmt(commercialSummary.conversionPct, 2)}%`} tone="green" />
          <StatCard title="Freight Option" value={selectedFreightOption?.label || "—"} tone="teal" />
        </div>
      </Section>

      <Section title="1. Financial Assumptions" tone="blue">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <CompactInput
            label="Base Currency"
            value={assumptions.baseCurrency}
            onChange={(v) => updateRoot("assumptions", { baseCurrency: v })}
            mode="user"
            placeholder="EGP / USD / EUR"
          />
          <CompactInput
            label="EUR / USD Rate"
            value={assumptions.eurUsd}
            onChange={(v) => updateRoot("assumptions", { eurUsd: v })}
            mode="user"
          />
          <CompactInput
            label="USD / EGP Rate"
            value={assumptions.usdEgp}
            onChange={(v) => updateRoot("assumptions", { usdEgp: v })}
            mode="user"
          />
          <CompactInput
            label="Interest Rate %"
            value={assumptions.interestRatePct}
            onChange={(v) => updateRoot("assumptions", { interestRatePct: v })}
            mode="user"
          />
          <CompactInput
            label="DSO"
            value={assumptions.dso}
            onChange={(v) => updateRoot("assumptions", { dso: v })}
            mode="user"
          />
          <CompactInput
            label="DIO"
            value={assumptions.dio}
            onChange={(v) => updateRoot("assumptions", { dio: v })}
            mode="user"
          />
          <CompactInput
            label="DPO"
            value={assumptions.dpo}
            onChange={(v) => updateRoot("assumptions", { dpo: v })}
            mode="user"
          />
        </div>
      </Section>

      <Section title="2. Operational Inputs" tone="purple">
        {isSheet ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <CompactInput
              label="Machine"
              value={operational.machine}
              onChange={(v) => updateRoot("operational", { machine: v })}
              mode="locked_engineering"
            />
            <CompactInput
              label="Efficiency %"
              value={operational.efficiencyPct}
              onChange={(v) => updateRoot("operational", { efficiencyPct: v })}
              mode="editable_from_engineering"
              referenceValue={scenarioEngineering?.extrusion?.efficiencyPct || ""}
            />
            <CompactInput
              label="Roll Weight (kg)"
              value={operational.rollWeightKg}
              onChange={(v) => updateRoot("operational", { rollWeightKg: v })}
              mode="editable_from_engineering"
              referenceValue={
                scenarioEngineering?.sheetPackaging?.rollWeight_kg ||
                scenarioEngineering?.sheetSpecs?.rollTargetWeight_kg ||
                ""
              }
            />
            <CompactInput
              label="Rolls Per Pallet"
              value={operational.rollsPerPallet}
              onChange={(v) => updateRoot("operational", { rollsPerPallet: v })}
              mode="editable_from_engineering"
              referenceValue={scenarioEngineering?.sheetPackaging?.rollsPerPallet || ""}
            />
            <CompactInput
              label="Weight Per Pallet (kg)"
              value={operational.weightPerPalletKg}
              onChange={(v) => updateRoot("operational", { weightPerPalletKg: v })}
              mode="calculated"
            />
            <CompactInput
              label="Productivity (tons/day)"
              value={operational.productivityTonsPerDay}
              onChange={(v) => updateRoot("operational", { productivityTonsPerDay: v })}
              mode="editable_from_engineering"
              referenceValue={scenarioEngineering?.extrusion?.tonsPerDay24h || ""}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <CompactInput
              label="Thermo Machine"
              value={operational.thermoMachine}
              onChange={(v) => updateRoot("operational", { thermoMachine: v })}
              mode="locked_engineering"
            />
            <CompactInput
              label="Cavities"
              value={operational.cavities}
              onChange={(v) => updateRoot("operational", { cavities: v })}
              mode="editable_from_engineering"
              referenceValue={scenarioEngineering?.thermo?.cavities || ""}
            />
            <CompactInput
              label="CPM"
              value={operational.cpm}
              onChange={(v) => updateRoot("operational", { cpm: v })}
              mode="editable_from_engineering"
              referenceValue={scenarioEngineering?.thermo?.cpm || ""}
            />
            <CompactInput
              label="Sheet Utilization %"
              value={operational.sheetUtilizationPct}
              onChange={(v) => updateRoot("operational", { sheetUtilizationPct: v })}
              mode="editable_from_engineering"
              referenceValue={scenarioEngineering?.thermo?.sheetUtilizationPct || ""}
            />
            <CompactInput
              label="Thermo Efficiency %"
              value={operational.thermoEfficiencyPct}
              onChange={(v) => updateRoot("operational", { thermoEfficiencyPct: v })}
              mode="editable_from_engineering"
              referenceValue={scenarioEngineering?.thermo?.efficiencyPct || ""}
            />
            <CompactInput
              label="Product Weight (g)"
              value={operational.productWeightG}
              onChange={(v) => updateRoot("operational", { productWeightG: v })}
              mode="editable_from_engineering"
              referenceValue={
                scenarioEngineering?.thermo?.unitWeight_g ||
                requestData?.product?.productWeightG ||
                ""
              }
            />
            <CompactInput
              label="Pieces Produced / Day"
              value={operational.pcsProducedPerDay}
              onChange={(v) => updateRoot("operational", { pcsProducedPerDay: v })}
              mode="editable_from_engineering"
              referenceValue={scenarioEngineering?.thermo?.pcsPerDay24h || ""}
            />
            <CompactInput
              label="Sheet Roll Consumed / Day (kg)"
              value={operational.sheetRollConsumedPerDayKg}
              onChange={(v) => updateRoot("operational", { sheetRollConsumedPerDayKg: v })}
              mode="editable_from_engineering"
              referenceValue={fmt(engineeringRefs.requiredSheetKgPerDay, 3)}
            />

            <CompactInput
              label="Extrusion Machine"
              value={operational.extrusionMachine}
              onChange={(v) => updateRoot("operational", { extrusionMachine: v })}
              mode="locked_engineering"
            />
            <CompactInput
              label="Extrusion Efficiency %"
              value={operational.extrusionEfficiencyPct}
              onChange={(v) => updateRoot("operational", { extrusionEfficiencyPct: v })}
              mode="editable_from_engineering"
              referenceValue={scenarioEngineering?.extrusion?.efficiencyPct || ""}
            />
            <CompactInput
              label="Roll Weight (kg)"
              value={operational.rollWeightKg}
              onChange={(v) => updateRoot("operational", { rollWeightKg: v })}
              mode="editable_from_engineering"
              referenceValue={
                scenarioEngineering?.sheetPackaging?.rollWeight_kg ||
                scenarioEngineering?.sheetSpecs?.rollTargetWeight_kg ||
                ""
              }
            />
            <CompactInput
              label="Extrusion Productivity (tons/day)"
              value={operational.extrusionProductivityTonsPerDay}
              onChange={(v) =>
                updateRoot("operational", { extrusionProductivityTonsPerDay: v })
              }
              mode="editable_from_engineering"
              referenceValue={scenarioEngineering?.extrusion?.tonsPerDay24h || ""}
            />

            <CompactInput
              label="Decoration Type"
              value={operational.decorationType}
              onChange={(v) => updateRoot("operational", { decorationType: v })}
              mode="locked_engineering"
            />
            <CompactInput
              label="Pieces / Stack"
              value={operational.pcsPerStack}
              onChange={(v) => updateRoot("operational", { pcsPerStack: v })}
              mode="editable_from_engineering"
              referenceValue={scenarioEngineering?.packaging?.primary?.pcsPerStack || ""}
            />
            <CompactInput
              label="Stacks / Primary Bag"
              value={operational.stacksPerPrimary}
              onChange={(v) => updateRoot("operational", { stacksPerPrimary: v })}
              mode="editable_from_engineering"
              referenceValue={scenarioEngineering?.packaging?.primary?.stacksPerPrimary || ""}
            />
            <CompactInput
              label="Primary Bags / Carton"
              value={operational.primariesPerCarton}
              onChange={(v) => updateRoot("operational", { primariesPerCarton: v })}
              mode="editable_from_engineering"
              referenceValue={scenarioEngineering?.packaging?.secondary?.primariesPerSecondary || ""}
            />
            <CompactInput
              label="Cartons / Pallet"
              value={operational.cartonsPerPallet}
              onChange={(v) => updateRoot("operational", { cartonsPerPallet: v })}
              mode="editable_from_engineering"
              referenceValue={scenarioEngineering?.packaging?.pallet?.boxesPerPallet || ""}
            />
            <CompactInput
              label="Pieces / Carton"
              value={operational.pcsPerCarton}
              onChange={(v) => updateRoot("operational", { pcsPerCarton: v })}
              mode="editable_from_engineering"
              referenceValue={engineeringRefs.pcsPerCarton || ""}
            />
          </div>
        )}
      </Section>

      <Section title="3. Raw Material Cost" tone="green">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-white">
              <tr>
                <th className="text-left p-2">Item</th>
                <th className="text-left p-2">Price in Currency</th>
                <th className="text-left p-2">Currency</th>
                <th className="text-left p-2">Price EGP</th>
                <th className="text-left p-2">Consumption kg/ton</th>
                <th className="text-left p-2">{isSheet ? "Cost / ton EGP" : "Cost / 1000 EGP"}</th>
                <th className="text-left p-2">% Price</th>
              </tr>
            </thead>
            <tbody>
              {materialComputedRows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-2 font-medium">{row.name}</td>
                  <td className="p-2">
                    <input
                      className="w-full rounded-lg border border-blue-300 bg-blue-100 px-2 py-1"
                      value={row.priceInCurrency || ""}
                      onChange={(e) =>
                        updateRowGroup("materialRows", row.id, {
                          priceInCurrency: e.target.value,
                        })
                      }
                    />
                  </td>
                  <td className="p-2">
                    <select
                      className="w-full rounded-lg border border-blue-300 bg-blue-100 px-2 py-1"
                      value={row.currency || "EGP"}
                      onChange={(e) =>
                        updateRowGroup("materialRows", row.id, {
                          currency: e.target.value,
                        })
                      }
                    >
                      <option value="EGP">EGP</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </td>
                  <td className="p-2 bg-green-100">{fmt(row.unitPriceEgp, 3)}</td>
                  <td className="p-2 bg-orange-100">{fmt(row.sourceConsumptionKgPerTon, 3)}</td>
                  <td className="p-2 bg-green-100">
                    {fmt(isSheet ? row.totalCostPerTon : row.totalCostPer1000, 3)}
                  </td>
                  <td className="p-2 bg-green-100">{fmt(row.percentOfPrice, 2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatCard
            title={isSheet ? "Total Material Cost / ton" : "Total Material Cost / 1000 pcs"}
            value={`${fmt(materialTotals.egp, 3)} EGP`}
            tone="green"
          />
          <StatCard
            title={isSheet ? "Total Material Cost USD" : "Total Material Cost USD"}
            value={`${fmt(egpToUsd(materialTotals.egp, assumptions.usdEgp), 3)} USD`}
            tone="green"
          />
          <StatCard
            title={isSheet ? "Total Material Cost EUR" : "Total Material Cost EUR"}
            value={`${fmt(egpToEur(materialTotals.egp, assumptions.usdEgp, assumptions.eurUsd), 3)} EUR`}
            tone="green"
          />
        </div>
      </Section>

      {isSheet ? (
        <Section title="4. Sheet Packaging Cost" tone="orange">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-white">
                <tr>
                  <th className="text-left p-2">Item</th>
                  <th className="text-left p-2">Price</th>
                  <th className="text-left p-2">Currency</th>
                  <th className="text-left p-2">Price EGP</th>
                  <th className="text-left p-2">Consumption / Roll</th>
                  <th className="text-left p-2">No. Uses</th>
                  <th className="text-left p-2">Cost / Roll</th>
                  <th className="text-left p-2">Cost / Ton</th>
                </tr>
              </thead>
              <tbody>
                {sheetPackagingComputedRows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="p-2 font-medium">{row.name}</td>
                    <td className="p-2">
                      <input
                        className="w-full rounded-lg border border-blue-300 bg-blue-100 px-2 py-1"
                        value={row.priceInCurrency || ""}
                        onChange={(e) =>
                          updateRowGroup("sheetPackagingRows", row.id, {
                            priceInCurrency: e.target.value,
                          })
                        }
                      />
                    </td>
                    <td className="p-2">
                      <select
                        className="w-full rounded-lg border border-blue-300 bg-blue-100 px-2 py-1"
                        value={row.currency || "EGP"}
                        onChange={(e) =>
                          updateRowGroup("sheetPackagingRows", row.id, {
                            currency: e.target.value,
                          })
                        }
                      >
                        <option value="EGP">EGP</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </td>
                    <td className="p-2 bg-green-100">{fmt(row.unitPriceEgp, 3)}</td>
                    <td className="p-2 bg-orange-100">{fmt(row.sourceConsumptionPerRoll, 3)}</td>
                    <td className="p-2 bg-gray-100">{fmt(row.sourceNoOfUses, 3)}</td>
                    <td className="p-2 bg-green-100">{fmt(row.costPerRoll, 3)}</td>
                    <td className="p-2 bg-green-100">{fmt(row.costPerTon, 3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <StatCard
            title="Total Packaging Cost / ton"
            value={`${fmt(sheetPackagingTotals.egp, 3)} EGP`}
            tone="orange"
          />
        </Section>
      ) : (
        <>
          <Section title="4. Intermediate Sheet Packaging Cost" tone="orange">
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-white">
                  <tr>
                    <th className="text-left p-2">Item</th>
                    <th className="text-left p-2">Price</th>
                    <th className="text-left p-2">Currency</th>
                    <th className="text-left p-2">Price EGP</th>
                    <th className="text-left p-2">Consumption / Roll</th>
                    <th className="text-left p-2">Uses</th>
                    <th className="text-left p-2">Cost / Roll</th>
                    <th className="text-left p-2">Cost / 1000 pcs</th>
                  </tr>
                </thead>
                <tbody>
                  {intermediatePackagingComputedRows.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="p-2 font-medium">{row.name}</td>
                      <td className="p-2">
                        <input
                          className="w-full rounded-lg border border-blue-300 bg-blue-100 px-2 py-1"
                          value={row.priceInCurrency || ""}
                          onChange={(e) =>
                            updateRowGroup("intermediatePackagingRows", row.id, {
                              priceInCurrency: e.target.value,
                            })
                          }
                        />
                      </td>
                      <td className="p-2">
                        <select
                          className="w-full rounded-lg border border-blue-300 bg-blue-100 px-2 py-1"
                          value={row.currency || "EGP"}
                          onChange={(e) =>
                            updateRowGroup("intermediatePackagingRows", row.id, {
                              currency: e.target.value,
                            })
                          }
                        >
                          <option value="EGP">EGP</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                        </select>
                      </td>
                      <td className="p-2 bg-green-100">{fmt(row.unitPriceEgp, 3)}</td>
                      <td className="p-2 bg-orange-100">{fmt(row.sourceConsumptionPerRoll, 3)}</td>
                      <td className="p-2 bg-gray-100">{fmt(row.sourceNoOfUses, 3)}</td>
                      <td className="p-2 bg-green-100">{fmt(row.costPerRoll, 3)}</td>
                      <td className="p-2 bg-green-100">{fmt(row.costPer1000, 3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <StatCard
              title="Total Intermediate Packaging / 1000 pcs"
              value={`${fmt(intermediatePackagingTotals.egp, 3)} EGP`}
              tone="orange"
            />
          </Section>

          <Section title="5. Thermoforming Packaging Cost" tone="teal">
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-white">
                  <tr>
                    <th className="text-left p-2">Item</th>
                    <th className="text-left p-2">Price</th>
                    <th className="text-left p-2">Currency</th>
                    <th className="text-left p-2">Price EGP</th>
                    <th className="text-left p-2">Consumption / Carton</th>
                    <th className="text-left p-2">Uses</th>
                    <th className="text-left p-2">Cost / 1000 pcs</th>
                  </tr>
                </thead>
                <tbody>
                  {thermoPackagingComputedRows.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="p-2 font-medium">{row.name}</td>
                      <td className="p-2">
                        <input
                          className="w-full rounded-lg border border-blue-300 bg-blue-100 px-2 py-1"
                          value={row.priceInCurrency || ""}
                          onChange={(e) =>
                            updateRowGroup("thermoPackagingRows", row.id, {
                              priceInCurrency: e.target.value,
                            })
                          }
                        />
                      </td>
                      <td className="p-2">
                        <select
                          className="w-full rounded-lg border border-blue-300 bg-blue-100 px-2 py-1"
                          value={row.currency || "EGP"}
                          onChange={(e) =>
                            updateRowGroup("thermoPackagingRows", row.id, {
                              currency: e.target.value,
                            })
                          }
                        >
                          <option value="EGP">EGP</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                        </select>
                      </td>
                      <td className="p-2 bg-green-100">{fmt(row.unitPriceEgp, 3)}</td>
                      <td className="p-2 bg-orange-100">{fmt(row.sourceConsumptionPerCarton, 3)}</td>
                      <td className="p-2 bg-gray-100">{fmt(row.sourceNoOfUses, 3)}</td>
                      <td className="p-2 bg-green-100">{fmt(row.costPer1000, 3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <StatCard
              title="Total Thermo Packaging / 1000 pcs"
              value={`${fmt(thermoPackagingTotals.egp, 3)} EGP`}
              tone="teal"
            />
          </Section>

          <Section title="6. Decoration Cost" tone="blue">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <CompactInput
                label="Use Decoration"
                value={decoration.enabled ? "Yes" : "No"}
                onChange={(v) =>
                  updateRoot("decoration", { enabled: String(v) === "Yes" })
                }
                mode="user"
                placeholder="Yes / No"
              />

              <CompactInput
                label="Decoration Type"
                value={decoration.type || ""}
                onChange={(v) => updateRoot("decoration", { type: v })}
                mode="editable_from_engineering"
                referenceValue={
                  requestedDecorationType === "Dry offset printing"
                    ? "Printing"
                    : requestedDecorationType === "Shrink sleeve"
                    ? "Shrink Sleeve"
                    : requestedDecorationType === "Hybrid cup"
                    ? "Hybrid"
                    : ""
                }
              />
            </div>

            {decoration.enabled && decoration.type === "Printing" ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <CompactInput
                  label="Ink Consumption g / 1000 pcs"
                  value={decoration?.printing?.inkConsumptionGPer1000 || ""}
                  onChange={(v) =>
                    updateRoot("decoration", {
                      printing: {
                        ...(decoration.printing || {}),
                        inkConsumptionGPer1000: v,
                      },
                    })
                  }
                  mode="editable_from_engineering"
                  referenceValue={
                    scenarioEngineering?.decorationEngineering?.print?.inkWeightPer1000Cups || ""
                  }
                />
                <CompactInput
                  label="Ink Price / Kg"
                  value={decoration?.printing?.inkPricePerKgCurrency || ""}
                  onChange={(v) =>
                    updateRoot("decoration", {
                      printing: {
                        ...(decoration.printing || {}),
                        inkPricePerKgCurrency: v,
                      },
                    })
                  }
                  mode="user"
                />
                <CompactInput
                  label="Currency"
                  value={decoration?.printing?.currency || "EGP"}
                  onChange={(v) =>
                    updateRoot("decoration", {
                      printing: {
                        ...(decoration.printing || {}),
                        currency: v,
                      },
                    })
                  }
                  mode="user"
                />
              </div>
            ) : null}

            {decoration.enabled && decoration.type === "Shrink Sleeve" ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <CompactInput
                  label="Sleeve Cost / Kg"
                  value={decoration?.sleeve?.sleeveCostPerKgCurrency || ""}
                  onChange={(v) =>
                    updateRoot("decoration", {
                      sleeve: {
                        ...(decoration.sleeve || {}),
                        sleeveCostPerKgCurrency: v,
                      },
                    })
                  }
                  mode="user"
                />
                <CompactInput
                  label="No. of Sleeves / Kg"
                  value={decoration?.sleeve?.sleevesPerKg || ""}
                  onChange={(v) =>
                    updateRoot("decoration", {
                      sleeve: {
                        ...(decoration.sleeve || {}),
                        sleevesPerKg: v,
                      },
                    })
                  }
                  mode="user"
                />
                <CompactInput
                  label="Currency"
                  value={decoration?.sleeve?.currency || "EGP"}
                  onChange={(v) =>
                    updateRoot("decoration", {
                      sleeve: {
                        ...(decoration.sleeve || {}),
                        currency: v,
                      },
                    })
                  }
                  mode="user"
                />
              </div>
            ) : null}

            {decoration.enabled && decoration.type === "Hybrid" ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <CompactInput
                  label="Blank Consumption / Cup"
                  value={decoration?.hybrid?.blankConsumptionPerCup || ""}
                  onChange={(v) =>
                    updateRoot("decoration", {
                      hybrid: {
                        ...(decoration.hybrid || {}),
                        blankConsumptionPerCup: v,
                      },
                    })
                  }
                  mode="user"
                />
                <CompactInput
                  label="Blank Unit Price"
                  value={decoration?.hybrid?.blankUnitPriceCurrency || ""}
                  onChange={(v) =>
                    updateRoot("decoration", {
                      hybrid: {
                        ...(decoration.hybrid || {}),
                        blankUnitPriceCurrency: v,
                      },
                    })
                  }
                  mode="user"
                />
                <CompactInput
                  label="Blank Currency"
                  value={decoration?.hybrid?.blankCurrency || "EGP"}
                  onChange={(v) =>
                    updateRoot("decoration", {
                      hybrid: {
                        ...(decoration.hybrid || {}),
                        blankCurrency: v,
                      },
                    })
                  }
                  mode="user"
                />

                <CompactInput
                  label="Bottom Consumption / Cup"
                  value={decoration?.hybrid?.bottomConsumptionPerCup || ""}
                  onChange={(v) =>
                    updateRoot("decoration", {
                      hybrid: {
                        ...(decoration.hybrid || {}),
                        bottomConsumptionPerCup: v,
                      },
                    })
                  }
                  mode="user"
                />
                <CompactInput
                  label="Bottom Unit Price"
                  value={decoration?.hybrid?.bottomUnitPriceCurrency || ""}
                  onChange={(v) =>
                    updateRoot("decoration", {
                      hybrid: {
                        ...(decoration.hybrid || {}),
                        bottomUnitPriceCurrency: v,
                      },
                    })
                  }
                  mode="user"
                />
                <CompactInput
                  label="Bottom Currency"
                  value={decoration?.hybrid?.bottomCurrency || "EGP"}
                  onChange={(v) =>
                    updateRoot("decoration", {
                      hybrid: {
                        ...(decoration.hybrid || {}),
                        bottomCurrency: v,
                      },
                    })
                  }
                  mode="user"
                />
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <StatCard title="Decoration / 1000 pcs" value={`${fmt(decorationSummary.egp, 3)} EGP`} tone="blue" />
              <StatCard title="% of Price" value={`${fmt(decorationSummary.percentOfPrice, 2)}%`} tone="blue" />
              <StatCard title="USD" value={`${fmt(decorationSummary.usd, 3)} USD`} tone="blue" />
              <StatCard title="EUR" value={`${fmt(decorationSummary.eur, 3)} EUR`} tone="blue" />
            </div>
          </Section>
        </>
      )}

      <Section title={isSheet ? "5. Waste Cost" : "7. Waste Cost"} tone="red">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {wasteComputedRows.map((row) => (
            <div key={row.id} className="rounded-xl border bg-white p-3 space-y-2">
              <div className="font-medium text-sm">{row.name}</div>
              <CompactInput
                label="Waste Rate %"
                value={row.ratePct}
                onChange={(v) => updateRowGroup("wasteRows", row.id, { ratePct: v })}
                mode="user"
              />
              <StatCard title="Base Cost EGP" value={`${fmt(row.baseCost, 3)} EGP`} tone="gray" />
              <StatCard title={isSheet ? "Waste / ton" : "Waste / 1000 pcs"} value={`${fmt(row.totalEgp, 3)} EGP`} tone="red" />
            </div>
          ))}
        </div>

        <StatCard
          title={isSheet ? "Total Waste / ton" : "Total Waste / 1000 pcs"}
          value={`${fmt(wasteTotals.egp, 3)} EGP`}
          tone="red"
        />
      </Section>

      <Section title={isSheet ? "6. Freight Cost" : "8. Freight Cost"} tone="teal">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <CompactInput
            label="Freight Option"
            value={freight.selectedOption || ""}
            onChange={(v) => updateRoot("freight", { selectedOption: v })}
            mode="user"
            placeholder="container40 / largeTruck ..."
          />
          <CompactInput
            label={isSheet ? "Qty / Truck or Container (tons)" : "Qty / Truck or Container (pcs)"}
            value={
              isSheet
                ? fmt(selectedFreightOption?.tons || 0, 3)
                : fmt(selectedFreightOption?.pcs || 0, 0)
            }
            onChange={() => {}}
            mode="locked_engineering"
          />
          <CompactInput
            label="Selected Option Label"
            value={selectedFreightOption?.label || ""}
            onChange={() => {}}
            mode="locked_engineering"
          />
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-white">
              <tr>
                <th className="text-left p-2">Item</th>
                <th className="text-left p-2">Trip Cost</th>
                <th className="text-left p-2">Currency</th>
                <th className="text-left p-2">Trip Cost EGP</th>
                <th className="text-left p-2">Qty / Trip</th>
                <th className="text-left p-2">{isSheet ? "Cost / ton" : "Cost / 1000 pcs"}</th>
              </tr>
            </thead>
            <tbody>
              {freightComputedRows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-2 font-medium">{row.name}</td>
                  <td className="p-2">
                    <input
                      className="w-full rounded-lg border border-blue-300 bg-blue-100 px-2 py-1"
                      value={row.tripCostCurrency || ""}
                      onChange={(e) =>
                        updateRowGroup("freightRows", row.id, {
                          tripCostCurrency: e.target.value,
                        })
                      }
                    />
                  </td>
                  <td className="p-2">
                    <select
                      className="w-full rounded-lg border border-blue-300 bg-blue-100 px-2 py-1"
                      value={row.currency || "EGP"}
                      onChange={(e) =>
                        updateRowGroup("freightRows", row.id, {
                          currency: e.target.value,
                        })
                      }
                    >
                      <option value="EGP">EGP</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </td>
                  <td className="p-2 bg-green-100">{fmt(row.priceInEgp, 3)}</td>
                  <td className="p-2 bg-orange-100">{fmt(row.qtyPerTrip, isSheet ? 3 : 0)}</td>
                  <td className="p-2 bg-green-100">{fmt(row.totalEgp, 3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <StatCard
          title={isSheet ? "Total Freight / ton" : "Total Freight / 1000 pcs"}
          value={`${fmt(freightTotals.egp, 3)} EGP`}
          tone="teal"
        />
      </Section>

      <Section title={isSheet ? "7. Working Capital Cost" : "9. Working Capital Cost"} tone="purple">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {workingCapitalComputedRows.map((row) => (
            <div key={row.id} className="rounded-xl border bg-white p-3 space-y-2">
              <div className="font-medium text-sm">{row.name}</div>

              <div className="grid grid-cols-2 gap-2">
                <CompactInput
                  label="DSO"
                  value={row.dso}
                  onChange={(v) => updateRowGroup("workingCapitalRows", row.id, { dso: v })}
                  mode="editable_from_engineering"
                  referenceValue={assumptions.dso || ""}
                />
                <CompactInput
                  label="DIO"
                  value={row.dio}
                  onChange={(v) => updateRowGroup("workingCapitalRows", row.id, { dio: v })}
                  mode="editable_from_engineering"
                  referenceValue={assumptions.dio || ""}
                />
                <CompactInput
                  label="DPO"
                  value={row.dpo}
                  onChange={(v) => updateRowGroup("workingCapitalRows", row.id, { dpo: v })}
                  mode="editable_from_engineering"
                  referenceValue={assumptions.dpo || ""}
                />
                <CompactInput
                  label="Interest Rate %"
                  value={row.interestRatePct}
                  onChange={(v) =>
                    updateRowGroup("workingCapitalRows", row.id, {
                      interestRatePct: v,
                    })
                  }
                  mode="editable_from_engineering"
                  referenceValue={assumptions.interestRatePct || ""}
                />
              </div>

              <StatCard title="Net Effective WC %" value={`${fmt(row.effectivePct, 3)}%`} tone="purple" />
              <StatCard title={isSheet ? "WC / ton" : "WC / 1000 pcs"} value={`${fmt(row.totalEgp, 3)} EGP`} tone="purple" />
            </div>
          ))}
        </div>

        <StatCard
          title={isSheet ? "Total WC / ton" : "Total WC / 1000 pcs"}
          value={`${fmt(workingCapitalTotals.egp, 3)} EGP`}
          tone="purple"
        />
      </Section>

      <Section title={isSheet ? "8. Amortization Cost" : "10. Amortization Cost"} tone="blue">
        <div className="space-y-3">
          {amortizationComputedRows.map((row) => (
            <div key={row.id} className="rounded-xl border bg-white p-3">
              <div className="grid grid-cols-1 md:grid-cols-7 gap-2 items-end">
                <CompactInput
                  label="Investment"
                  value={row.name}
                  onChange={(v) => updateRowGroup("amortizationRows", row.id, { name: v })}
                  mode="editable_from_engineering"
                />
                <CompactInput
                  label="Value in Currency"
                  value={row.valueInCurrency}
                  onChange={(v) =>
                    updateRowGroup("amortizationRows", row.id, { valueInCurrency: v })
                  }
                  mode="editable_from_engineering"
                />
                <CompactInput
                  label="Currency"
                  value={row.currency || "EGP"}
                  onChange={(v) =>
                    updateRowGroup("amortizationRows", row.id, { currency: v })
                  }
                  mode="editable_from_engineering"
                />
                <CompactInput
                  label="Value EGP"
                  value={fmt(row.valueInEgp, 3)}
                  onChange={() => {}}
                  mode="calculated"
                />
                <label className="block space-y-1">
                  <div className="text-xs text-gray-600">Amortized?</div>
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={row.amortized === true}
                    onChange={(e) =>
                      updateRowGroup("amortizationRows", row.id, {
                        amortized: e.target.checked,
                      })
                    }
                  />
                </label>
                <CompactInput
                  label={isSheet ? "Amortization Volume (tons)" : "Amortization Volume (pcs)"}
                  value={row.amortizationQty}
                  onChange={(v) =>
                    updateRowGroup("amortizationRows", row.id, { amortizationQty: v })
                  }
                  mode="user"
                />
                <div className="space-y-2">
                  <StatCard
                    title={isSheet ? "Amortization / ton" : "Amortization / 1000 pcs"}
                    value={`${fmt(row.totalEgp, 3)} EGP`}
                    tone="blue"
                  />
                  <button
                    type="button"
                    className="text-red-600 text-xs underline"
                    onClick={() => removeAmortizationRow(row.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-lg border px-3 py-2 text-sm bg-white"
            onClick={addAmortizationRow}
          >
            + Add Investment
          </button>

          <StatCard
            title={isSheet ? "Total Amortization / ton" : "Total Amortization / 1000 pcs"}
            value={`${fmt(amortizationTotals.egp, 3)} EGP`}
            tone="blue"
          />
        </div>
      </Section>

      <Section title={isSheet ? "9. Conversion Price" : "11. Conversion Price"} tone="gray">
        {isSheet ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <CompactInput
              label="Mode"
              value={conversion.mode || ""}
              onChange={(v) => updateRoot("conversion", { mode: v })}
              mode="user"
              placeholder="required_daily_extrusion_conversion / required_conversion_per_ton / required_sales_price_per_ton"
            />
            <CompactInput
              label="Value in Currency"
              value={conversion.valueInCurrency || ""}
              onChange={(v) => updateRoot("conversion", { valueInCurrency: v })}
              mode="user"
            />
            <CompactInput
              label="Currency"
              value={conversion.currency || "EGP"}
              onChange={(v) => updateRoot("conversion", { currency: v })}
              mode="user"
            />
            <CompactInput
              label="Conversion Price / Ton EGP"
              value={fmt(conversionSummary.conversionPriceEgp, 3)}
              onChange={() => {}}
              mode="calculated"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <CompactInput
              label="Mode"
              value={conversion.mode || ""}
              onChange={(v) => updateRoot("conversion", { mode: v })}
              mode="user"
              placeholder="required_daily_thermo_conversion / required_daily_extrusion_conversion / required_conversion_per_1000 / required_sales_price_per_1000"
            />
            <CompactInput
              label="Value in Currency"
              value={conversion.valueInCurrency || ""}
              onChange={(v) => updateRoot("conversion", { valueInCurrency: v })}
              mode="user"
            />
            <CompactInput
              label="Currency"
              value={conversion.currency || "EGP"}
              onChange={(v) => updateRoot("conversion", { currency: v })}
              mode="user"
            />
            <CompactInput
              label="Conversion Price / 1000 pcs EGP"
              value={fmt(conversionSummary.conversionPriceEgp, 3)}
              onChange={() => {}}
              mode="calculated"
            />
          </div>
        )}
      </Section>

      <Section title="12. Results" tone="green">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <StatCard
            title={isSheet ? "Sales Price / Ton - EGP" : "Sales Price / 1000 pcs - EGP"}
            value={`${fmt(conversionSummary.salesPriceEgp, 3)} EGP`}
            tone="green"
          />
          <StatCard
            title="USD"
            value={`${fmt(conversionSummary.salesPriceUsd, 3)} USD`}
            tone="green"
          />
          <StatCard
            title="EUR"
            value={`${fmt(conversionSummary.salesPriceEur, 3)} EUR`}
            tone="green"
          />
          <StatCard
            title="Conversion %"
            value={`${fmt(conversionSummary.conversionPct, 2)}%`}
            tone="green"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {isSheet ? (
            <StatCard
              title="Daily Extrusion Conversion - EGP"
              value={`${fmt(conversionSummary.dailyExtrusionConversionEgp, 3)} EGP`}
              tone="purple"
            />
          ) : (
            <>
              <StatCard
                title="Daily Thermo Conversion - EGP"
                value={`${fmt(conversionSummary.dailyThermoConversionEgp, 3)} EGP`}
                tone="purple"
              />
              <StatCard
                title="Daily Extrusion Conversion - EGP"
                value={`${fmt(conversionSummary.dailyExtrusionConversionEgp, 3)} EGP`}
                tone="purple"
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {summarySplit.map((row) => (
            <StatCard
              key={row.label}
              title={row.label}
              value={`${fmt(row.value, 3)} EGP`}
              tone={row.tone}
            />
          ))}
        </div>
      </Section>
    </div>
  );
} export default Pricing20PricingTab;