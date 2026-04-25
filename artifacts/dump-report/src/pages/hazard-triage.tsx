import { useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  Upload,
  CheckCircle2,
  XCircle,
  Loader2,
  ImageIcon,
  Clipboard,
  ClipboardCheck,
  ChevronLeft,
  Send,
} from "lucide-react";

const HAZARD_TYPES = [
  "Abandoned vehicle",
  "Construction debris",
  "Fallen tree or branch",
  "Flooding or standing water",
  "Gravel or loose materials",
  "Illegal parking",
  "Pothole or road damage",
  "Signage obstruction",
  "Trash or garbage",
  "Other",
];

interface TriageReport {
  _report_id: number | null;
  hazard_type: string | null;
  obstruction_detected: boolean | null;
  likely_severity: string | null;
  urgency_score: number | null;
  description: string | null;
  lane_blocked: boolean | null;
  immediate_risk_to_cyclists: boolean | null;
  visible_vehicle: boolean | null;
  visible_debris: boolean | null;
  recommended_department: string | null;
  recommended_action: string | null;
  privacy_flags: string[] | null;
  confidence_notes: string | null;
  human_review_required: boolean | null;
}

function BoolField({
  label,
  value,
}: {
  label: string;
  value: boolean | null;
}) {
  if (value === null || value === undefined) {
    return (
      <div className="flex items-center justify-between py-1.5">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm text-gray-400 italic">Unknown</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-600">{label}</span>
      {value ? (
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

function TextField({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="py-1.5">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <p className="mt-0.5 text-sm text-gray-600">
        {value ?? <span className="italic text-gray-400">Not determined</span>}
      </p>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string | null }) {
  if (!severity) return <span className="text-sm text-gray-400 italic">Unknown</span>;
  const colors: Record<string, string> = {
    low: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-red-100 text-red-800",
    unknown: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${colors[severity.toLowerCase()] ?? "bg-gray-100 text-gray-600"}`}
    >
      {severity}
    </span>
  );
}

function UrgencyBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-sm text-gray-400 italic">Unknown</span>;
  const pct = (score / 10) * 100;
  const color =
    score >= 8
      ? "bg-red-500"
      : score >= 5
        ? "bg-yellow-500"
        : "bg-green-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 rounded-full bg-gray-200 h-2">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-gray-700 w-8 text-right">
        {score}/10
      </span>
    </div>
  );
}

export default function HazardTriage() {
  const [, navigate] = useLocation();
  const [hazardType, setHazardType] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<TriageReport | null>(null);
  const [copied, setCopied] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [dispatched, setDispatched] = useState(false);
  const [dispatchDbMarked, setDispatchDbMarked] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    setImageFile(file);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const handleSubmit = async () => {
    if (!imageFile || !hazardType) return;

    setLoading(true);
    setError(null);
    setReport(null);
    setDispatched(false);
    setDispatchDbMarked(false);
    setDispatchError(null);

    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("hazard_type", hazardType);

    try {
      const response = await fetch(`/api/analyze-hazard`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? `Server error: ${response.status}`,
        );
      }

      const data = (await response.json()) as TriageReport;
      setReport(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDispatch = async () => {
    if (!report || dispatching || dispatched) return;

    setDispatching(true);
    setDispatchError(null);

    const token = localStorage.getItem("staff_token") ?? "";

    try {
      const response = await fetch(`/api/dispatch-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          report_id: report._report_id,
          department: report.recommended_department,
          description: report.description,
          urgency_score: report.urgency_score,
          recommended_action: report.recommended_action,
          severity: report.likely_severity,
          hazard_type: report.hazard_type,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const msg = (body as { error?: string }).error;
        if (response.status === 401) {
          throw new Error(
            "You must be logged in as staff to dispatch reports. Please log in and try again.",
          );
        }
        throw new Error(msg ?? `Server error: ${response.status}`);
      }

      const result = (await response.json()) as {
        ok: boolean;
        db_marked?: boolean;
      };
      setDispatched(true);
      setDispatchDbMarked(result.db_marked === true);
    } catch (err) {
      setDispatchError(
        err instanceof Error ? err.message : "Failed to dispatch report.",
      );
    } finally {
      setDispatching(false);
    }
  };

  const handleCopy = () => {
    if (!report) return;
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canSubmit = !!imageFile && !!hazardType && !loading;
  const canDispatch =
    !!report && !!report.recommended_department && !dispatched && !dispatching;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bike Lane Hazard Triage
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Upload a photo of a reported bike lane hazard to generate an AI-powered triage report for city staff review.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submit Hazard for Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Hazard Type <span className="text-red-500">*</span>
              </label>
              <Select value={hazardType} onValueChange={setHazardType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select hazard type…" />
                </SelectTrigger>
                <SelectContent>
                  {HAZARD_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Hazard Image <span className="text-red-500">*</span>
              </label>
              <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed cursor-pointer transition-colors min-h-[160px] ${
                  isDragging
                    ? "border-blue-500 bg-blue-50"
                    : imagePreview
                      ? "border-gray-300 bg-gray-50"
                      : "border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50"
                }`}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-48 max-w-full rounded object-contain p-2"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 p-6 text-center">
                    <ImageIcon className="h-8 w-8 text-gray-400" />
                    <div>
                      <span className="text-sm font-medium text-blue-600">
                        Click to upload
                      </span>{" "}
                      <span className="text-sm text-gray-500">
                        or drag and drop
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      PNG, JPG, JPEG, WEBP up to 20 MB
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />
              </div>
              {imageFile && (
                <p className="text-xs text-gray-500">
                  {imageFile.name} ({(imageFile.size / 1024).toFixed(0)} KB)
                </p>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing hazard…
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Analyze Hazard
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {report && (
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Triage Report</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="gap-1.5"
                >
                  {copied ? (
                    <>
                      <ClipboardCheck className="h-3.5 w-3.5" /> Copied
                    </>
                  ) : (
                    <>
                      <Clipboard className="h-3.5 w-3.5" /> Copy JSON
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert
                className={
                  report.human_review_required === true
                    ? "border-red-400 bg-red-50 text-red-800"
                    : report.human_review_required === false
                      ? "border-green-400 bg-green-50 text-green-800"
                      : "border-gray-300 bg-gray-50 text-gray-700"
                }
              >
                <AlertTriangle
                  className={`h-4 w-4 ${
                    report.human_review_required === true
                      ? "text-red-600"
                      : report.human_review_required === false
                        ? "text-green-600"
                        : "text-gray-500"
                  }`}
                />
                <AlertTitle className="font-bold">
                  {report.human_review_required === null
                    ? "Human Review: Undetermined"
                    : report.human_review_required
                      ? "⚠ Human Review Required"
                      : "Human Review Not Required"}
                </AlertTitle>
                <AlertDescription className="text-sm">
                  {report.human_review_required === null
                    ? "The AI could not determine whether human review is required. Treat this report with caution and consider manual review."
                    : report.human_review_required
                      ? "This report has been flagged and must be reviewed by a staff member before action is taken."
                      : "AI analysis did not flag this report for mandatory human review."}
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <div className="col-span-2">
                  <span className="text-sm font-medium text-gray-700">Hazard Type</span>
                  <p className="text-sm text-gray-900 mt-0.5">
                    {report.hazard_type ?? <span className="italic text-gray-400">Unknown</span>}
                  </p>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-700">Severity</span>
                  <div className="mt-1">
                    <SeverityBadge severity={report.likely_severity} />
                  </div>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-700">Urgency Score</span>
                  <div className="mt-1">
                    <UrgencyBar score={report.urgency_score} />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-0.5 divide-y divide-gray-100">
                <BoolField label="Obstruction Detected" value={report.obstruction_detected} />
                <BoolField label="Lane Blocked" value={report.lane_blocked} />
                <BoolField label="Immediate Risk to Cyclists" value={report.immediate_risk_to_cyclists} />
                <BoolField label="Visible Vehicle" value={report.visible_vehicle} />
                <BoolField label="Visible Debris" value={report.visible_debris} />
              </div>

              <Separator />

              <TextField label="Description" value={report.description} />
              <TextField label="Recommended Department" value={report.recommended_department} />
              <TextField label="Recommended Action" value={report.recommended_action} />
              <TextField label="Confidence Notes" value={report.confidence_notes} />

              <div>
                <span className="text-sm font-medium text-gray-700">Privacy Flags</span>
                {report.privacy_flags === null ? (
                  <p className="mt-0.5 text-sm italic text-gray-400">Unknown</p>
                ) : report.privacy_flags.length === 0 ? (
                  <div className="mt-1.5 flex items-center gap-1.5 text-sm text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    No privacy flags detected
                  </div>
                ) : (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {report.privacy_flags.map((flag) => (
                      <Badge
                        key={flag}
                        variant="outline"
                        className="border-orange-300 text-orange-700 bg-orange-50"
                      >
                        {flag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {report.recommended_department ? (
                <div className="space-y-2">
                  {dispatched ? (
                    <Alert className="border-green-400 bg-green-50 text-green-800">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertTitle className="font-semibold">Dispatched</AlertTitle>
                      <AlertDescription className="text-sm">
                        Email notification sent to <strong>{report.recommended_department}</strong>.
                        {dispatchDbMarked && " Report marked as dispatched in the system."}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      {dispatchError && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Dispatch Failed</AlertTitle>
                          <AlertDescription>{dispatchError}</AlertDescription>
                        </Alert>
                      )}
                      <Button
                        onClick={handleDispatch}
                        disabled={!canDispatch}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {dispatching ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending to {report.recommended_department}…
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Send to {report.recommended_department}
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              ) : null}

              <details className="group">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 select-none">
                  View raw JSON
                </summary>
                <pre className="mt-2 overflow-x-auto rounded bg-gray-900 p-3 text-xs text-green-300">
                  {JSON.stringify(report, null, 2)}
                </pre>
              </details>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
