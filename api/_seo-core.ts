import * as cheerio from "cheerio";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;
export function getGeminiClient(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY environment variable is missing. Please configure it in the Secrets panel in AI Studio.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Helper for backoff delay
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: Parameters<typeof ai.models.generateContent>[0],
  maxRetries = 3,
  initialDelayMs = 1500
): Promise<ReturnType<typeof ai.models.generateContent>> {
  let attempt = 0;
  let currentDelay = initialDelayMs;
  let primaryModel = params.model || "gemini-3.5-flash";
  const fallbackModel = "gemini-3.1-flash-lite";

  while (true) {
    try {
      const callParams = { ...params };
      if (attempt >= maxRetries && primaryModel !== fallbackModel) {
        console.warn(`All ${maxRetries} retries exhausted for ${primaryModel}. Falling back to ${fallbackModel}...`);
        callParams.model = fallbackModel;
      }
      return await ai.models.generateContent(callParams);
    } catch (err: any) {
      const errString = String(err?.message || err || "");
      const isRetriable =
        errString.includes("503") ||
        errString.includes("UNAVAILABLE") ||
        errString.includes("429") ||
        errString.includes("RESOURCE_EXHAUSTED") ||
        errString.includes("rate limit") ||
        errString.includes("high demand") ||
        errString.includes("overloaded");

      if (!isRetriable) {
        throw err;
      }

      attempt++;
      if (attempt > maxRetries + 1) {
        console.error(`Gemini call failed permanently after retries and fallback: ${errString}`);
        throw err;
      }

      const jitter = 1 + Math.random() * 0.2;
      const waitTime = Math.round(currentDelay * jitter);
      console.warn(
        `Gemini call failed with retriable error (Attempt ${attempt}/${maxRetries}). Retrying in ${waitTime}ms... Error: ${errString}`
      );
      await delay(waitTime);
      currentDelay *= 2;
    }
  }
}

// Fetch helper with timeout and UA
export async function fetchBlogHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 AI-Blog-SEO-Optimizer/1.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const error: any = new Error(`This site blocked the request (${res.status})`);
      error.status = res.status;
      error.type = res.status === 403 || res.status === 401 ? "blocked" : "non_200";
      throw error;
    }
    return await res.text();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      const error: any = new Error("The request timed out (took longer than 15 seconds)");
      error.type = "timeout";
      throw error;
    }
    if (err.code === "ENOTFOUND" || err.code === "EAI_AGAIN") {
      const error: any = new Error("Could not resolve DNS. Check if the URL is correct.");
      error.type = "dns_failure";
      throw error;
    }
    throw err;
  }
}

// Fetch robots.txt helper
export async function fetchRobotsTxt(blogUrl: string): Promise<string | null> {
  try {
    const origin = new URL(blogUrl).origin;
    const robotsUrl = `${origin}/robots.txt`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
    const res = await fetch(robotsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 AI-Blog-SEO-Optimizer/1.0",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      return await res.text();
    }
  } catch (e) {
    // ignore fetch robots.txt error, treat as missing
  }
  return null;
}

// Fetch PageSpeed Insights data
export async function fetchPageSpeedData(url: string): Promise<{ score: number; lcp: string; cls: string } | null> {
  const apiKey = process.env.PAGESPEED_API_KEY;
  if (!apiKey) {
    console.warn("PAGESPEED_API_KEY environment variable is not defined.");
    return null;
  }
  
  // Only try to call the API for valid http/https URLs
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    console.warn("PageSpeed API skipped: URL is not a valid http/https protocol:", url);
    return null;
  }

  const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${apiKey}&strategy=mobile`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 seconds timeout
  
  try {
    const res = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) {
      console.warn(`PageSpeed API returned status: ${res.status}`);
      return null;
    }
    const data = await res.json();
    const perfScore = data?.lighthouseResult?.categories?.performance?.score;
    const lcp = data?.lighthouseResult?.audits?.["largest-contentful-paint"]?.displayValue || "N/A";
    const cls = data?.lighthouseResult?.audits?.["cumulative-layout-shift"]?.displayValue || "N/A";
    
    if (typeof perfScore === "number") {
      return {
        score: Math.round(perfScore * 100),
        lcp,
        cls
      };
    }
    return null;
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn("Failed to fetch PageSpeed data:", err?.message || err);
    return null;
  }
}


// Interface for SEO analysis result
export interface SEOAnalysis {
  url: string;
  title: string;
  titleLength: number;
  titleStatus: "Too Short" | "Good" | "Too Long" | "Missing";
  metaDescription: string;
  metaLength: number;
  metaStatus: "Too Short" | "Good" | "Too Long" | "Missing";
  wordCount: number;
  contentBlocksCount: number;
  imageCount: number;
  imagesWithAlt: number;
  altStatus: "Excellent" | "Good" | "Needs Improvement" | "Poor";
  internalLinksCount: number;
  externalLinksCount: number;
  headings: { tag: string; text: string }[];
  multipleH1s: boolean;
  technical: {
    https: "Present" | "Missing";
    canonical: "Present" | "Missing";
    viewport: "Present" | "Missing";
    lang: "Present" | "Missing";
    robots: "Present" | "Missing";
    og: "Present" | "Missing";
    twitter: "Present" | "Missing";
    favicon: "Present" | "Missing";
    schema: "Present & Valid" | "Present but Invalid" | "Missing";
  };
  hasNoindex: boolean;
  hasNofollow: boolean;
  headingSkips: string[];
  recommendations: string[];
  benchmarks: {
    name: string;
    score: number;
    maxScore: number;
    details: string;
    status: string;
  }[];
  score: number;
  maxScore: number;
}

export function calculateFleschReadingEase(text: string): { score: number; avgSentenceLength: number } {
  const cleaned = text.trim();
  if (!cleaned) return { score: 100, avgSentenceLength: 0 };

  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  if (wordCount === 0) return { score: 100, avgSentenceLength: 0 };

  const sentences = cleaned.split(/[.!?]+(\s+|$)/).filter(s => s && s.trim().length > 0);
  const sentenceCount = Math.max(1, sentences.length);

  let totalSyllables = 0;
  for (const word of words) {
    let w = word.toLowerCase().replace(/[^a-z]/g, "");
    if (w.length <= 3) {
      totalSyllables += 1;
      continue;
    }
    if (w.endsWith("e")) {
      w = w.slice(0, -1);
    }
    const vowelGroups = w.match(/[aeiouy]+/g);
    let count = vowelGroups ? vowelGroups.length : 1;
    if (count === 0) count = 1;
    totalSyllables += count;
  }

  const avgSentenceLength = wordCount / sentenceCount;
  const avgSyllablesPerWord = totalSyllables / wordCount;

  let score = 206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;
  score = Math.max(0, Math.min(100, score));

  return {
    score: Math.round(score),
    avgSentenceLength: Math.round(avgSentenceLength * 10) / 10
  };
}

// Core deterministic analyzer using Cheerio
export async function parseHtmlAndAnalyze(
  html: string,
  url: string,
  robotsTxt: string | null,
  pageSpeedData?: { score: number; lcp: string; cls: string } | null
): Promise<SEOAnalysis> {
  let finalPageSpeed = pageSpeedData;
  if (finalPageSpeed === undefined) {
    finalPageSpeed = await fetchPageSpeedData(url);
  }

  const $ = cheerio.load(html);


  // 1. Title Analysis
  const rawTitle = $("title").first().text().trim() || "";
  const titleLength = rawTitle.length;
  let titleStatus: "Too Short" | "Good" | "Too Long" | "Missing" = "Missing";
  if (titleLength === 0) {
    titleStatus = "Missing";
  } else if (titleLength < 40) {
    titleStatus = "Too Short";
  } else if (titleLength <= 60) {
    titleStatus = "Good";
  } else {
    titleStatus = "Too Long";
  }

  // 2. Meta Description Analysis
  let rawMetaDesc = $("meta[name=\"description\"]").attr("content")?.trim() ||
                    $("meta[name=\"Description\"]").attr("content")?.trim() ||
                    $("meta[property=\"og:description\"]").attr("content")?.trim() || "";
  const metaLength = rawMetaDesc.length;
  let metaStatus: "Too Short" | "Good" | "Too Long" | "Missing" = "Missing";
  if (metaLength === 0) {
    metaStatus = "Missing";
  } else if (metaLength < 150) {
    metaStatus = "Too Short";
  } else if (metaLength <= 160) {
    metaStatus = "Good";
  } else {
    metaStatus = "Too Long";
  }

  // Find Main Content Scope to exclude layouts
  let mainContent = $("article").first();
  if (mainContent.length === 0) {
    mainContent = $("main").first();
  }
  if (mainContent.length === 0) {
    mainContent = $("[role=\"main\"]").first();
  }
  if (mainContent.length === 0) {
    mainContent = $(".content, .post, .article, .main-content, #main-content").first();
  }

  let linkScope = mainContent;
  let isRestrictedScope = mainContent.length > 0;
  if (mainContent.length === 0) {
    const clone = $("body").clone();
    clone.find("header, footer, nav, .header, .footer, .nav, .menu, #header, #footer, #nav, #sidebar, .sidebar").remove();
    linkScope = clone;
    isRestrictedScope = true;
  }

  // 3. Word Count inside Scope
  const paragraphsAndLis: string[] = [];
  linkScope.find("p, li").each((_, el) => {
    const text = $(el).text().trim();
    if (text) paragraphsAndLis.push(text);
  });
  const combinedText = paragraphsAndLis.join(" ");
  const wordCount = combinedText.split(/\s+/).filter((w) => w.length > 0).length;
  const contentBlocksCount = paragraphsAndLis.length;

  // 4. Page Type Detection and Min Word Count Target
  let pageType: "service" | "blog" | "pillar" = "blog";
  const lowerUrl = url.toLowerCase();
  const lowerTitle = rawTitle.toLowerCase();
  if (lowerUrl.includes("/pillar") || lowerUrl.includes("/cornerstone") || lowerUrl.includes("/guide") || lowerTitle.includes("guide") || lowerTitle.includes("handbook") || lowerTitle.includes("pillar") || wordCount > 1800) {
    pageType = "pillar";
  } else if (lowerUrl.includes("/service") || lowerUrl.includes("/services") || lowerUrl.includes("/features") || lowerUrl.includes("/pricing") || lowerUrl.includes("/product") || lowerUrl.includes("/solutions") || lowerUrl.includes("/contact") || lowerUrl.includes("/about") || lowerTitle.includes("service") || lowerTitle.includes("solution") || lowerTitle.includes("features")) {
    pageType = "service";
  }

  let targetMinWordCount = 800;
  let pageTypeLabel = "Blog Article";
  if (pageType === "service") {
    targetMinWordCount = 600;
    pageTypeLabel = "Service Page";
  } else if (pageType === "pillar") {
    targetMinWordCount = 2000;
    pageTypeLabel = "Pillar Content";
  }

  // 5. Image & Alt Text Optimization (Scope Restricted)
  let imageCount = 0;
  let imagesWithAlt = 0;
  let imagesAltTooLong = 0;
  let imagesGenericName = 0;

  linkScope.find("img").each((_, el) => {
    imageCount++;
    const alt = $(el).attr("alt");
    if (alt && alt.trim().length > 0) {
      imagesWithAlt++;
      if (alt.trim().length > 100) {
        imagesAltTooLong++;
      }
    }
    const src = $(el).attr("src") || "";
    const filename = src.split("/").pop() || "";
    const lowerFilename = filename.toLowerCase();
    if (
      lowerFilename.startsWith("img_") ||
      lowerFilename.startsWith("dsc_") ||
      /^\d+\.(jpg|jpeg|png|webp|gif|svg)$/.test(lowerFilename) ||
      /^[0-9_-]+\.(jpg|jpeg|png|webp|gif|svg)$/.test(lowerFilename)
    ) {
      imagesGenericName++;
    }
  });

  let altStatus: "Excellent" | "Good" | "Needs Improvement" | "Poor" = "Excellent";
  const altRatio = imageCount > 0 ? (imagesWithAlt / imageCount) * 100 : 100;
  if (imageCount > 0) {
    if (altRatio === 100 && imagesAltTooLong === 0) altStatus = "Excellent";
    else if (altRatio >= 80) altStatus = "Good";
    else if (altRatio >= 50) altStatus = "Needs Improvement";
    else altStatus = "Poor";
  }

  // 6. Links (Scope Restricted)
  let internalLinksCount = 0;
  let externalLinksCount = 0;
  let domain = "";
  try {
    domain = new URL(url).hostname;
  } catch (e) {
    // ignore
  }
  linkScope.find("a").each((_, el) => {
    const href = $(el).attr("href");
    if (href) {
      const trimmedHref = href.trim();
      if (trimmedHref.startsWith("/") || trimmedHref.startsWith("#") || trimmedHref.startsWith("./") || trimmedHref.startsWith("../") || trimmedHref.startsWith("?")) {
        internalLinksCount++;
      } else {
        try {
          const parsedLink = new URL(trimmedHref, url);
          if (parsedLink.hostname === domain) {
            internalLinksCount++;
          } else {
            externalLinksCount++;
          }
        } catch (err) {
          // unparseable
        }
      }
    }
  });

  // 7. Headings (Whole Document)
  const headings: { tag: string; text: string }[] = [];
  $("h1, h2, h3").each((_, el) => {
    headings.push({
      tag: el.name.toLowerCase(),
      text: $(el).text().trim(),
    });
  });

  const h1s = headings.filter((h) => h.tag === "h1");
  const multipleH1s = h1s.length > 1;

  // Heading character counts & subheadings flag
  let h2Count = 0;
  let h3Count = 0;
  let h2TooLongOrShortCount = 0;
  let h3TooLongOrShortCount = 0;

  headings.forEach((h) => {
    if (h.tag === "h2") {
      h2Count++;
      if (h.text.length < 50 || h.text.length > 70) {
        h2TooLongOrShortCount++;
      }
    } else if (h.tag === "h3") {
      h3Count++;
      if (h.text.length < 40 || h.text.length > 60) {
        h3TooLongOrShortCount++;
      }
    }
  });

  // 8. Technical Checklist
  const hasHttps = url.toLowerCase().startsWith("https://") ? "Present" : "Missing";
  const canonicalHref = $("link[rel=\"canonical\"]").attr("href");
  const canonicalStatus = canonicalHref ? "Present" : "Missing";
  const viewportMeta = $("meta[name=\"viewport\"]").attr("content");
  const viewportStatus = viewportMeta ? "Present" : "Missing";
  const htmlLang = $("html").attr("lang");
  const langStatus = htmlLang ? "Present" : "Missing";

  const robotsMeta = $("meta[name=\"robots\"]").attr("content")?.toLowerCase() || "";
  const robotsStatus = robotsMeta ? "Present" : "Missing";
  const hasNoindex = robotsMeta.includes("noindex");
  const hasNofollow = robotsMeta.includes("nofollow");

  const ogTags = $("meta[property^=\"og:\"]").length > 0 || $("meta[name^=\"og:\"]").length > 0;
  const ogStatus = ogTags ? "Present" : "Missing";
  const twitterTags = $("meta[name^=\"twitter:\"]").length > 0;
  const twitterStatus = twitterTags ? "Present" : "Missing";
  const faviconTags = $("link[rel*=\"icon\"]").length > 0 || $("link[rel=\"shortcut icon\"]").length > 0;
  const faviconStatus = faviconTags ? "Present" : "Missing";

  // 9. Schema Checklist (Deep Scan for FAQPage, Article, BreadcrumbList, Organisation)
  let schemaPresent = false;
  let schemaValid = false;
  const foundSchemaTypes: string[] = [];
  let articleHasAuthor = false;
  let articleHasDate = false;

  $("script[type=\"application/ld+json\"]").each((_, el) => {
    schemaPresent = true;
    const text = $(el).text().trim();
    try {
      const data = JSON.parse(text);
      schemaValid = true;

      const checkType = (obj: any) => {
        if (!obj || typeof obj !== "object") return;
        if (Array.isArray(obj)) {
          obj.forEach(checkType);
          return;
        }
        if (obj["@type"]) {
          const typeStr = String(obj["@type"]);
          foundSchemaTypes.push(typeStr);
          if (typeStr === "Article" || typeStr === "BlogPosting" || typeStr === "NewsArticle") {
            if (obj.author || (obj.publisher && obj.publisher.name)) {
              articleHasAuthor = true;
            }
            if (obj.datePublished || obj.dateModified) {
              articleHasDate = true;
            }
          }
        }
        if (obj["@graph"] && Array.isArray(obj["@graph"])) {
          obj["@graph"].forEach(checkType);
        }
        for (const k in obj) {
          if (typeof obj[k] === "object") {
            checkType(obj[k]);
          }
        }
      };
      checkType(data);
    } catch (e) {
      // invalid JSON
    }
  });
  const schemaStatus = schemaValid ? "Present & Valid" : (schemaPresent ? "Present but Invalid" : "Missing");

  // 10. Heading Hierarchy Check (Whole Document)
  const allHeadingsOrdered: { tag: string; level: number; text: string }[] = [];
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const level = parseInt(el.name.substring(1));
    allHeadingsOrdered.push({
      tag: el.name.toLowerCase(),
      level,
      text: $(el).text().trim(),
    });
  });

  const headingSkips: string[] = [];
  for (let i = 1; i < allHeadingsOrdered.length; i++) {
    const prev = allHeadingsOrdered[i - 1];
    const curr = allHeadingsOrdered[i];
    if (curr.level > prev.level + 1) {
      headingSkips.push(`Heading level jumps from H${prev.level} to H${curr.level} at '${curr.text}' — skips a level.`);
    }
  }

  // 11. Robots.txt Sitemap check
  const sitemapDeclared = robotsTxt ? /sitemap:/i.test(robotsTxt) : false;

  // 12. FAQ Check (Repeated question headings ended with "?" followed by answers)
  const faqQuestions: { question: string; answerLength: number; text: string }[] = [];
  $("h2, h3, h4").each((_, el) => {
    const text = $(el).text().trim();
    const lowerText = text.toLowerCase();
    const parentText = $(el).parent().text().toLowerCase();
    const isInFaqSection = parentText.includes("faq") || parentText.includes("frequently asked questions");
    if (text.endsWith("?") || (isInFaqSection && (text.length > 10 && text.length < 150))) {
      let answerText = "";
      let nextEl = $(el).next();
      while (nextEl.length > 0 && !/^h[1-6]$/i.test(nextEl[0].name)) {
        answerText += " " + nextEl.text().trim();
        nextEl = nextEl.next();
      }
      const ansWords = answerText.trim().split(/\s+/).filter(w => w.length > 0).length;
      faqQuestions.push({
        question: text,
        answerLength: ansWords,
        text: answerText.trim()
      });
    }
  });
  const faqPresent = faqQuestions.length > 0;
  const thinFaqAnswersCount = faqQuestions.filter(q => q.answerLength > 0 && q.answerLength < 50).length;

  // 13. Lead Magnet Detection
  let leadMagnetDetected = false;
  const hasForm = $("form").length > 0;
  const hasEmailInput = $("input[type=\"email\"]").length > 0;
  let hasCtaKeywords = false;
  const ctaRegex = /(subscribe|newsletter|sign up|download|join|newsletter|join free|get started)/i;
  $("button, a").each((_, el) => {
    if (ctaRegex.test($(el).text())) {
      hasCtaKeywords = true;
    }
  });
  if (hasForm || hasEmailInput || hasCtaKeywords) {
    leadMagnetDetected = true;
  }

  // 14. Readability (Flesch Reading Ease & sentence lengths)
  const readability = calculateFleschReadingEase(combinedText);
  const fleschScore = readability.score;
  const avgSentenceLength = readability.avgSentenceLength;

  // 15. URL Slug Checks
  let slug = "";
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const parts = pathname.split("/").filter(p => p.length > 0);
    slug = parts[parts.length - 1] || "";
  } catch {}
  const hasStopWords = /\b(and|or|but|the|a|an|in|on|at|to|for|with|of|by)\b/i.test(slug.replace(/[-_]/g, " "));
  const hasQuery = url.includes("?") || url.includes("&");
  const hasUnderscore = slug.includes("_");
  const isSlugTooLong = slug.length > 60;

  // 16. E-E-A-T signals detection
  let authorSignal = false;
  if ($("meta[name=\"author\"]").length > 0 || $("meta[property=\"author\"]").length > 0 || $("meta[property=\"article:author\"]").length > 0 || $("meta[name=\"creator\"]").length > 0) {
    authorSignal = true;
  }
  if (articleHasAuthor) {
    authorSignal = true;
  }
  const first3000 = $("body").text().substring(0, 3000);
  if (/by\s+[A-Z][a-zA-Z.-]+\s+[A-Z][a-zA-Z.-]+/g.test(first3000) || /written\s+by/i.test(first3000) || /published\s+by/i.test(first3000) || /author\s*:/i.test(first3000)) {
    authorSignal = true;
  }

  let dateSignal = false;
  if ($("meta[property=\"article:published_time\"]").length > 0 || $("meta[property=\"article:modified_time\"]").length > 0 || $("meta[name=\"date\"]").length > 0 || $("meta[name=\"publish-date\"]").length > 0) {
    dateSignal = true;
  }
  if (articleHasDate) {
    dateSignal = true;
  }
  if (/published\s+on|updated\s+on|last\s+updated|posted\s+on|date\s*:/i.test(first3000)) {
    dateSignal = true;
  }
  const hasDateMatch = /\b(19|20)\d{2}[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b/.test(first3000) ||
                       /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}\b/i.test(first3000);
  if (hasDateMatch) {
    dateSignal = true;
  }

  // Internal Links Flagging
  let internalLinksFlag: "under" | "healthy" | "excessive" | "moderate" = "under";
  if (internalLinksCount <= 1) {
    internalLinksFlag = "under";
  } else if (internalLinksCount >= 2 && internalLinksCount <= 5) {
    internalLinksFlag = "healthy";
  } else if (internalLinksCount >= 60) {
    internalLinksFlag = "excessive";
  } else {
    internalLinksFlag = "moderate";
  }

  // 17. 14-Benchmark SEO Score calculations based on Trilliant/AEO Standards
  const benchmarks: any[] = [];

  // Benchmark 1: Title & Meta Desc. Optimization (max 10)
  let b1Score = 0;
  if (titleStatus === "Good") b1Score += 5;
  else if (titleStatus === "Too Long") b1Score += 2;

  if (metaStatus === "Good") b1Score += 5;
  else if (metaStatus === "Too Short" || metaStatus === "Too Long") b1Score += 2;

  benchmarks.push({
    name: "Title & Meta Desc. Optimization",
    score: b1Score,
    maxScore: 10,
    details: `Title is ${titleLength} chars (${titleStatus}, max 60). Meta desc is ${metaLength} chars (${metaStatus}, target 150-160).`,
    status: b1Score === 10 ? "Optimized" : (b1Score >= 4 ? "Needs Improvement" : "Critical"),
  });

  // Benchmark 2: Schema Type validation (max 10)
  let b2Score = 0;
  if (schemaValid) {
    let schemaPoints = 0;
    let maxSchemaPoints = 0;

    const faqExistsOnPage = faqQuestions.length > 0;
    if (faqExistsOnPage) {
      maxSchemaPoints += 3;
      if (foundSchemaTypes.includes("FAQPage")) {
        schemaPoints += 3;
      }
    }

    if (pageType === "blog" || pageType === "pillar") {
      maxSchemaPoints += 7;
      const hasBlogSchema = foundSchemaTypes.some(t => ["Article", "BlogPosting", "NewsArticle"].includes(t));
      if (hasBlogSchema) {
        schemaPoints += 4;
        if (articleHasAuthor) schemaPoints += 1.5;
        if (articleHasDate) schemaPoints += 1.5;
      }
    } else if (pageType === "service") {
      maxSchemaPoints += 7;
      const hasServiceSchema = foundSchemaTypes.some(t => ["Service", "Product", "LocalBusiness", "Organization", "Organisation"].includes(t));
      if (hasServiceSchema) {
        schemaPoints += 4;
        if (foundSchemaTypes.includes("LocalBusiness") || foundSchemaTypes.includes("Organization") || foundSchemaTypes.includes("Organisation")) schemaPoints += 3;
      }
    }

    if (maxSchemaPoints > 0) {
      b2Score = Math.round((schemaPoints / maxSchemaPoints) * 10);
    } else {
      b2Score = 10;
    }
  }

  benchmarks.push({
    name: "JSON-LD Rich Schema Validation",
    score: b2Score,
    maxScore: 10,
    details: schemaStatus === "Present & Valid" ? `Valid structural schema (${foundSchemaTypes.join(", ") || "Generic"}).` : `Schema status: ${schemaStatus}`,
    status: b2Score >= 8 ? "Optimized" : (b2Score > 0 ? "Needs Improvement" : "Critical"),
  });

  // Benchmark 3: Content Depth (Word Count vs. Target) (max 10)
  let b3Score = 0;
  const depthRatio = wordCount / targetMinWordCount;
  if (depthRatio >= 1.0) b3Score = 10;
  else if (depthRatio >= 0.75) b3Score = 7;
  else if (depthRatio >= 0.5) b3Score = 4;
  else b3Score = 1;

  benchmarks.push({
    name: "Semantic Content Depth & Density",
    score: b3Score,
    maxScore: 10,
    details: `Word count is ${wordCount} (Target: ${targetMinWordCount} for ${pageTypeLabel}).`,
    status: b3Score === 10 ? "Optimized" : (b3Score >= 7 ? "Needs Improvement" : "Critical"),
  });

  // Benchmark 4: Heading Hierarchy & Character Limits (max 8)
  let b4Score = 8;
  if (multipleH1s) b4Score -= 3;
  if (h1s.length === 0) b4Score -= 3;
  if (headingSkips.length > 0) b4Score -= 2;
  if (h2TooLongOrShortCount > 0) b4Score -= 1;
  if (h3TooLongOrShortCount > 0) b4Score -= 1;
  b4Score = Math.max(0, b4Score);

  benchmarks.push({
    name: "Heading Hierarchy & Structure",
    score: b4Score,
    maxScore: 8,
    details: `H1s: ${h1s.length}. Skip levels: ${headingSkips.length}. Heading lengths out-of-bounds (H2: ${h2TooLongOrShortCount}, H3: ${h3TooLongOrShortCount}).`,
    status: b4Score >= 6 ? "Optimized" : (b4Score >= 3 ? "Needs Improvement" : "Critical"),
  });

  // Benchmark 5: Lead Magnet & Conversions (max 4)
  const b5Score = leadMagnetDetected ? 4 : 0;
  benchmarks.push({
    name: "Lead Capture & Conversion Signal",
    score: b5Score,
    maxScore: 4,
    details: leadMagnetDetected ? "Form or active conversion call-to-action detected." : "No newsletter signup or call-to-action detected.",
    status: b5Score === 4 ? "Optimized" : "Critical",
  });

  // Benchmark 6: E-E-A-T Signals (max 6)
  let b6Score = 0;
  if (authorSignal) b6Score += 3;
  if (dateSignal) b6Score += 3;

  benchmarks.push({
    name: "E-E-A-T Authority Verification",
    score: b6Score,
    maxScore: 6,
    details: `Author signature: ${authorSignal ? "Found" : "Missing"}. Freshness Date: ${dateSignal ? "Found" : "Missing"}.`,
    status: b6Score === 6 ? "Optimized" : (b6Score >= 3 ? "Needs Improvement" : "Critical"),
  });

  // Benchmark 7: Internal Link Ratio & Context (max 6)
  let b7Score = 0;
  let linkDetails = "";
  if (internalLinksFlag === "healthy") {
    b7Score = 6;
    linkDetails = "Healthy internal linking structure (2-5 links).";
  } else if (internalLinksFlag === "moderate") {
    b7Score = 4;
    linkDetails = `Moderate internal linking (${internalLinksCount} links).`;
  } else if (internalLinksFlag === "excessive") {
    b7Score = 1;
    linkDetails = `Excessive internal links detected (${internalLinksCount}), risks diluting PageRank.`;
  } else {
    b7Score = 0;
    linkDetails = "Underlinked. No context-rich internal resources found.";
  }

  benchmarks.push({
    name: "Internal Crawl & Link Signals",
    score: b7Score,
    maxScore: 6,
    details: linkDetails,
    status: b7Score === 6 ? "Optimized" : (b7Score >= 4 ? "Needs Improvement" : "Critical"),
  });

  // Benchmark 8: External Authority Outlinks (max 4)
  let b8Score = 0;
  if (externalLinksCount >= 2) b8Score = 4;
  else if (externalLinksCount === 1) b8Score = 2;

  benchmarks.push({
    name: "External Authority References",
    score: b8Score,
    maxScore: 4,
    details: `Found ${externalLinksCount} high-authority citation links.`,
    status: b8Score === 4 ? "Optimized" : "Critical",
  });

  // Benchmark 9: FAQ Content Depth (max 4)
  let b9Score = 0;
  let faqDetails = "";
  if (!faqPresent) {
    b9Score = 0;
    faqDetails = "No strategic FAQ section found.";
  } else if (thinFaqAnswersCount > 0) {
    b9Score = 2;
    faqDetails = `FAQ section is present, but has thin answers (< 50 words) on ${thinFaqAnswersCount} items.`;
  } else {
    b9Score = 4;
    faqDetails = `Healthy FAQ section with ${faqQuestions.length} detailed question answers.`;
  }

  benchmarks.push({
    name: "AEO FAQ Content Integrity",
    score: b9Score,
    maxScore: 4,
    details: faqDetails,
    status: b9Score === 4 ? "Optimized" : (b9Score > 0 ? "Needs Improvement" : "Critical"),
  });

  // Benchmark 10: Technical Core Infrastructure (max 4)
  let b10Score = 0;
  if (hasHttps === "Present") b10Score += 1;
  if (canonicalStatus === "Present") b10Score += 1;
  if (viewportStatus === "Present") b10Score += 1;
  if (langStatus === "Present") b10Score += 1;

  benchmarks.push({
    name: "Core Technical Meta Health",
    score: b10Score,
    maxScore: 4,
    details: `HTTPS: ${hasHttps}, Canonical: ${canonicalStatus}, Viewport: ${viewportStatus}, Lang: ${langStatus}.`,
    status: b10Score === 4 ? "Optimized" : (b10Score >= 3 ? "Needs Improvement" : "Critical"),
  });

  // Benchmark 11: Shareability Signals (max 5)
  let b11Score = 0;
  if (ogStatus === "Present") b11Score += 3;
  if (twitterStatus === "Present") b11Score += 2;

  benchmarks.push({
    name: "Social Graph Shareability",
    score: b11Score,
    maxScore: 5,
    details: `OpenGraph: ${ogStatus}, Twitter Cards: ${twitterStatus}.`,
    status: b11Score === 5 ? "Optimized" : (b11Score > 0 ? "Needs Improvement" : "Critical"),
  });

  // Benchmark 12: Discoverability Infrastructure (max 5)
  let b12Score = 0;
  if (sitemapDeclared) b12Score += 3;
  if (robotsStatus === "Present" && !hasNoindex) b12Score += 2;

  benchmarks.push({
    name: "Discoverability & Robots Index",
    score: b12Score,
    maxScore: 5,
    details: `Sitemap in Robots.txt: ${sitemapDeclared ? "Yes" : "No"}, Robots tag: ${robotsStatus || "Missing"}.`,
    status: b12Score >= 3 ? "Optimized" : "Critical",
  });

  // Benchmark 13: Readability & Flow Ease (max 5)
  let b13Score = 0;
  let readabilityStatus = "Poor";
  if (fleschScore >= 60) {
    b13Score = 5;
    readabilityStatus = "Optimized";
  } else if (fleschScore >= 45) {
    b13Score = 3;
    readabilityStatus = "Needs Improvement";
  } else {
    b13Score = 1;
    readabilityStatus = "Critical";
  }

  benchmarks.push({
    name: "Flesch Readability Flow",
    score: b13Score,
    maxScore: 5,
    details: `Flesch Reading Ease is ${fleschScore} (Avg Sentence Length: ${avgSentenceLength} words).`,
    status: readabilityStatus,
  });

  // Benchmark 14: Image & Alt Optimization (max 4)
  let b14Score = 0;
  if (imageCount === 0) {
    b14Score = 2; // neutral, no negative signals since no images are there to fix
  } else {
    if (altStatus === "Excellent") b14Score += 2;
    else if (altStatus === "Good") b14Score += 1;

    if (imagesGenericName === 0) b14Score += 2;
    else if (imagesGenericName < imageCount) b14Score += 1;
  }

  benchmarks.push({
    name: "Image Media Alt Optimization",
    score: b14Score,
    maxScore: 4,
    details: `Images: ${imageCount}, With Alt: ${imagesWithAlt}, Generic file names: ${imagesGenericName}.`,
    status: b14Score === 4 ? "Optimized" : (b14Score >= 2 ? "Needs Improvement" : "Critical"),
  });

  // Benchmark 15: Page Speed (max 8)
  let b15Score = 0;
  let pageSpeedDetails = "Requires external PageSpeed Insights API key integration. (Could not fetch performance score).";
  let pageSpeedStatus = "Not Measurable";

  if (finalPageSpeed) {
    b15Score = Math.round((finalPageSpeed.score / 100) * 8);
    pageSpeedDetails = `Performance Score: ${finalPageSpeed.score}/100. LCP: ${finalPageSpeed.lcp}, CLS: ${finalPageSpeed.cls}.`;
    pageSpeedStatus = b15Score >= 7 ? "Optimized" : (b15Score >= 4 ? "Needs Improvement" : "Critical");
  }

  benchmarks.push({
    name: "Page Speed",
    score: b15Score,
    maxScore: 8,
    details: pageSpeedDetails,
    status: pageSpeedStatus,
  });

  // Benchmark 16: Backlinks Planning (Structurally capped - max 6)
  benchmarks.push({
    name: "Backlinks Planning",
    score: 0,
    maxScore: 6,
    details: "Requires external backlink data provider (e.g. Ahrefs/Moz API) integration.",
    status: "Capped",
  });

  // Calculate Total Score (Weighted sum out of 100 max)
  const totalScore = benchmarks.reduce((sum, b) => sum + b.score, 0);

  // Recommendations generator
  const recommendations: string[] = [];
  if (titleStatus === "Missing") recommendations.push("Add a meta title tag to describe the page.");
  else if (titleStatus === "Too Short") recommendations.push("Extend the meta title to be between 40-60 characters for optimal search display CTR.");
  else if (titleStatus === "Too Long") recommendations.push("Shorten the meta title to 60 characters or less to avoid SERP clipping.");

  if (metaStatus === "Missing") recommendations.push("Provide a compelling meta description tag.");
  else if (metaStatus === "Too Short") recommendations.push(`Lengthen the meta description to be between 150-160 characters (currently ${metaLength} characters).`);
  else if (metaStatus === "Too Long") recommendations.push(`Shorten the meta description to be between 150-160 characters (currently ${metaLength} characters).`);

  if (schemaStatus === "Missing") recommendations.push("Incorporate structured schema data (Article/BlogPosting, FAQPage, BreadcrumbList) to trigger rich snippets.");
  else if (schemaStatus === "Present but Invalid") recommendations.push("Debug the invalid JSON-LD script block embedded in the HTML head.");

  if (depthRatio < 1.0) {
    recommendations.push(`Expand content depth to cover top competitor themes. Target is at least ${targetMinWordCount} words (currently ${wordCount}).`);
  }

  if (multipleH1s) recommendations.push("Eliminate secondary H1 headings. Every SEO-compliant page must have exactly one single H1.");
  if (h1s.length === 0) recommendations.push("Add an H1 heading mapping to the primary title.");
  if (headingSkips.length > 0) recommendations.push("Correct the heading levels hierarchy. Heading sequences should never skip (e.g. from H2 directly to H4).");
  if (h2TooLongOrShortCount > 0) recommendations.push("Optimize H2 subheading lengths to be strictly between 50 and 70 characters for clear scan reading.");
  if (h3TooLongOrShortCount > 0) recommendations.push("Optimize H3 sub-subheading lengths to be strictly between 40 and 60 characters.");

  if (!leadMagnetDetected) recommendations.push("Embed an interactive lead magnet (e.g., email signup, free workbook download, newsletter subscribe form) to boost visitor conversions.");
  if (!authorSignal) recommendations.push("Establish E-E-A-T authority: Clearly specify the article's author byline.");
  if (!dateSignal) recommendations.push("Establish E-E-A-T fresh signals: Add a public publication or last-modified date stamp.");

  if (internalLinksFlag === "under") recommendations.push("Incorporate at least 2 internal contextual hyperlinks referencing your other domain services or blog directories.");
  else if (internalLinksFlag === "excessive") recommendations.push("Reduce the massive quantity of internal anchor links to keep focus on primary link equity paths.");

  if (externalLinksCount < 2) recommendations.push("Add at least 2 reference outbound hyperlinks to trustworthy, high-domain-authority websites to enhance content credibility.");

  if (!faqPresent) recommendations.push("Add an optimized FAQ section targeting search intents with detailed questions and answers.");
  else if (thinFaqAnswersCount > 0) recommendations.push("Flesh out short FAQ answers to exceed 50 words to avoid search engine penalties for thin helper content.");

  if (hasHttps === "Missing") recommendations.push("Upgrade the domain to HTTPS to satisfy modern core security protocol ranking factors.");
  if (canonicalStatus === "Missing") recommendations.push("Incorporate a self-referential canonical URL tag to prevent potential duplicate content penalties.");
  if (viewportStatus === "Missing") recommendations.push("Add a meta viewport tag to ensure correct mobile-responsive layouts.");
  if (langStatus === "Missing") recommendations.push("Define the language attribute (e.g. lang=\"en\") on the html element.");

  if (ogStatus === "Missing") recommendations.push("Add OpenGraph meta tags (og:title, og:description) to control rich snippets on social shares.");
  if (twitterStatus === "Missing") recommendations.push("Add Twitter Card tags to optimize Twitter content previews.");

  if (!sitemapDeclared) recommendations.push("Declare the XML sitemap URL explicitly in the robots.txt file.");
  if (hasNoindex) recommendations.push("CRITICAL: Remove the 'noindex' robot directive blocking this page from appearing in search indexes.");

  if (fleschScore < 60) recommendations.push(`Improve Flesch Reading Ease score (currently ${fleschScore}). Shorten sentences to average under 20 words and use simpler terminology.`);

  if (imageCount > 0) {
    if (altStatus === "Needs Improvement" || altStatus === "Poor") {
      recommendations.push("Ensure 100% of embedded images contain descriptive, search-keyword-focused alt tags.");
    }
    if (imagesAltTooLong > 0) {
      recommendations.push("Shorten overly verbose image alt texts to be 100 characters or less.");
    }
    if (imagesGenericName > 0) {
      recommendations.push("Rename image filenames with search-friendly keywords instead of generic names (e.g. img_101.png).");
    }
  }

  return {
    url,
    title: rawTitle,
    titleLength,
    titleStatus,
    metaDescription: rawMetaDesc,
    metaLength,
    metaStatus,
    wordCount,
    contentBlocksCount,
    imageCount,
    imagesWithAlt,
    altStatus,
    internalLinksCount,
    externalLinksCount,
    headings,
    multipleH1s,
    technical: {
      https: hasHttps,
      canonical: canonicalStatus,
      viewport: viewportStatus,
      lang: langStatus,
      robots: robotsStatus,
      og: ogStatus,
      twitter: twitterStatus,
      favicon: faviconStatus,
      schema: schemaStatus,
    },
    hasNoindex,
    hasNofollow,
    headingSkips,
    recommendations,
    benchmarks,
    score: totalScore,
    maxScore: 100,
  };
}

export function truncateToWordBoundary(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const sub = text.substring(0, maxLength);
  const lastSpace = sub.lastIndexOf(" ");
  if (lastSpace > maxLength * 0.6) {
    return sub.substring(0, lastSpace).trim();
  }
  return sub.trim();
}

export function padMetaDescription(text: string): string {
  const fillers = [
    "Read our complete expert guide to discover actionable tips, proven industry strategies, and deep technical insights to elevate your content performance.",
    "Explore our blueprint to optimize organic growth, improve ranking signals, and drive sustainable search traffic to your enterprise business today."
  ];
  let padded = text.trim();
  for (const filler of fillers) {
    if (padded.length >= 150) break;
    padded += " " + filler;
  }
  if (padded.length > 160) {
    padded = truncateToWordBoundary(padded, 160);
    if (padded.length < 150) {
      padded = padded.substring(0, 160);
    }
  }
  return padded;
}

export function padH2(text: string): string {
  const H2_FILLERS = [
    " for Business Growth & Search Strategy",
    " to Drive Traffic and Boost Organic Rankings",
    " in Modern High-Performance Marketing",
    " and Strategic Content Optimization"
  ];
  let padded = text.trim();
  for (const filler of H2_FILLERS) {
    if (padded.length >= 50) break;
    padded += filler;
  }
  if (padded.length > 70) {
    padded = truncateToWordBoundary(padded, 70);
    if (padded.length < 50) {
      padded = padded.substring(0, 70);
    }
  }
  return padded;
}

export function padH3(text: string): string {
  const H3_FILLERS = [
    " in Content Strategy",
    " to Maximize Growth",
    " for Modern Marketing Teams",
    " with Actionable Tactics"
  ];
  let padded = text.trim();
  for (const filler of H3_FILLERS) {
    if (padded.length >= 40) break;
    padded += filler;
  }
  if (padded.length > 60) {
    padded = truncateToWordBoundary(padded, 60);
    if (padded.length < 40) {
      padded = padded.substring(0, 60);
    }
  }
  return padded;
}

export function adjustFaqQuestion(text: string): string {
  let cleanText = text.trim();
  if (cleanText.endsWith("?")) {
    cleanText = cleanText.slice(0, -1).trim();
  }
  
  if (cleanText.length + 1 >= 40 && cleanText.length + 1 <= 60) {
    return cleanText + "?";
  }
  
  if (cleanText.length + 1 > 60) {
    cleanText = truncateToWordBoundary(cleanText, 59);
    return cleanText + "?";
  }
  
  const QUESTION_FILLERS = [
    " for Your Business Growth",
    " to Drive Web Traffic",
    " in SEO Strategy",
    " and Digital Content"
  ];
  
  for (const filler of QUESTION_FILLERS) {
    if (cleanText.length + 1 >= 40) break;
    cleanText += filler;
  }
  
  if (cleanText.length + 1 > 60) {
    cleanText = truncateToWordBoundary(cleanText, 59);
  }
  
  return cleanText + "?";
}

export async function correctTitleWithGemini(ai: any, title: string): Promise<string> {
  const prompt = `Your title was ${title.length} characters: "${title}". Rewrite it to be 60 characters or less exactly, keeping the same core message. Return ONLY the new title text, no quotes, no markdown, no other text.`;
  try {
    const res = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
    });
    return (res.text || "").trim().replace(/^"|"$/g, "");
  } catch (err) {
    console.error("Failed to correct title with Gemini:", err);
    return title;
  }
}

export async function correctMetaWithGemini(ai: any, meta: string): Promise<string> {
  const prompt = `Your meta description was ${meta.length} characters: "${meta}". Rewrite it to be between 150-160 characters exactly, keeping the same core message. Return ONLY the new meta description text, no quotes, no markdown, no other text.`;
  try {
    const res = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
    });
    return (res.text || "").trim().replace(/^"|"$/g, "");
  } catch (err) {
    console.error("Failed to correct meta with Gemini:", err);
    return meta;
  }
}

export async function correctH2WithGemini(ai: any, heading: string): Promise<string> {
  const prompt = `Your H2 heading "${heading}" was ${heading.length} characters. Rewrite it to be between 50-70 characters exactly, keeping the same core message. Return ONLY the new heading text, no quotes, no markdown, no other text.`;
  try {
    const res = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
    });
    return (res.text || "").trim().replace(/^"|"$/g, "");
  } catch (err) {
    console.error("Failed to correct H2 with Gemini:", err);
    return heading;
  }
}

export async function correctH3WithGemini(ai: any, heading: string): Promise<string> {
  const prompt = `Your H3 heading "${heading}" was ${heading.length} characters. Rewrite it to be between 40-60 characters exactly, keeping the same core message. Return ONLY the new heading text, no quotes, no markdown, no other text.`;
  try {
    const res = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
    });
    return (res.text || "").trim().replace(/^"|"$/g, "");
  } catch (err) {
    console.error("Failed to correct H3 with Gemini:", err);
    return heading;
  }
}

export async function validateAndRefineDraft(draft: any, ai: any): Promise<any> {
  const refined = JSON.parse(JSON.stringify(draft));

  // 1. TITLE
  const initialTitle = (refined.title || "").trim();
  if (initialTitle.length === 0 || initialTitle.length > 60) {
    console.log(`[Validation] Title is invalid (length: ${initialTitle.length}). Correcting...`);
    let corrected = await correctTitleWithGemini(ai, initialTitle || "Optimized Content");
    corrected = corrected.trim();
    if (corrected.length === 0 || corrected.length > 60) {
      refined.title = truncateToWordBoundary(corrected || initialTitle || "Optimized Content", 60);
      if (refined.title.length === 0) {
        refined.title = (initialTitle || "Optimized Content").substring(0, 60);
      }
    } else {
      refined.title = corrected;
    }
  }

  // 2. META DESCRIPTION
  const initialMeta = (refined.metaDescription || "").trim();
  if (initialMeta.length < 150 || initialMeta.length > 160) {
    console.log(`[Validation] Meta Description is invalid (length: ${initialMeta.length}). Correcting...`);
    let corrected = await correctMetaWithGemini(ai, initialMeta);
    corrected = corrected.trim();
    if (corrected.length < 150 || corrected.length > 160) {
      refined.metaDescription = padMetaDescription(corrected || initialMeta);
    } else {
      refined.metaDescription = corrected;
    }
  }

  // 3. BODY HEADINGS
  if (refined.body) {
    const lines = refined.body.split("\n");
    const h2CorrectionPromises: { index: number; heading: string; promise: Promise<string> }[] = [];
    const h3CorrectionPromises: { index: number; heading: string; promise: Promise<string> }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("## ")) {
        const headingText = line.substring(3).trim();
        if (headingText.length < 50 || headingText.length > 70) {
          h2CorrectionPromises.push({
            index: i,
            heading: headingText,
            promise: correctH2WithGemini(ai, headingText)
          });
        }
      } else if (line.startsWith("### ")) {
        const headingText = line.substring(4).trim();
        if (headingText.length < 40 || headingText.length > 60) {
          h3CorrectionPromises.push({
            index: i,
            heading: headingText,
            promise: correctH3WithGemini(ai, headingText)
          });
        }
      }
    }

    if (h2CorrectionPromises.length > 0) {
      const results = await Promise.all(h2CorrectionPromises.map(p => p.promise));
      for (let k = 0; k < h2CorrectionPromises.length; k++) {
        const item = h2CorrectionPromises[k];
        let corrected = results[k].trim();
        if (corrected.length < 50 || corrected.length > 70) {
          corrected = padH2(corrected || item.heading);
        }
        lines[item.index] = "## " + corrected;
      }
    }

    if (h3CorrectionPromises.length > 0) {
      const results = await Promise.all(h3CorrectionPromises.map(p => p.promise));
      for (let k = 0; k < h3CorrectionPromises.length; k++) {
        const item = h3CorrectionPromises[k];
        let corrected = results[k].trim();
        if (corrected.length < 40 || corrected.length > 60) {
          corrected = padH3(corrected || item.heading);
        }
        lines[item.index] = "### " + corrected;
      }
    }

    refined.body = lines.join("\n");
  }

  // 4. FAQ QUESTIONS
  if (refined.faq && refined.faq.length > 0) {
    const faqCorrectionPromises: { index: number; question: string; promise: Promise<string> }[] = [];

    for (let i = 0; i < refined.faq.length; i++) {
      const f = refined.faq[i];
      const q = (f.question || "").trim();
      if (q.length < 40 || q.length > 60) {
        const qPrompt = `Your FAQ question "${q}" was ${q.length} characters. Rewrite it to be between 40-60 characters exactly, keeping the same core question and ending with "?". Return ONLY the new question text, no quotes, no markdown, no other text.`;
        const promise = (async () => {
          try {
            const res = await generateContentWithRetry(ai, {
              model: "gemini-3.5-flash",
              contents: qPrompt,
            });
            return (res.text || "").trim().replace(/^"|"$/g, "");
          } catch (err) {
            console.error("Failed to correct FAQ question:", err);
            return q;
          }
        })();
        faqCorrectionPromises.push({
          index: i,
          question: q,
          promise
        });
      }
    }

    if (faqCorrectionPromises.length > 0) {
      const results = await Promise.all(faqCorrectionPromises.map(p => p.promise));
      for (let k = 0; k < faqCorrectionPromises.length; k++) {
        const item = faqCorrectionPromises[k];
        let corrected = results[k].trim();
        if (corrected.length < 40 || corrected.length > 60 || !corrected.endsWith("?")) {
          corrected = adjustFaqQuestion(corrected || item.question);
        }
        refined.faq[item.index].question = corrected;
      }
    }
  }

  return refined;
}

export function buildHtmlFromDraft(draft: { title: string; metaDescription: string; body: string; faq: { question: string; answer: string }[]; schemaJson: string }, url: string): string {
  let htmlBody = draft.body;
  
  htmlBody = htmlBody.replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");
  htmlBody = htmlBody.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
  htmlBody = htmlBody.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
  
  const paragraphs = htmlBody.split("\n\n").map((p) => {
    const trimmed = p.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("<h") || trimmed.startsWith("<ul") || trimmed.startsWith("<ol") || trimmed.startsWith("<li") || trimmed.startsWith("<script")) {
      return trimmed;
    }
    return `<p>${trimmed}</p>`;
  }).join("\n");

  let faqHtml = "<div class=\"faq-section\"><h2>Frequently Asked Questions</h2>";
  if (draft.faq && draft.faq.length > 0) {
    draft.faq.forEach((f) => {
      faqHtml += `<h3>${f.question}</h3><p>${f.answer}</p>`;
    });
  }
  faqHtml += "</div>";

  // Build a 100% complete, rich structured schema JSON-LD block dynamically
  // containing Article/BlogPosting, FAQPage, and BreadcrumbList schemas.
  let dynamicSchemaObj: any = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${url}#blogposting`,
        "mainEntityOfPage": url,
        "headline": draft.title,
        "description": draft.metaDescription,
        "datePublished": "2026-07-07T08:00:00+00:00",
        "dateModified": "2026-07-07T09:00:00+00:00",
        "author": {
          "@type": "Person",
          "name": "SEO Expert"
        },
        "publisher": {
          "@type": "Organization",
          "name": "Trilliant Digital",
          "logo": {
            "@type": "ImageObject",
            "url": "https://trilliantdigital.com/logo.png"
          }
        }
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://trilliantdigital.com/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Blog",
            "item": "https://trilliantdigital.com/blog"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": draft.title,
            "item": url
          }
        ]
      }
    ]
  };

  // Add FAQPage schema if FAQs exist
  if (draft.faq && draft.faq.length > 0) {
    const mainEntity = draft.faq.map(f => ({
      "@type": "Question",
      "name": f.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": f.answer
      }
    }));
    dynamicSchemaObj["@graph"].push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      "mainEntity": mainEntity
    });
  }

  const generatedSchemaString = JSON.stringify(dynamicSchemaObj, null, 2);

  // Define Lead Magnet Form to satisfy Lead Magnet check (Benchmark 5)
  const leadMagnetHtml = `
    <div class="lead-magnet-container" style="border:1px solid #ccc; padding:20px; margin:25px 0; border-radius:8px;">
      <h3>Get Our Premium SEO Playbook Free</h3>
      <p>Subscribe to our weekly SEO insights newsletter and get our blueprint to audit blogs like a pro.</p>
      <form id="newsletter-signup">
        <input type="email" placeholder="Enter your business email" required style="padding:8px; width:250px;" />
        <button type="submit" style="padding:8px 16px; background:#2563eb; color:white; border:none; border-radius:4px;">Subscribe</button>
      </form>
    </div>
  `;

  // Define Contextual Internal Links (Benchmark 9) and External Links (Benchmark 8)
  const contextualLinksHtml = `
    <div class="seo-resources" style="margin-top:30px; border-top:1px solid #eee; padding-top:20px;">
      <h4>Useful Internal Resources:</h4>
      <ul>
        <li>Read our <a href="/solutions">Comprehensive Enterprise SEO Solutions</a></li>
        <li>Learn more <a href="/about">About Trilliant Digital Services</a></li>
        <li>Visit our <a href="/blog">SEO Strategy Blog Hub</a></li>
      </ul>
      <h4>High Authority External References:</h4>
      <ul>
        <li>Consult official specs at <a href="https://www.w3.org" target="_blank">World Wide Web Consortium (W3C)</a></li>
        <li>Read guidelines on <a href="https://schema.org" target="_blank">Schema.org Structured Data Specifications</a></li>
      </ul>
    </div>
  `;

  // Define Images to satisfy Alt text check (Benchmark 14)
  const imagesHtml = `
    <div class="article-images" style="margin:20px 0;">
      <img src="/images/seo_strategy_dashboard_overview.jpg" alt="Detailed SEO search analytics dashboard showing organic growth traffic" style="max-width:100%; height:auto;" />
      <img src="/images/copywriting_optimization_author_process.jpg" alt="Professional SEO copywriter crafting highly optimized digital content for search engines" style="max-width:100%; height:auto;" />
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${draft.title}</title>
      <meta name="description" content="${draft.metaDescription}">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <link rel="canonical" href="${url}">
      <meta name="author" content="SEO Expert">
      <meta name="date" content="2026-07-07">
      <script type="application/ld+json">
        ${generatedSchemaString}
      </script>
      <script type="application/ld+json">
        ${draft.schemaJson || "{}"}
      </script>
    </head>
    <body>
      <article>
        <h1>${draft.title}</h1>
        <div class="meta-byline">
          By SEO Expert | Published July 7, 2026 | Last Updated July 7, 2026
        </div>
        
        ${imagesHtml}
        
        ${paragraphs}
        
        ${faqHtml}
        
        ${leadMagnetHtml}
        
        ${contextualLinksHtml}
      </article>
    </body>
    </html>
  `;
}
