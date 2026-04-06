import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Chart from "chart.js/auto";

const toNum = (v) => {
  const n = parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isNaN(n) ? 0 : n;
};

const fmt = (v, d = 3) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: d,
  }).format(v || 0);

const isDifferent = (a, b) => String(a ?? "") !== String(b ?? "");

const DENSITY_MAP = {
  PP: 0.92,
  PET: 1.38,
  PS: 1.04,
};

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

function ValueCell({ value, unit = "" }) {
  return (
    <div className="border rounded p-2 bg-blue-50 border-blue-200 font-medium">
      {value === "" || value === null || value === undefined ? "—" : `${value}${unit}`}
    </div>
  );
}

function ScenarioInput({ value, onChange, changed = false, placeholder = "" }) {
  return (
    <input
      className={`border p-2 rounded w-full ${
        changed ? "bg-orange-50 border-orange-300" : ""
      }`}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

function NumberInput({ value, onChange, changed = false, placeholder = "" }) {
  return (
    <input
      className={`border p-2 rounded w-full ${
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
      className={`border p-2 rounded w-full ${
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
      onClick={onClick}
      className={`px-4 py-2 rounded-lg border text-sm ${
        active
          ? "bg-black text-white border-black"
          : "bg-white hover:bg-gray-50 border-gray-300"
      }`}
      type="button"
    >
      {children}
    </button>
  );
}

function convertAmount(amount, fromCurrency, targetCurrency, usdEgp, eurUsd) {
  const val = toNum(amount);
  const from = String(fromCurrency || "").toUpperCase();
  const to = String(targetCurrency || "").toUpperCase();
  const usdToEgp = toNum(usdEgp);
  const eurToUsd = toNum(eurUsd);

  if (!val) return 0;
  if (!from || !to) return val;
  if (from === to) return val;

  let egpValue = 0;

  if (from === "EGP") {
    egpValue = val;
  } else if (from === "USD") {
    egpValue = val * usdToEgp;
  } else if (from === "EUR") {
    egpValue = val * eurToUsd * usdToEgp;
  } else {
    egpValue = val;
  }

  if (to === "EGP") return egpValue;
  if (to === "USD") return usdToEgp ? egpValue / usdToEgp : 0;
  if (to === "EUR") return usdToEgp && eurToUsd ? egpValue / usdToEgp / eurToUsd : 0;

  return egpValue;
}

function buildInitialScenarioFromEngineering(requestData, engineeringData) {
  const product = requestData?.product || {};
  const project = requestData?.project || {};
  const ms = engineeringData?.materialSheet || {};
  const ss = engineeringData?.sheetSpecs || {};
  const ex = engineeringData?.extrusion || {};
  const pk = engineeringData?.sheetPackaging || {};

  const baseMaterial =
    ms.baseMaterial || product.sheetMaterial || product.productMaterial || "PP";
  const density = toNum(ms.density) || DENSITY_MAP[baseMaterial] || 0;

  const netWidth = ss.netWidth_mm || "";
  const grossWidth =
    ss.grossWidth_mm ||
    (toNum(ss.netWidth_mm) && toNum(ss.edgeTrimPerSide_mm)
      ? String(toNum(ss.netWidth_mm) + 2 * toNum(ss.edgeTrimPerSide_mm))
      : "");
  const edgeTrim = ss.edgeTrimPerSide_mm || "";
  const widthTolPlus = ss.widthTolPlus_mm || ss.widthTolerancePlus_mm || "";
  const widthTolMinus = ss.widthTolMinus_mm || ss.widthToleranceMinus_mm || "";
  const thickness = ss.thickness_mic || "";
  const thicknessTolPlus = ss.thicknessTolPlus_mic || ss.thicknessTolerancePlus_mic || "";
  const thicknessTolMinus = ss.thicknessTolMinus_mic || ss.thicknessToleranceMinus_mic || "";

  const rollDiameter = ss.rollDiameter_mm || "";
  const rollWeight = ss.rollTargetWeight_kg || ss.rollWeight_kg || "";
  const coreDiameter = ss.coreDiameter_mm || "";
  const coreType = ss.coreType || "";
  const layerStructure = ms.structure || "AB";
  const coatingUsed = ms.coatingUsed || "No";
  const coatingName = ms.coatingName || "";
  const coatingWeight = ms.coatingWeight_g_m2 || "";
  const grossSpeedA = ex.grossSpeedA_kg_hr || ex.grossSpeed_kg_hr || "";
  const grossSpeedB = ex.grossSpeedB_kg_hr || "";
  const efficiencyPct = ex.efficiencyPct || "";
  const utilizationPct = ex.netEfficiencyPct || ex.sheetUtilizationPct || "";

  const materialRows = [];
  const pushMaterials = (rows, layerKey) => {
    (rows || []).forEach((r, idx) => {
      const name = String(r.name || "").trim();
      if (!name) return;
      materialRows.push({
        id: `${layerKey}-${idx}-${name}`,
        name,
        layer: layerKey,
        engPct: String(r.pct || ""),
        scenarioPct: String(r.pct || ""),
        price: "",
        currency: "EGP",
        ratePct: "",
      });
    });
  };

  pushMaterials(ms.layerA || [], "A");
  pushMaterials(ms.layerB || [], "B");

  if (coatingUsed === "Yes" && coatingName) {
    materialRows.push({
      id: `coat-${coatingName}`,
      name: coatingName,
      layer: "Coating",
      engPct: "",
      scenarioPct: "",
      price: "",
      currency: "EGP",
      ratePct: "",
    });
  }

  const packagingRows = [
    {
      id: "core",
      name: "Core",
      engQty: 1,
      scenarioQty: "1",
      unit: "unit",
      wastePct: "",
      price: "",
      currency: "EGP",
    },
    {
      id: "roll-labels",
      name: "Labels per Roll",
      engQty: toNum(pk.labelsPerRoll || 0),
      scenarioQty: String(toNum(pk.labelsPerRoll || 0) || ""),
      unit: "unit",
      wastePct: "",
      price: "",
      currency: "EGP",
    },
    {
      id: "pallet",
      name: pk.palletType || "Pallet",
      engQty: 1,
      scenarioQty: "1",
      unit: "unit",
      wastePct: "",
      price: "",
      currency: "EGP",
    },
    {
      id: "rolls-per-pallet",
      name: "Rolls per Pallet",
      engQty: toNum(pk.rollsPerPallet || 0),
      scenarioQty: String(toNum(pk.rollsPerPallet || 0) || ""),
      unit: "roll",
      wastePct: "",
      price: "",
      currency: "EGP",
    },
    {
      id: "strap",
      name: "Strap Length / Pallet",
      engQty: toNum(pk.strapLength_m || 0),
      scenarioQty: String(toNum(pk.strapLength_m || 0) || ""),
      unit: "m",
      wastePct: "",
      price: "",
      currency: "EGP",
    },
    {
      id: "separator",
      name: "Separators / Pallet",
      engQty: toNum(pk.separatorsPerPallet || 0),
      scenarioQty: String(toNum(pk.separatorsPerPallet || 0) || ""),
      unit: "unit",
      wastePct: "",
      price: "",
      currency: "EGP",
    },
    {
      id: "foam",
      name: "Foam Sheet Length / Pallet",
      engQty: toNum(pk.foamLength_m || 0),
      scenarioQty: String(toNum(pk.foamLength_m || 0) || ""),
      unit: "m",
      wastePct: "",
      price: "",
      currency: "EGP",
    },
    {
      id: "stretch",
      name: "Stretch Film / Pallet",
      engQty: toNum(pk.stretchKgPerPallet || 0),
      scenarioQty: String(toNum(pk.stretchKgPerPallet || 0) || ""),
      unit: "kg",
      wastePct: "",
      price: "",
      currency: "EGP",
    },
  ];

  return {
    scenarioSheet: {
      productName: project.projectName || requestData?.metadata?.requestId || "Project",
      productCode: requestData?.metadata?.requestId || "",
      baseMaterial,
      density: density ? String(density) : "",
      netWidth_mm: String(netWidth || ""),
      grossWidth_mm: String(grossWidth || ""),
      edgeTrimPerSide_mm: String(edgeTrim || ""),
      widthTolPlus_mm: String(widthTolPlus || ""),
      widthTolMinus_mm: String(widthTolMinus || ""),
      thickness_mic: String(thickness || ""),
      thicknessTolPlus_mic: String(thicknessTolPlus || ""),
      thicknessTolMinus_mic: String(thicknessTolMinus || ""),
      rollDiameter_mm: String(rollDiameter || ""),
      rollWeight_kg: String(rollWeight || ""),
      coreDiameter_mm: String(coreDiameter || ""),
      coreType: String(coreType || ""),
      layerStructure: String(layerStructure || "AB"),
      coatingUsed: String(coatingUsed || "No"),
      coatingName: String(coatingName || ""),
      coatingWeight_g_m2: String(coatingWeight || ""),
      grossSpeedA_kg_hr: String(grossSpeedA || ""),
      grossSpeedB_kg_hr: String(grossSpeedB || ""),
      efficiencyPct: String(efficiencyPct || ""),
      sheetUtilizationPct: String(utilizationPct || ""),
    },
    materialRows,
    packagingRows,
    investmentRows: engineeringData?.investments || [],
  };
}

export default function PricingPage() {
  const { requestId, pricingId } = useParams();
  const navigate = useNavigate();

  const [engineeringData, setEngineeringData] = useState(null);
  const [requestData, setRequestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState("engineering");

  const [pricing, setPricing] = useState({
    currency: "",
    usdEgp: "",
    eurUsd: "",
    conversionPerTon: "",
  });

  const [scenarioName, setScenarioName] = useState("");
  const [scenarioNote, setScenarioNote] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [scenarioStatus, setScenarioStatus] = useState("Draft");
  const [compareSelected, setCompareSelected] = useState(false);

  const [scenarioSheet, setScenarioSheet] = useState(null);
  const [materialRows, setMaterialRows] = useState([]);
  const [packagingRows, setPackagingRows] = useState([]);
  const [investmentRows, setInvestmentRows] = useState([]);

  const pieRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const remembered = localStorage.getItem("pricingCreatedBy") || "";
    setCreatedBy(remembered);
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

        const init = buildInitialScenarioFromEngineering(reqPayload, engPayload);

        if (scJson.success) {
          const saved = scJson.pricingData || {};

          setScenarioName(scJson.scenario?.ScenarioName || "");
          setScenarioNote(scJson.scenario?.ScenarioNote || "");
          setCreatedBy(scJson.scenario?.CreatedBy || localStorage.getItem("pricingCreatedBy") || "");
          setScenarioStatus(scJson.scenario?.ScenarioStatus || "Draft");
          setCompareSelected((scJson.scenario?.CompareSelected || "") === "Yes");

          setPricing((prev) => ({
            ...prev,
            ...(saved.pricing || {}),
            currency: scJson.scenario?.ScenarioCurrency || saved?.pricing?.currency || "",
            usdEgp: scJson.scenario?.UsdEgp || saved?.pricing?.usdEgp || "",
            eurUsd: scJson.scenario?.EurUsd || saved?.pricing?.eurUsd || "",
          }));

          setScenarioSheet(saved.sheetScenario || init.scenarioSheet);
          setMaterialRows(saved.materialRows || init.materialRows);
          setPackagingRows(saved.packagingRows || init.packagingRows);
          setInvestmentRows(saved.investmentRows || init.investmentRows || []);
        } else {
          setScenarioSheet(init.scenarioSheet);
          setMaterialRows(init.materialRows);
          setPackagingRows(init.packagingRows);
          setInvestmentRows(init.investmentRows || []);
        }

        setInitialized(true);
      } catch (error) {
        console.error("Failed to load pricing scenario:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [requestId, pricingId]);

  const customerBlock = requestData?.customer || {};
  const primaryCustomer = customerBlock?.customers?.[0] || {};
  const product = requestData?.product || {};
  const project = requestData?.project || {};
  const ms = engineeringData?.materialSheet || {};
  const ss = engineeringData?.sheetSpecs || {};
  const ex = engineeringData?.extrusion || {};
  const sheetPk = engineeringData?.sheetPackaging || {};
  const reqPk = requestData?.packaging || {};
  const tooling = engineeringData?.tooling || {};

  const thumb =
    product?.productThumbnailUrl ||
    product?.productThumbnailPreview ||
    (product?.productThumbnailBase64
      ? `data:image/*;base64,${product.productThumbnailBase64}`
      : "");

  const missingRequired =
    !scenarioName.trim() ||
    !createdBy.trim() ||
    !scenarioStatus.trim() ||
    !scenarioNote.trim() ||
    !pricing.currency ||
    !pricing.usdEgp ||
    !pricing.eurUsd;

  const engineerReference = useMemo(() => {
    const baseMaterial =
      ms.baseMaterial || product.sheetMaterial || product.productMaterial || "";

    return {
      productName: project.projectName || requestId,
      productCode: requestId,
      baseMaterial,
      density: toNum(ms.density) || DENSITY_MAP[baseMaterial] || "",
      netWidth_mm: ss.netWidth_mm || "",
      grossWidth_mm:
        ss.grossWidth_mm ||
        (toNum(ss.netWidth_mm) && toNum(ss.edgeTrimPerSide_mm)
          ? String(toNum(ss.netWidth_mm) + 2 * toNum(ss.edgeTrimPerSide_mm))
          : ""),
      edgeTrimPerSide_mm: ss.edgeTrimPerSide_mm || "",
      widthTolPlus_mm: ss.widthTolPlus_mm || ss.widthTolerancePlus_mm || "",
      widthTolMinus_mm: ss.widthTolMinus_mm || ss.widthToleranceMinus_mm || "",
      thickness_mic: ss.thickness_mic || "",
      thicknessTolPlus_mic: ss.thicknessTolPlus_mic || ss.thicknessTolerancePlus_mic || "",
      thicknessTolMinus_mic: ss.thicknessTolMinus_mic || ss.thicknessToleranceMinus_mic || "",
      coreType: ss.coreType || "",
      coreDiameter_mm: ss.coreDiameter_mm || "",
      rollDiameter_mm: ss.rollDiameter_mm || "",
      rollWeight_kg: ss.rollTargetWeight_kg || ss.rollWeight_kg || "",
      layerStructure: ms.structure || "AB",
      coatingUsed: ms.coatingUsed || "No",
      coatingName: ms.coatingName || "",
      coatingWeight_g_m2: ms.coatingWeight_g_m2 || "",
      grossSpeedA_kg_hr: ex.grossSpeedA_kg_hr || ex.grossSpeed_kg_hr || "",
      grossSpeedB_kg_hr: ex.grossSpeedB_kg_hr || "",
      efficiencyPct: ex.efficiencyPct || "",
      sheetUtilizationPct: ex.netEfficiencyPct || ex.sheetUtilizationPct || "",
    };
  }, [project.projectName, ex, ms, product, requestId, ss]);

  const requestReference = useMemo(() => {
    return {
      productName: project.projectName || requestId,
      productCode: requestId,
      baseMaterial: product.sheetMaterial || product.productMaterial || "",
      density: "",
      netWidth_mm: product.sheetWidthMm || "",
      grossWidth_mm: "",
      edgeTrimPerSide_mm: "",
      widthTolPlus_mm: "",
      widthTolMinus_mm: "",
      thickness_mic: product.sheetThicknessMicron || "",
      thicknessTolPlus_mic: "",
      thicknessTolMinus_mic: "",
      coreType: product.coreMaterial || "",
      coreDiameter_mm: "",
      rollDiameter_mm: "",
      rollWeight_kg: product.rollWeightKg || "",
      layerStructure: "AB",
      coatingUsed: "No",
      coatingName: "",
      coatingWeight_g_m2: "",
      grossSpeedA_kg_hr: "",
      grossSpeedB_kg_hr: "",
      efficiencyPct: "",
      sheetUtilizationPct: "",
    };
  }, [project.projectName, product, requestId]);

  const scenarioDerived = useMemo(() => {
    if (!scenarioSheet) return null;

    const density = toNum(scenarioSheet.density);
    const netWidth_mm = toNum(scenarioSheet.netWidth_mm);
    const edgeTrimPerSide_mm = toNum(scenarioSheet.edgeTrimPerSide_mm);
    const grossWidth_mm =
      toNum(scenarioSheet.grossWidth_mm) ||
      (netWidth_mm && edgeTrimPerSide_mm ? netWidth_mm + 2 * edgeTrimPerSide_mm : 0);

    const thickness_mic = toNum(scenarioSheet.thickness_mic);
    const rollDiameter_mm = toNum(scenarioSheet.rollDiameter_mm);
    const rollWeight_kg = toNum(scenarioSheet.rollWeight_kg);
    const coreDiameter_mm = toNum(scenarioSheet.coreDiameter_mm);

    const trimLossPct =
      grossWidth_mm > 0 ? (1 - netWidth_mm / grossWidth_mm) * 100 : 0;

    const plasticWeightPerM2_g =
      density && thickness_mic ? density * thickness_mic : 0;

    const coatingWeightPerM2_g =
      String(scenarioSheet.coatingUsed || "No") === "Yes"
        ? toNum(scenarioSheet.coatingWeight_g_m2)
        : 0;

    const totalWeightPerM2_g = plasticWeightPerM2_g + coatingWeightPerM2_g;

    let calcRollWeight_kg = 0;
    if (rollDiameter_mm && coreDiameter_mm && netWidth_mm && totalWeightPerM2_g) {
      const outerRadiusM = rollDiameter_mm / 1000 / 2;
      const innerRadiusM = coreDiameter_mm / 1000 / 2;
      const widthM = netWidth_mm / 1000;
      const volumeM3 =
        Math.PI * (outerRadiusM * outerRadiusM - innerRadiusM * innerRadiusM) * widthM;
      const equivalentThicknessM = totalWeightPerM2_g / 1_000_000;
      const areaM2 = equivalentThicknessM > 0 ? volumeM3 / equivalentThicknessM : 0;
      calcRollWeight_kg = areaM2 * totalWeightPerM2_g;
    }

    let calcRollDiameter_mm = 0;
    if (rollWeight_kg && coreDiameter_mm && netWidth_mm && totalWeightPerM2_g) {
      const areaM2 = totalWeightPerM2_g > 0 ? rollWeight_kg / totalWeightPerM2_g : 0;
      const widthM = netWidth_mm / 1000;
      const eqThicknessM = totalWeightPerM2_g / 1_000_000;
      const volumeM3 = areaM2 * eqThicknessM;
      const innerRadiusM = coreDiameter_mm / 1000 / 2;
      const radiusSquared =
        widthM > 0 ? volumeM3 / (Math.PI * widthM) + innerRadiusM * innerRadiusM : 0;
      calcRollDiameter_mm = radiusSquared > 0 ? Math.sqrt(radiusSquared) * 2 * 1000 : 0;
    }

    const grossSpeedA = toNum(scenarioSheet.grossSpeedA_kg_hr);
    const grossSpeedB = toNum(scenarioSheet.grossSpeedB_kg_hr);
    const totalGrossSpeed = grossSpeedA + grossSpeedB;
    const efficiencyPct = toNum(scenarioSheet.efficiencyPct);
    const effFactor = efficiencyPct / 100;

    const netSpeed_kg_hr =
      totalGrossSpeed *
      (grossWidth_mm > 0 ? netWidth_mm / grossWidth_mm : 0) *
      effFactor;

    const tonsPerDay = (netSpeed_kg_hr * 24) / 1000;

    return {
      grossWidth_mm,
      trimLossPct,
      plasticWeightPerM2_g,
      coatingWeightPerM2_g,
      totalWeightPerM2_g,
      calcRollWeight_kg,
      calcRollDiameter_mm,
      totalGrossSpeed,
      netSpeed_kg_hr,
      tonsPerDay,
    };
  }, [scenarioSheet]);

  const materialSummary = useMemo(() => {
    if (!scenarioSheet || !scenarioDerived) return [];

    const layerAShare = toNum(ms.layerAPct) / 100;
    const layerBShare = 1 - layerAShare;

    const grouped = new Map();

    materialRows.forEach((row) => {
      const name = String(row.name || "").trim();
      if (!name) return;

      if (!grouped.has(name)) {
        grouped.set(name, {
          name,
          pctLayerA: 0,
          pctLayerB: 0,
          isCoating: row.layer === "Coating",
          price: toNum(row.price),
          currency: row.currency || "EGP",
          ratePct: toNum(row.ratePct),
        });
      }

      const item = grouped.get(name);
      item.price = toNum(row.price);
      item.currency = row.currency || "EGP";
      item.ratePct = toNum(row.ratePct);

      if (row.layer === "A") item.pctLayerA += toNum(row.scenarioPct);
      if (row.layer === "B") item.pctLayerB += toNum(row.scenarioPct);
    });

    const plasticShare =
      scenarioDerived.totalWeightPerM2_g > 0
        ? 1 - scenarioDerived.coatingWeightPerM2_g / scenarioDerived.totalWeightPerM2_g
        : 1;

    return Array.from(grouped.values()).map((item) => {
      let baseQty = 0;
      let finalPct = 0;

      if (item.isCoating) {
        baseQty =
          scenarioDerived.totalWeightPerM2_g > 0
            ? 1000 * (scenarioDerived.coatingWeightPerM2_g / scenarioDerived.totalWeightPerM2_g)
            : 0;
      } else {
        finalPct =
          (item.pctLayerA / 100) * layerAShare +
          (item.pctLayerB / 100) * layerBShare;
        baseQty = finalPct * 1000 * plasticShare;
      }

      const wastePct = item.ratePct;
      const wasteQty = baseQty * (wastePct / 100);
      const totalQty = baseQty + wasteQty;

      const convertedPrice = convertAmount(
        item.price,
        item.currency,
        pricing.currency || "EGP",
        pricing.usdEgp,
        pricing.eurUsd
      );

      const baseCost = baseQty * convertedPrice;
      const wasteCost = wasteQty * convertedPrice;
      const totalCost = totalQty * convertedPrice;

      return {
        ...item,
        finalPct: finalPct * 100,
        baseQty,
        wastePct,
        wasteQty,
        totalQty,
        convertedPrice,
        baseCost,
        wasteCost,
        totalCost,
      };
    });
  }, [materialRows, ms.layerAPct, pricing.currency, pricing.eurUsd, pricing.usdEgp, scenarioDerived, scenarioSheet]);

  const packagingSummary = useMemo(() => {
    if (!scenarioSheet) return [];

    const rollsPerPallet = toNum(
      packagingRows.find((r) => r.id === "rolls-per-pallet")?.scenarioQty || 0
    );

    return packagingRows
      .filter((row) => row.name && (toNum(row.scenarioQty) || row.id === "core" || row.id === "pallet"))
      .map((row) => {
        const baseQty = toNum(row.scenarioQty || 0);
        const wastePct = toNum(row.wastePct || 0);
        const wasteQty = baseQty * (wastePct / 100);
        const totalQty = baseQty + wasteQty;

        const convertedPrice = convertAmount(
          row.price,
          row.currency,
          pricing.currency || "EGP",
          pricing.usdEgp,
          pricing.eurUsd
        );

        let costPerPallet = totalQty * convertedPrice;

        if (row.id === "rolls-per-pallet") {
          costPerPallet = 0;
        }

        const costPerTon =
          rollsPerPallet > 0 && toNum(scenarioSheet.rollWeight_kg) > 0
            ? costPerPallet / ((rollsPerPallet * toNum(scenarioSheet.rollWeight_kg)) / 1000)
            : 0;

        return {
          ...row,
          baseQty,
          wastePct,
          wasteQty,
          totalQty,
          convertedPrice,
          costPerPallet,
          costPerTon,
        };
      });
  }, [packagingRows, pricing.currency, pricing.eurUsd, pricing.usdEgp, scenarioSheet]);

  const materialBaseCost = materialSummary.reduce((s, r) => s + r.baseCost, 0);
  const materialWasteCost = materialSummary.reduce((s, r) => s + r.wasteCost, 0);
  const materialCost = materialSummary.reduce((s, r) => s + r.totalCost, 0);

  const packagingBaseCost = packagingSummary.reduce((s, r) => s + r.baseQty * r.convertedPrice, 0);
  const packagingWasteCost = packagingSummary.reduce((s, r) => s + r.wasteQty * r.convertedPrice, 0);
  const packagingCost = packagingSummary.reduce((s, r) => s + r.costPerTon, 0);

  const conversionPerTon = toNum(pricing.conversionPerTon);
  const totalPerTon = materialCost + packagingCost + conversionPerTon;

  useEffect(() => {
    if (!pieRef.current || !initialized || activeTab !== "results") return;

    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(pieRef.current, {
      type: "pie",
      data: {
        labels: [
          "Material Base",
          "Material Waste",
          "Packaging Base",
          "Packaging Waste",
          "Conversion",
        ],
        datasets: [
          {
            data: [
              materialBaseCost,
              materialWasteCost,
              packagingBaseCost,
              packagingWasteCost,
              conversionPerTon,
            ],
          },
        ],
      },
      options: {
        plugins: {
          legend: { position: "bottom" },
        },
      },
    });

    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [
    activeTab,
    conversionPerTon,
    initialized,
    materialBaseCost,
    materialWasteCost,
    packagingBaseCost,
    packagingWasteCost,
  ]);

  const updateScenarioSheet = (key, value) => {
    setScenarioSheet((prev) => {
      const next = { ...prev, [key]: value };

      if (key === "netWidth_mm" || key === "edgeTrimPerSide_mm") {
        const netW = toNum(key === "netWidth_mm" ? value : next.netWidth_mm);
        const trim = toNum(key === "edgeTrimPerSide_mm" ? value : next.edgeTrimPerSide_mm);
        if (netW || trim) {
          next.grossWidth_mm = String(netW + 2 * trim);
        }
      }

      return next;
    });
  };

  const updateMaterialRow = (id, patch) => {
    setMaterialRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  };

  const updatePackagingRow = (id, patch) => {
    setPackagingRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  };

  const updateInvestmentRow = (index, patch) => {
    setInvestmentRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  const addInvestmentRow = () => {
    setInvestmentRows((prev) => [
      ...prev,
      {
        name: "",
        type: "",
        value: "",
        currency: "EGP",
        exchangeRate: "",
        supplier: "",
        leadTimeWeeks: "",
      },
    ]);
  };

  const removeInvestmentRow = (index) => {
    setInvestmentRows((prev) => prev.filter((_, i) => i !== index));
  };

  const saveScenario = async () => {
    try {
      if (missingRequired) {
        alert("Please complete all required scenario fields.");
        return;
      }

      localStorage.setItem("pricingCreatedBy", createdBy.trim());

      const pricingData = {
        pricing,
        sheetScenario: scenarioSheet,
        materialRows,
        packagingRows,
        investmentRows,
        sheetSummary: {
          totalPerTon,
          materialBaseCost,
          materialWasteCost,
          packagingBaseCost,
          packagingWasteCost,
          conversionPerTon,
          tonsPerDay: scenarioDerived?.tonsPerDay || 0,
          netExtruderKgPerHour: scenarioDerived?.netSpeed_kg_hr || 0,
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
          scenarioName,
          scenarioNote,
          createdBy,
          scenarioStatus,
          compareSelected,
          scenarioCurrency: pricing.currency,
          usdEgp: pricing.usdEgp,
          eurUsd: pricing.eurUsd,
          pricingData,
          totalCostPer1000: totalPerTon,
          sellingPricePer1000: "",
          marginPct: "",
        }),
      });

      const json = await res.json();
      if (!json.success) {
        alert(json.error || "Failed to save scenario");
        return;
      }

      alert("Scenario saved");
    } catch (error) {
      console.error(error);
      alert("Failed to save scenario");
    }
  };

  const markAsCompleted = async () => {
    try {
      const reqRes = await fetch(`/.netlify/functions/get-request?requestId=${requestId}`);
      const reqJson = await reqRes.json();

      if (!reqJson.success) {
        alert("Failed to load request");
        return;
      }

      const payload = reqJson.payload || {};

      const saveRes = await fetch("/.netlify/functions/save-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...payload,
          metadata: {
            ...(payload.metadata || {}),
            status: "Completed",
          },
        }),
      });

      const saveJson = await saveRes.json();

      if (!saveJson.success) {
        alert("Failed to update project status");
        return;
      }

      alert("✅ Project marked as Completed");
    } catch (err) {
      console.error(err);
      alert("Error completing project");
    }
  };

  const goToThermoPricing = async () => {
    try {
      if (missingRequired) {
        alert("Please complete all required scenario fields before going to thermo pricing.");
        return;
      }

      localStorage.setItem("pricingCreatedBy", createdBy.trim());

      const thermoBundle = {
        requestId,
        pricingId,
        sheetName: project.projectName || product.productType || "Sheet",
        sheetCode: requestId,
        usdEgp: pricing.usdEgp,
        eurUsd: pricing.eurUsd,
        currency: pricing.currency,
        sheetMaterialCostPerTon: materialCost,
        sheetPackagingCostPerTon: packagingCost,
        netExtruderKgPerHour: scenarioDerived?.netSpeed_kg_hr || 0,
        netExtruderKgPerDay: (scenarioDerived?.netSpeed_kg_hr || 0) * 24,
        bomPerTon: materialSummary.map((x) => ({
          name: x.name,
          kg: x.totalQty,
        })),
        tooling,
      };

      const pricingData = {
        pricing,
        sheetScenario: scenarioSheet,
        materialRows,
        packagingRows,
        investmentRows,
        sheetSummary: {
          totalPerTon,
          materialBaseCost,
          materialWasteCost,
          packagingBaseCost,
          packagingWasteCost,
          conversionPerTon,
          tonsPerDay: scenarioDerived?.tonsPerDay || 0,
          netExtruderKgPerHour: scenarioDerived?.netSpeed_kg_hr || 0,
        },
        thermoBundle,
      };

      const res = await fetch("/.netlify/functions/save-pricing-scenario", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          pricingId,
          scenarioName,
          scenarioNote,
          createdBy,
          scenarioStatus,
          compareSelected,
          scenarioCurrency: pricing.currency,
          usdEgp: pricing.usdEgp,
          eurUsd: pricing.eurUsd,
          pricingData,
          totalCostPer1000: totalPerTon,
          sellingPricePer1000: "",
          marginPct: "",
        }),
      });

      const json = await res.json();
      if (!json.success) {
        alert(json.error || "Failed to save scenario before thermo pricing");
        return;
      }

      navigate(`/pricing/${requestId}/scenario/${pricingId}/thermo`, {
        state: { bundle: thermoBundle },
      });
    } catch (error) {
      console.error(error);
      alert("Failed to open thermo pricing");
    }
  };

  if (loading || !scenarioSheet) {
    return <div className="p-6">Loading pricing data...</div>;
  }

  if (!engineeringData) {
    return <div className="p-6">No engineering data found for this project.</div>;
  }

  const engineeringFields = [
    ["Product Name", "productName"],
    ["Product Code", "productCode"],
    ["Base Material", "baseMaterial"],
    ["Density", "density"],
    ["Net Width (mm)", "netWidth_mm"],
    ["Edge Trim / Side (mm)", "edgeTrimPerSide_mm"],
    ["Gross Width (mm)", "grossWidth_mm"],
    ["Width + Tol (mm)", "widthTolPlus_mm"],
    ["Width - Tol (mm)", "widthTolMinus_mm"],
    ["Thickness (mic)", "thickness_mic"],
    ["Thickness + Tol (mic)", "thicknessTolPlus_mic"],
    ["Thickness - Tol (mic)", "thicknessTolMinus_mic"],
    ["Core Type", "coreType"],
    ["Core Diameter (mm)", "coreDiameter_mm"],
    ["Roll Diameter (mm)", "rollDiameter_mm"],
    ["Roll Weight (kg)", "rollWeight_kg"],
    ["Layer Structure", "layerStructure"],
    ["Coating Used", "coatingUsed"],
    ["Coating Name", "coatingName"],
    ["Coating Weight (g/m²)", "coatingWeight_g_m2"],
    ["Gross Speed A (kg/hr)", "grossSpeedA_kg_hr"],
    ["Gross Speed B (kg/hr)", "grossSpeedB_kg_hr"],
    ["Extruder Efficiency %", "efficiencyPct"],
    ["Sheet Utilization %", "sheetUtilizationPct"],
  ];

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
              {project.projectName || requestId} • {product.productType || "—"} • {pricingId}
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
            disabled={missingRequired}
            className={`px-4 py-2 rounded-md text-white ${
              missingRequired ? "bg-gray-400" : "bg-black hover:bg-gray-800"
            }`}
          >
            Save Scenario
          </button>

          <button
            onClick={goToThermoPricing}
            disabled={missingRequired}
            className={`px-4 py-2 rounded-md text-white ${
              missingRequired ? "bg-gray-400" : "bg-emerald-600 hover:bg-emerald-500"
            }`}
          >
            ➜ Thermo Pricing
          </button>

          <button
            onClick={markAsCompleted}
            disabled={missingRequired}
            className={`px-4 py-2 rounded-md text-white ${
              missingRequired ? "bg-gray-400" : "bg-green-600 hover:bg-green-500"
            }`}
          >
            ✔ Complete Project
          </button>
        </div>
      </div>

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
            <ScenarioInput
              value={scenarioName}
              onChange={setScenarioName}
              placeholder="Scenario name"
            />
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Creator</div>
            <ScenarioInput
              value={createdBy}
              onChange={setCreatedBy}
              placeholder="Creator"
            />
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Status</div>
            <select
              className="border p-2 rounded w-full"
              value={scenarioStatus}
              onChange={(e) => setScenarioStatus(e.target.value)}
            >
              <option value="">Select</option>
              <option>Draft</option>
              <option>Final</option>
              <option>Archived</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={compareSelected}
                onChange={(e) => setCompareSelected(e.target.checked)}
              />
              Add to comparison
            </label>
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-gray-500 mb-1">Notes</div>
            <ScenarioInput
              value={scenarioNote}
              onChange={setScenarioNote}
              placeholder="Scenario notes"
            />
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Offer Currency</div>
            <select
              className={`border p-2 rounded w-full ${
                !pricing.currency ? "border-red-400 bg-red-50" : ""
              }`}
              value={pricing.currency}
              onChange={(e) => setPricing({ ...pricing, currency: e.target.value })}
            >
              <option value="">Select</option>
              <option>EGP</option>
              <option>USD</option>
              <option>EUR</option>
            </select>
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">USD / EGP Exchange Rate</div>
            <ScenarioInput
              value={pricing.usdEgp}
              onChange={(v) => setPricing({ ...pricing, usdEgp: v })}
              placeholder="USD/EGP"
            />
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">EUR / USD Exchange Rate</div>
            <ScenarioInput
              value={pricing.eurUsd}
              onChange={(v) => setPricing({ ...pricing, eurUsd: v })}
              placeholder="EUR/USD"
            />
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Required Conversion / ton</div>
            <ScenarioInput
              value={pricing.conversionPerTon}
              onChange={(v) => setPricing({ ...pricing, conversionPerTon: v })}
              placeholder="Required conversion / ton"
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
        <Card
          title="Engineering Data"
          right={
            scenarioDerived?.trimLossPct > 15 ? (
              <SectionNote tone="red">Trim loss is above 15%.</SectionNote>
            ) : (
              <SectionNote tone="green">
                Trim loss = {fmt(scenarioDerived?.trimLossPct || 0, 2)}%
              </SectionNote>
            )
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
            <div className="font-medium text-gray-500">Parameter</div>
            <div className="font-medium text-gray-500">Scenario Value</div>
            <div className="font-medium text-gray-500">Engineering Review</div>
            <div className="font-medium text-gray-500">Request Initiation</div>

            {engineeringFields.map(([label, key]) => (
              <div key={key} className="contents">
                <div className="py-1">{label}</div>

                <div>
                  {["baseMaterial", "coreType", "coatingUsed", "layerStructure"].includes(key) ? (
                    <SelectInput
                      value={scenarioSheet[key]}
                      onChange={(v) => updateScenarioSheet(key, v)}
                      changed={isDifferent(scenarioSheet[key], engineerReference[key])}
                      options={
                        key === "baseMaterial"
                          ? ["PP", "PET", "PS", "Other"]
                          : key === "coreType"
                          ? ["", "Cardboard", "3 inch core", "6 inch core", "8 inch core"]
                          : key === "coatingUsed"
                          ? ["No", "Yes"]
                          : ["AB", "ABA", "ABC", "Mono"]
                      }
                    />
                  ) : (
                    <NumberInput
                      value={scenarioSheet[key]}
                      onChange={(v) => updateScenarioSheet(key, v)}
                      changed={isDifferent(scenarioSheet[key], engineerReference[key])}
                    />
                  )}
                </div>

                <div
                  className={`text-xs rounded p-2 border ${
                    isDifferent(scenarioSheet[key], engineerReference[key])
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-gray-200 bg-gray-50 text-gray-700"
                  }`}
                >
                  {engineerReference[key] || "—"}
                </div>

                <div className="text-xs rounded p-2 border border-gray-200 bg-gray-50 text-gray-700">
                  {requestReference[key] || "—"}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
            <ValueCell value={fmt(scenarioDerived?.plasticWeightPerM2_g || 0, 3)} unit=" g/m² plastic" />
            <ValueCell value={fmt(scenarioDerived?.coatingWeightPerM2_g || 0, 3)} unit=" g/m² coating" />
            <ValueCell value={fmt(scenarioDerived?.totalWeightPerM2_g || 0, 3)} unit=" g/m² total" />
            <ValueCell value={fmt(scenarioDerived?.calcRollWeight_kg || 0, 3)} unit=" kg calc roll wt" />
            <ValueCell value={fmt(scenarioDerived?.calcRollDiameter_mm || 0, 3)} unit=" mm calc roll dia" />
          </div>
        </Card>
      )}

      {activeTab === "bom" && (
        <>
          <Card title="Material BOM Unit Price">
            <SectionNote tone="gray">
              Enter each material price in its own currency. The system converts everything to the selected offer currency.
            </SectionNote>

            <div className="grid grid-cols-1 md:grid-cols-9 gap-3 text-sm">
              <div className="font-medium text-gray-500">Material</div>
              <div className="font-medium text-gray-500">Layer</div>
              <div className="font-medium text-gray-500">Eng. %</div>
              <div className="font-medium text-gray-500">Scenario %</div>
              <div className="font-medium text-gray-500">Consumption / ton</div>
              <div className="font-medium text-gray-500">Waste %</div>
              <div className="font-medium text-gray-500">Price</div>
              <div className="font-medium text-gray-500">Currency</div>
              <div className="font-medium text-gray-500">Cost / ton</div>

              {materialRows.map((row) => {
                const summaryRow = materialSummary.find((m) => m.name === row.name);
                return (
                  <div key={row.id} className="contents">
                    <div className="py-1">{row.name}</div>
                    <div className="py-1">{row.layer}</div>
                    <ValueCell value={row.engPct || "—"} unit={row.engPct ? "%" : ""} />
                    <div>
                      <ScenarioInput
                        value={row.scenarioPct}
                        onChange={(v) => updateMaterialRow(row.id, { scenarioPct: v })}
                        changed={isDifferent(row.scenarioPct, row.engPct)}
                      />
                    </div>
                    <ValueCell value={fmt(summaryRow?.baseQty || 0, 3)} unit=" kg" />
                    <div>
                      <ScenarioInput
                        value={row.ratePct}
                        onChange={(v) => updateMaterialRow(row.id, { ratePct: v })}
                      />
                    </div>
                    <div>
                      <ScenarioInput
                        value={row.price}
                        onChange={(v) => updateMaterialRow(row.id, { price: v })}
                      />
                    </div>
                    <div>
                      <SelectInput
                        value={row.currency || "EGP"}
                        onChange={(v) => updateMaterialRow(row.id, { currency: v })}
                        options={["EGP", "USD", "EUR"]}
                      />
                    </div>
                    <ValueCell value={fmt(summaryRow?.totalCost || 0, 3)} />
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
              <SectionNote tone="green">
                Material Cost / Ton = {fmt(materialCost, 3)} {pricing.currency || "EGP"}
              </SectionNote>
              <SectionNote tone="orange">
                Material Waste / Ton = {fmt(materialWasteCost, 3)} {pricing.currency || "EGP"}
              </SectionNote>
            </div>
          </Card>

          <Card title="Packaging BOM">
            <SectionNote tone="gray">
              Engineering values are prefilled. Scenario values can be changed for pricing assumptions.
            </SectionNote>

            <div className="grid grid-cols-1 md:grid-cols-8 gap-3 text-sm">
              <div className="font-medium text-gray-500">Item</div>
              <div className="font-medium text-gray-500">Eng. Qty</div>
              <div className="font-medium text-gray-500">Scenario Qty</div>
              <div className="font-medium text-gray-500">Unit</div>
              <div className="font-medium text-gray-500">Waste %</div>
              <div className="font-medium text-gray-500">Price</div>
              <div className="font-medium text-gray-500">Currency</div>
              <div className="font-medium text-gray-500">Cost / ton</div>

              {packagingRows.map((row) => {
                const summaryRow = packagingSummary.find((p) => p.id === row.id);
                return (
                  <div key={row.id} className="contents">
                    <div className="py-1">{row.name}</div>
                    <ValueCell value={row.engQty} />
                    <div>
                      <ScenarioInput
                        value={row.scenarioQty}
                        onChange={(v) => updatePackagingRow(row.id, { scenarioQty: v })}
                        changed={isDifferent(row.scenarioQty, String(row.engQty ?? ""))}
                      />
                    </div>
                    <div>
                      <SelectInput
                        value={row.unit || "unit"}
                        onChange={(v) => updatePackagingRow(row.id, { unit: v })}
                        options={["unit", "kg", "g", "m", "ton", "roll"]}
                      />
                    </div>
                    <div>
                      <ScenarioInput
                        value={row.wastePct}
                        onChange={(v) => updatePackagingRow(row.id, { wastePct: v })}
                      />
                    </div>
                    <div>
                      <ScenarioInput
                        value={row.price}
                        onChange={(v) => updatePackagingRow(row.id, { price: v })}
                      />
                    </div>
                    <div>
                      <SelectInput
                        value={row.currency || "EGP"}
                        onChange={(v) => updatePackagingRow(row.id, { currency: v })}
                        options={["EGP", "USD", "EUR"]}
                      />
                    </div>
                    <ValueCell value={fmt(summaryRow?.costPerTon || 0, 3)} />
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
              <SectionNote tone="green">
                Packaging Cost / Ton = {fmt(packagingCost, 3)} {pricing.currency || "EGP"}
              </SectionNote>
              <SectionNote tone="orange">
                Packaging Waste / Ton = {fmt(packagingWasteCost, 3)} {pricing.currency || "EGP"}
              </SectionNote>
            </div>

            <SectionNote tone="green">
              Packing instruction: Use {scenarioSheet.coreType || "selected core"} with{" "}
              {scenarioSheet.coreDiameter_mm || "selected diameter"} mm core diameter and target roll
              diameter {scenarioSheet.rollDiameter_mm || "—"} mm / roll weight{" "}
              {scenarioSheet.rollWeight_kg || "—"} kg. Put{" "}
              {packagingRows.find((r) => r.id === "rolls-per-pallet")?.scenarioQty || "—"} rolls on
              each pallet, use {packagingRows.find((r) => r.id === "separator")?.scenarioQty || "—"}{" "}
              separators, {packagingRows.find((r) => r.id === "strap")?.scenarioQty || "—"} m strap,
              and {packagingRows.find((r) => r.id === "stretch")?.scenarioQty || "—"} kg stretch film.
            </SectionNote>
          </Card>

          <Card title="Decoration Cost">
            <SectionNote tone="gray">
              Decoration cost section placeholder. We will connect it next to the engineering decoration data and pricing inputs.
            </SectionNote>
          </Card>

          <Card title="Working Capital Cost">
            <SectionNote tone="gray">
              Working capital cost section placeholder. We will add DSO, DIO, DPO and interest logic in the next step.
            </SectionNote>
          </Card>

          <Card title="Freight Cost">
            <SectionNote tone="gray">
              Freight cost section placeholder. We will connect it to Engineering Review freight and container/truck data next.
            </SectionNote>
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

          {investmentRows.length === 0 ? (
            <div className="text-sm text-gray-500">No investments added yet.</div>
          ) : (
            <div className="space-y-3">
              {investmentRows.map((row, index) => (
                <div key={index} className="rounded-xl border p-3">
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Investment Name</div>
                      <ScenarioInput
                        value={row.name || ""}
                        onChange={(v) => updateInvestmentRow(index, { name: v })}
                      />
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 mb-1">Type</div>
                      <ScenarioInput
                        value={row.type || ""}
                        onChange={(v) => updateInvestmentRow(index, { type: v })}
                      />
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 mb-1">Value</div>
                      <ScenarioInput
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
                      <ScenarioInput
                        value={row.exchangeRate || ""}
                        onChange={(v) => updateInvestmentRow(index, { exchangeRate: v })}
                      />
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 mb-1">Supplier</div>
                      <ScenarioInput
                        value={row.supplier || ""}
                        onChange={(v) => updateInvestmentRow(index, { supplier: v })}
                      />
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 mb-1">Lead Time (weeks)</div>
                      <ScenarioInput
                        value={row.leadTimeWeeks || ""}
                        onChange={(v) => updateInvestmentRow(index, { leadTimeWeeks: v })}
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
        </Card>
      )}

      {activeTab === "results" && (
        <>
          <Card title="Results Summary">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Material Base Cost</span>
                <span>{fmt(materialBaseCost)}</span>
              </div>
              <div className="flex justify-between">
                <span>Material Waste Cost</span>
                <span>{fmt(materialWasteCost)}</span>
              </div>
              <div className="flex justify-between">
                <span>Packaging Base Cost</span>
                <span>{fmt(packagingBaseCost)}</span>
              </div>
              <div className="flex justify-between">
                <span>Packaging Waste Cost</span>
                <span>{fmt(packagingWasteCost)}</span>
              </div>
              <div className="flex justify-between">
                <span>Conversion / ton</span>
                <span>{fmt(conversionPerTon)}</span>
              </div>
              <div className="flex justify-between">
                <span>Offer Currency</span>
                <span>{pricing.currency || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span>USD / EGP</span>
                <span>{fmt(pricing.usdEgp, 3)}</span>
              </div>
              <div className="flex justify-between">
                <span>EUR / USD</span>
                <span>{fmt(pricing.eurUsd, 4)}</span>
              </div>
              <div className="flex justify-between">
                <span>Net Extruder Speed</span>
                <span>{fmt(scenarioDerived?.netSpeed_kg_hr || 0, 3)} kg/hr</span>
              </div>
              <div className="flex justify-between">
                <span>Net Productivity</span>
                <span>{fmt(scenarioDerived?.tonsPerDay || 0, 3)} ton/day</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Total / ton</span>
                <span>{fmt(totalPerTon)}</span>
              </div>
            </div>
          </Card>

          <div className="bg-white border rounded-xl p-4">
            <canvas ref={pieRef}></canvas>
          </div>
        </>
      )}

      <Card title="Scenario Comparison Snapshot">
        <SectionNote tone="gray">
          Placeholder only for now. Comparison snapshot details will be added later.
        </SectionNote>
      </Card>

      <Card title="Project Reference">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <ValueCell value={primaryCustomer.customerName || "—"} />
          <ValueCell value={project.projectName || "—"} />
          <ValueCell value={product.productType || "—"} />
          <ValueCell value={requestId || "—"} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs text-gray-500">
          <div>Customer</div>
          <div>Project</div>
          <div>Product</div>
          <div>Request No.</div>
        </div>
      </Card>

      <Card title="Pulled Request Packaging Reference">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          <ValueCell value={reqPk?.primary?.pcsPerStack || "—"} />
          <ValueCell value={reqPk?.primary?.stacksPerBag || "—"} />
          <ValueCell value={reqPk?.secondary?.bagsPerCarton || "—"} />
          <ValueCell value={reqPk?.pallet?.cartonsPerPallet || "—"} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs text-gray-500">
          <div>Pieces / Stack</div>
          <div>Stacks / Bag</div>
          <div>Bags / Carton</div>
          <div>Cartons / Pallet</div>
        </div>
      </Card>

      <Card title="Pulled Engineering Sheet Packaging Reference">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
          <ValueCell value={sheetPk?.rollsPerPallet || "—"} />
          <ValueCell value={sheetPk?.labelsPerRoll || "—"} />
          <ValueCell value={sheetPk?.separatorsPerPallet || "—"} />
          <ValueCell value={sheetPk?.strapLength_m || "—"} />
          <ValueCell value={sheetPk?.stretchKgPerPallet || "—"} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs text-gray-500">
          <div>Rolls / Pallet</div>
          <div>Labels / Roll</div>
          <div>Separators / Pallet</div>
          <div>Strap Length / Pallet</div>
          <div>Stretch Film / Pallet</div>
        </div>
      </Card>
    </div>
  );
}