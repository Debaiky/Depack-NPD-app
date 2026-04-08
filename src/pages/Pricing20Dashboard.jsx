import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

function getThumbnailFromRequestRow(row) {
  return (
    row?.Thumbnail ||
    row?.thumbnailUrl ||
    row?.thumbnail ||
    (row?.thumbnailBase64 ? `data:image/*;base64,${row.thumbnailBase64}` : "") ||
    ""
  );
}

function normalizeRows(rows) {
  return (rows || []).map((row) => ({
    raw: row,
    requestId: row?.RequestID || row?.requestId || "",
    status: row?.Status || row?.status || "",
    productType: row?.ProductType || row?.productType || "—",
    projectName: row?.ProjectName || row?.projectName || "—",
    customerName: row?.CustomerName || row?.customerName || "—",
    thumbnail: getThumbnailFromRequestRow(row),
    updatedAt:
      row?.UpdatedAt ||
      row?.updatedAt ||
      row?.CreatedAt ||
      row?.createdAt ||
      "",
  }));
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
              to={`/pricing20/${item.requestId}`}
              className="rounded-lg bg-black text-white px-4 py-2 text-sm hover:bg-gray-800"
            >
              Open Pricing 2.0 Workspace
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

export default function Pricing20Dashboard() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/.netlify/functions/list-requests");
      const json = await res.json();

      if (!json.success) {
        setError(json.error || "Failed to load Pricing 2.0 dashboard");
        setRows([]);
        return;
      }

      const normalized = normalizeRows(json.requests || json.rows || []);
      setRows(normalized);
    } catch (err) {
      console.error("Pricing 2.0 dashboard load error:", err);
      setError("Failed to load Pricing 2.0 dashboard");
      setRows([]);
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return <div className="p-6">Loading Pricing 2.0 dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="rounded-2xl border bg-white shadow-sm p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold">Pricing 2.0 Dashboard</h1>
              <div className="text-sm text-gray-500 mt-1">
                Pending Pricing: {pendingPricingRows.length} • Pricing Completed:{" "}
                {pricingCompletedRows.length}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100 bg-white"
              >
                ← Home
              </Link>

              <button
                type="button"
                onClick={loadData}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100 bg-white"
              >
                Refresh
              </button>
            </div>
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
                  key={`pending2-${item.requestId}`}
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
                  key={`completed2-${item.requestId}`}
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