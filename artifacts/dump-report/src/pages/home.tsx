import { useLocation } from "wouter";
import { TrashIcon, CameraIcon, ShieldCheck, Building2 } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";

export default function Home() {
  const [, navigate] = useLocation();
  const { t } = useLang();

  return (
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: "#edf4ed" }}>
      <div className="relative w-full max-w-sm mx-auto">

        <div className="absolute top-0 right-0">
          <LanguageSelector />
        </div>

        <div className="flex flex-col items-center text-center mb-8 pt-2 space-y-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "#d4e8d4" }}>
            <Building2 className="w-6 h-6" style={{ color: "#2d6a2d" }} />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 mb-1">
              <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "#2d6a2d" }}>
                {t("home_badge")}
              </span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-gray-500">{t("home_community")}</span>
            </div>
            <h1 className="text-2xl font-extrabold leading-tight" style={{ color: "#1a3a1a" }}>
              {t("home_title")}
            </h1>
            <p className="mt-1 text-sm text-gray-500">{t("home_subtitle")}</p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => navigate("/report-dumping")}
            className="w-full flex items-center gap-4 bg-white rounded-2xl p-4 text-left shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center" style={{ backgroundColor: "#d4e8d4" }}>
              <TrashIcon className="w-5 h-5" style={{ color: "#2d6a2d" }} />
            </div>
            <div>
              <div className="font-semibold text-sm" style={{ color: "#1a3a1a" }}>{t("home_dumping_title")}</div>
              <div className="text-xs text-gray-500 mt-0.5">{t("home_dumping_desc")}</div>
            </div>
          </button>

          <button
            onClick={() => navigate("/analyze-hazard")}
            className="w-full flex items-center gap-4 bg-white rounded-2xl p-4 text-left shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center" style={{ backgroundColor: "#d4e8d4" }}>
              <CameraIcon className="w-5 h-5" style={{ color: "#2d6a2d" }} />
            </div>
            <div>
              <div className="font-semibold text-sm" style={{ color: "#1a3a1a" }}>{t("home_analyze_title")}</div>
              <div className="text-xs text-gray-500 mt-0.5">{t("home_analyze_desc")}</div>
            </div>
          </button>

          <button
            onClick={() => navigate("/staff/login")}
            className="w-full flex items-center gap-4 bg-white rounded-2xl p-4 text-left shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center" style={{ backgroundColor: "#d4e8d4" }}>
              <ShieldCheck className="w-5 h-5" style={{ color: "#2d6a2d" }} />
            </div>
            <div>
              <div className="font-semibold text-sm" style={{ color: "#1a3a1a" }}>{t("home_staff_title")}</div>
              <div className="text-xs text-gray-500 mt-0.5">{t("home_staff_desc")}</div>
            </div>
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center mt-8">{t("home_footer")}</p>
      </div>
    </div>
  );
}
