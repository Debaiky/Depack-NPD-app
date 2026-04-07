import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import PricingEngineeringTab from "../components/pricing/PricingEngineeringTab";
import PricingBomCostTab, {
  buildInitialBomData,
} from "../components/pricing/PricingBomCostTab";
import PricingInvestmentsTab from "../components/pricing/PricingInvestmentsTab";
import PricingResultsTab from "../components/pricing/PricingResultsTab";

function toNum(v) {
  const n = parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isNaN(n) ? 0 : n;
}

function fmt(v, d = 3) {
  const num = Number(v || 0);
  return num.toLocaleString(undefined, {
    maximumFractionDigits: d,
    minimumFractionDigits: 0,
  });
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj || {}));
}

function Card({ title, children, right }) {
  return (
    <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-semibold text-lg">{title}</h2>
        {right || null}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      {children}
    </label>
  );
}

function Input({ value, onChange, placeholder = "" }) {
  return (
    <input
      className="w-full border rounded-lg p-2"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

function SelectInput({ value, onChange, options = [] }) {
  return (
    <select
      className="w-full border rounded-lg p-2"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select</option>
      {options.map((o) => {
        const valueKey = typeof o === "string" ? o : o.value;
        const labelKey = typeof o === "string" ? o : o.label;
        return (
          <option key={valueKey} value={valueKey}>
            {labelKey}
          </option>
        );
      })}
    </select>
  );
}

function SectionNote({ children, tone = "gray" }) {
  const styles = {
    gray: "border-gray-200 bg-gray-50 text-gray-700",
    red: "border-red-200 bg-red-50 text-red-700",
    orange: "border-orange-200 bg-orange-50 text-orange-700",
    green: "border-green-200 bg-green-50 text-green-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
  };

  return <div className={`rounded-xl border p-3 text-sm ${styles[tone]}`}>{children}</div>;
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

function getIsSheet(requestData) {
  return requestData?.product?.productType === "Sheet Roll";
}

function buildEmptyChangeSummary() {
  return {
    changedFieldsCount: 0,
    changedSections: [],
    changedFields: [],
    autoSummaryText: "",
  };
}

function buildInitialScenarioSetup(savedScenario, savedPricingData) {
  return {
    scenarioName: savedScenario?.ScenarioName || "",
    createdBy:
      savedScenario?.CreatedBy || localStorage.getItem("pricingCreatedBy") || "",
    scenarioStatus: savedScenario?.ScenarioStatus || "Draft",
    scenarioNote: savedScenario?.ScenarioNote || "",
    currency:
      savedScenario?.ScenarioCurrency ||
      savedPricingData?.scenarioSetup?.currency ||
      savedPricingData?.pricing?.currency ||
      "",
    usdEgp:
      savedScenario?.UsdEgp ||
      savedPricingData?.scenarioSetup?.usdEgp ||
      savedPricingData?.pricing?.usdEgp ||
      "",
    eurUsd:
      savedScenario?.EurUsd ||
      savedPricingData?.scenarioSetup?.eurUsd ||
      savedPricingData?.pricing?.eurUsd ||
      "",
    compareSelected: (savedScenario?.CompareSelected || "") === "Yes",
  };
}

function buildInitialInvestmentsData(savedInvestmentsData, engineeringReviewData, requestData) {
  const isSheet = getIsSheet(requestData);

  if (savedInvestmentsData) return savedInvestmentsData;

  const engineeringRows = Array.isArray(engineeringReviewData?.investments)
    ? engineeringReviewData.investments
    : [];

  return {
    rows: engineeringRows.map((row, idx) => ({
      id: row.id || `inv-${idx + 1}`,
      name: row.name || "",
      type: row.type || "",
      value: row.value || "",
      currency: row.currency || "EGP",
      exchangeRate: row.exchangeRate || "",
      supplier: row.supplier || "",
      leadTimeWeeks: row.leadTimeWeeks || "",
      amortize: row.amortize === true,
      amortizationQty: row.amortizationQty || "",
    })),
    summary: {
      totalInvestmentCost: 0,
      nonAmortizedInvestmentCost: 0,
      amortizationCostPerTon: isSheet ? 0 : 0,
      amortizationCostPer1000: isSheet ? 0 : 0,
    },
  };
}

function buildInitialResultsData(savedResultsData, requestData) {
  if (savedResultsData) return savedResultsData;

  const isSheet = getIsSheet(requestData);

  if (isSheet) {
    return {
      mode: "conversionPerTon",
      inputs: {
        requiredExtrusionConversionPerDay: "",
        requiredConversionCostPerTon: "",
        requiredSalesPricePerTon: "",
      },
      summary: {},
    };
  }

  return {
    mode: "conversionPer1000",
    inputs: {
      requiredExtrusionConversionPerDay: "",
      requiredThermoConversionPerDay: "",
      requiredConversionCostPer1000: "",
      requiredSellingPricePer1000: "",
    },
    summary: {},
  };
}

export default function PricingPage() {
  const { requestId, pricingId } = useParams();

  const [loading, setLoading] = useState(true);
  const [requestData, setRequestData] = useState(null);
  const [engineeringReviewData, setEngineeringReviewData] = useState(null);
  const [scenarioMeta, setScenarioMeta] = useState(null);

  const [activeTab, setActiveTab] = useState("engineering");
  const [saveMessage, setSaveMessage] = useState("");

  const [scenarioSetup, setScenarioSetup] = useState({
    scenarioName: "",
    createdBy: "",
    scenarioStatus: "Draft",
    scenarioNote: "",
    currency: "",
    usdEgp: "",
    eurUsd: "",
    compareSelected: false,
  });

  const [scenarioEngineering, setScenarioEngineering] = useState(null);
  const [engineeringChangeSummary, setEngineeringChangeSummary] = useState(
    buildEmptyChangeSummary()
  );

  const [bomData, setBomData] = useState(null);
  const [investmentsData, setInvestmentsData] = useState(null);
  const [resultsData, setResultsData] = useState(null);

  useEffect(() => {
    const remembered = localStorage.getItem("pricingCreatedBy") || "";
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
          fetch(`/.netlify/functions/get-pricing-scenario?pricingId=${pricingId}`),
        ]);

        const reqJson = await reqRes.json();
        const engJson = await engRes.json();
        const scenarioJson = await scenarioRes.json();

        const reqPayload = reqJson.success ? reqJson.payload || {} : {};
        const engPayload = engJson.success ? engJson.engineeringData || {} : {};
        const hasSavedScenario = scenarioJson.success;
        const savedPricingData = hasSavedScenario ? scenarioJson.pricingData || {} : {};

        const nextScenarioSetup = buildInitialScenarioSetup(
          hasSavedScenario ? scenarioJson.scenario : null,
          savedPricingData
        );

        const nextScenarioEngineering = deepClone(
          savedPricingData.engineeringScenario || engPayload || {}
        );

        setRequestData(reqPayload);
        setEngineeringReviewData(engPayload);
        setScenarioMeta(hasSavedScenario ? scenarioJson.scenario || null : null);

        setScenarioSetup(nextScenarioSetup);
        setScenarioEngineering(nextScenarioEngineering);

        setEngineeringChangeSummary(
          savedPricingData.engineeringChangeSummary || buildEmptyChangeSummary()
        );

        setBomData(
          savedPricingData.bomData ||
            buildInitialBomData(reqPayload, nextScenarioEngineering)
        );

        setInvestmentsData(
          buildInitialInvestmentsData(
            savedPricingData.investmentsData,
            engPayload,
            reqPayload
          )
        );

        setResultsData(
          buildInitialResultsData(savedPricingData.resultsData, reqPayload)
        );
      } catch (error) {
        console.error("Failed to load pricing page:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [requestId, pricingId]);

  useEffect(() => {
    if (!bomData) return;

    setBomData((prev) => ({
      ...(prev || {}),
      scenarioSetup: {
        ...(prev?.scenarioSetup || {}),
        currency: scenarioSetup.currency || "",
        usdEgp: scenarioSetup.usdEgp || "",
        eurUsd: scenarioSetup.eurUsd || "",
      },
    }));
  }, [scenarioSetup.currency, scenarioSetup.usdEgp, scenarioSetup.eurUsd]);

  const product = requestData?.product || {};
  const project = requestData?.project || {};
  const customerBlock = requestData?.customer || {};
  const primaryCustomer = customerBlock?.customers?.[0] || {};
  const isSheet = getIsSheet(requestData);

  const thumb =
    product?.productThumbnailUrl ||
    product?.productThumbnailPreview ||
    (product?.productThumbnailBase64
      ? `data:image/*;base64,${product.productThumbnailBase64}`
      : "");

  const missingRequired =
    !scenarioSetup.scenarioName?.trim() ||
    !scenarioSetup.createdBy?.trim() ||
    !scenarioSetup.scenarioStatus?.trim() ||
    !scenarioSetup.scenarioNote?.trim() ||
    !scenarioSetup.currency ||
    !scenarioSetup.usdEgp ||
    !scenarioSetup.eurUsd;

  const workspaceMetric = useMemo(() => {
    if (isSheet) {
      return toNum(resultsData?.summary?.requiredSalesPricePerTon);
    }
    return toNum(resultsData?.summary?.requiredSellingPricePer1000);
  }, [resultsData, isSheet]);

  const saveScenario = async () => {
    try {
      if (missingRequired) {
        alert("Please complete all required scenario setup fields.");
        return;
      }

      localStorage.setItem("pricingCreatedBy", scenarioSetup.createdBy.trim());

      const pricingData = {
        scenarioSetup,
        engineeringScenario: scenarioEngineering || {},
        engineeringChangeSummary: engineeringChangeSummary || {},
        bomData: bomData || {},
        investmentsData: investmentsData || {},
        resultsData: resultsData || {},
      };

      const res = await fetch("/.netlify/functions/save-pricing-scenario", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          pricingId,
          scenarioName: scenarioSetup.scenarioName,
          scenarioNote: scenarioSetup.scenarioNote,
          createdBy: scenarioSetup.createdBy,
          scenarioStatus: scenarioSetup.scenarioStatus,
          compareSelected: scenarioSetup.compareSelected,
          scenarioCurrency: scenarioSetup.currency,
          usdEgp: scenarioSetup.usdEgp,
          eurUsd: scenarioSetup.eurUsd,
          pricingData,
          totalCostPer1000: workspaceMetric || 0,
          sellingPricePer1000: workspaceMetric || 0,
          marginPct: "",
        }),
      });

      const json = await res.json();

      if (!json.success) {
        alert(json.error || "Failed to save pricing scenario");
        return;
      }

      setSaveMessage("Pricing scenario saved");
      setScenarioMeta((prev) => ({
        ...(prev || {}),
        PricingID: json.pricingId || pricingId,
      }));
    } catch (error) {
      console.error(error);
      alert("Failed to save pricing scenario");
    }
  };

  if (loading) {
    return <div className="p-6">Loading pricing scenario...</div>;
  }

  if (!requestData || !scenarioEngineering || !bomData || !investmentsData || !resultsData) {
    return <div className="p-6">Failed to load pricing scenario data.</div>;
  }

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

              <div className="min-w-[240px]">
                <div className="text-xs uppercase tracking-wide text-gray-500">
                  Pricing Scenario
                </div>
                <div className="text-2xl font-semibold">
                  {project.projectName || requestId}
                </div>
                <div className="text-sm text-blue-600 font-medium">
                  {isSheet ? "Sheet Product Flow" : "Thermoformed Product Flow"}
                </div>
                <div className="text-sm text-gray-500">
                  {primaryCustomer.customerName || "—"} • {product.productType || "—"} •{" "}
                  {pricingId}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Link
                to={`/pricing/${requestId}`}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100 bg-white"
              >
                ← Workspace
              </Link>

              <button
                onClick={saveScenario}
                disabled={missingRequired}
                className={`rounded-lg px-4 py-2 text-sm text-white ${
                  missingRequired ? "bg-gray-400" : "bg-black hover:bg-gray-800"
                }`}
              >
                Save Scenario
              </button>
            </div>
          </div>

          {saveMessage ? (
            <SectionNote tone="green">{saveMessage}</SectionNote>
          ) : null}
        </div>

        <Card title="Scenario Setup">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {missingRequired && (
              <div className="md:col-span-4">
                <SectionNote tone="red">
                  Scenario Name, Creator, Status, Notes, Offer Currency, USD/EGP,
                  and EUR/USD are required.
                </SectionNote>
              </div>
            )}

            <Field label="Scenario Name">
              <Input
                value={scenarioSetup.scenarioName}
                onChange={(v) =>
                  setScenarioSetup((prev) => ({ ...prev, scenarioName: v }))
                }
              />
            </Field>

            <Field label="Creator">
              <Input
                value={scenarioSetup.createdBy}
                onChange={(v) =>
                  setScenarioSetup((prev) => ({ ...prev, createdBy: v }))
                }
              />
            </Field>

            <Field label="Status">
              <SelectInput
                value={scenarioSetup.scenarioStatus}
                onChange={(v) =>
                  setScenarioSetup((prev) => ({ ...prev, scenarioStatus: v }))
                }
                options={["Draft", "Final", "Archived"]}
              />
            </Field>

            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={scenarioSetup.compareSelected}
                  onChange={(e) =>
                    setScenarioSetup((prev) => ({
                      ...prev,
                      compareSelected: e.target.checked,
                    }))
                  }
                />
                Add to comparison
              </label>
            </div>

            <div className="md:col-span-2">
              <Field label="Notes">
                <Input
                  value={scenarioSetup.scenarioNote}
                  onChange={(v) =>
                    setScenarioSetup((prev) => ({ ...prev, scenarioNote: v }))
                  }
                />
              </Field>
            </div>

            <Field label="Offer Currency">
              <SelectInput
                value={scenarioSetup.currency}
                onChange={(v) =>
                  setScenarioSetup((prev) => ({ ...prev, currency: v }))
                }
                options={["EGP", "USD", "EUR"]}
              />
            </Field>

            <Field label="USD / EGP Exchange Rate">
              <Input
                value={scenarioSetup.usdEgp}
                onChange={(v) =>
                  setScenarioSetup((prev) => ({ ...prev, usdEgp: v }))
                }
              />
            </Field>

            <Field label="EUR / USD Exchange Rate">
              <Input
                value={scenarioSetup.eurUsd}
                onChange={(v) =>
                  setScenarioSetup((prev) => ({ ...prev, eurUsd: v }))
                }
              />
            </Field>
          </div>
        </Card>

        <Card
          title="Scenario Tabs"
          right={
            engineeringChangeSummary?.changedFieldsCount > 0 ? (
              <SectionNote tone="orange">
                {engineeringChangeSummary.changedFieldsCount} field
                {engineeringChangeSummary.changedFieldsCount === 1 ? "" : "s"} changed
                vs engineering review
              </SectionNote>
            ) : (
              <SectionNote tone="green">No pricing overrides vs engineering review</SectionNote>
            )
          }
        >
          <div className="flex gap-2 flex-wrap">
            <TabButton
              active={activeTab === "engineering"}
              onClick={() => setActiveTab("engineering")}
            >
              Engineering Data
            </TabButton>

            <TabButton active={activeTab === "bom"} onClick={() => setActiveTab("bom")}>
              BOM Cost
            </TabButton>

            <TabButton
              active={activeTab === "investments"}
              onClick={() => setActiveTab("investments")}
            >
              Investments
            </TabButton>

            <TabButton
              active={activeTab === "results"}
              onClick={() => setActiveTab("results")}
            >
              Results
            </TabButton>
          </div>
        </Card>

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

        {activeTab === "bom" && (
          <PricingBomCostTab
            requestData={requestData}
            scenarioSetup={scenarioSetup}
            scenarioEngineering={scenarioEngineering}
            bomData={bomData}
            setBomData={setBomData}
          />
        )}

        {activeTab === "investments" && (
          <PricingInvestmentsTab
            requestData={requestData}
            scenarioSetup={scenarioSetup}
            engineeringReviewData={engineeringReviewData || {}}
            scenarioEngineering={scenarioEngineering}
            investmentsData={investmentsData}
            setInvestmentsData={setInvestmentsData}
          />
        )}

        {activeTab === "results" && (
          <PricingResultsTab
            requestData={requestData}
            scenarioEngineering={scenarioEngineering}
            bomData={bomData}
            investmentsData={investmentsData}
            resultsData={resultsData}
            setResultsData={setResultsData}
          />
        )}

        <Card title="Scenario Comparison Snapshot">
          <SectionNote tone="gray">
            Placeholder only for now. Comparison snapshot details will be added later.
          </SectionNote>
        </Card>

        <Card title="Project Reference">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
            <div className="rounded-xl border bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Customer</div>
              <div className="font-medium">{primaryCustomer.customerName || "—"}</div>
            </div>

            <div className="rounded-xl border bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Project</div>
              <div className="font-medium">{project.projectName || "—"}</div>
            </div>

            <div className="rounded-xl border bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Product</div>
              <div className="font-medium">{product.productType || "—"}</div>
            </div>

            <div className="rounded-xl border bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Request No.</div>
              <div className="font-medium">{requestId || "—"}</div>
            </div>
          </div>
        </Card>

        <Card title="Live Scenario Snapshot">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <SectionNote tone="blue">
              Currency: {scenarioSetup.currency || "—"}
            </SectionNote>

            <SectionNote tone="blue">
              Changed Fields: {engineeringChangeSummary?.changedFieldsCount || 0}
            </SectionNote>

            <SectionNote tone="blue">
              {isSheet
                ? `Sales Price / Ton: ${fmt(
                    resultsData?.summary?.requiredSalesPricePerTon || 0,
                    3
                  )} EGP`
                : `Selling Price / 1000 pcs: ${fmt(
                    resultsData?.summary?.requiredSellingPricePer1000 || 0,
                    3
                  )} EGP`}
            </SectionNote>

            <SectionNote tone="blue">
              {isSheet
                ? `Conversion / Ton: ${fmt(
                    resultsData?.summary?.requiredConversionCostPerTon || 0,
                    3
                  )} EGP`
                : `Conversion / 1000 pcs: ${fmt(
                    resultsData?.summary?.requiredConversionCostPer1000 || 0,
                    3
                  )} EGP`}
            </SectionNote>
          </div>
        </Card>
      </div>
    </div>
  );
}