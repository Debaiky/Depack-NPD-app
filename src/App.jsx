import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import EngineeringDashboard from "./pages/EngineeringDashboard";
import PricingDashboard from "./pages/PricingDashboard";
import PricingWorkspace from "./pages/PricingWorkspace";
import PricingComparisonPage from "./pages/PricingComparisonPage";
import EngineeringReview from "./pages/EngineeringReview";
import PricingPage from "./pages/PricingPage";
import ThermoPricingPage from "./pages/ThermoPricingPage";
import RequestDetail from "./pages/RequestDetail";
import RequestEditor from "./pages/RequestEditor";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/engineering-dashboard" element={<EngineeringDashboard />} />
        <Route path="/pricing-dashboard" element={<PricingDashboard />} />
        <Route path="/engineering/:requestId" element={<EngineeringReview />} />
        <Route path="/pricing/:requestId" element={<PricingWorkspace />} />
        <Route path="/pricing/:requestId/compare" element={<PricingComparisonPage />} />
        <Route path="/pricing/:requestId/scenario/:pricingId" element={<PricingPage />} />
        <Route
          path="/pricing/:requestId/scenario/:pricingId/thermo"
          element={<ThermoPricingPage />}
        />
        <Route path="/request/:requestId" element={<RequestDetail />} />
        <Route path="/edit/:requestId" element={<RequestEditor />} />
        <Route path="/new" element={<RequestEditor isNew={true} />} />
      </Routes>
    </BrowserRouter>
  );
}