import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

const PRICING_PASSWORD = "DepackPricing_2026";
const PRICING_SESSION_KEY = "depack_pricing_unlocked";

function StatusBadge({ status }) {
  const normalized = String(status || "").trim() || "Draft";

  const styles = {
    Draft: "bg-gray-100 text-gray-700 border-gray-200",
    Final: "bg-green-100 text-green-700 border-green-200",
    Archived: "bg-yellow-100 text-yellow-700 border-yellow-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
        styles[normalized] || "bg-gray-100 text-gray-700 border-gray-200"
      }`}
    >
      {normalized}
    </span>
  );
}

function IconButton({ title, onClick, children, active = false }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border transition ${
        active
          ? "bg-blue-50 border-blue-300 text-blue-700"
          : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

function parsePricingJson(jsonString) {
  try {
    return jsonString ? JSON.parse(jsonString) : {};
  } catch {
    return {};
  }
}

function isCompareSelected(value) {
  return value === true || value === "true" || value === "Yes" || value === "YES";
}

function buildEmptyScenarioPayload(createdBy = "") {
  return {
    scenarioSetup: {
      scenarioName: "",
      createdBy,
      scenarioStatus: "Draft",
      scenarioNote: "",
      currency: "",
      usdEgp: "",
      eurUsd: "",
      compareSelected: false,
    },
    engineeringScenario: {},
    bomScenario: {},
    investmentsScenario: {},
    resultsScenario: {},
    changeSummary: [],
    summary: {},
  };
}

export default function PricingWorkspace() {
  const { requestId } = useParams();
  const navigate = useNavigate();

  const [requestData, setRequestData] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [enteredPassword, setEnteredPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const remembered = localStorage.getItem("pricingCreatedBy") || "";
    setCreatedBy(remembered);

    const pricingUnlocked = sessionStorage.getItem(PRICING_SESSION_KEY) === "yes";
    if (pricingUnlocked) {
      setUnlocked(true);
    }
  }, []);

  useEffect(() => {
    loadWorkspace();
  }, [requestId]);

  const loadWorkspace = async () => {
    try {
      setLoading(true);
      setError("");

      const [reqRes, scRes] = await Promise.all([
        fetch(`/.netlify/functions/get-request?requestId=${requestId}`),
        fetch(`/.netlify/functions/list-pricing-scenarios?requestId=${requestId}`),
      ]);

      const reqJson = await reqRes.json();
      const scJson = await scRes.json();

      if (!reqJson.success) {
        setError(reqJson.error || "Failed to load request");
        setRequestData(null);
        setScenarios([]);
        return;
      }

      setRequestData(reqJson.payload || {});

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

  const product = requestData?.product || {};
  const project = requestData?.project || {};
  const customerBlock = requestData?.customer || {};
  const primaryCustomer = customerBlock?.customers?.[0] || {};

  const summary = useMemo(() => {
    return {
      customerName: primaryCustomer.customerName || "—",
      projectName: project.projectName || "—",
      productName: product.productName || product.productType || "—",
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
      .sort((a, b) => {
        const aNum = Number(String(a.PricingID || "").replace(/\D/g, "")) || 0;
        const bNum = Number(String(b.PricingID || "").replace(/\D/g, "")) || 0;
        return bNum - aNum;
      });
  }, [scenarios]);

  const selectedForComparison = useMemo(() => {
    return scenarioRows.filter((s) => isCompareSelected(s.CompareSelected));
  }, [scenarioRows]);

  const unlockWorkspace = () => {
    if (enteredPassword === PRICING_PASSWORD) {
      setUnlocked(true);
      sessionStorage.setItem(PRICING_SESSION_KEY, "yes");
      setEnteredPassword("");
      return;
    }

    alert("Wrong password");
  };

  const createScenario = async () => {
    try {
      setLoadingAction(true);
      const author = createdBy.trim();
      localStorage.setItem("pricingCreatedBy", author);

      const pricingData = buildEmptyScenarioPayload(author);

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
          compareSelected: false,
          scenarioCurrency: "",
          usdEgp: "",
          eurUsd: "",
          pricingData,
          totalCostPer1000: "",
          sellingPricePer1000: "",
          marginPct: "",
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
    } finally {
      setLoadingAction(false);
    }
  };

  const duplicateScenario = async (scenario) => {
    try {
      setLoadingAction(true);
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
          scenarioNote: scenario.ScenarioNote || "",
          createdBy: author || scenario.CreatedBy || "",
          scenarioStatus: "Draft",
          compareSelected: false,
          scenarioCurrency: scenario.ScenarioCurrency || "",
          usdEgp: scenario.UsdEgp || "",
          eurUsd: scenario.EurUsd || "",
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

      await loadWorkspace();
    } catch (err) {
      console.error(err);
      alert("Failed to duplicate scenario");
    } finally {
      setLoadingAction(false);
    }
  };

  const toggleScenarioComparison = async (scenario) => {
    try {
      setLoadingAction(true);

      const pricingData = parsePricingJson(scenario.PricingJSON);
      const newValue = !isCompareSelected(scenario.CompareSelected);

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
          compareSelected: newValue,
          scenarioCurrency: scenario.ScenarioCurrency || "",
          usdEgp: scenario.UsdEgp || "",
          eurUsd: scenario.EurUsd || "",
          pricingData,
          totalCostPer1000: scenario.TotalCostPer1000 || "",
          sellingPricePer1000: scenario.SellingPricePer1000 || "",
          marginPct: scenario.MarginPct || "",
        }),
      });

      const json = await res.json();

      if (!json.success) {
        alert(json.error || "Failed to update comparison selection");
        return;
      }

      await loadWorkspace();
    } catch (err) {
      console.error(err);
      alert("Failed to update comparison selection");
    } finally {
      setLoadingAction(false);
    }
  };

  const openComparison = () => {
    if (selectedForComparison.length === 0) {
      alert("Please select at least one scenario for comparison.");
      return;
    }

    navigate(`/pricing/${requestId}/compare`);
  };

  if (loading) {
    return <div className="p-6">Loading pricing workspace...</div>;
  }

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
              onKeyDown={(e) => {
                if (e.key === "Enter") unlockWorkspace();
              }}
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
                <div>
                  <span className="text-gray-500">Request No.:</span> {summary.requestId}
                </div>
                <div>
                  <span className="text-gray-500">Project:</span> {summary.projectName}
                </div>
                <div>
                  <span className="text-gray-500">Customer:</span> {summary.customerName}
                </div>
                <div>
                  <span className="text-gray-500">Product:</span> {summary.productName}
                </div>
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

        <div className="rounded-2xl border bg-white shadow-sm p-5">
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
                disabled={loadingAction}
                className={`rounded-lg px-4 py-2 text-white ${
                  loadingAction ? "bg-gray-400" : "bg-black hover:bg-gray-800"
                }`}
              >
                Create Scenario
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-semibold">Saved Scenarios</h2>

            <button
              onClick={openComparison}
              className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-500"
            >
              Open Comparison ({selectedForComparison.length})
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="p-3">Pricing ID</th>
                  <th className="p-3">Scenario Name</th>
                  <th className="p-3">Scenario Description</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 w-[180px]">Actions</th>
                </tr>
              </thead>

              <tbody>
                {scenarioRows.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-6 text-center text-gray-500">
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
                        <StatusBadge status={s.ScenarioStatus} />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <IconButton
                            title="Open scenario"
                            onClick={() =>
                              navigate(`/pricing/${requestId}/scenario/${s.PricingID}`)
                            }
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className="w-4 h-4"
                            >
                              <path d="M15 3h6v6" />
                              <path d="M10 14 21 3" />
                              <path d="M21 14v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            </svg>
                          </IconButton>

                          <IconButton
                            title="Duplicate scenario"
                            onClick={() => duplicateScenario(s)}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className="w-4 h-4"
                            >
                              <rect x="9" y="9" width="13" height="13" rx="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          </IconButton>

                          <IconButton
                            title={
                              isCompareSelected(s.CompareSelected)
                                ? "Remove from comparison"
                                : "Add to comparison"
                            }
                            onClick={() => toggleScenarioComparison(s)}
                            active={isCompareSelected(s.CompareSelected)}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className="w-4 h-4"
                            >
                              <path d="M10 3H5a2 2 0 0 0-2 2v5" />
                              <path d="M14 21h5a2 2 0 0 0 2-2v-5" />
                              <path d="M21 10V5a2 2 0 0 0-2-2h-5" />
                              <path d="M3 14v5a2 2 0 0 0 2 2h5" />
                              <path d="M8 8h8v8H8z" />
                            </svg>
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border bg-white shadow-sm p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <h2 className="text-lg font-semibold">Scenario Comparison Snapshot</h2>

            <button
              onClick={openComparison}
              className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-500"
            >
              Open Comparison ({selectedForComparison.length})
            </button>
          </div>

          {selectedForComparison.length === 0 ? (
            <div className="text-sm text-gray-500">
              No scenarios selected for comparison yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedForComparison.map((s) => (
                <div key={s.PricingID} className="rounded-xl border p-3 bg-gray-50">
                  <div className="font-medium">{s.ScenarioName || s.PricingID}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {s.ScenarioNote || "No description"}
                  </div>
                  <div className="mt-2">
                    <StatusBadge status={s.ScenarioStatus} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}