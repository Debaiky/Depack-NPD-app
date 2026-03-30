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

  const sheetTotal =
    pricingData?.sheetSummary?.totalPerTon ||
    pricingData?.pricing?.sheetSummary?.totalPerTon ||
    scenario.TotalCostPer1000;

  const thermoTotal =
    pricingData?.thermo?.summary?.totalPer1000 || "";

  const payback =
    pricingData?.thermo?.summary?.paybackQtyPcs || "";

  const selling =
    scenario.SellingPricePer1000 ||
    pricingData?.thermo?.finance?.desiredPricePer1000 ||
    "";

  return {
    sheetTotal: sheetTotal || "",
    thermoTotal: thermoTotal || "",
    selling,
    payback,
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

  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);
  const [workspaceHasPassword, setWorkspaceHasPassword] = useState(false);
  const [workspaceUnlocked, setWorkspaceUnlocked] = useState(false);

  const [setupPassword, setSetupPassword] = useState("");
  const [setupPasswordConfirm, setSetupPasswordConfirm] = useState("");

  const [enterPassword, setEnterPassword] = useState("");

  const [changeOldPassword, setChangeOldPassword] = useState("");
  const [changeNewPassword, setChangeNewPassword] = useState("");
  const [changeNewPasswordConfirm, setChangeNewPasswordConfirm] = useState("");

  const [workspacePasswordValue, setWorkspacePasswordValue] = useState("");

  useEffect(() => {
    const remembered = localStorage.getItem("pricingCreatedBy") || "";
    setCreatedBy(remembered);
  }, []);

  useEffect(() => {
    loadWorkspaceGate();
  }, [requestId]);

  const loadWorkspaceGate = async () => {
    try {
      setLoading(true);
      setError("");

      const [reqRes, wsRes] = await Promise.all([
        fetch(`/.netlify/functions/get-request?requestId=${requestId}`),
        fetch(`/.netlify/functions/get-pricing-workspace?requestId=${requestId}`),
      ]);

      const reqJson = await reqRes.json();
      const wsJson = await wsRes.json();

      if (!reqJson.success) {
        setError(reqJson.error || "Failed to load project");
        setLoading(false);
        return;
      }

      setRequestData(reqJson.payload || {});

      if (!wsJson.success) {
        setError(wsJson.error || "Failed to load pricing workspace");
        setLoading(false);
        return;
      }

      const workspace = wsJson.workspace || null;
      const hasPassword = !!workspace?.WorkspacePassword;

      setWorkspaceHasPassword(hasPassword);
      setWorkspacePasswordValue(workspace?.WorkspacePassword || "");
      setWorkspaceLoaded(true);

      if (!hasPassword) {
        setWorkspaceUnlocked(false);
        setLoading(false);
        return;
      }

      setWorkspaceUnlocked(false);
      setLoading(false);
    } catch (err) {
      console.error("Pricing workspace load error:", err);
      setError("Failed to load pricing workspace");
      setLoading(false);
    }
  };

  const loadScenarioList = async () => {
    try {
      const scRes = await fetch(
        `/.netlify/functions/list-pricing-scenarios?requestId=${requestId}`
      );
      const scJson = await scRes.json();

      if (scJson.success) {
        setScenarios(Array.isArray(scJson.scenarios) ? scJson.scenarios : []);
      } else {
        setScenarios([]);
      }
    } catch (err) {
      console.error("Scenario list load error:", err);
      setScenarios([]);
    }
  };

  useEffect(() => {
    if (workspaceUnlocked) {
      loadScenarioList();
    }
  }, [workspaceUnlocked, requestId]);

  const summary = useMemo(() => {
    const customer = requestData?.customer || {};
    const product = requestData?.product || {};
    return {
      customerName: customer.customerName || "—",
      projectName: customer.projectName || "—",
      productType: product.productType || "—",
      thumbnail:
        product?.productThumbnailPreview ||
        (product?.productThumbnailBase64
          ? `data:image/*;base64,${product.productThumbnailBase64}`
          : ""),
    };
  }, [requestData]);

  const scenarioRows = useMemo(() => {
    return scenarios.map((s) => ({
      ...s,
      metrics: extractScenarioMetrics(s),
      compareSelected: (s.CompareSelected || "") === "Yes",
    }));
  }, [scenarios]);

  const selectedForComparison = useMemo(() => {
    return scenarioRows.filter((s) => s.compareSelected);
  }, [scenarioRows]);

  const setFirstPassword = async () => {
    if (!setupPassword || !setupPasswordConfirm) {
      alert("Please enter and confirm the workspace password.");
      return;
    }

    if (setupPassword !== setupPasswordConfirm) {
      alert("Passwords do not match.");
      return;
    }

    try {
      const res = await fetch("/.netlify/functions/set-pricing-workspace-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          password: setupPassword,
        }),
      });

      const json = await res.json();

      if (!json.success) {
        alert(json.error || "Failed to save workspace password");
        return;
      }

      setWorkspaceHasPassword(true);
      setWorkspacePasswordValue(setupPassword);
      setWorkspaceUnlocked(true);
      setSetupPassword("");
      setSetupPasswordConfirm("");
      await loadScenarioList();
    } catch (err) {
      console.error(err);
      alert("Failed to save workspace password");
    }
  };

  const unlockWorkspace = async () => {
    if (!enterPassword) {
      alert("Please enter the workspace password.");
      return;
    }

    if (enterPassword !== workspacePasswordValue) {
      alert("Incorrect workspace password.");
      return;
    }

    setWorkspaceUnlocked(true);
    setEnterPassword("");
    await loadScenarioList();
  };

  const changePassword = async () => {
    if (!changeOldPassword || !changeNewPassword || !changeNewPasswordConfirm) {
      alert("Please complete all password fields.");
      return;
    }

    if (changeNewPassword !== changeNewPasswordConfirm) {
      alert("New passwords do not match.");
      return;
    }

    try {
      const res = await fetch("/.netlify/functions/change-pricing-workspace-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          oldPassword: changeOldPassword,
          newPassword: changeNewPassword,
        }),
      });

      const json = await res.json();

      if (!json.success) {
        alert(json.error || "Failed to change password");
        return;
      }

      alert("Workspace password changed successfully.");
      setWorkspacePasswordValue(changeNewPassword);
      setChangeOldPassword("");
      setChangeNewPassword("");
      setChangeNewPasswordConfirm("");
    } catch (err) {
      console.error(err);
      alert("Failed to change password");
    }
  };

  const createScenario = async () => {
    try {
      if (!newScenarioName.trim()) {
        alert("Scenario name is required.");
        return;
      }

      if (!newScenarioNote.trim()) {
        alert("Scenario note is required.");
        return;
      }

      const author = createdBy.trim();
      localStorage.setItem("pricingCreatedBy", author);

      const res = await fetch("/.netlify/functions/save-pricing-scenario", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          scenarioName: newScenarioName.trim(),
          scenarioNote: newScenarioNote.trim(),
          createdBy: author,
          scenarioStatus: "Draft",
          compareSelected: false,
          scenarioCurrency: "",
          usdEgp: "",
          eurUsd: "",
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

      navigate(`/pricing/${requestId}/scenario/${json.pricingId}`);
    } catch (err) {
      console.error(err);
      alert("Failed to duplicate scenario");
    }
  };

  const toggleCompareSelected = async (scenario) => {
    const currentlySelected = (scenario.CompareSelected || "") === "Yes";
    const selectedCount = scenarioRows.filter((s) => (s.CompareSelected || "") === "Yes").length;

    if (!currentlySelected && selectedCount >= 4) {
      alert("You can compare a maximum of 4 scenarios at a time.");
      return;
    }

    try {
      const pricingData = parsePricingJson(scenario.PricingJSON);

      const res = await fetch("/.netlify/functions/save-pricing-scenario", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: scenario.RequestID,
          pricingId: scenario.PricingID,
          scenarioName: scenario.ScenarioName || "",
          scenarioNote: scenario.ScenarioNote || "",
          createdBy: scenario.CreatedBy || "",
          scenarioStatus: scenario.ScenarioStatus || "Draft",
          compareSelected: !currentlySelected,
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

      await loadScenarioList();
    } catch (err) {
      console.error(err);
      alert("Failed to update comparison selection");
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

  if (!workspaceLoaded) {
    return <div className="p-6">Loading workspace...</div>;
  }

  if (!workspaceHasPassword) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold">Pricing Workspace Setup</h1>
              <p className="text-sm text-gray-500">{requestId}</p>
            </div>

            <Link
              to="/pricing-dashboard"
              className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100 bg-white"
            >
              ← Pricing Dashboard
            </Link>
          </div>

          <div className="rounded-2xl border bg-white shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold">Set Workspace Password</h2>
            <p className="text-sm text-gray-500">
              This project does not have a pricing workspace password yet. Create one now.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">New Password</div>
                <input
                  type="password"
                  className="w-full border rounded-lg p-2"
                  value={setupPassword}
                  onChange={(e) => setSetupPassword(e.target.value)}
                />
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-1">Confirm Password</div>
                <input
                  type="password"
                  className="w-full border rounded-lg p-2"
                  value={setupPasswordConfirm}
                  onChange={(e) => setSetupPasswordConfirm(e.target.value)}
                />
              </div>
            </div>

            <button
              onClick={setFirstPassword}
              className="rounded-lg bg-black text-white px-4 py-2"
            >
              Save Password and Open Workspace
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!workspaceUnlocked) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold">Pricing Workspace</h1>
              <p className="text-sm text-gray-500">{requestId}</p>
            </div>

            <Link
              to="/pricing-dashboard"
              className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100 bg-white"
            >
              ← Pricing Dashboard
            </Link>
          </div>

          <div className="rounded-2xl border bg-white shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold">Enter Workspace Password</h2>

            <div>
              <div className="text-xs text-gray-500 mb-1">Password</div>
              <input
                type="password"
                className="w-full border rounded-lg p-2"
                value={enterPassword}
                onChange={(e) => setEnterPassword(e.target.value)}
              />
            </div>

            <button
              onClick={unlockWorkspace}
              className="rounded-lg bg-black text-white px-4 py-2"
            >
              Open Workspace
            </button>
          </div>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
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
        </div>

        <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
          <h2 className="text-lg font-semibold">Change Workspace Password</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">Old Password</div>
              <input
                type="password"
                className="w-full border rounded-lg p-2"
                value={changeOldPassword}
                onChange={(e) => setChangeOldPassword(e.target.value)}
              />
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1">New Password</div>
              <input
                type="password"
                className="w-full border rounded-lg p-2"
                value={changeNewPassword}
                onChange={(e) => setChangeNewPassword(e.target.value)}
              />
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1">Confirm New Password</div>
              <input
                type="password"
                className="w-full border rounded-lg p-2"
                value={changeNewPasswordConfirm}
                onChange={(e) => setChangeNewPasswordConfirm(e.target.value)}
              />
            </div>
          </div>

          <button
            onClick={changePassword}
            className="rounded-lg border px-4 py-2 bg-white hover:bg-gray-50"
          >
            Change Password
          </button>
        </div>

        <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
          <h2 className="text-lg font-semibold">Create New Scenario</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">Scenario Name</div>
              <input
                className={`w-full border rounded-lg p-2 ${
                  !newScenarioName.trim() ? "border-red-300 bg-red-50" : ""
                }`}
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
              className={`w-full border rounded-lg p-2 ${
                !newScenarioNote.trim() ? "border-red-300 bg-red-50" : ""
              }`}
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
                <th className="p-3">Compare</th>
                <th className="p-3">Pricing ID</th>
                <th className="p-3">Scenario Name</th>
                <th className="p-3">Created Date</th>
                <th className="p-3">Created By</th>
                <th className="p-3">Status</th>
                <th className="p-3">Currency</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>

            <tbody>
              {scenarioRows.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-6 text-center text-gray-500">
                    No pricing scenarios saved yet.
                  </td>
                </tr>
              ) : (
                scenarioRows.map((s) => (
                  <tr key={s.PricingID} className="border-t">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={s.compareSelected}
                        onChange={() => toggleCompareSelected(s)}
                      />
                    </td>
                    <td className="p-3 font-medium">{s.PricingID}</td>
                    <td className="p-3">{s.ScenarioName || "—"}</td>
                    <td className="p-3">{s.CreatedDate || "—"}</td>
                    <td className="p-3">{s.CreatedBy || "—"}</td>
                    <td className="p-3">
                      <ScenarioStatusBadge status={s.ScenarioStatus} />
                    </td>
                    <td className="p-3">{s.ScenarioCurrency || "—"}</td>
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
          <div className="p-4 border-b flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-lg font-semibold">Scenario Comparison</h2>
            <button
              onClick={openComparison}
              className="rounded-lg bg-black text-white px-4 py-2"
            >
              Compare Selected ({selectedForComparison.length}/4)
            </button>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-3">Scenario</th>
                <th className="p-3">Status</th>
                <th className="p-3">Currency</th>
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
                  <td colSpan="8" className="p-6 text-center text-gray-500">
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
                    <td className="p-3">{s.ScenarioCurrency || "—"}</td>
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