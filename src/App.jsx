import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import EngineeringReview from "./pages/EngineeringReview";
import PricingPage from "./pages/PricingPage";
import RequestDetail from "./pages/RequestDetail";
import RequestEditor from "./pages/RequestEditor";

function Dashboard() {
  return <div className="p-6">Dashboard OK</div>;
}

function EngineeringDashboard() {
  return <div className="p-6">Engineering Dashboard OK</div>;
}

function PricingDashboard() {
  return <div className="p-6">Pricing Dashboard OK</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/engineering-dashboard" element={<EngineeringDashboard />} />
        <Route path="/pricing-dashboard" element={<PricingDashboard />} />
        <Route path="/engineering/:requestId" element={<EngineeringReview />} />
        <Route path="/pricing/:requestId" element={<PricingPage />} />
        <Route path="/request/:requestId" element={<RequestDetail />} />
        <Route path="/edit/:requestId" element={<RequestEditor />} />
        <Route path="/new" element={<RequestEditor isNew={true} />} />
      </Routes>
    </BrowserRouter>
  );
}