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
    let statusCode = 500;
    const status = err.status || err.statusCode;
    if (typeof status === "number" && status >= 100 && status <= 599) {
      statusCode = status;
    } else if (typeof status === "string") {
      const parsed = parseInt(status, 10);
      if (!isNaN(parsed) && parsed >= 100 && parsed <= 599) {
        statusCode = parsed;
      }
    }
    return res.status(statusCode).json({
      error: err.message || "Failed to analyze blog SEO.",
      errorType: err.type || "failed",
    });
  }
}
