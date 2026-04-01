import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

/* ===== FIELD LABEL MAP ===== */

const LABELS = {
  productType: "Product Type",
  productMaterial: "Material",
  sheetMaterial: "Sheet Material",
  productWeightG: "Weight (g)",
  topDiameterMm: "Top Diameter (mm)",
  bottomDiameterMm: "Bottom Diameter (mm)",
  productHeightMm: "Height (mm)",
  sheetWidthMm: "Sheet Width (mm)",
  sheetThicknessMicron: "Thickness (micron)",
  rollWeightKg: "Roll Weight (kg)",
  rollDiameterMm: "Roll Diameter (mm)",
  coreDiameterMm: "Core Diameter (mm)",
  customerName: "Customer Name",
  contactPerson: "Contact Person",
  contactEmail: "Email",
  contactPhone: "Phone",
  countryMarket: "Country",
  deliveryLocation: "Delivery Location",
  forecastAnnualVolume: "Annual Volume",
  targetSellingPrice: "Target Price",
  decorationType: "Decoration Type",
};

/* ===== HELPERS ===== */

function formatLabel(key) {
  return LABELS[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());
}

/* ===== UI ===== */

function Card({ title, icon, children }) {
  const valid = children.filter(Boolean);
  if (!valid.length) return null;

  return (
    <div className="bg-white border rounded-2xl shadow-sm p-6 space-y-3 print:shadow-none">
      <div className="flex items-center gap-2 border-b pb-2">
        <span className="text-lg">{icon}</span>
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
          {title}
        </h2>
      </div>
      <div className="space-y-1">{valid}</div>
    </div>
  );
}

function Row({ label, value }) {
  if (!value && value !== 0) return null;

  return (
    <div className="flex gap-3 text-sm leading-6">
      <span className="font-medium text-gray-500 min-w-[260px]">
        {label}:
      </span>
      <span className="text-blue-700 font-semibold break-words">
        {value}
      </span>
    </div>
  );
}

function Attachment({ file }) {
  if (!file?.driveLink) return null;

  return (
    <div className="flex gap-3 text-sm">
      <span className="font-medium text-gray-500 min-w-[260px]">
        {file.category || "File"}:
      </span>
      <a
        href={file.driveLink}
        target="_blank"
        rel="noreferrer"
        className="text-blue-600 underline break-all"
      >
        {file.fileName}
      </a>
    </div>
  );
}

/* ===== MAIN ===== */

export default function RequestDetail() {
  const { requestId } = useParams();

  const [request, setRequest] = useState(null);
  const [payload, setPayload] = useState(null);
  const [files, setFiles] = useState([]);

  useEffect(() => {
    const load = async () => {
      const r = await fetch(`/.netlify/functions/get-request?requestId=${requestId}`);
      const j = await r.json();
      if (j.success) {
        setRequest(j.request);
        setPayload(j.payload);
      }

      const f = await fetch(`/.netlify/functions/list-request-files?requestId=${requestId}`);
      const jf = await f.json();
      if (jf.success) setFiles(jf.files || []);
    };

    load();
  }, [requestId]);

  if (!request || !payload) return <div className="p-6">Loading...</div>;

  const customer = payload.customer?.customers?.[0] || {};
  const project = payload.project || {};
  const product = payload.product || {};
  const decoration = payload.decoration || {};
  const packaging = payload.packaging || {};
  const delivery = payload.delivery || {};

  const image =
    request?.Thumbnail ||
    product.productThumbnailUrl ||
    (product.productThumbnailBase64
      ? `data:image/*;base64,${product.productThumbnailBase64}`
      : "");

  const driveLink = request?.DriveFolderID
    ? `https://drive.google.com/drive/folders/${request.DriveFolderID}`
    : "";

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 bg-gray-50 print:bg-white">

      {/* ===== ACTIONS ===== */}
      <div className="flex justify-end print:hidden">
        <button
          onClick={() => window.print()}
          className="bg-black text-white px-4 py-2 rounded-lg text-sm"
        >
          Export PDF
        </button>
      </div>

      {/* ===== TOP SUMMARY ===== */}
      <div className="bg-white border rounded-2xl shadow-sm p-6 flex gap-6 items-start print:shadow-none">

        {image && (
          <img
            src={image}
            className="w-32 h-32 object-cover rounded-xl border"
          />
        )}

        <div className="space-y-1 flex-1">
          <Row label="Request ID" value={requestId} />
          <Row label="Status" value={request.Status} />
          <Row label="Customer" value={request.CustomerName} />
          <Row label="Project" value={project.projectName} />
          <Row label="Product" value={product.productType} />
          <Row label="Material" value={product.productMaterial || product.sheetMaterial} />
          <Row label="Decoration" value={decoration.decorationType} />
          <Row label="Annual Volume" value={project.forecastAnnualVolume} />
          <Row label="Target Price" value={project.targetSellingPrice} />

          {driveLink && (
            <div className="pt-2 text-sm">
              <span className="font-medium text-gray-500">Drive Folder: </span>
              <a href={driveLink} target="_blank" className="text-blue-600 underline">
                Open Folder
              </a>
            </div>
          )}
        </div>
      </div>

      {/* ===== CUSTOMER ===== */}
      <Card title="Customer Information" icon="👤">
        {Object.entries(customer).map(([k, v]) => (
          <Row key={k} label={formatLabel(k)} value={v} />
        ))}
      </Card>

      {/* ===== PRODUCT ===== */}
      <Card title="Product Technical Details" icon="⚙️">
        {Object.entries(product).map(([k, v]) => (
          <Row key={k} label={formatLabel(k)} value={v} />
        ))}
      </Card>

      {/* ===== DECORATION ===== */}
      <Card title="Decoration Details" icon="🎨">
        {Object.entries(decoration).map(([k, v]) =>
          typeof v !== "object" ? (
            <Row key={k} label={formatLabel(k)} value={v} />
          ) : null
        )}
      </Card>

      {/* ===== PACKAGING ===== */}
      <Card title="Packaging Details" icon="📦">
        {[packaging.primary, packaging.secondary, packaging.pallet, packaging.sheet]
          .filter(Boolean)
          .flatMap((section) => Object.entries(section))
          .map(([k, v]) => (
            <Row key={k} label={formatLabel(k)} value={v} />
          ))}
      </Card>

      {/* ===== DELIVERY ===== */}
      <Card title="Delivery Details" icon="🚚">
        {Object.entries(delivery).map(([k, v]) => (
          <Row key={k} label={formatLabel(k)} value={v} />
        ))}
      </Card>

      {/* ===== ATTACHMENTS ===== */}
      <Card title="Attachments" icon="📎">
        {files.map((f) => (
          <Attachment key={f.driveFileId} file={f} />
        ))}
      </Card>

    </div>
  );
}