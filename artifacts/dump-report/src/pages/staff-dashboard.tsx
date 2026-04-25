import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  LogOut,
  RefreshCw,
  Loader2,
  TrashIcon,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
} from "lucide-react";

type DumpingReport = {
  id: string;
  type: "dumping";
  caseNumber: string;
  reporterName: string | null;
  location: string;
  wasteType: string;
  description: string;
  ackMessage: string | null;
  photoBase64: string | null;
  createdAt: string;
};

type HazardReport = {
  id: string;
  type: "hazard";
  hazardType: string;
  triageData: Record<string, unknown>;
  imageBase64: string | null;
  dispatchedAt: string | null;
  dispatchedTo: string | null;
  createdAt: string;
};

type Report = DumpingReport | HazardReport;

/** Normalize a location string for comparison */
function normalizeLocation(loc: string): string[] {
  return loc
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);
}

/** Returns true if two location strings are "near" each other (share ≥2 meaningful tokens) */
function locationsMatch(a: string, b: string): boolean {
  const tokensA = new Set(normalizeLocation(a));
  const tokensB = new Set(normalizeLocation(b));
  let shared = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) shared++;
  }
  return shared >= 2;
}

type LocationGroup = {
  key: string;
  location: string;
  reports: DumpingReport[];
};

/** Group dumping reports by similar location */
function groupByLocation(reports: DumpingReport[]): LocationGroup[] {
  const groups: LocationGroup[] = [];
  for (const r of reports) {
    const existing = groups.find((g) => locationsMatch(g.location, r.location));
    if (existing) {
      existing.reports.push(r);
    } else {
      groups.push({ key: r.id, location: r.location, reports: [r] });
    }
  }
  return groups;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function severityColor(s: unknown) {
  if (s === "high") return "bg-red-100 text-red-700";
  if (s === "medium") return "bg-amber-100 text-amber-700";
  if (s === "low") return "bg-emerald-100 text-emerald-700";
  return "bg-gray-100 text-gray-600";
}

function BooleanBadge({ value, label }: { value: unknown; label: string }) {
  if (value === null || value === undefined) return null;
  return (
    <span
      className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${value ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}
    >
      {label}: {value ? "Yes" : "No"}
    </span>
  );
}

function DumpingReportRow({ r, nested }: { r: DumpingReport; nested?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={nested ? "border-t border-gray-100 pt-3 mt-3" : ""}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm font-bold text-gray-700">{r.caseNumber}</span>
          <Badge variant="outline">{r.wasteType}</Badge>
          {r.reporterName && (
            <span className="text-xs text-gray-500">by {r.reporterName}</span>
          )}
        </div>
        <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(r.createdAt)}</span>
      </div>
      {nested && (
        <p className="text-xs text-gray-500 mt-0.5">{r.location}</p>
      )}
      <p className="text-sm text-gray-700 leading-relaxed mt-1">{r.description}</p>

      {r.photoBase64 && (
        <img
          src={r.photoBase64}
          alt="Report photo"
          className="max-h-40 w-full object-contain rounded-lg border border-gray-200 bg-gray-50 mt-2"
        />
      )}

      {r.ackMessage && (
        <div className="mt-2">
          <button
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            onClick={() => setExpanded((p) => !p)}
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Resident acknowledgment
          </button>
          {expanded && (
            <p className="mt-1 text-sm text-gray-600 italic pl-4 border-l-2 border-gray-200">
              {r.ackMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function DumpingGroupCard({ group }: { group: LocationGroup }) {
  const [stackOpen, setStackOpen] = useState(false);
  const isStacked = group.reports.length > 1;
  const primary = group.reports[0];
  const rest = group.reports.slice(1);

  return (
    <Card className="border-l-4 border-l-emerald-500">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
              <TrashIcon className="w-3 h-3" /> Illegal Dumping
            </span>
            {isStacked && (
              <button
                onClick={() => setStackOpen((p) => !p)}
                className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full hover:bg-amber-100 transition-colors"
              >
                <Layers className="w-3 h-3" />
                +{rest.length} more at this location
                {stackOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0">
            {formatDate(primary.createdAt)}
          </span>
        </div>
        <p className="text-sm font-medium text-gray-800 mt-1">{primary.location}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <DumpingReportRow r={primary} />

        {isStacked && stackOpen && (
          <div className="bg-gray-50 rounded-lg p-3 space-y-0">
            {rest.map((r) => (
              <DumpingReportRow key={r.id} r={r} nested />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HazardCard({ r, token }: { r: HazardReport; token: string }) {
  const [expanded, setExpanded] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [localDispatched, setLocalDispatched] = useState<{
    at: string;
    to: string | null;
  } | null>(
    r.dispatchedAt
      ? { at: r.dispatchedAt, to: r.dispatchedTo ?? null }
      : null,
  );

  const t = r.triageData;
  const severity = t["likely_severity"] as string | null;
  const urgency = t["urgency_score"] as number | null;
  const dept = t["recommended_department"] as string | null;
  const action = t["recommended_action"] as string | null;
  const desc = t["description"] as string | null;
  const humanReview = t["human_review_required"] as boolean | null;
  const laneBlocked = t["lane_blocked"] as boolean | null;
  const riskToCyclists = t["immediate_risk_to_cyclists"] as boolean | null;

  const isDispatched = Boolean(localDispatched);

  const handleDispatch = async () => {
    if (!dept) return;
    setDispatching(true);
    setDispatchError(null);
    const numericId = r.id.startsWith("hazard-")
      ? Number(r.id.slice("hazard-".length))
      : null;
    try {
      const res = await fetch("/api/dispatch-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          report_id: numericId,
          department: dept,
          hazard_type: r.hazardType,
          description: desc,
          urgency_score: urgency,
          recommended_action: action,
          severity,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDispatchError(data.error ?? "Dispatch failed");
      } else {
        setLocalDispatched({ at: new Date().toISOString(), to: dept });
      }
    } catch {
      setDispatchError("Network error — please try again.");
    } finally {
      setDispatching(false);
    }
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
              <AlertTriangle className="w-3 h-3" /> Bike Lane Hazard
            </span>
            <Badge className={severityColor(severity)}>
              {severity ?? "Unknown"} severity
            </Badge>
            {urgency !== null && (
              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-medium">
                Urgency {urgency}/10
              </span>
            )}
            {isDispatched ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                Dispatched{localDispatched?.to ? ` · ${localDispatched.to}` : ""}{localDispatched?.at ? ` · ${formatDate(localDispatched.at)}` : ""}
              </span>
            ) : (
              <span className="inline-flex items-center text-xs font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                Pending
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0">
            {formatDate(r.createdAt)}
          </span>
        </div>
        <p className="text-sm font-medium text-gray-800 mt-1">{r.hazardType}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <BooleanBadge value={laneBlocked} label="Lane blocked" />
          <BooleanBadge value={riskToCyclists} label="Risk to cyclists" />
          {humanReview === true && (
            <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700">
              Human review required
            </span>
          )}
        </div>

        {desc && <p className="text-sm text-gray-700 leading-relaxed">{desc}</p>}

        {r.imageBase64 && (
          <img
            src={r.imageBase64}
            alt="Hazard photo"
            className="max-h-48 w-full object-contain rounded-lg border border-gray-200 bg-gray-50"
          />
        )}

        {(dept || action) && (
          <div className="text-sm space-y-1">
            {dept && (
              <p className="text-gray-600">
                <span className="font-medium">Department:</span> {dept}
              </p>
            )}
            {action && (
              <p className="text-gray-600">
                <span className="font-medium">Recommended action:</span> {action}
              </p>
            )}
          </div>
        )}

        {!isDispatched && dept && (
          <div className="space-y-1">
            <Button
              size="sm"
              onClick={handleDispatch}
              disabled={dispatching}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {dispatching ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Dispatching…
                </>
              ) : (
                `Send to ${dept}`
              )}
            </Button>
            {dispatchError && (
              <p className="text-xs text-red-600">{dispatchError}</p>
            )}
          </div>
        )}

        <button
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          onClick={() => setExpanded((p) => !p)}
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          Full triage data
        </button>
        {expanded && (
          <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto max-h-60 text-gray-700">
            {JSON.stringify(r.triageData, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}

export default function StaffDashboard() {
  const [, navigate] = useLocation();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token = localStorage.getItem("staff_token") ?? "";

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/staff/reports", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("staff_token");
        navigate("/staff/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to load reports");
      const data = await res.json();
      setReports(data.reports ?? []);
    } catch {
      setError("Could not load reports. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/staff/login");
      return;
    }
    fetchReports();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("staff_token");
    navigate("/");
  };

  const dumpingReports = reports.filter((r): r is DumpingReport => r.type === "dumping");
  const hazardReports = reports.filter((r): r is HazardReport => r.type === "hazard");
  const locationGroups = groupByLocation(dumpingReports);

  // Build interleaved list: each group or hazard report has a createdAt for sorting
  type ListItem =
    | { kind: "group"; group: LocationGroup; createdAt: string }
    | { kind: "hazard"; report: HazardReport; createdAt: string };

  const listItems: ListItem[] = [
    ...locationGroups.map((g) => ({
      kind: "group" as const,
      group: g,
      createdAt: g.reports[0].createdAt,
    })),
    ...hazardReports.map((r) => ({
      kind: "hazard" as const,
      report: r,
      createdAt: r.createdAt,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalCount = reports.length;
  const stackedCount = dumpingReports.length - locationGroups.length;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchReports} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-3.5 h-3.5 mr-1.5" /> Sign out
            </Button>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Portal</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            All submitted reports — illegal dumping and bike lane hazards.
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading reports…
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && reports.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg font-medium">No reports yet</p>
            <p className="text-sm mt-1">Reports will appear here after residents and staff submit them.</p>
          </div>
        )}

        {!loading && reports.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">
                {totalCount} report{totalCount !== 1 ? "s" : ""}
              </p>
              {stackedCount > 0 && (
                <p className="text-xs text-amber-600 font-medium">
                  {stackedCount} stacked at shared locations
                </p>
              )}
            </div>
            {listItems.map((item) =>
              item.kind === "group" ? (
                <DumpingGroupCard key={item.group.key} group={item.group} />
              ) : (
                <HazardCard key={item.report.id} r={item.report} token={token} />
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
