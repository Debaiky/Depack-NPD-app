import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function LandingPage() {
  const [stats, setStats] = useState({
    total: 0,
    drafts: 0,
    engineering: 0,
    pricing: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await fetch("/.netlify/functions/list-requests");
      const json = await res.json();

      if (!json.success) return;

      const requests = json.requests || [];

      const drafts = requests.filter(
        (r) => r.Status === "Draft"
      ).length;

      const engineering = requests.filter(
        (r) => r.Status === "ENGINEERING"
      ).length;

      const pricing = requests.filter(
        (r) =>
          r.Status === "ENGINEERING_COMPLETED" ||
          r.Status === "PRICING_COMPLETED"
      ).length;

      setStats({
        total: requests.length,
        drafts,
        engineering,
        pricing,
      });
    } catch (err) {
      console.error("Failed to load stats", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* HEADER */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center gap-3">
          <img src="/depacklogo.png" className="h-10" />
          <div>
            <div className="text-lg font-semibold">
              Depack NPD System
            </div>
            <div className="text-xs text-gray-500">
              End-to-end product development workflow
            </div>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 px-6 py-10 max-w-6xl mx-auto w-full">

        {/* SUMMARY */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">

          <StatCard title="Total Projects" value={stats.total} />
          <StatCard title="Drafts" value={stats.drafts} color="gray" />
          <StatCard title="Engineering" value={stats.engineering} color="blue" />
          <StatCard title="Pricing" value={stats.pricing} color="green" />

        </div>

        {/* NAVIGATION CARDS */}
        <div className="grid md:grid-cols-3 gap-6">

          <NavCard
            title="Projects"
            description="Create and manage requests"
            to="/dashboard"
            color="gray"
          />

          <NavCard
            title="Engineering"
            description="Process technical data"
            to="/engineering-dashboard"
            color="blue"
          />

          <NavCard
            title="Pricing"
            description="Costing & profitability"
            to="/pricing-dashboard"
            color="green"
          />

        </div>

      </div>

      {/* FOOTER */}
      <div className="text-center text-xs text-gray-400 py-4">
        Depack System • Internal Tool
      </div>
    </div>
  );
}

/* ================= COMPONENTS ================= */

function StatCard({ title, value, color = "black" }) {
  const colors = {
    gray: "bg-gray-100 text-gray-800",
    blue: "bg-blue-100 text-blue-800",
    green: "bg-green-100 text-green-800",
    black: "bg-black text-white",
  };

  return (
    <div className={`rounded-xl p-4 ${colors[color]}`}>
      <div className="text-sm">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function NavCard({ title, description, to, color = "gray" }) {
  const colors = {
    gray: "hover:border-gray-400",
    blue: "hover:border-blue-400",
    green: "hover:border-green-400",
  };

  return (
    <Link
      to={to}
      className={`bg-white border rounded-2xl p-6 shadow-sm transition hover:shadow-md ${colors[color]}`}
    >
      <div className="text-lg font-semibold mb-2">
        {title}
      </div>

      <p className="text-sm text-gray-500">
        {description}
      </p>
    </Link>
  );
}