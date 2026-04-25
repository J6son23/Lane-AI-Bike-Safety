import { jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const hazardReportsTable = pgTable("hazard_reports", {
  id: serial("id").primaryKey(),
  hazardType: text("hazard_type").notNull(),
  triageData: jsonb("triage_data").notNull(),
  imageBase64: text("image_base64"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertHazardReportSchema = createInsertSchema(
  hazardReportsTable,
).omit({ id: true, createdAt: true });

export type InsertHazardReport = z.infer<typeof insertHazardReportSchema>;
export type HazardReport = typeof hazardReportsTable.$inferSelect;
