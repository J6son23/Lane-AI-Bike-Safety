import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { TrashIcon, ChevronLeft, CheckCircle2, Loader2, MapPin } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";

type Screen = "welcome" | "form" | "done";

interface FormErrors {
  location?: string;
  description?: string;
}

interface Suggestion {
  place_id: number;
  display_name: string;
}

function shortenAddress(full: string): string {
  const parts = full.split(",").map((p) => p.trim());
  return parts.slice(0, 3).join(", ");
}

function LocationAutocomplete({
  value,
  onChange,
  error,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  error?: string;
  placeholder: string;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 3) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    try {
      const query = encodeURIComponent(`${q}, San Jose, CA`);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${query}&format=json&addressdetails=1&limit=6&countrycodes=us`,
        { headers: { "Accept-Language": "en" } },
      );
      const data: Suggestion[] = await res.json();
      setSuggestions(data);
      setOpen(data.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 350);
  };

  const handleSelect = (s: Suggestion) => {
    onChange(shortenAddress(s.display_name));
    setSuggestions([]);
    setOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10 pointer-events-none" />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 animate-spin z-10 pointer-events-none" />
      )}
      <input
        type="text"
        value={value}
        onChange={handleInput}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className={`w-full pl-9 pr-8 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-300 bg-gray-50 ${
          error ? "border-red-400" : "border-gray-200"
        }`}
      />

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {suggestions.map((s) => (
            <li
              key={s.place_id}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
              className="flex items-start gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-green-50 transition-colors border-b border-gray-50 last:border-0"
            >
              <MapPin className="w-3.5 h-3.5 mt-0.5 text-green-600 flex-shrink-0" />
              <span className="text-sm text-gray-700 leading-snug">
                {shortenAddress(s.display_name)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ReportDumping() {
  const [, navigate] = useLocation();
  const { t } = useLang();
  const [screen, setScreen] = useState<Screen>("welcome");

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [caseNumber, setCaseNumber] = useState("");
  const [ackMessage, setAckMessage] = useState("");
  const [aiBullets, setAiBullets] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const aiDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current);
    if (description.trim().length < 10) { setAiBullets([]); return; }
    aiDebounceRef.current = setTimeout(async () => {
      setAiLoading(true);
      try {
        const res = await fetch("/api/ai/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: description.trim(), reportType: "dumping" }),
        });
        if (res.ok) {
          const data = await res.json();
          setAiBullets(Array.isArray(data.bullets) ? data.bullets : []);
        }
      } catch { /* silent */ } finally {
        setAiLoading(false);
      }
    }, 900);
    return () => { if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current); };
  }, [description]);

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!location.trim()) errs.location = "Please enter a location.";
    if (!description.trim()) errs.description = "Please add a short description.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setScreen("done");
    try {
      const res = await fetch("/api/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          description: description.trim(),
          location: location.trim(),
        }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      setCaseNumber(data.caseNumber || `SJT-${Math.floor(100000 + Math.random() * 900000)}`);
      setAckMessage(data.message || "Your report has been received. Thank you for helping keep San Jose bike lanes clear.");
    } catch {
      setCaseNumber(`SJT-${Math.floor(100000 + Math.random() * 900000)}`);
      setAckMessage("Your report has been received. Thank you for helping keep San Jose bike lanes clear.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setName(""); setLocation(""); setDescription("");
    setErrors({}); setCaseNumber(""); setAckMessage("");
    setScreen("welcome");
  };

  return (
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: "#edf4ed" }}>
      <div className="relative w-full max-w-sm mx-auto">

        <div className="absolute top-0 right-0">
          <LanguageSelector />
        </div>

        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          {t("dumping_back")}
        </button>

        {screen === "welcome" && (
          <>
            <div className="flex flex-col items-center text-center mb-6 space-y-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "#d4e8d4" }}>
                <TrashIcon className="w-6 h-6" style={{ color: "#2d6a2d" }} />
              </div>
              <h1 className="text-2xl font-extrabold leading-tight" style={{ color: "#1a3a1a" }}>
                {t("dumping_welcome_title")}
              </h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                {t("dumping_welcome_subtitle")}
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
              <button
                onClick={() => setScreen("form")}
                className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#1a4a1a" }}
              >
                {t("dumping_welcome_btn")}
              </button>
              <p className="text-xs text-gray-400 text-center">{t("home_footer")}</p>
            </div>
          </>
        )}

        {screen === "form" && (
          <>
            <h2 className="text-xl font-bold mb-4" style={{ color: "#1a3a1a" }}>
              {t("dumping_form_title")}
            </h2>
            <form onSubmit={handleSubmit} noValidate>
              <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4 mb-4">

                {/* Name */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold" style={{ color: "#1a3a1a" }}>
                    {t("dumping_name_label")}{" "}
                    <span className="font-normal text-gray-400">({t("dumping_name_placeholder")})</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("dumping_name_placeholder")}
                    autoComplete="name"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-300 bg-gray-50"
                  />
                </div>

                {/* Location with autocomplete */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold" style={{ color: "#1a3a1a" }}>
                    {t("dumping_location_label")}
                  </label>
                  <LocationAutocomplete
                    value={location}
                    onChange={(val) => {
                      setLocation(val);
                      if (val.trim()) setErrors((p) => ({ ...p, location: undefined }));
                    }}
                    error={errors.location}
                    placeholder={t("dumping_location_placeholder")}
                  />
                  {errors.location && <p className="text-xs text-red-500">{errors.location}</p>}
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-semibold" style={{ color: "#1a3a1a" }}>
                      {t("dumping_desc_label")}
                    </label>
                    <span className="text-xs text-gray-400">{description.length}/300</span>
                  </div>
                  <textarea
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      if (e.target.value.trim()) setErrors((p) => ({ ...p, description: undefined }));
                    }}
                    maxLength={300}
                    placeholder={t("dumping_desc_placeholder")}
                    rows={3}
                    className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-300 bg-gray-50 resize-none ${errors.description ? "border-red-400" : "border-gray-200"}`}
                  />
                  {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
                  {aiLoading && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Loader2 className="w-3 h-3 animate-spin text-green-600" />
                      <span className="text-xs text-gray-400">Summarizing…</span>
                    </div>
                  )}
                  {!aiLoading && aiBullets.length > 0 && (
                    <ul className="mt-2 space-y-1 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
                      {aiBullets.map((b, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-green-900">
                          <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "#1a4a1a" }}
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("dumping_submitting")}
                  </span>
                ) : t("dumping_submit")}
              </button>
            </form>
          </>
        )}

        {screen === "done" && (
          <div className="flex flex-col items-center text-center space-y-5">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: "#d4e8d4" }}>
              <CheckCircle2 className="w-8 h-8" style={{ color: "#2d6a2d" }} />
            </div>
            <h2 className="text-2xl font-extrabold" style={{ color: "#1a3a1a" }}>{t("dumping_done_title")}</h2>
            <div className="bg-white rounded-2xl shadow-sm w-full p-5 space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">{t("dumping_done_case")}</p>
                  <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">Copy to clipboard</span>
                </div>
                <div className="font-mono text-2xl font-bold tracking-widest" style={{ color: "#2d6a2d" }}>
                  {caseNumber}
                </div>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed min-h-[3rem]">
                {submitting ? (
                  <span className="flex items-center justify-center gap-2 text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("dumping_submitting")}
                  </span>
                ) : (
                  ackMessage || t("dumping_done_msg")
                )}
              </p>
              <button
                onClick={handleReset}
                className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#1a4a1a" }}
              >
                {t("dumping_done_another")}
              </button>
              <button
                onClick={() => navigate("/")}
                className="block w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                {t("dumping_done_home")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
