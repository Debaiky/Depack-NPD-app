import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

function StatusBadge({ status }) {
  const colors = {
    Draft: "bg-gray-100 text-gray-700",
    "Waiting for Engineering": "bg-yellow-100 text-yellow-800",
    "Under Engineering Review": "bg-blue-100 text-blue-800",
    "Sent to Pricing": "bg-purple-100 text-purple-800",
    "Pending pricing": "bg-orange-100 text-orange-800",
    "Under Pricing Review": "bg-purple-100 text-purple-800",
    "Pricing completed": "bg-green-100 text-green-800",
    Completed: "bg-green-100 text-green-800",
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

function ThumbnailCell({ src, alt }) {
  if (!src) {
    return (
      <div className="w-14 h-14 rounded-lg border bg-gray-100 flex items-center justify-center text-[10px] text-gray-500 text-center px-1">
        No image
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || "Product"}
      className="w-14 h-14 rounded-lg border object-cover bg-white"
    />
  );
}

function SectionTable({ title, rows }) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>

      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3 w-[90px]">Image</th>
              <th className="p-3">Request ID</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Project</th>
              <th className="p-3">Product</th>
              <th className="p-3">Requester</th>
              <th className="p-3">Status</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan="8" className="p-6 text-center text-gray-500">
                  No items.
                </td>
              </tr>
            ) : (
              rows.map((req) => (
                <tr key={req.RequestID} className="border-t align-middle">
                  <td className="p-3">
                    <ThumbnailCell
                      src={req.Thumbnail}
                      alt={req.ProjectName || req.ProductType || "Product"}
                    />
                  </td>
                  <td className="p-3 font-medium">{req.RequestID}</td>
                  <td className="p-3">{req.CustomerName || "—"}</td>
                  <td className="p-3">{req.ProjectName || "—"}</td>
                  <td className="p-3">{req.ProductType || "—"}</td>
                  <td className="p-3">{req.Requester || req.CreatedBy || "—"}</td>
                  <td className="p-3">
                    <StatusBadge status={req.Status} />
                  </td>
                  <td className="p-3">
                    <Link
                      to={`/engineering/${req.RequestID}`}
                      className="text-blue-600 hover:underline"
                    >
                      Open Engineering
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function EngineeringDashboard() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/.netlify/functions/list-requests");
      const data = await res.json();

      if (!data?.success) {
        setError(data?.error || "Failed to load requests");
        setRequests([]);
        return;
      }

      setRequests(Array.isArray(data.requests) ? data.requests : []);
    } catch (err) {
      console.error("Engineering dashboard load error:", err);
      setError("Failed to load requests");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const visibleRows = useMemo(() => {
    return requests
      .filter((r) =>
        [
          "Waiting for Engineering",
          "Under Engineering Review",
          "Sent to Pricing",
          "Pending pricing",
          "Under Pricing Review",
          "Pricing completed",
          "Completed",
        ].includes(r?.Status)
      )
      .filter((r) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          (r?.RequestID || "").toLowerCase().includes(q) ||
          (r?.ProjectName || "").toLowerCase().includes(q) ||
          (r?.CustomerName || "").toLowerCase().includes(q) ||
          (r?.ProductType || "").toLowerCase().includes(q)
        );
      });
  }, [requests, search]);

  const waiting = visibleRows.filter((r) => r.Status === "Waiting for Engineering");
  const inReview = visibleRows.filter((r) => r.Status === "Under Engineering Review");
  const movedToPricing = visibleRows.filter((r) =>
    ["Sent to Pricing", "Pending pricing", "Under Pricing Review", "Pricing completed", "Completed"].includes(r.Status)
  );

  if (loading) return <div className="p-6">Loading engineering dashboard...</div>;

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold">Engineering Dashboard</h1>
          <Link
            to="/"
            className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100 bg-white"
          >
            ← Home
          </Link>
        </div>

        <input
          placeholder="Search request, project, product, or customer..."
          className="border px-3 py-2 rounded w-80 bg-white"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <SectionTable title="Waiting for Engineering" rows={waiting} />
        <SectionTable title="Under Engineering Review" rows={inReview} />
        <SectionTable title="Moved to Pricing / Closed" rows={movedToPricing} />
      </div>
    </div>
  );
}