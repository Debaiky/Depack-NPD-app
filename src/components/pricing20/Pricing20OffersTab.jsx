import { useEffect, useMemo } from "react";

function n(v) {
  const x = parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isNaN(x) ? 0 : x;
}

function fmt(v, d = 3) {
  if (v === "" || v === null || v === undefined || Number.isNaN(Number(v))) {
    return "—";
  }

  return Number(v).toLocaleString(undefined, {
    maximumFractionDigits: d,
    minimumFractionDigits: 0,
  });
}

function uid(prefix = "offer") {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function todayLocalIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function detectCase(requestData) {
  return requestData?.product?.productType === "Sheet Roll" ? "sheet" : "non_sheet";
}

function currencyToEgp(value, currency, usdEgp, eurUsd) {
  const amount = n(value);
  const curr = String(currency || "EGP").trim().toUpperCase();

  if (curr === "USD") return amount * n(usdEgp);
  if (curr === "EUR") return amount * n(eurUsd) * n(usdEgp);
  return amount;
}

function egpToUsd(value, usdEgp) {
  const rate = n(usdEgp);
  if (!rate) return 0;
  return n(value) / rate;
}

function egpToEur(value, usdEgp, eurUsd) {
  const eurUsdRate = n(eurUsd);
  if (!eurUsdRate) return 0;
  return egpToUsd(value, usdEgp) / eurUsdRate;
}

function egpToOfferCurrency(valueEgp, currency, usdEgp, eurUsd) {
  const curr = String(currency || "EGP").toUpperCase();
  if (curr === "USD") return egpToUsd(valueEgp, usdEgp);
  if (curr === "EUR") return egpToEur(valueEgp, usdEgp, eurUsd);
  return n(valueEgp);
}

function perTonToPer1000(perTon, productWeightG, sheetUtilPct) {
  const weightG = n(productWeightG);
  const util = n(sheetUtilPct) > 0 ? n(sheetUtilPct) / 100 : 1;

  if (!weightG || !util) return 0;

  return (n(perTon) * weightG) / (1000 * util);
}

function getPcsPerCarton(scenarioEngineering) {
  const pcsPerStack = n(scenarioEngineering?.packaging?.primary?.pcsPerStack);
  const stacksPerPrimary = n(scenarioEngineering?.packaging?.primary?.stacksPerPrimary);
  const primariesPerSecondary = n(
    scenarioEngineering?.packaging?.secondary?.primariesPerSecondary
  );

  return pcsPerStack * stacksPerPrimary * primariesPerSecondary;
}

function getProductWeightG(requestData, scenarioEngineering) {
  return (
    n(scenarioEngineering?.thermo?.unitWeight_g) ||
    n(requestData?.product?.productWeightG) ||
    0
  );
}

function getSheetUtilPct(scenarioEngineering) {
  return n(scenarioEngineering?.thermo?.sheetUtilizationPct) || 100;
}

function getDecorationType(requestData) {
  return requestData?.product?.productType === "Sheet Roll"
    ? "No decoration"
    : requestData?.decoration?.decorationType || "No decoration";
}

function dateKeyFromIso(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = String(dateStr).split("-");
  if (!y || !m || !d) return "";
  return `${d}${m}${String(y).slice(-2)}`;
}

function buildOfferNo(dateStr, offers = [], currentOfferId = "") {
  const prefix = dateKeyFromIso(dateStr);
  if (!prefix) return "";

  let maxSerial = 0;

  (offers || []).forEach((offer) => {
    if (!offer || offer.id === currentOfferId) return;
    const no = String(offer.offerNo || "");
    const match = no.match(new RegExp(`^${prefix}-(\\d{3})$`));
    if (!match) return;
    maxSerial = Math.max(maxSerial, Number(match[1]));
  });

  return `${prefix}-${String(maxSerial + 1).padStart(3, "0")}`;
}

const COMPANY_INFO = {
  name: "Depack for Advanced Packages S.A.E.",
  website: "www.depack.co",
  address:
    "Plot 9/6 Ahmous St., Industrial Area A2, 10th of Ramadan City, Al Sharqiyah, Egypt.",
  logoPath: "/images/depack-logo.png",
};

const INCOTERM_OPTIONS = [
  "EXW",
  "FCA",
  "FOB",
  "CFR",
  "CIF",
  "CPT",
  "CIP",
  "DAP",
  "DPU",
  "DDP",
];

const PAYMENT_TERM_OPTIONS = [
  {
    code: "CIA",
    name: "Cash in Advance",
    description:
      "Seller requires upfront payment by the customer before order shipment.",
  },
  {
    code: "PIA",
    name: "Payment in Advance",
    description:
      "The customer must pay the seller before delivery of goods or before work starts.",
  },
  {
    code: "CWO",
    name: "Cash with Order",
    description:
      "The customer must include payment when submitting the order.",
  },
  {
    code: "CBS",
    name: "Cash before Shipment",
    description:
      "The customer is required to pay the seller before shipment of goods.",
  },
  {
    code: "COD",
    name: "Cash on Delivery",
    description:
      "The customer provides immediate payment when goods are delivered.",
  },
  {
    code: "CND",
    name: "Cash Next Delivery",
    description:
      "The customer must pay for the previous recurring order to receive the next order.",
  },
  {
    code: "Net 15",
    name: "Net 15 days",
    description: "Invoice due within 15 days from invoice date.",
  },
  {
    code: "Net 30",
    name: "Net 30",
    description: "Invoice due within 30 days from invoice date.",
  },
  {
    code: "2/10 Net 30",
    name: "2/10 Net 30",
    description:
      "2% discount if paid within 10 days, otherwise full amount due within 30 days.",
  },
  {
    code: "Net 45",
    name: "Net 45 days",
    description: "Invoice due within 45 days from invoice date.",
  },
  {
    code: "Net 60",
    name: "Net 60",
    description: "Invoice due within 60 days from invoice date.",
  },
  {
    code: "EOM",
    name: "End of Month",
    description: "Invoice payable by the end of the month of issue.",
  },
  {
    code: "MFI",
    name: "Month Following Invoice",
    description:
      "Invoice due in the month following invoice based on the agreed cutoff day.",
  },
  {
    code: "CAD",
    name: "Cash against documents",
    description:
      "Payment is made against shipping or title documents.",
  },
  {
    code: "LC",
    name: "Letter of credit",
    description:
      "Payment secured through documentary letter of credit.",
  },
];

function getPaymentTerm(termCode) {
  return (
    PAYMENT_TERM_OPTIONS.find((t) => t.code === termCode) || PAYMENT_TERM_OPTIONS[0]
  );
}

function buildNewOffer({
  offers = [],
  requestId = "",
  customerName = "",
  preparedBy = "",
  defaultCurrency = "EGP",
  defaultFreightOption = "",
}) {
  const id = uid("offer");
  const offerDate = todayLocalIso();

  return {
    id,
    offerDate,
    offerNo: buildOfferNo(offerDate, offers, id),
    requestCode: requestId || "",
    customerName: customerName || "",
    customerAddress: "",
    contactPerson: "",
    contactEmail: "",
    phoneNumber: "",
    preparedBy: preparedBy || "",
    offerCurrency: defaultCurrency || "EGP",

    breakdown: {
      material: true,
      decoration: true,
      packaging: true,
      waste: true,
      freight: true,
      amortization: true,
      conversion: true,
    },

    marginMode: "none", // none | pct | amount
    marginValue: "",

    selectedFreightOption: defaultFreightOption || "",
    freightFrom: "",
    freightTo: "",
    incoterm: "EXW",

    terms: {
      validity: "",
      paymentMode: "single", // single | split
      singlePaymentTerm: "CIA",

      split1Pct: "50",
      split1Term: "PIA",
      split2Pct: "50",
      split2Term: "CBS",

      additionalTerms: "",
    },
  };
}

function SmallInput({
  label,
  value,
  onChange,
  readOnly = false,
  placeholder = "",
  type = "text",
}) {
  return (
    <label className="block space-y-1">
      <div className="text-xs text-gray-500">{label}</div>
      <input
        type={type}
        className={`w-full border rounded-lg px-3 py-2 text-sm ${
          readOnly ? "bg-gray-100 text-gray-600" : "bg-white"
        }`}
        value={value ?? ""}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </label>
  );
}

function SmallSelect({ label, value, onChange, options = [], disabled = false }) {
  return (
    <label className="block space-y-1">
      <div className="text-xs text-gray-500">{label}</div>
      <select
        className={`w-full border rounded-lg px-3 py-2 text-sm ${
          disabled ? "bg-gray-100 text-gray-600" : "bg-white"
        }`}
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
      >
        {options.map((opt) => {
          const optionValue = typeof opt === "string" ? opt : opt.value;
          const optionLabel = typeof opt === "string" ? opt : opt.label;
          return (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function InfoCard({ title, children }) {
  return (
    <div className="rounded-2xl border bg-white p-4 space-y-3 shadow-sm">
      <div className="font-semibold">{title}</div>
      {children}
    </div>
  );
}

function getFreightOptionsFromEngineering(scenarioEngineering, isSheet) {
  const rows = [
    {
      value: "container20",
      label: "20ft Dry Container",
      pallets: n(scenarioEngineering?.freight?.container20_pallets),
      cartons: n(scenarioEngineering?.freight?.container20_cartons),
      pcs: n(scenarioEngineering?.freight?.container20_pcs),
      rolls: n(scenarioEngineering?.freight?.container20_rolls),
      netWeightKg: n(scenarioEngineering?.freight?.container20_netWeight_kg),
    },
    {
      value: "container40",
      label: "40ft Dry Container",
      pallets: n(scenarioEngineering?.freight?.container40_pallets),
      cartons: n(scenarioEngineering?.freight?.container40_cartons),
      pcs: n(scenarioEngineering?.freight?.container40_pcs),
      rolls: n(scenarioEngineering?.freight?.container40_rolls),
      netWeightKg: n(scenarioEngineering?.freight?.container40_netWeight_kg),
    },
    {
      value: "container40hc",
      label: "40ft High Cube",
      pallets: n(scenarioEngineering?.freight?.container40hc_pallets),
      cartons: n(scenarioEngineering?.freight?.container40hc_cartons),
      pcs: n(scenarioEngineering?.freight?.container40hc_pcs),
      rolls: n(scenarioEngineering?.freight?.container40hc_rolls),
      netWeightKg: n(scenarioEngineering?.freight?.container40hc_netWeight_kg),
    },
    {
      value: "smallTruck",
      label: "Small Truck",
      pallets: n(scenarioEngineering?.freight?.smallTruck_pallets),
      cartons: n(scenarioEngineering?.freight?.smallTruck_cartons),
      pcs: n(scenarioEngineering?.freight?.smallTruck_pcs),
      rolls: n(scenarioEngineering?.freight?.smallTruck_rolls),
      netWeightKg: n(scenarioEngineering?.freight?.smallTruck_netWeight_kg),
    },
    {
      value: "mediumTruck",
      label: "Medium Truck",
      pallets: n(scenarioEngineering?.freight?.mediumTruck_pallets),
      cartons: n(scenarioEngineering?.freight?.mediumTruck_cartons),
      pcs: n(scenarioEngineering?.freight?.mediumTruck_pcs),
      rolls: n(scenarioEngineering?.freight?.mediumTruck_rolls),
      netWeightKg: n(scenarioEngineering?.freight?.mediumTruck_netWeight_kg),
    },
    {
      value: "largeTruck",
      label: "Large Truck",
      pallets: n(scenarioEngineering?.freight?.largeTruck_pallets),
      cartons: n(scenarioEngineering?.freight?.largeTruck_cartons),
      pcs: n(scenarioEngineering?.freight?.largeTruck_pcs),
      rolls: n(scenarioEngineering?.freight?.largeTruck_rolls),
      netWeightKg: n(scenarioEngineering?.freight?.largeTruck_netWeight_kg),
    },
    {
      value: "doubleTrailer",
      label: "Double Trailer",
      pallets: n(scenarioEngineering?.freight?.doubleTrailer_pallets),
      cartons: n(scenarioEngineering?.freight?.doubleTrailer_cartons),
      pcs: n(scenarioEngineering?.freight?.doubleTrailer_pcs),
      rolls: n(scenarioEngineering?.freight?.doubleTrailer_rolls),
      netWeightKg: n(scenarioEngineering?.freight?.doubleTrailer_netWeight_kg),
    },
  ];

  return rows.filter((row) =>
    isSheet ? row.rolls > 0 || row.netWeightKg > 0 : row.pcs > 0 || row.cartons > 0
  );
}

function buildPackagingText({ scenarioEngineering, requestData, isSheet }) {
  if (isSheet) {
    return (
      scenarioEngineering?.sheetPackaging?.instructionText ||
      "Sheet roll packaging instruction not available."
    );
  }

  const primary = scenarioEngineering?.packaging?.primary || {};
  const secondary = scenarioEngineering?.packaging?.secondary || {};
  const pallet = scenarioEngineering?.packaging?.pallet || {};
  const freight = scenarioEngineering?.freight || {};

  const pcsPerStack = n(primary.pcsPerStack);
  const stacksPerPrimary = n(primary.stacksPerPrimary);
  const primariesPerSecondary = n(secondary.primariesPerSecondary);
  const labelsPerBox = n(secondary.labelsPerBox);
  const boxesPerPallet = n(pallet.boxesPerPallet);

  const parts = [];

  if (pcsPerStack) parts.push(`${fmt(pcsPerStack, 0)} pcs/stack`);
  if (stacksPerPrimary) parts.push(`${fmt(stacksPerPrimary, 0)} stacks per bag`);
  if (primariesPerSecondary) {
    parts.push(`${fmt(primariesPerSecondary, 0)} bags per carton`);
  }
  if (labelsPerBox) parts.push(`${fmt(labelsPerBox, 0)} label(s) per carton`);
  if (boxesPerPallet) parts.push(`${fmt(boxesPerPallet, 0)} cartons per pallet`);

  if (n(pallet.stretchWeightPerPallet_kg) > 0) {
    parts.push("with stretch wrap");
  }

  const cartonSize =
    secondary.secondaryLength_mm &&
    secondary.secondaryWidth_mm &&
    secondary.secondaryHeight_mm
      ? `Carton size: ${secondary.secondaryLength_mm} × ${secondary.secondaryWidth_mm} × ${secondary.secondaryHeight_mm} mm`
      : "";

  const palletSize =
    freight.palletLength_mm && freight.palletWidth_mm && freight.palletHeight_mm
      ? `Pallet size: ${freight.palletLength_mm} × ${freight.palletWidth_mm} × ${freight.palletHeight_mm} mm`
      : "";

  const cartonWeight = freight.cartonWeight_kg
    ? `Carton weight: ${freight.cartonWeight_kg} kg`
    : "";

  const palletWeight = freight.palletWeight_kg
    ? `Pallet weight: ${freight.palletWeight_kg} kg`
    : "";

  const derived = [];
  const pcsPerPrimary = pcsPerStack * stacksPerPrimary;
  const pcsPerCarton = pcsPerPrimary * primariesPerSecondary;
  const pcsPerPallet = pcsPerCarton * boxesPerPallet;

  if (pcsPerPrimary) derived.push(`Pcs/bag: ${fmt(pcsPerPrimary, 0)}`);
  if (pcsPerCarton) derived.push(`Pcs/carton: ${fmt(pcsPerCarton, 0)}`);
  if (pcsPerPallet) derived.push(`Pcs/pallet: ${fmt(pcsPerPallet, 0)}`);

  return [
    parts.join(", "),
    cartonSize,
    palletSize,
    cartonWeight,
    palletWeight,
    derived.join(" • "),
  ]
    .filter(Boolean)
    .join(". ");
}

function buildFreightText({ selectedFreight, offer, isSheet }) {
  if (!selectedFreight) return "Freight details not selected.";

  const qtyText = isSheet
    ? `${fmt(selectedFreight.rolls, 0)} rolls / shipment`
    : `${fmt(selectedFreight.pcs, 0)} pcs / shipment`;

  const packingText = isSheet
    ? `${fmt(selectedFreight.pallets, 0)} pallets, ${fmt(selectedFreight.rolls, 0)} rolls`
    : `${fmt(selectedFreight.pallets, 0)} pallets, ${fmt(selectedFreight.cartons, 0)} cartons, ${fmt(selectedFreight.pcs, 0)} pcs`;

  return [
    `Freight mode: ${selectedFreight.label}`,
    packingText,
    qtyText,
    selectedFreight.netWeightKg
      ? `Net weight: ${fmt(selectedFreight.netWeightKg, 2)} kg`
      : "",
    offer.freightFrom ? `From: ${offer.freightFrom}` : "",
    offer.freightTo ? `To: ${offer.freightTo}` : "",
    offer.incoterm ? `Incoterm: ${offer.incoterm}` : "",
  ]
    .filter(Boolean)
    .join(". ");
}

function buildPricingSummary({ requestData, scenarioEngineering, pricing20Data }) {
  const isSheet = detectCase(requestData) === "sheet";

  const assumptions = pricing20Data?.assumptions || {};
  const operational = pricing20Data?.operational || {};
  const materialRows = pricing20Data?.materialRows || [];
  const sheetPackagingRows = pricing20Data?.sheetPackagingRows || [];
  const intermediatePackagingRows = pricing20Data?.intermediatePackagingRows || [];
  const thermoPackagingRows = pricing20Data?.thermoPackagingRows || [];
  const decoration = pricing20Data?.decoration || {};
  const wasteRows = pricing20Data?.wasteRows || [];
  const freightRows = pricing20Data?.freightRows || [];
  const freight = pricing20Data?.freight || {};
  const workingCapitalRows = pricing20Data?.workingCapitalRows || [];
  const amortizationRows = pricing20Data?.amortizationRows || [];
  const conversion = pricing20Data?.conversion || {};

  const productWeightG =
    n(operational.productWeightG) || getProductWeightG(requestData, scenarioEngineering);

  const sheetUtilPct =
    n(operational.sheetUtilizationPct) || getSheetUtilPct(scenarioEngineering);

  const pcsPerCarton =
    n(operational.pcsPerCarton) || getPcsPerCarton(scenarioEngineering);

  const rollWeightKg =
    n(operational.rollWeightKg) ||
    n(scenarioEngineering?.sheetPackaging?.rollWeight_kg) ||
    n(scenarioEngineering?.sheetSpecs?.rollTargetWeight_kg);

  const freightOptions = getFreightOptionsFromEngineering(scenarioEngineering, isSheet);

  const selectedFreight =
    freightOptions.find((row) => row.value === freight.selectedOption) ||
    freightOptions[0] ||
    null;

  const materialEgp = materialRows.reduce((sum, row) => {
    const unitPriceEgp = currencyToEgp(
      row.priceInCurrency,
      row.currency,
      assumptions.usdEgp,
      assumptions.eurUsd
    );

    const costPerTon = n(row.sourceConsumptionKgPerTon) * unitPriceEgp;

    const costPer1000 = perTonToPer1000(costPerTon, productWeightG, sheetUtilPct);

    return sum + (isSheet ? costPerTon : costPer1000);
  }, 0);

  const sheetPackagingEgp = sheetPackagingRows.reduce((sum, row) => {
    const unitPriceEgp = currencyToEgp(
      row.priceInCurrency,
      row.currency,
      assumptions.usdEgp,
      assumptions.eurUsd
    );

    const uses = n(row.sourceNoOfUses) || 1;
    const costPerRoll = (n(row.sourceConsumptionPerRoll) * unitPriceEgp) / uses;
    const costPerTon = rollWeightKg > 0 ? costPerRoll / (rollWeightKg / 1000) : 0;

    return sum + costPerTon;
  }, 0);

  const intermediatePackagingEgp = intermediatePackagingRows.reduce((sum, row) => {
    const unitPriceEgp = currencyToEgp(
      row.priceInCurrency,
      row.currency,
      assumptions.usdEgp,
      assumptions.eurUsd
    );

    const uses = n(row.sourceNoOfUses) || 1;
    const costPerRoll = (n(row.sourceConsumptionPerRoll) * unitPriceEgp) / uses;
    const costPerTon = rollWeightKg > 0 ? costPerRoll / (rollWeightKg / 1000) : 0;
    const costPer1000 = perTonToPer1000(costPerTon, productWeightG, sheetUtilPct);

    return sum + costPer1000;
  }, 0);

  const thermoPackagingEgp = thermoPackagingRows.reduce((sum, row) => {
    const unitPriceEgp = currencyToEgp(
      row.priceInCurrency,
      row.currency,
      assumptions.usdEgp,
      assumptions.eurUsd
    );

    const uses = n(row.sourceNoOfUses) || 1;
    const costPer1000 =
      pcsPerCarton > 0
        ? ((n(row.sourceConsumptionPerCarton) * unitPriceEgp) / uses / pcsPerCarton) * 1000
        : 0;

    return sum + costPer1000;
  }, 0);

  const packagingEgp = isSheet
    ? sheetPackagingEgp
    : intermediatePackagingEgp + thermoPackagingEgp;

  let decorationEgp = 0;
  if (!isSheet && decoration.enabled) {
    if (decoration.type === "Printing") {
      decorationEgp =
        (n(decoration?.printing?.inkConsumptionGPer1000) *
          currencyToEgp(
            decoration?.printing?.inkPricePerKgCurrency,
            decoration?.printing?.currency,
            assumptions.usdEgp,
            assumptions.eurUsd
          )) /
        1000;
    } else if (decoration.type === "Shrink Sleeve") {
      const sleevesPerKg = n(decoration?.sleeve?.sleevesPerKg);
      const sleeveCostPerKgEgp = currencyToEgp(
        decoration?.sleeve?.sleeveCostPerKgCurrency,
        decoration?.sleeve?.currency,
        assumptions.usdEgp,
        assumptions.eurUsd
      );
      decorationEgp = sleevesPerKg > 0 ? (1000 / sleevesPerKg) * sleeveCostPerKgEgp : 0;
    } else if (decoration.type === "Hybrid") {
      decorationEgp =
        n(decoration?.hybrid?.blankConsumptionPerCup) *
          currencyToEgp(
            decoration?.hybrid?.blankUnitPriceCurrency,
            decoration?.hybrid?.blankCurrency,
            assumptions.usdEgp,
            assumptions.eurUsd
          ) *
          1000 +
        n(decoration?.hybrid?.bottomConsumptionPerCup) *
          currencyToEgp(
            decoration?.hybrid?.bottomUnitPriceCurrency,
            decoration?.hybrid?.bottomCurrency,
            assumptions.usdEgp,
            assumptions.eurUsd
          ) *
          1000;
    }
  }

  const wasteEgp = wasteRows.reduce((sum, row) => {
    let baseCost = 0;

    if (row.id === "waste-material") baseCost = materialEgp;
    else if (row.id === "waste-packaging") baseCost = sheetPackagingEgp;
    else if (row.id === "waste-intermediate-packaging") baseCost = intermediatePackagingEgp;
    else if (row.id === "waste-thermo-packaging") baseCost = thermoPackagingEgp;
    else if (row.id === "waste-decoration") baseCost = decorationEgp;

    return sum + (n(row.ratePct) / 100) * baseCost;
  }, 0);

  const freightEgp = freightRows.reduce((sum, row) => {
    const tripCostEgp = currencyToEgp(
      row.tripCostCurrency,
      row.currency,
      assumptions.usdEgp,
      assumptions.eurUsd
    );

    const qtyPerTrip = isSheet
      ? n(selectedFreight?.netWeightKg) / 1000
      : n(selectedFreight?.pcs);

    const basis =
      qtyPerTrip > 0
        ? isSheet
          ? tripCostEgp / qtyPerTrip
          : (tripCostEgp / qtyPerTrip) * 1000
        : 0;

    return sum + basis;
  }, 0);

  const workingCapitalEgp = workingCapitalRows.reduce((sum, row) => {
    const dso = n(row.dso);
    const dio = n(row.dio);
    const dpo = n(row.dpo);
    const interestRatePct = n(row.interestRatePct);
    const effectivePct = ((dso + dio - dpo) * interestRatePct) / 365;

    let baseCost = 0;
    if (row.id === "wc-material") baseCost = materialEgp;
    else if (row.id === "wc-packaging") {
      baseCost = isSheet ? sheetPackagingEgp : intermediatePackagingEgp + thermoPackagingEgp;
    } else if (row.id === "wc-decoration") {
      baseCost = decorationEgp;
    }

    return sum + baseCost * (effectivePct / 100);
  }, 0);

  const amortizationEgp = amortizationRows.reduce((sum, row) => {
    const valueInEgp = currencyToEgp(
      row.valueInCurrency,
      row.currency,
      assumptions.usdEgp,
      assumptions.eurUsd
    );

    if (row.amortized !== true || n(row.amortizationQty) <= 0) return sum;

    const basis = isSheet
      ? valueInEgp / n(row.amortizationQty)
      : (valueInEgp / n(row.amortizationQty)) * 1000;

    return sum + basis;
  }, 0);

  const otherCostsBeforeConversion =
    materialEgp +
    packagingEgp +
    decorationEgp +
    wasteEgp +
    freightEgp +
    workingCapitalEgp +
    amortizationEgp;

  const conversionValueEgp = currencyToEgp(
    conversion.valueInCurrency,
    conversion.currency,
    assumptions.usdEgp,
    assumptions.eurUsd
  );

  let conversionEgp = 0;
  let salesPriceEgp = 0;

  if (isSheet) {
    if (conversion.mode === "required_sales_price_per_ton") {
      salesPriceEgp = conversionValueEgp;
      conversionEgp = salesPriceEgp - otherCostsBeforeConversion;
    } else if (conversion.mode === "required_daily_extrusion_conversion") {
      const tonsPerDay =
        n(pricing20Data?.operational?.productivityTonsPerDay) ||
        n(scenarioEngineering?.extrusion?.tonsPerDay24h);
      conversionEgp = tonsPerDay > 0 ? conversionValueEgp / tonsPerDay : 0;
      salesPriceEgp = otherCostsBeforeConversion + conversionEgp;
    } else {
      conversionEgp = conversionValueEgp;
      salesPriceEgp = otherCostsBeforeConversion + conversionEgp;
    }
  } else {
    if (conversion.mode === "required_sales_price_per_1000") {
      salesPriceEgp = conversionValueEgp;
      conversionEgp = salesPriceEgp - otherCostsBeforeConversion;
    } else if (conversion.mode === "required_daily_thermo_conversion") {
      const pcsPerDay =
        n(pricing20Data?.operational?.pcsProducedPerDay) ||
        n(scenarioEngineering?.thermo?.pcsPerDay24h);
      conversionEgp = pcsPerDay > 0 ? (conversionValueEgp / pcsPerDay) * 1000 : 0;
      salesPriceEgp = otherCostsBeforeConversion + conversionEgp;
    } else if (conversion.mode === "required_daily_extrusion_conversion") {
      const tonsPerDay =
        n(pricing20Data?.operational?.extrusionProductivityTonsPerDay) ||
        n(scenarioEngineering?.extrusion?.tonsPerDay24h);
      const sheetKgPerDay =
        n(pricing20Data?.operational?.sheetRollConsumedPerDayKg) ||
        ((n(scenarioEngineering?.thermo?.pcsPerDay24h) * productWeightG) / 1000) /
          (sheetUtilPct / 100 || 1);
      const pcsPerDay =
        n(pricing20Data?.operational?.pcsProducedPerDay) ||
        n(scenarioEngineering?.thermo?.pcsPerDay24h);

      conversionEgp =
        tonsPerDay > 0 && pcsPerDay > 0
          ? (conversionValueEgp / tonsPerDay) * (sheetKgPerDay / 1000) / pcsPerDay * 1000
          : 0;

      salesPriceEgp = otherCostsBeforeConversion + conversionEgp;
    } else {
      conversionEgp = conversionValueEgp;
      salesPriceEgp = otherCostsBeforeConversion + conversionEgp;
    }
  }

  return {
    isSheet,
    assumptions,
    materialEgp,
    packagingEgp,
    decorationEgp,
    wasteEgp,
    freightEgp,
    amortizationEgp,
    workingCapitalEgp,
    conversionEgp,
    salesPriceEgp,
    freightOptions,
    selectedFreight,
  };
}

function Pricing20OffersTab({
  requestId,
  requestData,
  scenarioEngineering,
  scenarioSetup,
  pricing20Data,
  setPricing20Data,
}) {
  const isSheet = detectCase(requestData) === "sheet";
  const product = requestData?.product || {};
  const primaryCustomer = requestData?.customer?.customers?.[0] || {};

  const assumptions = pricing20Data?.assumptions || {};
  const offersTab = pricing20Data?.offersTab || { offers: [], activeOfferId: "" };

  const pricingSummary = useMemo(
    () => buildPricingSummary({ requestData, scenarioEngineering, pricing20Data }),
    [requestData, scenarioEngineering, pricing20Data]
  );

  useEffect(() => {
    if ((offersTab?.offers || []).length > 0) return;

    const firstOffer = buildNewOffer({
      offers: [],
      requestId,
      customerName: primaryCustomer.customerName || "",
      preparedBy: scenarioSetup?.createdBy || "",
      defaultCurrency: assumptions.baseCurrency || "EGP",
      defaultFreightOption: pricingSummary.selectedFreight?.value || "",
    });

    setPricing20Data((prev) => ({
      ...(prev || {}),
      offersTab: {
        offers: [firstOffer],
        activeOfferId: firstOffer.id,
      },
    }));
  }, [
    offersTab?.offers,
    requestId,
    primaryCustomer.customerName,
    scenarioSetup?.createdBy,
    assumptions.baseCurrency,
    pricingSummary.selectedFreight,
    setPricing20Data,
  ]);

  const offers = offersTab?.offers || [];
  const activeOffer =
    offers.find((row) => row.id === offersTab?.activeOfferId) || offers[0] || null;

  const updateOffer = (offerId, patch) => {
    setPricing20Data((prev) => ({
      ...(prev || {}),
      offersTab: {
        ...((prev || {}).offersTab || {}),
        offers: ((((prev || {}).offersTab || {}).offers || []).map((row) =>
          row.id === offerId ? { ...row, ...patch } : row
        )),
      },
    }));
  };

  const updateOfferNested = (offerId, key, patch) => {
    setPricing20Data((prev) => ({
      ...(prev || {}),
      offersTab: {
        ...((prev || {}).offersTab || {}),
        offers: ((((prev || {}).offersTab || {}).offers || []).map((row) =>
          row.id === offerId
            ? {
                ...row,
                [key]: {
                  ...(row[key] || {}),
                  ...patch,
                },
              }
            : row
        )),
      },
    }));
  };

const createOffer = () => {
  const nextOffer = buildNewOffer({
    offers,
    requestId,
    customerName: primaryCustomer.customerName || "",
    preparedBy: scenarioSetup?.createdBy || "",
    defaultCurrency: assumptions.baseCurrency || "EGP",
    defaultFreightOption: pricingSummary.selectedFreight?.value || "",
  });

  setPricing20Data((prev) => {
    const existingOffers = ((prev || {}).offersTab || {}).offers || [];

    return {
      ...(prev || {}),
      offersTab: {
        ...((prev || {}).offersTab || {}),
        offers: [...existingOffers, nextOffer],
        activeOfferId: nextOffer.id,
      },
    };
  });
};
  const deleteOffer = (offerId) => {
    const remaining = offers.filter((row) => row.id !== offerId);
    const nextActiveId =
      offersTab?.activeOfferId === offerId
        ? remaining[0]?.id || ""
        : offersTab?.activeOfferId || "";

    setPricing20Data((prev) => ({
      ...(prev || {}),
      offersTab: {
        ...((prev || {}).offersTab || {}),
        offers: remaining,
        activeOfferId: nextActiveId,
      },
    }));
  };

  const activeOfferComputed = useMemo(() => {
    if (!activeOffer) return null;

    const offerCurrency = activeOffer.offerCurrency || assumptions.baseCurrency || "EGP";
    const usdEgp = assumptions.usdEgp;
    const eurUsd = assumptions.eurUsd;

    const baseSalesPriceEgp = n(pricingSummary.salesPriceEgp);

    let marginAddEgp = 0;
    if (activeOffer.marginMode === "pct") {
      marginAddEgp = baseSalesPriceEgp * (n(activeOffer.marginValue) / 100);
    } else if (activeOffer.marginMode === "amount") {
      marginAddEgp = currencyToEgp(
        activeOffer.marginValue,
        offerCurrency,
        usdEgp,
        eurUsd
      );
    }

    const offerTotalEgp = baseSalesPriceEgp + marginAddEgp;

    const selectedRows = [
      {
        key: "material",
        label: isSheet ? "Material Cost / ton" : "Material Cost / 1000 pcs",
        valueEgp: pricingSummary.materialEgp,
      },
      {
        key: "decoration",
        label: "Decoration Cost / 1000 pcs",
        valueEgp: isSheet ? 0 : pricingSummary.decorationEgp,
      },
      {
        key: "packaging",
        label: isSheet ? "Packaging Cost / ton" : "Packaging Cost / 1000 pcs",
        valueEgp: pricingSummary.packagingEgp,
      },
      {
        key: "waste",
        label: isSheet ? "Waste Cost / ton" : "Waste Cost / 1000 pcs",
        valueEgp: pricingSummary.wasteEgp,
      },
      {
        key: "freight",
        label: isSheet ? "Freight Cost / ton" : "Freight Cost / 1000 pcs",
        valueEgp: pricingSummary.freightEgp,
      },
      {
        key: "amortization",
        label: isSheet ? "Amortization Cost / ton" : "Amortization Cost / 1000 pcs",
        valueEgp: pricingSummary.amortizationEgp,
      },
    ].filter((row) => activeOffer?.breakdown?.[row.key] === true);

    const selectedNonConversionTotalEgp = selectedRows.reduce(
      (sum, row) => sum + n(row.valueEgp),
      0
    );

    const conversionDerivedEgp = offerTotalEgp - selectedNonConversionTotalEgp;

    const displayRows = [...selectedRows];

    if (activeOffer?.breakdown?.conversion === true) {
      displayRows.push({
        key: "conversion",
        label: isSheet ? "Conversion Price / ton" : "Conversion Price / 1000 pcs",
        valueEgp: conversionDerivedEgp,
      });
    }

    return {
      offerCurrency,
      baseSalesPriceEgp,
      marginAddEgp,
      offerTotalEgp,
      conversionDerivedEgp,
      displayRows: displayRows.map((row) => ({
        ...row,
        valueOfferCurrency: egpToOfferCurrency(
          row.valueEgp,
          offerCurrency,
          usdEgp,
          eurUsd
        ),
      })),
      totalOfferCurrency: egpToOfferCurrency(
        offerTotalEgp,
        offerCurrency,
        usdEgp,
        eurUsd
      ),
      packagingText: buildPackagingText({
        scenarioEngineering,
        requestData,
        isSheet,
      }),
      freightText: buildFreightText({
        selectedFreight:
          pricingSummary.freightOptions.find(
            (row) => row.value === activeOffer.selectedFreightOption
          ) || pricingSummary.selectedFreight,
        offer: activeOffer,
        isSheet,
      }),
    };
  }, [activeOffer, assumptions, pricingSummary, scenarioEngineering, requestData, isSheet]);

  if (!activeOffer || !activeOfferComputed) {
    return <div className="p-6">Loading offers...</div>;
  }

  const selectedFreight =
    pricingSummary.freightOptions.find(
      (row) => row.value === activeOffer.selectedFreightOption
    ) || pricingSummary.selectedFreight;

  const paymentTerm = getPaymentTerm(activeOffer?.terms?.singlePaymentTerm);
  const split1Term = getPaymentTerm(activeOffer?.terms?.split1Term);
  const split2Term = getPaymentTerm(activeOffer?.terms?.split2Term);

  const productCode = product.productCode || requestId || "—";
  const baseMaterial =
    scenarioEngineering?.materialSheet?.baseMaterial ||
    product.sheetMaterial ||
    product.productMaterial ||
    "—";

  const productWeight =
    scenarioEngineering?.thermo?.unitWeight_g ||
    product.productWeightG ||
    "—";

  const decorationType = getDecorationType(requestData);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500">
              Create Price Offers
            </div>
            <div className="text-xl font-semibold">
              {requestData?.project?.projectName || requestId}
            </div>
            <div className="text-sm text-gray-500">
              Live values are pulled from the current Pricing 2.0 scenario.
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={createOffer}
              className="rounded-lg bg-black text-white px-4 py-2 text-sm"
            >
              + Create New Offer
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex gap-2 flex-wrap">
          {offers.map((offer) => (
            <button
              key={offer.id}
              type="button"
              onClick={() =>
                setPricing20Data((prev) => ({
                  ...(prev || {}),
                  offersTab: {
                    ...((prev || {}).offersTab || {}),
                    activeOfferId: offer.id,
                  },
                }))
              }
              className={`rounded-lg border px-3 py-2 text-sm ${
                offer.id === activeOffer.id
                  ? "bg-black text-white border-black"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              {offer.offerNo || "Offer"}
            </button>
          ))}
        </div>
      </div>

      <InfoCard title="1. Offer Header">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <SmallInput
                label="Offer Number"
                value={activeOffer.offerNo}
                readOnly
              />
              <SmallInput
                label="Offer Date"
                value={activeOffer.offerDate}
                type="date"
                onChange={(v) => {
                  updateOffer(activeOffer.id, {
                    offerDate: v,
                    offerNo: buildOfferNo(v, offers, activeOffer.id),
                  });
                }}
              />
              <SmallInput
                label="Request Code"
                value={activeOffer.requestCode || requestId}
                readOnly
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <SmallInput
                label="Customer Name"
                value={activeOffer.customerName}
                onChange={(v) => updateOffer(activeOffer.id, { customerName: v })}
              />
              <SmallSelect
                label="Offer Currency"
                value={activeOffer.offerCurrency}
                onChange={(v) => updateOffer(activeOffer.id, { offerCurrency: v })}
                options={["EGP", "USD", "EUR"]}
              />
              <SmallInput
                label="Customer Address"
                value={activeOffer.customerAddress}
                onChange={(v) => updateOffer(activeOffer.id, { customerAddress: v })}
              />
              <SmallInput
                label="Prepared By"
                value={activeOffer.preparedBy}
                onChange={(v) => updateOffer(activeOffer.id, { preparedBy: v })}
              />
              <SmallInput
                label="Contact Person"
                value={activeOffer.contactPerson}
                onChange={(v) => updateOffer(activeOffer.id, { contactPerson: v })}
              />
              <SmallInput
                label="Contact E-mail"
                value={activeOffer.contactEmail}
                onChange={(v) => updateOffer(activeOffer.id, { contactEmail: v })}
              />
              <SmallInput
                label="Phone Number"
                value={activeOffer.phoneNumber}
                onChange={(v) => updateOffer(activeOffer.id, { phoneNumber: v })}
              />
            </div>
          </div>

          <div className="rounded-2xl border bg-gray-50 p-4 space-y-3">
            <img
              src={COMPANY_INFO.logoPath}
              alt="Depack logo"
              className="h-12 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div className="font-semibold">{COMPANY_INFO.name}</div>
            <div className="text-sm text-gray-600">{COMPANY_INFO.website}</div>
            <div className="text-sm text-gray-600">{COMPANY_INFO.address}</div>
          </div>
        </div>
      </InfoCard>

      <InfoCard title="2. Products and Price Breakdown">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <SmallInput label="Product Code" value={productCode} readOnly />
          <SmallInput label="Base Material" value={baseMaterial} readOnly />
          <SmallInput label="Product Weight (g)" value={productWeight} readOnly />
          <SmallInput label="Decoration Type" value={decorationType} readOnly />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-7 gap-3 pt-2">
          {[
            ["material", "Material"],
            ["decoration", "Decoration"],
            ["packaging", "Packaging"],
            ["waste", "Waste"],
            ["freight", "Freight"],
            ["amortization", "Amortization"],
            ["conversion", "Conversion"],
          ].map(([key, label]) => (
            <label
              key={key}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={activeOffer?.breakdown?.[key] === true}
                onChange={(e) =>
                  updateOfferNested(activeOffer.id, "breakdown", {
                    [key]: e.target.checked,
                  })
                }
              />
              <span>{label}</span>
            </label>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <SmallSelect
            label="Margin Mode"
            value={activeOffer.marginMode || "none"}
            onChange={(v) => updateOffer(activeOffer.id, { marginMode: v })}
            options={[
              { value: "none", label: "No Margin" },
              { value: "pct", label: "Margin %" },
              { value: "amount", label: `Margin Amount / ${isSheet ? "ton" : "1000 pcs"}` },
            ]}
          />
          <SmallInput
            label={
              activeOffer.marginMode === "pct"
                ? "Margin %"
                : `Margin Amount / ${isSheet ? "ton" : "1000 pcs"}`
            }
            value={activeOffer.marginValue}
            onChange={(v) => updateOffer(activeOffer.id, { marginValue: v })}
            readOnly={activeOffer.marginMode === "none"}
          />
          <SmallInput
            label={`Offer Total Price / ${isSheet ? "ton" : "1000 pcs"} (${activeOfferComputed.offerCurrency})`}
            value={fmt(activeOfferComputed.totalOfferCurrency, 3)}
            readOnly
          />
        </div>

        <div className="overflow-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Breakdown Item</th>
                <th className="text-right p-3">
                  Amount / {isSheet ? "ton" : "1000 pcs"} ({activeOfferComputed.offerCurrency})
                </th>
              </tr>
            </thead>
            <tbody>
              {activeOfferComputed.displayRows.map((row) => (
                <tr key={row.key} className="border-t">
                  <td className="p-3">{row.label}</td>
                  <td className="p-3 text-right">{fmt(row.valueOfferCurrency, 3)}</td>
                </tr>
              ))}
              <tr className="border-t font-semibold bg-green-50">
                <td className="p-3">
                  Total Offer Price / {isSheet ? "ton" : "1000 pcs"}
                </td>
                <td className="p-3 text-right">
                  {fmt(activeOfferComputed.totalOfferCurrency, 3)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </InfoCard>

      <InfoCard title="3. Packaging">
        <div className="rounded-xl border bg-gray-50 p-4 text-sm leading-6">
          {activeOfferComputed.packagingText}
        </div>
      </InfoCard>

      <InfoCard title="4. Freight">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <SmallSelect
            label="Container / Truck Size"
            value={activeOffer.selectedFreightOption || ""}
            onChange={(v) =>
              updateOffer(activeOffer.id, { selectedFreightOption: v })
            }
            options={pricingSummary.freightOptions.map((row) => ({
              value: row.value,
              label: row.label,
            }))}
          />
          <SmallInput
            label="From"
            value={activeOffer.freightFrom}
            onChange={(v) => updateOffer(activeOffer.id, { freightFrom: v })}
          />
          <SmallInput
            label="To"
            value={activeOffer.freightTo}
            onChange={(v) => updateOffer(activeOffer.id, { freightTo: v })}
          />
          <SmallSelect
            label="Incoterm"
            value={activeOffer.incoterm || "EXW"}
            onChange={(v) => updateOffer(activeOffer.id, { incoterm: v })}
            options={INCOTERM_OPTIONS}
          />
        </div>

        {selectedFreight ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <SmallInput label="Selected Freight Option" value={selectedFreight.label} readOnly />
            <SmallInput label="Pallets" value={fmt(selectedFreight.pallets, 0)} readOnly />
            <SmallInput
              label={isSheet ? "Rolls" : "Cartons"}
              value={fmt(isSheet ? selectedFreight.rolls : selectedFreight.cartons, 0)}
              readOnly
            />
            <SmallInput
              label={isSheet ? "Net Weight (kg)" : "PCS"}
              value={fmt(isSheet ? selectedFreight.netWeightKg : selectedFreight.pcs, 0)}
              readOnly
            />
          </div>
        ) : null}

        <div className="rounded-xl border bg-gray-50 p-4 text-sm leading-6">
          {activeOfferComputed.freightText}
        </div>
      </InfoCard>

      <InfoCard title="5. Terms and Conditions">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SmallInput
            label="Offer Validity"
            value={activeOffer?.terms?.validity || ""}
            onChange={(v) =>
              updateOfferNested(activeOffer.id, "terms", { validity: v })
            }
            placeholder="Example: 7 days from offer date"
          />

          <SmallSelect
            label="Payment Structure"
            value={activeOffer?.terms?.paymentMode || "single"}
            onChange={(v) =>
              updateOfferNested(activeOffer.id, "terms", { paymentMode: v })
            }
            options={[
              { value: "single", label: "Single payment term" },
              { value: "split", label: "Split into two payments" },
            ]}
          />
        </div>

        {activeOffer?.terms?.paymentMode === "single" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SmallSelect
              label="Payment Term"
              value={activeOffer?.terms?.singlePaymentTerm || "CIA"}
              onChange={(v) =>
                updateOfferNested(activeOffer.id, "terms", {
                  singlePaymentTerm: v,
                })
              }
              options={PAYMENT_TERM_OPTIONS.map((row) => ({
                value: row.code,
                label: `${row.code} — ${row.name}`,
              }))}
            />
            <div className="rounded-xl border bg-gray-50 p-3 text-sm">
              <div className="font-medium">
                {paymentTerm.code} — {paymentTerm.name}
              </div>
              <div className="text-gray-600 mt-1">{paymentTerm.description}</div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <SmallInput
                label="1st Payment %"
                value={activeOffer?.terms?.split1Pct || ""}
                onChange={(v) =>
                  updateOfferNested(activeOffer.id, "terms", { split1Pct: v })
                }
              />
              <SmallSelect
                label="1st Payment Method"
                value={activeOffer?.terms?.split1Term || "PIA"}
                onChange={(v) =>
                  updateOfferNested(activeOffer.id, "terms", { split1Term: v })
                }
                options={PAYMENT_TERM_OPTIONS.map((row) => ({
                  value: row.code,
                  label: `${row.code} — ${row.name}`,
                }))}
              />
              <SmallInput
                label="2nd Payment %"
                value={activeOffer?.terms?.split2Pct || ""}
                onChange={(v) =>
                  updateOfferNested(activeOffer.id, "terms", { split2Pct: v })
                }
              />
              <SmallSelect
                label="2nd Payment Method"
                value={activeOffer?.terms?.split2Term || "CBS"}
                onChange={(v) =>
                  updateOfferNested(activeOffer.id, "terms", { split2Term: v })
                }
                options={PAYMENT_TERM_OPTIONS.map((row) => ({
                  value: row.code,
                  label: `${row.code} — ${row.name}`,
                }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border bg-gray-50 p-3 text-sm">
                <div className="font-medium">
                  {split1Term.code} — {split1Term.name}
                </div>
                <div className="text-gray-600 mt-1">{split1Term.description}</div>
              </div>
              <div className="rounded-xl border bg-gray-50 p-3 text-sm">
                <div className="font-medium">
                  {split2Term.code} — {split2Term.name}
                </div>
                <div className="text-gray-600 mt-1">{split2Term.description}</div>
              </div>
            </div>

            <div
              className={`rounded-xl border p-3 text-sm ${
                Math.abs(
                  n(activeOffer?.terms?.split1Pct) + n(activeOffer?.terms?.split2Pct) - 100
                ) < 0.001
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-yellow-50 border-yellow-200 text-yellow-700"
              }`}
            >
              Total split payment ={" "}
              {fmt(
                n(activeOffer?.terms?.split1Pct) + n(activeOffer?.terms?.split2Pct),
                2
              )}
              %
            </div>
          </div>
        )}

        <label className="block space-y-1">
          <div className="text-xs text-gray-500">Additional Terms</div>
          <textarea
            rows={5}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={activeOffer?.terms?.additionalTerms || ""}
            onChange={(e) =>
              updateOfferNested(activeOffer.id, "terms", {
                additionalTerms: e.target.value,
              })
            }
            placeholder="Add any extra commercial terms here."
          />
        </label>
      </InfoCard>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => deleteOffer(activeOffer.id)}
          className="rounded-lg border border-red-300 text-red-700 px-4 py-2 text-sm bg-white"
        >
          Delete This Offer
        </button>
      </div>
    </div>
  );
}

export { Pricing20OffersTab };
export default Pricing20OffersTab;