import { useState, useEffect, useRef } from "react";
import { BadgeLogo } from "./BadgeLogo";
import { ChevronLeft, Mic, MapPin, CheckCircle2, AlertTriangle, TrafficCone, ShieldAlert, Hash, Layers, Brush } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}
interface SpeechRecognitionResult {
  readonly [index: number]: SpeechRecognitionAlternative;
  readonly length: number;
}
interface SpeechRecognitionResultList {
  readonly [index: number]: SpeechRecognitionResult;
  readonly length: number;
}
interface SpeechRecognitionEvent {
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionInstance {
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  start(): void;
}
interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

type Screen =
  | "home"
  | "category"
  | "severity"
  | "damageType"
  | "location"
  | "review"
  | "done";

type SyncStatus = "syncing" | "synced" | "queued";

type AppState = {
  screen: Screen;
  category: string;
  severity: string;
  label: string;
  direction: string;
  location: string;
  syncStatus?: SyncStatus;
  caseNumber?: string;
};

const initialState: AppState = {
  screen: "home",
  category: "",
  severity: "",
  label: "",
  direction: "",
  location: "",
};

export function WatchApp() {
  const [state, setState] = useState<AppState>(initialState);

  const updateState = (updates: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const navBack = (screen: Screen) => {
    updateState({ screen });
  };

  return (
    <div className="relative w-[200px] h-[242px] bg-watch-bg text-white overflow-hidden rounded-[40px] shadow-inner font-sans flex flex-col box-border">
      <div className="absolute inset-0 w-full h-full flex flex-col p-3 pt-5 watch-screen">
        {state.screen === "home" && <HomeScreen onEnter={() => updateState({ screen: "category" })} />}

        {state.screen === "category" && (
          <CategoryScreen
            onSelect={(cat) => {
              updateState({
                category: cat,
                screen: cat === "Obstruction" ? "severity" : "damageType",
              });
            }}
            onBack={() => navBack("home")}
          />
        )}

        {state.screen === "severity" && (
          <SeverityScreen
            onSelect={(sev, lab) => {
              updateState({ severity: sev, label: lab, screen: "location" });
            }}
            onBack={() => navBack("category")}
          />
        )}

        {state.screen === "damageType" && (
          <DamageTypeScreen
            onSelect={(lab) => {
              updateState({ label: lab, screen: "location" });
            }}
            onBack={() => navBack("category")}
          />
        )}

        {state.screen === "location" && (
          <LocationScreen
            state={state}
            onUpdate={(direction, location) => updateState({ direction, location })}
            onNext={() => updateState({ screen: "review" })}
            onBack={() => navBack(state.category === "Obstruction" ? "severity" : "damageType")}
          />
        )}

        {state.screen === "review" && (
          <ReviewScreen
            state={state}
            onSave={async () => {
              const report = {
                id: Date.now(),
                category: state.category,
                severity: state.severity,
                label: state.label,
                direction: state.direction,
                location: state.location,
                createdAt: new Date().toISOString(),
              };
              const existing = JSON.parse(
                localStorage.getItem("bikeLaneWatchReports") || "[]"
              );
              localStorage.setItem(
                "bikeLaneWatchReports",
                JSON.stringify([...existing, report])
              );
              updateState({ screen: "done", syncStatus: "syncing" });
              try {
                const res = await fetch("/api/pedal-patrol/report", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(report),
                });
                if (res.ok) {
                  const data = await res.json();
                  updateState({ syncStatus: "synced", caseNumber: data.caseNumber ?? undefined });
                } else {
                  updateState({ syncStatus: "queued" });
                }
              } catch {
                updateState({ syncStatus: "queued" });
              }
            }}
            onBack={() => navBack("location")}
          />
        )}

        {state.screen === "done" && (
          <DoneScreen
            syncStatus={state.syncStatus ?? "syncing"}
            caseNumber={state.caseNumber}
            onRestart={() => setState(initialState)}
          />
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Screens
// ----------------------------------------------------------------------

function Header({ title, onBack }: { title?: string; onBack?: () => void }) {
  return (
    <div className="flex items-center mb-2 z-10 w-full relative h-5 shrink-0">
      {onBack && (
        <button
          onClick={onBack}
          className="absolute left-0 top-1/2 -translate-y-1/2 text-primary hover:text-white transition-colors p-1"
          aria-label="Go back"
          data-testid="button-back"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      {title && (
        <h2 className="text-[11px] font-semibold text-center w-full uppercase tracking-wider text-gray-400">
          {title}
        </h2>
      )}
    </div>
  );
}

function HomeScreen({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full animate-in fade-in duration-300 zoom-in-95">
      <BadgeLogo className="w-10 h-10 text-white mb-2" />
      <h1 className="text-[14px] font-bold tracking-tight mb-1 text-center">Pedal Patrol</h1>
      <p className="text-[11px] text-gray-400 text-center leading-tight mb-4 px-2">
        Report bike lane hazards.
      </p>
      <button
        onClick={onEnter}
        data-testid="button-enter-app"
        className="bg-primary text-primary-foreground text-[12px] font-bold py-2 px-6 rounded-full shadow-lg active:scale-95 transition-transform"
      >
        Enter App
      </button>
    </div>
  );
}

function CategoryScreen({ onSelect, onBack }: { onSelect: (cat: string) => void; onBack: () => void }) {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 slide-in-from-right-4">
      <Header title="Report" onBack={onBack} />
      <div className="flex flex-col gap-2 mt-1 flex-1">
        <Tile
          icon={<TrafficCone className="w-5 h-5 text-orange-400" />}
          label="Obstruction"
          onClick={() => onSelect("Obstruction")}
          testId="tile-obstruction"
        />
        <Tile
          icon={<Hash className="w-5 h-5 text-blue-400" />}
          label="Road Damage"
          onClick={() => onSelect("Road Damage")}
          testId="tile-road-damage"
        />
      </div>
    </div>
  );
}

function SeverityScreen({ onSelect, onBack }: { onSelect: (sev: string, label: string) => void; onBack: () => void }) {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 slide-in-from-right-4">
      <Header title="Severity" onBack={onBack} />
      <div className="flex flex-col gap-1.5 mt-1 flex-1">
        <Tile
          small
          icon={<CheckCircle2 className="w-4 h-4 text-green-400" />}
          label="Safe"
          onClick={() => onSelect("Safe", "Safe")}
          testId="tile-severity-safe"
        />
        <Tile
          small
          icon={<AlertTriangle className="w-4 h-4 text-yellow-400" />}
          label="Caution"
          onClick={() => onSelect("Caution", "Caution needed")}
          testId="tile-severity-caution"
        />
        <Tile
          small
          icon={<ShieldAlert className="w-4 h-4 text-red-500" />}
          label="Danger"
          onClick={() => onSelect("Danger", "Blocked / Danger")}
          testId="tile-severity-danger"
        />
      </div>
    </div>
  );
}

function DamageTypeScreen({ onSelect, onBack }: { onSelect: (label: string) => void; onBack: () => void }) {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 slide-in-from-right-4">
      <Header title="Damage" onBack={onBack} />
      <div className="flex flex-col gap-1.5 mt-1 flex-1">
        <Tile
          small
          icon={<AlertTriangle className="w-4 h-4 text-gray-300" />}
          label="Pothole"
          onClick={() => onSelect("Pothole")}
          testId="tile-damage-pothole"
        />
        <Tile
          small
          icon={<Layers className="w-4 h-4 text-gray-300" />}
          label="Surface break"
          onClick={() => onSelect("Surface break")}
          testId="tile-damage-surface"
        />
        <Tile
          small
          icon={<Brush className="w-4 h-4 text-gray-300" />}
          label="Road Flooding"
          onClick={() => onSelect("Road Flooding")}
          testId="tile-damage-paint"
        />
      </div>
    </div>
  );
}

function shortenWatchAddress(displayName: string): string {
  const parts = displayName.split(",").map((p) => p.trim());
  return parts.slice(0, 2).join(", ");
}

function LocationScreen({
  state,
  onUpdate,
  onNext,
  onBack,
}: {
  state: AppState;
  onUpdate: (dir: string, loc: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [locInput, setLocInput] = useState(state.location);
  const [micStatus, setMicStatus] = useState<"idle" | "listening" | "error">("idle");
  const [locStatus, setLocStatus] = useState<"idle" | "loading" | "error">("idle");
  const [suggestions, setSuggestions] = useState<{ display_name: string; place_id: number }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchSuggestions = (q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 3) { setSuggestions([]); setShowSuggestions(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const query = encodeURIComponent(`${q}, San Jose, CA`);
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${query}&format=json&addressdetails=1&limit=4&countrycodes=us`,
          { headers: { "Accept-Language": "en" } },
        );
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
        setShowSuggestions(Array.isArray(data) && data.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 400);
  };

  const handleMic = () => {
    const SpeechRec = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setMicStatus("error");
      setTimeout(() => setMicStatus("idle"), 2000);
      return;
    }
    setMicStatus("listening");
    const recognition = new SpeechRec();
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const text = event.results[0][0].transcript;
      setLocInput(text);
      onUpdate(state.direction, text);
      setMicStatus("idle");
    };
    recognition.onerror = () => {
      setMicStatus("error");
      setTimeout(() => setMicStatus("idle"), 2000);
    };
    recognition.start();
  };

  const handleLoc = () => {
    setLocStatus("loading");
    if (!navigator.geolocation) {
      setLocStatus("error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const text = `${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`;
        setLocInput(text);
        onUpdate(state.direction, text);
        setLocStatus("idle");
      },
      () => {
        setLocStatus("error");
        setTimeout(() => setLocStatus("idle"), 2000);
      }
    );
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 slide-in-from-right-4">
      <Header title="Details" onBack={onBack} />

      {/* Cross-street input with autocomplete */}
      <div ref={containerRef} className="relative mb-2">
        <div className="bg-white/5 rounded-lg border border-white/10 px-2 py-1.5">
          <input
            type="text"
            placeholder="Cross street or landmark..."
            value={locInput}
            onChange={(e) => {
              const val = e.target.value;
              setLocInput(val);
              onUpdate(state.direction, val);
              fetchSuggestions(val);
            }}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            className="w-full bg-transparent text-[11px] text-white placeholder-gray-500 outline-none"
          />
        </div>
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-50 left-0 right-0 top-full mt-0.5 bg-gray-800 border border-white/10 rounded-lg overflow-hidden shadow-lg">
            {suggestions.slice(0, 4).map((s) => (
              <li key={s.place_id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const short = shortenWatchAddress(s.display_name);
                    setLocInput(short);
                    onUpdate(state.direction, short);
                    setSuggestions([]);
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left px-2 py-1.5 text-[10px] text-gray-200 hover:bg-white/10 transition-colors leading-tight border-b border-white/5 last:border-0"
                >
                  {shortenWatchAddress(s.display_name)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Voice + GPS buttons */}
      <div className="flex gap-1.5 mb-2">
        <button
          onClick={handleMic}
          aria-label="Start voice input"
          data-testid="button-mic"
          className={cn(
            "flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors",
            micStatus === "listening"
              ? "bg-primary/30 border-primary text-primary"
              : micStatus === "error"
              ? "bg-red-500/20 border-red-500/50 text-red-400"
              : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
          )}
        >
          <Mic className="w-3.5 h-3.5" />
          {micStatus === "listening" ? "Listening…" : micStatus === "error" ? "Error" : "Voice"}
        </button>
        <button
          onClick={handleLoc}
          aria-label="Use my location"
          data-testid="button-pin"
          className={cn(
            "flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors",
            locStatus === "loading"
              ? "bg-primary/30 border-primary text-primary"
              : locStatus === "error"
              ? "bg-red-500/20 border-red-500/50 text-red-400"
              : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
          )}
        >
          <MapPin className="w-3.5 h-3.5" />
          {locStatus === "loading" ? "Finding…" : locStatus === "error" ? "Error" : "GPS"}
        </button>
      </div>

      <button
        onClick={onNext}
        disabled={!locInput}
        data-testid="button-review-next"
        className="mt-auto bg-primary text-white text-[12px] font-bold py-1.5 px-4 rounded-full disabled:opacity-50 disabled:bg-gray-600 transition-colors w-full"
      >
        Review →
      </button>
    </div>
  );
}

function ReviewScreen({ state, onSave, onBack }: { state: AppState; onSave: () => void; onBack: () => void }) {
  const heading =
    state.category === "Obstruction" ? `${state.severity} ${state.category}` : state.label;

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 slide-in-from-right-4">
      <Header title="Review" onBack={onBack} />

      <div className="bg-white/5 border border-white/10 rounded-lg p-2 flex-1 flex flex-col gap-1.5 mt-1 overflow-hidden">
        <div className="text-[12px] font-bold leading-tight line-clamp-2 mb-0.5">{heading}</div>
        <div className="grid grid-cols-[40px_1fr] gap-x-1 gap-y-1.5 text-[11px]">
          <span className="text-gray-500 font-semibold">Issue</span>
          <span className="text-gray-200 truncate">{state.label || state.category || "—"}</span>
          <span className="text-gray-500 font-semibold">Where</span>
          <span className="text-gray-200 truncate">{state.location || "Unspecified"}</span>
        </div>
      </div>

      <button
        onClick={onSave}
        data-testid="button-save-report"
        className="w-full bg-primary text-white text-[12px] font-bold py-2 rounded-full mt-2 active:scale-95 transition-transform"
      >
        Save Report
      </button>
    </div>
  );
}

function DoneScreen({
  syncStatus,
  caseNumber,
  onRestart,
}: {
  syncStatus: SyncStatus;
  caseNumber?: string;
  onRestart: () => void;
}) {
  const statusConfig: Record<SyncStatus, { label: string; sub: string; color: string }> = {
    syncing: {
      label: "Sending…",
      sub: "Submitting to city database",
      color: "text-yellow-400",
    },
    synced: {
      label: "Submitted!",
      sub: "Saved to city database",
      color: "text-primary",
    },
    queued: {
      label: "Queued",
      sub: "Saved locally, will sync later",
      color: "text-yellow-400",
    },
  };
  const cfg = statusConfig[syncStatus];

  return (
    <div className="flex flex-col items-center justify-center h-full animate-in fade-in duration-300 zoom-in-95">
      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-2">
        <CheckCircle2 className={`w-6 h-6 ${cfg.color}`} />
      </div>
      <h2 className="text-[13px] font-bold mb-1">{cfg.label}</h2>
      {caseNumber && (
        <div className="font-mono text-[13px] font-bold text-primary mb-1 tracking-wider">
          {caseNumber}
        </div>
      )}
      <p className="text-[10px] text-gray-400 mb-3 text-center px-1 leading-tight">{cfg.sub}</p>
      <button
        onClick={onRestart}
        data-testid="button-new-report"
        className="bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold py-1.5 px-4 rounded-full transition-colors border border-white/10"
      >
        New Report
      </button>
    </div>
  );
}

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------

function Tile({
  icon,
  label,
  onClick,
  testId,
  small = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  testId: string;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={cn(
        "w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary/50 text-left rounded-xl transition-all flex items-center gap-2",
        small ? "p-2" : "p-2.5"
      )}
    >
      <div className="bg-black/20 rounded-full p-1.5 shrink-0">{icon}</div>
      <span className={cn("font-semibold text-gray-200 leading-tight", small ? "text-[11px]" : "text-[12px]")}>
        {label}
      </span>
    </button>
  );
}
