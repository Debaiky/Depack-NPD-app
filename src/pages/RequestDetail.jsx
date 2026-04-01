import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

function Section({ title, children }) {
  const validChildren = children.filter(Boolean);
  if (validChildren.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-bold text-gray-700 border-b pb-1">
        {title}
      </h2>
      <div className="space-y-1">{validChildren}</div>
    </div>
  );
}

function Row({ label, value }) {
  if (!value && value !== 0) return null;

  return (
    <div className="flex gap-2 text-sm leading-6">
      <span className="font-semibold text-gray-600 min-w-[240px]">
        {label}:
      </span>
      <span className="text-blue-700 font-medium break-words">
        {value}
      </span>
    </div>
  );
}

function Attachment({ file }) {
  if (!file?.driveLink) return null;

  return (
    <div className="flex gap-2 text-sm">
      <span className="font-semibold text-gray-600 min-w-[240px]">
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
    <div className="max-w-5xl mx-auto p-6 space-y-6 bg-white">

      {/* ===== TOP SUMMARY ===== */}
      <div className="flex gap-6 items-start border-b pb-4">

        {image && (
          <img
            src={image}
            className="w-28 h-28 object-cover border rounded-lg"
          />
        )}

        <div className="space-y-1 flex-1">
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
            <div className="text-sm">
              <span className="font-semibold text-gray-600">Drive Folder: </span>
              <a href={driveLink} target="_blank" className="text-blue-600 underline">
                Open Folder
              </a>
            </div>
          )}
        </div>
      </div>

      {/* ===== CUSTOMER ===== */}
      <Section title="Customer Information">
        <Row label="Customer Name" value={customer.customerName} />
        <Row label="Contact Person" value={customer.contactPerson} />
        <Row label="Email" value={customer.contactEmail} />
        <Row label="Phone" value={customer.contactPhone} />
        <Row label="Country" value={customer.countryMarket} />
        <Row label="Delivery Location" value={customer.deliveryLocation} />
      </Section>

      {/* ===== PRODUCT ===== */}
      <Section title="Product Technical Details">
        {Object.entries(product).map(([k, v]) => (
          <Row key={k} label={k} value={v} />
        ))}
      </Section>

      {/* ===== DECORATION ===== */}
      <Section title="Decoration Details">
        {Object.entries(decoration).map(([k, v]) => (
          typeof v !== "object" ? <Row key={k} label={k} value={v} /> : null
        ))}
      </Section>

      {/* ===== PACKAGING ===== */}
      <Section title="Packaging Details">
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
      </Section>

      {/* ===== DELIVERY ===== */}
      <Section title="Delivery Details">
        {Object.entries(delivery).map(([k, v]) => (
          <Row key={k} label={k} value={v} />
        ))}
      </Section>

      {/* ===== ATTACHMENTS ===== */}
      <Section title="Attachments">
        {files.map((f) => (
          <Attachment key={f.driveFileId} file={f} />
        ))}
      </Section>
    </div>
  );
}