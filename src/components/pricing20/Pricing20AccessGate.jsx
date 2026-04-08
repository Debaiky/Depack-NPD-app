import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const PRICING20_PASSWORD = "Depackpricing_2026";

export default function Pricing20AccessGate({ children }) {
  const [enteredPassword, setEnteredPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const ok = sessionStorage.getItem("pricing20_unlocked") === "yes";
    if (ok) setUnlocked(true);
  }, []);

  const unlock = () => {
    if (enteredPassword === PRICING20_PASSWORD) {
      sessionStorage.setItem("pricing20_unlocked", "yes");
      setUnlocked(true);
      setEnteredPassword("");
      return;
    }

    alert("Wrong password");
  };

  if (unlocked) return children;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold">Pricing 2.0</h1>

          <Link
            to="/"
            className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100 bg-white"
          >
            ← Home
          </Link>
        </div>

        <div className="rounded-2xl border bg-white shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold">Enter Pricing 2.0 Password</h2>

          <p className="text-sm text-gray-600">
            Please enter the Pricing 2.0 password to access all Pricing 2.0 workspaces.
          </p>

          <input
            type="password"
            className="w-full border rounded-lg p-3"
            value={enteredPassword}
            onChange={(e) => setEnteredPassword(e.target.value)}
            placeholder="Enter password"
          />

          <button
            onClick={unlock}
            className="w-full rounded-lg bg-black text-white px-4 py-3"
          >
            Unlock Pricing 2.0
          </button>
        </div>
      </div>
    </div>
  );
}