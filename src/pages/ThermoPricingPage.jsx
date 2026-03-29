import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

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

function NumInput({ value, onChange, placeholder = "" }) {
  return (
    <input
      className="w-full border rounded-md px-3 py-2"
      value={value ?? ""}
      placeholder={placeholder}
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
  const navigate = useNavigate();

  const [sheetBundle, setSheetBundle] = useState(location.state?.bundle || null);
  const [scenarioMeta, setScenarioMeta] = useState(null);
  const [pricingRoot, setPricingRoot] = useState(null);
  const [saveMessage, setSaveMessage] = useState("");

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
        const scRes = await fetch(
          `/.netlify/functions/get-pricing-scenario?pricingId=${pricingId}`
        );
        const scJson = await scRes.json();

        if (scJson.success) {
          setScenarioMeta(scJson.scenario || null);

          const pricingData = scJson.pricingData || {};
          setPricingRoot(pricingData.pricing || null);

          if (!sheetBundle && pricingData.thermoBundle) {
            setSheetBundle(pricingData.thermoBundle);
          }

          if (pricingData.thermo) {
            const thermo = pricingData.thermo;
            if (thermo.spec) setSpec(thermo.spec);
            if (thermo.pack) setPack(thermo.pack);
            if (thermo.prices) setPrices(thermo.prices);
            if (thermo.finance) setFinance(thermo.finance);
            if (thermo.deco) setDeco(thermo.deco);
            if (thermo.investRows) setInvestRows(thermo.investRows);
          }
        }
      } catch (error) {
        console.error("Failed to load thermo pricing scenario:", error);
      }
    };

    load();
  }, [pricingId, sheetBundle]);

  const currency = sheetBundle?.currency || "EGP";
  const usdEgp = Math.max(0, toNum(sheetBundle?.usdEgp || 60));
  const sheetMaterialCostPerTon = toNum(sheetBundle?.sheetMaterialCostPerTon || 0);
  const sheetPackagingCostPerTon = toNum(sheetBundle?.sheetPackagingCostPerTon || 0);
  const netExtruderKgPerHour = toNum(sheetBundle?.netExtruderKgPerHour || 0);
  const netExtruderKgPerDay = toNum(sheetBundle?.netExtruderKgPerDay || 0);
  const bomPerTon = sheetBundle?.bomPerTon || [];

  const cav = Math.max(1, Math.floor(toNum(spec.cavities)) || 1);
  const cpm = toNum(spec.cpm);
  const eff = Math.max(0, Math.min(1, toNum(spec.efficiencyPct) / 100));
  const util = Math.max(0, Math.min(1, toNum(spec.sheetUtilPct) / 100));
  const unit_g = toNum(spec.unitWeight_g);

  const pcsPerHour = cpm * 60 * cav * eff;
  const pcsPerDay = pcsPerHour * 24;
  const pcsPerMonth = pcsPerDay * 26;
  const pcsPerYear = pcsPerDay * 330;

  const sheetCostPer1000 =
    ((sheetMaterialCostPerTon + sheetPackagingCostPerTon) / 1_000_000) *
    unit_g *
    1000;

  const pcsPerStack = Math.max(1, Math.floor(toNum(pack.pcsPerStack)) || 1);
  const stacksPerPrimary = Math.max(1, Math.floor(toNum(pack.stacksPerPrimary)) || 1);
  const pcsPerPrimary = pcsPerStack * stacksPerPrimary;

  const primariesPerSecondary = Math.max(
    1,
    Math.floor(toNum(pack.primariesPerSecondary)) || 1
  );
  const pcsPerSecondary = pcsPerPrimary * primariesPerSecondary;

  const secondariesPerPallet = Math.max(
    1,
    Math.floor(toNum(pack.secondariesPerPallet)) || 1
  );

  const labelsPerSecondary = Math.max(
    0,
    Math.floor(toNum(pack.labelsPerSecondary)) || 0
  );
  const labelsPerPallet = Math.max(
    0,
    Math.floor(toNum(pack.labelsPerPallet)) || 0
  );

  const primaryUnit = toNum(prices.primaryPricePerUnit);
  const secondaryUnit = toNum(prices.secondaryPricePerUnit);
  const labelSecondaryUnit = toNum(prices.labelSecondaryPrice);
  const palletUnit = toNum(prices.palletPrice);
  const labelPalletUnit = toNum(prices.labelPalletPrice);
  const stretchKgPrice = toNum(prices.stretchPricePerKg);
  const stretchKgPerPallet = toNum(pack.stretchKgPerPallet);

  const costPrimary_1000 =
    pcsPerPrimary > 0 ? (primaryUnit / pcsPerPrimary) * 1000 : 0;

  const costSecondary_1000 =
    pcsPerPrimary > 0 && primariesPerSecondary > 0
      ? ((secondaryUnit + labelsPerSecondary * labelSecondaryUnit) /
          (pcsPerPrimary * primariesPerSecondary)) *
        1000
      : 0;

  const costPallet_1000 =
    pack.usePallet && pcsPerSecondary > 0 && secondariesPerPallet > 0
      ? ((palletUnit +
          labelsPerPallet * labelPalletUnit +
          stretchKgPrice * stretchKgPerPallet) /
          (pcsPerSecondary * secondariesPerPallet)) *
        1000
      : 0;

  const packagingPer1000 =
    costPrimary_1000 + costSecondary_1000 + (pack.usePallet ? costPallet_1000 : 0);

  let decorationPer1000 = 0;
  if (deco.use) {
    if (deco.type === "Printing") {
      const w = toNum(deco.printing.ink_g_per_1000);
      const p = toNum(deco.printing.ink_price_per_kg);
      decorationPer1000 = (w / 1000) * p;
    } else if (deco.type === "Shrink sleeve") {
      decorationPer1000 = toNum(deco.shrink.price_per_1000);
    } else if (deco.type === "Hybrid") {
      const blank = toNum(deco.hybrid.blank_per_1000);
      const bottom = toNum(deco.hybrid.bottom_per_1000);
      const glue_w = toNum(deco.hybrid.glue_g_per_1000);
      const glue_p = toNum(deco.hybrid.glue_price_per_kg);
      decorationPer1000 = blank + bottom + (glue_w / 1000) * glue_p;
    }
  }

  const DSO = toNum(finance.DSO);
  const DIO = toNum(finance.DIO);
  const DPO = toNum(finance.DPO);
  const interest = toNum(finance.interestPct) / 100;
  const cccDays = DSO + DIO - DPO;

  const workingCapPer1000 =
    (sheetCostPer1000 + packagingPer1000 + decorationPer1000) *
    interest *
    (cccDays / 365);

  const convPerDay = toNum(finance.convPerDay);
  const convPer1000 = pcsPerDay > 0 ? (convPerDay / pcsPerDay) * 1000 : 0;

  const totalPer1000 =
    sheetCostPer1000 +
    packagingPer1000 +
    decorationPer1000 +
    workingCapPer1000 +
    convPer1000;

  const desiredPrice1000 = toNum(finance.desiredPricePer1000);
  const baseCostPer1000 =
    sheetCostPer1000 +
    packagingPer1000 +
    decorationPer1000 +
    workingCapPer1000;
  const targetConvPer1000 = Math.max(0, desiredPrice1000 - baseCostPer1000);
  const targetConvPerDay = targetConvPer1000 * (pcsPerDay / 1000);

  const totalInvestEGP = investRows.reduce((s, r) => {
    const c = toNum(r.cost);
    return s + (r.currency === "USD" ? c * usdEgp : c);
  }, 0);

  const convPer1000_EGP = currency === "USD" ? convPer1000 * usdEgp : convPer1000;
  const paybackQtyPcs =
    convPer1000_EGP > 0 ? totalInvestEGP / (convPer1000_EGP / 1000) : 0;

  const massSheetPerDay_kg =
    util > 0 ? ((unit_g / util) * pcsPerDay) / 1000 : 0;

  const dailyConvThermo_EGP = currency === "USD" ? convPerDay * usdEgp : convPerDay;
  const dailyConvThermo_USD =
    currency === "EGP" ? (usdEgp > 0 ? convPerDay / usdEgp : 0) : convPerDay;

  const dailyConvExtruder_EGP =
    massSheetPerDay_kg > 0 && netExtruderKgPerDay > 0
      ? (dailyConvThermo_EGP / massSheetPerDay_kg) * netExtruderKgPerDay
      : 0;

  const dailyConvExtruder_USD =
    currency === "EGP"
      ? usdEgp > 0
        ? dailyConvExtruder_EGP / usdEgp
        : 0
      : dailyConvExtruder_EGP;

  const addInvestment = () => {
    setInvestRows((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        type: "Tilting mold",
        desc: "",
        cost: "",
        currency: "EGP",
      },
    ]);
  };

  const updateInvestment = (id, patch) => {
    setInvestRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const deleteInvestment = (id) => {
    setInvestRows((prev) => prev.filter((r) => r.id !== id));
  };

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
            sheetCostPer1000,
            packagingPer1000,
            decorationPer1000,
            workingCapPer1000,
            convPer1000,
            totalPer1000,
            paybackQtyPcs,
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
        alert(json.error || "Failed to save thermo pricing");
        return;
      }

      setSaveMessage("Thermo pricing saved successfully");
    } catch (error) {
      console.error(error);
      alert("Failed to save thermo pricing");
    }
  };

  const backLink = `/pricing/${requestId}/scenario/${pricingId}`;

  if (!sheetBundle) {
    return <div className="p-6">Loading thermo pricing...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Thermoformed Product Pricing</h1>
          <p className="text-sm text-gray-500">
            {requestId} • {pricingId}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to={backLink}
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

      {saveMessage ? (
        <div className="text-sm text-green-600">{saveMessage}</div>
      ) : null}

      <div className="bg-white border rounded-xl p-4">
        <div className="font-semibold mb-3">Product Specs</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
          <Field label="Cycle Time (CPM)">
            <NumInput value={spec.cpm} onChange={(v) => setSpec({ ...spec, cpm: v })} />
          </Field>
          <Field label="Sheet Utilization %">
            <NumInput value={spec.sheetUtilPct} onChange={(v) => setSpec({ ...spec, sheetUtilPct: v })} />
          </Field>
          <Field label="Efficiency %">
            <NumInput value={spec.efficiencyPct} onChange={(v) => setSpec({ ...spec, efficiencyPct: v })} />
          </Field>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <InfoTile label="Pcs / hour" value={fmt(pcsPerHour)} />
          <InfoTile label="Pcs / day" value={fmt(pcsPerDay)} />
          <InfoTile label="Pcs / month" value={fmt(pcsPerMonth)} />
          <InfoTile label="Pcs / year" value={fmt(pcsPerYear)} />
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4 space-y-4">
        <div className="font-semibold">Packaging Scheme & Prices ({currency})</div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={pack.usePallet}
            onChange={(e) => setPack({ ...pack, usePallet: e.target.checked })}
          />
          <span className="text-sm">Use pallet</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Field label="Pieces / Stack">
            <NumInput value={pack.pcsPerStack} onChange={(v) => setPack({ ...pack, pcsPerStack: v })} />
          </Field>
          <Field label="Primary Pack Name">
            <input className="w-full border rounded-md px-3 py-2" value={pack.primaryName} onChange={(e) => setPack({ ...pack, primaryName: e.target.value })} />
          </Field>
          <Field label="Stacks / Primary">
            <NumInput value={pack.stacksPerPrimary} onChange={(v) => setPack({ ...pack, stacksPerPrimary: v })} />
          </Field>
          <Field label={`Primary Price (${currency}) / unit`}>
            <NumInput value={prices.primaryPricePerUnit} onChange={(v) => setPrices({ ...prices, primaryPricePerUnit: v })} />
          </Field>

          <Field label="Primaries / Secondary">
            <NumInput value={pack.primariesPerSecondary} onChange={(v) => setPack({ ...pack, primariesPerSecondary: v })} />
          </Field>
          <Field label="Secondary Pack Name">
            <input className="w-full border rounded-md px-3 py-2" value={pack.secondaryName} onChange={(e) => setPack({ ...pack, secondaryName: e.target.value })} />
          </Field>
          <Field label="Labels / Secondary">
            <NumInput value={pack.labelsPerSecondary} onChange={(v) => setPack({ ...pack, labelsPerSecondary: v })} />
          </Field>
          <Field label={`Secondary Price (${currency}) / unit`}>
            <NumInput value={prices.secondaryPricePerUnit} onChange={(v) => setPrices({ ...prices, secondaryPricePerUnit: v })} />
          </Field>

          <Field label={`Label (Secondary) Price (${currency}) / unit`}>
            <NumInput value={prices.labelSecondaryPrice} onChange={(v) => setPrices({ ...prices, labelSecondaryPrice: v })} />
          </Field>

          {pack.usePallet && (
            <>
              <Field label="Secondaries / Pallet">
                <NumInput value={pack.secondariesPerPallet} onChange={(v) => setPack({ ...pack, secondariesPerPallet: v })} />
              </Field>
              <Field label="Labels / Pallet">
                <NumInput value={pack.labelsPerPallet} onChange={(v) => setPack({ ...pack, labelsPerPallet: v })} />
              </Field>
              <Field label={`Pallet Price (${currency}) / unit`}>
                <NumInput value={prices.palletPrice} onChange={(v) => setPrices({ ...prices, palletPrice: v })} />
              </Field>
              <Field label={`Label (Pallet) Price (${currency}) / unit`}>
                <NumInput value={prices.labelPalletPrice} onChange={(v) => setPrices({ ...prices, labelPalletPrice: v })} />
              </Field>
              <Field label={`Stretch Price (${currency}) / kg`}>
                <NumInput value={prices.stretchPricePerKg} onChange={(v) => setPrices({ ...prices, stretchPricePerKg: v })} />
              </Field>
              <Field label="Stretch (kg / pallet)">
                <NumInput value={pack.stretchKgPerPallet} onChange={(v) => setPack({ ...pack, stretchKgPerPallet: v })} />
              </Field>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <InfoTile label="Primary cost / 1000 pcs" value={fmt(costPrimary_1000)} />
          <InfoTile label="Secondary cost / 1000 pcs" value={fmt(costSecondary_1000)} />
          <InfoTile label="Pallet cost / 1000 pcs" value={fmt(costPallet_1000)} />
          <InfoTile label="Total packaging / 1000 pcs" value={fmt(packagingPer1000)} />
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4 space-y-4">
        <div className="font-semibold">Decoration</div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={deco.use}
            onChange={(e) => setDeco({ ...deco, use: e.target.checked })}
          />
          <span className="text-sm">Use decoration</span>
        </div>

        {deco.use && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Field label="Decoration Type">
                <select
                  className="w-full border rounded-md px-3 py-2"
                  value={deco.type}
                  onChange={(e) => setDeco({ ...deco, type: e.target.value })}
                >
                  <option>Printing</option>
                  <option>Shrink sleeve</option>
                  <option>Hybrid</option>
                </select>
              </Field>

              {deco.type === "Printing" && (
                <>
                  <Field label="Ink weight (g / 1000 pcs)">
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
                  <Field label={`Ink price (${currency}) / kg`}>
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
                </>
              )}

              {deco.type === "Shrink sleeve" && (
                <Field label={`Sleeve price (${currency}) / 1000 pcs`}>
                  <NumInput
                    value={deco.shrink.price_per_1000}
                    onChange={(v) =>
                      setDeco({
                        ...deco,
                        shrink: { ...deco.shrink, price_per_1000: v },
                      })
                    }
                  />
                </Field>
              )}

              {deco.type === "Hybrid" && (
                <>
                  <Field label={`Blank cost (${currency}) / 1000 pcs`}>
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
                  <Field label={`Bottom cost (${currency}) / 1000 pcs`}>
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
                  <Field label="Glue weight (g / 1000 pcs)">
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
                  <Field label={`Glue price (${currency}) / kg`}>
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
                </>
              )}
            </div>

            <InfoTile label="Decoration / 1000 pcs" value={fmt(decorationPer1000)} />
          </>
        )}
      </div>

      <div className="bg-white border rounded-xl p-4 space-y-4">
        <div className="font-semibold">Investments</div>

        <button
          onClick={addInvestment}
          className="px-3 py-1.5 border rounded-md bg-white hover:bg-gray-50"
        >
          + Add investment
        </button>

        <div className="space-y-2">
          {investRows.map((r) => (
            <div key={r.id} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
              <Field label="Type">
                <select
                  className="w-full border rounded-md px-3 py-2"
                  value={r.type}
                  onChange={(e) => updateInvestment(r.id, { type: e.target.value })}
                >
                  <option>Tilting mold</option>
                  <option>Steel Rule mold</option>
                  <option>Mold Inserts</option>
                  <option>Mold Bottom</option>
                  <option>Plug assist</option>
                  <option>Cutting plate</option>
                  <option>Printing mandrels</option>
                  <option>Hybrid tools</option>
                  <option>Others</option>
                </select>
              </Field>

              <Field label="Description">
                <input
                  className="w-full border rounded-md px-3 py-2"
                  value={r.desc}
                  onChange={(e) => updateInvestment(r.id, { desc: e.target.value })}
                />
              </Field>

              <Field label="Cost">
                <NumInput
                  value={r.cost}
                  onChange={(v) => updateInvestment(r.id, { cost: v })}
                />
              </Field>

              <Field label="Currency">
                <select
                  className="w-full border rounded-md px-3 py-2"
                  value={r.currency}
                  onChange={(e) => updateInvestment(r.id, { currency: e.target.value })}
                >
                  <option>EGP</option>
                  <option>USD</option>
                </select>
              </Field>

              <button
                onClick={() => deleteInvestment(r.id)}
                className="h-10 border rounded-md hover:bg-red-50"
              >
                🗑
              </button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <InfoTile label="Total Investments (EGP)" value={fmt(totalInvestEGP)} />
          <InfoTile label="Payback qty (pcs)" value={fmt(paybackQtyPcs, 0)} />
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <div className="font-semibold mb-3">Finance & Targets ({currency})</div>

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
          <Field label="Interest % p.a.">
            <NumInput value={finance.interestPct} onChange={(v) => setFinance({ ...finance, interestPct: v })} />
          </Field>
          <Field label={`Conversion / day (${currency})`}>
            <NumInput value={finance.convPerDay} onChange={(v) => setFinance({ ...finance, convPerDay: v })} />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <Field label={`Desired Price / 1000 pcs (${currency})`}>
            <NumInput
              value={finance.desiredPricePer1000}
              onChange={(v) => setFinance({ ...finance, desiredPricePer1000: v })}
            />
          </Field>
          <InfoTile label={`Target Conv / 1000 (${currency})`} value={fmt(targetConvPer1000)} />
          <InfoTile label={`Target Conv / day (${currency})`} value={fmt(targetConvPerDay)} />
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <div className="font-semibold mb-3">Summary — per 1000 pcs</div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <InfoTile label="Sheet cost / 1000 pcs" value={fmt(sheetCostPer1000)} />
          <InfoTile label="Packaging / 1000 pcs" value={fmt(packagingPer1000)} />
          <InfoTile label="Decoration / 1000 pcs" value={fmt(decorationPer1000)} />
          <InfoTile label="Working Cap. / 1000 pcs" value={fmt(workingCapPer1000)} />
          <InfoTile label="Conversion / 1000 pcs" value={fmt(convPer1000)} />
          <InfoTile label="TOTAL / 1000 pcs" value={fmt(totalPer1000)} />
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <div className="font-semibold mb-3">Daily Conversion (Thermo & Extruder)</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <InfoTile
            label="Thermoforming / day"
            value={`${fmt(dailyConvThermo_EGP, 0)} EGP • ${fmt(dailyConvThermo_USD, 0)} USD`}
          />
          <InfoTile
            label="Extruder / day"
            value={`${fmt(dailyConvExtruder_EGP, 0)} EGP • ${fmt(dailyConvExtruder_USD, 0)} USD`}
          />
        </div>

        <div className="text-xs text-gray-500 mt-3">
          Uses net extruder: {fmt(netExtruderKgPerDay, 0)} kg/day • Utilization: {fmt(util * 100, 2)}% • Sheet mass/day: {fmt(massSheetPerDay_kg, 0)} kg
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <div className="font-semibold mb-3">Sheet Info / BOM</div>
        <div className="text-sm text-gray-600 mb-3">
          Sheet: <span className="font-medium">{sheetBundle.sheetName || "—"}</span> (
          <span className="font-mono">{sheetBundle.sheetCode || "—"}</span>)
        </div>

        <div className="max-h-40 overflow-auto border rounded p-2 bg-white text-sm">
          {bomPerTon.map((x) => (
            <div key={x.name} className="flex justify-between">
              <span>{x.name}</span>
              <span>{fmt(x.kg, 3)} kg/ton</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
          <InfoTile label="Sheet Mat / ton" value={fmt(sheetMaterialCostPerTon)} />
          <InfoTile label="Sheet Pack / ton" value={fmt(sheetPackagingCostPerTon)} />
          <InfoTile label="Extruder kg/hr (net)" value={fmt(netExtruderKgPerHour)} />
          <InfoTile label="Extruder kg/day (net)" value={fmt(netExtruderKgPerDay)} />
        </div>
      </div>
    </div>
  );
}