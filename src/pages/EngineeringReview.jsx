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

const blankMaterialRow = () => ({ id: uid(), name: "", pct: "" });

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
  operatorsPerPallet: "",
  instructionText: "",
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

      moldBaseName: "",
      moldBaseCode: "",
      insertName: "",
      insertCode: "",
      bottomName: "",
      bottomCode: "",
      plugAssistName: "",
      plugAssistCode: "",
      cuttingPlateName: "",
      cuttingPlateCode: "",
      stackingPlateName: "",
      stackingPlateCode: "",

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
    },

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
      palletsPerTruck: "",
      cartonsPerTruck: "",
      kgPerTruck: "",
      pcsPerTruck: "",
      netProductWeightPerTruck_kg: "",
      notes: "",
    },

    tooling: [],
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

  const sendToPricing = async () => {
    try {
      const engJson = await saveEngineeringOnly("Sent to Pricing");
      if (!engJson.success) {
        alert("Failed to save engineering data");
        return;
      }

      const reqJson = await saveMasterStatus("Sent to Pricing");
      if (!reqJson.success) {
        alert("Engineering saved, but failed to update project status");
        return;
      }

      alert("Sent to Pricing");
      window.location.href = `/pricing/${requestId}`;
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
      const recommendedLayerA =
  opt.A && opt.B ? (opt.A / (opt.A + opt.B)) * 100 : 0;

if (!next.materialSheet.layerAPct && recommendedLayerA > 0) {
  next.materialSheet.layerAPct = String(recommendedLayerA.toFixed(2));
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
    const pcsPerHour = cavities * cpm * 60 * (eff || 1);
    const pcsPerShift12h = pcsPerHour * 12;
    const pcsPerDay24h = pcsPerHour * 24;
    const pcsPerWeek = pcsPerDay24h * 7;
    const pcsPerYear330d = pcsPerDay24h * 330;
    const pcsPerMonth = pcsPerYear330d / 12;
    return {
      pcsPerHour,
      pcsPerShift12h,
      pcsPerDay24h,
      pcsPerWeek,
      pcsPerMonth,
      pcsPerYear330d,
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
      kgPerTruck: freightDerived.netProductWeightPerTruck_kg
        ? String(freightDerived.netProductWeightPerTruck_kg.toFixed(2))
        : "",
      pcsPerTruck: freightDerived.pcsPerTruck
        ? String(freightDerived.pcsPerTruck.toFixed(0))
        : "",
      netProductWeightPerTruck_kg: freightDerived.netProductWeightPerTruck_kg
        ? String(freightDerived.netProductWeightPerTruck_kg.toFixed(2))
        : "",
      ...(!isSheet
        ? {
            cartonsPerTruck: freightDerived.cartonsPerTruck
              ? String(freightDerived.cartonsPerTruck.toFixed(0))
              : "",
          }
        : {}),
    });
  }, [freightDerived, isSheet]);
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

    <div className="grid grid-cols-1 gap-3">
      <RefRow
        label="Plastic Share"
        value={
          sheetDerived.plasticShare
            ? `${fmt(sheetDerived.plasticShare * 100, 2)}%`
            : "—"
        }
      />
      <RefRow
        label="Coating Share"
        value={
          engineering.materialSheet.coatingUsed === "Yes"
            ? `${fmt(sheetDerived.coatingShare * 100, 2)}%`
            : "0%"
        }
      />
      <RefRow
        label="Coating Kg / Ton"
        value={
          engineering.materialSheet.coatingUsed === "Yes"
            ? `${fmt(sheetDerived.coatingKgPerTon, 3)} kg`
            : "0 kg"
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
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="font-medium">Layer Material Mix</div>

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

              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <Field
  label="Net Width (mm)"
  requestValue={requestValueOrBlank(product.sheetWidthMm)}
  currentValue={engineering.sheetSpecs.netWidth_mm}
>
  <Input
    value={engineering.sheetSpecs.netWidth_mm}
    onChange={(v) => updateSection("sheetSpecs", { netWidth_mm: v })}
  />
</Field>

                <Field label="Edge Trim / Side (mm)">
                  <Input
                    value={engineering.sheetSpecs.edgeTrimPerSide_mm}
                    onChange={(v) => updateSection("sheetSpecs", { edgeTrimPerSide_mm: v })}
                  />
                </Field>

                <Field label="Gross Width (mm)">
                  <Input
                    value={engineering.sheetSpecs.grossWidth_mm || fmt(sheetDerived.grossWidth, 2)}
                    onChange={() => {}}
                    disabled
                  />
                </Field>

                <Field label="Width + Tol (mm)">
                  <Input
                    value={engineering.sheetSpecs.widthTolPlus_mm}
                    onChange={(v) => updateSection("sheetSpecs", { widthTolPlus_mm: v })}
                  />
                </Field>

                <Field label="Width - Tol (mm)">
                  <Input
                    value={engineering.sheetSpecs.widthTolMinus_mm}
                    onChange={(v) => updateSection("sheetSpecs", { widthTolMinus_mm: v })}
                  />
                </Field>

                <Field label="1 - (Net/Gross) %">
                  <Input
                    value={engineering.sheetSpecs.trimLossPct || fmt(sheetDerived.trimLossPct, 2)}
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
              <Field
                  label="Thickness (micron)"
                  requestValue={requestValueOrBlank(product.sheetThicknessMicron)}
                  currentValue={engineering.sheetSpecs.thickness_mic}
                >
                  <Input
                    value={engineering.sheetSpecs.thickness_mic}
                    onChange={(v) => updateSection("sheetSpecs", { thickness_mic: v })}
                  />
                </Field>

                <Field label="Thickness + Tol (micron)">
                  <Input
                    value={engineering.sheetSpecs.thicknessTolPlus_mic}
                    onChange={(v) => updateSection("sheetSpecs", { thicknessTolPlus_mic: v })}
                  />
                </Field>

                <Field label="Thickness - Tol (micron)">
                  <Input
                    value={engineering.sheetSpecs.thicknessTolMinus_mic}
                    onChange={(v) => updateSection("sheetSpecs", { thicknessTolMinus_mic: v })}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <Field label="Core Type">
                  <Input
                    value={engineering.sheetSpecs.coreType}
                    onChange={(v) => updateSection("sheetSpecs", { coreType: v })}
                  />
                </Field>

                <Field label="Core Diameter">
                  <SelectField
                    value={engineering.sheetSpecs.coreSize}
                    onChange={(v) => updateSection("sheetSpecs", { coreSize: v })}
                    options={["3 inch", "6 inch", "8 inch"]}
                  />
                </Field>

                <Field label="Core Diameter (mm)">
                  <Input
                    value={engineering.sheetSpecs.coreDiameter_mm}
                    onChange={(v) => updateSection("sheetSpecs", { coreDiameter_mm: v })}
                  />
                </Field>

                <Field label="Roll Diameter (mm)">
                  <Input
                    value={engineering.sheetSpecs.rollDiameter_mm}
                    onChange={(v) => updateSection("sheetSpecs", { rollDiameter_mm: v })}
                  />
                </Field>

                <Field
                  label="Roll Weight (kg)"
                  requestValue={requestValueOrBlank(product.rollWeightKg)}
                  currentValue={engineering.sheetSpecs.rollTargetWeight_kg}
                >
                  <Input
                    value={engineering.sheetSpecs.rollTargetWeight_kg}
                    onChange={(v) => updateSection("sheetSpecs", { rollTargetWeight_kg: v })}
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
                      value={engineering.sheetPackaging.coreMaterial}
                      onChange={(v) => updateSection("sheetPackaging", { coreMaterial: v })}
                    />
                  </Field>

                  <Field label="Core Size">
                    <SelectField
                      value={engineering.sheetPackaging.coreSize}
                      onChange={(v) => updateSection("sheetPackaging", { coreSize: v })}
                      options={["3 inch", "6 inch", "8 inch"]}
                    />
                  </Field>
                  <Field
  label="Core Uses"
  requestValue=""
  currentValue={engineering.sheetPackaging.coreUses}
>
  <Input
    value={engineering.sheetPackaging.coreUses}
    onChange={(v) => updateSection("sheetPackaging", { coreUses: v })}
  />
</Field>

                  <Field label="Roll Weight (kg)">
                    <Input
                      value={engineering.sheetPackaging.rollWeight_kg || engineering.sheetSpecs.rollTargetWeight_kg}
                      onChange={(v) => updateSection("sheetPackaging", { rollWeight_kg: v })}
                    />
                  </Field>

                  <Field label="Labels per Roll">
                    <Input
                      value={engineering.sheetPackaging.labelsPerRoll}
                      onChange={(v) => updateSection("sheetPackaging", { labelsPerRoll: v })}
                    />
                  </Field>

                  <Field label="Labels per Pallet">
                    <Input
                      value={engineering.sheetPackaging.labelsPerPallet}
                      onChange={(v) => updateSection("sheetPackaging", { labelsPerPallet: v })}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                  <Field label="Pallet Type">
                    <Input
                      value={engineering.sheetPackaging.palletType}
                      onChange={(v) => updateSection("sheetPackaging", { palletType: v })}
                    />
                  </Field>
                  <Field
  label="Pallet Uses"
  requestValue=""
  currentValue={engineering.sheetPackaging.palletUses}
>
  <Input
    value={engineering.sheetPackaging.palletUses}
    onChange={(v) => updateSection("sheetPackaging", { palletUses: v })}
  />
</Field>

                  <Field label="Rolls per Pallet">
                    <Input
                      value={engineering.sheetPackaging.rollsPerPallet}
                      onChange={(v) => updateSection("sheetPackaging", { rollsPerPallet: v })}
                    />
                  </Field>

                  <Field label="Strap Length / Pallet (m)">
                    <Input
                      value={engineering.sheetPackaging.strapLength_m}
                      onChange={(v) => updateSection("sheetPackaging", { strapLength_m: v })}
                    />
                  </Field>

                  <Field label="Separators / Pallet">
                    <Input
                      value={engineering.sheetPackaging.separatorsPerPallet}
                      onChange={(v) => updateSection("sheetPackaging", { separatorsPerPallet: v })}
                    />
                  </Field>

                  <Field label="Foam Sheet Length / Pallet (m)">
                    <Input
                      value={engineering.sheetPackaging.foamLength_m}
                      onChange={(v) => updateSection("sheetPackaging", { foamLength_m: v })}
                    />
                  </Field>

                  <Field label="Stretch Film / Pallet (kg)">
                    <Input
                      value={engineering.sheetPackaging.stretchKgPerPallet}
                      onChange={(v) => updateSection("sheetPackaging", { stretchKgPerPallet: v })}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Operators / Pallet">
                    <Input
                      value={engineering.sheetPackaging.operatorsPerPallet}
                      onChange={(v) => updateSection("sheetPackaging", { operatorsPerPallet: v })}
                    />
                  </Field>

                  <Field label="Packaging Instructions">
                    <TextArea
                      value={engineering.sheetPackaging.instructionText}
                      onChange={(v) => updateSection("sheetPackaging", { instructionText: v })}
                      rows={3}
                    />
                  </Field>
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Field label="Machine">
          <SelectField
            value={engineering.thermo.machineName}
            onChange={(v) => updateSection("thermo", { machineName: v })}
            options={["RDM73K", "RDK80"]}
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <RefRow label="Pcs / Hr" value={engineering.thermo.pcsPerHour} />
        <RefRow label="Pcs / Day" value={engineering.thermo.pcsPerDay24h} />
        <RefRow label="Pcs / Year" value={engineering.thermo.pcsPerYear330d} />
      </div>

    </div>
  </Section>
)}

      {!isSheet && (
  <Section title="4. Thermoformed Product Packaging Data">
    <div className="space-y-4">

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Field label="Pieces / Stack">
          <Input
            value={engineering.packaging.primary.pcsPerStack}
            onChange={(v) =>
              updateNested("packaging", "primary", { pcsPerStack: v })
            }
          />
        </Field>

        <Field label="Stacks / Primary">
          <Input
            value={engineering.packaging.primary.stacksPerPrimary}
            onChange={(v) =>
              updateNested("packaging", "primary", { stacksPerPrimary: v })
            }
          />
        </Field>

        <Field label="Primary Name">
          <Input
            value={engineering.packaging.primary.primaryName}
            onChange={(v) =>
              updateNested("packaging", "primary", { primaryName: v })
            }
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Field label="Cartons / Pallet">
          <Input
            value={engineering.packaging.pallet.boxesPerPallet}
            onChange={(v) =>
              updateNested("packaging", "pallet", { boxesPerPallet: v })
            }
          />
        </Field>

        <RefRow label="Pcs / Carton" value={thermoPackagingDerived.pcsPerCarton} />
        <RefRow label="Pcs / Pallet" value={thermoPackagingDerived.pcsPerPallet} />
      </div>

    </div>
  </Section>
)}

      <Section title={isSheet ? "3. Freight / Logistics" : "5. Freight / Logistics"}>
  <div className="space-y-4">

    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <Field label="Delivery Mode">
        <Input
          value={engineering.freight.deliveryMode}
          onChange={(v) => updateSection("freight", { deliveryMode: v })}
        />
      </Field>

      <Field label="Pallets / Truck">
        <Input
          value={engineering.freight.palletsPerTruck}
          onChange={(v) => updateSection("freight", { palletsPerTruck: v })}
        />
      </Field>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <RefRow
        label="Net Weight / Truck"
        value={freightDerived.netProductWeightPerTruck_kg}
      />
    </div>

  </div>
</Section>

      <Section title={isSheet ? "4. Notes" : "6. Notes"}>
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