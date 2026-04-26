import { Router, type IRouter, type RequestHandler } from "express";
import multer from "multer";
import OpenAI from "openai";
import * as zod from "zod";
import { AnalyzeHazardResponse } from "@workspace/api-zod";
import { db, hazardReportsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const StrictAnalyzeHazardResponse = AnalyzeHazardResponse.extend({
  urgency_score: zod.number().int().min(1).max(10).nullable(),
  confidence_pct: zod.number().int().min(0).max(100).nullable().optional(),
});

const router: IRouter = Router();

function getClient() {
  return new OpenAI();
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
      return;
    }
    cb(null, true);
  },
});

const uploadMiddleware: RequestHandler = (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      const message =
        err instanceof multer.MulterError
          ? err.code === "LIMIT_FILE_SIZE"
            ? "Image file exceeds the 20 MB limit"
            : err.message
          : err instanceof Error
            ? err.message
            : "File upload failed";
      res.status(400).json({ error: message });
      return;
    }
    next();
  });
};

const HAZARD_CATEGORIES = [
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
] as const;

const TRIAGE_PROMPT = () => `
You are a bike lane safety triage assistant for a city transportation department.
Analyze the provided image of a reported bike lane hazard and return a structured JSON triage report.

Return ONLY a valid JSON object with exactly these fields (no markdown, no extra text):
{
  "hazard_type": one of: ${HAZARD_CATEGORIES.map((c) => `"${c}"`).join(" | ")} — choose the closest match based on what you see in the image,
  "obstruction_detected": boolean or null,
  "likely_severity": "low" | "medium" | "high" | "unknown" | null,
  "urgency_score": integer 1-10 or null,
  "confidence_pct": integer 0-100 representing your confidence in the overall assessment or null,
  "description": string or null,
  "lane_blocked": boolean or null,
  "immediate_risk_to_cyclists": boolean or null,
  "visible_vehicle": boolean or null,
  "visible_debris": boolean or null,
  "recommended_department": string or null,
  "recommended_action": string or null,
  "privacy_flags": array of strings or null,
  "confidence_notes": string or null,
  "human_review_required": boolean or null
}

Privacy rules (strictly enforced):
- Do NOT identify any people in the image
- Do NOT transcribe any license plates
- If any faces or license plates are visible, add them to privacy_flags (e.g. ["face_detected", "license_plate_detected"])
- Never include personally identifiable information in any field

Guidelines:
- Base your assessment on what is actually visible in the image
- If you cannot determine a field, set it to null
- urgency_score: 1 = very low urgency, 10 = immediate danger
- confidence_pct: 100 = completely certain about the hazard type and severity; lower values indicate uncertainty
- recommended_department: suggest the relevant city department (e.g. "Public Works", "Traffic Engineering", "Police", "Sanitation")
- human_review_required: set to true if you are uncertain, if privacy flags are present, or if the hazard poses immediate risk
- confidence_notes: describe your confidence level and any ambiguities in the image
`.trim();

const MAX_IMAGE_STORE_BYTES = 5 * 1024 * 1024;

router.post("/analyze-hazard", uploadMiddleware, async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "image is required" });
    return;
  }

  const base64Image = req.file.buffer.toString("base64");
  const mimeType = req.file.mimetype;

  try {
    const completion = await getClient().chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: TRIAGE_PROMPT(),
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: "high",
              },
            },
          ],
        },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content?.trim() ?? "";

    let parsed: unknown;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawContent);
    } catch {
      req.log.error({ rawContent }, "Failed to parse AI JSON response");
      res.status(502).json({ error: "AI returned invalid JSON" });
      return;
    }

    const validated = StrictAnalyzeHazardResponse.safeParse(parsed);
    if (!validated.success) {
      req.log.error(
        { errors: validated.error.errors, parsed },
        "AI response failed Zod validation",
      );
      res.status(502).json({ error: "AI response did not match expected schema" });
      return;
    }

    const storedImage =
      req.file.buffer.byteLength <= MAX_IMAGE_STORE_BYTES
        ? `data:${mimeType};base64,${base64Image}`
        : null;

    let reportId: number | null = null;
    try {
      const location =
        typeof req.body?.location === "string" && req.body.location.trim()
          ? req.body.location.trim()
          : null;

      const inserted = await db
        .insert(hazardReportsTable)
        .values({
          hazardType: validated.data.hazard_type ?? "Unknown",
          triageData: validated.data as Record<string, unknown>,
          imageBase64: storedImage,
          location,
        })
        .returning({ id: hazardReportsTable.id });
      reportId = inserted[0]?.id ?? null;
    } catch (err) {
      req.log.error({ err }, "Failed to save hazard report to DB");
    }

    res.json({ ...validated.data, _report_id: reportId });
  } catch (err) {
    req.log.error({ err }, "OpenAI hazard analysis failed");
    res.status(502).json({ error: "Failed to analyze hazard image" });
  }
});

router.patch("/hazard-report/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid report ID" });
    return;
  }

  const location =
    typeof req.body?.location === "string" && req.body.location.trim()
      ? req.body.location.trim()
      : undefined;

  const reporterDescription =
    typeof req.body?.description === "string" && req.body.description.trim()
      ? req.body.description.trim()
      : undefined;

  try {
    const existing = await db
      .select({ triageData: hazardReportsTable.triageData })
      .from(hazardReportsTable)
      .where(eq(hazardReportsTable.id, id))
      .limit(1);

    if (!existing.length) {
      res.status(404).json({ error: "Report not found" });
      return;
    }

    const mergedTriage = {
      ...(existing[0].triageData as Record<string, unknown>),
      ...(reporterDescription ? { reporter_description: reporterDescription } : {}),
    };

    await db
      .update(hazardReportsTable)
      .set({
        ...(location !== undefined ? { location } : {}),
        triageData: mergedTriage,
      })
      .where(eq(hazardReportsTable.id, id));

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to update hazard report");
    res.status(500).json({ error: "Failed to update report" });
  }
});

export default router;
