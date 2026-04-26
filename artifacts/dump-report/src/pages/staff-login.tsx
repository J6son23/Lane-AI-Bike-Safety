import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, ShieldCheck, Loader2 } from "lucide-react";

export default function StaffLogin() {
  const [, navigate] = useLocation();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError("Incorrect password. Please try again.");
        return;
      }
      localStorage.setItem("staff_token", password);
      navigate("/staff");
    } catch {
      setError("Could not connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: "#edf4ed" }}>
      <div className="relative w-full max-w-sm mx-auto">

        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex flex-col items-center text-center mb-6 space-y-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "#d4e8d4" }}>
            <ShieldCheck className="w-6 h-6" style={{ color: "#2d6a2d" }} />
          </div>
          <h1 className="text-2xl font-extrabold leading-tight" style={{ color: "#1a3a1a" }}>
            Staff Portal
          </h1>
          <p className="text-sm text-gray-500">
            Enter your staff password to access reports.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold" style={{ color: "#1a3a1a" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Enter staff password"
                autoComplete="current-password"
                className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-300 bg-gray-50 ${error ? "border-red-400" : "border-gray-200"}`}
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "#1a4a1a" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in…
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
