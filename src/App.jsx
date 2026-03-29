import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage.jsx";
import Dashboard from "./pages/Dashboard";
import RequestDetail from "./pages/RequestDetail";
import RequestEditor from "./pages/RequestEditor";
import EngineeringReview from "./pages/EngineeringReview";
import EngineeringDashboard from "./pages/EngineeringDashboard";
import PricingDashboard from "./pages/PricingDashboard";

import PricingReview from "./pages/PricingReview";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/projects" element={<Dashboard />} />
        <Route path="/new" element={<RequestEditor isNew={true} />} />
        <Route path="/request/:requestId" element={<RequestDetail />} />
        <Route path="/edit/:requestId" element={<RequestEditor />} />
        <Route path="/engineering" element={<EngineeringDashboard />} />
        <Route path="/engineering/:requestId" element={<EngineeringReview />} />
        <Route path="/pricing" element={<PricingDashboard />} />
        <Route path="/pricing/:requestId" element={<PricingReview />} />
      </Routes>
    </BrowserRouter>
  );
}