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
  const [engineeringRaw, setEngineeringRaw] = useState(null);

  const [pricing, setPricing] = useState({
    materialPricePerKg: "",
    extrusionMachineCostPerHour: "",
    extrusionLaborCostPerHour: "",
    thermoMachineCostPerHour: "",
    thermoLaborCostPerHour: "",
    packagingCostPer1000: "",
    transportCostPer1000: "",
    decorationCostPer1000: "",
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
          setEngineeringRaw(engJson.engineeringData || {});
        }
      } catch (error) {
        console.error("Failed to load pricing data:", error);
      }
    };

    load();
  }, [requestId]);

  const requestProduct = request?.product || {};
  const requestPackaging = request?.packaging || {};
  const requestDecoration = request?.decoration || {};
  const engineering = engineeringRaw || {};

  const materialConsumptionPerTon = useMemo(() => {
    const material = engineering.material || {};
    const extrusion = engineering.extrusion || {};

    const wastePct = Number(extrusion.waste || 0);
    const rawInputPerTonNet =
      1 - wastePct / 100 > 0 ? 1000 / (1 - wastePct / 100) : 0;

    return {
      wastePct,
      rawInputPerTonNet,
    };
  }, [engineering]);

  const thermoStats = useMemo(() => {
    const thermo = engineering.thermo || {};

    const cpm = Number(thermo.cpm || 0);
    const cavities = Number(thermo.cavities || 0);
    const efficiency = Number(thermo.efficiency || 0) / 100;
    const sheetUtilizationPct = Number(thermo.sheetUtilizationPct || 0);

    const pcsPerHour = cpm * cavities * efficiency * 60;
    const pcsPerDay = pcsPerHour * 24;

    const realisticNetKgPerHour = Number(engineering.extrusion?.realisticNet || 0);

    const sheetConsumptionKgPerHour =
      sheetUtilizationPct > 0
        ? realisticNetKgPerHour / (sheetUtilizationPct / 100)
        : 0;

    const sheetConsumptionKgPerDay = sheetConsumptionKgPerHour * 24;

    return {
      pcsPerHour,
      pcsPerDay,
      sheetConsumptionKgPerHour,
      sheetConsumptionKgPerDay,
      sheetUtilizationPct,
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
    const transportCostPer1000 = Number(pricing.transportCostPer1000 || 0);
    const decorationCostPer1000 = Number(pricing.decorationCostPer1000 || 0);
    const marginPct = Number(pricing.marginPct || 0);

    const rawInputPerTonNet = materialConsumptionPerTon.rawInputPerTonNet;
    const materialCostPerTonNet = rawInputPerTonNet * materialPricePerKg;
    const materialCostPerKgNet =
      rawInputPerTonNet > 0 ? materialCostPerTonNet / 1000 : 0;

    const extrusionConversionCostPerHour =
      extrusionMachineCostPerHour + extrusionLaborCostPerHour;

    const extrusionRealisticNetKgPerHour = Number(
      engineering.extrusion?.realisticNet || 0
    );

    const extrusionConversionCostPerKg =
      extrusionRealisticNetKgPerHour > 0
        ? extrusionConversionCostPerHour / extrusionRealisticNetKgPerHour
        : 0;

    const totalSheetCostPerKg =
      materialCostPerKgNet + extrusionConversionCostPerKg;

    const thermoConversionCostPerHour =
      thermoMachineCostPerHour + thermoLaborCostPerHour;

    const pcsPerHour = thermoStats.pcsPerHour;
    const sheetConsumptionKgPerHour = thermoStats.sheetConsumptionKgPerHour;

    const thermoMaterialCostPerHour =
      sheetConsumptionKgPerHour * totalSheetCostPerKg;

    const totalThermoCostPerHour =
      thermoMaterialCostPerHour + thermoConversionCostPerHour;

    const manufacturingCostPer1000 =
      pcsPerHour > 0 ? (totalThermoCostPerHour / pcsPerHour) * 1000 : 0;

    const totalCostPer1000 =
      manufacturingCostPer1000 +
      packagingCostPer1000 +
      transportCostPer1000 +
      decorationCostPer1000;

    const sellingPricePer1000 = totalCostPer1000 * (1 + marginPct / 100);

    return {
      materialCostPerTonNet,
      materialCostPerKgNet,
      extrusionConversionCostPerHour,
      extrusionConversionCostPerKg,
      totalSheetCostPerKg,
      thermoConversionCostPerHour,
      thermoMaterialCostPerHour,
      totalThermoCostPerHour,
      manufacturingCostPer1000,
      totalCostPer1000,
      sellingPricePer1000,
    };
  }, [pricing, engineering, materialConsumptionPerTon, thermoStats]);

  if (!request || !engineeringRaw) {
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
            <ReadBox label="Customer" value={request?.customer?.customerName} />
            <ReadBox label="Project" value={request?.customer?.projectName} />
            <ReadBox label="Product Type" value={requestProduct.productType} />
            <ReadBox
              label="Decoration"
              value={requestDecoration.decorationType}
            />
            <ReadBox
              label="Requested Material"
              value={requestProduct.sheetMaterial || requestProduct.productMaterial}
            />
            <ReadBox
              label="Requested Packaging"
              value={
                requestPackaging?.secondary?.cartonType ||
                requestPackaging?.pallet?.palletType
              }
            />
          </div>
        </Section>

        <Section title="Engineering Reference Data">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ReadBox
              label="Extrusion Realistic Net Speed"
              value={`${engineering?.extrusion?.realisticNet || 0} kg/hr`}
            />
            <ReadBox
              label="Extrusion Waste"
              value={`${engineering?.extrusion?.waste || 0}%`}
            />
            <ReadBox
              label="Thermo Productivity"
              value={`${thermoStats.pcsPerHour.toFixed(0)} pcs/hr`}
            />
            <ReadBox
              label="Sheet Consumption"
              value={`${thermoStats.sheetConsumptionKgPerHour.toFixed(2)} kg/hr`}
            />
            <ReadBox
              label="Sheet Utilization"
              value={`${thermoStats.sheetUtilizationPct || 0}%`}
            />
            <ReadBox
              label="Material Input / Ton Net"
              value={`${materialConsumptionPerTon.rawInputPerTonNet.toFixed(2)} kg`}
            />
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
              label="Decoration Cost / 1000 pcs"
              type="number"
              value={pricing.decorationCostPer1000}
              onChange={(v) =>
                setPricing((prev) => ({ ...prev, decorationCostPer1000: v }))
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

        <Section title="Pricing Results">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            <ReadBox
              label="Material Cost / Ton Net Sheet"
              value={results.materialCostPerTonNet.toFixed(2)}
            />
            <ReadBox
              label="Material Cost / Kg Net Sheet"
              value={results.materialCostPerKgNet.toFixed(4)}
            />
            <ReadBox
              label="Extrusion Conversion / Hr"
              value={results.extrusionConversionCostPerHour.toFixed(2)}
            />
            <ReadBox
              label="Extrusion Conversion / Kg"
              value={results.extrusionConversionCostPerKg.toFixed(4)}
            />
            <ReadBox
              label="Total Sheet Cost / Kg"
              value={results.totalSheetCostPerKg.toFixed(4)}
            />
            <ReadBox
              label="Thermo Conversion / Hr"
              value={results.thermoConversionCostPerHour.toFixed(2)}
            />
            <ReadBox
              label="Thermo Material Cost / Hr"
              value={results.thermoMaterialCostPerHour.toFixed(2)}
            />
            <ReadBox
              label="Total Thermo Cost / Hr"
              value={results.totalThermoCostPerHour.toFixed(2)}
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