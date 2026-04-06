import { Children, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import OpenPricingWorkspaceButton from "../components/pricing/OpenPricingWorkspaceButton";

/* ===== UI COMPONENTS ===== */

function Card({ title, children }) {
  const validChildren = Children.toArray(children).filter(Boolean);
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
        {String(value)}
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

function StatusBadge({ status }) {
  const tones = {
    Draft: "bg-gray-100 text-gray-700",
    "Waiting for Engineering": "bg-yellow-100 text-yellow-700",
    "Under Engineering Review": "bg-blue-100 text-blue-700",
    "Sent to Pricing": "bg-orange-100 text-orange-700",
    "Pending Pricing": "bg-orange-100 text-orange-700",
    "Pricing Completed": "bg-green-100 text-green-700",
    Completed: "bg-green-100 text-green-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
        tones[status] || "bg-gray-100 text-gray-700"
      }`}
    >
      {status || "—"}
    </span>
  );
}

/* ===== MAIN ===== */

export default function RequestDetail() {
  const { requestId } = useParams();

  const [request, setRequest] = useState(null);
  const [payload, setPayload] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const [requestRes, filesRes] = await Promise.all([
          fetch(`/.netlify/functions/get-request?requestId=${requestId}`),
          fetch(`/.netlify/functions/list-request-files?requestId=${requestId}`),
        ]);

        const requestJson = await requestRes.json();
        const filesJson = await filesRes.json();

        if (requestJson.success) {
          setRequest(requestJson.request || null);
          setPayload(requestJson.payload || null);
        }

        if (filesJson.success) {
          setFiles(filesJson.files || []);
        }
      } catch (error) {
        console.error("Failed to load request detail:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [requestId]);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!request || !payload) {
    return <div className="p-6">Request not found.</div>;
  }

  const customer = payload.customer?.customers?.[0] || {};
  const project = payload.project || {};
  const product = payload.product || {};
  const decoration = payload.decoration || {};
  const packaging = payload.packaging || {};
  const delivery = payload.delivery || {};

  const image =
    request?.Thumbnail ||
    product?.productThumbnailUrl ||
    product?.productThumbnailPreview ||
    (product?.productThumbnailBase64
      ? `data:image/*;base64,${product.productThumbnailBase64}`
      : "");

  const driveLink = request?.DriveFolderID
    ? `https://drive.google.com/drive/folders/${request.DriveFolderID}`
    : "";

  const currentStatus =
    request?.Status || payload?.metadata?.status || "—";

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 bg-gray-50">
      {/* ===== TOP SUMMARY CARD ===== */}
      <div className="bg-white border rounded-2xl shadow-sm p-5 space-y-5">
        <div className="flex gap-6 flex-wrap items-start">
          {image ? (
            <img
              src={image}
              alt="Product thumbnail"
              className="w-28 h-28 object-cover rounded-xl border"
            />
          ) : (
            <div className="w-28 h-28 rounded-xl border bg-gray-100 flex items-center justify-center text-xs text-gray-500">
              No image
            </div>
          )}

          <div className="flex-1 min-w-[250px] space-y-1">
            <div className="mb-2">
              <StatusBadge status={currentStatus} />
            </div>

            <Row label="Request ID" value={requestId} />
            <Row label="Customer" value={request?.CustomerName || customer?.customerName} />
            <Row label="Project" value={project?.projectName} />
            <Row label="Product Type" value={product?.productType} />
            <Row label="Material" value={product?.productMaterial || product?.sheetMaterial} />
            <Row label="Decoration" value={decoration?.decorationType} />
            <Row label="Annual Volume" value={project?.forecastAnnualVolume} />
            <Row label="Target Price" value={project?.targetSellingPrice} />

            {driveLink && (
              <div className="text-sm pt-2">
                <span className="font-medium text-gray-500">Drive Folder: </span>
                <a
                  href={driveLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline"
                >
                  Open Folder
                </a>
              </div>
            )}
          </div>
        </div>

        {/* ===== ACTION BUTTONS ===== */}
        <div className="flex items-center gap-3 flex-wrap border-t pt-4">
          <Link
            to={`/edit/${requestId}`}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100 bg-white"
          >
            Edit Request
          </Link>

          <Link
            to={`/engineering/${requestId}`}
            className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-500"
          >
            Engineering Review
          </Link>

          <OpenPricingWorkspaceButton
            requestId={requestId}
            className="rounded-lg bg-black text-white px-4 py-2 hover:bg-gray-800"
          >
            Open Pricing Workspace
          </OpenPricingWorkspaceButton>

          {driveLink && (
            <a
              href={driveLink}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100 bg-white"
            >
              Open Drive Folder
            </a>
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
          <Row key={`primary-${k}`} label={k} value={v} />
        ))}

        {Object.entries(packaging.secondary || {}).map(([k, v]) => (
          <Row key={`secondary-${k}`} label={k} value={v} />
        ))}

        {Object.entries(packaging.pallet || {}).map(([k, v]) => (
          <Row key={`pallet-${k}`} label={k} value={v} />
        ))}

        {Object.entries(packaging.sheet || {}).map(([k, v]) => (
          <Row key={`sheet-${k}`} label={k} value={v} />
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
          <Attachment key={f.driveFileId || `${f.fileName}-${f.driveLink}`} file={f} />
        ))}
      </Card>
    </div>
  );
}