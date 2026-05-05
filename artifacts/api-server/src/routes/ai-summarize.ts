import { Router, type IRouter } from "express";
import OpenAI from "openai";
import * as zod from "zod";

const router: IRouter = Router();

function getClient() {
  return new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
}

const BodySchema = zod.object({
  description: zod.string().min(1).max(1000),
  reportType: zod.enum(["dumping", "hazard"]),
});

router.post("/api/ai/summarize", async (req, res) => {
  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { description, reportType } = parsed.data;

  const typeContext =
    reportType === "dumping"
      ? "illegal dumping or bike lane obstruction report"
      : "bike lane hazard or damage report";

  const systemPrompt = `You are a city public-works assistant that summarizes citizen ${typeContext}s.
Given the user's free-text description, produce exactly 2-3 concise bullet points:
- Bullet 1: The type of issue (must be one of: Damage, Obstruction, or both — e.g. "Type: Obstruction")
- Bullet 2-3: Key context from the description (location detail, severity, what is affected, etc.)
Return ONLY a JSON array of strings, e.g. ["Type: Obstruction", "Abandoned vehicle blocking bike lane", "Reported near intersection"].
No markdown, no explanation — just the raw JSON array.`;

  try {
    const client = getClient();
    const completion = await client.chat.completions.create({
      model: "gpt-5-nano",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: description },
      ],
      max_tokens: 150,
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "[]";
    let bullets: string[] = [];
    try {
      bullets = JSON.parse(raw);
      if (!Array.isArray(bullets)) bullets = [];
      bullets = bullets.slice(0, 3).map((b) => String(b));
    } catch {
      bullets = [];
    }

    res.json({ bullets });
  } catch (err) {
    req.log.error({ err }, "AI summarize failed");
    res.status(500).json({ error: "AI unavailable" });
  }
});

export default router;
