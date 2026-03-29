import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

function ScenarioStatusBadge({ status }) {
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

function parsePricingJson(jsonString) {
  try {
    return jsonString ? JSON.parse(jsonString) : {};
  } catch {
    return {};
  }
}

function extractScenarioMetrics(scenario) {
  const pricingData = parsePricingJson(scenario.PricingJSON);

  const sheetTotal = pricingData?.pricing?.sheetSummary?.totalPerTon;
  const thermoTotal = pricingData?.thermo?.summary?.totalPer1000;
  const payback = pricingData?.thermo?.summary?.paybackQtyPcs;
  const selling = scenario.SellingPricePer1000 || pricingData?.thermo?.finance?.desiredPricePer1000 || "";

  return {
    sheetTotal: sheetTotal || scenario.TotalCostPer1000 || "",
    thermoTotal: thermoTotal || "",
    selling,
    payback: payback || "",
    note: scenario.ScenarioNote || "",
  };
}

export default function PricingWorkspace() {
  const { requestId } = useParams();
  const navigate = useNavigate();

  const [requestData, setRequestData] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newScenarioName, setNewScenarioName] = useState("");
  const [newScenarioNote, setNewScenarioNote] = useState("");
  const [createdBy, setCreatedBy] = useState("");

  useEffect(() => {
    const remembered = localStorage.getItem("pricingCreatedBy") || "";
    setCreatedBy(remembered);
  }, []);

  useEffect(() => {
    load();
  }, [requestId]);

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const reqRes = await fetch(
        `/.netlify/functions/get-request?requestId=${requestId}`
      );
      const reqJson = await reqRes.json();

      if (!reqJson.success) {
        setError(reqJson.error || "Failed to load project");
        return;
      }

      setRequestData(reqJson.payload || {});

      const scRes = await fetch(
        `/.netlify/functions/list-pricing-scenarios?requestId=${requestId}`
      );
      const scJson = await scRes.json();

      if (scJson.success) {
        setScenarios(Array.isArray(scJson.scenarios) ? scJson.scenarios : []);
      }
    } catch (err) {
      console.error("Pricing workspace load error:", err);
      setError("Failed to load pricing workspace");
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    const customer = requestData?.customer || {};
    const product = requestData?.product || {};
    return {
      customerName: customer.customerName || "—",
      projectName: customer.projectName || "—",
      productType: product.productType || "—",
    };
  }, [requestData]);

  const scenarioRows = useMemo(() => {
    return scenarios.map((s) => ({
      ...s,
      metrics: extractScenarioMetrics(s),
    }));
  }, [scenarios]);

  const createScenario = async () => {
    try {
      const author = createdBy.trim();
      localStorage.setItem("pricingCreatedBy", author);

      const res = await fetch("/.netlify/functions/save-pricing-scenario", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          scenarioName: newScenarioName || `Scenario ${scenarios.length + 1}`,
          scenarioNote: newScenarioNote || "",
          createdBy: author,
          scenarioStatus: "Draft",
          pricingData: {},
        }),
      });

      const json = await res.json();

      if (!json.success) {
        alert(json.error || "Failed to create scenario");
        return;
      }

      navigate(`/pricing/${requestId}/scenario/${json.pricingId}`);
    } catch (err) {
      console.error(err);
      alert("Failed to create scenario");
    }
  };

  const duplicateScenario = async (scenario) => {
    try {
      const author = createdBy.trim();
      localStorage.setItem("pricingCreatedBy", author);

      const pricingData = parsePricingJson(scenario.PricingJSON);

      const res = await fetch("/.netlify/functions/save-pricing-scenario", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          scenarioName: `${scenario.ScenarioName || "Scenario"} Copy`,
          scenarioNote: `Duplicated from ${scenario.PricingID}`,
          createdBy: author,
          scenarioStatus: "Draft",
          pricingData,
          totalCostPer1000: scenario.TotalCostPer1000 || "",
          sellingPricePer1000: scenario.SellingPricePer1000 || "",
          marginPct: scenario.MarginPct || "",
        }),
      });

      const json = await res.json();

      if (!json.success) {
        alert(json.error || "Failed to duplicate scenario");
        return;
      }

      navigate(`/pricing/${requestId}/scenario/${json.pricingId}`);
    } catch (err) {
      console.error(err);
      alert("Failed to duplicate scenario");
    }
  };

  if (loading) return <div className="p-6">Loading pricing workspace...</div>;

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Pricing Workspace</h1>
            <p className="text-sm text-gray-500">{requestId}</p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/pricing-dashboard"
              className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100 bg-white"
            >
              ← Pricing Dashboard
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border bg-white shadow-sm p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
          </div>
        </div>

        <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
          <h2 className="text-lg font-semibold">Create New Scenario</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">Scenario Name</div>
              <input
                className="w-full border rounded-lg p-2"
                value={newScenarioName}
                onChange={(e) => setNewScenarioName(e.target.value)}
                placeholder="e.g. Base Case"
              />
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1">Created By</div>
              <input
                className="w-full border rounded-lg p-2"
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={createScenario}
                className="w-full rounded-lg bg-black text-white px-4 py-2"
              >
                + Create Scenario
              </button>
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Scenario Note</div>
            <textarea
              className="w-full border rounded-lg p-2"
              rows={2}
              value={newScenarioNote}
              onChange={(e) => setNewScenarioNote(e.target.value)}
              placeholder="Short note describing what changed in this scenario"
            />
          </div>
        </div>

        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Saved Scenarios</h2>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-3">Pricing ID</th>
                <th className="p-3">Scenario Name</th>
                <th className="p-3">Created Date</th>
                <th className="p-3">Created By</th>
                <th className="p-3">Status</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>

            <tbody>
              {scenarioRows.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-gray-500">
                    No pricing scenarios saved yet.
                  </td>
                </tr>
              ) : (
                scenarioRows.map((s) => (
                  <tr key={s.PricingID} className="border-t">
                    <td className="p-3 font-medium">{s.PricingID}</td>
                    <td className="p-3">{s.ScenarioName || "—"}</td>
                    <td className="p-3">{s.CreatedDate || "—"}</td>
                    <td className="p-3">{s.CreatedBy || "—"}</td>
                    <td className="p-3">
                      <ScenarioStatusBadge status={s.ScenarioStatus} />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <Link
                          to={`/pricing/${requestId}/scenario/${s.PricingID}`}
                          className="text-blue-600 hover:underline"
                        >
                          Open
                        </Link>
                        <button
                          onClick={() => duplicateScenario(s)}
                          className="text-gray-700 hover:underline"
                        >
                          Duplicate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Scenario Comparison</h2>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-3">Scenario</th>
                <th className="p-3">Status</th>
                <th className="p-3">Sheet Total / Ton</th>
                <th className="p-3">Thermo Total / 1000</th>
                <th className="p-3">Selling / 1000</th>
                <th className="p-3">Payback Qty</th>
                <th className="p-3">Note</th>
              </tr>
            </thead>

            <tbody>
              {scenarioRows.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-6 text-center text-gray-500">
                    No scenario data available for comparison.
                  </td>
                </tr>
              ) : (
                scenarioRows.map((s) => (
                  <tr key={`cmp-${s.PricingID}`} className="border-t">
                    <td className="p-3 font-medium">{s.ScenarioName || s.PricingID}</td>
                    <td className="p-3">
                      <ScenarioStatusBadge status={s.ScenarioStatus} />
                    </td>
                    <td className="p-3">{s.metrics.sheetTotal || "—"}</td>
                    <td className="p-3">{s.metrics.thermoTotal || "—"}</td>
                    <td className="p-3">{s.metrics.selling || "—"}</td>
                    <td className="p-3">{s.metrics.payback || "—"}</td>
                    <td className="p-3">{s.metrics.note || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}