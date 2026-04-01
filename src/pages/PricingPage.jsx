import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Chart from "chart.js/auto";
const project = requestData?.project || {};
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
  const customer = requestData?.customer || {};
  const ms = engineeringData?.materialSheet || {};
  const ss = engineeringData?.sheetSpecs || {};
  const ex = engineeringData?.extrusion || {};
  const pk = engineeringData?.packaging || {};

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
  const coreDiameter =
    ss.coreDiameter_mm ||
    (String(ss.coreType || "").includes("3") ? "76.2" : String(ss.coreType || "").includes("6") ? "152.4" : "");
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
      engQty: toNum(ss.labelsPerRoll || pk.labelsPerRoll || 0),
      scenarioQty: String(toNum(ss.labelsPerRoll || pk.labelsPerRoll || 0) || ""),
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
      engQty: toNum(pk.strapLengthM || 0),
      scenarioQty: String(toNum(pk.strapLengthM || 0) || ""),
      unit: "m",
      wastePct: "",
      price: "",
      currency: "EGP",
    },
    {
      id: "separator",
      name: "Separators / Pallet",
      engQty: toNum(pk.separatorCount || 0),
      scenarioQty: String(toNum(pk.separatorCount || 0) || ""),
      unit: "unit",
      wastePct: "",
      price: "",
      currency: "EGP",
    },
    {
      id: "foam",
      name: "Foam Sheet Length / Pallet",
      engQty: toNum(pk.foamWrappingM || 0),
      scenarioQty: String(toNum(pk.foamWrappingM || 0) || ""),
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
  };
}

export default function PricingPage() {
  const { requestId, pricingId } = useParams();
  const navigate = useNavigate();

  const [engineeringData, setEngineeringData] = useState(null);
  const [requestData, setRequestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

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
          setCreatedBy(scJson.scenario?.CreatedBy || "");
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
        } else {
          setScenarioSheet(init.scenarioSheet);
          setMaterialRows(init.materialRows);
          setPackagingRows(init.packagingRows);
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

  const customer = requestData?.customer || {};
  const product = requestData?.product || {};
  const ms = engineeringData?.materialSheet || {};
  const ss = engineeringData?.sheetSpecs || {};
  const ex = engineeringData?.extrusion || {};
  const pk = engineeringData?.packaging || {};
  const tooling = engineeringData?.tooling || [];

  const thumb =
    product?.productThumbnailPreview ||
    (product?.productThumbnailBase64
      ? `data:image/*;base64,${product.productThumbnailBase64}`
      : "");

  const missingRequired =
    !scenarioName.trim() ||
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
      density:
        toNum(ms.density) || DENSITY_MAP[baseMaterial] || "",
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
      thicknessTolPlus_mic:
        ss.thicknessTolPlus_mic || ss.thicknessTolerancePlus_mic || "",
      thicknessTolMinus_mic:
        ss.thicknessTolMinus_mic || ss.thicknessToleranceMinus_mic || "",
      rollDiameter_mm: ss.rollDiameter_mm || "",
      rollWeight_kg: ss.rollTargetWeight_kg || ss.rollWeight_kg || "",
      coreDiameter_mm:
        ss.coreDiameter_mm ||
        (String(ss.coreType || "").includes("3")
          ? "76.2"
          : String(ss.coreType || "").includes("6")
          ? "152.4"
          : ""),
      coreType: ss.coreType || "",
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

      if (row.layer === "A") {
        item.pctLayerA += toNum(row.scenarioPct);
      } else if (row.layer === "B") {
        item.pctLayerB += toNum(row.scenarioPct);
      }
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
        pricing.currency,
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
          pricing.currency,
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
    if (!pieRef.current || !initialized) return;

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
    // 1. Load current request
    const reqRes = await fetch(
      `/.netlify/functions/get-request?requestId=${requestId}`
    );
    const reqJson = await reqRes.json();

    if (!reqJson.success) {
      alert("Failed to load request");
      return;
    }

    const payload = reqJson.payload || {};

    // 2. Update status
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
  const goToThermo = async () => {
    if (missingRequired) {
      alert("Please complete all required scenario fields before moving to thermo pricing.");
      return;
    }

    const bundle = {
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
      thermoBundle: bundle,
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
      alert(json.error || "Failed to save scenario before thermo");
      return;
    }

    navigate(`/pricing/${requestId}/scenario/${pricingId}/thermo`, {
      state: { bundle },
    });
  };

  if (loading || !scenarioSheet) {
    return <div className="p-6">Loading pricing data...</div>;
  }

  if (!engineeringData) {
    return <div className="p-6">No engineering data found for this project.</div>;
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
            <h1 className="text-xl font-semibold">Pricing Scenario — Sheet Roll</h1>
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
            onClick={goToThermo}
            className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-500"
          >
            ➜ Thermoformed Product
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
                Scenario name, scenario note, currency, USD/EGP, and EUR/USD are required.
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
            <div className="text-xs text-gray-500 mb-1">Created By</div>
            <ScenarioInput
              value={createdBy}
              onChange={setCreatedBy}
              placeholder="Created by"
            />
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Scenario Status</div>
            <select
              className="border p-2 rounded w-full"
              value={scenarioStatus}
              onChange={(e) => setScenarioStatus(e.target.value)}
            >
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
            <div className="text-xs text-gray-500 mb-1">Scenario Note</div>
            <ScenarioInput
              value={scenarioNote}
              onChange={setScenarioNote}
              placeholder="Explain what this scenario represents and assumptions used"
            />
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Currency</div>
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
            <div className="text-xs text-gray-500 mb-1">USD / EGP</div>
            <ScenarioInput
              value={pricing.usdEgp}
              onChange={(v) => setPricing({ ...pricing, usdEgp: v })}
              placeholder="USD/EGP"
            />
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">EUR / USD</div>
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

      <Card
        title="Sheet Specifications — Engineering vs Scenario"
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="font-medium text-gray-500">Parameter</div>
          <div className="font-medium text-gray-500">Engineering</div>
          <div className="font-medium text-gray-500">Scenario</div>

          {[
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
          ].map(([label, key]) => (
            <div key={key} className="contents">
              <div className="py-1">{label}</div>
              <ValueCell value={engineerReference[key]} />
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
                        ? ["", "3 inch core", "6 inch core", "8 inch core"]
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
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <ValueCell value={fmt(scenarioDerived?.plasticWeightPerM2_g || 0, 3)} unit=" g/m² plastic" />
          <ValueCell value={fmt(scenarioDerived?.coatingWeightPerM2_g || 0, 3)} unit=" g/m² coating" />
          <ValueCell value={fmt(scenarioDerived?.totalWeightPerM2_g || 0, 3)} unit=" g/m² total" />
          <ValueCell value={fmt(scenarioDerived?.calcRollWeight_kg || 0, 3)} unit=" kg calc roll wt" />
          <ValueCell value={fmt(scenarioDerived?.calcRollDiameter_mm || 0, 3)} unit=" mm calc roll dia" />
        </div>
      </Card>

      <Card title="Material Pricing">
        <SectionNote tone="gray">
          Enter each material price in its own currency. The system converts everything to the
          selected scenario currency.
        </SectionNote>

        <div className="grid grid-cols-1 md:grid-cols-9 gap-3 text-sm">
          <div className="font-medium text-gray-500">Material</div>
          <div className="font-medium text-gray-500">Layer</div>
          <div className="font-medium text-gray-500">Eng. %</div>
          <div className="font-medium text-gray-500">Scenario %</div>
          <div className="font-medium text-gray-500">Base Qty / ton</div>
          <div className="font-medium text-gray-500">Waste %</div>
          <div className="font-medium text-gray-500">Price</div>
          <div className="font-medium text-gray-500">Currency</div>
          <div className="font-medium text-gray-500">Total Cost / ton</div>

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
      </Card>

      <Card title="Sheet Packaging Pricing">
        <SectionNote tone="gray">
          Engineering values are shown in blue. Scenario values can be changed and will turn orange
          when different.
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

      <Card title="Summary (per ton)">
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
            <span>Scenario Currency</span>
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
    </div>
  );
}