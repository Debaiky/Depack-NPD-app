import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Chart from "chart.js/auto";

const toNum = (v) => {
  const n = parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isNaN(n) ? 0 : n;
};

const fmt = (v) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(v || 0);

export default function PricingPage() {
  const { requestId } = useParams();
  const navigate = useNavigate();

  const [engineeringData, setEngineeringData] = useState(null);
  const [requestData, setRequestData] = useState(null);

  const [pricing, setPricing] = useState({
    currency: "EGP",
    usdEgp: 60,
    convPerDay: 300000,
    materialPrices: {},
    packagingPrices: {},
  });

  const pieRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const reqRes = await fetch(
          `/.netlify/functions/get-request?requestId=${requestId}`
        );
        const reqJson = await reqRes.json();

        if (reqJson.success) {
          setRequestData(reqJson.payload || {});
        }

        const engRes = await fetch(
          `/.netlify/functions/get-engineering-data?requestId=${requestId}`
        );
        const engJson = await engRes.json();

        if (engJson.success) {
          setEngineeringData(engJson.engineeringData || {});
        }
      } catch (error) {
        console.error("Failed to load pricing page:", error);
      }
    };

    load();
  }, [requestId]);

  const requestCustomer = requestData?.customer || {};
  const requestProduct = requestData?.product || {};

  const sheet = engineeringData?.sheet || {};

  const bom = Array.isArray(sheet?.bom) ? sheet.bom : [];
  const packaging = Array.isArray(sheet?.packaging) ? sheet.packaging : [];

  const materialCost = bom.reduce((sum, m) => {
    const price = toNum(pricing.materialPrices[m.name]);
    return sum + toNum(m.qty) * price;
  }, 0);

  const packagingCost = packaging.reduce((sum, p) => {
    const price = toNum(pricing.packagingPrices[p.name]);
    return sum + toNum(p.qty) * price;
  }, 0);

  const tonsPerDay = toNum(sheet.tonsPerDay) || 1;
  const conversionPerTon = toNum(pricing.convPerDay) / tonsPerDay;
  const totalPerTon = materialCost + packagingCost + conversionPerTon;

  useEffect(() => {
    if (!pieRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new Chart(pieRef.current, {
      type: "pie",
      data: {
        labels: ["Material", "Packaging", "Conversion"],
        datasets: [
          {
            data: [materialCost, packagingCost, conversionPerTon],
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            position: "bottom",
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [materialCost, packagingCost, conversionPerTon]);

  const goToThermo = () => {
    const bundle = {
      requestId,
      sheetName:
        requestCustomer.projectName ||
        requestProduct.productType ||
        "Sheet",
      sheetCode: requestId,
      usdEgp: pricing.usdEgp,
      currency: pricing.currency,
      sheetMaterialCostPerTon: materialCost,
      sheetPackagingCostPerTon: packagingCost,
      netExtruderKgPerHour: toNum(sheet.netKgPerHour || sheet.kgPerHour || 0),
      netExtruderKgPerDay:
        toNum(sheet.netKgPerHour || sheet.kgPerHour || 0) * 24,
      bomPerTon: bom.map((x) => ({
        name: x.name,
        kg: toNum(x.qty),
      })),
    };

    navigate(`/pricing/${requestId}/thermo`, {
      state: { bundle },
    });
  };

  if (!engineeringData) {
    return <div className="p-6">Loading pricing data...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Pricing — Sheet Roll</h1>
          <p className="text-sm text-gray-500">
            {requestCustomer.projectName || "—"} {requestId ? `(${requestId})` : ""}
          </p>
        </div>

        <button
          onClick={goToThermo}
          className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-500"
        >
          ➜ Thermoformed Product
        </button>
      </div>

      <div className="bg-white border rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <div className="text-sm">Currency</div>
          <select
            className="border p-2 rounded w-full"
            value={pricing.currency}
            onChange={(e) =>
              setPricing({ ...pricing, currency: e.target.value })
            }
          >
            <option>EGP</option>
            <option>USD</option>
          </select>
        </div>

        <div>
          <div className="text-sm">USD/EGP</div>
          <input
            className="border p-2 rounded w-full"
            value={pricing.usdEgp}
            onChange={(e) =>
              setPricing({ ...pricing, usdEgp: e.target.value })
            }
          />
        </div>

        <div>
          <div className="text-sm">Conversion / day</div>
          <input
            className="border p-2 rounded w-full"
            value={pricing.convPerDay}
            onChange={(e) =>
              setPricing({ ...pricing, convPerDay: e.target.value })
            }
          />
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <h2 className="font-semibold mb-2">Material Prices</h2>

        {bom.length === 0 ? (
          <div className="text-sm text-gray-500">No BOM found in engineering data.</div>
        ) : (
          bom.map((m) => (
            <div key={m.name} className="flex gap-3 mb-2 items-center flex-wrap">
              <div className="w-40">{m.name}</div>

              <input
                className="border p-2 rounded w-40"
                placeholder="Price / kg"
                value={pricing.materialPrices[m.name] || ""}
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

              <div>{fmt(m.qty)} kg</div>
            </div>
          ))
        )}
      </div>

      <div className="bg-white border rounded-xl p-4">
        <h2 className="font-semibold mb-2">Packaging Prices</h2>

        {packaging.length === 0 ? (
          <div className="text-sm text-gray-500">No packaging data found in engineering data.</div>
        ) : (
          packaging.map((p) => (
            <div key={p.name} className="flex gap-3 mb-2 items-center flex-wrap">
              <div className="w-40">{p.name}</div>

              <input
                className="border p-2 rounded w-40"
                placeholder="Price"
                value={pricing.packagingPrices[p.name] || ""}
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

              <div>{fmt(p.qty)}</div>
            </div>
          ))
        )}
      </div>

      <div className="bg-white border rounded-xl p-4">
        <h2 className="font-semibold mb-3">Summary (per ton)</h2>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Material</span>
            <span>{fmt(materialCost)}</span>
          </div>

          <div className="flex justify-between">
            <span>Packaging</span>
            <span>{fmt(packagingCost)}</span>
          </div>

          <div className="flex justify-between">
            <span>Conversion</span>
            <span>{fmt(conversionPerTon)}</span>
          </div>

          <div className="flex justify-between font-semibold border-t pt-2">
            <span>Total</span>
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