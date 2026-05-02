import { useState } from "react";
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

type AppState = {
  screen: Screen;
  category: string;
  severity: string;
  label: string;
  direction: string;
  location: string;
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
    <div className="relative w-[200px] h-[242px] bg-watch-bg text-white overflow-hidden rounded-[40px] shadow-inner p-4 font-sans flex flex-col box-border">
      {/* Transition container */}
      <div className="absolute inset-0 w-full h-full flex flex-col p-3 pt-6 watch-screen">
        {state.screen === "home" && <HomeScreen onEnter={() => updateState({ screen: "category" })} />}
        
        {state.screen === "category" && (
          <CategoryScreen 
            onSelect={(cat) => {
              updateState({ 
                category: cat, 
                screen: cat === "Obstruction" ? "severity" : "damageType" 
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
            onSave={() => {
              const report = {
                id: Date.now(),
                category: state.category,
                severity: state.severity,
                label: state.label,
                direction: state.direction,
                location: state.location,
                createdAt: new Date().toISOString()
              };
              const existing = JSON.parse(localStorage.getItem("bikeLaneWatchReports") || "[]");
              localStorage.setItem("bikeLaneWatchReports", JSON.stringify([...existing, report]));
              updateState({ screen: "done" });
            }} 
            onBack={() => navBack("location")} 
          />
        )}

        {state.screen === "done" && (
          <DoneScreen onRestart={() => setState(initialState)} />
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Screens
// ----------------------------------------------------------------------

function Header({ title, onBack }: { title?: string, onBack?: () => void }) {
  return (
    <div className="flex items-center mb-2 z-10 w-full relative h-4 shrink-0">
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
        <h2 className="text-[10px] font-semibold text-center w-full uppercase tracking-wider text-gray-400 mt-1">
          {title}
        </h2>
      )}
    </div>
  );
}

function HomeScreen({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full animate-in fade-in duration-300 zoom-in-95">
      <BadgeLogo className="w-12 h-12 text-white mb-2" />
      <h1 className="text-sm font-bold tracking-tight mb-1 text-center">Pedal Patrol</h1>
      <p className="text-[9px] text-gray-400 text-center leading-tight mb-4 px-2">
        Report bike lane hazards.
      </p>
      <button 
        onClick={onEnter}
        data-testid="button-enter-app"
        className="bg-primary text-primary-foreground text-[11px] font-bold py-2 px-6 rounded-full shadow-lg active:scale-95 transition-transform"
      >
        Enter App
      </button>
    </div>
  );
}

function CategoryScreen({ onSelect, onBack }: { onSelect: (cat: string) => void, onBack: () => void }) {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 slide-in-from-right-4">
      <Header title="Report" onBack={onBack} />
      <div className="flex flex-col gap-2 mt-1">
        <Tile 
          icon={<TrafficCone className="w-4 h-4 text-orange-400" />} 
          label="Obstruction" 
          onClick={() => onSelect("Obstruction")} 
          testId="tile-obstruction"
        />
        <Tile 
          icon={<Hash className="w-4 h-4 text-blue-400" />} 
          label="Road Damage" 
          onClick={() => onSelect("Road Damage")} 
          testId="tile-road-damage"
        />
      </div>
    </div>
  );
}

function SeverityScreen({ onSelect, onBack }: { onSelect: (sev: string, label: string) => void, onBack: () => void }) {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 slide-in-from-right-4">
      <Header title="Severity" onBack={onBack} />
      <div className="flex flex-col gap-1.5 mt-0 overflow-y-visible">
        <Tile 
          small
          icon={<CheckCircle2 className="w-3 h-3 text-green-400" />} 
          label="Passable" 
          onClick={() => onSelect("Safe", "Passable")} 
          testId="tile-severity-safe"
        />
        <Tile 
          small
          icon={<AlertTriangle className="w-3 h-3 text-yellow-400" />} 
          label="Caution" 
          onClick={() => onSelect("Caution", "Caution needed")} 
          testId="tile-severity-caution"
        />
        <Tile 
          small
          icon={<ShieldAlert className="w-3 h-3 text-red-500" />} 
          label="Danger" 
          onClick={() => onSelect("Danger", "Blocked / Danger")} 
          testId="tile-severity-danger"
        />
      </div>
    </div>
  );
}

function DamageTypeScreen({ onSelect, onBack }: { onSelect: (label: string) => void, onBack: () => void }) {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 slide-in-from-right-4">
      <Header title="Damage" onBack={onBack} />
      <div className="flex flex-col gap-1.5 mt-0">
        <Tile 
          small
          icon={<AlertTriangle className="w-3 h-3 text-gray-300" />} 
          label="Pothole" 
          onClick={() => onSelect("Pothole")} 
          testId="tile-damage-pothole"
        />
        <Tile 
          small
          icon={<Layers className="w-3 h-3 text-gray-300" />} 
          label="Surface break" 
          onClick={() => onSelect("Surface break")} 
          testId="tile-damage-surface"
        />
        <Tile 
          small
          icon={<Brush className="w-3 h-3 text-gray-300" />} 
          label="Faded paint" 
          onClick={() => onSelect("Faded paint")} 
          testId="tile-damage-paint"
        />
      </div>
    </div>
  );
}

function LocationScreen({ 
  state, 
  onUpdate, 
  onNext, 
  onBack 
}: { 
  state: AppState, 
  onUpdate: (dir: string, loc: string) => void, 
  onNext: () => void, 
  onBack: () => void 
}) {
  const [locInput, setLocInput] = useState(state.location);
  const [micStatus, setMicStatus] = useState<string>("");
  const [locStatus, setLocStatus] = useState<string>("");

  const handleMic = () => {
    const SpeechRec = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setMicStatus("Not supported");
      setTimeout(() => setMicStatus(""), 2000);
      return;
    }
    const recognition = new SpeechRec();
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const text = event.results[0][0].transcript;
      setLocInput(text);
      onUpdate(state.direction, text);
    };
    recognition.onerror = () => {
      setMicStatus("Error");
      setTimeout(() => setMicStatus(""), 2000);
    };
    recognition.start();
  };

  const handleLoc = () => {
    setLocStatus("...");
    if (!navigator.geolocation) {
      setLocStatus("Error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const text = `Near ${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`;
        setLocInput(text);
        onUpdate(state.direction, text);
        setLocStatus("");
      },
      () => {
        setLocStatus("Error");
        setTimeout(() => setLocStatus(""), 2000);
      }
    );
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 slide-in-from-right-4">
      <Header title="Details" onBack={onBack} />
      
      <div className="flex justify-between mb-2 px-1">
        {["N", "S", "E", "W"].map(d => (
          <button
            key={d}
            onClick={() => onUpdate(d, locInput)}
            className={cn(
              "w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center transition-colors border",
              state.direction === d 
                ? "bg-primary text-white border-primary" 
                : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
            )}
            data-testid={`button-dir-${d.toLowerCase()}`}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1 mb-auto">
        <div className="relative flex items-center bg-white/5 rounded-md border border-white/10 p-1">
          <input 
            type="text" 
            placeholder="Cross street..." 
            value={locInput}
            onChange={(e) => {
              setLocInput(e.target.value);
              onUpdate(state.direction, e.target.value);
            }}
            className="w-full bg-transparent text-[10px] text-white placeholder-gray-500 outline-none px-1"
          />
          <div className="flex items-center gap-1 shrink-0 ml-1">
            <button 
              onClick={handleMic} 
              aria-label="Start voice input"
              data-testid="button-mic"
              className="p-1 rounded-sm hover:bg-white/10 text-gray-400 hover:text-white"
            >
              <Mic className="w-3 h-3" />
            </button>
            <button 
              onClick={handleLoc} 
              aria-label="Use my location"
              data-testid="button-pin"
              className="p-1 rounded-sm hover:bg-white/10 text-gray-400 hover:text-primary"
            >
              <MapPin className="w-3 h-3" />
            </button>
          </div>
        </div>
        {(micStatus || locStatus) && (
          <span className="text-[8px] text-red-400 px-1">{micStatus || locStatus}</span>
        )}
      </div>

      <button 
        onClick={onNext}
        disabled={!state.direction && !locInput}
        data-testid="button-review-next"
        className="mt-2 bg-primary text-white text-[11px] font-bold py-1.5 px-4 rounded-full disabled:opacity-50 disabled:bg-gray-600 transition-colors w-full"
      >
        Review →
      </button>
    </div>
  );
}

function ReviewScreen({ state, onSave, onBack }: { state: AppState, onSave: () => void, onBack: () => void }) {
  const heading = state.category === "Obstruction" 
    ? `${state.severity} ${state.category}`
    : state.label;

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 slide-in-from-right-4">
      <Header title="Review" onBack={onBack} />
      
      <div className="bg-white/5 border border-white/10 rounded-lg p-2 mb-auto flex flex-col gap-1.5 mt-1">
        <div className="text-[10px] font-bold leading-tight line-clamp-2 mb-1">{heading}</div>
        <div className="grid grid-cols-[36px_1fr] gap-x-1 gap-y-1 text-[9px]">
          <span className="text-gray-500 font-semibold">Issue</span>
          <span className="text-gray-200 truncate">{state.label || state.category || "—"}</span>
          <span className="text-gray-500 font-semibold">Where</span>
          <span className="text-gray-200 truncate">{state.location || "Unspecified"}</span>
          <span className="text-gray-500 font-semibold">Dir</span>
          <span className="text-gray-200 truncate">{state.direction || "None"}</span>
        </div>
      </div>

      <button 
        onClick={onSave}
        data-testid="button-save-report"
        className="w-full bg-primary text-white text-[11px] font-bold py-2 rounded-full mt-2 active:scale-95 transition-transform"
      >
        Save Local Report
      </button>
    </div>
  );
}

function DoneScreen({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full animate-in fade-in duration-300 zoom-in-95">
      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-3">
        <CheckCircle2 className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-sm font-bold mb-1">Report queued</h2>
      <p className="text-[9px] text-gray-400 mb-4 text-center">
        Submitted to local queue
      </p>
      
      <button 
        onClick={onRestart}
        data-testid="button-new-report"
        className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-semibold py-1.5 px-4 rounded-full transition-colors border border-white/10"
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
  small = false 
}: { 
  icon: React.ReactNode, 
  label: string, 
  onClick: () => void, 
  testId: string, 
  small?: boolean 
}) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={cn(
        "w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary/50 text-left rounded-xl transition-all flex items-center gap-2",
        small ? "p-2" : "p-3"
      )}
    >
      <div className="bg-black/20 rounded-full p-1.5 shrink-0">
        {icon}
      </div>
      <span className={cn("font-medium text-gray-200 leading-tight", small ? "text-[10px]" : "text-[11px]")}>
        {label}
      </span>
    </button>
  );
}
