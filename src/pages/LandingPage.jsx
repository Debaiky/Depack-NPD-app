import { Link } from "react-router-dom";

function NavCard({ title, description, to }) {
  return (
    <Link
      to={to}
      className="block rounded-3xl border bg-white p-8 shadow-sm transition hover:shadow-md hover:-translate-y-0.5"
    >
      <div className="space-y-3">
        <div className="text-2xl font-bold">{title}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
        <div className="pt-2 text-sm font-medium text-blue-600">Open →</div>
      </div>
    </Link>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 space-y-8">
        <div className="rounded-3xl border bg-white p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-4">
            <img
              src="/depacklogo.png"
              alt="Depack"
              className="h-14 w-auto object-contain"
            />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Depack Workflow Hub</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage projects, engineering review, and pricing from one place.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <NavCard
            title="Projects"
            description="Create new requests, edit drafts, complete project briefs, and prepare requests for engineering."
            to="/projects"
          />

          <NavCard
            title="Engineering"
            description="Review completed project briefs, enter technical process data, tooling, and feasibility inputs."
            to="/engineering"
          />

          <NavCard
            title="Pricing"
            description="Open requests with completed engineering data and calculate commercial costing and pricing."
            to="/pricing"
          />
        </div>
      </div>
    </div>
  );
}