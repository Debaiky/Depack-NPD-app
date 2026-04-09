import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import PricingEngineeringTab from "../components/pricing/PricingEngineeringTab";
import Pricing20PricingTab from "../components/pricing20/Pricing20PricingTab";
import Pricing20SummaryTab from "../components/pricing20/Pricing20SummaryTab";

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj || {}));
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function deepMergeEngineering(base, override) {
  if (Array.isArray(base) || Array.isArray(override)) {
    if (Array.isArray(override) && override.length > 0) return deepClone(override);
    if (Array.isArray(base)) return deepClone(base);
    return [];
  }

  if (!isPlainObject(base) && !isPlainObject(override)) {
    return override !== undefined ? override : base;
  }

  const result = {};
  const keys = new Set([
    ...Object.keys(base || {}),
    ...Object.keys(override || {}),
  ]);

  keys.forEach((key) => {
    const baseValue = base?.[key];
    const overrideValue = override?.[key];

    if (Array.isArray(baseValue) || Array.isArray(overrideValue)) {
      result[key] =
        Array.isArray(overrideValue) && overrideValue.length > 0
          ? deepClone(overrideValue)
          : Array.isArray(baseValue)
          ? deepClone(baseValue)
          : [];
      return;
    }

    if (isPlainObject(baseValue) || isPlainObject(overrideValue)) {
      result[key] = deepMergeEngineering(baseValue || {}, overrideValue || {});
      return;
    }

    result[key] =
      overrideValue !== undefined && overrideValue !== null && overrideValue !== ""
        ? overrideValue
        : baseValue;
  });

  return result;
}

function buildEmptyChangeSummary() {
  return {
    changedFieldsCount: 0,
    changedSections: [],
    changedFields: [],
    autoSummaryText: "",
  };
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-lg border text-sm ${
        active
          ? "bg-black text-white border-black"
          : "bg-white hover:bg-gray-50 border-gray-300"
      }`}
    >
      {children}
    </button>
  );
}

export default function Pricing20Page() {
  const { requestId, pricing20Id } = useParams();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("engineering");
  const [saveMessage, setSaveMessage] = useState("");

  const [requestData, setRequestData] = useState(null);
  const [engineeringReviewData, setEngineeringReviewData] = useState(null);

  const [scenarioSetup, setScenarioSetup] = useState({
    scenarioName: "",
    createdBy: "",
    scenarioDescription: "",
    scenarioDate: new Date().toISOString().slice(0, 10),
  });

  const [scenarioEngineering, setScenarioEngineering] = useState(null);
  const [engineeringChangeSummary, setEngineeringChangeSummary] = useState(
    buildEmptyChangeSummary()
  );

  const [pricing20Data, setPricing20Data] = useState({
    assumptions: {},
    sheetInputs: {},
    nonSheetInputs: {},
    materialPricing: {},
    packagingPricing: {},
    freight: {},
    workingCapital: {},
    commercial: {},
  });

  useEffect(() => {
    const remembered = localStorage.getItem("pricing20_created_by") || "";
    if (remembered) {
      setScenarioSetup((prev) => ({ ...prev, createdBy: remembered }));
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setSaveMessage("");

        const [reqRes, engRes, scenarioRes] = await Promise.all([
          fetch(`/.netlify/functions/get-request?requestId=${requestId}`),
          fetch(`/.netlify/functions/get-engineering-data?requestId=${requestId}`),
          fetch(
            `/.netlify/functions/get-pricing20-scenario?requestId=${requestId}&scenarioId=${pricing20Id}`
          ),
        ]);

        const reqJson = await reqRes.json();
        const engJson = await engRes.json();

        let scenarioJson = { success: false };
        try {
          scenarioJson = await scenarioRes.json();
        } catch {
          scenarioJson = { success: false };
        }

        const reqPayload = reqJson.success ? reqJson.payload || {} : {};
        const engPayload = engJson.success ? engJson.engineeringData || {} : {};
        const saved = scenarioJson.success ? scenarioJson.scenarioData || {} : {};

        setRequestData(reqPayload);
        setEngineeringReviewData(engPayload);

        setScenarioSetup({
          scenarioName: saved?.scenarioSetup?.scenarioName || "",
          createdBy:
            saved?.scenarioSetup?.createdBy ||
            localStorage.getItem("pricing20_created_by") ||
            "",
          scenarioDescription: saved?.scenarioSetup?.scenarioDescription || "",
          scenarioDate:
            saved?.scenarioSetup?.scenarioDate ||
            new Date().toISOString().slice(0, 10),
        });

        setScenarioEngineering(
          deepMergeEngineering(engPayload || {}, saved?.scenarioEngineering || {})
        );

        setEngineeringChangeSummary(
          saved?.engineeringChangeSummary || buildEmptyChangeSummary()
        );

        setPricing20Data(
          saved?.pricing20Data || {
            assumptions: {},
            sheetInputs: {},
            nonSheetInputs: {},
            materialPricing: {},
            packagingPricing: {},
            freight: {},
            workingCapital: {},
            commercial: {},
          }
        );
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [requestId, pricing20Id]);

  const assumptions = pricing20Data?.assumptions || {};

  const missingScenarioSetup =
    !scenarioSetup.createdBy?.trim() ||
    !scenarioSetup.scenarioName?.trim() ||
    !scenarioSetup.scenarioDescription?.trim() ||
    !scenarioSetup.scenarioDate?.trim();

  const missingFinancialAssumptions =
    !String(assumptions.baseCurrency || "").trim() ||
    !String(assumptions.eurUsd || "").trim() ||
    !String(assumptions.usdEgp || "").trim() ||
    !String(assumptions.interestRatePct || "").trim() ||
    !String(assumptions.dso || "").trim() ||
    !String(assumptions.dio || "").trim() ||
    !String(assumptions.dpo || "").trim();

  const saveScenario = async () => {
    try {
      if (missingScenarioSetup) {
        alert(
          "Please complete scenario name, your name, short description, and scenario date."
        );
        return;
      }

      if (missingFinancialAssumptions) {
        alert("Please complete all Financial Assumptions fields before saving.");
        return;
      }

      localStorage.setItem("pricing20_created_by", scenarioSetup.createdBy.trim());

   console.log("SAVING DATA", {
  requestId,
  scenarioId: pricing20Id,
  scenarioData: {
    scenarioSetup,
    scenarioEngineering,
    engineeringChangeSummary,
    pricing20Data,
  },
});

const res = await fetch("/.netlify/functions/save-pricing20-scenario", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          scenarioId: pricing20Id,
          scenarioData: {
            scenarioSetup,
            scenarioEngineering,
            engineeringChangeSummary,
            pricing20Data,
          },
        }),
      });

      const json = await res.json();

      if (!json.success) {
        alert(json.error || "Failed to save Pricing 2.0 scenario");
        return;
      }

      setSaveMessage("Pricing 2.0 scenario saved");
    } catch (err) {
      console.error(err);
      alert("Failed to save Pricing 2.0 scenario");
    }
  };

  if (loading) return <div className="p-6">Loading Pricing 2.0 scenario...</div>;
  if (!requestData || !scenarioEngineering) {
    return <div className="p-6">Failed to load scenario.</div>;
  }

  const product = requestData?.product || {};
  const project = requestData?.project || {};
  const customerBlock = requestData?.customer || {};
  const primaryCustomer = customerBlock?.customers?.[0] || {};

  const thumb =
    product?.productThumbnailUrl ||
    product?.productThumbnailPreview ||
    (product?.productThumbnailBase64
      ? `data:image/*;base64,${product.productThumbnailBase64}`
      : "");

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              {thumb ? (
                <img
                  src={thumb}
                  alt="Product thumbnail"
                  className="w-20 h-20 rounded-xl border object-cover bg-white"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl border bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                  No image
                </div>
              )}

              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">
                  Pricing 2.0 Scenario
                </div>
                <div className="text-2xl font-semibold">
                  {project.projectName || requestId}
                </div>
                <div className="text-sm text-gray-500">
                  {primaryCustomer.customerName || "—"} • {product.productType || "—"} •{" "}
                  {pricing20Id}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Link
                to={`/pricing20/${requestId}`}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100 bg-white"
              >
                ← Workspace
              </Link>

              <button
                onClick={saveScenario}
                className="rounded-lg bg-black text-white px-4 py-2 text-sm hover:bg-gray-800"
              >
                Save Scenario
              </button>
            </div>
          </div>

          {saveMessage ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              {saveMessage}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">Scenario Name *</div>
              <input
                className="w-full border rounded-lg p-2"
                value={scenarioSetup.scenarioName}
                onChange={(e) =>
                  setScenarioSetup((prev) => ({
                    ...prev,
                    scenarioName: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1">Your Name *</div>
              <input
                className="w-full border rounded-lg p-2"
                value={scenarioSetup.createdBy}
                onChange={(e) =>
                  setScenarioSetup((prev) => ({
                    ...prev,
                    createdBy: e.target.value,
                  }))
                }
              />
            </div>

            <div className="md:col-span-2">
              <div className="text-xs text-gray-500 mb-1">Short Description *</div>
              <textarea
                rows={3}
                className="w-full border rounded-lg p-2"
                value={scenarioSetup.scenarioDescription}
                onChange={(e) =>
                  setScenarioSetup((prev) => ({
                    ...prev,
                    scenarioDescription: e.target.value,
                  }))
                }
                placeholder="Short summary of this pricing scenario"
              />
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1">Scenario Date *</div>
              <input
                type="date"
                className="w-full border rounded-lg p-2"
                value={scenarioSetup.scenarioDate}
                onChange={(e) =>
                  setScenarioSetup((prev) => ({
                    ...prev,
                    scenarioDate: e.target.value,
                  }))
                }
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
          <div className="flex gap-2 flex-wrap">
            <TabButton
              active={activeTab === "engineering"}
              onClick={() => setActiveTab("engineering")}
            >
              Engineering Tab
            </TabButton>

            <TabButton
              active={activeTab === "pricing"}
              onClick={() => setActiveTab("pricing")}
            >
              Pricing Tab
            </TabButton>

            <TabButton
              active={activeTab === "summary"}
              onClick={() => setActiveTab("summary")}
            >
              Summary Tab
            </TabButton>
          </div>
        </div>

        {activeTab === "engineering" && (
          <PricingEngineeringTab
            requestData={requestData}
            engineeringReviewData={engineeringReviewData || {}}
            scenarioEngineering={scenarioEngineering}
            setScenarioEngineering={setScenarioEngineering}
            engineeringChangeSummary={engineeringChangeSummary}
            setEngineeringChangeSummary={setEngineeringChangeSummary}
          />
        )}

        {activeTab === "pricing" && (
          <Pricing20PricingTab
            requestData={requestData}
            scenarioEngineering={scenarioEngineering}
            pricing20Data={pricing20Data}
            setPricing20Data={setPricing20Data}
          />
        )}

        {activeTab === "summary" && (
          <Pricing20SummaryTab
            requestData={requestData}
            scenarioEngineering={scenarioEngineering}
            pricing20Data={pricing20Data}
          />
        )}
      </div>
    </div>
  );
}