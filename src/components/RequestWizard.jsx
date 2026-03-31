import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Package,
  Truck,
  Palette,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Save,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

const steps = [
  { key: "customer", label: "Customer", icon: Building2 },
  { key: "product", label: "Product", icon: Package },
  { key: "decoration", label: "Decoration", icon: Palette },
  { key: "packaging", label: "Packaging", icon: Package },
  { key: "delivery", label: "Delivery", icon: Truck },
  { key: "attachments", label: "Attachments", icon: FileText },
  { key: "review", label: "Review", icon: CheckCircle2 },
];

const generateRequestId = () => `REQ-${Date.now()}`;

const initialForm = {
  metadata: {
    requestId: "",
    status: "Draft",
    createdBy: "",
    createdAt: "",
    driveFolderId: "",
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
    targetLaunchDate: "",
    forecastAnnualVolume: "",
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
    productWeightG: "",
    topDiameterMm: "",
    productHeightMm: "",
    rimNotes: "",
    productColor: "",
    additives: "",
    specialFunction: "",
    specialCutNotes: "",
    technicalNotes: "",

    sheetMaterial: "",
    hipsPct: "",
    gppsPct: "",
    rpetPct: "",
    virginPetPct: "",

    sheetWidthMm: "",
    sheetWidthTolerancePlusMm: "",
    sheetWidthToleranceMinusMm: "",

    sheetThicknessMicron: "",
    sheetThicknessTolerancePlusMicron: "",
    sheetThicknessToleranceMinusMicron: "",

    rollWeightKg: "",
    rollDiameterMm: "",
    coreDiameterMm: "",
    coreMaterial: "",

    sheetLayerColors: "",
    layerAColor: "",
    layerBColor: "",

    productThumbnailName: "",
    productThumbnailBase64: "",
    productThumbnailPreview: "",
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
      useStandardLabelSpecs: false,
      labelMaterial: "",
      labelDimensionsMm: "",
      labelType: "",
      labelAdhesiveNotes: "",
      labelArtworkAvailable: "",
      labelPositionNotes: "",
      labelAdditionalNotes: "",
    },
  },

  packaging: {
    sheet: {
      coreSize: "",
      rollsPerPallet: "",
      palletType: "",
      strapLengthPerPalletM: "",
      foamLengthPerPalletM: "",
      labelsPerRoll: "",
      labelsPerPallet: "",
      stretchWeightPerPalletKg: "",
      operatorsPerPallet: "",
    },

    primary: {
      pcsPerStack: "",
      stacksPerBag: "",
      sleeveArtworkNeeded: "",
      sleeveArtworkProvided: "",
      primaryPackagingNotes: "",
      bagSleeveMaterial: "",
      bagSleeveDimensionsMm: "",
      bagSleeveThicknessMicron: "",
      bagSleeveWeight: "",
    },

    secondary: {
      bagsPerCarton: "",
      cartonType: "",
      cartonInternalDimensionsMm: "",
      cartonExternalDimensionsMm: "",
      cartonArtworkNeeded: "",
      cartonArtworkProvided: "",
      cartonPackagingNotes: "",
    },

    labelInstructions: {
      cartonLabelRequired: "",
      cartonLabelDimensionsMm: "",
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
      noPalletNeeded: false,
      palletType: "",
      palletDimensionsMm: "",
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
    desiredQtyPerTruck: "",
    desiredQtyPerTruckUnit: "",
    truckSize: "",
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
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
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
          const picked = Array.from(e.target.files || []);
          onAdd(picked);
          e.target.value = "";
        }}
      />

      <div className="space-y-2">
        {(files || []).length === 0 ? (
          <div className="text-sm text-muted-foreground">No files attached.</div>
        ) : (
          files.map((file, idx) => (
            <div
              key={`${file.name}-${idx}`}
              className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm"
            >
              <span className="truncate">{file.name}</span>
              <Badge variant="secondary">
                {Math.max(1, Math.round((file.size || 0) / 1024))} KB
              </Badge>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ExistingFilesPanel({ files, onDeleteFile }) {
  if (!files || files.length === 0) return null;

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Uploaded Attachments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {files.map((file) => (
          <div
            key={`${file.driveFileId}-${file.rowIndex}`}
            className="flex items-center justify-between gap-3 rounded-xl border px-3 py-3"
          >
            <div className="min-w-0">
              <div className="font-medium truncate">{file.fileName}</div>
              <div className="text-xs text-muted-foreground">
                {file.category || "Attachment"}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <a
                href={file.driveLink}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline text-sm"
              >
                View / Download
              </a>

              {onDeleteFile ? (
                <button
                  type="button"
                  onClick={() => onDeleteFile(file)}
                  className="text-red-600 underline text-sm"
                >
                  Delete
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function WizardStepper({ currentStep, status }) {
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="space-y-4">
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
              <div
                className={cn(
                  "rounded-xl p-2",
                  active
                    ? "bg-primary text-primary-foreground"
                    : done
                    ? "bg-green-600 text-white"
                    : "bg-muted"
                )}
              >
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

      <div className="flex items-center justify-end">
        <Badge className="rounded-full px-4 py-1 text-sm">{status}</Badge>
      </div>
    </div>
  );
}

function SummaryPanel({ form, currentStep, missingRequired }) {
  const packagingSummary = useMemo(() => {
    if (form.product.productType === "Sheet Roll") {
      const bits = [];
      if (form.product.rollWeightKg) {
        bits.push(`${form.product.rollWeightKg} kg/roll`);
      }
      if (form.packaging.sheet.rollsPerPallet) {
        bits.push(`${form.packaging.sheet.rollsPerPallet} rolls/pallet`);
      }
      if (form.packaging.sheet.palletType) {
        bits.push(form.packaging.sheet.palletType);
      }
      return bits.length ? bits.join(", ") : "Not complete yet";
    }

    const p = form.packaging.primary;
    const s = form.packaging.secondary;
    const pal = form.packaging.pallet;
    const bits = [];
    if (p.pcsPerStack) bits.push(`${p.pcsPerStack} pcs/stack`);
    if (p.stacksPerBag) bits.push(`${p.stacksPerBag} stacks/bag`);
    if (s.bagsPerCarton) bits.push(`${s.bagsPerCarton} bags/carton`);
    if (!pal.noPalletNeeded && pal.cartonsPerPallet) {
      bits.push(`${pal.cartonsPerPallet} cartons/pallet`);
    }
    return bits.length ? bits.join(", ") : "Not complete yet";
  }, [form]);

  const attachmentCount = Object.values(form.attachments).reduce(
    (acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0),
    0
  );

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

          <div>
            <div className="text-muted-foreground">Requested By</div>
            <div className="font-medium">{form.metadata.createdBy || "—"}</div>
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
            <div className="font-medium">
              {form.product.productType === "Sheet Roll"
                ? form.product.sheetMaterial || "—"
                : form.product.productMaterial || "—"}
            </div>
          </div>

          <div>
            <div className="text-muted-foreground">Decoration</div>
            <div className="font-medium">
              {form.product.productType === "Sheet Roll"
                ? "No decoration"
                : form.decoration.decorationType || "—"}
            </div>
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
            <div className="font-medium">
              {form.delivery.deliveryLocationConfirm || form.customer.deliveryLocation || "—"}
            </div>
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
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4" /> No blocking items in this draft.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="h-4 w-4" /> Missing required items
              </div>
              <div className="space-y-2">
                {missingRequired.map((item) => (
                  <div key={item} className="rounded-xl border px-3 py-2 text-sm">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function RequestWizard({
  initialData = null,
  existingFiles = [],
  onDeleteFile = null,
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [saveMessage, setSaveMessage] = useState("Not saved yet");

  const [form, setForm] = useState(() => {
    if (initialData) return initialData;

    return {
      ...initialForm,
      metadata: {
        ...initialForm.metadata,
        requestId: generateRequestId(),
        createdAt: new Date().toISOString(),
      },
    };
  });

  const [pendingUploads, setPendingUploads] = useState({
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
  });

  const requestId = form.metadata.requestId || "—";
  const status = form.metadata.status || "Draft";
  const productName =
    form.customer.projectName || form.product.productType || "Untitled Request";

  useEffect(() => {
    if (
      form.product.productType === "Sheet Roll" &&
      form.decoration.decorationType !== "No decoration"
    ) {
      update("decoration.decorationType", "No decoration");
    }
  }, [form.product.productType, form.decoration.decorationType]);

  const update = (path, value) => {
    setForm((prev) => {
      const next = structuredClone(prev);
      const keys = path.split(".");
      let ref = next;
      for (let i = 0; i < keys.length - 1; i += 1) {
        ref = ref[keys[i]];
      }
      ref[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const handleThumbnailChange = (file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.split(",")[1] || "";

      update("product.productThumbnailName", file.name);
      update("product.productThumbnailBase64", base64);
      update("product.productThumbnailPreview", result);
    };
    reader.readAsDataURL(file);
  };

  const handleAttachmentAdd = (field, pickedFiles) => {
    setPendingUploads((prev) => ({
      ...prev,
      [field]: [...prev[field], ...pickedFiles],
    }));

    const existingMeta = form.attachments[field] || [];
    const newMeta = pickedFiles.map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
      lastModified: f.lastModified,
    }));

    update(`attachments.${field}`, [...existingMeta, ...newMeta]);
  };

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result || "";
        const base64 = String(result).split(",")[1] || "";
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const getTargetFolderId = (field, subfolders) => {
    if (field === "samplePhotos") return subfolders.samplePhotos?.id;

    if (
      [
        "printArtworkFiles",
        "sleeveArtworkFiles",
        "hybridWrapArtworkFiles",
        "hybridBottomArtworkFiles",
        "labelArtworkFiles",
      ].includes(field)
    ) {
      return subfolders.decorationArtwork?.id;
    }

    if (field === "gluePatternDiagramFiles") return subfolders.gluePatterns?.id;

    if (
      ["primarySleeveArtworkFiles", "cartonArtworkFiles", "cartonLabelArtworkFiles"].includes(
        field
      )
    ) {
      return subfolders.packagingArtwork?.id;
    }

    if (field === "customerBriefFiles") return subfolders.customerBriefs?.id;

    return null;
  };

  const uploadPendingFiles = async (subfolders) => {
    for (const [field, files] of Object.entries(pendingUploads)) {
      if (!files || files.length === 0) continue;

      const folderId = getTargetFolderId(field, subfolders);
      if (!folderId) continue;

      for (const file of files) {
        const base64 = await fileToBase64(file);

        const response = await fetch("/.netlify/functions/upload-drive-file", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            folderId,
            fileName: file.name,
            mimeType: file.type,
            base64,
          }),
        });

        const data = await response.json();

        if (data.success && !data.alreadyExists) {
          await fetch("/.netlify/functions/save-file-record", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              requestId: form?.metadata?.requestId,
              fileName: file.name,
              fileType: file.type,
              category: field,
              driveFileId: data.file.id,
              driveLink: data.file.webViewLink,
            }),
          });
        }

        if (!data.success) {
          throw new Error(`Upload failed for ${file.name}: ${data.error || "Unknown error"}`);
        }
      }
    }

    setPendingUploads({
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
    });
  };

  const missingRequired = useMemo(() => {
    const req = [];

    if (!form.metadata.createdBy) req.push("Requested By");
    if (!form.customer.customerName) req.push("Customer Name");
    if (!form.customer.contactPerson) req.push("Contact Person");
    if (!form.customer.countryMarket) req.push("Country / Market");
    if (!form.customer.deliveryLocation) req.push("Delivery Location");
    if (!form.customer.projectName) req.push("Project Name");
    if (!form.customer.forecastAnnualVolume) req.push("Forecast Annual Volume");
    if (!form.customer.targetSellingPrice) req.push("Target Selling Price");
    if (!form.product.productType) req.push("Product Type");
    if (!form.product.productThumbnailPreview) req.push("Product Picture");

    if (form.product.productType === "Sheet Roll") {
      if (!form.product.sheetMaterial) req.push("Sheet Material");
      if (!form.product.sheetWidthMm) req.push("Sheet Width");
      if (!form.product.sheetThicknessMicron) req.push("Sheet Thickness");
      if (!form.product.rollWeightKg) req.push("Roll Weight");
      if (!form.product.rollDiameterMm) req.push("Roll Diameter");
      if (!form.product.coreDiameterMm) req.push("Core Diameter");
      if (!form.product.coreMaterial) req.push("Core Material");
      if (!form.product.sheetLayerColors) req.push("Sheet Layer Colors");

      if (form.product.sheetMaterial === "PS") {
        if (!form.product.hipsPct) req.push("% HIPS");
        if (!form.product.gppsPct) req.push("% GPPS");
      }

      if (form.product.sheetMaterial === "PET") {
        if (!form.product.rpetPct) req.push("% rPET");
        if (!form.product.virginPetPct) req.push("% Virgin PET");
      }

      if (!form.packaging.sheet.coreSize) req.push("Core Size");
      if (!form.packaging.sheet.rollsPerPallet) req.push("Rolls per Pallet");
      if (!form.packaging.sheet.palletType) req.push("Pallet Type");

      if (!form.delivery.deliveryLocationConfirm && !form.customer.deliveryLocation) {
        req.push("Delivery Location");
      }
      if (!form.delivery.desiredQtyPerTruck) req.push("Required Qty per Truck");
      if (!form.delivery.desiredQtyPerTruckUnit) req.push("Required Qty Unit");
      if (!form.delivery.truckSize) req.push("Truck Size");
    } else {
      if (!form.product.productMaterial) req.push("Product Material");
      if (!form.decoration.decorationType) req.push("Decoration Type");
      if (!form.packaging.primary.pcsPerStack) req.push("Pieces per Stack");
      if (!form.packaging.primary.stacksPerBag) req.push("Stacks per Bag");
      if (!form.packaging.secondary.bagsPerCarton) req.push("Bags per Carton");
      if (!form.packaging.secondary.cartonType) req.push("Carton Type");

      if (!form.packaging.pallet.noPalletNeeded) {
        if (!form.packaging.pallet.palletType) req.push("Pallet Type");
        if (!form.packaging.pallet.returnablePallet) req.push("Returnable Pallet");
        if (!form.packaging.pallet.cartonsPerPallet) req.push("Cartons per Pallet");
        if (!form.packaging.pallet.stretchWrapRequired) req.push("Stretch Wrap Required");
      }

      if (!form.delivery.desiredQtyPerTruck) req.push("Required Qty per Truck");
      if (!form.delivery.desiredQtyPerTruckUnit) req.push("Required Qty Unit");
      if (!form.delivery.truckSize) req.push("Truck Size");
    }

    return req;
  }, [form]);

  const saveDraft = async () => {
    try {
      const firstSaveRes = await fetch("/.netlify/functions/save-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const firstSaveData = await firstSaveRes.json();

      if (!firstSaveData.success) {
        setSaveMessage("Save failed");
        return;
      }

      const folderRes = await fetch("/.netlify/functions/ensure-request-folder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: form?.metadata?.requestId,
        }),
      });

      const folderData = await folderRes.json();

      if (!folderData.success) {
        setSaveMessage("Draft saving worked but folder creation failed");
        return;
      }

      const updatedForm = {
        ...form,
        metadata: {
          ...form.metadata,
          driveFolderId: folderData.requestFolder?.id || "",
        },
      };

      setForm(updatedForm);

      await fetch("/.netlify/functions/save-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedForm),
      });

      await uploadPendingFiles(folderData.subfolders);

      setSaveMessage(`Saved successfully at ${new Date().toLocaleTimeString()}`);
    } catch (error) {
      console.error("Save draft failed:", error);
      setSaveMessage("Save failed");
    }
  };

  const nextStep = () => setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const estimatedSheetRollPalletLoadKg =
    Number(form.packaging.sheet.rollsPerPallet || 0) *
    Number(form.product.rollWeightKg || 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 min-w-[220px]">
            <img
              src="/depacklogo.png"
              alt="Depack"
              className="h-12 w-auto object-contain"
            />

            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Request ID
              </div>
              <div className="text-lg font-semibold">{requestId}</div>
            </div>
          </div>

          <div className="flex-1 min-w-[220px]">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Product / Project
            </div>
            <div className="text-base font-medium truncate">{productName}</div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Badge
              className={cn(
                "rounded-full px-4 py-1 text-sm",
                status === "Draft" && "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
                status === "Project Completed" && "bg-blue-100 text-blue-800 hover:bg-blue-100"
              )}
            >
              {status}
            </Badge>

            <Link
              to="/dashboard"
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-100"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div className="rounded-xl border p-3 bg-green-50 text-green-700 font-medium">
          {saveMessage}
        </div>

        <WizardStepper currentStep={currentStep} status={status} />
        <ExistingFilesPanel files={existingFiles} onDeleteFile={onDeleteFile} />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          <div className="xl:col-span-2 space-y-6">
            <Alert className="rounded-2xl border-green-300 bg-green-50">
              <AlertDescription className="font-medium text-green-700">
                {saveMessage}
              </AlertDescription>
            </Alert>

            {currentStep === 0 && (
              <div className="space-y-6">
                <SectionCard
                  title="Request Owner"
                  description="Enter the name of the person creating this request."
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Requested By *">
                      <Input
                        value={form.metadata.createdBy}
                        onChange={(e) => update("metadata.createdBy", e.target.value)}
                        placeholder="Enter your full name"
                      />
                    </Field>
                  </div>
                </SectionCard>

                <SectionCard title="Customer Details">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Customer Name *">
                      <Input
                        value={form.customer.customerName}
                        onChange={(e) => update("customer.customerName", e.target.value)}
                      />
                    </Field>
                    <Field label="Contact Person *">
                      <Input
                        value={form.customer.contactPerson}
                        onChange={(e) => update("customer.contactPerson", e.target.value)}
                      />
                    </Field>
                    <Field label="Contact Email">
                      <Input
                        value={form.customer.contactEmail}
                        onChange={(e) => update("customer.contactEmail", e.target.value)}
                      />
                    </Field>
                    <Field label="Contact Phone">
                      <Input
                        value={form.customer.contactPhone}
                        onChange={(e) => update("customer.contactPhone", e.target.value)}
                      />
                    </Field>
                    <Field label="Country / Market *">
                      <Input
                        value={form.customer.countryMarket}
                        onChange={(e) => update("customer.countryMarket", e.target.value)}
                      />
                    </Field>
                    <Field label="Delivery Location *">
                      <Input
                        value={form.customer.deliveryLocation}
                        onChange={(e) => update("customer.deliveryLocation", e.target.value)}
                      />
                    </Field>
                  </div>
                </SectionCard>

                <SectionCard title="Project Details">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Project Name *">
                      <Input
                        value={form.customer.projectName}
                        onChange={(e) => update("customer.projectName", e.target.value)}
                      />
                    </Field>

                    <Field label="Customer Product Code (if applicable)">
                      <Input
                        value={form.customer.customerSkuRef}
                        onChange={(e) => update("customer.customerSkuRef", e.target.value)}
                      />
                    </Field>

                    <Field label="Target Launch Date">
                      <Input
                        type="date"
                        value={form.customer.targetLaunchDate}
                        onChange={(e) => update("customer.targetLaunchDate", e.target.value)}
                      />
                    </Field>

                    <Field label="Forecast Annual Volume *">
                      <Input
                        value={form.customer.forecastAnnualVolume}
                        onChange={(e) => update("customer.forecastAnnualVolume", e.target.value)}
                      />
                    </Field>

                    <Field label="Target Selling Price *">
                      <Input
                        value={form.customer.targetSellingPrice}
                        onChange={(e) => update("customer.targetSellingPrice", e.target.value)}
                      />
                    </Field>

                    <Field label="Currency">
                      <Select
                        value={form.customer.currency}
                        onValueChange={(v) => update("customer.currency", v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EGP">EGP</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="SAR">SAR</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <Field label="Customer Notes">
                    <Textarea
                      value={form.customer.customerNotes}
                      onChange={(e) => update("customer.customerNotes", e.target.value)}
                      rows={5}
                    />
                  </Field>
                </SectionCard>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6">
                <SectionCard title="Product Identity">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Product Type *">
                      <Select
                        value={form.product.productType}
                        onValueChange={(v) => update("product.productType", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cup">Cup</SelectItem>
                          <SelectItem value="Lid">Lid</SelectItem>
                          <SelectItem value="Container">Container</SelectItem>
                          <SelectItem value="Sheet Roll">Sheet Roll</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>

                    {form.product.productType === "Other" && (
                      <Field label="Product Type - Other">
                        <Input
                          value={form.product.productTypeOther}
                          onChange={(e) => update("product.productTypeOther", e.target.value)}
                        />
                      </Field>
                    )}
                  </div>
                </SectionCard>

                <SectionCard title="Product Picture">
                  <div className="space-y-4">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleThumbnailChange(e.target.files?.[0])}
                    />

                    {form.product.productThumbnailPreview ? (
                      <img
                        src={form.product.productThumbnailPreview}
                        alt="Product preview"
                        className="w-32 h-32 object-cover rounded-xl border"
                      />
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No product picture uploaded yet.
                      </div>
                    )}
                  </div>
                </SectionCard>

                <SectionCard title="Sample Availability">
                  <div className="grid md:grid-cols-3 gap-4">
                    <Field label="Sample Exists?">
                      <YesNoSelect
                        value={form.product.sampleExists}
                        onChange={(v) => update("product.sampleExists", v)}
                      />
                    </Field>

                    {form.product.sampleExists === "Yes" && (
                      <Field label="Do We Have the Sample Internally?">
                        <YesNoSelect
                          value={form.product.sampleInHand}
                          onChange={(v) => update("product.sampleInHand", v)}
                        />
                      </Field>
                    )}

                    {form.product.sampleExists === "Yes" && (
                      <Field label="Internal Sample Code">
                        <Input
                          value={form.product.internalSampleCode}
                          onChange={(e) => update("product.internalSampleCode", e.target.value)}
                        />
                      </Field>
                    )}
                  </div>

                  {form.product.sampleExists === "Yes" && (
                    <FileUploadBox
                      title="Sample Photo Upload"
                      files={form.attachments.samplePhotos}
                      onAdd={(files) => handleAttachmentAdd("samplePhotos", files)}
                      note="Photos will later be sent to Google Drive in the Sample Photos folder."
                    />
                  )}
                </SectionCard>

                {form.product.productType !== "Sheet Roll" && (
                  <>
                    <SectionCard title="Material & Dimensions">
                      <div className="grid md:grid-cols-2 gap-4">
                        <Field label="Product Material *">
                          <Select
                            value={form.product.productMaterial}
                            onValueChange={(v) => update("product.productMaterial", v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select material" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PS">PS</SelectItem>
                              <SelectItem value="PP">PP</SelectItem>
                              <SelectItem value="PET">PET</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>

                        {form.product.productMaterial === "Other" && (
                          <Field label="Product Material - Other">
                            <Input
                              value={form.product.productMaterialOther}
                              onChange={(e) =>
                                update("product.productMaterialOther", e.target.value)
                              }
                            />
                          </Field>
                        )}

                        <Field label="Product Weight (g)">
                          <Input
                            value={form.product.productWeightG}
                            onChange={(e) => update("product.productWeightG", e.target.value)}
                          />
                        </Field>

                        <Field label="Top Diameter (mm)">
                          <Input
                            value={form.product.topDiameterMm}
                            onChange={(e) => update("product.topDiameterMm", e.target.value)}
                          />
                        </Field>

                        <Field label="Height (mm)">
                          <Input
                            value={form.product.productHeightMm}
                            onChange={(e) => update("product.productHeightMm", e.target.value)}
                          />
                        </Field>

                        <Field label="Product Color">
                          <Input
                            value={form.product.productColor}
                            onChange={(e) => update("product.productColor", e.target.value)}
                          />
                        </Field>
                      </div>

                      <Field label="Additives">
                        <Textarea
                          value={form.product.additives}
                          onChange={(e) => update("product.additives", e.target.value)}
                          rows={4}
                        />
                      </Field>
                    </SectionCard>

                    <SectionCard title="Functional / Shape Notes">
                      <Field label="Specific Function Required">
                        <Textarea
                          value={form.product.specialFunction}
                          onChange={(e) => update("product.specialFunction", e.target.value)}
                          rows={4}
                        />
                      </Field>
                      <Field label="Specific Cut / Shape Notes">
                        <Textarea
                          value={form.product.specialCutNotes}
                          onChange={(e) => update("product.specialCutNotes", e.target.value)}
                          rows={4}
                        />
                      </Field>
                      <Field label="Rim / Edge Notes">
                        <Textarea
                          value={form.product.rimNotes}
                          onChange={(e) => update("product.rimNotes", e.target.value)}
                          rows={4}
                        />
                      </Field>
                      <Field label="Additional Technical Notes">
                        <Textarea
                          value={form.product.technicalNotes}
                          onChange={(e) => update("product.technicalNotes", e.target.value)}
                          rows={5}
                        />
                      </Field>
                    </SectionCard>
                  </>
                )}

                {form.product.productType === "Sheet Roll" && (
                  <SectionCard title="Sheet Roll Specifications">
                    <div className="grid md:grid-cols-2 gap-4">
                      <Field label="Sheet Material *">
                        <Select
                          value={form.product.sheetMaterial}
                          onValueChange={(v) => update("product.sheetMaterial", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select material" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PS">PS</SelectItem>
                            <SelectItem value="PP">PP</SelectItem>
                            <SelectItem value="PET">PET</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>

                      {form.product.sheetMaterial === "PS" && (
                        <>
                          <Field label="% HIPS *">
                            <Input
                              value={form.product.hipsPct}
                              onChange={(e) => update("product.hipsPct", e.target.value)}
                            />
                          </Field>
                          <Field label="% GPPS *">
                            <Input
                              value={form.product.gppsPct}
                              onChange={(e) => update("product.gppsPct", e.target.value)}
                            />
                          </Field>
                        </>
                      )}

                      {form.product.sheetMaterial === "PET" && (
                        <>
                          <Field label="% rPET *">
                            <Input
                              value={form.product.rpetPct}
                              onChange={(e) => update("product.rpetPct", e.target.value)}
                            />
                          </Field>
                          <Field label="% Virgin PET *">
                            <Input
                              value={form.product.virginPetPct}
                              onChange={(e) => update("product.virginPetPct", e.target.value)}
                            />
                          </Field>
                        </>
                      )}

                      <Field label="Sheet Width (mm) *">
                        <Input
                          value={form.product.sheetWidthMm}
                          onChange={(e) => update("product.sheetWidthMm", e.target.value)}
                        />
                      </Field>

                      <Field label="Width Tolerance + (mm)">
                        <Input
                          value={form.product.sheetWidthTolerancePlusMm}
                          onChange={(e) =>
                            update("product.sheetWidthTolerancePlusMm", e.target.value)
                          }
                        />
                      </Field>

                      <Field label="Width Tolerance - (mm)">
                        <Input
                          value={form.product.sheetWidthToleranceMinusMm}
                          onChange={(e) =>
                            update("product.sheetWidthToleranceMinusMm", e.target.value)
                          }
                        />
                      </Field>

                      <Field label="Sheet Thickness (micron) *">
                        <Input
                          value={form.product.sheetThicknessMicron}
                          onChange={(e) => update("product.sheetThicknessMicron", e.target.value)}
                        />
                      </Field>

                      <Field label="Thickness Tolerance + (micron)">
                        <Input
                          value={form.product.sheetThicknessTolerancePlusMicron}
                          onChange={(e) =>
                            update("product.sheetThicknessTolerancePlusMicron", e.target.value)
                          }
                        />
                      </Field>

                      <Field label="Thickness Tolerance - (micron)">
                        <Input
                          value={form.product.sheetThicknessToleranceMinusMicron}
                          onChange={(e) =>
                            update("product.sheetThicknessToleranceMinusMicron", e.target.value)
                          }
                        />
                      </Field>

                      <Field label="Roll Weight (kg) *">
                        <Input
                          value={form.product.rollWeightKg}
                          onChange={(e) => update("product.rollWeightKg", e.target.value)}
                        />
                      </Field>

                      <Field label="Roll Diameter (mm) *">
                        <Input
                          value={form.product.rollDiameterMm}
                          onChange={(e) => update("product.rollDiameterMm", e.target.value)}
                        />
                      </Field>

                      <Field label="Core Diameter (mm) *">
                        <Input
                          value={form.product.coreDiameterMm}
                          onChange={(e) => update("product.coreDiameterMm", e.target.value)}
                        />
                      </Field>

                      <Field label="Core Material *">
                        <Input
                          value={form.product.coreMaterial}
                          onChange={(e) => update("product.coreMaterial", e.target.value)}
                        />
                      </Field>

                      <Field label="Sheet Layer Colors *">
                        <Select
                          value={form.product.sheetLayerColors}
                          onValueChange={(v) => update("product.sheetLayerColors", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select layer color type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Monocolor">Monocolor</SelectItem>
                            <SelectItem value="Bi-color">Bi-color</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>

                      {form.product.sheetLayerColors === "Monocolor" && (
                        <Field label="Layer A Color / Pantone">
                          <Input
                            value={form.product.layerAColor}
                            onChange={(e) => update("product.layerAColor", e.target.value)}
                          />
                        </Field>
                      )}

                      {form.product.sheetLayerColors === "Bi-color" && (
                        <>
                          <Field label="Layer A Color / Pantone">
                            <Input
                              value={form.product.layerAColor}
                              onChange={(e) => update("product.layerAColor", e.target.value)}
                            />
                          </Field>
                          <Field label="Layer B Color / Pantone">
                            <Input
                              value={form.product.layerBColor}
                              onChange={(e) => update("product.layerBColor", e.target.value)}
                            />
                          </Field>
                        </>
                      )}
                    </div>

                    <Field label="Additional Technical Notes">
                      <Textarea
                        value={form.product.technicalNotes}
                        onChange={(e) => update("product.technicalNotes", e.target.value)}
                        rows={5}
                      />
                    </Field>
                  </SectionCard>
                )}
              </div>
            )}

            {currentStep === 2 && form.product.productType === "Sheet Roll" && (
              <SectionCard
                title="Decoration"
                description="Sheet Roll requests do not require decoration input."
              >
                <div className="text-sm text-muted-foreground">
                  Decoration is automatically set to No decoration for Sheet Roll requests.
                </div>
              </SectionCard>
            )}

            {currentStep === 2 && form.product.productType !== "Sheet Roll" && (
              <div className="space-y-6">
                <SectionCard title="Decoration Type">
                  <div className="grid md:grid-cols-2 gap-4">
                    {[
                      "No decoration",
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
                          form.decoration.decorationType === type
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/40"
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
                      <Field label="Number of Colors">
                        <Input
                          value={form.decoration.dryOffset.printColors}
                          onChange={(e) =>
                            update("decoration.dryOffset.printColors", e.target.value)
                          }
                        />
                      </Field>
                      <Field label="Coverage %">
                        <Input
                          value={form.decoration.dryOffset.printCoveragePct}
                          onChange={(e) =>
                            update("decoration.dryOffset.printCoveragePct", e.target.value)
                          }
                        />
                      </Field>
                      <Field label="Artwork Available?">
                        <YesNoSelect
                          value={form.decoration.dryOffset.printArtworkAvailable}
                          onChange={(v) =>
                            update("decoration.dryOffset.printArtworkAvailable", v)
                          }
                        />
                      </Field>
                      <Field label="Artwork Format">
                        <Input
                          value={form.decoration.dryOffset.printArtworkFormat}
                          onChange={(e) =>
                            update("decoration.dryOffset.printArtworkFormat", e.target.value)
                          }
                        />
                      </Field>
                    </div>

                    <Field label="Printing Area Description">
                      <Textarea
                        value={form.decoration.dryOffset.printAreaDescription}
                        onChange={(e) =>
                          update("decoration.dryOffset.printAreaDescription", e.target.value)
                        }
                        rows={4}
                      />
                    </Field>
                    <Field label="Registration / Alignment Notes">
                      <Textarea
                        value={form.decoration.dryOffset.printRegistrationNotes}
                        onChange={(e) =>
                          update("decoration.dryOffset.printRegistrationNotes", e.target.value)
                        }
                        rows={4}
                      />
                    </Field>
                    <Field label="Ink / Decoration Material Notes">
                      <Textarea
                        value={form.decoration.dryOffset.printMaterialNotes}
                        onChange={(e) =>
                          update("decoration.dryOffset.printMaterialNotes", e.target.value)
                        }
                        rows={4}
                      />
                    </Field>
                    <Field label="Additional Notes">
                      <Textarea
                        value={form.decoration.dryOffset.printAdditionalNotes}
                        onChange={(e) =>
                          update("decoration.dryOffset.printAdditionalNotes", e.target.value)
                        }
                        rows={4}
                      />
                    </Field>

                    <FileUploadBox
                      title="Print Artwork Upload"
                      files={form.attachments.printArtworkFiles}
                      onAdd={(files) => handleAttachmentAdd("printArtworkFiles", files)}
                    />
                  </SectionCard>
                )}

                {form.decoration.decorationType === "Shrink sleeve" && (
                  <SectionCard title="Shrink Sleeve Specifications">
                    <div className="grid md:grid-cols-2 gap-4">
                      <Field label="Sleeve Material">
                        <Input
                          value={form.decoration.shrinkSleeve.sleeveMaterial}
                          onChange={(e) =>
                            update("decoration.shrinkSleeve.sleeveMaterial", e.target.value)
                          }
                        />
                      </Field>
                      <Field label="Sleeve Thickness (micron)">
                        <Input
                          value={form.decoration.shrinkSleeve.sleeveThicknessMicron}
                          onChange={(e) =>
                            update(
                              "decoration.shrinkSleeve.sleeveThicknessMicron",
                              e.target.value
                            )
                          }
                        />
                      </Field>
                      <Field label="Layflat Width (mm)">
                        <Input
                          value={form.decoration.shrinkSleeve.sleeveLayflatWidthMm}
                          onChange={(e) =>
                            update(
                              "decoration.shrinkSleeve.sleeveLayflatWidthMm",
                              e.target.value
                            )
                          }
                        />
                      </Field>
                      <Field label="Sleeve Height (mm)">
                        <Input
                          value={form.decoration.shrinkSleeve.sleeveHeightMm}
                          onChange={(e) =>
                            update("decoration.shrinkSleeve.sleeveHeightMm", e.target.value)
                          }
                        />
                      </Field>
                      <Field label="Shrink Ratio">
                        <Input
                          value={form.decoration.shrinkSleeve.sleeveShrinkRatio}
                          onChange={(e) =>
                            update("decoration.shrinkSleeve.sleeveShrinkRatio", e.target.value)
                          }
                        />
                      </Field>
                      <Field label="Specific Glue Pattern Needed?">
                        <YesNoSelect
                          value={form.decoration.shrinkSleeve.gluePatternNeeded}
                          onChange={(v) =>
                            update("decoration.shrinkSleeve.gluePatternNeeded", v)
                          }
                        />
                      </Field>
                      {form.decoration.shrinkSleeve.gluePatternNeeded === "Yes" && (
                        <Field label="Glue Pattern Diagram Available?">
                          <YesNoSelect
                            value={form.decoration.shrinkSleeve.gluePatternDiagramAvailable}
                            onChange={(v) =>
                              update(
                                "decoration.shrinkSleeve.gluePatternDiagramAvailable",
                                v
                              )
                            }
                          />
                        </Field>
                      )}
                      <Field label="Sleeve Artwork Available?">
                        <YesNoSelect
                          value={form.decoration.shrinkSleeve.sleeveArtworkAvailable}
                          onChange={(v) =>
                            update("decoration.shrinkSleeve.sleeveArtworkAvailable", v)
                          }
                        />
                      </Field>
                    </div>

                    <Field label="Seam / Orientation Notes">
                      <Textarea
                        value={form.decoration.shrinkSleeve.sleeveSeamNotes}
                        onChange={(e) =>
                          update("decoration.shrinkSleeve.sleeveSeamNotes", e.target.value)
                        }
                        rows={4}
                      />
                    </Field>
                    <Field label="Shrink / Application Notes">
                      <Textarea
                        value={form.decoration.shrinkSleeve.sleeveApplicationNotes}
                        onChange={(e) =>
                          update(
                            "decoration.shrinkSleeve.sleeveApplicationNotes",
                            e.target.value
                          )
                        }
                        rows={4}
                      />
                    </Field>
                    <Field label="Additional Notes">
                      <Textarea
                        value={form.decoration.shrinkSleeve.sleeveAdditionalNotes}
                        onChange={(e) =>
                          update(
                            "decoration.shrinkSleeve.sleeveAdditionalNotes",
                            e.target.value
                          )
                        }
                        rows={4}
                      />
                    </Field>

                    {form.decoration.shrinkSleeve.gluePatternNeeded === "Yes" && (
                      <FileUploadBox
                        title="Glue Pattern Diagram Upload"
                        files={form.attachments.gluePatternDiagramFiles}
                        onAdd={(files) =>
                          handleAttachmentAdd("gluePatternDiagramFiles", files)
                        }
                      />
                    )}

                    <FileUploadBox
                      title="Sleeve Artwork Upload"
                      files={form.attachments.sleeveArtworkFiles}
                      onAdd={(files) => handleAttachmentAdd("sleeveArtworkFiles", files)}
                    />
                  </SectionCard>
                )}

                {form.decoration.decorationType === "Hybrid cup" && (
                  <SectionCard title="Hybrid Cup Specifications">
                    <div className="grid md:grid-cols-2 gap-4">
                      <Field label="Cup Family">
                        <Select
                          value={form.decoration.hybridCup.hybridCupFamily}
                          onValueChange={(v) =>
                            update("decoration.hybridCup.hybridCupFamily", v)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select family" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Desto">Desto</SelectItem>
                            <SelectItem value="ISO">ISO</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>

                      <Field label="Blank Wrapped Around Plastic Cup?">
                        <YesNoSelect
                          value={form.decoration.hybridCup.blankWrapped}
                          onChange={(v) => update("decoration.hybridCup.blankWrapped", v)}
                        />
                      </Field>

                      <Field label="Paper Bottom Required?">
                        <YesNoSelect
                          value={form.decoration.hybridCup.paperBottomRequired}
                          onChange={(v) =>
                            update("decoration.hybridCup.paperBottomRequired", v)
                          }
                        />
                      </Field>

                      <Field label="Paper Sleeve / Blank Material">
                        <Input
                          value={form.decoration.hybridCup.hybridBlankMaterial}
                          onChange={(e) =>
                            update(
                              "decoration.hybridCup.hybridBlankMaterial",
                              e.target.value
                            )
                          }
                        />
                      </Field>

                      <Field label="Blank Thickness / GSM">
                        <Input
                          value={form.decoration.hybridCup.hybridBlankGsm}
                          onChange={(e) =>
                            update("decoration.hybridCup.hybridBlankGsm", e.target.value)
                          }
                        />
                      </Field>

                      <Field label="Wrap Artwork Available?">
                        <YesNoSelect
                          value={form.decoration.hybridCup.hybridWrapArtworkAvailable}
                          onChange={(v) =>
                            update(
                              "decoration.hybridCup.hybridWrapArtworkAvailable",
                              v
                            )
                          }
                        />
                      </Field>

                      {form.decoration.hybridCup.paperBottomRequired === "Yes" && (
                        <Field label="Bottom Artwork Available?">
                          <YesNoSelect
                            value={form.decoration.hybridCup.hybridBottomArtworkAvailable}
                            onChange={(v) =>
                              update(
                                "decoration.hybridCup.hybridBottomArtworkAvailable",
                                v
                              )
                            }
                          />
                        </Field>
                      )}
                    </div>

                    <Field label="Alignment / Fit Notes">
                      <Textarea
                        value={form.decoration.hybridCup.hybridAlignmentNotes}
                        onChange={(e) =>
                          update(
                            "decoration.hybridCup.hybridAlignmentNotes",
                            e.target.value
                          )
                        }
                        rows={4}
                      />
                    </Field>

                    <Field label="Additional Notes">
                      <Textarea
                        value={form.decoration.hybridCup.hybridAdditionalNotes}
                        onChange={(e) =>
                          update(
                            "decoration.hybridCup.hybridAdditionalNotes",
                            e.target.value
                          )
                        }
                        rows={4}
                      />
                    </Field>

                    <FileUploadBox
                      title="Wrap Artwork Upload"
                      files={form.attachments.hybridWrapArtworkFiles}
                      onAdd={(files) => handleAttachmentAdd("hybridWrapArtworkFiles", files)}
                    />

                    {form.decoration.hybridCup.paperBottomRequired === "Yes" && (
                      <FileUploadBox
                        title="Bottom Artwork Upload"
                        files={form.attachments.hybridBottomArtworkFiles}
                        onAdd={(files) =>
                          handleAttachmentAdd("hybridBottomArtworkFiles", files)
                        }
                      />
                    )}
                  </SectionCard>
                )}

                {form.decoration.decorationType === "Label" && (
                  <SectionCard title="Label Specifications">
                    <div className="grid md:grid-cols-2 gap-4">
                      <Field label="Label Material">
                        <Input
                          value={form.decoration.label.labelMaterial}
                          onChange={(e) =>
                            update("decoration.label.labelMaterial", e.target.value)
                          }
                        />
                      </Field>
                      <Field label="Label Dimensions">
                        <Input
                          value={form.decoration.label.labelDimensionsMm}
                          onChange={(e) =>
                            update("decoration.label.labelDimensionsMm", e.target.value)
                          }
                        />
                      </Field>
                      <Field label="Label Type">
                        <Input
                          value={form.decoration.label.labelType}
                          onChange={(e) => update("decoration.label.labelType", e.target.value)}
                        />
                      </Field>
                      <Field label="Label Artwork Available?">
                        <YesNoSelect
                          value={form.decoration.label.labelArtworkAvailable}
                          onChange={(v) =>
                            update("decoration.label.labelArtworkAvailable", v)
                          }
                        />
                      </Field>
                    </div>

                    <Field label="Adhesive Notes">
                      <Textarea
                        value={form.decoration.label.labelAdhesiveNotes}
                        onChange={(e) =>
                          update("decoration.label.labelAdhesiveNotes", e.target.value)
                        }
                        rows={4}
                      />
                    </Field>
                    <Field label="Application Position Notes">
                      <Textarea
                        value={form.decoration.label.labelPositionNotes}
                        onChange={(e) =>
                          update("decoration.label.labelPositionNotes", e.target.value)
                        }
                        rows={4}
                      />
                    </Field>
                    <Field label="Additional Notes">
                      <Textarea
                        value={form.decoration.label.labelAdditionalNotes}
                        onChange={(e) =>
                          update("decoration.label.labelAdditionalNotes", e.target.value)
                        }
                        rows={4}
                      />
                    </Field>

                    <FileUploadBox
                      title="Label Artwork Upload"
                      files={form.attachments.labelArtworkFiles}
                      onAdd={(files) => handleAttachmentAdd("labelArtworkFiles", files)}
                    />
                  </SectionCard>
                )}
              </div>
            )}

            {currentStep === 3 && form.product.productType === "Sheet Roll" && (
              <div className="space-y-6">
                <SectionCard title="Sheet Packaging">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Core Size *">
                      <Select
                        value={form.packaging.sheet.coreSize}
                        onValueChange={(v) => update("packaging.sheet.coreSize", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select core size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3 inch">3 inch</SelectItem>
                          <SelectItem value="6 inch">6 inch</SelectItem>
                          <SelectItem value="8 inch">8 inch</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field label="Roll Weight (kg)">
                      <Input value={form.product.rollWeightKg} disabled />
                    </Field>

                    <Field label="Rolls per Pallet *">
                      <Input
                        value={form.packaging.sheet.rollsPerPallet}
                        onChange={(e) => update("packaging.sheet.rollsPerPallet", e.target.value)}
                      />
                    </Field>

                    <Field label="Pallet Type *">
                      <Select
                        value={form.packaging.sheet.palletType}
                        onValueChange={(v) => update("packaging.sheet.palletType", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select pallet type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UK pallet">UK pallet</SelectItem>
                          <SelectItem value="EURO pallet">EURO pallet</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field label="Strap Length per Pallet (m)">
                      <Input
                        value={form.packaging.sheet.strapLengthPerPalletM}
                        onChange={(e) =>
                          update("packaging.sheet.strapLengthPerPalletM", e.target.value)
                        }
                      />
                    </Field>

                    <Field label="Foam Length per Pallet (m)">
                      <Input
                        value={form.packaging.sheet.foamLengthPerPalletM}
                        onChange={(e) =>
                          update("packaging.sheet.foamLengthPerPalletM", e.target.value)
                        }
                      />
                    </Field>

                    <Field label="Labels per Roll">
                      <Input
                        value={form.packaging.sheet.labelsPerRoll}
                        onChange={(e) => update("packaging.sheet.labelsPerRoll", e.target.value)}
                      />
                    </Field>

                    <Field label="Labels per Pallet">
                      <Input
                        value={form.packaging.sheet.labelsPerPallet}
                        onChange={(e) =>
                          update("packaging.sheet.labelsPerPallet", e.target.value)
                        }
                      />
                    </Field>

                    <Field label="Stretch Weight per Pallet (kg)">
                      <Input
                        value={form.packaging.sheet.stretchWeightPerPalletKg}
                        onChange={(e) =>
                          update("packaging.sheet.stretchWeightPerPalletKg", e.target.value)
                        }
                      />
                    </Field>

                    <Field label="Operators per Pallet">
                      <Input
                        value={form.packaging.sheet.operatorsPerPallet}
                        onChange={(e) =>
                          update("packaging.sheet.operatorsPerPallet", e.target.value)
                        }
                      />
                    </Field>
                  </div>

                  <div
                    className={`rounded-xl border px-3 py-3 text-sm ${
                      estimatedSheetRollPalletLoadKg > 1000
                        ? "bg-red-50 border-red-200 text-red-700"
                        : "bg-green-50 border-green-200 text-green-700"
                    }`}
                  >
                    Estimated pallet load = {estimatedSheetRollPalletLoadKg.toFixed(2)} kg
                    {estimatedSheetRollPalletLoadKg > 1000
                      ? " — Above 1 ton"
                      : " — Within 1 ton"}
                  </div>
                </SectionCard>
              </div>
            )}

            {currentStep === 3 && form.product.productType !== "Sheet Roll" && (
              <div className="space-y-6">
                <SectionCard title="Primary Packaging">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Pieces per Stack *">
                      <Input
                        value={form.packaging.primary.pcsPerStack}
                        onChange={(e) =>
                          update("packaging.primary.pcsPerStack", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="Stacks per Bag *">
                      <Input
                        value={form.packaging.primary.stacksPerBag}
                        onChange={(e) =>
                          update("packaging.primary.stacksPerBag", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="Sleeve Artwork Needed?">
                      <YesNoSelect
                        value={form.packaging.primary.sleeveArtworkNeeded}
                        onChange={(v) =>
                          update("packaging.primary.sleeveArtworkNeeded", v)
                        }
                      />
                    </Field>
                    <Field label="Sleeve Artwork Provided?">
                      <YesNoSelect
                        value={form.packaging.primary.sleeveArtworkProvided}
                        onChange={(v) =>
                          update("packaging.primary.sleeveArtworkProvided", v)
                        }
                      />
                    </Field>
                    <Field label="Bag / Sleeve Material">
                      <Input
                        value={form.packaging.primary.bagSleeveMaterial}
                        onChange={(e) =>
                          update("packaging.primary.bagSleeveMaterial", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="Bag / Sleeve Dimensions (mm)">
                      <Input
                        value={form.packaging.primary.bagSleeveDimensionsMm}
                        onChange={(e) =>
                          update("packaging.primary.bagSleeveDimensionsMm", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="Sleeve Thickness (micron)">
                      <Input
                        value={form.packaging.primary.bagSleeveThicknessMicron}
                        onChange={(e) =>
                          update(
                            "packaging.primary.bagSleeveThicknessMicron",
                            e.target.value
                          )
                        }
                      />
                    </Field>
                    <Field label="Sleeve Weight">
                      <Input
                        value={form.packaging.primary.bagSleeveWeight}
                        onChange={(e) =>
                          update("packaging.primary.bagSleeveWeight", e.target.value)
                        }
                      />
                    </Field>
                  </div>

                  <Field label="Special Instructions">
                    <Textarea
                      value={form.packaging.primary.primaryPackagingNotes}
                      onChange={(e) =>
                        update("packaging.primary.primaryPackagingNotes", e.target.value)
                      }
                      rows={4}
                    />
                  </Field>

                  <FileUploadBox
                    title="Primary Sleeve Artwork Upload"
                    files={form.attachments.primarySleeveArtworkFiles}
                    onAdd={(files) =>
                      handleAttachmentAdd("primarySleeveArtworkFiles", files)
                    }
                  />
                </SectionCard>

                <SectionCard title="Secondary Packaging">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Bags / Sleeves per Carton *">
                      <Input
                        value={form.packaging.secondary.bagsPerCarton}
                        onChange={(e) =>
                          update("packaging.secondary.bagsPerCarton", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="Carton Type *">
                      <Select
                        value={form.packaging.secondary.cartonType}
                        onValueChange={(v) =>
                          update("packaging.secondary.cartonType", v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select carton type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Single wall">Single wall</SelectItem>
                          <SelectItem value="Double wall">Double wall</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Carton Internal Dimensions (mm)">
                      <Input
                        value={form.packaging.secondary.cartonInternalDimensionsMm}
                        onChange={(e) =>
                          update(
                            "packaging.secondary.cartonInternalDimensionsMm",
                            e.target.value
                          )
                        }
                      />
                    </Field>
                    <Field label="Carton External Dimensions (mm)">
                      <Input
                        value={form.packaging.secondary.cartonExternalDimensionsMm}
                        onChange={(e) =>
                          update(
                            "packaging.secondary.cartonExternalDimensionsMm",
                            e.target.value
                          )
                        }
                      />
                    </Field>
                    <Field label="Carton Artwork Needed?">
                      <YesNoSelect
                        value={form.packaging.secondary.cartonArtworkNeeded}
                        onChange={(v) =>
                          update("packaging.secondary.cartonArtworkNeeded", v)
                        }
                      />
                    </Field>
                    <Field label="Carton Artwork Provided?">
                      <YesNoSelect
                        value={form.packaging.secondary.cartonArtworkProvided}
                        onChange={(v) =>
                          update("packaging.secondary.cartonArtworkProvided", v)
                        }
                      />
                    </Field>
                  </div>

                  <Field label="Special Instructions">
                    <Textarea
                      value={form.packaging.secondary.cartonPackagingNotes}
                      onChange={(e) =>
                        update("packaging.secondary.cartonPackagingNotes", e.target.value)
                      }
                      rows={4}
                    />
                  </Field>

                  <FileUploadBox
                    title="Carton Artwork Upload"
                    files={form.attachments.cartonArtworkFiles}
                    onAdd={(files) => handleAttachmentAdd("cartonArtworkFiles", files)}
                  />
                </SectionCard>

                <Tabs defaultValue="label" className="space-y-6">
                  <TabsList className="grid grid-cols-2 rounded-2xl">
                    <TabsTrigger value="label">Label Instructions</TabsTrigger>
                    <TabsTrigger value="pallet">Pallet Instructions</TabsTrigger>
                  </TabsList>

                  <TabsContent value="label">
                    <SectionCard title="Label Instructions">
                      <div className="flex items-center gap-3 rounded-xl border p-3">
                        <Checkbox
                          checked={form.decoration.label.useStandardLabelSpecs}
                          onCheckedChange={(checked) =>
                            update("decoration.label.useStandardLabelSpecs", Boolean(checked))
                          }
                        />
                        <Label>Use standard labels specs</Label>
                      </div>

                      {!form.decoration.label.useStandardLabelSpecs && (
                        <>
                          <div className="grid md:grid-cols-2 gap-4">
                            <Field label="Carton Label Required?">
                              <YesNoSelect
                                value={form.packaging.labelInstructions.cartonLabelRequired}
                                onChange={(v) =>
                                  update(
                                    "packaging.labelInstructions.cartonLabelRequired",
                                    v
                                  )
                                }
                              />
                            </Field>
                            <Field label="Label Dimensions (mm)">
                              <Input
                                value={form.packaging.labelInstructions.cartonLabelDimensionsMm}
                                onChange={(e) =>
                                  update(
                                    "packaging.labelInstructions.cartonLabelDimensionsMm",
                                    e.target.value
                                  )
                                }
                              />
                            </Field>
                            <Field label="Barcode Required?">
                              <YesNoSelect
                                value={form.packaging.labelInstructions.barcodeRequired}
                                onChange={(v) =>
                                  update("packaging.labelInstructions.barcodeRequired", v)
                                }
                              />
                            </Field>
                            <Field label="Barcode Type">
                              <Input
                                value={form.packaging.labelInstructions.barcodeType}
                                onChange={(e) =>
                                  update(
                                    "packaging.labelInstructions.barcodeType",
                                    e.target.value
                                  )
                                }
                              />
                            </Field>
                            <Field label="Label Artwork Provided?">
                              <YesNoSelect
                                value={
                                  form.packaging.labelInstructions.cartonLabelArtworkProvided
                                }
                                onChange={(v) =>
                                  update(
                                    "packaging.labelInstructions.cartonLabelArtworkProvided",
                                    v
                                  )
                                }
                              />
                            </Field>
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
                              ].map(([labelText, key]) => (
                                <div
                                  key={key}
                                  className="flex items-center gap-3 rounded-xl border p-3"
                                >
                                  <Checkbox
                                    checked={form.packaging.labelInstructions[key]}
                                    onCheckedChange={(checked) =>
                                      update(
                                        `packaging.labelInstructions.${key}`,
                                        Boolean(checked)
                                      )
                                    }
                                  />
                                  <Label>{labelText}</Label>
                                </div>
                              ))}
                            </div>

                            <Field label="Other Label Data">
                              <Input
                                value={form.packaging.labelInstructions.labelFieldOther}
                                onChange={(e) =>
                                  update(
                                    "packaging.labelInstructions.labelFieldOther",
                                    e.target.value
                                  )
                                }
                              />
                            </Field>
                          </div>

                          <Field label="Special Instructions">
                            <Textarea
                              value={form.packaging.labelInstructions.cartonLabelNotes}
                              onChange={(e) =>
                                update(
                                  "packaging.labelInstructions.cartonLabelNotes",
                                  e.target.value
                                )
                              }
                              rows={4}
                            />
                          </Field>

                          <FileUploadBox
                            title="Carton Label Artwork Upload"
                            files={form.attachments.cartonLabelArtworkFiles}
                            onAdd={(files) =>
                              handleAttachmentAdd("cartonLabelArtworkFiles", files)
                            }
                          />
                        </>
                      )}
                    </SectionCard>
                  </TabsContent>

                  <TabsContent value="pallet">
                    <SectionCard title="Pallet Instructions">
                      <div className="flex items-center gap-3 rounded-xl border p-3">
                        <Checkbox
                          checked={form.packaging.pallet.noPalletNeeded}
                          onCheckedChange={(checked) =>
                            update("packaging.pallet.noPalletNeeded", Boolean(checked))
                          }
                        />
                        <Label>No pallet needed</Label>
                      </div>

                      {!form.packaging.pallet.noPalletNeeded && (
                        <>
                          <div className="grid md:grid-cols-2 gap-4">
                            <Field label="Pallet Type *">
                              <Input
                                value={form.packaging.pallet.palletType}
                                onChange={(e) =>
                                  update("packaging.pallet.palletType", e.target.value)
                                }
                              />
                            </Field>
                            <Field label="Pallet Dimensions (mm)">
                              <Input
                                value={form.packaging.pallet.palletDimensionsMm}
                                onChange={(e) =>
                                  update(
                                    "packaging.pallet.palletDimensionsMm",
                                    e.target.value
                                  )
                                }
                              />
                            </Field>
                            <Field label="Returnable Pallet? *">
                              <YesNoSelect
                                value={form.packaging.pallet.returnablePallet}
                                onChange={(v) =>
                                  update("packaging.pallet.returnablePallet", v)
                                }
                              />
                            </Field>
                            {form.packaging.pallet.returnablePallet === "Yes" && (
                              <Field label="Number of Returns">
                                <Input
                                  value={form.packaging.pallet.palletReturnCount}
                                  onChange={(e) =>
                                    update(
                                      "packaging.pallet.palletReturnCount",
                                      e.target.value
                                    )
                                  }
                                />
                              </Field>
                            )}
                            <Field label="Cartons per Pallet *">
                              <Input
                                value={form.packaging.pallet.cartonsPerPallet}
                                onChange={(e) =>
                                  update(
                                    "packaging.pallet.cartonsPerPallet",
                                    e.target.value
                                  )
                                }
                              />
                            </Field>
                            <Field label="Stretch Wrap Required? *">
                              <YesNoSelect
                                value={form.packaging.pallet.stretchWrapRequired}
                                onChange={(v) =>
                                  update("packaging.pallet.stretchWrapRequired", v)
                                }
                              />
                            </Field>
                            {form.packaging.pallet.stretchWrapRequired === "Yes" && (
                              <Field label="Stretch Wrap kg per Pallet">
                                <Input
                                  value={form.packaging.pallet.stretchWrapKgPerPallet}
                                  onChange={(e) =>
                                    update(
                                      "packaging.pallet.stretchWrapKgPerPallet",
                                      e.target.value
                                    )
                                  }
                                />
                              </Field>
                            )}
                          </div>

                          <Field label="Special Instructions">
                            <Textarea
                              value={form.packaging.pallet.palletNotes}
                              onChange={(e) =>
                                update("packaging.pallet.palletNotes", e.target.value)
                              }
                              rows={4}
                            />
                          </Field>
                        </>
                      )}
                    </SectionCard>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {currentStep === 4 && form.product.productType === "Sheet Roll" && (
              <SectionCard title="Sheet Roll Delivery Instructions">
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Delivery Location *">
                    <Input
                      value={form.delivery.deliveryLocationConfirm}
                      onChange={(e) =>
                        update("delivery.deliveryLocationConfirm", e.target.value)
                      }
                      placeholder={form.customer.deliveryLocation || "Enter delivery location"}
                    />
                  </Field>

                  <Field label="Required Qty per Truck *">
                    <Input
                      value={form.delivery.desiredQtyPerTruck}
                      onChange={(e) => update("delivery.desiredQtyPerTruck", e.target.value)}
                    />
                  </Field>

                  <Field label="Required Qty Unit *">
                    <Select
                      value={form.delivery.desiredQtyPerTruckUnit}
                      onValueChange={(v) => update("delivery.desiredQtyPerTruckUnit", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Tons">Tons</SelectItem>
                        <SelectItem value="Kg">Kg</SelectItem>
                        <SelectItem value="Pcs">Pcs</SelectItem>
                        <SelectItem value="Cartons">Cartons</SelectItem>
                        <SelectItem value="Rolls">Rolls</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Truck Size *">
                    <Input
                      value={form.delivery.truckSize}
                      onChange={(e) => update("delivery.truckSize", e.target.value)}
                    />
                  </Field>

                  <Field label="Delivery Term">
                    <Input
                      value={form.delivery.deliveryTerm}
                      onChange={(e) => update("delivery.deliveryTerm", e.target.value)}
                      placeholder="EXW / FCA / Delivered / Other"
                    />
                  </Field>
                </div>

                <Field label="Additional Logistics Comments">
                  <Textarea
                    value={form.delivery.logisticsComments}
                    onChange={(e) => update("delivery.logisticsComments", e.target.value)}
                    rows={4}
                  />
                </Field>
              </SectionCard>
            )}

            {currentStep === 4 && form.product.productType !== "Sheet Roll" && (
              <SectionCard title="Thermoformed Product Delivery Instructions">
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Delivery Location *">
                    <Input
                      value={form.delivery.deliveryLocationConfirm}
                      onChange={(e) =>
                        update("delivery.deliveryLocationConfirm", e.target.value)
                      }
                      placeholder={form.customer.deliveryLocation || "Enter delivery location"}
                    />
                  </Field>

                  <Field label="Delivery Term">
                    <Input
                      value={form.delivery.deliveryTerm}
                      onChange={(e) => update("delivery.deliveryTerm", e.target.value)}
                      placeholder="EXW / FCA / Delivered / Other"
                    />
                  </Field>

                  <Field label="Delivery Frequency">
                    <Input
                      value={form.delivery.deliveryFrequency}
                      onChange={(e) => update("delivery.deliveryFrequency", e.target.value)}
                    />
                  </Field>

                  <Field label="Estimated First Delivery Date">
                    <Input
                      type="date"
                      value={form.delivery.firstDeliveryDate}
                      onChange={(e) => update("delivery.firstDeliveryDate", e.target.value)}
                    />
                  </Field>

                  <Field label="Required Qty per Truck *">
                    <Input
                      value={form.delivery.desiredQtyPerTruck}
                      onChange={(e) => update("delivery.desiredQtyPerTruck", e.target.value)}
                    />
                  </Field>

                  <Field label="Required Qty Unit *">
                    <Select
                      value={form.delivery.desiredQtyPerTruckUnit}
                      onValueChange={(v) => update("delivery.desiredQtyPerTruckUnit", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Tons">Tons</SelectItem>
                        <SelectItem value="Kg">Kg</SelectItem>
                        <SelectItem value="Pcs">Pcs</SelectItem>
                        <SelectItem value="Cartons">Cartons</SelectItem>
                        <SelectItem value="Rolls">Rolls</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Truck Size *">
                    <Input
                      value={form.delivery.truckSize}
                      onChange={(e) => update("delivery.truckSize", e.target.value)}
                    />
                  </Field>
                </div>

                <Field label="Customer Receiving Notes">
                  <Textarea
                    value={form.delivery.receivingNotes}
                    onChange={(e) => update("delivery.receivingNotes", e.target.value)}
                    rows={4}
                  />
                </Field>

                <Field label="Loading Restrictions">
                  <Textarea
                    value={form.delivery.loadingRestrictions}
                    onChange={(e) => update("delivery.loadingRestrictions", e.target.value)}
                    rows={4}
                  />
                </Field>

                <Field label="Required Delivery Documents">
                  <Textarea
                    value={form.delivery.requiredDeliveryDocs}
                    onChange={(e) => update("delivery.requiredDeliveryDocs", e.target.value)}
                    rows={4}
                  />
                </Field>

                <Field label="Additional Logistics Comments">
                  <Textarea
                    value={form.delivery.logisticsComments}
                    onChange={(e) => update("delivery.logisticsComments", e.target.value)}
                    rows={4}
                  />
                </Field>
              </SectionCard>
            )}

            {currentStep === 5 && (
              <div className="space-y-6">
                <SectionCard
                  title="Artwork & Attachments Center"
                  description="Review all uploaded files before final submission."
                >
                  <div className="grid lg:grid-cols-2 gap-4">
                    <FileUploadBox
                      title="Customer Specs / Briefs"
                      files={form.attachments.customerBriefFiles}
                      onAdd={(files) => handleAttachmentAdd("customerBriefFiles", files)}
                    />
                    <FileUploadBox
                      title="Sample Photos"
                      files={form.attachments.samplePhotos}
                      onAdd={(files) => handleAttachmentAdd("samplePhotos", files)}
                    />
                    <FileUploadBox
                      title="Print Artwork"
                      files={form.attachments.printArtworkFiles}
                      onAdd={(files) => handleAttachmentAdd("printArtworkFiles", files)}
                    />
                    <FileUploadBox
                      title="Sleeve Artwork"
                      files={form.attachments.sleeveArtworkFiles}
                      onAdd={(files) => handleAttachmentAdd("sleeveArtworkFiles", files)}
                    />
                    <FileUploadBox
                      title="Glue Pattern Diagrams"
                      files={form.attachments.gluePatternDiagramFiles}
                      onAdd={(files) =>
                        handleAttachmentAdd("gluePatternDiagramFiles", files)
                      }
                    />
                    <FileUploadBox
                      title="Hybrid Wrap Artwork"
                      files={form.attachments.hybridWrapArtworkFiles}
                      onAdd={(files) =>
                        handleAttachmentAdd("hybridWrapArtworkFiles", files)
                      }
                    />
                    <FileUploadBox
                      title="Hybrid Bottom Artwork"
                      files={form.attachments.hybridBottomArtworkFiles}
                      onAdd={(files) =>
                        handleAttachmentAdd("hybridBottomArtworkFiles", files)
                      }
                    />
                    <FileUploadBox
                      title="Label Artwork"
                      files={form.attachments.labelArtworkFiles}
                      onAdd={(files) => handleAttachmentAdd("labelArtworkFiles", files)}
                    />
                    <FileUploadBox
                      title="Primary Sleeve Artwork"
                      files={form.attachments.primarySleeveArtworkFiles}
                      onAdd={(files) =>
                        handleAttachmentAdd("primarySleeveArtworkFiles", files)
                      }
                    />
                    <FileUploadBox
                      title="Carton Artwork"
                      files={form.attachments.cartonArtworkFiles}
                      onAdd={(files) => handleAttachmentAdd("cartonArtworkFiles", files)}
                    />
                    <FileUploadBox
                      title="Carton Label Artwork"
                      files={form.attachments.cartonLabelArtworkFiles}
                      onAdd={(files) =>
                        handleAttachmentAdd("cartonLabelArtworkFiles", files)
                      }
                    />
                  </div>
                </SectionCard>
              </div>
            )}

            {currentStep === 6 && (
              <div className="space-y-6">
                <SectionCard
                  title="Final Review & Submit"
                  description="Review the request before sending it to engineering."
                >
                  {missingRequired.length > 0 && (
                    <Alert className="rounded-2xl mb-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Submission is currently blocked by {missingRequired.length} missing
                        required field(s).
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid md:grid-cols-2 gap-4">
                    <Card className="rounded-2xl">
                      <CardHeader>
                        <CardTitle className="text-base">Customer</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm space-y-2">
                        <div>
                          <span className="text-muted-foreground">Requested By:</span>{" "}
                          {form.metadata.createdBy || "—"}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Name:</span>{" "}
                          {form.customer.customerName || "—"}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Project:</span>{" "}
                          {form.customer.projectName || "—"}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Market:</span>{" "}
                          {form.customer.countryMarket || "—"}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl">
                      <CardHeader>
                        <CardTitle className="text-base">Product</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm space-y-2">
                        <div>
                          <span className="text-muted-foreground">Type:</span>{" "}
                          {form.product.productType || "—"}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Material:</span>{" "}
                          {form.product.productType === "Sheet Roll"
                            ? form.product.sheetMaterial || "—"
                            : form.product.productMaterial || "—"}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Sample Code:</span>{" "}
                          {form.product.internalSampleCode || "—"}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl">
                      <CardHeader>
                        <CardTitle className="text-base">Decoration</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm space-y-2">
                        <div>
                          <span className="text-muted-foreground">Type:</span>{" "}
                          {form.product.productType === "Sheet Roll"
                            ? "No decoration"
                            : form.decoration.decorationType || "—"}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl">
                      <CardHeader>
                        <CardTitle className="text-base">Packaging</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm space-y-2">
                        {form.product.productType === "Sheet Roll" ? (
                          <>
                            <div>
                              <span className="text-muted-foreground">Rolls per Pallet:</span>{" "}
                              {form.packaging.sheet.rollsPerPallet || "—"}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Pallet Type:</span>{" "}
                              {form.packaging.sheet.palletType || "—"}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Pallet Load:</span>{" "}
                              {estimatedSheetRollPalletLoadKg.toFixed(2)} kg
                            </div>
                          </>
                        ) : (
                          <>
                            <div>{`${form.packaging.primary.pcsPerStack || "—"} pcs/stack`}</div>
                            <div>{`${form.packaging.primary.stacksPerBag || "—"} stacks/bag`}</div>
                            <div>{`${form.packaging.secondary.bagsPerCarton || "—"} bags/carton`}</div>
                            <div>{`${form.packaging.pallet.cartonsPerPallet || "—"} cartons/pallet`}</div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </SectionCard>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 rounded-2xl border p-4 bg-card">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
                className="rounded-2xl"
              >
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
                  <Button
                    disabled={missingRequired.length > 0}
                    onClick={async () => {
                      try {
                        const updatedForm = {
                          ...form,
                          metadata: {
                            ...form.metadata,
                            status: "Project Completed",
                          },
                        };

                        const response = await fetch("/.netlify/functions/save-draft", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify(updatedForm),
                        });

                        const data = await response.json();

                        if (data.success) {
                          alert("✅ Sent to Engineering");
                          window.location.href = "/engineering-dashboard";
                        } else {
                          alert("❌ Failed to send");
                        }
                      } catch (error) {
                        console.error(error);
                        alert("❌ Error sending");
                      }
                    }}
                  >
                    Submit to Engineering
                  </Button>
                )}
              </div>
            </div>
          </div>

          <SummaryPanel
            form={form}
            currentStep={currentStep}
            missingRequired={missingRequired}
          />
        </div>
      </div>
    </div>
  );
}