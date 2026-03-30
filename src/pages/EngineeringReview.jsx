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

function Section({ title, left, right }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
      <h2 className="font-semibold text-lg">{title}</h2>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-gray-50 border rounded-xl p-4 space-y-3">
          <div className="text-xs uppercase tracking-wide text-gray-500">
            Request Data
          </div>
          {left}
        </div>
        <div className="space-y-3">{right}</div>
      </div>
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
      rollWeight_kg: "",
      labelsPerRoll: "",
      labelsPerPallet: "",
      palletType: "",
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
        if (j1.success) setPayload(j1.payload);

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
      const engJson = await saveEngineeringOnly("Engineering Completed");
      if (!engJson.success) {
        alert("Failed to save engineering data");
        return;
      }

      const reqJson = await saveMasterStatus("Engineering Completed");
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



const customer = payload?.customer || {};
const product = payload?.product || {};
const packagingReq = payload?.packaging || {};
const deliveryReq = payload?.delivery || {};
  const isSheet = product.productType === "Sheet Roll";

  const thumb =
    product?.productThumbnailPreview ||
    (product?.productThumbnailBase64
      ? `data:image/*;base64,${product.productThumbnailBase64}`
      : "");

  const requestedBaseMaterial = product.sheetMaterial || product.productMaterial || "";
  const baseMaterial = engineering.materialSheet.baseMaterial || requestedBaseMaterial;
  const autoDensity = DENSITY_MAP[baseMaterial] || 0;
  const density = n(engineering.materialSheet.density) || autoDensity;

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

      if (!next.extrusion.grossSpeedA_kg_hr && opt.A) {
        next.extrusion.grossSpeedA_kg_hr = String(opt.A);
      }

      if (!next.extrusion.grossSpeedB_kg_hr && opt.B) {
        next.extrusion.grossSpeedB_kg_hr = String(opt.B);
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
    const speedA = n(engineering.extrusion.grossSpeedA_kg_hr);
    const speedB = n(engineering.extrusion.grossSpeedB_kg_hr);
    const totalGross = speedA + speedB;
    const efficiency = n(engineering.extrusion.efficiencyPct) / 100;
    const scrapRate = n(engineering.extrusion.scrapRatePct) / 100;
    const grossWidth = n(engineering.sheetSpecs.grossWidth_mm) || sheetDerived.grossWidth;
    const netWidth = n(engineering.sheetSpecs.netWidth_mm);

    const optimalTotal = n(opt.A) + n(opt.B);
    const grossVsOptimalPct = optimalTotal > 0 ? (totalGross / optimalTotal) * 100 : 0;

    const netSpeed =
      totalGross > 0 && grossWidth > 0
        ? totalGross * (netWidth / grossWidth) * (1 - scrapRate) * (efficiency || 1)
        : 0;

    const netVsOptimalPct = optimalTotal > 0 ? (netSpeed / optimalTotal) * 100 : 0;

    const tph = netSpeed / 1000;
    const tonsPerShift12h = tph * 12;
    const tonsPerDay24h = tph * 24;
    const tonsPerWeek = tonsPerDay24h * 7;
    const tonsPerYear330d = tonsPerDay24h * 330;
    const tonsPerMonth = tonsPerYear330d / 12;

    return {
      opt,
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
    };
  }, [engineering.extrusion, engineering.sheetSpecs, sheetDerived.grossWidth, baseMaterial]);

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
            <div className="text-xl font-semibold">{customer.projectName || "—"}</div>
            <div className="text-sm text-gray-500">
              {product.productType || "—"} • {requestedBaseMaterial || "—"}
            </div>
          </div>

          <div className="min-w-[220px]">
            <Field label="Engineer Name">
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

      <Section
        title="1. Material Structure and Sheet Roll"
        left={
          <>
            <RefRow label="Requested Material" value={requestedBaseMaterial} />
            <RefRow label="Requested Width (mm)" value={product.sheetWidthMm} />
            <RefRow label="Requested Thickness (micron)" value={product.sheetThicknessMicron} />
            <RefRow label="Requested Roll Weight (kg)" value={product.rollWeightKg} />
            <RefRow label="Requested Product Weight (g)" value={product.productWeightG} />
          </>
        }
        right={
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <Field label="Base Material">
                <SelectField
                  value={engineering.materialSheet.baseMaterial}
                  onChange={(v) => {
                    const opt = OPT_SPEED_MAP[v] || { A: "", B: "" };
                    updateSection("materialSheet", {
                      baseMaterial: v,
                      density: DENSITY_MAP[v] ? String(DENSITY_MAP[v]) : engineering.materialSheet.density,
                    });
                    updateSection("extrusion", {
                      grossSpeedA_kg_hr: opt.A ? String(opt.A) : engineering.extrusion.grossSpeedA_kg_hr,
                      grossSpeedB_kg_hr: opt.B ? String(opt.B) : engineering.extrusion.grossSpeedB_kg_hr,
                    });
                  }}
                  options={["PET", "PP", "PS", "Other"]}
                />
              </Field>

              <Field label="Density (g/cm³)">
                <Input
                  value={engineering.materialSheet.density}
                  onChange={(v) => updateSection("materialSheet", { density: v })}
                />
              </Field>

              <Field label="Structure">
                <SelectField
                  value={engineering.materialSheet.structure}
                  onChange={(v) => updateSection("materialSheet", { structure: v })}
                  options={["AB", "ABA"]}
                />
              </Field>

              <Field label="Layer A %">
                <Input
                  value={engineering.materialSheet.layerAPct}
                  onChange={(v) => updateSection("materialSheet", { layerAPct: v })}
                />
                {(n(engineering.materialSheet.layerAPct) < 0 ||
  n(engineering.materialSheet.layerAPct) > 100) && (
  <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
    Layer A % must be between 0 and 100.
  </div>
)}
              </Field>

              <Field label="Process Waste %">
                <Input
                  value={engineering.materialSheet.processWastePct}
                  onChange={(v) => updateSection("materialSheet", { processWastePct: v })}
                />
              </Field>

              <Field label="Coating Layer Used">
                <SelectField
                  value={engineering.materialSheet.coatingUsed}
                  onChange={(v) => updateSection("materialSheet", { coatingUsed: v })}
                  options={["Yes", "No"]}
                />
              </Field>
            </div>

            {engineering.materialSheet.coatingUsed === "Yes" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Coating Name">
                  <Input
                    value={engineering.materialSheet.coatingName}
                    onChange={(v) => updateSection("materialSheet", { coatingName: v })}
                  />
                </Field>
                <Field label="Coating Weight (g/m²)">
                  <Input
                    value={engineering.materialSheet.coatingWeight_g_m2}
                    onChange={(v) => updateSection("materialSheet", { coatingWeight_g_m2: v })}
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
            )}

            <div className="rounded-xl border p-4 space-y-4">
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

            <div className="rounded-xl border p-4 space-y-4">
              <div className="font-medium">Sheet Specification</div>

              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <Field label="Net Width (mm)">
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
                <Field label="Thickness (micron)">
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

                <Field label="Roll Weight (kg)">
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
                <div className="font-medium">Small Sheet Thickness Calculator</div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <Field label="Surface Mode">
                    <SelectField
                      value={engineering.sheetSpecs.surfaceMode}
                      onChange={(v) => updateSection("sheetSpecs", { surfaceMode: v })}
                      options={["Round", "Manual"]}
                    />
                  </Field>

                  {engineering.sheetSpecs.surfaceMode === "Round" ? (
                    <Field label="Product Diameter (mm)">
                      <Input
                        value={engineering.sheetSpecs.productDiameter_mm || product.topDiameterMm}
                        onChange={(v) => updateSection("sheetSpecs", { productDiameter_mm: v })}
                      />
                    </Field>
                  ) : (
                    <Field label="Surface Area (cm²)">
                      <Input
                        value={engineering.sheetSpecs.manualSurfaceArea_cm2}
                        onChange={(v) => updateSection("sheetSpecs", { manualSurfaceArea_cm2: v })}
                      />
                    </Field>
                  )}

                  <Field label="Material Density (g/cm³)">
                    <Input value={fmt(density, 3)} onChange={() => {}} disabled />
                  </Field>

                  <Field label="Calculator Mode">
                    <SelectField
                      value={engineering.sheetSpecs.thicknessCalcMode}
                      onChange={(v) => updateSection("sheetSpecs", { thicknessCalcMode: v })}
                      options={["Calculate Thickness", "Calculate Weight"]}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <RefRow
                    label="Surface Area (cm²)"
                    value={sheetDerived.surfaceArea_cm2 ? fmt(sheetDerived.surfaceArea_cm2, 3) : "—"}
                  />

                  <Field label="Sheet Thickness (micron)">
                    <Input
                      value={engineering.sheetSpecs.thicknessCalc_mic}
                      onChange={(v) => updateSection("sheetSpecs", { thicknessCalc_mic: v })}
                      disabled={engineering.sheetSpecs.thicknessCalcMode === "Calculate Thickness"}
                    />
                  </Field>

                  <Field label="Product Target Weight (g)">
                    <Input
                      value={engineering.sheetSpecs.weightCalc_g || product.productWeightG}
                      onChange={(v) => updateSection("sheetSpecs", { weightCalc_g: v })}
                      disabled={engineering.sheetSpecs.thicknessCalcMode === "Calculate Weight"}
                    />
                  </Field>

                  <RefRow
                    label="Auto Result"
                    value={
                      engineering.sheetSpecs.thicknessCalcMode === "Calculate Thickness"
                        ? `${fmt(sheetDerived.calcThicknessFromWeight, 2)} micron`
                        : `${fmt(sheetDerived.calcWeightFromThickness, 2)} g`
                    }
                  />
                </div>

                {requestedWeight > 0 && Math.abs(weightDiffPct) > 5 && (
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-700 p-3 text-sm">
                    Calculated/requested weight differs by {fmt(Math.abs(weightDiffPct), 2)}%.
                  </div>
                )}
              </div>

              <div className="rounded-xl border p-4 space-y-4">
                <div className="font-medium">Material Consumption per Ton</div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <RefRow
                    label="Plastic Share"
                    value={sheetDerived.plasticShare ? `${fmt(sheetDerived.plasticShare * 100, 2)}%` : "—"}
                  />
                  <RefRow
                    label="Coating Share"
                    value={engineering.materialSheet.coatingUsed === "Yes" ? `${fmt(sheetDerived.coatingShare * 100, 2)}%` : "0%"}
                  />
                  <RefRow
                    label="Coating Kg / Ton"
                    value={engineering.materialSheet.coatingUsed === "Yes" ? `${fmt(sheetDerived.coatingKgPerTon, 3)} kg` : "0 kg"}
                  />
                  <RefRow
                    label="Total Weight / m²"
                    value={sheetDerived.totalWeightPerM2_g ? `${fmt(sheetDerived.totalWeightPerM2_g, 3)} g/m²` : "—"}
                  />
                </div>

                <div className="overflow-auto rounded-xl border">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                    <tr>
  <th className="text-left p-3">Material</th>
  <th className="text-left p-3">Layer A %</th>
  <th className="text-left p-3">Layer B %</th>
  <th className="text-left p-3">Final %</th>
  <th className="text-left p-3">Kg / Ton</th>
</tr>
                    </thead>
                    <tbody>
                      {sheetDerived.materialPerTonRows.map((row) => (
                       <tr key={row.name} className="border-t">
  <td className="p-3">{row.name}</td>
  <td className="p-3">{fmt(row.pctLayerA, 2)}%</td>
  <td className="p-3">{fmt(row.pctLayerB, 2)}%</td>
  <td className="p-3">{fmt(row.totalPct, 2)}%</td>
  <td className="p-3">{fmt(row.kgPerTon, 3)} kg</td>
</tr>
                      ))}
                      {engineering.materialSheet.coatingUsed === "Yes" && (
                        <tr className="border-t bg-yellow-50">
                          <td className="p-3">{engineering.materialSheet.coatingName || "Coating"}</td>
                          <td className="p-3">{fmt(sheetDerived.coatingShare * 100, 2)}%</td>
                          <td className="p-3">{fmt(sheetDerived.coatingKgPerTon, 3)} kg</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-xl border p-4 space-y-4">
                <div className="font-medium">Sheet Roll Packaging Data</div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
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

                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                  <Field label="Pallet Type">
                    <Input
                      value={engineering.sheetPackaging.palletType}
                      onChange={(v) => updateSection("sheetPackaging", { palletType: v })}
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
        }
      />

      <Section
        title="2. Extrusion Process Data"
        left={
          <>
            <RefRow label="Requested Product" value={product.productType} />
            <RefRow label="Material" value={baseMaterial} />
            <RefRow
              label="Requested Width / Thickness"
              value={`${product.sheetWidthMm || "—"} mm / ${product.sheetThicknessMicron || "—"} micron`}
            />
          </>
        }
        right={
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <Field label="Line Name">
                <Input
                  value={engineering.extrusion.lineName}
                  onChange={(v) => updateSection("extrusion", { lineName: v })}
                />
              </Field>
              <Field label="Scrap Rate %">
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
              <Field label="Efficiency %">
                <Input
                  value={engineering.extrusion.efficiencyPct}
                  onChange={(v) => updateSection("extrusion", { efficiencyPct: v })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <Field label={`Gross Speed Extruder A (optimum ${OPT_SPEED_MAP[baseMaterial]?.A || 0} kg/hr)`}>
                <Input
                  value={engineering.extrusion.grossSpeedA_kg_hr}
                  onChange={(v) => updateSection("extrusion", { grossSpeedA_kg_hr: v })}
                />
              </Field>

              <Field label={`Gross Speed Extruder B (optimum ${OPT_SPEED_MAP[baseMaterial]?.B || 0} kg/hr)`}>
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
        }
      />

      <Section
        title="3. Thermoforming Data"
        left={
          <>
            <RefRow label="Requested Weight (g)" value={product.productWeightG} />
            <RefRow label="Requested Type" value={product.productType} />
            <RefRow
              label="Requested Pieces / Stack"
              value={packagingReq?.primary?.pcsPerStack}
            />
          </>
        }
        right={
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Field label="Applicable">
                <SelectField
                  value={engineering.thermo.applicable}
                  onChange={(v) => updateSection("thermo", { applicable: v })}
                  options={["Yes", "No"]}
                />
              </Field>

              <Field label="Machine">
                <SelectField
                  value={engineering.thermo.machineName}
                  onChange={(v) => updateSection("thermo", { machineName: v })}
                  options={["RDM73K", "RDK80"]}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Field label="Mold Base Name">
                <Input value={engineering.thermo.moldBaseName} onChange={(v) => updateSection("thermo", { moldBaseName: v })} />
              </Field>
              <Field label="Mold Base Code">
                <Input value={engineering.thermo.moldBaseCode} onChange={(v) => updateSection("thermo", { moldBaseCode: v })} />
              </Field>
              <Field label="Insert Name">
                <Input value={engineering.thermo.insertName} onChange={(v) => updateSection("thermo", { insertName: v })} />
              </Field>
              <Field label="Insert Code">
                <Input value={engineering.thermo.insertCode} onChange={(v) => updateSection("thermo", { insertCode: v })} />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Field label="Bottom Name">
                <Input value={engineering.thermo.bottomName} onChange={(v) => updateSection("thermo", { bottomName: v })} />
              </Field>
              <Field label="Bottom Code">
                <Input value={engineering.thermo.bottomCode} onChange={(v) => updateSection("thermo", { bottomCode: v })} />
              </Field>
              <Field label="Plug Assist Name">
                <Input value={engineering.thermo.plugAssistName} onChange={(v) => updateSection("thermo", { plugAssistName: v })} />
              </Field>
              <Field label="Plug Assist Code">
                <Input value={engineering.thermo.plugAssistCode} onChange={(v) => updateSection("thermo", { plugAssistCode: v })} />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Field label="Cutting Plate Name">
                <Input value={engineering.thermo.cuttingPlateName} onChange={(v) => updateSection("thermo", { cuttingPlateName: v })} />
              </Field>
              <Field label="Cutting Plate Code">
                <Input value={engineering.thermo.cuttingPlateCode} onChange={(v) => updateSection("thermo", { cuttingPlateCode: v })} />
              </Field>
              <Field label="Stacking Plate Name">
                <Input value={engineering.thermo.stackingPlateName} onChange={(v) => updateSection("thermo", { stackingPlateName: v })} />
              </Field>
              <Field label="Stacking Plate Code">
                <Input value={engineering.thermo.stackingPlateCode} onChange={(v) => updateSection("thermo", { stackingPlateCode: v })} />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <Field label="No. of Cavities">
                <Input value={engineering.thermo.cavities} onChange={(v) => updateSection("thermo", { cavities: v })} />
              </Field>
              <Field label="CPM">
                <Input value={engineering.thermo.cpm} onChange={(v) => updateSection("thermo", { cpm: v })} />
              </Field>
              <Field label="Efficiency %">
                <Input value={engineering.thermo.efficiencyPct} onChange={(v) => updateSection("thermo", { efficiencyPct: v })} />
              </Field>
              <Field label="Sheet Utilization %">
                <Input value={engineering.thermo.sheetUtilizationPct} onChange={(v) => updateSection("thermo", { sheetUtilizationPct: v })} />
              </Field>
              <Field label="Confirmed Unit Weight (g)">
                <Input value={engineering.thermo.unitWeight_g} onChange={(v) => updateSection("thermo", { unitWeight_g: v })} />
              </Field>
            </div>

            {requestedWeight > 0 &&
              n(engineering.thermo.unitWeight_g) > 0 &&
              Math.abs((n(engineering.thermo.unitWeight_g) - requestedWeight) / requestedWeight) > 0.05 && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-700 p-3 text-sm">
                  Confirmed unit weight is different from request weight.
                </div>
              )}

            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <RefRow label="Pcs / Hr" value={engineering.thermo.pcsPerHour ? fmt(engineering.thermo.pcsPerHour, 0) : "—"} />
              <RefRow label="Pcs / Shift (12h)" value={engineering.thermo.pcsPerShift12h ? fmt(engineering.thermo.pcsPerShift12h, 0) : "—"} />
              <RefRow label="Pcs / Day (24h)" value={engineering.thermo.pcsPerDay24h ? fmt(engineering.thermo.pcsPerDay24h, 0) : "—"} />
              <RefRow label="Pcs / Week" value={engineering.thermo.pcsPerWeek ? fmt(engineering.thermo.pcsPerWeek, 0) : "—"} />
              <RefRow label="Pcs / Month" value={engineering.thermo.pcsPerMonth ? fmt(engineering.thermo.pcsPerMonth, 0) : "—"} />
              <RefRow label="Pcs / Year (330d)" value={engineering.thermo.pcsPerYear330d ? fmt(engineering.thermo.pcsPerYear330d, 0) : "—"} />
            </div>
          </div>
        }
      />

      <Section
        title="4. Thermoformed Product Packaging Data"
        left={
          <>
            <RefRow label="Requested Delivery Location" value={deliveryReq?.deliveryLocationConfirm || customer.deliveryLocation} />
            <RefRow label="Requested Primary Packaging" value={packagingReq?.primary?.bagSleeveMaterial || "—"} />
            <RefRow label="Requested Carton Type" value={packagingReq?.secondary?.cartonType || "—"} />
          </>
        }
        right={
          <div className="space-y-5">
            <div className="rounded-xl border p-4 space-y-4">
              <div className="font-medium">Primary Packaging</div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Field label="Pieces / Stack">
                  <Input
                    value={engineering.packaging.primary.pcsPerStack}
                    onChange={(v) => updateNested("packaging", "primary", { pcsPerStack: v })}
                  />
                </Field>
                <Field label="Stacks / Primary Pack">
                  <Input
                    value={engineering.packaging.primary.stacksPerPrimary}
                    onChange={(v) => updateNested("packaging", "primary", { stacksPerPrimary: v })}
                  />
                </Field>
                <Field label="Primary Pack Name">
                  <Input
                    value={engineering.packaging.primary.primaryName}
                    onChange={(v) => updateNested("packaging", "primary", { primaryName: v })}
                  />
                </Field>
                <Field label="Primary Pack Material">
                  <Input
                    value={engineering.packaging.primary.primaryMaterial}
                    onChange={(v) => updateNested("packaging", "primary", { primaryMaterial: v })}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Field label="Primary Pack Length (mm)">
                  <Input
                    value={engineering.packaging.primary.primaryLength_mm}
                    onChange={(v) => updateNested("packaging", "primary", { primaryLength_mm: v })}
                  />
                </Field>
                <Field label="Primary Pack Width (mm)">
                  <Input
                    value={engineering.packaging.primary.primaryWidth_mm}
                    onChange={(v) => updateNested("packaging", "primary", { primaryWidth_mm: v })}
                  />
                </Field>
                <Field label="Primary Pack Height (mm)">
                  <Input
                    value={engineering.packaging.primary.primaryHeight_mm}
                    onChange={(v) => updateNested("packaging", "primary", { primaryHeight_mm: v })}
                  />
                </Field>
                <Field label="Primary Artwork Code">
                  <Input
                    value={engineering.packaging.primary.primaryArtworkCode}
                    onChange={(v) => updateNested("packaging", "primary", { primaryArtworkCode: v })}
                  />
                </Field>
              </div>
            </div>

            <div className="rounded-xl border p-4 space-y-4">
              <div className="font-medium">Secondary Packaging</div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Field label="Primary Packs / Secondary">
                  <Input
                    value={engineering.packaging.secondary.primariesPerSecondary}
                    onChange={(v) => updateNested("packaging", "secondary", { primariesPerSecondary: v })}
                  />
                </Field>
                <Field label="Secondary Pack Name">
                  <Input
                    value={engineering.packaging.secondary.secondaryName}
                    onChange={(v) => updateNested("packaging", "secondary", { secondaryName: v })}
                  />
                </Field>
                <Field label="Secondary Type">
                  <SelectField
                    value={engineering.packaging.secondary.secondaryType}
                    onChange={(v) => updateNested("packaging", "secondary", { secondaryType: v })}
                    options={[
                      { value: "Single wall", label: "Single wall" },
                      { value: "Double wall", label: "Double wall" },
                    ]}
                  />
                </Field>
                <Field label="Labels / Box">
                  <Input
                    value={engineering.packaging.secondary.labelsPerBox}
                    onChange={(v) => updateNested("packaging", "secondary", { labelsPerBox: v })}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <Field label="Secondary Length (mm)">
                  <Input
                    value={engineering.packaging.secondary.secondaryLength_mm}
                    onChange={(v) => updateNested("packaging", "secondary", { secondaryLength_mm: v })}
                  />
                </Field>
                <Field label="Secondary Width (mm)">
                  <Input
                    value={engineering.packaging.secondary.secondaryWidth_mm}
                    onChange={(v) => updateNested("packaging", "secondary", { secondaryWidth_mm: v })}
                  />
                </Field>
                <Field label="Secondary Height (mm)">
                  <Input
                    value={engineering.packaging.secondary.secondaryHeight_mm}
                    onChange={(v) => updateNested("packaging", "secondary", { secondaryHeight_mm: v })}
                  />
                </Field>
                <Field label="Label Length (mm)">
                  <Input
                    value={engineering.packaging.secondary.labelLength_mm}
                    onChange={(v) => updateNested("packaging", "secondary", { labelLength_mm: v })}
                  />
                </Field>
                <Field label="Label Width (mm)">
                  <Input
                    value={engineering.packaging.secondary.labelWidth_mm}
                    onChange={(v) => updateNested("packaging", "secondary", { labelWidth_mm: v })}
                  />
                </Field>
              </div>
            </div>

            <div className="rounded-xl border p-4 space-y-4">
              <div className="font-medium">Pallet</div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Field label="Use Pallet">
                  <SelectField
                    value={engineering.packaging.pallet.palletSelected}
                    onChange={(v) => updateNested("packaging", "pallet", { palletSelected: v })}
                    options={["Yes", "No"]}
                  />
                </Field>

                {engineering.packaging.pallet.palletSelected === "Yes" && (
                  <>
                    <Field label="Pallet Width (mm)">
                      <Input
                        value={engineering.packaging.pallet.palletWidth_mm}
                        onChange={(v) => updateNested("packaging", "pallet", { palletWidth_mm: v })}
                      />
                    </Field>
                    <Field label="Pallet Height (mm)">
                      <Input
                        value={engineering.packaging.pallet.palletHeight_mm}
                        onChange={(v) => updateNested("packaging", "pallet", { palletHeight_mm: v })}
                      />
                    </Field>
                    <Field label="Pallet Length (mm)">
                      <Input
                        value={engineering.packaging.pallet.palletLength_mm}
                        onChange={(v) => updateNested("packaging", "pallet", { palletLength_mm: v })}
                      />
                    </Field>
                    <Field label="Pallet Type">
                      <Input
                        value={engineering.packaging.pallet.palletType}
                        onChange={(v) => updateNested("packaging", "pallet", { palletType: v })}
                      />
                    </Field>
                    <Field label="Boxes / Pallet">
                      <Input
                        value={engineering.packaging.pallet.boxesPerPallet}
                        onChange={(v) => updateNested("packaging", "pallet", { boxesPerPallet: v })}
                      />
                    </Field>
                    <Field label="Stretch / Pallet (kg)">
                      <Input
                        value={engineering.packaging.pallet.stretchWeightPerPallet_kg}
                        onChange={(v) =>
                          updateNested("packaging", "pallet", { stretchWeightPerPallet_kg: v })
                        }
                      />
                    </Field>
                    <Field label="Labels / Pallet">
                      <Input
                        value={engineering.packaging.pallet.labelsPerPallet}
                        onChange={(v) => updateNested("packaging", "pallet", { labelsPerPallet: v })}
                      />
                    </Field>
                  </>
                )}
              </div>

              <Field label="Packaging Notes / Special Instructions">
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
                <RefRow label="pcs / stack" value={engineering.packaging.primary.pcsPerStack || "—"} />
                <RefRow label="stacks / primary" value={engineering.packaging.primary.stacksPerPrimary || "—"} />
                <RefRow label="pcs / primary" value={thermoPackagingDerived.pcsPerPrimary ? fmt(thermoPackagingDerived.pcsPerPrimary, 0) : "—"} />
                <RefRow label="primary / carton" value={engineering.packaging.secondary.primariesPerSecondary || "—"} />
                <RefRow label="pcs / carton" value={thermoPackagingDerived.pcsPerCarton ? fmt(thermoPackagingDerived.pcsPerCarton, 0) : "—"} />
                <RefRow label="pcs / pallet" value={thermoPackagingDerived.pcsPerPallet ? fmt(thermoPackagingDerived.pcsPerPallet, 0) : "—"} />
              </div>
            </div>
          </div>
        }
      />

      <Section
        title="5. Freight / Logistics"
        left={
          <>
            <RefRow label="Requested Delivery Location" value={deliveryReq?.deliveryLocationConfirm || customer.deliveryLocation} />
            <RefRow label="Requested Qty / Truck" value={`${deliveryReq?.desiredQtyPerTruck || "—"} ${deliveryReq?.desiredQtyPerTruckUnit || ""}`} />
            <RefRow label="Truck Size" value={deliveryReq?.truckSize} />
          </>
        }
        right={
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Field label="Delivery Mode">
                <Input
                  value={engineering.freight.deliveryMode}
                  onChange={(v) => updateSection("freight", { deliveryMode: v })}
                />
              </Field>

              <Field label="Freight Basis">
                <SelectField
                  value={engineering.freight.freightBasis}
                  onChange={(v) => updateSection("freight", { freightBasis: v })}
                  options={["Per Truck", "Per Ton", "Per Pallet", "Per 1000 pcs"]}
                />
              </Field>

              {isSheet || engineering.packaging.pallet.palletSelected === "Yes" ? (
                <Field label="Pallets / Truck">
                  <Input
                    value={engineering.freight.palletsPerTruck}
                    onChange={(v) => updateSection("freight", { palletsPerTruck: v })}
                  />
                </Field>
              ) : (
                <Field label="Cartons / Truck">
                  <Input
                    value={engineering.freight.cartonsPerTruck}
                    onChange={(v) => updateSection("freight", { cartonsPerTruck: v })}
                  />
                </Field>
              )}

              <Field label="Notes">
                <Input
                  value={engineering.freight.notes}
                  onChange={(v) => updateSection("freight", { notes: v })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {!isSheet && (
                <RefRow
                  label="Cartons / Truck"
                  value={freightDerived.cartonsPerTruck ? fmt(freightDerived.cartonsPerTruck, 0) : "—"}
                />
              )}
              {!isSheet && (
                <RefRow
                  label="pcs / Truck"
                  value={freightDerived.pcsPerTruck ? fmt(freightDerived.pcsPerTruck, 0) : "—"}
                />
              )}
              {(isSheet || engineering.packaging.pallet.palletSelected === "Yes") && (
                <RefRow
                  label="Pallets / Truck"
                  value={engineering.freight.palletsPerTruck || "—"}
                />
              )}
              <RefRow
                label="Net Product Weight / Truck (kg)"
                value={freightDerived.netProductWeightPerTruck_kg ? fmt(freightDerived.netProductWeightPerTruck_kg, 2) : "—"}
              />
            </div>
          </div>
        }
      />

      <Section
        title="6. Notes"
        left={<RefRow label="Customer Notes" value={customer.customerNotes} />}
        right={
          <Field label="Engineering Logistics Notes">
            <TextArea
              value={engineering.freight.notes}
              onChange={(v) => updateSection("freight", { notes: v })}
            />
          </Field>
        }
      />
    </div>
  );
}