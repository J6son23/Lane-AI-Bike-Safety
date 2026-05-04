import { Router, type IRouter } from "express";
import { db, dumpingReportsTable, hazardReportsTable } from "@workspace/db";
import { isNotNull } from "drizzle-orm";

const router: IRouter = Router();

function deriveStatus(
  dispatchedAt: string | null | Date | undefined,
  closedStatus: string | null | undefined,
): "Reported" | "In Progress" | "Resolved" | "Unresolved" {
  if (closedStatus === "Closed and Resolved") return "Resolved";
  if (closedStatus === "Closed and Unresolved") return "Unresolved";
  if (closedStatus === "In Progress" || dispatchedAt) return "In Progress";
  return "Reported";
}

router.get("/reports/map", async (req, res) => {
  try {
    const [dumping, hazard] = await Promise.all([
      db
        .select({
          id: dumpingReportsTable.id,
          location: dumpingReportsTable.location,
          description: dumpingReportsTable.description,
          closedStatus: dumpingReportsTable.closedStatus,
          createdAt: dumpingReportsTable.createdAt,
        })
        .from(dumpingReportsTable),
      db
        .select({
          id: hazardReportsTable.id,
          location: hazardReportsTable.location,
          hazardType: hazardReportsTable.hazardType,
          triageData: hazardReportsTable.triageData,
          dispatchedAt: hazardReportsTable.dispatchedAt,
          closedStatus: hazardReportsTable.closedStatus,
          createdAt: hazardReportsTable.createdAt,
        })
        .from(hazardReportsTable)
        .where(isNotNull(hazardReportsTable.location)),
    ]);

    const dumpingMapped = dumping.map((r) => ({
      id: `dumping-${r.id}`,
      type: "dumping" as const,
      location: r.location,
      description: r.description,
      status: deriveStatus(null, r.closedStatus),
    }));

    const hazardMapped = hazard
      .filter((r) => r.location !== null)
      .map((r) => {
        const td = r.triageData as Record<string, unknown>;
        const description = (td["description"] as string | null) ?? r.hazardType;
        return {
          id: `hazard-${r.id}`,
          type: "hazard" as const,
          location: r.location as string,
          description,
          status: deriveStatus(r.dispatchedAt, r.closedStatus),
        };
      });

    const all = [...dumpingMapped, ...hazardMapped].sort(
      (a, b) => a.id.localeCompare(b.id),
    );

    res.json({ reports: all });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch reports map");
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

export default router;
