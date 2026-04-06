import { useEffect, useState } from "react";

const PRICING_PASSWORD = "DepackPricing_2026";
const STORAGE_KEY = "depack_pricing_access_ok";

export default function PricingAccessGate({ children }) {
  const [entered, setEntered] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "yes") {
      setUnlocked(true);
    }
  }, []);

  const handleUnlock = () => {
    if (entered === PRICING_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, "yes");
      setUnlocked(true);
      return;
    }

    alert("Wrong pricing password");
  };

  if (unlocked) return children;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border bg-white shadow-sm p-6 space-y-4">
        <h1 className="text-xl font-semibold">Pricing Access</h1>
        <p className="text-sm text-gray-600">
          Enter the pricing password to continue.
        </p>

        <input
          type="password"
          className="w-full border rounded-lg p-2"
          value={entered}
          onChange={(e) => setEntered(e.target.value)}
          placeholder="Enter pricing password"
        />

        <button
          onClick={handleUnlock}
          className="w-full rounded-lg bg-black text-white px-4 py-2"
        >
          Unlock Pricing
        </button>
      </div>
    </div>
  );
}