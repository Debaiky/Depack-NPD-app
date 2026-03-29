import { useEffect, useState } from "react";
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

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/.netlify/functions/list-requests");
        const data = await res.json();

        if (data.success) {
          const filtered = (data.requests || []).filter(
            (r) =>
              r.Status === "Engineering Completed" ||
              r.Status === "Under Pricing"
          );

          setRequests(filtered);
        }
      } catch (error) {
        console.error("Failed to load pricing requests:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Pricing Dashboard</h1>

          <Link
            to="/"
            className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100"
          >
            ← Home
          </Link>
        </div>

        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
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
              {requests.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-6 text-center text-gray-500">
                    No requests ready for pricing
                  </td>
                </tr>
              )}

              {requests.map((req) => (
                <tr key={req.RequestID} className="border-t">
                  <td className="p-3 font-medium">{req.RequestID}</td>
                  <td className="p-3">{req.CustomerName}</td>
                  <td className="p-3">{req.ProjectName}</td>
                  <td className="p-3">{req.ProductType}</td>
                  <td className="p-3">{req.CreatedBy}</td>
                  <td className="p-3">
                    <StatusBadge status={req.Status} />
                  </td>
                  <td className="p-3">
                    <Link
                      to={`/pricing/${req.RequestID}`}
                      className="text-blue-600 underline"
                    >
                      Open Pricing
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}