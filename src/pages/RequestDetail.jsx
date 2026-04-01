import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

/* =========================
   UI HELPERS
========================= */

function Section({ title, children }) {
  const items = Array.isArray(children)
    ? children.filter(Boolean)
    : children
    ? [children]
    : [];

  if (items.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
      <div className="border-b pb-2">
        <h2 className="text-base font-semibold text-gray-800">{title}</h2>
      </div>

      <div className="space-y-1">{items}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  const isEmpty =
    value === undefined ||
    value === null ||
    value === "" ||
    value === "—";

  if (isEmpty) return null;

  return (
    <div className="text-sm leading-6 flex gap-2">
      <span className="font-semibold text-gray-600 min-w-[200px]">
        {label}:
      </span>
      <span className="text-gray-900 font-medium">
        {value}
      </span>
    </div>
  );
}

function AttachmentRow({ file }) {
  if (!file?.driveLink) return null;

  return (
    <div className="text-sm flex gap-2 items-center">
      <span className="font-semibold text-gray-600 min-w-[200px]">
        {file.category || "Attachment"}:
      </span>
      <a
        href={file.driveLink}
        target="_blank"
        rel="noreferrer"
        className="text-blue-600 underline"
      >
        {file.fileName || "View file"}
      </a>
    </div>
  );
}

/* =========================
   MAIN COMPONENT
========================= */

export default function RequestDetail() {
  const { requestId } = useParams();

  const [request, setRequest] = useState(null);
  const [payload, setPayload] = useState(null);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadRequest = async () => {
      try {
        const response = await fetch(
          `/.netlify/functions/get-request?requestId=${requestId}`
        );
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
      } catch (error) {
        console.error(error);
        setError("Failed to load request");
      }
    };

    loadRequest();
  }, [requestId]);

  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!request || !payload) return <div className="p-6">Loading...</div>;

  const customerBlock = payload.customer || {};
  const primaryCustomer = customerBlock?.customers?.[0] || {};
  const project = payload.project || {};
  const product = payload.product || {};
  const decoration = payload.decoration || {};
  const packaging = payload.packaging || {};
  const delivery = payload.delivery || {};

  const status =
    payload?.metadata?.status || request.Status || "Draft";

  /* =========================
     UI
  ========================= */

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ===== HEADER ===== */}
      <div className="sticky top-0 z-50 border-b bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center flex-wrap gap-4">

          <div>
            <div className="text-xs text-gray-500">Request ID</div>
            <div className="text-lg font-bold">{requestId}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Project</div>
            <div className="font-semibold">
              {project.projectName || product.productType || "—"}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-sm">
              {status}
            </div>

            <Link to="/" className="border px-3 py-1 rounded">
              Dashboard
            </Link>

            <Link
              to={`/edit/${requestId}`}
              className="bg-black text-white px-3 py-1 rounded"
            >
              Edit
            </Link>
          </div>
        </div>
      </div>

      {/* ===== CONTENT ===== */}
      <div className="max-w-5xl mx-auto p-6 space-y-6">

        {/* ===== TOP SUMMARY ===== */}
        <Section title="Request Summary">
          <InfoRow label="Created Date" value={request.CreatedDate} />
          <InfoRow label="Created By" value={request.CreatedBy} />
          <InfoRow label="Customer" value={request.CustomerName} />
          <InfoRow label="Product Type" value={request.ProductType} />
          <InfoRow label="Material" value={request.ProductMaterial} />
        </Section>

        {/* ===== CUSTOMER ===== */}
        <Section title="Customer Information">
          <InfoRow label="Customer Name" value={primaryCustomer.customerName} />
          <InfoRow label="Contact Person" value={primaryCustomer.contactPerson} />
          <InfoRow label="Email" value={primaryCustomer.contactEmail} />
          <InfoRow label="Phone" value={primaryCustomer.contactPhone} />
          <InfoRow label="Country" value={primaryCustomer.countryMarket} />
          <InfoRow label="Delivery Location" value={primaryCustomer.deliveryLocation} />
          <InfoRow label="Customer Notes" value={project.customerNotes} />
        </Section>

        {/* ===== PRODUCT ===== */}
        <Section title="Product Technical Details">
          <InfoRow label="Material" value={product.productMaterial} />
          <InfoRow label="Weight (g)" value={product.productWeightG} />
          <InfoRow label="Top Diameter (mm)" value={product.topDiameterMm} />
          <InfoRow label="Bottom Diameter (mm)" value={product.bottomDiameterMm} />
          <InfoRow label="Height (mm)" value={product.productHeightMm} />
          <InfoRow label="Color" value={product.productColor} />
          <InfoRow label="Sheet Material" value={product.sheetMaterial} />
          <InfoRow label="Sheet Width (mm)" value={product.sheetWidthMm} />
          <InfoRow label="Thickness (micron)" value={product.sheetThicknessMicron} />
          <InfoRow label="Roll Weight (kg)" value={product.rollWeightKg} />
        </Section>

        {/* ===== DECORATION ===== */}
        <Section title="Decoration Details">
          <InfoRow label="Type" value={decoration.decorationType} />
          <InfoRow label="Print Colors" value={decoration.dryOffset?.printColors} />
          <InfoRow label="Coverage %" value={decoration.dryOffset?.printCoveragePct} />
          <InfoRow label="Sleeve Material" value={decoration.shrinkSleeve?.sleeveMaterial} />
        </Section>

        {/* ===== PACKAGING ===== */}
        <Section title="Packaging Details">
          <InfoRow label="Pcs / Stack" value={packaging.primary?.pcsPerStack} />
          <InfoRow label="Stacks / Bag" value={packaging.primary?.stacksPerBag} />
          <InfoRow label="Bags / Carton" value={packaging.secondary?.bagsPerCarton} />
          <InfoRow label="Carton Type" value={packaging.secondary?.cartonType} />
          <InfoRow label="Cartons / Pallet" value={packaging.pallet?.cartonsPerPallet} />
        </Section>

        {/* ===== DELIVERY ===== */}
        <Section title="Delivery Details">
          <InfoRow label="Location" value={delivery.deliveryLocationConfirm} />
          <InfoRow label="Term" value={delivery.deliveryTerm} />
          <InfoRow label="Truck Size" value={delivery.truckSize} />
          <InfoRow label="Qty / Truck" value={delivery.desiredQtyPerTruck} />
        </Section>

        {/* ===== ATTACHMENTS ===== */}
        <Section title="Attachments">
          {files.map((f) => (
            <AttachmentRow key={f.driveFileId} file={f} />
          ))}
        </Section>

        {/* ===== DRIVE LINK ===== */}
        <Section title="Project Folder">
          <a
            href={payload?.metadata?.driveFolderLink}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 underline"
          >
            Open Drive Folder
          </a>
        </Section>

      </div>
    </div>
  );
}