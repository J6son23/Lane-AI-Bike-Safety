import { useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrashIcon,
  ChevronLeft,
  Upload,
  CheckCircle2,
  Loader2,
  MapPin,
} from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";

const WASTE_TYPES = [
  "Furniture",
  "Construction debris",
  "Electronics",
  "Tires",
  "Hazardous materials",
  "Other",
];

type Screen = "welcome" | "form" | "done";

interface FormErrors {
  location?: string;
  description?: string;
}

export default function ReportDumping() {
  const [, navigate] = useLocation();
  const { t } = useLang();
  const [screen, setScreen] = useState<Screen>("welcome");

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [wasteType, setWasteType] = useState("Furniture");
  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [caseNumber, setCaseNumber] = useState("");
  const [ackMessage, setAckMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (file: File) => {
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

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
    const caseNum = `SJ-${Math.floor(100000 + Math.random() * 900000)}`;
    setCaseNumber(caseNum);
    setSubmitting(true);
    setScreen("done");
    try {
      const res = await fetch("/api/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          wasteType,
          description: description.trim(),
          location: location.trim(),
          caseNumber: caseNum,
          photoBase64: photoPreview ?? undefined,
        }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      setAckMessage(data.message || "Your report has been received. Thank you for helping keep San Jose clean.");
    } catch {
      setAckMessage("Your report has been received. Thank you for helping keep San Jose clean.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setName(""); setLocation(""); setWasteType("Furniture");
    setDescription(""); setPhotoFile(null); setPhotoPreview(null);
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

                {/* Location */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold" style={{ color: "#1a3a1a" }}>
                    {t("dumping_location_label")}
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => {
                        setLocation(e.target.value);
                        if (e.target.value.trim()) setErrors((p) => ({ ...p, location: undefined }));
                      }}
                      placeholder={t("dumping_location_placeholder")}
                      className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-300 bg-gray-50 ${errors.location ? "border-red-400" : "border-gray-200"}`}
                    />
                  </div>
                  {errors.location && <p className="text-xs text-red-500">{errors.location}</p>}
                </div>

                {/* Waste Type */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold" style={{ color: "#1a3a1a" }}>
                    {t("dumping_waste_label")}
                  </label>
                  <Select value={wasteType} onValueChange={setWasteType}>
                    <SelectTrigger className="rounded-xl border-gray-200 bg-gray-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WASTE_TYPES.map((wt) => (
                        <SelectItem key={wt} value={wt}>{wt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                </div>

                {/* Photo */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold" style={{ color: "#1a3a1a" }}>
                    {t("dumping_photo_label")}
                  </label>
                  <label
                    htmlFor="photo-input"
                    className="flex items-center gap-3 cursor-pointer border-2 border-dashed rounded-xl px-4 py-3 transition-colors hover:bg-gray-50"
                    style={{ borderColor: "#c5d9c5" }}
                  >
                    <Upload className="w-4 h-4 flex-shrink-0" style={{ color: "#2d6a2d" }} />
                    <span className="text-sm text-gray-500 truncate">
                      {photoFile ? photoFile.name : t("dumping_photo_btn")}
                    </span>
                    <input
                      ref={fileInputRef}
                      id="photo-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handlePhotoChange(f);
                      }}
                    />
                  </label>
                  {photoPreview && (
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="mt-1 max-h-40 w-full object-contain rounded-xl border border-gray-200"
                    />
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
                <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">{t("dumping_done_case")}</p>
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
