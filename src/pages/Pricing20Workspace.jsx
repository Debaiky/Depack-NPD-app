import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

function makeScenarioId() {
  return `P20-${Date.now()}`;
}

export default function Pricing20Workspace() {
  const { requestId } = useParams();

  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState(null);
  const [scenarios, setScenarios] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const reqRes = await fetch(`/.netlify/functions/get-request?requestId=${requestId}`);
        const reqJson = await reqRes.json();

        if (reqJson.success) {
          setPayload(reqJson.payload || null);
        }

        try {
          const sRes = await fetch(`/.netlify/functions/list-pricing20-scenarios?requestId=${requestId}`);
          const sJson = await sRes.json();
          if (sJson.success) {
            setScenarios(sJson.rows || sJson.scenarios || []);
          } else {
            setScenarios([]);
          }
        } catch {
          setScenarios([]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [requestId]);

  if (loading) return <div className="p-6">Loading Pricing 2.0 workspace...</div>;
  if (!payload) return <div className="p-6">Failed to load workspace.</div>;

  const product = payload?.product || {};
  const project = payload?.project || {};
  const customerBlock = payload?.customer || {};
  const primaryCustomer = customerBlock?.customers?.[0] || {};

  const thumb =
    product?.productThumbnailUrl ||
    product?.productThumbnailPreview ||
    (product?.productThumbnailBase64
      ? `data:image/*;base64,${product.productThumbnailBase64}`
      : "");

  const newScenarioId = makeScenarioId();

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
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
                <div className="text-2xl font-semibold">{project.projectName || requestId}</div>
                <div className="text-sm text-gray-500">
                  {primaryCustomer.customerName || "—"} • {product.productType || "—"} • {requestId}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/pricing20-dashboard"
                className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100 bg-white"
              >
                ← Pricing 2.0 Dashboard
              </Link>

              <Link
                to={`/pricing-2/${requestId}/scenario/${newScenarioId}`}
                className="rounded-lg bg-black text-white px-4 py-2 text-sm hover:bg-gray-800"
              >
                Create Scenario
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-semibold">Saved Scenarios</h2>
            <span className="text-sm text-gray-500">{scenarios.length} scenario(s)</span>
          </div>

          {scenarios.length === 0 ? (
            <div className="text-sm text-gray-500">No Pricing 2.0 scenarios yet.</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3">Scenario ID</th>
                    <th className="text-left p-3">Scenario Name</th>
                    <th className="text-left p-3">Created By</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarios.map((row, idx) => {
                    const scenarioId =
                      row?.scenarioId || row?.Pricing20ID || row?.id || `row-${idx}`;

                    return (
                      <tr key={scenarioId} className="border-t">
                        <td className="p-3">{scenarioId}</td>
                        <td className="p-3">{row?.scenarioName || row?.ScenarioName || "—"}</td>
                        <td className="p-3">{row?.createdBy || row?.CreatedBy || "—"}</td>
                        <td className="p-3">{row?.scenarioStatus || row?.ScenarioStatus || "—"}</td>
                        <td className="p-3">
                          <Link
                            to={`/pricing-2/${requestId}/scenario/${scenarioId}`}
                            className="text-blue-600 hover:underline"
                          >
                            Open
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}