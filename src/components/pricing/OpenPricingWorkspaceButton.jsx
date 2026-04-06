import { Link } from "react-router-dom";

export default function OpenPricingWorkspaceButton({
  requestId,
  disabled = false,
  className = "",
  children,
}) {
  const baseClass =
    "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm transition";

  if (!requestId || disabled) {
    return (
      <button
        type="button"
        disabled
        className={`${baseClass} bg-gray-200 text-gray-500 cursor-not-allowed ${className}`}
      >
        {children || "Open Pricing Workspace"}
      </button>
    );
  }

  return (
    <Link
      to={`/pricing/${requestId}`}
      className={`${baseClass} bg-black text-white hover:bg-gray-800 ${className}`}
    >
      {children || "Open Pricing Workspace"}
    </Link>
  );
}