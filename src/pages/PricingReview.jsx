import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";

function Section({ title, children }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
      <h2 className="font-semibold text-lg">{title}</h2>
      {children}
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded-lg p-2"
      />
    </div>
  );
}

function ReadBox({ label, value }) {
  return (
    <div className="rounded-xl border bg-gray-50 p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium mt-1 break-words">{value || "—"}</div>
    </div>
  );
}

export default function PricingReview() {
  const { requestId } = useParams();

  const [request, setRequest] = useState(null);
  const [engineeringData, setEngineeringData] = useState(null);

  const [pricing, setPricing] = useState({
    materialPricePerKg: "",
    extrusionMachineCostPerHour: "",
    extrusionLaborCostPerHour: "",
    thermoMachineCostPerHour: "",
    thermoLaborCostPerHour: "",
    packagingCostPer1000: "",
    decorationCostPer1000: "",
    transportCostPer1000: "",
    marginPct: "20",
  });

  useEffect(() => {
    const load = async () => {
      try {
        const reqRes = await fetch(
          `/.netlify/functions/get-request?requestId=${requestId}`
        );
        const reqJson = await reqRes.json();

        const engRes = await fetch(
          `/.netlify/functions/get-engineering-data?requestId=${requestId}`
        );
        const engJson = await engRes.json();

        if (reqJson.success) {
          setRequest(reqJson.payload || {});
        }

        if (engJson.success) {
          setEngineeringData(engJson.engineeringData || {});
        }
      } catch (error) {
        console.error("Failed to load pricing data:", error);
      }
    };

    load();
  }, [requestId]);

  const engineering = engineeringData || {};
  const requestProduct = request?.product || {};
  const requestCustomer = request?.customer || {};

  const derived = useMemo(() => {
    const kgPerHour = Number(engineering?.sheet?.kgPerHour || 0);
    const wastePct = Number(engineering?.sheet?.wastePct || 0);

    const cpm = Number(engineering?.thermo?.cpm || 0);
    const cavities = Number(engineering?.thermo?.cavities || 0);
    const efficiencyPct = Number(engineering?.thermo?.efficiency || 0);

    const pcsPerHour = cpm * cavities * (efficiencyPct / 100) * 60;

    const netKgPerHour = kgPerHour * (1 + wastePct / 100);

    return {
      kgPerHour,
      wastePct,
      cpm,
      cavities,
      efficiencyPct,
      pcsPerHour,
      netKgPerHour,
    };
  }, [engineering]);

  const results = useMemo(() => {
    const materialPricePerKg = Number(pricing.materialPricePerKg || 0);

    const extrusionMachineCostPerHour = Number(
      pricing.extrusionMachineCostPerHour || 0
    );
    const extrusionLaborCostPerHour = Number(
      pricing.extrusionLaborCostPerHour || 0
    );
    const thermoMachineCostPerHour = Number(
      pricing.thermoMachineCostPerHour || 0
    );
    const thermoLaborCostPerHour = Number(
      pricing.thermoLaborCostPerHour || 0
    );

    const packagingCostPer1000 = Number(pricing.packagingCostPer1000 || 0);
    const decorationCostPer1000 = Number(pricing.decorationCostPer1000 || 0);
    const transportCostPer1000 = Number(pricing.transportCostPer1000 || 0);
    const marginPct = Number(pricing.marginPct || 0);

    const materialCostPerHour = derived.netKgPerHour * materialPricePerKg;

    const extrusionConversionCostPerHour =
      extrusionMachineCostPerHour + extrusionLaborCostPerHour;

    const thermoConversionCostPerHour =
      thermoMachineCostPerHour + thermoLaborCostPerHour;

    const totalManufacturingCostPerHour =
      materialCostPerHour +
      extrusionConversionCostPerHour +
      thermoConversionCostPerHour;

    const manufacturingCostPer1000 =
      derived.pcsPerHour > 0
        ? (totalManufacturingCostPerHour / derived.pcsPerHour) * 1000
        : 0;

    const totalCostPer1000 =
      manufacturingCostPer1000 +
      packagingCostPer1000 +
      decorationCostPer1000 +
      transportCostPer1000;

    const sellingPricePer1000 = totalCostPer1000 * (1 + marginPct / 100);

    return {
      materialCostPerHour,
      extrusionConversionCostPerHour,
      thermoConversionCostPerHour,
      totalManufacturingCostPerHour,
      manufacturingCostPer1000,
      totalCostPer1000,
      sellingPricePer1000,
    };
  }, [derived, pricing]);

  if (!request || !engineeringData) {
    return <div className="p-6">Loading pricing data...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Pricing Review</h1>
            <p className="text-sm text-muted-foreground">{requestId}</p>
          </div>

          <Link
            to="/pricing"
            className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100"
          >
            ← Pricing Dashboard
          </Link>
        </div>

        <Section title="Project Reference">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ReadBox label="Customer" value={requestCustomer.customerName} />
            <ReadBox label="Project" value={requestproject.projectName} />
            <ReadBox label="Product" value={requestProduct.productType} />
            <ReadBox
              label="Material"
              value={requestProduct.sheetMaterial || requestProduct.productMaterial}
            />
          </div>
        </Section>

        <Section title="Engineering Inputs Pulled Automatically">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ReadBox label="Sheet Consumption" value={`${derived.kgPerHour} kg/hr`} />
            <ReadBox label="Waste" value={`${derived.wastePct}%`} />
            <ReadBox label="CPM" value={derived.cpm} />
            <ReadBox label="Cavities" value={derived.cavities} />
            <ReadBox label="Efficiency" value={`${derived.efficiencyPct}%`} />
            <ReadBox label="Productivity" value={`${derived.pcsPerHour.toFixed(0)} pcs/hr`} />
          </div>
        </Section>

        <Section title="Pricing Inputs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Material Price / kg"
              type="number"
              value={pricing.materialPricePerKg}
              onChange={(v) =>
                setPricing((prev) => ({ ...prev, materialPricePerKg: v }))
              }
            />

            <Input
              label="Extrusion Machine Cost / hr"
              type="number"
              value={pricing.extrusionMachineCostPerHour}
              onChange={(v) =>
                setPricing((prev) => ({
                  ...prev,
                  extrusionMachineCostPerHour: v,
                }))
              }
            />

            <Input
              label="Extrusion Labor Cost / hr"
              type="number"
              value={pricing.extrusionLaborCostPerHour}
              onChange={(v) =>
                setPricing((prev) => ({
                  ...prev,
                  extrusionLaborCostPerHour: v,
                }))
              }
            />

            <Input
              label="Thermo Machine Cost / hr"
              type="number"
              value={pricing.thermoMachineCostPerHour}
              onChange={(v) =>
                setPricing((prev) => ({
                  ...prev,
                  thermoMachineCostPerHour: v,
                }))
              }
            />

            <Input
              label="Thermo Labor Cost / hr"
              type="number"
              value={pricing.thermoLaborCostPerHour}
              onChange={(v) =>
                setPricing((prev) => ({
                  ...prev,
                  thermoLaborCostPerHour: v,
                }))
              }
            />

            <Input
              label="Packaging Cost / 1000 pcs"
              type="number"
              value={pricing.packagingCostPer1000}
              onChange={(v) =>
                setPricing((prev) => ({ ...prev, packagingCostPer1000: v }))
              }
            />

            <Input
              label="Decoration Cost / 1000 pcs"
              type="number"
              value={pricing.decorationCostPer1000}
              onChange={(v) =>
                setPricing((prev) => ({ ...prev, decorationCostPer1000: v }))
              }
            />

            <Input
              label="Transport Cost / 1000 pcs"
              type="number"
              value={pricing.transportCostPer1000}
              onChange={(v) =>
                setPricing((prev) => ({ ...prev, transportCostPer1000: v }))
              }
            />

            <Input
              label="Margin %"
              type="number"
              value={pricing.marginPct}
              onChange={(v) =>
                setPricing((prev) => ({ ...prev, marginPct: v }))
              }
            />
          </div>
        </Section>

        <Section title="Calculated Results">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            <ReadBox
              label="Material Cost / Hr"
              value={results.materialCostPerHour.toFixed(2)}
            />
            <ReadBox
              label="Extrusion Conversion / Hr"
              value={results.extrusionConversionCostPerHour.toFixed(2)}
            />
            <ReadBox
              label="Thermo Conversion / Hr"
              value={results.thermoConversionCostPerHour.toFixed(2)}
            />
            <ReadBox
              label="Manufacturing Cost / Hr"
              value={results.totalManufacturingCostPerHour.toFixed(2)}
            />
            <ReadBox
              label="Manufacturing Cost / 1000 pcs"
              value={results.manufacturingCostPer1000.toFixed(2)}
            />
            <ReadBox
              label="Total Cost / 1000 pcs"
              value={results.totalCostPer1000.toFixed(2)}
            />
            <ReadBox
              label="Selling Price / 1000 pcs"
              value={results.sellingPricePer1000.toFixed(2)}
            />
          </div>
        </Section>
      </div>
    </div>
  );
}