import { useState, useEffect, useRef } from "react";
import Chart from "chart.js/auto";

/* ================= UTILITIES ================= */
const toNum = v => {
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
};

const fmt = (v) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 3,
  }).format(v || 0);

/* ================= COMPONENT ================= */

export default function PricingPage({ bundle, onBack }) {
  const [pricing, setPricing] = useState({
    currency: "EGP",
    usdEgp: 60,
    convPerDay: 350000,
    matPrices: {},
    packPrices: {},
  });

  const pieRef = useRef(null);

  const tonsPerDay = bundle?.tonsPerDay || 0;

  const materialCost =
    (bundle?.bom_per_ton || []).reduce((sum, m) => {
      const price = toNum(pricing.matPrices[m.name]);
      return sum + m.kg * price;
    }, 0);

  const packagingCost =
    (bundle?.packaging_per_ton || []).reduce((sum, p) => {
      const price = toNum(pricing.packPrices[p.name]);
      return sum + p.qty * price;
    }, 0);

  const conversionCost =
    tonsPerDay > 0 ? pricing.convPerDay / tonsPerDay : 0;

  const total = materialCost + packagingCost + conversionCost;

  /* ===== CHART ===== */
  useEffect(() => {
    if (!pieRef.current) return;

    const chart = new Chart(pieRef.current, {
      type: "pie",
      data: {
        labels: ["Material", "Packaging", "Conversion"],
        datasets: [
          {
            data: [materialCost, packagingCost, conversionCost],
          },
        ],
      },
    });

    return () => chart.destroy();
  }, [materialCost, packagingCost, conversionCost]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">
          Pricing — {bundle?.sheetName || "—"}
        </h1>

        <button
          onClick={onBack}
          className="px-4 py-2 border rounded"
        >
          ← Back
        </button>
      </div>

      {/* MATERIAL PRICES */}
      <div className="border rounded p-4">
        <h2 className="font-semibold mb-3">Material Prices</h2>

        {(bundle?.bom_per_ton || []).map((m) => (
          <div key={m.name} className="flex gap-3 mb-2">
            <div className="w-40">{m.name}</div>

            <input
              className="border px-2 py-1"
              placeholder="Price / kg"
              value={pricing.matPrices[m.name] || ""}
              onChange={(e) =>
                setPricing({
                  ...pricing,
                  matPrices: {
                    ...pricing.matPrices,
                    [m.name]: e.target.value,
                  },
                })
              }
            />

            <div>{fmt(m.kg)} kg</div>
          </div>
        ))}
      </div>

      {/* PACKAGING */}
      <div className="border rounded p-4">
        <h2 className="font-semibold mb-3">Packaging</h2>

        {(bundle?.packaging_per_ton || []).map((p) => (
          <div key={p.name} className="flex gap-3 mb-2">
            <div className="w-40">{p.name}</div>

            <input
              className="border px-2 py-1"
              placeholder="Price"
              value={pricing.packPrices[p.name] || ""}
              onChange={(e) =>
                setPricing({
                  ...pricing,
                  packPrices: {
                    ...pricing.packPrices,
                    [p.name]: e.target.value,
                  },
                })
              }
            />

            <div>{fmt(p.qty)}</div>
          </div>
        ))}
      </div>

      {/* CONVERSION */}
      <div className="border rounded p-4">
        <h2 className="font-semibold mb-3">Conversion</h2>

        <input
          className="border px-2 py-1"
          value={pricing.convPerDay}
          onChange={(e) =>
            setPricing({ ...pricing, convPerDay: e.target.value })
          }
        />
      </div>

      {/* SUMMARY */}
      <div className="border rounded p-4">
        <h2 className="font-semibold mb-3">Summary</h2>

        <div>Material: {fmt(materialCost)}</div>
        <div>Packaging: {fmt(packagingCost)}</div>
        <div>Conversion: {fmt(conversionCost)}</div>

        <div className="font-bold mt-3">
          Total / ton: {fmt(total)}
        </div>
      </div>

      {/* CHART */}
      <div className="border rounded p-4">
        <canvas ref={pieRef}></canvas>
      </div>
    </div>
  );
}