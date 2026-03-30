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

export default function ThermoPricingPage() {
  const { requestId, pricingId } = useParams();
  const location = useLocation();

  const [sheetBundle, setSheetBundle] = useState(location.state?.bundle || null);
  const [scenarioMeta, setScenarioMeta] = useState(null);
  const [pricingRoot, setPricingRoot] = useState(null);
  const [engineeringData, setEngineeringData] = useState(null);
  const [requestData, setRequestData] = useState(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const [spec, setSpec] = useState({
    productName: "",
    productCode: "",
    unitWeight_g: "",
    cavities: "",
    cpm: "",
    sheetUtilPct: "85",
    efficiencyPct: "90",
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
    primaryDimensions: "",
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
          setScenarioMeta(scJson.scenario || null);
          const pricingData = scJson.pricingData || {};
          setPricingRoot(pricingData.pricing || null);

          if (pricingData.thermoBundle) {
            setSheetBundle(pricingData.thermoBundle);
          }

          if (pricingData.thermo) {
            const t = pricingData.thermo;
            if (t.spec) setSpec((prev) => ({ ...prev, ...t.spec }));
            if (t.pack) setPack((prev) => ({ ...prev, ...t.pack }));
            if (t.prices) setPrices((prev) => ({ ...prev, ...t.prices }));
            if (t.finance) setFinance((prev) => ({ ...prev, ...t.finance }));
            if (t.deco) setDeco((prev) => ({ ...prev, ...t.deco }));
            if (t.investRows) setInvestRows(t.investRows);
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
    const decoEng = engineeringData?.decoration || {};
    const packEng = engineeringData?.packaging || {};
    const reqPack = requestData?.packaging || {};

    setSpec((prev) => ({
      ...prev,
      productName: prev.productName || requestId,
      productCode: prev.productCode || requestId,
      unitWeight_g: prev.unitWeight_g || thermo.unitWeight_g || "",
      cavities: prev.cavities || thermo.cavities || "",
      cpm: prev.cpm || thermo.cpm || "",
      sheetUtilPct: prev.sheetUtilPct || thermo.sheetUtilizationPct || "85",
      efficiencyPct: prev.efficiencyPct || thermo.efficiencyPct || "90",
      machineName: prev.machineName || thermo.machineName || "",
      moldBaseName: prev.moldBaseName || thermo.moldBaseName || "",
      moldBaseCode: prev.moldBaseCode || thermo.moldBaseCode || "",
      insertName: prev.insertName || thermo.insertName || "",
      insertCode: prev.insertCode || thermo.insertCode || "",
      bottomName: prev.bottomName || thermo.bottomName || "",
      bottomCode: prev.bottomCode || thermo.bottomCode || "",
      plugAssistName: prev.plugAssistName || thermo.plugAssistName || "",
      plugAssistCode: prev.plugAssistCode || thermo.plugAssistCode || "",
      cuttingPlateName: prev.cuttingPlateName || thermo.cuttingPlateName || "",
      cuttingPlateCode: prev.cuttingPlateCode || thermo.cuttingPlateCode || "",
      stackingPlateName: prev.stackingPlateName || thermo.stackingPlateName || "",
      stackingPlateCode: prev.stackingPlateCode || thermo.stackingPlateCode || "",
    }));

    setPack((prev) => ({
      ...prev,
      pcsPerStack: prev.pcsPerStack || packEng.pcsPerStack || reqPack?.primary?.pcsPerStack || "",
      primaryName: prev.primaryName || packEng.primaryName || reqPack?.primary?.bagSleeveMaterial || "PE Bag",
      primaryDimensions: prev.primaryDimensions || reqPack?.primary?.bagSleeveDimensions || "",
      primaryMaterial: prev.primaryMaterial || reqPack?.primary?.bagSleeveMaterial || "",
      primaryArtworkCode: prev.primaryArtworkCode || "",
      stacksPerPrimary: prev.stacksPerPrimary || packEng.stacksPerPrimary || reqPack?.primary?.stacksPerBag || "",
      primariesPerSecondary: prev.primariesPerSecondary || packEng.primariesPerSecondary || reqPack?.secondary?.bagsPerCarton || "",
      secondaryName: prev.secondaryName || packEng.secondaryName || reqPack?.secondary?.cartonType || "Carton",
      secondaryType: prev.secondaryType || reqPack?.secondary?.cartonType || "Single wall",
      secondaryLengthMm: prev.secondaryLengthMm || "",
      secondaryWidthMm: prev.secondaryWidthMm || "",
      secondaryHeightMm: prev.secondaryHeightMm || "",
      labelsPerSecondary: prev.labelsPerSecondary || packEng.labelsPerSecondary || "",
      labelLengthMm: prev.labelLengthMm || "100",
      labelWidthMm: prev.labelWidthMm || "150",
      palletType: prev.palletType || packEng.palletType || reqPack?.pallet?.palletType || "",
      secondariesPerPallet: prev.secondariesPerPallet || packEng.secondariesPerPallet || reqPack?.pallet?.cartonsPerPallet || "",
      labelsPerPallet: prev.labelsPerPallet || packEng.labelsPerPallet || "",
      stretchKgPerPallet: prev.stretchKgPerPallet || packEng.stretchKgPerPallet || reqPack?.pallet?.stretchWrapKgPerPallet || "",
    }));

    if (decoEng.type) {
      setDeco((prev) => ({
        ...prev,
        use: decoEng.type !== "None" && decoEng.type !== "",
        type:
          decoEng.type === "Dry offset printing"
            ? "Printing"
            : decoEng.type === "Shrink sleeve"
            ? "Shrink sleeve"
            : decoEng.type === "Hybrid"
            ? "Hybrid"
            : prev.type,
        printing: {
          ...prev.printing,
          ink_g_per_1000:
            prev.printing.ink_g_per_1000 || decoEng?.dryOffset?.ink_g_per_1000 || "",
        },
      }));
    }
  }, [engineeringData, requestData, requestId]);

  const customer = requestData?.customer || {};
  const product = requestData?.product || {};
  const thumb =
    product?.productThumbnailPreview ||
    (product?.productThumbnailBase64
      ? `data:image/*;base64,${product.productThumbnailBase64}`
      : "");

  if (loading) {
    return <div className="p-6">Loading thermo pricing...</div>;
  }

  if (!sheetBundle) {
    return (
      <div className="p-6">
        Thermo bundle not found for this scenario. Go back to the sheet scenario,
        then click “Thermoformed Product” again.
      </div>
    );
  }

  const engThermo = engineeringData?.thermo || {};
  const engPack = engineeringData?.packaging || {};
  const engDeco = engineeringData?.decoration || {};

  const currency = scenarioMeta?.ScenarioCurrency || sheetBundle.currency || "EGP";
  const usdEgp = Math.max(0, toNum(scenarioMeta?.UsdEgp || sheetBundle.usdEgp || 60));
  const eurUsd = Math.max(0, toNum(scenarioMeta?.EurUsd || pricingRoot?.eurUsd || 1.08));

  const sheetMaterialCostPerTon = toNum(sheetBundle.sheetMaterialCostPerTon || 0);
  const netExtruderKgPerHour = toNum(sheetBundle.netExtruderKgPerHour || 0);
  const netExtruderKgPerDay = toNum(sheetBundle.netExtruderKgPerDay || 0);
  const bomPerTon = sheetBundle.bomPerTon || [];

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
    (sheetMaterialCostPerTon / 1_000_000) * unit_g * 1000;

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
      ? ((toNum(prices.secondaryPricePerUnit) +
          labelsPerSecondary * toNum(prices.labelSecondaryPrice)) /
          (pcsPerPrimary * primariesPerSecondary)) *
        1000
      : 0;

  const costPallet_1000 =
    pack.usePallet && pcsPerSecondary > 0 && secondariesPerPallet > 0
      ? ((toNum(prices.palletPrice) +
          labelsPerPallet * toNum(prices.labelPalletPrice) +
          toNum(prices.stretchPricePerKg) * toNum(pack.stretchKgPerPallet)) /
          (pcsPerSecondary * secondariesPerPallet)) *
        1000
      : 0;

  const packagingPer1000 =
    costPrimary_1000 + costSecondary_1000 + (pack.usePallet ? costPallet_1000 : 0);

  const packagingPerTon =
    util > 0 ? packagingPer1000 / ((1000 / unit_g) * util / 1000) : 0;

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

  const convPer1000 = pcsPerDay > 0 ? (toNum(finance.convPerDay) / pcsPerDay) * 1000 : 0;

  const totalPer1000 =
    sheetCostPer1000 +
    packagingPer1000 +
    decorationPer1000 +
    workingCapPer1000 +
    convPer1000;

  const totalInvestEGP = investRows.reduce((s, r) => {
    const c = toNum(r.cost);
    return s + (r.currency === "USD" ? c * usdEgp : c);
  }, 0);

  const paybackQtyPcs =
    convPer1000 > 0 ? totalInvestEGP / (convPer1000 / 1000) : 0;

  const pricePerCarton =
    pcsPerSecondary > 0 ? (totalPer1000 / 1000) * pcsPerSecondary : 0;

  const palletsPerTruck =
    pack.usePallet ? Math.max(0, Math.floor(toNum(finance.palletsPerTruck)) || 0) : 0;
  const cartonsPerTruck =
    pack.usePallet
      ? palletsPerTruck * secondariesPerPallet
      : Math.max(0, Math.floor(toNum(finance.cartonsPerTruck)) || 0);
  const pcsPerTruck = cartonsPerTruck * pcsPerSecondary;
  const netProductWeightPerTruckKg = (pcsPerTruck * unit_g) / 1000;

  const packagingInstructionText = pack.usePallet
    ? `Pack ${pcsPerStack} pcs per stack and ${stacksPerPrimary} stacks per ${pack.primaryName || "primary pack"}. Use ${primariesPerSecondary} primary packs per ${pack.secondaryName || "secondary pack"}, then load ${secondariesPerPallet} cartons per pallet using ${pack.palletType || "selected pallet"} and ${fmt(toNum(pack.stretchKgPerPallet), 3)} kg stretch film per pallet.`
    : `Pack ${pcsPerStack} pcs per stack and ${stacksPerPrimary} stacks per ${pack.primaryName || "primary pack"}. Use ${primariesPerSecondary} primary packs per ${pack.secondaryName || "secondary pack"} with no pallet selected.`;

  const saveThermoScenario = async () => {
    try {
      const pricingData = {
        pricing: pricingRoot || {},
        thermoBundle: sheetBundle || {},
        thermo: {
          spec,
          pack,
          prices,
          finance,
          deco,
          investRows,
          summary: {
            totalPer1000,
            paybackQtyPcs,
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
          scenarioName: scenarioMeta?.ScenarioName || "Scenario",
          scenarioNote: scenarioMeta?.ScenarioNote || "",
          createdBy: scenarioMeta?.CreatedBy || "",
          scenarioStatus: scenarioMeta?.ScenarioStatus || "Draft",
          compareSelected: (scenarioMeta?.CompareSelected || "") === "Yes",
          scenarioCurrency: currency,
          usdEgp,
          eurUsd,
          pricingData,
          totalCostPer1000: totalPer1000,
          sellingPricePer1000: finance.desiredPricePer1000 || "",
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
              {customer.projectName || requestId} • {pricingId}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to={`/pricing/${requestId}/scenario/${pricingId}`}
            className="px-4 py-2 border rounded-md bg-white hover:bg-gray-50"
          >
            ← Back to Sheet Scenario
          </Link>

          <button
            onClick={saveThermoScenario}
            className="px-4 py-2 rounded-md bg-black text-white hover:bg-gray-800"
          >
            Save Thermo Scenario
          </button>
        </div>
      </div>

      {saveMessage ? <div className="text-sm text-green-600">{saveMessage}</div> : null}

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
          ].map(([label, key]) => (
            <div key={key} className="contents">
              <div className="py-1">{label}</div>
              <ValueCell value={engThermo[key] || (key === "productName" ? requestId : key === "productCode" ? requestId : "")} />
              <div>
                {key === "machineName" ? (
                  <SelectInput
                    value={spec[key]}
                    onChange={(v) => setSpec({ ...spec, [key]: v })}
                    changed={isDifferent(spec[key], engThermo[key])}
                    options={["", "RDM73K", "RDK80"]}
                  />
                ) : (
                  <TextInput
                    value={spec[key]}
                    onChange={(v) => setSpec({ ...spec, [key]: v })}
                    changed={isDifferent(spec[key], engThermo[key])}
                  />
                )}
              </div>
            </div>
          ))}
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
                  changed={isDifferent(pack.pcsPerStack, engPack.pcsPerStack)}
                />
              </Field>
              <Field label="Stacks / Primary Pack">
                <NumInput
                  value={pack.stacksPerPrimary}
                  onChange={(v) => setPack({ ...pack, stacksPerPrimary: v })}
                  changed={isDifferent(pack.stacksPerPrimary, engPack.stacksPerPrimary)}
                />
              </Field>
              <Field label="Primary Pack Name">
                <TextInput
                  value={pack.primaryName}
                  onChange={(v) => setPack({ ...pack, primaryName: v })}
                  changed={isDifferent(pack.primaryName, engPack.primaryName)}
                />
              </Field>
              <Field label="Primary Pack Dimensions">
                <TextInput
                  value={pack.primaryDimensions}
                  onChange={(v) => setPack({ ...pack, primaryDimensions: v })}
                />
              </Field>
              <Field label="Primary Pack Material">
                <TextInput
                  value={pack.primaryMaterial}
                  onChange={(v) => setPack({ ...pack, primaryMaterial: v })}
                />
              </Field>
              <Field label="Primary Artwork Code">
                <TextInput
                  value={pack.primaryArtworkCode}
                  onChange={(v) => setPack({ ...pack, primaryArtworkCode: v })}
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
                  changed={isDifferent(pack.primariesPerSecondary, engPack.primariesPerSecondary)}
                />
              </Field>
              <Field label="Secondary Pack Name">
                <TextInput
                  value={pack.secondaryName}
                  onChange={(v) => setPack({ ...pack, secondaryName: v })}
                  changed={isDifferent(pack.secondaryName, engPack.secondaryName)}
                />
              </Field>
              <Field label="Secondary Type">
                <SelectInput
                  value={pack.secondaryType}
                  onChange={(v) => setPack({ ...pack, secondaryType: v })}
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
                />
              </Field>
              <Field label="Secondary W (mm)">
                <NumInput
                  value={pack.secondaryWidthMm}
                  onChange={(v) => setPack({ ...pack, secondaryWidthMm: v })}
                />
              </Field>
              <Field label="Secondary H (mm)">
                <NumInput
                  value={pack.secondaryHeightMm}
                  onChange={(v) => setPack({ ...pack, secondaryHeightMm: v })}
                />
              </Field>
              <Field label="Labels / Secondary">
                <NumInput
                  value={pack.labelsPerSecondary}
                  onChange={(v) => setPack({ ...pack, labelsPerSecondary: v })}
                  changed={isDifferent(pack.labelsPerSecondary, engPack.labelsPerSecondary)}
                />
              </Field>

              <Field label="Label L (mm)">
                <NumInput
                  value={pack.labelLengthMm}
                  onChange={(v) => setPack({ ...pack, labelLengthMm: v })}
                />
              </Field>
              <Field label="Label W (mm)">
                <NumInput
                  value={pack.labelWidthMm}
                  onChange={(v) => setPack({ ...pack, labelWidthMm: v })}
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
                    />
                  </Field>
                  <Field label="Pallet Length (mm)">
                    <NumInput
                      value={pack.palletLengthMm}
                      onChange={(v) => setPack({ ...pack, palletLengthMm: v })}
                    />
                  </Field>
                  <Field label="Pallet Height (mm)">
                    <NumInput
                      value={pack.palletHeightMm}
                      onChange={(v) => setPack({ ...pack, palletHeightMm: v })}
                    />
                  </Field>
                  <Field label="Pallet Type">
                    <TextInput
                      value={pack.palletType}
                      onChange={(v) => setPack({ ...pack, palletType: v })}
                      changed={isDifferent(pack.palletType, engPack.palletType)}
                    />
                  </Field>
                  <Field label="Boxes / Pallet">
                    <NumInput
                      value={pack.secondariesPerPallet}
                      onChange={(v) => setPack({ ...pack, secondariesPerPallet: v })}
                      changed={isDifferent(pack.secondariesPerPallet, engPack.secondariesPerPallet)}
                    />
                  </Field>
                  <Field label="Stretch kg / Pallet">
                    <NumInput
                      value={pack.stretchKgPerPallet}
                      onChange={(v) => setPack({ ...pack, stretchKgPerPallet: v })}
                      changed={isDifferent(pack.stretchKgPerPallet, engPack.stretchKgPerPallet)}
                    />
                  </Field>
                  <Field label="Labels / Pallet">
                    <NumInput
                      value={pack.labelsPerPallet}
                      onChange={(v) => setPack({ ...pack, labelsPerPallet: v })}
                      changed={isDifferent(pack.labelsPerPallet, engPack.labelsPerPallet)}
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
          <InfoTile label="Pcs / Pallet" value={pack.usePallet ? fmt(pcsPerSecondary * secondariesPerPallet, 0) : "—"} />
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
              changed={isDifferent(deco.type, engDeco.type)}
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

      <Card title="Working Capital and Conversion">
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
          <Field label="Conversion / day">
            <NumInput
              value={finance.convPerDay}
              onChange={(v) => setFinance({ ...finance, convPerDay: v })}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <InfoTile label="Sheet Cost / 1000" value={fmt(sheetCostPer1000)} />
          <InfoTile label="Packaging / 1000" value={fmt(packagingPer1000)} />
          <InfoTile label="Decoration / 1000" value={fmt(decorationPer1000)} />
          <InfoTile label="Working Cap / 1000" value={fmt(workingCapPer1000)} />
          <InfoTile label="Conversion / 1000" value={fmt(convPer1000)} />
        </div>
      </Card>

      <Card title="Truck / Logistics Summary">
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
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <InfoTile label="Pallets / Truck" value={pack.usePallet ? fmt(palletsPerTruck, 0) : "—"} />
          <InfoTile label="Cartons / Truck" value={fmt(cartonsPerTruck, 0)} />
          <InfoTile label="Pcs / Truck" value={fmt(pcsPerTruck, 0)} />
          <InfoTile label="Net Product Weight / Truck (kg)" value={fmt(netProductWeightPerTruckKg, 3)} />
        </div>
      </Card>

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
          <InfoTile label="Sheet Packaging / ton" value={fmt(packagingPerTon)} />
          <InfoTile label="Net Extruder kg/hr" value={fmt(netExtruderKgPerHour)} />
          <InfoTile label="Net Extruder kg/day" value={fmt(netExtruderKgPerDay)} />
          <InfoTile label="Payback Qty (pcs)" value={fmt(totalInvestEGP && convPer1000 > 0 ? paybackQtyPcs : 0, 0)} />
        </div>
      </Card>

      <Card title="Thermo Summary">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <InfoTile label="Pcs / Carton" value={fmt(pcsPerSecondary, 0)} />
          <InfoTile label="Price / 1000 pcs" value={fmt(totalPer1000)} />
          <InfoTile label="Price / Carton" value={fmt(pricePerCarton)} />
          <InfoTile label="Sheet kg/hr" value={fmt(sheetConsumptionKgPerHour)} />
          <InfoTile label="Sheet kg/shift" value={fmt(sheetConsumptionKgPerShift)} />
          <InfoTile label="Sheet kg/day" value={fmt(sheetConsumptionKgPerDay)} />
        </div>
      </Card>
    </div>
  );
}