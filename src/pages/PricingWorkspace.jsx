import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

const PRICING_PASSWORD = "DepackPricing_2026";

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

  const sheetTotal = pricingData?.sheetSummary?.totalPerTon;
  const thermoTotal = pricingData?.thermo?.summary?.totalPer1000;
  const payback = pricingData?.thermo?.summary?.paybackQtyPcs;
  const selling =
    scenario.SellingPricePer1000 ||
    pricingData?.thermo?.finance?.desiredPricePer1000 ||
    "";

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
  const [createdBy, setCreatedBy] = useState("");

  const [enteredPassword, setEnteredPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const remembered = localStorage.getItem("pricingCreatedBy") || "";
    setCreatedBy(remembered);

    const pricingUnlocked = sessionStorage.getItem("pricing_unlocked") === "yes";
    if (pricingUnlocked) {
      setUnlocked(true);
    }
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
        setRequestData(null);
        setScenarios([]);
        return;
      }

      setRequestData(reqJson.payload || {});

      const scRes = await fetch(
        `/.netlify/functions/list-pricing-scenarios?requestId=${requestId}`
      );
      const scJson = await scRes.json();

      if (!scJson.success) {
        setError(scJson.error || "Failed to load pricing scenarios");
        setScenarios([]);
        return;
      }

      const rows = Array.isArray(scJson.scenarios) ? scJson.scenarios : [];
      setScenarios(rows);
    } catch (err) {
      console.error("Pricing workspace load error:", err);
      setError("Failed to load pricing workspace");
      setRequestData(null);
      setScenarios([]);
    } finally {
      setLoading(false);
    }
  };

  const project = requestData?.project || {};
  const product = requestData?.product || {};
  const customerBlock = requestData?.customer || {};
  const primaryCustomer = customerBlock?.customers?.[0] || {};

  const summary = useMemo(() => {
    return {
      customerName: primaryCustomer.customerName || "—",
      projectName: project.projectName || "—",
      productType: product.productType || "—",
      requestId: requestId || "—",
      thumbnail:
        product?.productThumbnailUrl ||
        product?.productThumbnailPreview ||
        (product?.productThumbnailBase64
          ? `data:image/*;base64,${product.productThumbnailBase64}`
          : ""),
    };
  }, [primaryCustomer, project, product, requestId]);

  const scenarioRows = useMemo(() => {
    return scenarios
      .filter((s) => (s.ScenarioName || "") !== "Workspace Setup")
      .map((s) => ({
        ...s,
        metrics: extractScenarioMetrics(s),
      }));
  }, [scenarios]);

  const selectedForComparison = useMemo(() => {
    return scenarioRows.filter((s) => (s.CompareSelected || "") === "Yes");
  }, [scenarioRows]);

  const unlockWorkspace = () => {
    if (enteredPassword === PRICING_PASSWORD) {
      setUnlocked(true);
      sessionStorage.setItem("pricing_unlocked", "yes");
      setEnteredPassword("");
      return;
    }

    alert("Wrong password");
  };

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
          scenarioName: `Scenario ${scenarioRows.length + 1}`,
          scenarioNote: "",
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
          compareSelected: false,
          scenarioCurrency: scenario.ScenarioCurrency || "",
          usdEgp: scenario.UsdEgp || "",
          eurUsd: scenario.EurUsd || "",
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

  const toggleScenarioComparison = async (scenario, checked) => {
    try {
      const pricingData = parsePricingJson(scenario.PricingJSON);

      const currentlySelected = scenarioRows.filter(
        (s) => (s.CompareSelected || "") === "Yes"
      );

      if (checked && currentlySelected.length >= 4 && scenario.CompareSelected !== "Yes") {
        alert("Maximum 4 scenarios can be selected for comparison.");
        return;
      }

      const res = await fetch("/.netlify/functions/save-pricing-scenario", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          pricingId: scenario.PricingID,
          scenarioName: scenario.ScenarioName || "",
          scenarioNote: scenario.ScenarioNote || "",
          createdBy: scenario.CreatedBy || "",
          scenarioStatus: scenario.ScenarioStatus || "Draft",
          pricingData,
          totalCostPer1000: scenario.TotalCostPer1000 || "",
          sellingPricePer1000: scenario.SellingPricePer1000 || "",
          marginPct: scenario.MarginPct || "",
          compareSelected: checked,
          scenarioCurrency: scenario.ScenarioCurrency || "",
          usdEgp: scenario.UsdEgp || "",
          eurUsd: scenario.EurUsd || "",
        }),
      });

      const json = await res.json();

      if (!json.success) {
        alert(json.error || "Failed to update comparison selection");
        return;
      }

      await load();
    } catch (err) {
      console.error(err);
      alert("Failed to update comparison selection");
    }
  };

  const clearComparisonSelection = async () => {
    try {
      const selected = scenarioRows.filter((s) => (s.CompareSelected || "") === "Yes");

      if (selected.length === 0) {
        alert("No scenarios are selected for comparison.");
        return;
      }

      for (const scenario of selected) {
        const pricingData = parsePricingJson(scenario.PricingJSON);

        const res = await fetch("/.netlify/functions/save-pricing-scenario", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requestId,
            pricingId: scenario.PricingID,
            scenarioName: scenario.ScenarioName || "",
            scenarioNote: scenario.ScenarioNote || "",
            createdBy: scenario.CreatedBy || "",
            scenarioStatus: scenario.ScenarioStatus || "Draft",
            pricingData,
            totalCostPer1000: scenario.TotalCostPer1000 || "",
            sellingPricePer1000: scenario.SellingPricePer1000 || "",
            marginPct: scenario.MarginPct || "",
            compareSelected: false,
            scenarioCurrency: scenario.ScenarioCurrency || "",
            usdEgp: scenario.UsdEgp || "",
            eurUsd: scenario.EurUsd || "",
          }),
        });

        const json = await res.json();

        if (!json.success) {
          alert(json.error || `Failed to clear comparison for ${scenario.ScenarioName}`);
          return;
        }
      }

      await load();
      alert("Comparison selection cleared");
    } catch (err) {
      console.error(err);
      alert("Failed to clear comparison selection");
    }
  };

  const openComparison = () => {
    if (selectedForComparison.length === 0) {
      alert("Please select at least one scenario for comparison.");
      return;
    }

    navigate(`/pricing/${requestId}/compare`);
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

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h1 className="text-2xl font-bold">Pricing Workspace</h1>
            <Link
              to="/pricing-dashboard"
              className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100 bg-white"
            >
              ← Pricing Dashboard
            </Link>
          </div>

          <div className="rounded-2xl border bg-white shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold">Enter Pricing Password</h2>
            <p className="text-sm text-gray-600">
              Please enter the pricing section password to access all pricing workspaces.
            </p>

            <input
              type="password"
              className="w-full border rounded-lg p-3"
              value={enteredPassword}
              onChange={(e) => setEnteredPassword(e.target.value)}
              placeholder="Enter password"
            />

            <button
              onClick={unlockWorkspace}
              className="w-full rounded-lg bg-black text-white px-4 py-3"
            >
              Unlock
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="rounded-2xl border bg-white shadow-sm p-5">
          <div className="flex items-center gap-4 flex-wrap">
            {summary.thumbnail ? (
              <img
                src={summary.thumbnail}
                alt="Product thumbnail"
                className="w-20 h-20 rounded-xl border object-cover bg-white"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl border bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                No image
              </div>
            )}

            <div className="flex-1 min-w-[240px]">
              <h1 className="text-2xl font-bold">Pricing Workspace</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 text-sm">
                <div><span className="text-gray-500">Request No.:</span> {summary.requestId}</div>
                <div><span className="text-gray-500">Project:</span> {summary.projectName}</div>
                <div><span className="text-gray-500">Customer:</span> {summary.customerName}</div>
                <div><span className="text-gray-500">Product:</span> {summary.productType}</div>
              </div>
            </div>

            <div>
              <Link
                to="/pricing-dashboard"
                className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100 bg-white"
              >
                ← Pricing Dashboard
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-semibold">Saved Scenarios</h2>

            <div className="flex items-center gap-3 flex-wrap">
              <input
                className="border rounded-lg p-2"
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
                placeholder="Creator name"
              />

              <button
                onClick={createScenario}
                className="rounded-lg bg-black text-white px-4 py-2"
              >
                Create Scenario
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-semibold">Saved Scenarios</h2>

            <div className="flex items-center gap-3">
              <button
                onClick={clearComparisonSelection}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100 bg-white"
              >
                Clear Comparison Selection
              </button>

              <button
                onClick={openComparison}
                className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-500"
              >
                Open Comparison ({selectedForComparison.length})
              </button>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-3">Pricing ID</th>
                <th className="p-3">Scenario Name</th>
                <th className="p-3">Scenario Description</th>
                <th className="p-3">Status</th>
                <th className="p-3">Open</th>
                <th className="p-3">Duplicate</th>
                <th className="p-3">Add to Comparison</th>
              </tr>
            </thead>

            <tbody>
              {scenarioRows.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-6 text-center text-gray-500">
                    No pricing scenarios saved yet.
                  </td>
                </tr>
              ) : (
                scenarioRows.map((s) => (
                  <tr key={s.PricingID} className="border-t">
                    <td className="p-3 font-medium">{s.PricingID}</td>
                    <td className="p-3">{s.ScenarioName || "—"}</td>
                    <td className="p-3">{s.ScenarioNote || "—"}</td>
                    <td className="p-3">
                      <ScenarioStatusBadge status={s.ScenarioStatus} />
                    </td>
                    <td className="p-3">
                      <Link
                        to={`/pricing/${requestId}/scenario/${s.PricingID}`}
                        className="text-blue-600 hover:underline"
                      >
                        Open
                      </Link>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => duplicateScenario(s)}
                        className="text-gray-700 hover:underline"
                      >
                        Duplicate
                      </button>
                    </td>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={(s.CompareSelected || "") === "Yes"}
                        onChange={(e) => toggleScenarioComparison(s, e.target.checked)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl border bg-white shadow-sm p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <h2 className="text-lg font-semibold">Scenario Comparison Snapshot</h2>

            <div className="flex items-center gap-3">
              <button
                onClick={clearComparisonSelection}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100 bg-white"
              >
                Clear Comparison Selection
              </button>

              <button
                onClick={openComparison}
                className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-500"
              >
                Open Comparison ({selectedForComparison.length})
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            Comparison snapshot will be added here later.
          </div>
        </div>
      </div>
    </div>
  );
}