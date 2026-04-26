import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  LogOut,
  RefreshCw,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
  CheckCircle2,
  XCircle,
  ImageOff,
  Bike,
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
  location: string | null;
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

function ActionButtons({
  ids,
  token,
  onDone,
}: {
  ids: string[];
  token: string;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState<"resolved" | "unresolved" | null>(null);

  const handleResolved = async () => {
    setBusy("resolved");
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/staff/delete-report/${encodeURIComponent(id)}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }),
        ),
      );
      onDone();
    } finally {
      setBusy(null);
    }
  };

  const handleUnresolved = async () => {
    setBusy("unresolved");
    try {
      await Promise.all(
        ids.map((id) =>
          fetch("/api/staff/close-report", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ id, status: "unresolved" }),
          }),
        ),
      );
      onDone();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex items-center gap-2 mt-1.5">
      <button
        onClick={handleResolved}
        disabled={busy !== null}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
      >
        {busy === "resolved" ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
        Resolved
      </button>
      <button
        onClick={handleUnresolved}
        disabled={busy !== null}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
      >
        {busy === "unresolved" ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
        Unresolved
      </button>
    </div>
  );
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

      {r.photoBase64 ? (
        <img
          src={r.photoBase64}
          alt="Report photo"
          className="max-h-40 w-full object-contain rounded-lg border border-gray-200 bg-gray-50 mt-2"
        />
      ) : (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-400">
          <ImageOff className="w-4 h-4 flex-shrink-0" />
          No image provided
        </div>
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

function DumpingGroupCard({
  group,
  token,
  onClose,
}: {
  group: LocationGroup;
  token: string;
  onClose: (ids: string[]) => void;
}) {
  const [stackOpen, setStackOpen] = useState(false);
  const isStacked = group.reports.length > 1;
  const primary = group.reports[0];
  const rest = group.reports.slice(1);
  const allIds = group.reports.map((r) => r.id);

  return (
    <Card className="border-l-4 border-l-emerald-500">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
              <Bike className="w-3 h-3" /> Bike Lane Obstruction
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
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="text-xs text-gray-400">{formatDate(primary.createdAt)}</span>
            <ActionButtons ids={allIds} token={token} onDone={() => onClose(allIds)} />
          </div>
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

function TBoolField({ label, value }: { label: string; value: boolean | null }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-600">{label}</span>
      {value === null || value === undefined ? (
        <span className="text-sm text-gray-400 italic">Unknown</span>
      ) : value ? (
        <span className="flex items-center gap-1 text-sm font-medium text-red-600">
          <CheckCircle2 className="h-3.5 w-3.5" /> Yes
        </span>
      ) : (
        <span className="flex items-center gap-1 text-sm font-medium text-green-600">
          <XCircle className="h-3.5 w-3.5" /> No
        </span>
      )}
    </div>
  );
}

function TTextField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="py-1.5">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <p className="mt-0.5 text-sm text-gray-600">
        {value ?? <span className="italic text-gray-400">Not determined</span>}
      </p>
    </div>
  );
}

function TSeverityBadge({ severity }: { severity: string | null }) {
  if (!severity) return <span className="text-sm text-gray-400 italic">Unknown</span>;
  const colors: Record<string, string> = {
    low: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-red-100 text-red-800",
    unknown: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${colors[severity.toLowerCase()] ?? "bg-gray-100 text-gray-600"}`}>
      {severity}
    </span>
  );
}

function TUrgencyBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-sm text-gray-400 italic">Unknown</span>;
  const pct = (score / 10) * 100;
  const color = score >= 8 ? "bg-red-500" : score >= 5 ? "bg-yellow-500" : "bg-green-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 rounded-full bg-gray-200 h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold text-gray-700 w-8 text-right">{score}/10</span>
    </div>
  );
}

function HazardCard({ r, token, onClose }: { r: HazardReport; token: string; onClose: (id: string) => void }) {
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
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="text-xs text-gray-400">{formatDate(r.createdAt)}</span>
            <ActionButtons ids={[r.id]} token={token} onDone={() => onClose(r.id)} />
          </div>
        </div>
        <p className="text-sm font-medium text-gray-800 mt-1">{r.hazardType}</p>
        {r.location && (
          <p className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
            <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
            {r.location}
          </p>
        )}
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
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-3">
            {/* Human review alert */}
            <Alert
              className={
                humanReview === true
                  ? "border-red-400 bg-red-50 text-red-800"
                  : humanReview === false
                    ? "border-green-400 bg-green-50 text-green-800"
                    : "border-gray-300 bg-gray-50 text-gray-700"
              }
            >
              <AlertTriangle className={`h-4 w-4 ${humanReview === true ? "text-red-600" : humanReview === false ? "text-green-600" : "text-gray-500"}`} />
              <AlertTitle className="font-bold text-sm">
                {humanReview === null ? "Human Review: Undetermined" : humanReview ? "⚠ Human Review Required" : "Human Review Not Required"}
              </AlertTitle>
              <AlertDescription className="text-xs">
                {humanReview === null
                  ? "The AI could not determine whether human review is required."
                  : humanReview
                    ? "This report has been flagged and must be reviewed by a staff member."
                    : "AI analysis did not flag this report for mandatory human review."}
              </AlertDescription>
            </Alert>

            {/* Hazard type badge */}
            <div className="flex items-center gap-3 py-1 px-3 rounded-lg bg-white border border-gray-200">
              <span className="text-xs font-semibold text-gray-600 shrink-0">Hazard Type</span>
              {(t["hazard_type"] as string | null) ? (
                <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-semibold text-indigo-800">
                  {t["hazard_type"] as string}
                </span>
              ) : (
                <span className="text-xs italic text-gray-400">Not determined</span>
              )}
            </div>

            {/* Severity + Urgency */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <div>
                <span className="text-xs font-medium text-gray-700">Severity</span>
                <div className="mt-1"><TSeverityBadge severity={severity} /></div>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-700">Urgency Score</span>
                <div className="mt-1"><TUrgencyBar score={urgency} /></div>
              </div>
            </div>

            <Separator />

            {/* Bool fields */}
            <div className="divide-y divide-gray-100">
              <TBoolField label="Obstruction Detected" value={t["obstruction_detected"] as boolean | null} />
              <TBoolField label="Lane Blocked" value={laneBlocked} />
              <TBoolField label="Immediate Risk to Cyclists" value={riskToCyclists} />
              <TBoolField label="Visible Vehicle" value={t["visible_vehicle"] as boolean | null} />
              <TBoolField label="Visible Debris" value={t["visible_debris"] as boolean | null} />
            </div>

            <Separator />

            {/* Text fields */}
            <TTextField label="Description" value={desc} />
            <TTextField label="Recommended Department" value={dept} />
            <TTextField label="Recommended Action" value={action} />
            <TTextField label="Confidence Notes" value={t["confidence_notes"] as string | null} />

            {/* Privacy flags */}
            {(() => {
              const flags = t["privacy_flags"] as string[] | null;
              return (
                <div className="py-1.5">
                  <span className="text-sm font-medium text-gray-700">Privacy Flags</span>
                  {flags === null ? (
                    <p className="mt-0.5 text-xs italic text-gray-400">Unknown</p>
                  ) : flags.length === 0 ? (
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-green-700">
                      <CheckCircle2 className="h-3.5 w-3.5" /> No privacy flags detected
                    </div>
                  ) : (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {flags.map((flag) => (
                        <Badge key={flag} variant="outline" className="border-orange-300 text-orange-700 bg-orange-50 text-xs">
                          {flag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
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
            All submitted reports — bike lane obstructions and AI-analyzed hazards.
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
                <DumpingGroupCard
                  key={item.group.key}
                  group={item.group}
                  token={token}
                  onClose={(ids) =>
                    setReports((prev) => prev.filter((r) => !ids.includes(r.id)))
                  }
                />
              ) : (
                <HazardCard
                  key={item.report.id}
                  r={item.report}
                  token={token}
                  onClose={(id) =>
                    setReports((prev) => prev.filter((r) => r.id !== id))
                  }
                />
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
