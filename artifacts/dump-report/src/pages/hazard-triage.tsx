import { useRef, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ShieldAlert, Camera, MapPin, Pencil, CheckCircle2, Loader2, ChevronLeft } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";

interface TriageReport {
  _report_id: number | null;
  hazard_type: string | null;
  likely_severity: string | null;
  urgency_score: number | null;
  confidence_pct: number | null;
  recommended_action: string | null;
  description: string | null;
  recommended_department: string | null;
  human_review_required: boolean | null;
  obstruction_detected: boolean | null;
  lane_blocked: boolean | null;
  immediate_risk_to_cyclists: boolean | null;
  visible_vehicle: boolean | null;
  visible_debris: boolean | null;
  privacy_flags: string[] | null;
  confidence_notes: string | null;
}

function SeverityBadge({ severity }: { severity: string | null }) {
  if (!severity) return null;
  const s = severity.toLowerCase();
  const style =
    s === "high"
      ? "bg-red-100 text-red-700 border border-red-200"
      : s === "medium"
        ? "bg-amber-100 text-amber-700 border border-amber-200"
        : "bg-blue-50 text-blue-700 border border-blue-200";
  return (
    <span className={`text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-md ${style}`}>
      {severity.toUpperCase()}
    </span>
  );
}

export default function HazardTriage() {
  const [, navigate] = useLocation();
  const { t } = useLang();

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<TriageReport | null>(null);
  const [editingIssue, setEditingIssue] = useState(false);
  const [editedIssue, setEditedIssue] = useState("");

  const [locationInput, setLocationInput] = useState("");
  const [location, setLocation] = useState("");
  const [suggestions, setSuggestions] = useState<{ display_name: string; place_id: number }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [fetchingSuggestions, setFetchingSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (locationInput.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setFetchingSuggestions(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(locationInput)}`);
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
        setShowSuggestions(Array.isArray(data) && data.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setFetchingSuggestions(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [locationInput]);

  const analyzeImage = async (file: File) => {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/analyze-hazard", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) throw new Error((body as { error?: string }).error ?? "Analysis failed");
      setReport(body as TriageReport);
      setEditedIssue((body as TriageReport).hazard_type ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
    analyzeImage(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleSubmit = async () => {
    if (!report?._report_id) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/hazard-report/${report._report_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location, description }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      setSubmitted(true);
    } catch {
      setSubmitError("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const confidencePct =
    report?.confidence_pct ??
    (report?.urgency_score != null
      ? Math.max(55, 95 - (report.urgency_score - 1) * 4)
      : 85);

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ backgroundColor: "#edf4ed" }}>
        <div className="absolute top-4 right-4">
          <LanguageSelector />
        </div>
        <div className="w-full max-w-sm text-center space-y-5">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: "#d4e8d4" }}>
              <CheckCircle2 className="w-8 h-8" style={{ color: "#2d6a2d" }} />
            </div>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "#1a3a1a" }}>{t("hazard_success_title")}</h1>
          <p className="text-gray-500 text-sm">{t("hazard_success_msg")}</p>
          <button
            onClick={() => {
              setSubmitted(false);
              setReport(null);
              setImageFile(null);
              setImagePreview(null);
              setLocation("");
              setLocationInput("");
              setDescription("");
            }}
            className="w-full py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#1a4a1a" }}
          >
            {t("hazard_another")}
          </button>
          <button onClick={() => navigate("/")} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            {t("hazard_back")}
          </button>
        </div>
      </div>
    );
  }

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
          {t("hazard_back")}
        </button>

        <div className="flex flex-col items-center text-center mb-6 space-y-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "#d4e8d4" }}>
            <ShieldAlert className="w-6 h-6" style={{ color: "#2d6a2d" }} />
          </div>
          <h1 className="text-2xl font-extrabold leading-tight" style={{ color: "#1a3a1a" }}>
            {t("hazard_title")}
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            {t("hazard_subtitle")}
          </p>
        </div>

        {/* Upload / Results card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-3">
          {!imageFile && !loading && (
            <div
              className="p-4 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <div
                className="rounded-xl border-2 border-dashed p-8 flex flex-col items-center gap-3 text-center transition-colors hover:bg-gray-50"
                style={{ borderColor: "#c5d9c5" }}
              >
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: "#e8f0e8" }}>
                  <Camera className="w-7 h-7" style={{ color: "#2d6a2d" }} />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-base">{t("hazard_upload_tap")}</p>
                  <p className="text-sm text-gray-500 mt-1">{t("hazard_upload_ai")}</p>
                </div>
                <p className="text-xs text-gray-400">{t("hazard_upload_formats")}</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="p-8 flex flex-col items-center gap-4">
              {imagePreview && (
                <img src={imagePreview} alt="" className="w-full rounded-xl object-cover max-h-52" />
              )}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#2d6a2d" }} />
                {t("hazard_detecting")}
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="p-6 text-center space-y-3">
              {imagePreview && (
                <img src={imagePreview} alt="" className="w-full rounded-xl object-cover max-h-52 mb-3" />
              )}
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-sm font-medium"
                style={{ color: "#2d6a2d" }}
              >
                {t("hazard_change_photo")}
              </button>
            </div>
          )}

          {report && !loading && (
            <div>
              {imagePreview && (
                <img src={imagePreview} alt="Uploaded hazard" className="w-full object-cover max-h-56" />
              )}
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "#d4e8d4" }}>
                    <ShieldAlert className="w-3 h-3" style={{ color: "#2d6a2d" }} />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{t("hazard_results_title")}</span>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">{t("hazard_detected_issue")}</p>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {editingIssue ? (
                        <input
                          autoFocus
                          value={editedIssue}
                          onChange={(e) => setEditedIssue(e.target.value)}
                          onBlur={() => setEditingIssue(false)}
                          onKeyDown={(e) => e.key === "Enter" && setEditingIssue(false)}
                          className="text-base font-semibold text-gray-900 border-b border-gray-300 focus:outline-none bg-transparent"
                        />
                      ) : (
                        <span className="text-base font-semibold text-gray-900">
                          {editedIssue || report.hazard_type}
                        </span>
                      )}
                      <button
                        onClick={() => setEditingIssue(true)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <SeverityBadge severity={report.likely_severity} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">{t("hazard_ai_confidence")}</span>
                    <span className="text-xs font-bold text-gray-700">{confidencePct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${confidencePct}%`, backgroundColor: "#2d6a2d" }}
                    />
                  </div>
                </div>

                {report.recommended_action && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">{t("hazard_suggested_response")}</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{report.recommended_action}</p>
                  </div>
                )}

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-medium underline-offset-2 hover:underline transition-colors"
                  style={{ color: "#2d6a2d" }}
                >
                  {t("hazard_change_photo")}
                </button>
              </div>
            </div>
          )}
        </div>

        {report && !loading && (
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4 mb-4">
            <div className="space-y-1.5" ref={suggestionRef}>
              <label className="block text-sm font-semibold text-gray-800">
                {t("hazard_location_required")}
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={locationInput}
                  onChange={(e) => {
                    setLocationInput(e.target.value);
                    setLocation(e.target.value);
                  }}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  placeholder={t("hazard_location_placeholder")}
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-300 bg-gray-50"
                />
                {fetchingSuggestions && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-gray-400" />
                )}
              </div>
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden mt-1" style={{ maxWidth: "calc(100vw - 2rem)" }}>
                  {suggestions.slice(0, 5).map((s) => (
                    <button
                      key={s.place_id}
                      onMouseDown={() => {
                        const short = s.display_name.split(",").slice(0, 3).join(",");
                        setLocationInput(short);
                        setLocation(short);
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-0 truncate"
                    >
                      {s.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-800">
                {t("hazard_desc_label")}{" "}
                <span className="font-normal text-gray-400">{t("hazard_desc_optional")}</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("hazard_desc_placeholder")}
                rows={3}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-300 bg-gray-50 resize-none"
              />
            </div>

            {submitError && (
              <p className="text-sm text-red-600">{submitError}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || !location.trim()}
              className="w-full py-3.5 rounded-xl font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "#1a4a1a" }}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("hazard_submitting")}
                </span>
              ) : t("hazard_submit")}
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
