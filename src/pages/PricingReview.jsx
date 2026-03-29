import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

function Card({ title, children }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </div>
  );
}

export default function PricingReview() {
  const { requestId } = useParams();

  const [request, setRequest] = useState(null);
  const [engineering, setEngineering] = useState(null);
  const [prices, setPrices] = useState({
    materialPricePerKg: "",
    conversionCostPerHour: "",
    marginPct: 20,
  });

  const [results, setResults] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        // load request
        const res1 = await fetch(
          `/.netlify/functions/get-request?requestId=${requestId}`
        );
        const r1 = await res1.json();

        // load engineering
        const res2 = await fetch(
          `/.netlify/functions/get-engineering?requestId=${requestId}`
        );
        const r2 = await res2.json();

        if (r1.success) setRequest(r1.payload);
        if (r2.success) setEngineering(r2.data);
      } catch (e) {
        console.error(e);
      }
    };

    load();
  }, [requestId]);

  const calculate = () => {
    try {
      const materialPrice = Number(prices.materialPricePerKg);
      const hourlyCost = Number(prices.conversionCostPerHour);
      const margin = Number(prices.marginPct) / 100;

      // example inputs from engineering (adjust later)
      const kgPerHour = engineering?.sheet?.kgPerHour || 500;
      const pcsPerHour = engineering?.thermoforming?.pcsPerHour || 20000;

      const materialCostPerHour = kgPerHour * materialPrice;
      const totalCostPerHour = materialCostPerHour + hourlyCost;

      const costPerPiece = totalCostPerHour / pcsPerHour;
      const costPer1000 = costPerPiece * 1000;

      const sellingPrice = costPer1000 * (1 + margin);

      setResults({
        materialCostPerHour,
        totalCostPerHour,
        costPer1000,
        sellingPrice,
      });
    } catch (e) {
      console.error(e);
    }
  };

  if (!request || !engineering) {
    return <div className="p-6">Loading pricing data...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Pricing - {requestId}</h1>

        <Link to="/pricing" className="border px-4 py-2 rounded">
          ← Back
        </Link>
      </div>

      {/* INPUTS */}
      <Card title="Pricing Inputs">
        <div className="grid md:grid-cols-3 gap-4">
          <input
            placeholder="Material Price (per kg)"
            value={prices.materialPricePerKg}
            onChange={(e) =>
              setPrices({ ...prices, materialPricePerKg: e.target.value })
            }
            className="border p-2 rounded"
          />

          <input
            placeholder="Conversion Cost / Hour"
            value={prices.conversionCostPerHour}
            onChange={(e) =>
              setPrices({
                ...prices,
                conversionCostPerHour: e.target.value,
              })
            }
            className="border p-2 rounded"
          />

          <input
            placeholder="Margin %"
            value={prices.marginPct}
            onChange={(e) =>
              setPrices({ ...prices, marginPct: e.target.value })
            }
            className="border p-2 rounded"
          />
        </div>

        <button
          onClick={calculate}
          className="bg-black text-white px-4 py-2 rounded mt-3"
        >
          Calculate
        </button>
      </Card>

      {/* RESULTS */}
      {results && (
        <Card title="Results">
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <div>Material Cost / Hour: {results.materialCostPerHour.toFixed(2)}</div>
            <div>Total Cost / Hour: {results.totalCostPerHour.toFixed(2)}</div>
            <div>Cost / 1000 pcs: {results.costPer1000.toFixed(2)}</div>
            <div className="font-bold">
              Selling Price / 1000 pcs: {results.sellingPrice.toFixed(2)}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}