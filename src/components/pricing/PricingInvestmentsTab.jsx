import { useEffect, useMemo } from "react";

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

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function getIsSheet(requestData) {
  return requestData?.product?.productType === "Sheet Roll";
}

function Input({ value, onChange, placeholder = "" }) {
  return (
    <input
      className="w-full border rounded-lg px-3 py-2"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

function SelectInput({ value, onChange, options = [] }) {
  return (
    <select
      className="w-full border rounded-lg px-3 py-2"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
    >
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

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      {children}
    </label>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="border rounded-xl p-3 bg-white">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium break-words">{value}</div>
    </div>
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

function convertToEgp(value, currency, manualRate, usdEgp, eurUsd) {
  const amount = toNum(value);
  const curr = String(currency || "EGP").toUpperCase();
  const rate = toNum(manualRate);
  const usdRate = toNum(usdEgp);
  const eurUsdRate = toNum(eurUsd);

  if (curr === "USD") {
    return amount * (rate || usdRate);
  }

  if (curr === "EUR") {
    return amount * (rate || eurUsdRate * usdRate);
  }

  return amount;
}

function makeBlankInvestmentRow() {
  return {
    id: uid(),
    name: "",
    type: "",
    value: "",
    currency: "EGP",
    exchangeRate: "",
    supplier: "",
    leadTimeWeeks: "",
    amortize: false,
    amortizationQty: "",
  };
}

function mergeInvestmentRows(existingRows, engineeringRows) {
  const existingMap = new Map((existingRows || []).map((row) => [row.id, row]));

  const normalizedEngineeringRows = (engineeringRows || []).map((row, index) => {
    const rowId = row.id || `eng-inv-${index + 1}`;
    return {
      id: rowId,
      name: row.name || "",
      type: row.type || "",
      value: row.value || "",
      currency: row.currency || "EGP",
      exchangeRate: row.exchangeRate || "",
      supplier: row.supplier || "",
      leadTimeWeeks: row.leadTimeWeeks || "",
      amortize: row.amortize === true,
      amortizationQty: row.amortizationQty || "",
    };
  });

  const merged = normalizedEngineeringRows.map((row) => ({
    ...row,
    ...(existingMap.get(row.id) || {}),
  }));

  const extraRows = (existingRows || []).filter(
    (row) => !normalizedEngineeringRows.some((engRow) => engRow.id === row.id)
  );

  return [...merged, ...extraRows];
}

export default function PricingInvestmentsTab({
  requestData,
  scenarioSetup,
  engineeringReviewData,
  investmentsData,
  setInvestmentsData,
}) {
  const isSheet = getIsSheet(requestData);

  useEffect(() => {
    const engineeringRows = Array.isArray(engineeringReviewData?.investments)
      ? engineeringReviewData.investments
      : [];

    setInvestmentsData((prev) => {
      const existingRows = prev?.rows || [];
      return {
        ...(prev || {}),
        rows: mergeInvestmentRows(existingRows, engineeringRows),
        summary: prev?.summary || {
          totalInvestmentCost: 0,
          nonAmortizedInvestmentCost: 0,
          amortizationCostPerTon: 0,
          amortizationCostPer1000: 0,
        },
      };
    });
  }, [engineeringReviewData, setInvestmentsData]);

  const computedRows = useMemo(() => {
    return (investmentsData?.rows || []).map((row) => {
      const valueEgp = convertToEgp(
        row.value,
        row.currency,
        row.exchangeRate,
        scenarioSetup?.usdEgp,
        scenarioSetup?.eurUsd
      );

      let amortizationCostPerTon = 0;
      let amortizationCostPer1000 = 0;

      if (row.amortize) {
        const qty = toNum(row.amortizationQty);

        if (isSheet) {
          amortizationCostPerTon = qty > 0 ? valueEgp / qty : 0;
        } else {
          amortizationCostPer1000 = qty > 0 ? (valueEgp / qty) * 1000 : 0;
        }
      }

      return {
        ...row,
        valueEgp,
        amortizationCostPerTon,
        amortizationCostPer1000,
      };
    });
  }, [investmentsData?.rows, scenarioSetup?.usdEgp, scenarioSetup?.eurUsd, isSheet]);

  const summary = useMemo(() => {
    const totalInvestmentCost = computedRows.reduce(
      (sum, row) => sum + row.valueEgp,
      0
    );

    const nonAmortizedInvestmentCost = computedRows
      .filter((row) => !row.amortize)
      .reduce((sum, row) => sum + row.valueEgp, 0);

    const amortizationCostPerTon = computedRows
      .filter((row) => row.amortize)
      .reduce((sum, row) => sum + row.amortizationCostPerTon, 0);

    const amortizationCostPer1000 = computedRows
      .filter((row) => row.amortize)
      .reduce((sum, row) => sum + row.amortizationCostPer1000, 0);

    return {
      totalInvestmentCost,
      nonAmortizedInvestmentCost,
      amortizationCostPerTon,
      amortizationCostPer1000,
    };
  }, [computedRows]);

  useEffect(() => {
    setInvestmentsData((prev) => ({
      ...(prev || {}),
      summary,
    }));
  }, [summary, setInvestmentsData]);

  const updateRow = (id, patch) => {
    setInvestmentsData((prev) => ({
      ...(prev || {}),
      rows: (prev?.rows || []).map((row) =>
        row.id === id ? { ...row, ...patch } : row
      ),
    }));
  };

  const addRow = () => {
    setInvestmentsData((prev) => ({
      ...(prev || {}),
      rows: [...(prev?.rows || []), makeBlankInvestmentRow()],
    }));
  };

  const removeRow = (id) => {
    setInvestmentsData((prev) => ({
      ...(prev || {}),
      rows: (prev?.rows || []).filter((row) => row.id !== id),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="font-semibold">Investments</h3>

          <button
            type="button"
            onClick={addRow}
            className="rounded-lg bg-black text-white px-4 py-2 text-sm hover:bg-gray-800"
          >
            + Add Investment
          </button>
        </div>

        <SectionNote tone="blue">
          Investments are pulled from Engineering Review. You can edit them here,
          add new ones, and choose which lines should be amortized into pricing.
        </SectionNote>

        <SectionNote tone="gray">
          Amortization unit: {isSheet ? "tons" : "pcs"}. For non-sheet products,
          amortized lines are converted to cost per 1000 pcs.
        </SectionNote>

        {(computedRows || []).length === 0 ? (
          <SectionNote tone="orange">No investments added yet.</SectionNote>
        ) : (
          <div className="space-y-4">
            {computedRows.map((row) => (
              <div key={row.id} className="rounded-xl border p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-9 gap-3">
                  <Field label="Investment Name">
                    <Input
                      value={row.name}
                      onChange={(v) => updateRow(row.id, { name: v })}
                    />
                  </Field>

                  <Field label="Type">
                    <SelectInput
                      value={row.type || ""}
                      onChange={(v) => updateRow(row.id, { type: v })}
                      options={[
                        { value: "", label: "Select" },
                        "Thermoforming Tools",
                        "Printing Tools",
                        "Shrink Sleeve Tools",
                        "Hybrid Tools",
                        "Extrusion Tools",
                        "Molds",
                        "Other",
                      ]}
                    />
                  </Field>

                  <Field label="Value">
                    <Input
                      value={row.value}
                      onChange={(v) => updateRow(row.id, { value: v })}
                    />
                  </Field>

                  <Field label="Currency">
                    <SelectInput
                      value={row.currency || "EGP"}
                      onChange={(v) => updateRow(row.id, { currency: v })}
                      options={["EGP", "USD", "EUR"]}
                    />
                  </Field>

                  <Field label="Exchange Rate">
                    <Input
                      value={row.exchangeRate}
                      onChange={(v) => updateRow(row.id, { exchangeRate: v })}
                      placeholder="optional"
                    />
                  </Field>

                  <Field label="Supplier">
                    <Input
                      value={row.supplier}
                      onChange={(v) => updateRow(row.id, { supplier: v })}
                    />
                  </Field>

                  <Field label="Lead Time (weeks)">
                    <Input
                      value={row.leadTimeWeeks}
                      onChange={(v) => updateRow(row.id, { leadTimeWeeks: v })}
                    />
                  </Field>

                  <Field label="Amortize">
                    <SelectInput
                      value={row.amortize ? "Yes" : "No"}
                      onChange={(v) => updateRow(row.id, { amortize: v === "Yes" })}
                      options={["No", "Yes"]}
                    />
                  </Field>

                  <Field label={`Amortization Qty (${isSheet ? "ton" : "pcs"})`}>
                    <Input
                      value={row.amortizationQty}
                      onChange={(v) => updateRow(row.id, { amortizationQty: v })}
                      placeholder={isSheet ? "e.g. 500 ton" : "e.g. 5,000,000 pcs"}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <InfoTile
                    label="Investment Value in EGP"
                    value={`${fmt(row.valueEgp, 3)} EGP`}
                  />

                  {isSheet ? (
                    <InfoTile
                      label="Amortization Cost / Ton"
                      value={`${fmt(row.amortizationCostPerTon, 3)} EGP`}
                    />
                  ) : (
                    <InfoTile
                      label="Amortization Cost / 1000 pcs"
                      value={`${fmt(row.amortizationCostPer1000, 3)} EGP`}
                    />
                  )}

                  <InfoTile
                    label="Amortization Status"
                    value={row.amortize ? "Amortized" : "Not amortized"}
                  />

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="text-red-600 text-sm hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
        <h3 className="font-semibold">Investment Summary</h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <InfoTile
            label="Total Investment Cost"
            value={`${fmt(summary.totalInvestmentCost, 3)} EGP`}
          />

          <InfoTile
            label="Non-Amortized Investment Cost"
            value={`${fmt(summary.nonAmortizedInvestmentCost, 3)} EGP`}
          />

          {isSheet ? (
            <InfoTile
              label="Amortization Cost / Ton"
              value={`${fmt(summary.amortizationCostPerTon, 3)} EGP`}
            />
          ) : (
            <InfoTile
              label="Amortization Cost / 1000 pcs"
              value={`${fmt(summary.amortizationCostPer1000, 3)} EGP`}
            />
          )}

          <InfoTile
            label="Amortized Lines"
            value={String(computedRows.filter((row) => row.amortize).length)}
          />
        </div>
      </div>
    </div>
  );
}