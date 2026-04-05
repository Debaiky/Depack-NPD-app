import { Link } from "react-router-dom";
import { FolderKanban, FlaskConical, Calculator, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-6">
      <div className="max-w-6xl mx-auto flex flex-col justify-center min-h-screen">
        <div className="grid lg:grid-cols-2 gap-10 items-center mb-12">
          <div className="space-y-6">
            <img
              src="/Depack_cup.jpeg"
              alt="Depack cup"
              className="w-full max-w-xl rounded-3xl shadow-xl border object-cover"
            />

            <div className="text-center lg:text-left">
              <img
                src="/depacklogo.png"
                alt="Depack"
                className="h-16 md:h-20 mx-auto lg:mx-0 mb-4"
              />

              <h1 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight">
                Depack NPD System
              </h1>

              <p className="text-base md:text-lg text-gray-600 mt-3">
                Project • Engineering • Pricing Workflow
              </p>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="rounded-3xl border bg-white shadow-xl p-6 space-y-4">
              <div>
                <div className="text-sm text-gray-500">Quick Access</div>
                <div className="text-2xl font-semibold text-gray-900">
                  Choose your workspace
                </div>
              </div>

              <QuickCard
                title="Projects"
                description="Create and manage requests"
                to="/dashboard"
                icon={FolderKanban}
                color="blue"
              />

              <QuickCard
                title="Engineering"
                description="Technical validation & data input"
                to="/engineering-dashboard"
                icon={FlaskConical}
                color="purple"
              />

              <QuickCard
                title="Pricing"
                description="Costing & financial evaluation"
                to="/pricing-dashboard"
                icon={Calculator}
                color="green"
              />
            </div>
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
            title="Pricing"
            description="Costing & financial evaluation"
            to="/pricing-dashboard"
            color="green"
            icon={Calculator}
          />
        </div>
      </div>
    </div>
  );
}

function QuickCard({ title, description, to, color, icon: Icon }) {
  const colors = {
    blue: "from-blue-600 to-cyan-500",
    purple: "from-purple-600 to-fuchsia-500",
    green: "from-green-600 to-emerald-500",
  };

  return (
    <Link
      to={to}
      className="group block rounded-2xl border bg-gray-50 hover:bg-white transition p-4"
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white shadow-md`}
        >
          <Icon className="w-6 h-6" />
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-700 transition" />
          </div>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
      </div>
    </Link>
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