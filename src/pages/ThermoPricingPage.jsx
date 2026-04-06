import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

const toNum = (v) => {
  const n = parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isNaN(n) ? 0 : n;
};

const fmt = (v, d = 3) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: d,
  }).format(v || 0);

const isDifferent = (a, b) => String(a ?? "") !== String(b ?? "");

function Card({ title, children, right }) {
  return (
    <div className="bg-white border rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-semibold">{title}</h2>
        {right || null}
      </div>
      {children}
    </div>
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

function TextInput({ value, onChange, changed = false, placeholder = "" }) {
  return (
    <input
      className={`w-full border rounded-md px-3 py-2 ${
        changed ? "bg-orange-50 border-orange-300" : ""
      }`}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

function NumInput({ value, onChange, changed = false, placeholder = "" }) {
  return (
    <input
      className={`w-full border rounded-md px-3 py-2 ${
        changed ? "bg-orange-50 border-orange-300" : ""
      }`}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

function SelectInput({ value, onChange, options, changed = false }) {
  return (
    <select
      className={`w-full border rounded-md px-3 py-2 ${
        changed ? "bg-orange-50 border-orange-300" : ""
      }`}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value ?? o} value={o.value ?? o}>
          {o.label ?? o}
        </option>
      ))}
    </select>
  );
}

function ValueCell({ value, unit = "" }) {
  return (
    <div className="border rounded p-2 bg-blue-50 border-blue-200 font-medium">
      {value === "" || value === null || value === undefined ? "—" : `${value}${unit}`}
    </div>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="border rounded-lg p-3 bg-white">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function SectionNote({ children, tone = "gray" }) {
  const styles = {
    gray: "border-gray-200 bg-gray-50 text-gray-700",
    red: "border-red-200 bg-red-50 text-red-700",
    orange: "border-orange-200 bg-orange-50 text-orange-700",
    green: "border-green-200 bg-green-50 text-green-700",
  };

  return <div className={`rounded-lg border p-3 text-sm ${styles[tone]}`}>{children}</div>;
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-lg border text-sm ${
        active
          ? "bg-black text-white border-black"
          : "bg-white hover:bg-gray-50 border-gray-300"
      }`}
    >
      {children}
    </button>
  );
}

export default function ThermoPricingPage() {
  const { requestId, pricingId } = useParams();
  const location = useLocation();

  const [sheetBundle, setSheetBundle] = useState(location.state?.bundle || null);
  const [pricingRoot, setPricingRoot] = useState(null);
  const [engineeringData, setEngineeringData] = useState(null);
  const [requestData, setRequestData] = useState(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("engineering");

  const [scenarioSetup, setScenarioSetup] = useState({
    scenarioName: "",
    createdBy: "",
    scenarioStatus: "Draft",
    scenarioNote: "",
    currency: "",
    usdEgp: "",
    eurUsd: "",
    compareSelected: false,
  });

  const [resultsMode, setResultsMode] = useState("conversionPer1000");

  const [resultsInput, setResultsInput] = useState({
    requiredExtrusionConversionPerDay: "",
    requiredThermoConversionPerDay: "",
    requiredConversionCostPer1000: "",
    requiredSellingPricePer1000: "",
  });

  const [spec, setSpec] = useState({
    productName: "",
    productCode: "",
    sheetSource: "internalExtrusion",
    manualSheetPricePerTon: "",
    unitWeight_g: "",
    cavities: "",
    cpm: "",
    sheetUtilPct: "",
    efficiencyPct: "",
    machineName: "",
    moldBaseName: "",
    moldBaseCode: "",
    insertName: "",
    insertCode: "",
    bottomName: "",
    bottomCode: "",
    plugAssistName: "",
    plugAssistCode: "",
    cuttingPlateName: "",
    cuttingPlateCode: "",
    stackingPlateName: "",
    stackingPlateCode: "",
  });

  const [pack, setPack] = useState({
    usePallet: true,

    pcsPerStack: "",
    primaryName: "PE Bag",
    primaryLengthMm: "",
    primaryWidthMm: "",
    primaryHeightMm: "",
    primaryMaterial: "",
    primaryArtworkCode: "",
    stacksPerPrimary: "",

    primariesPerSecondary: "",
    secondaryName: "Carton",
    secondaryType: "Single wall",
    secondaryLengthMm: "",
    secondaryWidthMm: "",
    secondaryHeightMm: "",
    labelsPerSecondary: "",
    labelLengthMm: "100",
    labelWidthMm: "150",

    palletWidthMm: "",
    palletLengthMm: "",
    palletHeightMm: "",
    palletType: "",
    secondariesPerPallet: "",
    labelsPerPallet: "",
    stretchKgPerPallet: "",
    packingNotes: "",
  });

  const [prices, setPrices] = useState({
    primaryPricePerUnit: "",
    secondaryPricePerUnit: "",
    labelSecondaryPrice: "",
    palletPrice: "",
    labelPalletPrice: "",
    stretchPricePerKg: "",
  });

  const [finance, setFinance] = useState({
    DSO: "0",
    DIO: "30",
    DPO: "30",
    interestPct: "0",
    convPerDay: "",
    desiredPricePer1000: "",
    palletsPerTruck: "",
    cartonsPerTruck: "",
    freightCostPerTrip: "",
  });

  const [deco, setDeco] = useState({
    use: false,
    type: "Printing",
    printing: { ink_g_per_1000: "", ink_price_per_kg: "" },
    shrink: {
      sleeveWeight_g: "",
      sleeveCostPerPiece: "",
      sleeveCostPerKg: "",
      wastePct: "",
    },
    hybrid: {
      blank_per_1000: "",
      bottom_per_1000: "",
      glue_g_per_1000: "",
      glue_price_per_kg: "",
    },
  });

  const [investRows, setInvestRows] = useState([]);

  useEffect(() => {
    const remembered = localStorage.getItem("pricingCreatedBy") || "";
    if (remembered) {
      setScenarioSetup((prev) => ({ ...prev, createdBy: remembered }));
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const [scRes, engRes, reqRes] = await Promise.all([
          fetch(`/.netlify/functions/get-pricing-scenario?pricingId=${pricingId}`),
          fetch(`/.netlify/functions/get-engineering-data?requestId=${requestId}`),
          fetch(`/.netlify/functions/get-request?requestId=${requestId}`),
        ]);

        const scJson = await scRes.json();
        const engJson = await engRes.json();
        const reqJson = await reqRes.json();

        if (engJson.success) {
          setEngineeringData(engJson.engineeringData || {});
        }

        if (reqJson.success) {
          setRequestData(reqJson.payload || {});
        }

        if (scJson.success) {
          const pricingData = scJson.pricingData || {};
          setPricingRoot(pricingData.pricing || null);

          if (pricingData.thermoBundle) {
            setSheetBundle(pricingData.thermoBundle);
          }

          setScenarioSetup((prev) => ({
            ...prev,
            scenarioName: scJson.scenario?.ScenarioName || "",
            createdBy:
              scJson.scenario?.CreatedBy ||
              localStorage.getItem("pricingCreatedBy") ||
              "",
            scenarioStatus: scJson.scenario?.ScenarioStatus || "Draft",
            scenarioNote: scJson.scenario?.ScenarioNote || "",
            currency:
              scJson.scenario?.ScenarioCurrency ||
              pricingData?.pricing?.currency ||
              "",
            usdEgp:
              scJson.scenario?.UsdEgp ||
              pricingData?.pricing?.usdEgp ||
              "",
            eurUsd:
              scJson.scenario?.EurUsd ||
              pricingData?.pricing?.eurUsd ||
              "",
            compareSelected: (scJson.scenario?.CompareSelected || "") === "Yes",
          }));

          if (pricingData.thermo) {
            const t = pricingData.thermo;
            if (t.spec) setSpec((prev) => ({ ...prev, ...t.spec }));
            if (t.pack) setPack((prev) => ({ ...prev, ...t.pack }));
            if (t.prices) setPrices((prev) => ({ ...prev, ...t.prices }));
            if (t.finance) setFinance((prev) => ({ ...prev, ...t.finance }));
            if (t.deco) setDeco((prev) => ({ ...prev, ...t.deco }));
            if (t.investRows) {
              setInvestRows(
                t.investRows.map((row) => ({
                  ...row,
                  amortize: row.amortize === true,
                  amortizationQty: row.amortizationQty || "",
                }))
              );
            }
            if (t.resultsMode) setResultsMode(t.resultsMode);
            if (t.resultsInput) setResultsInput(t.resultsInput);
          }
        }
      } catch (error) {
        console.error("Failed to load thermo scenario:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [pricingId, requestId]);

  useEffect(() => {
    const thermo = engineeringData?.thermo || {};
    const tooling = engineeringData?.tooling || {};
    const decoEng = engineeringData?.decorationEngineering || {};
    const packEng = engineeringData?.packaging || {};
    const reqPack = requestData?.packaging || {};
    const reqProduct = requestData?.product || {};

    setSpec((prev) => ({
      ...prev,
      productName: prev.productName || requestId,
      productCode: prev.productCode || requestId,
      unitWeight_g: prev.unitWeight_g || thermo.unitWeight_g || reqProduct.productWeightG || "",
      cavities: prev.cavities || thermo.cavities || "",
      cpm: prev.cpm || thermo.cpm || "",
      sheetUtilPct: prev.sheetUtilPct || thermo.sheetUtilizationPct || "",
      efficiencyPct: prev.efficiencyPct || thermo.efficiencyPct || "",
      machineName: prev.machineName || thermo.machineName || "",
      moldBaseName: prev.moldBaseName || tooling.moldBaseName || "",
      moldBaseCode: prev.moldBaseCode || tooling.moldBaseCode || "",
      insertName: prev.insertName || tooling.moldInsertName || "",
      insertCode: prev.insertCode || tooling.moldInsertCode || "",
      bottomName: prev.bottomName || tooling.moldBottomName || "",
      bottomCode: prev.bottomCode || tooling.moldBottomCode || "",
      plugAssistName: prev.plugAssistName || tooling.plugAssistName || "",
      plugAssistCode: prev.plugAssistCode || tooling.plugAssistCode || "",
      cuttingPlateName: prev.cuttingPlateName || tooling.cuttingPlateName || "",
      cuttingPlateCode: prev.cuttingPlateCode || tooling.cuttingPlateCode || "",
      stackingPlateName: prev.stackingPlateName || tooling.stackingUnitName || "",
      stackingPlateCode: prev.stackingPlateCode || tooling.stackingUnitCode || "",
    }));

    setPack((prev) => ({
      ...prev,
      pcsPerStack:
        prev.pcsPerStack ||
        packEng?.primary?.pcsPerStack ||
        reqPack?.primary?.pcsPerStack ||
        "",
      primaryName:
        prev.primaryName ||
        packEng?.primary?.primaryName ||
        reqPack?.primary?.bagSleeveMaterial ||
        "PE Bag",
      primaryLengthMm:
        prev.primaryLengthMm ||
        packEng?.primary?.primaryLength_mm ||
        "",
      primaryWidthMm:
        prev.primaryWidthMm ||
        packEng?.primary?.primaryWidth_mm ||
        "",
      primaryHeightMm:
        prev.primaryHeightMm ||
        packEng?.primary?.primaryHeight_mm ||
        "",
      primaryMaterial:
        prev.primaryMaterial ||
        packEng?.primary?.primaryMaterial ||
        reqPack?.primary?.bagSleeveMaterial ||
        "",
      primaryArtworkCode:
        prev.primaryArtworkCode ||
        packEng?.primary?.primaryArtworkCode ||
        "",
      stacksPerPrimary:
        prev.stacksPerPrimary ||
        packEng?.primary?.stacksPerPrimary ||
        reqPack?.primary?.stacksPerBag ||
        "",
      primariesPerSecondary:
        prev.primariesPerSecondary ||
        packEng?.secondary?.primariesPerSecondary ||
        reqPack?.secondary?.bagsPerCarton ||
        "",
      secondaryName:
        prev.secondaryName ||
        packEng?.secondary?.secondaryName ||
        reqPack?.secondary?.cartonType ||
        "Carton",
      secondaryType:
        prev.secondaryType ||
        packEng?.secondary?.secondaryType ||
        reqPack?.secondary?.cartonType ||
        "Single wall",
      secondaryLengthMm:
        prev.secondaryLengthMm ||
        packEng?.secondary?.secondaryLength_mm ||
        reqPack?.secondary?.cartonLengthMm ||
        "",
      secondaryWidthMm:
        prev.secondaryWidthMm ||
        packEng?.secondary?.secondaryWidth_mm ||
        reqPack?.secondary?.cartonWidthMm ||
        "",
      secondaryHeightMm:
        prev.secondaryHeightMm ||
        packEng?.secondary?.secondaryHeight_mm ||
        reqPack?.secondary?.cartonHeightMm ||
        "",
      labelsPerSecondary:
        prev.labelsPerSecondary ||
        packEng?.secondary?.labelsPerBox ||
        "",
      labelLengthMm:
        prev.labelLengthMm ||
        packEng?.secondary?.labelLength_mm ||
        "100",
      labelWidthMm:
        prev.labelWidthMm ||
        packEng?.secondary?.labelWidth_mm ||
        "150",
      usePallet:
        prev.usePallet !== undefined
          ? prev.usePallet
          : (packEng?.pallet?.palletSelected || "Yes") === "Yes",
      palletWidthMm:
        prev.palletWidthMm ||
        packEng?.pallet?.palletWidth_mm ||
        reqPack?.pallet?.palletWidthMm ||
        "",
      palletLengthMm:
        prev.palletLengthMm ||
        packEng?.pallet?.palletLength_mm ||
        reqPack?.pallet?.palletLengthMm ||
        "",
      palletHeightMm:
        prev.palletHeightMm ||
        packEng?.pallet?.palletHeight_mm ||
        reqPack?.pallet?.palletHeightMm ||
        "",
      palletType:
        prev.palletType ||
        packEng?.pallet?.palletType ||
        reqPack?.pallet?.palletType ||
        "",
      secondariesPerPallet:
        prev.secondariesPerPallet ||
        packEng?.pallet?.boxesPerPallet ||
        reqPack?.pallet?.cartonsPerPallet ||
        "",
      labelsPerPallet:
        prev.labelsPerPallet ||
        packEng?.pallet?.labelsPerPallet ||
        "",
      stretchKgPerPallet:
        prev.stretchKgPerPallet ||
        packEng?.pallet?.stretchWeightPerPallet_kg ||
        reqPack?.pallet?.stretchWrapKgPerPallet ||
        "",
      packingNotes:
        prev.packingNotes ||
        packEng?.notes ||
        reqPack?.primary?.primaryPackagingNotes ||
        reqPack?.secondary?.cartonPackagingNotes ||
        reqPack?.pallet?.palletNotes ||
        "",
    }));

    if (decoEng) {
      const requestDecorationType =
        requestData?.product?.productType === "Sheet Roll"
          ? "No decoration"
          : requestData?.decoration?.decorationType || "No decoration";

      const decoType =
        requestDecorationType !== "No decoration"
          ? requestDecorationType
          : decoEng.enabled
          ? "Dry offset printing"
          : "";

      if (decoType) {
        setDeco((prev) => ({
          ...prev,
          use: decoType !== "No decoration" && decoType !== "",
          type:
            decoType === "Dry offset printing"
              ? "Printing"
              : decoType === "Shrink sleeve"
              ? "Shrink sleeve"
              : decoType === "Hybrid cup"
              ? "Hybrid"
              : prev.type,
          printing: {
            ...prev.printing,
            ink_g_per_1000:
              prev.printing.ink_g_per_1000 ||
              decoEng?.print?.inkWeightPer1000Cups ||
              "",
          },
        }));
      }
    }

    if (!investRows.length && Array.isArray(engineeringData?.investments)) {
      setInvestRows(
        engineeringData.investments.map((row) => ({
          ...row,
          amortize: row.amortize === true,
          amortizationQty: row.amortizationQty || "",
        }))
      );
    }
  }, [engineeringData, requestData, requestId, investRows.length]);

  const customerBlock = requestData?.customer || {};
  const primaryCustomer = customerBlock?.customers?.[0] || {};
  const project = requestData?.project || {};
  const product = requestData?.product || {};

  const thumb =
    product?.productThumbnailUrl ||
    product?.productThumbnailPreview ||
    (product?.productThumbnailBase64
      ? `data:image/*;base64,${product.productThumbnailBase64}`
      : "");

  const missingRequired =
    !scenarioSetup.scenarioName.trim() ||
    !scenarioSetup.createdBy.trim() ||
    !scenarioSetup.scenarioStatus.trim() ||
    !scenarioSetup.scenarioNote.trim() ||
    !scenarioSetup.currency ||
    !scenarioSetup.usdEgp ||
    !scenarioSetup.eurUsd;

  if (loading) {
    return <div className="p-6">Loading thermo pricing...</div>;
  }

  if (!sheetBundle) {
    return (
      <div className="p-6">
        Thermo bundle not found for this scenario. Go back to the extrusion pricing scenario,
        then click “Open Thermo Pricing” again.
      </div>
    );
  }

  const engThermo = engineeringData?.thermo || {};
  const engTooling = engineeringData?.tooling || {};
  const engPack = engineeringData?.packaging || {};
  const engDeco = engineeringData?.decorationEngineering || {};

  const currency = scenarioSetup.currency || sheetBundle.currency || "EGP";
  const usdEgp = Math.max(0, toNum(scenarioSetup.usdEgp || sheetBundle.usdEgp || 60));
  const eurUsd = Math.max(0, toNum(scenarioSetup.eurUsd || pricingRoot?.eurUsd || 1.08));

  const internalExtrusionCostPerTon = toNum(
    sheetBundle?.extrusionSummary?.totalPerTon || sheetBundle?.sheetMaterialCostPerTon || 0
  );

  const sheetMaterialCostPerTon =
    (spec.sheetSource || "internalExtrusion") === "manual"
      ? toNum(spec.manualSheetPricePerTon)
      : internalExtrusionCostPerTon;

  const netExtruderKgPerHour = toNum(
    sheetBundle?.extrusionSummary?.netExtruderKgPerHour || sheetBundle?.netExtruderKgPerHour || 0
  );

  const netExtruderKgPerDay = toNum(
    sheetBundle?.extrusionSummary?.netExtruderKgPerDay || sheetBundle?.netExtruderKgPerDay || 0
  );

  const bomPerTon = sheetBundle?.bomPerTon || [];

  const cav = Math.max(1, Math.floor(toNum(spec.cavities)) || 1);
  const cpm = toNum(spec.cpm);
  const eff = Math.max(0, Math.min(1, toNum(spec.efficiencyPct) / 100));
  const util = Math.max(0, Math.min(1, toNum(spec.sheetUtilPct) / 100));
  const unit_g = toNum(spec.unitWeight_g);

  const pcsPerHour = cpm * 60 * cav * eff;
  const pcsPerShift = pcsPerHour * 12;
  const pcsPerDay = pcsPerHour * 24;
  const pcsPerWeek = pcsPerDay * 7;
  const pcsPerMonth = pcsPerDay * 30;
  const pcsPerYear = pcsPerDay * 330;

  const sheetConsumptionKgPerHour =
    util > 0 ? (unit_g * pcsPerHour) / 1000 / util : 0;
  const sheetConsumptionKgPerShift = sheetConsumptionKgPerHour * 12;
  const sheetConsumptionKgPerDay = sheetConsumptionKgPerHour * 24;

  const sheetCostPer1000 =
    unit_g > 0 ? (sheetMaterialCostPerTon / 1_000_000) * unit_g * 1000 : 0;

  const pcsPerStack = Math.max(1, Math.floor(toNum(pack.pcsPerStack)) || 1);
  const stacksPerPrimary = Math.max(1, Math.floor(toNum(pack.stacksPerPrimary)) || 1);
  const pcsPerPrimary = pcsPerStack * stacksPerPrimary;
  const primariesPerSecondary = Math.max(1, Math.floor(toNum(pack.primariesPerSecondary)) || 1);
  const pcsPerSecondary = pcsPerPrimary * primariesPerSecondary;
  const secondariesPerPallet = Math.max(1, Math.floor(toNum(pack.secondariesPerPallet)) || 1);
  const labelsPerSecondary = Math.max(0, Math.floor(toNum(pack.labelsPerSecondary)) || 0);
  const labelsPerPallet = Math.max(0, Math.floor(toNum(pack.labelsPerPallet)) || 0);

  const costPrimary_1000 =
    pcsPerPrimary > 0 ? (toNum(prices.primaryPricePerUnit) / pcsPerPrimary) * 1000 : 0;

  const costSecondary_1000 =
    pcsPerPrimary > 0 && primariesPerSecondary > 0
      ? (
          (toNum(prices.secondaryPricePerUnit) +
            labelsPerSecondary * toNum(prices.labelSecondaryPrice)) /
          (pcsPerPrimary * primariesPerSecondary)
        ) * 1000
      : 0;

  const costPallet_1000 =
    pack.usePallet && pcsPerSecondary > 0 && secondariesPerPallet > 0
      ? (
          (toNum(prices.palletPrice) +
            labelsPerPallet * toNum(prices.labelPalletPrice) +
            toNum(prices.stretchPricePerKg) * toNum(pack.stretchKgPerPallet)) /
          (pcsPerSecondary * secondariesPerPallet)
        ) * 1000
      : 0;

  const packagingPer1000 =
    costPrimary_1000 + costSecondary_1000 + (pack.usePallet ? costPallet_1000 : 0);

  const packagingPerTon =
    unit_g > 0 && util > 0 ? packagingPer1000 / ((1000 / unit_g) * util / 1000) : 0;

  let decorationPer1000 = 0;
  if (deco.use) {
    if (deco.type === "Printing") {
      decorationPer1000 =
        (toNum(deco.printing.ink_g_per_1000) / 1000) *
        toNum(deco.printing.ink_price_per_kg);
    } else if (deco.type === "Shrink sleeve") {
      const sleeveWeightKg = toNum(deco.shrink.sleeveWeight_g) / 1000;
      const sleeveCostPiece =
        toNum(deco.shrink.sleeveCostPerPiece) ||
        sleeveWeightKg * toNum(deco.shrink.sleeveCostPerKg);
      const wasteFactor = 1 + toNum(deco.shrink.wastePct) / 100;
      decorationPer1000 = sleeveCostPiece * 1000 * wasteFactor;
    } else if (deco.type === "Hybrid") {
      decorationPer1000 =
        toNum(deco.hybrid.blank_per_1000) +
        toNum(deco.hybrid.bottom_per_1000) +
        (toNum(deco.hybrid.glue_g_per_1000) / 1000) *
          toNum(deco.hybrid.glue_price_per_kg);
    }
  }

  const DSO = toNum(finance.DSO);
  const DIO = toNum(finance.DIO);
  const DPO = toNum(finance.DPO);
  const interest = toNum(finance.interestPct) / 100;

  const workingCapPer1000 =
    (sheetCostPer1000 + packagingPer1000 + decorationPer1000) *
    interest *
    ((DSO + DIO - DPO) / 365);

  const convPer1000 =
    pcsPerDay > 0 ? (toNum(finance.convPerDay) / pcsPerDay) * 1000 : 0;

  const wasteCostPer1000 = 0;

  const thermoTonsConsumedPerDay =
    util > 0 ? (pcsPerDay * unit_g) / 1000 / util / 1000 : 0;

  const totalInvestEGP = investRows.reduce((s, r) => {
    const value = toNum(r.value || r.cost || 0);
    const currencyCode = String(r.currency || "EGP").toUpperCase();
    const exRate = toNum(r.exchangeRate);

    if (currencyCode === "USD") {
      return s + value * (exRate || usdEgp);
    }
    if (currencyCode === "EUR") {
      return s + value * ((exRate || eurUsd) * usdEgp);
    }
    return s + value;
  }, 0);

  const amortizedInvestmentRows = investRows.filter((row) => row.amortize);

  const amortizationCostPer1000 = amortizedInvestmentRows.reduce((sum, row) => {
    const value = toNum(row.value || row.cost || 0);
    const currencyCode = String(row.currency || "EGP").toUpperCase();
    const exRate = toNum(row.exchangeRate);
    const qty = toNum(row.amortizationQty);

    let valueEgp = value;

    if (currencyCode === "USD") {
      valueEgp = value * (exRate || usdEgp);
    } else if (currencyCode === "EUR") {
      valueEgp = value * ((exRate || eurUsd) * usdEgp);
    }

    if (qty <= 0) return sum;

    return sum + (valueEgp / qty) * 1000;
  }, 0);

  const nonAmortizedInvestmentCost = investRows.reduce((sum, row) => {
    if (row.amortize) return sum;

    const value = toNum(row.value || row.cost || 0);
    const currencyCode = String(row.currency || "EGP").toUpperCase();
    const exRate = toNum(row.exchangeRate);

    if (currencyCode === "USD") {
      return sum + value * (exRate || usdEgp);
    }
    if (currencyCode === "EUR") {
      return sum + value * ((exRate || eurUsd) * usdEgp);
    }
    return sum + value;
  }, 0);

  const palletsPerTruck =
    pack.usePallet ? Math.max(0, Math.floor(toNum(finance.palletsPerTruck)) || 0) : 0;

  const cartonsPerTruck =
    pack.usePallet
      ? palletsPerTruck * secondariesPerPallet
      : Math.max(0, Math.floor(toNum(finance.cartonsPerTruck)) || 0);

  const pcsPerTruck = cartonsPerTruck * pcsPerSecondary;
  const netProductWeightPerTruckKg = (pcsPerTruck * unit_g) / 1000;

  const freightCostPer1000 =
    pcsPerTruck > 0
      ? (toNum(finance.freightCostPerTrip) / pcsPerTruck) * 1000
      : 0;

  const totalPer1000 =
    sheetCostPer1000 +
    packagingPer1000 +
    decorationPer1000 +
    wasteCostPer1000 +
    workingCapPer1000 +
    freightCostPer1000 +
    amortizationCostPer1000 +
    convPer1000;

  const resultsDerived = useMemo(() => {
    const extrusionProductivityTonPerDay = netExtruderKgPerDay / 1000;
    const thermoProductivityPcsPerDay = pcsPerDay;
    const thermoConsumptionTonPerDay = thermoTonsConsumedPerDay;

    const baseCostWithoutConversion =
      sheetCostPer1000 +
      packagingPer1000 +
      decorationPer1000 +
      wasteCostPer1000 +
      workingCapPer1000 +
      freightCostPer1000 +
      amortizationCostPer1000;

    let requiredExtrusionConversionPerDay = 0;
    let requiredThermoConversionPerDay = 0;
    let requiredConversionCostPer1000 = 0;
    let requiredSellingPricePer1000 = 0;

    if (resultsMode === "extrusionPerDay") {
      requiredExtrusionConversionPerDay = toNum(
        resultsInput.requiredExtrusionConversionPerDay
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
    } else if (resultsMode === "thermoPerDay") {
      requiredThermoConversionPerDay = toNum(
        resultsInput.requiredThermoConversionPerDay
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
    } else if (resultsMode === "sellingPricePer1000") {
      requiredSellingPricePer1000 = toNum(
        resultsInput.requiredSellingPricePer1000
      );

      requiredConversionCostPer1000 =
        requiredSellingPricePer1000 - baseCostWithoutConversion;

      if (requiredConversionCostPer1000 < 0) {
        requiredConversionCostPer1000 = 0;
      }

      requiredThermoConversionPerDay =
        (requiredConversionCostPer1000 * thermoProductivityPcsPerDay) / 1000;

      requiredExtrusionConversionPerDay =
        thermoConsumptionTonPerDay > 0
          ? (requiredThermoConversionPerDay / thermoConsumptionTonPerDay) *
            extrusionProductivityTonPerDay
          : 0;
    } else {
      requiredConversionCostPer1000 = toNum(
        resultsInput.requiredConversionCostPer1000 || convPer1000
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

    return {
      extrusionProductivityTonPerDay,
      thermoProductivityPcsPerDay,
      thermoConsumptionTonPerDay,
      baseCostWithoutConversion,
      requiredExtrusionConversionPerDay,
      requiredThermoConversionPerDay,
      requiredConversionCostPer1000,
      requiredSellingPricePer1000,
    };
  }, [
    resultsMode,
    resultsInput,
    netExtruderKgPerDay,
    pcsPerDay,
    thermoTonsConsumedPerDay,
    sheetCostPer1000,
    packagingPer1000,
    decorationPer1000,
    workingCapPer1000,
    freightCostPer1000,
    amortizationCostPer1000,
    convPer1000,
  ]);

  const effectiveConversionPer1000 = resultsDerived.requiredConversionCostPer1000;

  const paybackQtyPcs =
    effectiveConversionPer1000 > 0
      ? totalInvestEGP / (effectiveConversionPer1000 / 1000)
      : 0;

  const pricePerCarton =
    pcsPerSecondary > 0
      ? (resultsDerived.requiredSellingPricePer1000 / 1000) * pcsPerSecondary
      : 0;

  const packagingInstructionText = pack.usePallet
    ? `Pack ${pcsPerStack} pcs per stack and ${stacksPerPrimary} stacks per ${pack.primaryName || "primary pack"}. Use ${primariesPerSecondary} primary packs per ${pack.secondaryName || "secondary pack"}, then load ${secondariesPerPallet} cartons per pallet using ${pack.palletType || "selected pallet"} and ${fmt(toNum(pack.stretchKgPerPallet), 3)} kg stretch film per pallet.`
    : `Pack ${pcsPerStack} pcs per stack and ${stacksPerPrimary} stacks per ${pack.primaryName || "primary pack"}. Use ${primariesPerSecondary} primary packs per ${pack.secondaryName || "secondary pack"} with no pallet selected.`;

  const addInvestmentRow = () => {
    setInvestRows((prev) => [
      ...prev,
      {
        name: "",
        type: "",
        value: "",
        currency: "EGP",
        exchangeRate: "",
        supplier: "",
        leadTimeWeeks: "",
        amortize: false,
        amortizationQty: "",
      },
    ]);
  };

  const updateInvestmentRow = (index, patch) => {
    setInvestRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  const removeInvestmentRow = (index) => {
    setInvestRows((prev) => prev.filter((_, i) => i !== index));
  };

  const saveThermoScenario = async () => {
    try {
      if (missingRequired) {
        alert("Please complete all required scenario setup fields.");
        return;
      }

      localStorage.setItem("pricingCreatedBy", scenarioSetup.createdBy.trim());

      const pricingData = {
        pricing: {
          ...(pricingRoot || {}),
          currency: scenarioSetup.currency,
          usdEgp: scenarioSetup.usdEgp,
          eurUsd: scenarioSetup.eurUsd,
        },
        thermoBundle: sheetBundle || {},
        thermo: {
          spec,
          pack,
          prices,
          finance,
          deco,
          investRows,
          resultsMode,
          resultsInput,
          summary: {
            totalPer1000: resultsDerived.requiredSellingPricePer1000,
            paybackQtyPcs,
            requiredExtrusionConversionPerDay:
              resultsDerived.requiredExtrusionConversionPerDay,
            requiredThermoConversionPerDay:
              resultsDerived.requiredThermoConversionPerDay,
            requiredConversionCostPer1000:
              resultsDerived.requiredConversionCostPer1000,
            requiredSellingPricePer1000:
              resultsDerived.requiredSellingPricePer1000,
            thermoTonsConsumedPerDay:
              resultsDerived.thermoConsumptionTonPerDay,
            usdEgp,
            eurUsd,
            pricePerCarton,
            sheetConsumptionKgPerHour,
            sheetConsumptionKgPerShift,
            sheetConsumptionKgPerDay,
            pcsPerHour,
            pcsPerShift,
            pcsPerDay,
            pcsPerWeek,
            pcsPerMonth,
            pcsPerYear,
            cartonsPerTruck,
            pcsPerTruck,
            palletsPerTruck,
            netProductWeightPerTruckKg,
            freightCostPerTrip: toNum(finance.freightCostPerTrip),
            freightCostPer1000,
            sheetMaterialCostPerTon,
            sheetCostPer1000,
            packagingPer1000,
            packagingPerTon,
            decorationPer1000,
            workingCapPer1000,
            amortizationCostPer1000,
          },
        },
      };

      const res = await fetch("/.netlify/functions/save-pricing-scenario", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          pricingId,
          scenarioName: scenarioSetup.scenarioName,
          scenarioNote: scenarioSetup.scenarioNote,
          createdBy: scenarioSetup.createdBy,
          scenarioStatus: scenarioSetup.scenarioStatus,
          compareSelected: scenarioSetup.compareSelected,
          scenarioCurrency: scenarioSetup.currency,
          usdEgp: scenarioSetup.usdEgp,
          eurUsd: scenarioSetup.eurUsd,
          pricingData,
          totalCostPer1000: totalPer1000,
          sellingPricePer1000: resultsDerived.requiredSellingPricePer1000,
          marginPct: "",
        }),
      });

      const json = await res.json();
      if (!json.success) {
        alert(json.error || "Failed to save thermo scenario");
        return;
      }

      setSaveMessage("Thermo scenario saved");
    } catch (error) {
      console.error(error);
      alert("Failed to save thermo scenario");
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          {thumb ? (
            <img
              src={thumb}
              alt="Product thumbnail"
              className="w-16 h-16 rounded-xl border object-cover bg-white"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl border bg-gray-100 flex items-center justify-center text-xs text-gray-500">
              No image
            </div>
          )}

          <div>
            <h1 className="text-xl font-semibold">Thermoformed Product Pricing</h1>
            <p className="text-sm text-gray-500">
              {project.projectName || requestId} • {primaryCustomer.customerName || "—"} • {pricingId}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to={`/pricing/${requestId}/scenario/${pricingId}`}
            className="px-4 py-2 border rounded-md bg-white hover:bg-gray-50"
          >
            ← Back to Extrusion Pricing
          </Link>

          <button
            onClick={saveThermoScenario}
            disabled={missingRequired}
            className={`px-4 py-2 rounded-md text-white ${
              missingRequired ? "bg-gray-400" : "bg-black hover:bg-gray-800"
            }`}
          >
            Save Thermo Scenario
          </button>
        </div>
      </div>

      {saveMessage ? <div className="text-sm text-green-600">{saveMessage}</div> : null}

      <Card title="Scenario Setup">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {missingRequired && (
            <div className="md:col-span-4">
              <SectionNote tone="red">
                Scenario Name, Creator, Status, Notes, Offer Currency, USD/EGP, and EUR/USD are required.
              </SectionNote>
            </div>
          )}

          <div>
            <div className="text-xs text-gray-500 mb-1">Scenario Name</div>
            <TextInput
              value={scenarioSetup.scenarioName}
              onChange={(v) => setScenarioSetup((prev) => ({ ...prev, scenarioName: v }))}
            />
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Creator</div>
            <TextInput
              value={scenarioSetup.createdBy}
              onChange={(v) => setScenarioSetup((prev) => ({ ...prev, createdBy: v }))}
            />
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Status</div>
            <SelectInput
              value={scenarioSetup.scenarioStatus}
              onChange={(v) => setScenarioSetup((prev) => ({ ...prev, scenarioStatus: v }))}
              options={["Draft", "Final", "Archived"]}
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={scenarioSetup.compareSelected}
                onChange={(e) =>
                  setScenarioSetup((prev) => ({
                    ...prev,
                    compareSelected: e.target.checked,
                  }))
                }
              />
              Add to comparison
            </label>
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-gray-500 mb-1">Notes</div>
            <TextInput
              value={scenarioSetup.scenarioNote}
              onChange={(v) => setScenarioSetup((prev) => ({ ...prev, scenarioNote: v }))}
            />
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Offer Currency</div>
            <SelectInput
              value={scenarioSetup.currency}
              onChange={(v) => setScenarioSetup((prev) => ({ ...prev, currency: v }))}
              options={["EGP", "USD", "EUR"]}
            />
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">USD / EGP Exchange Rate</div>
            <NumInput
              value={scenarioSetup.usdEgp}
              onChange={(v) => setScenarioSetup((prev) => ({ ...prev, usdEgp: v }))}
            />
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">EUR / USD Exchange Rate</div>
            <NumInput
              value={scenarioSetup.eurUsd}
              onChange={(v) => setScenarioSetup((prev) => ({ ...prev, eurUsd: v }))}
            />
          </div>
        </div>
      </Card>

      <Card title="Scenario Tabs">
        <div className="flex gap-2 flex-wrap">
          <TabButton active={activeTab === "engineering"} onClick={() => setActiveTab("engineering")}>
            Engineering Data
          </TabButton>
          <TabButton active={activeTab === "bom"} onClick={() => setActiveTab("bom")}>
            BOM Cost
          </TabButton>
          <TabButton active={activeTab === "investments"} onClick={() => setActiveTab("investments")}>
            Investments
          </TabButton>
          <TabButton active={activeTab === "results"} onClick={() => setActiveTab("results")}>
            Results
          </TabButton>
        </div>
      </Card>

      {activeTab === "engineering" && (
        <>
          <Card title="Scenario Meta">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <InfoTile label="Currency" value={currency} />
              <InfoTile label="USD / EGP" value={fmt(usdEgp, 3)} />
              <InfoTile label="EUR / USD" value={fmt(eurUsd, 4)} />
              <InfoTile label="Net Extruder kg/hr" value={fmt(netExtruderKgPerHour)} />
              <InfoTile label="Net Extruder kg/day" value={fmt(netExtruderKgPerDay)} />
            </div>
          </Card>

          <Card title="Thermoforming Data — Engineering vs Scenario">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="font-medium text-gray-500">Parameter</div>
              <div className="font-medium text-gray-500">Engineering</div>
              <div className="font-medium text-gray-500">Scenario</div>

              {[
                ["Product Name", "productName"],
                ["Product Code", "productCode"],
                ["Machine", "machineName"],
                ["Mold Base Name", "moldBaseName"],
                ["Mold Base Code", "moldBaseCode"],
                ["Insert Name", "insertName"],
                ["Insert Code", "insertCode"],
                ["Bottom Name", "bottomName"],
                ["Bottom Code", "bottomCode"],
                ["Plug Assist Name", "plugAssistName"],
                ["Plug Assist Code", "plugAssistCode"],
                ["Cutting Plate Name", "cuttingPlateName"],
                ["Cutting Plate Code", "cuttingPlateCode"],
                ["Stacking Plate Name", "stackingPlateName"],
                ["Stacking Plate Code", "stackingPlateCode"],
                ["Unit Weight (g)", "unitWeight_g"],
                ["Cavities", "cavities"],
                ["CPM", "cpm"],
                ["Efficiency %", "efficiencyPct"],
                ["Sheet Utilization %", "sheetUtilPct"],
              ].map(([label, key]) => {
                const engineeringValue =
                  key === "machineName"
                    ? engThermo.machineName
                    : key === "unitWeight_g"
                    ? engThermo.unitWeight_g
                    : key === "cavities"
                    ? engThermo.cavities
                    : key === "cpm"
                    ? engThermo.cpm
                    : key === "efficiencyPct"
                    ? engThermo.efficiencyPct
                    : key === "sheetUtilPct"
                    ? engThermo.sheetUtilizationPct
                    : key === "moldBaseName"
                    ? engTooling.moldBaseName
                    : key === "moldBaseCode"
                    ? engTooling.moldBaseCode
                    : key === "insertName"
                    ? engTooling.moldInsertName
                    : key === "insertCode"
                    ? engTooling.moldInsertCode
                    : key === "bottomName"
                    ? engTooling.moldBottomName
                    : key === "bottomCode"
                    ? engTooling.moldBottomCode
                    : key === "plugAssistName"
                    ? engTooling.plugAssistName
                    : key === "plugAssistCode"
                    ? engTooling.plugAssistCode
                    : key === "cuttingPlateName"
                    ? engTooling.cuttingPlateName
                    : key === "cuttingPlateCode"
                    ? engTooling.cuttingPlateCode
                    : key === "stackingPlateName"
                    ? engTooling.stackingUnitName
                    : key === "stackingPlateCode"
                    ? engTooling.stackingUnitCode
                    : key === "productName"
                    ? project.projectName || requestId
                    : key === "productCode"
                    ? requestId
                    : "";

                return (
                  <div key={key} className="contents">
                    <div className="py-1">{label}</div>
                    <ValueCell value={engineeringValue} />
                    <div>
                      {key === "machineName" ? (
                        <SelectInput
                          value={spec[key]}
                          onChange={(v) => setSpec({ ...spec, [key]: v })}
                          changed={isDifferent(spec[key], engineeringValue)}
                          options={["", "RDM73K", "RDK80"]}
                        />
                      ) : (
                        <TextInput
                          value={spec[key]}
                          onChange={(v) => setSpec({ ...spec, [key]: v })}
                          changed={isDifferent(spec[key], engineeringValue)}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {isDifferent(spec.unitWeight_g, engThermo.unitWeight_g) ? (
              <SectionNote tone="orange">
                Unit weight in this scenario is different from engineering.
              </SectionNote>
            ) : null}

            {isDifferent(spec.cavities, engThermo.cavities) ? (
              <SectionNote tone="orange">
                Cavities in this scenario are different from engineering.
              </SectionNote>
            ) : null}

            {isDifferent(spec.cpm, engThermo.cpm) ? (
              <SectionNote tone="orange">
                CPM in this scenario is different from engineering.
              </SectionNote>
            ) : null}

            {isDifferent(spec.sheetUtilPct, engThermo.sheetUtilizationPct) ? (
              <SectionNote tone="orange">
                Sheet utilization in this scenario is different from engineering.
              </SectionNote>
            ) : null}
          </Card>

          <Card title="Thermo Productivity Summary">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <InfoTile label="Pcs / hr" value={fmt(pcsPerHour)} />
              <InfoTile label="Pcs / shift" value={fmt(pcsPerShift)} />
              <InfoTile label="Pcs / day" value={fmt(pcsPerDay)} />
              <InfoTile label="Pcs / week" value={fmt(pcsPerWeek)} />
              <InfoTile label="Pcs / month" value={fmt(pcsPerMonth)} />
              <InfoTile label="Pcs / year" value={fmt(pcsPerYear)} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <InfoTile label="Required Sheet kg/hr" value={fmt(sheetConsumptionKgPerHour)} />
              <InfoTile label="Required Sheet kg/shift" value={fmt(sheetConsumptionKgPerShift)} />
              <InfoTile label="Required Sheet kg/day" value={fmt(sheetConsumptionKgPerDay)} />
            </div>
          </Card>
        </>
      )}

      {activeTab === "bom" && (
        <>
          <Card title="Sheet Source">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Sheet Cost Source">
                <SelectInput
                  value={spec.sheetSource || "internalExtrusion"}
                  onChange={(v) => setSpec((prev) => ({ ...prev, sheetSource: v }))}
                  options={[
                    { value: "internalExtrusion", label: "Internal Extrusion Cost" },
                    { value: "manual", label: "Manual Sheet Price / Ton" },
                  ]}
                />
              </Field>

              {spec.sheetSource === "manual" && (
                <Field label="Manual Sheet Price / Ton">
                  <NumInput
                    value={spec.manualSheetPricePerTon || ""}
                    onChange={(v) =>
                      setSpec((prev) => ({ ...prev, manualSheetPricePerTon: v }))
                    }
                  />
                </Field>
              )}

              <Field label="Internal Extrusion Price / Ton">
                <ValueCell value={fmt(internalExtrusionCostPerTon)} />
              </Field>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <InfoTile label="Applied Sheet Price / Ton" value={fmt(sheetMaterialCostPerTon)} />
              <InfoTile label="Sheet Cost / 1000 pcs" value={fmt(sheetCostPer1000)} />
              <InfoTile label="Packaging / ton" value={fmt(packagingPerTon)} />
              <InfoTile label="Net Extruder kg/day" value={fmt(netExtruderKgPerDay)} />
            </div>
          </Card>

          <Card title="Thermoformed Product Packaging Data">
            <div className="space-y-6">
              <div>
                <div className="font-medium mb-3">1) Primary Packaging</div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <Field label="Pieces / Stack">
                    <NumInput
                      value={pack.pcsPerStack}
                      onChange={(v) => setPack({ ...pack, pcsPerStack: v })}
                      changed={isDifferent(pack.pcsPerStack, engPack?.primary?.pcsPerStack)}
                    />
                  </Field>

                  <Field label="Stacks / Primary Pack">
                    <NumInput
                      value={pack.stacksPerPrimary}
                      onChange={(v) => setPack({ ...pack, stacksPerPrimary: v })}
                      changed={isDifferent(pack.stacksPerPrimary, engPack?.primary?.stacksPerPrimary)}
                    />
                  </Field>

                  <Field label="Primary Pack Name">
                    <TextInput
                      value={pack.primaryName}
                      onChange={(v) => setPack({ ...pack, primaryName: v })}
                      changed={isDifferent(pack.primaryName, engPack?.primary?.primaryName)}
                    />
                  </Field>

                  <Field label="Primary Length (mm)">
                    <NumInput
                      value={pack.primaryLengthMm}
                      onChange={(v) => setPack({ ...pack, primaryLengthMm: v })}
                      changed={isDifferent(pack.primaryLengthMm, engPack?.primary?.primaryLength_mm)}
                    />
                  </Field>

                  <Field label="Primary Width (mm)">
                    <NumInput
                      value={pack.primaryWidthMm}
                      onChange={(v) => setPack({ ...pack, primaryWidthMm: v })}
                      changed={isDifferent(pack.primaryWidthMm, engPack?.primary?.primaryWidth_mm)}
                    />
                  </Field>

                  <Field label="Primary Height (mm)">
                    <NumInput
                      value={pack.primaryHeightMm}
                      onChange={(v) => setPack({ ...pack, primaryHeightMm: v })}
                      changed={isDifferent(pack.primaryHeightMm, engPack?.primary?.primaryHeight_mm)}
                    />
                  </Field>

                  <Field label="Primary Pack Material">
                    <TextInput
                      value={pack.primaryMaterial}
                      onChange={(v) => setPack({ ...pack, primaryMaterial: v })}
                      changed={isDifferent(pack.primaryMaterial, engPack?.primary?.primaryMaterial)}
                    />
                  </Field>

                  <Field label="Primary Artwork Code">
                    <TextInput
                      value={pack.primaryArtworkCode}
                      onChange={(v) => setPack({ ...pack, primaryArtworkCode: v })}
                      changed={isDifferent(pack.primaryArtworkCode, engPack?.primary?.primaryArtworkCode)}
                    />
                  </Field>

                  <Field label="Primary Price / Unit">
                    <NumInput
                      value={prices.primaryPricePerUnit}
                      onChange={(v) => setPrices({ ...prices, primaryPricePerUnit: v })}
                    />
                  </Field>
                </div>
              </div>

              <div>
                <div className="font-medium mb-3">2) Secondary Packaging</div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <Field label="No. Primary Packs / Secondary">
                    <NumInput
                      value={pack.primariesPerSecondary}
                      onChange={(v) => setPack({ ...pack, primariesPerSecondary: v })}
                      changed={isDifferent(pack.primariesPerSecondary, engPack?.secondary?.primariesPerSecondary)}
                    />
                  </Field>

                  <Field label="Secondary Pack Name">
                    <TextInput
                      value={pack.secondaryName}
                      onChange={(v) => setPack({ ...pack, secondaryName: v })}
                      changed={isDifferent(pack.secondaryName, engPack?.secondary?.secondaryName)}
                    />
                  </Field>

                  <Field label="Secondary Type">
                    <SelectInput
                      value={pack.secondaryType}
                      onChange={(v) => setPack({ ...pack, secondaryType: v })}
                      changed={isDifferent(pack.secondaryType, engPack?.secondary?.secondaryType)}
                      options={["Single wall", "Double wall"]}
                    />
                  </Field>

                  <Field label="Secondary Price / Unit">
                    <NumInput
                      value={prices.secondaryPricePerUnit}
                      onChange={(v) => setPrices({ ...prices, secondaryPricePerUnit: v })}
                    />
                  </Field>

                  <Field label="Secondary L (mm)">
                    <NumInput
                      value={pack.secondaryLengthMm}
                      onChange={(v) => setPack({ ...pack, secondaryLengthMm: v })}
                      changed={isDifferent(pack.secondaryLengthMm, engPack?.secondary?.secondaryLength_mm)}
                    />
                  </Field>

                  <Field label="Secondary W (mm)">
                    <NumInput
                      value={pack.secondaryWidthMm}
                      onChange={(v) => setPack({ ...pack, secondaryWidthMm: v })}
                      changed={isDifferent(pack.secondaryWidthMm, engPack?.secondary?.secondaryWidth_mm)}
                    />
                  </Field>

                  <Field label="Secondary H (mm)">
                    <NumInput
                      value={pack.secondaryHeightMm}
                      onChange={(v) => setPack({ ...pack, secondaryHeightMm: v })}
                      changed={isDifferent(pack.secondaryHeightMm, engPack?.secondary?.secondaryHeight_mm)}
                    />
                  </Field>

                  <Field label="Labels / Secondary">
                    <NumInput
                      value={pack.labelsPerSecondary}
                      onChange={(v) => setPack({ ...pack, labelsPerSecondary: v })}
                      changed={isDifferent(pack.labelsPerSecondary, engPack?.secondary?.labelsPerBox)}
                    />
                  </Field>

                  <Field label="Label L (mm)">
                    <NumInput
                      value={pack.labelLengthMm}
                      onChange={(v) => setPack({ ...pack, labelLengthMm: v })}
                      changed={isDifferent(pack.labelLengthMm, engPack?.secondary?.labelLength_mm)}
                    />
                  </Field>

                  <Field label="Label W (mm)">
                    <NumInput
                      value={pack.labelWidthMm}
                      onChange={(v) => setPack({ ...pack, labelWidthMm: v })}
                      changed={isDifferent(pack.labelWidthMm, engPack?.secondary?.labelWidth_mm)}
                    />
                  </Field>

                  <Field label="Label Price / Secondary">
                    <NumInput
                      value={prices.labelSecondaryPrice}
                      onChange={(v) => setPrices({ ...prices, labelSecondaryPrice: v })}
                    />
                  </Field>
                </div>
              </div>

              <div>
                <div className="font-medium mb-3">3) Pallet</div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <Field label="Use Pallet?">
                    <SelectInput
                      value={pack.usePallet ? "Yes" : "No"}
                      onChange={(v) => setPack({ ...pack, usePallet: v === "Yes" })}
                      options={["Yes", "No"]}
                    />
                  </Field>

                  {pack.usePallet && (
                    <>
                      <Field label="Pallet Width (mm)">
                        <NumInput
                          value={pack.palletWidthMm}
                          onChange={(v) => setPack({ ...pack, palletWidthMm: v })}
                          changed={isDifferent(pack.palletWidthMm, engPack?.pallet?.palletWidth_mm)}
                        />
                      </Field>

                      <Field label="Pallet Length (mm)">
                        <NumInput
                          value={pack.palletLengthMm}
                          onChange={(v) => setPack({ ...pack, palletLengthMm: v })}
                          changed={isDifferent(pack.palletLengthMm, engPack?.pallet?.palletLength_mm)}
                        />
                      </Field>

                      <Field label="Pallet Height (mm)">
                        <NumInput
                          value={pack.palletHeightMm}
                          onChange={(v) => setPack({ ...pack, palletHeightMm: v })}
                          changed={isDifferent(pack.palletHeightMm, engPack?.pallet?.palletHeight_mm)}
                        />
                      </Field>

                      <Field label="Pallet Type">
                        <SelectInput
                          value={pack.palletType}
                          onChange={(v) => setPack({ ...pack, palletType: v })}
                          changed={isDifferent(pack.palletType, engPack?.pallet?.palletType)}
                          options={["", "EURO pallet", "UK standard pallet"]}
                        />
                      </Field>

                      <Field label="Boxes / Pallet">
                        <NumInput
                          value={pack.secondariesPerPallet}
                          onChange={(v) => setPack({ ...pack, secondariesPerPallet: v })}
                          changed={isDifferent(pack.secondariesPerPallet, engPack?.pallet?.boxesPerPallet)}
                        />
                      </Field>

                      <Field label="Stretch kg / Pallet">
                        <NumInput
                          value={pack.stretchKgPerPallet}
                          onChange={(v) => setPack({ ...pack, stretchKgPerPallet: v })}
                          changed={isDifferent(pack.stretchKgPerPallet, engPack?.pallet?.stretchWeightPerPallet_kg)}
                        />
                      </Field>

                      <Field label="Labels / Pallet">
                        <NumInput
                          value={pack.labelsPerPallet}
                          onChange={(v) => setPack({ ...pack, labelsPerPallet: v })}
                          changed={isDifferent(pack.labelsPerPallet, engPack?.pallet?.labelsPerPallet)}
                        />
                      </Field>

                      <Field label="Pallet Price">
                        <NumInput
                          value={prices.palletPrice}
                          onChange={(v) => setPrices({ ...prices, palletPrice: v })}
                        />
                      </Field>

                      <Field label="Label Price / Pallet">
                        <NumInput
                          value={prices.labelPalletPrice}
                          onChange={(v) => setPrices({ ...prices, labelPalletPrice: v })}
                        />
                      </Field>

                      <Field label="Stretch Price / kg">
                        <NumInput
                          value={prices.stretchPricePerKg}
                          onChange={(v) => setPrices({ ...prices, stretchPricePerKg: v })}
                        />
                      </Field>
                    </>
                  )}

                  <Field label="Packaging Notes">
                    <TextInput
                      value={pack.packingNotes}
                      onChange={(v) => setPack({ ...pack, packingNotes: v })}
                    />
                  </Field>
                </div>
              </div>
            </div>

            <SectionNote tone="green">{packagingInstructionText}</SectionNote>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <InfoTile label="Pcs / Stack" value={fmt(pcsPerStack, 0)} />
              <InfoTile label="Stacks / Primary" value={fmt(stacksPerPrimary, 0)} />
              <InfoTile label="Pcs / Primary" value={fmt(pcsPerPrimary, 0)} />
              <InfoTile label="Primaries / Carton" value={fmt(primariesPerSecondary, 0)} />
              <InfoTile label="Pcs / Carton" value={fmt(pcsPerSecondary, 0)} />
              <InfoTile
                label="Pcs / Pallet"
                value={pack.usePallet ? fmt(pcsPerSecondary * secondariesPerPallet, 0) : "—"}
              />
            </div>
          </Card>

          <Card title="Decoration Cost">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Field label="Use Decoration?">
                <SelectInput
                  value={deco.use ? "Yes" : "No"}
                  onChange={(v) => setDeco({ ...deco, use: v === "Yes" })}
                  options={["Yes", "No"]}
                />
              </Field>

              <Field label="Decoration Type">
                <SelectInput
                  value={deco.type}
                  onChange={(v) => setDeco({ ...deco, type: v })}
                  changed={isDifferent(deco.type, engDeco?.enabled ? "Printing" : "")}
                  options={["Printing", "Shrink sleeve", "Hybrid"]}
                />
              </Field>
            </div>

            {deco.use && deco.type === "Printing" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Ink g / 1000 pcs">
                  <NumInput
                    value={deco.printing.ink_g_per_1000}
                    onChange={(v) =>
                      setDeco({
                        ...deco,
                        printing: { ...deco.printing, ink_g_per_1000: v },
                      })
                    }
                  />
                </Field>

                <Field label="Ink Cost / kg">
                  <NumInput
                    value={deco.printing.ink_price_per_kg}
                    onChange={(v) =>
                      setDeco({
                        ...deco,
                        printing: { ...deco.printing, ink_price_per_kg: v },
                      })
                    }
                  />
                </Field>
              </div>
            )}

            {deco.use && deco.type === "Shrink sleeve" && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Field label="Sleeve Weight (g)">
                  <NumInput
                    value={deco.shrink.sleeveWeight_g}
                    onChange={(v) =>
                      setDeco({
                        ...deco,
                        shrink: { ...deco.shrink, sleeveWeight_g: v },
                      })
                    }
                  />
                </Field>

                <Field label="Sleeve Cost / Piece">
                  <NumInput
                    value={deco.shrink.sleeveCostPerPiece}
                    onChange={(v) =>
                      setDeco({
                        ...deco,
                        shrink: { ...deco.shrink, sleeveCostPerPiece: v },
                      })
                    }
                  />
                </Field>

                <Field label="Sleeve Cost / kg">
                  <NumInput
                    value={deco.shrink.sleeveCostPerKg}
                    onChange={(v) =>
                      setDeco({
                        ...deco,
                        shrink: { ...deco.shrink, sleeveCostPerKg: v },
                      })
                    }
                  />
                </Field>

                <Field label="Waste %">
                  <NumInput
                    value={deco.shrink.wastePct}
                    onChange={(v) =>
                      setDeco({
                        ...deco,
                        shrink: { ...deco.shrink, wastePct: v },
                      })
                    }
                  />
                </Field>
              </div>
            )}

            {deco.use && deco.type === "Hybrid" && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Field label="Blank / 1000">
                  <NumInput
                    value={deco.hybrid.blank_per_1000}
                    onChange={(v) =>
                      setDeco({
                        ...deco,
                        hybrid: { ...deco.hybrid, blank_per_1000: v },
                      })
                    }
                  />
                </Field>

                <Field label="Bottom / 1000">
                  <NumInput
                    value={deco.hybrid.bottom_per_1000}
                    onChange={(v) =>
                      setDeco({
                        ...deco,
                        hybrid: { ...deco.hybrid, bottom_per_1000: v },
                      })
                    }
                  />
                </Field>

                <Field label="Glue g / 1000">
                  <NumInput
                    value={deco.hybrid.glue_g_per_1000}
                    onChange={(v) =>
                      setDeco({
                        ...deco,
                        hybrid: { ...deco.hybrid, glue_g_per_1000: v },
                      })
                    }
                  />
                </Field>

                <Field label="Glue Cost / kg">
                  <NumInput
                    value={deco.hybrid.glue_price_per_kg}
                    onChange={(v) =>
                      setDeco({
                        ...deco,
                        hybrid: { ...deco.hybrid, glue_price_per_kg: v },
                      })
                    }
                  />
                </Field>
              </div>
            )}

            <SectionNote tone="green">
              Decoration cost / 1000 pcs = {fmt(decorationPer1000)} {currency}
            </SectionNote>
          </Card>

          <Card title="Working Capital Cost">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <Field label="DSO">
                <NumInput value={finance.DSO} onChange={(v) => setFinance({ ...finance, DSO: v })} />
              </Field>

              <Field label="DIO">
                <NumInput value={finance.DIO} onChange={(v) => setFinance({ ...finance, DIO: v })} />
              </Field>

              <Field label="DPO">
                <NumInput value={finance.DPO} onChange={(v) => setFinance({ ...finance, DPO: v })} />
              </Field>

              <Field label="Interest %">
                <NumInput
                  value={finance.interestPct}
                  onChange={(v) => setFinance({ ...finance, interestPct: v })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <InfoTile label="Sheet Cost / 1000" value={fmt(sheetCostPer1000)} />
              <InfoTile label="Packaging / 1000" value={fmt(packagingPer1000)} />
              <InfoTile label="Decoration / 1000" value={fmt(decorationPer1000)} />
              <InfoTile label="Working Cap / 1000" value={fmt(workingCapPer1000)} />
            </div>
          </Card>

          <Card title="Freight Cost">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {pack.usePallet ? (
                <Field label="Pallets / Truck">
                  <NumInput
                    value={finance.palletsPerTruck}
                    onChange={(v) => setFinance({ ...finance, palletsPerTruck: v })}
                  />
                </Field>
              ) : (
                <Field label="Cartons / Truck">
                  <NumInput
                    value={finance.cartonsPerTruck}
                    onChange={(v) => setFinance({ ...finance, cartonsPerTruck: v })}
                  />
                </Field>
              )}

              <Field label="Freight Cost / Trip">
                <NumInput
                  value={finance.freightCostPerTrip}
                  onChange={(v) => setFinance({ ...finance, freightCostPerTrip: v })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <InfoTile
                label="Pallets / Truck"
                value={pack.usePallet ? fmt(palletsPerTruck, 0) : "—"}
              />
              <InfoTile label="Cartons / Truck" value={fmt(cartonsPerTruck, 0)} />
              <InfoTile label="Pcs / Truck" value={fmt(pcsPerTruck, 0)} />
              <InfoTile
                label="Net Product Weight / Truck (kg)"
                value={fmt(netProductWeightPerTruckKg, 3)}
              />
              <InfoTile
                label="Freight Cost / 1000 pcs"
                value={fmt(freightCostPer1000, 3)}
              />
            </div>
          </Card>
        </>
      )}

      {activeTab === "investments" && (
        <Card title="Investments">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <SectionNote tone="gray">
              Investments are pulled from Engineering Review and can be extended here.
            </SectionNote>

            <button
              type="button"
              onClick={addInvestmentRow}
              className="px-4 py-2 rounded-md bg-black text-white hover:bg-gray-800"
            >
              + Add Investment
            </button>
          </div>

          {investRows.length === 0 ? (
            <div className="text-sm text-gray-500">No investments added yet.</div>
          ) : (
            <div className="space-y-3">
              {investRows.map((row, index) => (
                <div key={index} className="rounded-xl border p-3">
                  <div className="grid grid-cols-1 md:grid-cols-9 gap-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Investment Name</div>
                      <TextInput
                        value={row.name || ""}
                        onChange={(v) => updateInvestmentRow(index, { name: v })}
                      />
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 mb-1">Type</div>
                      <TextInput
                        value={row.type || ""}
                        onChange={(v) => updateInvestmentRow(index, { type: v })}
                      />
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 mb-1">Value</div>
                      <NumInput
                        value={row.value || ""}
                        onChange={(v) => updateInvestmentRow(index, { value: v })}
                      />
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 mb-1">Currency</div>
                      <SelectInput
                        value={row.currency || "EGP"}
                        onChange={(v) => updateInvestmentRow(index, { currency: v })}
                        options={["EGP", "USD", "EUR"]}
                      />
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 mb-1">Exchange Rate</div>
                      <NumInput
                        value={row.exchangeRate || ""}
                        onChange={(v) => updateInvestmentRow(index, { exchangeRate: v })}
                      />
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 mb-1">Supplier</div>
                      <TextInput
                        value={row.supplier || ""}
                        onChange={(v) => updateInvestmentRow(index, { supplier: v })}
                      />
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 mb-1">Lead Time (weeks)</div>
                      <NumInput
                        value={row.leadTimeWeeks || ""}
                        onChange={(v) => updateInvestmentRow(index, { leadTimeWeeks: v })}
                      />
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 mb-1">Amortize</div>
                      <SelectInput
                        value={row.amortize ? "Yes" : "No"}
                        onChange={(v) =>
                          updateInvestmentRow(index, {
                            amortize: v === "Yes",
                          })
                        }
                        options={["No", "Yes"]}
                      />
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 mb-1">
                        Amortization Qty (pcs)
                      </div>
                      <NumInput
                        value={row.amortizationQty || ""}
                        onChange={(v) =>
                          updateInvestmentRow(index, {
                            amortizationQty: v,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => removeInvestmentRow(index)}
                      className="text-red-600 hover:underline text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <SectionNote tone="green">
              Total Investment Cost = {fmt(totalInvestEGP, 2)} EGP
            </SectionNote>

            <SectionNote tone="orange">
              Non-Amortized Investment Cost = {fmt(nonAmortizedInvestmentCost, 2)} EGP
            </SectionNote>

            <SectionNote tone="green">
              Amortization Cost / 1000 pcs = {fmt(amortizationCostPer1000, 3)} EGP
            </SectionNote>
          </div>
        </Card>
      )}

      {activeTab === "results" && (
        <>
          <Card title="Sheet Info / BOM">
            <div className="max-h-40 overflow-auto border rounded p-2 bg-white text-sm">
              {bomPerTon.map((x) => (
                <div key={x.name} className="flex justify-between">
                  <span>{x.name}</span>
                  <span>{fmt(x.kg)} kg/ton</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
              <InfoTile label="Sheet Material / ton" value={fmt(sheetMaterialCostPerTon)} />
              <InfoTile label="Packaging / ton" value={fmt(packagingPerTon)} />
              <InfoTile label="Net Extruder kg/hr" value={fmt(netExtruderKgPerHour)} />
              <InfoTile label="Net Extruder kg/day" value={fmt(netExtruderKgPerDay)} />
              <InfoTile
                label="Payback Qty (pcs)"
                value={fmt(totalInvestEGP && effectiveConversionPer1000 > 0 ? paybackQtyPcs : 0, 0)}
              />
            </div>
          </Card>

          <Card title="Results Input Logic">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Calculation Mode">
                <SelectInput
                  value={resultsMode}
                  onChange={setResultsMode}
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

              {resultsMode === "extrusionPerDay" && (
                <Field label="Required Extrusion Conversion / Day">
                  <NumInput
                    value={resultsInput.requiredExtrusionConversionPerDay}
                    onChange={(v) =>
                      setResultsInput((prev) => ({
                        ...prev,
                        requiredExtrusionConversionPerDay: v,
                      }))
                    }
                  />
                </Field>
              )}

              {resultsMode === "thermoPerDay" && (
                <Field label="Required Thermoforming Conversion / Day">
                  <NumInput
                    value={resultsInput.requiredThermoConversionPerDay}
                    onChange={(v) =>
                      setResultsInput((prev) => ({
                        ...prev,
                        requiredThermoConversionPerDay: v,
                      }))
                    }
                  />
                </Field>
              )}

              {resultsMode === "conversionPer1000" && (
                <Field label="Required Conversion Cost / 1000 pcs">
                  <NumInput
                    value={resultsInput.requiredConversionCostPer1000}
                    onChange={(v) =>
                      setResultsInput((prev) => ({
                        ...prev,
                        requiredConversionCostPer1000: v,
                      }))
                    }
                  />
                </Field>
              )}

              {resultsMode === "sellingPricePer1000" && (
                <Field label="Required Selling Price / 1000 pcs">
                  <NumInput
                    value={resultsInput.requiredSellingPricePer1000}
                    onChange={(v) =>
                      setResultsInput((prev) => ({
                        ...prev,
                        requiredSellingPricePer1000: v,
                      }))
                    }
                  />
                </Field>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3">
              <InfoTile
                label="Extrusion Productivity / Day"
                value={`${fmt(resultsDerived.extrusionProductivityTonPerDay, 3)} ton/day`}
              />
              <InfoTile
                label="Thermo Productivity / Day"
                value={`${fmt(resultsDerived.thermoProductivityPcsPerDay, 0)} pcs/day`}
              />
              <InfoTile
                label="Thermo Tons Consumed / Day"
                value={`${fmt(resultsDerived.thermoConsumptionTonPerDay, 3)} ton/day`}
              />
              <InfoTile
                label="Required Conversion Cost / 1000 pcs"
                value={fmt(resultsDerived.requiredConversionCostPer1000, 3)}
              />
              <InfoTile
                label="Required Thermo Conversion / Day"
                value={fmt(resultsDerived.requiredThermoConversionPerDay, 3)}
              />
              <InfoTile
                label="Required Extrusion Conversion / Day"
                value={fmt(resultsDerived.requiredExtrusionConversionPerDay, 3)}
              />
              <InfoTile
                label="Required Selling Price / 1000 pcs"
                value={fmt(resultsDerived.requiredSellingPricePer1000, 3)}
              />
            </div>
          </Card>

          <Card title="Thermo Results Breakdown">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Material Cost / 1000 pcs</span>
                <span>{fmt(sheetCostPer1000)}</span>
              </div>
              <div className="flex justify-between">
                <span>Packaging Cost / 1000 pcs</span>
                <span>{fmt(packagingPer1000)}</span>
              </div>
              <div className="flex justify-between">
                <span>Decoration Cost / 1000 pcs</span>
                <span>{fmt(decorationPer1000)}</span>
              </div>
              <div className="flex justify-between">
                <span>Waste Cost / 1000 pcs</span>
                <span>{fmt(wasteCostPer1000)}</span>
              </div>
              <div className="flex justify-between">
                <span>Working Capital Cost / 1000 pcs</span>
                <span>{fmt(workingCapPer1000)}</span>
              </div>
              <div className="flex justify-between">
                <span>Freight Cost / 1000 pcs</span>
                <span>{fmt(freightCostPer1000)}</span>
              </div>
              <div className="flex justify-between">
                <span>Amortization Cost / 1000 pcs</span>
                <span>{fmt(amortizationCostPer1000)}</span>
              </div>
              <div className="flex justify-between">
                <span>Conversion Cost / 1000 pcs</span>
                <span>{fmt(resultsDerived.requiredConversionCostPer1000)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Selling Price / 1000 pcs</span>
                <span>{fmt(resultsDerived.requiredSellingPricePer1000)}</span>
              </div>
            </div>
          </Card>

          <Card title="Results Summary">
            <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
              <InfoTile label="Sheet Cost / 1000" value={fmt(sheetCostPer1000)} />
              <InfoTile label="Packaging / 1000" value={fmt(packagingPer1000)} />
              <InfoTile label="Decoration / 1000" value={fmt(decorationPer1000)} />
              <InfoTile label="Working Cap / 1000" value={fmt(workingCapPer1000)} />
              <InfoTile label="Freight / 1000" value={fmt(freightCostPer1000)} />
              <InfoTile
                label="Conversion / 1000"
                value={fmt(resultsDerived.requiredConversionCostPer1000)}
              />
              <InfoTile label="Amortization / 1000" value={fmt(amortizationCostPer1000)} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              <InfoTile label="Pallets / Truck" value={pack.usePallet ? fmt(palletsPerTruck, 0) : "—"} />
              <InfoTile label="Cartons / Truck" value={fmt(cartonsPerTruck, 0)} />
              <InfoTile label="Pcs / Truck" value={fmt(pcsPerTruck, 0)} />
              <InfoTile label="Net Product Weight / Truck (kg)" value={fmt(netProductWeightPerTruckKg, 3)} />
            </div>

            <SectionNote tone="green">
              Selling Price / 1000 pcs = {fmt(resultsDerived.requiredSellingPricePer1000)} {currency}
            </SectionNote>
          </Card>
        </>
      )}
    </div>
  );
}