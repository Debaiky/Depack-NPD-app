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
  const [newScenarioName, setNewScenarioName] = useState("");
  const [newScenarioNote, setNewScenarioNote] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [workspacePassword, setWorkspacePassword] = useState("");
  const [enteredPassword, setEnteredPassword] = useState("");
  const [passwordMode, setPasswordMode] = useState("unlock");
  const [passwordUnlocked, setPasswordUnlocked] = useState(false);
  const [changePasswordData, setChangePasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const remembered = localStorage.getItem("pricingCreatedBy") || "";
    setCreatedBy(remembered);
  }, []);

 useEffect(() => {
  load(false);
}, [requestId]);

 const load = async (preserveUnlocked = false) => {
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
      const rows = Array.isArray(scJson.scenarios) ? scJson.scenarios : [];
      setScenarios(rows);

      const savedPassword =
        rows.map((x) => x.WorkspacePassword || "").find((x) => x.trim() !== "") || "";

      setWorkspacePassword(savedPassword);

      if (preserveUnlocked) {
        setPasswordUnlocked(true);
        setPasswordMode("unlocked");
      } else if (savedPassword) {
        setPasswordMode("unlock");
        setPasswordUnlocked(false);
      } else {
        setPasswordMode("setup");
        setPasswordUnlocked(false);
      }
    }
  } catch (err) {
    console.error("Pricing workspace load error:", err);
    setError("Failed to load pricing workspace");
  } finally {
    setLoading(false);
  }
};

  const summary = useMemo(() => {
  const customerBlock = requestData?.customer || {};
  const primaryCustomer = customerBlock?.customers?.[0] || {};
  const product = requestData?.product || {};
  const project = requestData?.project || {};

  return {
    customerName: primaryCustomer.customerName || "—",
    projectName: project.projectName || "—",
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
    }));
  }, [scenarios]);

  const selectedForComparison = useMemo(() => {
    return scenarioRows.filter((s) => (s.CompareSelected || "") === "Yes");
  }, [scenarioRows]);

const saveWorkspacePassword = async () => {
  try {
    const newPassword = enteredPassword.trim();

    if (!newPassword) {
      alert("Please enter a workspace password.");
      return;
    }

    if (workspacePassword) {
      if (newPassword === workspacePassword) {
        setPasswordUnlocked(true);
        setPasswordMode("unlocked");
        setEnteredPassword("");
        return;
      }

      alert("There is already a password set. Please unlock instead.");
      setPasswordMode("unlock");
      return;
    }

    const res = await fetch("/.netlify/functions/save-pricing-scenario", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requestId,
        scenarioName: "Workspace Setup",
        scenarioNote: "Workspace password record",
        createdBy: createdBy || "",
        scenarioStatus: "Draft",
        pricingData: {},
        workspacePassword: newPassword,
      }),
    });

    const json = await res.json();

    if (!json.success) {
      alert(json.error || "Failed to save workspace password");
      return;
    }

    setWorkspacePassword(newPassword);
    setEnteredPassword("");
    await load(true);
  } catch (err) {
    console.error(err);
    alert("Failed to save workspace password");
  }
};
  const unlockWorkspace = () => {
  if (!workspacePassword) {
    setPasswordMode("setup");
    alert("No workspace password found. Please set one.");
    return;
  }

  if (enteredPassword === workspacePassword) {
    setPasswordUnlocked(true);
    setPasswordMode("unlocked");
    setEnteredPassword("");
  } else {
    alert("Wrong password");
  }
};

  const changeWorkspacePassword = async () => {
  try {
    if (changePasswordData.oldPassword !== workspacePassword) {
      alert("Old password is incorrect");
      return;
    }

    if (!changePasswordData.newPassword.trim()) {
      alert("Please enter a new password");
      return;
    }

    if (changePasswordData.newPassword !== changePasswordData.confirmPassword) {
      alert("New password and confirmation do not match");
      return;
    }

    const passwordHolderRow =
      scenarioRows.find((x) => (x.WorkspacePassword || "").trim() !== "") ||
      scenarioRows[0];

    if (!passwordHolderRow) {
      alert("No workspace row found to update password");
      return;
    }

    const res = await fetch("/.netlify/functions/save-pricing-scenario", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requestId,
        pricingId: passwordHolderRow.PricingID,
        scenarioName: passwordHolderRow.ScenarioName || "Workspace Setup",
        scenarioNote: passwordHolderRow.ScenarioNote || "",
        createdBy: passwordHolderRow.CreatedBy || createdBy || "",
        scenarioStatus: passwordHolderRow.ScenarioStatus || "Draft",
        pricingData: parsePricingJson(passwordHolderRow.PricingJSON || "{}"),
        totalCostPer1000: passwordHolderRow.TotalCostPer1000 || "",
        sellingPricePer1000: passwordHolderRow.SellingPricePer1000 || "",
        marginPct: passwordHolderRow.MarginPct || "",
        compareSelected: (passwordHolderRow.CompareSelected || "") === "Yes",
        scenarioCurrency: passwordHolderRow.ScenarioCurrency || "",
        usdEgp: passwordHolderRow.UsdEgp || "",
        eurUsd: passwordHolderRow.EurUsd || "",
        workspacePassword: changePasswordData.newPassword.trim(),
      }),
    });

    const json = await res.json();

    if (!json.success) {
      alert(json.error || "Failed to change workspace password");
      return;
    }

    setWorkspacePassword(changePasswordData.newPassword.trim());
    setChangePasswordData({
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    await load(true);
    alert("Workspace password changed");
  } catch (err) {
    console.error(err);
    alert("Failed to change workspace password");
  }
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
          scenarioName: newScenarioName || `Scenario ${scenarios.length + 1}`,
          scenarioNote: newScenarioNote || "",
          createdBy: author,
          scenarioStatus: "Draft",
          pricingData: {},
          workspacePassword,
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
          workspacePassword,
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
          workspacePassword,
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
            workspacePassword,
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

  if (!passwordUnlocked) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h1 className="text-2xl font-bold">Pricing Workspace Security</h1>
            <Link
              to="/pricing-dashboard"
              className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100 bg-white"
            >
              ← Pricing Dashboard
            </Link>
          </div>

          <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
            {passwordMode === "setup" ? (
              <>
                <h2 className="text-lg font-semibold">Set Workspace Password</h2>
                <p className="text-sm text-gray-600">
                  This is the first time this pricing workspace is being opened.
                  Please assign a password for this project workspace.
                </p>
                <input
                  type="password"
                  className="w-full border rounded-lg p-2"
                  value={enteredPassword}
                  onChange={(e) => setEnteredPassword(e.target.value)}
                  placeholder="Enter workspace password"
                />
                <button
                  onClick={saveWorkspacePassword}
                  className="w-full rounded-lg bg-black text-white px-4 py-2"
                >
                  Save Password and Continue
                </button>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold">Unlock Workspace</h2>
                <p className="text-sm text-gray-600">
                  Please enter the pricing workspace password.
                </p>
                <input
                  type="password"
                  className="w-full border rounded-lg p-2"
                  value={enteredPassword}
                  onChange={(e) => setEnteredPassword(e.target.value)}
                  placeholder="Enter workspace password"
                />
                <button
                  onClick={unlockWorkspace}
                  className="w-full rounded-lg bg-black text-white px-4 py-2"
                >
                  Unlock
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {summary.thumbnail ? (
              <img
                src={summary.thumbnail}
                alt="Product thumbnail"
                className="w-16 h-16 rounded-xl border object-cover bg-white"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl border bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                No image
              </div>
            )}

            <div>
              <h1 className="text-2xl font-bold">Pricing Workspace</h1>
              <p className="text-sm text-gray-500">{requestId}</p>
            </div>
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
          <h2 className="text-lg font-semibold">Change Workspace Password</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">Old Password</div>
              <input
                type="password"
                className="w-full border rounded-lg p-2"
                value={changePasswordData.oldPassword}
                onChange={(e) =>
                  setChangePasswordData({
                    ...changePasswordData,
                    oldPassword: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1">New Password</div>
              <input
                type="password"
                className="w-full border rounded-lg p-2"
                value={changePasswordData.newPassword}
                onChange={(e) =>
                  setChangePasswordData({
                    ...changePasswordData,
                    newPassword: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1">Confirm New Password</div>
              <input
                type="password"
                className="w-full border rounded-lg p-2"
                value={changePasswordData.confirmPassword}
                onChange={(e) =>
                  setChangePasswordData({
                    ...changePasswordData,
                    confirmPassword: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <button
            onClick={changeWorkspacePassword}
            className="rounded-lg bg-black text-white px-4 py-2"
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
                <th className="p-3">Compare</th>
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
                  <td colSpan="7" className="p-6 text-center text-gray-500">
                    No pricing scenarios saved yet.
                  </td>
                </tr>
              ) : (
                scenarioRows.map((s) => (
                  <tr key={s.PricingID} className="border-t">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={(s.CompareSelected || "") === "Yes"}
                        onChange={(e) => toggleScenarioComparison(s, e.target.checked)}
                      />
                    </td>
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
            <h2 className="text-lg font-semibold">Scenario Comparison Snapshot</h2>
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