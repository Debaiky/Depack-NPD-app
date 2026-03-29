import { useEffect, useRef, useState } from "react";
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

export default function PricingPage() {
  const { requestId, pricingId } = useParams();
  const navigate = useNavigate();

  const [engineeringData, setEngineeringData] = useState(null);
  const [requestData, setRequestData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [pricing, setPricing] = useState({
    currency: "EGP",
    usdEgp: 60,

    materialPrices: {},
    materialWastePct: {},

    packagingPrices: {},
    packagingWastePct: {},

    conversionPerTon: "",
    convPerDay: "",
  });

  const [scenarioName, setScenarioName] = useState("");
  const [scenarioNote, setScenarioNote] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [scenarioStatus, setScenarioStatus] = useState("Draft");

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

        if (reqJson.success) {
          setRequestData(reqJson.payload || {});
        }

        if (engJson.success) {
          setEngineeringData(engJson.engineeringData || {});
        } else {
          setEngineeringData({});
        }

        if (scJson.success) {
          const saved = scJson.pricingData || {};

          setScenarioName(scJson.scenario?.ScenarioName || "");
          setScenarioNote(scJson.scenario?.ScenarioNote || "");
          setCreatedBy(scJson.scenario?.CreatedBy || "");
          setScenarioStatus(scJson.scenario?.ScenarioStatus || "Draft");

          setPricing((prev) => ({
            ...prev,
            ...(saved.pricing || {}),
          }));
        }
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

  const bom = (() => {
    const result = [];
    const layerAPct = toNum(ms.layerAPct);
    const layerBPct = 100 - layerAPct;

    if (Array.isArray(ms.layerA) && ms.layerA.length > 0) {
      ms.layerA.forEach((x) => {
        result.push({
          name: x.name || "Layer A Material",
          qty: ((layerAPct || 100) / 100) * toNum(x.pct || 100) * 10,
        });
      });
    }

    if (Array.isArray(ms.layerB) && ms.layerB.length > 0) {
      ms.layerB.forEach((x) => {
        result.push({
          name: x.name || "Layer B Material",
          qty: ((layerBPct || 0) / 100) * toNum(x.pct || 100) * 10,
        });
      });
    }

    if (result.length === 0) {
      result.push({
        name: ms.baseMaterial || product.productMaterial || "Material",
        qty: 1000,
      });
    }

    if (ms.coatingUsed === "Yes" && ms.coatingName) {
      result.push({
        name: ms.coatingName,
        qty: toNum(ms.coatingWeight_g_m2 || 0),
      });
    }

    return result.filter((x) => x.name);
  })();

  const packaging = (() => {
    const result = [];
    if (pk.primaryName) result.push({ name: pk.primaryName, qty: 1 });
    if (pk.secondaryName) result.push({ name: pk.secondaryName, qty: 1 });
    if (pk.labelsPerSecondary) {
      result.push({ name: "Secondary Labels", qty: toNum(pk.labelsPerSecondary) });
    }
    if (pk.labelsPerPallet) {
      result.push({ name: "Pallet Labels", qty: toNum(pk.labelsPerPallet) });
    }
    if (pk.stretchKgPerPallet) {
      result.push({ name: "Stretch Wrap", qty: toNum(pk.stretchKgPerPallet) });
    }
    return result;
  })();

  const tonsPerDay =
    toNum(ex.tonsPerDay) ||
    (toNum(ex.netSpeed_kg_hr) * 24) / 1000 ||
    1;

  const netExtruderKgPerHour = toNum(ex.netSpeed_kg_hr) || 0;

  // ===== Sync conversion per ton <-> per day =====
  const setConversionPerTon = (value) => {
    const convPerTon = toNum(value);
    const convPerDay = convPerTon * tonsPerDay;
    setPricing((prev) => ({
      ...prev,
      conversionPerTon: value,
      convPerDay: convPerDay ? String(convPerDay) : "",
    }));
  };

  const setConversionPerDay = (value) => {
    const convPerDay = toNum(value);
    const conversionPerTon = tonsPerDay > 0 ? convPerDay / tonsPerDay : 0;
    setPricing((prev) => ({
      ...prev,
      convPerDay: value,
      conversionPerTon: conversionPerTon ? String(conversionPerTon) : "",
    }));
  };

  const conversionPerTon =
    toNum(pricing.conversionPerTon) ||
    (tonsPerDay > 0 ? toNum(pricing.convPerDay) / tonsPerDay : 0);

  const conversionPerDay =
    toNum(pricing.convPerDay) ||
    conversionPerTon * tonsPerDay;

  const materialSummaryMap = new Map();

  bom.forEach((m) => {
    const name = m.name;
    const baseQty = toNum(m.qty);
    const wastePct = toNum(pricing.materialWastePct?.[name] || 0);
    const wasteQty = baseQty * (wastePct / 100);
    const totalQty = baseQty + wasteQty;
    const price = toNum(pricing.materialPrices?.[name] || 0);
    const baseCost = baseQty * price;
    const wasteCost = wasteQty * price;
    const totalCost = totalQty * price;

    if (!materialSummaryMap.has(name)) {
      materialSummaryMap.set(name, {
        name,
        baseQty: 0,
        wastePct,
        wasteQty: 0,
        totalQty: 0,
        price,
        baseCost: 0,
        wasteCost: 0,
        totalCost: 0,
      });
    }

    const row = materialSummaryMap.get(name);
    row.baseQty += baseQty;
    row.wasteQty += wasteQty;
    row.totalQty += totalQty;
    row.price = price;
    row.wastePct = wastePct;
    row.baseCost += baseCost;
    row.wasteCost += wasteCost;
    row.totalCost += totalCost;
  });

  const materialSummary = Array.from(materialSummaryMap.values());

  const materialBaseCost = materialSummary.reduce((s, r) => s + r.baseCost, 0);
  const materialWasteCost = materialSummary.reduce((s, r) => s + r.wasteCost, 0);
  const materialCost = materialSummary.reduce((s, r) => s + r.totalCost, 0);

  const packagingDetails = packaging.map((p) => {
    const price = toNum(pricing.packagingPrices?.[p.name] || 0);
    const baseQty = toNum(p.qty);
    const wastePct = toNum(pricing.packagingWastePct?.[p.name] || 0);
    const wasteQty = baseQty * (wastePct / 100);
    const totalQty = baseQty + wasteQty;
    const baseCost = baseQty * price;
    const wasteCost = wasteQty * price;
    const totalCost = totalQty * price;

    return {
      ...p,
      price,
      wastePct,
      wasteQty,
      totalQty,
      baseCost,
      wasteCost,
      totalCost,
    };
  });

  const packagingBaseCost = packagingDetails.reduce((s, r) => s + r.baseCost, 0);
  const packagingWasteCost = packagingDetails.reduce((s, r) => s + r.wasteCost, 0);
  const packagingCost = packagingDetails.reduce((s, r) => s + r.totalCost, 0);

  const totalPerTon = materialCost + packagingCost + conversionPerTon;

  useEffect(() => {
    if (!pieRef.current) return;

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
    materialBaseCost,
    materialWasteCost,
    packagingBaseCost,
    packagingWasteCost,
    conversionPerTon,
  ]);

  const saveScenario = async () => {
    try {
      localStorage.setItem("pricingCreatedBy", createdBy.trim());

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
          pricingData: {
            pricing,
            sheetSummary: {
              totalPerTon,
              materialBaseCost,
              materialWasteCost,
              packagingBaseCost,
              packagingWasteCost,
              conversionPerTon,
              conversionPerDay,
            },
          },
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

  const goToThermo = async () => {
    const bundle = {
      requestId,
      pricingId,
      sheetName: customer.projectName || product.productType || "Sheet",
      sheetCode: requestId,
      usdEgp: pricing.usdEgp,
      currency: pricing.currency,
      sheetMaterialCostPerTon: materialCost,
      sheetPackagingCostPerTon: 0, // moved thermo packaging out of sheet pricing
      netExtruderKgPerHour,
      netExtruderKgPerDay: netExtruderKgPerHour * 24,
      bomPerTon: materialSummary.map((x) => ({
        name: x.name,
        kg: x.totalQty,
      })),
      tooling,
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
        pricingData: {
          pricing,
          sheetSummary: {
            totalPerTon,
            materialBaseCost,
            materialWasteCost,
            packagingBaseCost,
            packagingWasteCost,
            conversionPerTon,
            conversionPerDay,
          },
          thermoBundle: bundle,
        },
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

  if (loading) {
    return <div className="p-6">Loading pricing data...</div>;
  }

  if (!engineeringData) {
    return <div className="p-6">No engineering data found for this project.</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Pricing — Sheet Roll Scenario</h1>
          <p className="text-sm text-gray-500">
            {requestId} • {pricingId}
          </p>
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
            className="px-4 py-2 rounded-md bg-black text-white hover:bg-gray-800"
          >
            Save Scenario
          </button>

          <button
            onClick={goToThermo}
            className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-500"
          >
            ➜ Thermoformed Product
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          className="border p-2 rounded"
          value={scenarioName}
          onChange={(e) => setScenarioName(e.target.value)}
          placeholder="Scenario name"
        />
        <input
          className="border p-2 rounded"
          value={createdBy}
          onChange={(e) => setCreatedBy(e.target.value)}
          placeholder="Created by"
        />
        <select
          className="border p-2 rounded"
          value={scenarioStatus}
          onChange={(e) => setScenarioStatus(e.target.value)}
        >
          <option>Draft</option>
          <option>Final</option>
          <option>Archived</option>
        </select>
        <select
          className="border p-2 rounded"
          value={pricing.currency}
          onChange={(e) => setPricing({ ...pricing, currency: e.target.value })}
        >
          <option>EGP</option>
          <option>USD</option>
        </select>

        <input
          className="border p-2 rounded"
          value={scenarioNote}
          onChange={(e) => setScenarioNote(e.target.value)}
          placeholder="Scenario note"
        />
        <input
          className="border p-2 rounded"
          value={pricing.usdEgp}
          onChange={(e) => setPricing({ ...pricing, usdEgp: e.target.value })}
          placeholder="USD/EGP FX"
        />
        <input
          className="border p-2 rounded"
          value={pricing.conversionPerTon}
          onChange={(e) => setConversionPerTon(e.target.value)}
          placeholder="Required conversion / ton"
        />
        <input
          className="border p-2 rounded"
          value={pricing.convPerDay}
          onChange={(e) => setConversionPerDay(e.target.value)}
          placeholder="Required conversion / day"
        />
      </div>

      <div className="bg-white border rounded-xl p-4">
        <h2 className="font-semibold mb-2">Engineering Reference</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          <div>
            <div className="text-gray-500">Base Material</div>
            <div className="font-medium">{ms.baseMaterial || product.productMaterial || "—"}</div>
          </div>
          <div>
            <div className="text-gray-500">Net Width</div>
            <div className="font-medium">{ss.netWidth_mm || "—"}</div>
          </div>
          <div>
            <div className="text-gray-500">Thickness</div>
            <div className="font-medium">{ss.thickness_mic || "—"}</div>
          </div>
          <div>
            <div className="text-gray-500">Net Speed kg/hr</div>
            <div className="font-medium">{ex.netSpeed_kg_hr || "—"}</div>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4 space-y-4">
        <h2 className="font-semibold">Material Pricing</h2>

        {materialSummary.map((m) => (
          <div key={m.name} className="grid grid-cols-1 md:grid-cols-7 gap-3 items-end">
            <div>
              <div className="text-xs text-gray-500 mb-1">Material</div>
              <div className="border rounded p-2 bg-gray-50">{m.name}</div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1">Base Qty / ton</div>
              <div className="border rounded p-2 bg-gray-50">{fmt(m.baseQty)}</div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1">Waste %</div>
              <input
                className="border p-2 rounded w-full"
                value={pricing.materialWastePct?.[m.name] || ""}
                onChange={(e) =>
                  setPricing({
                    ...pricing,
                    materialWastePct: {
                      ...pricing.materialWastePct,
                      [m.name]: e.target.value,
                    },
                  })
                }
              />
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1">Waste Qty</div>
              <div className="border rounded p-2 bg-gray-50">{fmt(m.wasteQty)}</div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1">Total Qty</div>
              <div className="border rounded p-2 bg-gray-50">{fmt(m.totalQty)}</div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1">Price / kg</div>
              <input
                className="border p-2 rounded w-full"
                value={pricing.materialPrices?.[m.name] || ""}
                onChange={(e) =>
                  setPricing({
                    ...pricing,
                    materialPrices: {
                      ...pricing.materialPrices,
                      [m.name]: e.target.value,
                    },
                  })
                }
              />
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1">Total Cost / ton</div>
              <div className="border rounded p-2 bg-gray-50">{fmt(m.totalCost)}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border rounded-xl p-4 space-y-4">
        <h2 className="font-semibold">Sheet Packaging Pricing</h2>

        {packaging.length === 0 ? (
          <div className="text-sm text-gray-500">No sheet packaging items derived from engineering data.</div>
        ) : (
          packagingDetails.map((p) => (
            <div key={p.name} className="grid grid-cols-1 md:grid-cols-7 gap-3 items-end">
              <div>
                <div className="text-xs text-gray-500 mb-1">Item</div>
                <div className="border rounded p-2 bg-gray-50">{p.name}</div>
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-1">Base Qty</div>
                <div className="border rounded p-2 bg-gray-50">{fmt(p.qty)}</div>
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-1">Waste %</div>
                <input
                  className="border p-2 rounded w-full"
                  value={pricing.packagingWastePct?.[p.name] || ""}
                  onChange={(e) =>
                    setPricing({
                      ...pricing,
                      packagingWastePct: {
                        ...pricing.packagingWastePct,
                        [p.name]: e.target.value,
                      },
                    })
                  }
                />
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-1">Waste Qty</div>
                <div className="border rounded p-2 bg-gray-50">{fmt(p.wasteQty)}</div>
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-1">Total Qty</div>
                <div className="border rounded p-2 bg-gray-50">{fmt(p.totalQty)}</div>
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-1">Price</div>
                <input
                  className="border p-2 rounded w-full"
                  value={pricing.packagingPrices?.[p.name] || ""}
                  onChange={(e) =>
                    setPricing({
                      ...pricing,
                      packagingPrices: {
                        ...pricing.packagingPrices,
                        [p.name]: e.target.value,
                      },
                    })
                  }
                />
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-1">Total Cost</div>
                <div className="border rounded p-2 bg-gray-50">{fmt(p.totalCost)}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-white border rounded-xl p-4">
        <h2 className="font-semibold mb-3">Summary (per ton)</h2>
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
            <span>Conversion / day</span>
            <span>{fmt(conversionPerDay)} EGP • {fmt(toNum(pricing.usdEgp) ? conversionPerDay / toNum(pricing.usdEgp) : 0)} USD</span>
          </div>
          <div className="flex justify-between">
            <span>FX Rate</span>
            <span>{fmt(pricing.usdEgp, 3)}</span>
          </div>
          <div className="flex justify-between font-semibold border-t pt-2">
            <span>Total / ton</span>
            <span>{fmt(totalPerTon)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <canvas ref={pieRef}></canvas>
      </div>
    </div>
  );
}