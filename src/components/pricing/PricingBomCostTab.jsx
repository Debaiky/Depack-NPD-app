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

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      {children}
    </label>
  );
}

function Input({ value, onChange, placeholder = "", readOnly = false }) {
  return (
    <input
      className={`w-full border rounded-lg px-3 py-2 ${
        readOnly ? "bg-gray-50 text-gray-600" : ""
      }`}
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
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
  const directRate = toNum(manualRate);

  if (curr === "USD") return amount * (directRate || toNum(usdEgp));
  if (curr === "EUR") return amount * (directRate || toNum(eurUsd) * toNum(usdEgp));
  return amount;
}

function getIsSheet(requestData) {
  return requestData?.product?.productType === "Sheet Roll";
}

function getUnitWeightG(requestData, scenarioEngineering) {
  return toNum(
    scenarioEngineering?.thermo?.unitWeight_g ||
      requestData?.product?.productWeightG ||
      0
  );
}

function getSheetUtilFactor(requestData, scenarioEngineering) {
  if (getIsSheet(requestData)) return 1;
  const pct = toNum(scenarioEngineering?.thermo?.sheetUtilizationPct);
  return pct > 0 ? pct / 100 : 1;
}

function perTonToPer1000(perTon, requestData, scenarioEngineering) {
  const unitWeightG = getUnitWeightG(requestData, scenarioEngineering);
  const util = getSheetUtilFactor(requestData, scenarioEngineering);
  if (!unitWeightG || !util) return 0;
  return (toNum(perTon) / 1000000) * unitWeightG * 1000 / util;
}

function per1000ToPerTon(per1000, requestData, scenarioEngineering) {
  const unitWeightG = getUnitWeightG(requestData, scenarioEngineering);
  const util = getSheetUtilFactor(requestData, scenarioEngineering);
  if (!unitWeightG || !util) return 0;
  return (toNum(per1000) / 1000) * (1000000 / unitWeightG) * util;
}

function getDecorationType(requestData, scenarioEngineering) {
  const reqType = requestData?.decoration?.decorationType || "No decoration";
  if (reqType && reqType !== "No decoration") return reqType;

  if (scenarioEngineering?.decorationEngineering?.enabled) {
    if (scenarioEngineering?.decorationEngineering?.print) return "Dry offset printing";
    if (scenarioEngineering?.decorationEngineering?.sleeve) return "Shrink sleeve";
    if (scenarioEngineering?.decorationEngineering?.hybrid) return "Hybrid cup";
  }

  return "No decoration";
}

function getPackagingCase(requestData, scenarioEngineering) {
  const isSheet = getIsSheet(requestData);

  if (isSheet) {
    const palletType = String(scenarioEngineering?.sheetPackaging?.palletType || "").trim();
    const rollsPerPallet = toNum(scenarioEngineering?.sheetPackaging?.rollsPerPallet || 0);
    const palletUsed = palletType !== "" || rollsPerPallet > 0;
    return palletUsed ? "sheet_pallet" : "sheet_roll";
  }

  const palletSelected =
    String(scenarioEngineering?.packaging?.pallet?.palletSelected || "Yes") === "Yes";

  return palletSelected ? "product_pallet" : "product_carton";
}

function buildGroupedMaterialRows(scenarioEngineering) {
  const ms = scenarioEngineering?.materialSheet || {};
  const layerAPct = toNum(ms.layerAPct) / 100;
  const layerBPct = 1 - layerAPct;

  const grouped = new Map();

  (ms.layerA || []).forEach((row) => {
    const name = String(row.name || "").trim();
    if (!name) return;

    if (!grouped.has(name)) {
      grouped.set(name, {
        name,
        pctLayerA: 0,
        pctLayerB: 0,
        rowType: "material",
      });
    }

    grouped.get(name).pctLayerA += toNum(row.pct);
  });

  (ms.layerB || []).forEach((row) => {
    const name = String(row.name || "").trim();
    if (!name) return;

    if (!grouped.has(name)) {
      grouped.set(name, {
        name,
        pctLayerA: 0,
        pctLayerB: 0,
        rowType: "material",
      });
    }

    grouped.get(name).pctLayerB += toNum(row.pct);
  });

  const coatingUsed = String(ms.coatingUsed || "No") === "Yes";
  const coatingWeight = toNum(ms.coatingWeight_g_m2);
  const density = toNum(ms.density);
  const thicknessMic = toNum(scenarioEngineering?.sheetSpecs?.thickness_mic);

  const plasticWeightPerM2 = density > 0 && thicknessMic > 0 ? density * thicknessMic : 0;
  const totalWeightPerM2 = plasticWeightPerM2 + (coatingUsed ? coatingWeight : 0);
  const coatingShare = totalWeightPerM2 > 0 ? coatingWeight / totalWeightPerM2 : 0;
  const plasticShare = 1 - coatingShare;

  const rows = Array.from(grouped.values()).map((item) => {
    const totalPct =
      (item.pctLayerA / 100) * layerAPct + (item.pctLayerB / 100) * layerBPct;

    return {
      id: `mat-${item.name}`,
      name: item.name,
      rowType: "material",
      pctLayerA: item.pctLayerA,
      pctLayerB: item.pctLayerB,
      totalPct: totalPct * 100,
      consumptionKgPerTon: totalPct * 1000 * plasticShare,
      wastePct: "",
      pricePerUnit: "",
      currency: "EGP",
      exchangeRate: "",
    };
  });

  if (coatingUsed && String(ms.coatingName || "").trim()) {
    rows.push({
      id: `coat-${ms.coatingName}`,
      name: ms.coatingName,
      rowType: "coating",
      pctLayerA: "",
      pctLayerB: "",
      totalPct: coatingShare * 100,
      consumptionKgPerTon: coatingShare * 1000,
      wastePct: "",
      pricePerUnit: "",
      currency: "EGP",
      exchangeRate: "",
    });
  }

  return rows;
}

function desiredPackagingLines(packagingCase) {
  if (packagingCase === "sheet_pallet") {
    return [
      { id: "core", name: "Core", unit: "unit" },
      { id: "labels", name: "Labels", unit: "unit" },
      { id: "separators", name: "Separators", unit: "unit" },
      { id: "strap", name: "Strap", unit: "m" },
      { id: "foam", name: "Foam Sheet", unit: "m" },
      { id: "stretch", name: "Stretch Film", unit: "kg" },
      { id: "pallet", name: "Pallet", unit: "unit" },
    ];
  }

  if (packagingCase === "sheet_roll") {
    return [
      { id: "core", name: "Core", unit: "unit" },
      { id: "labels", name: "Labels", unit: "unit" },
      { id: "separators", name: "Separators", unit: "unit" },
      { id: "strap", name: "Strap", unit: "m" },
      { id: "foam", name: "Foam Sheet", unit: "m" },
      { id: "stretch", name: "Stretch Film", unit: "kg" },
    ];
  }

  if (packagingCase === "product_carton") {
    return [
      { id: "bag", name: "Bag", unit: "unit" },
      { id: "carton", name: "Carton", unit: "unit" },
      { id: "label", name: "Label", unit: "unit" },
      { id: "tape", name: "Tape", unit: "m" },
    ];
  }

  return [
    { id: "bag", name: "Bag", unit: "unit" },
    { id: "carton", name: "Carton", unit: "unit" },
    { id: "label", name: "Label", unit: "unit" },
    { id: "tape", name: "Tape", unit: "m" },
    { id: "stretch", name: "Stretch Film", unit: "kg" },
    { id: "pallet", name: "Pallet", unit: "unit" },
  ];
}

function buildInitialPackagingRows(packagingCase) {
  return desiredPackagingLines(packagingCase).map((item) => ({
    ...item,
    manualQty: "",
    wastePct: "",
    pricePerUnit: "",
    currency: "EGP",
    exchangeRate: "",
  }));
}

export function buildInitialBomData(requestData, scenarioEngineering) {
  const packagingCase = getPackagingCase(requestData, scenarioEngineering);
  const decoType = getDecorationType(requestData, scenarioEngineering);

  return {
    material: {
      rows: buildGroupedMaterialRows(scenarioEngineering),
      summary: {
        materialBaseCostPerTon: 0,
        materialWasteCostPerTon: 0,
        materialBaseCostPer1000: 0,
        materialWasteCostPer1000: 0,
      },
    },

    packaging: {
      selectedPackagingCase: packagingCase,
      rows: buildInitialPackagingRows(packagingCase),
      summary: {
        totalPackagingCostPerBasis: 0,
        packagingBaseCostPerTon: 0,
        packagingWasteCostPerTon: 0,
        packagingBaseCostPer1000: 0,
        packagingWasteCostPer1000: 0,
        totalPackagingCostPerRoll: 0,
        totalPackagingCostPerPallet: 0,
        totalPackagingCostPerCarton: 0,
      },
    },

    decoration: {
      enabled: decoType !== "No decoration",
      type:
        decoType === "Dry offset printing"
          ? "Printing"
          : decoType === "Shrink sleeve"
          ? "Sleeve"
          : decoType === "Hybrid cup"
          ? "Hybrid"
          : "Printing",
      printing: {
        inkConsumption_g_per_1000:
          scenarioEngineering?.decorationEngineering?.print?.inkWeightPer1000Cups || "",
        inkCostPerKg: "",
        wastePct: "",
      },
      sleeve: {
        sleeveCostPer1000: "",
        wastePct: "",
      },
      hybrid: {
        blankCostPerPiece: "",
        bottomCostPerPiece: "",
        wastePct: "",
      },
      summary: {
        decorationCostPer1000: 0,
        decorationWasteCostPer1000: 0,
      },
    },

    workingCapital: {
      DSO: "0",
      DIO: "30",
      DPO: "30",
      interestRatePct: "0",
      summary: {
        workingCapitalPct: 0,
        workingCapitalCostPerTon: 0,
        workingCapitalCostPer1000: 0,
        DSO: "0",
        DIO: "30",
        DPO: "30",
        interestRatePct: "0",
      },
    },

    freight: {
      selectedOption: getIsSheet(requestData) ? "largeTruck" : "container40hc",
      freightCostPerTrip: "",
      summary: {
        truckOrContainerSize: getIsSheet(requestData) ? "largeTruck" : "container40hc",
        qtyPerTrip: 0,
        freightCostPerTon: 0,
        freightCostPer1000: 0,
      },
    },
  };
}

function mergeRowsById(oldRows, newRows) {
  const oldMap = new Map((oldRows || []).map((row) => [row.id, row]));
  return (newRows || []).map((row) => ({
    ...row,
    ...(oldMap.get(row.id) || {}),
  }));
}

function getDerivedPackagingContext(requestData, scenarioEngineering, packagingCase) {
  const isSheet = getIsSheet(requestData);

  if (isSheet) {
    const rollsPerPallet = toNum(scenarioEngineering?.sheetPackaging?.rollsPerPallet);
    const rollWeightKg = toNum(
      scenarioEngineering?.sheetPackaging?.rollWeight_kg ||
        scenarioEngineering?.sheetSpecs?.rollTargetWeight_kg
    );
    const labelsPerRoll = toNum(scenarioEngineering?.sheetPackaging?.labelsPerRoll);
    const labelsPerPallet =
      toNum(scenarioEngineering?.sheetPackaging?.labelsPerPallet) ||
      labelsPerRoll * rollsPerPallet;
    const separatorsPerPallet = toNum(scenarioEngineering?.sheetPackaging?.separatorsPerPallet);
    const strapLength = toNum(scenarioEngineering?.sheetPackaging?.strapLength_m);
    const foamLength = toNum(scenarioEngineering?.sheetPackaging?.foamLength_m);
    const stretchKg = toNum(scenarioEngineering?.sheetPackaging?.stretchKgPerPallet);
    const coreUses = toNum(scenarioEngineering?.sheetPackaging?.coreUses) || 1;
    const palletUses = toNum(scenarioEngineering?.sheetPackaging?.palletUses) || 1;

    if (packagingCase === "sheet_pallet") {
      const totalWeightPerPalletTon =
        rollsPerPallet > 0 && rollWeightKg > 0
          ? (rollsPerPallet * rollWeightKg) / 1000
          : 0;

      return {
        basisLabel: "Pallet",
        basisQtyLabel: "Consumption / Pallet",
        denominatorLabel: "Ton / Pallet",
        denominatorValue: totalWeightPerPalletTon,
        piecesPerBasis: 0,
        lines: {
          core: rollsPerPallet / coreUses,
          labels: labelsPerPallet,
          separators: separatorsPerPallet,
          strap: strapLength,
          foam: foamLength,
          stretch: stretchKg,
          pallet: 1 / palletUses,
        },
      };
    }

    const totalWeightPerRollTon = rollWeightKg > 0 ? rollWeightKg / 1000 : 0;

    return {
      basisLabel: "Roll",
      basisQtyLabel: "Consumption / Roll",
      denominatorLabel: "Ton / Roll",
      denominatorValue: totalWeightPerRollTon,
      piecesPerBasis: 0,
      lines: {
        core: 1 / coreUses,
        labels: labelsPerRoll,
        separators: rollsPerPallet > 0 ? separatorsPerPallet / rollsPerPallet : 0,
        strap: rollsPerPallet > 0 ? strapLength / rollsPerPallet : 0,
        foam: rollsPerPallet > 0 ? foamLength / rollsPerPallet : 0,
        stretch: rollsPerPallet > 0 ? stretchKg / rollsPerPallet : 0,
      },
    };
  }

  const pcsPerStack = toNum(scenarioEngineering?.packaging?.primary?.pcsPerStack);
  const stacksPerPrimary = toNum(scenarioEngineering?.packaging?.primary?.stacksPerPrimary);
  const primariesPerSecondary = toNum(
    scenarioEngineering?.packaging?.secondary?.primariesPerSecondary
  );
  const labelsPerBox = toNum(scenarioEngineering?.packaging?.secondary?.labelsPerBox);
  const labelsPerPallet = toNum(scenarioEngineering?.packaging?.pallet?.labelsPerPallet);
  const boxesPerPallet = toNum(scenarioEngineering?.packaging?.pallet?.boxesPerPallet);
  const stretchWeightPerPallet = toNum(
    scenarioEngineering?.packaging?.pallet?.stretchWeightPerPallet_kg
  );

  const pcsPerPrimary = pcsPerStack * stacksPerPrimary;
  const pcsPerCarton = pcsPerPrimary * primariesPerSecondary;
  const pcsPerPallet = pcsPerCarton * boxesPerPallet;

  if (packagingCase === "product_carton") {
    return {
      basisLabel: "Carton",
      basisQtyLabel: "Consumption / Carton",
      denominatorLabel: "PCS / Carton",
      denominatorValue: pcsPerCarton,
      piecesPerBasis: pcsPerCarton,
      lines: {
        bag: primariesPerSecondary,
        carton: 1,
        label: labelsPerBox,
        tape: 0,
      },
    };
  }

  return {
    basisLabel: "Pallet",
    basisQtyLabel: "Consumption / Pallet",
    denominatorLabel: "PCS / Pallet",
    denominatorValue: pcsPerPallet,
    piecesPerBasis: pcsPerPallet,
    lines: {
      bag: primariesPerSecondary * boxesPerPallet,
      carton: boxesPerPallet,
      label: labelsPerBox * boxesPerPallet + labelsPerPallet,
      tape: 0,
      stretch: stretchWeightPerPallet,
      pallet: 1,
    },
  };
}

function getFreightOptions(requestData, scenarioEngineering) {
  const isSheet = getIsSheet(requestData);

  const options = [
    {
      value: "container20",
      label: "20ft Dry Container",
      qty: isSheet
        ? toNum(scenarioEngineering?.freight?.container20_netWeight_kg) / 1000
        : toNum(scenarioEngineering?.freight?.container20_pcs),
      unit: isSheet ? "ton" : "pcs",
    },
    {
      value: "container40",
      label: "40ft Dry Container",
      qty: isSheet
        ? toNum(scenarioEngineering?.freight?.container40_netWeight_kg) / 1000
        : toNum(scenarioEngineering?.freight?.container40_pcs),
      unit: isSheet ? "ton" : "pcs",
    },
    {
      value: "container40hc",
      label: "40ft High Cube",
      qty: isSheet
        ? toNum(scenarioEngineering?.freight?.container40hc_netWeight_kg) / 1000
        : toNum(scenarioEngineering?.freight?.container40hc_pcs),
      unit: isSheet ? "ton" : "pcs",
    },
    {
      value: "smallTruck",
      label: "Small Truck",
      qty: isSheet
        ? toNum(scenarioEngineering?.freight?.smallTruck_netWeight_kg) / 1000
        : toNum(scenarioEngineering?.freight?.smallTruck_pcs),
      unit: isSheet ? "ton" : "pcs",
    },
    {
      value: "mediumTruck",
      label: "Medium Truck",
      qty: isSheet
        ? toNum(scenarioEngineering?.freight?.mediumTruck_netWeight_kg) / 1000
        : toNum(scenarioEngineering?.freight?.mediumTruck_pcs),
      unit: isSheet ? "ton" : "pcs",
    },
    {
      value: "largeTruck",
      label: "Large Truck",
      qty: isSheet
        ? toNum(scenarioEngineering?.freight?.largeTruck_netWeight_kg) / 1000
        : toNum(scenarioEngineering?.freight?.largeTruck_pcs),
      unit: isSheet ? "ton" : "pcs",
    },
    {
      value: "doubleTrailer",
      label: "Double Trailer",
      qty: isSheet
        ? toNum(scenarioEngineering?.freight?.doubleTrailer_netWeight_kg) / 1000
        : toNum(scenarioEngineering?.freight?.doubleTrailer_pcs),
      unit: isSheet ? "ton" : "pcs",
    },
  ];

  return options.filter((o) => o.qty > 0);
}

export default function PricingBomTab({
  requestData,
  scenarioEngineering,
  bomData,
  setBomData,
  scenarioSetup,
}) {
  const isSheet = getIsSheet(requestData);
  const packagingCase = getPackagingCase(requestData, scenarioEngineering);
  const freightOptions = getFreightOptions(requestData, scenarioEngineering);

  useEffect(() => {
    const desiredMaterials = buildGroupedMaterialRows(scenarioEngineering);
    const desiredPackaging = buildInitialPackagingRows(packagingCase);

    setBomData((prev) => {
      const next = { ...(prev || {}) };

      next.material = {
        ...(next.material || {}),
        rows: mergeRowsById(next.material?.rows || [], desiredMaterials),
        summary: next.material?.summary || {
          materialBaseCostPerTon: 0,
          materialWasteCostPerTon: 0,
          materialBaseCostPer1000: 0,
          materialWasteCostPer1000: 0,
        },
      };

      next.packaging = {
        ...(next.packaging || {}),
        selectedPackagingCase: packagingCase,
        rows: mergeRowsById(next.packaging?.rows || [], desiredPackaging),
        summary: next.packaging?.summary || {
          totalPackagingCostPerBasis: 0,
          packagingBaseCostPerTon: 0,
          packagingWasteCostPerTon: 0,
          packagingBaseCostPer1000: 0,
          packagingWasteCostPer1000: 0,
          totalPackagingCostPerRoll: 0,
          totalPackagingCostPerPallet: 0,
          totalPackagingCostPerCarton: 0,
        },
      };

      next.decoration = {
        ...(next.decoration || {}),
        summary: next.decoration?.summary || {
          decorationCostPer1000: 0,
          decorationWasteCostPer1000: 0,
        },
      };

      next.workingCapital = {
        ...(next.workingCapital || {}),
        summary: next.workingCapital?.summary || {
          workingCapitalPct: 0,
          workingCapitalCostPerTon: 0,
          workingCapitalCostPer1000: 0,
          DSO: next.workingCapital?.DSO || "0",
          DIO: next.workingCapital?.DIO || "30",
          DPO: next.workingCapital?.DPO || "30",
          interestRatePct: next.workingCapital?.interestRatePct || "0",
        },
      };

      next.freight = {
        ...(next.freight || {}),
        selectedOption: next.freight?.selectedOption || freightOptions?.[0]?.value || "",
        summary: next.freight?.summary || {
          truckOrContainerSize: next.freight?.selectedOption || freightOptions?.[0]?.value || "",
          qtyPerTrip: 0,
          freightCostPerTon: 0,
          freightCostPer1000: 0,
        },
      };

      return next;
    });
  }, [scenarioEngineering, packagingCase, setBomData, freightOptions]);

  const materialComputedRows = useMemo(() => {
    return (bomData?.material?.rows || []).map((row) => {
      const priceEgpPerKg = convertToEgp(
        row.pricePerUnit,
        row.currency,
        row.exchangeRate,
        scenarioSetup?.usdEgp,
        scenarioSetup?.eurUsd
      );

      const baseCostPerTon = toNum(row.consumptionKgPerTon) * priceEgpPerKg;
      const wasteCostPerTon = baseCostPerTon * (toNum(row.wastePct) / 100);

      return {
        ...row,
        priceEgpPerKg,
        baseCostPerTon,
        wasteCostPerTon,
        totalCostPerTon: baseCostPerTon + wasteCostPerTon,
        baseCostPer1000: perTonToPer1000(baseCostPerTon, requestData, scenarioEngineering),
        wasteCostPer1000: perTonToPer1000(wasteCostPerTon, requestData, scenarioEngineering),
      };
    });
  }, [bomData?.material?.rows, scenarioSetup, requestData, scenarioEngineering]);

  const materialSummary = useMemo(() => {
    const materialBaseCostPerTon = materialComputedRows.reduce(
      (sum, row) => sum + row.baseCostPerTon,
      0
    );
    const materialWasteCostPerTon = materialComputedRows.reduce(
      (sum, row) => sum + row.wasteCostPerTon,
      0
    );

    return {
      materialBaseCostPerTon,
      materialWasteCostPerTon,
      materialBaseCostPer1000: perTonToPer1000(
        materialBaseCostPerTon,
        requestData,
        scenarioEngineering
      ),
      materialWasteCostPer1000: perTonToPer1000(
        materialWasteCostPerTon,
        requestData,
        scenarioEngineering
      ),
    };
  }, [materialComputedRows, requestData, scenarioEngineering]);

  const packagingContext = useMemo(() => {
    return getDerivedPackagingContext(requestData, scenarioEngineering, packagingCase);
  }, [requestData, scenarioEngineering, packagingCase]);

  const packagingComputedRows = useMemo(() => {
    return (bomData?.packaging?.rows || []).map((row) => {
      const derivedQty = toNum(packagingContext?.lines?.[row.id] || 0);
      const usedQty =
        String(row.manualQty || "").trim() !== "" ? toNum(row.manualQty) : derivedQty;

      const priceEgp = convertToEgp(
        row.pricePerUnit,
        row.currency,
        row.exchangeRate,
        scenarioSetup?.usdEgp,
        scenarioSetup?.eurUsd
      );

      const totalCostPerBasis = usedQty * priceEgp;
      const wasteCostPerBasis = totalCostPerBasis * (toNum(row.wastePct) / 100);

      let baseCostPerTon = 0;
      let wasteCostPerTon = 0;
      let baseCostPer1000 = 0;
      let wasteCostPer1000 = 0;

      if (isSheet) {
        const basisTon = toNum(packagingContext?.denominatorValue);
        baseCostPerTon = basisTon > 0 ? totalCostPerBasis / basisTon : 0;
        wasteCostPerTon = basisTon > 0 ? wasteCostPerBasis / basisTon : 0;

        baseCostPer1000 = perTonToPer1000(baseCostPerTon, requestData, scenarioEngineering);
        wasteCostPer1000 = perTonToPer1000(wasteCostPerTon, requestData, scenarioEngineering);
      } else {
        const pcsPerBasis = toNum(packagingContext?.piecesPerBasis);
        baseCostPer1000 = pcsPerBasis > 0 ? (totalCostPerBasis / pcsPerBasis) * 1000 : 0;
        wasteCostPer1000 = pcsPerBasis > 0 ? (wasteCostPerBasis / pcsPerBasis) * 1000 : 0;

        baseCostPerTon = per1000ToPerTon(baseCostPer1000, requestData, scenarioEngineering);
        wasteCostPerTon = per1000ToPerTon(wasteCostPer1000, requestData, scenarioEngineering);
      }

      return {
        ...row,
        derivedQty,
        usedQty,
        priceEgp,
        totalCostPerBasis,
        wasteCostPerBasis,
        baseCostPerTon,
        wasteCostPerTon,
        baseCostPer1000,
        wasteCostPer1000,
      };
    });
  }, [
    bomData?.packaging?.rows,
    packagingContext,
    scenarioSetup,
    requestData,
    scenarioEngineering,
    isSheet,
  ]);

  const packagingSummary = useMemo(() => {
    const totalPackagingCostPerBasis = packagingComputedRows.reduce(
      (sum, row) => sum + row.totalCostPerBasis,
      0
    );

    const packagingBaseCostPerTon = packagingComputedRows.reduce(
      (sum, row) => sum + row.baseCostPerTon,
      0
    );
    const packagingWasteCostPerTon = packagingComputedRows.reduce(
      (sum, row) => sum + row.wasteCostPerTon,
      0
    );
    const packagingBaseCostPer1000 = packagingComputedRows.reduce(
      (sum, row) => sum + row.baseCostPer1000,
      0
    );
    const packagingWasteCostPer1000 = packagingComputedRows.reduce(
      (sum, row) => sum + row.wasteCostPer1000,
      0
    );

    return {
      totalPackagingCostPerBasis,
      packagingBaseCostPerTon,
      packagingWasteCostPerTon,
      packagingBaseCostPer1000,
      packagingWasteCostPer1000,
      totalPackagingCostPerRoll:
        packagingCase === "sheet_roll" ? totalPackagingCostPerBasis : 0,
      totalPackagingCostPerPallet:
        packagingCase === "sheet_pallet" || packagingCase === "product_pallet"
          ? totalPackagingCostPerBasis
          : 0,
      totalPackagingCostPerCarton:
        packagingCase === "product_carton" ? totalPackagingCostPerBasis : 0,
    };
  }, [packagingComputedRows, packagingCase]);

  const decorationSummary = useMemo(() => {
    const deco = bomData?.decoration || {};
    if (!deco.enabled || isSheet) {
      return {
        decorationCostPer1000: 0,
        decorationWasteCostPer1000: 0,
      };
    }

    if (deco.type === "Printing") {
      const base =
        (toNum(deco.printing?.inkConsumption_g_per_1000) / 1000) *
        toNum(deco.printing?.inkCostPerKg);

      return {
        decorationCostPer1000: base,
        decorationWasteCostPer1000: base * (toNum(deco.printing?.wastePct) / 100),
      };
    }

    if (deco.type === "Sleeve") {
      const base = toNum(deco.sleeve?.sleeveCostPer1000);
      return {
        decorationCostPer1000: base,
        decorationWasteCostPer1000: base * (toNum(deco.sleeve?.wastePct) / 100),
      };
    }

    const blankPart = toNum(deco.hybrid?.blankCostPerPiece) * 1000;
    const bottomPart = toNum(deco.hybrid?.bottomCostPerPiece) * 1000;
    const base = blankPart + bottomPart;

    return {
      decorationCostPer1000: base,
      decorationWasteCostPer1000: base * (toNum(deco.hybrid?.wastePct) / 100),
    };
  }, [bomData?.decoration, isSheet]);

  const workingCapitalSummary = useMemo(() => {
    const wc = bomData?.workingCapital || {};
    const DSO = toNum(wc.DSO);
    const DIO = toNum(wc.DIO);
    const DPO = toNum(wc.DPO);
    const interestRatePct = toNum(wc.interestRatePct);
    const workingCapitalPct = ((DSO + DIO - DPO) / 365) * (interestRatePct / 100);

    const workingCapitalCostPerTon =
      (materialSummary.materialBaseCostPerTon + packagingSummary.packagingBaseCostPerTon) *
      workingCapitalPct;

    const workingCapitalCostPer1000 =
      (materialSummary.materialBaseCostPer1000 +
        packagingSummary.packagingBaseCostPer1000) *
      workingCapitalPct;

    return {
      workingCapitalPct,
      workingCapitalCostPerTon,
      workingCapitalCostPer1000,
      DSO: wc.DSO || "0",
      DIO: wc.DIO || "30",
      DPO: wc.DPO || "30",
      interestRatePct: wc.interestRatePct || "0",
    };
  }, [bomData?.workingCapital, materialSummary, packagingSummary]);

  const freightSummary = useMemo(() => {
    const selected = freightOptions.find(
      (o) => o.value === bomData?.freight?.selectedOption
    );

    const qtyPerTrip = toNum(selected?.qty);
    const tripCost = toNum(bomData?.freight?.freightCostPerTrip);

    let freightCostPerTon = 0;
    let freightCostPer1000 = 0;

    if (selected) {
      if (isSheet) {
        freightCostPerTon = qtyPerTrip > 0 ? tripCost / qtyPerTrip : 0;
        freightCostPer1000 = perTonToPer1000(
          freightCostPerTon,
          requestData,
          scenarioEngineering
        );
      } else {
        freightCostPer1000 = qtyPerTrip > 0 ? (tripCost / qtyPerTrip) * 1000 : 0;
        freightCostPerTon = per1000ToPerTon(
          freightCostPer1000,
          requestData,
          scenarioEngineering
        );
      }
    }

    return {
      truckOrContainerSize: selected?.label || "",
      qtyPerTrip,
      freightCostPerTon,
      freightCostPer1000,
    };
  }, [
    freightOptions,
    bomData?.freight,
    isSheet,
    requestData,
    scenarioEngineering,
  ]);

  useEffect(() => {
    setBomData((prev) => ({
      ...(prev || {}),
      material: {
        ...(prev?.material || {}),
        summary: materialSummary,
      },
      packaging: {
        ...(prev?.packaging || {}),
        selectedPackagingCase: packagingCase,
        summary: packagingSummary,
      },
      decoration: {
        ...(prev?.decoration || {}),
        summary: decorationSummary,
      },
      workingCapital: {
        ...(prev?.workingCapital || {}),
        summary: workingCapitalSummary,
      },
      freight: {
        ...(prev?.freight || {}),
        summary: freightSummary,
      },
    }));
  }, [
    materialSummary,
    packagingSummary,
    decorationSummary,
    workingCapitalSummary,
    freightSummary,
    setBomData,
    packagingCase,
  ]);

  const updateMaterialRow = (id, patch) => {
    setBomData((prev) => ({
      ...(prev || {}),
      material: {
        ...(prev?.material || {}),
        rows: (prev?.material?.rows || []).map((row) =>
          row.id === id ? { ...row, ...patch } : row
        ),
      },
    }));
  };

  const updatePackagingRow = (id, patch) => {
    setBomData((prev) => ({
      ...(prev || {}),
      packaging: {
        ...(prev?.packaging || {}),
        rows: (prev?.packaging?.rows || []).map((row) =>
          row.id === id ? { ...row, ...patch } : row
        ),
      },
    }));
  };

  const updateDecoration = (section, patch) => {
    setBomData((prev) => ({
      ...(prev || {}),
      decoration: {
        ...(prev?.decoration || {}),
        [section]: {
          ...(prev?.decoration?.[section] || {}),
          ...patch,
        },
      },
    }));
  };

  const updateWorkingCapital = (patch) => {
    setBomData((prev) => ({
      ...(prev || {}),
      workingCapital: {
        ...(prev?.workingCapital || {}),
        ...patch,
      },
    }));
  };

  const updateFreight = (patch) => {
    setBomData((prev) => ({
      ...(prev || {}),
      freight: {
        ...(prev?.freight || {}),
        ...patch,
      },
    }));
  };

  const decorationTypeText = getDecorationType(requestData, scenarioEngineering);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-5 space-y-4 shadow-sm">
        <h3 className="font-semibold">Material BOM Unit Price</h3>

        <SectionNote tone="gray">
          All unit prices can be entered in EGP, USD, or EUR. The system converts all material rows to EGP using scenario exchange rates.
        </SectionNote>

        <div className="grid grid-cols-1 md:grid-cols-8 gap-3 text-sm">
          <div className="font-medium text-gray-500">Material</div>
          <div className="font-medium text-gray-500">Consumption / Ton</div>
          <div className="font-medium text-gray-500">Waste %</div>
          <div className="font-medium text-gray-500">Price / Kg</div>
          <div className="font-medium text-gray-500">Currency</div>
          <div className="font-medium text-gray-500">Ex. Rate</div>
          <div className="font-medium text-gray-500">Cost / Ton</div>
          <div className="font-medium text-gray-500">Cost / 1000 pcs</div>

          {materialComputedRows.map((row) => (
            <div key={row.id} className="contents">
              <div className="py-2">{row.name}</div>
              <div className="py-2">{fmt(row.consumptionKgPerTon, 3)} kg</div>

              <div>
                <Input
                  value={row.wastePct}
                  onChange={(v) => updateMaterialRow(row.id, { wastePct: v })}
                />
              </div>

              <div>
                <Input
                  value={row.pricePerUnit}
                  onChange={(v) => updateMaterialRow(row.id, { pricePerUnit: v })}
                />
              </div>

              <div>
                <SelectInput
                  value={row.currency || "EGP"}
                  onChange={(v) => updateMaterialRow(row.id, { currency: v })}
                  options={["EGP", "USD", "EUR"]}
                />
              </div>

              <div>
                <Input
                  value={row.exchangeRate}
                  onChange={(v) => updateMaterialRow(row.id, { exchangeRate: v })}
                  placeholder="optional"
                />
              </div>

              <div className="py-2">
                {fmt(row.baseCostPerTon + row.wasteCostPerTon, 3)} EGP
              </div>
              <div className="py-2">
                {fmt(row.baseCostPer1000 + row.wasteCostPer1000, 3)} EGP
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <InfoTile
            label="Material Base Cost / Ton"
            value={`${fmt(materialSummary.materialBaseCostPerTon, 3)} EGP`}
          />
          <InfoTile
            label="Material Waste Cost / Ton"
            value={`${fmt(materialSummary.materialWasteCostPerTon, 3)} EGP`}
          />
          <InfoTile
            label="Material Base Cost / 1000 pcs"
            value={`${fmt(materialSummary.materialBaseCostPer1000, 3)} EGP`}
          />
          <InfoTile
            label="Material Waste Cost / 1000 pcs"
            value={`${fmt(materialSummary.materialWasteCostPer1000, 3)} EGP`}
          />
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-5 space-y-4 shadow-sm">
        <h3 className="font-semibold">Packaging BOM</h3>

        <SectionNote tone="blue">
          Packaging case:{" "}
          {packagingCase === "sheet_pallet"
            ? "Sheet roll with pallet"
            : packagingCase === "sheet_roll"
            ? "Sheet roll without pallet"
            : packagingCase === "product_carton"
            ? "Non-sheet product without pallet"
            : "Non-sheet product with pallet"}
        </SectionNote>

        <div className="grid grid-cols-1 md:grid-cols-8 gap-3 text-sm">
          <div className="font-medium text-gray-500">Item</div>
          <div className="font-medium text-gray-500">
            {packagingContext?.basisQtyLabel || "Consumption"}
          </div>
          <div className="font-medium text-gray-500">Manual Override</div>
          <div className="font-medium text-gray-500">Waste %</div>
          <div className="font-medium text-gray-500">Price / Unit</div>
          <div className="font-medium text-gray-500">Currency</div>
          <div className="font-medium text-gray-500">Ex. Rate</div>
          <div className="font-medium text-gray-500">
            {isSheet ? "Cost / Ton" : "Cost / 1000 pcs"}
          </div>

          {packagingComputedRows.map((row) => (
            <div key={row.id} className="contents">
              <div className="py-2">{row.name}</div>
              <div className="py-2">
                {fmt(row.derivedQty, 3)} {row.unit}
              </div>

              <div>
                <Input
                  value={row.manualQty}
                  onChange={(v) => updatePackagingRow(row.id, { manualQty: v })}
                  placeholder="optional"
                />
              </div>

              <div>
                <Input
                  value={row.wastePct}
                  onChange={(v) => updatePackagingRow(row.id, { wastePct: v })}
                />
              </div>

              <div>
                <Input
                  value={row.pricePerUnit}
                  onChange={(v) => updatePackagingRow(row.id, { pricePerUnit: v })}
                />
              </div>

              <div>
                <SelectInput
                  value={row.currency || "EGP"}
                  onChange={(v) => updatePackagingRow(row.id, { currency: v })}
                  options={["EGP", "USD", "EUR"]}
                />
              </div>

              <div>
                <Input
                  value={row.exchangeRate}
                  onChange={(v) => updatePackagingRow(row.id, { exchangeRate: v })}
                  placeholder="optional"
                />
              </div>

              <div className="py-2">
                {isSheet
                  ? `${fmt(row.baseCostPerTon + row.wasteCostPerTon, 3)} EGP`
                  : `${fmt(row.baseCostPer1000 + row.wasteCostPer1000, 3)} EGP`}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <InfoTile
            label={`Total Packaging Cost / ${packagingContext?.basisLabel || "Basis"}`}
            value={`${fmt(packagingSummary.totalPackagingCostPerBasis, 3)} EGP`}
          />
          <InfoTile
            label="Packaging Base Cost / Ton"
            value={`${fmt(packagingSummary.packagingBaseCostPerTon, 3)} EGP`}
          />
          <InfoTile
            label="Packaging Waste Cost / Ton"
            value={`${fmt(packagingSummary.packagingWasteCostPerTon, 3)} EGP`}
          />
          <InfoTile
            label="Packaging Base Cost / 1000 pcs"
            value={`${fmt(packagingSummary.packagingBaseCostPer1000, 3)} EGP`}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {packagingCase === "sheet_pallet" && (
            <>
              <InfoTile
                label="Total Packaging Cost / Pallet"
                value={`${fmt(packagingSummary.totalPackagingCostPerPallet, 3)} EGP`}
              />
              <InfoTile
                label="Total Packaging Cost / Ton"
                value={`${fmt(packagingSummary.packagingBaseCostPerTon, 3)} EGP`}
              />
              <InfoTile
                label="Packaging Waste / Ton"
                value={`${fmt(packagingSummary.packagingWasteCostPerTon, 3)} EGP`}
              />
            </>
          )}

          {packagingCase === "sheet_roll" && (
            <>
              <InfoTile
                label="Total Packaging Cost / Roll"
                value={`${fmt(packagingSummary.totalPackagingCostPerRoll, 3)} EGP`}
              />
              <InfoTile
                label="Packaging Cost / Ton"
                value={`${fmt(packagingSummary.packagingBaseCostPerTon, 3)} EGP`}
              />
              <InfoTile
                label="Packaging Waste / Ton"
                value={`${fmt(packagingSummary.packagingWasteCostPerTon, 3)} EGP`}
              />
            </>
          )}

          {packagingCase === "product_carton" && (
            <>
              <InfoTile
                label="Total Packaging Cost / Carton"
                value={`${fmt(packagingSummary.totalPackagingCostPerCarton, 3)} EGP`}
              />
              <InfoTile
                label="Packaging Cost / 1000 pcs"
                value={`${fmt(packagingSummary.packagingBaseCostPer1000, 3)} EGP`}
              />
              <InfoTile
                label="Packaging Waste / 1000 pcs"
                value={`${fmt(packagingSummary.packagingWasteCostPer1000, 3)} EGP`}
              />
            </>
          )}

          {packagingCase === "product_pallet" && (
            <>
              <InfoTile
                label="Total Packaging Cost / Pallet"
                value={`${fmt(packagingSummary.totalPackagingCostPerPallet, 3)} EGP`}
              />
              <InfoTile
                label="Packaging Cost / 1000 pcs"
                value={`${fmt(packagingSummary.packagingBaseCostPer1000, 3)} EGP`}
              />
              <InfoTile
                label="Packaging Waste / 1000 pcs"
                value={`${fmt(packagingSummary.packagingWasteCostPer1000, 3)} EGP`}
              />
            </>
          )}
        </div>
      </div>

      {!isSheet && decorationTypeText !== "No decoration" && (
        <div className="rounded-2xl border bg-white p-5 space-y-4 shadow-sm">
          <h3 className="font-semibold">Decoration Cost</h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Field label="Use Decoration">
              <SelectInput
                value={bomData?.decoration?.enabled ? "Yes" : "No"}
                onChange={(v) =>
                  setBomData((prev) => ({
                    ...(prev || {}),
                    decoration: {
                      ...(prev?.decoration || {}),
                      enabled: v === "Yes",
                    },
                  }))
                }
                options={["Yes", "No"]}
              />
            </Field>

            <Field label="Decoration Type">
              <SelectInput
                value={bomData?.decoration?.type || "Printing"}
                onChange={(v) =>
                  setBomData((prev) => ({
                    ...(prev || {}),
                    decoration: {
                      ...(prev?.decoration || {}),
                      type: v,
                    },
                  }))
                }
                options={[
                  { value: "Printing", label: "Printing" },
                  { value: "Sleeve", label: "Sleeve" },
                  { value: "Hybrid", label: "Hybrid" },
                ]}
              />
            </Field>
          </div>

          {bomData?.decoration?.enabled && bomData?.decoration?.type === "Printing" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Ink Consumption / 1000 pcs (g)">
                <Input
                  value={bomData?.decoration?.printing?.inkConsumption_g_per_1000}
                  onChange={(v) => updateDecoration("printing", { inkConsumption_g_per_1000: v })}
                />
              </Field>

              <Field label="Ink Cost / Kg">
                <Input
                  value={bomData?.decoration?.printing?.inkCostPerKg}
                  onChange={(v) => updateDecoration("printing", { inkCostPerKg: v })}
                />
              </Field>

              <Field label="Waste %">
                <Input
                  value={bomData?.decoration?.printing?.wastePct}
                  onChange={(v) => updateDecoration("printing", { wastePct: v })}
                />
              </Field>
            </div>
          )}

          {bomData?.decoration?.enabled && bomData?.decoration?.type === "Sleeve" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Sleeve Cost / 1000 pcs">
                <Input
                  value={bomData?.decoration?.sleeve?.sleeveCostPer1000}
                  onChange={(v) => updateDecoration("sleeve", { sleeveCostPer1000: v })}
                />
              </Field>

              <Field label="Waste %">
                <Input
                  value={bomData?.decoration?.sleeve?.wastePct}
                  onChange={(v) => updateDecoration("sleeve", { wastePct: v })}
                />
              </Field>
            </div>
          )}

          {bomData?.decoration?.enabled && bomData?.decoration?.type === "Hybrid" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Blank Cost / Piece">
                <Input
                  value={bomData?.decoration?.hybrid?.blankCostPerPiece}
                  onChange={(v) => updateDecoration("hybrid", { blankCostPerPiece: v })}
                />
              </Field>

              <Field label="Bottom Cost / Piece">
                <Input
                  value={bomData?.decoration?.hybrid?.bottomCostPerPiece}
                  onChange={(v) => updateDecoration("hybrid", { bottomCostPerPiece: v })}
                />
              </Field>

              <Field label="Waste %">
                <Input
                  value={bomData?.decoration?.hybrid?.wastePct}
                  onChange={(v) => updateDecoration("hybrid", { wastePct: v })}
                />
              </Field>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <InfoTile
              label="Decoration Cost / 1000 pcs"
              value={`${fmt(decorationSummary.decorationCostPer1000, 3)} EGP`}
            />
            <InfoTile
              label="Decoration Waste / 1000 pcs"
              value={`${fmt(decorationSummary.decorationWasteCostPer1000, 3)} EGP`}
            />
          </div>
        </div>
      )}

      <div className="rounded-2xl border bg-white p-5 space-y-4 shadow-sm">
        <h3 className="font-semibold">Working Capital Cost</h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Field label="DSO">
            <Input
              value={bomData?.workingCapital?.DSO}
              onChange={(v) => updateWorkingCapital({ DSO: v })}
            />
          </Field>

          <Field label="DIO">
            <Input
              value={bomData?.workingCapital?.DIO}
              onChange={(v) => updateWorkingCapital({ DIO: v })}
            />
          </Field>

          <Field label="DPO">
            <Input
              value={bomData?.workingCapital?.DPO}
              onChange={(v) => updateWorkingCapital({ DPO: v })}
            />
          </Field>

          <Field label="Interest Rate %">
            <Input
              value={bomData?.workingCapital?.interestRatePct}
              onChange={(v) => updateWorkingCapital({ interestRatePct: v })}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <InfoTile
            label="Effective Working Capital Cost %"
            value={`${fmt(workingCapitalSummary.workingCapitalPct * 100, 3)}%`}
          />
          <InfoTile
            label="Working Capital Cost / Ton"
            value={`${fmt(workingCapitalSummary.workingCapitalCostPerTon, 3)} EGP`}
          />
          <InfoTile
            label="Working Capital Cost / 1000 pcs"
            value={`${fmt(workingCapitalSummary.workingCapitalCostPer1000, 3)} EGP`}
          />
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-5 space-y-4 shadow-sm">
        <h3 className="font-semibold">Freight Cost</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Truck / Container Size">
            <SelectInput
              value={bomData?.freight?.selectedOption || ""}
              onChange={(v) => updateFreight({ selectedOption: v })}
              options={
                freightOptions.length > 0
                  ? freightOptions.map((o) => ({
                      value: o.value,
                      label: o.label,
                    }))
                  : [{ value: "", label: "No freight options found" }]
              }
            />
          </Field>

          <Field label="Cost / Trip">
            <Input
              value={bomData?.freight?.freightCostPerTrip}
              onChange={(v) => updateFreight({ freightCostPerTrip: v })}
            />
          </Field>

          <Field label="Selected Qty / Trip">
            <Input
              value={
                freightSummary.qtyPerTrip
                  ? `${fmt(freightSummary.qtyPerTrip, 3)} ${isSheet ? "ton" : "pcs"}`
                  : ""
              }
              onChange={() => {}}
              placeholder="auto"
              readOnly
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <InfoTile
            label="Selected Freight Option"
            value={freightSummary.truckOrContainerSize || "—"}
          />
          <InfoTile
            label="Freight Cost / Ton"
            value={`${fmt(freightSummary.freightCostPerTon, 3)} EGP`}
          />
          <InfoTile
            label="Freight Cost / 1000 pcs"
            value={`${fmt(freightSummary.freightCostPer1000, 3)} EGP`}
          />
        </div>
      </div>
    </div>
  );
}