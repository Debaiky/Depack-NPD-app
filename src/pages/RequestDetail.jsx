import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";

function Section({ title, children }) {
  const items = Array.isArray(children)
    ? children.filter(Boolean)
    : children
    ? [children]
    : [];

  if (items.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-3">
      <h2 className="text-base font-semibold border-b pb-2">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-2">
        {items}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  const isEmpty =
    value === undefined ||
    value === null ||
    value === "" ||
    value === "—" ||
    (Array.isArray(value) && value.length === 0);

  if (isEmpty) return null;

  return (
    <div className="text-sm leading-6 break-words">
      <span className="font-semibold">{label}: </span>
      <span>{value}</span>
    </div>
  );
}

function AttachmentRow({ file }) {
  if (!file) return null;

  return (
    <div className="text-sm leading-6 break-words">
      <span className="font-semibold">
        {file.category || "Attachment"} - {file.fileName || "Unnamed file"}:
      </span>{" "}
      <a
        href={file.driveLink}
        target="_blank"
        rel="noreferrer"
        className="text-blue-600 underline"
      >
        View / Download
      </a>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export default function RequestDetail() {
  const { requestId } = useParams();
  const [request, setRequest] = useState(null);
  const [payload, setPayload] = useState(null);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadRequest = async () => {
      try {
        const response = await fetch(`/.netlify/functions/get-request?requestId=${requestId}`);
        const data = await response.json();

        if (data.success) {
          setRequest(data.request);
          setPayload(data.payload);
        } else {
          setError(data.error || "Request not found");
          return;
        }

        const filesResponse = await fetch(
          `/.netlify/functions/list-request-files?requestId=${requestId}`
        );
        const filesData = await filesResponse.json();

        if (filesData.success) {
          setFiles(filesData.files || []);
        }
      } catch (loadError) {
        console.error("Failed to load request:", loadError);
        setError("Failed to load request");
      }
    };

    loadRequest();
  }, [requestId]);

  const topCustomers = useMemo(() => {
    return (payload?.customer?.customers || [])
      .map((c) => c?.customerName)
      .filter(Boolean)
      .join(", ");
  }, [payload]);

  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!request || !payload) return <div className="p-6">Loading...</div>;

  const customerBlock = payload.customer || {};
  const customers = customerBlock.customers || [];
  const primaryCustomer = customers[0] || {};
  const project = payload.project || {};
  const product = payload.product || {};
  const decoration = payload.decoration || {};
  const packaging = payload.packaging || {};
  const delivery = payload.delivery || {};
  const status = payload?.metadata?.status || request.Status || "Draft";

  const productImage =
    request?.Thumbnail ||
    product?.productThumbnailUrl ||
    product?.productThumbnailPreview ||
    (product?.productThumbnailBase64
      ? `data:image/*;base64,${product.productThumbnailBase64}`
      : "");

  const materialValue =
    product.productType === "Sheet Roll"
      ? product.sheetMaterial || request.ProductMaterial
      : product.productMaterial || request.ProductMaterial;

  const expectedTurnover =
    request.AnnualTurnover ||
    (project.targetSellingPrice && project.forecastAnnualVolume
      ? String(
          (
            Number(String(project.targetSellingPrice).replace(/,/g, "")) *
            Number(String(project.forecastAnnualVolume).replace(/,/g, ""))
          ).toFixed(2)
        )
      : "");

  const driveFolderLink = request?.DriveFolderID
    ? `https://drive.google.com/drive/folders/${request.DriveFolderID}`
    : "";

  return (
    <div className="min-h-screen bg-gray-50">
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
            <div className="text-base font-medium truncate">
              {project.projectName || product.productType || "—"}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="rounded-full bg-yellow-100 text-yellow-800 px-4 py-1 text-sm font-medium">
              {status}
            </div>

            <Link
              to="/"
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-100"
            >
              ← Dashboard
            </Link>

            <Link
              to={`/edit/${requestId}`}
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
            >
              Edit Request
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <div className="flex gap-6 flex-wrap items-start">
            {productImage ? (
              <div className="min-w-[150px]">
                <div className="text-sm font-medium mb-3">Product Image</div>
                <img
                  src={productImage}
                  alt={request.ProjectName || "Product"}
                  className="w-40 h-40 object-cover rounded-xl border"
                />
              </div>
            ) : null}

            <div className="flex-1 min-w-[260px]">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-1 text-sm">
                <InfoRow label="Request ID" value={request.RequestID} />
                <InfoRow label="Created By" value={request.CreatedBy} />
                <InfoRow label="Created On" value={formatDate(request.CreatedDate)} />
                <InfoRow label="Customers" value={topCustomers} />
                <InfoRow label="Product Type" value={product.productType || request.ProductType} />
                <InfoRow label="Project Name" value={project.projectName || request.ProjectName} />
                <InfoRow label="Material" value={materialValue} />
                <InfoRow
                  label="Decoration Type"
                  value={decoration.decorationType || request.DecorationType}
                />
                <InfoRow
                  label="Annual Qty"
                  value={project.forecastAnnualVolume || request.ForecastAnnualVolume}
                />
                <InfoRow
                  label="Target Selling Price"
                  value={project.targetSellingPrice || request.TargetSellingPrice}
                />
                <InfoRow label="Currency" value={project.currency} />
                <InfoRow label="Expected Turnover" value={expectedTurnover} />
                {driveFolderLink ? (
                  <div className="text-sm leading-6 break-words">
                    <span className="font-semibold">Drive Folder: </span>
                    <a
                      href={driveFolderLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 underline"
                    >
                      Open Request Folder
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <Section title="Product Technical Details">
          <InfoRow label="Customer Name" value={primaryCustomer.customerName} />
          <InfoRow label="Contact Person" value={primaryCustomer.contactPerson} />
          <InfoRow label="Contact Email" value={primaryCustomer.contactEmail} />
          <InfoRow label="Contact Phone" value={primaryCustomer.contactPhone} />
          <InfoRow label="Country / Market" value={primaryCustomer.countryMarket} />
          <InfoRow label="Delivery Location" value={primaryCustomer.deliveryLocation} />
          <InfoRow label="Customer Product Code" value={project.customerProductCode || project.customerSkuRef} />
          <InfoRow label="Target Launch Date" value={project.targetLaunchDate} />
          <InfoRow label="Customer Notes" value={project.customerNotes} />

          <InfoRow label="Product Type" value={product.productType} />
          <InfoRow label="Product Type Other" value={product.productTypeOther} />
          <InfoRow label="Sample Exists" value={product.sampleExists} />
          <InfoRow label="Sample In Hand" value={product.sampleInHand} />
          <InfoRow label="Internal Sample Code" value={product.internalSampleCode} />
          <InfoRow label="Product Material" value={product.productMaterial} />
          <InfoRow label="Product Weight (g)" value={product.productWeightG} />
          <InfoRow label="Top Diameter (mm)" value={product.topDiameterMm} />
          <InfoRow label="Bottom Diameter (mm)" value={product.bottomDiameterMm} />
          <InfoRow label="Height (mm)" value={product.productHeightMm} />
          <InfoRow label="Product Color" value={product.productColor} />
          <InfoRow label="Masterbatch Details" value={product.masterbatchDetails} />
          <InfoRow label="Additives" value={product.additives} />
          <InfoRow label="Specific Function" value={product.specialFunction} />
          <InfoRow label="Specific Cut / Shape Notes" value={product.specialCutNotes} />
          <InfoRow label="Rim Notes" value={product.rimNotes} />
          <InfoRow label="Technical Notes" value={product.technicalNotes} />

          <InfoRow label="Sheet Material" value={product.sheetMaterial} />
          <InfoRow label="% HIPS" value={product.hipsPct} />
          <InfoRow label="% GPPS" value={product.gppsPct} />
          <InfoRow label="% rPET" value={product.rpetPct} />
          <InfoRow label="% Virgin PET" value={product.virginPetPct} />
          <InfoRow label="Sheet Width (mm)" value={product.sheetWidthMm} />
          <InfoRow label="Width Tol +" value={product.sheetWidthTolerancePlusMm} />
          <InfoRow label="Width Tol -" value={product.sheetWidthToleranceMinusMm} />
          <InfoRow label="Sheet Thickness (micron)" value={product.sheetThicknessMicron} />
          <InfoRow label="Thickness Tol +" value={product.sheetThicknessTolerancePlusMicron} />
          <InfoRow label="Thickness Tol -" value={product.sheetThicknessToleranceMinusMicron} />
          <InfoRow label="Roll Weight (kg)" value={product.rollWeightKg} />
          <InfoRow label="Roll Diameter (mm)" value={product.rollDiameterMm} />
          <InfoRow label="Core Diameter (mm)" value={product.coreDiameterMm} />
          <InfoRow label="Core Material" value={product.coreMaterial} />
          <InfoRow label="Layer Colors" value={product.sheetLayerColors} />
          <InfoRow label="Layer A Color" value={product.layerAColor} />
          <InfoRow label="Layer B Color" value={product.layerBColor} />
        </Section>

        <Section title="Decoration Details">
          <InfoRow label="Decoration Type" value={decoration.decorationType} />

          <InfoRow label="Print Colors" value={decoration.dryOffset?.printColors} />
          <InfoRow
            label="Print Area Description"
            value={decoration.dryOffset?.printAreaDescription}
          />
          <InfoRow label="Coverage %" value={decoration.dryOffset?.printCoveragePct} />
          <InfoRow
            label="Artwork Available"
            value={decoration.dryOffset?.printArtworkAvailable}
          />
          <InfoRow label="Artwork Format" value={decoration.dryOffset?.printArtworkFormat} />
          <InfoRow
            label="Registration Notes"
            value={decoration.dryOffset?.printRegistrationNotes}
          />
          <InfoRow label="Material Notes" value={decoration.dryOffset?.printMaterialNotes} />
          <InfoRow
            label="Additional Notes"
            value={decoration.dryOffset?.printAdditionalNotes}
          />

          <InfoRow
            label="Sleeve Material"
            value={decoration.shrinkSleeve?.sleeveMaterial}
          />
          <InfoRow
            label="Sleeve Thickness"
            value={decoration.shrinkSleeve?.sleeveThicknessMicron}
          />
          <InfoRow
            label="Layflat Width"
            value={decoration.shrinkSleeve?.sleeveLayflatWidthMm}
          />
          <InfoRow
            label="Sleeve Height"
            value={decoration.shrinkSleeve?.sleeveHeightMm}
          />
          <InfoRow
            label="Shrink Ratio"
            value={decoration.shrinkSleeve?.sleeveShrinkRatio}
          />
          <InfoRow
            label="Glue Pattern Needed"
            value={decoration.shrinkSleeve?.gluePatternNeeded}
          />
          <InfoRow
            label="Glue Pattern Diagram Available"
            value={decoration.shrinkSleeve?.gluePatternDiagramAvailable}
          />
          <InfoRow
            label="Sleeve Artwork Available"
            value={decoration.shrinkSleeve?.sleeveArtworkAvailable}
          />
          <InfoRow
            label="Seam / Orientation Notes"
            value={decoration.shrinkSleeve?.sleeveSeamNotes}
          />
          <InfoRow
            label="Shrink / Application Notes"
            value={decoration.shrinkSleeve?.sleeveApplicationNotes}
          />
          <InfoRow
            label="Additional Notes"
            value={decoration.shrinkSleeve?.sleeveAdditionalNotes}
          />

          <InfoRow label="Cup Family" value={decoration.hybridCup?.hybridCupFamily} />
          <InfoRow label="Blank Wrapped" value={decoration.hybridCup?.blankWrapped} />
          <InfoRow
            label="Paper Bottom Required"
            value={decoration.hybridCup?.paperBottomRequired}
          />
          <InfoRow
            label="Blank Material"
            value={decoration.hybridCup?.hybridBlankMaterial}
          />
          <InfoRow label="Blank GSM" value={decoration.hybridCup?.hybridBlankGsm} />
          <InfoRow
            label="Wrap Artwork Available"
            value={decoration.hybridCup?.hybridWrapArtworkAvailable}
          />
          <InfoRow
            label="Bottom Artwork Available"
            value={decoration.hybridCup?.hybridBottomArtworkAvailable}
          />
          <InfoRow
            label="Alignment Notes"
            value={decoration.hybridCup?.hybridAlignmentNotes}
          />
          <InfoRow
            label="Additional Notes"
            value={decoration.hybridCup?.hybridAdditionalNotes}
          />

          <InfoRow label="Label Material" value={decoration.label?.labelMaterial} />
          <InfoRow label="Label Dimensions" value={decoration.label?.labelDimensionsMm} />
          <InfoRow label="Label Type" value={decoration.label?.labelType} />
          <InfoRow label="Adhesive Notes" value={decoration.label?.labelAdhesiveNotes} />
          <InfoRow
            label="Artwork Available"
            value={decoration.label?.labelArtworkAvailable}
          />
          <InfoRow label="Position Notes" value={decoration.label?.labelPositionNotes} />
          <InfoRow
            label="Additional Notes"
            value={decoration.label?.labelAdditionalNotes}
          />
        </Section>

        <Section title="Packaging Details">
          <InfoRow label="Pieces per Stack" value={packaging.primary?.pcsPerStack} />
          <InfoRow label="Stacks per Bag" value={packaging.primary?.stacksPerBag} />
          <InfoRow
            label="Sleeve Artwork Needed"
            value={packaging.primary?.sleeveArtworkNeeded}
          />
          <InfoRow
            label="Sleeve Artwork Provided"
            value={packaging.primary?.sleeveArtworkProvided}
          />
          <InfoRow
            label="Primary Packaging Notes"
            value={packaging.primary?.primaryPackagingNotes}
          />
          <InfoRow
            label="Bag / Sleeve Material"
            value={packaging.primary?.bagSleeveMaterial}
          />
          <InfoRow
            label="Bag / Sleeve Dimensions"
            value={packaging.primary?.bagSleeveDimensionsMm}
          />
          <InfoRow
            label="Bag Thickness"
            value={packaging.primary?.bagSleeveThicknessMicron}
          />
          <InfoRow label="Bag Weight" value={packaging.primary?.bagSleeveWeight} />

          <InfoRow label="Bags per Carton" value={packaging.secondary?.bagsPerCarton} />
          <InfoRow label="Carton Type" value={packaging.secondary?.cartonType} />
          <InfoRow
            label="Carton Internal Dimensions"
            value={packaging.secondary?.cartonInternalDimensionsMm}
          />
          <InfoRow
            label="Carton External Dimensions"
            value={packaging.secondary?.cartonExternalDimensionsMm}
          />
          <InfoRow
            label="Carton Artwork Needed"
            value={packaging.secondary?.cartonArtworkNeeded}
          />
          <InfoRow
            label="Carton Artwork Provided"
            value={packaging.secondary?.cartonArtworkProvided}
          />
          <InfoRow
            label="Carton Packaging Notes"
            value={packaging.secondary?.cartonPackagingNotes}
          />

          <InfoRow
            label="Carton Label Required"
            value={packaging.labelInstructions?.cartonLabelRequired}
          />
          <InfoRow
            label="Label Dimensions"
            value={packaging.labelInstructions?.cartonLabelDimensionsMm}
          />
          <InfoRow
            label="Barcode Required"
            value={packaging.labelInstructions?.barcodeRequired}
          />
          <InfoRow label="Barcode Type" value={packaging.labelInstructions?.barcodeType} />
          <InfoRow
            label="Other Label Data"
            value={packaging.labelInstructions?.labelFieldOther}
          />
          <InfoRow
            label="Carton Label Artwork Provided"
            value={packaging.labelInstructions?.cartonLabelArtworkProvided}
          />
          <InfoRow
            label="Carton Label Notes"
            value={packaging.labelInstructions?.cartonLabelNotes}
          />

          <InfoRow label="Pallet Type" value={packaging.pallet?.palletType} />
          <InfoRow
            label="Pallet Dimensions"
            value={packaging.pallet?.palletDimensionsMm}
          />
          <InfoRow
            label="Returnable Pallet"
            value={packaging.pallet?.returnablePallet}
          />
          <InfoRow
            label="Pallet Return Count"
            value={packaging.pallet?.palletReturnCount}
          />
          <InfoRow
            label="Cartons per Pallet"
            value={packaging.pallet?.cartonsPerPallet}
          />
          <InfoRow
            label="Stretch Wrap Required"
            value={packaging.pallet?.stretchWrapRequired}
          />
          <InfoRow
            label="Stretch Wrap Kg per Pallet"
            value={packaging.pallet?.stretchWrapKgPerPallet}
          />
          <InfoRow label="Pallet Notes" value={packaging.pallet?.palletNotes} />

          <InfoRow label="Core Size" value={packaging.sheet?.coreSize} />
          <InfoRow label="Pallet Required" value={packaging.sheet?.palletRequired} />
          <InfoRow label="Rolls per Pallet" value={packaging.sheet?.rollsPerPallet} />
          <InfoRow label="Sheet Pallet Type" value={packaging.sheet?.palletType} />
          <InfoRow label="Labels per Roll" value={packaging.sheet?.labelsPerRoll} />
          <InfoRow label="Labels per Pallet" value={packaging.sheet?.labelsPerPallet} />
          <InfoRow
            label="Strap Length per Pallet (m)"
            value={packaging.sheet?.strapLengthPerPalletM}
          />
          <InfoRow
            label="Foam Length per Pallet (m)"
            value={packaging.sheet?.foamLengthPerPalletM}
          />
          <InfoRow
            label="Stretch Film Weight per Pallet (kg)"
            value={packaging.sheet?.stretchWeightPerPalletKg}
          />
          <InfoRow
            label="Operators per Pallet"
            value={packaging.sheet?.operatorsPerPallet}
          />
        </Section>

        <Section title="Delivery Details">
          <InfoRow label="Delivery Location" value={delivery.deliveryLocationConfirm} />
          <InfoRow label="Delivery Term" value={delivery.deliveryTerm} />
          <InfoRow label="Delivery Frequency" value={delivery.deliveryFrequency} />
          <InfoRow label="First Delivery Date" value={delivery.firstDeliveryDate} />
          <InfoRow label="Receiving Notes" value={delivery.receivingNotes} />
          <InfoRow label="Loading Restrictions" value={delivery.loadingRestrictions} />
          <InfoRow
            label="Required Delivery Documents"
            value={delivery.requiredDeliveryDocs}
          />
          <InfoRow label="Logistics Comments" value={delivery.logisticsComments} />
          <InfoRow label="Desired Qty per Truck" value={delivery.desiredQtyPerTruck} />
          <InfoRow label="Desired Qty Unit" value={delivery.desiredQtyPerTruckUnit} />
          <InfoRow label="Truck Size" value={delivery.truckSize} />
        </Section>

        <Section title="Attachments">
          {files.length === 0
            ? [<InfoRow key="no-files" label="Files" value="No uploaded files" />]
            : files.map((file) => (
                <AttachmentRow
                  key={`${file.driveFileId}-${file.rowIndex}`}
                  file={file}
                />
              ))}
        </Section>
      </div>
    </div>
  );
}