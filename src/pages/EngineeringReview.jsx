import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

function Section({ title, left, right }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
      <h2 className="font-semibold text-lg">{title}</h2>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-gray-50 border rounded-xl p-4 space-y-3">
          <div className="text-xs uppercase tracking-wide text-gray-500">
            Request Data
          </div>
          {left}
        </div>
        <div className="space-y-3">{right}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      {children}
    </label>
  );
}

function Input({ value, onChange, placeholder = "", type = "text" }) {
  return (
    <input
      type={type}
      className="w-full border rounded-lg p-2"
      value={value || ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function TextArea({ value, onChange, rows = 3, placeholder = "" }) {
  return (
    <textarea
      className="w-full border rounded-lg p-2"
      rows={rows}
      value={value || ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function SelectField({ value, onChange, options = [] }) {
  return (
    <select
      className="w-full border rounded-lg p-2"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium break-words">{value || "—"}</div>
    </div>
  );
}

function RefRow({ label, value }) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium break-words">{value || "—"}</div>
    </div>
  );
}

function MaterialMixEditor({ title, rows = [], onChange }) {
  const updateRow = (id, patch) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    onChange([
      ...rows,
      {
        id: `${Date.now()}-${Math.random()}`,
        name: "",
        pct: "",
      },
    ]);
  };

  const deleteRow = (id) => {
    onChange(rows.filter((r) => r.id !== id));
  };

  const totalPct = rows.reduce((s, r) => s + (parseFloat(r.pct) || 0), 0);

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="font-medium">{title}</div>
        <div className={`text-sm ${Math.abs(totalPct - 100) < 0.01 ? "text-green-600" : "text-red-600"}`}>
          Total: {totalPct.toFixed(2)}%
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-7">
              <Field label="Material Name">
                <Input
                  value={row.name}
                  onChange={(v) => updateRow(row.id, { name: v })}
                  placeholder="e.g. PET virgin, HIPS, GPPS"
                />
              </Field>
            </div>
            <div className="col-span-4">
              <Field label="%">
                <Input
                  value={row.pct}
                  onChange={(v) => updateRow(row.id, { pct: v })}
                  placeholder="0"
                />
              </Field>
            </div>
            <div className="col-span-1">
              <button
                type="button"
                onClick={() => deleteRow(row.id)}
                className="w-full h-10 rounded-lg border hover:bg-red-50"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
      >
        + Add material
      </button>
    </div>
  );
}

function ToolingEditor({ rows = [], onChange }) {
  const updateRow = (id, patch) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    onChange([
      ...rows,
      {
        id: `${Date.now()}-${Math.random()}`,
        type: "",
        description: "",
        supplier: "",
        status: "New",
        note: "",
      },
    ]);
  };

  const deleteRow = (id) => {
    onChange(rows.filter((r) => r.id !== id));
  };

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div className="font-medium">Tooling / Investment Items</div>

      {rows.length === 0 && (
        <div className="text-sm text-gray-500">No tooling items added yet.</div>
      )}

      {rows.map((row) => (
        <div key={row.id} className="rounded-xl border p-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Field label="Item Type">
              <SelectField
                value={row.type}
                onChange={(v) => updateRow(row.id, { type: v })}
                options={[
                  "Mold Base",
                  "Insert",
                  "Plug",
                  "Cutting Plate",
                  "Bottom Engraving",
                  "Printing Tool",
                  "Shrink Sleeve Tool",
                  "Hybrid Tool",
                  "Other",
                ]}
              />
            </Field>

            <Field label="Supplier / Mold Maker">
              <Input
                value={row.supplier}
                onChange={(v) => updateRow(row.id, { supplier: v })}
              />
            </Field>

            <Field label="New / Existing">
              <SelectField
                value={row.status}
                onChange={(v) => updateRow(row.id, { status: v })}
                options={["New", "Existing"]}
              />
            </Field>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => deleteRow(row.id)}
                className="w-full rounded-lg border px-3 py-2 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>

          <Field label="Description">
            <Input
              value={row.description}
              onChange={(v) => updateRow(row.id, { description: v })}
            />
          </Field>

          <Field label="Engineering Note">
            <TextArea
              value={row.note}
              onChange={(v) => updateRow(row.id, { note: v })}
              rows={2}
            />
          </Field>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
      >
        + Add tooling item
      </button>
    </div>
  );
}

export default function EngineeringReview() {
  const { requestId } = useParams();

  const [payload, setPayload] = useState(null);
  const [engineering, setEngineering] = useState({
    materialSheet: {
      baseMaterial: "",
      density: "",
      structure: "AB",
      layerAPct: "",
      layerA: [],
      layerB: [],
      coatingUsed: "No",
      coatingName: "",
      coatingWeight_g_m2: "",
      processWastePct: "",
      reuseNote: "",
    },
    sheetSpecs: {
      netWidth_mm: "",
      grossWidth_mm: "",
      thickness_mic: "",
      thicknessTolPlus: "",
      thicknessTolMinus: "",
      edgeTrimPerSide_mm: "",
      widthTolPlus_mm: "",
      widthTolMinus_mm: "",
      rollDiameter_mm: "",
      coreDiameter_mm: "",
      coreType: "",
      rollTargetWeight_kg: "",
      labelsPerRoll: "",
    },
    extrusion: {
      lineName: "",
      grossSpeed_kg_hr: "",
      netSpeed_kg_hr: "",
      lineSpeed_m_min: "",
      tonsPerDay: "",
      hoursPerDay: "",
      shiftPattern: "",
      startupWastePct: "",
      changeoverWastePct: "",
      scrapWastePct: "",
      notes: "",
    },
    thermo: {
      applicable: "Yes",
      machineName: "",
      moldBaseName: "",
      moldBaseCode: "",
      insertName: "",
      insertCode: "",
      cavities: "",
      cpm: "",
      efficiencyPct: "",
      sheetUtilizationPct: "",
      unitWeight_g: "",
      pcsPerStack: "",
      specialNotes: "",
    },
    decoration: {
      type: "",
      productivity_pcs_min: "",
      wastePct: "",
      dryOffset: {
        ink_g_per_1000: "",
        toolingNote: "",
      },
      shrink: {
        sleeveMaterial: "",
        thickness_mic: "",
        layflat_mm: "",
        height_mm: "",
        supplierNote: "",
      },
      hybrid: {
        blankSpec: "",
        bottomSpec: "",
        glue_g_per_1000: "",
        note: "",
      },
      label: {
        labelSpec: "",
        note: "",
      },
    },
    packaging: {
      usePallet: "Yes",
      pcsPerStack: "",
      primaryName: "",
      stacksPerPrimary: "",
      primariesPerSecondary: "",
      secondaryName: "",
      labelsPerSecondary: "",
      secondariesPerPallet: "",
      labelsPerPallet: "",
      stretchKgPerPallet: "",
      palletType: "",
      note: "",
    },
    freight: {
      deliveryMode: "",
      freightBasis: "",
      palletsPerTruck: "",
      kgPerTruck: "",
      pcsPerTruck: "",
      notes: "",
    },
    tooling: [],
  });
  const [engineerName, setEngineerName] = useState("");
  const [engineeringStatus, setEngineeringStatus] = useState(
    "Under Engineering Review"
  );
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const r1 = await fetch(
          `/.netlify/functions/get-request?requestId=${requestId}`
        );
        const j1 = await r1.json();

        if (j1.success) {
          setPayload(j1.payload);
        }

        const r2 = await fetch(
          `/.netlify/functions/get-engineering-data?requestId=${requestId}`
        );
        const j2 = await r2.json();

        if (j2.success && j2.engineeringData) {
          setEngineering((prev) => ({
            ...prev,
            ...j2.engineeringData,
          }));
          setEngineerName(j2.engineerName || "");
          setEngineeringStatus(j2.status || "Under Engineering Review");
        }
      } catch (err) {
        console.error(err);
      }
    };

    load();
  }, [requestId]);

  const updateSection = (section, patch) => {
    setEngineering((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...patch,
      },
    }));
  };

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
          engineeringData: engineering,
        }),
      });

      const json = await res.json();

      if (json.success) {
        setSaveMessage("Saved successfully");
      } else {
        alert("Failed to save");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving");
    }
  };

  const sendToPricing = async () => {
    try {
      const saveRes = await fetch("/.netlify/functions/save-engineering-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          status: "Engineering Completed",
          engineerName,
          engineeringData: engineering,
        }),
      });

      const saveJson = await saveRes.json();
      if (!saveJson.success) {
        alert("Failed to save engineering data");
        return;
      }

      const updatedPayload = {
        ...payload,
        metadata: {
          ...payload.metadata,
          status: "Engineering Completed",
        },
      };

      const reqRes = await fetch("/.netlify/functions/save-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedPayload),
      });

      const reqJson = await reqRes.json();

      if (!reqJson.success) {
        alert("Engineering saved, but failed to update request status");
        return;
      }

      alert("Sent to Pricing");
      window.location.href = `/pricing/${requestId}`;
    } catch (err) {
      console.error(err);
      alert("Error sending to pricing");
    }
  };

  const derived = useMemo(() => {
    const cpm = parseFloat(engineering.thermo?.cpm) || 0;
    const cavities = parseFloat(engineering.thermo?.cavities) || 0;
    const efficiencyPct = parseFloat(engineering.thermo?.efficiencyPct) || 0;
    const pcsPerHour = cpm * cavities * (efficiencyPct / 100) * 60;
    const pcsPerDay = pcsPerHour * 24;

    const gross = parseFloat(engineering.extrusion?.grossSpeed_kg_hr) || 0;
    const net = parseFloat(engineering.extrusion?.netSpeed_kg_hr) || 0;
    const extrusionYieldPct = gross > 0 ? (net / gross) * 100 : 0;

    return {
      pcsPerHour,
      pcsPerDay,
      extrusionYieldPct,
    };
  }, [engineering]);

  if (!payload) return <div className="p-6">Loading...</div>;

  const customer = payload.customer || {};
  const product = payload.product || {};
  const decorationReq = payload.decoration || {};
  const packagingReq = payload.packaging || {};
  const deliveryReq = payload.delivery || {};

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <div className="text-sm text-gray-500">Engineering Review</div>
          <div className="text-xl font-bold">{requestId}</div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/engineering-dashboard"
            className="border px-4 py-2 rounded-lg text-sm bg-white"
          >
            ← Back
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Field label="Engineer Name">
            <Input value={engineerName} onChange={setEngineerName} />
          </Field>

          <Field label="Status">
            <SelectField
              value={engineeringStatus}
              onChange={setEngineeringStatus}
              options={[
                "Under Engineering Review",
                "Clarification Required",
                "Engineering Completed",
              ]}
            />
          </Field>

          <div className="flex items-end">
            <button
              onClick={saveEngineering}
              className="bg-black text-white rounded-lg px-4 py-2 w-full"
            >
              Save
            </button>
          </div>

          <div className="flex items-end">
            <button
              onClick={sendToPricing}
              className="bg-green-600 text-white rounded-lg px-4 py-2 w-full"
            >
              Send to Pricing
            </button>
          </div>
        </div>

        <div className="text-sm text-green-600">{saveMessage}</div>
      </div>

      <Section
        title="1. Material Structure & Sheet Roll"
        left={
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <RefRow label="Requested Material" value={product.sheetMaterial || product.productMaterial} />
            <RefRow label="Sheet Roll Request" value={product.productType === "Sheet Roll" ? "Yes" : "No"} />
            <RefRow label="Requested Width (mm)" value={product.sheetWidthMm} />
            <RefRow label="Requested Thickness (mic)" value={product.sheetThicknessMicrons} />
            <RefRow label="Layer Colors" value={product.sheetLayerColors} />
            <RefRow label="Layer A Color" value={product.layerAColor} />
            <RefRow label="Layer B Color" value={product.layerBColor} />
          </div>
        }
        right={
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Base Material">
                <SelectField
                  value={engineering.materialSheet.baseMaterial}
                  onChange={(v) => updateSection("materialSheet", { baseMaterial: v })}
                  options={["PET", "PP", "PS", "Other"]}
                />
              </Field>

              <Field label="Density (g/cm³)">
                <Input
                  value={engineering.materialSheet.density}
                  onChange={(v) => updateSection("materialSheet", { density: v })}
                />
              </Field>

              <Field label="Structure">
                <SelectField
                  value={engineering.materialSheet.structure}
                  onChange={(v) => updateSection("materialSheet", { structure: v })}
                  options={["Mono", "AB", "ABA"]}
                />
              </Field>

              <Field label="Layer A %">
                <Input
                  value={engineering.materialSheet.layerAPct}
                  onChange={(v) => updateSection("materialSheet", { layerAPct: v })}
                />
              </Field>

              <Field label="Coating Used">
                <SelectField
                  value={engineering.materialSheet.coatingUsed}
                  onChange={(v) => updateSection("materialSheet", { coatingUsed: v })}
                  options={["Yes", "No"]}
                />
              </Field>

              <Field label="Process Waste %">
                <Input
                  value={engineering.materialSheet.processWastePct}
                  onChange={(v) => updateSection("materialSheet", { processWastePct: v })}
                />
              </Field>
            </div>

            {engineering.materialSheet.coatingUsed === "Yes" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Coating Name">
                  <Input
                    value={engineering.materialSheet.coatingName}
                    onChange={(v) => updateSection("materialSheet", { coatingName: v })}
                  />
                </Field>

                <Field label="Coating Weight (g/m²)">
                  <Input
                    value={engineering.materialSheet.coatingWeight_g_m2}
                    onChange={(v) =>
                      updateSection("materialSheet", { coatingWeight_g_m2: v })
                    }
                  />
                </Field>
              </div>
            )}

            <MaterialMixEditor
              title="Layer A Material Mix"
              rows={engineering.materialSheet.layerA || []}
              onChange={(rows) => updateSection("materialSheet", { layerA: rows })}
            />

            <MaterialMixEditor
              title="Layer B Material Mix"
              rows={engineering.materialSheet.layerB || []}
              onChange={(rows) => updateSection("materialSheet", { layerB: rows })}
            />

            <Field label="Reuse / Regrind Note">
              <TextArea
                value={engineering.materialSheet.reuseNote}
                onChange={(v) => updateSection("materialSheet", { reuseNote: v })}
              />
            </Field>
          </div>
        }
      />

      <Section
        title="2. Sheet Specifications"
        left={
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <RefRow label="Requested Width (mm)" value={product.sheetWidthMm} />
            <RefRow label="Requested Thickness (mic)" value={product.sheetThicknessMicrons} />
            <RefRow label="Width Tol + (mm)" value={product.sheetWidthTolerancePlus} />
            <RefRow label="Width Tol - (mm)" value={product.sheetWidthToleranceMinus} />
            <RefRow label="Thickness Tol + (mic)" value={product.sheetThicknessTolerancePlus} />
            <RefRow label="Thickness Tol - (mic)" value={product.sheetThicknessToleranceMinus} />
            <RefRow label="Roll Weight (kg)" value={product.rollWeightKg} />
            <RefRow label="Roll Diameter (mm)" value={product.rollDiameterMm} />
            <RefRow label="Core Diameter" value={product.coreDiameter} />
            <RefRow label="Core Material" value={product.coreMaterial} />
          </div>
        }
        right={
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Field label="Net Width (mm)">
              <Input
                value={engineering.sheetSpecs.netWidth_mm}
                onChange={(v) => updateSection("sheetSpecs", { netWidth_mm: v })}
              />
            </Field>
            <Field label="Gross Width (mm)">
              <Input
                value={engineering.sheetSpecs.grossWidth_mm}
                onChange={(v) => updateSection("sheetSpecs", { grossWidth_mm: v })}
              />
            </Field>
            <Field label="Thickness (mic)">
              <Input
                value={engineering.sheetSpecs.thickness_mic}
                onChange={(v) => updateSection("sheetSpecs", { thickness_mic: v })}
              />
            </Field>
            <Field label="Edge Trim / Side (mm)">
              <Input
                value={engineering.sheetSpecs.edgeTrimPerSide_mm}
                onChange={(v) =>
                  updateSection("sheetSpecs", { edgeTrimPerSide_mm: v })
                }
              />
            </Field>

            <Field label="Thickness Tol +">
              <Input
                value={engineering.sheetSpecs.thicknessTolPlus}
                onChange={(v) =>
                  updateSection("sheetSpecs", { thicknessTolPlus: v })
                }
              />
            </Field>
            <Field label="Thickness Tol -">
              <Input
                value={engineering.sheetSpecs.thicknessTolMinus}
                onChange={(v) =>
                  updateSection("sheetSpecs", { thicknessTolMinus: v })
                }
              />
            </Field>
            <Field label="Width Tol + (mm)">
              <Input
                value={engineering.sheetSpecs.widthTolPlus_mm}
                onChange={(v) =>
                  updateSection("sheetSpecs", { widthTolPlus_mm: v })
                }
              />
            </Field>
            <Field label="Width Tol - (mm)">
              <Input
                value={engineering.sheetSpecs.widthTolMinus_mm}
                onChange={(v) =>
                  updateSection("sheetSpecs", { widthTolMinus_mm: v })
                }
              />
            </Field>

            <Field label="Roll Diameter (mm)">
              <Input
                value={engineering.sheetSpecs.rollDiameter_mm}
                onChange={(v) =>
                  updateSection("sheetSpecs", { rollDiameter_mm: v })
                }
              />
            </Field>
            <Field label="Core Diameter (mm)">
              <Input
                value={engineering.sheetSpecs.coreDiameter_mm}
                onChange={(v) =>
                  updateSection("sheetSpecs", { coreDiameter_mm: v })
                }
              />
            </Field>
            <Field label="Core Type">
              <Input
                value={engineering.sheetSpecs.coreType}
                onChange={(v) => updateSection("sheetSpecs", { coreType: v })}
              />
            </Field>
            <Field label="Roll Target Weight (kg)">
              <Input
                value={engineering.sheetSpecs.rollTargetWeight_kg}
                onChange={(v) =>
                  updateSection("sheetSpecs", { rollTargetWeight_kg: v })
                }
              />
            </Field>

            <Field label="Labels per Roll">
              <Input
                value={engineering.sheetSpecs.labelsPerRoll}
                onChange={(v) => updateSection("sheetSpecs", { labelsPerRoll: v })}
              />
            </Field>
          </div>
        }
      />

      <Section
        title="3. Extrusion Process Data"
        left={
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <RefRow label="Material" value={product.sheetMaterial || product.productMaterial} />
            <RefRow label="Target Width (mm)" value={product.sheetWidthMm} />
            <RefRow label="Target Thickness (mic)" value={product.sheetThicknessMicrons} />
          </div>
        }
        right={
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Field label="Line Name">
                <Input
                  value={engineering.extrusion.lineName}
                  onChange={(v) => updateSection("extrusion", { lineName: v })}
                />
              </Field>
              <Field label="Gross Speed (kg/hr)">
                <Input
                  value={engineering.extrusion.grossSpeed_kg_hr}
                  onChange={(v) =>
                    updateSection("extrusion", { grossSpeed_kg_hr: v })
                  }
                />
              </Field>
              <Field label="Net Speed (kg/hr)">
                <Input
                  value={engineering.extrusion.netSpeed_kg_hr}
                  onChange={(v) =>
                    updateSection("extrusion", { netSpeed_kg_hr: v })
                  }
                />
              </Field>
              <Field label="Line Speed (m/min)">
                <Input
                  value={engineering.extrusion.lineSpeed_m_min}
                  onChange={(v) =>
                    updateSection("extrusion", { lineSpeed_m_min: v })
                  }
                />
              </Field>

              <Field label="Tons / Day">
                <Input
                  value={engineering.extrusion.tonsPerDay}
                  onChange={(v) => updateSection("extrusion", { tonsPerDay: v })}
                />
              </Field>
              <Field label="Hours / Day">
                <Input
                  value={engineering.extrusion.hoursPerDay}
                  onChange={(v) =>
                    updateSection("extrusion", { hoursPerDay: v })
                  }
                />
              </Field>
              <Field label="Shift Pattern">
                <Input
                  value={engineering.extrusion.shiftPattern}
                  onChange={(v) =>
                    updateSection("extrusion", { shiftPattern: v })
                  }
                />
              </Field>
              <InfoBox
                label="Yield %"
                value={
                  engineering.extrusion.grossSpeed_kg_hr &&
                  engineering.extrusion.netSpeed_kg_hr
                    ? `${derived.extrusionYieldPct.toFixed(2)}%`
                    : "—"
                }
              />

              <Field label="Startup Waste %">
                <Input
                  value={engineering.extrusion.startupWastePct}
                  onChange={(v) =>
                    updateSection("extrusion", { startupWastePct: v })
                  }
                />
              </Field>
              <Field label="Changeover Waste %">
                <Input
                  value={engineering.extrusion.changeoverWastePct}
                  onChange={(v) =>
                    updateSection("extrusion", { changeoverWastePct: v })
                  }
                />
              </Field>
              <Field label="Scrap Waste %">
                <Input
                  value={engineering.extrusion.scrapWastePct}
                  onChange={(v) =>
                    updateSection("extrusion", { scrapWastePct: v })
                  }
                />
              </Field>
            </div>

            <Field label="Extrusion Notes">
              <TextArea
                value={engineering.extrusion.notes}
                onChange={(v) => updateSection("extrusion", { notes: v })}
              />
            </Field>
          </div>
        }
      />

      <Section
        title="4. Thermoforming Data"
        left={
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <RefRow label="Product Type" value={product.productType} />
            <RefRow label="Unit Weight Request (g)" value={product.productWeightG} />
            <RefRow label="Packaging Request / Stack" value={packagingReq?.primary?.pcsPerStack} />
            <RefRow label="Decoration Type" value={decorationReq?.decorationType} />
          </div>
        }
        right={
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Field label="Applicable">
                <SelectField
                  value={engineering.thermo.applicable}
                  onChange={(v) => updateSection("thermo", { applicable: v })}
                  options={["Yes", "No"]}
                />
              </Field>
              <Field label="Machine Name">
                <Input
                  value={engineering.thermo.machineName}
                  onChange={(v) => updateSection("thermo", { machineName: v })}
                />
              </Field>
              <Field label="Mold Base Name">
                <Input
                  value={engineering.thermo.moldBaseName}
                  onChange={(v) =>
                    updateSection("thermo", { moldBaseName: v })
                  }
                />
              </Field>
              <Field label="Mold Base Code">
                <Input
                  value={engineering.thermo.moldBaseCode}
                  onChange={(v) =>
                    updateSection("thermo", { moldBaseCode: v })
                  }
                />
              </Field>

              <Field label="Insert Name">
                <Input
                  value={engineering.thermo.insertName}
                  onChange={(v) => updateSection("thermo", { insertName: v })}
                />
              </Field>
              <Field label="Insert Code">
                <Input
                  value={engineering.thermo.insertCode}
                  onChange={(v) => updateSection("thermo", { insertCode: v })}
                />
              </Field>
              <Field label="Cavities">
                <Input
                  value={engineering.thermo.cavities}
                  onChange={(v) => updateSection("thermo", { cavities: v })}
                />
              </Field>
              <Field label="CPM">
                <Input
                  value={engineering.thermo.cpm}
                  onChange={(v) => updateSection("thermo", { cpm: v })}
                />
              </Field>

              <Field label="Efficiency %">
                <Input
                  value={engineering.thermo.efficiencyPct}
                  onChange={(v) =>
                    updateSection("thermo", { efficiencyPct: v })
                  }
                />
              </Field>
              <Field label="Sheet Utilization %">
                <Input
                  value={engineering.thermo.sheetUtilizationPct}
                  onChange={(v) =>
                    updateSection("thermo", { sheetUtilizationPct: v })
                  }
                />
              </Field>
              <Field label="Confirmed Unit Weight (g)">
                <Input
                  value={engineering.thermo.unitWeight_g}
                  onChange={(v) => updateSection("thermo", { unitWeight_g: v })}
                />
              </Field>
              <Field label="Pieces / Stack">
                <Input
                  value={engineering.thermo.pcsPerStack}
                  onChange={(v) => updateSection("thermo", { pcsPerStack: v })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <InfoBox label="Productivity (pcs/hr)" value={derived.pcsPerHour ? derived.pcsPerHour.toFixed(0) : "—"} />
              <InfoBox label="Productivity (pcs/day)" value={derived.pcsPerDay ? derived.pcsPerDay.toFixed(0) : "—"} />
            </div>

            <Field label="Special Notes">
              <TextArea
                value={engineering.thermo.specialNotes}
                onChange={(v) =>
                  updateSection("thermo", { specialNotes: v })
                }
              />
            </Field>
          </div>
        }
      />

      <Section
        title="5. Decoration Process Data"
        left={
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <RefRow label="Requested Decoration" value={decorationReq?.decorationType || "None"} />
            <RefRow label="Print Colors" value={decorationReq?.dryOffset?.printColors} />
            <RefRow label="Sleeve Material" value={decorationReq?.shrinkSleeve?.sleeveMaterial} />
            <RefRow label="Hybrid Blank Material" value={decorationReq?.hybridCup?.hybridBlankMaterial} />
            <RefRow label="Label Material" value={decorationReq?.label?.labelMaterial} />
          </div>
        }
        right={
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Confirmed Decoration Type">
                <SelectField
                  value={engineering.decoration.type}
                  onChange={(v) => updateSection("decoration", { type: v })}
                  options={["None", "Dry offset printing", "Shrink sleeve", "Hybrid", "Label"]}
                />
              </Field>
              <Field label="Productivity (pcs/min)">
                <Input
                  value={engineering.decoration.productivity_pcs_min}
                  onChange={(v) =>
                    updateSection("decoration", { productivity_pcs_min: v })
                  }
                />
              </Field>
              <Field label="Waste %">
                <Input
                  value={engineering.decoration.wastePct}
                  onChange={(v) => updateSection("decoration", { wastePct: v })}
                />
              </Field>
            </div>

            {engineering.decoration.type === "Dry offset printing" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Ink Consumption (g / 1000)">
                  <Input
                    value={engineering.decoration.dryOffset?.ink_g_per_1000}
                    onChange={(v) =>
                      updateSection("decoration", {
                        dryOffset: {
                          ...engineering.decoration.dryOffset,
                          ink_g_per_1000: v,
                        },
                      })
                    }
                  />
                </Field>
                <Field label="Tooling / Process Note">
                  <TextArea
                    value={engineering.decoration.dryOffset?.toolingNote}
                    onChange={(v) =>
                      updateSection("decoration", {
                        dryOffset: {
                          ...engineering.decoration.dryOffset,
                          toolingNote: v,
                        },
                      })
                    }
                    rows={2}
                  />
                </Field>
              </div>
            )}

            {engineering.decoration.type === "Shrink sleeve" && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Field label="Sleeve Material">
                  <Input
                    value={engineering.decoration.shrink?.sleeveMaterial}
                    onChange={(v) =>
                      updateSection("decoration", {
                        shrink: {
                          ...engineering.decoration.shrink,
                          sleeveMaterial: v,
                        },
                      })
                    }
                  />
                </Field>
                <Field label="Thickness (mic)">
                  <Input
                    value={engineering.decoration.shrink?.thickness_mic}
                    onChange={(v) =>
                      updateSection("decoration", {
                        shrink: {
                          ...engineering.decoration.shrink,
                          thickness_mic: v,
                        },
                      })
                    }
                  />
                </Field>
                <Field label="Layflat (mm)">
                  <Input
                    value={engineering.decoration.shrink?.layflat_mm}
                    onChange={(v) =>
                      updateSection("decoration", {
                        shrink: {
                          ...engineering.decoration.shrink,
                          layflat_mm: v,
                        },
                      })
                    }
                  />
                </Field>
                <Field label="Height (mm)">
                  <Input
                    value={engineering.decoration.shrink?.height_mm}
                    onChange={(v) =>
                      updateSection("decoration", {
                        shrink: {
                          ...engineering.decoration.shrink,
                          height_mm: v,
                        },
                      })
                    }
                  />
                </Field>

                <div className="md:col-span-4">
                  <Field label="Supplier / Process Note">
                    <TextArea
                      value={engineering.decoration.shrink?.supplierNote}
                      onChange={(v) =>
                        updateSection("decoration", {
                          shrink: {
                            ...engineering.decoration.shrink,
                            supplierNote: v,
                          },
                        })
                      }
                      rows={2}
                    />
                  </Field>
                </div>
              </div>
            )}

            {engineering.decoration.type === "Hybrid" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Blank Spec">
                  <Input
                    value={engineering.decoration.hybrid?.blankSpec}
                    onChange={(v) =>
                      updateSection("decoration", {
                        hybrid: {
                          ...engineering.decoration.hybrid,
                          blankSpec: v,
                        },
                      })
                    }
                  />
                </Field>
                <Field label="Bottom Spec">
                  <Input
                    value={engineering.decoration.hybrid?.bottomSpec}
                    onChange={(v) =>
                      updateSection("decoration", {
                        hybrid: {
                          ...engineering.decoration.hybrid,
                          bottomSpec: v,
                        },
                      })
                    }
                  />
                </Field>
                <Field label="Glue (g / 1000)">
                  <Input
                    value={engineering.decoration.hybrid?.glue_g_per_1000}
                    onChange={(v) =>
                      updateSection("decoration", {
                        hybrid: {
                          ...engineering.decoration.hybrid,
                          glue_g_per_1000: v,
                        },
                      })
                    }
                  />
                </Field>

                <div className="md:col-span-3">
                  <Field label="Hybrid Note">
                    <TextArea
                      value={engineering.decoration.hybrid?.note}
                      onChange={(v) =>
                        updateSection("decoration", {
                          hybrid: {
                            ...engineering.decoration.hybrid,
                            note: v,
                          },
                        })
                      }
                      rows={2}
                    />
                  </Field>
                </div>
              </div>
            )}

            {engineering.decoration.type === "Label" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Label Spec">
                  <Input
                    value={engineering.decoration.label?.labelSpec}
                    onChange={(v) =>
                      updateSection("decoration", {
                        label: {
                          ...engineering.decoration.label,
                          labelSpec: v,
                        },
                      })
                    }
                  />
                </Field>
                <Field label="Label Note">
                  <TextArea
                    value={engineering.decoration.label?.note}
                    onChange={(v) =>
                      updateSection("decoration", {
                        label: {
                          ...engineering.decoration.label,
                          note: v,
                        },
                      })
                    }
                    rows={2}
                  />
                </Field>
              </div>
            )}
          </div>
        }
      />

      <Section
        title="6. Packaging Data"
        left={
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <RefRow label="Pieces / Stack" value={packagingReq?.primary?.pcsPerStack} />
            <RefRow label="Stacks / Primary" value={packagingReq?.primary?.stacksPerBag} />
            <RefRow label="Primaries / Secondary" value={packagingReq?.secondary?.bagsPerCarton} />
            <RefRow label="Secondary Type" value={packagingReq?.secondary?.cartonType} />
            <RefRow label="Pallet Type" value={packagingReq?.pallet?.palletType} />
            <RefRow label="Cartons / Pallet" value={packagingReq?.pallet?.cartonsPerPallet} />
            <RefRow label="Stretch Wrap Required" value={packagingReq?.pallet?.stretchWrapRequired} />
          </div>
        }
        right={
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Field label="Use Pallet">
              <SelectField
                value={engineering.packaging.usePallet}
                onChange={(v) => updateSection("packaging", { usePallet: v })}
                options={["Yes", "No"]}
              />
            </Field>
            <Field label="Pieces / Stack">
              <Input
                value={engineering.packaging.pcsPerStack}
                onChange={(v) => updateSection("packaging", { pcsPerStack: v })}
              />
            </Field>
            <Field label="Primary Name">
              <Input
                value={engineering.packaging.primaryName}
                onChange={(v) => updateSection("packaging", { primaryName: v })}
              />
            </Field>
            <Field label="Stacks / Primary">
              <Input
                value={engineering.packaging.stacksPerPrimary}
                onChange={(v) =>
                  updateSection("packaging", { stacksPerPrimary: v })
                }
              />
            </Field>

            <Field label="Primaries / Secondary">
              <Input
                value={engineering.packaging.primariesPerSecondary}
                onChange={(v) =>
                  updateSection("packaging", { primariesPerSecondary: v })
                }
              />
            </Field>
            <Field label="Secondary Name">
              <Input
                value={engineering.packaging.secondaryName}
                onChange={(v) =>
                  updateSection("packaging", { secondaryName: v })
                }
              />
            </Field>
            <Field label="Labels / Secondary">
              <Input
                value={engineering.packaging.labelsPerSecondary}
                onChange={(v) =>
                  updateSection("packaging", { labelsPerSecondary: v })
                }
              />
            </Field>
            <Field label="Secondaries / Pallet">
              <Input
                value={engineering.packaging.secondariesPerPallet}
                onChange={(v) =>
                  updateSection("packaging", { secondariesPerPallet: v })
                }
              />
            </Field>

            <Field label="Labels / Pallet">
              <Input
                value={engineering.packaging.labelsPerPallet}
                onChange={(v) =>
                  updateSection("packaging", { labelsPerPallet: v })
                }
              />
            </Field>
            <Field label="Stretch (kg / pallet)">
              <Input
                value={engineering.packaging.stretchKgPerPallet}
                onChange={(v) =>
                  updateSection("packaging", { stretchKgPerPallet: v })
                }
              />
            </Field>
            <Field label="Pallet Type">
              <Input
                value={engineering.packaging.palletType}
                onChange={(v) => updateSection("packaging", { palletType: v })}
              />
            </Field>

            <div className="md:col-span-4">
              <Field label="Packaging Note">
                <TextArea
                  value={engineering.packaging.note}
                  onChange={(v) => updateSection("packaging", { note: v })}
                />
              </Field>
            </div>
          </div>
        }
      />

      <Section
        title="7. Freight / Logistics Basis"
        left={
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <RefRow label="Delivery Location" value={deliveryReq?.deliveryLocationConfirm || customer.deliveryLocation} />
            <RefRow label="Delivery Term" value={deliveryReq?.deliveryTerm} />
            <RefRow label="Desired Qty / Truck" value={deliveryReq?.desiredQtyPerTruck} />
            <RefRow label="Desired Qty Unit" value={deliveryReq?.desiredQtyUnit} />
          </div>
        }
        right={
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Field label="Delivery Mode">
              <SelectField
                value={engineering.freight.deliveryMode}
                onChange={(v) => updateSection("freight", { deliveryMode: v })}
                options={["Truck", "Container", "Courier", "Other"]}
              />
            </Field>
            <Field label="Freight Basis">
              <SelectField
                value={engineering.freight.freightBasis}
                onChange={(v) => updateSection("freight", { freightBasis: v })}
                options={["Per Truck", "Per Ton", "Per Pallet", "Per 1000 pcs"]}
              />
            </Field>
            <Field label="Pallets / Truck">
              <Input
                value={engineering.freight.palletsPerTruck}
                onChange={(v) =>
                  updateSection("freight", { palletsPerTruck: v })
                }
              />
            </Field>
            <Field label="Kg / Truck">
              <Input
                value={engineering.freight.kgPerTruck}
                onChange={(v) => updateSection("freight", { kgPerTruck: v })}
              />
            </Field>

            <Field label="Pcs / Truck">
              <Input
                value={engineering.freight.pcsPerTruck}
                onChange={(v) => updateSection("freight", { pcsPerTruck: v })}
              />
            </Field>

            <div className="md:col-span-4">
              <Field label="Freight / Loading Notes">
                <TextArea
                  value={engineering.freight.notes}
                  onChange={(v) => updateSection("freight", { notes: v })}
                />
              </Field>
            </div>
          </div>
        }
      />

      <Section
        title="8. Tooling / Investment Structure"
        left={
          <div className="space-y-3">
            <RefRow label="Project Type" value={customer.projectType} />
            <RefRow label="Decoration Type" value={decorationReq?.decorationType || "None"} />
            <RefRow label="Customer Notes" value={customer.customerNotes} />
          </div>
        }
        right={
          <ToolingEditor
            rows={engineering.tooling || []}
            onChange={(rows) =>
              setEngineering((prev) => ({ ...prev, tooling: rows }))
            }
          />
        }
      />

      <Section
        title="9. Engineering Summary for Pricing"
        left={
          <div className="space-y-3">
            <RefRow label="Customer" value={customer.customerName} />
            <RefRow label="Project" value={customer.projectName} />
            <RefRow label="Product" value={product.productType} />
          </div>
        }
        right={
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <InfoBox
              label="Extrusion Net Speed (kg/hr)"
              value={engineering.extrusion.netSpeed_kg_hr || "—"}
            />
            <InfoBox
              label="Tons / Day"
              value={engineering.extrusion.tonsPerDay || "—"}
            />
            <InfoBox
              label="Process Waste %"
              value={engineering.materialSheet.processWastePct || "—"}
            />
            <InfoBox
              label="Thermo Pcs / Hr"
              value={derived.pcsPerHour ? derived.pcsPerHour.toFixed(0) : "—"}
            />
            <InfoBox
              label="Thermo Pcs / Day"
              value={derived.pcsPerDay ? derived.pcsPerDay.toFixed(0) : "—"}
            />
            <InfoBox
              label="Decoration Type"
              value={engineering.decoration.type || "None"}
            />
            <InfoBox
              label="Packaging Type"
              value={engineering.packaging.secondaryName || engineering.packaging.primaryName || "—"}
            />
            <InfoBox
              label="Freight Basis"
              value={engineering.freight.freightBasis || "—"}
            />
            <InfoBox
              label="Tooling Items"
              value={engineering.tooling?.length ? String(engineering.tooling.length) : "0"}
            />
          </div>
        }
      />
    </div>
  );
}