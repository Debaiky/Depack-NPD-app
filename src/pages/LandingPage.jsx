import { Link } from "react-router-dom";
import { FolderKanban, FlaskConical, Calculator, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-6">
      <div className="max-w-6xl mx-auto min-h-screen flex flex-col items-center justify-center">
        <div className="w-full flex flex-col items-center text-center mb-12 space-y-6">
          <img
            src="/Depack_cup.png"
            alt="Depack cup"
            className="w-full max-w-xl object-cover"
          />

          <img
            src="/depacklogo.png"
            alt="Depack"
            className="h-16 md:h-20"
          />

          <div>
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight">
              Depack NPD System
            </h1>

            <p className="text-base md:text-lg text-gray-600 mt-3">
              Project • Engineering • Pricing Workflow
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          <NavCard
            title="Projects"
            description="Create and manage requests"
            to="/dashboard"
            color="blue"
            icon={FolderKanban}
          />

          <NavCard
            title="Engineering"
            description="Technical validation & data input"
            to="/engineering-dashboard"
            color="purple"
            icon={FlaskConical}
          />

          <NavCard
            title="Pricing 2.0"
            description="Costing & financial evaluation"
            to="/pricing20-dashboard"
            color="green"
            icon={Calculator}
          />
        </div>
      </div>
    </div>
  );
}

function NavCard({ title, description, to, color, icon: Icon }) {
  const colors = {
    blue: "from-blue-600 to-cyan-500",
    purple: "from-purple-600 to-fuchsia-500",
    green: "from-green-600 to-emerald-500",
  };

  return (
    <Link
      to={to}
      className="group block rounded-3xl border bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition p-6"
    >
      <div className="space-y-4">
        <div
          className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white shadow-md`}
        >
          <Icon className="w-7 h-7" />
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>

        <div className="inline-flex items-center gap-2 text-sm font-medium text-gray-900">
          Open
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
        </div>
      </div>
    </Link>
  );
}