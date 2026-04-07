import { Children, useEffect, useMemo } from "react";

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

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj || {}));
}

function valuesEqual(a, b) {
  return String(a ?? "").trim() === String(b ?? "").trim();
}

function getAtPath(obj, path) {
  if (!obj || !path) return "";
  const parts = path.split(".");
  let current = obj;

  for (const part of parts) {
    if (current == null) return "";
    current = current[part];
  }

  return current ?? "";
}

function requestValueOrBlank(value) {
  if (value === undefined || value === null) return "";
  return String(value);
}

function formatRefValue(value) {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function Section({ title, children }) {
  const validChildren = Children.toArray(children).filter(Boolean);
  if (validChildren.length === 0) return null;

  return (
    <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
      <h2 className="font-semibold text-lg">{title}</h2>
      {validChildren}
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

function RefHints({ engineeringValue, requestValue, currentValue }) {
  const changedVsEngineering = !valuesEqual(currentValue, engineeringValue);

  return (
    <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-1">
      <div
        className={`text-[11px] ${
          changedVsEngineering ? "text-red-600 font-medium" : "text-gray-400"
        }`}
      >
        Engineering Review: {formatRefValue(engineeringValue)}
      </div>
      <div className="text-[11px] text-gray-400">
        Request Initiation: {formatRefValue(requestValue)}
      </div>
    </div>
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

function SelectField({ value, onChange, options = [], disabled = false }) {
  return (
    <select
      className={`w-full border rounded-lg p-2 ${
        disabled ? "bg-gray-100 text-gray-500" : ""
      }`}
      value={value || ""}
      disabled={disabled}
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

const TRACKED_FIELDS = [
  { section: "Material Sheet", label: "Base Material", path: "materialSheet.baseMaterial" },
  { section: "Material Sheet", label: "Density", path: "materialSheet.density" },
  { section: "Material Sheet", label: "Structure", path: "materialSheet.structure" },
  { section: "Material Sheet", label: "Layer A %", path: "materialSheet.layerAPct" },
  { section: "Material Sheet", label: "Process Waste %", path: "materialSheet.processWastePct" },
  { section: "Material Sheet", label: "Coating Used", path: "materialSheet.coatingUsed" },
  { section: "Material Sheet", label: "Coating Name", path: "materialSheet.coatingName" },
  { section: "Material Sheet", label: "Coating Weight", path: "materialSheet.coatingWeight_g_m2" },

  { section: "Sheet Specs", label: "Net Width", path: "sheetSpecs.netWidth_mm" },
  { section: "Sheet Specs", label: "Edge Trim / Side", path: "sheetSpecs.edgeTrimPerSide_mm" },
  { section: "Sheet Specs", label: "Width + Tol", path: "sheetSpecs.widthTolPlus_mm" },
  { section: "Sheet Specs", label: "Width - Tol", path: "sheetSpecs.widthTolMinus_mm" },
  { section: "Sheet Specs", label: "Thickness", path: "sheetSpecs.thickness_mic" },
  { section: "Sheet Specs", label: "Thickness + Tol", path: "sheetSpecs.thicknessTolPlus_mic" },
  { section: "Sheet Specs", label: "Thickness - Tol", path: "sheetSpecs.thicknessTolMinus_mic" },
  { section: "Sheet Specs", label: "Core Type", path: "sheetSpecs.coreType" },
  { section: "Sheet Specs", label: "Core Size", path: "sheetSpecs.coreSize" },
  { section: "Sheet Specs", label: "Core Diameter", path: "sheetSpecs.coreDiameter_mm" },
  { section: "Sheet Specs", label: "Roll Diameter", path: "sheetSpecs.rollDiameter_mm" },
  { section: "Sheet Specs", label: "Roll Weight", path: "sheetSpecs.rollTargetWeight_kg" },
  { section: "Sheet Specs", label: "Surface Mode", path: "sheetSpecs.surfaceMode" },
  { section: "Sheet Specs", label: "Product Diameter", path: "sheetSpecs.productDiameter_mm" },
  { section: "Sheet Specs", label: "Manual Surface Area", path: "sheetSpecs.manualSurfaceArea_cm2" },
  { section: "Sheet Specs", label: "Thickness Calc", path: "sheetSpecs.thicknessCalc_mic" },
  { section: "Sheet Specs", label: "Weight Calc", path: "sheetSpecs.weightCalc_g" },
  { section: "Sheet Specs", label: "Thickness Calc Mode", path: "sheetSpecs.thicknessCalcMode" },

  { section: "Sheet Packaging", label: "Core Material", path: "sheetPackaging.coreMaterial" },
  { section: "Sheet Packaging", label: "Core Size", path: "sheetPackaging.coreSize" },
  { section: "Sheet Packaging", label: "Core Uses", path: "sheetPackaging.coreUses" },
  { section: "Sheet Packaging", label: "Roll Weight", path: "sheetPackaging.rollWeight_kg" },
  { section: "Sheet Packaging", label: "Labels per Roll", path: "sheetPackaging.labelsPerRoll" },
  { section: "Sheet Packaging", label: "Labels per Pallet", path: "sheetPackaging.labelsPerPallet" },
  { section: "Sheet Packaging", label: "Pallet Type", path: "sheetPackaging.palletType" },
  { section: "Sheet Packaging", label: "Pallet Uses", path: "sheetPackaging.palletUses" },
  { section: "Sheet Packaging", label: "Pallet Length", path: "sheetPackaging.palletLength_mm" },
  { section: "Sheet Packaging", label: "Pallet Width", path: "sheetPackaging.palletWidth_mm" },
  { section: "Sheet Packaging", label: "Pallet Height", path: "sheetPackaging.palletHeight_mm" },
  { section: "Sheet Packaging", label: "Rolls per Pallet", path: "sheetPackaging.rollsPerPallet" },
  { section: "Sheet Packaging", label: "Strap Length", path: "sheetPackaging.strapLength_m" },
  { section: "Sheet Packaging", label: "Separators", path: "sheetPackaging.separatorsPerPallet" },
  { section: "Sheet Packaging", label: "Foam Length", path: "sheetPackaging.foamLength_m" },
  { section: "Sheet Packaging", label: "Stretch Kg", path: "sheetPackaging.stretchKgPerPallet" },
  { section: "Sheet Packaging", label: "Instruction Text", path: "sheetPackaging.instructionText" },

  { section: "Extrusion", label: "Line Name", path: "extrusion.lineName" },
  { section: "Extrusion", label: "Scrap Rate %", path: "extrusion.scrapRatePct" },
  { section: "Extrusion", label: "Changeover Waste Kg", path: "extrusion.changeoverWasteKg" },
  { section: "Extrusion", label: "Startup Waste %", path: "extrusion.startupWastePct" },
  { section: "Extrusion", label: "Gross Speed A", path: "extrusion.grossSpeedA_kg_hr" },
  { section: "Extrusion", label: "Gross Speed B", path: "extrusion.grossSpeedB_kg_hr" },
  { section: "Extrusion", label: "Efficiency %", path: "extrusion.efficiencyPct" },

  { section: "Thermo", label: "Applicable", path: "thermo.applicable" },
  { section: "Thermo", label: "Machine", path: "thermo.machineName" },
  { section: "Thermo", label: "Unit Weight", path: "thermo.unitWeight_g" },
  { section: "Thermo", label: "Cavities", path: "thermo.cavities" },
  { section: "Thermo", label: "CPM", path: "thermo.cpm" },
  { section: "Thermo", label: "Efficiency %", path: "thermo.efficiencyPct" },
  { section: "Thermo", label: "Sheet Utilization %", path: "thermo.sheetUtilizationPct" },
  { section: "Thermo", label: "Enter Tool Data", path: "thermo.enterToolData" },

  { section: "Tooling", label: "Mold Base Name", path: "tooling.moldBaseName" },
  { section: "Tooling", label: "Mold Base Code", path: "tooling.moldBaseCode" },
  { section: "Tooling", label: "Insert Name", path: "tooling.moldInsertName" },
  { section: "Tooling", label: "Insert Code", path: "tooling.moldInsertCode" },
  { section: "Tooling", label: "Bottom Name", path: "tooling.moldBottomName" },
  { section: "Tooling", label: "Bottom Code", path: "tooling.moldBottomCode" },
  { section: "Tooling", label: "Cutting Plate Name", path: "tooling.cuttingPlateName" },
  { section: "Tooling", label: "Cutting Plate Code", path: "tooling.cuttingPlateCode" },
  { section: "Tooling", label: "Stacking Unit Name", path: "tooling.stackingUnitName" },
  { section: "Tooling", label: "Stacking Unit Code", path: "tooling.stackingUnitCode" },
  { section: "Tooling", label: "Plug Assist Name", path: "tooling.plugAssistName" },
  { section: "Tooling", label: "Plug Assist Code", path: "tooling.plugAssistCode" },

  { section: "Decoration", label: "Decoration Enabled", path: "decorationEngineering.enabled" },
  { section: "Decoration", label: "Print Coverage Area %", path: "decorationEngineering.print.coverageAreaPct" },
  { section: "Decoration", label: "Ink Weight / 1000", path: "decorationEngineering.print.inkWeightPer1000Cups" },
  { section: "Decoration", label: "Print Colors", path: "decorationEngineering.print.numberOfColors" },
  { section: "Decoration", label: "Print Area Length", path: "decorationEngineering.print.printAreaLengthMm" },
  { section: "Decoration", label: "Print Area Width", path: "decorationEngineering.print.printAreaWidthMm" },
  { section: "Decoration", label: "Sleeve Material", path: "decorationEngineering.sleeve.sleeveMaterial" },
  { section: "Decoration", label: "Sleeve Thickness", path: "decorationEngineering.sleeve.sleeveThicknessMic" },
  { section: "Decoration", label: "Lay Flat Width", path: "decorationEngineering.sleeve.layFlatWidthMm" },
  { section: "Decoration", label: "Lay Flat + Tol", path: "decorationEngineering.sleeve.layFlatTolPlusMm" },
  { section: "Decoration", label: "Lay Flat - Tol", path: "decorationEngineering.sleeve.layFlatTolMinusMm" },
  { section: "Decoration", label: "Cut Length", path: "decorationEngineering.sleeve.cutLengthMm" },
  { section: "Decoration", label: "Shrink Ratio TD", path: "decorationEngineering.sleeve.shrinkRatioTDPct" },
  { section: "Decoration", label: "Shrink Ratio MD", path: "decorationEngineering.sleeve.shrinkRatioMDPct" },
  { section: "Decoration", label: "Shrink Curve", path: "decorationEngineering.sleeve.shrinkCurve" },
  { section: "Decoration", label: "Repeat Length", path: "decorationEngineering.sleeve.repeatLengthMm" },
  { section: "Decoration", label: "Seam Overlap Width", path: "decorationEngineering.sleeve.seamOverlapWidthMm" },
  { section: "Decoration", label: "Seam Tolerance", path: "decorationEngineering.sleeve.seamToleranceMm" },
  { section: "Decoration", label: "Blank Material", path: "decorationEngineering.hybrid.blankMaterial" },
  { section: "Decoration", label: "GSM", path: "decorationEngineering.hybrid.gsm" },
  { section: "Decoration", label: "Hybrid Print Colors", path: "decorationEngineering.hybrid.printColors" },
  { section: "Decoration", label: "Hybrid Coating", path: "decorationEngineering.hybrid.coating" },
  { section: "Decoration", label: "Paper Bottom Selected", path: "decorationEngineering.hybrid.paperBottomSelected" },
  { section: "Decoration", label: "Paper Bottom Material", path: "decorationEngineering.hybrid.paperBottomMaterial" },
  { section: "Decoration", label: "Paper Bottom GSM", path: "decorationEngineering.hybrid.paperBottomGsm" },
  { section: "Decoration", label: "Paper Bottom PE", path: "decorationEngineering.hybrid.paperBottomPE_g_m2" },

  { section: "Packaging", label: "Use Pallet", path: "packaging.usePallet" },
  { section: "Packaging", label: "Pieces / Stack", path: "packaging.primary.pcsPerStack" },
  { section: "Packaging", label: "Stacks / Primary", path: "packaging.primary.stacksPerPrimary" },
  { section: "Packaging", label: "Primary Name", path: "packaging.primary.primaryName" },
  { section: "Packaging", label: "Primary Length", path: "packaging.primary.primaryLength_mm" },
  { section: "Packaging", label: "Primary Width", path: "packaging.primary.primaryWidth_mm" },
  { section: "Packaging", label: "Primary Height", path: "packaging.primary.primaryHeight_mm" },
  { section: "Packaging", label: "Primary Material", path: "packaging.primary.primaryMaterial" },
  { section: "Packaging", label: "Primary Artwork", path: "packaging.primary.primaryArtworkCode" },

  { section: "Packaging", label: "Primaries / Secondary", path: "packaging.secondary.primariesPerSecondary" },
  { section: "Packaging", label: "Secondary Name", path: "packaging.secondary.secondaryName" },
  { section: "Packaging", label: "Secondary Type", path: "packaging.secondary.secondaryType" },
  { section: "Packaging", label: "Secondary Length", path: "packaging.secondary.secondaryLength_mm" },
  { section: "Packaging", label: "Secondary Width", path: "packaging.secondary.secondaryWidth_mm" },
  { section: "Packaging", label: "Secondary Height", path: "packaging.secondary.secondaryHeight_mm" },
  { section: "Packaging", label: "Labels / Box", path: "packaging.secondary.labelsPerBox" },
  { section: "Packaging", label: "Label Length", path: "packaging.secondary.labelLength_mm" },
  { section: "Packaging", label: "Label Width", path: "packaging.secondary.labelWidth_mm" },

  { section: "Packaging", label: "Pallet Selected", path: "packaging.pallet.palletSelected" },
  { section: "Packaging", label: "Pallet Width", path: "packaging.pallet.palletWidth_mm" },
  { section: "Packaging", label: "Pallet Height", path: "packaging.pallet.palletHeight_mm" },
  { section: "Packaging", label: "Pallet Length", path: "packaging.pallet.palletLength_mm" },
  { section: "Packaging", label: "Pallet Type", path: "packaging.pallet.palletType" },
  { section: "Packaging", label: "Boxes / Pallet", path: "packaging.pallet.boxesPerPallet" },
  { section: "Packaging", label: "Stretch Weight / Pallet", path: "packaging.pallet.stretchWeightPerPallet_kg" },
  { section: "Packaging", label: "Labels / Pallet", path: "packaging.pallet.labelsPerPallet" },
  { section: "Packaging", label: "Packaging Notes", path: "packaging.notes" },
  { section: "Packaging", label: "Packaging Instruction", path: "packaging.instructionText" },

  { section: "Freight", label: "Small Truck Pallets", path: "freight.smallTruck_pallets" },
  { section: "Freight", label: "Small Truck Cartons", path: "freight.smallTruck_cartons" },
  { section: "Freight", label: "Medium Truck Pallets", path: "freight.mediumTruck_pallets" },
  { section: "Freight", label: "Medium Truck Cartons", path: "freight.mediumTruck_cartons" },
  { section: "Freight", label: "Large Truck Pallets", path: "freight.largeTruck_pallets" },
  { section: "Freight", label: "Large Truck Cartons", path: "freight.largeTruck_cartons" },
  { section: "Freight", label: "Double Trailer Pallets", path: "freight.doubleTrailer_pallets" },
  { section: "Freight", label: "Double Trailer Cartons", path: "freight.doubleTrailer_cartons" },
  { section: "Freight", label: "Freight Notes", path: "freight.notes" },
];

export default function PricingEngineeringTab({
  requestData,
  engineeringReviewData,
  scenarioEngineering,
  setScenarioEngineering,
  engineeringChangeSummary,
  setEngineeringChangeSummary,
}) {
  const customerBlock = requestData?.customer || {};
  const primaryCustomer = customerBlock?.customers?.[0] || {};
  const project = requestData?.project || {};
  const product = requestData?.product || {};
  const packagingReq = requestData?.packaging || {};
  const isSheet = product?.productType === "Sheet Roll";

  const image =
    product?.productThumbnailUrl ||
    product?.productThumbnailPreview ||
    (product?.productThumbnailBase64
      ? `data:image/*;base64,${product.productThumbnailBase64}`
      : "");

  const requestedBaseMaterial = product.sheetMaterial || product.productMaterial || "";
  const baseMaterial = scenarioEngineering?.materialSheet?.baseMaterial || requestedBaseMaterial;
  const density = n(scenarioEngineering?.materialSheet?.density) || DENSITY_MAP[baseMaterial] || 0;

  const updateSection = (section, patch) => {
    setScenarioEngineering((prev) => ({
      ...prev,
      [section]: {
        ...(prev?.[section] || {}),
        ...patch,
      },
    }));
  };

  const updateNested = (section, key, patch) => {
    setScenarioEngineering((prev) => ({
      ...prev,
      [section]: {
        ...(prev?.[section] || {}),
        [key]: {
          ...(prev?.[section]?.[key] || {}),
          ...patch,
        },
      },
    }));
  };

  const updateMaterialRow = (side, id, patch) => {
    setScenarioEngineering((prev) => {
      const next = deepClone(prev);

      next.materialSheet[side] = (next.materialSheet?.[side] || []).map((r) =>
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
      const next = deepClone(prev);
      next.materialSheet[side] = [
        ...(next.materialSheet?.[side] || []),
        blankMaterialRow(),
      ];

      if (side === "layerA" && next.materialSheet.syncLayerBWithA) {
        next.materialSheet.layerB = next.materialSheet.layerA.map((r) => ({ ...r }));
      }

      return next;
    });
  };

  const removeMaterialRow = (side, id) => {
    setScenarioEngineering((prev) => {
      const next = deepClone(prev);
      next.materialSheet[side] = (next.materialSheet?.[side] || []).filter(
        (r) => r.id !== id
      );

      if (next.materialSheet[side].length === 0) {
        next.materialSheet[side] = [blankMaterialRow()];
      }

      if (side === "layerA" && next.materialSheet.syncLayerBWithA) {
        next.materialSheet.layerB = next.materialSheet.layerA.map((r) => ({ ...r }));
      }

      return next;
    });
  };

  useEffect(() => {
    if (!scenarioEngineering?.materialSheet?.syncLayerBWithA) return;

    setScenarioEngineering((prev) => ({
      ...prev,
      materialSheet: {
        ...(prev?.materialSheet || {}),
        layerB: (prev?.materialSheet?.layerA || []).map((r) => ({ ...r })),
      },
    }));
  }, [scenarioEngineering?.materialSheet?.syncLayerBWithA, scenarioEngineering?.materialSheet?.layerA, setScenarioEngineering]);

  useEffect(() => {
    const balanced = getBalancedExtruderSpeeds(
      baseMaterial,
      scenarioEngineering?.materialSheet?.layerAPct
    );

    const currentA = n(scenarioEngineering?.extrusion?.grossSpeedA_kg_hr);
    const currentB = n(scenarioEngineering?.extrusion?.grossSpeedB_kg_hr);

    if ((!currentA && balanced.speedA) || (!currentB && balanced.speedB)) {
      updateSection("extrusion", {
        grossSpeedA_kg_hr:
          !currentA && balanced.speedA
            ? String(balanced.speedA.toFixed(2))
            : scenarioEngineering?.extrusion?.grossSpeedA_kg_hr || "",
        grossSpeedB_kg_hr:
          !currentB && balanced.speedB
            ? String(balanced.speedB.toFixed(2))
            : scenarioEngineering?.extrusion?.grossSpeedB_kg_hr || "",
      });
    }
  }, [
    baseMaterial,
    scenarioEngineering?.materialSheet?.layerAPct,
  ]);

  useEffect(() => {
    const coreSize = scenarioEngineering?.sheetSpecs?.coreSize || "6 inch";
    const coreDia = CORE_MAP_MM[coreSize] || n(scenarioEngineering?.sheetSpecs?.coreDiameter_mm);

    if (String(coreDia) !== String(scenarioEngineering?.sheetSpecs?.coreDiameter_mm || "")) {
      updateSection("sheetSpecs", { coreDiameter_mm: String(coreDia) });
    }

    if (!scenarioEngineering?.sheetPackaging?.coreSize) {
      updateSection("sheetPackaging", { coreSize });
    }
  }, [
    scenarioEngineering?.sheetSpecs?.coreSize,
    scenarioEngineering?.sheetSpecs?.coreDiameter_mm,
    scenarioEngineering?.sheetPackaging?.coreSize,
  ]);

  const balancedExtrusion = useMemo(() => {
    return getBalancedExtruderSpeeds(
      baseMaterial,
      scenarioEngineering?.materialSheet?.layerAPct
    );
  }, [baseMaterial, scenarioEngineering?.materialSheet?.layerAPct]);

  const sheetDerived = useMemo(() => {
    const netWidth = n(scenarioEngineering?.sheetSpecs?.netWidth_mm);
    const edgeTrim = n(scenarioEngineering?.sheetSpecs?.edgeTrimPerSide_mm);
    const grossWidth = netWidth + 2 * edgeTrim;
    const trimLossPct = grossWidth > 0 ? (1 - netWidth / grossWidth) * 100 : 0;

    const thicknessMic = n(scenarioEngineering?.sheetSpecs?.thickness_mic);
    const rollDiameter = n(scenarioEngineering?.sheetSpecs?.rollDiameter_mm);
    const coreDiameter = n(scenarioEngineering?.sheetSpecs?.coreDiameter_mm);
    const rollWeightInput = n(scenarioEngineering?.sheetSpecs?.rollTargetWeight_kg);
    const coatingWeightPerM2 =
      scenarioEngineering?.materialSheet?.coatingUsed === "Yes"
        ? n(scenarioEngineering?.materialSheet?.coatingWeight_g_m2)
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

    const isRound = scenarioEngineering?.sheetSpecs?.surfaceMode !== "Manual";
    const productDiameter = n(
      scenarioEngineering?.sheetSpecs?.productDiameter_mm || product?.topDiameterMm
    );
    const manualArea = n(scenarioEngineering?.sheetSpecs?.manualSurfaceArea_cm2);

    const surfaceArea_cm2 = isRound
      ? productDiameter > 0
        ? Math.PI * (productDiameter / 20) ** 2
        : 0
      : manualArea;

    const thicknessCalc_mic = n(scenarioEngineering?.sheetSpecs?.thicknessCalc_mic);
    const weightCalc_g = n(
      scenarioEngineering?.sheetSpecs?.weightCalc_g || product?.productWeightG
    );

    const calcWeightFromThickness =
      surfaceArea_cm2 > 0 && thicknessCalc_mic > 0 && density > 0
        ? surfaceArea_cm2 * (thicknessCalc_mic / 10000) * density
        : 0;

    const calcThicknessFromWeight =
      surfaceArea_cm2 > 0 && weightCalc_g > 0 && density > 0
        ? (weightCalc_g / (surfaceArea_cm2 * density)) * 10000
        : 0;

    const materialPerTonRows = [];
    const layerAShare = n(scenarioEngineering?.materialSheet?.layerAPct) / 100;
    const layerBShare = 1 - layerAShare;
    const grouped = {};

    (scenarioEngineering?.materialSheet?.layerA || []).forEach((row) => {
      const name = String(row.name || "").trim();
      const pct = n(row.pct) / 100;
      if (!name || pct <= 0) return;

      if (!grouped[name]) grouped[name] = { pctLayerA: 0, pctLayerB: 0 };
      grouped[name].pctLayerA += pct;
    });

    (scenarioEngineering?.materialSheet?.layerB || []).forEach((row) => {
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
      surfaceArea_cm2,
      calcWeightFromThickness,
      calcThicknessFromWeight,
    };
  }, [scenarioEngineering, density, product?.topDiameterMm, product?.productWeightG]);

  useEffect(() => {
    const nextGrossWidth = sheetDerived.grossWidth
      ? String(sheetDerived.grossWidth.toFixed(2))
      : "";
    const nextTrim = sheetDerived.trimLossPct
      ? String(sheetDerived.trimLossPct.toFixed(2))
      : "";

    if (
      String(scenarioEngineering?.sheetSpecs?.grossWidth_mm || "") !== nextGrossWidth ||
      String(scenarioEngineering?.sheetSpecs?.trimLossPct || "") !== nextTrim
    ) {
      updateSection("sheetSpecs", {
        grossWidth_mm: nextGrossWidth,
        trimLossPct: nextTrim,
      });
    }
  }, [sheetDerived.grossWidth, sheetDerived.trimLossPct]);

  useEffect(() => {
    if (!scenarioEngineering?.sheetPackaging?.rollWeight_kg) {
      const autoWeight =
        n(scenarioEngineering?.sheetSpecs?.rollTargetWeight_kg) || sheetDerived.calcRollWeight;

      if (autoWeight) {
        updateSection("sheetPackaging", {
          rollWeight_kg: String(autoWeight.toFixed(2)),
        });
      }
    }
  }, [
    scenarioEngineering?.sheetPackaging?.rollWeight_kg,
    scenarioEngineering?.sheetSpecs?.rollTargetWeight_kg,
    sheetDerived.calcRollWeight,
  ]);

  const extrusionDerived = useMemo(() => {
    const opt = OPT_SPEED_MAP[baseMaterial] || { A: 0, B: 0 };

    const maxA = n(opt.A);
    const maxB = n(opt.B);
    const totalMax = maxA + maxB;

    const layerAPct = n(scenarioEngineering?.materialSheet?.layerAPct);
    const layerAFrac = layerAPct / 100;
    const layerBFrac = 1 - layerAFrac;

    const optimumLayerAFrac = OPT_LAYER_A_MAP[baseMaterial] || 0;
    const optimumLayerAPct = optimumLayerAFrac * 100;

    const speedA = n(scenarioEngineering?.extrusion?.grossSpeedA_kg_hr);
    const speedB = n(scenarioEngineering?.extrusion?.grossSpeedB_kg_hr);
    const totalGross = speedA + speedB;

    const efficiency = n(scenarioEngineering?.extrusion?.efficiencyPct) / 100;
    const scrapRate = n(scenarioEngineering?.extrusion?.scrapRatePct) / 100;

    const grossWidth =
      n(scenarioEngineering?.sheetSpecs?.grossWidth_mm) || sheetDerived.grossWidth;
    const netWidth = n(scenarioEngineering?.sheetSpecs?.netWidth_mm);

    const grossVsOptimalPct = totalMax > 0 ? (totalGross / totalMax) * 100 : 0;

    const actualLayerAFromSpeedsPct =
      totalGross > 0 ? (speedA / totalGross) * 100 : 0;

    const layerMismatchPct =
      totalGross > 0 ? actualLayerAFromSpeedsPct - layerAPct : 0;

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

    const layerADeviationFromOptimumPct = layerAPct - optimumLayerAPct;

    const isLayerAOptimum = Math.abs(layerADeviationFromOptimumPct) < 0.01;
    const isSpeedRatioMatchingLayer =
      totalGross <= 0 ? true : Math.abs(layerMismatchPct) < 0.5;

    let warningMessage = "";
    if (!isLayerAOptimum) {
      warningMessage = `Layer A % is not optimum for ${baseMaterial}. Recommended Layer A is ${optimumLayerAPct.toFixed(
        3
      )}%.`;
    } else if (!isSpeedRatioMatchingLayer) {
      warningMessage = `Entered extruder speeds do not match the selected Layer A %. Actual Layer A from speeds is ${actualLayerAFromSpeedsPct.toFixed(
        3
      )}%.`;
    } else if (limitingExtruder) {
      warningMessage = `At Layer A = ${layerAPct.toFixed(
        3
      )}%, Extruder ${limitingExtruder} is the limiting extruder. Recommended gross speeds are A = ${recommendedA.toFixed(
        2
      )} kg/hr and B = ${recommendedB.toFixed(2)} kg/hr.`;
    }

    return {
      opt,
      totalMax,
      optimumLayerAPct,
      actualLayerAFromSpeedsPct,
      recommendedA,
      recommendedB,
      limitingExtruder,
      totalGross,
      grossVsOptimalPct,
      netSpeed,
      netVsOptimalPct,
      tph,
      tonsPerShift12h,
      tonsPerDay24h,
      tonsPerWeek,
      tonsPerMonth,
      tonsPerYear330d,
      warningMessage,
      isLayerAOptimum,
      isSpeedRatioMatchingLayer,
    };
  }, [scenarioEngineering, sheetDerived.grossWidth, baseMaterial]);

  useEffect(() => {
    const patch = {
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
      tonsPerHour: extrusionDerived.tph
        ? String(extrusionDerived.tph.toFixed(3))
        : "",
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
    };

    const prevExtrusion = scenarioEngineering?.extrusion || {};
    const changed = Object.keys(patch).some(
      (key) => String(prevExtrusion[key] || "") !== String(patch[key] || "")
    );

    if (changed) {
      updateSection("extrusion", patch);
    }
  }, [extrusionDerived]);

  const thermoDerived = useMemo(() => {
    const cavities = n(scenarioEngineering?.thermo?.cavities);
    const cpm = n(scenarioEngineering?.thermo?.cpm);
    const eff = n(scenarioEngineering?.thermo?.efficiencyPct) / 100;
    const unitWeight_g = n(scenarioEngineering?.thermo?.unitWeight_g);
    const sheetUtilizationPct = n(scenarioEngineering?.thermo?.sheetUtilizationPct);
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
  }, [scenarioEngineering?.thermo]);

  useEffect(() => {
    const patch = {
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
    };

    const prevThermo = scenarioEngineering?.thermo || {};
    const changed = Object.keys(patch).some(
      (key) => String(prevThermo[key] || "") !== String(patch[key] || "")
    );

    if (changed) {
      updateSection("thermo", patch);
    }
  }, [thermoDerived]);

  const sheetPackagingSentence = useMemo(() => {
    const coreSize =
      scenarioEngineering?.sheetPackaging?.coreSize ||
      scenarioEngineering?.sheetSpecs?.coreSize ||
      "6 inch";
    const rollDia =
      n(scenarioEngineering?.sheetSpecs?.rollDiameter_mm) || sheetDerived.calcRollDiameter;
    const rollW =
      n(scenarioEngineering?.sheetPackaging?.rollWeight_kg) ||
      n(scenarioEngineering?.sheetSpecs?.rollTargetWeight_kg) ||
      sheetDerived.calcRollWeight;
    const rollsPerPallet = n(scenarioEngineering?.sheetPackaging?.rollsPerPallet);
    const separators = n(scenarioEngineering?.sheetPackaging?.separatorsPerPallet);
    const strap = n(scenarioEngineering?.sheetPackaging?.strapLength_m);
    const stretch = n(scenarioEngineering?.sheetPackaging?.stretchKgPerPallet);

    if (!rollW && !rollsPerPallet) return "";

    return `Use ${coreSize} core and make the roll diameter ${fmt(
      rollDia
    )} mm at about ${fmt(rollW)} kg per roll. Put ${fmt(
      rollsPerPallet,
      0
    )} rolls on a pallet with ${fmt(
      separators,
      0
    )} separators, use ${fmt(strap)} m of strap and full stretch wrap the pallet with ${fmt(
      stretch
    )} kg of stretch film.`;
  }, [scenarioEngineering, sheetDerived]);

  useEffect(() => {
    if (
      sheetPackagingSentence !==
      (scenarioEngineering?.sheetPackaging?.instructionText || "")
    ) {
      updateSection("sheetPackaging", { instructionText: sheetPackagingSentence });
    }
  }, [sheetPackagingSentence]);

  const thermoPackagingDerived = useMemo(() => {
    const pcsPerStack = n(scenarioEngineering?.packaging?.primary?.pcsPerStack);
    const stacksPerPrimary = n(scenarioEngineering?.packaging?.primary?.stacksPerPrimary);
    const primariesPerSecondary = n(
      scenarioEngineering?.packaging?.secondary?.primariesPerSecondary
    );
    const boxesPerPallet = n(scenarioEngineering?.packaging?.pallet?.boxesPerPallet);

    const pcsPerPrimary = pcsPerStack * stacksPerPrimary;
    const pcsPerCarton = pcsPerPrimary * primariesPerSecondary;
    const pcsPerPallet =
      scenarioEngineering?.packaging?.pallet?.palletSelected === "Yes"
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
      )} primary packs per carton, making ${fmt(pcsPerCarton, 0)} pcs per carton.`;
      if (scenarioEngineering?.packaging?.pallet?.palletSelected === "Yes") {
        instructionText += ` Load ${fmt(boxesPerPallet, 0)} cartons per pallet.`;
      }
    }

    return {
      pcsPerPrimary,
      pcsPerCarton,
      pcsPerPallet,
      instructionText,
    };
  }, [scenarioEngineering?.packaging]);

  useEffect(() => {
    if (
      thermoPackagingDerived.instructionText !==
      (scenarioEngineering?.packaging?.instructionText || "")
    ) {
      updateSection("packaging", {
        instructionText: thermoPackagingDerived.instructionText,
      });
    }
  }, [thermoPackagingDerived.instructionText]);

  const freightCalc = useMemo(() => {
    const unitWeightKg =
      (n(scenarioEngineering?.thermo?.unitWeight_g) || n(product?.productWeightG)) / 1000;

    const cartonLengthMm = n(scenarioEngineering?.packaging?.secondary?.secondaryLength_mm);
    const cartonWidthMm = n(scenarioEngineering?.packaging?.secondary?.secondaryWidth_mm);
    const cartonHeightMm = n(scenarioEngineering?.packaging?.secondary?.secondaryHeight_mm);

    const cartonVolume_m3 =
      cartonLengthMm > 0 && cartonWidthMm > 0 && cartonHeightMm > 0
        ? (cartonLengthMm * cartonWidthMm * cartonHeightMm) / 1_000_000_000
        : 0;

    const pcsPerCarton = n(thermoPackagingDerived.pcsPerCarton);
    const cartonWeight_kg =
      !isSheet && pcsPerCarton > 0 && unitWeightKg > 0 ? pcsPerCarton * unitWeightKg : 0;

    const palletLength_mm = isSheet
      ? n(scenarioEngineering?.sheetPackaging?.palletLength_mm)
      : n(scenarioEngineering?.packaging?.pallet?.palletLength_mm);

    const palletWidth_mm = isSheet
      ? n(scenarioEngineering?.sheetPackaging?.palletWidth_mm)
      : n(scenarioEngineering?.packaging?.pallet?.palletWidth_mm);

    const palletHeight_mm = isSheet
      ? n(scenarioEngineering?.sheetPackaging?.palletHeight_mm)
      : n(scenarioEngineering?.packaging?.pallet?.palletHeight_mm);

    const palletVolume_m3 =
      palletLength_mm > 0 && palletWidth_mm > 0 && palletHeight_mm > 0
        ? (palletLength_mm * palletWidth_mm * palletHeight_mm) / 1_000_000_000
        : 0;

    let palletWeight_kg = 0;
    let pcsPerPallet = 0;
    let cartonsPerPallet = 0;
    let rollsPerPallet = 0;

    if (isSheet) {
      rollsPerPallet = n(scenarioEngineering?.sheetPackaging?.rollsPerPallet);
      const rollWeight =
        n(scenarioEngineering?.sheetPackaging?.rollWeight_kg) ||
        n(scenarioEngineering?.sheetSpecs?.rollTargetWeight_kg) ||
        sheetDerived.calcRollWeight;
      palletWeight_kg = rollsPerPallet * rollWeight;
    } else {
      cartonsPerPallet = n(scenarioEngineering?.packaging?.pallet?.boxesPerPallet);
      pcsPerPallet = n(thermoPackagingDerived.pcsPerPallet);
      palletWeight_kg = cartonsPerPallet * cartonWeight_kg;
    }

    const palletType = isSheet
      ? scenarioEngineering?.sheetPackaging?.palletType
      : scenarioEngineering?.packaging?.pallet?.palletType;

    const palletLookup =
      palletType === "EURO"
        ? PALLETS_PER_CONTAINER.EURO
        : palletType === "UK"
        ? PALLETS_PER_CONTAINER.UK
        : null;

    const makeContainerRow = (containerName) => {
      const containerVolume = CONTAINER_SPECS[containerName]?.volume_m3 || 0;
      const pallets = palletLookup ? palletLookup[containerName] || 0 : 0;

      if (isSheet) {
        return {
          pallets,
          cartons: 0,
          cartonsRange: "",
          pcs: 0,
          rolls: pallets * rollsPerPallet,
          netWeight_kg: pallets * palletWeight_kg,
        };
      }

      const palletSelected = scenarioEngineering?.packaging?.pallet?.palletSelected === "Yes";

      if (palletSelected) {
        return {
          pallets,
          cartons: pallets * cartonsPerPallet,
          cartonsRange: "",
          pcs: pallets * pcsPerPallet,
          rolls: 0,
          netWeight_kg: pallets * palletWeight_kg,
        };
      }

      const maxCartonsByVolume =
        cartonVolume_m3 > 0 ? Math.floor(containerVolume / cartonVolume_m3) : 0;

      const minCartonsByVolume =
        maxCartonsByVolume > 0 ? Math.floor(maxCartonsByVolume * 0.9) : 0;

      const avgCartons =
        maxCartonsByVolume > 0
          ? Math.floor((minCartonsByVolume + maxCartonsByVolume) / 2)
          : 0;

      return {
        pallets: 0,
        cartons: avgCartons,
        cartonsRange:
          maxCartonsByVolume > 0 ? `${minCartonsByVolume} - ${maxCartonsByVolume}` : "",
        pcs: avgCartons * pcsPerCarton,
        rolls: 0,
        netWeight_kg: avgCartons * cartonWeight_kg,
      };
    };

    const buildTruckRow = (palletsField, cartonsField) => {
      const pallets = n(palletsField);
      const cartons = n(cartonsField);

      if (isSheet) {
        const rolls = pallets * rollsPerPallet;
        return {
          pallets,
          cartons: 0,
          pcs: 0,
          rolls,
          netWeight_kg:
            rolls *
            (n(scenarioEngineering?.sheetPackaging?.rollWeight_kg) ||
              n(scenarioEngineering?.sheetSpecs?.rollTargetWeight_kg) ||
              sheetDerived.calcRollWeight),
        };
      }

      const effectiveCartons =
        pallets > 0 && cartonsPerPallet > 0 ? pallets * cartonsPerPallet : cartons;

      return {
        pallets,
        cartons: effectiveCartons,
        pcs: effectiveCartons * pcsPerCarton,
        rolls: 0,
        netWeight_kg: effectiveCartons * cartonWeight_kg,
      };
    };

    const c20 = makeContainerRow("20ft Dry");
    const c40 = makeContainerRow("40ft Dry");
    const c40hc = makeContainerRow("40ft High Cube");

    return {
      cartonVolume_m3,
      cartonWeight_kg,
      palletLength_mm,
      palletWidth_mm,
      palletHeight_mm,
      palletVolume_m3,
      palletWeight_kg,
      c20,
      c40,
      c40hc,
      smallTruck: buildTruckRow(
        scenarioEngineering?.freight?.smallTruck_pallets,
        scenarioEngineering?.freight?.smallTruck_cartons
      ),
      mediumTruck: buildTruckRow(
        scenarioEngineering?.freight?.mediumTruck_pallets,
        scenarioEngineering?.freight?.mediumTruck_cartons
      ),
      largeTruck: buildTruckRow(
        scenarioEngineering?.freight?.largeTruck_pallets,
        scenarioEngineering?.freight?.largeTruck_cartons
      ),
      doubleTrailer: buildTruckRow(
        scenarioEngineering?.freight?.doubleTrailer_pallets,
        scenarioEngineering?.freight?.doubleTrailer_cartons
      ),
    };
  }, [scenarioEngineering, product?.productWeightG, thermoPackagingDerived, isSheet, sheetDerived.calcRollWeight]);

  useEffect(() => {
    const patch = {
      cartonVolume_m3: freightCalc.cartonVolume_m3
        ? String(freightCalc.cartonVolume_m3.toFixed(6))
        : "",
      cartonWeight_kg: freightCalc.cartonWeight_kg
        ? String(freightCalc.cartonWeight_kg.toFixed(3))
        : "",
      palletLength_mm: freightCalc.palletLength_mm ? String(freightCalc.palletLength_mm) : "",
      palletWidth_mm: freightCalc.palletWidth_mm ? String(freightCalc.palletWidth_mm) : "",
      palletHeight_mm: freightCalc.palletHeight_mm ? String(freightCalc.palletHeight_mm) : "",
      palletVolume_m3: freightCalc.palletVolume_m3
        ? String(freightCalc.palletVolume_m3.toFixed(6))
        : "",
      palletWeight_kg: freightCalc.palletWeight_kg
        ? String(freightCalc.palletWeight_kg.toFixed(3))
        : "",

      container20_pallets: freightCalc.c20.pallets ? String(freightCalc.c20.pallets) : "",
      container20_cartonsRange: freightCalc.c20.cartonsRange || "",
      container20_cartons: freightCalc.c20.cartons ? String(freightCalc.c20.cartons) : "",
      container20_pcs: freightCalc.c20.pcs ? String(freightCalc.c20.pcs) : "",
      container20_rolls: freightCalc.c20.rolls ? String(freightCalc.c20.rolls) : "",
      container20_netWeight_kg: freightCalc.c20.netWeight_kg
        ? String(freightCalc.c20.netWeight_kg.toFixed(2))
        : "",

      container40_pallets: freightCalc.c40.pallets ? String(freightCalc.c40.pallets) : "",
      container40_cartonsRange: freightCalc.c40.cartonsRange || "",
      container40_cartons: freightCalc.c40.cartons ? String(freightCalc.c40.cartons) : "",
      container40_pcs: freightCalc.c40.pcs ? String(freightCalc.c40.pcs) : "",
      container40_rolls: freightCalc.c40.rolls ? String(freightCalc.c40.rolls) : "",
      container40_netWeight_kg: freightCalc.c40.netWeight_kg
        ? String(freightCalc.c40.netWeight_kg.toFixed(2))
        : "",

      container40hc_pallets: freightCalc.c40hc.pallets
        ? String(freightCalc.c40hc.pallets)
        : "",
      container40hc_cartonsRange: freightCalc.c40hc.cartonsRange || "",
      container40hc_cartons: freightCalc.c40hc.cartons
        ? String(freightCalc.c40hc.cartons)
        : "",
      container40hc_pcs: freightCalc.c40hc.pcs ? String(freightCalc.c40hc.pcs) : "",
      container40hc_rolls: freightCalc.c40hc.rolls ? String(freightCalc.c40hc.rolls) : "",
      container40hc_netWeight_kg: freightCalc.c40hc.netWeight_kg
        ? String(freightCalc.c40hc.netWeight_kg.toFixed(2))
        : "",

      smallTruck_pcs: freightCalc.smallTruck.pcs ? String(freightCalc.smallTruck.pcs) : "",
      smallTruck_rolls: freightCalc.smallTruck.rolls ? String(freightCalc.smallTruck.rolls) : "",
      smallTruck_netWeight_kg: freightCalc.smallTruck.netWeight_kg
        ? String(freightCalc.smallTruck.netWeight_kg.toFixed(2))
        : "",

      mediumTruck_pcs: freightCalc.mediumTruck.pcs ? String(freightCalc.mediumTruck.pcs) : "",
      mediumTruck_rolls: freightCalc.mediumTruck.rolls ? String(freightCalc.mediumTruck.rolls) : "",
      mediumTruck_netWeight_kg: freightCalc.mediumTruck.netWeight_kg
        ? String(freightCalc.mediumTruck.netWeight_kg.toFixed(2))
        : "",

      largeTruck_pcs: freightCalc.largeTruck.pcs ? String(freightCalc.largeTruck.pcs) : "",
      largeTruck_rolls: freightCalc.largeTruck.rolls ? String(freightCalc.largeTruck.rolls) : "",
      largeTruck_netWeight_kg: freightCalc.largeTruck.netWeight_kg
        ? String(freightCalc.largeTruck.netWeight_kg.toFixed(2))
        : "",

      doubleTrailer_pcs: freightCalc.doubleTrailer.pcs
        ? String(freightCalc.doubleTrailer.pcs)
        : "",
      doubleTrailer_rolls: freightCalc.doubleTrailer.rolls
        ? String(freightCalc.doubleTrailer.rolls)
        : "",
      doubleTrailer_netWeight_kg: freightCalc.doubleTrailer.netWeight_kg
        ? String(freightCalc.doubleTrailer.netWeight_kg.toFixed(2))
        : "",
    };

    const prevFreight = scenarioEngineering?.freight || {};
    const changed = Object.keys(patch).some(
      (key) => String(prevFreight[key] || "") !== String(patch[key] || "")
    );

    if (changed) {
      updateSection("freight", patch);
    }
  }, [freightCalc]);

  useEffect(() => {
    const diffs = [];

    TRACKED_FIELDS.forEach((item) => {
      const scenarioValue = getAtPath(scenarioEngineering, item.path);
      const engineeringValue = getAtPath(engineeringReviewData, item.path);

      if (!valuesEqual(scenarioValue, engineeringValue)) {
        diffs.push({
          section: item.section,
          label: item.label,
          path: item.path,
          engineeringValue: formatRefValue(engineeringValue),
          scenarioValue: formatRefValue(scenarioValue),
        });
      }
    });

    const compareMaterialArray = (sideLabel, sideKey) => {
      const scenarioRows = scenarioEngineering?.materialSheet?.[sideKey] || [];
      const engineeringRows = engineeringReviewData?.materialSheet?.[sideKey] || [];
      const maxLen = Math.max(scenarioRows.length, engineeringRows.length);

      for (let i = 0; i < maxLen; i += 1) {
        const sRow = scenarioRows[i] || {};
        const eRow = engineeringRows[i] || {};

        if (!valuesEqual(sRow.name, eRow.name)) {
          diffs.push({
            section: "Sheet BOM",
            label: `${sideLabel} Material ${i + 1} Name`,
            path: `materialSheet.${sideKey}[${i}].name`,
            engineeringValue: formatRefValue(eRow.name),
            scenarioValue: formatRefValue(sRow.name),
          });
        }

        if (!valuesEqual(sRow.pct, eRow.pct)) {
          diffs.push({
            section: "Sheet BOM",
            label: `${sideLabel} Material ${i + 1} %`,
            path: `materialSheet.${sideKey}[${i}].pct`,
            engineeringValue: formatRefValue(eRow.pct),
            scenarioValue: formatRefValue(sRow.pct),
          });
        }
      }
    };

    compareMaterialArray("Layer A", "layerA");
    compareMaterialArray("Layer B", "layerB");

    const changedSections = [...new Set(diffs.map((x) => x.section))];

    const autoSummaryText =
      diffs.length === 0
        ? "No pricing engineering assumptions were changed versus Engineering Review."
        : `This pricing scenario contains ${diffs.length} engineering override${
            diffs.length === 1 ? "" : "s"
          } across ${changedSections.length} section${
            changedSections.length === 1 ? "" : "s"
          }: ${changedSections.join(", ")}.`;

    setEngineeringChangeSummary({
      changedFieldsCount: diffs.length,
      changedSections,
      changedFields: diffs,
      autoSummaryText,
    });
  }, [scenarioEngineering, engineeringReviewData, setEngineeringChangeSummary]);

  const layerATotalPct = (scenarioEngineering?.materialSheet?.layerA || []).reduce(
    (sum, row) => sum + n(row.pct),
    0
  );

  const layerBTotalPct = (scenarioEngineering?.materialSheet?.layerB || []).reduce(
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
    (scenarioEngineering?.materialSheet?.coatingUsed === "Yes"
      ? n(sheetDerived.coatingKgPerTon)
      : 0);

  const bomPctIsValid = Math.abs(bomTotalPct - 100) < 0.01;
  const bomKgIsValid = Math.abs(bomTotalKgPerTon - 1000) < 0.01;

  const totalOptGross =
    (OPT_SPEED_MAP[baseMaterial]?.A || 0) + (OPT_SPEED_MAP[baseMaterial]?.B || 0);

  const recommendedLayerAPct = balancedExtrusion.recommendedLayerA || 0;
  const enteredLayerAPct = n(scenarioEngineering?.materialSheet?.layerAPct);

  const layerAIsNonOptimal =
    enteredLayerAPct > 0 && Math.abs(enteredLayerAPct - recommendedLayerAPct) > 0.01;

  const enteredSpeedA = n(scenarioEngineering?.extrusion?.grossSpeedA_kg_hr);
  const enteredSpeedB = n(scenarioEngineering?.extrusion?.grossSpeedB_kg_hr);
  const recommendedSpeedA = n(balancedExtrusion.speedA);
  const recommendedSpeedB = n(balancedExtrusion.speedB);

  const extrusionSpeedMismatch =
    Math.abs(enteredSpeedA - recommendedSpeedA) > 0.5 ||
    Math.abs(enteredSpeedB - recommendedSpeedB) > 0.5;

  const requestDecorationType =
    product?.productType === "Sheet Roll"
      ? "No decoration"
      : requestData?.decoration?.decorationType || "No decoration";

  const hasRequestDecoration =
    requestDecorationType && requestDecorationType !== "No decoration";

  const showDecorationSection =
    !isSheet && (hasRequestDecoration || scenarioEngineering?.decorationEngineering?.enabled);

  return (
    <div className="space-y-6">
      <Section title="Scenario Engineering Override Summary">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border bg-gray-50 p-4">
            <div className="text-xs text-gray-500">Changed Fields</div>
            <div className="text-2xl font-semibold">
              {engineeringChangeSummary?.changedFieldsCount || 0}
            </div>
          </div>

          <div className="rounded-xl border bg-gray-50 p-4 md:col-span-2">
            <div className="text-xs text-gray-500 mb-1">Auto Summary</div>
            <div className="text-sm text-gray-700">
              {engineeringChangeSummary?.autoSummaryText || "—"}
            </div>
          </div>
        </div>

        {engineeringChangeSummary?.changedFields?.length > 0 ? (
          <div className="rounded-xl border bg-white overflow-hidden">
            <div className="px-4 py-3 border-b font-medium text-sm">Changed Fields vs Engineering Review</div>
            <div className="max-h-72 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="p-3">Section</th>
                    <th className="p-3">Field</th>
                    <th className="p-3">Engineering Review</th>
                    <th className="p-3">Pricing Scenario</th>
                  </tr>
                </thead>
                <tbody>
                  {engineeringChangeSummary.changedFields.map((item, idx) => (
                    <tr key={`${item.path}-${idx}`} className="border-t">
                      <td className="p-3">{item.section}</td>
                      <td className="p-3">{item.label}</td>
                      <td className="p-3 text-red-600">{item.engineeringValue}</td>
                      <td className="p-3">{item.scenarioValue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </Section>

      <div className="bg-white rounded-2xl shadow p-5 space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          {image ? (
            <img
              src={image}
              alt="Product thumbnail"
              className="w-20 h-20 rounded-xl border object-cover bg-white"
            />
          ) : (
            <div className="w-20 h-20 rounded-xl border bg-gray-100 flex items-center justify-center text-xs text-gray-500">
              No image
            </div>
          )}

          <div className="flex-1 min-w-[220px]">
            <div className="text-xs uppercase tracking-wide text-gray-500">Project</div>
            <div className="text-xl font-semibold">{project.projectName || "—"}</div>
            <div className="text-sm text-blue-600 font-medium">
              {isSheet ? "Sheet Product Flow" : "Thermoformed Product Flow"}
            </div>
            <div className="text-sm text-gray-500">
              {product.productType || "—"} • {requestedBaseMaterial || "—"} •{" "}
              {primaryCustomer.customerName || "—"}
            </div>
          </div>
        </div>
      </div>

      <Section title="1. Material Structure and Sheet Roll">
        <div className="space-y-5">
          <div className="rounded-xl border p-4 space-y-4">
            <div className="font-medium">Base Material</div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <Field label="Base Material">
                <SelectField
                  value={scenarioEngineering?.materialSheet?.baseMaterial}
                  onChange={(v) => {
                    const opt = OPT_SPEED_MAP[v] || { A: "", B: "" };
                    updateSection("materialSheet", {
                      baseMaterial: v,
                      density: DENSITY_MAP[v]
                        ? String(DENSITY_MAP[v])
                        : scenarioEngineering?.materialSheet?.density || "",
                    });
                    updateSection("extrusion", {
                      grossSpeedA_kg_hr: opt.A
                        ? String(opt.A)
                        : scenarioEngineering?.extrusion?.grossSpeedA_kg_hr || "",
                      grossSpeedB_kg_hr: opt.B
                        ? String(opt.B)
                        : scenarioEngineering?.extrusion?.grossSpeedB_kg_hr || "",
                    });
                  }}
                  options={["PET", "PP", "PS", "Other"]}
                />
                <RefHints
                  engineeringValue={engineeringReviewData?.materialSheet?.baseMaterial}
                  requestValue={requestedBaseMaterial}
                  currentValue={scenarioEngineering?.materialSheet?.baseMaterial}
                />
              </Field>

              <Field label="Density (g/cm³)">
                <Input
                  value={scenarioEngineering?.materialSheet?.density}
                  onChange={(v) => updateSection("materialSheet", { density: v })}
                />
                <RefHints
                  engineeringValue={engineeringReviewData?.materialSheet?.density}
                  requestValue={DENSITY_MAP[requestedBaseMaterial] || ""}
                  currentValue={scenarioEngineering?.materialSheet?.density}
                />
              </Field>

              <Field label="Structure">
                <SelectField
                  value={scenarioEngineering?.materialSheet?.structure}
                  onChange={(v) => updateSection("materialSheet", { structure: v })}
                  options={["AB", "ABA"]}
                />
                <RefHints
                  engineeringValue={engineeringReviewData?.materialSheet?.structure}
                  requestValue="AB"
                  currentValue={scenarioEngineering?.materialSheet?.structure}
                />
              </Field>

              <Field label="Layer A %">
                <Input
                  value={scenarioEngineering?.materialSheet?.layerAPct}
                  onChange={(v) => updateSection("materialSheet", { layerAPct: v })}
                />
                <RefHints
                  engineeringValue={engineeringReviewData?.materialSheet?.layerAPct}
                  requestValue=""
                  currentValue={scenarioEngineering?.materialSheet?.layerAPct}
                />

                {(n(scenarioEngineering?.materialSheet?.layerAPct) < 0 ||
                  n(scenarioEngineering?.materialSheet?.layerAPct) > 100) && (
                  <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-sm mt-2">
                    Layer A % must be between 0 and 100.
                  </div>
                )}

                {recommendedLayerAPct > 0 && (
                  <div
                    className={`mt-2 rounded-lg border p-3 text-sm ${
                      layerAIsNonOptimal
                        ? "border-yellow-200 bg-yellow-50 text-yellow-700"
                        : "border-green-200 bg-green-50 text-green-700"
                    }`}
                  >
                    Recommended optimum Layer A for {baseMaterial || "selected material"} is{" "}
                    {fmt(recommendedLayerAPct, 2)}%.
                    {layerAIsNonOptimal
                      ? " Current value will not give optimum matched extruder speeds."
                      : " Current value gives optimum matched extruder speeds."}
                  </div>
                )}
              </Field>

              <Field label="Process Waste %">
                <Input
                  value={scenarioEngineering?.materialSheet?.processWastePct}
                  onChange={(v) => updateSection("materialSheet", { processWastePct: v })}
                />
                <RefHints
                  engineeringValue={engineeringReviewData?.materialSheet?.processWastePct}
                  requestValue=""
                  currentValue={scenarioEngineering?.materialSheet?.processWastePct}
                />
              </Field>

              <Field label="Coating Layer Used">
                <SelectField
                  value={scenarioEngineering?.materialSheet?.coatingUsed}
                  onChange={(v) => updateSection("materialSheet", { coatingUsed: v })}
                  options={["Yes", "No"]}
                />
                <RefHints
                  engineeringValue={engineeringReviewData?.materialSheet?.coatingUsed}
                  requestValue="No"
                  currentValue={scenarioEngineering?.materialSheet?.coatingUsed}
                />
              </Field>
            </div>
          </div>

          {scenarioEngineering?.materialSheet?.coatingUsed === "Yes" && (
            <div className="rounded-xl border p-4 space-y-4">
              <div className="font-medium">Coating</div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Coating Name">
                  <Input
                    value={scenarioEngineering?.materialSheet?.coatingName}
                    onChange={(v) => updateSection("materialSheet", { coatingName: v })}
                  />
                  <RefHints
                    engineeringValue={engineeringReviewData?.materialSheet?.coatingName}
                    requestValue=""
                    currentValue={scenarioEngineering?.materialSheet?.coatingName}
                  />
                </Field>

                <Field label="Coating Weight (g/m²)">
                  <Input
                    value={scenarioEngineering?.materialSheet?.coatingWeight_g_m2}
                    onChange={(v) =>
                      updateSection("materialSheet", { coatingWeight_g_m2: v })
                    }
                  />
                  <RefHints
                    engineeringValue={engineeringReviewData?.materialSheet?.coatingWeight_g_m2}
                    requestValue=""
                    currentValue={scenarioEngineering?.materialSheet?.coatingWeight_g_m2}
                  />
                </Field>

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
                  {scenarioEngineering?.materialSheet?.coatingUsed === "Yes"
                    ? `${fmt(sheetDerived.coatingShare * 100, 2)}%`
                    : "0.00%"}{" "}
                  —{" "}
                  {scenarioEngineering?.materialSheet?.coatingUsed === "Yes"
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

                    {scenarioEngineering?.materialSheet?.coatingUsed === "Yes" && (
                      <tr className="border-t bg-yellow-50">
                        <td className="p-3">
                          {scenarioEngineering?.materialSheet?.coatingName || "Coating"}
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
                    checked={scenarioEngineering?.materialSheet?.syncLayerBWithA}
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
                  {(scenarioEngineering?.materialSheet?.layerA || []).map((row, idx) => {
                    const refRow =
                      engineeringReviewData?.materialSheet?.layerA?.[idx] || {};
                    return (
                      <div key={row.id || idx} className="grid grid-cols-12 gap-2">
                        <div className="col-span-7">
                          <Input
                            value={row.name}
                            onChange={(v) =>
                              updateMaterialRow("layerA", row.id, { name: v })
                            }
                            placeholder="Material name"
                          />
                          <div className="mt-1 text-[11px] text-gray-400">
                            Engineering Review: {formatRefValue(refRow.name)}
                          </div>
                        </div>

                        <div className="col-span-4">
                          <Input
                            value={row.pct}
                            onChange={(v) =>
                              updateMaterialRow("layerA", row.id, { pct: v })
                            }
                            placeholder="% in layer"
                          />
                          <div
                            className={`mt-1 text-[11px] ${
                              !valuesEqual(row.pct, refRow.pct)
                                ? "text-red-600 font-medium"
                                : "text-gray-400"
                            }`}
                          >
                            Engineering Review: {formatRefValue(refRow.pct)}
                          </div>
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
                    );
                  })}

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
                  {(scenarioEngineering?.materialSheet?.layerB || []).map((row, idx) => {
                    const refRow =
                      engineeringReviewData?.materialSheet?.layerB?.[idx] || {};
                    return (
                      <div key={row.id || idx} className="grid grid-cols-12 gap-2">
                        <div className="col-span-7">
                          <Input
                            value={row.name}
                            onChange={(v) =>
                              updateMaterialRow("layerB", row.id, { name: v })
                            }
                            placeholder="Material name"
                            disabled={scenarioEngineering?.materialSheet?.syncLayerBWithA}
                          />
                          <div className="mt-1 text-[11px] text-gray-400">
                            Engineering Review: {formatRefValue(refRow.name)}
                          </div>
                        </div>

                        <div className="col-span-4">
                          <Input
                            value={row.pct}
                            onChange={(v) =>
                              updateMaterialRow("layerB", row.id, { pct: v })
                            }
                            placeholder="% in layer"
                            disabled={scenarioEngineering?.materialSheet?.syncLayerBWithA}
                          />
                          <div
                            className={`mt-1 text-[11px] ${
                              !valuesEqual(row.pct, refRow.pct)
                                ? "text-red-600 font-medium"
                                : "text-gray-400"
                            }`}
                          >
                            Engineering Review: {formatRefValue(refRow.pct)}
                          </div>
                        </div>

                        <div className="col-span-1">
                          <button
                            className="w-full border rounded-lg p-2"
                            onClick={() => removeMaterialRow("layerB", row.id)}
                            disabled={scenarioEngineering?.materialSheet?.syncLayerBWithA}
                            type="button"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {!scenarioEngineering?.materialSheet?.syncLayerBWithA && (
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
              <Field label="Net Width (mm)">
                <Input
                  value={scenarioEngineering?.sheetSpecs?.netWidth_mm}
                  onChange={(v) => updateSection("sheetSpecs", { netWidth_mm: v })}
                />
                <RefHints
                  engineeringValue={engineeringReviewData?.sheetSpecs?.netWidth_mm}
                  requestValue={requestValueOrBlank(product?.sheetWidthMm)}
                  currentValue={scenarioEngineering?.sheetSpecs?.netWidth_mm}
                />
              </Field>

              <Field label="Edge Trim / Side (mm)">
                <Input
                  value={scenarioEngineering?.sheetSpecs?.edgeTrimPerSide_mm}
                  onChange={(v) =>
                    updateSection("sheetSpecs", { edgeTrimPerSide_mm: v })
                  }
                />
                <RefHints
                  engineeringValue={engineeringReviewData?.sheetSpecs?.edgeTrimPerSide_mm}
                  requestValue=""
                  currentValue={scenarioEngineering?.sheetSpecs?.edgeTrimPerSide_mm}
                />
              </Field>

              <Field label="Gross Width (mm)">
                <Input
                  value={scenarioEngineering?.sheetSpecs?.grossWidth_mm || fmt(sheetDerived.grossWidth, 2)}
                  onChange={() => {}}
                  disabled
                />
              </Field>

              <Field label="Width + Tol (mm)">
                <Input
                  value={scenarioEngineering?.sheetSpecs?.widthTolPlus_mm}
                  onChange={(v) =>
                    updateSection("sheetSpecs", { widthTolPlus_mm: v })
                  }
                />
                <RefHints
                  engineeringValue={engineeringReviewData?.sheetSpecs?.widthTolPlus_mm}
                  requestValue=""
                  currentValue={scenarioEngineering?.sheetSpecs?.widthTolPlus_mm}
                />
              </Field>

              <Field label="Width - Tol (mm)">
                <Input
                  value={scenarioEngineering?.sheetSpecs?.widthTolMinus_mm}
                  onChange={(v) =>
                    updateSection("sheetSpecs", { widthTolMinus_mm: v })
                  }
                />
                <RefHints
                  engineeringValue={engineeringReviewData?.sheetSpecs?.widthTolMinus_mm}
                  requestValue=""
                  currentValue={scenarioEngineering?.sheetSpecs?.widthTolMinus_mm}
                />
              </Field>

              <Field label="1 - (Net/Gross) %">
                <Input
                  value={scenarioEngineering?.sheetSpecs?.trimLossPct || fmt(sheetDerived.trimLossPct, 2)}
                  onChange={() => {}}
                  disabled
                />
              </Field>
            </div>

            {sheetDerived.trimLossPct > 15 && (
              <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
                Width trim loss exceeds 15%.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Thickness (micron)">
                <Input
                  value={scenarioEngineering?.sheetSpecs?.thickness_mic}
                  onChange={(v) => updateSection("sheetSpecs", { thickness_mic: v })}
                />
                <RefHints
                  engineeringValue={engineeringReviewData?.sheetSpecs?.thickness_mic}
                  requestValue={requestValueOrBlank(product?.sheetThicknessMicron)}
                  currentValue={scenarioEngineering?.sheetSpecs?.thickness_mic}
                />
              </Field>

              <Field label="Thickness + Tol (micron)">
                <Input
                  value={scenarioEngineering?.sheetSpecs?.thicknessTolPlus_mic}
                  onChange={(v) =>
                    updateSection("sheetSpecs", { thicknessTolPlus_mic: v })
                  }
                />
                <RefHints
                  engineeringValue={engineeringReviewData?.sheetSpecs?.thicknessTolPlus_mic}
                  requestValue=""
                  currentValue={scenarioEngineering?.sheetSpecs?.thicknessTolPlus_mic}
                />
              </Field>

              <Field label="Thickness - Tol (micron)">
                <Input
                  value={scenarioEngineering?.sheetSpecs?.thicknessTolMinus_mic}
                  onChange={(v) =>
                    updateSection("sheetSpecs", { thicknessTolMinus_mic: v })
                  }
                />
                <RefHints
                  engineeringValue={engineeringReviewData?.sheetSpecs?.thicknessTolMinus_mic}
                  requestValue=""
                  currentValue={scenarioEngineering?.sheetSpecs?.thicknessTolMinus_mic}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <Field label="Core Type">
                <Input
                  value={scenarioEngineering?.sheetSpecs?.coreType}
                  onChange={(v) => updateSection("sheetSpecs", { coreType: v })}
                />
                <RefHints
                  engineeringValue={engineeringReviewData?.sheetSpecs?.coreType}
                  requestValue=""
                  currentValue={scenarioEngineering?.sheetSpecs?.coreType}
                />
              </Field>

              <Field label="Core Diameter">
                <SelectField
                  value={scenarioEngineering?.sheetSpecs?.coreSize}
                  onChange={(v) => updateSection("sheetSpecs", { coreSize: v })}
                  options={["3 inch", "6 inch", "8 inch"]}
                />
                <RefHints
                  engineeringValue={engineeringReviewData?.sheetSpecs?.coreSize}
                  requestValue=""
                  currentValue={scenarioEngineering?.sheetSpecs?.coreSize}
                />
              </Field>

              <Field label="Core Diameter (mm)">
                <Input
                  value={scenarioEngineering?.sheetSpecs?.coreDiameter_mm}
                  onChange={(v) =>
                    updateSection("sheetSpecs", { coreDiameter_mm: v })
                  }
                />
                <RefHints
                  engineeringValue={engineeringReviewData?.sheetSpecs?.coreDiameter_mm}
                  requestValue=""
                  currentValue={scenarioEngineering?.sheetSpecs?.coreDiameter_mm}
                />
              </Field>

              <Field label="Roll Diameter (mm)">
                <Input
                  value={scenarioEngineering?.sheetSpecs?.rollDiameter_mm}
                  onChange={(v) =>
                    updateSection("sheetSpecs", { rollDiameter_mm: v })
                  }
                />
                <RefHints
                  engineeringValue={engineeringReviewData?.sheetSpecs?.rollDiameter_mm}
                  requestValue=""
                  currentValue={scenarioEngineering?.sheetSpecs?.rollDiameter_mm}
                />
              </Field>

              <Field label="Roll Weight (kg)">
                <Input
                  value={scenarioEngineering?.sheetSpecs?.rollTargetWeight_kg}
                  onChange={(v) =>
                    updateSection("sheetSpecs", { rollTargetWeight_kg: v })
                  }
                />
                <RefHints
                  engineeringValue={engineeringReviewData?.sheetSpecs?.rollTargetWeight_kg}
                  requestValue={requestValueOrBlank(product?.rollWeightKg)}
                  currentValue={scenarioEngineering?.sheetSpecs?.rollTargetWeight_kg}
                />
              </Field>
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
                <Field label="Core Material">
                  <Input
                    value={scenarioEngineering?.sheetPackaging?.coreMaterial}
                    onChange={(v) =>
                      updateSection("sheetPackaging", { coreMaterial: v })
                    }
                  />
                  <RefHints
                    engineeringValue={engineeringReviewData?.sheetPackaging?.coreMaterial}
                    requestValue={requestValueOrBlank(product?.coreMaterial)}
                    currentValue={scenarioEngineering?.sheetPackaging?.coreMaterial}
                  />
                </Field>

                <Field label="Core Size">
                  <SelectField
                    value={scenarioEngineering?.sheetPackaging?.coreSize}
                    onChange={(v) => updateSection("sheetPackaging", { coreSize: v })}
                    options={["3 inch", "6 inch", "8 inch"]}
                  />
                  <RefHints
                    engineeringValue={engineeringReviewData?.sheetPackaging?.coreSize}
                    requestValue=""
                    currentValue={scenarioEngineering?.sheetPackaging?.coreSize}
                  />
                </Field>

                <Field label="Core Uses">
                  <Input
                    value={scenarioEngineering?.sheetPackaging?.coreUses}
                    onChange={(v) => updateSection("sheetPackaging", { coreUses: v })}
                  />
                  <RefHints
                    engineeringValue={engineeringReviewData?.sheetPackaging?.coreUses}
                    requestValue=""
                    currentValue={scenarioEngineering?.sheetPackaging?.coreUses}
                  />
                </Field>

                <Field label="Roll Weight (kg)">
                  <Input
                    value={
                      scenarioEngineering?.sheetPackaging?.rollWeight_kg ||
                      scenarioEngineering?.sheetSpecs?.rollTargetWeight_kg
                    }
                    onChange={(v) =>
                      updateSection("sheetPackaging", { rollWeight_kg: v })
                    }
                  />
                  <RefHints
                    engineeringValue={engineeringReviewData?.sheetPackaging?.rollWeight_kg}
                    requestValue={requestValueOrBlank(product?.rollWeightKg)}
                    currentValue={scenarioEngineering?.sheetPackaging?.rollWeight_kg}
                  />
                </Field>

                <Field label="Labels per Roll">
                  <Input
                    value={scenarioEngineering?.sheetPackaging?.labelsPerRoll}
                    onChange={(v) =>
                      updateSection("sheetPackaging", { labelsPerRoll: v })
                    }
                  />
                  <RefHints
                    engineeringValue={engineeringReviewData?.sheetPackaging?.labelsPerRoll}
                    requestValue=""
                    currentValue={scenarioEngineering?.sheetPackaging?.labelsPerRoll}
                  />
                </Field>

                <Field label="Labels per Pallet">
                  <Input
                    value={scenarioEngineering?.sheetPackaging?.labelsPerPallet}
                    onChange={(v) =>
                      updateSection("sheetPackaging", { labelsPerPallet: v })
                    }
                  />
                  <RefHints
                    engineeringValue={engineeringReviewData?.sheetPackaging?.labelsPerPallet}
                    requestValue=""
                    currentValue={scenarioEngineering?.sheetPackaging?.labelsPerPallet}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                <Field label="Pallet Type">
                  <SelectField
                    value={scenarioEngineering?.sheetPackaging?.palletType}
                    onChange={(v) => updateSection("sheetPackaging", { palletType: v })}
                    options={[
                      { value: "UK", label: "UK Standard Pallet" },
                      { value: "EURO", label: "EURO Pallet" },
                    ]}
                  />
                  <RefHints
                    engineeringValue={engineeringReviewData?.sheetPackaging?.palletType}
                    requestValue=""
                    currentValue={scenarioEngineering?.sheetPackaging?.palletType}
                  />
                </Field>

                <Field label="Pallet Uses">
                  <Input
                    value={scenarioEngineering?.sheetPackaging?.palletUses}
                    onChange={(v) => updateSection("sheetPackaging", { palletUses: v })}
                  />
                  <RefHints
                    engineeringValue={engineeringReviewData?.sheetPackaging?.palletUses}
                    requestValue=""
                    currentValue={scenarioEngineering?.sheetPackaging?.palletUses}
                  />
                </Field>

                <Field label="Pallet Length (mm)">
                  <Input
                    value={scenarioEngineering?.sheetPackaging?.palletLength_mm}
                    onChange={(v) =>
                      updateSection("sheetPackaging", { palletLength_mm: v })
                    }
                  />
                  <RefHints
                    engineeringValue={engineeringReviewData?.sheetPackaging?.palletLength_mm}
                    requestValue=""
                    currentValue={scenarioEngineering?.sheetPackaging?.palletLength_mm}
                  />
                </Field>

                <Field label="Pallet Width (mm)">
                  <Input
                    value={scenarioEngineering?.sheetPackaging?.palletWidth_mm}
                    onChange={(v) =>
                      updateSection("sheetPackaging", { palletWidth_mm: v })
                    }
                  />
                  <RefHints
                    engineeringValue={engineeringReviewData?.sheetPackaging?.palletWidth_mm}
                    requestValue=""
                    currentValue={scenarioEngineering?.sheetPackaging?.palletWidth_mm}
                  />
                </Field>

                <Field label="Pallet Height (mm)">
                  <Input
                    value={scenarioEngineering?.sheetPackaging?.palletHeight_mm}
                    onChange={(v) =>
                      updateSection("sheetPackaging", { palletHeight_mm: v })
                    }
                  />
                  <RefHints
                    engineeringValue={engineeringReviewData?.sheetPackaging?.palletHeight_mm}
                    requestValue=""
                    currentValue={scenarioEngineering?.sheetPackaging?.palletHeight_mm}
                  />
                </Field>

                <Field label="Rolls per Pallet">
                  <Input
                    value={scenarioEngineering?.sheetPackaging?.rollsPerPallet}
                    onChange={(v) =>
                      updateSection("sheetPackaging", { rollsPerPallet: v })
                    }
                  />
                  <RefHints
                    engineeringValue={engineeringReviewData?.sheetPackaging?.rollsPerPallet}
                    requestValue=""
                    currentValue={scenarioEngineering?.sheetPackaging?.rollsPerPallet}
                  />
                </Field>

                <Field label="Strap Length / Pallet (m)">
                  <Input
                    value={scenarioEngineering?.sheetPackaging?.strapLength_m}
                    onChange={(v) =>
                      updateSection("sheetPackaging", { strapLength_m: v })
                    }
                  />
                  <RefHints
                    engineeringValue={engineeringReviewData?.sheetPackaging?.strapLength_m}
                    requestValue=""
                    currentValue={scenarioEngineering?.sheetPackaging?.strapLength_m}
                  />
                </Field>

                <Field label="Separators / Pallet">
                  <Input
                    value={scenarioEngineering?.sheetPackaging?.separatorsPerPallet}
                    onChange={(v) =>
                      updateSection("sheetPackaging", { separatorsPerPallet: v })
                    }
                  />
                  <RefHints
                    engineeringValue={engineeringReviewData?.sheetPackaging?.separatorsPerPallet}
                    requestValue=""
                    currentValue={scenarioEngineering?.sheetPackaging?.separatorsPerPallet}
                  />
                </Field>

                <Field label="Foam Sheet Length / Pallet (m)">
                  <Input
                    value={scenarioEngineering?.sheetPackaging?.foamLength_m}
                    onChange={(v) =>
                      updateSection("sheetPackaging", { foamLength_m: v })
                    }
                  />
                  <RefHints
                    engineeringValue={engineeringReviewData?.sheetPackaging?.foamLength_m}
                    requestValue=""
                    currentValue={scenarioEngineering?.sheetPackaging?.foamLength_m}
                  />
                </Field>

                <Field label="Stretch Film / Pallet (kg)">
                  <Input
                    value={scenarioEngineering?.sheetPackaging?.stretchKgPerPallet}
                    onChange={(v) =>
                      updateSection("sheetPackaging", { stretchKgPerPallet: v })
                    }
                  />
                  <RefHints
                    engineeringValue={engineeringReviewData?.sheetPackaging?.stretchKgPerPallet}
                    requestValue=""
                    currentValue={scenarioEngineering?.sheetPackaging?.stretchKgPerPallet}
                  />
                </Field>
              </div>

              <Field label="Packaging Instructions">
                <TextArea
                  value={scenarioEngineering?.sheetPackaging?.instructionText}
                  onChange={(v) =>
                    updateSection("sheetPackaging", { instructionText: v })
                  }
                  rows={3}
                />
                <RefHints
                  engineeringValue={engineeringReviewData?.sheetPackaging?.instructionText}
                  requestValue=""
                  currentValue={scenarioEngineering?.sheetPackaging?.instructionText}
                />
              </Field>
            </div>
          </div>
        </div>
      </Section>

      <Section title="2. Extrusion Process Data">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="space-y-4 xl:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <Field label="Line Name">
                <Input
                  value={scenarioEngineering?.extrusion?.lineName}
                  onChange={(v) => updateSection("extrusion", { lineName: v })}
                />
                <RefHints
                  engineeringValue={engineeringReviewData?.extrusion?.lineName}
                  requestValue="Breyer"
                  currentValue={scenarioEngineering?.extrusion?.lineName}
                />
              </Field>

              <Field label="Scrap Rate %">
                <Input
                  value={scenarioEngineering?.extrusion?.scrapRatePct}
                  onChange={(v) =>
                    updateSection("extrusion", { scrapRatePct: v })
                  }
                />
                <RefHints
                  engineeringValue={engineeringReviewData?.extrusion?.scrapRatePct}
                  requestValue=""
                  currentValue={scenarioEngineering?.extrusion?.scrapRatePct}
                />
              </Field>

              <Field label="Non Recoverable Changeover Waste (kg)">
                <Input
                  value={scenarioEngineering?.extrusion?.changeoverWasteKg}
                  onChange={(v) =>
                    updateSection("extrusion", { changeoverWasteKg: v })
                  }
                />
                <RefHints
                  engineeringValue={engineeringReviewData?.extrusion?.changeoverWasteKg}
                  requestValue=""
                  currentValue={scenarioEngineering?.extrusion?.changeoverWasteKg}
                />
              </Field>

              <Field label="Startup Waste % (ignored)">
                <Input
                  value={scenarioEngineering?.extrusion?.startupWastePct}
                  onChange={(v) =>
                    updateSection("extrusion", { startupWastePct: v })
                  }
                />
                <RefHints
                  engineeringValue={engineeringReviewData?.extrusion?.startupWastePct}
                  requestValue=""
                  currentValue={scenarioEngineering?.extrusion?.startupWastePct}
                />
              </Field>

              <Field label="Efficiency %">
                <Input
                  value={scenarioEngineering?.extrusion?.efficiencyPct}
                  onChange={(v) =>
                    updateSection("extrusion", { efficiencyPct: v })
                  }
                />
                <RefHints
                  engineeringValue={engineeringReviewData?.extrusion?.efficiencyPct}
                  requestValue=""
                  currentValue={scenarioEngineering?.extrusion?.efficiencyPct}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <Field
                label={`Gross Speed Extruder A (optimum ${
                  OPT_SPEED_MAP[baseMaterial]?.A || 0
                } kg/hr)`}
              >
                <Input
                  value={scenarioEngineering?.extrusion?.grossSpeedA_kg_hr}
                  onChange={(v) =>
                    updateSection("extrusion", { grossSpeedA_kg_hr: v })
                  }
                />
                <RefHints
                  engineeringValue={engineeringReviewData?.extrusion?.grossSpeedA_kg_hr}
                  requestValue={requestValueOrBlank(OPT_SPEED_MAP[baseMaterial]?.A || "")}
                  currentValue={scenarioEngineering?.extrusion?.grossSpeedA_kg_hr}
                />
              </Field>

              <Field
                label={`Gross Speed Extruder B (optimum ${
                  OPT_SPEED_MAP[baseMaterial]?.B || 0
                } kg/hr)`}
              >
                <Input
                  value={scenarioEngineering?.extrusion?.grossSpeedB_kg_hr}
                  onChange={(v) =>
                    updateSection("extrusion", { grossSpeedB_kg_hr: v })
                  }
                />
                <RefHints
                  engineeringValue={engineeringReviewData?.extrusion?.grossSpeedB_kg_hr}
                  requestValue={requestValueOrBlank(OPT_SPEED_MAP[baseMaterial]?.B || "")}
                  currentValue={scenarioEngineering?.extrusion?.grossSpeedB_kg_hr}
                />
              </Field>

              <Field label="Total Gross Speed (kg/hr)">
                <Input
                  value={scenarioEngineering?.extrusion?.totalGrossSpeed_kg_hr}
                  onChange={() => {}}
                  disabled
                />
              </Field>

              <Field label="Gross / Optimum %">
                <Input
                  value={scenarioEngineering?.extrusion?.grossVsOptimalPct}
                  onChange={() => {}}
                  disabled
                />
              </Field>

              <div className="flex items-end text-sm">
                {extrusionDerived.totalGross > 0 && (
                  <div
                    className={`rounded-lg px-3 py-2 w-full ${
                      extrusionDerived.totalGross <= totalOptGross
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : "bg-green-50 text-green-700 border border-green-200"
                    }`}
                  >
                    {extrusionDerived.totalGross <= totalOptGross
                      ? "Below optimum gross speed"
                      : "Above optimum gross speed"}
                  </div>
                )}
              </div>
            </div>

            {extrusionDerived.warningMessage ? (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-700 p-3 text-sm">
                {extrusionDerived.warningMessage}
              </div>
            ) : null}

            {recommendedSpeedA > 0 && recommendedSpeedB > 0 && (
              <div
                className={`rounded-lg border p-3 text-sm ${
                  extrusionSpeedMismatch
                    ? "border-yellow-200 bg-yellow-50 text-yellow-700"
                    : "border-green-200 bg-green-50 text-green-700"
                }`}
              >
                Recommended matched speeds for current layer split: A = {fmt(
                  recommendedSpeedA,
                  2
                )} kg/hr, B = {fmt(recommendedSpeedB, 2)} kg/hr.
                {extrusionSpeedMismatch
                  ? " Entered speeds differ from the matched optimum for this layer ratio."
                  : " Entered speeds match the recommended ratio."}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Field label="Net Speed (kg/hr)">
                <Input
                  value={scenarioEngineering?.extrusion?.netSpeed_kg_hr}
                  onChange={() => {}}
                  disabled
                />
              </Field>

              <Field label="Net / Optimum %">
                <Input
                  value={scenarioEngineering?.extrusion?.netVsOptimalPct}
                  onChange={() => {}}
                  disabled
                />
              </Field>

              <Field label="Tons / Hr">
                <Input
                  value={scenarioEngineering?.extrusion?.tonsPerHour}
                  onChange={() => {}}
                  disabled
                />
              </Field>

              <Field label="Tons / Shift (12h)">
                <Input
                  value={scenarioEngineering?.extrusion?.tonsPerShift12h}
                  onChange={() => {}}
                  disabled
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Field label="Tons / Day (24h)">
                <Input
                  value={scenarioEngineering?.extrusion?.tonsPerDay24h}
                  onChange={() => {}}
                  disabled
                />
              </Field>

              <Field label="Tons / Week">
                <Input
                  value={scenarioEngineering?.extrusion?.tonsPerWeek}
                  onChange={() => {}}
                  disabled
                />
              </Field>

              <Field label="Tons / Month">
                <Input
                  value={scenarioEngineering?.extrusion?.tonsPerMonth}
                  onChange={() => {}}
                  disabled
                />
              </Field>

              <Field label="Tons / Year (330d)">
                <Input
                  value={scenarioEngineering?.extrusion?.tonsPerYear330d}
                  onChange={() => {}}
                  disabled
                />
              </Field>
            </div>
          </div>
        </div>
      </Section>

      {!isSheet && (
        <Section title="3. Thermoforming Data">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <Field label="Machine">
                <SelectField
                  value={scenarioEngineering?.thermo?.machineName}
                  onChange={(v) => updateSection("thermo", { machineName: v })}
                  options={["RDM73K", "RDK80"]}
                />
                <RefHints
                  engineeringValue={engineeringReviewData?.thermo?.machineName}
                  requestValue=""
                  currentValue={scenarioEngineering?.thermo?.machineName}
                />
              </Field>

              <Field label="Product Weight (g)">
                <Input
                  value={scenarioEngineering?.thermo?.unitWeight_g}
                  onChange={(v) => updateSection("thermo", { unitWeight_g: v })}
                />
                <RefHints
                  engineeringValue={engineeringReviewData?.thermo?.unitWeight_g}
                  requestValue={requestValueOrBlank(product?.productWeightG)}
                  currentValue={scenarioEngineering?.thermo?.unitWeight_g}
                />
              </Field>

              <Field label="Cavities">
                <Input
                  value={scenarioEngineering?.thermo?.cavities}
                  onChange={(v) => updateSection("thermo", { cavities: v })}
                />
                <RefHints
                  engineeringValue={engineeringReviewData?.thermo?.cavities}
                  requestValue=""
                  currentValue={scenarioEngineering?.thermo?.cavities}
                />
              </Field>

              <Field label="CPM">
                <Input
                  value={scenarioEngineering?.thermo?.cpm}
                  onChange={(v) => updateSection("thermo", { cpm: v })}
                />
                <RefHints
                  engineeringValue={engineeringReviewData?.thermo?.cpm}
                  requestValue=""
                  currentValue={scenarioEngineering?.thermo?.cpm}
                />
              </Field>

              <Field label="Efficiency %">
                <Input
                  value={scenarioEngineering?.thermo?.efficiencyPct}
                  onChange={(v) => updateSection("thermo", { efficiencyPct: v })}
                />
                <RefHints
                  engineeringValue={engineeringReviewData?.thermo?.efficiencyPct}
                  requestValue=""
                  currentValue={scenarioEngineering?.thermo?.efficiencyPct}
                />
              </Field>

              <Field label="Sheet Utilization %">
                <Input
                  value={scenarioEngineering?.thermo?.sheetUtilizationPct}
                  onChange={(v) =>
                    updateSection("thermo", { sheetUtilizationPct: v })
                  }
                />
                <RefHints
                  engineeringValue={engineeringReviewData?.thermo?.sheetUtilizationPct}
                  requestValue=""
                  currentValue={scenarioEngineering?.thermo?.sheetUtilizationPct}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <RefRow label="Pcs / Hr" value={scenarioEngineering?.thermo?.pcsPerHour} />
              <RefRow label="Pcs / Shift (12h)" value={scenarioEngineering?.thermo?.pcsPerShift12h} />
              <RefRow label="Pcs / Day" value={scenarioEngineering?.thermo?.pcsPerDay24h} />
              <RefRow label="Pcs / Week" value={scenarioEngineering?.thermo?.pcsPerWeek} />
              <RefRow label="Pcs / Month" value={scenarioEngineering?.thermo?.pcsPerMonth} />
              <RefRow label="Pcs / Year" value={scenarioEngineering?.thermo?.pcsPerYear330d} />
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
                checked={scenarioEngineering?.thermo?.enterToolData === true}
                onChange={(e) =>
                  updateSection("thermo", { enterToolData: e.target.checked })
                }
              />
              <div className="font-medium">Enter tool data</div>
            </div>

            {scenarioEngineering?.thermo?.enterToolData && (
              <div className="rounded-xl border p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <Field label="Base Mold Name">
                    <Input
                      value={scenarioEngineering?.tooling?.moldBaseName}
                      onChange={(v) =>
                        updateSection("tooling", { moldBaseName: v, enabled: true })
                      }
                    />
                    <RefHints
                      engineeringValue={engineeringReviewData?.tooling?.moldBaseName}
                      requestValue=""
                      currentValue={scenarioEngineering?.tooling?.moldBaseName}
                    />
                  </Field>

                  <Field label="Base Mold Code">
                    <Input
                      value={scenarioEngineering?.tooling?.moldBaseCode}
                      onChange={(v) =>
                        updateSection("tooling", { moldBaseCode: v, enabled: true })
                      }
                    />
                    <RefHints
                      engineeringValue={engineeringReviewData?.tooling?.moldBaseCode}
                      requestValue=""
                      currentValue={scenarioEngineering?.tooling?.moldBaseCode}
                    />
                  </Field>

                  <Field label="Mold Insert Name">
                    <Input
                      value={scenarioEngineering?.tooling?.moldInsertName}
                      onChange={(v) =>
                        updateSection("tooling", { moldInsertName: v, enabled: true })
                      }
                    />
                    <RefHints
                      engineeringValue={engineeringReviewData?.tooling?.moldInsertName}
                      requestValue=""
                      currentValue={scenarioEngineering?.tooling?.moldInsertName}
                    />
                  </Field>

                  <Field label="Mold Insert Code">
                    <Input
                      value={scenarioEngineering?.tooling?.moldInsertCode}
                      onChange={(v) =>
                        updateSection("tooling", { moldInsertCode: v, enabled: true })
                      }
                    />
                    <RefHints
                      engineeringValue={engineeringReviewData?.tooling?.moldInsertCode}
                      requestValue=""
                      currentValue={scenarioEngineering?.tooling?.moldInsertCode}
                    />
                  </Field>

                  <Field label="Mold Bottom / Engraving Name">
                    <Input
                      value={scenarioEngineering?.tooling?.moldBottomName}
                      onChange={(v) =>
                        updateSection("tooling", { moldBottomName: v, enabled: true })
                      }
                    />
                    <RefHints
                      engineeringValue={engineeringReviewData?.tooling?.moldBottomName}
                      requestValue=""
                      currentValue={scenarioEngineering?.tooling?.moldBottomName}
                    />
                  </Field>

                  <Field label="Mold Bottom / Engraving Code">
                    <Input
                      value={scenarioEngineering?.tooling?.moldBottomCode}
                      onChange={(v) =>
                        updateSection("tooling", { moldBottomCode: v, enabled: true })
                      }
                    />
                    <RefHints
                      engineeringValue={engineeringReviewData?.tooling?.moldBottomCode}
                      requestValue=""
                      currentValue={scenarioEngineering?.tooling?.moldBottomCode}
                    />
                  </Field>

                  <Field label="Cutting Plate Name">
                    <Input
                      value={scenarioEngineering?.tooling?.cuttingPlateName}
                      onChange={(v) =>
                        updateSection("tooling", { cuttingPlateName: v, enabled: true })
                      }
                    />
                    <RefHints
                      engineeringValue={engineeringReviewData?.tooling?.cuttingPlateName}
                      requestValue=""
                      currentValue={scenarioEngineering?.tooling?.cuttingPlateName}
                    />
                  </Field>

                  <Field label="Cutting Plate Code">
                    <Input
                      value={scenarioEngineering?.tooling?.cuttingPlateCode}
                      onChange={(v) =>
                        updateSection("tooling", { cuttingPlateCode: v, enabled: true })
                      }
                    />
                    <RefHints
                      engineeringValue={engineeringReviewData?.tooling?.cuttingPlateCode}
                      requestValue=""
                      currentValue={scenarioEngineering?.tooling?.cuttingPlateCode}
                    />
                  </Field>

                  <Field label="Stacking Unit Name">
                    <Input
                      value={scenarioEngineering?.tooling?.stackingUnitName}
                      onChange={(v) =>
                        updateSection("tooling", { stackingUnitName: v, enabled: true })
                      }
                    />
                    <RefHints
                      engineeringValue={engineeringReviewData?.tooling?.stackingUnitName}
                      requestValue=""
                      currentValue={scenarioEngineering?.tooling?.stackingUnitName}
                    />
                  </Field>

                  <Field label="Stacking Unit Code">
                    <Input
                      value={scenarioEngineering?.tooling?.stackingUnitCode}
                      onChange={(v) =>
                        updateSection("tooling", { stackingUnitCode: v, enabled: true })
                      }
                    />
                    <RefHints
                      engineeringValue={engineeringReviewData?.tooling?.stackingUnitCode}
                      requestValue=""
                      currentValue={scenarioEngineering?.tooling?.stackingUnitCode}
                    />
                  </Field>

                  <Field label="Plug Assist Name">
                    <Input
                      value={scenarioEngineering?.tooling?.plugAssistName}
                      onChange={(v) =>
                        updateSection("tooling", { plugAssistName: v, enabled: true })
                      }
                    />
                    <RefHints
                      engineeringValue={engineeringReviewData?.tooling?.plugAssistName}
                      requestValue=""
                      currentValue={scenarioEngineering?.tooling?.plugAssistName}
                    />
                  </Field>

                  <Field label="Plug Assist Code">
                    <Input
                      value={scenarioEngineering?.tooling?.plugAssistCode}
                      onChange={(v) =>
                        updateSection("tooling", { plugAssistCode: v, enabled: true })
                      }
                    />
                    <RefHints
                      engineeringValue={engineeringReviewData?.tooling?.plugAssistCode}
                      requestValue=""
                      currentValue={scenarioEngineering?.tooling?.plugAssistCode}
                    />
                  </Field>
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
                  checked={scenarioEngineering?.decorationEngineering?.enabled === true}
                  onChange={(e) =>
                    updateSection("decorationEngineering", {
                      ...(scenarioEngineering?.decorationEngineering || {}),
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
                    <Field label="Coverage Area %">
                      <Input
                        value={scenarioEngineering?.decorationEngineering?.print?.coverageAreaPct}
                        onChange={(v) =>
                          updateNested("decorationEngineering", "print", {
                            coverageAreaPct: v,
                          })
                        }
                      />
                      <RefHints
                        engineeringValue={
                          engineeringReviewData?.decorationEngineering?.print?.coverageAreaPct
                        }
                        requestValue=""
                        currentValue={
                          scenarioEngineering?.decorationEngineering?.print?.coverageAreaPct
                        }
                      />
                    </Field>

                    <Field label="Ink Weight / 1000 Cups">
                      <Input
                        value={
                          scenarioEngineering?.decorationEngineering?.print
                            ?.inkWeightPer1000Cups
                        }
                        onChange={(v) =>
                          updateNested("decorationEngineering", "print", {
                            inkWeightPer1000Cups: v,
                          })
                        }
                      />
                      <RefHints
                        engineeringValue={
                          engineeringReviewData?.decorationEngineering?.print
                            ?.inkWeightPer1000Cups
                        }
                        requestValue=""
                        currentValue={
                          scenarioEngineering?.decorationEngineering?.print
                            ?.inkWeightPer1000Cups
                        }
                      />
                    </Field>

                    <Field label="No. of Colors">
                      <Input
                        value={
                          scenarioEngineering?.decorationEngineering?.print?.numberOfColors ||
                          requestData?.decoration?.dryOffset?.printColors ||
                          ""
                        }
                        onChange={(v) =>
                          updateNested("decorationEngineering", "print", {
                            numberOfColors: v,
                          })
                        }
                      />
                      <RefHints
                        engineeringValue={
                          engineeringReviewData?.decorationEngineering?.print?.numberOfColors
                        }
                        requestValue={requestData?.decoration?.dryOffset?.printColors || ""}
                        currentValue={
                          scenarioEngineering?.decorationEngineering?.print?.numberOfColors
                        }
                      />
                    </Field>

                    <Field label="Print Area Length (mm)">
                      <Input
                        value={
                          scenarioEngineering?.decorationEngineering?.print?.printAreaLengthMm
                        }
                        onChange={(v) =>
                          updateNested("decorationEngineering", "print", {
                            printAreaLengthMm: v,
                          })
                        }
                      />
                      <RefHints
                        engineeringValue={
                          engineeringReviewData?.decorationEngineering?.print?.printAreaLengthMm
                        }
                        requestValue=""
                        currentValue={
                          scenarioEngineering?.decorationEngineering?.print?.printAreaLengthMm
                        }
                      />
                    </Field>

                    <Field label="Print Area Width (mm)">
                      <Input
                        value={
                          scenarioEngineering?.decorationEngineering?.print?.printAreaWidthMm
                        }
                        onChange={(v) =>
                          updateNested("decorationEngineering", "print", {
                            printAreaWidthMm: v,
                          })
                        }
                      />
                      <RefHints
                        engineeringValue={
                          engineeringReviewData?.decorationEngineering?.print?.printAreaWidthMm
                        }
                        requestValue=""
                        currentValue={
                          scenarioEngineering?.decorationEngineering?.print?.printAreaWidthMm
                        }
                      />
                    </Field>
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
                      <Field key={key} label={label}>
                        <Input
                          value={scenarioEngineering?.decorationEngineering?.sleeve?.[key]}
                          onChange={(v) =>
                            updateNested("decorationEngineering", "sleeve", {
                              [key]: v,
                            })
                          }
                        />
                        <RefHints
                          engineeringValue={
                            engineeringReviewData?.decorationEngineering?.sleeve?.[key]
                          }
                          requestValue=""
                          currentValue={
                            scenarioEngineering?.decorationEngineering?.sleeve?.[key]
                          }
                        />
                      </Field>
                    ))}

                    <Field label="Shrink Curve">
                      <TextArea
                        value={scenarioEngineering?.decorationEngineering?.sleeve?.shrinkCurve}
                        onChange={(v) =>
                          updateNested("decorationEngineering", "sleeve", {
                            shrinkCurve: v,
                          })
                        }
                        rows={3}
                      />
                      <RefHints
                        engineeringValue={
                          engineeringReviewData?.decorationEngineering?.sleeve?.shrinkCurve
                        }
                        requestValue=""
                        currentValue={
                          scenarioEngineering?.decorationEngineering?.sleeve?.shrinkCurve
                        }
                      />
                    </Field>
                  </div>
                )}

                {requestDecorationType === "Hybrid cup" && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <Field label="Blank Material">
                      <Input
                        value={scenarioEngineering?.decorationEngineering?.hybrid?.blankMaterial}
                        onChange={(v) =>
                          updateNested("decorationEngineering", "hybrid", {
                            blankMaterial: v,
                          })
                        }
                      />
                      <RefHints
                        engineeringValue={
                          engineeringReviewData?.decorationEngineering?.hybrid?.blankMaterial
                        }
                        requestValue=""
                        currentValue={
                          scenarioEngineering?.decorationEngineering?.hybrid?.blankMaterial
                        }
                      />
                    </Field>

                    <Field label="GSM">
                      <Input
                        value={scenarioEngineering?.decorationEngineering?.hybrid?.gsm}
                        onChange={(v) =>
                          updateNested("decorationEngineering", "hybrid", { gsm: v })
                        }
                      />
                      <RefHints
                        engineeringValue={
                          engineeringReviewData?.decorationEngineering?.hybrid?.gsm
                        }
                        requestValue=""
                        currentValue={
                          scenarioEngineering?.decorationEngineering?.hybrid?.gsm
                        }
                      />
                    </Field>

                    <Field label="Print Colors">
                      <Input
                        value={scenarioEngineering?.decorationEngineering?.hybrid?.printColors}
                        onChange={(v) =>
                          updateNested("decorationEngineering", "hybrid", {
                            printColors: v,
                          })
                        }
                      />
                      <RefHints
                        engineeringValue={
                          engineeringReviewData?.decorationEngineering?.hybrid?.printColors
                        }
                        requestValue=""
                        currentValue={
                          scenarioEngineering?.decorationEngineering?.hybrid?.printColors
                        }
                      />
                    </Field>

                    <Field label="Coating">
                      <Input
                        value={scenarioEngineering?.decorationEngineering?.hybrid?.coating}
                        onChange={(v) =>
                          updateNested("decorationEngineering", "hybrid", { coating: v })
                        }
                      />
                      <RefHints
                        engineeringValue={
                          engineeringReviewData?.decorationEngineering?.hybrid?.coating
                        }
                        requestValue=""
                        currentValue={
                          scenarioEngineering?.decorationEngineering?.hybrid?.coating
                        }
                      />
                    </Field>

                    <Field label="Paper Bottom Selected">
                      <SelectField
                        value={
                          scenarioEngineering?.decorationEngineering?.hybrid?.paperBottomSelected
                        }
                        onChange={(v) =>
                          updateNested("decorationEngineering", "hybrid", {
                            paperBottomSelected: v,
                          })
                        }
                        options={["Yes", "No"]}
                      />
                      <RefHints
                        engineeringValue={
                          engineeringReviewData?.decorationEngineering?.hybrid
                            ?.paperBottomSelected
                        }
                        requestValue=""
                        currentValue={
                          scenarioEngineering?.decorationEngineering?.hybrid
                            ?.paperBottomSelected
                        }
                      />
                    </Field>

                    {scenarioEngineering?.decorationEngineering?.hybrid?.paperBottomSelected ===
                      "Yes" && (
                      <>
                        <Field label="Paper Bottom Material">
                          <Input
                            value={
                              scenarioEngineering?.decorationEngineering?.hybrid
                                ?.paperBottomMaterial
                            }
                            onChange={(v) =>
                              updateNested("decorationEngineering", "hybrid", {
                                paperBottomMaterial: v,
                              })
                            }
                          />
                          <RefHints
                            engineeringValue={
                              engineeringReviewData?.decorationEngineering?.hybrid
                                ?.paperBottomMaterial
                            }
                            requestValue=""
                            currentValue={
                              scenarioEngineering?.decorationEngineering?.hybrid
                                ?.paperBottomMaterial
                            }
                          />
                        </Field>

                        <Field label="Paper Bottom GSM">
                          <Input
                            value={
                              scenarioEngineering?.decorationEngineering?.hybrid
                                ?.paperBottomGsm
                            }
                            onChange={(v) =>
                              updateNested("decorationEngineering", "hybrid", {
                                paperBottomGsm: v,
                              })
                            }
                          />
                          <RefHints
                            engineeringValue={
                              engineeringReviewData?.decorationEngineering?.hybrid
                                ?.paperBottomGsm
                            }
                            requestValue=""
                            currentValue={
                              scenarioEngineering?.decorationEngineering?.hybrid
                                ?.paperBottomGsm
                            }
                          />
                        </Field>

                        <Field label="Paper Bottom PE g/m²">
                          <Input
                            value={
                              scenarioEngineering?.decorationEngineering?.hybrid
                                ?.paperBottomPE_g_m2
                            }
                            onChange={(v) =>
                              updateNested("decorationEngineering", "hybrid", {
                                paperBottomPE_g_m2: v,
                              })
                            }
                          />
                          <RefHints
                            engineeringValue={
                              engineeringReviewData?.decorationEngineering?.hybrid
                                ?.paperBottomPE_g_m2
                            }
                            requestValue=""
                            currentValue={
                              scenarioEngineering?.decorationEngineering?.hybrid
                                ?.paperBottomPE_g_m2
                            }
                          />
                        </Field>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </Section>
      )}

      {!isSheet && (
        <Section title="7. Thermoformed Product Packaging Data">
          <div className="space-y-5">
            <div className="rounded-xl border p-4 space-y-4">
              <div className="font-medium">Primary Packaging</div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Field label="Pieces / Stack">
                  <Input
                    value={scenarioEngineering?.packaging?.primary?.pcsPerStack}
                    onChange={(v) =>
                      updateNested("packaging", "primary", { pcsPerStack: v })
                    }
                  />
                  <RefHints
                    engineeringValue={engineeringReviewData?.packaging?.primary?.pcsPerStack}
                    requestValue={requestValueOrBlank(packagingReq?.primary?.pcsPerStack)}
                    currentValue={scenarioEngineering?.packaging?.primary?.pcsPerStack}
                  />
                </Field>

                <Field label="Stacks / Bag">
                  <Input
                    value={scenarioEngineering?.packaging?.primary?.stacksPerPrimary}
                    onChange={(v) =>
                      updateNested("packaging", "primary", { stacksPerPrimary: v })
                    }
                  />
                  <RefHints
                    engineeringValue={
                      engineeringReviewData?.packaging?.primary?.stacksPerPrimary
                    }
                    requestValue={requestValueOrBlank(packagingReq?.primary?.stacksPerBag)}
                    currentValue={scenarioEngineering?.packaging?.primary?.stacksPerPrimary}
                  />
                </Field>

                <Field label="Bag / Sleeve Material">
                  <Input
                    value={scenarioEngineering?.packaging?.primary?.primaryMaterial}
                    onChange={(v) =>
                      updateNested("packaging", "primary", { primaryMaterial: v })
                    }
                  />
                  <RefHints
                    engineeringValue={
                      engineeringReviewData?.packaging?.primary?.primaryMaterial
                    }
                    requestValue={requestValueOrBlank(packagingReq?.primary?.bagSleeveMaterial)}
                    currentValue={scenarioEngineering?.packaging?.primary?.primaryMaterial}
                  />
                </Field>

                <Field label="Primary Pack Name">
                  <Input
                    value={scenarioEngineering?.packaging?.primary?.primaryName}
                    onChange={(v) =>
                      updateNested("packaging", "primary", { primaryName: v })
                    }
                  />
                  <RefHints
                    engineeringValue={engineeringReviewData?.packaging?.primary?.primaryName}
                    requestValue={requestValueOrBlank(packagingReq?.primary?.bagSleeveMaterial)}
                    currentValue={scenarioEngineering?.packaging?.primary?.primaryName}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Field label="Bag / Sleeve Dimensions (mm)">
                  <Input
                    value={scenarioEngineering?.packaging?.primary?.primaryLength_mm}
                    onChange={(v) =>
                      updateNested("packaging", "primary", { primaryLength_mm: v })
                    }
                  />
                  <RefHints
                    engineeringValue={
                      engineeringReviewData?.packaging?.primary?.primaryLength_mm
                    }
                    requestValue={requestValueOrBlank(packagingReq?.primary?.bagSleeveDimensionsMm)}
                    currentValue={scenarioEngineering?.packaging?.primary?.primaryLength_mm}
                  />
                </Field>

                <Field label="Sleeve Thickness (micron)">
                  <Input
                    value={scenarioEngineering?.packaging?.primary?.primaryWidth_mm}
                    onChange={(v) =>
                      updateNested("packaging", "primary", { primaryWidth_mm: v })
                    }
                  />
                  <RefHints
                    engineeringValue={
                      engineeringReviewData?.packaging?.primary?.primaryWidth_mm
                    }
                    requestValue={requestValueOrBlank(packagingReq?.primary?.bagSleeveThicknessMicron)}
                    currentValue={scenarioEngineering?.packaging?.primary?.primaryWidth_mm}
                  />
                </Field>

                <Field label="Sleeve Weight">
                  <Input
                    value={scenarioEngineering?.packaging?.primary?.primaryHeight_mm}
                    onChange={(v) =>
                      updateNested("packaging", "primary", { primaryHeight_mm: v })
                    }
                  />
                  <RefHints
                    engineeringValue={
                      engineeringReviewData?.packaging?.primary?.primaryHeight_mm
                    }
                    requestValue={requestValueOrBlank(packagingReq?.primary?.bagSleeveWeight)}
                    currentValue={scenarioEngineering?.packaging?.primary?.primaryHeight_mm}
                  />
                </Field>

                <Field label="Primary Artwork Code">
                  <Input
                    value={scenarioEngineering?.packaging?.primary?.primaryArtworkCode}
                    onChange={(v) =>
                      updateNested("packaging", "primary", { primaryArtworkCode: v })
                    }
                  />
                  <RefHints
                    engineeringValue={
                      engineeringReviewData?.packaging?.primary?.primaryArtworkCode
                    }
                    requestValue={requestValueOrBlank(packagingReq?.primary?.sleeveArtworkProvided)}
                    currentValue={scenarioEngineering?.packaging?.primary?.primaryArtworkCode}
                  />
                </Field>
              </div>
            </div>

            <div className="rounded-xl border p-4 space-y-4">
              <div className="font-medium">Secondary Packaging</div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Field label="Bags / Carton">
                  <Input
                    value={scenarioEngineering?.packaging?.secondary?.primariesPerSecondary}
                    onChange={(v) =>
                      updateNested("packaging", "secondary", {
                        primariesPerSecondary: v,
                      })
                    }
                  />
                  <RefHints
                    engineeringValue={
                      engineeringReviewData?.packaging?.secondary?.primariesPerSecondary
                    }
                    requestValue={requestValueOrBlank(packagingReq?.secondary?.bagsPerCarton)}
                    currentValue={scenarioEngineering?.packaging?.secondary?.primariesPerSecondary}
                  />
                </Field>

                <Field label="Carton Type">
                  <SelectField
                    value={scenarioEngineering?.packaging?.secondary?.secondaryType}
                    onChange={(v) =>
                      updateNested("packaging", "secondary", { secondaryType: v })
                    }
                    options={[
                      { value: "Single wall", label: "Single wall" },
                      { value: "Double wall", label: "Double wall" },
                    ]}
                  />
                  <RefHints
                    engineeringValue={
                      engineeringReviewData?.packaging?.secondary?.secondaryType
                    }
                    requestValue={requestValueOrBlank(packagingReq?.secondary?.cartonType)}
                    currentValue={scenarioEngineering?.packaging?.secondary?.secondaryType}
                  />
                </Field>

                <Field label="Secondary Pack Name">
                  <Input
                    value={scenarioEngineering?.packaging?.secondary?.secondaryName}
                    onChange={(v) =>
                      updateNested("packaging", "secondary", { secondaryName: v })
                    }
                  />
                  <RefHints
                    engineeringValue={
                      engineeringReviewData?.packaging?.secondary?.secondaryName
                    }
                    requestValue={requestValueOrBlank(packagingReq?.secondary?.cartonType)}
                    currentValue={scenarioEngineering?.packaging?.secondary?.secondaryName}
                  />
                </Field>

                <Field label="Labels / Box">
                  <Input
                    value={scenarioEngineering?.packaging?.secondary?.labelsPerBox}
                    onChange={(v) =>
                      updateNested("packaging", "secondary", { labelsPerBox: v })
                    }
                  />
                  <RefHints
                    engineeringValue={engineeringReviewData?.packaging?.secondary?.labelsPerBox}
                    requestValue={requestValueOrBlank(packagingReq?.labelInstructions?.cartonLabelRequired)}
                    currentValue={scenarioEngineering?.packaging?.secondary?.labelsPerBox}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <Field label="Carton External Length (mm)">
                  <Input
                    value={scenarioEngineering?.packaging?.secondary?.secondaryLength_mm}
                    onChange={(v) =>
                      updateNested("packaging", "secondary", { secondaryLength_mm: v })
                    }
                  />
                  <RefHints
                    engineeringValue={
                      engineeringReviewData?.packaging?.secondary?.secondaryLength_mm
                    }
                    requestValue={requestValueOrBlank(packagingReq?.secondary?.cartonExternalLengthMm)}
                    currentValue={scenarioEngineering?.packaging?.secondary?.secondaryLength_mm}
                  />
                </Field>

                <Field label="Carton External Width (mm)">
                  <Input
                    value={scenarioEngineering?.packaging?.secondary?.secondaryWidth_mm}
                    onChange={(v) =>
                      updateNested("packaging", "secondary", { secondaryWidth_mm: v })
                    }
                  />
                  <RefHints
                    engineeringValue={
                      engineeringReviewData?.packaging?.secondary?.secondaryWidth_mm
                    }
                    requestValue={requestValueOrBlank(packagingReq?.secondary?.cartonExternalWidthMm)}
                    currentValue={scenarioEngineering?.packaging?.secondary?.secondaryWidth_mm}
                  />
                </Field>

                <Field label="Carton Height (mm)">
                  <Input
                    value={scenarioEngineering?.packaging?.secondary?.secondaryHeight_mm}
                    onChange={(v) =>
                      updateNested("packaging", "secondary", { secondaryHeight_mm: v })
                    }
                  />
                  <RefHints
                    engineeringValue={
                      engineeringReviewData?.packaging?.secondary?.secondaryHeight_mm
                    }
                    requestValue={requestValueOrBlank(packagingReq?.secondary?.cartonHeightMm)}
                    currentValue={scenarioEngineering?.packaging?.secondary?.secondaryHeight_mm}
                  />
                </Field>

                <Field label="Label Length (mm)">
                  <Input
                    value={scenarioEngineering?.packaging?.secondary?.labelLength_mm}
                    onChange={(v) =>
                      updateNested("packaging", "secondary", { labelLength_mm: v })
                    }
                  />
                  <RefHints
                    engineeringValue={engineeringReviewData?.packaging?.secondary?.labelLength_mm}
                    requestValue={requestValueOrBlank(packagingReq?.labelInstructions?.cartonLabelDimensionsMm)}
                    currentValue={scenarioEngineering?.packaging?.secondary?.labelLength_mm}
                  />
                </Field>

                <Field label="Label Width (mm)">
                  <Input
                    value={scenarioEngineering?.packaging?.secondary?.labelWidth_mm}
                    onChange={(v) =>
                      updateNested("packaging", "secondary", { labelWidth_mm: v })
                    }
                  />
                  <RefHints
                    engineeringValue={engineeringReviewData?.packaging?.secondary?.labelWidth_mm}
                    requestValue=""
                    currentValue={scenarioEngineering?.packaging?.secondary?.labelWidth_mm}
                  />
                </Field>
              </div>
            </div>

            <div className="rounded-xl border p-4 space-y-4">
              <div className="font-medium">Pallet</div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Field label="Use Pallet">
                  <SelectField
                    value={scenarioEngineering?.packaging?.pallet?.palletSelected}
                    onChange={(v) =>
                      updateNested("packaging", "pallet", { palletSelected: v })
                    }
                    options={["Yes", "No"]}
                  />
                  <RefHints
                    engineeringValue={
                      engineeringReviewData?.packaging?.pallet?.palletSelected
                    }
                    requestValue={packagingReq?.pallet?.noPalletNeeded ? "No" : "Yes"}
                    currentValue={scenarioEngineering?.packaging?.pallet?.palletSelected}
                  />
                </Field>

                {scenarioEngineering?.packaging?.pallet?.palletSelected === "Yes" && (
                  <>
                    <Field label="Pallet Type">
                      <SelectField
                        value={scenarioEngineering?.packaging?.pallet?.palletType}
                        onChange={(v) =>
                          updateNested("packaging", "pallet", { palletType: v })
                        }
                        options={[
                          { value: "UK", label: "UK Standard Pallet" },
                          { value: "EURO", label: "EURO Pallet" },
                        ]}
                      />
                      <RefHints
                        engineeringValue={engineeringReviewData?.packaging?.pallet?.palletType}
                        requestValue={requestValueOrBlank(packagingReq?.pallet?.palletType)}
                        currentValue={scenarioEngineering?.packaging?.pallet?.palletType}
                      />
                    </Field>

                    <Field label="Pallet Length (mm)">
                      <Input
                        value={scenarioEngineering?.packaging?.pallet?.palletLength_mm}
                        onChange={(v) =>
                          updateNested("packaging", "pallet", { palletLength_mm: v })
                        }
                      />
                      <RefHints
                        engineeringValue={
                          engineeringReviewData?.packaging?.pallet?.palletLength_mm
                        }
                        requestValue={requestValueOrBlank(packagingReq?.pallet?.palletLengthMm)}
                        currentValue={scenarioEngineering?.packaging?.pallet?.palletLength_mm}
                      />
                    </Field>

                    <Field label="Pallet Width (mm)">
                      <Input
                        value={scenarioEngineering?.packaging?.pallet?.palletWidth_mm}
                        onChange={(v) =>
                          updateNested("packaging", "pallet", { palletWidth_mm: v })
                        }
                      />
                      <RefHints
                        engineeringValue={
                          engineeringReviewData?.packaging?.pallet?.palletWidth_mm
                        }
                        requestValue={requestValueOrBlank(packagingReq?.pallet?.palletWidthMm)}
                        currentValue={scenarioEngineering?.packaging?.pallet?.palletWidth_mm}
                      />
                    </Field>

                    <Field label="Pallet Height (mm)">
                      <Input
                        value={scenarioEngineering?.packaging?.pallet?.palletHeight_mm}
                        onChange={(v) =>
                          updateNested("packaging", "pallet", { palletHeight_mm: v })
                        }
                      />
                      <RefHints
                        engineeringValue={
                          engineeringReviewData?.packaging?.pallet?.palletHeight_mm
                        }
                        requestValue={requestValueOrBlank(packagingReq?.pallet?.palletHeightMm)}
                        currentValue={scenarioEngineering?.packaging?.pallet?.palletHeight_mm}
                      />
                    </Field>

                    <Field label="Cartons / Pallet">
                      <Input
                        value={scenarioEngineering?.packaging?.pallet?.boxesPerPallet}
                        onChange={(v) =>
                          updateNested("packaging", "pallet", { boxesPerPallet: v })
                        }
                      />
                      <RefHints
                        engineeringValue={
                          engineeringReviewData?.packaging?.pallet?.boxesPerPallet
                        }
                        requestValue={requestValueOrBlank(packagingReq?.pallet?.cartonsPerPallet)}
                        currentValue={scenarioEngineering?.packaging?.pallet?.boxesPerPallet}
                      />
                    </Field>

                    <Field label="Stretch / Pallet (kg)">
                      <Input
                        value={
                          scenarioEngineering?.packaging?.pallet?.stretchWeightPerPallet_kg
                        }
                        onChange={(v) =>
                          updateNested("packaging", "pallet", {
                            stretchWeightPerPallet_kg: v,
                          })
                        }
                      />
                      <RefHints
                        engineeringValue={
                          engineeringReviewData?.packaging?.pallet
                            ?.stretchWeightPerPallet_kg
                        }
                        requestValue={requestValueOrBlank(packagingReq?.pallet?.stretchWrapKgPerPallet)}
                        currentValue={
                          scenarioEngineering?.packaging?.pallet?.stretchWeightPerPallet_kg
                        }
                      />
                    </Field>
                  </>
                )}
              </div>

              <Field label="Packaging Notes / Special Instructions">
                <TextArea
                  value={scenarioEngineering?.packaging?.notes}
                  onChange={(v) => updateSection("packaging", { notes: v })}
                  rows={3}
                />
                <RefHints
                  engineeringValue={engineeringReviewData?.packaging?.notes}
                  requestValue={requestValueOrBlank(
                    packagingReq?.primary?.primaryPackagingNotes ||
                      packagingReq?.secondary?.cartonPackagingNotes ||
                      packagingReq?.pallet?.palletNotes
                  )}
                  currentValue={scenarioEngineering?.packaging?.notes}
                />
              </Field>

              <Field label="Auto Packaging Instruction">
                <TextArea
                  value={scenarioEngineering?.packaging?.instructionText}
                  onChange={(v) => updateSection("packaging", { instructionText: v })}
                  rows={3}
                />
                <RefHints
                  engineeringValue={engineeringReviewData?.packaging?.instructionText}
                  requestValue=""
                  currentValue={scenarioEngineering?.packaging?.instructionText}
                />
              </Field>

              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <RefRow label="pcs / stack" value={scenarioEngineering?.packaging?.primary?.pcsPerStack || "—"} />
                <RefRow label="stacks / primary" value={scenarioEngineering?.packaging?.primary?.stacksPerPrimary || "—"} />
                <RefRow label="pcs / primary" value={thermoPackagingDerived.pcsPerPrimary ? fmt(thermoPackagingDerived.pcsPerPrimary, 0) : "—"} />
                <RefRow label="primary / carton" value={scenarioEngineering?.packaging?.secondary?.primariesPerSecondary || "—"} />
                <RefRow label="pcs / carton" value={thermoPackagingDerived.pcsPerCarton ? fmt(thermoPackagingDerived.pcsPerCarton, 0) : "—"} />
                <RefRow label="pcs / pallet" value={thermoPackagingDerived.pcsPerPallet ? fmt(thermoPackagingDerived.pcsPerPallet, 0) : "—"} />
              </div>
            </div>
          </div>
        </Section>
      )}

      <Section title={isSheet ? "5. Freight / Logistics" : "8. Freight / Logistics"}>
        <div className="space-y-5">
          <div className="rounded-xl border p-4 space-y-4">
            <div className="font-medium">Calculated Packing Data</div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {!isSheet && (
                <>
                  <RefRow
                    label="Carton Volume (m³)"
                    value={scenarioEngineering?.freight?.cartonVolume_m3 || "—"}
                  />
                  <RefRow
                    label="Weight / Carton (kg)"
                    value={scenarioEngineering?.freight?.cartonWeight_kg || "—"}
                  />
                </>
              )}

              <RefRow
                label="Pallet Dimensions (mm)"
                value={
                  scenarioEngineering?.freight?.palletLength_mm &&
                  scenarioEngineering?.freight?.palletWidth_mm &&
                  scenarioEngineering?.freight?.palletHeight_mm
                    ? `${scenarioEngineering.freight.palletLength_mm} × ${scenarioEngineering.freight.palletWidth_mm} × ${scenarioEngineering.freight.palletHeight_mm}`
                    : "—"
                }
              />
              <RefRow
                label="Pallet Volume (m³)"
                value={scenarioEngineering?.freight?.palletVolume_m3 || "—"}
              />
              <RefRow
                label="Pallet Weight (kg)"
                value={scenarioEngineering?.freight?.palletWeight_kg || "—"}
              />
            </div>
          </div>

          <div className="rounded-xl border p-4 space-y-4">
            <div className="font-medium">Standard Containers</div>

            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3">Container</th>
                    <th className="text-left p-3">Volume</th>
                    <th className="text-left p-3">Tare</th>
                    <th className="text-left p-3">Pallets</th>
                    {!isSheet && <th className="text-left p-3">Cartons / Container</th>}
                    {!isSheet && <th className="text-left p-3">PCS</th>}
                    {isSheet && <th className="text-left p-3">Rolls</th>}
                    <th className="text-left p-3">Net Weight (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["20ft Dry", "container20"],
                    ["40ft Dry", "container40"],
                    ["40ft High Cube", "container40hc"],
                  ].map(([label, key]) => (
                    <tr key={key} className="border-t">
                      <td className="p-3">{label}</td>
                      <td className="p-3">{CONTAINER_SPECS[label].volume_m3} m³</td>
                      <td className="p-3">{CONTAINER_SPECS[label].tare_kg} kg</td>
                      <td className="p-3">
                        {scenarioEngineering?.freight?.[`${key}_pallets`] || "—"}
                      </td>
                      {!isSheet && (
                        <td className="p-3">
                          {scenarioEngineering?.packaging?.pallet?.palletSelected === "Yes"
                            ? scenarioEngineering?.freight?.[`${key}_cartons`] || "—"
                            : scenarioEngineering?.freight?.[`${key}_cartonsRange`] || "—"}
                        </td>
                      )}
                      {!isSheet && (
                        <td className="p-3">
                          {scenarioEngineering?.freight?.[`${key}_pcs`] || "—"}
                        </td>
                      )}
                      {isSheet && (
                        <td className="p-3">
                          {scenarioEngineering?.freight?.[`${key}_rolls`] || "—"}
                        </td>
                      )}
                      <td className="p-3">
                        {scenarioEngineering?.freight?.[`${key}_netWeight_kg`] || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border p-4 space-y-4">
            <div className="font-medium">Other Truck Sizes</div>

            <div className="space-y-3">
              {[
                ["Small Truck", "smallTruck"],
                ["Medium Truck", "mediumTruck"],
                ["Large Truck", "largeTruck"],
                ["Double Trailer", "doubleTrailer"],
              ].map(([label, key]) => (
                <div
                  key={key}
                  className="grid grid-cols-1 md:grid-cols-5 gap-3 rounded-lg border p-3"
                >
                  <div className="font-medium flex items-center">{label}</div>

                  <Field label="Pallets / Truck">
                    <Input
                      value={scenarioEngineering?.freight?.[`${key}_pallets`]}
                      onChange={(v) =>
                        updateSection("freight", { [`${key}_pallets`]: v })
                      }
                    />
                    <RefHints
                      engineeringValue={engineeringReviewData?.freight?.[`${key}_pallets`]}
                      requestValue=""
                      currentValue={scenarioEngineering?.freight?.[`${key}_pallets`]}
                    />
                  </Field>

                  {!isSheet && (
                    <Field label="Cartons / Truck">
                      <Input
                        value={scenarioEngineering?.freight?.[`${key}_cartons`]}
                        onChange={(v) =>
                          updateSection("freight", { [`${key}_cartons`]: v })
                        }
                      />
                      <RefHints
                        engineeringValue={engineeringReviewData?.freight?.[`${key}_cartons`]}
                        requestValue=""
                        currentValue={scenarioEngineering?.freight?.[`${key}_cartons`]}
                      />
                    </Field>
                  )}

                  <RefRow
                    label={isSheet ? "Rolls / Truck" : "PCS / Truck"}
                    value={
                      isSheet
                        ? scenarioEngineering?.freight?.[`${key}_rolls`]
                        : scenarioEngineering?.freight?.[`${key}_pcs`]
                    }
                  />

                  <RefRow
                    label="Net Weight / Truck (kg)"
                    value={scenarioEngineering?.freight?.[`${key}_netWeight_kg`] || "—"}
                  />
                </div>
              ))}
            </div>
          </div>

          <Field label="Freight Notes">
            <TextArea
              value={scenarioEngineering?.freight?.notes}
              onChange={(v) => updateSection("freight", { notes: v })}
            />
            <RefHints
              engineeringValue={engineeringReviewData?.freight?.notes}
              requestValue=""
              currentValue={scenarioEngineering?.freight?.notes}
            />
          </Field>
        </div>
      </Section>

      <Section title={isSheet ? "6. Notes" : "9. Notes"}>
        <div className="space-y-4">
          <RefRow
            label="Customer Notes"
            value={project?.customerNotes || primaryCustomer?.customerNotes}
          />

          <Field label="Engineering Notes">
            <TextArea
              value={scenarioEngineering?.freight?.notes}
              onChange={(v) => updateSection("freight", { notes: v })}
            />
            <RefHints
              engineeringValue={engineeringReviewData?.freight?.notes}
              requestValue=""
              currentValue={scenarioEngineering?.freight?.notes}
            />
          </Field>
        </div>
      </Section>
    </div>
  );
}