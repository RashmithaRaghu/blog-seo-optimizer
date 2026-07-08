import { fetchBlogHtml, fetchRobotsTxt, fetchPageSpeedData, parseHtmlAndAnalyze } from "./_seo-core.js";

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
    const [html, robotsTxt, pageSpeedData] = await Promise.all([
      fetchBlogHtml(url),
      fetchRobotsTxt(url),
      fetchPageSpeedData(url).catch(() => null), // gracefully swallow PageSpeed fetch error to avoid breaking main flow
    ]);
    const analysis = await parseHtmlAndAnalyze(html, url, robotsTxt, pageSpeedData);
    return res.json({ analysis });
  } catch (err: any) {
    console.error("Analysis failed:", err);
    return res.status(err.status || 500).json({
      error: err.message || "Failed to analyze blog SEO.",
      errorType: err.type || "failed",
    });
  }
}
