import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Package, Truck, Palette, Building2, CheckCircle2, AlertTriangle, Save, ArrowLeft, ArrowRight } from "lucide-react";

const steps = [
  { key: "customer", label: "Customer", icon: Building2 },
  { key: "product", label: "Product", icon: Package },
  { key: "decoration", label: "Decoration", icon: Palette },
  { key: "packaging", label: "Packaging", icon: Package },
  { key: "delivery", label: "Delivery", icon: Truck },
  { key: "attachments", label: "Attachments", icon: FileText },
  { key: "review", label: "Review", icon: CheckCircle2 },
];

const initialForm = {
  metadata: {
    requestId: "",
    status: "Draft",
    createdBy: "sales@depack.local",
  },
  customer: {
    customerName: "",
    contactPerson: "",
    contactEmail: "",
    contactPhone: "",
    countryMarket: "",
    deliveryLocation: "",
    projectName: "",
    customerSkuRef: "",
    projectType: "",
    targetLaunchDate: "",
    forecastAnnualVolume: "",
    moq: "",
    targetSellingPrice: "",
    currency: "EGP",
    customerNotes: "",
  },
  product: {
    productType: "",
    productTypeOther: "",
    sampleExists: "",
    sampleInHand: "",
    internalSampleCode: "",
    productMaterial: "",
    productMaterialOther: "",
    materialGrade: "",
    productWeightG: "",
    topDiameterMm: "",
    bottomDiameterMm: "",
    productHeightMm: "",
    rimNotes: "",
    productColor: "",
    masterbatchDetails: "",
    additives: "",
    specialFunction: "",
    specialCutNotes: "",
    technicalNotes: "",
  },
  decoration: {
    decorationType: "",
    dryOffset: {
      printColors: "",
      printAreaDescription: "",
      printCoveragePct: "",
      printArtworkAvailable: "",
      printArtworkFormat: "",
      printRegistrationNotes: "",
      printMaterialNotes: "",
      printAdditionalNotes: "",
    },
    shrinkSleeve: {
      sleeveMaterial: "",
      sleeveThicknessMicron: "",
      sleeveLayflatWidthMm: "",
      sleeveHeightMm: "",
      sleeveShrinkRatio: "",
      gluePatternNeeded: "",
      gluePatternDiagramAvailable: "",
      sleeveArtworkAvailable: "",
      sleeveSeamNotes: "",
      sleeveApplicationNotes: "",
      sleeveAdditionalNotes: "",
    },
    hybridCup: {
      hybridCupFamily: "",
      blankWrapped: "",
      paperBottomRequired: "",
      hybridBlankMaterial: "",
      hybridBlankGsm: "",
      hybridWrapArtworkAvailable: "",
      hybridBottomArtworkAvailable: "",
      hybridAlignmentNotes: "",
      hybridAdditionalNotes: "",
    },
    label: {
      labelMaterial: "",
      labelDimensions: "",
      labelType: "",
      labelAdhesiveNotes: "",
      labelArtworkAvailable: "",
      labelPositionNotes: "",
      labelAdditionalNotes: "",
    },
  },
  packaging: {
    primary: {
      pcsPerStack: "",
      stacksPerBag: "",
      sleeveArtworkNeeded: "",
      sleeveArtworkProvided: "",
      primaryPackagingNotes: "",
      bagSleeveMaterial: "",
      bagSleeveDimensions: "",
      bagSleeveThicknessMicron: "",
      bagSleeveWeight: "",
    },
    secondary: {
      bagsPerCarton: "",
      cartonType: "",
      cartonInternalDimensions: "",
      cartonExternalDimensions: "",
      cartonArtworkNeeded: "",
      cartonArtworkProvided: "",
      cartonPackagingNotes: "",
    },
    labelInstructions: {
      cartonLabelRequired: "",
      cartonLabelDimensions: "",
      barcodeRequired: "",
      barcodeType: "",
      labelFieldProductCode: false,
      labelFieldBatchNo: false,
      labelFieldProdDate: false,
      labelFieldExpiryDate: false,
      labelFieldQuantity: false,
      labelFieldCustomerCode: false,
      labelFieldOther: "",
      cartonLabelArtworkProvided: "",
      cartonLabelNotes: "",
    },
    pallet: {
      palletType: "",
      palletDimensions: "",
      returnablePallet: "",
      palletReturnCount: "",
      cartonsPerPallet: "",
      stretchWrapRequired: "",
      stretchWrapKgPerPallet: "",
      palletNotes: "",
    },
  },
  delivery: {
    deliveryLocationConfirm: "",
    deliveryTerm: "",
    deliveryFrequency: "",
    firstDeliveryDate: "",
    receivingNotes: "",
    loadingRestrictions: "",
    requiredDeliveryDocs: "",
    logisticsComments: "",
  },
  attachments: {
    samplePhotos: [],
    printArtworkFiles: [],
    sleeveArtworkFiles: [],
    gluePatternDiagramFiles: [],
    hybridWrapArtworkFiles: [],
    hybridBottomArtworkFiles: [],
    labelArtworkFiles: [],
    primarySleeveArtworkFiles: [],
    cartonArtworkFiles: [],
    cartonLabelArtworkFiles: [],
    customerBriefFiles: [],
  },
};

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function SectionCard({ title, description, children }) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

function YesNoSelect({ value, onChange, placeholder = "Select" }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="Yes">Yes</SelectItem>
        <SelectItem value="No">No</SelectItem>
      </SelectContent>
    </Select>
  );
}

function FileUploadBox({ title, files, onAdd, note }) {
  return (
    <div className="rounded-2xl border border-dashed p-4 space-y-3 bg-muted/30">
      <div>
        <div className="font-medium">{title}</div>
        {note ? <div className="text-xs text-muted-foreground mt-1">{note}</div> : null}
      </div>
      <Input
        type="file"
        multiple
        onChange={(e) => {
          const picked = Array.from(e.target.files || []).map((f) => ({
            name: f.name,
            size: f.size,
          }));
          onAdd([...(files || []), ...picked]);
        }}
      />
      <div className="space-y-2">
        {(files || []).length === 0 ? (
          <div className="text-sm text-muted-foreground">No files attached.</div>
        ) : (
          files.map((file, idx) => (
            <div key={`${file.name}-${idx}`} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
              <span className="truncate">{file.name}</span>
              <Badge variant="secondary">{Math.max(1, Math.round((file.size || 0) / 1024))} KB</Badge>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function WizardStepper({ currentStep }) {
  const progress = ((currentStep + 1) / steps.length) * 100;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Depack NPD Request Wizard</h1>
          <p className="text-sm text-muted-foreground">Sales intake form for new development projects.</p>
        </div>
        <Badge className="rounded-full px-4 py-1 text-sm">Draft</Badge>
      </div>
      <Progress value={progress} className="h-2" />
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const active = idx === currentStep;
          const done = idx < currentStep;
          return (
            <div
              key={step.key}
              className={cn(
                "rounded-2xl border p-3 flex items-center gap-3",
                active && "border-primary bg-primary/5",
                done && "border-green-200 bg-green-50"
              )}
            >
              <div className={cn("rounded-xl p-2", active ? "bg-primary text-primary-foreground" : done ? "bg-green-600 text-white" : "bg-muted") }>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">Step {idx + 1}</div>
                <div className="text-sm font-medium truncate">{step.label}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryPanel({ form, currentStep, missingRequired }) {
  const packagingSummary = useMemo(() => {
    const p = form.packaging.primary;
    const s = form.packaging.secondary;
    const pal = form.packaging.pallet;
    const bits = [];
    if (p.pcsPerStack) bits.push(`${p.pcsPerStack} pcs/stack`);
    if (p.stacksPerBag) bits.push(`${p.stacksPerBag} stacks/sleeve`);
    if (s.bagsPerCarton) bits.push(`${s.bagsPerCarton} sleeves/carton`);
    if (pal.cartonsPerPallet) bits.push(`${pal.cartonsPerPallet} cartons/pallet`);
    return bits.length ? bits.join(", ") : "Not complete yet";
  }, [form]);

  const attachmentCount = Object.values(form.attachments).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0);

  return (
    <div className="sticky top-4 space-y-4">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Live Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <div className="text-muted-foreground">Current Step</div>
            <div className="font-medium">{steps[currentStep].label}</div>
          </div>
          <Separator />
          <div>
            <div className="text-muted-foreground">Customer</div>
            <div className="font-medium">{form.customer.customerName || "—"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Project</div>
            <div className="font-medium">{form.customer.projectName || "—"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Product</div>
            <div className="font-medium">{form.product.productType || "—"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Material</div>
            <div className="font-medium">{form.product.productMaterial || "—"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Decoration</div>
            <div className="font-medium">{form.decoration.decorationType || "—"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Internal Sample Code</div>
            <div className="font-medium">{form.product.internalSampleCode || "—"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Packaging Summary</div>
            <div className="font-medium">{packagingSummary}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Delivery Location</div>
            <div className="font-medium">{form.delivery.deliveryLocationConfirm || form.customer.deliveryLocation || "—"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Attachments</div>
            <div className="font-medium">{attachmentCount} files</div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Validation</CardTitle>
        </CardHeader>
        <CardContent>
          {missingRequired.length === 0 ? (
            <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4" /> No blocking items in this draft.</div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium"><AlertTriangle className="h-4 w-4" /> Missing required items</div>
              <div className="space-y-2">
                {missingRequired.map((item) => (
                  <div key={item} className="rounded-xl border px-3 py-2 text-sm">{item}</div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function DepackNPDStarterApp() {
  const [currentStep, setCurrentStep] = useState(0);
  const [saveMessage, setSaveMessage] = useState("Not saved yet");
  const [form, setForm] = useState(initialForm);

  const update = (path, value) => {
    setForm((prev) => {
      const next = structuredClone(prev);
      const keys = path.split(".");
      let ref = next;
      for (let i = 0; i < keys.length - 1; i += 1) ref = ref[keys[i]];
      ref[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const missingRequired = useMemo(() => {
    const req = [];
    if (!form.customer.customerName) req.push("Customer Name");
    if (!form.customer.contactPerson) req.push("Contact Person");
    if (!form.customer.countryMarket) req.push("Country / Market");
    if (!form.customer.deliveryLocation) req.push("Delivery Location");
    if (!form.customer.projectName) req.push("Project Name");
    if (!form.customer.projectType) req.push("Project Type");
    if (!form.product.productType) req.push("Product Type");
    if (!form.product.productMaterial) req.push("Product Material");
    if (!form.decoration.decorationType) req.push("Decoration Type");
    if (!form.packaging.primary.pcsPerStack) req.push("Pieces per Stack");
    if (!form.packaging.primary.stacksPerBag) req.push("Stacks per Bag / Sleeve");
    if (!form.packaging.secondary.bagsPerCarton) req.push("Bags / Sleeves per Carton");
    if (!form.packaging.secondary.cartonType) req.push("Carton Type");
    if (!form.packaging.pallet.palletType) req.push("Pallet Type");
    if (!form.packaging.pallet.returnablePallet) req.push("Returnable Pallet");
    if (!form.packaging.pallet.cartonsPerPallet) req.push("Cartons per Pallet");
    if (!form.packaging.pallet.stretchWrapRequired) req.push("Stretch Wrap Required");
    return req;
  }, [form]);

  const saveDraft = () => {
    setSaveMessage("Saved locally at " + new Date().toLocaleTimeString());
  };

  const nextStep = () => setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 0));

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <WizardStepper currentStep={currentStep} />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          <div className="xl:col-span-2 space-y-6">
            <Alert className="rounded-2xl">
              <Save className="h-4 w-4" />
              <AlertDescription>{saveMessage}. This starter app is UI-first and ready to connect to Netlify Functions + Google Sheets/Drive.</AlertDescription>
            </Alert>

            {currentStep === 0 && (
              <div className="space-y-6">
                <SectionCard title="Customer Details">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Customer Name"><Input value={form.customer.customerName} onChange={(e) => update("customer.customerName", e.target.value)} /></Field>
                    <Field label="Contact Person"><Input value={form.customer.contactPerson} onChange={(e) => update("customer.contactPerson", e.target.value)} /></Field>
                    <Field label="Contact Email"><Input value={form.customer.contactEmail} onChange={(e) => update("customer.contactEmail", e.target.value)} /></Field>
                    <Field label="Contact Phone"><Input value={form.customer.contactPhone} onChange={(e) => update("customer.contactPhone", e.target.value)} /></Field>
                    <Field label="Country / Market"><Input value={form.customer.countryMarket} onChange={(e) => update("customer.countryMarket", e.target.value)} /></Field>
                    <Field label="Delivery Location"><Input value={form.customer.deliveryLocation} onChange={(e) => update("customer.deliveryLocation", e.target.value)} /></Field>
                  </div>
                </SectionCard>

                <SectionCard title="Project Details">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Project Name"><Input value={form.customer.projectName} onChange={(e) => update("customer.projectName", e.target.value)} /></Field>
                    <Field label="Product / SKU Reference"><Input value={form.customer.customerSkuRef} onChange={(e) => update("customer.customerSkuRef", e.target.value)} /></Field>
                    <Field label="Project Type">
                      <Select value={form.customer.projectType} onValueChange={(v) => update("customer.projectType", v)}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="New product">New product</SelectItem>
                          <SelectItem value="Product modification">Product modification</SelectItem>
                          <SelectItem value="Decoration change">Decoration change</SelectItem>
                          <SelectItem value="Packaging change">Packaging change</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Target Launch Date"><Input type="date" value={form.customer.targetLaunchDate} onChange={(e) => update("customer.targetLaunchDate", e.target.value)} /></Field>
                    <Field label="Forecast Annual Volume"><Input value={form.customer.forecastAnnualVolume} onChange={(e) => update("customer.forecastAnnualVolume", e.target.value)} /></Field>
                    <Field label="MOQ"><Input value={form.customer.moq} onChange={(e) => update("customer.moq", e.target.value)} /></Field>
                    <Field label="Target Selling Price"><Input value={form.customer.targetSellingPrice} onChange={(e) => update("customer.targetSellingPrice", e.target.value)} /></Field>
                    <Field label="Currency">
                      <Select value={form.customer.currency} onValueChange={(v) => update("customer.currency", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EGP">EGP</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="SAR">SAR</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <Field label="Customer Notes"><Textarea value={form.customer.customerNotes} onChange={(e) => update("customer.customerNotes", e.target.value)} rows={5} /></Field>
                </SectionCard>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6">
                <SectionCard title="Product Identity">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Product Type">
                      <Select value={form.product.productType} onValueChange={(v) => update("product.productType", v)}>
                        <SelectTrigger><SelectValue placeholder="Select product type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cup">Cup</SelectItem>
                          <SelectItem value="Lid">Lid</SelectItem>
                          <SelectItem value="Container">Container</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    {form.product.productType === "Other" && (
                      <Field label="Product Type - Other"><Input value={form.product.productTypeOther} onChange={(e) => update("product.productTypeOther", e.target.value)} /></Field>
                    )}
                  </div>
                </SectionCard>

                <SectionCard title="Sample Availability">
                  <div className="grid md:grid-cols-3 gap-4">
                    <Field label="Sample Exists?"><YesNoSelect value={form.product.sampleExists} onChange={(v) => update("product.sampleExists", v)} /></Field>
                    {form.product.sampleExists === "Yes" && <Field label="Do We Have the Sample Internally?"><YesNoSelect value={form.product.sampleInHand} onChange={(v) => update("product.sampleInHand", v)} /></Field>}
                    {form.product.sampleExists === "Yes" && <Field label="Internal Sample Code"><Input value={form.product.internalSampleCode} onChange={(e) => update("product.internalSampleCode", e.target.value)} /></Field>}
                  </div>
                  {form.product.sampleExists === "Yes" && (
                    <FileUploadBox
                      title="Sample Photo Upload"
                      files={form.attachments.samplePhotos}
                      onAdd={(files) => update("attachments.samplePhotos", files)}
                      note="Photos will later be sent to Google Drive in the Sample Photos folder."
                    />
                  )}
                </SectionCard>

                <SectionCard title="Material & Dimensions">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Product Material">
                      <Select value={form.product.productMaterial} onValueChange={(v) => update("product.productMaterial", v)}>
                        <SelectTrigger><SelectValue placeholder="Select material" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PS">PS</SelectItem>
                          <SelectItem value="PP">PP</SelectItem>
                          <SelectItem value="PET">PET</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    {form.product.productMaterial === "Other" && <Field label="Product Material - Other"><Input value={form.product.productMaterialOther} onChange={(e) => update("product.productMaterialOther", e.target.value)} /></Field>}
                    <Field label="Material Grade"><Input value={form.product.materialGrade} onChange={(e) => update("product.materialGrade", e.target.value)} /></Field>
                    <Field label="Product Weight (g)"><Input value={form.product.productWeightG} onChange={(e) => update("product.productWeightG", e.target.value)} /></Field>
                    <Field label="Top Diameter (mm)"><Input value={form.product.topDiameterMm} onChange={(e) => update("product.topDiameterMm", e.target.value)} /></Field>
                    <Field label="Bottom Diameter (mm)"><Input value={form.product.bottomDiameterMm} onChange={(e) => update("product.bottomDiameterMm", e.target.value)} /></Field>
                    <Field label="Height (mm)"><Input value={form.product.productHeightMm} onChange={(e) => update("product.productHeightMm", e.target.value)} /></Field>
                    <Field label="Product Color"><Input value={form.product.productColor} onChange={(e) => update("product.productColor", e.target.value)} /></Field>
                    <Field label="Masterbatch Details"><Input value={form.product.masterbatchDetails} onChange={(e) => update("product.masterbatchDetails", e.target.value)} /></Field>
                  </div>
                  <Field label="Additives"><Textarea value={form.product.additives} onChange={(e) => update("product.additives", e.target.value)} rows={4} /></Field>
                </SectionCard>

                <SectionCard title="Functional / Shape Notes">
                  <Field label="Specific Function Required"><Textarea value={form.product.specialFunction} onChange={(e) => update("product.specialFunction", e.target.value)} rows={4} /></Field>
                  <Field label="Specific Cut / Shape Notes"><Textarea value={form.product.specialCutNotes} onChange={(e) => update("product.specialCutNotes", e.target.value)} rows={4} /></Field>
                  <Field label="Rim / Edge Notes"><Textarea value={form.product.rimNotes} onChange={(e) => update("product.rimNotes", e.target.value)} rows={4} /></Field>
                  <Field label="Additional Technical Notes"><Textarea value={form.product.technicalNotes} onChange={(e) => update("product.technicalNotes", e.target.value)} rows={5} /></Field>
                </SectionCard>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <SectionCard title="Decoration Type">
                  <div className="grid md:grid-cols-2 gap-4">
                    {[
                      "Dry offset printing",
                      "Shrink sleeve",
                      "Hybrid cup",
                      "Label",
                    ].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => update("decoration.decorationType", type)}
                        className={cn(
                          "rounded-2xl border p-5 text-left transition",
                          form.decoration.decorationType === type ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                        )}
                      >
                        <div className="font-medium">{type}</div>
                      </button>
                    ))}
                  </div>
                </SectionCard>

                {form.decoration.decorationType === "Dry offset printing" && (
                  <SectionCard title="Dry Offset Printing Specifications">
                    <div className="grid md:grid-cols-2 gap-4">
                      <Field label="Number of Colors"><Input value={form.decoration.dryOffset.printColors} onChange={(e) => update("decoration.dryOffset.printColors", e.target.value)} /></Field>
                      <Field label="Coverage %"><Input value={form.decoration.dryOffset.printCoveragePct} onChange={(e) => update("decoration.dryOffset.printCoveragePct", e.target.value)} /></Field>
                      <Field label="Artwork Available?"><YesNoSelect value={form.decoration.dryOffset.printArtworkAvailable} onChange={(v) => update("decoration.dryOffset.printArtworkAvailable", v)} /></Field>
                      <Field label="Artwork Format"><Input value={form.decoration.dryOffset.printArtworkFormat} onChange={(e) => update("decoration.dryOffset.printArtworkFormat", e.target.value)} /></Field>
                    </div>
                    <Field label="Printing Area Description"><Textarea value={form.decoration.dryOffset.printAreaDescription} onChange={(e) => update("decoration.dryOffset.printAreaDescription", e.target.value)} rows={4} /></Field>
                    <Field label="Registration / Alignment Notes"><Textarea value={form.decoration.dryOffset.printRegistrationNotes} onChange={(e) => update("decoration.dryOffset.printRegistrationNotes", e.target.value)} rows={4} /></Field>
                    <Field label="Ink / Decoration Material Notes"><Textarea value={form.decoration.dryOffset.printMaterialNotes} onChange={(e) => update("decoration.dryOffset.printMaterialNotes", e.target.value)} rows={4} /></Field>
                    <Field label="Additional Notes"><Textarea value={form.decoration.dryOffset.printAdditionalNotes} onChange={(e) => update("decoration.dryOffset.printAdditionalNotes", e.target.value)} rows={4} /></Field>
                    <FileUploadBox title="Print Artwork Upload" files={form.attachments.printArtworkFiles} onAdd={(files) => update("attachments.printArtworkFiles", files)} />
                  </SectionCard>
                )}

                {form.decoration.decorationType === "Shrink sleeve" && (
                  <SectionCard title="Shrink Sleeve Specifications">
                    <div className="grid md:grid-cols-2 gap-4">
                      <Field label="Sleeve Material"><Input value={form.decoration.shrinkSleeve.sleeveMaterial} onChange={(e) => update("decoration.shrinkSleeve.sleeveMaterial", e.target.value)} /></Field>
                      <Field label="Sleeve Thickness (micron)"><Input value={form.decoration.shrinkSleeve.sleeveThicknessMicron} onChange={(e) => update("decoration.shrinkSleeve.sleeveThicknessMicron", e.target.value)} /></Field>
                      <Field label="Layflat Width (mm)"><Input value={form.decoration.shrinkSleeve.sleeveLayflatWidthMm} onChange={(e) => update("decoration.shrinkSleeve.sleeveLayflatWidthMm", e.target.value)} /></Field>
                      <Field label="Sleeve Height (mm)"><Input value={form.decoration.shrinkSleeve.sleeveHeightMm} onChange={(e) => update("decoration.shrinkSleeve.sleeveHeightMm", e.target.value)} /></Field>
                      <Field label="Shrink Ratio"><Input value={form.decoration.shrinkSleeve.sleeveShrinkRatio} onChange={(e) => update("decoration.shrinkSleeve.sleeveShrinkRatio", e.target.value)} /></Field>
                      <Field label="Specific Glue Pattern Needed?"><YesNoSelect value={form.decoration.shrinkSleeve.gluePatternNeeded} onChange={(v) => update("decoration.shrinkSleeve.gluePatternNeeded", v)} /></Field>
                      {form.decoration.shrinkSleeve.gluePatternNeeded === "Yes" && <Field label="Glue Pattern Diagram Available?"><YesNoSelect value={form.decoration.shrinkSleeve.gluePatternDiagramAvailable} onChange={(v) => update("decoration.shrinkSleeve.gluePatternDiagramAvailable", v)} /></Field>}
                      <Field label="Sleeve Artwork Available?"><YesNoSelect value={form.decoration.shrinkSleeve.sleeveArtworkAvailable} onChange={(v) => update("decoration.shrinkSleeve.sleeveArtworkAvailable", v)} /></Field>
                    </div>
                    <Field label="Seam / Orientation Notes"><Textarea value={form.decoration.shrinkSleeve.sleeveSeamNotes} onChange={(e) => update("decoration.shrinkSleeve.sleeveSeamNotes", e.target.value)} rows={4} /></Field>
                    <Field label="Shrink / Application Notes"><Textarea value={form.decoration.shrinkSleeve.sleeveApplicationNotes} onChange={(e) => update("decoration.shrinkSleeve.sleeveApplicationNotes", e.target.value)} rows={4} /></Field>
                    <Field label="Additional Notes"><Textarea value={form.decoration.shrinkSleeve.sleeveAdditionalNotes} onChange={(e) => update("decoration.shrinkSleeve.sleeveAdditionalNotes", e.target.value)} rows={4} /></Field>
                    {form.decoration.shrinkSleeve.gluePatternNeeded === "Yes" && (
                      <FileUploadBox title="Glue Pattern Diagram Upload" files={form.attachments.gluePatternDiagramFiles} onAdd={(files) => update("attachments.gluePatternDiagramFiles", files)} />
                    )}
                    <FileUploadBox title="Sleeve Artwork Upload" files={form.attachments.sleeveArtworkFiles} onAdd={(files) => update("attachments.sleeveArtworkFiles", files)} />
                  </SectionCard>
                )}

                {form.decoration.decorationType === "Hybrid cup" && (
                  <SectionCard title="Hybrid Cup Specifications">
                    <div className="grid md:grid-cols-2 gap-4">
                      <Field label="Cup Family">
                        <Select value={form.decoration.hybridCup.hybridCupFamily} onValueChange={(v) => update("decoration.hybridCup.hybridCupFamily", v)}>
                          <SelectTrigger><SelectValue placeholder="Select family" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Desto">Desto</SelectItem>
                            <SelectItem value="ISO">ISO</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Blank Wrapped Around Plastic Cup?"><YesNoSelect value={form.decoration.hybridCup.blankWrapped} onChange={(v) => update("decoration.hybridCup.blankWrapped", v)} /></Field>
                      <Field label="Paper Bottom Required?"><YesNoSelect value={form.decoration.hybridCup.paperBottomRequired} onChange={(v) => update("decoration.hybridCup.paperBottomRequired", v)} /></Field>
                      <Field label="Paper Sleeve / Blank Material"><Input value={form.decoration.hybridCup.hybridBlankMaterial} onChange={(e) => update("decoration.hybridCup.hybridBlankMaterial", e.target.value)} /></Field>
                      <Field label="Blank Thickness / GSM"><Input value={form.decoration.hybridCup.hybridBlankGsm} onChange={(e) => update("decoration.hybridCup.hybridBlankGsm", e.target.value)} /></Field>
                      <Field label="Wrap Artwork Available?"><YesNoSelect value={form.decoration.hybridCup.hybridWrapArtworkAvailable} onChange={(v) => update("decoration.hybridCup.hybridWrapArtworkAvailable", v)} /></Field>
                      {form.decoration.hybridCup.paperBottomRequired === "Yes" && <Field label="Bottom Artwork Available?"><YesNoSelect value={form.decoration.hybridCup.hybridBottomArtworkAvailable} onChange={(v) => update("decoration.hybridCup.hybridBottomArtworkAvailable", v)} /></Field>}
                    </div>
                    <Field label="Alignment / Fit Notes"><Textarea value={form.decoration.hybridCup.hybridAlignmentNotes} onChange={(e) => update("decoration.hybridCup.hybridAlignmentNotes", e.target.value)} rows={4} /></Field>
                    <Field label="Additional Notes"><Textarea value={form.decoration.hybridCup.hybridAdditionalNotes} onChange={(e) => update("decoration.hybridCup.hybridAdditionalNotes", e.target.value)} rows={4} /></Field>
                    <FileUploadBox title="Wrap Artwork Upload" files={form.attachments.hybridWrapArtworkFiles} onAdd={(files) => update("attachments.hybridWrapArtworkFiles", files)} />
                    {form.decoration.hybridCup.paperBottomRequired === "Yes" && (
                      <FileUploadBox title="Bottom Artwork Upload" files={form.attachments.hybridBottomArtworkFiles} onAdd={(files) => update("attachments.hybridBottomArtworkFiles", files)} />
                    )}
                  </SectionCard>
                )}

                {form.decoration.decorationType === "Label" && (
                  <SectionCard title="Label Specifications">
                    <div className="grid md:grid-cols-2 gap-4">
                      <Field label="Label Material"><Input value={form.decoration.label.labelMaterial} onChange={(e) => update("decoration.label.labelMaterial", e.target.value)} /></Field>
                      <Field label="Label Dimensions"><Input value={form.decoration.label.labelDimensions} onChange={(e) => update("decoration.label.labelDimensions", e.target.value)} /></Field>
                      <Field label="Label Type"><Input value={form.decoration.label.labelType} onChange={(e) => update("decoration.label.labelType", e.target.value)} /></Field>
                      <Field label="Label Artwork Available?"><YesNoSelect value={form.decoration.label.labelArtworkAvailable} onChange={(v) => update("decoration.label.labelArtworkAvailable", v)} /></Field>
                    </div>
                    <Field label="Adhesive Notes"><Textarea value={form.decoration.label.labelAdhesiveNotes} onChange={(e) => update("decoration.label.labelAdhesiveNotes", e.target.value)} rows={4} /></Field>
                    <Field label="Application Position Notes"><Textarea value={form.decoration.label.labelPositionNotes} onChange={(e) => update("decoration.label.labelPositionNotes", e.target.value)} rows={4} /></Field>
                    <Field label="Additional Notes"><Textarea value={form.decoration.label.labelAdditionalNotes} onChange={(e) => update("decoration.label.labelAdditionalNotes", e.target.value)} rows={4} /></Field>
                    <FileUploadBox title="Label Artwork Upload" files={form.attachments.labelArtworkFiles} onAdd={(files) => update("attachments.labelArtworkFiles", files)} />
                  </SectionCard>
                )}
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <SectionCard title="Primary Packaging">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Pieces per Stack"><Input value={form.packaging.primary.pcsPerStack} onChange={(e) => update("packaging.primary.pcsPerStack", e.target.value)} /></Field>
                    <Field label="Stacks per Bag / Sleeve"><Input value={form.packaging.primary.stacksPerBag} onChange={(e) => update("packaging.primary.stacksPerBag", e.target.value)} /></Field>
                    <Field label="Sleeve Artwork Needed?"><YesNoSelect value={form.packaging.primary.sleeveArtworkNeeded} onChange={(v) => update("packaging.primary.sleeveArtworkNeeded", v)} /></Field>
                    <Field label="Sleeve Artwork Provided?"><YesNoSelect value={form.packaging.primary.sleeveArtworkProvided} onChange={(v) => update("packaging.primary.sleeveArtworkProvided", v)} /></Field>
                    <Field label="Bag / Sleeve Material"><Input value={form.packaging.primary.bagSleeveMaterial} onChange={(e) => update("packaging.primary.bagSleeveMaterial", e.target.value)} /></Field>
                    <Field label="Bag / Sleeve Dimensions (L x W x H)"><Input value={form.packaging.primary.bagSleeveDimensions} onChange={(e) => update("packaging.primary.bagSleeveDimensions", e.target.value)} /></Field>
                    <Field label="Sleeve Thickness (micron)"><Input value={form.packaging.primary.bagSleeveThicknessMicron} onChange={(e) => update("packaging.primary.bagSleeveThicknessMicron", e.target.value)} /></Field>
                    <Field label="Sleeve Weight"><Input value={form.packaging.primary.bagSleeveWeight} onChange={(e) => update("packaging.primary.bagSleeveWeight", e.target.value)} /></Field>
                  </div>
                  <Field label="Special Instructions"><Textarea value={form.packaging.primary.primaryPackagingNotes} onChange={(e) => update("packaging.primary.primaryPackagingNotes", e.target.value)} rows={4} /></Field>
                  <FileUploadBox title="Primary Sleeve Artwork Upload" files={form.attachments.primarySleeveArtworkFiles} onAdd={(files) => update("attachments.primarySleeveArtworkFiles", files)} />
                </SectionCard>

                <SectionCard title="Secondary Packaging">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Bags / Sleeves per Carton"><Input value={form.packaging.secondary.bagsPerCarton} onChange={(e) => update("packaging.secondary.bagsPerCarton", e.target.value)} /></Field>
                    <Field label="Carton Type">
                      <Select value={form.packaging.secondary.cartonType} onValueChange={(v) => update("packaging.secondary.cartonType", v)}>
                        <SelectTrigger><SelectValue placeholder="Select carton type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Single wall">Single wall</SelectItem>
                          <SelectItem value="Double wall">Double wall</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Carton Internal Dimensions"><Input value={form.packaging.secondary.cartonInternalDimensions} onChange={(e) => update("packaging.secondary.cartonInternalDimensions", e.target.value)} /></Field>
                    <Field label="Carton External Dimensions"><Input value={form.packaging.secondary.cartonExternalDimensions} onChange={(e) => update("packaging.secondary.cartonExternalDimensions", e.target.value)} /></Field>
                    <Field label="Carton Artwork Needed?"><YesNoSelect value={form.packaging.secondary.cartonArtworkNeeded} onChange={(v) => update("packaging.secondary.cartonArtworkNeeded", v)} /></Field>
                    <Field label="Carton Artwork Provided?"><YesNoSelect value={form.packaging.secondary.cartonArtworkProvided} onChange={(v) => update("packaging.secondary.cartonArtworkProvided", v)} /></Field>
                  </div>
                  <Field label="Special Instructions"><Textarea value={form.packaging.secondary.cartonPackagingNotes} onChange={(e) => update("packaging.secondary.cartonPackagingNotes", e.target.value)} rows={4} /></Field>
                  <FileUploadBox title="Carton Artwork Upload" files={form.attachments.cartonArtworkFiles} onAdd={(files) => update("attachments.cartonArtworkFiles", files)} />
                </SectionCard>

                <Tabs defaultValue="label" className="space-y-6">
                  <TabsList className="grid grid-cols-2 rounded-2xl">
                    <TabsTrigger value="label">Label Instructions</TabsTrigger>
                    <TabsTrigger value="pallet">Pallet Instructions</TabsTrigger>
                  </TabsList>
                  <TabsContent value="label">
                    <SectionCard title="Label Instructions">
                      <div className="grid md:grid-cols-2 gap-4">
                        <Field label="Carton Label Required?"><YesNoSelect value={form.packaging.labelInstructions.cartonLabelRequired} onChange={(v) => update("packaging.labelInstructions.cartonLabelRequired", v)} /></Field>
                        <Field label="Label Dimensions"><Input value={form.packaging.labelInstructions.cartonLabelDimensions} onChange={(e) => update("packaging.labelInstructions.cartonLabelDimensions", e.target.value)} /></Field>
                        <Field label="Barcode Required?"><YesNoSelect value={form.packaging.labelInstructions.barcodeRequired} onChange={(v) => update("packaging.labelInstructions.barcodeRequired", v)} /></Field>
                        <Field label="Barcode Type"><Input value={form.packaging.labelInstructions.barcodeType} onChange={(e) => update("packaging.labelInstructions.barcodeType", e.target.value)} /></Field>
                        <Field label="Label Artwork Provided?"><YesNoSelect value={form.packaging.labelInstructions.cartonLabelArtworkProvided} onChange={(v) => update("packaging.labelInstructions.cartonLabelArtworkProvided", v)} /></Field>
                      </div>
                      <div className="space-y-3">
                        <Label>Required Label Data</Label>
                        <div className="grid md:grid-cols-2 gap-3">
                          {[
                            ["Product Code", "labelFieldProductCode"],
                            ["Batch No.", "labelFieldBatchNo"],
                            ["Production Date", "labelFieldProdDate"],
                            ["Expiry Date", "labelFieldExpiryDate"],
                            ["Quantity", "labelFieldQuantity"],
                            ["Customer Code", "labelFieldCustomerCode"],
                          ].map(([label, key]) => (
                            <div key={key} className="flex items-center gap-3 rounded-xl border p-3">
                              <Checkbox
                                checked={form.packaging.labelInstructions[key]}
                                onCheckedChange={(checked) => update(`packaging.labelInstructions.${key}`, Boolean(checked))}
                              />
                              <Label>{label}</Label>
                            </div>
                          ))}
                        </div>
                        <Field label="Other Label Data"><Input value={form.packaging.labelInstructions.labelFieldOther} onChange={(e) => update("packaging.labelInstructions.labelFieldOther", e.target.value)} /></Field>
                      </div>
                      <Field label="Special Instructions"><Textarea value={form.packaging.labelInstructions.cartonLabelNotes} onChange={(e) => update("packaging.labelInstructions.cartonLabelNotes", e.target.value)} rows={4} /></Field>
                      <FileUploadBox title="Carton Label Artwork Upload" files={form.attachments.cartonLabelArtworkFiles} onAdd={(files) => update("attachments.cartonLabelArtworkFiles", files)} />
                    </SectionCard>
                  </TabsContent>
                  <TabsContent value="pallet">
                    <SectionCard title="Pallet Instructions">
                      <div className="grid md:grid-cols-2 gap-4">
                        <Field label="Pallet Type"><Input value={form.packaging.pallet.palletType} onChange={(e) => update("packaging.pallet.palletType", e.target.value)} /></Field>
                        <Field label="Pallet Dimensions"><Input value={form.packaging.pallet.palletDimensions} onChange={(e) => update("packaging.pallet.palletDimensions", e.target.value)} /></Field>
                        <Field label="Returnable Pallet?"><YesNoSelect value={form.packaging.pallet.returnablePallet} onChange={(v) => update("packaging.pallet.returnablePallet", v)} /></Field>
                        {form.packaging.pallet.returnablePallet === "Yes" && <Field label="Number of Returns"><Input value={form.packaging.pallet.palletReturnCount} onChange={(e) => update("packaging.pallet.palletReturnCount", e.target.value)} /></Field>}
                        <Field label="Cartons per Pallet"><Input value={form.packaging.pallet.cartonsPerPallet} onChange={(e) => update("packaging.pallet.cartonsPerPallet", e.target.value)} /></Field>
                        <Field label="Stretch Wrap Required?"><YesNoSelect value={form.packaging.pallet.stretchWrapRequired} onChange={(v) => update("packaging.pallet.stretchWrapRequired", v)} /></Field>
                        {form.packaging.pallet.stretchWrapRequired === "Yes" && <Field label="Stretch Wrap kg per Pallet"><Input value={form.packaging.pallet.stretchWrapKgPerPallet} onChange={(e) => update("packaging.pallet.stretchWrapKgPerPallet", e.target.value)} /></Field>}
                      </div>
                      <Field label="Special Instructions"><Textarea value={form.packaging.pallet.palletNotes} onChange={(e) => update("packaging.pallet.palletNotes", e.target.value)} rows={4} /></Field>
                    </SectionCard>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {currentStep === 4 && (
              <SectionCard title="Delivery Instructions">
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Delivery Location"><Input value={form.delivery.deliveryLocationConfirm} onChange={(e) => update("delivery.deliveryLocationConfirm", e.target.value)} placeholder={form.customer.deliveryLocation || "Enter delivery location"} /></Field>
                  <Field label="Delivery Term"><Input value={form.delivery.deliveryTerm} onChange={(e) => update("delivery.deliveryTerm", e.target.value)} placeholder="EXW / FCA / Delivered / Other" /></Field>
                  <Field label="Delivery Frequency"><Input value={form.delivery.deliveryFrequency} onChange={(e) => update("delivery.deliveryFrequency", e.target.value)} /></Field>
                  <Field label="Estimated First Delivery Date"><Input type="date" value={form.delivery.firstDeliveryDate} onChange={(e) => update("delivery.firstDeliveryDate", e.target.value)} /></Field>
                </div>
                <Field label="Customer Receiving Notes"><Textarea value={form.delivery.receivingNotes} onChange={(e) => update("delivery.receivingNotes", e.target.value)} rows={4} /></Field>
                <Field label="Loading Restrictions"><Textarea value={form.delivery.loadingRestrictions} onChange={(e) => update("delivery.loadingRestrictions", e.target.value)} rows={4} /></Field>
                <Field label="Required Delivery Documents"><Textarea value={form.delivery.requiredDeliveryDocs} onChange={(e) => update("delivery.requiredDeliveryDocs", e.target.value)} rows={4} /></Field>
                <Field label="Additional Logistics Comments"><Textarea value={form.delivery.logisticsComments} onChange={(e) => update("delivery.logisticsComments", e.target.value)} rows={4} /></Field>
              </SectionCard>
            )}

            {currentStep === 5 && (
              <div className="space-y-6">
                <SectionCard title="Artwork & Attachments Center" description="Review all uploaded files before final submission.">
                  <div className="grid lg:grid-cols-2 gap-4">
                    <FileUploadBox title="Customer Specs / Briefs" files={form.attachments.customerBriefFiles} onAdd={(files) => update("attachments.customerBriefFiles", files)} />
                    <FileUploadBox title="Sample Photos" files={form.attachments.samplePhotos} onAdd={(files) => update("attachments.samplePhotos", files)} />
                    <FileUploadBox title="Print Artwork" files={form.attachments.printArtworkFiles} onAdd={(files) => update("attachments.printArtworkFiles", files)} />
                    <FileUploadBox title="Sleeve Artwork" files={form.attachments.sleeveArtworkFiles} onAdd={(files) => update("attachments.sleeveArtworkFiles", files)} />
                    <FileUploadBox title="Glue Pattern Diagrams" files={form.attachments.gluePatternDiagramFiles} onAdd={(files) => update("attachments.gluePatternDiagramFiles", files)} />
                    <FileUploadBox title="Hybrid Wrap Artwork" files={form.attachments.hybridWrapArtworkFiles} onAdd={(files) => update("attachments.hybridWrapArtworkFiles", files)} />
                    <FileUploadBox title="Hybrid Bottom Artwork" files={form.attachments.hybridBottomArtworkFiles} onAdd={(files) => update("attachments.hybridBottomArtworkFiles", files)} />
                    <FileUploadBox title="Label Artwork" files={form.attachments.labelArtworkFiles} onAdd={(files) => update("attachments.labelArtworkFiles", files)} />
                    <FileUploadBox title="Primary Sleeve Artwork" files={form.attachments.primarySleeveArtworkFiles} onAdd={(files) => update("attachments.primarySleeveArtworkFiles", files)} />
                    <FileUploadBox title="Carton Artwork" files={form.attachments.cartonArtworkFiles} onAdd={(files) => update("attachments.cartonArtworkFiles", files)} />
                    <FileUploadBox title="Carton Label Artwork" files={form.attachments.cartonLabelArtworkFiles} onAdd={(files) => update("attachments.cartonLabelArtworkFiles", files)} />
                  </div>
                </SectionCard>
              </div>
            )}

            {currentStep === 6 && (
              <div className="space-y-6">
                <SectionCard title="Final Review & Submit" description="This is a starter review page. In production, each section should have an Edit button and full validation mapping.">
                  {missingRequired.length > 0 && (
                    <Alert className="rounded-2xl mb-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Submission is currently blocked by {missingRequired.length} missing required field(s).
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card className="rounded-2xl"><CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader><CardContent className="text-sm space-y-2"><div><span className="text-muted-foreground">Name:</span> {form.customer.customerName || "—"}</div><div><span className="text-muted-foreground">Project:</span> {form.customer.projectName || "—"}</div><div><span className="text-muted-foreground">Market:</span> {form.customer.countryMarket || "—"}</div></CardContent></Card>
                    <Card className="rounded-2xl"><CardHeader><CardTitle className="text-base">Product</CardTitle></CardHeader><CardContent className="text-sm space-y-2"><div><span className="text-muted-foreground">Type:</span> {form.product.productType || "—"}</div><div><span className="text-muted-foreground">Material:</span> {form.product.productMaterial || "—"}</div><div><span className="text-muted-foreground">Sample Code:</span> {form.product.internalSampleCode || "—"}</div></CardContent></Card>
                    <Card className="rounded-2xl"><CardHeader><CardTitle className="text-base">Decoration</CardTitle></CardHeader><CardContent className="text-sm space-y-2"><div><span className="text-muted-foreground">Type:</span> {form.decoration.decorationType || "—"}</div></CardContent></Card>
                    <Card className="rounded-2xl"><CardHeader><CardTitle className="text-base">Packaging</CardTitle></CardHeader><CardContent className="text-sm space-y-2"><div>{`${form.packaging.primary.pcsPerStack || "—"} pcs/stack`}</div><div>{`${form.packaging.primary.stacksPerBag || "—"} stacks/sleeve`}</div><div>{`${form.packaging.secondary.bagsPerCarton || "—"} sleeves/carton`}</div><div>{`${form.packaging.pallet.cartonsPerPallet || "—"} cartons/pallet`}</div></CardContent></Card>
                  </div>
                </SectionCard>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 rounded-2xl border p-4 bg-card">
              <Button variant="outline" onClick={prevStep} disabled={currentStep === 0} className="rounded-2xl">
                <ArrowLeft className="mr-2 h-4 w-4" /> Previous
              </Button>
              <div className="flex items-center gap-3">
                <Button variant="secondary" onClick={saveDraft} className="rounded-2xl">
                  <Save className="mr-2 h-4 w-4" /> Save Draft
                </Button>
                {currentStep < steps.length - 1 ? (
                  <Button onClick={nextStep} className="rounded-2xl">
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button disabled={missingRequired.length > 0} className="rounded-2xl">
                    Submit to Engineering
                  </Button>
                )}
              </div>
            </div>
          </div>

          <SummaryPanel form={form} currentStep={currentStep} missingRequired={missingRequired} />
        </div>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Next Development Tasks</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 text-sm">
            <div className="rounded-2xl border p-4">Connect Save Draft to Netlify Function: <span className="font-medium">/.netlify/functions/save-draft</span></div>
            <div className="rounded-2xl border p-4">Connect Submit to Netlify Function: <span className="font-medium">/.netlify/functions/submit-request</span></div>
            <div className="rounded-2xl border p-4">Upload files to Google Drive via server-side function using service account credentials.</div>
            <div className="rounded-2xl border p-4">Write searchable rows + full payload JSON to Google Sheets.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
