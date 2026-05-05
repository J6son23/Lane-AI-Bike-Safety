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

router.post("/ai/summarize", async (req, res) => {
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
- Bullet 1: The type of issue — classify using these exact rules:
  * "Type: Damage" — structural damage to the road surface (potholes, cracking, broken pavement), OR large immovable objects such as fallen trees or boulders that cannot be removed even by a crew.
  * "Type: Obstruction" — any object, vehicle, or debris on the lane that CAN be removed (even if it takes a city crew or group of people): parked/abandoned cars, dumped furniture, garbage bags, construction materials, shopping carts, small debris, etc. Trees and boulders are NOT obstructions.
  * "Type: Damage & Obstruction" — only if both clearly apply (e.g. a vehicle crash that also damaged the road surface).
- Bullet 2-3: Key context from the description (location detail, severity, what is affected, etc.)
Return ONLY a JSON array of strings, e.g. ["Type: Obstruction", "Abandoned vehicle blocking bike lane", "Reported near intersection"].
No markdown, no explanation — just the raw JSON array.`;

  try {
    const client = getClient();
    const completion = await client.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: description },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content?.trim() ?? "";
    let bullets: string[] = [];
    try {
      // Strip markdown code fences if present
      const cleaned = rawContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        bullets = parsed.slice(0, 3).map((b) => String(b));
      }
    } catch {
      // Fallback: extract lines that look like bullet content
      const lines = rawContent.split("\n").map((l) => l.replace(/^[-•*\d.]+\s*/, "").trim()).filter(Boolean);
      bullets = lines.slice(0, 3);
    }

    res.json({ bullets });
  } catch (err) {
    req.log.error({ err }, "AI summarize failed");
    res.status(500).json({ error: "AI unavailable" });
  }
});

export default router;
