import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="mb-10 text-center">
        <img
          src="/depacklogo.png"
          alt="Depack"
          className="h-16 mx-auto mb-4"
        />
        <h1 className="text-2xl font-semibold">Depack NPD System</h1>
        <p className="text-sm text-gray-500 mt-1">
          Project • Engineering • Pricing Workflow
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        <NavCard
          title="Projects"
          description="Create and manage requests"
          to="/dashboard"
          color="blue"
        />

        <NavCard
          title="Engineering"
          description="Technical validation & data input"
          to="/engineering-dashboard"
          color="purple"
        />

        <NavCard
          title="Pricing"
          description="Costing & financial evaluation"
          to="/pricing-dashboard"
          color="green"
        />
      </div>
    </div>
  );
}

function NavCard({ title, description, to, color }) {
  const colors = {
    blue: "bg-blue-600 hover:bg-blue-500",
    purple: "bg-purple-600 hover:bg-purple-500",
    green: "bg-green-600 hover:bg-green-500",
  };

  return (
    <Link
      to={to}
      className="group block rounded-2xl border bg-white shadow-sm hover:shadow-md transition p-6"
    >
      <div className="space-y-3">
        <div
          className={`w-12 h-12 rounded-xl ${colors[color]} flex items-center justify-center text-white text-lg`}
        >
          →
        </div>

        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
    </Link>
  );
}