import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

/* ===== UI COMPONENTS ===== */

function Card({ title, children }) {
  const validChildren = children.filter(Boolean);
  if (validChildren.length === 0) return null;

  return (
    <div className="bg-white border rounded-2xl shadow-sm p-5 space-y-3">
      <h2 className="text-sm font-semibold text-gray-700 border-b pb-2">
        {title}
      </h2>
      <div className="space-y-1">{validChildren}</div>
    </div>
  );
}

function Row({ label, value }) {
  if (!value && value !== 0) return null;

  return (
    <div className="flex gap-3 text-sm leading-6">
      <span className="font-medium text-gray-500 min-w-[240px]">
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
      <span className="font-medium text-gray-500 min-w-[240px]">
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
    <div className="max-w-6xl mx-auto p-6 space-y-6 bg-gray-50">

      {/* ===== TOP SUMMARY CARD ===== */}
      <div className="bg-white border rounded-2xl shadow-sm p-5 flex gap-6 flex-wrap items-start">
        
        {image && (
          <img
            src={image}
            className="w-28 h-28 object-cover rounded-xl border"
          />
        )}

        <div className="flex-1 min-w-[250px] space-y-1">
          <Row label="Request ID" value={requestId} />
          <Row label="Status" value={request.Status} />
          <Row label="Customer" value={request.CustomerName} />
          <Row label="Project" value={project.projectName} />
          <Row label="Product Type" value={product.productType} />
          <Row label="Material" value={product.productMaterial || product.sheetMaterial} />
          <Row label="Decoration" value={decoration.decorationType} />
          <Row label="Annual Volume" value={project.forecastAnnualVolume} />
          <Row label="Target Price" value={project.targetSellingPrice} />

          {driveLink && (
            <div className="text-sm pt-2">
              <span className="font-medium text-gray-500">Drive Folder: </span>
              <a href={driveLink} target="_blank" className="text-blue-600 underline">
                Open Folder
              </a>
            </div>
          )}
        </div>
      </div>

      {/* ===== CUSTOMER ===== */}
      <Card title="Customer Information">
        <Row label="Customer Name" value={customer.customerName} />
        <Row label="Contact Person" value={customer.contactPerson} />
        <Row label="Email" value={customer.contactEmail} />
        <Row label="Phone" value={customer.contactPhone} />
        <Row label="Country" value={customer.countryMarket} />
        <Row label="Delivery Location" value={customer.deliveryLocation} />
      </Card>

      {/* ===== PRODUCT ===== */}
      <Card title="Product Technical Details">
        {Object.entries(product).map(([k, v]) => (
          <Row key={k} label={k} value={v} />
        ))}
      </Card>

      {/* ===== DECORATION ===== */}
      <Card title="Decoration Details">
        {Object.entries(decoration).map(([k, v]) =>
          typeof v !== "object" ? <Row key={k} label={k} value={v} /> : null
        )}
      </Card>

      {/* ===== PACKAGING ===== */}
      <Card title="Packaging Details">
        {Object.entries(packaging.primary || {}).map(([k, v]) => (
          <Row key={k} label={k} value={v} />
        ))}

        {Object.entries(packaging.secondary || {}).map(([k, v]) => (
          <Row key={k} label={k} value={v} />
        ))}

        {Object.entries(packaging.pallet || {}).map(([k, v]) => (
          <Row key={k} label={k} value={v} />
        ))}

        {Object.entries(packaging.sheet || {}).map(([k, v]) => (
          <Row key={k} label={k} value={v} />
        ))}
      </Card>

      {/* ===== DELIVERY ===== */}
      <Card title="Delivery Details">
        {Object.entries(delivery).map(([k, v]) => (
          <Row key={k} label={k} value={v} />
        ))}
      </Card>

      {/* ===== ATTACHMENTS ===== */}
      <Card title="Attachments">
        {files.map((f) => (
          <Attachment key={f.driveFileId} file={f} />
        ))}
      </Card>

    </div>
  );
}