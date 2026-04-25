import { Router, type IRouter, type RequestHandler } from "express";
import { db, dumpingReportsTable, hazardReportsTable } from "@workspace/db";
import { desc } from "drizzle-orm";

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
        .orderBy(desc(dumpingReportsTable.createdAt)),
      db
        .select()
        .from(hazardReportsTable)
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
      createdAt: r.createdAt,
    }));

    const hazardMapped = hazard.map((r) => ({
      id: `hazard-${r.id}`,
      type: "hazard" as const,
      hazardType: r.hazardType,
      triageData: r.triageData,
      imageBase64: r.imageBase64,
      dispatchedAt: r.dispatchedAt,
      dispatchedTo: r.dispatchedTo,
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

export default router;
