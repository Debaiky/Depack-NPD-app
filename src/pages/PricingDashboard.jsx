import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const PRICING_PASSWORD = "DepackPricing_2026";

function getStatus(row, payload) {
  return (
    row?.Status ||
    row?.status ||
    payload?.metadata?.status ||
    payload?.status ||
    ""
  );
}

function getThumbnail(row, payload) {
  const product = payload?.product || {};

  return (
    row?.Thumbnail ||
    row?.thumbnailUrl ||
    row?.thumbnail ||
    (row?.thumbnailBase64 ? `data:image/*;base64,${row.thumbnailBase64}` : "") ||
    product?.productThumbnailUrl ||
    product?.productThumbnailPreview ||
    (product?.productThumbnailBase64
      ? `data:image/*;base64,${product.productThumbnailBase64}`
      : "")
  );
}

function normalizeRows(rows) {
  return (rows || []).map((row) => {
    const payload = row?.payload || {};

    const product = payload?.product || {};
    const project = payload?.project || {};
    const customerBlock = payload?.customer || {};
    const primaryCustomer = customerBlock?.customers?.[0] || {};

    return {
      raw: row,
      payload,
      requestId:
        row?.RequestID ||
        row?.requestId ||
        payload?.metadata?.requestId ||
        payload?.requestId ||
        "",
      status: getStatus(row, payload),
      productType:
        row?.ProductType ||
        row?.productType ||
        product?.productType ||
        "—",
      projectName:
        row?.ProjectName ||
        row?.projectName ||
        project?.projectName ||
        "—",
      customerName:
        row?.CustomerName ||
        row?.customerName ||
        primaryCustomer?.customerName ||
        "—",
      thumbnail: getThumbnail(row, payload),
      updatedAt:
        row?.UpdatedAt ||
        row?.updatedAt ||
        row?.CreatedAt ||
        row?.createdAt ||
        payload?.metadata?.updatedAt ||
        "",
    };
  });
}

function sortByUpdatedDesc(rows) {
  return [...rows].sort((a, b) => {
    const aTime = new Date(a.updatedAt || 0).getTime();
    const bTime = new Date(b.updatedAt || 0).getTime();
    return bTime - aTime;
  });
}

function ProjectCard({ item, badge, badgeTone = "gray" }) {
  const badgeStyles = {
    gray: "bg-gray-100 text-gray-700",
    orange: "bg-orange-100 text-orange-700",
    green: "bg-green-100 text-green-700",
    blue: "bg-blue-100 text-blue-700",
  };

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
              <div className="font-semibold truncate">{item.projectName}</div>
              <div className="text-sm text-gray-500 truncate">
                {item.customerName} • {item.productType}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Request No.: {item.requestId || "—"}
              </div>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                badgeStyles[badgeTone] || badgeStyles.gray
              }`}
            >
              {badge}
            </span>
          </div>

          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <Link
              to={`/pricing/${item.requestId}`}
              className="rounded-lg bg-black text-white px-4 py-2 text-sm hover:bg-gray-800"
            >
              Open Pricing Workspace
            </Link>

            <span className="text-xs text-gray-400">
              Current status: {item.status || "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PricingDashboard() {
  const [loading, setLoading] = useState(true);
  const [enteredPassword, setEnteredPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const pricingUnlocked = sessionStorage.getItem("pricing_unlocked") === "yes";
    if (pricingUnlocked) {
      setUnlocked(true);
    }
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    loadData();
  }, [unlocked]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/.netlify/functions/list-pricing-workspaces");
      const json = await res.json();

      if (!json.success) {
        setError(json.error || "Failed to load pricing dashboard");
        setRows([]);
        return;
      }

      const normalized = normalizeRows(
        json.rows || json.workspaces || json.items || []
      );
      setRows(normalized);
    } catch (err) {
      console.error("Pricing dashboard load error:", err);
      setError("Failed to load pricing dashboard");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const unlockDashboard = () => {
    if (enteredPassword === PRICING_PASSWORD) {
      setUnlocked(true);
      sessionStorage.setItem("pricing_unlocked", "yes");
      setEnteredPassword("");
      return;
    }

    alert("Wrong password");
  };

  const pendingPricingRows = useMemo(() => {
    return sortByUpdatedDesc(
      rows.filter((r) =>
        ["pending pricing", "under pricing review", "under pricing"].includes(
          String(r.status || "").trim().toLowerCase()
        )
      )
    );
  }, [rows]);

  const pricingCompletedRows = useMemo(() => {
    return sortByUpdatedDesc(
      rows.filter((r) =>
        ["pricing completed", "completed"].includes(
          String(r.status || "").trim().toLowerCase()
        )
      )
    );
  }, [rows]);

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
              onClick={unlockDashboard}
              className="w-full rounded-lg bg-black text-white px-4 py-3"
            >
              Unlock
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="p-6">Loading pricing dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="rounded-2xl border bg-white shadow-sm p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold">Pricing Dashboard</h1>
              <div className="text-sm text-gray-500 mt-1">
                Pending Pricing: {pendingPricingRows.length} • Pricing Completed:{" "}
                {pricingCompletedRows.length}
              </div>
            </div>

            <button
              type="button"
              onClick={loadData}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100 bg-white"
            >
              Refresh
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        ) : null}

        <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-semibold">Pending Pricing</h2>
            <span className="text-sm text-gray-500">{pendingPricingRows.length} project(s)</span>
          </div>

          {pendingPricingRows.length === 0 ? (
            <div className="text-sm text-gray-500">No pending pricing projects.</div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {pendingPricingRows.map((item) => (
                <ProjectCard
                  key={`pending-${item.requestId}`}
                  item={item}
                  badge="Pending Pricing"
                  badgeTone="orange"
                />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-semibold">Pricing Completed</h2>
            <span className="text-sm text-gray-500">
              {pricingCompletedRows.length} project(s)
            </span>
          </div>

          {pricingCompletedRows.length === 0 ? (
            <div className="text-sm text-gray-500">No completed pricing projects.</div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {pricingCompletedRows.map((item) => (
                <ProjectCard
                  key={`completed-${item.requestId}`}
                  item={item}
                  badge="Pricing Completed"
                  badgeTone="green"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}