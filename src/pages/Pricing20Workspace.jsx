import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

function uid() {
  return `p20-${Math.random().toString(36).slice(2, 10)}`;
}

function safeJsonParse(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function sortByUpdatedDesc(rows) {
  return [...(rows || [])].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  });
}

export default function Pricing20Workspace() {
  const { requestId } = useParams();

  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [workspaceRes, scenariosRes, requestRes] = await Promise.allSettled([
        fetch(`/.netlify/functions/get-pricing20-workspace?requestId=${requestId}`),
        fetch(`/.netlify/functions/list-pricing20-scenarios?requestId=${requestId}`),
        fetch(`/.netlify/functions/get-request?requestId=${requestId}`),
      ]);

      let workspaceJson = { success: false };
      let scenariosJson = { success: false, scenarios: [] };
      let requestJson = { success: false };

      if (workspaceRes.status === "fulfilled") {
        const text = await workspaceRes.value.text();
        workspaceJson = safeJsonParse(text, { success: false });
      }

      if (scenariosRes.status === "fulfilled") {
        const text = await scenariosRes.value.text();
        scenariosJson = safeJsonParse(text, { success: false, scenarios: [] });
      }

      if (requestRes.status === "fulfilled") {
        const text = await requestRes.value.text();
        requestJson = safeJsonParse(text, { success: false });
      }

      const fallbackRequestPayload = requestJson.success ? requestJson.payload || {} : {};
      const fallbackProduct = fallbackRequestPayload.product || {};
      const fallbackProject = fallbackRequestPayload.project || {};
      const fallbackCustomer =
        fallbackRequestPayload.customer?.customers?.[0]?.customerName || "";

      const ws =
        workspaceJson.success && workspaceJson.workspace
          ? workspaceJson.workspace
          : {
              requestId,
              status: "Pending pricing",
              customerName: fallbackCustomer,
              projectName: fallbackProject.projectName || requestId,
              productName: fallbackProject.projectName || fallbackProduct.productType || "",
              productType: fallbackProduct.productType || "",
              material: fallbackProduct.productMaterial || fallbackProduct.sheetMaterial || "",
              thumbnailUrl:
                fallbackProduct.productThumbnailUrl ||
                fallbackProduct.productThumbnailPreview ||
                "",
              thumbnailBase64: fallbackProduct.productThumbnailBase64 || "",
              engineeringSnapshotJson: "",
            };

      setWorkspace(ws);
      setScenarios(sortByUpdatedDesc(scenariosJson.scenarios || []));
    } catch (err) {
      console.error("Pricing20Workspace load error:", err);
      setError("Failed to load Pricing 2.0 workspace");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [requestId]);

  const createScenario = async () => {
    try {
      setCreating(true);
      const scenarioId = uid();
      window.location.href = `/pricing20/${requestId}/scenario/${scenarioId}`;
    } catch (err) {
      console.error(err);
      alert("Failed to create Pricing 2.0 scenario");
    } finally {
      setCreating(false);
    }
  };

  const duplicateScenario = async (scenarioId) => {
    try {
      setDuplicatingId(scenarioId);

      const getRes = await fetch(
        `/.netlify/functions/get-pricing20-scenario?requestId=${requestId}&scenarioId=${scenarioId}`
      );
      const getJson = await getRes.json();

      if (!getJson.success) {
        alert(getJson.error || "Failed to load scenario for duplication");
        return;
      }

      const originalScenarioData = getJson.scenarioData || {};
      const originalSetup = originalScenarioData.scenarioSetup || {};

      const newScenarioId = uid();
      const duplicatedScenarioData = {
        ...originalScenarioData,
        scenarioSetup: {
          ...originalSetup,
          scenarioName: `${originalSetup.scenarioName || "Scenario"} Copy`,
          scenarioDate: new Date().toISOString().slice(0, 10),
        },
      };

      const saveRes = await fetch("/.netlify/functions/save-pricing20-scenario", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          scenarioId: newScenarioId,
          scenarioData: duplicatedScenarioData,
        }),
      });

      const saveJson = await saveRes.json();

      if (!saveJson.success) {
        alert(saveJson.error || "Failed to duplicate scenario");
        return;
      }

      await loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to duplicate scenario");
    } finally {
      setDuplicatingId("");
    }
  };

  const thumb = useMemo(() => {
    if (!workspace) return "";
    return (
      workspace.thumbnailUrl ||
      (workspace.thumbnailBase64
        ? `data:image/*;base64,${workspace.thumbnailBase64}`
        : "")
    );
  }, [workspace]);

  if (loading) {
    return <div className="p-6">Loading Pricing 2.0 workspace...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>

          <Link
            to="/pricing20-dashboard"
            className="inline-flex rounded-lg border px-4 py-2 text-sm hover:bg-gray-100 bg-white"
          >
            ← Back to Pricing 2.0 Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return <div className="p-6">Workspace not found.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="rounded-2xl border bg-white shadow-sm p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4 flex-wrap">
              {thumb ? (
                <img
                  src={thumb}
                  alt="Product thumbnail"
                  className="w-20 h-20 rounded-xl border object-cover bg-white"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl border bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                  No image
                </div>
              )}

              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">
                  Pricing 2.0 Workspace
                </div>
                <div className="text-2xl font-semibold">
                  {workspace.projectName || requestId}
                </div>
                <div className="text-sm text-gray-500">
                  {workspace.customerName || "—"} • {workspace.productType || "—"} • Request:{" "}
                  {workspace.requestId || requestId}
                </div>
                <div className="text-sm text-blue-600 mt-1">
                  Status: {workspace.status || "Pending pricing"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Link
                to="/pricing20-dashboard"
                className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100 bg-white"
              >
                ← Dashboard
              </Link>

              <button
                type="button"
                onClick={loadData}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100 bg-white"
              >
                Refresh
              </button>

              <button
                type="button"
                onClick={createScenario}
                disabled={creating}
                className="rounded-lg bg-black text-white px-4 py-2 text-sm hover:bg-gray-800"
              >
                {creating ? "Creating..." : "+ New Scenario"}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-semibold">Scenarios</h2>
            <span className="text-sm text-gray-500">{scenarios.length} scenario(s)</span>
          </div>

          {scenarios.length === 0 ? (
            <div className="text-sm text-gray-500">
              No Pricing 2.0 scenarios yet. Create the first scenario.
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {scenarios.map((row) => (
                <div key={row.scenarioId} className="rounded-xl border bg-gray-50 p-4">
                  <div className="font-semibold">
                    {row.scenarioName || row.scenarioId}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    By {row.createdBy || "—"} • {row.scenarioDate || "—"} •{" "}
                    {row.scenarioStatus || "Draft"}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Updated: {row.updatedAt || row.createdAt || "—"}
                  </div>

                  <div className="mt-4 flex items-center gap-2 flex-wrap">
                    <Link
                      to={`/pricing20/${requestId}/scenario/${row.scenarioId}`}
                      className="inline-flex rounded-lg bg-black text-white px-4 py-2 text-sm hover:bg-gray-800"
                    >
                      Open Scenario
                    </Link>

                    <button
                      type="button"
                      onClick={() => duplicateScenario(row.scenarioId)}
                      disabled={duplicatingId === row.scenarioId}
                      className="inline-flex rounded-lg border px-4 py-2 text-sm bg-white hover:bg-gray-100"
                    >
                      {duplicatingId === row.scenarioId ? "Duplicating..." : "Duplicate"}
                    </button>
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