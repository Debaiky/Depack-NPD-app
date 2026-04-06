import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

const EMPTY_SETUP = {
  scenarioName: "",
  createdBy: "",
  scenarioStatus: "Draft",
  scenarioNote: "",
  currency: "",
  usdEgp: "",
  eurUsd: "",
  compareSelected: false,
};

const toNum = (v) => {
  const n = parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isNaN(n) ? 0 : n;
};

const fmt = (v, d = 3) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: d,
    minimumFractionDigits: 0,
  }).format(v || 0);

const displayValue = (v) => {
  if (v === null || v === undefined || String(v).trim() === "") return "—";
  return String(v);
};

const isDifferent = (a, b) => String(a ?? "").trim() !== String(b ?? "").trim();

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
    blue: "border-blue-200 bg-blue-50 text-blue-700",
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

function RefValues({ engineeringValue, requestValue, changed }) {
  return (
    <div className="mt-1 grid grid-cols-1 gap-1">
      <div
        className={`text-[11px] ${
          changed ? "text-red-600 font-medium" : "text-gray-500"
        }`}
      >
        Engineering Review: {displayValue(engineeringValue)}
      </div>
      <div className="text-[11px] text-gray-500">
        Request Initiation: {displayValue(requestValue)}
      </div>
    </div>
  );
}

function parsePricingJson(jsonValue) {
  try {
    if (!jsonValue) return {};
    return typeof jsonValue === "string" ? JSON.parse(jsonValue) : jsonValue;
  } catch {
    return {};
  }
}

function normalizeYesNo(value, fallback = "No") {
  const str = String(value ?? "").trim().toLowerCase();
  if (["yes", "true", "1"].includes(str)) return "Yes";
  if (["no", "false", "0"].includes(str)) return "No";
  return fallback;
}

function inferProductClass(productType = "") {
  return String(productType || "").trim().toLowerCase() === "sheet roll"
    ? "Sheet Roll"
    : "Non-Sheet Product";
}

function convertToEgp(amount, currency, usdEgp, eurUsd) {
  const val = toNum(amount);
  const curr = String(currency || "EGP").toUpperCase();

  if (!val) return 0;
  if (curr === "EGP") return val;
  if (curr === "USD") return val * toNum(usdEgp);
  if (curr === "EUR") return val * toNum(eurUsd) * toNum(usdEgp);

  return val;
}

function buildEngineeringReference(requestData, engineeringData, requestId) {
  const product = requestData?.product || {};
  const project = requestData?.project || {};
  const requestPackaging = requestData?.packaging || {};

  const materialSheet = engineeringData?.materialSheet || {};
  const sheetSpecs = engineeringData?.sheetSpecs || {};
  const extrusion = engineeringData?.extrusion || {};
  const thermo = engineeringData?.thermo || {};
  const packaging = engineeringData?.packaging || {};
  const sheetPackaging = engineeringData?.sheetPackaging || {};
  const freight = engineeringData?.freight || {};

  const layerAPct = materialSheet.layerAPct || "";
  const layerBPct =
    materialSheet.layerBPct ||
    (layerAPct !== "" ? String(Math.max(0, 100 - toNum(layerAPct))) : "");

  return {
    productName: project.projectName || requestId,
    productType: product.productType || "",
    pricingProductClass: inferProductClass(product.productType),
    baseMaterial:
      materialSheet.baseMaterial || product.sheetMaterial || product.productMaterial || "",
    density: materialSheet.density || "",
    layerStructure: materialSheet.structure || "AB",
    layerAPct,
    layerBPct,
    coatingUsed: normalizeYesNo(materialSheet.coatingUsed, "No"),
    coatingName: materialSheet.coatingName || "",
    coatingWeight_g_m2: materialSheet.coatingWeight_g_m2 || "",
    decorationType:
      requestData?.decoration?.decorationType ||
      (engineeringData?.decorationEngineering?.enabled ? "Printing" : "No decoration"),
    netWidth_mm: sheetSpecs.netWidth_mm || "",
    grossWidth_mm: sheetSpecs.grossWidth_mm || "",
    edgeTrimPerSide_mm: sheetSpecs.edgeTrimPerSide_mm || "",
    thickness_mic: sheetSpecs.thickness_mic || product.sheetThicknessMicron || "",
    rollWeight_kg:
      sheetSpecs.rollTargetWeight_kg || sheetSpecs.rollWeight_kg || product.rollWeightKg || "",
    rollDiameter_mm: sheetSpecs.rollDiameter_mm || "",
    coreType: sheetSpecs.coreType || product.coreMaterial || "",
    coreDiameter_mm: sheetSpecs.coreDiameter_mm || "",
    grossSpeedA_kg_hr: extrusion.grossSpeedA_kg_hr || extrusion.grossSpeed_kg_hr || "",
    grossSpeedB_kg_hr: extrusion.grossSpeedB_kg_hr || "",
    extrusionEfficiencyPct: extrusion.efficiencyPct || "",
    unitWeight_g: thermo.unitWeight_g || product.productWeightG || "",
    cavities: thermo.cavities || "",
    cpm: thermo.cpm || "",
    thermoEfficiencyPct: thermo.efficiencyPct || "",
    sheetUtilizationPct:
      thermo.sheetUtilizationPct ||
      extrusion.netEfficiencyPct ||
      extrusion.sheetUtilizationPct ||
      "",
    machineName: thermo.machineName || "",
    rollsPerPallet: sheetPackaging.rollsPerPallet || "",
    labelsPerRoll: sheetPackaging.labelsPerRoll || "",
    separatorsPerPallet: sheetPackaging.separatorsPerPallet || "",
    strapLength_m: sheetPackaging.strapLength_m || "",
    foamLength_m: sheetPackaging.foamLength_m || "",
    stretchKgPerPallet:
      sheetPackaging.stretchKgPerPallet ||
      packaging?.pallet?.stretchWeightPerPallet_kg ||
      requestPackaging?.pallet?.stretchWrapKgPerPallet ||
      "",
    pcsPerStack:
      packaging?.primary?.pcsPerStack || requestPackaging?.primary?.pcsPerStack || "",
    stacksPerBag:
      packaging?.primary?.stacksPerPrimary || requestPackaging?.primary?.stacksPerBag || "",
    bagsPerCarton:
      packaging?.secondary?.primariesPerSecondary ||
      requestPackaging?.secondary?.bagsPerCarton ||
      "",
    cartonsPerPallet:
      packaging?.pallet?.boxesPerPallet || requestPackaging?.pallet?.cartonsPerPallet || "",
    palletType:
      packaging?.pallet?.palletType ||
      requestPackaging?.pallet?.palletType ||
      sheetPackaging?.palletType ||
      "",
    palletUsed:
      normalizeYesNo(
        packaging?.pallet?.palletSelected ||
          (requestPackaging?.pallet ? "Yes" : "") ||
          (sheetPackaging?.rollsPerPallet ? "Yes" : ""),
        "No"
      ),
    truckContainerSize: freight.truckContainerSize || freight.containerSize || "",
    qtyPerTripTon:
      freight.netProductWeightPerTruck_kg
        ? String(toNum(freight.netProductWeightPerTruck_kg) / 1000)
        : "",
    qtyPerTripPcs: freight.qtyPerTruck_pcs || freight.qtyPerContainer_pcs || "",
  };
}

function buildRequestReference(requestData, requestId) {
  const product = requestData?.product || {};
  const project = requestData?.project || {};
  const requestPackaging = requestData?.packaging || {};

  return {
    productName: project.projectName || requestId,
    productType: product.productType || "",
    pricingProductClass: inferProductClass(product.productType),
    baseMaterial: product.sheetMaterial || product.productMaterial || "",
    density: "",
    layerStructure: "AB",
    layerAPct: "",
    layerBPct: "",
    coatingUsed: "No",
    coatingName: "",
    coatingWeight_g_m2: "",
    decorationType: requestData?.decoration?.decorationType || "",
    netWidth_mm: product.sheetWidthMm || "",
    grossWidth_mm: "",
    edgeTrimPerSide_mm: "",
    thickness_mic: product.sheetThicknessMicron || "",
    rollWeight_kg: product.rollWeightKg || "",
    rollDiameter_mm: "",
    coreType: product.coreMaterial || "",
    coreDiameter_mm: "",
    grossSpeedA_kg_hr: "",
    grossSpeedB_kg_hr: "",
    extrusionEfficiencyPct: "",
    unitWeight_g: product.productWeightG || "",
    cavities: "",
    cpm: "",
    thermoEfficiencyPct: "",
    sheetUtilizationPct: "",
    machineName: "",
    rollsPerPallet: "",
    labelsPerRoll: "",
    separatorsPerPallet: "",
    strapLength_m: "",
    foamLength_m: "",
    stretchKgPerPallet: requestPackaging?.pallet?.stretchWrapKgPerPallet || "",
    pcsPerStack: requestPackaging?.primary?.pcsPerStack || "",
    stacksPerBag: requestPackaging?.primary?.stacksPerBag || "",
    bagsPerCarton: requestPackaging?.secondary?.bagsPerCarton || "",
    cartonsPerPallet: requestPackaging?.pallet?.cartonsPerPallet || "",
    palletType: requestPackaging?.pallet?.palletType || "",
    palletUsed: requestPackaging?.pallet ? "Yes" : "No",
    truckContainerSize: "",
    qtyPerTripTon: "",
    qtyPerTripPcs: "",
  };
}

function buildInitialEngineeringScenario(requestData, engineeringData, requestId) {
  return buildEngineeringReference(requestData, engineeringData, requestId);
}

function buildInitialMaterialLines(engineeringData) {
  const ms = engineeringData?.materialSheet || {};
  const grouped = new Map();

  const addRows = (rows, layerKey) => {
    (rows || []).forEach((row, idx) => {
      const name = String(row?.name || "").trim();
      if (!name) return;

      if (!grouped.has(name)) {
        grouped.set(name, {
          id: `${layerKey}-${idx}-${name}`.replace(/\s+/g, "-"),
          name,
          pctLayerA: 0,
          pctLayerB: 0,
          isCoating: false,
          wastePct: "",
          unitPrice: "",
          currency: "EGP",
        });
      }

      const item = grouped.get(name);
      if (layerKey === "A") item.pctLayerA += toNum(row?.pct);
      if (layerKey === "B") item.pctLayerB += toNum(row?.pct);
    });
  };

  addRows(ms.layerA || [], "A");
  addRows(ms.layerB || [], "B");

  if (normalizeYesNo(ms.coatingUsed, "No") === "Yes" && ms.coatingName) {
    grouped.set(`coating-${ms.coatingName}`, {
      id: `coating-${String(ms.coatingName).replace(/\s+/g, "-")}`,
      name: ms.coatingName,
      pctLayerA: 0,
      pctLayerB: 0,
      isCoating: true,
      wastePct: "",
      unitPrice: "",
      currency: "EGP",
    });
  }

  return Array.from(grouped.values());
}

function buildDefaultPackagingLines() {
  return [
    { id: "core", name: "Core", unit: "unit", unitPrice: "", currency: "EGP", wastePct: "" },
    {
      id: "roll-labels",
      name: "Roll Labels",
      unit: "unit",
      unitPrice: "",
      currency: "EGP",
      wastePct: "",
    },
    {
      id: "separator",
      name: "Separator",
      unit: "unit",
      unitPrice: "",
      currency: "EGP",
      wastePct: "",
    },
    { id: "strap", name: "Strap", unit: "m", unitPrice: "", currency: "EGP", wastePct: "" },
    { id: "foam", name: "Foam Sheet", unit: "m", unitPrice: "", currency: "EGP", wastePct: "" },
    {
      id: "stretch",
      name: "Stretch Film",
      unit: "kg",
      unitPrice: "",
      currency: "EGP",
      wastePct: "",
    },
    {
      id: "pallet",
      name: "Pallet",
      unit: "unit",
      unitPrice: "",
      currency: "EGP",
      wastePct: "",
    },
    { id: "bag", name: "Bag", unit: "unit", unitPrice: "", currency: "EGP", wastePct: "" },
    {
      id: "carton",
      name: "Carton",
      unit: "unit",
      unitPrice: "",
      currency: "EGP",
      wastePct: "",
    },
    {
      id: "product-label",
      name: "Label",
      unit: "unit",
      unitPrice: "",
      currency: "EGP",
      wastePct: "",
    },
    { id: "tape", name: "Tape", unit: "unit", unitPrice: "", currency: "EGP", wastePct: "" },
  ];
}

function extractFreightOptions(requestData, engineeringData, engineeringScenario) {
  const freight = engineeringData?.freight || {};
  const rawOptions = [];

  if (Array.isArray(freight.options)) rawOptions.push(...freight.options);
  if (Array.isArray(freight.truckOptions)) rawOptions.push(...freight.truckOptions);
  if (Array.isArray(freight.containerOptions)) rawOptions.push(...freight.containerOptions);

  const normalized = rawOptions
    .map((opt, idx) => ({
      id: opt.id || opt.optionId || `opt-${idx + 1}`,
      label:
        opt.label ||
        opt.name ||
        opt.truckContainerSize ||
        opt.containerSize ||
        opt.truckSize ||
        `Option ${idx + 1}`,
      qtyTon:
        opt.qtyTon ||
        opt.qty_per_trip_ton ||
        (opt.netProductWeightPerTruck_kg
          ? toNum(opt.netProductWeightPerTruck_kg) / 1000
          : opt.qty_per_trip_kg
          ? toNum(opt.qty_per_trip_kg) / 1000
          : ""),
      qtyPcs: opt.qtyPcs || opt.qty_per_trip_pcs || "",
    }))
    .filter((opt) => opt.label);

  if (normalized.length > 0) return normalized;

  return [
    {
      id: "default",
      label:
        engineeringScenario?.truckContainerSize ||
        freight.truckContainerSize ||
        freight.containerSize ||
        "Default Trip Option",
      qtyTon:
        engineeringScenario?.qtyPerTripTon ||
        (freight.netProductWeightPerTruck_kg
          ? toNum(freight.netProductWeightPerTruck_kg) / 1000
          : ""),
      qtyPcs:
        engineeringScenario?.qtyPerTripPcs ||
        freight.qtyPerTruck_pcs ||
        freight.qtyPerContainer_pcs ||
        "",
    },
  ];
}

function buildInitialBomScenario(requestData, engineeringData, engineeringScenario) {
  const freightOptions = extractFreightOptions(requestData, engineeringData, engineeringScenario);

  return {
    materialLines: buildInitialMaterialLines(engineeringData),
    packagingLines: buildDefaultPackagingLines(),
    decoration: {
      printingInkGPer1000: "",
      printingInkCostPerKg: "",
      sleeveCostPer1000: "",
      hybridBlankCostPerPiece: "",
      hybridBottomCostPerPiece: "",
    },
    workingCapital: {
      DSO: "0",
      DIO: "30",
      DPO: "30",
      interestPct: "0",
    },
    freight: {
      selectedOptionId: freightOptions[0]?.id || "default",
      costPerTrip: "",
      options: freightOptions,
    },
  };
}

function buildInitialInvestmentRows(engineeringData) {
  return (engineeringData?.investments || []).map((row, idx) => ({
    id: row.id || `eng-invest-${idx + 1}`,
    name: row.name || row.investmentName || "",
    type: row.type || "",
    value: row.value || row.cost || "",
    currency: row.currency || "EGP",
    exchangeRate: row.exchangeRate || "",
    supplier: row.supplier || "",
    leadTimeWeeks: row.leadTimeWeeks || "",
    amortize: row.amortize === true,
    amortizationQty: row.amortizationQty || "",
  }));
}

function buildInitialInvestmentsScenario(engineeringData) {
  return {
    rows: buildInitialInvestmentRows(engineeringData),
  };
}

const ENGINEERING_GROUPS = [
  {
    title: "General Product Data",
    fields: [
      { key: "productName", label: "Product Name", type: "text" },
      { key: "productType", label: "Product Type", type: "text" },
      {
        key: "pricingProductClass",
        label: "Pricing Product Class",
        type: "select",
        options: ["Sheet Roll", "Non-Sheet Product"],
      },
      {
        key: "baseMaterial",
        label: "Base Material",
        type: "select",
        options: ["", "PP", "PET", "PS", "Other"],
      },
      { key: "density", label: "Density", type: "number" },
      {
        key: "layerStructure",
        label: "Layer Structure",
        type: "select",
        options: ["Mono", "AB", "ABA", "ABC"],
      },
      { key: "layerAPct", label: "Layer A %", type: "number" },
      { key: "layerBPct", label: "Layer B %", type: "number" },
      {
        key: "coatingUsed",
        label: "Coating Used",
        type: "select",
        options: ["Yes", "No"],
      },
      { key: "coatingName", label: "Coating Name", type: "text" },
      { key: "coatingWeight_g_m2", label: "Coating Weight (g/m²)", type: "number" },
      { key: "decorationType", label: "Decoration Type", type: "text" },
    ],
  },
  {
    title: "Sheet / Extrusion Assumptions",
    fields: [
      { key: "netWidth_mm", label: "Net Width (mm)", type: "number" },
      { key: "grossWidth_mm", label: "Gross Width (mm)", type: "number" },
      { key: "edgeTrimPerSide_mm", label: "Edge Trim / Side (mm)", type: "number" },
      { key: "thickness_mic", label: "Thickness (mic)", type: "number" },
      { key: "rollWeight_kg", label: "Roll Weight (kg)", type: "number" },
      { key: "rollDiameter_mm", label: "Roll Diameter (mm)", type: "number" },
      { key: "coreType", label: "Core Type", type: "text" },
      { key: "coreDiameter_mm", label: "Core Diameter (mm)", type: "number" },
      { key: "grossSpeedA_kg_hr", label: "Gross Speed A (kg/hr)", type: "number" },
      { key: "grossSpeedB_kg_hr", label: "Gross Speed B (kg/hr)", type: "number" },
      { key: "extrusionEfficiencyPct", label: "Extrusion Efficiency %", type: "number" },
    ],
  },
  {
    title: "Thermoforming Assumptions",
    fields: [
      { key: "unitWeight_g", label: "Unit Weight (g)", type: "number" },
      { key: "cavities", label: "Cavities", type: "number" },
      { key: "cpm", label: "CPM", type: "number" },
      { key: "thermoEfficiencyPct", label: "Thermo Efficiency %", type: "number" },
      { key: "sheetUtilizationPct", label: "Sheet Utilization %", type: "number" },
      { key: "machineName", label: "Machine Name", type: "text" },
    ],
  },
  {
    title: "Packaging Assumptions",
    fields: [
      { key: "rollsPerPallet", label: "Rolls / Pallet", type: "number" },
      { key: "labelsPerRoll", label: "Labels / Roll", type: "number" },
      { key: "separatorsPerPallet", label: "Separators / Pallet", type: "number" },
      { key: "strapLength_m", label: "Strap Length / Pallet (m)", type: "number" },
      { key: "foamLength_m", label: "Foam Length / Pallet (m)", type: "number" },
      { key: "stretchKgPerPallet", label: "Stretch kg / Pallet", type: "number" },
      { key: "pcsPerStack", label: "Pieces / Stack", type: "number" },
      { key: "stacksPerBag", label: "Stacks / Bag", type: "number" },
      { key: "bagsPerCarton", label: "Bags / Carton", type: "number" },
      { key: "cartonsPerPallet", label: "Cartons / Pallet", type: "number" },
      { key: "palletType", label: "Pallet Type", type: "text" },
      {
        key: "palletUsed",
        label: "Pallet Used",
        type: "select",
        options: ["Yes", "No"],
      },
    ],
  },
  {
    title: "Freight Reference Assumptions",
    fields: [
      { key: "truckContainerSize", label: "Truck / Container Size", type: "text" },
      { key: "qtyPerTripTon", label: "Qty per Trip (Ton)", type: "number" },
      { key: "qtyPerTripPcs", label: "Qty per Trip (Pcs)", type: "number" },
    ],
  },
];

export default function PricingPage() {
  const { requestId, pricingId } = useParams();

  const [requestData, setRequestData] = useState(null);
  const [engineeringData, setEngineeringData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [activeTab, setActiveTab] = useState("engineering");

  const [scenarioSetup, setScenarioSetup] = useState(EMPTY_SETUP);
  const [engineeringScenario, setEngineeringScenario] = useState({});
  const [bomScenario, setBomScenario] = useState(null);
  const [investmentsScenario, setInvestmentsScenario] = useState(null);
  const [resultsScenario, setResultsScenario] = useState({});

  useEffect(() => {
    const remembered = localStorage.getItem("pricingCreatedBy") || "";
    setScenarioSetup((prev) => ({
      ...prev,
      createdBy: prev.createdBy || remembered,
    }));
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const [reqRes, engRes, scRes] = await Promise.all([
          fetch(`/.netlify/functions/get-request?requestId=${requestId}`),
          fetch(`/.netlify/functions/get-engineering-data?requestId=${requestId}`),
          fetch(`/.netlify/functions/get-pricing-scenario?pricingId=${pricingId}`),
        ]);

        const reqJson = await reqRes.json();
        const engJson = await engRes.json();
        const scJson = await scRes.json();

        const reqPayload = reqJson.success ? reqJson.payload || {} : {};
        const engPayload = engJson.success ? engJson.engineeringData || {} : {};

        setRequestData(reqPayload);
        setEngineeringData(engPayload);

        const initialEngineeringScenario = buildInitialEngineeringScenario(
          reqPayload,
          engPayload,
          requestId
        );

        if (scJson.success) {
          const pricingData = parsePricingJson(scJson.pricingData);
          const savedSetup = pricingData?.scenarioSetup || {};

          setScenarioSetup({
            scenarioName:
              savedSetup.scenarioName || scJson.scenario?.ScenarioName || "",
            createdBy:
              savedSetup.createdBy ||
              scJson.scenario?.CreatedBy ||
              localStorage.getItem("pricingCreatedBy") ||
              "",
            scenarioStatus:
              savedSetup.scenarioStatus || scJson.scenario?.ScenarioStatus || "Draft",
            scenarioNote:
              savedSetup.scenarioNote || scJson.scenario?.ScenarioNote || "",
            currency:
              savedSetup.currency || scJson.scenario?.ScenarioCurrency || "",
            usdEgp: savedSetup.usdEgp || scJson.scenario?.UsdEgp || "",
            eurUsd: savedSetup.eurUsd || scJson.scenario?.EurUsd || "",
            compareSelected:
              savedSetup.compareSelected === true ||
              scJson.scenario?.CompareSelected === "Yes",
          });

          const resolvedEngineeringScenario =
            pricingData?.engineeringScenario || initialEngineeringScenario;

          setEngineeringScenario(resolvedEngineeringScenario);

          setBomScenario(
            pricingData?.bomScenario ||
              buildInitialBomScenario(reqPayload, engPayload, resolvedEngineeringScenario)
          );

          setInvestmentsScenario(
            pricingData?.investmentsScenario || buildInitialInvestmentsScenario(engPayload)
          );

          setResultsScenario(pricingData?.resultsScenario || {});
        } else {
          setScenarioSetup((prev) => ({
            ...prev,
            scenarioName: "",
            scenarioStatus: "Draft",
          }));
          setEngineeringScenario(initialEngineeringScenario);
          setBomScenario(buildInitialBomScenario(reqPayload, engPayload, initialEngineeringScenario));
          setInvestmentsScenario(buildInitialInvestmentsScenario(engPayload));
          setResultsScenario({});
        }
      } catch (error) {
        console.error("Failed to load pricing scenario:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [pricingId, requestId]);

  const engineeringReference = useMemo(() => {
    return buildEngineeringReference(requestData || {}, engineeringData || {}, requestId);
  }, [engineeringData, requestData, requestId]);

  const requestReference = useMemo(() => {
    return buildRequestReference(requestData || {}, requestId);
  }, [requestData, requestId]);

  const changeSummary = useMemo(() => {
    const changes = [];

    ENGINEERING_GROUPS.forEach((group) => {
      group.fields.forEach((field) => {
        const scenarioValue = engineeringScenario?.[field.key];
        const engineeringValue = engineeringReference?.[field.key];
        const requestValue = requestReference?.[field.key];

        if (isDifferent(scenarioValue, engineeringValue)) {
          changes.push({
            group: group.title,
            key: field.key,
            label: field.label,
            scenarioValue: displayValue(scenarioValue),
            engineeringValue: displayValue(engineeringValue),
            requestValue: displayValue(requestValue),
          });
        }
      });
    });

    return changes;
  }, [engineeringReference, engineeringScenario, requestReference]);

  const product = requestData?.product || {};
  const project = requestData?.project || {};
  const customerBlock = requestData?.customer || {};
  const primaryCustomer = customerBlock?.customers?.[0] || {};

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

  const updateEngineeringField = (key, value) => {
    setEngineeringScenario((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateBomScenario = (sectionKey, patch) => {
    setBomScenario((prev) => ({
      ...prev,
      [sectionKey]: {
        ...(prev?.[sectionKey] || {}),
        ...patch,
      },
    }));
  };

  const updateMaterialLine = (id, patch) => {
    setBomScenario((prev) => ({
      ...prev,
      materialLines: (prev?.materialLines || []).map((line) =>
        line.id === id ? { ...line, ...patch } : line
      ),
    }));
  };

  const updatePackagingLine = (id, patch) => {
    setBomScenario((prev) => ({
      ...prev,
      packagingLines: (prev?.packagingLines || []).map((line) =>
        line.id === id ? { ...line, ...patch } : line
      ),
    }));
  };

  const pricingProductClass =
    engineeringScenario?.pricingProductClass || inferProductClass(product.productType);

  const isSheetRoll = pricingProductClass === "Sheet Roll";
  const palletUsed = normalizeYesNo(engineeringScenario?.palletUsed, "No") === "Yes";

  const packagingCaseCode = isSheetRoll
    ? palletUsed
      ? "A"
      : "B"
    : palletUsed
    ? "D"
    : "C";

  const packagingCaseLabel =
    packagingCaseCode === "A"
      ? "Case A — Sheet Roll + Pallet Used"
      : packagingCaseCode === "B"
      ? "Case B — Sheet Roll + No Pallet"
      : packagingCaseCode === "C"
      ? "Case C — Non-Sheet + No Pallet"
      : "Case D — Non-Sheet + Pallet Used";

  const tonsPer1000Pcs = useMemo(() => {
    const unitWeight = toNum(engineeringScenario?.unitWeight_g);
    const utilFactor = toNum(engineeringScenario?.sheetUtilizationPct) / 100;
    if (!unitWeight || !utilFactor) return 0;
    return (unitWeight * 1000) / 1_000_000 / utilFactor;
  }, [engineeringScenario?.sheetUtilizationPct, engineeringScenario?.unitWeight_g]);

  const materialComputed = useMemo(() => {
    const lines = bomScenario?.materialLines || [];
    const density = toNum(engineeringScenario?.density);
    const thicknessMic = toNum(engineeringScenario?.thickness_mic);
    const coatingUsed = normalizeYesNo(engineeringScenario?.coatingUsed, "No") === "Yes";
    const coatingWeight = coatingUsed ? toNum(engineeringScenario?.coatingWeight_g_m2) : 0;

    const plasticWeightPerM2 = density && thicknessMic ? density * thicknessMic : 0;
    const totalWeightPerM2 = plasticWeightPerM2 + coatingWeight;

    let layerAShare = toNum(engineeringScenario?.layerAPct) / 100;
    let layerBShare = toNum(engineeringScenario?.layerBPct) / 100;

    if (!layerAShare && !layerBShare) {
      if (String(engineeringScenario?.layerStructure || "").toLowerCase() === "mono") {
        layerAShare = 1;
        layerBShare = 0;
      } else {
        layerAShare = 0.5;
        layerBShare = 0.5;
      }
    }

    const plasticShare =
      totalWeightPerM2 > 0 ? 1 - coatingWeight / totalWeightPerM2 : 1;

    return lines.map((line) => {
      let consumptionPerTon = 0;

      if (line.isCoating) {
        consumptionPerTon =
          totalWeightPerM2 > 0 ? 1000 * (coatingWeight / totalWeightPerM2) : 0;
      } else {
        const weightedPct =
          (toNum(line.pctLayerA) / 100) * layerAShare +
          (toNum(line.pctLayerB) / 100) * layerBShare;

        consumptionPerTon = weightedPct * 1000 * plasticShare;
      }

      const wastePct = toNum(line.wastePct);
      const unitPriceEgp = convertToEgp(
        line.unitPrice,
        line.currency,
        scenarioSetup.usdEgp,
        scenarioSetup.eurUsd
      );

      const baseCostPerTon = consumptionPerTon * unitPriceEgp;
      const wasteCostPerTon = baseCostPerTon * (wastePct / 100);
      const totalCostPerTon = baseCostPerTon + wasteCostPerTon;

      const baseCostPer1000 = baseCostPerTon * tonsPer1000Pcs;
      const wasteCostPer1000 = wasteCostPerTon * tonsPer1000Pcs;
      const totalCostPer1000 = totalCostPerTon * tonsPer1000Pcs;

      return {
        ...line,
        consumptionPerTon,
        wastePct,
        unitPriceEgp,
        baseCostPerTon,
        wasteCostPerTon,
        totalCostPerTon,
        baseCostPer1000,
        wasteCostPer1000,
        totalCostPer1000,
      };
    });
  }, [
    bomScenario?.materialLines,
    engineeringScenario?.coatingUsed,
    engineeringScenario?.coatingWeight_g_m2,
    engineeringScenario?.density,
    engineeringScenario?.layerAPct,
    engineeringScenario?.layerBPct,
    engineeringScenario?.layerStructure,
    engineeringScenario?.thickness_mic,
    scenarioSetup.eurUsd,
    scenarioSetup.usdEgp,
    tonsPer1000Pcs,
  ]);

  const materialBaseCostPerTon = materialComputed.reduce((s, x) => s + x.baseCostPerTon, 0);
  const materialWasteCostPerTon = materialComputed.reduce((s, x) => s + x.wasteCostPerTon, 0);
  const materialBaseCostPer1000 = materialComputed.reduce((s, x) => s + x.baseCostPer1000, 0);
  const materialWasteCostPer1000 = materialComputed.reduce((s, x) => s + x.wasteCostPer1000, 0);

  const packagingComputed = useMemo(() => {
    const lines = bomScenario?.packagingLines || [];
    const rollsPerPallet = Math.max(0, toNum(engineeringScenario?.rollsPerPallet));
    const labelsPerRoll = Math.max(0, toNum(engineeringScenario?.labelsPerRoll));
    const separatorsPerPallet = Math.max(0, toNum(engineeringScenario?.separatorsPerPallet));
    const strapLength = Math.max(0, toNum(engineeringScenario?.strapLength_m));
    const foamLength = Math.max(0, toNum(engineeringScenario?.foamLength_m));
    const stretchKg = Math.max(0, toNum(engineeringScenario?.stretchKgPerPallet));
    const rollWeightKg = Math.max(0, toNum(engineeringScenario?.rollWeight_kg));

    const pcsPerStack = Math.max(0, toNum(engineeringScenario?.pcsPerStack));
    const stacksPerBag = Math.max(0, toNum(engineeringScenario?.stacksPerBag));
    const bagsPerCarton = Math.max(0, toNum(engineeringScenario?.bagsPerCarton));
    const cartonsPerPallet = Math.max(0, toNum(engineeringScenario?.cartonsPerPallet));

    const pcsPerBag = pcsPerStack * stacksPerBag;
    const pcsPerCarton = pcsPerBag * bagsPerCarton;
    const pcsPerPallet = pcsPerCarton * cartonsPerPallet;

    const caseMeta =
      packagingCaseCode === "A"
        ? {
            baseLabel: "Pallet",
            denominatorLabel: "Ton",
            denominator: (rollWeightKg * rollsPerPallet) / 1000,
          }
        : packagingCaseCode === "B"
        ? {
            baseLabel: "Roll",
            denominatorLabel: "Ton",
            denominator: rollWeightKg / 1000,
          }
        : packagingCaseCode === "C"
        ? {
            baseLabel: "Carton",
            denominatorLabel: "1000 pcs",
            denominator: pcsPerCarton > 0 ? pcsPerCarton / 1000 : 0,
          }
        : {
            baseLabel: "Pallet",
            denominatorLabel: "1000 pcs",
            denominator: pcsPerPallet > 0 ? pcsPerPallet / 1000 : 0,
          };

    const consumptionMap =
      packagingCaseCode === "A"
        ? {
            core: rollsPerPallet,
            "roll-labels": labelsPerRoll * rollsPerPallet,
            separator: separatorsPerPallet,
            strap: strapLength,
            foam: foamLength,
            stretch: stretchKg,
            pallet: 1,
            bag: 0,
            carton: 0,
            "product-label": 0,
            tape: 0,
          }
        : packagingCaseCode === "B"
        ? {
            core: 1,
            "roll-labels": labelsPerRoll,
            separator: rollsPerPallet > 0 ? separatorsPerPallet / rollsPerPallet : 0,
            strap: rollsPerPallet > 0 ? strapLength / rollsPerPallet : 0,
            foam: rollsPerPallet > 0 ? foamLength / rollsPerPallet : 0,
            stretch: rollsPerPallet > 0 ? stretchKg / rollsPerPallet : 0,
            pallet: 0,
            bag: 0,
            carton: 0,
            "product-label": 0,
            tape: 0,
          }
        : packagingCaseCode === "C"
        ? {
            core: 0,
            "roll-labels": 0,
            separator: 0,
            strap: 0,
            foam: 0,
            stretch: 0,
            pallet: 0,
            bag: bagsPerCarton,
            carton: 1,
            "product-label": 1,
            tape: 1,
          }
        : {
            core: 0,
            "roll-labels": 0,
            separator: 0,
            strap: 0,
            foam: 0,
            stretch: stretchKg,
            pallet: 1,
            bag: bagsPerCarton * cartonsPerPallet,
            carton: cartonsPerPallet,
            "product-label": cartonsPerPallet,
            tape: cartonsPerPallet,
          };

    const relevantIds =
      packagingCaseCode === "A"
        ? ["core", "roll-labels", "separator", "strap", "foam", "stretch", "pallet"]
        : packagingCaseCode === "B"
        ? ["core", "roll-labels", "separator", "strap", "foam", "stretch"]
        : packagingCaseCode === "C"
        ? ["bag", "carton", "product-label", "tape"]
        : ["bag", "carton", "product-label", "tape", "stretch", "pallet"];

    const relevantLines = lines.filter((line) => relevantIds.includes(line.id));

    const computed = relevantLines.map((line) => {
      const consumptionPerBaseUnit = toNum(consumptionMap[line.id] || 0);
      const wastePct = toNum(line.wastePct);
      const unitPriceEgp = convertToEgp(
        line.unitPrice,
        line.currency,
        scenarioSetup.usdEgp,
        scenarioSetup.eurUsd
      );

      const baseCostPerBaseUnit = consumptionPerBaseUnit * unitPriceEgp;
      const wasteCostPerBaseUnit = baseCostPerBaseUnit * (wastePct / 100);
      const totalCostPerBaseUnit = baseCostPerBaseUnit + wasteCostPerBaseUnit;

      const baseCostPerOutputUnit =
        caseMeta.denominator > 0 ? baseCostPerBaseUnit / caseMeta.denominator : 0;
      const wasteCostPerOutputUnit =
        caseMeta.denominator > 0 ? wasteCostPerBaseUnit / caseMeta.denominator : 0;
      const totalCostPerOutputUnit =
        caseMeta.denominator > 0 ? totalCostPerBaseUnit / caseMeta.denominator : 0;

      return {
        ...line,
        consumptionPerBaseUnit,
        wastePct,
        unitPriceEgp,
        baseCostPerBaseUnit,
        wasteCostPerBaseUnit,
        totalCostPerBaseUnit,
        baseCostPerOutputUnit,
        wasteCostPerOutputUnit,
        totalCostPerOutputUnit,
      };
    });

    const totalBaseCostPerBaseUnit = computed.reduce((s, x) => s + x.baseCostPerBaseUnit, 0);
    const totalWasteCostPerBaseUnit = computed.reduce((s, x) => s + x.wasteCostPerBaseUnit, 0);

    return {
      caseMeta,
      pcsPerBag,
      pcsPerCarton,
      pcsPerPallet,
      rows: computed,
      totalBaseCostPerBaseUnit,
      totalWasteCostPerBaseUnit,
      totalBaseCostPerOutputUnit:
        caseMeta.denominator > 0 ? totalBaseCostPerBaseUnit / caseMeta.denominator : 0,
      totalWasteCostPerOutputUnit:
        caseMeta.denominator > 0 ? totalWasteCostPerBaseUnit / caseMeta.denominator : 0,
    };
  }, [
    bomScenario?.packagingLines,
    engineeringScenario?.bagsPerCarton,
    engineeringScenario?.cartonsPerPallet,
    engineeringScenario?.foamLength_m,
    engineeringScenario?.labelsPerRoll,
    engineeringScenario?.pcsPerStack,
    engineeringScenario?.rollWeight_kg,
    engineeringScenario?.rollsPerPallet,
    engineeringScenario?.separatorsPerPallet,
    engineeringScenario?.stacksPerBag,
    engineeringScenario?.strapLength_m,
    engineeringScenario?.stretchKgPerPallet,
    packagingCaseCode,
    scenarioSetup.eurUsd,
    scenarioSetup.usdEgp,
  ]);

  const decorationType = String(engineeringScenario?.decorationType || "").trim();
  const hasDecoration =
    decorationType !== "" && decorationType.toLowerCase() !== "no decoration";

  const decorationCostPer1000 = useMemo(() => {
    if (!hasDecoration) return 0;

    if (decorationType.toLowerCase().includes("print")) {
      return (
        (toNum(bomScenario?.decoration?.printingInkGPer1000) / 1000) *
        toNum(bomScenario?.decoration?.printingInkCostPerKg)
      );
    }

    if (decorationType.toLowerCase().includes("sleeve")) {
      return toNum(bomScenario?.decoration?.sleeveCostPer1000);
    }

    if (decorationType.toLowerCase().includes("hybrid")) {
      return (
        toNum(bomScenario?.decoration?.hybridBlankCostPerPiece) * 1000 +
        toNum(bomScenario?.decoration?.hybridBottomCostPerPiece) * 1000
      );
    }

    return 0;
  }, [
    bomScenario?.decoration?.hybridBlankCostPerPiece,
    bomScenario?.decoration?.hybridBottomCostPerPiece,
    bomScenario?.decoration?.printingInkCostPerKg,
    bomScenario?.decoration?.printingInkGPer1000,
    bomScenario?.decoration?.sleeveCostPer1000,
    decorationType,
    hasDecoration,
  ]);

  const decorationCostPerTon = tonsPer1000Pcs > 0 ? decorationCostPer1000 / tonsPer1000Pcs : 0;

  const workingCapitalComputed = useMemo(() => {
    const DSO = toNum(bomScenario?.workingCapital?.DSO);
    const DIO = toNum(bomScenario?.workingCapital?.DIO);
    const DPO = toNum(bomScenario?.workingCapital?.DPO);
    const interestPct = toNum(bomScenario?.workingCapital?.interestPct) / 100;

    const effectivePct = ((DSO + DIO - DPO) / 365) * interestPct;

    const baseSheet =
      (isSheetRoll ? materialBaseCostPerTon : materialBaseCostPer1000) +
      packagingComputed.totalBaseCostPerOutputUnit;

    return {
      effectivePct,
      cost: baseSheet * effectivePct,
    };
  }, [
    bomScenario?.workingCapital?.DIO,
    bomScenario?.workingCapital?.DPO,
    bomScenario?.workingCapital?.DSO,
    bomScenario?.workingCapital?.interestPct,
    isSheetRoll,
    materialBaseCostPer1000,
    materialBaseCostPerTon,
    packagingComputed.totalBaseCostPerOutputUnit,
  ]);

  const selectedFreightOption = useMemo(() => {
    const options = bomScenario?.freight?.options || [];
    return (
      options.find((opt) => opt.id === bomScenario?.freight?.selectedOptionId) ||
      options[0] ||
      null
    );
  }, [bomScenario?.freight?.options, bomScenario?.freight?.selectedOptionId]);

  const freightCostComputed = useMemo(() => {
    const tripCost = toNum(bomScenario?.freight?.costPerTrip);
    const qtyTon = toNum(selectedFreightOption?.qtyTon);
    const qtyPcs = toNum(selectedFreightOption?.qtyPcs);

    return {
      costPerTon: qtyTon > 0 ? tripCost / qtyTon : 0,
      costPer1000Pcs: qtyPcs > 0 ? (tripCost / qtyPcs) * 1000 : 0,
    };
  }, [bomScenario?.freight?.costPerTrip, selectedFreightOption?.qtyPcs, selectedFreightOption?.qtyTon]);

  const investmentRows = investmentsScenario?.rows || [];

  const totalInvestmentCost = useMemo(() => {
    return investmentRows.reduce((sum, row) => {
      return (
        sum +
        convertToEgp(
          row.value,
          row.currency,
          row.exchangeRate || scenarioSetup.usdEgp,
          scenarioSetup.eurUsd
        )
      );
    }, 0);
  }, [investmentRows, scenarioSetup.eurUsd, scenarioSetup.usdEgp]);

  const nonAmortizedInvestmentTotal = useMemo(() => {
    return investmentRows.reduce((sum, row) => {
      if (row.amortize) return sum;
      return (
        sum +
        convertToEgp(
          row.value,
          row.currency,
          row.exchangeRate || scenarioSetup.usdEgp,
          scenarioSetup.eurUsd
        )
      );
    }, 0);
  }, [investmentRows, scenarioSetup.eurUsd, scenarioSetup.usdEgp]);

  const amortizationCostPerOutput = useMemo(() => {
    return investmentRows.reduce((sum, row) => {
      if (!row.amortize) return sum;

      const valueEgp = convertToEgp(
        row.value,
        row.currency,
        row.exchangeRate || scenarioSetup.usdEgp,
        scenarioSetup.eurUsd
      );

      const qty = toNum(row.amortizationQty);
      if (qty <= 0) return sum;

      if (isSheetRoll) {
        return sum + valueEgp / qty;
      }

      return sum + (valueEgp / qty) * 1000;
    }, 0);
  }, [investmentRows, isSheetRoll, scenarioSetup.eurUsd, scenarioSetup.usdEgp]);

  const updateInvestmentRow = (id, patch) => {
    setInvestmentsScenario((prev) => ({
      ...prev,
      rows: (prev?.rows || []).map((row) => (row.id === id ? { ...row, ...patch } : row)),
    }));
  };

  const addInvestmentRow = () => {
    setInvestmentsScenario((prev) => ({
      ...prev,
      rows: [
        ...(prev?.rows || []),
        {
          id: `manual-invest-${Date.now()}`,
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
      ],
    }));
  };

  const removeInvestmentRow = (id) => {
    setInvestmentsScenario((prev) => ({
      ...prev,
      rows: (prev?.rows || []).filter((row) => row.id !== id),
    }));
  };

  const saveScenario = async () => {
    try {
      if (missingRequired) {
        alert("Please complete all required scenario setup fields.");
        return;
      }

      setSaving(true);
      setSaveMessage("");
      localStorage.setItem("pricingCreatedBy", scenarioSetup.createdBy.trim());

      const pricingData = {
        scenarioSetup,
        engineeringScenario,
        bomScenario,
        investmentsScenario,
        resultsScenario,
        changeSummary,
        summary: {
          changedFieldCount: changeSummary.length,
          pricingProductClass,
          productType: engineeringScenario?.productType || "",
          productName: engineeringScenario?.productName || "",
          materialBaseCostPerTon,
          materialWasteCostPerTon,
          packagingBaseCostPerOutputUnit: packagingComputed.totalBaseCostPerOutputUnit,
          packagingWasteCostPerOutputUnit: packagingComputed.totalWasteCostPerOutputUnit,
          decorationCostPer1000,
          workingCapitalCost: workingCapitalComputed.cost,
          freightCostPerTon: freightCostComputed.costPerTon,
          freightCostPer1000Pcs: freightCostComputed.costPer1000Pcs,
          totalInvestmentCost,
          nonAmortizedInvestmentTotal,
          amortizationCostPerOutput,
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
          totalCostPer1000: "",
          sellingPricePer1000: "",
          marginPct: "",
        }),
      });

      const json = await res.json();

      if (!json.success) {
        alert(json.error || "Failed to save scenario");
        return;
      }

      setSaveMessage("Scenario saved successfully.");
    } catch (error) {
      console.error(error);
      alert("Failed to save scenario");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !bomScenario || !investmentsScenario) {
    return <div className="p-6">Loading pricing scenario...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
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
            <h1 className="text-xl font-semibold">Pricing Scenario</h1>
            <p className="text-sm text-gray-500">
              {project.projectName || requestId} • {primaryCustomer.customerName || "—"} • {pricingId}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link
            to={`/pricing/${requestId}`}
            className="px-4 py-2 rounded-md border bg-white hover:bg-gray-50"
          >
            ← Workspace
          </Link>

          <button
            onClick={saveScenario}
            disabled={saving || missingRequired}
            className={`px-4 py-2 rounded-md text-white ${
              saving || missingRequired ? "bg-gray-400" : "bg-black hover:bg-gray-800"
            }`}
          >
            {saving ? "Saving..." : "Save Scenario"}
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

          <Field label="Scenario Name">
            <TextInput
              value={scenarioSetup.scenarioName}
              onChange={(v) =>
                setScenarioSetup((prev) => ({ ...prev, scenarioName: v }))
              }
            />
          </Field>

          <Field label="Creator">
            <TextInput
              value={scenarioSetup.createdBy}
              onChange={(v) =>
                setScenarioSetup((prev) => ({ ...prev, createdBy: v }))
              }
            />
          </Field>

          <Field label="Status">
            <SelectInput
              value={scenarioSetup.scenarioStatus}
              onChange={(v) =>
                setScenarioSetup((prev) => ({ ...prev, scenarioStatus: v }))
              }
              options={["Draft", "Final", "Archived"]}
            />
          </Field>

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
            <Field label="Notes">
              <TextInput
                value={scenarioSetup.scenarioNote}
                onChange={(v) =>
                  setScenarioSetup((prev) => ({ ...prev, scenarioNote: v }))
                }
              />
            </Field>
          </div>

          <Field label="Offer Currency">
            <SelectInput
              value={scenarioSetup.currency}
              onChange={(v) =>
                setScenarioSetup((prev) => ({ ...prev, currency: v }))
              }
              options={["", "EGP", "USD", "EUR"]}
            />
          </Field>

          <Field label="USD / EGP Exchange Rate">
            <NumInput
              value={scenarioSetup.usdEgp}
              onChange={(v) =>
                setScenarioSetup((prev) => ({ ...prev, usdEgp: v }))
              }
            />
          </Field>

          <Field label="EUR / USD Exchange Rate">
            <NumInput
              value={scenarioSetup.eurUsd}
              onChange={(v) =>
                setScenarioSetup((prev) => ({ ...prev, eurUsd: v }))
              }
            />
          </Field>
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
          <Card
            title="Engineering Scenario Assumptions"
            right={
              <SectionNote tone={changeSummary.length ? "orange" : "green"}>
                {changeSummary.length
                  ? `${changeSummary.length} field(s) changed vs Engineering Review`
                  : "No changes vs Engineering Review yet."}
              </SectionNote>
            }
          >
            <div className="space-y-6">
              {ENGINEERING_GROUPS.map((group) => (
                <div key={group.title} className="space-y-3">
                  <h3 className="font-medium">{group.title}</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {group.fields.map((field) => {
                      const scenarioValue = engineeringScenario?.[field.key] ?? "";
                      const engineeringValue = engineeringReference?.[field.key] ?? "";
                      const requestValue = requestReference?.[field.key] ?? "";
                      const changed = isDifferent(scenarioValue, engineeringValue);

                      return (
                        <div key={field.key}>
                          <Field label={field.label}>
                            {field.type === "select" ? (
                              <SelectInput
                                value={scenarioValue}
                                onChange={(v) => updateEngineeringField(field.key, v)}
                                changed={changed}
                                options={field.options || [""]}
                              />
                            ) : field.type === "number" ? (
                              <NumInput
                                value={scenarioValue}
                                onChange={(v) => updateEngineeringField(field.key, v)}
                                changed={changed}
                              />
                            ) : (
                              <TextInput
                                value={scenarioValue}
                                onChange={(v) => updateEngineeringField(field.key, v)}
                                changed={changed}
                              />
                            )}
                          </Field>

                          <RefValues
                            engineeringValue={engineeringValue}
                            requestValue={requestValue}
                            changed={changed}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Auto Summary of Changes vs Engineering Review">
            {changeSummary.length === 0 ? (
              <SectionNote tone="green">
                No pricing assumption changes vs Engineering Review yet.
              </SectionNote>
            ) : (
              <div className="space-y-2">
                {changeSummary.map((item, idx) => (
                  <div key={`${item.key}-${idx}`} className="border rounded-lg p-3 bg-gray-50">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-gray-500">{item.group}</div>
                    <div className="mt-2 text-sm">
                      Scenario: <span className="font-medium">{item.scenarioValue}</span>
                    </div>
                    <div className="text-sm text-red-600">
                      Engineering Review: <span className="font-medium">{item.engineeringValue}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Request Initiation: <span className="font-medium">{item.requestValue}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {activeTab === "bom" && (
        <>
          <Card
            title="Material BOM Unit Price"
            right={
              <SectionNote tone="blue">
                All material prices are converted automatically to EGP using the scenario exchange rates.
              </SectionNote>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm border rounded-lg overflow-hidden">
                <thead className="bg-gray-100 text-left">
                  <tr>
                    <th className="p-3">Material</th>
                    <th className="p-3">Consumption / Ton (kg)</th>
                    <th className="p-3">Waste %</th>
                    <th className="p-3">Price / Unit</th>
                    <th className="p-3">Currency</th>
                    <th className="p-3">Cost / Ton (EGP)</th>
                  </tr>
                </thead>
                <tbody>
                  {materialComputed.map((line) => (
                    <tr key={line.id} className="border-t">
                      <td className="p-3">{line.name}</td>
                      <td className="p-3">{fmt(line.consumptionPerTon, 3)}</td>
                      <td className="p-3">
                        <NumInput
                          value={line.wastePct}
                          onChange={(v) => updateMaterialLine(line.id, { wastePct: v })}
                        />
                      </td>
                      <td className="p-3">
                        <NumInput
                          value={line.unitPrice}
                          onChange={(v) => updateMaterialLine(line.id, { unitPrice: v })}
                        />
                      </td>
                      <td className="p-3">
                        <SelectInput
                          value={line.currency}
                          onChange={(v) => updateMaterialLine(line.id, { currency: v })}
                          options={["EGP", "USD", "EUR"]}
                        />
                      </td>
                      <td className="p-3">{fmt(line.baseCostPerTon + line.wasteCostPerTon, 3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {isSheetRoll ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <SectionNote tone="green">
                  Material Cost / Ton = {fmt(materialBaseCostPerTon, 3)} EGP
                </SectionNote>
                <SectionNote tone="orange">
                  Material Waste / Ton = {fmt(materialWasteCostPerTon, 3)} EGP
                </SectionNote>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <SectionNote tone="green">
                  Material Cost / 1000 pcs = {fmt(materialBaseCostPer1000, 3)} EGP
                </SectionNote>
                <SectionNote tone="orange">
                  Material Waste / 1000 pcs = {fmt(materialWasteCostPer1000, 3)} EGP
                </SectionNote>
              </div>
            )}
          </Card>

          <Card
            title="Packaging BOM"
            right={<SectionNote tone="blue">{packagingCaseLabel}</SectionNote>}
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <InfoTile
                label={`Packaging Base Unit`}
                value={packagingComputed.caseMeta.baseLabel}
              />
              <InfoTile
                label={`Packaging Output Unit`}
                value={packagingComputed.caseMeta.denominatorLabel}
              />
              <InfoTile
                label={
                  packagingComputed.caseMeta.baseLabel === "Pallet"
                    ? "Total Pieces / Pallet"
                    : packagingComputed.caseMeta.baseLabel === "Carton"
                    ? "Total Pieces / Carton"
                    : "Roll Weight (kg)"
                }
                value={
                  packagingComputed.caseMeta.baseLabel === "Pallet"
                    ? fmt(packagingComputed.pcsPerPallet, 0)
                    : packagingComputed.caseMeta.baseLabel === "Carton"
                    ? fmt(packagingComputed.pcsPerCarton, 0)
                    : fmt(toNum(engineeringScenario?.rollWeight_kg), 3)
                }
              />
              <InfoTile
                label={`Base Qty per ${packagingComputed.caseMeta.denominatorLabel}`}
                value={fmt(packagingComputed.caseMeta.denominator, 3)}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border rounded-lg overflow-hidden">
                <thead className="bg-gray-100 text-left">
                  <tr>
                    <th className="p-3">Item</th>
                    <th className="p-3">
                      Consumption / {packagingComputed.caseMeta.baseLabel}
                    </th>
                    <th className="p-3">Unit</th>
                    <th className="p-3">Waste %</th>
                    <th className="p-3">Cost / Unit</th>
                    <th className="p-3">Currency</th>
                    <th className="p-3">
                      Total Cost / {packagingComputed.caseMeta.baseLabel} (EGP)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {packagingComputed.rows.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="p-3">{row.name}</td>
                      <td className="p-3">{fmt(row.consumptionPerBaseUnit, 3)}</td>
                      <td className="p-3">{row.unit}</td>
                      <td className="p-3">
                        <NumInput
                          value={row.wastePct}
                          onChange={(v) => updatePackagingLine(row.id, { wastePct: v })}
                        />
                      </td>
                      <td className="p-3">
                        <NumInput
                          value={row.unitPrice}
                          onChange={(v) => updatePackagingLine(row.id, { unitPrice: v })}
                        />
                      </td>
                      <td className="p-3">
                        <SelectInput
                          value={row.currency}
                          onChange={(v) => updatePackagingLine(row.id, { currency: v })}
                          options={["EGP", "USD", "EUR"]}
                        />
                      </td>
                      <td className="p-3">{fmt(row.totalCostPerBaseUnit, 3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <SectionNote tone="green">
                Total Packaging Cost / {packagingComputed.caseMeta.baseLabel} ={" "}
                {fmt(packagingComputed.totalBaseCostPerBaseUnit, 3)} EGP
              </SectionNote>

              <SectionNote tone="orange">
                Packaging Waste / {packagingComputed.caseMeta.baseLabel} ={" "}
                {fmt(packagingComputed.totalWasteCostPerBaseUnit, 3)} EGP
              </SectionNote>

              <SectionNote tone="green">
                Packaging Cost / {packagingComputed.caseMeta.denominatorLabel} ={" "}
                {fmt(packagingComputed.totalBaseCostPerOutputUnit, 3)} EGP
              </SectionNote>
            </div>

            <SectionNote tone="orange">
              Packaging Waste / {packagingComputed.caseMeta.denominatorLabel} ={" "}
              {fmt(packagingComputed.totalWasteCostPerOutputUnit, 3)} EGP
            </SectionNote>
          </Card>

          {hasDecoration ? (
            <Card title="Decoration Cost">
              <SectionNote tone="blue">
                Decoration Type: {displayValue(decorationType)}
              </SectionNote>

              {decorationType.toLowerCase().includes("print") && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Field label="Ink Consumption / 1000 pcs (g)">
                    <NumInput
                      value={bomScenario?.decoration?.printingInkGPer1000}
                      onChange={(v) =>
                        updateBomScenario("decoration", { printingInkGPer1000: v })
                      }
                    />
                  </Field>

                  <Field label="Ink Cost / kg (EGP)">
                    <NumInput
                      value={bomScenario?.decoration?.printingInkCostPerKg}
                      onChange={(v) =>
                        updateBomScenario("decoration", { printingInkCostPerKg: v })
                      }
                    />
                  </Field>

                  <InfoTile
                    label="Ink Cost / 1000 pcs"
                    value={`${fmt(decorationCostPer1000, 3)} EGP`}
                  />
                </div>
              )}

              {decorationType.toLowerCase().includes("sleeve") && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Sleeve Cost / 1000 pcs (EGP)">
                    <NumInput
                      value={bomScenario?.decoration?.sleeveCostPer1000}
                      onChange={(v) =>
                        updateBomScenario("decoration", { sleeveCostPer1000: v })
                      }
                    />
                  </Field>

                  <InfoTile
                    label="Shrink Sleeve Cost / 1000 pcs"
                    value={`${fmt(decorationCostPer1000, 3)} EGP`}
                  />
                </div>
              )}

              {decorationType.toLowerCase().includes("hybrid") && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Field label="Blank Cost / Piece (EGP)">
                    <NumInput
                      value={bomScenario?.decoration?.hybridBlankCostPerPiece}
                      onChange={(v) =>
                        updateBomScenario("decoration", { hybridBlankCostPerPiece: v })
                      }
                    />
                  </Field>

                  <Field label="Bottom Cost / Piece (EGP)">
                    <NumInput
                      value={bomScenario?.decoration?.hybridBottomCostPerPiece}
                      onChange={(v) =>
                        updateBomScenario("decoration", { hybridBottomCostPerPiece: v })
                      }
                    />
                  </Field>

                  <InfoTile
                    label="Hybrid Decoration Cost / 1000 pcs"
                    value={`${fmt(decorationCostPer1000, 3)} EGP`}
                  />
                </div>
              )}

              {!isSheetRoll ? (
                <SectionNote tone="green">
                  Decoration Cost / 1000 pcs = {fmt(decorationCostPer1000, 3)} EGP
                </SectionNote>
              ) : (
                <SectionNote tone="green">
                  Decoration Cost / Ton (equivalent) = {fmt(decorationCostPerTon, 3)} EGP
                </SectionNote>
              )}
            </Card>
          ) : (
            <Card title="Decoration Cost">
              <SectionNote tone="gray">
                Decoration section is hidden in calculation logic because no decoration is selected in the current engineering scenario.
              </SectionNote>
            </Card>
          )}

          <Card title="Working Capital Cost">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Field label="DSO">
                <NumInput
                  value={bomScenario?.workingCapital?.DSO}
                  onChange={(v) => updateBomScenario("workingCapital", { DSO: v })}
                />
              </Field>

              <Field label="DIO">
                <NumInput
                  value={bomScenario?.workingCapital?.DIO}
                  onChange={(v) => updateBomScenario("workingCapital", { DIO: v })}
                />
              </Field>

              <Field label="DPO">
                <NumInput
                  value={bomScenario?.workingCapital?.DPO}
                  onChange={(v) => updateBomScenario("workingCapital", { DPO: v })}
                />
              </Field>

              <Field label="Interest Rate %">
                <NumInput
                  value={bomScenario?.workingCapital?.interestPct}
                  onChange={(v) => updateBomScenario("workingCapital", { interestPct: v })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <SectionNote tone="green">
                Effective Working Capital Cost % = {fmt(workingCapitalComputed.effectivePct * 100, 3)}%
              </SectionNote>

              <SectionNote tone="orange">
                Working Capital Cost / {isSheetRoll ? "Ton" : "1000 pcs"} = {fmt(workingCapitalComputed.cost, 3)} EGP
              </SectionNote>
            </div>
          </Card>

          <Card title="Freight Cost">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Truck / Container Size">
                <SelectInput
                  value={bomScenario?.freight?.selectedOptionId}
                  onChange={(v) =>
                    updateBomScenario("freight", { selectedOptionId: v })
                  }
                  options={(bomScenario?.freight?.options || []).map((opt) => ({
                    value: opt.id,
                    label: opt.label,
                  }))}
                />
              </Field>

              <InfoTile
                label={`Qty per Trip (${isSheetRoll ? "Ton" : "Pcs"})`}
                value={
                  isSheetRoll
                    ? fmt(selectedFreightOption?.qtyTon || 0, 3)
                    : fmt(selectedFreightOption?.qtyPcs || 0, 0)
                }
              />

              <Field label="Cost per Trip (EGP)">
                <NumInput
                  value={bomScenario?.freight?.costPerTrip}
                  onChange={(v) => updateBomScenario("freight", { costPerTrip: v })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {isSheetRoll ? (
                <SectionNote tone="green">
                  Freight Cost / Ton = {fmt(freightCostComputed.costPerTon, 3)} EGP
                </SectionNote>
              ) : (
                <SectionNote tone="green">
                  Freight Cost / 1000 pcs = {fmt(freightCostComputed.costPer1000Pcs, 3)} EGP
                </SectionNote>
              )}

              <SectionNote tone="gray">
                Freight basis shown above changes according to the truck/container size selected by the user.
              </SectionNote>
            </div>
          </Card>
        </>
      )}

      {activeTab === "investments" && (
        <Card title="Investments">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <SectionNote tone="blue">
              Engineering Review investment rows are pulled here automatically. You can edit them, add more rows, and decide which items should be amortized in pricing.
            </SectionNote>

            <button
              type="button"
              onClick={addInvestmentRow}
              className="px-4 py-2 rounded-md bg-black text-white hover:bg-gray-800"
            >
              + Add Investment
            </button>
          </div>

          {investmentRows.length === 0 ? (
            <div className="text-sm text-gray-500">No investment rows available yet.</div>
          ) : (
            <div className="space-y-3">
              {investmentRows.map((row) => (
                <div key={row.id} className="rounded-xl border p-3">
                  <div className="grid grid-cols-1 md:grid-cols-9 gap-3">
                    <Field label="Investment Name">
                      <TextInput
                        value={row.name}
                        onChange={(v) => updateInvestmentRow(row.id, { name: v })}
                      />
                    </Field>

                    <Field label="Type">
                      <TextInput
                        value={row.type}
                        onChange={(v) => updateInvestmentRow(row.id, { type: v })}
                      />
                    </Field>

                    <Field label="Value">
                      <NumInput
                        value={row.value}
                        onChange={(v) => updateInvestmentRow(row.id, { value: v })}
                      />
                    </Field>

                    <Field label="Currency">
                      <SelectInput
                        value={row.currency}
                        onChange={(v) => updateInvestmentRow(row.id, { currency: v })}
                        options={["EGP", "USD", "EUR"]}
                      />
                    </Field>

                    <Field label="Exchange Rate">
                      <NumInput
                        value={row.exchangeRate}
                        onChange={(v) => updateInvestmentRow(row.id, { exchangeRate: v })}
                      />
                    </Field>

                    <Field label="Supplier">
                      <TextInput
                        value={row.supplier}
                        onChange={(v) => updateInvestmentRow(row.id, { supplier: v })}
                      />
                    </Field>

                    <Field label="Lead Time (weeks)">
                      <NumInput
                        value={row.leadTimeWeeks}
                        onChange={(v) => updateInvestmentRow(row.id, { leadTimeWeeks: v })}
                      />
                    </Field>

                    <Field label="Amortize">
                      <SelectInput
                        value={row.amortize ? "Yes" : "No"}
                        onChange={(v) =>
                          updateInvestmentRow(row.id, { amortize: v === "Yes" })
                        }
                        options={["No", "Yes"]}
                      />
                    </Field>

                    <Field label={`Amortization Qty (${isSheetRoll ? "ton" : "pcs"})`}>
                      <NumInput
                        value={row.amortizationQty}
                        onChange={(v) => updateInvestmentRow(row.id, { amortizationQty: v })}
                      />
                    </Field>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-sm text-gray-600">
                      Value in EGP:{" "}
                      <span className="font-medium">
                        {fmt(
                          convertToEgp(
                            row.value,
                            row.currency,
                            row.exchangeRate || scenarioSetup.usdEgp,
                            scenarioSetup.eurUsd
                          ),
                          2
                        )}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeInvestmentRow(row.id)}
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
              Total Investment Cost = {fmt(totalInvestmentCost, 2)} EGP
            </SectionNote>

            <SectionNote tone="orange">
              Non-Amortized Investment Total = {fmt(nonAmortizedInvestmentTotal, 2)} EGP
            </SectionNote>

            <SectionNote tone="green">
              Amortization Cost / {isSheetRoll ? "Ton" : "1000 pcs"} = {fmt(amortizationCostPerOutput, 3)} EGP
            </SectionNote>
          </div>
        </Card>
      )}

      {activeTab === "results" && (
        <Card title="Results">
          <SectionNote tone="blue">
            This tab will be built next. It will support dynamic back-calculation logic based on whether the
            product is a Sheet Roll or a Non-Sheet Product, and it will show each cost factor with its % of total price.
          </SectionNote>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <InfoTile label="Pricing Product Class" value={displayValue(pricingProductClass)} />
            <InfoTile
              label="Material Cost Basis"
              value={isSheetRoll ? `${fmt(materialBaseCostPerTon, 3)} EGP / Ton` : `${fmt(materialBaseCostPer1000, 3)} EGP / 1000 pcs`}
            />
            <InfoTile
              label="Packaging Cost Basis"
              value={`${fmt(packagingComputed.totalBaseCostPerOutputUnit, 3)} EGP / ${packagingComputed.caseMeta.denominatorLabel}`}
            />
            <InfoTile
              label="Amortization Cost Basis"
              value={`${fmt(amortizationCostPerOutput, 3)} EGP / ${isSheetRoll ? "Ton" : "1000 pcs"}`}
            />
          </div>
        </Card>
      )}

      <Card title="Project Reference">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <InfoTile label="Customer" value={primaryCustomer.customerName || "—"} />
          <InfoTile label="Project" value={project.projectName || "—"} />
          <InfoTile label="Product" value={product.productType || "—"} />
          <InfoTile label="Request No." value={requestId || "—"} />
        </div>
      </Card>
    </div>
  );
}