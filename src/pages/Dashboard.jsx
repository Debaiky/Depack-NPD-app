import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, FlaskConical, Calculator, Pencil, Home } from "lucide-react";

const fmtNumber = (v, digits = 0) => {
  const n = parseFloat(String(v ?? "").replace(/,/g, ""));
  if (Number.isNaN(n)) return "—";

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(n);
};

function normalizeStatus(status) {
  return String(status || "").trim().toLowerCase();
}

function isOneOf(status, list) {
  const s = normalizeStatus(status);
  return list.map((x) => normalizeStatus(x)).includes(s);
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
      CustomerName: r?.CustomerName || "Unknown Customer",
      Requester: r?.Requester || r?.CreatedBy || "—",
      Status: r?.Status || "Draft",
      Priority: r?.Priority || "Normal",
      ProductType: r?.ProductType || "—",
      TargetSellingPrice: r?.TargetSellingPrice ?? "",
      ForecastAnnualVolume: r?.ForecastAnnualVolume ?? "",
      AnnualTurnover: r?.AnnualTurnover ?? "",
      Thumbnail: r?.Thumbnail || "",
    }));
  }, [requests]);

  const filtered = useMemo(() => {
    let data = [...normalizedRequests];

    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (r) =>
          r.ProjectName.toLowerCase().includes(q) ||
          r.CustomerName.toLowerCase().includes(q) ||
          r.RequestID.toLowerCase().includes(q) ||
          r.ProductType.toLowerCase().includes(q)
      );
    }

    if (requester) {
      data = data.filter((r) => r.Requester === requester);
    }

    return data;
  }, [normalizedRequests, search, requester]);

  const groupedSections = useMemo(() => {
    const drafts = filtered.filter((r) => isOneOf(r.Status, ["Draft"]));

    const engineering = filtered.filter((r) =>
      isOneOf(r.Status, ["Waiting for Engineering", "Under Engineering Review"])
    );

    const pricingPending = filtered.filter((r) =>
      isOneOf(r.Status, [
        "Pending pricing",
        "Sent to Pricing",
        "Under Pricing Review",
      ])
    );

    const pricingCompleted = filtered.filter((r) =>
      isOneOf(r.Status, ["Completed pricing", "Pricing completed"])
    );

    return [
      { key: "drafts", title: "Drafts", rows: drafts },
      { key: "engineering", title: "In Engineering Review", rows: engineering },
      { key: "pricingPending", title: "Pending / In Pricing", rows: pricingPending },
      { key: "pricingCompleted", title: "Pricing Completed", rows: pricingCompleted },
    ];
  }, [filtered]);

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
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
  <h1 className="text-xl font-semibold">Projects Dashboard</h1>

  <div className="flex items-center gap-3 flex-wrap">
    <Link
      to="/"
      className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium bg-white hover:bg-gray-50"
    >
      <Home className="h-4 w-4" />
      Home
    </Link>

    <Link
      to="/new"
      className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
    >
      + New Request
    </Link>
  </div>
</div>

      <div className="flex gap-3 flex-wrap">
        <input
          placeholder="Search project, customer, request ID, or product..."
          className="border px-3 py-2 rounded w-80 bg-white"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="border px-3 py-2 rounded bg-white"
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

      {groupedSections.map((section) => (
        <DashboardSection key={section.key} title={section.title} rows={section.rows} />
      ))}
    </div>
  );
}

function DashboardSection({ title, rows }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="text-sm text-gray-500">{rows.length} item(s)</div>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
  <div className="overflow-x-auto">
    <table className="min-w-[1410px] text-xs md:text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-3 w-[90px]">Image</th>
                <th className="p-3 w-[140px]">Request ID</th>
                <th className="p-3 w-[220px]">Project</th>
                <th className="p-3 w-[180px]">Customer</th>
                <th className="p-3 w-[140px]">Product</th>
                <th className="p-3 w-[140px]">Requester</th>
                <th className="p-3 w-[170px]">Annual Turnover</th>
                <th className="p-3 w-[140px]">Status</th>
                <th className="p-3 w-[190px] text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-6 text-center text-gray-500">
                    No requests in this section.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.RequestID} className="border-t align-top">
                    <td className="p-3">
                      {r.Thumbnail ? (
                        <img
                          src={r.Thumbnail}
                          alt={r.ProjectName}
                          className="w-14 h-14 rounded-lg border object-cover bg-white"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg border bg-gray-100 flex items-center justify-center text-[10px] text-gray-500 text-center px-1">
                          No image
                        </div>
                      )}
                    </td>

                    <td className="p-3 font-medium break-words">{r.RequestID}</td>
                    <td className="p-3 break-words whitespace-normal">{r.ProjectName}</td>
                    <td className="p-3 break-words whitespace-normal">{r.CustomerName}</td>
                    <td className="p-3 break-words whitespace-normal">{r.ProductType}</td>
                    <td className="p-3 break-words whitespace-normal">{r.Requester}</td>

                    <td className="p-3 break-words whitespace-normal font-medium">
                      {r.AnnualTurnover !== "" &&
                      r.AnnualTurnover !== null &&
                      r.AnnualTurnover !== undefined
                        ? fmtNumber(r.AnnualTurnover, 2)
                        : "—"}
                    </td>

                    <td className="p-3">
                      <StatusBadge status={r.Status} />
                    </td>

                    <td className="p-3">
                      <div className="flex items-center justify-center gap-3 flex-wrap">
                        <Link
                          to={`/request/${r.RequestID}`}
                          className="inline-flex items-center justify-center rounded-lg border p-2 hover:bg-gray-50"
                          title="Open request"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>

                        <Link
                          to={`/edit/${r.RequestID}`}
                          className="inline-flex items-center justify-center rounded-lg border p-2 hover:bg-gray-50"
                          title="Edit request"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>

                        <Link
                          to={`/engineering/${r.RequestID}`}
                          className="inline-flex items-center justify-center rounded-lg border p-2 hover:bg-gray-50"
                          title="Go to engineering"
                        >
                          <FlaskConical className="h-4 w-4" />
                        </Link>

                        <Link
                          to={`/pricing20/${r.RequestID}`}
                          className="inline-flex items-center justify-center rounded-lg border p-2 hover:bg-gray-50"
                          title="Go to Pricing 2.0"
                        >
                          <Calculator className="h-4 w-4" />
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
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    Draft: "bg-gray-100 text-gray-800",
    "Waiting for Engineering": "bg-yellow-100 text-yellow-800",
    "Under Engineering Review": "bg-blue-100 text-blue-800",
    "Pending pricing": "bg-purple-100 text-purple-800",
    "Sent to Pricing": "bg-purple-100 text-purple-800",
    "Under Pricing Review": "bg-indigo-100 text-indigo-800",
    "Completed pricing": "bg-emerald-100 text-emerald-800",
    "Pricing completed": "bg-emerald-100 text-emerald-800",
    Completed: "bg-green-100 text-green-800",
    "Project Completed": "bg-green-100 text-green-800",
  };

  return (
    <span
      className={`inline-block px-2 py-1 rounded text-xs whitespace-normal ${
        colors[status] || "bg-gray-100 text-gray-800"
      }`}
    >
      {status}
    </span>
  );
}