import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

/* ===== UI COMPONENTS ===== */

function Card({ title, children }) {
  const validChildren = Array.isArray(children)
    ? children.filter(Boolean)
    : [children].filter(Boolean);

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

function SectionHeader({ title, subtitle }) {
  return (
    <div>
      <div className="text-xl font-semibold">{title}</div>
      {subtitle ? <div className="text-sm text-gray-500">{subtitle}</div> : null}
    </div>
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

        const [r, f] = await Promise.all([
          fetch(`/.netlify/functions/get-request?requestId=${requestId}`),
          fetch(`/.netlify/functions/list-request-files?requestId=${requestId}`),
        ]);

        const j = await r.json();
        if (j.success) {
          setRequest(j.request);
          setPayload(j.payload);
        }

        const jf = await f.json();
        if (jf.success) {
          setFiles(jf.files || []);
        }
      } catch (error) {
        console.error("Failed to load request detail:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [requestId]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!request || !payload) return <div className="p-6">Request not found.</div>;

  const customer = payload.customer?.customers?.[0] || {};
  const project = payload.project || {};
  const product = payload.product || {};
  const decoration = payload.decoration || {};
  const packaging = payload.packaging || {};
  const delivery = payload.delivery || {};
  const metadata = payload.metadata || {};

  const image =
    request?.Thumbnail ||
    product.productThumbnailUrl ||
    product.productThumbnailPreview ||
    (product.productThumbnailBase64
      ? `data:image/*;base64,${product.productThumbnailBase64}`
      : "");

  const driveLink = request?.DriveFolderID
    ? `https://drive.google.com/drive/folders/${request.DriveFolderID}`
    : "";

  const currentStatus = request?.Status || metadata?.status || "—";
  const materialText = product.productMaterial || product.sheetMaterial || "—";

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* ===== TOP SUMMARY CARD ===== */}
      <div className="bg-white border rounded-2xl shadow-sm p-5 flex gap-6 flex-wrap items-start">
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

        <div className="flex-1 min-w-[260px] space-y-2">
          <SectionHeader
            title={project.projectName || requestId}
            subtitle={`${product.productType || "—"} • ${materialText}`}
          />

          <Row label="Request ID" value={requestId} />
          <Row label="Status" value={currentStatus} />
          <Row label="Customer" value={request.CustomerName || customer.customerName} />
          <Row label="Decoration" value={decoration.decorationType} />
          <Row label="Annual Volume" value={project.forecastAnnualVolume} />
          <Row label="Target Price" value={project.targetSellingPrice} />

          {driveLink ? (
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
          ) : null}
        </div>

        <div className="flex flex-col gap-3 min-w-[220px]">
          <Link
            to="/dashboard"
            className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50 text-center"
          >
            ← Back to Dashboard
          </Link>

          <Link
            to={`/engineering/${requestId}`}
            className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50 text-center"
          >
            Open Engineering Review
          </Link>

          <Link
            to={`/pricing/${requestId}`}
            className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 text-center"
          >
            Open Pricing Workspace
          </Link>

          <Link
            to={`/edit/${requestId}`}
            className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50 text-center"
          >
            Edit Request
          </Link>
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

      {/* ===== PROJECT ===== */}
      <Card title="Project Information">
        {Object.entries(project).map(([k, v]) => (
          <Row key={k} label={k} value={v} />
        ))}
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
          <Row key={`primary-${k}`} label={`Primary - ${k}`} value={v} />
        ))}

        {Object.entries(packaging.secondary || {}).map(([k, v]) => (
          <Row key={`secondary-${k}`} label={`Secondary - ${k}`} value={v} />
        ))}

        {Object.entries(packaging.pallet || {}).map(([k, v]) => (
          <Row key={`pallet-${k}`} label={`Pallet - ${k}`} value={v} />
        ))}

        {Object.entries(packaging.sheet || {}).map(([k, v]) => (
          <Row key={`sheet-${k}`} label={`Sheet - ${k}`} value={v} />
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
        {files.length === 0 ? (
          <div className="text-sm text-gray-500">No attachments found.</div>
        ) : (
          files.map((f) => <Attachment key={f.driveFileId || f.fileName} file={f} />)
        )}
      </Card>
    </div>
  );
}