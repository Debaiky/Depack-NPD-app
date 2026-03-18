import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import RequestDetail from "./pages/RequestDetail";
import RequestEditor from "./pages/RequestEditor";
import RequestWizard from "./components/RequestWizard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/new" element={<RequestWizard />} />
        <Route path="/request/:requestId" element={<RequestDetail />} />
        <Route path="/edit/:requestId" element={<RequestEditor />} />
      </Routes>
    </BrowserRouter>
  );
}