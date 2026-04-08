import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function getThumb(product = {}, workspace = {}) {
  return (
    workspace?.thumbnailUrl ||
    product?.productThumbnailUrl ||
    product?.productThumbnailPreview ||
    (product?.productThumbnailBase64
      ? `data:image/*;base64,${product.productThumbnailBase64}`
      : "") ||
    (workspace?.thumbnailBase64
      ? `data:image/*;base64,${workspace.thumbnailBase64}`
      : "")
  );
}

function toScenarioRows(json) {
  if (!json) return [];
  return json.rows || json.items || json.scenarios || [];
}

function buildNextScenarioId(existingRows, requestId) {
  const nums = (existingRows || [])
    .map((row) => {
      const id =
        row?.pricing20Id ||
        row?.Pricing20ID ||
        row?.scenarioId ||
        row?.ScenarioID ||
        "";
      const match = String(id).match(/(\d+)$/);
      return match ? Number(match[1]) : 0;
    })
    .filter((n) => Number.isFinite(n));

  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${requestId}-P20-${String(next).padStart(2, "0")}`;
}

function StatusBadge({ status }) {
  const s = String(status || "").trim().toLowerCase();

  let cls = "bg-gray-100 text-gray-700";
  if (s === "pending pricing") cls = "bg-orange-100 text-orange-700";
  if (s === "draft") cls = "bg-gray-100 text-gray-700";
  if (s === "final") cls = "bg-green-100 text-green-700";
  if (s === "archived") cls = "bg-slate-100 text-slate-700";

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${cls}`}>
      {status || "—"}
    </span>
  );
}

export default function Pricing20Workspace() {
  const { requestId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workspace, setWorkspace] = useState(null);
  const [requestData, setRequestData] = useState(null);
  const [engineeringData, setEngineeringData] = useState(null);
  const [scenarioRows, setScenarioRows] = useState([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const [workspaceRes, requestRes, engineeringRes, scenariosRes] =
          await Promise.allSettled([
            fetch(`/.netlify/functions/get-pricing20-workspace?requestId=${requestId}`),
            fetch(`/.netlify/functions/get-request?requestId=${requestId}`),
            fetch(`/.netlify/functions/get-engineering-data?requestId=${requestId}`),
            fetch(`/.netlify/functions/list-pricing20-scenarios?requestId=${requestId}`),
          ]);

        let workspaceJson = null;
        let requestJson = null;
        let engineeringJson = null;
        let scenariosJson = null;

        if (workspaceRes.status === "fulfilled") {
          workspaceJson = await workspaceRes.value.json();
        }
        if (requestRes.status === "fulfilled") {
          requestJson = await requestRes.value.json();
        }
        if (engineeringRes.status === "fulfilled") {
          engineeringJson = await engineeringRes.value.json();
        }
        if (scenariosRes.status === "fulfilled") {
          scenariosJson = await scenariosRes.value.json();
        }

        const reqPayload = requestJson?.success ? requestJson.payload || {} : {};
        const engPayload =
          engineeringJson?.success ? engineeringJson.engineeringData || {} : {};
        const workspacePayload =
          workspaceJson?.success
            ? workspaceJson.workspace || workspaceJson.item || workspaceJson.row || null
            : null;

        if (!reqPayload || Object.keys(reqPayload).length === 0) {
          setError("Failed to load request data.");
          setLoading(false);
          return;
        }

        setRequestData(reqPayload);
        setEngineeringData(engPayload || {});
        setWorkspace(
          workspacePayload || {
            requestId,
            status: "Pending pricing",
            customerName:
              reqPayload?.customer?.customers?.[0]?.customerName || "",
            projectName: reqPayload?.project?.projectName || "",
            productType: reqPayload?.product?.productType || "",
            material:
              reqPayload?.product?.productMaterial ||
              reqPayload?.product?.sheetMaterial ||
              "",
            thumbnailUrl:
              reqPayload?.product?.productThumbnailUrl ||
              reqPayload?.product?.productThumbnailPreview ||
              "",
            thumbnailBase64: reqPayload?.product?.productThumbnailBase64 || "",
          }
        );

        setScenarioRows(toScenarioRows(scenariosJson));
      } catch (err) {
        console.error("Pricing20Workspace load error:", err);
        setError("Failed to load Pricing 2.0 workspace.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [requestId]);

  const product = requestData?.product || {};
  const project = requestData?.project || {};
  const primaryCustomer = requestData?.customer?.customers?.[0] || {};
  const thumb = getThumb(product, workspace || {});
  const isSheet = product?.productType === "Sheet Roll";

  const sortedScenarios = useMemo(() => {
    return [...scenarioRows].sort((a, b) => {
      const aTime = new Date(
        a?.updatedAt || a?.UpdatedAt || a?.createdAt || a?.CreatedAt || 0
      ).getTime();
      const bTime = new Date(
        b?.updatedAt || b?.UpdatedAt || b?.createdAt || b?.CreatedAt || 0
      ).getTime();
      return bTime - aTime;
    });
  }, [scenarioRows]);

  const createScenario = async () => {
    try {
      setCreating(true);

      const pricing20Id = buildNextScenarioId(sortedScenarios, requestId);

      const res = await fetch("/.netlify/functions/save-pricing20-scenario", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          pricing20Id,
          scenarioName: "",
          createdBy: "",
          scenarioStatus: "Draft",
          pricing20Data: {},
        }),
      });

      const json = await res.json();

      if (!json.success) {
        alert(json.error || "Failed to create Pricing 2.0 scenario");
        return;
      }

      window.location.href = `/pricing20/${requestId}/scenario/${pricing20Id}`;
    } catch (err) {
      console.error(err);
      alert("Failed to create Pricing 2.0 scenario");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading Pricing 2.0 workspace...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!requestData) {
    return (
      <div className="p-6">
        Failed to load Pricing 2.0 workspace.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-sm text-gray-500">Pricing 2.0 Workspace</div>
            <div className="text-2xl font-bold">{requestId}</div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Link
              to="/pricing20-dashboard"
              className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100 bg-white"
            >
              ← Pricing 2.0 Dashboard
            </Link>

            <Link
              to={`/engineering/${requestId}`}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100 bg-white"
            >
              Open Engineering
            </Link>

            <button
              type="button"
              onClick={createScenario}
              disabled={creating}
              className={`rounded-lg px-4 py-2 text-sm text-white ${
                creating ? "bg-gray-400" : "bg-black hover:bg-gray-800"
              }`}
            >
              {creating ? "Creating..." : "+ New Scenario"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border bg-white shadow-sm p-5">
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

            <div className="flex-1 min-w-[260px]">
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Project
              </div>
              <div className="text-2xl font-semibold">
                {project.projectName || workspace?.projectName || "—"}
              </div>
              <div className="text-sm text-blue-600 font-medium">
                {isSheet ? "Sheet Product Flow" : "Thermoformed Product Flow"}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {primaryCustomer.customerName || workspace?.customerName || "—"} •{" "}
                {product.productType || workspace?.productType || "—"} •{" "}
                {product.productMaterial || product.sheetMaterial || workspace?.material || "—"}
              </div>
            </div>

            <div className="min-w-[220px] space-y-2">
              <div className="text-sm">
                <span className="text-gray-500">Workspace Status: </span>
                <StatusBadge status={workspace?.status || "Pending pricing"} />
              </div>
              <div className="text-sm text-gray-500">
                Scenarios: {sortedScenarios.length}
              </div>
              <div className="text-sm text-gray-500">
                Engineering loaded:{" "}
                {engineeringData && Object.keys(engineeringData).length > 0 ? "Yes" : "No"}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-semibold">Pricing 2.0 Scenarios</h2>
            <span className="text-sm text-gray-500">
              {sortedScenarios.length} scenario(s)
            </span>
          </div>

          {sortedScenarios.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-sm text-gray-500">
              No Pricing 2.0 scenarios yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {sortedScenarios.map((row) => {
                const pricing20Id =
                  row?.pricing20Id ||
                  row?.Pricing20ID ||
                  row?.scenarioId ||
                  row?.ScenarioID ||
                  "";

                const scenarioName =
                  row?.scenarioName ||
                  row?.ScenarioName ||
                  "Untitled Scenario";

                const createdBy =
                  row?.createdBy ||
                  row?.CreatedBy ||
                  "—";

                const scenarioStatus =
                  row?.scenarioStatus ||
                  row?.ScenarioStatus ||
                  "Draft";

                const updatedAt =
                  row?.updatedAt ||
                  row?.UpdatedAt ||
                  row?.createdAt ||
                  row?.CreatedAt ||
                  "";

                return (
                  <div
                    key={pricing20Id}
                    className="rounded-2xl border bg-gray-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="font-semibold">{scenarioName}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          {pricing20Id || "—"}
                        </div>
                      </div>

                      <StatusBadge status={scenarioStatus} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-sm">
                      <div className="rounded-xl border bg-white p-3">
                        <div className="text-xs text-gray-500">Created By</div>
                        <div className="font-medium">{createdBy}</div>
                      </div>

                      <div className="rounded-xl border bg-white p-3">
                        <div className="text-xs text-gray-500">Last Updated</div>
                        <div className="font-medium">{fmtDate(updatedAt)}</div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <Link
                        to={`/pricing20/${requestId}/scenario/${pricing20Id}`}
                        className="inline-flex rounded-lg bg-black text-white px-4 py-2 text-sm hover:bg-gray-800"
                      >
                        Open Scenario
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}