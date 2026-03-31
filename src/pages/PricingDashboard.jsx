import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

function StatusBadge({ status }) {
  const colors = {
    "Engineering Completed": "bg-green-100 text-green-700",
    "Under Pricing": "bg-blue-100 text-blue-700",
    "Pricing Completed": "bg-purple-100 text-purple-700",
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

export default function PricingDashboard() {
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
      console.error("Pricing dashboard load error:", err);
      setError("Failed to load requests");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const pending = useMemo(() => {
    return requests
      .filter(
        (r) =>
          r?.Status === "Engineering Completed" ||
          r?.Status === "Under Pricing"
      )
      .filter((r) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          (r?.RequestID || "").toLowerCase().includes(q) ||
          (r?.ProjectName || "").toLowerCase().includes(q) ||
          (r?.CustomerName || "").toLowerCase().includes(q)
        );
      });
  }, [requests, search]);

  const completed = useMemo(() => {
    return requests
      .filter((r) => r?.Status === "Pricing Completed")
      .filter((r) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          (r?.RequestID || "").toLowerCase().includes(q) ||
          (r?.ProjectName || "").toLowerCase().includes(q) ||
          (r?.CustomerName || "").toLowerCase().includes(q)
        );
      });
  }, [requests, search]);

  if (loading) return <div className="p-6">Loading pricing requests...</div>;

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  const renderTable = (rows, emptyText) => (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="p-3">Request ID</th>
            <th className="p-3">Customer</th>
            <th className="p-3">Project</th>
            <th className="p-3">Product</th>
            <th className="p-3">Status</th>
            <th className="p-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan="6" className="p-6 text-center text-gray-500">
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((req) => (
              <tr key={req.RequestID} className="border-t">
                <td className="p-3 font-medium">{req.RequestID}</td>
                <td className="p-3">{req.CustomerName || "—"}</td>
                <td className="p-3">{req.ProjectName || "—"}</td>
                <td className="p-3">{req.ProductType || "—"}</td>
                <td className="p-3">
                  <StatusBadge status={req.Status} />
                </td>
                <td className="p-3">
                  <Link
                    to={`/pricing/${req.RequestID}`}
                    className="text-blue-600 hover:underline"
                  >
                    Open Workspace
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold">Pricing Dashboard</h1>
          <Link
            to="/"
            className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100 bg-white"
          >
            ← Home
          </Link>
        </div>

        <input
          placeholder="Search request, project, or customer..."
          className="border px-3 py-2 rounded w-80 bg-white"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Pending Pricing</h2>
          {renderTable(pending, "No pending pricing projects.")}
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Completed Pricing</h2>
          {renderTable(completed, "No completed pricing projects.")}
        </div>
      </div>
    </div>
  );
}