import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Wrench, BadgeDollarSign } from "lucide-react";

function fmtNumber(v) {
  const n = Number(String(v || "").replace(/,/g, ""));
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(n);
}

export default function Dashboard() {
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState("");
  const [requester, setRequester] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/.netlify/functions/list-requests");
      const json = await res.json();

      if (!json?.success) {
        setError(json?.error || "Failed to load requests");
        setRequests([]);
        return;
      }

      const rows = Array.isArray(json.requests) ? json.requests : [];
      setRequests(rows);
    } catch (err) {
      console.error("Dashboard load error:", err);
      setError("Failed to load requests");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const normalizedRequests = useMemo(() => {
    return requests.map((r) => ({
      ...r,
      RequestID: r?.RequestID || "",
      ProjectName: r?.ProjectName || "Untitled Project",
      CustomerSummary: r?.CustomerSummary || "—",
      Requester: r?.Requester || r?.CreatedBy || "—",
      Status: r?.Status || "Draft",
      ProductType: r?.ProductType || "—",
      ForecastAnnualQty: r?.ForecastAnnualQty || "",
      TargetSellingPrice: r?.TargetSellingPrice || "",
      Currency: r?.Currency || "",
      ExpectedAnnualTurnover: r?.ExpectedAnnualTurnover || "",
      ProductThumbnailPreview: r?.ProductThumbnailPreview || "",
    }));
  }, [requests]);

  const filtered = useMemo(() => {
    let data = [...normalizedRequests];

    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (r) =>
          r.ProjectName.toLowerCase().includes(q) ||
          r.CustomerSummary.toLowerCase().includes(q) ||
          r.RequestID.toLowerCase().includes(q) ||
          r.ProductType.toLowerCase().includes(q)
      );
    }

    if (requester) {
      data = data.filter((r) => r.Requester === requester);
    }

    return data;
  }, [normalizedRequests, search, requester]);

  const requesters = useMemo(() => {
    return [...new Set(normalizedRequests.map((r) => r.Requester).filter(Boolean))];
  }, [normalizedRequests]);

  if (loading) {
    return <div className="p-6">Loading dashboard...</div>;
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

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-semibold">Projects Dashboard</h1>

        <Link
          to="/new"
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
        >
          + New Request
        </Link>
      </div>

      <div className="flex gap-3 flex-wrap">
        <input
          placeholder="Search project, customer, request ID, or product type..."
          className="border px-3 py-2 rounded w-80"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="border px-3 py-2 rounded"
          value={requester}
          onChange={(e) => setRequester(e.target.value)}
        >
          <option value="">All Requesters</option>
          {requesters.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3 w-20">Image</th>
              <th className="p-3 w-32">Request ID</th>
              <th className="p-3 w-52">Project</th>
              <th className="p-3 w-52">Customer(s)</th>
              <th className="p-3 w-28">Product</th>
              <th className="p-3 w-28">Requester</th>
              <th className="p-3 w-28">Status</th>
              <th className="p-3 w-28">Annual Qty</th>
              <th className="p-3 w-28">Target Price</th>
              <th className="p-3 w-32">Annual Turnover</th>
              <th className="p-3 w-28 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="11" className="p-6 text-center text-gray-500">
                  No requests found.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.RequestID} className="border-t align-top">
                  <td className="p-3">
                    {r.ProductThumbnailPreview ? (
                      <img
                        src={r.ProductThumbnailPreview}
                        alt="Product thumbnail"
                        className="w-14 h-14 rounded-lg object-cover border bg-white"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg border bg-gray-100 flex items-center justify-center text-[10px] text-gray-500 text-center px-1">
                        No image
                      </div>
                    )}
                  </td>

                  <td className="p-3 font-medium break-words">{r.RequestID}</td>

                  <td className="p-3 break-words whitespace-normal">{r.ProjectName}</td>

                  <td className="p-3 break-words whitespace-normal">{r.CustomerSummary}</td>

                  <td className="p-3 break-words whitespace-normal">{r.ProductType}</td>

                  <td className="p-3 break-words whitespace-normal">{r.Requester}</td>

                  <td className="p-3">
                    <StatusBadge status={r.Status} />
                  </td>

                  <td className="p-3 break-words whitespace-normal">
                    {fmtNumber(r.ForecastAnnualQty)}
                  </td>

                  <td className="p-3 break-words whitespace-normal">
                    {r.TargetSellingPrice
                      ? `${fmtNumber(r.TargetSellingPrice)} ${r.Currency || ""}`.trim()
                      : "—"}
                  </td>

                  <td className="p-3 break-words whitespace-normal font-medium">
                    {r.ExpectedAnnualTurnover
                      ? `${fmtNumber(r.ExpectedAnnualTurnover)} ${r.Currency || ""}`.trim()
                      : "—"}
                  </td>

                  <td className="p-3">
                    <div className="flex items-center justify-center gap-3">
                      <Link
                        to={`/request/${r.RequestID}`}
                        className="text-blue-600 hover:text-blue-800"
                        title="Open request"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>

                      <Link
                        to={`/engineering/${r.RequestID}`}
                        className="text-amber-600 hover:text-amber-800"
                        title="Go to engineering"
                      >
                        <Wrench className="h-4 w-4" />
                      </Link>

                      <Link
                        to={`/pricing/${r.RequestID}`}
                        className="text-emerald-600 hover:text-emerald-800"
                        title="Go to pricing"
                      >
                        <BadgeDollarSign className="h-4 w-4" />
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
  );
}

function StatusBadge({ status }) {
  const colors = {
    Draft: "bg-gray-100 text-gray-800",
    "Project Completed": "bg-blue-100 text-blue-800",
    ENGINEERING: "bg-blue-100 text-blue-800",
    "Under Engineering Review": "bg-yellow-100 text-yellow-800",
    ENGINEERING_COMPLETED: "bg-purple-100 text-purple-800",
    "Engineering Completed": "bg-purple-100 text-purple-800",
    PRICING_COMPLETED: "bg-green-100 text-green-800",
    "Pricing Completed": "bg-green-100 text-green-800",
  };

  return (
    <span className={`px-2 py-1 rounded text-xs ${colors[status] || "bg-gray-100 text-gray-800"}`}>
      {status}
    </span>
  );
}