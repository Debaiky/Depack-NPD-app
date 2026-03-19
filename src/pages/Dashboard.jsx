import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

function StatusBadge({ status }) {
  const value = status || "Draft";

  const classes =
    value === "Draft"
      ? "bg-yellow-100 text-yellow-800"
      : value === "Submitted"
      ? "bg-blue-100 text-blue-800"
      : value === "Engineering"
      ? "bg-purple-100 text-purple-800"
      : value === "Approved"
      ? "bg-green-100 text-green-800"
      : "bg-gray-100 text-gray-800";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${classes}`}>
      {value}
    </span>
  );
}

export default function Dashboard() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [customerFilter, setCustomerFilter] = useState("All");

  useEffect(() => {
    const loadRequests = async () => {
      try {
        const response = await fetch("/.netlify/functions/list-requests");
        const data = await response.json();

        if (data.success) {
          setRequests(data.requests || []);
          setLoadError("");
        } else {
          setLoadError(data.error || "Failed to load requests");
        }
      } catch (error) {
        console.error("Failed to load requests:", error);
        setLoadError("Failed to load requests");
      } finally {
        setLoading(false);
      }
    };

    loadRequests();
  }, []);

  const uniqueCustomers = useMemo(() => {
    const values = Array.from(
      new Set(requests.map((r) => r.CustomerName).filter(Boolean))
    );
    return values.sort((a, b) => a.localeCompare(b));
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();

    return requests.filter((req) => {
      const matchesSearch =
        !q ||
        req.RequestID?.toLowerCase().includes(q) ||
        req.CustomerName?.toLowerCase().includes(q) ||
        req.ProjectName?.toLowerCase().includes(q) ||
        req.ProductType?.toLowerCase().includes(q) ||
        req.ProductMaterial?.toLowerCase().includes(q) ||
        req.DecorationType?.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "All" || (req.Status || "Draft") === statusFilter;

      const matchesCustomer =
        customerFilter === "All" || req.CustomerName === customerFilter;

      return matchesSearch && matchesStatus && matchesCustomer;
    });
  }, [requests, search, statusFilter, customerFilter]);

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <img
              src="/depacklogo.png"
              alt="Depack"
              className="h-12 w-auto object-contain"
            />
            <div>
              <h1 className="text-2xl font-bold">Depack Requests Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Search, filter, and manage NPD requests
              </p>
            </div>
          </div>

          <Link
            to="/new"
            className="rounded-lg bg-black px-4 py-2 text-white font-medium"
          >
            + New Request
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {loadError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {loadError}
          </div>
        ) : null}

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Search</label>
              <input
                type="text"
                placeholder="Search request, customer, project, product..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="All">All</option>
                <option value="Draft">Draft</option>
                <option value="Submitted">Submitted</option>
                <option value="Engineering">Engineering</option>
                <option value="Approved">Approved</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Customer</label>
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="All">All</option>
                {uniqueCustomers.map((customer) => (
                  <option key={customer} value={customer}>
                    {customer}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-3 text-left">Request ID</th>
                  <th className="p-3 text-left">Created</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Customer</th>
                  <th className="p-3 text-left">Project</th>
                  <th className="p-3 text-left">Product</th>
                  <th className="p-3 text-left">Decoration</th>
                  <th className="p-3 text-left">Files</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-6 text-center text-muted-foreground">
                      No matching requests found.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => (
                    <tr key={req.RequestID} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-medium">{req.RequestID}</td>
                      <td className="p-3">{req.CreatedDate}</td>
                      <td className="p-3">
                        <StatusBadge status={req.Status} />
                      </td>
                      <td className="p-3">{req.CustomerName}</td>
                      <td className="p-3">{req.ProjectName}</td>
                      <td className="p-3">
                        <div>{req.ProductType}</div>
                        <div className="text-xs text-muted-foreground">
                          {req.ProductMaterial}
                        </div>
                      </td>
                      <td className="p-3">{req.DecorationType}</td>
                      <td className="p-3">
                        <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium">
                          {req.FileCount || 0}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-3">
                          <Link
                            to={`/request/${req.RequestID}`}
                            className="text-blue-600 underline"
                          >
                            Open
                          </Link>
                          <Link
                            to={`/edit/${req.RequestID}`}
                            className="text-green-600 underline"
                          >
                            Edit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          Showing {filteredRequests.length} of {requests.length} requests
        </div>
      </div>
    </div>
  );
}