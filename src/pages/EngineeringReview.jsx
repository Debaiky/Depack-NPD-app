import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

function Section({ title, left, right }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
      <h2 className="font-semibold text-lg">{title}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 border rounded-xl p-4 space-y-2">
          <div className="text-xs text-gray-500">Request Data</div>
          {left}
        </div>

        <div className="space-y-3">{right}</div>
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
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function EngineeringReview() {
  const { requestId } = useParams();

  const [payload, setPayload] = useState(null);
  const [engineering, setEngineering] = useState({
    engineerName: "",
    sheet: {
      kgPerHour: "",
      wastePct: "",
    },
    thermo: {
      cpm: "",
      cavities: "",
      efficiency: "",
    },
  });

  const [engineeringStatus, setEngineeringStatus] = useState(
    "Under Engineering Review"
  );
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const requestRes = await fetch(
          `/.netlify/functions/get-request?requestId=${requestId}`
        );
        const requestJson = await requestRes.json();

        if (requestJson.success) {
          setPayload(requestJson.payload);
        }

        const engRes = await fetch(
          `/.netlify/functions/get-engineering-data?requestId=${requestId}`
        );
        const engJson = await engRes.json();

        if (engJson.success && engJson.engineeringData) {
          setEngineering(
            engJson.engineeringData || {
              engineerName: "",
              sheet: { kgPerHour: "", wastePct: "" },
              thermo: { cpm: "", cavities: "", efficiency: "" },
            }
          );
          setEngineeringStatus(
            engJson.status || "Under Engineering Review"
          );
        }
      } catch (err) {
        console.error("Failed to load engineering page:", err);
      }
    };

    load();
  }, [requestId]);

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
          engineerName: engineering.engineerName || "",
          engineeringData: engineering,
          note: "",
        }),
      });

      const json = await res.json();

      if (json.success) {
        setSaveMessage(`Saved successfully at ${new Date().toLocaleTimeString()}`);
        return true;
      } else {
        setSaveMessage("Save failed");
        return false;
      }
    } catch (e) {
      console.error(e);
      setSaveMessage("Save failed");
      return false;
    }
  };

  const sendToPricing = async () => {
    try {
      const saveOk = await saveEngineering();
      if (!saveOk) {
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

      const res = await fetch("/.netlify/functions/save-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedPayload),
      });

      const json = await res.json();

      if (!json.success) {
        alert("Engineering saved, but failed to update request status");
        return;
      }

      alert("Sent to Pricing successfully");
      window.location.href = `/pricing/${requestId}`;
    } catch (error) {
      console.error(error);
      alert("Error sending project to pricing");
    }
  };

  if (!payload) {
    return <div className="p-6">Loading...</div>;
  }

  const customer = payload.customer || {};
  const product = payload.product || {};
  const decoration = payload.decoration || {};
  const packaging = payload.packaging || {};
  const delivery = payload.delivery || {};

  const pcsPerHour =
    Number(engineering.thermo?.cpm || 0) *
    Number(engineering.thermo?.cavities || 0) *
    (Number(engineering.thermo?.efficiency || 0) / 100) *
    60;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <div className="text-sm text-gray-500">Engineering Review</div>
          <div className="text-xl font-bold">{requestId}</div>
        </div>

        <Link
          to="/engineering"
          className="border px-4 py-2 rounded-lg text-sm bg-white"
        >
          ← Back
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            label="Engineer Name"
            value={engineering.engineerName}
            onChange={(v) =>
              setEngineering((prev) => ({
                ...prev,
                engineerName: v,
              }))
            }
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

          <div className="flex items-end">
            <button
              type="button"
              onClick={saveEngineering}
              className="w-full rounded-lg bg-black text-white px-4 py-2"
            >
              Save Engineering Data
            </button>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={sendToPricing}
              className="w-full rounded-lg bg-green-600 text-white px-4 py-2"
            >
              Send to Pricing
            </button>
          </div>
        </div>

        <div className="text-sm text-green-700 font-medium">{saveMessage}</div>
      </div>

      <Section
        title="Material & Sheet Data"
        left={
          <>
            <div><span className="font-medium">Customer:</span> {customer.customerName || "—"}</div>
            <div><span className="font-medium">Project:</span> {customer.projectName || "—"}</div>
            <div><span className="font-medium">Product:</span> {product.productType || "—"}</div>
            <div>
              <span className="font-medium">Material:</span>{" "}
              {product.sheetMaterial || product.productMaterial || "—"}
            </div>
            <div>
              <span className="font-medium">Thickness:</span>{" "}
              {product.sheetThicknessMicron || product.productHeightMm || "—"}
            </div>
            <div>
              <span className="font-medium">Width:</span>{" "}
              {product.sheetWidthMm || "—"}
            </div>
          </>
        }
        right={
          <>
            <Input
              label="Sheet Consumption (kg/hr)"
              value={engineering.sheet?.kgPerHour}
              onChange={(v) =>
                setEngineering((prev) => ({
                  ...prev,
                  sheet: {
                    ...prev.sheet,
                    kgPerHour: v,
                  },
                }))
              }
              type="number"
            />

            <Input
              label="Sheet Waste %"
              value={engineering.sheet?.wastePct}
              onChange={(v) =>
                setEngineering((prev) => ({
                  ...prev,
                  sheet: {
                    ...prev.sheet,
                    wastePct: v,
                  },
                }))
              }
              type="number"
            />
          </>
        }
      />

      <Section
        title="Thermoforming"
        left={
          <>
            <div><span className="font-medium">Product Type:</span> {product.productType || "—"}</div>
            <div><span className="font-medium">Decoration:</span> {decoration.decorationType || "None"}</div>
            <div>
              <span className="font-medium">Packaging:</span>{" "}
              {packaging?.secondary?.cartonType || packaging?.pallet?.palletType || "—"}
            </div>
            <div>
              <span className="font-medium">Delivery:</span>{" "}
              {delivery.deliveryLocationConfirm || customer.deliveryLocation || "—"}
            </div>
          </>
        }
        right={
          <>
            <Input
              label="Cycles per Minute (CPM)"
              value={engineering.thermo?.cpm}
              onChange={(v) =>
                setEngineering((prev) => ({
                  ...prev,
                  thermo: {
                    ...prev.thermo,
                    cpm: v,
                  },
                }))
              }
              type="number"
            />

            <Input
              label="Cavities"
              value={engineering.thermo?.cavities}
              onChange={(v) =>
                setEngineering((prev) => ({
                  ...prev,
                  thermo: {
                    ...prev.thermo,
                    cavities: v,
                  },
                }))
              }
              type="number"
            />

            <Input
              label="Efficiency %"
              value={engineering.thermo?.efficiency}
              onChange={(v) =>
                setEngineering((prev) => ({
                  ...prev,
                  thermo: {
                    ...prev.thermo,
                    efficiency: v,
                  },
                }))
              }
              type="number"
            />

            <div className="rounded-lg border bg-gray-50 p-3 text-sm">
              Productivity:
              <span className="font-semibold ml-2">
                {pcsPerHour.toFixed(0)} pcs/hr
              </span>
            </div>
          </>
        }
      />
    </div>
  );
}