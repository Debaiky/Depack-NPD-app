import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

function Section({ title, left, right }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
      <h2 className="font-semibold text-lg">{title}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* LEFT (reference) */}
        <div className="bg-gray-50 border rounded-xl p-4 space-y-2">
          <div className="text-xs text-gray-500">Request Data</div>
          {left}
        </div>

        {/* RIGHT (engineering input) */}
        <div className="space-y-3">{right}</div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange }) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <input
        className="w-full border rounded-lg p-2 mt-1"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options = [] }) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <select
        className="w-full border rounded-lg p-2 mt-1"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select</option>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

export default function EngineeringReview() {
  const { requestId } = useParams();

  const [payload, setPayload] = useState(null);
  const [engineering, setEngineering] = useState({});
  const [engineerName, setEngineerName] = useState("");
  const [engineeringStatus, setEngineeringStatus] = useState(
    "Under Engineering Review"
  );
  const [saveMessage, setSaveMessage] = useState("");

  // =========================
  // LOAD DATA
  // =========================
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
          setEngineering(j2.engineeringData);
          setEngineerName(j2.engineeringData.engineerName || "");
        }
      } catch (err) {
        console.error(err);
      }
    };

    load();
  }, [requestId]);

  // =========================
  // SAVE ENGINEERING
  // =========================
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

  // =========================
  // SEND TO PRICING
  // =========================
  const sendToPricing = async () => {
    try {
      // save engineering first
      await saveEngineering();

      const updatedPayload = {
        ...payload,
        metadata: {
          ...payload.metadata,
          status: "Engineering Completed",
        },
      };

      const res = await fetch("/.netlify/functions/save-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedPayload),
      });

      const json = await res.json();

      if (!json.success) {
        alert("Failed to update request");
        return;
      }

      alert("Sent to Pricing");

      window.location.href = `/pricing/${requestId}`;
    } catch (err) {
      console.error(err);
      alert("Error sending to pricing");
    }
  };

  if (!payload) return <div className="p-6">Loading...</div>;

  const product = payload.product || {};

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <div className="text-sm text-gray-500">Engineering Review</div>
          <div className="text-xl font-bold">{requestId}</div>
        </div>

        <Link
          to="/engineering"
          className="border px-4 py-2 rounded-lg text-sm"
        >
          ← Back
        </Link>
      </div>

      {/* TOP CONTROL */}
      <div className="bg-white rounded-2xl shadow p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            label="Engineer Name"
            value={engineerName}
            onChange={setEngineerName}
          />

          <SelectField
            label="Status"
            value={engineeringStatus}
            onChange={setEngineeringStatus}
            options={[
              "Under Engineering Review",
              "Clarification Required",
              "Engineering Completed",
            ]}
          />

          <button
            onClick={saveEngineering}
            className="bg-black text-white rounded-lg px-4 py-2"
          >
            Save
          </button>

          <button
            onClick={sendToPricing}
            className="bg-green-600 text-white rounded-lg px-4 py-2"
          >
            Send to Pricing
          </button>
        </div>

        <div className="text-sm text-green-600">{saveMessage}</div>
      </div>

      {/* SECTION 1 */}
      <Section
        title="Material & Sheet Data"
        left={
          <>
            <div>Material: {product.productMaterial}</div>
            <div>Thickness: {product.productHeightMm}</div>
          </>
        }
        right={
          <>
            <Input
              label="kg/hr"
              value={engineering.sheet?.kgPerHour}
              onChange={(v) =>
                setEngineering({
                  ...engineering,
                  sheet: { ...engineering.sheet, kgPerHour: v },
                })
              }
            />

            <Input
              label="Waste %"
              value={engineering.sheet?.wastePct}
              onChange={(v) =>
                setEngineering({
                  ...engineering,
                  sheet: { ...engineering.sheet, wastePct: v },
                })
              }
            />
          </>
        }
      />

      {/* SECTION 2 */}
      <Section
        title="Thermoforming"
        left={<div>Product Type: {product.productType}</div>}
        right={
          <>
            <Input
              label="Cycles / min"
              value={engineering.thermo?.cpm}
              onChange={(v) =>
                setEngineering({
                  ...engineering,
                  thermo: { ...engineering.thermo, cpm: v },
                })
              }
            />

            <Input
              label="Cavities"
              value={engineering.thermo?.cavities}
              onChange={(v) =>
                setEngineering({
                  ...engineering,
                  thermo: { ...engineering.thermo, cavities: v },
                })
              }
            />

            <Input
              label="Efficiency %"
              value={engineering.thermo?.efficiency}
              onChange={(v) =>
                setEngineering({
                  ...engineering,
                  thermo: { ...engineering.thermo, efficiency: v },
                })
              }
            />
            <div className="rounded-lg border bg-gray-50 p-3 text-sm">
  Productivity:
  <span className="font-semibold ml-2">
    {(
      (Number(engineering.thermo?.cpm || 0) *
        Number(engineering.thermo?.cavities || 0) *
        Number(engineering.thermo?.efficiency || 0) /
        100) *
      60
    ).toFixed(0)}{" "}
    pcs/hr
  </span>
</div>
          </>
        }
      />
    </div>
  );
}