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

import PricingAccessGate from "./components/PricingAccessGate";

import Pricing20Dashboard from "./pages/Pricing20Dashboard";
import Pricing20Workspace from "./pages/Pricing20Workspace";
import Pricing20Page from "./pages/Pricing20Page";
import Pricing20AccessGate from "./components/pricing20/Pricing20AccessGate";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/engineering-dashboard" element={<EngineeringDashboard />} />
        <Route path="/engineering/:requestId" element={<EngineeringReview />} />

        <Route path="/request/:requestId" element={<RequestDetail />} />
        <Route path="/edit/:requestId" element={<RequestEditor />} />
        <Route path="/new" element={<RequestEditor isNew={true} />} />

        <Route
          path="/pricing-dashboard"
          element={
            <PricingAccessGate>
              <PricingDashboard />
            </PricingAccessGate>
          }
        />

        <Route
          path="/pricing/:requestId"
          element={
            <PricingAccessGate>
              <PricingWorkspace />
            </PricingAccessGate>
          }
        />

        <Route
          path="/pricing/:requestId/compare"
          element={
            <PricingAccessGate>
              <PricingComparisonPage />
            </PricingAccessGate>
          }
        />

        <Route
          path="/pricing/:requestId/scenario/:pricingId"
          element={
            <PricingAccessGate>
              <PricingPage />
            </PricingAccessGate>
          }
        />

        <Route
          path="/pricing/:requestId/scenario/:pricingId/thermo"
          element={
            <PricingAccessGate>
              <ThermoPricingPage />
            </PricingAccessGate>
          }
        />

        <Route
          path="/pricing20-dashboard"
          element={
            <Pricing20AccessGate>
              <Pricing20Dashboard />
            </Pricing20AccessGate>
          }
        />

        <Route
          path="/pricing20/:requestId"
          element={
            <Pricing20AccessGate>
              <Pricing20Workspace />
            </Pricing20AccessGate>
          }
        />

        <Route
          path="/pricing20/:requestId/scenario/:pricing20Id"
          element={
            <Pricing20AccessGate>
              <Pricing20Page />
            </Pricing20AccessGate>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}