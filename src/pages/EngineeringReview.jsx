
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

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
function Section({ title, children }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
      <h2 className="font-semibold text-lg">{title}</h2>
      {children}
    </div>
  );
}



function Field({ label, requestValue, currentValue, children }) {
  const hasRequestValue =
    requestValue !== undefined &&
    requestValue !== null &&
    String(requestValue).trim() !== "";

  const isChanged =
    hasRequestValue &&
    String(currentValue ?? "").trim() !== String(requestValue ?? "").trim();

  return (
    <label className="block">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      {children}

      {hasRequestValue ? (
        <div
          className={`mt-1 text-xs ${
            isChanged ? "text-red-600 font-medium" : "text-gray-400"
          }`}
        >
          Request value: {String(requestValue)}
        </div>
      ) : null}
    </label>
  );
}

function Input({ value, onChange, placeholder = "", type = "text", disabled = false }) {
  return (
    <input
      type={type}
      className={`w-full border rounded-lg p-2 ${disabled ? "bg-gray-100 text-gray-500" : ""}`}
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
      className={`w-full border rounded-lg p-2 ${disabled ? "bg-gray-100 text-gray-500" : ""}`}
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
function requestValueOrBlank(value) {
  if (value === undefined || value === null) return "";
  return String(value);
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
const OPT_LAYER_A_MAP = {
  PET: 200 / (200 + 800),
  PS: 150 / (150 + 700),
  PP: 120 / (120 + 600),
};

function pct(value) {
  return value * 100;
}

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
const SHEET_SPEC_IMAGE = "/images/sheet-roll-guide.jpg";
export default function EngineeringReview() {
  const { requestId } = useParams();

  const [payload, setPayload] = useState(null);
  const [engineerName, setEngineerName] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const [engineering, setEngineering] = useState({
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

   
  });

  useEffect(() => {
    const load = async () => {
      try {
        const r1 = await fetch(`/.netlify/functions/get-request?requestId=${requestId}`);
const j1 = await r1.json();
if (j1.success) {
  setPayload(j1.payload);
  await moveToUnderEngineeringIfNeeded(j1.payload);
}

        const r2 = await fetch(`/.netlify/functions/get-engineering-data?requestId=${requestId}`);
        const j2 = await r2.json();

        if (j2.success && j2.engineeringData) {
          setEngineering((prev) => ({
            ...prev,
            ...j2.engineeringData,
            materialSheet: {
              ...prev.materialSheet,
              ...(j2.engineeringData.materialSheet || {}),
              layerA:
                j2.engineeringData?.materialSheet?.layerA?.length > 0
                  ? j2.engineeringData.materialSheet.layerA
                  : prev.materialSheet.layerA,
              layerB:
                j2.engineeringData?.materialSheet?.layerB?.length > 0
                  ? j2.engineeringData.materialSheet.layerB
                  : prev.materialSheet.layerB,
            },
            sheetPackaging: {
              ...prev.sheetPackaging,
              ...(j2.engineeringData.sheetPackaging || {}),
            },
            extrusion: {
              ...prev.extrusion,
              ...(j2.engineeringData.extrusion || {}),
            },
            thermo: {
              ...prev.thermo,
              ...(j2.engineeringData.thermo || {}),
            },
            packaging: {
              ...prev.packaging,
              ...(j2.engineeringData.packaging || {}),
              primary: {
                ...prev.packaging.primary,
                ...(j2.engineeringData.packaging?.primary || {}),
              },
              secondary: {
                ...prev.packaging.secondary,
                ...(j2.engineeringData.packaging?.secondary || {}),
              },
              pallet: {
                ...prev.packaging.pallet,
                ...(j2.engineeringData.packaging?.pallet || {}),
              },
            },
          }));
          setEngineerName(j2.engineerName || "");
        }
      } catch (err) {
        console.error(err);
      }
    };

    load();
  }, [requestId]);

  const updateSection = (section, patch) => {
    setEngineering((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...patch,
      },
    }));
  };

  const updateNested = (section, key, patch) => {
    setEngineering((prev) => ({
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
    setEngineering((prev) => {
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
    setEngineering((prev) => {
      const next = structuredClone(prev);
      next.materialSheet[side] = [...(next.materialSheet[side] || []), blankMaterialRow()];

      if (side === "layerA" && next.materialSheet.syncLayerBWithA) {
        next.materialSheet.layerB = next.materialSheet.layerA.map((r) => ({ ...r }));
      }

      return next;
    });
  };

  const removeMaterialRow = (side, id) => {
    setEngineering((prev) => {
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
  setEngineering((prev) => ({
    ...prev,
    investments: (prev.investments || []).map((row) =>
      row.id === id ? { ...row, ...patch } : row
    ),
  }));
};

const addInvestmentRow = () => {
  setEngineering((prev) => ({
    ...prev,
    investments: [...(prev.investments || []), blankInvestmentRow()],
  }));
};

const removeInvestmentRow = (id) => {
  setEngineering((prev) => {
    const nextRows = (prev.investments || []).filter((row) => row.id !== id);
    return {
      ...prev,
      investments: nextRows,
    };
  });
};


  const saveMasterStatus = async (statusValue) => {
    const updatedPayload = {
      ...payload,
      metadata: {
        ...(payload?.metadata || {}),
        status: statusValue,
      },
    };

    const reqRes = await fetch("/.netlify/functions/save-draft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedPayload),
    });

    return await reqRes.json();
  };
  const moveToUnderEngineeringIfNeeded = async (loadedPayload) => {
  const currentStatus = loadedPayload?.metadata?.status || "";

  if (currentStatus !== "Waiting for Engineering") return;

  try {
    await fetch("/.netlify/functions/save-draft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...loadedPayload,
        metadata: {
          ...(loadedPayload.metadata || {}),
          status: "Under Engineering Review",
        },
      }),
    });

    setPayload((prev) => ({
      ...prev,
      metadata: {
        ...(prev?.metadata || {}),
        status: "Under Engineering Review",
      },
    }));
  } catch (err) {
    console.error("Failed to auto-update engineering status:", err);
  }
};

  const saveEngineeringOnly = async (statusValue) => {
    const res = await fetch("/.netlify/functions/save-engineering-data", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requestId,
        status: statusValue,
        engineerName,
        engineeringData: engineering,
      }),
    });

    return await res.json();
  };

  const saveEngineering = async () => {
    try {
      const engJson = await saveEngineeringOnly("Under Engineering Review");
      if (!engJson.success) {
        alert("Failed to save engineering data");
        return;
      }

      const reqJson = await saveMasterStatus("Under Engineering Review");
      if (!reqJson.success) {
        alert("Engineering saved, but failed to update project status");
        return;
      }

      setSaveMessage("Engineering data saved successfully");
    } catch (e) {
      console.error(e);
      alert("Error saving engineering data");
    }
  };


const createPricing20Workspace = async () => {
  const res = await fetch("/.netlify/functions/save-pricing20-workspace", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requestId,
      status: "Pending pricing",
      customerName: primaryCustomer.customerName || "",
      projectName: project.projectName || "",
      productName: project.projectName || product.productType || "",
      productType: product.productType || "",
      material: product.productMaterial || product.sheetMaterial || "",
      thumbnailUrl:
        product.productThumbnailUrl || product.productThumbnailPreview || "",
      thumbnailBase64: product.productThumbnailBase64 || "",
      engineeringData: engineering || {},
    }),
  });

  return await res.json();
};

const sendToPricing = async () => {
  try {
    const pricingStatus = "Pending pricing";

    const engJson = await saveEngineeringOnly(pricingStatus);
    if (!engJson.success) {
      alert("Failed to save engineering data");
      return;
    }

    const pricing20Json = await createPricing20Workspace();
    if (!pricing20Json.success) {
      console.error("Pricing 2.0 workspace creation failed:", pricing20Json);
      alert(pricing20Json.error || "Failed to open Pricing 2.0");
      return;
    }

    const reqJson = await saveMasterStatus(pricingStatus);
    if (!reqJson.success) {
      alert("Pricing workspace created, but failed to update project status");
      return;
    }

    alert("Sent to Pricing");
    window.location.href = `/pricing20/${requestId}`;
  } catch (err) {
    console.error(err);
    alert("Error sending to pricing");
  }
};

const customerBlock = payload?.customer || {};
const primaryCustomer = customerBlock?.customers?.[0] || {};
const project = payload?.project || {};
const product = payload?.product || {};
const packagingReq = payload?.packaging || {};
const deliveryReq = payload?.delivery || {};
const isSheet = product.productType === "Sheet Roll";

  const thumb =
  product?.productThumbnailUrl ||
  product?.productThumbnailPreview ||
  (product?.productThumbnailBase64
    ? `data:image/*;base64,${product.productThumbnailBase64}`
    : "");

  const requestedBaseMaterial = product.sheetMaterial || product.productMaterial || "";
  const baseMaterial = engineering.materialSheet.baseMaterial || requestedBaseMaterial;
  const autoDensity = DENSITY_MAP[baseMaterial] || 0;
  const density = n(engineering.materialSheet.density) || autoDensity;
const balancedExtrusion = useMemo(() => {
  return getBalancedExtruderSpeeds(
    baseMaterial,
    engineering.materialSheet.layerAPct
  );
}, [baseMaterial, engineering.materialSheet.layerAPct]);
  useEffect(() => {
    const opt = OPT_SPEED_MAP[baseMaterial] || { A: 0, B: 0 };

    setEngineering((prev) => {
      const next = structuredClone(prev);

      if (!next.materialSheet.baseMaterial && requestedBaseMaterial) {
        next.materialSheet.baseMaterial = requestedBaseMaterial;
      }

      if (!next.materialSheet.density && autoDensity) {
        next.materialSheet.density = String(autoDensity);
      }
      
      if (!next.sheetSpecs.netWidth_mm && product.sheetWidthMm) {
        next.sheetSpecs.netWidth_mm = product.sheetWidthMm;
      }

      if (!next.sheetSpecs.thickness_mic && product.sheetThicknessMicron) {
        next.sheetSpecs.thickness_mic = product.sheetThicknessMicron;
      }

      if (!next.sheetSpecs.rollTargetWeight_kg && product.rollWeightKg) {
        next.sheetSpecs.rollTargetWeight_kg = product.rollWeightKg;
      }

      if (!next.sheetSpecs.productDiameter_mm && product.topDiameterMm) {
        next.sheetSpecs.productDiameter_mm = product.topDiameterMm;
      }

      if (!next.sheetPackaging.rollWeight_kg && product.rollWeightKg) {
        next.sheetPackaging.rollWeight_kg = product.rollWeightKg;
      }

      if (!next.sheetPackaging.coreMaterial && product.coreMaterial) {
        next.sheetPackaging.coreMaterial = product.coreMaterial;
      }

      if (!next.thermo.unitWeight_g && product.productWeightG) {
        next.thermo.unitWeight_g = product.productWeightG;
      }

           const balanced = getBalancedExtruderSpeeds(
        next.materialSheet.baseMaterial || requestedBaseMaterial,
        next.materialSheet.layerAPct
      );

      if (!next.extrusion.grossSpeedA_kg_hr && balanced.speedA > 0) {
        next.extrusion.grossSpeedA_kg_hr = String(balanced.speedA.toFixed(2));
      }

      if (!next.extrusion.grossSpeedB_kg_hr && balanced.speedB > 0) {
        next.extrusion.grossSpeedB_kg_hr = String(balanced.speedB.toFixed(2));
      }

      if (!next.packaging.primary.pcsPerStack && packagingReq?.primary?.pcsPerStack) {
        next.packaging.primary.pcsPerStack = packagingReq.primary.pcsPerStack;
      }

      if (!next.packaging.primary.stacksPerPrimary && packagingReq?.primary?.stacksPerBag) {
        next.packaging.primary.stacksPerPrimary = packagingReq.primary.stacksPerBag;
      }

      if (!next.packaging.primary.primaryName && packagingReq?.primary?.bagSleeveMaterial) {
        next.packaging.primary.primaryName = packagingReq.primary.bagSleeveMaterial;
      }

      if (!next.packaging.primary.primaryMaterial && packagingReq?.primary?.bagSleeveMaterial) {
        next.packaging.primary.primaryMaterial = packagingReq.primary.bagSleeveMaterial;
      }

      if (!next.packaging.secondary.primariesPerSecondary && packagingReq?.secondary?.bagsPerCarton) {
        next.packaging.secondary.primariesPerSecondary = packagingReq.secondary.bagsPerCarton;
      }

      if (!next.packaging.secondary.secondaryName && packagingReq?.secondary?.cartonType) {
        next.packaging.secondary.secondaryName = packagingReq.secondary.cartonType;
      }

      if (!next.packaging.pallet.palletType && packagingReq?.pallet?.palletType) {
        next.packaging.pallet.palletType = packagingReq.pallet.palletType;
      }

      if (!next.packaging.pallet.boxesPerPallet && packagingReq?.pallet?.cartonsPerPallet) {
        next.packaging.pallet.boxesPerPallet = packagingReq.pallet.cartonsPerPallet;
      }

      if (
        !next.packaging.pallet.stretchWeightPerPallet_kg &&
        packagingReq?.pallet?.stretchWrapKgPerPallet
      ) {
        next.packaging.pallet.stretchWeightPerPallet_kg = packagingReq.pallet.stretchWrapKgPerPallet;
      }
            if (!next.packaging.primary.primaryLength_mm && packagingReq?.primary?.bagSleeveDimensionsMm) {
        next.packaging.primary.primaryLength_mm = packagingReq.primary.bagSleeveDimensionsMm;
      }

      if (!next.packaging.primary.primaryMaterial && packagingReq?.primary?.bagSleeveMaterial) {
        next.packaging.primary.primaryMaterial = packagingReq.primary.bagSleeveMaterial;
      }

      if (!next.packaging.secondary.secondaryType && packagingReq?.secondary?.cartonType) {
        next.packaging.secondary.secondaryType = packagingReq.secondary.cartonType;
      }

      if (!next.packaging.secondary.secondaryLength_mm && packagingReq?.secondary?.cartonExternalLengthMm) {
  next.packaging.secondary.secondaryLength_mm = packagingReq.secondary.cartonExternalLengthMm;
}

if (!next.packaging.secondary.secondaryWidth_mm && packagingReq?.secondary?.cartonExternalWidthMm) {
  next.packaging.secondary.secondaryWidth_mm = packagingReq.secondary.cartonExternalWidthMm;
}

if (!next.packaging.secondary.secondaryHeight_mm && packagingReq?.secondary?.cartonHeightMm) {
  next.packaging.secondary.secondaryHeight_mm = packagingReq.secondary.cartonHeightMm;
}

if (!next.packaging.pallet.palletLength_mm && packagingReq?.pallet?.palletLengthMm) {
  next.packaging.pallet.palletLength_mm = packagingReq.pallet.palletLengthMm;
}

if (!next.packaging.pallet.palletWidth_mm && packagingReq?.pallet?.palletWidthMm) {
  next.packaging.pallet.palletWidth_mm = packagingReq.pallet.palletWidthMm;
}

if (!next.packaging.pallet.palletHeight_mm && packagingReq?.pallet?.palletHeightMm) {
  next.packaging.pallet.palletHeight_mm = packagingReq.pallet.palletHeightMm;
}

      if (!next.packaging.notes && packagingReq?.primary?.primaryPackagingNotes) {
        next.packaging.notes = packagingReq.primary.primaryPackagingNotes;
      }
      const defaultLayerAPct = OPT_LAYER_A_MAP[baseMaterial];

      if (!next.materialSheet.layerAPct && defaultLayerAPct) {
        next.materialSheet.layerAPct = String((defaultLayerAPct * 100).toFixed(3));
      }
      return next;
    });
  }, [requestedBaseMaterial, autoDensity, baseMaterial, product, packagingReq]);

  useEffect(() => {
    if (!engineering.materialSheet.syncLayerBWithA) return;
    setEngineering((prev) => ({
      ...prev,
      materialSheet: {
        ...prev.materialSheet,
        layerB: (prev.materialSheet.layerA || []).map((r) => ({ ...r })),
      },
    }));
  }, [engineering.materialSheet.syncLayerBWithA, engineering.materialSheet.layerA]);
useEffect(() => {
  if (!engineering.materialSheet.layerAPct || !baseMaterial) return;

  const currentA = n(engineering.extrusion.grossSpeedA_kg_hr);
  const currentB = n(engineering.extrusion.grossSpeedB_kg_hr);

  const autoA = n(balancedExtrusion.speedA);
  const autoB = n(balancedExtrusion.speedB);

  const isEmptyA = !currentA;
  const isEmptyB = !currentB;

  if (isEmptyA || isEmptyB) {
    updateSection("extrusion", {
      grossSpeedA_kg_hr: isEmptyA && autoA ? String(autoA.toFixed(2)) : engineering.extrusion.grossSpeedA_kg_hr,
      grossSpeedB_kg_hr: isEmptyB && autoB ? String(autoB.toFixed(2)) : engineering.extrusion.grossSpeedB_kg_hr,
    });
  }
}, [
  balancedExtrusion.speedA,
  balancedExtrusion.speedB,
  engineering.materialSheet.layerAPct,
  baseMaterial,
]);
  useEffect(() => {
    const coreSize = engineering.sheetSpecs.coreSize || "6 inch";
    const coreDia = CORE_MAP_MM[coreSize] || n(engineering.sheetSpecs.coreDiameter_mm);

    if (String(coreDia) !== String(engineering.sheetSpecs.coreDiameter_mm)) {
      updateSection("sheetSpecs", { coreDiameter_mm: String(coreDia) });
    }

    if (!engineering.sheetPackaging.coreSize) {
      updateSection("sheetPackaging", { coreSize });
    }
  }, [engineering.sheetSpecs.coreSize, engineering.sheetSpecs.coreDiameter_mm, engineering.sheetPackaging.coreSize]);

  const sheetDerived = useMemo(() => {
    const netWidth = n(engineering.sheetSpecs.netWidth_mm);
    const edgeTrim = n(engineering.sheetSpecs.edgeTrimPerSide_mm);
    const grossWidth = netWidth + 2 * edgeTrim;
    const trimLossPct = grossWidth > 0 ? (1 - netWidth / grossWidth) * 100 : 0;

    const thicknessMic = n(engineering.sheetSpecs.thickness_mic);
    const rollDiameter = n(engineering.sheetSpecs.rollDiameter_mm);
    const coreDiameter = n(engineering.sheetSpecs.coreDiameter_mm);
    const rollWeightInput = n(engineering.sheetSpecs.rollTargetWeight_kg);
    const coatingWeightPerM2 = engineering.materialSheet.coatingUsed === "Yes"
      ? n(engineering.materialSheet.coatingWeight_g_m2)
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
      const ringArea_mm2 = area_m2 * 1_000_000 / Math.max(netWidth, 1);
      calcRollDiameter =
        2 *
        Math.sqrt(ringArea_mm2 / Math.PI + (coreDiameter / 2) ** 2);
    }

    const isRound = engineering.sheetSpecs.surfaceMode !== "Manual";
    const productDiameter = n(engineering.sheetSpecs.productDiameter_mm || product.topDiameterMm);
    const manualArea = n(engineering.sheetSpecs.manualSurfaceArea_cm2);

    const surfaceArea_cm2 = isRound
      ? productDiameter > 0
        ? Math.PI * (productDiameter / 20) ** 2
        : 0
      : manualArea;

    const thicknessCalc_mic = n(engineering.sheetSpecs.thicknessCalc_mic);
    const weightCalc_g = n(engineering.sheetSpecs.weightCalc_g || product.productWeightG);

    const calcWeightFromThickness =
      surfaceArea_cm2 > 0 && thicknessCalc_mic > 0 && density > 0
        ? surfaceArea_cm2 * (thicknessCalc_mic / 10000) * density
        : 0;

    const calcThicknessFromWeight =
      surfaceArea_cm2 > 0 && weightCalc_g > 0 && density > 0
        ? (weightCalc_g / (surfaceArea_cm2 * density)) * 10000
        : 0;

   const materialPerTonRows = [];

const layerAShare = n(engineering.materialSheet.layerAPct) / 100;
const layerBShare = 1 - layerAShare;

const grouped = {};

(engineering.materialSheet.layerA || []).forEach((row) => {
  const name = String(row.name || "").trim();
  const pct = n(row.pct) / 100;
  if (!name || pct <= 0) return;

  if (!grouped[name]) {
    grouped[name] = {
      pctLayerA: 0,
      pctLayerB: 0,
    };
  }

  grouped[name].pctLayerA += pct;
});

(engineering.materialSheet.layerB || []).forEach((row) => {
  const name = String(row.name || "").trim();
  const pct = n(row.pct) / 100;
  if (!name || pct <= 0) return;

  if (!grouped[name]) {
    grouped[name] = {
      pctLayerA: 0,
      pctLayerB: 0,
    };
  }

  grouped[name].pctLayerB += pct;
});

Object.entries(grouped).forEach(([name, parts]) => {
  const totalMaterialShare =
    parts.pctLayerA * layerAShare +
    parts.pctLayerB * layerBShare;

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
  }, [engineering.materialSheet, engineering.sheetSpecs, density, product.topDiameterMm, product.productWeightG]);

  useEffect(() => {
    updateSection("sheetSpecs", {
      grossWidth_mm: sheetDerived.grossWidth ? String(sheetDerived.grossWidth.toFixed(2)) : "",
      trimLossPct: sheetDerived.trimLossPct ? String(sheetDerived.trimLossPct.toFixed(2)) : "",
    });
  }, [sheetDerived.grossWidth, sheetDerived.trimLossPct]);

  useEffect(() => {
    if (!engineering.sheetPackaging.rollWeight_kg) {
      const autoWeight = n(engineering.sheetSpecs.rollTargetWeight_kg) || sheetDerived.calcRollWeight;
      if (autoWeight) {
        updateSection("sheetPackaging", { rollWeight_kg: String(autoWeight.toFixed(2)) });
      }
    }
  }, [engineering.sheetPackaging.rollWeight_kg, engineering.sheetSpecs.rollTargetWeight_kg, sheetDerived.calcRollWeight]);

  const extrusionDerived = useMemo(() => {
  const opt = OPT_SPEED_MAP[baseMaterial] || { A: 0, B: 0 };

  const maxA = n(opt.A);
  const maxB = n(opt.B);
  const totalMax = maxA + maxB;

  const layerAPct = n(engineering.materialSheet.layerAPct);
  const layerAFrac = layerAPct / 100;
  const layerBFrac = 1 - layerAFrac;

  const optimumLayerAFrac = OPT_LAYER_A_MAP[baseMaterial] || 0;
  const optimumLayerAPct = optimumLayerAFrac * 100;

  const speedA = n(engineering.extrusion.grossSpeedA_kg_hr);
  const speedB = n(engineering.extrusion.grossSpeedB_kg_hr);
  const totalGross = speedA + speedB;

  const efficiency = n(engineering.extrusion.efficiencyPct) / 100;
  const scrapRate = n(engineering.extrusion.scrapRatePct) / 100;

  const grossWidth = n(engineering.sheetSpecs.grossWidth_mm) || sheetDerived.grossWidth;
  const netWidth = n(engineering.sheetSpecs.netWidth_mm);

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

    if (totalLimitedByA < totalLimitedByB) {
      limitingExtruder = "A";
    } else if (totalLimitedByB < totalLimitedByA) {
      limitingExtruder = "B";
    }
  }

  const recommendedTotalGross = recommendedA + recommendedB;

  const netSpeed =
    totalGross > 0 && grossWidth > 0
      ? totalGross * (netWidth / grossWidth) * (1 - scrapRate) * (efficiency || 1)
      : 0;

  const recommendedNetSpeed =
    recommendedTotalGross > 0 && grossWidth > 0
      ? recommendedTotalGross * (netWidth / grossWidth) * (1 - scrapRate) * (efficiency || 1)
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
    warningMessage = `Layer A % is not optimum for ${baseMaterial}. Recommended Layer A is ${optimumLayerAPct.toFixed(3)}%.`;
  } else if (!isSpeedRatioMatchingLayer) {
    warningMessage = `Entered extruder speeds do not match the selected Layer A %. Actual Layer A from speeds is ${actualLayerAFromSpeedsPct.toFixed(3)}%.`;
  } else if (limitingExtruder) {
    warningMessage = `At Layer A = ${layerAPct.toFixed(3)}%, Extruder ${limitingExtruder} is the limiting extruder. Recommended gross speeds are A = ${recommendedA.toFixed(2)} kg/hr and B = ${recommendedB.toFixed(2)} kg/hr.`;
  }

  return {
    opt,
    maxA,
    maxB,
    totalMax,
    optimumLayerAPct,
    layerAPct,
    actualLayerAFromSpeedsPct,
    layerMismatchPct,
    layerADeviationFromOptimumPct,
    recommendedA,
    recommendedB,
    recommendedTotalGross,
    recommendedNetSpeed,
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
}, [
  engineering.extrusion,
  engineering.sheetSpecs,
  engineering.materialSheet.layerAPct,
  sheetDerived.grossWidth,
  baseMaterial,
]);

  useEffect(() => {
    updateSection("extrusion", {
      totalGrossSpeed_kg_hr: extrusionDerived.totalGross ? String(extrusionDerived.totalGross.toFixed(2)) : "",
      grossVsOptimalPct: extrusionDerived.grossVsOptimalPct ? String(extrusionDerived.grossVsOptimalPct.toFixed(2)) : "",
      netSpeed_kg_hr: extrusionDerived.netSpeed ? String(extrusionDerived.netSpeed.toFixed(2)) : "",
      netVsOptimalPct: extrusionDerived.netVsOptimalPct ? String(extrusionDerived.netVsOptimalPct.toFixed(2)) : "",
      tonsPerHour: extrusionDerived.tph ? String(extrusionDerived.tph.toFixed(3)) : "",
      tonsPerShift12h: extrusionDerived.tonsPerShift12h ? String(extrusionDerived.tonsPerShift12h.toFixed(3)) : "",
      tonsPerDay24h: extrusionDerived.tonsPerDay24h ? String(extrusionDerived.tonsPerDay24h.toFixed(3)) : "",
      tonsPerWeek: extrusionDerived.tonsPerWeek ? String(extrusionDerived.tonsPerWeek.toFixed(3)) : "",
      tonsPerMonth: extrusionDerived.tonsPerMonth ? String(extrusionDerived.tonsPerMonth.toFixed(3)) : "",
      tonsPerYear330d: extrusionDerived.tonsPerYear330d ? String(extrusionDerived.tonsPerYear330d.toFixed(3)) : "",
    });
  }, [extrusionDerived]);

 const thermoDerived = useMemo(() => {
  const cavities = n(engineering.thermo.cavities);
  const cpm = n(engineering.thermo.cpm);
  const eff = n(engineering.thermo.efficiencyPct) / 100;
  const unitWeight_g = n(engineering.thermo.unitWeight_g);
  const sheetUtilizationPct = n(engineering.thermo.sheetUtilizationPct);
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

  const requiredSheetKgPerHour =
    util > 0 ? netProductKgPerHour / util : 0;
  const requiredSheetKgPerShift12h =
    util > 0 ? netProductKgPerShift12h / util : 0;
  const requiredSheetKgPerDay24h =
    util > 0 ? netProductKgPerDay24h / util : 0;

  return {
    pcsPerHour,
    pcsPerShift12h,
    pcsPerDay24h,
    pcsPerWeek,
    pcsPerMonth,
    pcsPerYear330d,
    netProductKgPerHour,
    netProductKgPerShift12h,
    netProductKgPerDay24h,
    requiredSheetKgPerHour,
    requiredSheetKgPerShift12h,
    requiredSheetKgPerDay24h,
  };
}, [engineering.thermo]);

  useEffect(() => {
    updateSection("thermo", {
      pcsPerHour: thermoDerived.pcsPerHour ? String(thermoDerived.pcsPerHour.toFixed(0)) : "",
      pcsPerShift12h: thermoDerived.pcsPerShift12h ? String(thermoDerived.pcsPerShift12h.toFixed(0)) : "",
      pcsPerDay24h: thermoDerived.pcsPerDay24h ? String(thermoDerived.pcsPerDay24h.toFixed(0)) : "",
      pcsPerWeek: thermoDerived.pcsPerWeek ? String(thermoDerived.pcsPerWeek.toFixed(0)) : "",
      pcsPerMonth: thermoDerived.pcsPerMonth ? String(thermoDerived.pcsPerMonth.toFixed(0)) : "",
      pcsPerYear330d: thermoDerived.pcsPerYear330d ? String(thermoDerived.pcsPerYear330d.toFixed(0)) : "",
    });
  }, [thermoDerived]);

  const sheetPackagingSentence = useMemo(() => {
    const coreSize = engineering.sheetPackaging.coreSize || engineering.sheetSpecs.coreSize || "6 inch";
    const rollDia = n(engineering.sheetSpecs.rollDiameter_mm) || sheetDerived.calcRollDiameter;
    const rollW =
      n(engineering.sheetPackaging.rollWeight_kg) ||
      n(engineering.sheetSpecs.rollTargetWeight_kg) ||
      sheetDerived.calcRollWeight;
    const rollsPerPallet = n(engineering.sheetPackaging.rollsPerPallet);
    const separators = n(engineering.sheetPackaging.separatorsPerPallet);
    const strap = n(engineering.sheetPackaging.strapLength_m);
    const stretch = n(engineering.sheetPackaging.stretchKgPerPallet);

    if (!rollW && !rollsPerPallet) return "";

    return `Use ${coreSize} core and make the roll diameter ${fmt(rollDia)} mm at about ${fmt(
      rollW
    )} kg per roll. Put ${fmt(rollsPerPallet, 0)} rolls on a pallet with ${fmt(
      separators,
      0
    )} separators, use ${fmt(strap)} m of strap and full stretch wrap the pallet with ${fmt(
      stretch
    )} kg of stretch film.`;
  }, [engineering.sheetPackaging, engineering.sheetSpecs, sheetDerived]);

  useEffect(() => {
    if (sheetPackagingSentence !== engineering.sheetPackaging.instructionText) {
      updateSection("sheetPackaging", { instructionText: sheetPackagingSentence });
    }
  }, [sheetPackagingSentence]);

  const thermoPackagingDerived = useMemo(() => {
    const pcsPerStack = n(engineering.packaging.primary.pcsPerStack);
    const stacksPerPrimary = n(engineering.packaging.primary.stacksPerPrimary);
    const primariesPerSecondary = n(engineering.packaging.secondary.primariesPerSecondary);
    const boxesPerPallet = n(engineering.packaging.pallet.boxesPerPallet);

    const pcsPerPrimary = pcsPerStack * stacksPerPrimary;
    const pcsPerCarton = pcsPerPrimary * primariesPerSecondary;
    const pcsPerPallet =
      engineering.packaging.pallet.palletSelected === "Yes" ? pcsPerCarton * boxesPerPallet : 0;

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
      if (engineering.packaging.pallet.palletSelected === "Yes") {
        instructionText += ` Load ${fmt(boxesPerPallet, 0)} cartons per pallet.`;
      }
    }

    return {
      pcsPerPrimary,
      pcsPerCarton,
      pcsPerPallet,
      instructionText,
    };
  }, [engineering.packaging]);

  useEffect(() => {
    if (thermoPackagingDerived.instructionText !== engineering.packaging.instructionText) {
      updateSection("packaging", { instructionText: thermoPackagingDerived.instructionText });
    }
  }, [thermoPackagingDerived.instructionText]);
const freightCalc = useMemo(() => {
  const unitWeightKg = (n(engineering.thermo.unitWeight_g) || n(product.productWeightG)) / 1000;

  const cartonLengthMm = n(engineering.packaging.secondary.secondaryLength_mm);
  const cartonWidthMm = n(engineering.packaging.secondary.secondaryWidth_mm);
  const cartonHeightMm = n(engineering.packaging.secondary.secondaryHeight_mm);

  const cartonVolume_m3 =
    cartonLengthMm > 0 && cartonWidthMm > 0 && cartonHeightMm > 0
      ? (cartonLengthMm * cartonWidthMm * cartonHeightMm) / 1_000_000_000
      : 0;

  const pcsPerCarton = n(thermoPackagingDerived.pcsPerCarton);
  const cartonWeight_kg =
    !isSheet && pcsPerCarton > 0 && unitWeightKg > 0
      ? pcsPerCarton * unitWeightKg
      : 0;

  const palletLength_mm = isSheet
    ? n(engineering.sheetPackaging.palletLength_mm)
    : n(engineering.packaging.pallet.palletLength_mm);

  const palletWidth_mm = isSheet
    ? n(engineering.sheetPackaging.palletWidth_mm)
    : n(engineering.packaging.pallet.palletWidth_mm);

  const palletHeight_mm = isSheet
    ? n(engineering.sheetPackaging.palletHeight_mm)
    : n(engineering.packaging.pallet.palletHeight_mm);

  const palletVolume_m3 =
    palletLength_mm > 0 && palletWidth_mm > 0 && palletHeight_mm > 0
      ? (palletLength_mm * palletWidth_mm * palletHeight_mm) / 1_000_000_000
      : 0;

  let palletWeight_kg = 0;
  let pcsPerPallet = 0;
  let cartonsPerPallet = 0;
  let rollsPerPallet = 0;

  if (isSheet) {
    rollsPerPallet = n(engineering.sheetPackaging.rollsPerPallet);
    const rollWeight =
      n(engineering.sheetPackaging.rollWeight_kg) ||
      n(engineering.sheetSpecs.rollTargetWeight_kg) ||
      sheetDerived.calcRollWeight;
    palletWeight_kg = rollsPerPallet * rollWeight;
  } else {
    cartonsPerPallet = n(engineering.packaging.pallet.boxesPerPallet);
    pcsPerPallet = n(thermoPackagingDerived.pcsPerPallet);
    palletWeight_kg = cartonsPerPallet * cartonWeight_kg;
  }

  const palletType = isSheet
    ? engineering.sheetPackaging.palletType
    : engineering.packaging.pallet.palletType;

  const palletLookup =
    palletType === "EURO" ? PALLETS_PER_CONTAINER.EURO :
    palletType === "UK" ? PALLETS_PER_CONTAINER.UK :
    null;

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

    const palletSelected = engineering.packaging.pallet.palletSelected === "Yes";

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
        maxCartonsByVolume > 0
          ? `${minCartonsByVolume} - ${maxCartonsByVolume}`
          : "",
      pcs: avgCartons * pcsPerCarton,
      rolls: 0,
      netWeight_kg: avgCartons * cartonWeight_kg,
    };
  };

  const c20 = makeContainerRow("20ft Dry");
  const c40 = makeContainerRow("40ft Dry");
  const c40hc = makeContainerRow("40ft High Cube");

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
        netWeight_kg: rolls * (n(engineering.sheetPackaging.rollWeight_kg) ||
          n(engineering.sheetSpecs.rollTargetWeight_kg) ||
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

  const smallTruck = buildTruckRow(
    engineering.freight.smallTruck_pallets,
    engineering.freight.smallTruck_cartons
  );
  const mediumTruck = buildTruckRow(
    engineering.freight.mediumTruck_pallets,
    engineering.freight.mediumTruck_cartons
  );
  const largeTruck = buildTruckRow(
    engineering.freight.largeTruck_pallets,
    engineering.freight.largeTruck_cartons
  );
  const doubleTrailer = buildTruckRow(
    engineering.freight.doubleTrailer_pallets,
    engineering.freight.doubleTrailer_cartons
  );

  return {
    cartonVolume_m3,
    cartonWeight_kg,
    palletLength_mm,
    palletWidth_mm,
    palletHeight_mm,
    palletVolume_m3,
    palletWeight_kg,
    pcsPerPallet,
    cartonsPerPallet,
    rollsPerPallet,
    c20,
    c40,
    c40hc,
    smallTruck,
    mediumTruck,
    largeTruck,
    doubleTrailer,
  };
}, [
  isSheet,
  engineering.freight,
  engineering.sheetPackaging,
  engineering.sheetSpecs,
  engineering.packaging,
  engineering.thermo.unitWeight_g,
  product.productWeightG,
  thermoPackagingDerived,
  sheetDerived.calcRollWeight,
]);
  const freightDerived = useMemo(() => {
    const unitWeightG = n(engineering.thermo.unitWeight_g) || n(product.productWeightG);

    if (isSheet) {
      const palletsPerTruck = n(engineering.freight.palletsPerTruck);
      const rollsPerPallet = n(engineering.sheetPackaging.rollsPerPallet);
      const rollWeight =
        n(engineering.sheetPackaging.rollWeight_kg) ||
        n(engineering.sheetSpecs.rollTargetWeight_kg) ||
        sheetDerived.calcRollWeight;

      return {
        cartonsPerTruck: 0,
        pcsPerTruck: 0,
        netProductWeightPerTruck_kg: palletsPerTruck * rollsPerPallet * rollWeight,
      };
    }

    const palletSelected = engineering.packaging.pallet.palletSelected === "Yes";
    const boxesPerPallet = n(engineering.packaging.pallet.boxesPerPallet);
    let palletsPerTruck = 0;
    let cartonsPerTruck = 0;

    if (palletSelected) {
      palletsPerTruck = n(engineering.freight.palletsPerTruck);
      cartonsPerTruck = palletsPerTruck * boxesPerPallet;
    } else {
      cartonsPerTruck = n(engineering.freight.cartonsPerTruck);
    }

    const pcsPerTruck = cartonsPerTruck * thermoPackagingDerived.pcsPerCarton;
    const netProductWeightPerTruck_kg = (pcsPerTruck * unitWeightG) / 1000;

    return {
      cartonsPerTruck,
      pcsPerTruck,
      netProductWeightPerTruck_kg,
    };
  }, [
    isSheet,
    engineering.freight,
    engineering.sheetPackaging,
    engineering.sheetSpecs,
    engineering.packaging,
    engineering.thermo.unitWeight_g,
    product.productWeightG,
    sheetDerived.calcRollWeight,
    thermoPackagingDerived.pcsPerCarton,
  ]);

  useEffect(() => {
  updateSection("freight", {
    cartonVolume_m3: freightCalc.cartonVolume_m3
      ? String(freightCalc.cartonVolume_m3.toFixed(6))
      : "",
    cartonWeight_kg: freightCalc.cartonWeight_kg
      ? String(freightCalc.cartonWeight_kg.toFixed(3))
      : "",

    palletLength_mm: freightCalc.palletLength_mm
      ? String(freightCalc.palletLength_mm)
      : "",
    palletWidth_mm: freightCalc.palletWidth_mm
      ? String(freightCalc.palletWidth_mm)
      : "",
    palletHeight_mm: freightCalc.palletHeight_mm
      ? String(freightCalc.palletHeight_mm)
      : "",
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

    container40hc_pallets: freightCalc.c40hc.pallets ? String(freightCalc.c40hc.pallets) : "",

    container40hc_cartons: freightCalc.c40hc.cartons ? String(freightCalc.c40hc.cartons) : "",
    
    container40hc_pcs: freightCalc.c40hc.pcs ? String(freightCalc.c40hc.pcs) : "",
    container40hc_cartonsRange: freightCalc.c40hc.cartonsRange || "",
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

    doubleTrailer_pcs: freightCalc.doubleTrailer.pcs ? String(freightCalc.doubleTrailer.pcs) : "",
    doubleTrailer_rolls: freightCalc.doubleTrailer.rolls ? String(freightCalc.doubleTrailer.rolls) : "",
    doubleTrailer_netWeight_kg: freightCalc.doubleTrailer.netWeight_kg
      ? String(freightCalc.doubleTrailer.netWeight_kg.toFixed(2))
      : "",
  });
}, [freightCalc]);
const layerATotalPct = (engineering.materialSheet.layerA || []).reduce(
  (sum, row) => sum + n(row.pct),
  0
);

const layerBTotalPct = (engineering.materialSheet.layerB || []).reduce(
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
  ) + (engineering.materialSheet.coatingUsed === "Yes" ? n(sheetDerived.coatingKgPerTon) : 0);

const bomPctIsValid = Math.abs(bomTotalPct - 100) < 0.01;
const bomKgIsValid = Math.abs(bomTotalKgPerTon - 1000) < 0.01;
  const requestedWeight = n(product.productWeightG);
  const weightDiffPct =
    requestedWeight > 0 &&
    n(engineering.sheetSpecs.weightCalc_g || product.productWeightG) > 0
      ? ((n(engineering.sheetSpecs.weightCalc_g || product.productWeightG) - requestedWeight) / requestedWeight) * 100
      : 0;

  const totalOptGross = (OPT_SPEED_MAP[baseMaterial]?.A || 0) + (OPT_SPEED_MAP[baseMaterial]?.B || 0);

// ✅ STEP 6 — PUT IT HERE
const recommendedLayerAPct =
  balancedExtrusion.recommendedLayerA || 0;

const enteredLayerAPct = n(engineering.materialSheet.layerAPct);

const layerAIsNonOptimal =
  enteredLayerAPct > 0 &&
  Math.abs(enteredLayerAPct - recommendedLayerAPct) > 0.01;

const enteredSpeedA = n(engineering.extrusion.grossSpeedA_kg_hr);
const enteredSpeedB = n(engineering.extrusion.grossSpeedB_kg_hr);

const recommendedSpeedA = n(balancedExtrusion.speedA);
const recommendedSpeedB = n(balancedExtrusion.speedB);

const extrusionSpeedMismatch =
  Math.abs(enteredSpeedA - recommendedSpeedA) > 0.5 ||
  Math.abs(enteredSpeedB - recommendedSpeedB) > 0.5;
  const requestDecorationType = product.productType === "Sheet Roll"
  ? "No decoration"
  : (payload?.decoration?.decorationType || "No decoration");

const hasRequestDecoration =
  requestDecorationType &&
  requestDecorationType !== "No decoration";

const showDecorationSection =
  !isSheet && (hasRequestDecoration || engineering.decorationEngineering?.enabled);

const investmentTotalEGP = (engineering.investments || []).reduce((sum, row) => {
  const value = n(row.value);
  const rate = n(row.exchangeRate);

  if (!value) return sum;

  if (row.currency === "EGP") return sum + value;
  if ((row.currency === "USD" || row.currency === "EUR") && rate > 0) {
    return sum + value * rate;
  }

  return sum;
}, 0);
const netWidthValue = n(engineering.sheetSpecs.netWidth_mm);
const edgeTrimValue = n(engineering.sheetSpecs.edgeTrimPerSide_mm);
const widthTolMinusValue = n(engineering.sheetSpecs.widthTolMinus_mm);
const widthTolPlusValue = n(engineering.sheetSpecs.widthTolPlus_mm);

const grossWidthMinusCalc =
  netWidthValue > 0
    ? Math.max(netWidthValue - widthTolMinusValue, 0) + 2 * edgeTrimValue
    : 0;

const grossWidthPlusCalc =
  netWidthValue > 0
    ? netWidthValue + widthTolPlusValue + 2 * edgeTrimValue
    : 0;
if (!payload) {
  return <div className="p-6">Loading...</div>;
}
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <div className="text-sm text-gray-500">Engineering Review</div>
          <div className="text-xl font-bold">{requestId}</div>
        </div>

        <Link
          to="/engineering-dashboard"
          className="border px-4 py-2 rounded-lg text-sm bg-white"
        >
          ← Back
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow p-5 space-y-4">
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

          <div className="flex-1 min-w-[220px]">
  <div className="text-xs uppercase tracking-wide text-gray-500">Project</div>

  <div className="text-xl font-semibold">
    {project.projectName || "—"}
  </div>

  {/* 👇 ADD THIS LINE HERE */}
  <div className="text-sm text-blue-600 font-medium">
    {isSheet ? "Sheet Product Flow" : "Thermoformed Product Flow"}
  </div>

  <div className="text-sm text-gray-500">
    {product.productType || "—"} • {requestedBaseMaterial || "—"}
  </div>
</div>

      <div className="min-w-[220px]">
  <Field
    label="Engineer Name"
    requestValue=""
    currentValue={engineerName}
  >
    <Input value={engineerName} onChange={setEngineerName} />
  </Field>
</div>
          <div className="flex items-end">
            <button
              onClick={saveEngineering}
              className="bg-black text-white rounded-lg px-4 py-2"
            >
              Save Engineering
            </button>
          </div>

          <div className="flex items-end">
            <button
              onClick={sendToPricing}
              className="bg-green-600 text-white rounded-lg px-4 py-2"
            >
              Send to Pricing
            </button>
          </div>
        </div>

        <div className="text-sm text-green-600">{saveMessage}</div>
      </div>

     <Section title="1. Material Structure and Sheet Roll">
          <div className="space-y-5">
          <div className="rounded-xl border p-4 space-y-4">
  <div className="font-medium">Base Material</div>

  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
    <Field
      label="Base Material"
      requestValue={requestValueOrBlank(requestedBaseMaterial)}
      currentValue={engineering.materialSheet.baseMaterial}
    >
      <SelectField
        value={engineering.materialSheet.baseMaterial}
        onChange={(v) => {
          const opt = OPT_SPEED_MAP[v] || { A: "", B: "" };
          updateSection("materialSheet", {
            baseMaterial: v,
            density: DENSITY_MAP[v]
              ? String(DENSITY_MAP[v])
              : engineering.materialSheet.density,
          });
          updateSection("extrusion", {
            grossSpeedA_kg_hr: opt.A
              ? String(opt.A)
              : engineering.extrusion.grossSpeedA_kg_hr,
            grossSpeedB_kg_hr: opt.B
              ? String(opt.B)
              : engineering.extrusion.grossSpeedB_kg_hr,
          });
        }}
        options={["PET", "PP", "PS", "Other"]}
      />
    </Field>

    <Field
      label="Density (g/cm³)"
      requestValue={requestValueOrBlank(DENSITY_MAP[requestedBaseMaterial] || "")}
      currentValue={engineering.materialSheet.density}
    >
      <Input
        value={engineering.materialSheet.density}
        onChange={(v) => updateSection("materialSheet", { density: v })}
      />
    </Field>

    <Field
      label="Structure"
      requestValue="AB"
      currentValue={engineering.materialSheet.structure}
    >
      <SelectField
        value={engineering.materialSheet.structure}
        onChange={(v) => updateSection("materialSheet", { structure: v })}
        options={["AB", "ABA"]}
      />
    </Field>

    <Field
      label="Layer A %"
      requestValue=""
      currentValue={engineering.materialSheet.layerAPct}
    >
      <Input
        value={engineering.materialSheet.layerAPct}
        onChange={(v) => updateSection("materialSheet", { layerAPct: v })}
      />
        {!extrusionDerived.isLayerAOptimum && baseMaterial ? (
    <div className="mt-2 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-700 p-2 text-xs">
      This Layer A % is not optimum for {baseMaterial}. Recommended:
      {" "}
      {fmt(extrusionDerived.optimumLayerAPct, 3)}%
    </div>
  ) : null}
      {(n(engineering.materialSheet.layerAPct) < 0 ||
        n(engineering.materialSheet.layerAPct) > 100) && (
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

    <Field
      label="Process Waste %"
      requestValue=""
      currentValue={engineering.materialSheet.processWastePct}
    >
      <Input
        value={engineering.materialSheet.processWastePct}
        onChange={(v) => updateSection("materialSheet", { processWastePct: v })}
      />
    </Field>

    <Field
      label="Coating Layer Used"
      requestValue="No"
      currentValue={engineering.materialSheet.coatingUsed}
    >
      <SelectField
        value={engineering.materialSheet.coatingUsed}
        onChange={(v) => updateSection("materialSheet", { coatingUsed: v })}
        options={["Yes", "No"]}
      />
    </Field>
  </div>
</div>
            {engineering.materialSheet.coatingUsed === "Yes" && (
  <div className="rounded-xl border p-4 space-y-4">
    <div className="font-medium">Coating</div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <Field
        label="Coating Name"
        requestValue=""
        currentValue={engineering.materialSheet.coatingName}
      >
        <Input
          value={engineering.materialSheet.coatingName}
          onChange={(v) => updateSection("materialSheet", { coatingName: v })}
        />
      </Field>

      <Field
        label="Coating Weight (g/m²)"
        requestValue=""
        currentValue={engineering.materialSheet.coatingWeight_g_m2}
      >
        <Input
          value={engineering.materialSheet.coatingWeight_g_m2}
          onChange={(v) =>
            updateSection("materialSheet", { coatingWeight_g_m2: v })
          }
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
    {engineering.materialSheet.coatingUsed === "Yes"
      ? `${fmt(sheetDerived.coatingShare * 100, 2)}%`
      : "0.00%"}{" "}
    —{" "}
    {engineering.materialSheet.coatingUsed === "Yes"
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

          {engineering.materialSheet.coatingUsed === "Yes" && (
            <tr className="border-t bg-yellow-50">
              <td className="p-3">
                {engineering.materialSheet.coatingName || "Coating"}
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
        checked={engineering.materialSheet.syncLayerBWithA}
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
        {(engineering.materialSheet.layerA || []).map((row) => (
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
              >
                ×
              </button>
            </div>
          </div>
        ))}
        <button
          className="border rounded-lg px-3 py-2 text-sm"
          onClick={() => addMaterialRow("layerA")}
        >
          + Add Layer A Material
        </button>
      </div>

      <div className="space-y-2">
        <div className="font-medium text-sm">Layer B</div>
        {(engineering.materialSheet.layerB || []).map((row) => (
          <div key={row.id} className="grid grid-cols-12 gap-2">
            <div className="col-span-7">
              <Input
                value={row.name}
                onChange={(v) => updateMaterialRow("layerB", row.id, { name: v })}
                placeholder="Material name"
                disabled={engineering.materialSheet.syncLayerBWithA}
              />
            </div>
            <div className="col-span-4">
              <Input
                value={row.pct}
                onChange={(v) => updateMaterialRow("layerB", row.id, { pct: v })}
                placeholder="% in layer"
                disabled={engineering.materialSheet.syncLayerBWithA}
              />
            </div>
            <div className="col-span-1">
              <button
                className="w-full border rounded-lg p-2"
                onClick={() => removeMaterialRow("layerB", row.id)}
                disabled={engineering.materialSheet.syncLayerBWithA}
              >
                ×
              </button>
            </div>
          </div>
        ))}
        {!engineering.materialSheet.syncLayerBWithA && (
          <button
            className="border rounded-lg px-3 py-2 text-sm"
            onClick={() => addMaterialRow("layerB")}
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

  <div className="grid grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)] gap-5 items-start">
    <div className="rounded-xl border bg-gray-50 p-3">
      <img
        src={SHEET_SPEC_IMAGE}
        alt="Sheet roll specification guide"
        className="w-full rounded-lg bg-white object-contain"
      />
    </div>

    <div className="space-y-3">
      <div className="overflow-auto rounded-xl border">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-3 font-medium w-[220px]">Dimension</th>
              <th className="text-left p-3 font-medium min-w-[170px]">Value</th>
              <th className="text-left p-3 font-medium min-w-[140px]">- tol</th>
              <th className="text-left p-3 font-medium min-w-[140px]">+ tol</th>
            </tr>
          </thead>

          <tbody>
            <tr className="border-t">
              <td className="p-3 font-medium">Net Width (mm)</td>
              <td className="p-2">
                <Input
                  value={engineering.sheetSpecs.netWidth_mm}
                  onChange={(v) => updateSection("sheetSpecs", { netWidth_mm: v })}
                />
                {product.sheetWidthMm ? (
                  <div className="mt-1 text-xs text-gray-400">
                    Request: {product.sheetWidthMm}
                  </div>
                ) : null}
              </td>
              <td className="p-2">
                <Input
                  value={engineering.sheetSpecs.widthTolMinus_mm}
                  onChange={(v) => updateSection("sheetSpecs", { widthTolMinus_mm: v })}
                />
              </td>
              <td className="p-2">
                <Input
                  value={engineering.sheetSpecs.widthTolPlus_mm}
                  onChange={(v) => updateSection("sheetSpecs", { widthTolPlus_mm: v })}
                />
              </td>
            </tr>

            <tr className="border-t">
              <td className="p-3 font-medium">Edge Trim Width (one side)</td>
              <td className="p-2">
                <Input
                  value={engineering.sheetSpecs.edgeTrimPerSide_mm}
                  onChange={(v) =>
                    updateSection("sheetSpecs", { edgeTrimPerSide_mm: v })
                  }
                />
              </td>
              <td className="p-2">
                <Input value="" onChange={() => {}} disabled />
              </td>
              <td className="p-2">
                <Input value="" onChange={() => {}} disabled />
              </td>
            </tr>

            <tr className="border-t bg-yellow-50">
              <td className="p-3 font-medium">Gross Width (mm)</td>
              <td className="p-2">
                <Input
                  value={sheetDerived.grossWidth ? fmt(sheetDerived.grossWidth, 2) : ""}
                  onChange={() => {}}
                  disabled
                />
              </td>
              <td className="p-2">
                <Input
                  value={grossWidthMinusCalc ? fmt(grossWidthMinusCalc, 2) : ""}
                  onChange={() => {}}
                  disabled
                />
              </td>
              <td className="p-2">
                <Input
                  value={grossWidthPlusCalc ? fmt(grossWidthPlusCalc, 2) : ""}
                  onChange={() => {}}
                  disabled
                />
              </td>
            </tr>

            <tr className="border-t">
              <td className="p-3 font-medium">Thickness (microns)</td>
              <td className="p-2">
                <Input
                  value={engineering.sheetSpecs.thickness_mic}
                  onChange={(v) => updateSection("sheetSpecs", { thickness_mic: v })}
                />
                {product.sheetThicknessMicron ? (
                  <div className="mt-1 text-xs text-gray-400">
                    Request: {product.sheetThicknessMicron}
                  </div>
                ) : null}
              </td>
              <td className="p-2">
                <Input
                  value={engineering.sheetSpecs.thicknessTolMinus_mic}
                  onChange={(v) =>
                    updateSection("sheetSpecs", { thicknessTolMinus_mic: v })
                  }
                />
              </td>
              <td className="p-2">
                <Input
                  value={engineering.sheetSpecs.thicknessTolPlus_mic}
                  onChange={(v) =>
                    updateSection("sheetSpecs", { thicknessTolPlus_mic: v })
                  }
                />
              </td>
            </tr>

            <tr className="border-t">
              <td className="p-3 font-medium">Core Diameter</td>
              <td className="p-2">
                <SelectField
                  value={engineering.sheetSpecs.coreSize}
                  onChange={(v) => updateSection("sheetSpecs", { coreSize: v })}
                  options={["3 inch", "6 inch", "8 inch"]}
                />
              </td>
              <td className="p-2">
                <Input
                  value={engineering.sheetSpecs.coreDiameter_mm}
                  onChange={() => {}}
                  disabled
                />
              </td>
              <td className="p-3 text-xs text-gray-500 align-middle">
                Calculated in mm
              </td>
            </tr>

            <tr className="border-t">
              <td className="p-3 font-medium">Roll Diameter (mm)</td>
              <td className="p-2">
                <Input
                  value={engineering.sheetSpecs.rollDiameter_mm}
                  onChange={(v) => updateSection("sheetSpecs", { rollDiameter_mm: v })}
                />
              </td>
              <td className="p-3 text-xs text-gray-500" colSpan={2}>
                Auto from roll weight if left blank:{" "}
                {sheetDerived.calcRollDiameter
                  ? `${fmt(sheetDerived.calcRollDiameter, 2)} mm`
                  : "—"}
              </td>
            </tr>

            <tr className="border-t">
              <td className="p-3 font-medium">Roll Weight (kg)</td>
              <td className="p-2">
                <Input
                  value={engineering.sheetSpecs.rollTargetWeight_kg}
                  onChange={(v) =>
                    updateSection("sheetSpecs", { rollTargetWeight_kg: v })
                  }
                />
                {product.rollWeightKg ? (
                  <div className="mt-1 text-xs text-gray-400">
                    Request: {product.rollWeightKg}
                  </div>
                ) : null}
              </td>
              <td className="p-3 text-xs text-gray-500" colSpan={2}>
                Auto from roll diameter if left blank:{" "}
                {sheetDerived.calcRollWeight
                  ? `${fmt(sheetDerived.calcRollWeight, 3)} kg`
                  : "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border bg-gray-50 p-3 text-xs text-gray-600">
        Gross width = net width + 2 × edge trim width. You can enter either roll
        diameter or roll weight; the other value is automatically calculated.
      </div>

      {sheetDerived.trimLossPct > 15 && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
          Width trim loss exceeds 15%.
        </div>
      )}

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
          label="Trim Loss %"
          value={
            sheetDerived.trimLossPct
              ? `${fmt(sheetDerived.trimLossPct, 2)}%`
              : "—"
          }
        />
        <RefRow
          label="Core Diameter (mm)"
          value={engineering.sheetSpecs.coreDiameter_mm || "—"}
        />
      </div>
    </div>
  </div>
</div>
                   </div>
</Section>

   <Section title="2. Extrusion Process Data">
  <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
       

   <div className="space-y-4 xl:col-span-3">
  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <Field
  label="Line Name"
  requestValue="Breyer"
  currentValue={engineering.extrusion.lineName}
>
  <Input
    value={engineering.extrusion.lineName}
    onChange={(v) => updateSection("extrusion", { lineName: v })}
  />
</Field>
              <Field
  label="Scrap Rate %"
  requestValue=""
  currentValue={engineering.extrusion.scrapRatePct}
>
  <Input
    value={engineering.extrusion.scrapRatePct}
    onChange={(v) => updateSection("extrusion", { scrapRatePct: v })}
  />
</Field>
              <Field label="Non Recoverable Changeover Waste (kg)">
                <Input
                  value={engineering.extrusion.changeoverWasteKg}
                  onChange={(v) => updateSection("extrusion", { changeoverWasteKg: v })}
                />
              </Field>
              <Field label="Startup Waste % (ignored)">
                <Input
                  value={engineering.extrusion.startupWastePct}
                  onChange={(v) => updateSection("extrusion", { startupWastePct: v })}
                />
              </Field>
              <Field
  label="Efficiency %"
  requestValue=""
  currentValue={engineering.extrusion.efficiencyPct}
>
  <Input
    value={engineering.extrusion.efficiencyPct}
    onChange={(v) => updateSection("extrusion", { efficiencyPct: v })}
  />
</Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <Field
  label={`Gross Speed Extruder A (optimum ${OPT_SPEED_MAP[baseMaterial]?.A || 0} kg/hr)`}
  requestValue={requestValueOrBlank(OPT_SPEED_MAP[baseMaterial]?.A || "")}
  currentValue={engineering.extrusion.grossSpeedA_kg_hr}
>
  <Input
    value={engineering.extrusion.grossSpeedA_kg_hr}
    onChange={(v) => updateSection("extrusion", { grossSpeedA_kg_hr: v })}
  />
</Field>

              <Field
  label={`Gross Speed Extruder B (optimum ${OPT_SPEED_MAP[baseMaterial]?.B || 0} kg/hr)`}
  requestValue={requestValueOrBlank(OPT_SPEED_MAP[baseMaterial]?.B || "")}
  currentValue={engineering.extrusion.grossSpeedB_kg_hr}
>
  <Input
    value={engineering.extrusion.grossSpeedB_kg_hr}
    onChange={(v) => updateSection("extrusion", { grossSpeedB_kg_hr: v })}
  />
</Field>

              <Field label="Total Gross Speed (kg/hr)">
                <Input value={engineering.extrusion.totalGrossSpeed_kg_hr} onChange={() => {}} disabled />
              </Field>

              <Field label="Gross / Optimum %">
                <Input value={engineering.extrusion.grossVsOptimalPct} onChange={() => {}} disabled />
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
    Recommended matched speeds for current layer split:
    {" "}A = {fmt(recommendedSpeedA, 2)} kg/hr, B = {fmt(recommendedSpeedB, 2)} kg/hr.
    {extrusionSpeedMismatch
      ? " Entered speeds differ from the matched optimum for this layer ratio."
      : " Entered speeds match the recommended ratio."}
  </div>
)}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Field label="Net Speed (kg/hr)">
                <Input value={engineering.extrusion.netSpeed_kg_hr} onChange={() => {}} disabled />
              </Field>
              <Field label="Net / Optimum %">
                <Input value={engineering.extrusion.netVsOptimalPct} onChange={() => {}} disabled />
              </Field>
              <Field label="Tons / Hr">
                <Input value={engineering.extrusion.tonsPerHour} onChange={() => {}} disabled />
              </Field>
              <Field label="Tons / Shift (12h)">
                <Input value={engineering.extrusion.tonsPerShift12h} onChange={() => {}} disabled />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Field label="Tons / Day (24h)">
                <Input value={engineering.extrusion.tonsPerDay24h} onChange={() => {}} disabled />
              </Field>
              <Field label="Tons / Week">
                <Input value={engineering.extrusion.tonsPerWeek} onChange={() => {}} disabled />
              </Field>
              <Field label="Tons / Month">
                <Input value={engineering.extrusion.tonsPerMonth} onChange={() => {}} disabled />
              </Field>
              <Field label="Tons / Year (330d)">
                <Input value={engineering.extrusion.tonsPerYear330d} onChange={() => {}} disabled />
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
            value={engineering.thermo.machineName}
            onChange={(v) => updateSection("thermo", { machineName: v })}
            options={["RDM73K", "RDK80"]}
          />
        </Field>

        <Field
          label="Product Weight (g)"
          requestValue={requestValueOrBlank(product.productWeightG)}
          currentValue={engineering.thermo.unitWeight_g}
        >
          <Input
            value={engineering.thermo.unitWeight_g}
            onChange={(v) => updateSection("thermo", { unitWeight_g: v })}
          />
        </Field>

        <Field label="Cavities">
          <Input
            value={engineering.thermo.cavities}
            onChange={(v) => updateSection("thermo", { cavities: v })}
          />
        </Field>

        <Field label="CPM">
          <Input
            value={engineering.thermo.cpm}
            onChange={(v) => updateSection("thermo", { cpm: v })}
          />
        </Field>

        <Field label="Efficiency %">
          <Input
            value={engineering.thermo.efficiencyPct}
            onChange={(v) => updateSection("thermo", { efficiencyPct: v })}
          />
        </Field>

        <Field label="Sheet Utilization %">
          <Input
            value={engineering.thermo.sheetUtilizationPct}
            onChange={(v) => updateSection("thermo", { sheetUtilizationPct: v })}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <RefRow label="Pcs / Hr" value={engineering.thermo.pcsPerHour} />
        <RefRow label="Pcs / Shift (12h)" value={engineering.thermo.pcsPerShift12h} />
        <RefRow label="Pcs / Day" value={engineering.thermo.pcsPerDay24h} />
        <RefRow label="Pcs / Week" value={engineering.thermo.pcsPerWeek} />
        <RefRow label="Pcs / Month" value={engineering.thermo.pcsPerMonth} />
        <RefRow label="Pcs / Year" value={engineering.thermo.pcsPerYear330d} />
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
          checked={engineering.thermo.enterToolData === true}
          onChange={(e) =>
            updateSection("thermo", { enterToolData: e.target.checked })
          }
        />
        <div className="font-medium">Enter tool data</div>
      </div>

      {engineering.thermo.enterToolData && (
        <div className="rounded-xl border p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Field label="Base Mold Name">
              <Input
                value={engineering.tooling.moldBaseName}
                onChange={(v) =>
                  updateSection("tooling", { moldBaseName: v, enabled: true })
                }
              />
            </Field>
            <Field label="Base Mold Code">
              <Input
                value={engineering.tooling.moldBaseCode}
                onChange={(v) =>
                  updateSection("tooling", { moldBaseCode: v, enabled: true })
                }
              />
            </Field>

            <Field label="Mold Insert Name">
              <Input
                value={engineering.tooling.moldInsertName}
                onChange={(v) =>
                  updateSection("tooling", { moldInsertName: v, enabled: true })
                }
              />
            </Field>
            <Field label="Mold Insert Code">
              <Input
                value={engineering.tooling.moldInsertCode}
                onChange={(v) =>
                  updateSection("tooling", { moldInsertCode: v, enabled: true })
                }
              />
            </Field>

            <Field label="Mold Bottom / Engraving Name">
              <Input
                value={engineering.tooling.moldBottomName}
                onChange={(v) =>
                  updateSection("tooling", { moldBottomName: v, enabled: true })
                }
              />
            </Field>
            <Field label="Mold Bottom / Engraving Code">
              <Input
                value={engineering.tooling.moldBottomCode}
                onChange={(v) =>
                  updateSection("tooling", { moldBottomCode: v, enabled: true })
                }
              />
            </Field>

            <Field label="Cutting Plate Name">
              <Input
                value={engineering.tooling.cuttingPlateName}
                onChange={(v) =>
                  updateSection("tooling", { cuttingPlateName: v, enabled: true })
                }
              />
            </Field>
            <Field label="Cutting Plate Code">
              <Input
                value={engineering.tooling.cuttingPlateCode}
                onChange={(v) =>
                  updateSection("tooling", { cuttingPlateCode: v, enabled: true })
                }
              />
            </Field>

            <Field label="Stacking Unit Name">
              <Input
                value={engineering.tooling.stackingUnitName}
                onChange={(v) =>
                  updateSection("tooling", { stackingUnitName: v, enabled: true })
                }
              />
            </Field>
            <Field label="Stacking Unit Code">
              <Input
                value={engineering.tooling.stackingUnitCode}
                onChange={(v) =>
                  updateSection("tooling", { stackingUnitCode: v, enabled: true })
                }
              />
            </Field>

            <Field label="Plug Assist Name">
              <Input
                value={engineering.tooling.plugAssistName}
                onChange={(v) =>
                  updateSection("tooling", { plugAssistName: v, enabled: true })
                }
              />
            </Field>
            <Field label="Plug Assist Code">
              <Input
                value={engineering.tooling.plugAssistCode}
                onChange={(v) =>
                  updateSection("tooling", { plugAssistCode: v, enabled: true })
                }
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
            checked={engineering.decorationEngineering.enabled === true}
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
              <Field label="Coverage Area %">
                <Input
                  value={engineering.decorationEngineering.print.coverageAreaPct}
                  onChange={(v) =>
                    setEngineering((prev) => ({
                      ...prev,
                      decorationEngineering: {
                        ...prev.decorationEngineering,
                        print: {
                          ...prev.decorationEngineering.print,
                          coverageAreaPct: v,
                        },
                      },
                    }))
                  }
                />
              </Field>

              <Field label="Ink Weight / 1000 Cups">
                <Input
                  value={engineering.decorationEngineering.print.inkWeightPer1000Cups}
                  onChange={(v) =>
                    setEngineering((prev) => ({
                      ...prev,
                      decorationEngineering: {
                        ...prev.decorationEngineering,
                        print: {
                          ...prev.decorationEngineering.print,
                          inkWeightPer1000Cups: v,
                        },
                      },
                    }))
                  }
                />
              </Field>

              <Field label="No. of Colors">
                <Input
                  value={
                    engineering.decorationEngineering.print.numberOfColors ||
                    payload?.decoration?.dryOffset?.printColors ||
                    ""
                  }
                  onChange={(v) =>
                    setEngineering((prev) => ({
                      ...prev,
                      decorationEngineering: {
                        ...prev.decorationEngineering,
                        print: {
                          ...prev.decorationEngineering.print,
                          numberOfColors: v,
                        },
                      },
                    }))
                  }
                />
              </Field>

              <Field label="Print Area Length (mm)">
                <Input
                  value={engineering.decorationEngineering.print.printAreaLengthMm}
                  onChange={(v) =>
                    setEngineering((prev) => ({
                      ...prev,
                      decorationEngineering: {
                        ...prev.decorationEngineering,
                        print: {
                          ...prev.decorationEngineering.print,
                          printAreaLengthMm: v,
                        },
                      },
                    }))
                  }
                />
              </Field>

              <Field label="Print Area Width (mm)">
                <Input
                  value={engineering.decorationEngineering.print.printAreaWidthMm}
                  onChange={(v) =>
                    setEngineering((prev) => ({
                      ...prev,
                      decorationEngineering: {
                        ...prev.decorationEngineering,
                        print: {
                          ...prev.decorationEngineering.print,
                          printAreaWidthMm: v,
                        },
                      },
                    }))
                  }
                />
              </Field>

              <div className="md:col-span-5">
                <div className="text-sm text-gray-500 mb-2">Artwork File</div>
                <div className="text-sm text-gray-500">
  Artwork file visibility not loaded yet in this page.
</div>
              </div>
            </div>
          )}

          {requestDecorationType === "Shrink sleeve" && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Field label="Sleeve Material">
                <SelectField
                  value={engineering.decorationEngineering.sleeve.sleeveMaterial}
                  onChange={(v) =>
                    setEngineering((prev) => ({
                      ...prev,
                      decorationEngineering: {
                        ...prev.decorationEngineering,
                        sleeve: {
                          ...prev.decorationEngineering.sleeve,
                          sleeveMaterial: v,
                        },
                      },
                    }))
                  }
                  options={["PET", "PETG", "PVC", "OPS", "Others"]}
                />
              </Field>

              <Field label="Sleeve Thickness (micron)">
                <Input
                  value={engineering.decorationEngineering.sleeve.sleeveThicknessMic}
                  onChange={(v) =>
                    setEngineering((prev) => ({
                      ...prev,
                      decorationEngineering: {
                        ...prev.decorationEngineering,
                        sleeve: {
                          ...prev.decorationEngineering.sleeve,
                          sleeveThicknessMic: v,
                        },
                      },
                    }))
                  }
                />
              </Field>

              <Field label="Lay Flat Width (mm)">
                <Input
                  value={engineering.decorationEngineering.sleeve.layFlatWidthMm}
                  onChange={(v) =>
                    setEngineering((prev) => ({
                      ...prev,
                      decorationEngineering: {
                        ...prev.decorationEngineering,
                        sleeve: {
                          ...prev.decorationEngineering.sleeve,
                          layFlatWidthMm: v,
                        },
                      },
                    }))
                  }
                />
              </Field>

              <Field label="Lay Flat + Tol (mm)">
                <Input
                  value={engineering.decorationEngineering.sleeve.layFlatTolPlusMm}
                  onChange={(v) =>
                    setEngineering((prev) => ({
                      ...prev,
                      decorationEngineering: {
                        ...prev.decorationEngineering,
                        sleeve: {
                          ...prev.decorationEngineering.sleeve,
                          layFlatTolPlusMm: v,
                        },
                      },
                    }))
                  }
                />
              </Field>

              <Field label="Lay Flat - Tol (mm)">
                <Input
                  value={engineering.decorationEngineering.sleeve.layFlatTolMinusMm}
                  onChange={(v) =>
                    setEngineering((prev) => ({
                      ...prev,
                      decorationEngineering: {
                        ...prev.decorationEngineering,
                        sleeve: {
                          ...prev.decorationEngineering.sleeve,
                          layFlatTolMinusMm: v,
                        },
                      },
                    }))
                  }
                />
              </Field>

              <Field label="Cut Length (mm)">
                <Input
                  value={engineering.decorationEngineering.sleeve.cutLengthMm}
                  onChange={(v) =>
                    setEngineering((prev) => ({
                      ...prev,
                      decorationEngineering: {
                        ...prev.decorationEngineering,
                        sleeve: {
                          ...prev.decorationEngineering.sleeve,
                          cutLengthMm: v,
                        },
                      },
                    }))
                  }
                />
              </Field>

              <Field label="Shrink Ratio TD %">
                <Input
                  value={engineering.decorationEngineering.sleeve.shrinkRatioTDPct}
                  onChange={(v) =>
                    setEngineering((prev) => ({
                      ...prev,
                      decorationEngineering: {
                        ...prev.decorationEngineering,
                        sleeve: {
                          ...prev.decorationEngineering.sleeve,
                          shrinkRatioTDPct: v,
                        },
                      },
                    }))
                  }
                />
              </Field>

              <Field label="Shrink Ratio MD %">
                <Input
                  value={engineering.decorationEngineering.sleeve.shrinkRatioMDPct}
                  onChange={(v) =>
                    setEngineering((prev) => ({
                      ...prev,
                      decorationEngineering: {
                        ...prev.decorationEngineering,
                        sleeve: {
                          ...prev.decorationEngineering.sleeve,
                          shrinkRatioMDPct: v,
                        },
                      },
                    }))
                  }
                />
              </Field>

              <Field label="Shrink Curve">
                <TextArea
                  value={engineering.decorationEngineering.sleeve.shrinkCurve}
                  onChange={(v) =>
                    setEngineering((prev) => ({
                      ...prev,
                      decorationEngineering: {
                        ...prev.decorationEngineering,
                        sleeve: {
                          ...prev.decorationEngineering.sleeve,
                          shrinkCurve: v,
                        },
                      },
                    }))
                  }
                  rows={3}
                />
              </Field>

              <Field label="Repeat Length (mm)">
                <Input
                  value={engineering.decorationEngineering.sleeve.repeatLengthMm}
                  onChange={(v) =>
                    setEngineering((prev) => ({
                      ...prev,
                      decorationEngineering: {
                        ...prev.decorationEngineering,
                        sleeve: {
                          ...prev.decorationEngineering.sleeve,
                          repeatLengthMm: v,
                        },
                      },
                    }))
                  }
                />
              </Field>

              <Field label="Seam Overlap Width (mm)">
                <Input
                  value={engineering.decorationEngineering.sleeve.seamOverlapWidthMm}
                  onChange={(v) =>
                    setEngineering((prev) => ({
                      ...prev,
                      decorationEngineering: {
                        ...prev.decorationEngineering,
                        sleeve: {
                          ...prev.decorationEngineering.sleeve,
                          seamOverlapWidthMm: v,
                        },
                      },
                    }))
                  }
                />
              </Field>

              <Field label="Seam Tolerance (± mm)">
                <Input
                  value={engineering.decorationEngineering.sleeve.seamToleranceMm}
                  onChange={(v) =>
                    setEngineering((prev) => ({
                      ...prev,
                      decorationEngineering: {
                        ...prev.decorationEngineering,
                        sleeve: {
                          ...prev.decorationEngineering.sleeve,
                          seamToleranceMm: v,
                        },
                      },
                    }))
                  }
                />
              </Field>

              <div className="md:col-span-4">
                <div className="text-sm text-gray-500 mb-2">Glue Pattern Drawing</div>
                <Input
                  type="file"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setEngineering((prev) => ({
                      ...prev,
                      decorationEngineering: {
                        ...prev.decorationEngineering,
                        sleeve: {
                          ...prev.decorationEngineering.sleeve,
                          gluePatternFileName: file.name,
                        },
                      },
                    }));
                  }}
                />
                {engineering.decorationEngineering.sleeve.gluePatternFileName ? (
                  <div className="text-sm mt-2">
                    {engineering.decorationEngineering.sleeve.gluePatternFileName}
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {requestDecorationType === "Hybrid cup" && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Field label="Blank Material">
                <Input
                  value={engineering.decorationEngineering.hybrid.blankMaterial}
                  onChange={(v) =>
                    setEngineering((prev) => ({
                      ...prev,
                      decorationEngineering: {
                        ...prev.decorationEngineering,
                        hybrid: {
                          ...prev.decorationEngineering.hybrid,
                          blankMaterial: v,
                        },
                      },
                    }))
                  }
                />
              </Field>

              <Field label="GSM">
                <Input
                  value={engineering.decorationEngineering.hybrid.gsm}
                  onChange={(v) =>
                    setEngineering((prev) => ({
                      ...prev,
                      decorationEngineering: {
                        ...prev.decorationEngineering,
                        hybrid: {
                          ...prev.decorationEngineering.hybrid,
                          gsm: v,
                        },
                      },
                    }))
                  }
                />
              </Field>

              <Field label="Print Colors">
                <Input
                  value={engineering.decorationEngineering.hybrid.printColors}
                  onChange={(v) =>
                    setEngineering((prev) => ({
                      ...prev,
                      decorationEngineering: {
                        ...prev.decorationEngineering,
                        hybrid: {
                          ...prev.decorationEngineering.hybrid,
                          printColors: v,
                        },
                      },
                    }))
                  }
                />
              </Field>

              <Field label="Coating">
                <Input
                  value={engineering.decorationEngineering.hybrid.coating}
                  onChange={(v) =>
                    setEngineering((prev) => ({
                      ...prev,
                      decorationEngineering: {
                        ...prev.decorationEngineering,
                        hybrid: {
                          ...prev.decorationEngineering.hybrid,
                          coating: v,
                        },
                      },
                    }))
                  }
                />
              </Field>

              <Field label="Paper Bottom Selected">
                <SelectField
                  value={engineering.decorationEngineering.hybrid.paperBottomSelected}
                  onChange={(v) =>
                    setEngineering((prev) => ({
                      ...prev,
                      decorationEngineering: {
                        ...prev.decorationEngineering,
                        hybrid: {
                          ...prev.decorationEngineering.hybrid,
                          paperBottomSelected: v,
                        },
                      },
                    }))
                  }
                  options={["Yes", "No"]}
                />
              </Field>

              {engineering.decorationEngineering.hybrid.paperBottomSelected === "Yes" && (
                <>
                  <Field label="Paper Bottom Material">
                    <Input
                      value={engineering.decorationEngineering.hybrid.paperBottomMaterial}
                      onChange={(v) =>
                        setEngineering((prev) => ({
                          ...prev,
                          decorationEngineering: {
                            ...prev.decorationEngineering,
                            hybrid: {
                              ...prev.decorationEngineering.hybrid,
                              paperBottomMaterial: v,
                            },
                          },
                        }))
                      }
                    />
                  </Field>

                  <Field label="Paper Bottom GSM">
                    <Input
                      value={engineering.decorationEngineering.hybrid.paperBottomGsm}
                      onChange={(v) =>
                        setEngineering((prev) => ({
                          ...prev,
                          decorationEngineering: {
                            ...prev.decorationEngineering,
                            hybrid: {
                              ...prev.decorationEngineering.hybrid,
                              paperBottomGsm: v,
                            },
                          },
                        }))
                      }
                    />
                  </Field>

                  <Field label="Paper Bottom PE g/m²">
                    <Input
                      value={engineering.decorationEngineering.hybrid.paperBottomPE_g_m2}
                      onChange={(v) =>
                        setEngineering((prev) => ({
                          ...prev,
                          decorationEngineering: {
                            ...prev.decorationEngineering,
                            hybrid: {
                              ...prev.decorationEngineering.hybrid,
                              paperBottomPE_g_m2: v,
                            },
                          },
                        }))
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

    {(engineering.investments || []).length === 0 ? (
      <div className="text-sm text-gray-500">No investments added yet.</div>
    ) : (
      <div className="space-y-3">
        {(engineering.investments || []).map((row) => (
          <div key={row.id} className="rounded-xl border p-3">
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              <Field label="Investment Name">
                <Input
                  value={row.name}
                  onChange={(v) => updateInvestmentRow(row.id, { name: v })}
                />
              </Field>

              <Field label="Type">
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
              </Field>

              <Field label="Investment Value">
                <Input
                  value={row.value}
                  onChange={(v) => updateInvestmentRow(row.id, { value: v })}
                />
              </Field>

              <Field label="Currency">
                <SelectField
                  value={row.currency}
                  onChange={(v) => updateInvestmentRow(row.id, { currency: v })}
                  options={["EGP", "USD", "EUR"]}
                />
              </Field>

              <Field label="Exchange Rate">
                <Input
                  value={row.exchangeRate}
                  onChange={(v) => updateInvestmentRow(row.id, { exchangeRate: v })}
                />
              </Field>

              <Field label="Supplier">
                <Input
                  value={row.supplier}
                  onChange={(v) => updateInvestmentRow(row.id, { supplier: v })}
                />
              </Field>

              <Field label="Lead Time (weeks)">
                <Input
                  value={row.leadTimeWeeks}
                  onChange={(v) => updateInvestmentRow(row.id, { leadTimeWeeks: v })}
                />
              </Field>
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
          <Field
            label="Pieces / Stack"
            requestValue={requestValueOrBlank(packagingReq?.primary?.pcsPerStack)}
            currentValue={engineering.packaging.primary.pcsPerStack}
          >
            <Input
              value={engineering.packaging.primary.pcsPerStack}
              onChange={(v) =>
                updateNested("packaging", "primary", { pcsPerStack: v })
              }
            />
          </Field>

          <Field
            label="Stacks / Bag"
            requestValue={requestValueOrBlank(packagingReq?.primary?.stacksPerBag)}
            currentValue={engineering.packaging.primary.stacksPerPrimary}
          >
            <Input
              value={engineering.packaging.primary.stacksPerPrimary}
              onChange={(v) =>
                updateNested("packaging", "primary", { stacksPerPrimary: v })
              }
            />
          </Field>

          <Field
            label="Bag / Sleeve Material"
            requestValue={requestValueOrBlank(packagingReq?.primary?.bagSleeveMaterial)}
            currentValue={engineering.packaging.primary.primaryMaterial}
          >
            <Input
              value={engineering.packaging.primary.primaryMaterial}
              onChange={(v) =>
                updateNested("packaging", "primary", { primaryMaterial: v })
              }
            />
          </Field>

          <Field
            label="Primary Pack Name"
            requestValue={requestValueOrBlank(packagingReq?.primary?.bagSleeveMaterial)}
            currentValue={engineering.packaging.primary.primaryName}
          >
            <Input
              value={engineering.packaging.primary.primaryName}
              onChange={(v) =>
                updateNested("packaging", "primary", { primaryName: v })
              }
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Field
            label="Bag / Sleeve Dimensions (mm)"
            requestValue={requestValueOrBlank(packagingReq?.primary?.bagSleeveDimensionsMm)}
            currentValue={engineering.packaging.primary.primaryLength_mm}
          >
            <Input
              value={engineering.packaging.primary.primaryLength_mm}
              onChange={(v) =>
                updateNested("packaging", "primary", { primaryLength_mm: v })
              }
            />
          </Field>

          <Field
            label="Sleeve Thickness (micron)"
            requestValue={requestValueOrBlank(packagingReq?.primary?.bagSleeveThicknessMicron)}
            currentValue={engineering.packaging.primary.primaryWidth_mm}
          >
            <Input
              value={engineering.packaging.primary.primaryWidth_mm}
              onChange={(v) =>
                updateNested("packaging", "primary", { primaryWidth_mm: v })
              }
            />
          </Field>

          <Field
            label="Sleeve Weight"
            requestValue={requestValueOrBlank(packagingReq?.primary?.bagSleeveWeight)}
            currentValue={engineering.packaging.primary.primaryHeight_mm}
          >
            <Input
              value={engineering.packaging.primary.primaryHeight_mm}
              onChange={(v) =>
                updateNested("packaging", "primary", { primaryHeight_mm: v })
              }
            />
          </Field>

          <Field
            label="Primary Artwork Code"
            requestValue={requestValueOrBlank(packagingReq?.primary?.sleeveArtworkProvided)}
            currentValue={engineering.packaging.primary.primaryArtworkCode}
          >
            <Input
              value={engineering.packaging.primary.primaryArtworkCode}
              onChange={(v) =>
                updateNested("packaging", "primary", { primaryArtworkCode: v })
              }
            />
          </Field>
        </div>
      </div>

      <div className="rounded-xl border p-4 space-y-4">
        <div className="font-medium">Secondary Packaging</div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Field
            label="Bags / Carton"
            requestValue={requestValueOrBlank(packagingReq?.secondary?.bagsPerCarton)}
            currentValue={engineering.packaging.secondary.primariesPerSecondary}
          >
            <Input
              value={engineering.packaging.secondary.primariesPerSecondary}
              onChange={(v) =>
                updateNested("packaging", "secondary", { primariesPerSecondary: v })
              }
            />
          </Field>

          <Field
            label="Carton Type"
            requestValue={requestValueOrBlank(packagingReq?.secondary?.cartonType)}
            currentValue={engineering.packaging.secondary.secondaryType}
          >
            <SelectField
              value={engineering.packaging.secondary.secondaryType}
              onChange={(v) =>
                updateNested("packaging", "secondary", { secondaryType: v })
              }
              options={[
                { value: "Single wall", label: "Single wall" },
                { value: "Double wall", label: "Double wall" },
              ]}
            />
          </Field>

          <Field
            label="Secondary Pack Name"
            requestValue={requestValueOrBlank(packagingReq?.secondary?.cartonType)}
            currentValue={engineering.packaging.secondary.secondaryName}
          >
            <Input
              value={engineering.packaging.secondary.secondaryName}
              onChange={(v) =>
                updateNested("packaging", "secondary", { secondaryName: v })
              }
            />
          </Field>

          <Field
            label="Labels / Box"
            requestValue={requestValueOrBlank(packagingReq?.labelInstructions?.cartonLabelRequired)}
            currentValue={engineering.packaging.secondary.labelsPerBox}
          >
            <Input
              value={engineering.packaging.secondary.labelsPerBox}
              onChange={(v) =>
                updateNested("packaging", "secondary", { labelsPerBox: v })
              }
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
       <Field
  label="Carton External Length (mm)"
  requestValue={requestValueOrBlank(packagingReq?.secondary?.cartonExternalLengthMm)}
  currentValue={engineering.packaging.secondary.secondaryLength_mm}
>
  <Input
    value={engineering.packaging.secondary.secondaryLength_mm}
    onChange={(v) =>
      updateNested("packaging", "secondary", { secondaryLength_mm: v })
    }
  />
</Field>

<Field
  label="Carton External Width (mm)"
  requestValue={requestValueOrBlank(packagingReq?.secondary?.cartonExternalWidthMm)}
  currentValue={engineering.packaging.secondary.secondaryWidth_mm}
>
  <Input
    value={engineering.packaging.secondary.secondaryWidth_mm}
    onChange={(v) =>
      updateNested("packaging", "secondary", { secondaryWidth_mm: v })
    }
  />
</Field>

<Field
  label="Carton Height (mm)"
  requestValue={requestValueOrBlank(packagingReq?.secondary?.cartonHeightMm)}
  currentValue={engineering.packaging.secondary.secondaryHeight_mm}
>
  <Input
    value={engineering.packaging.secondary.secondaryHeight_mm}
    onChange={(v) =>
      updateNested("packaging", "secondary", { secondaryHeight_mm: v })
    }
  />
</Field>

          <Field
            label="Label Length (mm)"
            requestValue={requestValueOrBlank(packagingReq?.labelInstructions?.cartonLabelDimensionsMm)}
            currentValue={engineering.packaging.secondary.labelLength_mm}
          >
            <Input
              value={engineering.packaging.secondary.labelLength_mm}
              onChange={(v) =>
                updateNested("packaging", "secondary", { labelLength_mm: v })
              }
            />
          </Field>

          <Field label="Label Width (mm)">
            <Input
              value={engineering.packaging.secondary.labelWidth_mm}
              onChange={(v) =>
                updateNested("packaging", "secondary", { labelWidth_mm: v })
              }
            />
          </Field>
        </div>
      </div>

      <div className="rounded-xl border p-4 space-y-4">
        <div className="font-medium">Pallet</div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Field
            label="Use Pallet"
            requestValue={packagingReq?.pallet?.noPalletNeeded ? "No" : "Yes"}
            currentValue={engineering.packaging.pallet.palletSelected}
          >
            <SelectField
              value={engineering.packaging.pallet.palletSelected}
              onChange={(v) =>
                updateNested("packaging", "pallet", { palletSelected: v })
              }
              options={["Yes", "No"]}
            />
          </Field>

          {engineering.packaging.pallet.palletSelected === "Yes" && (
            <>
              <Field
  label="Pallet Type"
  requestValue={requestValueOrBlank(packagingReq?.pallet?.palletType)}
  currentValue={engineering.packaging.pallet.palletType}
>
  <SelectField
    value={engineering.packaging.pallet.palletType}
    onChange={(v) =>
      updateNested("packaging", "pallet", { palletType: v })
    }
    options={[
      { value: "UK", label: "UK Standard Pallet" },
      { value: "EURO", label: "EURO Pallet" },
    ]}
  />
</Field>

              <Field label="Pallet Length (mm)">
  <Input
    value={engineering.packaging.pallet.palletLength_mm}
    onChange={(v) =>
      updateNested("packaging", "pallet", { palletLength_mm: v })
    }
  />
</Field>

<Field label="Pallet Width (mm)">
  <Input
    value={engineering.packaging.pallet.palletWidth_mm}
    onChange={(v) =>
      updateNested("packaging", "pallet", { palletWidth_mm: v })
    }
  />
</Field>

<Field label="Pallet Height (mm)">
  <Input
    value={engineering.packaging.pallet.palletHeight_mm}
    onChange={(v) =>
      updateNested("packaging", "pallet", { palletHeight_mm: v })
    }
  />
</Field>

              <Field
                label="Cartons / Pallet"
                requestValue={requestValueOrBlank(packagingReq?.pallet?.cartonsPerPallet)}
                currentValue={engineering.packaging.pallet.boxesPerPallet}
              >
                <Input
                  value={engineering.packaging.pallet.boxesPerPallet}
                  onChange={(v) =>
                    updateNested("packaging", "pallet", { boxesPerPallet: v })
                  }
                />
              </Field>

              <Field
                label="Stretch / Pallet (kg)"
                requestValue={requestValueOrBlank(packagingReq?.pallet?.stretchWrapKgPerPallet)}
                currentValue={engineering.packaging.pallet.stretchWeightPerPallet_kg}
              >
                <Input
                  value={engineering.packaging.pallet.stretchWeightPerPallet_kg}
                  onChange={(v) =>
                    updateNested("packaging", "pallet", { stretchWeightPerPallet_kg: v })
                  }
                />
              </Field>
            </>
          )}
        </div>

        <Field
          label="Packaging Notes / Special Instructions"
          requestValue={requestValueOrBlank(
            packagingReq?.primary?.primaryPackagingNotes ||
            packagingReq?.secondary?.cartonPackagingNotes ||
            packagingReq?.pallet?.palletNotes
          )}
          currentValue={engineering.packaging.notes}
        >
          <TextArea
            value={engineering.packaging.notes}
            onChange={(v) => updateSection("packaging", { notes: v })}
            rows={3}
          />
        </Field>

        <Field label="Auto Packaging Instruction">
          <TextArea
            value={engineering.packaging.instructionText}
            onChange={(v) => updateSection("packaging", { instructionText: v })}
            rows={3}
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <RefRow
            label="pcs / stack"
            value={engineering.packaging.primary.pcsPerStack || "—"}
          />
          <RefRow
            label="stacks / primary"
            value={engineering.packaging.primary.stacksPerPrimary || "—"}
          />
          <RefRow
            label="pcs / primary"
            value={thermoPackagingDerived.pcsPerPrimary ? fmt(thermoPackagingDerived.pcsPerPrimary, 0) : "—"}
          />
          <RefRow
            label="primary / carton"
            value={engineering.packaging.secondary.primariesPerSecondary || "—"}
          />
          <RefRow
            label="pcs / carton"
            value={thermoPackagingDerived.pcsPerCarton ? fmt(thermoPackagingDerived.pcsPerCarton, 0) : "—"}
          />
          <RefRow
            label="pcs / pallet"
            value={thermoPackagingDerived.pcsPerPallet ? fmt(thermoPackagingDerived.pcsPerPallet, 0) : "—"}
          />
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
              value={engineering.freight.cartonVolume_m3 || "—"}
            />
            <RefRow
              label="Weight / Carton (kg)"
              value={engineering.freight.cartonWeight_kg || "—"}
            />
          </>
        )}

        <RefRow
          label="Pallet Dimensions (mm)"
          value={
            engineering.freight.palletLength_mm &&
            engineering.freight.palletWidth_mm &&
            engineering.freight.palletHeight_mm
              ? `${engineering.freight.palletLength_mm} × ${engineering.freight.palletWidth_mm} × ${engineering.freight.palletHeight_mm}`
              : "—"
          }
        />
        <RefRow
          label="Pallet Volume (m³)"
          value={engineering.freight.palletVolume_m3 || "—"}
        />
        <RefRow
          label="Pallet Weight (kg)"
          value={engineering.freight.palletWeight_kg || "—"}
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
                <td className="p-3">{engineering.freight[`${key}_pallets`] || "—"}</td>
               {!isSheet && (
  <td className="p-3">
    {engineering.packaging.pallet.palletSelected === "Yes"
      ? (engineering.freight[`${key}_cartons`] || "—")
      : (engineering.freight[`${key}_cartonsRange`] || "—")}
  </td>
)}
                {!isSheet && <td className="p-3">{engineering.freight[`${key}_pcs`] || "—"}</td>}
                {isSheet && <td className="p-3">{engineering.freight[`${key}_rolls`] || "—"}</td>}
                <td className="p-3">{engineering.freight[`${key}_netWeight_kg`] || "—"}</td>
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
          <div key={key} className="grid grid-cols-1 md:grid-cols-5 gap-3 rounded-lg border p-3">
            <div className="font-medium flex items-center">{label}</div>

            <Field label="Pallets / Truck">
              <Input
                value={engineering.freight[`${key}_pallets`]}
                onChange={(v) => updateSection("freight", { [`${key}_pallets`]: v })}
              />
            </Field>

            {!isSheet && (
              <Field label="Cartons / Truck">
                <Input
                  value={engineering.freight[`${key}_cartons`]}
                  onChange={(v) => updateSection("freight", { [`${key}_cartons`]: v })}
                />
              </Field>
            )}

            <RefRow
              label={isSheet ? "Rolls / Truck" : "PCS / Truck"}
              value={
                isSheet
                  ? engineering.freight[`${key}_rolls`]
                  : engineering.freight[`${key}_pcs`]
              }
            />

            <RefRow
              label="Net Weight / Truck (kg)"
              value={engineering.freight[`${key}_netWeight_kg`] || "—"}
            />
          </div>
        ))}
      </div>
    </div>

    <Field label="Freight Notes">
      <TextArea
        value={engineering.freight.notes}
        onChange={(v) => updateSection("freight", { notes: v })}
      />
    </Field>
  </div>
</Section>

      <Section title={isSheet ? "6. Notes" : "9. Notes"}>
  <div className="space-y-4">

    <RefRow
      label="Customer Notes"
      value={project.customerNotes || primaryCustomer.customerNotes}
    />

    <Field label="Engineering Notes">
      <TextArea
        value={engineering.freight.notes}
        onChange={(v) => updateSection("freight", { notes: v })}
      />
    </Field>

  </div>
</Section>
    </div>
  );
} 