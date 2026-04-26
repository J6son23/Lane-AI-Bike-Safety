import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, Upload, CheckCircle, Loader2 } from "lucide-react";
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
    setAckMessage("Generating your acknowledgment…");
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
      setAckMessage(
        data.message ||
          "Your report has been received. Thank you for helping keep San Jose clean.",
      );
    } catch {
      setAckMessage(
        "Your report has been received. Thank you for helping keep San Jose clean.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setName("");
    setLocation("");
    setWasteType("Furniture");
    setDescription("");
    setPhotoFile(null);
    setPhotoPreview(null);
    setErrors({});
    setCaseNumber("");
    setAckMessage("");
    setScreen("welcome");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> {t("dumping_back")}
            </button>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-600 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full tracking-wide">
                SAN JOSE
              </span>
              <span className="text-sm text-gray-500">{t("home_community")}</span>
            </div>
          </div>
          <LanguageSelector />
        </div>

        {screen === "welcome" && (
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-5">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9 text-emerald-600">
                  <path d="M3 6h18l-2 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L3 6z"/>
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  <line x1="10" y1="11" x2="10" y2="17"/>
                  <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t("dumping_welcome_title")}</h1>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                  {t("dumping_welcome_subtitle")}
                </p>
              </div>
              <Button className="w-full" size="lg" onClick={() => setScreen("form")}>
                {t("dumping_welcome_btn")}
              </Button>
              <p className="text-xs text-gray-400">{t("home_footer")}</p>
            </CardContent>
          </Card>
        )}

        {screen === "form" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("dumping_form_title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="name">
                    {t("dumping_name_label")}{" "}
                    <span className="text-gray-400 font-normal">({t("dumping_name_placeholder")})</span>
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("dumping_name_placeholder")}
                    autoComplete="name"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="location">{t("dumping_location_label")}</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => {
                      setLocation(e.target.value);
                      if (e.target.value.trim()) setErrors((p) => ({ ...p, location: undefined }));
                    }}
                    placeholder={t("dumping_location_placeholder")}
                    className={errors.location ? "border-red-400" : ""}
                  />
                  {errors.location && (
                    <p className="text-xs text-red-500">{errors.location}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="waste-type">{t("dumping_waste_label")}</Label>
                  <Select value={wasteType} onValueChange={setWasteType}>
                    <SelectTrigger id="waste-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WASTE_TYPES.map((wt) => (
                        <SelectItem key={wt} value={wt}>{wt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="description">{t("dumping_desc_label")}</Label>
                    <span className="text-xs text-gray-400">{description.length}/300</span>
                  </div>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      if (e.target.value.trim()) setErrors((p) => ({ ...p, description: undefined }));
                    }}
                    maxLength={300}
                    placeholder={t("dumping_desc_placeholder")}
                    className={`resize-none min-h-[100px] ${errors.description ? "border-red-400" : ""}`}
                  />
                  {errors.description && (
                    <p className="text-xs text-red-500">{errors.description}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>{t("dumping_photo_label")}</Label>
                  <label
                    className="flex items-center gap-3 cursor-pointer border border-dashed border-gray-300 rounded-lg px-4 py-3 hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
                    htmlFor="photo-input"
                  >
                    <Upload className="w-5 h-5 text-gray-400 flex-shrink-0" />
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
                      className="mt-2 max-h-40 w-full object-contain rounded-lg border border-gray-200"
                    />
                  )}
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t("dumping_submitting")}
                      </span>
                    ) : t("dumping_submit")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setScreen("welcome")}
                  >
                    {t("dumping_back")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {screen === "done" && (
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-5">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-600 flex items-center justify-center">
                <CheckCircle className="w-9 h-9 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{t("dumping_done_title")}</h2>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed min-h-[3rem]">
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2 text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("dumping_submitting")}
                    </span>
                  ) : (
                    ackMessage || t("dumping_done_msg")
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">{t("dumping_done_case")}</p>
                <div className="bg-emerald-50 rounded-xl px-4 py-3 font-mono text-2xl font-bold text-emerald-700 tracking-widest">
                  {caseNumber}
                </div>
              </div>
              <Button className="w-full" onClick={handleReset}>
                {t("dumping_done_another")}
              </Button>
              <button
                onClick={() => navigate("/")}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                {t("dumping_done_home")}
              </button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
