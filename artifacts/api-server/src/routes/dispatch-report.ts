import { Router, type IRouter, type RequestHandler } from "express";
import nodemailer from "nodemailer";
import { db, hazardReportsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const STAFF_PASSWORD = process.env["STAFF_PASSWORD"] ?? "";

const requireAuth: RequestHandler = (req, res, next) => {
  const auth = req.headers["authorization"] ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!STAFF_PASSWORD || token !== STAFF_PASSWORD) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
};

const DEPARTMENT_EMAILS: Record<string, string> = {
  "Public Works": process.env["DEPT_EMAIL_PUBLIC_WORKS"] ?? "",
  "Traffic Engineering": process.env["DEPT_EMAIL_TRAFFIC_ENGINEERING"] ?? "",
  Police: process.env["DEPT_EMAIL_POLICE"] ?? "",
  Sanitation: process.env["DEPT_EMAIL_SANITATION"] ?? "",
  "Parks and Recreation": process.env["DEPT_EMAIL_PARKS"] ?? "",
};

function getDepartmentEmail(department: string): string {
  const exact = DEPARTMENT_EMAILS[department];
  if (exact) return exact;
  return process.env["DEPT_EMAIL_FALLBACK"] ?? "";
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildEmailBody(report: {
  hazardType: string;
  department: string;
  description: string | null;
  urgencyScore: number | null;
  recommendedAction: string | null;
  severity: string | null;
  reportId: number | null;
}): { subject: string; text: string; html: string } {
  const reportLabel =
    report.reportId !== null ? `#${report.reportId}` : "(unsaved)";
  const subject = `[City Triage] Hazard Report ${reportLabel} — ${report.hazardType} (${report.department})`;

  const urgencyLabel =
    report.urgencyScore !== null ? `${report.urgencyScore}/10` : "Unknown";
  const severityLabel = report.severity ?? "Unknown";

  const text = [
    `HAZARD TRIAGE REPORT — Dispatch Notification`,
    `Report: ${reportLabel}`,
    `Hazard Type: ${report.hazardType}`,
    `Recommended Department: ${report.department}`,
    `Severity: ${severityLabel}`,
    `Urgency Score: ${urgencyLabel}`,
    ``,
    `Description:`,
    report.description ?? "No description provided.",
    ``,
    `Recommended Action:`,
    report.recommendedAction ?? "No specific action recommended.",
    ``,
    `This report was dispatched from the City Bike Lane Hazard Triage system.`,
  ].join("\n");

  const eReportLabel = escapeHtml(reportLabel);
  const eHazardType = escapeHtml(report.hazardType);
  const eDepartment = escapeHtml(report.department);
  const eSeverity = escapeHtml(severityLabel);
  const eUrgency = escapeHtml(urgencyLabel);
  const eDescription = escapeHtml(report.description ?? "No description provided.");
  const eAction = escapeHtml(report.recommendedAction ?? "No specific action recommended.");

  const html = `
    <h2 style="color:#1a1a1a">Hazard Triage Report — Dispatch Notification</h2>
    <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
      <tr><td style="padding:4px 12px 4px 0;color:#555;font-weight:600">Report</td><td style="padding:4px 0">${eReportLabel}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#555;font-weight:600">Hazard Type</td><td style="padding:4px 0">${eHazardType}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#555;font-weight:600">Recommended Department</td><td style="padding:4px 0">${eDepartment}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#555;font-weight:600">Severity</td><td style="padding:4px 0">${eSeverity}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#555;font-weight:600">Urgency Score</td><td style="padding:4px 0">${eUrgency}</td></tr>
    </table>
    <h3 style="margin-top:16px;color:#1a1a1a">Description</h3>
    <p style="font-size:14px;color:#333">${eDescription}</p>
    <h3 style="color:#1a1a1a">Recommended Action</h3>
    <p style="font-size:14px;color:#333">${eAction}</p>
    <hr style="margin-top:24px;border:none;border-top:1px solid #ddd"/>
    <p style="font-size:12px;color:#888">This report was dispatched from the City Bike Lane Hazard Triage system.</p>
  `;

  return { subject, text, html };
}

async function attemptSendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const smtpHost = process.env["SMTP_HOST"]!;
  const smtpUser = process.env["SMTP_USER"]!;
  const smtpPass = process.env["SMTP_PASS"]!;
  const smtpFrom =
    process.env["SMTP_FROM"] ?? smtpUser ?? "triage@city.local";
  const smtpPort = parseInt(process.env["SMTP_PORT"] ?? "587", 10);

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  await transporter.sendMail({
    from: smtpFrom,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });
}

router.post("/dispatch-report", requireAuth, async (req, res) => {
  const {
    report_id,
    department,
    description,
    urgency_score,
    recommended_action,
    severity,
    hazard_type,
  } = req.body ?? {};

  if (typeof department !== "string" || !department.trim()) {
    res.status(400).json({ error: "department is required" });
    return;
  }

  const deptName = department.trim();

  const reportId =
    report_id !== null && report_id !== undefined ? Number(report_id) : null;
  const hasValidReportId =
    reportId !== null && Number.isFinite(reportId) && reportId > 0;

  const smtpHost = process.env["SMTP_HOST"];
  const smtpUser = process.env["SMTP_USER"];
  const smtpPass = process.env["SMTP_PASS"];
  const smtpConfigured = !!(smtpHost && smtpUser && smtpPass);

  if (!smtpConfigured) {
    res.status(422).json({
      error: "Email delivery is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables to enable dispatch notifications.",
      code: "SMTP_NOT_CONFIGURED",
    });
    return;
  }

  const toEmail = getDepartmentEmail(deptName);

  if (!toEmail) {
    res.status(422).json({
      error: `No email address is configured for department "${deptName}". Set the DEPT_EMAIL_* environment variable for this department to enable dispatch.`,
      code: "DEPT_EMAIL_NOT_CONFIGURED",
    });
    return;
  }

  const emailPayload = buildEmailBody({
    reportId: hasValidReportId ? reportId! : null,
    hazardType: typeof hazard_type === "string" ? hazard_type : "Unknown",
    department: deptName,
    description: typeof description === "string" ? description : null,
    urgencyScore: typeof urgency_score === "number" ? urgency_score : null,
    recommendedAction:
      typeof recommended_action === "string" ? recommended_action : null,
    severity: typeof severity === "string" ? severity : null,
  });

  try {
    await attemptSendEmail({
      to: toEmail,
      subject: emailPayload.subject,
      text: emailPayload.text,
      html: emailPayload.html,
    });
  } catch (err) {
    req.log.error({ err }, "Dispatch email send failed");
    res.status(502).json({
      error: `Email delivery failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      code: "EMAIL_SEND_FAILED",
    });
    return;
  }

  let dbMarked = false;
  if (hasValidReportId) {
    try {
      const updated = await db
        .update(hazardReportsTable)
        .set({
          dispatchedAt: new Date(),
          dispatchedTo: deptName,
        })
        .where(eq(hazardReportsTable.id, reportId!))
        .returning({ id: hazardReportsTable.id });
      dbMarked = updated.length > 0;
      if (!dbMarked) {
        req.log.warn({ reportId }, "Email sent but no matching report found in DB to mark dispatched");
      }
    } catch (err) {
      req.log.error({ err }, "Email sent but failed to mark report as dispatched in DB");
    }
  }

  res.json({
    ok: true,
    dispatched_to: deptName,
    email_sent: true,
    db_marked: dbMarked,
  });
});

export default router;
