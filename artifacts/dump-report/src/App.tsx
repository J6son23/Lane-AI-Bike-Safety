import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import ReportDumping from "@/pages/report-dumping";
import HazardTriage from "@/pages/hazard-triage";
import StaffLogin from "@/pages/staff-login";
import StaffDashboard from "@/pages/staff-dashboard";
import { useState, useEffect, useRef } from "react";
import { Building2, Lock } from "lucide-react";

const PASSCODE = "2978";
const STORAGE_KEY = "app_access_granted";

function PasscodeGate({ children }: { children: React.ReactNode }) {
  const [granted, setGranted] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!granted) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [granted]);

  const attempt = () => {
    if (value === PASSCODE) {
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
      setGranted(true);
    } else {
      setError(true);
      setValue("");
      setTimeout(() => {
        setError(false);
        inputRef.current?.focus();
      }, 1200);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && value.length === 4) attempt();
  };

  if (granted) return <>{children}</>;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
      style={{ backgroundColor: "#edf4ed" }}
    >
      <div className="w-full max-w-sm flex flex-col items-center text-center space-y-6">

        {/* Home page header — identical to home.tsx */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "#d4e8d4" }}>
            {error
              ? <Lock className="w-5 h-5 text-red-500" />
              : <Building2 className="w-6 h-6" style={{ color: "#2d6a2d" }} />}
          </div>
          <div>
            <div className="inline-flex items-center gap-2 mb-1">
              <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "#2d6a2d" }}>SAN JOSE</span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-gray-500">Community Services</span>
            </div>
            <h1 className="text-2xl font-extrabold leading-tight" style={{ color: "#1a3a1a" }}>City Services</h1>
            <p className="mt-1 text-sm text-gray-500">Select a service to get started.</p>
          </div>
        </div>

        {/* Passcode card */}
        <div className="bg-white rounded-2xl shadow-sm w-full p-5 space-y-4">
          <p className="text-sm font-semibold text-center" style={{ color: "#1a3a1a" }}>
            Enter 4-digit passcode to continue
          </p>

          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={value}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
              setValue(digits);
              if (error) setError(false);
            }}
            onKeyDown={handleKey}
            placeholder="••••"
            className={`w-full text-center text-2xl tracking-[0.5em] px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 bg-gray-50 transition-all ${
              error
                ? "border-red-400 ring-2 ring-red-200 animate-shake"
                : "border-gray-200 focus:ring-green-300"
            }`}
            style={{ fontFamily: "monospace" }}
          />

          {error && (
            <p className="text-sm text-red-500 font-medium text-center -mt-1">
              Incorrect passcode
            </p>
          )}

          <button
            onClick={attempt}
            disabled={value.length < 4 || error}
            className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: "#1a4a1a" }}
          >
            Enter App
          </button>
        </div>

        <p className="text-xs text-gray-400">{`City of San Jose · Bike Lane Safety`}</p>
      </div>
    </div>
  );
}

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/report-dumping" component={ReportDumping} />
      <Route path="/analyze-hazard" component={HazardTriage} />
      <Route path="/staff/login" component={StaffLogin} />
      <Route path="/staff" component={StaffDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <PasscodeGate>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <LanguageProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </LanguageProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </PasscodeGate>
  );
}

export default App;
