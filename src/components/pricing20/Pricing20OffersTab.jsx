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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function nextOfferNumber(existingOffers = [], requestId = "") {
  const nums = (existingOffers || [])
    .map((o) => n(String(o.offerNo || "").match(/\d+$/)?.[0] || 0))
    .filter((x) => x > 0);

  const next = nums.length ? Math.max(...nums) + 1 : 1;
  const prefix = requestId ? `OFF-${requestId}` : "OFF";
  return `${prefix}-${String(next).padStart(3, "0")}`;
}

function egpToOfferCurrency(valueEgp, offerCurrency, assumptions = {}) {
  const amount = n(valueEgp);
  const usdEgp = n(assumptions?.usdEgp);
  const eurUsd = n(assumptions?.eurUsd);

  if (offerCurrency === "EGP") return amount;
  if (offerCurrency === "USD") {
    return usdEgp > 0 ? amount / usdEgp : 0;
  }
  if (offerCurrency === "EUR") {
    return usdEgp > 0 && eurUsd > 0 ? amount / (usdEgp * eurUsd) : 0;
  }

  return amount;
}

function getOfferPriceMap(pricing20Data = {}, requestData = {}) {
  const snap = pricing20Data?.offerPricingSnapshot || {};
  const isSheet = requestData?.product?.productType === "Sheet Roll";

  return {
    basis: snap?.basis || (isSheet ? "ton" : "1000 pcs"),

    total: n(snap.salesPriceEgp),
    material: n(snap.materialEgp),
    decoration: n(snap.decorationEgp),
    packaging: n(snap.packagingEgp),
    waste: n(snap.wasteEgp),
    freight: n(snap.freightEgp),
    amortization: n(snap.amortizationEgp),
    conversion: n(snap.conversionEgp),

    selectedFreightOption: snap.selectedFreightOption || null,
  };
}

function buildDefaultOffer({
  existingOffers = [],
  requestData = {},
  scenarioSetup = {},
}) {
  const customerBlock = requestData?.customer || {};
  const primaryCustomer = customerBlock?.customers?.[0] || {};
  const product = requestData?.product || {};

  return {
    id: uid("offer"),
    offerNo: nextOfferNumber(existingOffers, requestData?.project?.requestId || requestData?.requestId || ""),
    date: todayIso(),

    customerName: primaryCustomer.customerName || "",
    customerAddress: primaryCustomer.address || "",
    contactPerson: primaryCustomer.contactPerson || "",
    contactEmail: primaryCustomer.email || "",
    contactPhone: primaryCustomer.phone || "",

    preparedBy: scenarioSetup?.createdBy || "",
    offerCurrency: "USD",

    showBreakdown: {
      material: true,
      decoration: product.productType === "Sheet Roll" ? false : true,
      packaging: true,
      waste: true,
      freight: true,
      amortization: false,
      conversion: true,
    },

    marginMode: "pct",
    marginPct: "",
    marginAmountPerBasis: "",

    freightFrom: "",
    freightTo: "",
    incoterms: "",

    selectedTerms: [],
    extraTerms: "",

    notes: "",
  };
}

function toneCard(title, value, tone = "gray") {
  const tones = {
    gray: "bg-gray-50 border-gray-200",
    blue: "bg-blue-50 border-blue-200",
    green: "bg-green-50 border-green-200",
    orange: "bg-orange-50 border-orange-200",
    red: "bg-red-50 border-red-200",
    purple: "bg-purple-50 border-purple-200",
    teal: "bg-teal-50 border-teal-200",
  };

  return (
    <div className={`rounded-xl border p-3 ${tones[tone] || tones.gray}`}>
      <div className="text-xs text-gray-500">{title}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm p-4 space-y-4">
      <div className="font-semibold">{title}</div>
      {children}
    </div>
  );
}

function CompactInput({
  label,
  value,
  onChange,
  readOnly = false,
  placeholder = "",
  type = "text",
}) {
  return (
    <label className="block space-y-1">
      <div className="text-xs text-gray-600">{label}</div>
      <input
        type={type}
        className={`w-full rounded-lg border px-3 py-2 text-sm ${
          readOnly ? "bg-gray-100 text-gray-600 border-gray-300" : "bg-white"
        }`}
        value={value ?? ""}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </label>
  );
}

function CompactTextArea({
  label,
  value,
  onChange,
  rows = 3,
  readOnly = false,
  placeholder = "",
}) {
  return (
    <label className="block space-y-1">
      <div className="text-xs text-gray-600">{label}</div>
      <textarea
        rows={rows}
        className={`w-full rounded-lg border px-3 py-2 text-sm ${
          readOnly ? "bg-gray-100 text-gray-600 border-gray-300" : "bg-white"
        }`}
        value={value ?? ""}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </label>
  );
}

function CompactSelect({
  label,
  value,
  onChange,
  options = [],
}) {
  return (
    <label className="block space-y-1">
      <div className="text-xs text-gray-600">{label}</div>
      <select
        className="w-full rounded-lg border px-3 py-2 text-sm bg-white"
        value={value ?? ""}
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

function buildNonSheetPackagingText(scenarioEngineering = {}) {
  const primary = scenarioEngineering?.packaging?.primary || {};
  const secondary = scenarioEngineering?.packaging?.secondary || {};
  const pallet = scenarioEngineering?.packaging?.pallet || {};
  const freight = scenarioEngineering?.freight || {};

  const pcsPerStack = n(primary.pcsPerStack);
  const stacksPerPrimary = n(primary.stacksPerPrimary);
  const primariesPerSecondary = n(secondary.primariesPerSecondary);
  const cartonsPerPallet = n(pallet.boxesPerPallet);

  const pcsPerBag = pcsPerStack * stacksPerPrimary;
  const pcsPerCarton = pcsPerBag * primariesPerSecondary;
  const pcsPerPallet =
    String(pallet.palletSelected || "").toLowerCase() === "yes"
      ? pcsPerCarton * cartonsPerPallet
      : 0;

  const labelCount = n(secondary.labelsPerBox);
  const cartonSize =
    secondary.secondaryLength_mm &&
    secondary.secondaryWidth_mm &&
    secondary.secondaryHeight_mm
      ? `${secondary.secondaryLength_mm} × ${secondary.secondaryWidth_mm} × ${secondary.secondaryHeight_mm} mm`
      : "—";

  const palletSize =
    pallet.palletLength_mm &&
    pallet.palletWidth_mm &&
    pallet.palletHeight_mm
      ? `${pallet.palletLength_mm} × ${pallet.palletWidth_mm} × ${pallet.palletHeight_mm} mm`
      : "—";

  const parts = [];

  if (pcsPerStack) parts.push(`${fmt(pcsPerStack, 0)} pcs/stack`);
  if (stacksPerPrimary) parts.push(`${fmt(stacksPerPrimary, 0)} stacks per bag`);
  if (primariesPerSecondary) parts.push(`${fmt(primariesPerSecondary, 0)} bags/carton`);
  if (labelCount) parts.push(`${fmt(labelCount, 0)} label(s) on carton`);
  if (cartonsPerPallet) parts.push(`${fmt(cartonsPerPallet, 0)} cartons/pallet`);
  if (n(pallet.stretchWeightPerPallet_kg) > 0) parts.push("with stretch wrap");

  return {
    text: parts.join(", "),
    pcsPerBag,
    pcsPerCarton,
    pcsPerPallet,
    cartonSize,
    palletSize,
    cartonWeightKg: freight.cartonWeight_kg || "",
    palletWeightKg: freight.palletWeight_kg || "",
  };
}

function buildSheetPackagingText(scenarioEngineering = {}) {
  const sheetPackaging = scenarioEngineering?.sheetPackaging || {};
  const sheetSpecs = scenarioEngineering?.sheetSpecs || {};
  const freight = scenarioEngineering?.freight || {};

  const rollWeight =
    n(sheetPackaging.rollWeight_kg) || n(sheetSpecs.rollTargetWeight_kg);

  const rollHeight = n(sheetSpecs.netWidth_mm);
  const rollDiameter = n(sheetSpecs.rollDiameter_mm);

  const palletSize =
    sheetPackaging.palletLength_mm &&
    sheetPackaging.palletWidth_mm &&
    sheetPackaging.palletHeight_mm
      ? `${sheetPackaging.palletLength_mm} × ${sheetPackaging.palletWidth_mm} × ${sheetPackaging.palletHeight_mm} mm`
      : "—";

  const parts = [];

  if (rollDiameter) parts.push(`Roll diameter ${fmt(rollDiameter, 2)} mm`);
  if (rollHeight) parts.push(`Roll height ${fmt(rollHeight, 2)} mm`);
  if (rollWeight) parts.push(`Roll weight ${fmt(rollWeight, 3)} kg`);
  if (sheetPackaging.coreSize) parts.push(`Core ${sheetPackaging.coreSize}`);
  if (n(sheetPackaging.labelsPerRoll) > 0)
    parts.push(`${fmt(sheetPackaging.labelsPerRoll, 0)} label(s)/roll`);
  if (n(sheetPackaging.rollsPerPallet) > 0)
    parts.push(`${fmt(sheetPackaging.rollsPerPallet, 0)} roll(s)/pallet`);

  return {
    text: sheetPackaging.instructionText || parts.join(", "),
    palletSize,
    palletWeightKg: freight.palletWeight_kg || "",
  };
}

function getFreightDisplayData(scenarioEngineering = {}, requestData = {}, priceMap = {}) {
  const freight = scenarioEngineering?.freight || {};
  const isSheet = requestData?.product?.productType === "Sheet Roll";
  const selected = priceMap?.selectedFreightOption || null;

  const optionValue = selected?.value || "";
  const optionLabel = selected?.label || "—";

  const pallets = optionValue ? freight[`${optionValue}_pallets`] || "" : "";
  const cartons = optionValue ? freight[`${optionValue}_cartons`] || freight[`${optionValue}_cartonsRange`] || "" : "";
  const pcs = optionValue ? freight[`${optionValue}_pcs`] || "" : "";
  const rolls = optionValue ? freight[`${optionValue}_rolls`] || "" : "";
  const netWeight = optionValue ? freight[`${optionValue}_netWeight_kg`] || "" : "";

  return {
    optionLabel,
    pallets,
    cartons,
    pcs,
    rolls,
    netWeight,
    isSheet,
  };
}

function buildOfferLines(selectedOffer, priceMap) {
  const s = selectedOffer?.showBreakdown || {};

  const lines = [];

  if (s.material) {
    lines.push({ key: "material", label: "Material Cost", value: n(priceMap.material) });
  }

  if (s.decoration) {
    lines.push({ key: "decoration", label: "Decoration Cost", value: n(priceMap.decoration) });
  }

  if (s.packaging) {
    lines.push({ key: "packaging", label: "Packaging Cost", value: n(priceMap.packaging) });
  }

  if (s.waste) {
    lines.push({ key: "waste", label: "Waste Cost", value: n(priceMap.waste) });
  }

  if (s.freight) {
    lines.push({ key: "freight", label: "Freight Cost", value: n(priceMap.freight) });
  }

  if (s.amortization) {
    lines.push({ key: "amortization", label: "Amortization Cost", value: n(priceMap.amortization) });
  }

  const shownNonConversionTotal = lines.reduce((sum, row) => sum + n(row.value), 0);
  const conversionValue = Math.max(n(priceMap.total) - shownNonConversionTotal, 0);

  if (s.conversion) {
    lines.push({
      key: "conversion",
      label: "Conversion Price",
      value: conversionValue,
    });
  }

  return {
    lines,
    shownNonConversionTotal,
    conversionValue,
  };
}

function Pricing20OffersTab({
  requestData,
  scenarioEngineering,
  pricing20Data,
  setPricing20Data,
  scenarioSetup,
}) {
  const offers = pricing20Data?.priceOffers || [];
  const selectedOfferId = pricing20Data?.selectedPriceOfferId || "";
  const assumptions = pricing20Data?.assumptions || {};
  const priceMap = useMemo(
    () => getOfferPriceMap(pricing20Data, requestData),
    [pricing20Data, requestData]
  );

  const isSheet = requestData?.product?.productType === "Sheet Roll";
  const basisLabel = priceMap.basis === "ton" ? "ton" : "1000 pcs";

  const customerBlock = requestData?.customer || {};
  const primaryCustomer = customerBlock?.customers?.[0] || {};
  const product = requestData?.product || {};
  const project = requestData?.project || {};

  useEffect(() => {
    if (!offers.length) {
      const firstOffer = buildDefaultOffer({
        existingOffers: [],
        requestData,
        scenarioSetup,
      });

      setPricing20Data((prev) => ({
        ...(prev || {}),
        priceOffers: [firstOffer],
        selectedPriceOfferId: firstOffer.id,
      }));
      return;
    }

    if (!selectedOfferId || !offers.some((o) => o.id === selectedOfferId)) {
      setPricing20Data((prev) => ({
        ...(prev || {}),
        selectedPriceOfferId: offers[0].id,
      }));
    }
  }, [offers, selectedOfferId, requestData, scenarioSetup, setPricing20Data]);

  const selectedOffer =
    offers.find((o) => o.id === selectedOfferId) || offers[0] || null;

  const updateOffer = (offerId, patch) => {
    setPricing20Data((prev) => ({
      ...(prev || {}),
      priceOffers: (((prev || {}).priceOffers) || []).map((offer) =>
        offer.id === offerId ? { ...offer, ...patch } : offer
      ),
    }));
  };

  const updateOfferNested = (offerId, key, patch) => {
    setPricing20Data((prev) => ({
      ...(prev || {}),
      priceOffers: (((prev || {}).priceOffers) || []).map((offer) =>
        offer.id === offerId
          ? {
              ...offer,
              [key]: {
                ...(offer[key] || {}),
                ...patch,
              },
            }
          : offer
      ),
    }));
  };

  const addOffer = () => {
    const newOffer = buildDefaultOffer({
      existingOffers: offers,
      requestData,
      scenarioSetup,
    });

    setPricing20Data((prev) => ({
      ...(prev || {}),
      priceOffers: [...(((prev || {}).priceOffers) || []), newOffer],
      selectedPriceOfferId: newOffer.id,
    }));
  };

  const removeOffer = (offerId) => {
    const nextOffers = offers.filter((o) => o.id !== offerId);
    const nextSelected = nextOffers[0]?.id || "";

    setPricing20Data((prev) => ({
      ...(prev || {}),
      priceOffers: nextOffers,
      selectedPriceOfferId: nextSelected,
    }));
  };

  const offerLinesSummary = useMemo(() => {
    if (!selectedOffer) {
      return {
        lines: [],
        shownNonConversionTotal: 0,
        conversionValue: 0,
        marginAmountBase: 0,
        finalOfferPriceBase: 0,
      };
    }

    const { lines, shownNonConversionTotal, conversionValue } = buildOfferLines(
      selectedOffer,
      priceMap
    );

    let marginAmountBase = 0;

    if (selectedOffer.marginMode === "amount") {
      marginAmountBase = n(selectedOffer.marginAmountPerBasis);
    } else {
      marginAmountBase = n(priceMap.total) * (n(selectedOffer.marginPct) / 100);
    }

    const finalOfferPriceBase = n(priceMap.total) + marginAmountBase;

    return {
      lines,
      shownNonConversionTotal,
      conversionValue,
      marginAmountBase,
      finalOfferPriceBase,
    };
  }, [selectedOffer, priceMap]);

  const packagingDisplay = useMemo(() => {
    return isSheet
      ? buildSheetPackagingText(scenarioEngineering)
      : buildNonSheetPackagingText(scenarioEngineering);
  }, [isSheet, scenarioEngineering]);

  const freightDisplay = useMemo(() => {
    return getFreightDisplayData(scenarioEngineering, requestData, priceMap);
  }, [scenarioEngineering, requestData, priceMap]);

  if (!selectedOffer) {
    return <div className="p-4">Loading offers...</div>;
  }

  const offerCurrency = selectedOffer.offerCurrency || "USD";

  return (
    <div className="space-y-6">
      <Section title="Create Price Offers">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm text-gray-600">
            Create commercial offers based on the selected pricing scenario.
          </div>

          <button
            type="button"
            className="rounded-lg bg-black text-white px-4 py-2 text-sm"
            onClick={addOffer}
          >
            + Create New Offer
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-5">
          <div className="rounded-xl border bg-white p-3 space-y-3">
            <div className="font-medium">Offers</div>

            {offers.map((offer) => (
              <div
                key={offer.id}
                className={`rounded-xl border p-3 cursor-pointer ${
                  selectedOffer.id === offer.id
                    ? "border-black bg-gray-50"
                    : "border-gray-200 bg-white"
                }`}
                onClick={() =>
                  setPricing20Data((prev) => ({
                    ...(prev || {}),
                    selectedPriceOfferId: offer.id,
                  }))
                }
              >
                <div className="font-medium">{offer.offerNo || "New Offer"}</div>
                <div className="text-xs text-gray-500">
                  {offer.customerName || "No customer"} • {offer.date || "—"}
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="text-xs text-red-600 underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeOffer(offer.id);
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-5">
            <Section title="Offer Summary">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {toneCard(
                  `Scenario Price / ${basisLabel}`,
                  `${fmt(
                    egpToOfferCurrency(priceMap.total, offerCurrency, assumptions),
                    3
                  )} ${offerCurrency}`,
                  "blue"
                )}

                {toneCard(
                  `Margin / ${basisLabel}`,
                  `${fmt(
                    egpToOfferCurrency(
                      offerLinesSummary.marginAmountBase,
                      offerCurrency,
                      assumptions
                    ),
                    3
                  )} ${offerCurrency}`,
                  "purple"
                )}

                {toneCard(
                  `Final Offer / ${basisLabel}`,
                  `${fmt(
                    egpToOfferCurrency(
                      offerLinesSummary.finalOfferPriceBase,
                      offerCurrency,
                      assumptions
                    ),
                    3
                  )} ${offerCurrency}`,
                  "green"
                )}

                {toneCard(
                  "Offer Currency",
                  offerCurrency,
                  "teal"
                )}
              </div>
            </Section>

            <Section title="1. Offer Header">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <CompactInput
                  label="Offer Number"
                  value={selectedOffer.offerNo}
                  readOnly
                />

                <CompactInput
                  label="Date"
                  value={selectedOffer.date}
                  onChange={(v) => updateOffer(selectedOffer.id, { date: v })}
                  type="date"
                />

                <CompactSelect
                  label="Offer Currency"
                  value={selectedOffer.offerCurrency || "USD"}
                  onChange={(v) =>
                    updateOffer(selectedOffer.id, { offerCurrency: v })
                  }
                  options={["EGP", "USD", "EUR"]}
                />

                <CompactInput
                  label="Prepared By"
                  value={selectedOffer.preparedBy}
                  onChange={(v) =>
                    updateOffer(selectedOffer.id, { preparedBy: v })
                  }
                />

                <CompactInput
                  label="Customer Name"
                  value={selectedOffer.customerName}
                  onChange={(v) =>
                    updateOffer(selectedOffer.id, { customerName: v })
                  }
                  placeholder={primaryCustomer.customerName || ""}
                />

                <CompactInput
                  label="Contact Person"
                  value={selectedOffer.contactPerson}
                  onChange={(v) =>
                    updateOffer(selectedOffer.id, { contactPerson: v })
                  }
                />

                <CompactInput
                  label="Contact Person E-mail"
                  value={selectedOffer.contactEmail}
                  onChange={(v) =>
                    updateOffer(selectedOffer.id, { contactEmail: v })
                  }
                />

                <CompactInput
                  label="Phone Number"
                  value={selectedOffer.contactPhone}
                  onChange={(v) =>
                    updateOffer(selectedOffer.id, { contactPhone: v })
                  }
                />

                <div className="md:col-span-2">
                  <CompactTextArea
                    label="Customer Address"
                    value={selectedOffer.customerAddress}
                    onChange={(v) =>
                      updateOffer(selectedOffer.id, { customerAddress: v })
                    }
                    rows={3}
                  />
                </div>

                <div className="md:col-span-2 rounded-xl border bg-gray-50 p-3 space-y-2">
                  <div className="font-medium">Our Company Details</div>
                  <div className="text-sm">Depack for Advanced Packages S.A.E.</div>
                  <div className="text-sm">www.depack.co</div>
                  <div className="text-sm">
                    Address: Plot 9/6 Ahmous St., Industrial Area A2, 10th of Ramadan City, Al Sharqiyah, Egypt
                  </div>
                  <div className="text-sm">
                    Product: {project.projectName || product.productType || "—"}
                  </div>
                </div>
              </div>
            </Section>

            <Section title="2. Products and Price Breakdown">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <CompactInput
                  label="Product Code"
                  value={product.productCode || product.requestNumber || ""}
                  readOnly
                />

                <CompactInput
                  label="Product Name"
                  value={project.projectName || product.productType || ""}
                  readOnly
                />

                <CompactInput
                  label="Base Material"
                  value={
                    scenarioEngineering?.materialSheet?.baseMaterial ||
                    product.productMaterial ||
                    product.sheetMaterial ||
                    ""
                  }
                  readOnly
                />

                <CompactInput
                  label="Product Weight"
                  value={
                    isSheet
                      ? `${fmt(
                          scenarioEngineering?.sheetPackaging?.rollWeight_kg ||
                            scenarioEngineering?.sheetSpecs?.rollTargetWeight_kg ||
                            0,
                          3
                        )} kg/roll`
                      : `${fmt(
                          scenarioEngineering?.thermo?.unitWeight_g ||
                            product.productWeightG ||
                            0,
                          3
                        )} g`
                  }
                  readOnly
                />

                <CompactInput
                  label="Decoration Type"
                  value={
                    isSheet
                      ? "No decoration"
                      : requestData?.decoration?.decorationType || "No decoration"
                  }
                  readOnly
                />
              </div>

              <div className="rounded-xl border p-3 space-y-4">
                <div className="font-medium">Breakdown Options to Show</div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {[
                    ["material", "Material Cost"],
                    ["decoration", "Decoration Cost"],
                    ["packaging", "Packaging Cost"],
                    ["waste", "Waste Cost"],
                    ["freight", "Freight Cost"],
                    ["amortization", "Amortization Cost"],
                    ["conversion", "Conversion Price"],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedOffer.showBreakdown?.[key] === true}
                        onChange={(e) =>
                          updateOfferNested(selectedOffer.id, "showBreakdown", {
                            [key]: e.target.checked,
                          })
                        }
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <CompactSelect
                  label="Margin Mode"
                  value={selectedOffer.marginMode || "pct"}
                  onChange={(v) =>
                    updateOffer(selectedOffer.id, { marginMode: v })
                  }
                  options={[
                    { value: "pct", label: "Margin %" },
                    { value: "amount", label: `Margin Amount / ${basisLabel}` },
                  ]}
                />

                {selectedOffer.marginMode === "pct" ? (
                  <CompactInput
                    label="Margin %"
                    value={selectedOffer.marginPct}
                    onChange={(v) =>
                      updateOffer(selectedOffer.id, { marginPct: v })
                    }
                  />
                ) : (
                  <CompactInput
                    label={`Margin Amount / ${basisLabel}`}
                    value={selectedOffer.marginAmountPerBasis}
                    onChange={(v) =>
                      updateOffer(selectedOffer.id, { marginAmountPerBasis: v })
                    }
                  />
                )}

                <CompactInput
                  label={`Final Offer / ${basisLabel}`}
                  value={`${fmt(
                    egpToOfferCurrency(
                      offerLinesSummary.finalOfferPriceBase,
                      offerCurrency,
                      assumptions
                    ),
                    3
                  )} ${offerCurrency}`}
                  readOnly
                />
              </div>

              <div className="overflow-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3">Line</th>
                      <th className="text-right p-3">{offerCurrency}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offerLinesSummary.lines.map((row) => (
                      <tr key={row.key} className="border-t">
                        <td className="p-3">
                          {row.label} / {basisLabel}
                        </td>
                        <td className="p-3 text-right bg-yellow-50">
                          {fmt(
                            egpToOfferCurrency(row.value, offerCurrency, assumptions),
                            3
                          )}
                        </td>
                      </tr>
                    ))}

                    <tr className="border-t font-medium">
                      <td className="p-3">Scenario Total / {basisLabel}</td>
                      <td className="p-3 text-right">
                        {fmt(
                          egpToOfferCurrency(priceMap.total, offerCurrency, assumptions),
                          3
                        )}
                      </td>
                    </tr>

                    <tr className="border-t">
                      <td className="p-3">Margin / {basisLabel}</td>
                      <td className="p-3 text-right">
                        {fmt(
                          egpToOfferCurrency(
                            offerLinesSummary.marginAmountBase,
                            offerCurrency,
                            assumptions
                          ),
                          3
                        )}
                      </td>
                    </tr>

                    <tr className="border-t font-semibold bg-green-50">
                      <td className="p-3">Final Offer Price / {basisLabel}</td>
                      <td className="p-3 text-right">
                        {fmt(
                          egpToOfferCurrency(
                            offerLinesSummary.finalOfferPriceBase,
                            offerCurrency,
                            assumptions
                          ),
                          3
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="3. Packaging">
              {isSheet ? (
                <div className="space-y-4">
                  <CompactTextArea
                    label="Packaging Instruction"
                    value={packagingDisplay.text}
                    readOnly
                    rows={4}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {toneCard("Pallet Size", packagingDisplay.palletSize || "—", "orange")}
                    {toneCard(
                      "Pallet Weight",
                      packagingDisplay.palletWeightKg
                        ? `${fmt(packagingDisplay.palletWeightKg, 3)} kg`
                        : "—",
                      "orange"
                    )}
                    {toneCard(
                      "Roll Basis",
                      "Sheet Roll",
                      "orange"
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <CompactTextArea
                    label="Packaging Summary"
                    value={packagingDisplay.text}
                    readOnly
                    rows={4}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {toneCard(
                      "PCS / Bag",
                      packagingDisplay.pcsPerBag
                        ? fmt(packagingDisplay.pcsPerBag, 0)
                        : "—",
                      "teal"
                    )}
                    {toneCard(
                      "PCS / Carton",
                      packagingDisplay.pcsPerCarton
                        ? fmt(packagingDisplay.pcsPerCarton, 0)
                        : "—",
                      "teal"
                    )}
                    {toneCard(
                      "PCS / Pallet",
                      packagingDisplay.pcsPerPallet
                        ? fmt(packagingDisplay.pcsPerPallet, 0)
                        : "—",
                      "teal"
                    )}
                    {toneCard(
                      "Carton Weight",
                      packagingDisplay.cartonWeightKg
                        ? `${fmt(packagingDisplay.cartonWeightKg, 3)} kg`
                        : "—",
                      "teal"
                    )}
                    {toneCard("Carton Size", packagingDisplay.cartonSize || "—", "teal")}
                    {toneCard("Pallet Size", packagingDisplay.palletSize || "—", "teal")}
                    {toneCard(
                      "Pallet Weight",
                      packagingDisplay.palletWeightKg
                        ? `${fmt(packagingDisplay.palletWeightKg, 3)} kg`
                        : "—",
                      "teal"
                    )}
                  </div>
                </div>
              )}
            </Section>

            <Section title="4. Freight">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <CompactInput
                  label="From"
                  value={selectedOffer.freightFrom}
                  onChange={(v) =>
                    updateOffer(selectedOffer.id, { freightFrom: v })
                  }
                />

                <CompactInput
                  label="To"
                  value={selectedOffer.freightTo}
                  onChange={(v) =>
                    updateOffer(selectedOffer.id, { freightTo: v })
                  }
                />

                <CompactInput
                  label="Incoterms"
                  value={selectedOffer.incoterms}
                  onChange={(v) =>
                    updateOffer(selectedOffer.id, { incoterms: v })
                  }
                  placeholder={requestData?.delivery?.incoterms || ""}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {toneCard("Container / Truck", freightDisplay.optionLabel || "—", "blue")}
                {toneCard(
                  "Pallets",
                  freightDisplay.pallets ? fmt(freightDisplay.pallets, 0) : "—",
                  "blue"
                )}
                {!freightDisplay.isSheet &&
                  toneCard(
                    "Cartons",
                    freightDisplay.cartons || "—",
                    "blue"
                  )}
                {!freightDisplay.isSheet &&
                  toneCard(
                    "PCS",
                    freightDisplay.pcs ? fmt(freightDisplay.pcs, 0) : "—",
                    "blue"
                  )}
                {freightDisplay.isSheet &&
                  toneCard(
                    "Rolls",
                    freightDisplay.rolls ? fmt(freightDisplay.rolls, 0) : "—",
                    "blue"
                  )}
                {toneCard(
                  "Net Weight",
                  freightDisplay.netWeight
                    ? `${fmt(freightDisplay.netWeight, 2)} kg`
                    : "—",
                  "blue"
                )}
              </div>
            </Section>

            <Section title="5. Terms and Conditions">
              <CompactTextArea
                label="Additional Terms"
                value={selectedOffer.extraTerms}
                onChange={(v) =>
                  updateOffer(selectedOffer.id, { extraTerms: v })
                }
                rows={6}
                placeholder="Add any specific commercial or technical terms here."
              />

              <CompactTextArea
                label="Internal Notes"
                value={selectedOffer.notes}
                onChange={(v) =>
                  updateOffer(selectedOffer.id, { notes: v })
                }
                rows={4}
              />
            </Section>
          </div>
        </div>
      </Section>
    </div>
  );
}

export default Pricing20OffersTab;