import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

const MATERIAL_DENSITY = {
  PET: 1.38,
  PP: 0.92,
  PS: 1.04,
};

function Section({ title, left, right }) {
  return (
    <div className="bg-white rounded-2xl shadow p-5 space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>{left}</div>
        <div>{right}</div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded-lg p-2 mt-1"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options = [] }) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded-lg p-2 mt-1 bg-white"
      >
        <option value="">Select</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function ReadBlock({ label, value }) {
  return (
    <div className="rounded-xl border bg-gray-50 p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium mt-1 break-words">{value || "—"}</div>
    </div>
  );
}

function MaterialMixEditor({ title, materials, onChange }) {
  const totalPct = materials.reduce((acc, item) => acc + Number(item.pct || 0), 0);

  const updateRow = (index, key, value) => {
    const copy = [...materials];
    copy[index] = { ...copy[index], [key]: value };
    onChange(copy);
  };

  const addRow = () => {
    onChange([...materials, { name: "", pct: 0 }]);
  };

  const removeRow = (index) => {
    const copy = materials.filter((_, i) => i !== index);
    onChange(copy.length ? copy : [{ name: "", pct: 0 }]);
  };

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{title}</h4>
        <div
          className={`text-sm font-medium ${
            totalPct === 100 ? "text-green-600" : "text-red-600"
          }`}
        >
          Total = {totalPct}%
        </div>
      </div>

      {materials.map((mat, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-7">
            <label className="text-xs text-gray-500">Material Name</label>
            <input
              value={mat.name}
              onChange={(e) => updateRow(i, "name", e.target.value)}
              className="w-full border rounded-lg p-2 mt-1"
            />
          </div>

          <div className="col-span-3">
            <label className="text-xs text-gray-500">%</label>
            <input
              type="number"
              value={mat.pct}
              onChange={(e) => updateRow(i, "pct", e.target.value)}
              className="w-full border rounded-lg p-2 mt-1"
            />
          </div>

          <div className="col-span-2">
            <button
              type="button"
              onClick={() => removeRow(i)}
              className="w-full rounded-lg border px-2 py-2 text-sm text-red-600"
            >
              Delete
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        className="text-sm text-blue-600 underline"
      >
        + Add Material
      </button>
    </div>
  );
}

function ToolListEditor({ title, tools, onChange }) {
  const updateRow = (index, key, value) => {
    const copy = [...tools];
    copy[index] = { ...copy[index], [key]: value };
    onChange(copy);
  };

  const addRow = () => {
    onChange([
      ...tools,
      {
        name: "",
        qty: 1,
        supplier: "",
        cost: "",
        currency: "USD",
        note: "",
      },
    ]);
  };

  const removeRow = (index) => {
    onChange(tools.filter((_, i) => i !== index));
  };

  const totalCost = tools.reduce(
    (acc, item) => acc + Number(item.cost || 0) * Number(item.qty || 1),
    0
  );

  return (
    <div className="rounded-xl border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{title}</h4>
        <div className="text-sm font-medium text-gray-600">
          Total = {totalCost.toFixed(2)}
        </div>
      </div>

      {tools.length === 0 ? (
        <div className="text-sm text-gray-500">No tools added.</div>
      ) : null}

      {tools.map((tool, i) => (
        <div key={i} className="rounded-xl border p-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <Input
              label="Tool Name"
              value={tool.name}
              onChange={(v) => updateRow(i, "name", v)}
            />
            <Input
              label="Qty"
              type="number"
              value={tool.qty}
              onChange={(v) => updateRow(i, "qty", v)}
            />
            <Input
              label="Supplier"
              value={tool.supplier}
              onChange={(v) => updateRow(i, "supplier", v)}
            />
            <Input
              label="Cost"
              type="number"
              value={tool.cost}
              onChange={(v) => updateRow(i, "cost", v)}
            />
            <SelectField
              label="Currency"
              value={tool.currency}
              onChange={(v) => updateRow(i, "currency", v)}
              options={["USD", "EUR", "EGP", "SAR"]}
            />
          </div>

          <Input
            label="Note"
            value={tool.note}
            onChange={(v) => updateRow(i, "note", v)}
          />

          <button
            type="button"
            onClick={() => removeRow(i)}
            className="text-sm text-red-600 underline"
          >
            Delete Tool
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        className="text-sm text-blue-600 underline"
      >
        + Add Tool
      </button>
    </div>
  );
}

export default function EngineeringReview() {
 const { requestId } = useParams();

const [payload, setPayload] = useState(null);
const [engineerName, setEngineerName] = useState("");
const [engineeringStatus, setEngineeringStatus] = useState("Under Engineering Review");
const [saveMessage, setSaveMessage] = useState("Not saved yet");

const [eng, setEng] = useState({
    material: {
      structure: "AB",
      layerAPct: 50,
      layerBPct: 50,
      layerA: [{ name: "", pct: 100 }],
      layerB: [{ name: "", pct: 100 }],
      coating: { name: "", gsm: 0 },
    },
    extrusion: {
      thickness: "",
      thicknessTolPlus: "",
      thicknessTolMinus: "",
      width: "",
      widthTolPlus: "",
      widthTolMinus: "",
      trim: "",
      trimTolPlus: "",
      realisticNet: "",
      waste: "",
    },
    sheetRollPackaging: {
      coreDiameter: "",
      coreType: "",
      rollDiameterM: "1.2",
      targetWeightKg: "",
      rollsPerPallet: "",
      palletType: "",
      separatorCount: "",
      strapLengthM: "",
      labelsPerRoll: "",
      foamWrappingM: "",
      stretchWrapKgPerPallet: "",
    },
    thermo: {
      machine: "",
      moldBase: "",
      moldBaseCode: "",
      insert: "",
      insertCode: "",
      moldBaseType: "Existing",
      insertType: "Existing",
      moldBaseInvestment: "",
      moldBaseInvestmentCurrency: "USD",
      insertInvestment: "",
      insertInvestmentCurrency: "USD",
      moldMakerNote: "",
      cpm: "",
      cavities: "",
      efficiency: "",
      sheetUtilizationPct: "",
      extraTools: [],
    },
    packaging: {
      confirmedPcsPerStack: "",
      confirmedStacksPerBag: "",
      confirmedBagsPerCarton: "",
      confirmedCartonType: "",
      confirmedCartonsPerPallet: "",
      confirmedPalletType: "",
      confirmedStretchWrapKgPerPallet: "",
      note: "",
    },
    decoration: {
      confirmedType: "",
      inkConsumptionGPer1000: "",
      productivityPcsPerMin: "",
      wastePct: "",
      tools: [],
      note: "",
    },
    transport: {
      deliveryLocation: "",
      qtyPerTruck: "",
      qtyUnit: "",
      note: "",
    },
  });

   useEffect(() => {
    const loadAll = async () => {
      const requestRes = await fetch(`/.netlify/functions/get-request?requestId=${requestId}`);
      const requestJson = await requestRes.json();
      setPayload(requestJson.payload || {});

      const engRes = await fetch(`/.netlify/functions/get-engineering-data?requestId=${requestId}`);
      const engJson = await engRes.json();

      if (engJson.success && engJson.engineeringData) {
        setEng(engJson.engineeringData || {});
        setEngineerName(engJson.engineerName || "");
        setEngineeringStatus(engJson.status || "Under Engineering Review");
      }
    };

    loadAll();
  }, [requestId]);

  const update = (path, value) => {
    setEng((prev) => {
      const copy = structuredClone(prev);
      const keys = path.split(".");
      let ref = copy;
      for (let i = 0; i < keys.length - 1; i += 1) {
        ref = ref[keys[i]];
      }
      ref[keys[keys.length - 1]] = value;
      return copy;
    });
  };

  useEffect(() => {
    const a = Number(eng.material.layerAPct || 0);
    const b = Math.max(0, 100 - a);
    if (Number(eng.material.layerBPct || 0) !== b) {
      update("material.layerBPct", b);
    }
  }, [eng.material.layerAPct]);

  const requestProduct = payload?.product || {};
  const requestPackaging = payload?.packaging || {};
  const requestDecoration = payload?.decoration || {};
  const requestDelivery = payload?.delivery || {};

  const materialType =
    requestProduct.sheetMaterial ||
    requestProduct.productMaterial ||
    "PET";

  const density = MATERIAL_DENSITY[materialType] || 1.0;

  const sheetWidth = Number(eng.extrusion.width || 0);
  const trim = Number(eng.extrusion.trim || 0);
  const totalWidthBeforeTrim = sheetWidth + trim * 2;

  const netFactor =
    totalWidthBeforeTrim > 0 ? 1 - (trim * 2) / totalWidthBeforeTrim : 0;

  const grossSpeedB =
    materialType === "PET" ? 800 : materialType === "PS" ? 700 : 600;

  const grossSpeedA =
    materialType === "PET" ? 200 : materialType === "PS" ? 150 : 120;

  const optimumNetSpeedB = grossSpeedB * netFactor;
  const optimumNetSpeedA = grossSpeedA * netFactor;

  const wastePct = Number(eng.extrusion.waste || 0);
  const rawInputPerTonNet =
    1 - wastePct / 100 > 0 ? 1000 / (1 - wastePct / 100) : 0;

  const coatingGsm = Number(eng.material.coating.gsm || 0);
  const thicknessMicron = Number(eng.extrusion.thickness || 0);

  const coatingWeightFraction =
    thicknessMicron > 0 && density > 0
      ? coatingGsm / (density * thicknessMicron)
      : 0;

  const coatingKgPerTonNet = rawInputPerTonNet * coatingWeightFraction;
  const polymerKgPerTonNet = Math.max(0, rawInputPerTonNet - coatingKgPerTonNet);

  const layerAPct = Number(eng.material.layerAPct || 0) / 100;
  const layerBPct = Number(eng.material.layerBPct || 0) / 100;

  const layerAKg = polymerKgPerTonNet * layerAPct;
  const layerBKg = polymerKgPerTonNet * layerBPct;

  const buildLayerConsumption = (materials, layerKg) => {
    return materials
      .filter((m) => m.name && Number(m.pct || 0) > 0)
      .map((m) => ({
        name: m.name,
        kg: layerKg * (Number(m.pct || 0) / 100),
      }));
  };

  const layerAConsumption = buildLayerConsumption(eng.material.layerA, layerAKg);
  const layerBConsumption = buildLayerConsumption(eng.material.layerB, layerBKg);

  const allConsumption = [...layerAConsumption, ...layerBConsumption];

  if (eng.material.coating.name && coatingKgPerTonNet > 0) {
    allConsumption.push({
      name: eng.material.coating.name,
      kg: coatingKgPerTonNet,
    });
  }

  const groupedConsumptionMap = {};
  for (const item of allConsumption) {
    groupedConsumptionMap[item.name] =
      (groupedConsumptionMap[item.name] || 0) + item.kg;
  }

  const groupedConsumption = Object.entries(groupedConsumptionMap).map(
    ([name, kg]) => ({
      name,
      kg,
      pct: rawInputPerTonNet > 0 ? (kg / rawInputPerTonNet) * 100 : 0,
    })
  );

  const realisticNetSpeed = Number(eng.extrusion.realisticNet || 0);
  const thermoPcsPerHour =
    Number(eng.thermo.cpm || 0) *
    Number(eng.thermo.cavities || 0) *
    (Number(eng.thermo.efficiency || 0) / 100) *
    60;

  const thermoPcsPerDay = thermoPcsPerHour * 24;

  const sheetUtilizationPct = Number(eng.thermo.sheetUtilizationPct || 0);
  const thermoSheetConsumptionKgPerHour =
    sheetUtilizationPct > 0 ? realisticNetSpeed / (sheetUtilizationPct / 100) : 0;
  const thermoSheetConsumptionKgPerDay = thermoSheetConsumptionKgPerHour * 24;

  const rollOuterDiameterM = Number(eng.sheetRollPackaging.rollDiameterM || 0);
  const rollCoreDiameterMm = Number(eng.sheetRollPackaging.coreDiameter || 0);
  const netWidthMm = Number(eng.extrusion.width || 0);
  const thicknessM = Number(eng.extrusion.thickness || 0) / 1000000;

  const targetRollWeightKg = useMemo(() => {
    if (
      !rollOuterDiameterM ||
      !rollCoreDiameterMm ||
      !netWidthMm ||
      !thicknessM ||
      !density
    ) {
      return 0;
    }

    const outerRadiusM = rollOuterDiameterM / 2;
    const coreRadiusM = (rollCoreDiameterMm / 1000) / 2;
    const widthM = netWidthMm / 1000;
    const densityKgM3 = density * 1000;

    const volume =
      Math.PI *
      (outerRadiusM * outerRadiusM - coreRadiusM * coreRadiusM) *
      widthM;

    return volume * densityKgM3;
  }, [rollOuterDiameterM, rollCoreDiameterMm, netWidthMm, thicknessM, density]);

  const thermoToolingTotal =
    (Number(eng.thermo.moldBaseInvestment || 0) || 0) +
    (Number(eng.thermo.insertInvestment || 0) || 0) +
    eng.thermo.extraTools.reduce(
      (acc, item) => acc + Number(item.cost || 0) * Number(item.qty || 1),
      0
    );

  const decorationToolingTotal = eng.decoration.tools.reduce(
    (acc, item) => acc + Number(item.cost || 0) * Number(item.qty || 1),
    0
  );
  const saveEngineering = async () => {
    try {
      const res = await fetch("/.netlify/functions/save-engineering-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          status: engineeringStatus,
          engineerName,
          engineeringData: eng,
          note: "",
        }),
      });

      const json = await res.json();

      if (json.success) {
        setSaveMessage(`Saved successfully at ${new Date().toLocaleTimeString()}`);
      } else {
        setSaveMessage("Save failed");
      }
    } catch (error) {
      console.error(error);
      setSaveMessage("Save failed");
    }
  };
  if (!payload) return <div className="p-6">Loading...</div>;

  return (
  <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
    <div className="bg-white rounded-2xl shadow p-5">
      <div className="text-sm text-gray-500">Engineering Review</div>
      <div className="text-2xl font-bold">{requestId}</div>
    </div>

    <div className="bg-white rounded-2xl shadow p-5 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          label="Engineer Name"
          value={engineerName}
          onChange={setEngineerName}
        />

        <SelectField
          label="Engineering Status"
          value={engineeringStatus}
          onChange={setEngineeringStatus}
          options={[
            "Under Engineering Review",
            "Clarification Required",
            "Engineering Completed",
          ]}
        />

        <div className="flex items-end">
          <button
            type="button"
            onClick={saveEngineering}
            className="w-full rounded-lg bg-black text-white px-4 py-2"
          >
            Save Engineering Data
          </button>
        </div>
      </div>

      <div className="text-sm text-green-700 font-medium">{saveMessage}</div>
    </div>

    <Section

      <Section
        title="1. Material to Produce Sheet Roll"
        left={
          <div className="space-y-3">
            <ReadBlock label="Requested Product Type" value={requestProduct.productType} />
            <ReadBlock
              label="Requested Material"
              value={requestProduct.sheetMaterial || requestProduct.productMaterial}
            />
            <ReadBlock
              label="Requested Color"
              value={requestProduct.productColor || requestProduct.layerAColor}
            />
            <ReadBlock
              label="Requested Thickness"
              value={requestProduct.sheetThicknessMicron}
            />
            <ReadBlock label="Requested Width" value={requestProduct.sheetWidthMm} />
          </div>
        }
        right={
          <div className="space-y-4">
            <div className="rounded-xl border p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Layer Structure (AB / ABA)"
                  value={eng.material.structure}
                  onChange={(v) => update("material.structure", v)}
                />
                <Input
                  label="Layer A %"
                  type="number"
                  value={eng.material.layerAPct}
                  onChange={(v) => update("material.layerAPct", v)}
                />
              </div>

              <div className="text-sm text-gray-600">
                Layer B % = <span className="font-semibold">{eng.material.layerBPct}%</span>
              </div>
            </div>

            <MaterialMixEditor
              title="Layer A Material Mix"
              materials={eng.material.layerA}
              onChange={(arr) => update("material.layerA", arr)}
            />

            <MaterialMixEditor
              title="Layer B Material Mix"
              materials={eng.material.layerB}
              onChange={(arr) => update("material.layerB", arr)}
            />

            <div className="rounded-xl border p-4 space-y-4">
              <h4 className="font-medium">Coating</h4>
              <Input
                label="Coating Material"
                value={eng.material.coating.name}
                onChange={(v) => update("material.coating.name", v)}
              />
              <Input
                label="Coating Density (g/m²)"
                type="number"
                value={eng.material.coating.gsm}
                onChange={(v) => update("material.coating.gsm", v)}
              />
            </div>
          </div>
        }
      />

      <Section
        title="2. Sheet Roll Extrusion Process Data"
        left={
          <div className="space-y-3">
            <ReadBlock label="Requested Width (mm)" value={requestProduct.sheetWidthMm} />
            <ReadBlock
              label="Requested Thickness (micron)"
              value={requestProduct.sheetThicknessMicron}
            />
            <ReadBlock
              label="Requested Material"
              value={requestProduct.sheetMaterial || requestProduct.productMaterial}
            />
          </div>
        }
        right={
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Sheet Thickness (micron)"
                type="number"
                value={eng.extrusion.thickness}
                onChange={(v) => update("extrusion.thickness", v)}
              />
              <Input
                label="Thickness Tol +"
                type="number"
                value={eng.extrusion.thicknessTolPlus}
                onChange={(v) => update("extrusion.thicknessTolPlus", v)}
              />
              <Input
                label="Thickness Tol -"
                type="number"
                value={eng.extrusion.thicknessTolMinus}
                onChange={(v) => update("extrusion.thicknessTolMinus", v)}
              />
              <Input
                label="Sheet Width (mm)"
                type="number"
                value={eng.extrusion.width}
                onChange={(v) => update("extrusion.width", v)}
              />
              <Input
                label="Width Tol + (mm)"
                type="number"
                value={eng.extrusion.widthTolPlus}
                onChange={(v) => update("extrusion.widthTolPlus", v)}
              />
              <Input
                label="Width Tol - (mm)"
                type="number"
                value={eng.extrusion.widthTolMinus}
                onChange={(v) => update("extrusion.widthTolMinus", v)}
              />
              <Input
                label="Edge Trim Width per Side (mm)"
                type="number"
                value={eng.extrusion.trim}
                onChange={(v) => update("extrusion.trim", v)}
              />
              <Input
                label="Trim Tol + (mm)"
                type="number"
                value={eng.extrusion.trimTolPlus}
                onChange={(v) => update("extrusion.trimTolPlus", v)}
              />
            </div>

            <div className="rounded-xl border bg-gray-50 p-4 space-y-2">
              <div>Gross Speed Extruder B: <span className="font-semibold">{grossSpeedB} kg/hr</span></div>
              <div>Gross Speed Extruder A: <span className="font-semibold">{grossSpeedA} kg/hr</span></div>
              <div>Net Factor: <span className="font-semibold">{(netFactor * 100).toFixed(2)}%</span></div>
              <div>Optimum Net Speed B: <span className="font-semibold">{optimumNetSpeedB.toFixed(2)} kg/hr</span></div>
              <div>Optimum Net Speed A: <span className="font-semibold">{optimumNetSpeedA.toFixed(2)} kg/hr</span></div>
            </div>

            <Input
              label="Realistic Net Speed (kg/hr)"
              type="number"
              value={eng.extrusion.realisticNet}
              onChange={(v) => update("extrusion.realisticNet", v)}
            />

            <Input
              label="Process Waste (%)"
              type="number"
              value={eng.extrusion.waste}
              onChange={(v) => update("extrusion.waste", v)}
            />

            <div className="rounded-xl border bg-white p-4">
              <h4 className="font-medium mb-3">Material Consumption Summary per Ton of Sheet</h4>

              <div className="text-sm mb-3">
                Raw input required per 1 ton net output:{" "}
                <span className="font-semibold">{rawInputPerTonNet.toFixed(2)} kg</span>
              </div>

              <div className="overflow-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Material</th>
                      <th className="text-left py-2">Kg / ton net sheet</th>
                      <th className="text-left py-2">% of total consumed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedConsumption.map((item) => (
                      <tr key={item.name} className="border-b">
                        <td className="py-2">{item.name}</td>
                        <td className="py-2">{item.kg.toFixed(2)}</td>
                        <td className="py-2">{item.pct.toFixed(2)}%</td>
                      </tr>
                    ))}
                    {groupedConsumption.length === 0 && (
                      <tr>
                        <td className="py-2 text-gray-500" colSpan={3}>
                          No material mix entered yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 text-xs text-gray-500">
                Coating is calculated on full sheet area before edge trim.
              </div>
            </div>
          </div>
        }
      />

      <Section
        title="3. Intermediate Sheet Roll / Final Sheet Roll Packaging"
        left={
          <div className="space-y-3">
            <ReadBlock label="Requested Product Type" value={requestProduct.productType} />
            <ReadBlock
              label="Requested Pallet Type"
              value={requestPackaging?.pallet?.palletType}
            />
            <ReadBlock
              label="Requested Rolls per Pallet"
              value={requestPackaging?.pallet?.rollsPerPallet}
            />
            <ReadBlock
              label="Requested Stretch Wrap kg / Pallet"
              value={requestPackaging?.pallet?.stretchWrapKgPerPallet}
            />
          </div>
        }
        right={
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Sheet Core Diameter (mm)"
                type="number"
                value={eng.sheetRollPackaging.coreDiameter}
                onChange={(v) => update("sheetRollPackaging.coreDiameter", v)}
              />
              <Input
                label="Sheet Core Type"
                value={eng.sheetRollPackaging.coreType}
                onChange={(v) => update("sheetRollPackaging.coreType", v)}
              />
              <Input
                label="Sheet Roll Diameter (m)"
                type="number"
                value={eng.sheetRollPackaging.rollDiameterM}
                onChange={(v) => update("sheetRollPackaging.rollDiameterM", v)}
              />
              <Input
                label="Target Weight (kg)"
                type="number"
                value={
                  eng.sheetRollPackaging.targetWeightKg || targetRollWeightKg.toFixed(2)
                }
                onChange={(v) => update("sheetRollPackaging.targetWeightKg", v)}
              />
              <Input
                label="Rolls per Pallet"
                type="number"
                value={eng.sheetRollPackaging.rollsPerPallet}
                onChange={(v) => update("sheetRollPackaging.rollsPerPallet", v)}
              />
              <Input
                label="Pallet Type"
                value={eng.sheetRollPackaging.palletType}
                onChange={(v) => update("sheetRollPackaging.palletType", v)}
              />
              <Input
                label="No. of Separators"
                type="number"
                value={eng.sheetRollPackaging.separatorCount}
                onChange={(v) => update("sheetRollPackaging.separatorCount", v)}
              />
              <Input
                label="Strap Length (m)"
                type="number"
                value={eng.sheetRollPackaging.strapLengthM}
                onChange={(v) => update("sheetRollPackaging.strapLengthM", v)}
              />
              <Input
                label="Labels per Roll"
                type="number"
                value={eng.sheetRollPackaging.labelsPerRoll}
                onChange={(v) => update("sheetRollPackaging.labelsPerRoll", v)}
              />
              <Input
                label="Foam Wrapping (m)"
                type="number"
                value={eng.sheetRollPackaging.foamWrappingM}
                onChange={(v) => update("sheetRollPackaging.foamWrappingM", v)}
              />
              <Input
                label="Stretch Wrap (kg / pallet)"
                type="number"
                value={eng.sheetRollPackaging.stretchWrapKgPerPallet}
                onChange={(v) =>
                  update("sheetRollPackaging.stretchWrapKgPerPallet", v)
                }
              />
            </div>

            <div className="rounded-xl border bg-gray-50 p-4 text-sm">
              Auto-calculated target roll weight ={" "}
              <span className="font-semibold">{targetRollWeightKg.toFixed(2)} kg</span>
            </div>
          </div>
        }
      />

      <Section
        title="4. Thermoforming Operation Data"
        left={
          <div className="space-y-3">
            <ReadBlock label="Requested Product Type" value={requestProduct.productType} />
            <ReadBlock label="Requested Pcs / Stack" value={requestPackaging?.primary?.pcsPerStack} />
            <ReadBlock label="Requested Bags / Carton" value={requestPackaging?.secondary?.bagsPerCarton} />
          </div>
        }
        right={
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Machine Name"
                value={eng.thermo.machine}
                onChange={(v) => update("thermo.machine", v)}
              />
              <Input
                label="Mold Base Used"
                value={eng.thermo.moldBase}
                onChange={(v) => update("thermo.moldBase", v)}
              />
              <Input
                label="Mold Base Code"
                value={eng.thermo.moldBaseCode}
                onChange={(v) => update("thermo.moldBaseCode", v)}
              />
              <SelectField
                label="Mold Base Status"
                value={eng.thermo.moldBaseType}
                onChange={(v) => update("thermo.moldBaseType", v)}
                options={["Existing", "New"]}
              />
              {eng.thermo.moldBaseType === "New" && (
                <>
                  <Input
                    label="Mold Base Investment"
                    type="number"
                    value={eng.thermo.moldBaseInvestment}
                    onChange={(v) => update("thermo.moldBaseInvestment", v)}
                  />
                  <SelectField
                    label="Mold Base Currency"
                    value={eng.thermo.moldBaseInvestmentCurrency}
                    onChange={(v) => update("thermo.moldBaseInvestmentCurrency", v)}
                    options={["USD", "EUR", "EGP", "SAR"]}
                  />
                </>
              )}

              <Input
                label="Insert Used"
                value={eng.thermo.insert}
                onChange={(v) => update("thermo.insert", v)}
              />
              <Input
                label="Insert Code"
                value={eng.thermo.insertCode}
                onChange={(v) => update("thermo.insertCode", v)}
              />
              <SelectField
                label="Insert Status"
                value={eng.thermo.insertType}
                onChange={(v) => update("thermo.insertType", v)}
                options={["Existing", "New"]}
              />
              {eng.thermo.insertType === "New" && (
                <>
                  <Input
                    label="Insert Investment"
                    type="number"
                    value={eng.thermo.insertInvestment}
                    onChange={(v) => update("thermo.insertInvestment", v)}
                  />
                  <SelectField
                    label="Insert Currency"
                    value={eng.thermo.insertInvestmentCurrency}
                    onChange={(v) => update("thermo.insertInvestmentCurrency", v)}
                    options={["USD", "EUR", "EGP", "SAR"]}
                  />
                </>
              )}
            </div>

            <Input
              label="Mold Maker / Supplier Note"
              value={eng.thermo.moldMakerNote}
              onChange={(v) => update("thermo.moldMakerNote", v)}
            />

            <ToolListEditor
              title="Additional Tools"
              tools={eng.thermo.extraTools}
              onChange={(arr) => update("thermo.extraTools", arr)}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="CPM"
                type="number"
                value={eng.thermo.cpm}
                onChange={(v) => update("thermo.cpm", v)}
              />
              <Input
                label="Number of Cavities"
                type="number"
                value={eng.thermo.cavities}
                onChange={(v) => update("thermo.cavities", v)}
              />
              <Input
                label="Efficiency (%)"
                type="number"
                value={eng.thermo.efficiency}
                onChange={(v) => update("thermo.efficiency", v)}
              />
              <Input
                label="Sheet Utilization (%)"
                type="number"
                value={eng.thermo.sheetUtilizationPct}
                onChange={(v) => update("thermo.sheetUtilizationPct", v)}
              />
            </div>

            <div className="rounded-xl border bg-gray-50 p-4 space-y-2 text-sm">
              <div>
                Productivity: <span className="font-semibold">{thermoPcsPerHour.toFixed(0)} pcs/hr</span>
              </div>
              <div>
                Productivity: <span className="font-semibold">{thermoPcsPerDay.toFixed(0)} pcs/day</span>
              </div>
              <div>
                Sheet Consumption: <span className="font-semibold">{thermoSheetConsumptionKgPerHour.toFixed(2)} kg/hr</span>
              </div>
              <div>
                Sheet Consumption: <span className="font-semibold">{thermoSheetConsumptionKgPerDay.toFixed(2)} kg/day</span>
              </div>
              <div>
                Total Thermo Tooling: <span className="font-semibold">{thermoToolingTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        }
      />

      <Section
        title="5. Decoration Operations Data"
        left={
          <div className="space-y-3">
            <ReadBlock
              label="Requested Decoration Type"
              value={requestDecoration?.decorationType}
            />
            <ReadBlock
              label="Requested Dry Offset Colors"
              value={requestDecoration?.dryOffset?.printColors}
            />
            <ReadBlock
              label="Requested Sleeve Material"
              value={requestDecoration?.shrinkSleeve?.sleeveMaterial}
            />
            <ReadBlock
              label="Requested Hybrid Family"
              value={requestDecoration?.hybridCup?.hybridCupFamily}
            />
            <ReadBlock
              label="Requested Label Material"
              value={requestDecoration?.label?.labelMaterial}
            />
          </div>
        }
        right={
          <div className="space-y-4">
            <Input
              label="Engineering Confirmed Decoration Type"
              value={eng.decoration.confirmedType}
              onChange={(v) => update("decoration.confirmedType", v)}
            />
            <Input
              label="Ink Consumption (g / 1000 cups)"
              type="number"
              value={eng.decoration.inkConsumptionGPer1000}
              onChange={(v) => update("decoration.inkConsumptionGPer1000", v)}
            />
            <Input
              label="Productivity (pcs / min)"
              type="number"
              value={eng.decoration.productivityPcsPerMin}
              onChange={(v) => update("decoration.productivityPcsPerMin", v)}
            />
            <Input
              label="Waste (%)"
              type="number"
              value={eng.decoration.wastePct}
              onChange={(v) => update("decoration.wastePct", v)}
            />

            <ToolListEditor
              title="Decoration Tools / Investments"
              tools={eng.decoration.tools}
              onChange={(arr) => update("decoration.tools", arr)}
            />

            <Input
              label="Engineering Decoration Note"
              value={eng.decoration.note}
              onChange={(v) => update("decoration.note", v)}
            />

            <div className="rounded-xl border bg-gray-50 p-4 text-sm">
              Total Decoration Tooling ={" "}
              <span className="font-semibold">{decorationToolingTotal.toFixed(2)}</span>
            </div>
          </div>
        }
      />

      <Section
        title="6. Packaging Details Confirmation"
        left={
          <div className="space-y-3">
            <ReadBlock label="Requested Pcs / Stack" value={requestPackaging?.primary?.pcsPerStack} />
            <ReadBlock label="Requested Stacks / Bag" value={requestPackaging?.primary?.stacksPerBag} />
            <ReadBlock label="Requested Bags / Carton" value={requestPackaging?.secondary?.bagsPerCarton} />
            <ReadBlock label="Requested Carton Type" value={requestPackaging?.secondary?.cartonType} />
            <ReadBlock label="Requested Cartons / Pallet" value={requestPackaging?.pallet?.cartonsPerPallet} />
            <ReadBlock label="Requested Pallet Type" value={requestPackaging?.pallet?.palletType} />
          </div>
        }
        right={
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Confirmed Pcs / Stack"
                value={eng.packaging.confirmedPcsPerStack}
                onChange={(v) => update("packaging.confirmedPcsPerStack", v)}
              />
              <Input
                label="Confirmed Stacks / Bag"
                value={eng.packaging.confirmedStacksPerBag}
                onChange={(v) => update("packaging.confirmedStacksPerBag", v)}
              />
              <Input
                label="Confirmed Bags / Carton"
                value={eng.packaging.confirmedBagsPerCarton}
                onChange={(v) => update("packaging.confirmedBagsPerCarton", v)}
              />
              <Input
                label="Confirmed Carton Type"
                value={eng.packaging.confirmedCartonType}
                onChange={(v) => update("packaging.confirmedCartonType", v)}
              />
              <Input
                label="Confirmed Cartons / Pallet"
                value={eng.packaging.confirmedCartonsPerPallet}
                onChange={(v) => update("packaging.confirmedCartonsPerPallet", v)}
              />
              <Input
                label="Confirmed Pallet Type"
                value={eng.packaging.confirmedPalletType}
                onChange={(v) => update("packaging.confirmedPalletType", v)}
              />
              <Input
                label="Confirmed Stretch Wrap (kg / pallet)"
                value={eng.packaging.confirmedStretchWrapKgPerPallet}
                onChange={(v) =>
                  update("packaging.confirmedStretchWrapKgPerPallet", v)
                }
              />
            </div>

            <Input
              label="Packaging Note"
              value={eng.packaging.note}
              onChange={(v) => update("packaging.note", v)}
            />
          </div>
        }
      />

      <Section
        title="7. Transportation"
        left={
          <div className="space-y-3">
            <ReadBlock
              label="Requested Delivery Location"
              value={requestDelivery?.deliveryLocationConfirm || payload?.customer?.deliveryLocation}
            />
            <ReadBlock
              label="Requested Qty / Truck"
              value={requestDelivery?.desiredQtyPerTruck}
            />
            <ReadBlock
              label="Requested Qty Unit"
              value={requestDelivery?.desiredQtyPerTruckUnit}
            />
          </div>
        }
        right={
          <div className="space-y-4">
            <Input
              label="Confirmed Delivery Location"
              value={eng.transport.deliveryLocation}
              onChange={(v) => update("transport.deliveryLocation", v)}
            />
            <Input
              label="Confirmed Qty / Truck"
              value={eng.transport.qtyPerTruck}
              onChange={(v) => update("transport.qtyPerTruck", v)}
            />
            <Input
              label="Confirmed Qty Unit"
              value={eng.transport.qtyUnit}
              onChange={(v) => update("transport.qtyUnit", v)}
            />
            <Input
              label="Transportation Note"
              value={eng.transport.note}
              onChange={(v) => update("transport.note", v)}
            />
          </div>
        }
      />
    </div>
  );
}