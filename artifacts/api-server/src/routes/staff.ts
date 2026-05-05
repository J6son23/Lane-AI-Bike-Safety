import { Router, type IRouter, type RequestHandler } from "express";
import { db, dumpingReportsTable, hazardReportsTable } from "@workspace/db";
import { desc, eq, isNull, ne, or } from "drizzle-orm";

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

router.post("/staff/login", (req, res) => {
  const { password } = req.body ?? {};
  if (!STAFF_PASSWORD || password !== STAFF_PASSWORD) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }
  res.json({ ok: true });
});

router.get("/staff/reports", requireAuth, async (req, res) => {
  try {
    const [dumping, hazard] = await Promise.all([
      db
        .select()
        .from(dumpingReportsTable)
        .where(or(isNull(dumpingReportsTable.closedStatus), ne(dumpingReportsTable.closedStatus, "Closed and Resolved")))
        .orderBy(desc(dumpingReportsTable.createdAt)),
      db
        .select()
        .from(hazardReportsTable)
        .where(or(isNull(hazardReportsTable.closedStatus), ne(hazardReportsTable.closedStatus, "Closed and Resolved")))
        .orderBy(desc(hazardReportsTable.createdAt)),
    ]);

    const dumpingMapped = dumping.map((r) => ({
      id: `dumping-${r.id}`,
      type: "dumping" as const,
      caseNumber: r.caseNumber,
      reporterName: r.reporterName,
      location: r.location,
      wasteType: r.wasteType,
      description: r.description,
      ackMessage: r.ackMessage,
      photoBase64: r.photoBase64,
      closedStatus: r.closedStatus,
      aiSummary: r.aiSummary ? (() => { try { return JSON.parse(r.aiSummary as string) as string[]; } catch { return null; } })() : null,
      createdAt: r.createdAt,
    }));

    const hazardMapped = hazard.map((r) => ({
      id: `hazard-${r.id}`,
      type: "hazard" as const,
      caseNumber: r.caseNumber ?? null,
      hazardType: r.hazardType,
      location: r.location ?? null,
      triageData: r.triageData,
      imageBase64: r.imageBase64,
      dispatchedAt: r.dispatchedAt,
      dispatchedTo: r.dispatchedTo,
      closedStatus: r.closedStatus,
      createdAt: r.createdAt,
    }));

    const all = [...dumpingMapped, ...hazardMapped].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    res.json({ reports: all });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch staff reports");
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

router.post("/staff/close-report", requireAuth, async (req, res) => {
  const { id, status } = req.body ?? {};
  if (!id || !["resolved", "unresolved"].includes(status)) {
    res.status(400).json({ error: "id and status (resolved|unresolved) are required" });
    return;
  }

  const closedStatus = status === "resolved" ? "Closed and Resolved" : "Closed and Unresolved";

  try {
    if (typeof id === "string" && id.startsWith("dumping-")) {
      const numericId = Number(id.slice("dumping-".length));
      await db
        .update(dumpingReportsTable)
        .set({ closedStatus })
        .where(eq(dumpingReportsTable.id, numericId));
    } else if (typeof id === "string" && id.startsWith("hazard-")) {
      const numericId = Number(id.slice("hazard-".length));
      await db
        .update(hazardReportsTable)
        .set({ closedStatus })
        .where(eq(hazardReportsTable.id, numericId));
    } else {
      res.status(400).json({ error: "Invalid report id format" });
      return;
    }
    res.json({ ok: true, closedStatus });
  } catch (err) {
    req.log.error({ err }, "Failed to close report");
    res.status(500).json({ error: "Failed to close report" });
  }
});

router.post("/staff/set-in-progress", requireAuth, async (req, res) => {
  const { id } = req.body ?? {};
  if (!id) {
    res.status(400).json({ error: "id is required" });
    return;
  }
  try {
    if (typeof id === "string" && id.startsWith("dumping-")) {
      const numericId = Number(id.slice("dumping-".length));
      await db.update(dumpingReportsTable).set({ closedStatus: "In Progress" }).where(eq(dumpingReportsTable.id, numericId));
    } else if (typeof id === "string" && id.startsWith("hazard-")) {
      const numericId = Number(id.slice("hazard-".length));
      await db.update(hazardReportsTable).set({ closedStatus: "In Progress" }).where(eq(hazardReportsTable.id, numericId));
    } else {
      res.status(400).json({ error: "Invalid report id format" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to set report in progress");
    res.status(500).json({ error: "Failed to update report" });
  }
});

router.delete("/staff/purge-resolved", requireAuth, async (req, res) => {
  try {
    await Promise.all([
      db.delete(dumpingReportsTable).where(eq(dumpingReportsTable.closedStatus, "Closed and Resolved")),
      db.delete(hazardReportsTable).where(eq(hazardReportsTable.closedStatus, "Closed and Resolved")),
    ]);
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to purge resolved reports");
    res.status(500).json({ error: "Failed to purge resolved reports" });
  }
});

router.post("/staff/save-ai-summary", requireAuth, async (req, res) => {
  const { id, bullets } = req.body ?? {};
  if (!id || !Array.isArray(bullets)) {
    res.status(400).json({ error: "id and bullets[] are required" });
    return;
  }
  if (!id.startsWith("dumping-")) {
    res.status(400).json({ error: "Only dumping reports support AI summary caching" });
    return;
  }
  const numericId = Number(id.slice("dumping-".length));
  try {
    await db
      .update(dumpingReportsTable)
      .set({ aiSummary: JSON.stringify(bullets) })
      .where(eq(dumpingReportsTable.id, numericId));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to save AI summary");
    res.status(500).json({ error: "Failed to save summary" });
  }
});

router.delete("/staff/delete-report/:id", requireAuth, async (req, res) => {
  const id = String(req.params["id"] ?? "");
  try {
    if (id.startsWith("dumping-")) {
      const numericId = Number(id.slice("dumping-".length));
      await db.delete(dumpingReportsTable).where(eq(dumpingReportsTable.id, numericId));
    } else if (id.startsWith("hazard-")) {
      const numericId = Number(id.slice("hazard-".length));
      await db.delete(hazardReportsTable).where(eq(hazardReportsTable.id, numericId));
    } else {
      res.status(400).json({ error: "Invalid report id format" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete report");
    res.status(500).json({ error: "Failed to delete report" });
  }
});

export default router;
