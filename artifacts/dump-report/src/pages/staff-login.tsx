import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        </div>

        <Card>
          <CardContent className="pt-8 pb-8 space-y-6">
            <div className="text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
                <ShieldCheck className="w-7 h-7 text-purple-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Staff Portal</h1>
              <p className="mt-1 text-sm text-gray-500">
                Enter your staff password to access reports.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="Enter staff password"
                  autoComplete="current-password"
                  className={error ? "border-red-400" : ""}
                />
                {error && (
                  <p className="text-xs text-red-500">{error}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading || !password.trim()}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Signing in…</>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
