import { fetchBlogHtml, fetchRobotsTxt, parseHtmlAndAnalyze } from "./_seo-core.js";

export default async function handler(req: any, res: any) {
  // Support POST requests as expected by the frontend
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "Blog URL is required." });
  }

  try {
    const html = await fetchBlogHtml(url);
    const robotsTxt = await fetchRobotsTxt(url);
    const analysis = parseHtmlAndAnalyze(html, url, robotsTxt);
    return res.json({ analysis });
  } catch (err: any) {
    console.error("Analysis failed:", err);
    return res.status(err.status || 500).json({
      error: err.message || "Failed to analyze blog SEO.",
      errorType: err.type || "failed",
    });
  }
}
