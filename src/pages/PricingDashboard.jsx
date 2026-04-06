import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const PRICING_PASSWORD = "DepackPricing_2026";
const PRICING_SESSION_KEY = "depack_pricing_unlocked";

function StatusBadge({ status }) {
  const styles = {
    "Pending Pricing": "bg-amber-100 text-amber-700 border-amber-200",
    "Pricing Completed": "bg-green-100 text-green-700 border-green-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
        styles[status] || "bg-gray-100 text-gray-700 border-gray-200"
      }`}
    >
      {status || "—"}
    </span>
  );
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function getRequestPayload(row) {
  return row?.payload || row || {};
}

function getRequestId(row) {
  const payload = getRequestPayload(row);
  return (
    payload?.metadata?.requestId ||
    payload?.requestId ||
    row?.requestId ||
    row?.RequestID ||
    row?.id ||
    ""
  );
}

function getCustomerName(payload) {
  const customerBlock = payload?.customer || {};
  const firstCustomer = normalizeArray(customerBlock?.customers)[0] || {};
  return firstCustomer?.customerName || customerBlock?.customerName || "—";
}

function getProjectName(payload) {
  return payload?.project?.projectName || "—";
}

function getProductType(payload) {
  return payload?.product?.productType || payload?.product?.productName || "—";
}

function getThumbnail(payload) {
  const product = payload?.product || {};
  return (
    product?.productThumbnailUrl ||
    product?.productThumbnailPreview ||
    (product?.productThumbnailBase64
      ? `data:image/*;base64,${product.productThumbnailBase64}`
      : "")
  );
}

function inferPricingStatus(payload, scenarios) {
  const metadataStatus = String(payload?.metadata?.status || "").trim().toLowerCase();
  const pricingStatus = String(payload?.metadata?.pricingStatus || "").trim().toLowerCase();

  const hasFinalScenario = scenarios.some(
    (s) => String(s?.ScenarioStatus || "").trim().toLowerCase() === "final"
  );

  if (
    pricingStatus === "pricing completed" ||
    pricingStatus === "completed" ||
    metadataStatus === "pricing completed" ||
    hasFinalScenario
  ) {
    return "Pricing Completed";
  }

  return "Pending Pricing";
}

function isPricingRelevant(payload, scenarios) {
  const metadataStatus = String(payload?.metadata?.status || "").trim().toLowerCase();
  const pricingStatus = String(payload?.metadata?.pricingStatus || "").trim().toLowerCase();

  if (
    pricingStatus.includes("pricing") ||
    metadataStatus.includes("pricing") ||
    scenarios.length > 0
  ) {
    return true;
  }

  return false;
}

function ProjectCard({ item, onOpen }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm p-4">
      <div className="flex items-start gap-4">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt="Product thumbnail"
            className="w-16 h-16 rounded-xl border object-cover bg-white"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl border bg-gray-100 flex items-center justify-center text-[11px] text-gray-500">
            No image
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <h3 className="font-semibold truncate">{item.projectName}</h3>
              <p className="text-sm text-gray-500 truncate">{item.customerName}</p>
            </div>

            <StatusBadge status={item.pricingStatus} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 mt-3 text-sm">
            <div>
              <span className="text-gray-500">Request No.:</span> {item.requestId}
            </div>
            <div>
              <span className="text-gray-500">Product:</span> {item.productType}
            </div>
            <div>
              <span className="text-gray-500">Scenarios:</span> {item.scenarioCount}
            </div>
            <div>
              <span className="text-gray-500">Customer:</span> {item.customerName}
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={onOpen}
              className="rounded-lg bg-black text-white px-4 py-2 text-sm hover:bg-gray-800"
            >
              Open Pricing Workspace
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PricingDashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [loadingUnlock, setLoadingUnlock] = useState(false);
  const [error, setError] = useState("");
  const [enteredPassword, setEnteredPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    const pricingUnlocked = sessionStorage.getItem(PRICING_SESSION_KEY) === "yes";
    if (pricingUnlocked) {
      setUnlocked(true);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const reqRes = await fetch("/.netlify/functions/list-requests");
      const reqJson = await reqRes.json();

      if (!reqJson.success) {
        setError(reqJson.error || "Failed to load requests");
        setProjects([]);
        return;
      }

      const requestRows = normalizeArray(reqJson.requests);

      const enriched = await Promise.all(
        requestRows.map(async (row) => {
          const payload = getRequestPayload(row);
          const requestId = getRequestId(row);

          if (!requestId) return null;

          let scenarios = [];
          try {
            const scRes = await fetch(
              `/.netlify/functions/list-pricing-scenarios?requestId=${requestId}`
            );
            const scJson = await scRes.json();
            scenarios = scJson.success ? normalizeArray(scJson.scenarios) : [];
          } catch {
            scenarios = [];
          }

          if (!isPricingRelevant(payload, scenarios)) {
            return null;
          }

          return {
            requestId,
            payload,
            thumbnail: getThumbnail(payload),
            customerName: getCustomerName(payload),
            projectName: getProjectName(payload),
            productType: getProductType(payload),
            pricingStatus: inferPricingStatus(payload, scenarios),
            scenarioCount: scenarios.length,
          };
        })
      );

      setProjects(enriched.filter(Boolean));
    } catch (err) {
      console.error("Pricing dashboard load error:", err);
      setError("Failed to load pricing dashboard");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const unlockPricing = async () => {
    try {
      setLoadingUnlock(true);

      if (enteredPassword === PRICING_PASSWORD) {
        setUnlocked(true);
        sessionStorage.setItem(PRICING_SESSION_KEY, "yes");
        setEnteredPassword("");
        return;
      }

      alert("Wrong password");
    } finally {
      setLoadingUnlock(false);
    }
  };

  const pendingProjects = useMemo(() => {
    return projects.filter((p) => p.pricingStatus === "Pending Pricing");
  }, [projects]);

  const completedProjects = useMemo(() => {
    return projects.filter((p) => p.pricingStatus === "Pricing Completed");
  }, [projects]);

  if (loading) {
    return <div className="p-6">Loading pricing dashboard...</div>;
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
            <h1 className="text-2xl font-bold">Pricing Dashboard</h1>
            <Link
              to="/"
              className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100 bg-white"
            >
              ← Home
            </Link>
          </div>

          <div className="rounded-2xl border bg-white shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold">Enter Pricing Password</h2>
            <p className="text-sm text-gray-600">
              Please enter the pricing section password to access the pricing dashboard and all pricing workspaces.
            </p>

            <input
              type="password"
              className="w-full border rounded-lg p-3"
              value={enteredPassword}
              onChange={(e) => setEnteredPassword(e.target.value)}
              placeholder="Enter password"
              onKeyDown={(e) => {
                if (e.key === "Enter") unlockPricing();
              }}
            />

            <button
              onClick={unlockPricing}
              disabled={loadingUnlock}
              className={`w-full rounded-lg px-4 py-3 text-white ${
                loadingUnlock ? "bg-gray-400" : "bg-black hover:bg-gray-800"
              }`}
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
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="rounded-2xl border bg-white shadow-sm p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold">Pricing Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">
                All projects currently in pricing, grouped by pricing status.
              </p>
            </div>

            <button
              onClick={loadDashboard}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100 bg-white"
            >
              Refresh
            </button>
          </div>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-xl font-semibold">Pending Pricing</h2>
            <StatusBadge status="Pending Pricing" />
          </div>

          {pendingProjects.length === 0 ? (
            <div className="rounded-2xl border bg-white shadow-sm p-6 text-sm text-gray-500">
              No pending pricing projects found.
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {pendingProjects.map((item) => (
                <ProjectCard
                  key={item.requestId}
                  item={item}
                  onOpen={() => navigate(`/pricing/${item.requestId}`)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-xl font-semibold">Pricing Completed</h2>
            <StatusBadge status="Pricing Completed" />
          </div>

          {completedProjects.length === 0 ? (
            <div className="rounded-2xl border bg-white shadow-sm p-6 text-sm text-gray-500">
              No completed pricing projects found.
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {completedProjects.map((item) => (
                <ProjectCard
                  key={item.requestId}
                  item={item}
                  onOpen={() => navigate(`/pricing/${item.requestId}`)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}