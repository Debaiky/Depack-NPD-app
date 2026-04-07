import { useEffect, useMemo } from "react";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function n(v) {
  const x = parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isNaN(x) ? 0 : x;
}

function fmt(v, d = 2) {
  if (v === "" || v === null || v === undefined || Number.isNaN(Number(v))) return "—";
  return Number(v).toLocaleString(undefined, {
    maximumFractionDigits: d,
    minimumFractionDigits: 0,
  });
}

function requestValueOrBlank(value) {
  if (value === undefined || value === null) return "";
  return String(value);
}

function normalizeStr(value) {
  return String(value ?? "").trim();
}

function Section({ title, children }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
      <h2 className="font-semibold text-lg">{title}</h2>
      {children}
    </div>
  );
}

function ScenarioField({
  label,
  engineeringValue,
  requestValue,
  currentValue,
  children,
}) {
  const hasEngineeringValue = normalizeStr(engineeringValue) !== "";
  const hasRequestValue = normalizeStr(requestValue) !== "";

  const isChangedVsEngineering =
    hasEngineeringValue &&
    normalizeStr(currentValue) !== normalizeStr(engineeringValue);

  return (
    <label className="block">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      {children}

      {hasEngineeringValue ? (
        <div
          className={`mt-1 text-xs ${
            isChangedVsEngineering ? "text-red-600 font-medium" : "text-gray-400"
          }`}
        >
          Engineering Review: {String(engineeringValue)}
        </div>
      ) : null}

      {hasRequestValue ? (
        <div className="mt-0.5 text-xs text-gray-400">
          Request Initiation: {String(requestValue)}
        </div>
      ) : null}
    </label>
  );
}

function Input({ value, onChange, placeholder = "", type = "text", disabled = false }) {
  return (
    <input
      type={type}
      className={`w-full border rounded-lg p-2 ${
        disabled ? "bg-gray-100 text-gray-500" : ""
      }`}
      value={value || ""}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function TextArea({ value, onChange, rows = 3, disabled = false }) {
  return (
    <textarea
      className={`w-full border rounded-lg p-2 ${
        disabled ? "bg-gray-100 text-gray-500" : ""
      }`}
      rows={rows}
      value={value || ""}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function SelectField({ value, onChange, options = [] }) {
  return (
    <select
      className="w-full border rounded-lg p-2"
      value={value || ""}
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

function RefRow({ label, value }) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium break-words">{value || "—"}</div>
    </div>
  );
}

const DENSITY_MAP = {
  PP: 0.92,
  PET: 1.38,
  PS: 1.04,
};

const OPT_SPEED_MAP = {
  PET: { A: 200, B: 800 },
  PP: { A: 120, B: 600 },
  PS: { A: 150, B: 700 },
};

const OPT_LAYER_A_MAP = {
  PET: 200 / (200 + 800),
  PS: 150 / (150 + 700),
  PP: 120 / (120 + 600),
};

const CORE_MAP_MM = {
  "3 inch": 76.2,
  "6 inch": 152.4,
  "8 inch": 203.2,
};

const CONTAINER_SPECS = {
  "20ft Dry": {
    length_m: 6.06,
    width_m: 2.44,
    height_m: 2.59,
    volume_m3: 33.2,
    tare_kg: 2100,
  },
  "40ft Dry": {
    length_m: 12.19,
    width_m: 2.44,
    height_m: 2.59,
    volume_m3: 67.7,
    tare_kg: 3700,
  },
  "40ft High Cube": {
    length_m: 12.19,
    width_m: 2.44,
    height_m: 2.89,
    volume_m3: 76.4,
    tare_kg: 3900,
  },
};

const PALLETS_PER_CONTAINER = {
  EURO: {
    "20ft Dry": 11,
    "40ft Dry": 24,
    "40ft High Cube": 25,
  },
  UK: {
    "20ft Dry": 10,
    "40ft Dry": 21,
    "40ft High Cube": 22,
  },
};

const blankMaterialRow = () => ({ id: uid(), name: "", pct: "" });

const blankInvestmentRow = () => ({
  id: uid(),
  name: "",
  type: "",
  value: "",
  currency: "EGP",
  exchangeRate: "",
  supplier: "",
  leadTimeWeeks: "",
});

export function buildInitialPricingEngineeringScenario(requestData, engineeringData) {
  const product = requestData?.product || {};
  const packagingReq = requestData?.packaging || {};
  const requestedBaseMaterial = product.sheetMaterial || product.productMaterial || "";

  const baseDefaults = {
    materialSheet: {
      baseMaterial: "",
      density: "",
      structure: "AB",
      layerAPct: "",
      layerA: [blankMaterialRow()],
      layerB: [blankMaterialRow()],
      syncLayerBWithA: true,
      coatingUsed: "No",
      coatingName: "",
      coatingWeight_g_m2: "",
      processWastePct: "",
    },

    sheetSpecs: {
      netWidth_mm: "",
      edgeTrimPerSide_mm: "",
      grossWidth_mm: "",
      widthTolPlus_mm: "",
      widthTolMinus_mm: "",
      trimLossPct: "",
      thickness_mic: "",
      thicknessTolPlus_mic: "",
      thicknessTolMinus_mic: "",
      coreType: "Cardboard",
      coreSize: "6 inch",
      coreDiameter_mm: "152.4",
      rollDiameter_mm: "",
      rollTargetWeight_kg: "",
      surfaceMode: "Round",
      productDiameter_mm: "",
      manualSurfaceArea_cm2: "",
      thicknessCalc_mic: "",
      weightCalc_g: "",
      thicknessCalcMode: "Calculate Thickness",
    },

    sheetPackaging: {
      coreMaterial: "",
      coreSize: "",
      coreUses: "",
      rollWeight_kg: "",
      labelsPerRoll: "",
      labelsPerPallet: "",
      palletType: "",
      palletUses: "",
      rollsPerPallet: "",
      strapLength_m: "",
      separatorsPerPallet: "",
      foamLength_m: "",
      stretchKgPerPallet: "",
      instructionText: "",
      palletLength_mm: "",
      palletWidth_mm: "",
      palletHeight_mm: "",
    },

    extrusion: {
      lineName: "Breyer",
      scrapRatePct: "",
      changeoverWasteKg: "",
      startupWastePct: "",
      grossSpeedA_kg_hr: "",
      grossSpeedB_kg_hr: "",
      totalGrossSpeed_kg_hr: "",
      efficiencyPct: "",
      grossVsOptimalPct: "",
      netSpeed_kg_hr: "",
      netVsOptimalPct: "",
      tonsPerHour: "",
      tonsPerShift12h: "",
      tonsPerDay24h: "",
      tonsPerWeek: "",
      tonsPerMonth: "",
      tonsPerYear330d: "",
    },

    thermo: {
      applicable: "Yes",
      machineName: "RDM73K",
      cavities: "",
      cpm: "",
      efficiencyPct: "",
      sheetUtilizationPct: "",
      unitWeight_g: "",
      pcsPerHour: "",
      pcsPerShift12h: "",
      pcsPerDay24h: "",
      pcsPerWeek: "",
      pcsPerMonth: "",
      pcsPerYear330d: "",
      enterToolData: false,
    },

    tooling: {
      enabled: false,
      moldBaseName: "",
      moldBaseCode: "",
      moldInsertName: "",
      moldInsertCode: "",
      moldBottomName: "",
      moldBottomCode: "",
      cuttingPlateName: "",
      cuttingPlateCode: "",
      stackingUnitName: "",
      stackingUnitCode: "",
      plugAssistName: "",
      plugAssistCode: "",
    },

    decorationEngineering: {
      enabled: false,
      print: {
        coverageAreaPct: "",
        inkWeightPer1000Cups: "",
        numberOfColors: "",
        printAreaLengthMm: "",
        printAreaWidthMm: "",
      },
      sleeve: {
        sleeveMaterial: "",
        sleeveThicknessMic: "",
        layFlatWidthMm: "",
        layFlatTolPlusMm: "",
        layFlatTolMinusMm: "",
        cutLengthMm: "",
        shrinkRatioTDPct: "",
        shrinkRatioMDPct: "",
        shrinkCurve: "",
        gluePatternFileName: "",
        gluePatternFileUrl: "",
        repeatLengthMm: "",
        seamOverlapWidthMm: "",
        seamToleranceMm: "",
      },
      hybrid: {
        blankMaterial: "",
        gsm: "",
        printColors: "",
        coating: "",
        paperBottomSelected: "No",
        paperBottomMaterial: "",
        paperBottomGsm: "",
        paperBottomPE_g_m2: "",
      },
    },

    investments: [],

    packaging: {
      usePallet: "Yes",
      primary: {
        pcsPerStack: "",
        stacksPerPrimary: "",
        primaryName: "",
        primaryLength_mm: "",
        primaryWidth_mm: "",
        primaryHeight_mm: "",
        primaryMaterial: "",
        primaryArtworkCode: "",
      },
      secondary: {
        primariesPerSecondary: "",
        secondaryName: "",
        secondaryType: "",
        secondaryLength_mm: "",
        secondaryWidth_mm: "",
        secondaryHeight_mm: "",
        labelsPerBox: "",
        labelLength_mm: "100",
        labelWidth_mm: "150",
      },
      pallet: {
        palletSelected: "Yes",
        palletWidth_mm: "",
        palletHeight_mm: "",
        palletLength_mm: "",
        palletType: "",
        boxesPerPallet: "",
        stretchWeightPerPallet_kg: "",
        labelsPerPallet: "",
      },
      notes: "",
      instructionText: "",
    },

    freight: {
      deliveryMode: "",
      freightBasis: "",
      cartonVolume_m3: "",
      cartonWeight_kg: "",
      palletVolume_m3: "",
      palletWeight_kg: "",
      palletLength_mm: "",
      palletWidth_mm: "",
      palletHeight_mm: "",
      container20_pallets: "",
      container20_cartons: "",
      container20_pcs: "",
      container20_rolls: "",
      container20_netWeight_kg: "",
      container40_pallets: "",
      container40_cartons: "",
      container40_pcs: "",
      container40_rolls: "",
      container40_netWeight_kg: "",
      container40hc_pallets: "",
      container40hc_cartons: "",
      container40hc_pcs: "",
      container40hc_rolls: "",
      container40hc_netWeight_kg: "",
      smallTruck_cartons: "",
      smallTruck_pallets: "",
      smallTruck_pcs: "",
      smallTruck_rolls: "",
      smallTruck_netWeight_kg: "",
      mediumTruck_cartons: "",
      mediumTruck_pallets: "",
      mediumTruck_pcs: "",
      mediumTruck_rolls: "",
      mediumTruck_netWeight_kg: "",
      largeTruck_cartons: "",
      largeTruck_pallets: "",
      largeTruck_pcs: "",
      largeTruck_rolls: "",
      largeTruck_netWeight_kg: "",
      doubleTrailer_cartons: "",
      doubleTrailer_pallets: "",
      doubleTrailer_pcs: "",
      doubleTrailer_rolls: "",
      doubleTrailer_netWeight_kg: "",
      notes: "",
      container20_cartonsRange: "",
      container40_cartonsRange: "",
      container40hc_cartonsRange: "",
    },
  };

  const merged = {
    ...baseDefaults,
    ...(engineeringData || {}),
    materialSheet: {
      ...baseDefaults.materialSheet,
      ...(engineeringData?.materialSheet || {}),
      layerA:
        engineeringData?.materialSheet?.layerA?.length > 0
          ? engineeringData.materialSheet.layerA.map((r) => ({
              id: r.id || uid(),
              name: r.name || "",
              pct: r.pct || "",
            }))
          : baseDefaults.materialSheet.layerA,
      layerB:
        engineeringData?.materialSheet?.layerB?.length > 0
          ? engineeringData.materialSheet.layerB.map((r) => ({
              id: r.id || uid(),
              name: r.name || "",
              pct: r.pct || "",
            }))
          : baseDefaults.materialSheet.layerB,
    },
    sheetSpecs: {
      ...baseDefaults.sheetSpecs,
      ...(engineeringData?.sheetSpecs || {}),
    },
    sheetPackaging: {
      ...baseDefaults.sheetPackaging,
      ...(engineeringData?.sheetPackaging || {}),
    },
    extrusion: {
      ...baseDefaults.extrusion,
      ...(engineeringData?.extrusion || {}),
    },
    thermo: {
      ...baseDefaults.thermo,
      ...(engineeringData?.thermo || {}),
    },
    tooling: {
      ...baseDefaults.tooling,
      ...(engineeringData?.tooling || {}),
    },
    decorationEngineering: {
      ...baseDefaults.decorationEngineering,
      ...(engineeringData?.decorationEngineering || {}),
      print: {
        ...baseDefaults.decorationEngineering.print,
        ...(engineeringData?.decorationEngineering?.print || {}),
      },
      sleeve: {
        ...baseDefaults.decorationEngineering.sleeve,
        ...(engineeringData?.decorationEngineering?.sleeve || {}),
      },
      hybrid: {
        ...baseDefaults.decorationEngineering.hybrid,
        ...(engineeringData?.decorationEngineering?.hybrid || {}),
      },
    },
    investments:
      engineeringData?.investments?.length > 0
        ? engineeringData.investments.map((row) => ({
            id: row.id || uid(),
            ...row,
          }))
        : [],
    packaging: {
      ...baseDefaults.packaging,
      ...(engineeringData?.packaging || {}),
      primary: {
        ...baseDefaults.packaging.primary,
        ...(engineeringData?.packaging?.primary || {}),
      },
      secondary: {
        ...baseDefaults.packaging.secondary,
        ...(engineeringData?.packaging?.secondary || {}),
      },
      pallet: {
        ...baseDefaults.packaging.pallet,
        ...(engineeringData?.packaging?.pallet || {}),
      },
    },
    freight: {
      ...baseDefaults.freight,
      ...(engineeringData?.freight || {}),
    },
  };

  if (!merged.materialSheet.baseMaterial && requestedBaseMaterial) {
    merged.materialSheet.baseMaterial = requestedBaseMaterial;
  }

  if (!merged.materialSheet.density && DENSITY_MAP[merged.materialSheet.baseMaterial]) {
    merged.materialSheet.density = String(DENSITY_MAP[merged.materialSheet.baseMaterial]);
  }

  if (!merged.sheetSpecs.netWidth_mm && requestData?.product?.sheetWidthMm) {
    merged.sheetSpecs.netWidth_mm = requestData.product.sheetWidthMm;
  }

  if (!merged.sheetSpecs.thickness_mic && requestData?.product?.sheetThicknessMicron) {
    merged.sheetSpecs.thickness_mic = requestData.product.sheetThicknessMicron;
  }

  if (!merged.sheetSpecs.rollTargetWeight_kg && requestData?.product?.rollWeightKg) {
    merged.sheetSpecs.rollTargetWeight_kg = requestData.product.rollWeightKg;
  }

  if (!merged.thermo.unitWeight_g && requestData?.product?.productWeightG) {
    merged.thermo.unitWeight_g = requestData.product.productWeightG;
  }

  if (!merged.packaging.primary.pcsPerStack && packagingReq?.primary?.pcsPerStack) {
    merged.packaging.primary.pcsPerStack = packagingReq.primary.pcsPerStack;
  }

  if (!merged.packaging.primary.stacksPerPrimary && packagingReq?.primary?.stacksPerBag) {
    merged.packaging.primary.stacksPerPrimary = packagingReq.primary.stacksPerBag;
  }

  if (!merged.packaging.secondary.primariesPerSecondary && packagingReq?.secondary?.bagsPerCarton) {
    merged.packaging.secondary.primariesPerSecondary = packagingReq.secondary.bagsPerCarton;
  }

  if (!merged.packaging.pallet.boxesPerPallet && packagingReq?.pallet?.cartonsPerPallet) {
    merged.packaging.pallet.boxesPerPallet = packagingReq.pallet.cartonsPerPallet;
  }

  if (!merged.sheetSpecs.layerAPct && OPT_LAYER_A_MAP[merged.materialSheet.baseMaterial]) {
    merged.materialSheet.layerAPct = String(
      (OPT_LAYER_A_MAP[merged.materialSheet.baseMaterial] * 100).toFixed(3)
    );
  }

  return merged;
}

function getBalancedExtruderSpeeds(baseMaterial, layerAPct) {
  const opt = OPT_SPEED_MAP[baseMaterial] || { A: 0, B: 0 };

  const aMax = n(opt.A);
  const bMax = n(opt.B);
  const aShare = n(layerAPct) / 100;
  const bShare = 1 - aShare;

  if (aMax <= 0 || bMax <= 0 || aShare <= 0 || bShare <= 0) {
    return {
      speedA: 0,
      speedB: 0,
      limitingExtruder: "",
      recommendedLayerA: 0,
    };
  }

  const ratioBperA = bShare / aShare;
  const ratioAperB = aShare / bShare;

  let speedA = 0;
  let speedB = 0;
  let limitingExtruder = "";

  if (aMax * ratioBperA <= bMax) {
    speedA = aMax;
    speedB = aMax * ratioBperA;
    limitingExtruder = "A";
  } else {
    speedB = bMax;
    speedA = bMax * ratioAperB;
    limitingExtruder = "B";
  }

  const recommendedLayerA =
    aMax + bMax > 0 ? (aMax / (aMax + bMax)) * 100 : 0;

  return {
    speedA,
    speedB,
    limitingExtruder,
    recommendedLayerA,
  };
}

export default function PricingEngineeringReviewTab({
  requestData,
  scenarioEngineering,
  setScenarioEngineering,
  referenceEngineering,
  changeSummary = [],
}) {
  const payload = requestData || {};
  const reference = referenceEngineering || {};
  const engineering = scenarioEngineering || {};

  const customerBlock = payload?.customer || {};
  const primaryCustomer = customerBlock?.customers?.[0] || {};
  const project = payload?.project || {};
  const product = payload?.product || {};
  const packagingReq = payload?.packaging || {};
  const isSheet = product.productType === "Sheet Roll";
  const requestedBaseMaterial = product.sheetMaterial || product.productMaterial || "";

  const updateSection = (section, patch) => {
    setScenarioEngineering((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...patch,
      },
    }));
  };

  const updateNested = (section, key, patch) => {
    setScenarioEngineering((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: {
          ...prev[section][key],
          ...patch,
        },
      },
    }));
  };

  const updateMaterialRow = (side, id, patch) => {
    setScenarioEngineering((prev) => {
      const next = structuredClone(prev);
      next.materialSheet[side] = (next.materialSheet[side] || []).map((r) =>
        r.id === id ? { ...r, ...patch } : r
      );

      if (side === "layerA" && next.materialSheet.syncLayerBWithA) {
        next.materialSheet.layerB = next.materialSheet.layerA.map((r) => ({ ...r }));
      }

      return next;
    });
  };

  const addMaterialRow = (side) => {
    setScenarioEngineering((prev) => {
      const next = structuredClone(prev);
      next.materialSheet[side] = [...(next.materialSheet[side] || []), blankMaterialRow()];

      if (side === "layerA" && next.materialSheet.syncLayerBWithA) {
        next.materialSheet.layerB = next.materialSheet.layerA.map((r) => ({ ...r }));
      }

      return next;
    });
  };

  const removeMaterialRow = (side, id) => {
    setScenarioEngineering((prev) => {
      const next = structuredClone(prev);
      next.materialSheet[side] = (next.materialSheet[side] || []).filter((r) => r.id !== id);

      if (next.materialSheet[side].length === 0) {
        next.materialSheet[side] = [blankMaterialRow()];
      }

      if (side === "layerA" && next.materialSheet.syncLayerBWithA) {
        next.materialSheet.layerB = next.materialSheet.layerA.map((r) => ({ ...r }));
      }

      return next;
    });
  };

  const updateInvestmentRow = (id, patch) => {
    setScenarioEngineering((prev) => ({
      ...prev,
      investments: (prev.investments || []).map((row) =>
        row.id === id ? { ...row, ...patch } : row
      ),
    }));
  };

  const addInvestmentRow = () => {
    setScenarioEngineering((prev) => ({
      ...prev,
      investments: [...(prev.investments || []), blankInvestmentRow()],
    }));
  };

  const removeInvestmentRow = (id) => {
    setScenarioEngineering((prev) => ({
      ...prev,
      investments: (prev.investments || []).filter((row) => row.id !== id),
    }));
  };

  const baseMaterial = engineering?.materialSheet?.baseMaterial || requestedBaseMaterial;
  const density = n(engineering?.materialSheet?.density) || DENSITY_MAP[baseMaterial] || 0;

  const balancedExtrusion = useMemo(() => {
    return getBalancedExtruderSpeeds(
      baseMaterial,
      engineering?.materialSheet?.layerAPct
    );
  }, [baseMaterial, engineering?.materialSheet?.layerAPct]);

  useEffect(() => {
    if (!engineering?.materialSheet?.syncLayerBWithA) return;
    setScenarioEngineering((prev) => ({
      ...prev,
      materialSheet: {
        ...prev.materialSheet,
        layerB: (prev.materialSheet.layerA || []).map((r) => ({ ...r })),
      },
    }));
  }, [engineering?.materialSheet?.syncLayerBWithA, engineering?.materialSheet?.layerA, setScenarioEngineering]);

  useEffect(() => {
    const coreSize = engineering?.sheetSpecs?.coreSize || "6 inch";
    const coreDia = CORE_MAP_MM[coreSize] || n(engineering?.sheetSpecs?.coreDiameter_mm);

    if (String(coreDia) !== String(engineering?.sheetSpecs?.coreDiameter_mm)) {
      updateSection("sheetSpecs", { coreDiameter_mm: String(coreDia) });
    }

    if (!engineering?.sheetPackaging?.coreSize) {
      updateSection("sheetPackaging", { coreSize });
    }
  }, [engineering?.sheetSpecs?.coreSize]);

  const sheetDerived = useMemo(() => {
    const netWidth = n(engineering?.sheetSpecs?.netWidth_mm);
    const edgeTrim = n(engineering?.sheetSpecs?.edgeTrimPerSide_mm);
    const grossWidth = netWidth + 2 * edgeTrim;
    const trimLossPct = grossWidth > 0 ? (1 - netWidth / grossWidth) * 100 : 0;

    const thicknessMic = n(engineering?.sheetSpecs?.thickness_mic);
    const rollDiameter = n(engineering?.sheetSpecs?.rollDiameter_mm);
    const coreDiameter = n(engineering?.sheetSpecs?.coreDiameter_mm);
    const rollWeightInput = n(engineering?.sheetSpecs?.rollTargetWeight_kg);
    const coatingWeightPerM2 =
      engineering?.materialSheet?.coatingUsed === "Yes"
        ? n(engineering?.materialSheet?.coatingWeight_g_m2)
        : 0;

    const plasticWeightPerM2_g =
      thicknessMic > 0 && density > 0 ? 10000 * (thicknessMic / 10000) * density : 0;

    const totalWeightPerM2_g = plasticWeightPerM2_g + coatingWeightPerM2;
    const coatingShare = totalWeightPerM2_g > 0 ? coatingWeightPerM2 / totalWeightPerM2_g : 0;
    const plasticShare = 1 - coatingShare;

    let calcRollWeight = 0;
    if (rollDiameter > 0 && coreDiameter > 0 && netWidth > 0 && totalWeightPerM2_g > 0) {
      const area_m2 =
        Math.PI * ((rollDiameter / 2) ** 2 - (coreDiameter / 2) ** 2) * netWidth / 1_000_000_000;
      calcRollWeight = area_m2 * totalWeightPerM2_g;
    }

    let calcRollDiameter = 0;
    if (rollWeightInput > 0 && coreDiameter > 0 && netWidth > 0 && totalWeightPerM2_g > 0) {
      const area_m2 = (rollWeightInput * 1000) / totalWeightPerM2_g;
      const ringArea_mm2 = (area_m2 * 1_000_000) / Math.max(netWidth, 1);
      calcRollDiameter =
        2 * Math.sqrt(ringArea_mm2 / Math.PI + (coreDiameter / 2) ** 2);
    }

    const materialPerTonRows = [];
    const layerAShare = n(engineering?.materialSheet?.layerAPct) / 100;
    const layerBShare = 1 - layerAShare;
    const grouped = {};

    (engineering?.materialSheet?.layerA || []).forEach((row) => {
      const name = String(row.name || "").trim();
      const pct = n(row.pct) / 100;
      if (!name || pct <= 0) return;

      if (!grouped[name]) grouped[name] = { pctLayerA: 0, pctLayerB: 0 };
      grouped[name].pctLayerA += pct;
    });

    (engineering?.materialSheet?.layerB || []).forEach((row) => {
      const name = String(row.name || "").trim();
      const pct = n(row.pct) / 100;
      if (!name || pct <= 0) return;

      if (!grouped[name]) grouped[name] = { pctLayerA: 0, pctLayerB: 0 };
      grouped[name].pctLayerB += pct;
    });

    Object.entries(grouped).forEach(([name, parts]) => {
      const totalMaterialShare =
        parts.pctLayerA * layerAShare + parts.pctLayerB * layerBShare;

      const kgPerTon = totalMaterialShare * 1000 * plasticShare;

      materialPerTonRows.push({
        name,
        pctLayerA: parts.pctLayerA * 100,
        pctLayerB: parts.pctLayerB * 100,
        totalPct: totalMaterialShare * 100,
        kgPerTon,
      });
    });

    const coatingKgPerTon = coatingShare * 1000;

    return {
      grossWidth,
      trimLossPct,
      plasticWeightPerM2_g,
      totalWeightPerM2_g,
      coatingShare,
      plasticShare,
      coatingKgPerTon,
      materialPerTonRows,
      calcRollWeight,
      calcRollDiameter,
    };
  }, [engineering, density]);

  useEffect(() => {
    updateSection("sheetSpecs", {
      grossWidth_mm: sheetDerived.grossWidth ? String(sheetDerived.grossWidth.toFixed(2)) : "",
      trimLossPct: sheetDerived.trimLossPct ? String(sheetDerived.trimLossPct.toFixed(2)) : "",
    });
  }, [sheetDerived.grossWidth, sheetDerived.trimLossPct]);

  const extrusionDerived = useMemo(() => {
    const opt = OPT_SPEED_MAP[baseMaterial] || { A: 0, B: 0 };
    const maxA = n(opt.A);
    const maxB = n(opt.B);
    const totalMax = maxA + maxB;

    const layerAPct = n(engineering?.materialSheet?.layerAPct);
    const layerAFrac = layerAPct / 100;
    const layerBFrac = 1 - layerAFrac;
    const optimumLayerAPct = (OPT_LAYER_A_MAP[baseMaterial] || 0) * 100;

    const speedA = n(engineering?.extrusion?.grossSpeedA_kg_hr);
    const speedB = n(engineering?.extrusion?.grossSpeedB_kg_hr);
    const totalGross = speedA + speedB;

    const efficiency = n(engineering?.extrusion?.efficiencyPct) / 100;
    const scrapRate = n(engineering?.extrusion?.scrapRatePct) / 100;

    const grossWidth = n(engineering?.sheetSpecs?.grossWidth_mm) || sheetDerived.grossWidth;
    const netWidth = n(engineering?.sheetSpecs?.netWidth_mm);

    const grossVsOptimalPct = totalMax > 0 ? (totalGross / totalMax) * 100 : 0;
    const actualLayerAFromSpeedsPct = totalGross > 0 ? (speedA / totalGross) * 100 : 0;
    const layerMismatchPct = totalGross > 0 ? actualLayerAFromSpeedsPct - layerAPct : 0;

    let recommendedA = 0;
    let recommendedB = 0;
    let limitingExtruder = "";

    if (layerAFrac > 0 && layerBFrac > 0) {
      const totalLimitedByA = maxA / layerAFrac;
      const totalLimitedByB = maxB / layerBFrac;
      const recommendedTotal = Math.min(totalLimitedByA, totalLimitedByB);

      recommendedA = recommendedTotal * layerAFrac;
      recommendedB = recommendedTotal * layerBFrac;

      if (totalLimitedByA < totalLimitedByB) limitingExtruder = "A";
      else if (totalLimitedByB < totalLimitedByA) limitingExtruder = "B";
    }

    const recommendedTotalGross = recommendedA + recommendedB;

    const netSpeed =
      totalGross > 0 && grossWidth > 0
        ? totalGross * (netWidth / grossWidth) * (1 - scrapRate) * (efficiency || 1)
        : 0;

    const netVsOptimalPct =
      recommendedTotalGross > 0 ? (totalGross / recommendedTotalGross) * 100 : 0;

    const tph = netSpeed / 1000;
    const tonsPerShift12h = tph * 12;
    const tonsPerDay24h = tph * 24;
    const tonsPerWeek = tonsPerDay24h * 7;
    const tonsPerYear330d = tonsPerDay24h * 330;
    const tonsPerMonth = tonsPerYear330d / 12;

    let warningMessage = "";
    const isLayerAOptimum = Math.abs(layerAPct - optimumLayerAPct) < 0.01;
    const isSpeedRatioMatchingLayer =
      totalGross <= 0 ? true : Math.abs(layerMismatchPct) < 0.5;

    if (!isLayerAOptimum) {
      warningMessage = `Layer A % is not optimum for ${baseMaterial}. Recommended Layer A is ${optimumLayerAPct.toFixed(3)}%.`;
    } else if (!isSpeedRatioMatchingLayer) {
      warningMessage = `Entered extruder speeds do not match the selected Layer A %. Actual Layer A from speeds is ${actualLayerAFromSpeedsPct.toFixed(3)}%.`;
    } else if (limitingExtruder) {
      warningMessage = `At Layer A = ${layerAPct.toFixed(3)}%, Extruder ${limitingExtruder} is the limiting extruder. Recommended gross speeds are A = ${recommendedA.toFixed(2)} kg/hr and B = ${recommendedB.toFixed(2)} kg/hr.`;
    }

    return {
      optimumLayerAPct,
      totalGross,
      grossVsOptimalPct,
      netSpeed,
      netVsOptimalPct,
      tonsPerShift12h,
      tonsPerDay24h,
      tonsPerWeek,
      tonsPerMonth,
      tonsPerYear330d,
      tph,
      recommendedA,
      recommendedB,
      warningMessage,
    };
  }, [engineering, baseMaterial, sheetDerived.grossWidth]);

  useEffect(() => {
    updateSection("extrusion", {
      totalGrossSpeed_kg_hr: extrusionDerived.totalGross
        ? String(extrusionDerived.totalGross.toFixed(2))
        : "",
      grossVsOptimalPct: extrusionDerived.grossVsOptimalPct
        ? String(extrusionDerived.grossVsOptimalPct.toFixed(2))
        : "",
      netSpeed_kg_hr: extrusionDerived.netSpeed
        ? String(extrusionDerived.netSpeed.toFixed(2))
        : "",
      netVsOptimalPct: extrusionDerived.netVsOptimalPct
        ? String(extrusionDerived.netVsOptimalPct.toFixed(2))
        : "",
      tonsPerHour: extrusionDerived.tph ? String(extrusionDerived.tph.toFixed(3)) : "",
      tonsPerShift12h: extrusionDerived.tonsPerShift12h
        ? String(extrusionDerived.tonsPerShift12h.toFixed(3))
        : "",
      tonsPerDay24h: extrusionDerived.tonsPerDay24h
        ? String(extrusionDerived.tonsPerDay24h.toFixed(3))
        : "",
      tonsPerWeek: extrusionDerived.tonsPerWeek
        ? String(extrusionDerived.tonsPerWeek.toFixed(3))
        : "",
      tonsPerMonth: extrusionDerived.tonsPerMonth
        ? String(extrusionDerived.tonsPerMonth.toFixed(3))
        : "",
      tonsPerYear330d: extrusionDerived.tonsPerYear330d
        ? String(extrusionDerived.tonsPerYear330d.toFixed(3))
        : "",
    });
  }, [extrusionDerived]);

  const thermoDerived = useMemo(() => {
    const cavities = n(engineering?.thermo?.cavities);
    const cpm = n(engineering?.thermo?.cpm);
    const eff = n(engineering?.thermo?.efficiencyPct) / 100;
    const unitWeight_g = n(engineering?.thermo?.unitWeight_g);
    const sheetUtilizationPct = n(engineering?.thermo?.sheetUtilizationPct);
    const util = sheetUtilizationPct > 0 ? sheetUtilizationPct / 100 : 0;

    const pcsPerHour = cavities * cpm * 60 * (eff || 1);
    const pcsPerShift12h = pcsPerHour * 12;
    const pcsPerDay24h = pcsPerHour * 24;
    const pcsPerWeek = pcsPerDay24h * 7;
    const pcsPerYear330d = pcsPerDay24h * 330;
    const pcsPerMonth = pcsPerYear330d / 12;

    const netProductKgPerHour = (pcsPerHour * unitWeight_g) / 1000;
    const netProductKgPerShift12h = netProductKgPerHour * 12;
    const netProductKgPerDay24h = netProductKgPerHour * 24;

    const requiredSheetKgPerHour = util > 0 ? netProductKgPerHour / util : 0;
    const requiredSheetKgPerShift12h = util > 0 ? netProductKgPerShift12h / util : 0;
    const requiredSheetKgPerDay24h = util > 0 ? netProductKgPerDay24h / util : 0;

    return {
      pcsPerHour,
      pcsPerShift12h,
      pcsPerDay24h,
      pcsPerWeek,
      pcsPerMonth,
      pcsPerYear330d,
      requiredSheetKgPerHour,
      requiredSheetKgPerShift12h,
      requiredSheetKgPerDay24h,
    };
  }, [engineering?.thermo]);

  useEffect(() => {
    updateSection("thermo", {
      pcsPerHour: thermoDerived.pcsPerHour ? String(thermoDerived.pcsPerHour.toFixed(0)) : "",
      pcsPerShift12h: thermoDerived.pcsPerShift12h
        ? String(thermoDerived.pcsPerShift12h.toFixed(0))
        : "",
      pcsPerDay24h: thermoDerived.pcsPerDay24h
        ? String(thermoDerived.pcsPerDay24h.toFixed(0))
        : "",
      pcsPerWeek: thermoDerived.pcsPerWeek ? String(thermoDerived.pcsPerWeek.toFixed(0)) : "",
      pcsPerMonth: thermoDerived.pcsPerMonth
        ? String(thermoDerived.pcsPerMonth.toFixed(0))
        : "",
      pcsPerYear330d: thermoDerived.pcsPerYear330d
        ? String(thermoDerived.pcsPerYear330d.toFixed(0))
        : "",
    });
  }, [thermoDerived]);

  const thermoPackagingDerived = useMemo(() => {
    const pcsPerStack = n(engineering?.packaging?.primary?.pcsPerStack);
    const stacksPerPrimary = n(engineering?.packaging?.primary?.stacksPerPrimary);
    const primariesPerSecondary = n(engineering?.packaging?.secondary?.primariesPerSecondary);
    const boxesPerPallet = n(engineering?.packaging?.pallet?.boxesPerPallet);

    const pcsPerPrimary = pcsPerStack * stacksPerPrimary;
    const pcsPerCarton = pcsPerPrimary * primariesPerSecondary;
    const pcsPerPallet =
      engineering?.packaging?.pallet?.palletSelected === "Yes"
        ? pcsPerCarton * boxesPerPallet
        : 0;

    let instructionText = "";
    if (pcsPerPrimary || pcsPerCarton) {
      instructionText = `Pack ${fmt(pcsPerStack, 0)} pcs per stack and ${fmt(
        stacksPerPrimary,
        0
      )} stacks per primary pack, making ${fmt(
        pcsPerPrimary,
        0
      )} pcs per primary pack. Use ${fmt(
        primariesPerSecondary,
        0
      )} primary packs per carton, making ${fmt(
        pcsPerCarton,
        0
      )} pcs per carton.`;

      if (engineering?.packaging?.pallet?.palletSelected === "Yes") {
        instructionText += ` Load ${fmt(boxesPerPallet, 0)} cartons per pallet.`;
      }
    }

    return {
      pcsPerPrimary,
      pcsPerCarton,
      pcsPerPallet,
      instructionText,
    };
  }, [engineering?.packaging]);

  useEffect(() => {
    if (thermoPackagingDerived.instructionText !== engineering?.packaging?.instructionText) {
      updateSection("packaging", { instructionText: thermoPackagingDerived.instructionText });
    }
  }, [thermoPackagingDerived.instructionText]);

  const sheetPackagingSentence = useMemo(() => {
    const coreSize = engineering?.sheetPackaging?.coreSize || engineering?.sheetSpecs?.coreSize || "6 inch";
    const rollDia = n(engineering?.sheetSpecs?.rollDiameter_mm) || sheetDerived.calcRollDiameter;
    const rollW =
      n(engineering?.sheetPackaging?.rollWeight_kg) ||
      n(engineering?.sheetSpecs?.rollTargetWeight_kg) ||
      sheetDerived.calcRollWeight;
    const rollsPerPallet = n(engineering?.sheetPackaging?.rollsPerPallet);
    const separators = n(engineering?.sheetPackaging?.separatorsPerPallet);
    const strap = n(engineering?.sheetPackaging?.strapLength_m);
    const stretch = n(engineering?.sheetPackaging?.stretchKgPerPallet);

    if (!rollW && !rollsPerPallet) return "";

    return `Use ${coreSize} core and make the roll diameter ${fmt(rollDia)} mm at about ${fmt(
      rollW
    )} kg per roll. Put ${fmt(rollsPerPallet, 0)} rolls on a pallet with ${fmt(
      separators,
      0
    )} separators, use ${fmt(strap)} m of strap and full stretch wrap the pallet with ${fmt(
      stretch
    )} kg of stretch film.`;
  }, [engineering?.sheetPackaging, engineering?.sheetSpecs, sheetDerived]);

  useEffect(() => {
    if (sheetPackagingSentence !== engineering?.sheetPackaging?.instructionText) {
      updateSection("sheetPackaging", { instructionText: sheetPackagingSentence });
    }
  }, [sheetPackagingSentence]);

  const layerATotalPct = (engineering?.materialSheet?.layerA || []).reduce(
    (sum, row) => sum + n(row.pct),
    0
  );

  const layerBTotalPct = (engineering?.materialSheet?.layerB || []).reduce(
    (sum, row) => sum + n(row.pct),
    0
  );

  const layerAIsValid = Math.abs(layerATotalPct - 100) < 0.001;
  const layerBIsValid = Math.abs(layerBTotalPct - 100) < 0.001;

  const bomTotalPct = (sheetDerived.materialPerTonRows || []).reduce(
    (sum, row) => sum + n(row.totalPct),
    0
  );

  const bomTotalKgPerTon =
    (sheetDerived.materialPerTonRows || []).reduce(
      (sum, row) => sum + n(row.kgPerTon),
      0
    ) +
    (engineering?.materialSheet?.coatingUsed === "Yes" ? n(sheetDerived.coatingKgPerTon) : 0);

  const bomPctIsValid = Math.abs(bomTotalPct - 100) < 0.01;
  const bomKgIsValid = Math.abs(bomTotalKgPerTon - 1000) < 0.01;

  const requestDecorationType =
    product.productType === "Sheet Roll"
      ? "No decoration"
      : payload?.decoration?.decorationType || "No decoration";

  const hasRequestDecoration =
    requestDecorationType && requestDecorationType !== "No decoration";

  const showDecorationSection =
    !isSheet && (hasRequestDecoration || engineering?.decorationEngineering?.enabled);

  const investmentTotalEGP = (engineering?.investments || []).reduce((sum, row) => {
    const value = n(row.value);
    const rate = n(row.exchangeRate);

    if (!value) return sum;
    if (row.currency === "EGP") return sum + value;
    if ((row.currency === "USD" || row.currency === "EUR") && rate > 0) {
      return sum + value * rate;
    }
    return sum;
  }, 0);

  return (
    <div className="space-y-6">
      <Section title="Engineering Scenario vs Engineering Review">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <RefRow label="Fields Changed vs Engineering Review" value={String(changeSummary.length || 0)} />
          <RefRow label="Project" value={project?.projectName || "—"} />
          <RefRow label="Product Flow" value={isSheet ? "Sheet Product Flow" : "Thermoformed Product Flow"} />
        </div>

        {changeSummary.length > 0 ? (
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 space-y-2">
            <div className="font-medium text-orange-800">Auto Change Summary</div>
            <div className="text-sm text-orange-700">
              This pricing scenario includes engineering assumption changes vs Engineering Review.
            </div>

            <div className="space-y-1 text-sm max-h-48 overflow-auto">
              {changeSummary.map((item, idx) => (
                <div key={`${item.path || idx}-${idx}`} className="text-orange-800">
                  • <span className="font-medium">{item.label || item.path}</span>:{" "}
                  <span className="text-red-700">{displayValue(item.from)}</span>{" "}
                  → <span className="text-green-700">{displayValue(item.to)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            No scenario engineering changes vs Engineering Review yet.
          </div>
        )}
      </Section>

      <Section title="1. Material Structure and Sheet Roll">
        <div className="space-y-5">
          <div className="rounded-xl border p-4 space-y-4">
            <div className="font-medium">Base Material</div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <ScenarioField
                label="Base Material"
                engineeringValue={reference?.materialSheet?.baseMaterial}
                requestValue={requestValueOrBlank(requestedBaseMaterial)}
                currentValue={engineering?.materialSheet?.baseMaterial}
              >
                <SelectField
                  value={engineering?.materialSheet?.baseMaterial}
                  onChange={(v) => {
                    updateSection("materialSheet", {
                      baseMaterial: v,
                      density: DENSITY_MAP[v]
                        ? String(DENSITY_MAP[v])
                        : engineering?.materialSheet?.density,
                    });
                  }}
                  options={["PET", "PP", "PS", "Other"]}
                />
              </ScenarioField>

              <ScenarioField
                label="Density (g/cm³)"
                engineeringValue={reference?.materialSheet?.density}
                requestValue={requestValueOrBlank(DENSITY_MAP[requestedBaseMaterial] || "")}
                currentValue={engineering?.materialSheet?.density}
              >
                <Input
                  value={engineering?.materialSheet?.density}
                  onChange={(v) => updateSection("materialSheet", { density: v })}
                />
              </ScenarioField>

              <ScenarioField
                label="Structure"
                engineeringValue={reference?.materialSheet?.structure}
                requestValue="AB"
                currentValue={engineering?.materialSheet?.structure}
              >
                <SelectField
                  value={engineering?.materialSheet?.structure}
                  onChange={(v) => updateSection("materialSheet", { structure: v })}
                  options={["AB", "ABA"]}
                />
              </ScenarioField>

              <ScenarioField
                label="Layer A %"
                engineeringValue={reference?.materialSheet?.layerAPct}
                requestValue=""
                currentValue={engineering?.materialSheet?.layerAPct}
              >
                <Input
                  value={engineering?.materialSheet?.layerAPct}
                  onChange={(v) => updateSection("materialSheet", { layerAPct: v })}
                />
              </ScenarioField>

              <ScenarioField
                label="Process Waste %"
                engineeringValue={reference?.materialSheet?.processWastePct}
                requestValue=""
                currentValue={engineering?.materialSheet?.processWastePct}
              >
                <Input
                  value={engineering?.materialSheet?.processWastePct}
                  onChange={(v) => updateSection("materialSheet", { processWastePct: v })}
                />
              </ScenarioField>

              <ScenarioField
                label="Coating Layer Used"
                engineeringValue={reference?.materialSheet?.coatingUsed}
                requestValue="No"
                currentValue={engineering?.materialSheet?.coatingUsed}
              >
                <SelectField
                  value={engineering?.materialSheet?.coatingUsed}
                  onChange={(v) => updateSection("materialSheet", { coatingUsed: v })}
                  options={["Yes", "No"]}
                />
              </ScenarioField>
            </div>
          </div>

          {engineering?.materialSheet?.coatingUsed === "Yes" && (
            <div className="rounded-xl border p-4 space-y-4">
              <div className="font-medium">Coating</div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <ScenarioField
                  label="Coating Name"
                  engineeringValue={reference?.materialSheet?.coatingName}
                  requestValue=""
                  currentValue={engineering?.materialSheet?.coatingName}
                >
                  <Input
                    value={engineering?.materialSheet?.coatingName}
                    onChange={(v) => updateSection("materialSheet", { coatingName: v })}
                  />
                </ScenarioField>

                <ScenarioField
                  label="Coating Weight (g/m²)"
                  engineeringValue={reference?.materialSheet?.coatingWeight_g_m2}
                  requestValue=""
                  currentValue={engineering?.materialSheet?.coatingWeight_g_m2}
                >
                  <Input
                    value={engineering?.materialSheet?.coatingWeight_g_m2}
                    onChange={(v) =>
                      updateSection("materialSheet", { coatingWeight_g_m2: v })
                    }
                  />
                </ScenarioField>

                <RefRow
                  label="Coating Kg / Ton"
                  value={
                    sheetDerived.coatingKgPerTon
                      ? `${fmt(sheetDerived.coatingKgPerTon, 3)} kg`
                      : "—"
                  }
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="rounded-xl border bg-gray-50 p-4 space-y-4 xl:col-span-1">
              <div className="font-medium">Material Consumption per Ton</div>

              <div className="text-sm space-y-2">
                <div>
                  <span className="font-medium">Plastic share:</span>{" "}
                  {fmt(sheetDerived.plasticShare * 100, 2)}% —{" "}
                  {fmt(sheetDerived.plasticShare * 1000, 3)} kg/ton
                </div>

                <div>
                  <span className="font-medium">Coating share:</span>{" "}
                  {engineering?.materialSheet?.coatingUsed === "Yes"
                    ? `${fmt(sheetDerived.coatingShare * 100, 2)}%`
                    : "0.00%"}{" "}
                  —{" "}
                  {engineering?.materialSheet?.coatingUsed === "Yes"
                    ? `${fmt(sheetDerived.coatingKgPerTon, 3)} kg/ton`
                    : "0.000 kg/ton"}
                </div>

                <div>
                  <span className="font-medium">Total weight per m²:</span>{" "}
                  {sheetDerived.totalWeightPerM2_g
                    ? `${fmt(sheetDerived.totalWeightPerM2_g, 3)} g/m²`
                    : "—"}
                </div>
              </div>

              <div className="overflow-auto rounded-xl border bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3">Material</th>
                      <th className="text-left p-3">Final %</th>
                      <th className="text-left p-3">Kg / Ton</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sheetDerived.materialPerTonRows.map((row) => (
                      <tr key={row.name} className="border-t">
                        <td className="p-3">{row.name}</td>
                        <td className="p-3">{fmt(row.totalPct, 2)}%</td>
                        <td className="p-3">{fmt(row.kgPerTon, 3)} kg</td>
                      </tr>
                    ))}

                    {engineering?.materialSheet?.coatingUsed === "Yes" && (
                      <tr className="border-t bg-yellow-50">
                        <td className="p-3">
                          {engineering?.materialSheet?.coatingName || "Coating"}
                        </td>
                        <td className="p-3">{fmt(sheetDerived.coatingShare * 100, 2)}%</td>
                        <td className="p-3">{fmt(sheetDerived.coatingKgPerTon, 3)} kg</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border p-4 space-y-4 xl:col-span-2">
              <div className="flex flex-col gap-4">
                <div className="font-medium">Sheet BOM</div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                  <div
                    className={`rounded-lg border p-3 text-sm ${
                      layerAIsValid
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    Layer A total = {fmt(layerATotalPct, 2)}%
                    {!layerAIsValid && " — must equal 100%"}
                  </div>

                  <div
                    className={`rounded-lg border p-3 text-sm ${
                      layerBIsValid
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    Layer B total = {fmt(layerBTotalPct, 2)}%
                    {!layerBIsValid && " — must equal 100%"}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                  <div
                    className={`rounded-lg border p-3 text-sm ${
                      bomPctIsValid
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    Sheet BOM total = {fmt(bomTotalPct, 2)}%
                    {!bomPctIsValid && " — must equal 100%"}
                  </div>

                  <div
                    className={`rounded-lg border p-3 text-sm ${
                      bomKgIsValid
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    Sheet BOM total = {fmt(bomTotalKgPerTon, 3)} kg/ton
                    {!bomKgIsValid && " — must equal 1000 kg/ton"}
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={engineering?.materialSheet?.syncLayerBWithA}
                    onChange={(e) =>
                      updateSection("materialSheet", {
                        syncLayerBWithA: e.target.checked,
                      })
                    }
                  />
                  Add Layer A rows automatically to Layer B
                </label>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="font-medium text-sm">Layer A</div>
                  {(engineering?.materialSheet?.layerA || []).map((row) => (
                    <div key={row.id} className="grid grid-cols-12 gap-2">
                      <div className="col-span-7">
                        <Input
                          value={row.name}
                          onChange={(v) => updateMaterialRow("layerA", row.id, { name: v })}
                          placeholder="Material name"
                        />
                      </div>
                      <div className="col-span-4">
                        <Input
                          value={row.pct}
                          onChange={(v) => updateMaterialRow("layerA", row.id, { pct: v })}
                          placeholder="% in layer"
                        />
                      </div>
                      <div className="col-span-1">
                        <button
                          className="w-full border rounded-lg p-2"
                          onClick={() => removeMaterialRow("layerA", row.id)}
                          type="button"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    className="border rounded-lg px-3 py-2 text-sm"
                    onClick={() => addMaterialRow("layerA")}
                    type="button"
                  >
                    + Add Layer A Material
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="font-medium text-sm">Layer B</div>
                  {(engineering?.materialSheet?.layerB || []).map((row) => (
                    <div key={row.id} className="grid grid-cols-12 gap-2">
                      <div className="col-span-7">
                        <Input
                          value={row.name}
                          onChange={(v) => updateMaterialRow("layerB", row.id, { name: v })}
                          placeholder="Material name"
                          disabled={engineering?.materialSheet?.syncLayerBWithA}
                        />
                      </div>
                      <div className="col-span-4">
                        <Input
                          value={row.pct}
                          onChange={(v) => updateMaterialRow("layerB", row.id, { pct: v })}
                          placeholder="% in layer"
                          disabled={engineering?.materialSheet?.syncLayerBWithA}
                        />
                      </div>
                      <div className="col-span-1">
                        <button
                          className="w-full border rounded-lg p-2"
                          onClick={() => removeMaterialRow("layerB", row.id)}
                          disabled={engineering?.materialSheet?.syncLayerBWithA}
                          type="button"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                  {!engineering?.materialSheet?.syncLayerBWithA && (
                    <button
                      className="border rounded-lg px-3 py-2 text-sm"
                      onClick={() => addMaterialRow("layerB")}
                      type="button"
                    >
                      + Add Layer B Material
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-4 space-y-4">
            <div className="font-medium">Sheet Specifications</div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <ScenarioField
                label="Net Width (mm)"
                engineeringValue={reference?.sheetSpecs?.netWidth_mm}
                requestValue={requestValueOrBlank(product.sheetWidthMm)}
                currentValue={engineering?.sheetSpecs?.netWidth_mm}
              >
                <Input
                  value={engineering?.sheetSpecs?.netWidth_mm}
                  onChange={(v) => updateSection("sheetSpecs", { netWidth_mm: v })}
                />
              </ScenarioField>

              <ScenarioField
                label="Edge Trim / Side (mm)"
                engineeringValue={reference?.sheetSpecs?.edgeTrimPerSide_mm}
                requestValue=""
                currentValue={engineering?.sheetSpecs?.edgeTrimPerSide_mm}
              >
                <Input
                  value={engineering?.sheetSpecs?.edgeTrimPerSide_mm}
                  onChange={(v) =>
                    updateSection("sheetSpecs", { edgeTrimPerSide_mm: v })
                  }
                />
              </ScenarioField>

              <ScenarioField
                label="Gross Width (mm)"
                engineeringValue={reference?.sheetSpecs?.grossWidth_mm}
                requestValue=""
                currentValue={engineering?.sheetSpecs?.grossWidth_mm}
              >
                <Input
                  value={engineering?.sheetSpecs?.grossWidth_mm || fmt(sheetDerived.grossWidth, 2)}
                  onChange={() => {}}
                  disabled
                />
              </ScenarioField>

              <ScenarioField
                label="Width + Tol (mm)"
                engineeringValue={reference?.sheetSpecs?.widthTolPlus_mm}
                requestValue=""
                currentValue={engineering?.sheetSpecs?.widthTolPlus_mm}
              >
                <Input
                  value={engineering?.sheetSpecs?.widthTolPlus_mm}
                  onChange={(v) => updateSection("sheetSpecs", { widthTolPlus_mm: v })}
                />
              </ScenarioField>

              <ScenarioField
                label="Width - Tol (mm)"
                engineeringValue={reference?.sheetSpecs?.widthTolMinus_mm}
                requestValue=""
                currentValue={engineering?.sheetSpecs?.widthTolMinus_mm}
              >
                <Input
                  value={engineering?.sheetSpecs?.widthTolMinus_mm}
                  onChange={(v) => updateSection("sheetSpecs", { widthTolMinus_mm: v })}
                />
              </ScenarioField>

              <ScenarioField
                label="1 - (Net/Gross) %"
                engineeringValue={reference?.sheetSpecs?.trimLossPct}
                requestValue=""
                currentValue={engineering?.sheetSpecs?.trimLossPct}
              >
                <Input
                  value={engineering?.sheetSpecs?.trimLossPct || fmt(sheetDerived.trimLossPct, 2)}
                  onChange={() => {}}
                  disabled
                />
              </ScenarioField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <ScenarioField
                label="Thickness (micron)"
                engineeringValue={reference?.sheetSpecs?.thickness_mic}
                requestValue={requestValueOrBlank(product.sheetThicknessMicron)}
                currentValue={engineering?.sheetSpecs?.thickness_mic}
              >
                <Input
                  value={engineering?.sheetSpecs?.thickness_mic}
                  onChange={(v) => updateSection("sheetSpecs", { thickness_mic: v })}
                />
              </ScenarioField>

              <ScenarioField
                label="Thickness + Tol (micron)"
                engineeringValue={reference?.sheetSpecs?.thicknessTolPlus_mic}
                requestValue=""
                currentValue={engineering?.sheetSpecs?.thicknessTolPlus_mic}
              >
                <Input
                  value={engineering?.sheetSpecs?.thicknessTolPlus_mic}
                  onChange={(v) =>
                    updateSection("sheetSpecs", { thicknessTolPlus_mic: v })
                  }
                />
              </ScenarioField>

              <ScenarioField
                label="Thickness - Tol (micron)"
                engineeringValue={reference?.sheetSpecs?.thicknessTolMinus_mic}
                requestValue=""
                currentValue={engineering?.sheetSpecs?.thicknessTolMinus_mic}
              >
                <Input
                  value={engineering?.sheetSpecs?.thicknessTolMinus_mic}
                  onChange={(v) =>
                    updateSection("sheetSpecs", { thicknessTolMinus_mic: v })
                  }
                />
              </ScenarioField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <ScenarioField
                label="Core Type"
                engineeringValue={reference?.sheetSpecs?.coreType}
                requestValue={requestValueOrBlank(product.coreMaterial)}
                currentValue={engineering?.sheetSpecs?.coreType}
              >
                <Input
                  value={engineering?.sheetSpecs?.coreType}
                  onChange={(v) => updateSection("sheetSpecs", { coreType: v })}
                />
              </ScenarioField>

              <ScenarioField
                label="Core Diameter"
                engineeringValue={reference?.sheetSpecs?.coreSize}
                requestValue=""
                currentValue={engineering?.sheetSpecs?.coreSize}
              >
                <SelectField
                  value={engineering?.sheetSpecs?.coreSize}
                  onChange={(v) => updateSection("sheetSpecs", { coreSize: v })}
                  options={["3 inch", "6 inch", "8 inch"]}
                />
              </ScenarioField>

              <ScenarioField
                label="Core Diameter (mm)"
                engineeringValue={reference?.sheetSpecs?.coreDiameter_mm}
                requestValue=""
                currentValue={engineering?.sheetSpecs?.coreDiameter_mm}
              >
                <Input
                  value={engineering?.sheetSpecs?.coreDiameter_mm}
                  onChange={(v) => updateSection("sheetSpecs", { coreDiameter_mm: v })}
                />
              </ScenarioField>

              <ScenarioField
                label="Roll Diameter (mm)"
                engineeringValue={reference?.sheetSpecs?.rollDiameter_mm}
                requestValue=""
                currentValue={engineering?.sheetSpecs?.rollDiameter_mm}
              >
                <Input
                  value={engineering?.sheetSpecs?.rollDiameter_mm}
                  onChange={(v) => updateSection("sheetSpecs", { rollDiameter_mm: v })}
                />
              </ScenarioField>

              <ScenarioField
                label="Roll Weight (kg)"
                engineeringValue={reference?.sheetSpecs?.rollTargetWeight_kg}
                requestValue={requestValueOrBlank(product.rollWeightKg)}
                currentValue={engineering?.sheetSpecs?.rollTargetWeight_kg}
              >
                <Input
                  value={engineering?.sheetSpecs?.rollTargetWeight_kg}
                  onChange={(v) =>
                    updateSection("sheetSpecs", { rollTargetWeight_kg: v })
                  }
                />
              </ScenarioField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <RefRow
                label="Plastic Weight / m²"
                value={
                  sheetDerived.plasticWeightPerM2_g
                    ? `${fmt(sheetDerived.plasticWeightPerM2_g, 3)} g/m²`
                    : "—"
                }
              />
              <RefRow
                label="Total Weight / m²"
                value={
                  sheetDerived.totalWeightPerM2_g
                    ? `${fmt(sheetDerived.totalWeightPerM2_g, 3)} g/m²`
                    : "—"
                }
              />
              <RefRow
                label="Auto Roll Weight from Diameter"
                value={
                  sheetDerived.calcRollWeight
                    ? `${fmt(sheetDerived.calcRollWeight, 3)} kg`
                    : "—"
                }
              />
              <RefRow
                label="Auto Roll Diameter from Weight"
                value={
                  sheetDerived.calcRollDiameter
                    ? `${fmt(sheetDerived.calcRollDiameter, 2)} mm`
                    : "—"
                }
              />
            </div>

            <div className="rounded-xl border p-4 space-y-4">
              <div className="font-medium">
                {isSheet ? "Sheet Roll Packaging Data" : "Internal Sheet Roll Packaging"}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <ScenarioField
                  label="Core Material"
                  engineeringValue={reference?.sheetPackaging?.coreMaterial}
                  requestValue={requestValueOrBlank(product.coreMaterial)}
                  currentValue={engineering?.sheetPackaging?.coreMaterial}
                >
                  <Input
                    value={engineering?.sheetPackaging?.coreMaterial}
                    onChange={(v) => updateSection("sheetPackaging", { coreMaterial: v })}
                  />
                </ScenarioField>

                <ScenarioField
                  label="Core Size"
                  engineeringValue={reference?.sheetPackaging?.coreSize}
                  requestValue=""
                  currentValue={engineering?.sheetPackaging?.coreSize}
                >
                  <SelectField
                    value={engineering?.sheetPackaging?.coreSize}
                    onChange={(v) => updateSection("sheetPackaging", { coreSize: v })}
                    options={["3 inch", "6 inch", "8 inch"]}
                  />
                </ScenarioField>

                <ScenarioField
                  label="Core Uses"
                  engineeringValue={reference?.sheetPackaging?.coreUses}
                  requestValue=""
                  currentValue={engineering?.sheetPackaging?.coreUses}
                >
                  <Input
                    value={engineering?.sheetPackaging?.coreUses}
                    onChange={(v) => updateSection("sheetPackaging", { coreUses: v })}
                  />
                </ScenarioField>

                <ScenarioField
                  label="Roll Weight (kg)"
                  engineeringValue={reference?.sheetPackaging?.rollWeight_kg}
                  requestValue={requestValueOrBlank(product.rollWeightKg)}
                  currentValue={engineering?.sheetPackaging?.rollWeight_kg}
                >
                  <Input
                    value={
                      engineering?.sheetPackaging?.rollWeight_kg ||
                      engineering?.sheetSpecs?.rollTargetWeight_kg
                    }
                    onChange={(v) => updateSection("sheetPackaging", { rollWeight_kg: v })}
                  />
                </ScenarioField>

                <ScenarioField
                  label="Labels per Roll"
                  engineeringValue={reference?.sheetPackaging?.labelsPerRoll}
                  requestValue=""
                  currentValue={engineering?.sheetPackaging?.labelsPerRoll}
                >
                  <Input
                    value={engineering?.sheetPackaging?.labelsPerRoll}
                    onChange={(v) => updateSection("sheetPackaging", { labelsPerRoll: v })}
                  />
                </ScenarioField>

                <ScenarioField
                  label="Labels per Pallet"
                  engineeringValue={reference?.sheetPackaging?.labelsPerPallet}
                  requestValue=""
                  currentValue={engineering?.sheetPackaging?.labelsPerPallet}
                >
                  <Input
                    value={engineering?.sheetPackaging?.labelsPerPallet}
                    onChange={(v) => updateSection("sheetPackaging", { labelsPerPallet: v })}
                  />
                </ScenarioField>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                <ScenarioField
                  label="Pallet Type"
                  engineeringValue={reference?.sheetPackaging?.palletType}
                  requestValue=""
                  currentValue={engineering?.sheetPackaging?.palletType}
                >
                  <SelectField
                    value={engineering?.sheetPackaging?.palletType}
                    onChange={(v) => updateSection("sheetPackaging", { palletType: v })}
                    options={[
                      { value: "UK", label: "UK Standard Pallet" },
                      { value: "EURO", label: "EURO Pallet" },
                    ]}
                  />
                </ScenarioField>

                <ScenarioField
                  label="Pallet Uses"
                  engineeringValue={reference?.sheetPackaging?.palletUses}
                  requestValue=""
                  currentValue={engineering?.sheetPackaging?.palletUses}
                >
                  <Input
                    value={engineering?.sheetPackaging?.palletUses}
                    onChange={(v) => updateSection("sheetPackaging", { palletUses: v })}
                  />
                </ScenarioField>

                <ScenarioField
                  label="Pallet Length (mm)"
                  engineeringValue={reference?.sheetPackaging?.palletLength_mm}
                  requestValue=""
                  currentValue={engineering?.sheetPackaging?.palletLength_mm}
                >
                  <Input
                    value={engineering?.sheetPackaging?.palletLength_mm}
                    onChange={(v) => updateSection("sheetPackaging", { palletLength_mm: v })}
                  />
                </ScenarioField>

                <ScenarioField
                  label="Pallet Width (mm)"
                  engineeringValue={reference?.sheetPackaging?.palletWidth_mm}
                  requestValue=""
                  currentValue={engineering?.sheetPackaging?.palletWidth_mm}
                >
                  <Input
                    value={engineering?.sheetPackaging?.palletWidth_mm}
                    onChange={(v) => updateSection("sheetPackaging", { palletWidth_mm: v })}
                  />
                </ScenarioField>

                <ScenarioField
                  label="Pallet Height (mm)"
                  engineeringValue={reference?.sheetPackaging?.palletHeight_mm}
                  requestValue=""
                  currentValue={engineering?.sheetPackaging?.palletHeight_mm}
                >
                  <Input
                    value={engineering?.sheetPackaging?.palletHeight_mm}
                    onChange={(v) => updateSection("sheetPackaging", { palletHeight_mm: v })}
                  />
                </ScenarioField>

                <ScenarioField
                  label="Rolls per Pallet"
                  engineeringValue={reference?.sheetPackaging?.rollsPerPallet}
                  requestValue=""
                  currentValue={engineering?.sheetPackaging?.rollsPerPallet}
                >
                  <Input
                    value={engineering?.sheetPackaging?.rollsPerPallet}
                    onChange={(v) => updateSection("sheetPackaging", { rollsPerPallet: v })}
                  />
                </ScenarioField>

                <ScenarioField
                  label="Strap Length / Pallet (m)"
                  engineeringValue={reference?.sheetPackaging?.strapLength_m}
                  requestValue=""
                  currentValue={engineering?.sheetPackaging?.strapLength_m}
                >
                  <Input
                    value={engineering?.sheetPackaging?.strapLength_m}
                    onChange={(v) => updateSection("sheetPackaging", { strapLength_m: v })}
                  />
                </ScenarioField>

                <ScenarioField
                  label="Separators / Pallet"
                  engineeringValue={reference?.sheetPackaging?.separatorsPerPallet}
                  requestValue=""
                  currentValue={engineering?.sheetPackaging?.separatorsPerPallet}
                >
                  <Input
                    value={engineering?.sheetPackaging?.separatorsPerPallet}
                    onChange={(v) =>
                      updateSection("sheetPackaging", { separatorsPerPallet: v })
                    }
                  />
                </ScenarioField>

                <ScenarioField
                  label="Foam Sheet Length / Pallet (m)"
                  engineeringValue={reference?.sheetPackaging?.foamLength_m}
                  requestValue=""
                  currentValue={engineering?.sheetPackaging?.foamLength_m}
                >
                  <Input
                    value={engineering?.sheetPackaging?.foamLength_m}
                    onChange={(v) => updateSection("sheetPackaging", { foamLength_m: v })}
                  />
                </ScenarioField>

                <ScenarioField
                  label="Stretch Film / Pallet (kg)"
                  engineeringValue={reference?.sheetPackaging?.stretchKgPerPallet}
                  requestValue=""
                  currentValue={engineering?.sheetPackaging?.stretchKgPerPallet}
                >
                  <Input
                    value={engineering?.sheetPackaging?.stretchKgPerPallet}
                    onChange={(v) =>
                      updateSection("sheetPackaging", { stretchKgPerPallet: v })
                    }
                  />
                </ScenarioField>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <ScenarioField
                  label="Packaging Instructions"
                  engineeringValue={reference?.sheetPackaging?.instructionText}
                  requestValue=""
                  currentValue={engineering?.sheetPackaging?.instructionText}
                >
                  <TextArea
                    value={engineering?.sheetPackaging?.instructionText}
                    onChange={(v) => updateSection("sheetPackaging", { instructionText: v })}
                    rows={3}
                  />
                </ScenarioField>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section title="2. Extrusion Process Data">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <ScenarioField
              label="Line Name"
              engineeringValue={reference?.extrusion?.lineName}
              requestValue="Breyer"
              currentValue={engineering?.extrusion?.lineName}
            >
              <Input
                value={engineering?.extrusion?.lineName}
                onChange={(v) => updateSection("extrusion", { lineName: v })}
              />
            </ScenarioField>

            <ScenarioField
              label="Scrap Rate %"
              engineeringValue={reference?.extrusion?.scrapRatePct}
              requestValue=""
              currentValue={engineering?.extrusion?.scrapRatePct}
            >
              <Input
                value={engineering?.extrusion?.scrapRatePct}
                onChange={(v) => updateSection("extrusion", { scrapRatePct: v })}
              />
            </ScenarioField>

            <ScenarioField
              label="Non Recoverable Changeover Waste (kg)"
              engineeringValue={reference?.extrusion?.changeoverWasteKg}
              requestValue=""
              currentValue={engineering?.extrusion?.changeoverWasteKg}
            >
              <Input
                value={engineering?.extrusion?.changeoverWasteKg}
                onChange={(v) => updateSection("extrusion", { changeoverWasteKg: v })}
              />
            </ScenarioField>

            <ScenarioField
              label="Startup Waste % (ignored)"
              engineeringValue={reference?.extrusion?.startupWastePct}
              requestValue=""
              currentValue={engineering?.extrusion?.startupWastePct}
            >
              <Input
                value={engineering?.extrusion?.startupWastePct}
                onChange={(v) => updateSection("extrusion", { startupWastePct: v })}
              />
            </ScenarioField>

            <ScenarioField
              label="Efficiency %"
              engineeringValue={reference?.extrusion?.efficiencyPct}
              requestValue=""
              currentValue={engineering?.extrusion?.efficiencyPct}
            >
              <Input
                value={engineering?.extrusion?.efficiencyPct}
                onChange={(v) => updateSection("extrusion", { efficiencyPct: v })}
              />
            </ScenarioField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <ScenarioField
              label={`Gross Speed Extruder A (optimum ${OPT_SPEED_MAP[baseMaterial]?.A || 0} kg/hr)`}
              engineeringValue={reference?.extrusion?.grossSpeedA_kg_hr}
              requestValue={requestValueOrBlank(OPT_SPEED_MAP[baseMaterial]?.A || "")}
              currentValue={engineering?.extrusion?.grossSpeedA_kg_hr}
            >
              <Input
                value={engineering?.extrusion?.grossSpeedA_kg_hr}
                onChange={(v) => updateSection("extrusion", { grossSpeedA_kg_hr: v })}
              />
            </ScenarioField>

            <ScenarioField
              label={`Gross Speed Extruder B (optimum ${OPT_SPEED_MAP[baseMaterial]?.B || 0} kg/hr)`}
              engineeringValue={reference?.extrusion?.grossSpeedB_kg_hr}
              requestValue={requestValueOrBlank(OPT_SPEED_MAP[baseMaterial]?.B || "")}
              currentValue={engineering?.extrusion?.grossSpeedB_kg_hr}
            >
              <Input
                value={engineering?.extrusion?.grossSpeedB_kg_hr}
                onChange={(v) => updateSection("extrusion", { grossSpeedB_kg_hr: v })}
              />
            </ScenarioField>

            <ScenarioField
              label="Total Gross Speed (kg/hr)"
              engineeringValue={reference?.extrusion?.totalGrossSpeed_kg_hr}
              requestValue=""
              currentValue={engineering?.extrusion?.totalGrossSpeed_kg_hr}
            >
              <Input value={engineering?.extrusion?.totalGrossSpeed_kg_hr} onChange={() => {}} disabled />
            </ScenarioField>

            <ScenarioField
              label="Gross / Optimum %"
              engineeringValue={reference?.extrusion?.grossVsOptimalPct}
              requestValue=""
              currentValue={engineering?.extrusion?.grossVsOptimalPct}
            >
              <Input value={engineering?.extrusion?.grossVsOptimalPct} onChange={() => {}} disabled />
            </ScenarioField>

            <RefRow
              label="Matched Speed Guidance"
              value={`A = ${fmt(extrusionDerived.recommendedA, 2)} kg/hr, B = ${fmt(
                extrusionDerived.recommendedB,
                2
              )} kg/hr`}
            />
          </div>

          {extrusionDerived.warningMessage ? (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-700 p-3 text-sm">
              {extrusionDerived.warningMessage}
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <ScenarioField
              label="Net Speed (kg/hr)"
              engineeringValue={reference?.extrusion?.netSpeed_kg_hr}
              requestValue=""
              currentValue={engineering?.extrusion?.netSpeed_kg_hr}
            >
              <Input value={engineering?.extrusion?.netSpeed_kg_hr} onChange={() => {}} disabled />
            </ScenarioField>

            <ScenarioField
              label="Net / Optimum %"
              engineeringValue={reference?.extrusion?.netVsOptimalPct}
              requestValue=""
              currentValue={engineering?.extrusion?.netVsOptimalPct}
            >
              <Input value={engineering?.extrusion?.netVsOptimalPct} onChange={() => {}} disabled />
            </ScenarioField>

            <ScenarioField
              label="Tons / Hr"
              engineeringValue={reference?.extrusion?.tonsPerHour}
              requestValue=""
              currentValue={engineering?.extrusion?.tonsPerHour}
            >
              <Input value={engineering?.extrusion?.tonsPerHour} onChange={() => {}} disabled />
            </ScenarioField>

            <ScenarioField
              label="Tons / Shift (12h)"
              engineeringValue={reference?.extrusion?.tonsPerShift12h}
              requestValue=""
              currentValue={engineering?.extrusion?.tonsPerShift12h}
            >
              <Input value={engineering?.extrusion?.tonsPerShift12h} onChange={() => {}} disabled />
            </ScenarioField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <ScenarioField
              label="Tons / Day (24h)"
              engineeringValue={reference?.extrusion?.tonsPerDay24h}
              requestValue=""
              currentValue={engineering?.extrusion?.tonsPerDay24h}
            >
              <Input value={engineering?.extrusion?.tonsPerDay24h} onChange={() => {}} disabled />
            </ScenarioField>

            <ScenarioField
              label="Tons / Week"
              engineeringValue={reference?.extrusion?.tonsPerWeek}
              requestValue=""
              currentValue={engineering?.extrusion?.tonsPerWeek}
            >
              <Input value={engineering?.extrusion?.tonsPerWeek} onChange={() => {}} disabled />
            </ScenarioField>

            <ScenarioField
              label="Tons / Month"
              engineeringValue={reference?.extrusion?.tonsPerMonth}
              requestValue=""
              currentValue={engineering?.extrusion?.tonsPerMonth}
            >
              <Input value={engineering?.extrusion?.tonsPerMonth} onChange={() => {}} disabled />
            </ScenarioField>

            <ScenarioField
              label="Tons / Year (330d)"
              engineeringValue={reference?.extrusion?.tonsPerYear330d}
              requestValue=""
              currentValue={engineering?.extrusion?.tonsPerYear330d}
            >
              <Input value={engineering?.extrusion?.tonsPerYear330d} onChange={() => {}} disabled />
            </ScenarioField>
          </div>
        </div>
      </Section>

      {!isSheet && (
        <Section title="3. Thermoforming Data">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <ScenarioField
                label="Machine"
                engineeringValue={reference?.thermo?.machineName}
                requestValue=""
                currentValue={engineering?.thermo?.machineName}
              >
                <SelectField
                  value={engineering?.thermo?.machineName}
                  onChange={(v) => updateSection("thermo", { machineName: v })}
                  options={["RDM73K", "RDK80"]}
                />
              </ScenarioField>

              <ScenarioField
                label="Product Weight (g)"
                engineeringValue={reference?.thermo?.unitWeight_g}
                requestValue={requestValueOrBlank(product.productWeightG)}
                currentValue={engineering?.thermo?.unitWeight_g}
              >
                <Input
                  value={engineering?.thermo?.unitWeight_g}
                  onChange={(v) => updateSection("thermo", { unitWeight_g: v })}
                />
              </ScenarioField>

              <ScenarioField
                label="Cavities"
                engineeringValue={reference?.thermo?.cavities}
                requestValue=""
                currentValue={engineering?.thermo?.cavities}
              >
                <Input
                  value={engineering?.thermo?.cavities}
                  onChange={(v) => updateSection("thermo", { cavities: v })}
                />
              </ScenarioField>

              <ScenarioField
                label="CPM"
                engineeringValue={reference?.thermo?.cpm}
                requestValue=""
                currentValue={engineering?.thermo?.cpm}
              >
                <Input
                  value={engineering?.thermo?.cpm}
                  onChange={(v) => updateSection("thermo", { cpm: v })}
                />
              </ScenarioField>

              <ScenarioField
                label="Efficiency %"
                engineeringValue={reference?.thermo?.efficiencyPct}
                requestValue=""
                currentValue={engineering?.thermo?.efficiencyPct}
              >
                <Input
                  value={engineering?.thermo?.efficiencyPct}
                  onChange={(v) => updateSection("thermo", { efficiencyPct: v })}
                />
              </ScenarioField>

              <ScenarioField
                label="Sheet Utilization %"
                engineeringValue={reference?.thermo?.sheetUtilizationPct}
                requestValue=""
                currentValue={engineering?.thermo?.sheetUtilizationPct}
              >
                <Input
                  value={engineering?.thermo?.sheetUtilizationPct}
                  onChange={(v) => updateSection("thermo", { sheetUtilizationPct: v })}
                />
              </ScenarioField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <RefRow label="Pcs / Hr" value={engineering?.thermo?.pcsPerHour} />
              <RefRow label="Pcs / Shift (12h)" value={engineering?.thermo?.pcsPerShift12h} />
              <RefRow label="Pcs / Day" value={engineering?.thermo?.pcsPerDay24h} />
              <RefRow label="Pcs / Week" value={engineering?.thermo?.pcsPerWeek} />
              <RefRow label="Pcs / Month" value={engineering?.thermo?.pcsPerMonth} />
              <RefRow label="Pcs / Year" value={engineering?.thermo?.pcsPerYear330d} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <RefRow
                label="Required Sheet Weight / Hr"
                value={
                  thermoDerived.requiredSheetKgPerHour
                    ? `${fmt(thermoDerived.requiredSheetKgPerHour, 3)} kg`
                    : "—"
                }
              />
              <RefRow
                label="Required Sheet Weight / Shift (12h)"
                value={
                  thermoDerived.requiredSheetKgPerShift12h
                    ? `${fmt(thermoDerived.requiredSheetKgPerShift12h, 3)} kg`
                    : "—"
                }
              />
              <RefRow
                label="Required Sheet Weight / Day (24h)"
                value={
                  thermoDerived.requiredSheetKgPerDay24h
                    ? `${fmt(thermoDerived.requiredSheetKgPerDay24h, 3)} kg`
                    : "—"
                }
              />
            </div>
          </div>
        </Section>
      )}

      {!isSheet && (
        <Section title="4. Tools Needed for Thermoforming">
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border p-3">
              <input
                type="checkbox"
                checked={engineering?.thermo?.enterToolData === true}
                onChange={(e) =>
                  updateSection("thermo", { enterToolData: e.target.checked })
                }
              />
              <div className="font-medium">Enter tool data</div>
            </div>

            {engineering?.thermo?.enterToolData && (
              <div className="rounded-xl border p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {[
                    ["Base Mold Name", "moldBaseName"],
                    ["Base Mold Code", "moldBaseCode"],
                    ["Mold Insert Name", "moldInsertName"],
                    ["Mold Insert Code", "moldInsertCode"],
                    ["Mold Bottom / Engraving Name", "moldBottomName"],
                    ["Mold Bottom / Engraving Code", "moldBottomCode"],
                    ["Cutting Plate Name", "cuttingPlateName"],
                    ["Cutting Plate Code", "cuttingPlateCode"],
                    ["Stacking Unit Name", "stackingUnitName"],
                    ["Stacking Unit Code", "stackingUnitCode"],
                    ["Plug Assist Name", "plugAssistName"],
                    ["Plug Assist Code", "plugAssistCode"],
                  ].map(([label, key]) => (
                    <ScenarioField
                      key={key}
                      label={label}
                      engineeringValue={reference?.tooling?.[key]}
                      requestValue=""
                      currentValue={engineering?.tooling?.[key]}
                    >
                      <Input
                        value={engineering?.tooling?.[key]}
                        onChange={(v) =>
                          updateSection("tooling", { [key]: v, enabled: true })
                        }
                      />
                    </ScenarioField>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {!isSheet && (
        <Section title="5. Decoration">
          <div className="space-y-4">
            {!hasRequestDecoration && (
              <div className="flex items-center gap-3 rounded-xl border p-3">
                <input
                  type="checkbox"
                  checked={engineering?.decorationEngineering?.enabled === true}
                  onChange={(e) =>
                    updateSection("decorationEngineering", {
                      ...engineering.decorationEngineering,
                      enabled: e.target.checked,
                    })
                  }
                />
                <div className="font-medium">Add decoration</div>
              </div>
            )}

            {showDecorationSection && (
              <div className="rounded-xl border p-4 space-y-4">
                <div className="text-sm text-gray-500">
                  Decoration type: {requestDecorationType}
                </div>

                {requestDecorationType === "Dry offset printing" && (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <ScenarioField
                      label="Coverage Area %"
                      engineeringValue={reference?.decorationEngineering?.print?.coverageAreaPct}
                      requestValue=""
                      currentValue={engineering?.decorationEngineering?.print?.coverageAreaPct}
                    >
                      <Input
                        value={engineering?.decorationEngineering?.print?.coverageAreaPct}
                        onChange={(v) =>
                          updateNested("decorationEngineering", "print", {
                            coverageAreaPct: v,
                          })
                        }
                      />
                    </ScenarioField>

                    <ScenarioField
                      label="Ink Weight / 1000 Cups"
                      engineeringValue={reference?.decorationEngineering?.print?.inkWeightPer1000Cups}
                      requestValue=""
                      currentValue={engineering?.decorationEngineering?.print?.inkWeightPer1000Cups}
                    >
                      <Input
                        value={engineering?.decorationEngineering?.print?.inkWeightPer1000Cups}
                        onChange={(v) =>
                          updateNested("decorationEngineering", "print", {
                            inkWeightPer1000Cups: v,
                          })
                        }
                      />
                    </ScenarioField>

                    <ScenarioField
                      label="No. of Colors"
                      engineeringValue={reference?.decorationEngineering?.print?.numberOfColors}
                      requestValue={requestValueOrBlank(payload?.decoration?.dryOffset?.printColors)}
                      currentValue={engineering?.decorationEngineering?.print?.numberOfColors}
                    >
                      <Input
                        value={engineering?.decorationEngineering?.print?.numberOfColors}
                        onChange={(v) =>
                          updateNested("decorationEngineering", "print", {
                            numberOfColors: v,
                          })
                        }
                      />
                    </ScenarioField>

                    <ScenarioField
                      label="Print Area Length (mm)"
                      engineeringValue={reference?.decorationEngineering?.print?.printAreaLengthMm}
                      requestValue=""
                      currentValue={engineering?.decorationEngineering?.print?.printAreaLengthMm}
                    >
                      <Input
                        value={engineering?.decorationEngineering?.print?.printAreaLengthMm}
                        onChange={(v) =>
                          updateNested("decorationEngineering", "print", {
                            printAreaLengthMm: v,
                          })
                        }
                      />
                    </ScenarioField>

                    <ScenarioField
                      label="Print Area Width (mm)"
                      engineeringValue={reference?.decorationEngineering?.print?.printAreaWidthMm}
                      requestValue=""
                      currentValue={engineering?.decorationEngineering?.print?.printAreaWidthMm}
                    >
                      <Input
                        value={engineering?.decorationEngineering?.print?.printAreaWidthMm}
                        onChange={(v) =>
                          updateNested("decorationEngineering", "print", {
                            printAreaWidthMm: v,
                          })
                        }
                      />
                    </ScenarioField>
                  </div>
                )}

                {requestDecorationType === "Shrink sleeve" && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {[
                      ["Sleeve Material", "sleeveMaterial"],
                      ["Sleeve Thickness (micron)", "sleeveThicknessMic"],
                      ["Lay Flat Width (mm)", "layFlatWidthMm"],
                      ["Lay Flat + Tol (mm)", "layFlatTolPlusMm"],
                      ["Lay Flat - Tol (mm)", "layFlatTolMinusMm"],
                      ["Cut Length (mm)", "cutLengthMm"],
                      ["Shrink Ratio TD %", "shrinkRatioTDPct"],
                      ["Shrink Ratio MD %", "shrinkRatioMDPct"],
                      ["Repeat Length (mm)", "repeatLengthMm"],
                      ["Seam Overlap Width (mm)", "seamOverlapWidthMm"],
                      ["Seam Tolerance (± mm)", "seamToleranceMm"],
                    ].map(([label, key]) => (
                      <ScenarioField
                        key={key}
                        label={label}
                        engineeringValue={reference?.decorationEngineering?.sleeve?.[key]}
                        requestValue=""
                        currentValue={engineering?.decorationEngineering?.sleeve?.[key]}
                      >
                        <Input
                          value={engineering?.decorationEngineering?.sleeve?.[key]}
                          onChange={(v) =>
                            updateNested("decorationEngineering", "sleeve", {
                              [key]: v,
                            })
                          }
                        />
                      </ScenarioField>
                    ))}

                    <ScenarioField
                      label="Shrink Curve"
                      engineeringValue={reference?.decorationEngineering?.sleeve?.shrinkCurve}
                      requestValue=""
                      currentValue={engineering?.decorationEngineering?.sleeve?.shrinkCurve}
                    >
                      <TextArea
                        value={engineering?.decorationEngineering?.sleeve?.shrinkCurve}
                        onChange={(v) =>
                          updateNested("decorationEngineering", "sleeve", {
                            shrinkCurve: v,
                          })
                        }
                        rows={3}
                      />
                    </ScenarioField>
                  </div>
                )}

                {requestDecorationType === "Hybrid cup" && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {[
                      ["Blank Material", "blankMaterial"],
                      ["GSM", "gsm"],
                      ["Print Colors", "printColors"],
                      ["Coating", "coating"],
                    ].map(([label, key]) => (
                      <ScenarioField
                        key={key}
                        label={label}
                        engineeringValue={reference?.decorationEngineering?.hybrid?.[key]}
                        requestValue=""
                        currentValue={engineering?.decorationEngineering?.hybrid?.[key]}
                      >
                        <Input
                          value={engineering?.decorationEngineering?.hybrid?.[key]}
                          onChange={(v) =>
                            updateNested("decorationEngineering", "hybrid", {
                              [key]: v,
                            })
                          }
                        />
                      </ScenarioField>
                    ))}

                    <ScenarioField
                      label="Paper Bottom Selected"
                      engineeringValue={reference?.decorationEngineering?.hybrid?.paperBottomSelected}
                      requestValue=""
                      currentValue={engineering?.decorationEngineering?.hybrid?.paperBottomSelected}
                    >
                      <SelectField
                        value={engineering?.decorationEngineering?.hybrid?.paperBottomSelected}
                        onChange={(v) =>
                          updateNested("decorationEngineering", "hybrid", {
                            paperBottomSelected: v,
                          })
                        }
                        options={["Yes", "No"]}
                      />
                    </ScenarioField>
                  </div>
                )}
              </div>
            )}
          </div>
        </Section>
      )}

      <Section title={isSheet ? "4. Investments Required" : "7. Investments Required"}>
        <div className="space-y-4">
          <div>
            <button
              type="button"
              className="rounded-lg border px-3 py-2 text-sm"
              onClick={addInvestmentRow}
            >
              + Add Investment
            </button>
          </div>

          {(engineering?.investments || []).length === 0 ? (
            <div className="text-sm text-gray-500">No investments added yet.</div>
          ) : (
            <div className="space-y-3">
              {(engineering?.investments || []).map((row) => (
                <div key={row.id} className="rounded-xl border p-3">
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                    {[
                      ["Investment Name", "name"],
                      ["Value", "value"],
                      ["Exchange Rate", "exchangeRate"],
                      ["Supplier", "supplier"],
                      ["Lead Time (weeks)", "leadTimeWeeks"],
                    ].map(([label, key]) => (
                      <ScenarioField
                        key={key}
                        label={label}
                        engineeringValue=""
                        requestValue=""
                        currentValue={row[key]}
                      >
                        <Input
                          value={row[key]}
                          onChange={(v) => updateInvestmentRow(row.id, { [key]: v })}
                        />
                      </ScenarioField>
                    ))}

                    <ScenarioField
                      label="Type"
                      engineeringValue=""
                      requestValue=""
                      currentValue={row.type}
                    >
                      <SelectField
                        value={row.type}
                        onChange={(v) => updateInvestmentRow(row.id, { type: v })}
                        options={[
                          "Thermoforming Tools",
                          "Printing Tools",
                          "Shrink Sleeve Tools",
                          "Hybrid Tools",
                          "Others",
                        ]}
                      />
                    </ScenarioField>

                    <ScenarioField
                      label="Currency"
                      engineeringValue=""
                      requestValue=""
                      currentValue={row.currency}
                    >
                      <SelectField
                        value={row.currency}
                        onChange={(v) => updateInvestmentRow(row.id, { currency: v })}
                        options={["EGP", "USD", "EUR"]}
                      />
                    </ScenarioField>
                  </div>

                  <div className="mt-3">
                    <button
                      type="button"
                      className="text-red-600 text-sm underline"
                      onClick={() => removeInvestmentRow(row.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-xl border bg-gray-50 p-4">
            <div className="text-sm text-gray-500">Total Investments in EGP</div>
            <div className="text-xl font-semibold">{fmt(investmentTotalEGP, 2)} EGP</div>
          </div>
        </div>
      </Section>

      {!isSheet && (
        <Section title="7. Thermoformed Product Packaging Data">
          <div className="space-y-5">
            <div className="rounded-xl border p-4 space-y-4">
              <div className="font-medium">Primary Packaging</div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <ScenarioField
                  label="Pieces / Stack"
                  engineeringValue={reference?.packaging?.primary?.pcsPerStack}
                  requestValue={requestValueOrBlank(packagingReq?.primary?.pcsPerStack)}
                  currentValue={engineering?.packaging?.primary?.pcsPerStack}
                >
                  <Input
                    value={engineering?.packaging?.primary?.pcsPerStack}
                    onChange={(v) =>
                      updateNested("packaging", "primary", { pcsPerStack: v })
                    }
                  />
                </ScenarioField>

                <ScenarioField
                  label="Stacks / Bag"
                  engineeringValue={reference?.packaging?.primary?.stacksPerPrimary}
                  requestValue={requestValueOrBlank(packagingReq?.primary?.stacksPerBag)}
                  currentValue={engineering?.packaging?.primary?.stacksPerPrimary}
                >
                  <Input
                    value={engineering?.packaging?.primary?.stacksPerPrimary}
                    onChange={(v) =>
                      updateNested("packaging", "primary", { stacksPerPrimary: v })
                    }
                  />
                </ScenarioField>

                <ScenarioField
                  label="Bag / Sleeve Material"
                  engineeringValue={reference?.packaging?.primary?.primaryMaterial}
                  requestValue={requestValueOrBlank(packagingReq?.primary?.bagSleeveMaterial)}
                  currentValue={engineering?.packaging?.primary?.primaryMaterial}
                >
                  <Input
                    value={engineering?.packaging?.primary?.primaryMaterial}
                    onChange={(v) =>
                      updateNested("packaging", "primary", { primaryMaterial: v })
                    }
                  />
                </ScenarioField>

                <ScenarioField
                  label="Primary Pack Name"
                  engineeringValue={reference?.packaging?.primary?.primaryName}
                  requestValue={requestValueOrBlank(packagingReq?.primary?.bagSleeveMaterial)}
                  currentValue={engineering?.packaging?.primary?.primaryName}
                >
                  <Input
                    value={engineering?.packaging?.primary?.primaryName}
                    onChange={(v) =>
                      updateNested("packaging", "primary", { primaryName: v })
                    }
                  />
                </ScenarioField>
              </div>
            </div>

            <div className="rounded-xl border p-4 space-y-4">
              <div className="font-medium">Secondary Packaging</div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <ScenarioField
                  label="Bags / Carton"
                  engineeringValue={reference?.packaging?.secondary?.primariesPerSecondary}
                  requestValue={requestValueOrBlank(packagingReq?.secondary?.bagsPerCarton)}
                  currentValue={engineering?.packaging?.secondary?.primariesPerSecondary}
                >
                  <Input
                    value={engineering?.packaging?.secondary?.primariesPerSecondary}
                    onChange={(v) =>
                      updateNested("packaging", "secondary", {
                        primariesPerSecondary: v,
                      })
                    }
                  />
                </ScenarioField>

                <ScenarioField
                  label="Carton Type"
                  engineeringValue={reference?.packaging?.secondary?.secondaryType}
                  requestValue={requestValueOrBlank(packagingReq?.secondary?.cartonType)}
                  currentValue={engineering?.packaging?.secondary?.secondaryType}
                >
                  <SelectField
                    value={engineering?.packaging?.secondary?.secondaryType}
                    onChange={(v) =>
                      updateNested("packaging", "secondary", { secondaryType: v })
                    }
                    options={[
                      { value: "Single wall", label: "Single wall" },
                      { value: "Double wall", label: "Double wall" },
                    ]}
                  />
                </ScenarioField>

                <ScenarioField
                  label="Secondary Pack Name"
                  engineeringValue={reference?.packaging?.secondary?.secondaryName}
                  requestValue={requestValueOrBlank(packagingReq?.secondary?.cartonType)}
                  currentValue={engineering?.packaging?.secondary?.secondaryName}
                >
                  <Input
                    value={engineering?.packaging?.secondary?.secondaryName}
                    onChange={(v) =>
                      updateNested("packaging", "secondary", { secondaryName: v })
                    }
                  />
                </ScenarioField>

                <ScenarioField
                  label="Labels / Box"
                  engineeringValue={reference?.packaging?.secondary?.labelsPerBox}
                  requestValue={requestValueOrBlank(packagingReq?.labelInstructions?.cartonLabelRequired)}
                  currentValue={engineering?.packaging?.secondary?.labelsPerBox}
                >
                  <Input
                    value={engineering?.packaging?.secondary?.labelsPerBox}
                    onChange={(v) =>
                      updateNested("packaging", "secondary", { labelsPerBox: v })
                    }
                  />
                </ScenarioField>
              </div>
            </div>

            <div className="rounded-xl border p-4 space-y-4">
              <div className="font-medium">Pallet</div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <ScenarioField
                  label="Use Pallet"
                  engineeringValue={reference?.packaging?.pallet?.palletSelected}
                  requestValue={packagingReq?.pallet?.noPalletNeeded ? "No" : "Yes"}
                  currentValue={engineering?.packaging?.pallet?.palletSelected}
                >
                  <SelectField
                    value={engineering?.packaging?.pallet?.palletSelected}
                    onChange={(v) =>
                      updateNested("packaging", "pallet", { palletSelected: v })
                    }
                    options={["Yes", "No"]}
                  />
                </ScenarioField>

                {engineering?.packaging?.pallet?.palletSelected === "Yes" && (
                  <>
                    <ScenarioField
                      label="Pallet Type"
                      engineeringValue={reference?.packaging?.pallet?.palletType}
                      requestValue={requestValueOrBlank(packagingReq?.pallet?.palletType)}
                      currentValue={engineering?.packaging?.pallet?.palletType}
                    >
                      <SelectField
                        value={engineering?.packaging?.pallet?.palletType}
                        onChange={(v) =>
                          updateNested("packaging", "pallet", { palletType: v })
                        }
                        options={[
                          { value: "UK", label: "UK Standard Pallet" },
                          { value: "EURO", label: "EURO Pallet" },
                        ]}
                      />
                    </ScenarioField>

                    <ScenarioField
                      label="Cartons / Pallet"
                      engineeringValue={reference?.packaging?.pallet?.boxesPerPallet}
                      requestValue={requestValueOrBlank(packagingReq?.pallet?.cartonsPerPallet)}
                      currentValue={engineering?.packaging?.pallet?.boxesPerPallet}
                    >
                      <Input
                        value={engineering?.packaging?.pallet?.boxesPerPallet}
                        onChange={(v) =>
                          updateNested("packaging", "pallet", { boxesPerPallet: v })
                        }
                      />
                    </ScenarioField>

                    <ScenarioField
                      label="Stretch / Pallet (kg)"
                      engineeringValue={reference?.packaging?.pallet?.stretchWeightPerPallet_kg}
                      requestValue={requestValueOrBlank(packagingReq?.pallet?.stretchWrapKgPerPallet)}
                      currentValue={engineering?.packaging?.pallet?.stretchWeightPerPallet_kg}
                    >
                      <Input
                        value={engineering?.packaging?.pallet?.stretchWeightPerPallet_kg}
                        onChange={(v) =>
                          updateNested("packaging", "pallet", {
                            stretchWeightPerPallet_kg: v,
                          })
                        }
                      />
                    </ScenarioField>
                  </>
                )}
              </div>

              <ScenarioField
                label="Packaging Notes / Special Instructions"
                engineeringValue={reference?.packaging?.notes}
                requestValue={requestValueOrBlank(
                  packagingReq?.primary?.primaryPackagingNotes ||
                    packagingReq?.secondary?.cartonPackagingNotes ||
                    packagingReq?.pallet?.palletNotes
                )}
                currentValue={engineering?.packaging?.notes}
              >
                <TextArea
                  value={engineering?.packaging?.notes}
                  onChange={(v) => updateSection("packaging", { notes: v })}
                  rows={3}
                />
              </ScenarioField>

              <ScenarioField
                label="Auto Packaging Instruction"
                engineeringValue={reference?.packaging?.instructionText}
                requestValue=""
                currentValue={engineering?.packaging?.instructionText}
              >
                <TextArea
                  value={engineering?.packaging?.instructionText}
                  onChange={(v) => updateSection("packaging", { instructionText: v })}
                  rows={3}
                />
              </ScenarioField>

              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <RefRow label="pcs / stack" value={engineering?.packaging?.primary?.pcsPerStack || "—"} />
                <RefRow label="stacks / primary" value={engineering?.packaging?.primary?.stacksPerPrimary || "—"} />
                <RefRow
                  label="pcs / primary"
                  value={
                    thermoPackagingDerived.pcsPerPrimary
                      ? fmt(thermoPackagingDerived.pcsPerPrimary, 0)
                      : "—"
                  }
                />
                <RefRow
                  label="primary / carton"
                  value={engineering?.packaging?.secondary?.primariesPerSecondary || "—"}
                />
                <RefRow
                  label="pcs / carton"
                  value={
                    thermoPackagingDerived.pcsPerCarton
                      ? fmt(thermoPackagingDerived.pcsPerCarton, 0)
                      : "—"
                  }
                />
                <RefRow
                  label="pcs / pallet"
                  value={
                    thermoPackagingDerived.pcsPerPallet
                      ? fmt(thermoPackagingDerived.pcsPerPallet, 0)
                      : "—"
                  }
                />
              </div>
            </div>
          </div>
        </Section>
      )}

      <Section title={isSheet ? "5. Freight / Logistics" : "8. Freight / Logistics"}>
        <div className="space-y-4">
          <div className="rounded-xl border p-4">
            <div className="font-medium mb-3">Freight Notes</div>
            <ScenarioField
              label="Freight Notes"
              engineeringValue={reference?.freight?.notes}
              requestValue=""
              currentValue={engineering?.freight?.notes}
            >
              <TextArea
                value={engineering?.freight?.notes}
                onChange={(v) => updateSection("freight", { notes: v })}
                rows={3}
              />
            </ScenarioField>
          </div>

          <div className="rounded-xl border p-4">
            <div className="font-medium mb-3">Container Reference</div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3">Container</th>
                    <th className="text-left p-3">Volume</th>
                    <th className="text-left p-3">Tare</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(CONTAINER_SPECS).map((key) => (
                    <tr key={key} className="border-t">
                      <td className="p-3">{key}</td>
                      <td className="p-3">{CONTAINER_SPECS[key].volume_m3} m³</td>
                      <td className="p-3">{CONTAINER_SPECS[key].tare_kg} kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Section>

      <Section title={isSheet ? "6. Notes" : "9. Notes"}>
        <div className="space-y-4">
          <RefRow
            label="Customer"
            value={primaryCustomer?.customerName || "—"}
          />
          <RefRow
            label="Project"
            value={project?.projectName || "—"}
          />
          <RefRow
            label="Product"
            value={product?.productType || "—"}
          />
        </div>
      </Section>
    </div>
  );
}

function displayValue(value) {
  if (value === null || value === undefined || String(value).trim() === "") return "—";
  return String(value);
}