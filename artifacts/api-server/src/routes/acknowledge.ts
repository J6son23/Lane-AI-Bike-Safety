import { Router, type IRouter } from "express";
import OpenAI from "openai";

const router: IRouter = Router();

const client = new OpenAI({ apiKey: process.env["OPENAI_API_KEY"] });

router.post("/acknowledge", async (req, res) => {
  const { name, wasteType, description } = req.body ?? {};

  if (typeof description !== "string" || !description.trim()) {
    res.status(400).json({ error: "description is required" });
    return;
  }

  const userContent = [
    name ? `Resident name: ${name}` : "Resident name: (not provided)",
    `Type of waste: ${wasteType ?? "Unspecified"}`,
    `Description: ${description}`,
  ].join("\n");

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant for the City of San Jose 311 service. " +
            "Write a 2-sentence acknowledgment of a resident illegal dumping report. " +
            "Be professional and empathetic. Address the resident by name if provided.",
        },
        { role: "user", content: userContent },
      ],
    });

    const message = completion.choices[0]?.message?.content?.trim() ?? "";
    res.json({ message });
  } catch (err) {
    req.log.error({ err }, "OpenAI acknowledgment failed");
    res.status(502).json({ error: "Failed to generate acknowledgment" });
  }
});

export default router;
