import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/geocode", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q || q.length < 3) {
    res.json([]);
    return;
  }

  try {
    const query = encodeURIComponent(`${q}, San Jose, CA`);
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&addressdetails=1&limit=6&countrycodes=us`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "SanJoseDumpingReport/1.0 (contact@example.com)",
        "Accept": "application/json",
        "Accept-Language": "en",
      },
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("json")) {
      const text = await response.text();
      req.log.warn({ status: response.status, body: text.slice(0, 200) }, "Geocode upstream returned non-JSON");
      res.json([]);
      return;
    }
    const data = (await response.json()) as { display_name: string; place_id: number; lat: string; lon: string }[];
    res.json(
      data.slice(0, 6).map((r) => ({
        display_name: r.display_name,
        place_id: r.place_id,
        lat: r.lat,
        lon: r.lon,
      })),
    );
  } catch (err) {
    req.log.warn({ err }, "Geocode proxy failed");
    res.json([]);
  }
});

export default router;
