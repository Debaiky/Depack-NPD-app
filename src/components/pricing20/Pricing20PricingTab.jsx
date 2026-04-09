import { useEffect, useMemo } from "react";

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

  const plasticWeightPerM2 = density > 0 && thicknessMic > 0 ? density * thicknessMic : 0;
  const totalWeightPerM2 = plasticWeightPerM2 + (coatingUsed ? coatingWeight : 0);
  const coatingShare = totalWeightPerM2 > 0 ? coatingWeight / totalWeightPerM2 : 0;
  const plasticShare = 1 - coatingShare;

  const rows = Array.from(grouped.values()).map((item, idx) => {
    const totalPct = item.pctLayerA * layerAPct + item.pctLayerB * layerBPct;

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
      unit: "per carton",
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
    },
    {
      id: "freight-shipping",
      name: "Shipping Cost",
      tripCostCurrency: "",
      currency: "EGP",
    },
    {
      id: "freight-thc",
      name: "THC Cost",
      tripCostCurrency: "",
      currency: "EGP",
    },
    {
      id: "freight-other",
      name: "Other Costs",
      tripCostCurrency: "",
      currency: "EGP",
    },
  ];
}

function buildDefaultWasteRows(caseType) {
  if (caseType === "sheet") {
    return [
      { id: "waste-material", name: "Material Waste", ratePct: "1" },
      { id: "waste-packaging", name: "Packaging Waste", ratePct: "1" },
    ];
  }

  return [
    { id: "waste-material", name: "Material Waste", ratePct: "1" },
    {
      id: "waste-intermediate-packaging",
      name: "Intermediate Sheet Packaging Waste",
      ratePct: "1",
    },
    {
      id: "waste-thermo-packaging",
      name: "Thermoforming Packaging Waste",
      ratePct: "1",
    },
    {
      id: "waste-decoration",
      name: "Decoration Waste",
      ratePct: "1",
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
          <div className="text-[11px] text-orange-700 font-medium">
            Override vs engineering
          </div>
        ) : null}
      </div>
    </label>
  );
}

function CompactSelect({
  label,
  value,
  onChange,
  options = [],
  mode = "user",
  referenceValue,
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

      <select
        className={`w-full rounded-lg border px-3 py-2 text-sm ${toneClasses(mode)}`}
        value={value ?? ""}
        disabled={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
      >
        {options.map((opt) => {
          const optionValue = typeof opt === "string" ? opt : opt.value;
          const optionLabel = typeof opt === "string" ? opt : opt.label;

          return (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          );
        })}
      </select>

      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] text-gray-500"></div>
        {showOverride ? (
          <div className="text-[11px] text-orange-700 font-medium">
            Override vs engineering
          </div>
        ) : null}
      </div>
    </label>
  );
}

function pctOf(value, base) {
  const b = n(base);
  if (!b) return 0;
  return (n(value) / b) * 100;
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
    <div
      className={`rounded-2xl border p-4 space-y-4 shadow-sm ${tones[tone] || tones.gray}`}
    >
      <div className="font-semibold">{title}</div>
      {children}
    </div>
  );
}
function LineTableCompact({ rows, showPercent = true }) {
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
              {showPercent ? <td className="p-2 text-right">{row.pct}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function pctOfSales(value, salesPriceBaseEgp) {
  return salesPriceBaseEgp > 0 ? (n(value) / salesPriceBaseEgp) * 100 : 0;
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

function Pricing20PricingTab({
  requestData,
  scenarioEngineering,
  pricing20Data,
  setPricing20Data,
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

  const calculatedWeightPerPalletKg = useMemo(() => {
    return n(operational.rollWeightKg) * n(operational.rollsPerPallet);
  }, [operational.rollWeightKg, operational.rollsPerPallet]);

  useEffect(() => {
    setPricing20Data((prev) => {
      const next = { ...(prev || {}) };
      let changed = false;

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
            productivityTonsPerDay: scenarioEngineering?.extrusion?.tonsPerDay24h || "",
            freightOption: engineeringRefs.freightOptions?.[0]?.value || "",
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
            freightOption: engineeringRefs.freightOptions?.[0]?.value || "",
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

      const mergedMaterialRows = mergeRowsById(next.materialRows || [], desiredMaterialRows);
      const mergedSheetPackagingRows = mergeRowsById(
        next.sheetPackagingRows || [],
        desiredSheetPackagingRows
      );
      const mergedIntermediateRows = mergeRowsById(
        next.intermediatePackagingRows || [],
        desiredIntermediateRows
      );
      const mergedThermoRows = mergeRowsById(
        next.thermoPackagingRows || [],
        desiredThermoRows
      );
     const mergedWasteRows = mergeRowsById(next.wasteRows || [], desiredWasteRows).map(
  (row) => ({
    ...row,
    ratePct: String(row.ratePct ?? "").trim() === "" ? "1" : row.ratePct,
  })
);

const mergedFreightRows = mergeRowsById(next.freightRows || [], desiredFreightRows);

const mergedWorkingCapitalRows = mergeRowsById(
  next.workingCapitalRows || [],
  desiredWorkingCapitalRows
).map((row) => ({
  ...row,
  dso: String(row.dso ?? "").trim() === "" ? nextAssumptions.dso || "" : row.dso,
  dio: String(row.dio ?? "").trim() === "" ? nextAssumptions.dio || "" : row.dio,
  dpo: String(row.dpo ?? "").trim() === "" ? nextAssumptions.dpo || "" : row.dpo,
  interestRatePct:
    String(row.interestRatePct ?? "").trim() === ""
      ? nextAssumptions.interestRatePct || ""
      : row.interestRatePct,
}));
      const mergedAmortRows = mergeRowsById(
        next.amortizationRows || [],
        desiredAmortRows
      );

      next.assumptions = {
        ...(next.assumptions || {}),
        ...nextAssumptions,
      };

      next.operational = {
        ...(next.operational || {}),
        ...opDefaults,
      };

      next.materialRows = mergedMaterialRows;
      next.sheetPackagingRows = mergedSheetPackagingRows;
      next.intermediatePackagingRows = mergedIntermediateRows;
      next.thermoPackagingRows = mergedThermoRows;
      next.wasteRows = mergedWasteRows;
      next.freightRows = mergedFreightRows;
      next.workingCapitalRows = mergedWorkingCapitalRows;
      next.amortizationRows = mergedAmortRows;

      if (!next.decoration) {
        next.decoration = {};
      }

      next.decoration = {
        enabled:
          next.decoration?.enabled ??
          (requestedDecorationType !== "No decoration"),
        type:
          next.decoration?.type ||
          (requestedDecorationType === "Dry offset printing"
            ? "Printing"
            : requestedDecorationType === "Shrink sleeve"
            ? "Shrink Sleeve"
            : requestedDecorationType === "Hybrid cup"
            ? "Hybrid"
            : "Printing"),
        printing: {
          inkConsumptionGPer1000:
            next.decoration?.printing?.inkConsumptionGPer1000 ||
            scenarioEngineering?.decorationEngineering?.print?.inkWeightPer1000Cups ||
            "",
          inkPricePerKgCurrency:
            next.decoration?.printing?.inkPricePerKgCurrency || "",
          currency: next.decoration?.printing?.currency || "EGP",
        },
        sleeve: {
          sleeveCostPerKgCurrency:
            next.decoration?.sleeve?.sleeveCostPerKgCurrency || "",
          sleevesPerKg: next.decoration?.sleeve?.sleevesPerKg || "",
          currency: next.decoration?.sleeve?.currency || "EGP",
        },
        hybrid: {
          blankConsumptionPerCup:
            next.decoration?.hybrid?.blankConsumptionPerCup || "1",
          blankUnitPriceCurrency:
            next.decoration?.hybrid?.blankUnitPriceCurrency || "",
          blankCurrency: next.decoration?.hybrid?.blankCurrency || "EGP",
          bottomConsumptionPerCup:
            next.decoration?.hybrid?.bottomConsumptionPerCup || "1",
          bottomUnitPriceCurrency:
            next.decoration?.hybrid?.bottomUnitPriceCurrency || "",
          bottomCurrency: next.decoration?.hybrid?.bottomCurrency || "EGP",
        },
      };

      next.freight = {
        ...(next.freight || {}),
        selectedOption:
          next.freight?.selectedOption ||
          engineeringRefs.freightOptions?.[0]?.value ||
          "",
      };

      next.conversion = {
        ...(next.conversion || {}),
        mode:
          next.conversion?.mode ||
          (isSheet
            ? "required_conversion_per_ton"
            : "required_conversion_per_1000"),
        valueInCurrency: next.conversion?.valueInCurrency || "",
        currency: next.conversion?.currency || "EGP",
      };

      next.commercial = {
        ...(next.commercial || {}),
        expectedAnnualVolume: next.commercial?.expectedAnnualVolume || "",
      };

      changed = true;
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

  const updateNestedRoot = (rootKey, childKey, patch) => {
    setPricing20Data((prev) => ({
      ...(prev || {}),
      [rootKey]: {
        ...((prev || {})[rootKey] || {}),
        [childKey]: {
          ...(((prev || {})[rootKey] || {})[childKey] || {}),
          ...patch,
        },
      },
    }));
  };

  const updateRowGroup = (groupKey, rowId, patch) => {
    setPricing20Data((prev) => ({
      ...(prev || {}),
      [groupKey]: (((prev || {})[groupKey]) || []).map((row) =>
        row.id === rowId ? { ...row, ...patch } : row
      ),
    }));
  };

  const addAmortizationRow = () => {
    setPricing20Data((prev) => ({
      ...(prev || {}),
      amortizationRows: [
        ...((((prev || {}).amortizationRows) || [])),
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
      amortizationRows: ((((prev || {}).amortizationRows) || []).filter(
        (row) => row.id !== rowId
      )),
    }));
  };

  const selectedFreightOption = useMemo(() => {
    return (
      engineeringRefs.freightOptions.find(
        (row) => row.value === freight.selectedOption
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

      const costPerTon = n(row.sourceConsumptionKgPerTon) * unitPriceEgp;
      const costPer1000 = perTonToPer1000(
        costPerTon,
        operational.productWeightG || engineeringRefs.productWeightG,
        operational.sheetUtilizationPct || engineeringRefs.sheetUtilPct
      );

      return {
        ...row,
        unitPriceEgp,
        costPerTon,
        costPer1000,
      };
    });
  }, [
    materialRows,
    assumptions.usdEgp,
    assumptions.eurUsd,
    operational.productWeightG,
    operational.sheetUtilizationPct,
    engineeringRefs.productWeightG,
    engineeringRefs.sheetUtilPct,
  ]);

  const materialTotals = useMemo(() => {
    return {
      perTon: materialComputedRows.reduce((sum, row) => sum + n(row.costPerTon), 0),
      per1000: materialComputedRows.reduce((sum, row) => sum + n(row.costPer1000), 0),
      basis: isSheet
        ? materialComputedRows.reduce((sum, row) => sum + n(row.costPerTon), 0)
        : materialComputedRows.reduce((sum, row) => sum + n(row.costPer1000), 0),
    };
  }, [materialComputedRows, isSheet]);

  const sheetPackagingComputedRows = useMemo(() => {
    if (!isSheet) return [];

    const rollWeightKg = n(operational.rollWeightKg) || engineeringRefs.sheetRollWeightKg;

    return sheetPackagingRows.map((row) => {
      const unitPriceEgp = currencyToEgp(
        row.priceInCurrency,
        row.currency,
        assumptions.usdEgp,
        assumptions.eurUsd
      );

      const consumptionPerRoll = n(row.sourceConsumptionPerRoll);
      const costPerRoll = consumptionPerRoll * unitPriceEgp;
      const costPerTon = rollWeightKg > 0 ? costPerRoll / (rollWeightKg / 1000) : 0;

      return {
        ...row,
        unitPriceEgp,
        costPerRoll,
        costPerTon,
      };
    });
  }, [
    isSheet,
    sheetPackagingRows,
    assumptions.usdEgp,
    assumptions.eurUsd,
    operational.rollWeightKg,
    engineeringRefs.sheetRollWeightKg,
  ]);

  const sheetPackagingTotals = useMemo(() => {
    return {
      basis: sheetPackagingComputedRows.reduce((sum, row) => sum + n(row.costPerTon), 0),
    };
  }, [sheetPackagingComputedRows]);

  const intermediatePackagingComputedRows = useMemo(() => {
    if (isSheet) return [];

    const rollWeightKg = n(operational.rollWeightKg) || engineeringRefs.sheetRollWeightKg;

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
      };
    });
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

  const intermediatePackagingTotals = useMemo(() => {
    return {
      perTon: intermediatePackagingComputedRows.reduce(
        (sum, row) => sum + n(row.costPerTon),
        0
      ),
      basis: intermediatePackagingComputedRows.reduce(
        (sum, row) => sum + n(row.costPer1000),
        0
      ),
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
      };
    });
  }, [
    isSheet,
    thermoPackagingRows,
    assumptions.usdEgp,
    assumptions.eurUsd,
    operational.pcsPerCarton,
    engineeringRefs.pcsPerCarton,
  ]);

  const thermoPackagingTotals = useMemo(() => {
    return {
      basis: thermoPackagingComputedRows.reduce(
        (sum, row) => sum + n(row.costPer1000),
        0
      ),
    };
  }, [thermoPackagingComputedRows]);

  const decorationSummary = useMemo(() => {
    if (isSheet || !decoration.enabled) {
      return { basis: 0 };
    }

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

  const wasteComputedRows = useMemo(() => {
    return wasteRows.map((row) => {
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

      const basis = (n(row.ratePct) / 100) * baseCost;

      return {
        ...row,
        baseCost,
        basis,
      };
    });
  }, [
    wasteRows,
    materialTotals.basis,
    sheetPackagingTotals.basis,
    intermediatePackagingTotals.basis,
    thermoPackagingTotals.basis,
    decorationSummary.basis,
  ]);

  const wasteTotals = useMemo(() => {
    return {
      basis: wasteComputedRows.reduce((sum, row) => sum + n(row.basis), 0),
    };
  }, [wasteComputedRows]);

  const freightComputedRows = useMemo(() => {
    const qtyPerTrip = isSheet
      ? n(selectedFreightOption?.tons)
      : n(selectedFreightOption?.pcs);

    return freightRows.map((row) => {
      const tripCostEgp = currencyToEgp(
        row.tripCostCurrency,
        row.currency,
        assumptions.usdEgp,
        assumptions.eurUsd
      );

      const basis =
        qtyPerTrip > 0
          ? isSheet
            ? tripCostEgp / qtyPerTrip
            : (tripCostEgp / qtyPerTrip) * 1000
          : 0;

      return {
        ...row,
        tripCostEgp,
        qtyPerTrip,
        basis,
      };
    });
  }, [
    freightRows,
    isSheet,
    selectedFreightOption,
    assumptions.usdEgp,
    assumptions.eurUsd,
  ]);

  const freightTotals = useMemo(() => {
    return {
      basis: freightComputedRows.reduce((sum, row) => sum + n(row.basis), 0),
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
        baseCost = materialTotals.basis;
      } else if (row.id === "wc-packaging") {
        baseCost = isSheet
          ? sheetPackagingTotals.basis
          : intermediatePackagingTotals.basis + thermoPackagingTotals.basis;
      } else if (row.id === "wc-decoration") {
        baseCost = decorationSummary.basis;
      }

      const basis = baseCost * (effectivePct / 100);

      return {
        ...row,
        effectivePct,
        baseCost,
        basis,
      };
    });
  }, [
    workingCapitalRows,
    isSheet,
    materialTotals.basis,
    sheetPackagingTotals.basis,
    intermediatePackagingTotals.basis,
    thermoPackagingTotals.basis,
    decorationSummary.basis,
  ]);

  const workingCapitalTotals = useMemo(() => {
    return {
      basis: workingCapitalComputedRows.reduce((sum, row) => sum + n(row.basis), 0),
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
      const basis =
        row.amortized === true && amortizationQty > 0
          ? isSheet
            ? valueInEgp / amortizationQty
            : (valueInEgp / amortizationQty) * 1000
          : 0;

      return {
        ...row,
        valueInEgp,
        basis,
      };
    });
  }, [amortizationRows, assumptions.usdEgp, assumptions.eurUsd, isSheet]);

  const amortizationTotals = useMemo(() => {
    const amortizedInvestment = amortizationComputedRows
      .filter((row) => row.amortized === true)
      .reduce((sum, row) => sum + n(row.valueInEgp), 0);

    const nonAmortizedInvestment = amortizationComputedRows
      .filter((row) => row.amortized !== true)
      .reduce((sum, row) => sum + n(row.valueInEgp), 0);

    const totalInvestment = amortizationComputedRows.reduce(
      (sum, row) => sum + n(row.valueInEgp),
      0
    );

    return {
      basis: amortizationComputedRows.reduce((sum, row) => sum + n(row.basis), 0),
      amortizedInvestment,
      nonAmortizedInvestment,
      totalInvestment,
    };
  }, [amortizationComputedRows]);

  const otherCostsBeforeConversion = useMemo(() => {
    if (isSheet) {
      return (
        materialTotals.basis +
        sheetPackagingTotals.basis +
        wasteTotals.basis +
        freightTotals.basis +
        workingCapitalTotals.basis +
        amortizationTotals.basis
      );
    }

    return (
      materialTotals.basis +
      intermediatePackagingTotals.basis +
      thermoPackagingTotals.basis +
      decorationSummary.basis +
      wasteTotals.basis +
      freightTotals.basis +
      workingCapitalTotals.basis +
      amortizationTotals.basis
    );
  }, [
    isSheet,
    materialTotals.basis,
    sheetPackagingTotals.basis,
    intermediatePackagingTotals.basis,
    thermoPackagingTotals.basis,
    decorationSummary.basis,
    wasteTotals.basis,
    freightTotals.basis,
    workingCapitalTotals.basis,
    amortizationTotals.basis,
  ]);

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
            ? (valueEgp / tonsPerDay) *
              (sheetKgPerDay / 1000) /
              pcsPerDay *
              1000
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
      conversionPct: pctOf(conversionPriceEgp, salesPriceEgp),
      salesPriceUsd: egpToUsd(salesPriceEgp, assumptions.usdEgp),
      salesPriceEur: egpToEur(salesPriceEgp, assumptions.usdEgp, assumptions.eurUsd),
      conversionUsd: egpToUsd(conversionPriceEgp, assumptions.usdEgp),
      conversionEur: egpToEur(
        conversionPriceEgp,
        assumptions.usdEgp,
        assumptions.eurUsd
      ),
      dailyExtrusionConversionEgp,
      dailyThermoConversionEgp,
      dailyExtrusionConversionUsd: egpToUsd(
        dailyExtrusionConversionEgp,
        assumptions.usdEgp
      ),
      dailyExtrusionConversionEur: egpToEur(
        dailyExtrusionConversionEgp,
        assumptions.usdEgp,
        assumptions.eurUsd
      ),
      dailyThermoConversionUsd: egpToUsd(
        dailyThermoConversionEgp,
        assumptions.usdEgp
      ),
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
    otherCostsBeforeConversion,
  ]);

  const expectedAnnualVolume = n(commercial.expectedAnnualVolume);

  const annualTurnoverEgp = expectedAnnualVolume * n(conversionSummary.salesPriceEgp);
  const annualConversionEgp = expectedAnnualVolume * n(conversionSummary.conversionPriceEgp);

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
      ? n(amortizationTotals.nonAmortizedInvestment) /
        annualContributionNonAmortized
      : 0;

  const salesPriceBaseEgp = n(conversionSummary.salesPriceEgp);

  const summarySplit = useMemo(() => {
    return isSheet
      ? [
          { label: "Material", value: materialTotals.basis, tone: "green" },
          { label: "Packaging", value: sheetPackagingTotals.basis, tone: "orange" },
          { label: "Waste", value: wasteTotals.basis, tone: "red" },
          { label: "Freight", value: freightTotals.basis, tone: "teal" },
          { label: "Working Capital", value: workingCapitalTotals.basis, tone: "purple" },
          { label: "Amortization", value: amortizationTotals.basis, tone: "blue" },
          { label: "Conversion", value: conversionSummary.conversionPriceEgp, tone: "gray" },
        ]
      : [
          { label: "Material", value: materialTotals.basis, tone: "green" },
          {
            label: "Intermediate Packaging",
            value: intermediatePackagingTotals.basis,
            tone: "orange",
          },
          {
            label: "Thermo Packaging",
            value: thermoPackagingTotals.basis,
            tone: "teal",
          },
          { label: "Decoration", value: decorationSummary.basis, tone: "blue" },
          { label: "Waste", value: wasteTotals.basis, tone: "red" },
          { label: "Freight", value: freightTotals.basis, tone: "teal" },
          { label: "Working Capital", value: workingCapitalTotals.basis, tone: "purple" },
          { label: "Amortization", value: amortizationTotals.basis, tone: "blue" },
          { label: "Conversion", value: conversionSummary.conversionPriceEgp, tone: "gray" },
        ];
  }, [
    isSheet,
    materialTotals.basis,
    sheetPackagingTotals.basis,
    intermediatePackagingTotals.basis,
    thermoPackagingTotals.basis,
    decorationSummary.basis,
    wasteTotals.basis,
    freightTotals.basis,
    workingCapitalTotals.basis,
    amortizationTotals.basis,
    conversionSummary.conversionPriceEgp,
  ]);
  const conversionLineRows = [
    {
      label: "Daily Extrusion Conversion Price",
      egp: fmt(conversionSummary.dailyExtrusionConversionEgp, 3),
      usd: fmt(conversionSummary.dailyExtrusionConversionUsd, 3),
      eur: fmt(conversionSummary.dailyExtrusionConversionEur, 3),
      pct: "—",
    },
    {
      label: "Daily Thermoforming Conversion Price",
      egp: isSheet ? "—" : fmt(conversionSummary.dailyThermoConversionEgp, 3),
      usd: isSheet ? "—" : fmt(conversionSummary.dailyThermoConversionUsd, 3),
      eur: isSheet ? "—" : fmt(conversionSummary.dailyThermoConversionEur, 3),
      pct: "—",
    },
    {
      label: isSheet ? "Conversion Cost / Ton" : "Conversion Cost / 1000 pcs",
      egp: fmt(conversionSummary.conversionPriceEgp, 3),
      usd: fmt(conversionSummary.conversionUsd, 3),
      eur: fmt(conversionSummary.conversionEur, 3),
      pct: `${fmt(conversionSummary.conversionPct, 2)}%`,
    },
    {
      label: isSheet ? "Sales Price / Ton" : "Sales Price / 1000 pcs",
      egp: fmt(conversionSummary.salesPriceEgp, 3),
      usd: fmt(conversionSummary.salesPriceUsd, 3),
      eur: fmt(conversionSummary.salesPriceEur, 3),
      pct: "100%",
      bold: true,
    },
    {
      label: "Conversion Cost / Sales Price %",
      egp: `${fmt(conversionSummary.conversionPct, 2)}%`,
      usd: "—",
      eur: "—",
      pct: "—",
    },
  ];

  const resultBreakdownRows = [
    ...summarySplit.map((row) => ({
      label: row.label,
      egp: fmt(row.value, 3),
      usd: fmt(egpToUsd(row.value, assumptions.usdEgp), 3),
      eur: fmt(egpToEur(row.value, assumptions.usdEgp, assumptions.eurUsd), 3),
      pct: `${fmt(pctOfSales(row.value, salesPriceBaseEgp), 2)}%`,
    })),
    {
      label: isSheet ? "Sales Price / Ton" : "Sales Price / 1000 pcs",
      egp: fmt(conversionSummary.salesPriceEgp, 3),
      usd: fmt(conversionSummary.salesPriceUsd, 3),
      eur: fmt(conversionSummary.salesPriceEur, 3),
      pct: "100%",
      bold: true,
    },
  ];

  const pieColorMap = {
    green: "#16a34a",
    orange: "#f59e0b",
    teal: "#14b8a6",
    blue: "#3b82f6",
    red: "#ef4444",
    purple: "#8b5cf6",
    gray: "#6b7280",
  };

  const pieSegments = summarySplit
    .filter((row) => n(row.value) > 0)
    .map((row) => ({
      ...row,
      color: pieColorMap[row.tone] || "#9ca3af",
    }));

  const investmentPaybackRows = [
    {
      label: "Amortized Portion",
      egp: fmt(amortizationTotals.amortizedInvestment, 3),
      usd: fmt(egpToUsd(amortizationTotals.amortizedInvestment, assumptions.usdEgp), 3),
      eur: fmt(
        egpToEur(
          amortizationTotals.amortizedInvestment,
          assumptions.usdEgp,
          assumptions.eurUsd
        ),
        3
      ),
    },
    {
      label: "Non-Amortized Portion",
      egp: fmt(amortizationTotals.nonAmortizedInvestment, 3),
      usd: fmt(egpToUsd(amortizationTotals.nonAmortizedInvestment, assumptions.usdEgp), 3),
      eur: fmt(
        egpToEur(
          amortizationTotals.nonAmortizedInvestment,
          assumptions.usdEgp,
          assumptions.eurUsd
        ),
        3
      ),
    },
    {
      label: "Total Investment Cost",
      egp: fmt(amortizationTotals.totalInvestment, 3),
      usd: fmt(egpToUsd(amortizationTotals.totalInvestment, assumptions.usdEgp), 3),
      eur: fmt(
        egpToEur(
          amortizationTotals.totalInvestment,
          assumptions.usdEgp,
          assumptions.eurUsd
        ),
        3
      ),
      bold: true,
    },
    {
      label: `Expected Annual Volume (${isSheet ? "tons" : "x1000 pcs"})`,
      egp: fmt(commercial.expectedAnnualVolume || 0, 3),
      usd: "—",
      eur: "—",
    },
    {
      label: "Annual Turnover",
      egp: fmt(annualTurnoverEgp, 3),
      usd: fmt(egpToUsd(annualTurnoverEgp, assumptions.usdEgp), 3),
      eur: fmt(egpToEur(annualTurnoverEgp, assumptions.usdEgp, assumptions.eurUsd), 3),
    },
    {
      label: "Annual Conversion",
      egp: fmt(annualConversionEgp, 3),
      usd: fmt(egpToUsd(annualConversionEgp, assumptions.usdEgp), 3),
      eur: fmt(
        egpToEur(annualConversionEgp, assumptions.usdEgp, assumptions.eurUsd),
        3
      ),
    },
    {
      label: "Payback - Total Investment",
      egp: paybackTotalYears > 0 ? `${fmt(paybackTotalYears, 3)} years` : "—",
      usd: "—",
      eur: "—",
    },
    {
      label: "Payback - Non-Amortized",
      egp:
        paybackNonAmortizedYears > 0
          ? `${fmt(paybackNonAmortizedYears, 3)} years`
          : "—",
      usd: "—",
      eur: "—",
    },
  ];
  const conversionModeOptions = isSheet
    ? [
        { value: "required_daily_extrusion_conversion", label: "Required Daily Extrusion Conversion" },
        { value: "required_conversion_per_ton", label: "Required Conversion / Ton" },
        { value: "required_sales_price_per_ton", label: "Required Sales Price / Ton" },
      ]
    : [
        { value: "required_daily_thermo_conversion", label: "Required Daily Thermo Conversion" },
        { value: "required_daily_extrusion_conversion", label: "Required Daily Extrusion Conversion" },
        { value: "required_conversion_per_1000", label: "Required Conversion / 1000 pcs" },
        { value: "required_sales_price_per_1000", label: "Required Sales Price / 1000 pcs" },
      ];

  const currencyOptions = ["EGP", "USD", "EUR"];

  return (
    <div className="space-y-6">
      <Section
        title={`Pricing 2.0 - ${isSheet ? "Case A Sheet Roll" : "Case B Not Sheet"}`}
        tone="blue"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <StatCard
            title={isSheet ? "Sales Price / Ton" : "Sales Price / 1000 pcs"}
            value={`${fmt(conversionSummary.salesPriceEgp, 2)} EGP`}
            tone="blue"
          />
          <StatCard
            title={isSheet ? "Conversion / Ton" : "Conversion / 1000 pcs"}
            value={`${fmt(conversionSummary.conversionPriceEgp, 2)} EGP`}
            tone="purple"
          />
          <StatCard
            title="Conversion %"
            value={`${fmt(conversionSummary.conversionPct, 2)}%`}
            tone="green"
          />
          <StatCard
            title="Freight Option"
            value={selectedFreightOption?.label || "—"}
            tone="teal"
          />
        </div>
      </Section>

      <Section title="1. Financial Assumptions" tone="blue">
        <div className="text-xs text-red-600 font-medium">
  All fields in this section are required.
</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <CompactSelect
            label="Base Currency"
            value={assumptions.baseCurrency || "EGP"}
            onChange={(v) => updateRoot("assumptions", { baseCurrency: v })}
            options={currencyOptions}
            mode="user"
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
              label="Rolls / Pallet"
              value={operational.rollsPerPallet}
              onChange={(v) => updateRoot("operational", { rollsPerPallet: v })}
              mode="editable_from_engineering"
              referenceValue={scenarioEngineering?.sheetPackaging?.rollsPerPallet || ""}
            />
            <CompactInput
              label="Weight / Pallet (kg)"
              value={fmt(calculatedWeightPerPalletKg, 3)}
              onChange={() => {}}
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
              label="Pcs Produced / Day"
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
              label="Stacks / Primary"
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
              referenceValue={
                scenarioEngineering?.packaging?.secondary?.primariesPerSecondary || ""
              }
            />
            <CompactInput
              label="Cartons / Pallet"
              value={operational.cartonsPerPallet}
              onChange={(v) => updateRoot("operational", { cartonsPerPallet: v })}
              mode="editable_from_engineering"
              referenceValue={scenarioEngineering?.packaging?.pallet?.boxesPerPallet || ""}
            />
            <CompactInput
              label="Pcs / Carton"
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
                <th className="text-left p-2">Price</th>
                <th className="text-left p-2">Currency</th>
                <th className="text-left p-2">Price EGP</th>
                <th className="text-left p-2">Consumption kg/ton</th>
                {!isSheet && <th className="text-left p-2">Cost / Ton</th>}
                <th className="text-left p-2">
                  {isSheet ? "Cost / Ton" : "Cost / 1000 pcs"}
                </th>
                <th className="text-left p-2">% Price</th>
                <th className="text-left p-2">USD</th>
                <th className="text-left p-2">EUR</th>
              </tr>
            </thead>
            <tbody>
              {materialComputedRows.map((row) => {
                const basisValue = isSheet ? row.costPerTon : row.costPer1000;

                return (
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
                        {currencyOptions.map((cur) => (
                          <option key={cur} value={cur}>
                            {cur}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2 bg-green-100">{fmt(row.unitPriceEgp, 3)}</td>
                    <td className="p-2 bg-orange-100">
                      {fmt(row.sourceConsumptionKgPerTon, 3)}
                    </td>
                    {!isSheet && <td className="p-2 bg-green-100">{fmt(row.costPerTon, 3)}</td>}
                    <td className="p-2 bg-green-100">{fmt(basisValue, 3)}</td>
                    <td className="p-2 bg-green-100">
                      {fmt(pctOf(basisValue, salesPriceBaseEgp), 2)}%
                    </td>
                    <td className="p-2 bg-green-100">
                      {fmt(egpToUsd(basisValue, assumptions.usdEgp), 3)}
                    </td>
                    <td className="p-2 bg-green-100">
                      {fmt(
                        egpToEur(basisValue, assumptions.usdEgp, assumptions.eurUsd),
                        3
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatCard
            title={`Total Material / ${basisLabel}`}
            value={`${fmt(materialTotals.basis, 3)} EGP`}
            tone="green"
          />
          <StatCard
            title="USD"
            value={`${fmt(egpToUsd(materialTotals.basis, assumptions.usdEgp), 3)} USD`}
            tone="green"
          />
          <StatCard
            title="EUR"
            value={`${fmt(
              egpToEur(materialTotals.basis, assumptions.usdEgp, assumptions.eurUsd),
              3
            )} EUR`}
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
                  <th className="text-left p-2">Cost / Roll</th>
                  <th className="text-left p-2">Cost / Ton</th>
                  <th className="text-left p-2">% Price</th>
                  <th className="text-left p-2">USD</th>
                  <th className="text-left p-2">EUR</th>
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
                        {currencyOptions.map((cur) => (
                          <option key={cur} value={cur}>
                            {cur}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2 bg-green-100">{fmt(row.unitPriceEgp, 3)}</td>
                    <td className="p-2 bg-orange-100">
                      {fmt(row.sourceConsumptionPerRoll, 3)}
                    </td>
                    <td className="p-2 bg-green-100">{fmt(row.costPerRoll, 3)}</td>
                    <td className="p-2 bg-green-100">{fmt(row.costPerTon, 3)}</td>
                    <td className="p-2 bg-green-100">
                      {fmt(pctOf(row.costPerTon, salesPriceBaseEgp), 2)}%
                    </td>
                    <td className="p-2 bg-green-100">
                      {fmt(egpToUsd(row.costPerTon, assumptions.usdEgp), 3)}
                    </td>
                    <td className="p-2 bg-green-100">
                      {fmt(
                        egpToEur(row.costPerTon, assumptions.usdEgp, assumptions.eurUsd),
                        3
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <StatCard
            title="Total Packaging / Ton"
            value={`${fmt(sheetPackagingTotals.basis, 3)} EGP`}
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
                    <th className="text-left p-2">Cost / Ton</th>
                    <th className="text-left p-2">Cost / 1000 pcs</th>
                    <th className="text-left p-2">% Price</th>
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
                          {currencyOptions.map((cur) => (
                            <option key={cur} value={cur}>
                              {cur}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2 bg-green-100">{fmt(row.unitPriceEgp, 3)}</td>
                      <td className="p-2 bg-orange-100">
                        {fmt(row.sourceConsumptionPerRoll, 3)}
                      </td>
                      <td className="p-2 bg-gray-100">{fmt(row.sourceNoOfUses, 3)}</td>
                      <td className="p-2 bg-green-100">{fmt(row.costPerRoll, 3)}</td>
                      <td className="p-2 bg-green-100">{fmt(row.costPerTon, 3)}</td>
                      <td className="p-2 bg-green-100">{fmt(row.costPer1000, 3)}</td>
                      <td className="p-2 bg-green-100">
                        {fmt(pctOf(row.costPer1000, salesPriceBaseEgp), 2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <StatCard
              title="Total Intermediate Packaging / 1000 pcs"
              value={`${fmt(intermediatePackagingTotals.basis, 3)} EGP`}
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
                    <th className="text-left p-2">% Price</th>
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
                          {currencyOptions.map((cur) => (
                            <option key={cur} value={cur}>
                              {cur}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2 bg-green-100">{fmt(row.unitPriceEgp, 3)}</td>
                      <td className="p-2 bg-orange-100">
                        {fmt(row.sourceConsumptionPerCarton, 3)}
                      </td>
                      <td className="p-2 bg-gray-100">{fmt(row.sourceNoOfUses, 3)}</td>
                      <td className="p-2 bg-green-100">{fmt(row.costPer1000, 3)}</td>
                      <td className="p-2 bg-green-100">
                        {fmt(pctOf(row.costPer1000, salesPriceBaseEgp), 2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <StatCard
              title="Total Thermo Packaging / 1000 pcs"
              value={`${fmt(thermoPackagingTotals.basis, 3)} EGP`}
              tone="teal"
            />
          </Section>

          <Section title="6. Decoration Cost" tone="blue">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <CompactSelect
                label="Use Decoration"
                value={decoration.enabled ? "Yes" : "No"}
                onChange={(v) =>
                  updateRoot("decoration", { enabled: String(v) === "Yes" })
                }
                options={["Yes", "No"]}
                mode="user"
              />

              <CompactSelect
                label="Decoration Type"
                value={decoration.type || "Printing"}
                onChange={(v) => updateRoot("decoration", { type: v })}
                options={["Printing", "Shrink Sleeve", "Hybrid"]}
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

            {decoration.enabled && decoration.type === "Printing" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <CompactInput
                  label="Ink Consumption g / 1000 pcs"
                  value={decoration?.printing?.inkConsumptionGPer1000 || ""}
                  onChange={(v) =>
                    updateNestedRoot("decoration", "printing", {
                      inkConsumptionGPer1000: v,
                    })
                  }
                  mode="editable_from_engineering"
                  referenceValue={
                    scenarioEngineering?.decorationEngineering?.print?.inkWeightPer1000Cups ||
                    ""
                  }
                />
                <CompactInput
                  label="Ink Price / Kg"
                  value={decoration?.printing?.inkPricePerKgCurrency || ""}
                  onChange={(v) =>
                    updateNestedRoot("decoration", "printing", {
                      inkPricePerKgCurrency: v,
                    })
                  }
                  mode="user"
                />
                <CompactSelect
                  label="Currency"
                  value={decoration?.printing?.currency || "EGP"}
                  onChange={(v) =>
                    updateNestedRoot("decoration", "printing", { currency: v })
                  }
                  options={currencyOptions}
                  mode="user"
                />
              </div>
            )}

            {decoration.enabled && decoration.type === "Shrink Sleeve" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <CompactInput
                  label="Sleeve Cost / Kg"
                  value={decoration?.sleeve?.sleeveCostPerKgCurrency || ""}
                  onChange={(v) =>
                    updateNestedRoot("decoration", "sleeve", {
                      sleeveCostPerKgCurrency: v,
                    })
                  }
                  mode="user"
                />
                <CompactInput
                  label="Sleeves / Kg"
                  value={decoration?.sleeve?.sleevesPerKg || ""}
                  onChange={(v) =>
                    updateNestedRoot("decoration", "sleeve", {
                      sleevesPerKg: v,
                    })
                  }
                  mode="user"
                />
                <CompactSelect
                  label="Currency"
                  value={decoration?.sleeve?.currency || "EGP"}
                  onChange={(v) =>
                    updateNestedRoot("decoration", "sleeve", { currency: v })
                  }
                  options={currencyOptions}
                  mode="user"
                />
              </div>
            )}

            {decoration.enabled && decoration.type === "Hybrid" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <CompactInput
                  label="Blank Consumption / Cup"
                  value={decoration?.hybrid?.blankConsumptionPerCup || ""}
                  onChange={(v) =>
                    updateNestedRoot("decoration", "hybrid", {
                      blankConsumptionPerCup: v,
                    })
                  }
                  mode="user"
                />
                <CompactInput
                  label="Blank Unit Price"
                  value={decoration?.hybrid?.blankUnitPriceCurrency || ""}
                  onChange={(v) =>
                    updateNestedRoot("decoration", "hybrid", {
                      blankUnitPriceCurrency: v,
                    })
                  }
                  mode="user"
                />
                <CompactSelect
                  label="Blank Currency"
                  value={decoration?.hybrid?.blankCurrency || "EGP"}
                  onChange={(v) =>
                    updateNestedRoot("decoration", "hybrid", {
                      blankCurrency: v,
                    })
                  }
                  options={currencyOptions}
                  mode="user"
                />

                <CompactInput
                  label="Bottom Consumption / Cup"
                  value={decoration?.hybrid?.bottomConsumptionPerCup || ""}
                  onChange={(v) =>
                    updateNestedRoot("decoration", "hybrid", {
                      bottomConsumptionPerCup: v,
                    })
                  }
                  mode="user"
                />
                <CompactInput
                  label="Bottom Unit Price"
                  value={decoration?.hybrid?.bottomUnitPriceCurrency || ""}
                  onChange={(v) =>
                    updateNestedRoot("decoration", "hybrid", {
                      bottomUnitPriceCurrency: v,
                    })
                  }
                  mode="user"
                />
                <CompactSelect
                  label="Bottom Currency"
                  value={decoration?.hybrid?.bottomCurrency || "EGP"}
                  onChange={(v) =>
                    updateNestedRoot("decoration", "hybrid", {
                      bottomCurrency: v,
                    })
                  }
                  options={currencyOptions}
                  mode="user"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <StatCard
                title="Decoration / 1000 pcs"
                value={`${fmt(decorationSummary.basis, 3)} EGP`}
                tone="blue"
              />
              <StatCard
                title="% of Price"
                value={`${fmt(pctOf(decorationSummary.basis, salesPriceBaseEgp), 2)}%`}
                tone="blue"
              />
              <StatCard
                title="USD"
                value={`${fmt(egpToUsd(decorationSummary.basis, assumptions.usdEgp), 3)} USD`}
                tone="blue"
              />
              <StatCard
                title="EUR"
                value={`${fmt(
                  egpToEur(decorationSummary.basis, assumptions.usdEgp, assumptions.eurUsd),
                  3
                )} EUR`}
                tone="blue"
              />
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
              <StatCard
                title={`Base Cost / ${basisLabel}`}
                value={`${fmt(row.baseCost, 3)} EGP`}
                tone="gray"
              />
              <StatCard
                title={`Waste / ${basisLabel}`}
                value={`${fmt(row.basis, 3)} EGP`}
                tone="red"
              />
            </div>
          ))}
        </div>

        <StatCard
          title={`Total Waste / ${basisLabel}`}
          value={`${fmt(wasteTotals.basis, 3)} EGP`}
          tone="red"
        />
      </Section>

      <Section title={isSheet ? "6. Freight Cost" : "8. Freight Cost"} tone="teal">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <CompactSelect
            label="Freight Option"
            value={freight.selectedOption || ""}
            onChange={(v) => updateRoot("freight", { selectedOption: v })}
            options={engineeringRefs.freightOptions}
            mode="user"
          />
          <CompactInput
            label={isSheet ? "Qty / Trip (tons)" : "Qty / Trip (pcs)"}
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
                <th className="text-left p-2">{`Cost / ${basisLabel}`}</th>
                <th className="text-left p-2">% Price</th>
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
                      {currencyOptions.map((cur) => (
                        <option key={cur} value={cur}>
                          {cur}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 bg-green-100">{fmt(row.tripCostEgp, 3)}</td>
                  <td className="p-2 bg-orange-100">
                    {fmt(row.qtyPerTrip, isSheet ? 3 : 0)}
                  </td>
                  <td className="p-2 bg-green-100">{fmt(row.basis, 3)}</td>
                  <td className="p-2 bg-green-100">
                    {fmt(pctOf(row.basis, salesPriceBaseEgp), 2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <StatCard
          title={`Total Freight / ${basisLabel}`}
          value={`${fmt(freightTotals.basis, 3)} EGP`}
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

              <StatCard
                title="Net Effective WC %"
                value={`${fmt(row.effectivePct, 3)}%`}
                tone="purple"
              />
              <StatCard
                title={`WC / ${basisLabel}`}
                value={`${fmt(row.basis, 3)} EGP`}
                tone="purple"
              />
            </div>
          ))}
        </div>

        <StatCard
          title={`Total WC / ${basisLabel}`}
          value={`${fmt(workingCapitalTotals.basis, 3)} EGP`}
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
                <CompactSelect
                  label="Currency"
                  value={row.currency || "EGP"}
                  onChange={(v) =>
                    updateRowGroup("amortizationRows", row.id, { currency: v })
                  }
                  options={currencyOptions}
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
                    title={`Amortization / ${basisLabel}`}
                    value={`${fmt(row.basis, 3)} EGP`}
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

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            className="rounded-lg border px-3 py-2 text-sm bg-white"
            onClick={addAmortizationRow}
          >
            + Add Investment
          </button>

          <StatCard
            title={`Total Amortization / ${basisLabel}`}
            value={`${fmt(amortizationTotals.basis, 3)} EGP`}
            tone="blue"
          />
        </div>
      </Section>

      <Section title={isSheet ? "9. Conversion Price" : "11. Conversion Price"} tone="gray">
  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <CompactSelect
          label="Mode"
          value={conversion.mode || ""}
          onChange={(v) => updateRoot("conversion", { mode: v })}
          options={conversionModeOptions}
          mode="user"
        />
        <CompactInput
          label="Value in Currency"
          value={conversion.valueInCurrency || ""}
          onChange={(v) => updateRoot("conversion", { valueInCurrency: v })}
          mode="user"
        />
        <CompactSelect
          label="Currency"
          value={conversion.currency || "EGP"}
          onChange={(v) => updateRoot("conversion", { currency: v })}
          options={currencyOptions}
          mode="user"
        />
      </div>
    </div>

    <div className="rounded-xl border bg-white p-3">
      <LineTableCompact rows={conversionLineRows} showPercent={true} />
    </div>
  </div>
</Section>

    <Section title="12. Results" tone="green">
  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
    <div className="rounded-xl border bg-white p-3">
      <LineTableCompact rows={resultBreakdownRows} showPercent={true} />
    </div>

    <div className="rounded-xl border bg-white p-4">
      <div className="font-medium mb-4">Cost Breakdown Pie Chart</div>

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
                {fmt(pctOfSales(row.value, salesPriceBaseEgp), 2)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
</Section>

     <Section title="13. Investment & Payback Summary" tone="blue">
  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
    <CompactInput
      label={`Expected Annual Volume (${isSheet ? "tons" : "x1000 pcs"})`}
      value={commercial.expectedAnnualVolume || ""}
      onChange={(v) => updateRoot("commercial", { expectedAnnualVolume: v })}
      mode="user"
    />
  </div>

  <div className="rounded-xl border bg-white p-3">
    <LineTableCompact rows={investmentPaybackRows} showPercent={false} />
  </div>
</Section>
    </div>
  );
}

export { Pricing20PricingTab };
export default Pricing20PricingTab;