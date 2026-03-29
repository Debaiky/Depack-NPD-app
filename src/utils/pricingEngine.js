/* =========================================================
   DEPACK PRICING ENGINE (MASTER CORE)
   ========================================================= */

/* ================= BASIC HELPERS ================= */

export const toNum = (v) => {
  if (v === null || v === undefined) return 0;
  const s = String(v).replace(/,/g, "").trim();
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

export const fmt = (v, d = 3) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: d,
  }).format(v || 0);

/* ================= MATERIAL DENSITY ================= */

export const getDensity = (mat, custom) => {
  if (mat === "PET") return 1.38;
  if (mat === "PP") return 0.92;
  if (mat === "PS") return 1.04;
  return toNum(custom) || 1.2;
};

/* =========================================================
   1. SHEET ROLL CALCULATION
   ========================================================= */

export function calcSheet(data) {
  const density = getDensity(data.baseMaterial, data.customDensity);

  const width = toNum(data.netWidth_mm);
  const trim = toNum(data.edgeTrim_mm);
  const thickness = toNum(data.thickness_mic);

  const grossWidth = width + 2 * trim;

  const rollR = toNum(data.rollDiameter_mm) / 2;
  const coreR = (toNum(data.coreDiameter_mm) || 152) / 2;

  const volume = Math.PI * (rollR ** 2 - coreR ** 2) * width;
  const rollWeight = (volume / 1000) * density / 1000;

  /* ===== LINE SPEED ===== */

  const density_kg_m3 = density * 1000;
  const width_m = width / 1000;
  const thickness_m = thickness / 1e6;

  const netKgHr = toNum(data.realisticNetSpeed);
  const tonsPerDay = (netKgHr * 24) / 1000;

  const line_mpm =
    netKgHr > 0
      ? netKgHr / (density_kg_m3 * width_m * thickness_m * 60)
      : 0;

  /* ===== MATERIAL CONSUMPTION ===== */

  const materials = {};

  const addMaterial = (name, kg) => {
    if (!materials[name]) materials[name] = 0;
    materials[name] += kg;
  };

  const totalPolymer = 1000; // per ton

  (data.layerA || []).forEach((m) => {
    addMaterial(m.name, (totalPolymer * toNum(m.pct)) / 100);
  });

  (data.layerB || []).forEach((m) => {
    addMaterial(m.name, (totalPolymer * toNum(m.pct)) / 100);
  });

  const bom = Object.entries(materials).map(([name, kg]) => ({
    name,
    kg,
  }));

  return {
    rollWeight,
    tonsPerDay,
    netKgHr,
    line_mpm,
    bom,
    grossWidth,
  };
}

/* =========================================================
   2. SHEET PRICING
   ========================================================= */

export function calcSheetCost(calc, pricing) {
  const matPrices = pricing.matPrices || {};
  const packPrices = pricing.packPrices || {};

  const materialCost = calc.bom.reduce((sum, m) => {
    const price = toNum(matPrices[m.name]);
    return sum + m.kg * price;
  }, 0);

  const packagingCost = (pricing.packaging || []).reduce((sum, p) => {
    const price = toNum(packPrices[p.name]);
    return sum + p.qty * price;
  }, 0);

  const conversionCost =
    calc.tonsPerDay > 0
      ? toNum(pricing.convPerDay) / calc.tonsPerDay
      : 0;

  const total = materialCost + packagingCost + conversionCost;

  return {
    materialCost,
    packagingCost,
    conversionCost,
    total,
  };
}

/* =========================================================
   3. THERMOFORMING PRODUCTIVITY
   ========================================================= */

export function calcThermo(spec) {
  const cav = Math.max(1, toNum(spec.cavities));
  const cpm = toNum(spec.cpm);
  const eff = toNum(spec.efficiency) / 100;

  const pcsHr = cav * cpm * 60 * eff;
  const pcsDay = pcsHr * 24;

  return {
    pcsHr,
    pcsDay,
  };
}

/* =========================================================
   4. THERMO COSTING
   ========================================================= */

export function calcThermoCost({
  spec,
  sheetCostPerTon,
  packaging,
  prices,
  finance,
}) {
  const unitWeight = toNum(spec.unitWeight);

  /* ===== SHEET COST ===== */
  const sheetPer1000 =
    ((sheetCostPerTon || 0) / 1_000_000) * unitWeight * 1000;

  /* ===== PACKAGING ===== */
  const packagingPer1000 =
    (packaging || []).reduce((sum, p) => {
      const price = toNum(prices[p.name]);
      return sum + price * p.qty;
    }, 0);

  /* ===== WORKING CAPITAL ===== */
  const DSO = toNum(finance.DSO);
  const DIO = toNum(finance.DIO);
  const DPO = toNum(finance.DPO);
  const interest = toNum(finance.interest) / 100;

  const ccc = DSO + DIO - DPO;

  const workingCap =
    (sheetPer1000 + packagingPer1000) *
    interest *
    (ccc / 365);

  /* ===== CONVERSION ===== */
  const pcsDay = toNum(spec.pcsDay);

  const convPer1000 =
    pcsDay > 0
      ? (toNum(finance.convPerDay) / pcsDay) * 1000
      : 0;

  const total =
    sheetPer1000 + packagingPer1000 + workingCap + convPer1000;

  return {
    sheetPer1000,
    packagingPer1000,
    workingCap,
    convPer1000,
    total,
  };
}

/* =========================================================
   5. INVESTMENT PAYBACK
   ========================================================= */

export function calcInvestment(investments, conversionPer1000, usdEgp) {
  let totalEGP = 0;

  investments.forEach((i) => {
    const cost = toNum(i.cost);

    totalEGP +=
      i.currency === "USD" ? cost * usdEgp : cost;
  });

  const payback =
    conversionPer1000 > 0
      ? totalEGP / (conversionPer1000 / 1000)
      : 0;

  return {
    totalEGP,
    paybackUnits: payback,
  };
}