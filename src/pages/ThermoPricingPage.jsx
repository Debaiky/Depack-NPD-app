import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

const toNum = (v) => {
  const n = parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isNaN(n) ? 0 : n;
};

const fmt = (v, d = 3) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: d,
  }).format(v || 0);

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      {children}
    </label>
  );
}

function NumInput({ value, onChange }) {
  return (
    <input
      className="w-full border rounded-md px-3 py-2"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
    />
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

export default function ThermoPricingPage() {
  const { requestId, pricingId } = useParams();
  const location = useLocation();

  const [sheetBundle, setSheetBundle] = useState(location.state?.bundle || null);
  const [scenarioMeta, setScenarioMeta] = useState(null);
  const [pricingRoot, setPricingRoot] = useState(null);
  const [engineeringData, setEngineeringData] = useState(null);
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
  });

  const [pack, setPack] = useState({
    usePallet: true,
    pcsPerStack: "",
    primaryName: "PE Bag (bag)",
    stacksPerPrimary: "",
    primariesPerSecondary: "",
    secondaryName: "Carton (carton)",
    labelsPerSecondary: "",
    secondariesPerPallet: "",
    labelsPerPallet: "",
    stretchKgPerPallet: "",
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
  });

  const [deco, setDeco] = useState({
    use: false,
    type: "Printing",
    printing: { ink_g_per_1000: "", ink_price_per_kg: "" },
    shrink: { price_per_1000: "" },
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

        const [scRes, engRes] = await Promise.all([
          fetch(`/.netlify/functions/get-pricing-scenario?pricingId=${pricingId}`),
          fetch(`/.netlify/functions/get-engineering-data?requestId=${requestId}`),
        ]);

        const scJson = await scRes.json();
        const engJson = await engRes.json();

        if (engJson.success) {
          setEngineeringData(engJson.engineeringData || {});
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
            if (t.spec) setSpec(t.spec);
            if (t.pack) setPack(t.pack);
            if (t.prices) setPrices(t.prices);
            if (t.finance) setFinance(t.finance);
            if (t.deco) setDeco(t.deco);
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

    setSpec((prev) => ({
      ...prev,
      productName: prev.productName || requestId,
      productCode: prev.productCode || requestId,
      unitWeight_g: prev.unitWeight_g || thermo.unitWeight_g || "",
      cavities: prev.cavities || thermo.cavities || "",
      cpm: prev.cpm || thermo.cpm || "",
      sheetUtilPct: prev.sheetUtilPct || thermo.sheetUtilizationPct || "85",
      efficiencyPct: prev.efficiencyPct || thermo.efficiencyPct || "90",
    }));

    setPack((prev) => ({
      ...prev,
      pcsPerStack: prev.pcsPerStack || packEng.pcsPerStack || "",
      primaryName: prev.primaryName || packEng.primaryName || "PE Bag (bag)",
      stacksPerPrimary: prev.stacksPerPrimary || packEng.stacksPerPrimary || "",
      primariesPerSecondary: prev.primariesPerSecondary || packEng.primariesPerSecondary || "",
      secondaryName: prev.secondaryName || packEng.secondaryName || "Carton (carton)",
      labelsPerSecondary: prev.labelsPerSecondary || packEng.labelsPerSecondary || "",
      secondariesPerPallet: prev.secondariesPerPallet || packEng.secondariesPerPallet || "",
      labelsPerPallet: prev.labelsPerPallet || packEng.labelsPerPallet || "",
      stretchKgPerPallet: prev.stretchKgPerPallet || packEng.stretchKgPerPallet || "",
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
          ink_g_per_1000: prev.printing.ink_g_per_1000 || decoEng?.dryOffset?.ink_g_per_1000 || "",
        },
      }));
    }
  }, [engineeringData, requestId]);

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

  const unitWeightAlert =
    spec.unitWeight_g &&
    engThermo.unitWeight_g &&
    String(spec.unitWeight_g) !== String(engThermo.unitWeight_g);

  const cavitiesAlert =
    spec.cavities &&
    engThermo.cavities &&
    String(spec.cavities) !== String(engThermo.cavities);

  const cpmAlert =
    spec.cpm &&
    engThermo.cpm &&
    String(spec.cpm) !== String(engThermo.cpm);

  const currency = sheetBundle.currency || "EGP";
  const usdEgp = Math.max(0, toNum(sheetBundle.usdEgp || 60));
  const sheetMaterialCostPerTon = toNum(sheetBundle.sheetMaterialCostPerTon || 0);
  const netExtruderKgPerDay = toNum(sheetBundle.netExtruderKgPerDay || 0);
  const bomPerTon = sheetBundle.bomPerTon || [];

  const cav = Math.max(1, Math.floor(toNum(spec.cavities)) || 1);
  const cpm = toNum(spec.cpm);
  const eff = Math.max(0, Math.min(1, toNum(spec.efficiencyPct) / 100));
  const util = Math.max(0, Math.min(1, toNum(spec.sheetUtilPct) / 100));
  const unit_g = toNum(spec.unitWeight_g);

  const pcsPerHour = cpm * 60 * cav * eff;
  const pcsPerDay = pcsPerHour * 24;

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

  let decorationPer1000 = 0;
  if (deco.use) {
    if (deco.type === "Printing") {
      decorationPer1000 =
        (toNum(deco.printing.ink_g_per_1000) / 1000) *
        toNum(deco.printing.ink_price_per_kg);
    } else if (deco.type === "Shrink sleeve") {
      decorationPer1000 = toNum(deco.shrink.price_per_1000);
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
        <div>
          <h1 className="text-xl font-semibold">Thermoformed Product Pricing</h1>
          <p className="text-sm text-gray-500">{requestId} • {pricingId}</p>
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

      <div className="bg-white border rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <Field label="Product Name">
          <input className="w-full border rounded-md px-3 py-2" value={spec.productName} onChange={(e) => setSpec({ ...spec, productName: e.target.value })} />
        </Field>
        <Field label="Product Code">
          <input className="w-full border rounded-md px-3 py-2" value={spec.productCode} onChange={(e) => setSpec({ ...spec, productCode: e.target.value })} />
        </Field>
        <Field label="Unit Weight (g)">
          <NumInput value={spec.unitWeight_g} onChange={(v) => setSpec({ ...spec, unitWeight_g: v })} />
        </Field>
        <Field label="Cavities">
          <NumInput value={spec.cavities} onChange={(v) => setSpec({ ...spec, cavities: v })} />
        </Field>
        <Field label="CPM">
          <NumInput value={spec.cpm} onChange={(v) => setSpec({ ...spec, cpm: v })} />
        </Field>
        <Field label="Sheet Utilization %">
          <NumInput value={spec.sheetUtilPct} onChange={(v) => setSpec({ ...spec, sheetUtilPct: v })} />
        </Field>
        <Field label="Efficiency %">
          <NumInput value={spec.efficiencyPct} onChange={(v) => setSpec({ ...spec, efficiencyPct: v })} />
        </Field>
      </div>

      {unitWeightAlert ? (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
          Unit weight in this scenario is different from engineering.
        </div>
      ) : null}

      {cavitiesAlert ? (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
          Cavities in this scenario are different from engineering.
        </div>
      ) : null}

      {cpmAlert ? (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
          CPM in this scenario is different from engineering.
        </div>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <InfoTile label="Pcs / hour" value={fmt(pcsPerHour)} />
        <InfoTile label="Pcs / day" value={fmt(pcsPerDay)} />
        <InfoTile label="Sheet cost / 1000" value={fmt(sheetCostPer1000)} />
        <InfoTile label="Packaging / 1000" value={fmt(packagingPer1000)} />
        <InfoTile label="Decoration / 1000" value={fmt(decorationPer1000)} />
        <InfoTile label="Working Cap / 1000" value={fmt(workingCapPer1000)} />
        <InfoTile label="Conversion / 1000" value={fmt(convPer1000)} />
        <InfoTile label="Total / 1000" value={fmt(totalPer1000)} />
        <InfoTile label="FX Rate" value={fmt(usdEgp, 3)} />
      </div>

      <div className="bg-white border rounded-xl p-4">
        <div className="font-semibold mb-3">Finance</div>
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
            <NumInput value={finance.interestPct} onChange={(v) => setFinance({ ...finance, interestPct: v })} />
          </Field>
          <Field label="Conversion / day">
            <NumInput value={finance.convPerDay} onChange={(v) => setFinance({ ...finance, convPerDay: v })} />
          </Field>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <div className="font-semibold mb-3">Sheet Info / BOM</div>
        <div className="max-h-40 overflow-auto border rounded p-2 bg-white text-sm">
          {bomPerTon.map((x) => (
            <div key={x.name} className="flex justify-between">
              <span>{x.name}</span>
              <span>{fmt(x.kg)} kg/ton</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <InfoTile label="Sheet Material / ton" value={fmt(sheetMaterialCostPerTon)} />
          <InfoTile label="Payback Qty (pcs)" value={fmt(totalInvestEGP && convPer1000 > 0 ? paybackQtyPcs : 0, 0)} />
        </div>
      </div>
    </div>
  );
}