import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { db, dumpingReportsTable } from "@workspace/db";

const router: IRouter = Router();

function getClient() {
  return new OpenAI({
    apiKey: process.env["OPENAI_API_KEY1"] ?? process.env["OPENAI_API_KEY"],
  });
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

router.post("/acknowledge", async (req, res) => {
  const { name, wasteType, description, location, caseNumber, photoBase64 } =
    req.body ?? {};

  if (typeof description !== "string" || !description.trim()) {
    res.status(400).json({ error: "description is required" });
    return;
  }

  const userContent = [
    name ? `Resident name: ${name}` : "Resident name: (not provided)",
    location ? `Location: ${location}` : "",
    `Description: ${description}`,
  ].filter(Boolean).join("\n");

  let message = "";
  try {
    const completion = await getClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant for the City of San Jose 311 service. " +
            "Write a 2-sentence acknowledgment of a resident bike lane obstruction report. " +
            "Be professional and empathetic. Address the resident by name if provided. " +
            "Confirm the report has been received and that city crews will investigate.",
        },
        { role: "user", content: userContent },
      ],
    });

    message = completion.choices[0]?.message?.content?.trim() ?? "";
  } catch (err) {
    req.log.error({ err }, "OpenAI acknowledgment failed");
    res.status(502).json({ error: "Failed to generate acknowledgment" });
    return;
  }

  if (
    typeof location === "string" &&
    location.trim() &&
    typeof caseNumber === "string" &&
    caseNumber.trim()
  ) {
    try {
      const storedPhoto =
        typeof photoBase64 === "string" &&
        Buffer.byteLength(photoBase64, "utf8") <= MAX_PHOTO_BYTES
          ? photoBase64
          : null;

      await db.insert(dumpingReportsTable).values({
        caseNumber: caseNumber.trim(),
        reporterName: typeof name === "string" && name.trim() ? name.trim() : null,
        location: location.trim(),
        wasteType: typeof wasteType === "string" ? wasteType : "Unspecified",
        description: description.trim(),
        ackMessage: message,
        photoBase64: storedPhoto,
      });
    } catch (err) {
      req.log.error({ err }, "Failed to save dumping report to DB");
    }
  }

  res.json({ message });
});

export default router;
