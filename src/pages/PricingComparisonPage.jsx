import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

const toNum = (v) => {
  const n = parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isNaN(n) ? 0 : n;
};

const fmt = (v, d = 3) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: d,
  }).format(v || 0);

function parsePricingJson(jsonString) {
  try {
    return jsonString ? JSON.parse(jsonString) : {};
  } catch {
    return {};
  }
}

function StatusBadge({ status }) {
  const colors = {
    Draft: "bg-gray-100 text-gray-700",
    Final: "bg-green-100 text-green-700",
    Archived: "bg-yellow-100 text-yellow-700",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${
        colors[status] || "bg-gray-100 text-gray-700"
      }`}
    >
      {status || "—"}
    </span>
  );
}

function normalizeForDelta(value) {
  const raw = String(value ?? "").trim();
  const n = toNum(raw);
  if (raw !== "" && !Number.isNaN(n) && raw.match(/^-?[\d,.]+$/)) {
    return { type: "number", value: n };
  }
  return { type: "text", value: raw };
}

function calcDelta(current, base) {
  const c = normalizeForDelta(current);
  const b = normalizeForDelta(base);

  if (c.type !== "number" || b.type !== "number") {
    return { delta: "", pct: "" };
  }

  const delta = c.value - b.value;
  const pct = b.value !== 0 ? (delta / b.value) * 100 : "";
  return { delta, pct };
}

function getValueAtPath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

function flattenObject(obj, prefix = "") {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return [];
  const out = [];

  Object.entries(obj).forEach(([key, value]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out.push(...flattenObject(value, nextKey));
    } else {
      out.push([nextKey, value]);
    }
  });

  return out;
}

function extractScenarioData(scenario) {
  const pricingData = parsePricingJson(scenario.PricingJSON);
  const pricing = pricingData?.pricing || {};
  const sheetScenario = pricingData?.sheetScenario || {};
  const sheetSummary = pricingData?.sheetSummary || {};
  const materialRows = pricingData?.materialRows || [];
  const packagingRows = pricingData?.packagingRows || [];
  const thermo = pricingData?.thermo || {};
  const thermoSummary = thermo?.summary || {};

  return {
    pricingId: scenario.PricingID || "",
    scenarioName: scenario.ScenarioName || "",
    scenarioNote: scenario.ScenarioNote || "",
    status: scenario.ScenarioStatus || "",
    currency: scenario.ScenarioCurrency || pricing.currency || "",
    usdEgp: scenario.UsdEgp || pricing.usdEgp || "",
    eurUsd: scenario.EurUsd || pricing.eurUsd || "",

    productName: sheetScenario.productName || "",
    productCode: sheetScenario.productCode || "",
    baseMaterial: sheetScenario.baseMaterial || "",
    density: sheetScenario.density || "",
    netWidth_mm: sheetScenario.netWidth_mm || "",
    grossWidth_mm: sheetScenario.grossWidth_mm || "",
    edgeTrimPerSide_mm: sheetScenario.edgeTrimPerSide_mm || "",
    thickness_mic: sheetScenario.thickness_mic || "",
    rollDiameter_mm: sheetScenario.rollDiameter_mm || "",
    rollWeight_kg: sheetScenario.rollWeight_kg || "",
    coreType: sheetScenario.coreType || "",
    coreDiameter_mm: sheetScenario.coreDiameter_mm || "",
    coatingUsed: sheetScenario.coatingUsed || "",
    coatingName: sheetScenario.coatingName || "",
    coatingWeight_g_m2: sheetScenario.coatingWeight_g_m2 || "",
    grossSpeedA_kg_hr: sheetScenario.grossSpeedA_kg_hr || "",
    grossSpeedB_kg_hr: sheetScenario.grossSpeedB_kg_hr || "",
    efficiencyPct: sheetScenario.efficiencyPct || "",
    sheetUtilizationPct: sheetScenario.sheetUtilizationPct || "",

    materialBaseCost: sheetSummary.materialBaseCost || 0,
    materialWasteCost: sheetSummary.materialWasteCost || 0,
    packagingBaseCost: sheetSummary.packagingBaseCost || 0,
    packagingWasteCost: sheetSummary.packagingWasteCost || 0,
    conversionPerTon: sheetSummary.conversionPerTon || 0,
    totalPerTon: sheetSummary.totalPerTon || scenario.TotalCostPer1000 || 0,
    tonsPerDay: sheetSummary.tonsPerDay || 0,
    netExtruderKgPerHour: sheetSummary.netExtruderKgPerHour || 0,

    thermoTotalPer1000: thermoSummary.totalPer1000 || 0,
    thermoPaybackQtyPcs: thermoSummary.paybackQtyPcs || 0,
    thermoPricePerCarton: thermoSummary.pricePerCarton || 0,
    sheetConsumptionKgPerHour: thermoSummary.sheetConsumptionKgPerHour || 0,
    sheetConsumptionKgPerDay: thermoSummary.sheetConsumptionKgPerDay || 0,
    sellingPricePer1000:
      scenario.SellingPricePer1000 || thermo?.finance?.desiredPricePer1000 || "",

    materialRows,
    packagingRows,
    thermoSpec: thermo?.spec || {},
    thermoPack: thermo?.pack || {},
    thermoFinance: thermo?.finance || {},
    thermoDeco: thermo?.deco || {},
  };
}

function buildMaterialCompareRows(scenarios) {
  const materialNames = new Set();

  scenarios.forEach((s) => {
    (s.materialRows || []).forEach((row) => {
      if (row?.name) materialNames.add(row.name);
    });
  });

  const sorted = Array.from(materialNames).sort((a, b) => a.localeCompare(b));

  const rows = [];

  sorted.forEach((name) => {
    rows.push([
      `Material → ${name} → Scenario %`,
      (scenario) => {
        const row = (scenario.materialRows || []).find((r) => r.name === name);
        return row?.scenarioPct || "";
      },
    ]);
    rows.push([
      `Material → ${name} → Price`,
      (scenario) => {
        const row = (scenario.materialRows || []).find((r) => r.name === name);
        return row?.price || "";
      },
    ]);
    rows.push([
      `Material → ${name} → Currency`,
      (scenario) => {
        const row = (scenario.materialRows || []).find((r) => r.name === name);
        return row?.currency || "";
      },
    ]);
    rows.push([
      `Material → ${name} → Waste %`,
      (scenario) => {
        const row = (scenario.materialRows || []).find((r) => r.name === name);
        return row?.ratePct || "";
      },
    ]);
  });

  return rows;
}

function buildPackagingCompareRows(scenarios) {
  const itemNames = new Set();

  scenarios.forEach((s) => {
    (s.packagingRows || []).forEach((row) => {
      if (row?.name) itemNames.add(row.name);
    });
  });

  const sorted = Array.from(itemNames).sort((a, b) => a.localeCompare(b));

  const rows = [];

  sorted.forEach((name) => {
    rows.push([
      `Sheet Packaging → ${name} → Scenario Qty`,
      (scenario) => {
        const row = (scenario.packagingRows || []).find((r) => r.name === name);
        return row?.scenarioQty || "";
      },
    ]);
    rows.push([
      `Sheet Packaging → ${name} → Unit`,
      (scenario) => {
        const row = (scenario.packagingRows || []).find((r) => r.name === name);
        return row?.unit || "";
      },
    ]);
    rows.push([
      `Sheet Packaging → ${name} → Waste %`,
      (scenario) => {
        const row = (scenario.packagingRows || []).find((r) => r.name === name);
        return row?.wastePct || "";
      },
    ]);
    rows.push([
      `Sheet Packaging → ${name} → Price`,
      (scenario) => {
        const row = (scenario.packagingRows || []).find((r) => r.name === name);
        return row?.price || "";
      },
    ]);
    rows.push([
      `Sheet Packaging → ${name} → Currency`,
      (scenario) => {
        const row = (scenario.packagingRows || []).find((r) => r.name === name);
        return row?.currency || "";
      },
    ]);
  });

  return rows;
}

export default function PricingComparisonPage() {
  const { requestId } = useParams();

  const [requestData, setRequestData] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [basePricingId, setBasePricingId] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const [reqRes, scRes] = await Promise.all([
          fetch(`/.netlify/functions/get-request?requestId=${requestId}`),
          fetch(`/.netlify/functions/list-pricing-scenarios?requestId=${requestId}`),
        ]);

        const reqJson = await reqRes.json();
        const scJson = await scRes.json();

        if (!reqJson.success) {
          setError(reqJson.error || "Failed to load project");
          return;
        }

        setRequestData(reqJson.payload || {});

        if (!scJson.success) {
          setError(scJson.error || "Failed to load scenarios");
          return;
        }

        const selected = (scJson.scenarios || [])
          .filter((s) => (s.CompareSelected || "") === "Yes")
          .slice(0, 4);

        setScenarios(selected);

        if (selected.length > 0) {
          setBasePricingId(selected[0].PricingID);
        }
      } catch (err) {
        console.error("Comparison load error:", err);
        setError("Failed to load comparison page");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [requestId]);

  const summary = useMemo(() => {
    const customer = requestData?.customer || {};
    const product = requestData?.product || {};
    return {
      customerName: customer.customerName || "—",
      projectName: project.projectName || "—",
      productType: product.productType || "—",
      thumbnail:
        product?.productThumbnailPreview ||
        (product?.productThumbnailBase64
          ? `data:image/*;base64,${product.productThumbnailBase64}`
          : ""),
    };
  }, [requestData]);

  const scenarioData = useMemo(() => {
    return scenarios.map(extractScenarioData);
  }, [scenarios]);

  const baseScenario = useMemo(() => {
    return scenarioData.find((s) => s.pricingId === basePricingId) || null;
  }, [scenarioData, basePricingId]);

  const topRows = useMemo(
    () => [
      ["Scenario Name", (s) => s.scenarioName],
      ["Scenario Note", (s) => s.scenarioNote],
      ["Status", (s) => s.status],
      ["Currency", (s) => s.currency],
      ["USD / EGP", (s) => s.usdEgp],
      ["EUR / USD", (s) => s.eurUsd],
      ["Product Name", (s) => s.productName],
      ["Product Code", (s) => s.productCode],
      ["Base Material", (s) => s.baseMaterial],
      ["Density", (s) => s.density],
      ["Net Width (mm)", (s) => s.netWidth_mm],
      ["Gross Width (mm)", (s) => s.grossWidth_mm],
      ["Edge Trim / Side (mm)", (s) => s.edgeTrimPerSide_mm],
      ["Thickness (mic)", (s) => s.thickness_mic],
      ["Roll Diameter (mm)", (s) => s.rollDiameter_mm],
      ["Roll Weight (kg)", (s) => s.rollWeight_kg],
      ["Core Type", (s) => s.coreType],
      ["Core Diameter (mm)", (s) => s.coreDiameter_mm],
      ["Coating Used", (s) => s.coatingUsed],
      ["Coating Name", (s) => s.coatingName],
      ["Coating Weight (g/m²)", (s) => s.coatingWeight_g_m2],
      ["Gross Speed A (kg/hr)", (s) => s.grossSpeedA_kg_hr],
      ["Gross Speed B (kg/hr)", (s) => s.grossSpeedB_kg_hr],
      ["Efficiency %", (s) => s.efficiencyPct],
      ["Sheet Utilization %", (s) => s.sheetUtilizationPct],
      ["Material Base Cost", (s) => s.materialBaseCost],
      ["Material Waste Cost", (s) => s.materialWasteCost],
      ["Packaging Base Cost", (s) => s.packagingBaseCost],
      ["Packaging Waste Cost", (s) => s.packagingWasteCost],
      ["Conversion / ton", (s) => s.conversionPerTon],
      ["Total / ton", (s) => s.totalPerTon],
      ["Tons / day", (s) => s.tonsPerDay],
      ["Net Extruder kg/hr", (s) => s.netExtruderKgPerHour],
      ["Thermo Total / 1000", (s) => s.thermoTotalPer1000],
      ["Thermo Payback Qty", (s) => s.thermoPaybackQtyPcs],
      ["Thermo Price / Carton", (s) => s.thermoPricePerCarton],
      ["Sheet Consumption kg/hr", (s) => s.sheetConsumptionKgPerHour],
      ["Sheet Consumption kg/day", (s) => s.sheetConsumptionKgPerDay],
      ["Selling Price / 1000", (s) => s.sellingPricePer1000],
    ],
    []
  );

  const materialRows = useMemo(() => buildMaterialCompareRows(scenarioData), [scenarioData]);
  const packagingRows = useMemo(() => buildPackagingCompareRows(scenarioData), [scenarioData]);

  const thermoSpecRows = useMemo(() => {
    const keys = new Set();
    scenarioData.forEach((s) => {
      flattenObject(s.thermoSpec).forEach(([key]) => keys.add(key));
    });

    return Array.from(keys)
      .sort((a, b) => a.localeCompare(b))
      .map((key) => [`Thermo Spec → ${key}`, (scenario) => getValueAtPath(scenario.thermoSpec, key) ?? ""]);
  }, [scenarioData]);

  const thermoPackRows = useMemo(() => {
    const keys = new Set();
    scenarioData.forEach((s) => {
      flattenObject(s.thermoPack).forEach(([key]) => keys.add(key));
    });

    return Array.from(keys)
      .sort((a, b) => a.localeCompare(b))
      .map((key) => [`Thermo Packaging → ${key}`, (scenario) => getValueAtPath(scenario.thermoPack, key) ?? ""]);
  }, [scenarioData]);

  const thermoFinanceRows = useMemo(() => {
    const keys = new Set();
    scenarioData.forEach((s) => {
      flattenObject(s.thermoFinance).forEach(([key]) => keys.add(key));
    });

    return Array.from(keys)
      .sort((a, b) => a.localeCompare(b))
      .map((key) => [`Thermo Finance → ${key}`, (scenario) => getValueAtPath(scenario.thermoFinance, key) ?? ""]);
  }, [scenarioData]);

  const thermoDecoRows = useMemo(() => {
    const keys = new Set();
    scenarioData.forEach((s) => {
      flattenObject(s.thermoDeco).forEach(([key]) => keys.add(key));
    });

    return Array.from(keys)
      .sort((a, b) => a.localeCompare(b))
      .map((key) => [`Thermo Decoration → ${key}`, (scenario) => getValueAtPath(scenario.thermoDeco, key) ?? ""]);
  }, [scenarioData]);

  const compareRows = useMemo(() => {
    return [
      ...topRows,
      ...materialRows,
      ...packagingRows,
      ...thermoSpecRows,
      ...thermoPackRows,
      ...thermoFinanceRows,
      ...thermoDecoRows,
    ];
  }, [topRows, materialRows, packagingRows, thermoSpecRows, thermoPackRows, thermoFinanceRows, thermoDecoRows]);

  const changeSummary = useMemo(() => {
    if (!baseScenario) return [];

    return scenarioData
      .filter((s) => s.pricingId !== baseScenario.pricingId)
      .map((s) => {
        const changes = [];

        compareRows.forEach(([label, getter]) => {
          const currentValue = getter(s);
          const baseValue = getter(baseScenario);
          if (String(currentValue ?? "") !== String(baseValue ?? "")) {
            changes.push(label);
          }
        });

        return {
          pricingId: s.pricingId,
          scenarioName: s.scenarioName,
          changes,
        };
      });
  }, [baseScenario, compareRows, scenarioData]);

  if (loading) return <div className="p-6">Loading comparison page...</div>;

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!scenarioData.length) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <Link
          to={`/pricing/${requestId}`}
          className="inline-block rounded-lg border px-4 py-2 text-sm hover:bg-gray-100 bg-white"
        >
          ← Back to Workspace
        </Link>

        <div className="rounded-xl border bg-white p-6 text-gray-600">
          No scenarios are selected for comparison.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {summary.thumbnail ? (
              <img
                src={summary.thumbnail}
                alt="Product thumbnail"
                className="w-16 h-16 rounded-xl border object-cover bg-white"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl border bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                No image
              </div>
            )}

            <div>
              <h1 className="text-2xl font-bold">Scenario Comparison</h1>
              <p className="text-sm text-gray-500">
                {summary.projectName} • {summary.productType} • {requestId}
              </p>
            </div>
          </div>

          <Link
            to={`/pricing/${requestId}`}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100 bg-white"
          >
            ← Back to Workspace
          </Link>
        </div>

        <div className="rounded-2xl border bg-white shadow-sm p-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <div className="text-xs text-gray-500">Customer</div>
              <div className="font-medium">{summary.customerName}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Project</div>
              <div className="font-medium">{summary.projectName}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Product</div>
              <div className="font-medium">{summary.productType}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Base Scenario</div>
              <select
                className="w-full border rounded-lg p-2"
                value={basePricingId}
                onChange={(e) => setBasePricingId(e.target.value)}
              >
                {scenarioData.map((s) => (
                  <option key={s.pricingId} value={s.pricingId}>
                    {s.scenarioName || s.pricingId}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white shadow-sm overflow-auto">
          <table className="w-full text-sm min-w-[1500px]">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-3">Parameter</th>
                {scenarioData.map((s) => (
                  <th key={s.pricingId} className="p-3">
                    <div className="space-y-1">
                      <div className="font-semibold">{s.scenarioName || s.pricingId}</div>
                      <div>
                        <StatusBadge status={s.status} />
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compareRows.map(([label, getter]) => (
                <tr key={label} className="border-t align-top">
                  <td className="p-3 font-medium bg-gray-50">{label}</td>
                  {scenarioData.map((s) => {
                    const baseValue = baseScenario ? getter(baseScenario) : "";
                    const currentValue = getter(s);
                    const diff = calcDelta(currentValue, baseValue);

                    const isBase = s.pricingId === baseScenario?.pricingId;
                    const changed =
                      !isBase && String(currentValue ?? "") !== String(baseValue ?? "");

                    return (
                      <td
                        key={`${s.pricingId}-${label}`}
                        className={`p-3 ${isBase ? "bg-blue-50" : changed ? "bg-orange-50" : ""}`}
                      >
                        <div>{String(currentValue ?? "") || "—"}</div>

                        {!isBase && changed ? (
                          <div className="text-xs text-gray-500 mt-1">
                            {diff.delta !== "" ? (
                              <>
                                Δ {fmt(diff.delta, 3)}
                                {diff.pct !== "" ? ` • ${fmt(diff.pct, 2)}%` : ""}
                              </>
                            ) : (
                              "Different from base"
                            )}
                          </div>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
          <h2 className="text-lg font-semibold">Summary of Differences vs Base</h2>

          {changeSummary.length === 0 ? (
            <div className="text-gray-600">No other scenarios to compare against the base scenario.</div>
          ) : (
            <div className="space-y-3">
              {changeSummary.map((row) => (
                <div key={row.pricingId} className="rounded-xl border p-4">
                  <div className="font-medium">{row.scenarioName || row.pricingId}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {row.changes.length > 0
                      ? `Changed compared to base: ${row.changes.slice(0, 20).join(", ")}${
                          row.changes.length > 20 ? ` and ${row.changes.length - 20} more` : ""
                        }.`
                      : "No changes compared to the base scenario."}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}