import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const dumpingReportsTable = pgTable("dumping_reports", {
  id: serial("id").primaryKey(),
  caseNumber: text("case_number").notNull(),
  reporterName: text("reporter_name"),
  location: text("location").notNull(),
  wasteType: text("waste_type").notNull(),
  description: text("description").notNull(),
  ackMessage: text("ack_message"),
  photoBase64: text("photo_base64"),
  closedStatus: text("closed_status"),
  aiSummary: text("ai_summary"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertDumpingReportSchema = createInsertSchema(
  dumpingReportsTable,
).omit({ id: true, createdAt: true });

export type InsertDumpingReport = z.infer<typeof insertDumpingReportSchema>;
export type DumpingReport = typeof dumpingReportsTable.$inferSelect;
