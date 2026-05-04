import { Router, type IRouter } from "express";
import { db, hazardReportsTable } from "@workspace/db";

const router: IRouter = Router();

function generateCaseNumber(): string {
  return `SJA-${Math.floor(100000 + Math.random() * 900000)}`;
}

router.post("/pedal-patrol/report", async (req, res) => {
  const { category, severity, label, direction, location, createdAt } =
    req.body ?? {};

  if (typeof location !== "string" || !location.trim()) {
    res.status(400).json({ error: "location is required" });
    return;
  }

  if (typeof category !== "string" || !category.trim()) {
    res.status(400).json({ error: "category is required" });
    return;
  }

  const hazardType =
    typeof label === "string" && label.trim()
      ? label.trim()
      : category.trim();

  const fullLocation =
    typeof direction === "string" && direction.trim()
      ? `${direction} on ${location.trim()}`
      : location.trim();

  const triageData: Record<string, unknown> = {
    source: "pedal-patrol-watch",
    category: category ?? null,
    severity: severity ?? null,
    label: label ?? null,
    direction: direction ?? null,
    reported_at: createdAt ?? new Date().toISOString(),
  };

  const caseNumber = generateCaseNumber();

  try {
    const inserted = await db
      .insert(hazardReportsTable)
      .values({
        caseNumber,
        hazardType,
        triageData,
        location: fullLocation,
        imageBase64: null,
      })
      .returning({ id: hazardReportsTable.id });

    const reportId = inserted[0]?.id ?? null;
    req.log.info({ reportId, caseNumber, hazardType, location: fullLocation }, "Pedal Patrol report saved");
    res.json({ ok: true, reportId, caseNumber });
  } catch (err) {
    req.log.error({ err }, "Failed to save Pedal Patrol report");
    res.status(500).json({ error: "Failed to save report" });
  }
});

export default router;
