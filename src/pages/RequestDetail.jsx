import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

function DetailCard({ title, children }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        {children}
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="rounded-xl bg-gray-50 border p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
        {label}
      </div>
      <div className="font-medium break-words">
        {value || "—"}
      </div>
    </div>
  );
}

export default function RequestDetail() {
  const { requestId } = useParams();
  const [request, setRequest] = useState(null);
  const [payload, setPayload] = useState(null);
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
        }
      } catch (error) {
        console.error("Failed to load request:", error);
        setError("Failed to load request");
      }
    };

    loadRequest();
  }, [requestId]);

  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!request || !payload) return <div className="p-6">Loading...</div>;

  const customer = payload.customer || {};
  const product = payload.product || {};
  const decoration = payload.decoration || {};
  const packaging = payload.packaging || {};
  const delivery = payload.delivery || {};
  const attachments = payload.attachments || {};
  const status = payload?.metadata?.status || request.Status || "Draft";

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
              {customer.projectName || product.productType || "—"}
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
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <DetailCard title="Request Summary">
            <DetailItem label="Request ID" value={request.RequestID} />
            <DetailItem label="Created Date" value={request.CreatedDate} />
            <DetailItem label="Created By" value={request.CreatedBy} />
            <DetailItem label="Status" value={request.Status} />
            <DetailItem label="Customer" value={request.CustomerName} />
            <DetailItem label="Project" value={request.ProjectName} />
            <DetailItem label="Product Type" value={request.ProductType} />
            <DetailItem label="Product Material" value={request.ProductMaterial} />
            <DetailItem label="Decoration Type" value={request.DecorationType} />
          </DetailCard>

          <DetailCard title="Customer Information">
            <DetailItem label="Customer Name" value={customer.customerName} />
            <DetailItem label="Contact Person" value={customer.contactPerson} />
            <DetailItem label="Contact Email" value={customer.contactEmail} />
            <DetailItem label="Contact Phone" value={customer.contactPhone} />
            <DetailItem label="Country / Market" value={customer.countryMarket} />
            <DetailItem label="Delivery Location" value={customer.deliveryLocation} />
            <DetailItem label="Project Name" value={customer.projectName} />
            <DetailItem label="Customer SKU Ref" value={customer.customerSkuRef} />
            <DetailItem label="Project Type" value={customer.projectType} />
            <DetailItem label="Target Launch Date" value={customer.targetLaunchDate} />
            <DetailItem label="Forecast Annual Volume" value={customer.forecastAnnualVolume} />
            <DetailItem label="MOQ" value={customer.moq} />
            <DetailItem label="Target Selling Price" value={customer.targetSellingPrice} />
            <DetailItem label="Currency" value={customer.currency} />
            <DetailItem label="Customer Notes" value={customer.customerNotes} />
          </DetailCard>

          <DetailCard title="Product Technical Specifications">
            <DetailItem label="Product Type" value={product.productType} />
            <DetailItem label="Product Type Other" value={product.productTypeOther} />
            <DetailItem label="Sample Exists" value={product.sampleExists} />
            <DetailItem label="Sample In Hand" value={product.sampleInHand} />
            <DetailItem label="Internal Sample Code" value={product.internalSampleCode} />
            <DetailItem label="Product Material" value={product.productMaterial} />
            <DetailItem label="Material Grade" value={product.materialGrade} />
            <DetailItem label="Product Weight (g)" value={product.productWeightG} />
            <DetailItem label="Top Diameter (mm)" value={product.topDiameterMm} />
            <DetailItem label="Bottom Diameter (mm)" value={product.bottomDiameterMm} />
            <DetailItem label="Height (mm)" value={product.productHeightMm} />
            <DetailItem label="Product Color" value={product.productColor} />
            <DetailItem label="Masterbatch Details" value={product.masterbatchDetails} />
            <DetailItem label="Additives" value={product.additives} />
            <DetailItem label="Specific Function" value={product.specialFunction} />
            <DetailItem label="Specific Cut / Shape Notes" value={product.specialCutNotes} />
            <DetailItem label="Rim Notes" value={product.rimNotes} />
            <DetailItem label="Technical Notes" value={product.technicalNotes} />
          </DetailCard>

          <DetailCard title="Decoration Details">
            <DetailItem label="Decoration Type" value={decoration.decorationType} />

            {decoration.decorationType === "Dry offset printing" && (
              <>
                <DetailItem label="Print Colors" value={decoration.dryOffset?.printColors} />
                <DetailItem label="Print Area Description" value={decoration.dryOffset?.printAreaDescription} />
                <DetailItem label="Coverage %" value={decoration.dryOffset?.printCoveragePct} />
                <DetailItem label="Artwork Available" value={decoration.dryOffset?.printArtworkAvailable} />
                <DetailItem label="Artwork Format" value={decoration.dryOffset?.printArtworkFormat} />
                <DetailItem label="Registration Notes" value={decoration.dryOffset?.printRegistrationNotes} />
                <DetailItem label="Material Notes" value={decoration.dryOffset?.printMaterialNotes} />
                <DetailItem label="Additional Notes" value={decoration.dryOffset?.printAdditionalNotes} />
              </>
            )}

            {decoration.decorationType === "Shrink sleeve" && (
              <>
                <DetailItem label="Sleeve Material" value={decoration.shrinkSleeve?.sleeveMaterial} />
                <DetailItem label="Sleeve Thickness" value={decoration.shrinkSleeve?.sleeveThicknessMicron} />
                <DetailItem label="Layflat Width" value={decoration.shrinkSleeve?.sleeveLayflatWidthMm} />
                <DetailItem label="Sleeve Height" value={decoration.shrinkSleeve?.sleeveHeightMm} />
                <DetailItem label="Shrink Ratio" value={decoration.shrinkSleeve?.sleeveShrinkRatio} />
                <DetailItem label="Glue Pattern Needed" value={decoration.shrinkSleeve?.gluePatternNeeded} />
                <DetailItem label="Glue Pattern Diagram Available" value={decoration.shrinkSleeve?.gluePatternDiagramAvailable} />
                <DetailItem label="Sleeve Artwork Available" value={decoration.shrinkSleeve?.sleeveArtworkAvailable} />
                <DetailItem label="Seam / Orientation Notes" value={decoration.shrinkSleeve?.sleeveSeamNotes} />
                <DetailItem label="Shrink / Application Notes" value={decoration.shrinkSleeve?.sleeveApplicationNotes} />
                <DetailItem label="Additional Notes" value={decoration.shrinkSleeve?.sleeveAdditionalNotes} />
              </>
            )}

            {decoration.decorationType === "Hybrid cup" && (
              <>
                <DetailItem label="Cup Family" value={decoration.hybridCup?.hybridCupFamily} />
                <DetailItem label="Blank Wrapped" value={decoration.hybridCup?.blankWrapped} />
                <DetailItem label="Paper Bottom Required" value={decoration.hybridCup?.paperBottomRequired} />
                <DetailItem label="Blank Material" value={decoration.hybridCup?.hybridBlankMaterial} />
                <DetailItem label="Blank GSM" value={decoration.hybridCup?.hybridBlankGsm} />
                <DetailItem label="Wrap Artwork Available" value={decoration.hybridCup?.hybridWrapArtworkAvailable} />
                <DetailItem label="Bottom Artwork Available" value={decoration.hybridCup?.hybridBottomArtworkAvailable} />
                <DetailItem label="Alignment Notes" value={decoration.hybridCup?.hybridAlignmentNotes} />
                <DetailItem label="Additional Notes" value={decoration.hybridCup?.hybridAdditionalNotes} />
              </>
            )}

            {decoration.decorationType === "Label" && (
              <>
                <DetailItem label="Label Material" value={decoration.label?.labelMaterial} />
                <DetailItem label="Label Dimensions" value={decoration.label?.labelDimensions} />
                <DetailItem label="Label Type" value={decoration.label?.labelType} />
                <DetailItem label="Adhesive Notes" value={decoration.label?.labelAdhesiveNotes} />
                <DetailItem label="Artwork Available" value={decoration.label?.labelArtworkAvailable} />
                <DetailItem label="Position Notes" value={decoration.label?.labelPositionNotes} />
                <DetailItem label="Additional Notes" value={decoration.label?.labelAdditionalNotes} />
              </>
            )}
          </DetailCard>

          <DetailCard title="Packaging Details">
            <DetailItem label="Pieces per Stack" value={packaging.primary?.pcsPerStack} />
            <DetailItem label="Stacks per Bag" value={packaging.primary?.stacksPerBag} />
            <DetailItem label="Sleeve Artwork Needed" value={packaging.primary?.sleeveArtworkNeeded} />
            <DetailItem label="Sleeve Artwork Provided" value={packaging.primary?.sleeveArtworkProvided} />
            <DetailItem label="Primary Packaging Notes" value={packaging.primary?.primaryPackagingNotes} />
            <DetailItem label="Bag / Sleeve Material" value={packaging.primary?.bagSleeveMaterial} />
            <DetailItem label="Bag / Sleeve Dimensions" value={packaging.primary?.bagSleeveDimensions} />
            <DetailItem label="Bag Thickness" value={packaging.primary?.bagSleeveThicknessMicron} />
            <DetailItem label="Bag Weight" value={packaging.primary?.bagSleeveWeight} />
            <DetailItem label="Bags per Carton" value={packaging.secondary?.bagsPerCarton} />
            <DetailItem label="Carton Type" value={packaging.secondary?.cartonType} />
            <DetailItem label="Carton Internal Dimensions" value={packaging.secondary?.cartonInternalDimensions} />
            <DetailItem label="Carton External Dimensions" value={packaging.secondary?.cartonExternalDimensions} />
            <DetailItem label="Carton Artwork Needed" value={packaging.secondary?.cartonArtworkNeeded} />
            <DetailItem label="Carton Artwork Provided" value={packaging.secondary?.cartonArtworkProvided} />
            <DetailItem label="Carton Packaging Notes" value={packaging.secondary?.cartonPackagingNotes} />
            <DetailItem label="Carton Label Required" value={packaging.labelInstructions?.cartonLabelRequired} />
            <DetailItem label="Label Dimensions" value={packaging.labelInstructions?.cartonLabelDimensions} />
            <DetailItem label="Barcode Required" value={packaging.labelInstructions?.barcodeRequired} />
            <DetailItem label="Barcode Type" value={packaging.labelInstructions?.barcodeType} />
            <DetailItem label="Other Label Data" value={packaging.labelInstructions?.labelFieldOther} />
            <DetailItem label="Carton Label Artwork Provided" value={packaging.labelInstructions?.cartonLabelArtworkProvided} />
            <DetailItem label="Carton Label Notes" value={packaging.labelInstructions?.cartonLabelNotes} />
            <DetailItem label="Pallet Type" value={packaging.pallet?.palletType} />
            <DetailItem label="Pallet Dimensions" value={packaging.pallet?.palletDimensions} />
            <DetailItem label="Returnable Pallet" value={packaging.pallet?.returnablePallet} />
            <DetailItem label="Pallet Return Count" value={packaging.pallet?.palletReturnCount} />
            <DetailItem label="Cartons per Pallet" value={packaging.pallet?.cartonsPerPallet} />
            <DetailItem label="Stretch Wrap Required" value={packaging.pallet?.stretchWrapRequired} />
            <DetailItem label="Stretch Wrap Kg per Pallet" value={packaging.pallet?.stretchWrapKgPerPallet} />
            <DetailItem label="Pallet Notes" value={packaging.pallet?.palletNotes} />
          </DetailCard>

          <DetailCard title="Delivery Details">
            <DetailItem label="Delivery Location" value={delivery.deliveryLocationConfirm} />
            <DetailItem label="Delivery Term" value={delivery.deliveryTerm} />
            <DetailItem label="Delivery Frequency" value={delivery.deliveryFrequency} />
            <DetailItem label="First Delivery Date" value={delivery.firstDeliveryDate} />
            <DetailItem label="Receiving Notes" value={delivery.receivingNotes} />
            <DetailItem label="Loading Restrictions" value={delivery.loadingRestrictions} />
            <DetailItem label="Required Delivery Documents" value={delivery.requiredDeliveryDocs} />
            <DetailItem label="Logistics Comments" value={delivery.logisticsComments} />
          </DetailCard>

          <DetailCard title="Attachments Summary">
            <DetailItem label="Sample Photos" value={attachments.samplePhotos?.length ? `${attachments.samplePhotos.length} file(s)` : "None"} />
            <DetailItem label="Print Artwork" value={attachments.printArtworkFiles?.length ? `${attachments.printArtworkFiles.length} file(s)` : "None"} />
            <DetailItem label="Sleeve Artwork" value={attachments.sleeveArtworkFiles?.length ? `${attachments.sleeveArtworkFiles.length} file(s)` : "None"} />
            <DetailItem label="Glue Pattern Diagrams" value={attachments.gluePatternDiagramFiles?.length ? `${attachments.gluePatternDiagramFiles.length} file(s)` : "None"} />
            <DetailItem label="Hybrid Wrap Artwork" value={attachments.hybridWrapArtworkFiles?.length ? `${attachments.hybridWrapArtworkFiles.length} file(s)` : "None"} />
            <DetailItem label="Hybrid Bottom Artwork" value={attachments.hybridBottomArtworkFiles?.length ? `${attachments.hybridBottomArtworkFiles.length} file(s)` : "None"} />
            <DetailItem label="Label Artwork" value={attachments.labelArtworkFiles?.length ? `${attachments.labelArtworkFiles.length} file(s)` : "None"} />
            <DetailItem label="Primary Sleeve Artwork" value={attachments.primarySleeveArtworkFiles?.length ? `${attachments.primarySleeveArtworkFiles.length} file(s)` : "None"} />
            <DetailItem label="Carton Artwork" value={attachments.cartonArtworkFiles?.length ? `${attachments.cartonArtworkFiles.length} file(s)` : "None"} />
            <DetailItem label="Carton Label Artwork" value={attachments.cartonLabelArtworkFiles?.length ? `${attachments.cartonLabelArtworkFiles.length} file(s)` : "None"} />
            <DetailItem label="Customer Brief Files" value={attachments.customerBriefFiles?.length ? `${attachments.customerBriefFiles.length} file(s)` : "None"} />
          </DetailCard>
        </div>
      </div>
    </div>
  );
}