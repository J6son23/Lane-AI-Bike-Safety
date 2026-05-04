import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, MapPin, Loader2, AlertCircle } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { useLang } from "@/contexts/LanguageContext";
import "leaflet/dist/leaflet.css";

// Fix Leaflet's default icon paths broken by bundlers
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type ReportStatus = "Reported" | "In Progress" | "Resolved";
type FilterStatus = "All" | ReportStatus;

interface MapReport {
  id: string;
  type: "dumping" | "hazard";
  location: string;
  description: string;
  status: ReportStatus;
}

interface GeocodedReport extends MapReport {
  lat: number;
  lng: number;
}

const STATUS_COLORS: Record<ReportStatus, string> = {
  Reported: "#3b82f6",
  "In Progress": "#f59e0b",
  Resolved: "#22c55e",
};

function makeColoredIcon(color: string) {
  return L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="${color}" stroke="white" stroke-width="1.2"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3" fill="white" stroke="${color}" stroke-width="1.5"/></svg>`,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

const SAN_JOSE_CENTER: [number, number] = [37.3382, -121.8863];

async function tryGeocode(q: string): Promise<{ lat: number; lng: number } | null> {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
  if (!res.ok) return null;
  const data: { lat: string; lon: string }[] = await res.json();
  if (!data.length || !data[0].lat) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

async function geocodeLocation(location: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const result = await tryGeocode(location);
    if (result) return result;

    // Fallback: try with just the first comma-delimited segment
    const firstSegment = location.split(",")[0].trim();
    if (firstSegment && firstSegment !== location) {
      return await tryGeocode(firstSegment);
    }
    return null;
  } catch {
    return null;
  }
}

export default function ReportMap() {
  const [, navigate] = useLocation();
  const { t } = useLang();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reports, setReports] = useState<GeocodedReport[]>([]);
  const [partialGeocode, setPartialGeocode] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>("All");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch("/api/reports/map");
        if (!res.ok) throw new Error("Failed");
        const data: { reports: MapReport[] } = await res.json();
        const rawReports = data.reports;

        let failedGeocode = 0;
        const geocoded: GeocodedReport[] = [];

        await Promise.all(
          rawReports.map(async (r) => {
            const coords = await geocodeLocation(r.location);
            if (coords) {
              geocoded.push({ ...r, lat: coords.lat, lng: coords.lng });
            } else {
              failedGeocode++;
            }
          }),
        );

        if (!cancelled) {
          setReports(geocoded);
          setPartialGeocode(failedGeocode > 0);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const filters: FilterStatus[] = ["All", "Reported", "In Progress", "Resolved"];
  const filterLabels: Record<FilterStatus, string> = {
    All: t("map_filter_all"),
    Reported: t("map_filter_reported"),
    "In Progress": t("map_filter_in_progress"),
    Resolved: t("map_filter_resolved"),
  };

  const visible = filter === "All" ? reports : reports.filter((r) => r.status === filter);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#edf4ed" }}>
      {/* Header */}
      <div className="px-4 pt-6 pb-3 w-full max-w-2xl mx-auto">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          {t("map_back")}
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "#d4e8d4" }}
          >
            <MapPin className="w-5 h-5" style={{ color: "#2d6a2d" }} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold leading-tight" style={{ color: "#1a3a1a" }}>
              {t("map_page_title")}
            </h1>
            <p className="text-xs text-gray-500">{t("map_page_subtitle")}</p>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex gap-2 flex-wrap">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                filter === f
                  ? "text-white border-transparent"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
              style={
                filter === f
                  ? { backgroundColor: "#1a4a1a" }
                  : {}
              }
            >
              {filterLabels[f]}
              {f !== "All" && (
                <span className="ml-1 opacity-70">
                  ({reports.filter((r) => r.status === f).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Status messages */}
      {partialGeocode && !loading && (
        <div className="px-4 pb-2 w-full max-w-2xl mx-auto">
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {t("map_no_geocode")}
          </div>
        </div>
      )}

      {/* Map area */}
      <div className="flex-1 px-4 pb-6 w-full max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ height: "calc(100vh - 260px)", minHeight: "320px" }}>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#2d6a2d" }} />
              <p className="text-sm text-gray-500">{t("map_loading")}</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <p className="text-sm text-gray-500">{t("map_error")}</p>
            </div>
          ) : (
            <MapContainer
              center={SAN_JOSE_CENTER}
              zoom={13}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {visible.map((r) => (
                <Marker
                  key={r.id}
                  position={[r.lat, r.lng]}
                  icon={makeColoredIcon(STATUS_COLORS[r.status])}
                >
                  <Popup>
                    <div className="text-sm space-y-1 min-w-[160px]">
                      <div>
                        <span className="font-semibold text-gray-500 uppercase text-xs">{t("map_popup_type")}: </span>
                        <span className="text-gray-700">{r.type === "dumping" ? t("map_type_dumping") : t("map_type_hazard")}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-500 uppercase text-xs">{t("map_popup_status")}: </span>
                        <span
                          className="font-semibold"
                          style={{ color: STATUS_COLORS[r.status] }}
                        >
                          {r.status}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-500 uppercase text-xs">{t("map_popup_desc")}: </span>
                        <span className="text-gray-700">{r.description}</span>
                      </div>
                      <div className="text-xs text-gray-400 pt-0.5">{r.location}</div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>

        {/* Legend */}
        {!loading && !error && (
          <div className="flex items-center gap-4 justify-center mt-3">
            {(["Reported", "In Progress", "Resolved"] as ReportStatus[]).map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: STATUS_COLORS[s] }}
                />
                <span className="text-xs text-gray-500">{filterLabels[s]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
