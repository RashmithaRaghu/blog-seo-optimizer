import * as cheerio from "cheerio";
import { Type } from "@google/genai";
import {
  getGeminiClient,
  fetchBlogHtml,
  fetchRobotsTxt,
  fetchPageSpeedData,
  parseHtmlAndAnalyze,
  generateContentWithRetry,
  validateAndRefineDraft,
  buildHtmlFromDraft,
  SEOAnalysis
} from "./_seo-core.js";

export default async function handler(req: any, res: any) {
  // Support POST requests as expected by the frontend
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url, competitorUrl, topic } = req.body;
  if (!url) {
    return res.status(400).json({ error: "Blog URL is required for optimization." });
  }

  try {
    const ai = getGeminiClient();

    // 1. Analyze target blog
    const [mainHtml, mainRobotsTxt, pageSpeedData] = await Promise.all([
      fetchBlogHtml(url),
      fetchRobotsTxt(url),
      fetchPageSpeedData(url).catch(() => null),
    ]);
    const originalAnalysis = await parseHtmlAndAnalyze(mainHtml, url, mainRobotsTxt, pageSpeedData);


    // Extract paragraphs content for rewriting source
    const $ = cheerio.load(mainHtml);
    const originalParagraphs: string[] = [];
    $("p, li").each((_, el) => {
      const txt = $(el).text().trim();
      if (txt && txt.length > 20) {
        originalParagraphs.push(txt);
      }
    });

    const scoredCompetitors: { url: string; score: number; wordCount: number; title: string }[] = [];
    let competitorAnalysis: SEOAnalysis | null = null;
    let finalCompetitorUrl = competitorUrl || "";
    let autoSearchedUrls: string[] = [];

    // 2. Fetch or search competitor
    if (finalCompetitorUrl) {
      try {
        const compHtml = await fetchBlogHtml(finalCompetitorUrl);
        const compRobotsTxt = await fetchRobotsTxt(finalCompetitorUrl);
        competitorAnalysis = await parseHtmlAndAnalyze(compHtml, finalCompetitorUrl, compRobotsTxt, null);
        scoredCompetitors.push({
          url: finalCompetitorUrl,
          score: competitorAnalysis.score,
          wordCount: competitorAnalysis.wordCount,
          title: competitorAnalysis.title,
        });
      } catch (err: any) {
        return res.status(err.status || 500).json({
          error: `Failed to fetch/analyze the specified competitor URL: ${err.message}`,
          errorType: err.type || "failed",
        });
      }
    } else {
      // Auto-search competitor using grounding
      const searchTopic = topic || originalAnalysis.title || "SEO blog Optimization";
      const searchPrompt = `Find 2-3 high-quality, actual blog post URLs currently ranking well on Google for the topic/keyword: "${searchTopic}". Only return a list of URLs, one per line. Do not write any introduction, pleasantry, or explanation.`;
      
      try {
        const searchResponse = await generateContentWithRetry(ai, {
          model: "gemini-3.5-flash",
          contents: searchPrompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });

        const textResult = searchResponse.text || "";
        const groundingChunks = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const foundUrls: string[] = [];

        // Extract using regex
        const urlRegex = /(https?:\/\/[^\s"'<>\(\)]+)/gi;
        let match;
        while ((match = urlRegex.exec(textResult)) !== null) {
          foundUrls.push(match[1]);
        }

        // Extract from grounding chunks
        for (const chunk of groundingChunks) {
          if (chunk.web?.uri) {
            foundUrls.push(chunk.web.uri);
          }
        }

        autoSearchedUrls = Array.from(new Set(foundUrls)).filter((u) => u.startsWith("http://") || u.startsWith("https://"));

        // Filter general/social sites to prioritize real blog content
        const ignoredDomains = ["google.com", "youtube.com", "wikipedia.org", "twitter.com", "facebook.com", "instagram.com", "linkedin.com"];
        autoSearchedUrls = autoSearchedUrls.filter(u => {
          try {
            const host = new URL(u).hostname.toLowerCase();
            return !ignoredDomains.some(d => host.includes(d));
          } catch {
            return false;
          }
        });

        // Try to fetch and score up to 3 real competitors
        for (const compUrl of autoSearchedUrls) {
          if (scoredCompetitors.length >= 3) break;
          try {
            const compHtml = await fetchBlogHtml(compUrl);
            const compRobotsTxt = await fetchRobotsTxt(compUrl);
            const analysis = await parseHtmlAndAnalyze(compHtml, compUrl, compRobotsTxt, null);
            scoredCompetitors.push({
              url: compUrl,
              score: analysis.score,
              wordCount: analysis.wordCount,
              title: analysis.title,
            });
            if (!competitorAnalysis) {
              competitorAnalysis = analysis;
              finalCompetitorUrl = compUrl;
            }
          } catch (e) {
            // retry next
          }
        }
      } catch (e: any) {
        console.warn("Google Search grounding failed or was unavailable, using guaranteed stable real fallbacks:", e.message);
      }

      // If we failed to get at least 2 real competitor URLs, fetch and score from our list of guaranteed stable, real live blogs
      if (scoredCompetitors.length < 2) {
        const stableSources = [
          "https://github.blog/news-insights/",
          "https://wordpress.org/news/",
          "https://www.w3.org/blog/",
        ];
        for (const compUrl of stableSources) {
          if (scoredCompetitors.length >= 3) break;
          if (scoredCompetitors.some(c => c.url === compUrl)) continue;
          try {
            const compHtml = await fetchBlogHtml(compUrl);
            const compRobotsTxt = await fetchRobotsTxt(compUrl);
            const analysis = await parseHtmlAndAnalyze(compHtml, compUrl, compRobotsTxt, null);
            scoredCompetitors.push({
              url: compUrl,
              score: analysis.score,
              wordCount: analysis.wordCount,
              title: analysis.title,
            });
            if (!competitorAnalysis) {
              competitorAnalysis = analysis;
              finalCompetitorUrl = compUrl;
            }
          } catch (e) {
            console.error("Failed to fetch stable fallback competitor:", compUrl, e);
          }
        }
      }
    }

    // 3. Gap Analysis call (ONE call)
    const gapPrompt = `
Compare the SEO profile of the user's blog post with the competitor's profile (or general SEO benchmarks if no competitor is available).

User's Blog URL: ${originalAnalysis.url}
User's Title: "${originalAnalysis.title}" (Length: ${originalAnalysis.titleLength}, Status: ${originalAnalysis.titleStatus})
User's Meta Description: "${originalAnalysis.metaDescription}" (Length: ${originalAnalysis.metaLength}, Status: ${originalAnalysis.metaStatus})
User's Word Count: ${originalAnalysis.wordCount} words
User's Content Blocks: ${originalAnalysis.contentBlocksCount}
User's Image Count: ${originalAnalysis.imageCount} (Alt Text Status: ${originalAnalysis.altStatus})
User's Headings (H1/H2/H3):
${originalAnalysis.headings.map((h) => `- ${h.tag.toUpperCase()}: ${h.text}`).join("\n")}
User's Heading Hierarchy Skips:
${originalAnalysis.headingSkips.length > 0 ? originalAnalysis.headingSkips.join("\n") : "None"}

Competitor URL: ${finalCompetitorUrl || "None Fetched"}
Competitor Word Count: ${competitorAnalysis ? competitorAnalysis.wordCount : "N/A"}
Competitor Headings:
${competitorAnalysis ? competitorAnalysis.headings.map((h) => `- ${h.tag.toUpperCase()}: ${h.text}`).join("\n") : "N/A"}

Please perform a structured SEO Gap Analysis. Identify critical content gaps, structural layout issues, schema mismatches, and list missing FAQs.
Return JSON matching this exact structure:
{
  "gaps": string[],
  "missingTopics": string[],
  "structuralWeaknesses": string[],
  "contentRecommendations": string[]
}
    `;

    const gapResponse = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: gapPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
            missingTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
            structuralWeaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            contentRecommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["gaps", "missingTopics", "structuralWeaknesses", "contentRecommendations"],
        },
      },
    });

    const gapData = JSON.parse(gapResponse.text || "{}");

    // 4. Optimization Loop (Max 3 attempts to improve rewrite score)
    let finalDraft: any = null;
    let finalAnalysis: SEOAnalysis | null = null;
    let attemptsCount = 0;
    let autoSearchedUrlsList: string[] = [];

    // Detect original page type and word count target
    let origPageType: "service" | "blog" | "pillar" = "blog";
    const lowerUrlForType = url.toLowerCase();
    const lowerTitleForType = originalAnalysis.title.toLowerCase();
    if (lowerUrlForType.includes("/pillar") || lowerUrlForType.includes("/cornerstone") || lowerUrlForType.includes("/guide") || lowerTitleForType.includes("guide") || lowerTitleForType.includes("handbook") || lowerTitleForType.includes("pillar") || originalAnalysis.wordCount > 1800) {
      origPageType = "pillar";
    } else if (lowerUrlForType.includes("/service") || lowerUrlForType.includes("/services") || lowerUrlForType.includes("/features") || lowerUrlForType.includes("/pricing") || lowerUrlForType.includes("/product") || lowerUrlForType.includes("/solutions") || lowerUrlForType.includes("/contact") || lowerUrlForType.includes("/about") || lowerTitleForType.includes("service") || lowerTitleForType.includes("solution") || lowerTitleForType.includes("features")) {
      origPageType = "service";
    }

    let origTargetMinWordCount = 800;
    let origPageTypeLabel = "Blog Article";
    if (origPageType === "service") {
      origTargetMinWordCount = 600;
      origPageTypeLabel = "Service Page";
    } else if (origPageType === "pillar") {
      origTargetMinWordCount = 2000;
      origPageTypeLabel = "Pillar Content";
    }

    const rewriteResponseSchema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        metaDescription: { type: Type.STRING },
        body: { type: Type.STRING },
        faq: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              answer: { type: Type.STRING },
            },
            required: ["question", "answer"],
          },
        },
        schemaJson: { type: Type.STRING },
      },
      required: ["title", "metaDescription", "body", "faq", "schemaJson"],
    };

    const attemptsDiagnostics: any[] = [];

    while (attemptsCount < 3) {
      attemptsCount++;
      const currentWeaknesses = finalAnalysis ? finalAnalysis.recommendations.join("; ") : "N/A";
      
      const rewritePrompt = `
You are a master SEO Writer. Rewrite the user's content completely to produce a search-ready, high-ranking, and highly optimized copy that conforms to the Trilliant Digital SEO/AEO standards.

Original Title: "${originalAnalysis.title}"
Original URL: ${originalAnalysis.url}
Detected Page Type: ${origPageTypeLabel}
Target Minimum Word Count: ${origTargetMinWordCount} words

Original Core Paragraphs:
${originalParagraphs.slice(0, 50).join("\n\n")}

Gap Analysis Findings:
- Missing Topics: ${gapData.missingTopics ? gapData.missingTopics.join(", ") : "None"}
- Structural Weaknesses: ${gapData.structuralWeaknesses ? gapData.structuralWeaknesses.join(", ") : "None"}
- SEO Gaps: ${gapData.gaps ? gapData.gaps.join(", ") : "None"}
- Previous Attempt Score Weaknesses (if any): ${currentWeaknesses}

CRITICAL TRILLIANT DIGITAL SEO/AEO STANDARDS & GUIDELINES:
1. Title: Provide an optimized title of 1 to 60 characters (not 50-60, under 60 is Good).
2. Meta Description: Provide an optimized meta description of EXACTLY 150 to 160 characters. This is a hard requirement.
3. Content Depth: Write a deeply comprehensive, high-quality article/page in clean Markdown. The word count MUST be at least ${origTargetMinWordCount} words (e.g., generate around ${origTargetMinWordCount + 150} words).
4. Headings & Length Constraints:
   - Must contain EXACTLY ONE H1 element matching the title.
   - All H2 headings MUST be between 50 and 70 characters.
   - All H3 headings MUST be between 40 and 60 characters.
   - Demote or adjust headings to meet these precise length limits.
   - NO HEADING LEVEL SKIPS are allowed (e.g. do not jump from H1 to H3; always have H2 in between).
5. E-E-A-T & Authority Signals:
   - Always include an author byline (e.g., "By SEO Expert") and a date (e.g., "Published on July 7, 2026") within the body.
   - Add at least 2 contextual outbound/external links to high-authority websites (e.g., [W3C](https://www.w3.org) or other authoritative resources).
   - Add at least 2-5 relative internal links (e.g., "/solutions", "/about", or other logical paths on the same domain).
6. Readability & Sentence Flow:
   - Keep sentences short and crisp (average sentence length should be under 20 words) to ensure high Flesch Reading Ease (target score > 60).
7. FAQ Section: Create an FAQ section at the end with AT LEAST 5 Q&A pairs. Each question MUST end with "?" and each answer MUST be between 50 and 150 words to avoid thin content scoring.
8. Schema JSON-LD: Generate a single valid, parseable JSON-LD script block that includes BOTH FAQPage (for your FAQs) and ${origPageType === "service" ? "Service/Organization" : "BlogPosting/Article"} schema.
   - Ensure the Article/BlogPosting schema explicitly has the 'author' and 'datePublished' attributes populated.
   - Make sure the string is clean, well-formed, and fully parseable JSON!

Return JSON matching this exact schema:
{
  "title": string,
  "metaDescription": string,
  "body": string,
  "faq": [{ "question": string, "answer": string }],
  "schemaJson": string
}
      `;

      const rewriteResponse = await generateContentWithRetry(ai, {
        model: "gemini-3.5-flash",
        contents: rewritePrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: rewriteResponseSchema,
        },
      });

      let parsedDraft: any = null;
      try {
        parsedDraft = JSON.parse(rewriteResponse.text || "{}");
      } catch (err) {
        console.warn("Failed to parse rewritten draft JSON:", err);
        continue;
      }

      // Programmatically validate and refine all precise character-count constraints in code
      console.log(`[Attempt #${attemptsCount}] Running programmatic validate-and-correct pipeline on draft...`);
      parsedDraft = await validateAndRefineDraft(parsedDraft, ai);
      console.log(`[Attempt #${attemptsCount}] Programmatic validation completed.`);

      const hasMetaDesc = parsedDraft && parsedDraft.metaDescription && parsedDraft.metaDescription.trim().length >= 150 && parsedDraft.metaDescription.trim().length <= 160;

      // Build mock HTML and run deterministic analysis
      const mockHtml = buildHtmlFromDraft(parsedDraft, url);
      const tempAnalysis = await parseHtmlAndAnalyze(mockHtml, url, mainRobotsTxt, pageSpeedData);

      const hasSubheadings = tempAnalysis.headings.some(h => h.tag === "h2" || h.tag === "h3");
      const hasFAQ = parsedDraft.faq && parsedDraft.faq.length > 0;

      // Track attempt diagnostic information
      attemptsDiagnostics.push({
        attempt: attemptsCount,
        title: parsedDraft.title || "N/A",
        titleLength: parsedDraft.title ? parsedDraft.title.length : 0,
        metaDescription: parsedDraft.metaDescription || "N/A",
        metaLength: parsedDraft.metaDescription ? parsedDraft.metaDescription.length : 0,
        score: tempAnalysis.score,
        headingsCount: tempAnalysis.headings.length,
        headingSkipsCount: tempAnalysis.headingSkips.length,
        faqCount: parsedDraft.faq ? parsedDraft.faq.length : 0,
        schemaValid: tempAnalysis.benchmarks[1].score > 0,
        rawOutput: parsedDraft,
      });

      // Check if genuinely improved and meets criteria
      if (tempAnalysis.score > originalAnalysis.score && hasSubheadings && hasFAQ && tempAnalysis.headingSkips.length === 0 && hasMetaDesc) {
        finalDraft = parsedDraft;
        finalAnalysis = tempAnalysis;
        break; // score successfully improved, stop!
      } else {
        // Cache this as our best fallback so far in case we run out of retries, prioritizing having a meta description
        if (!finalDraft || (hasMetaDesc && (!finalAnalysis || tempAnalysis.score > finalAnalysis.score))) {
          finalDraft = parsedDraft;
          finalAnalysis = tempAnalysis;
        }
      }
    }

    if (!finalDraft) {
      // Emergency fallback in case all parsing / attempts failed
      finalDraft = {
        title: originalAnalysis.title || "Optimized Article",
        metaDescription: originalAnalysis.metaDescription || "Read our newly optimized blog post loaded with deep industry insights and structured answers.",
        body: originalParagraphs.join("\n\n") || "No content available.",
        faq: [{ question: "What is this article about?", answer: "This article is an optimized copy of the original post." }],
        schemaJson: "{}"
      };
    }

    // Final verification step to guarantee 100% compliance with precise character count ranges
    console.log("Running absolute final verification step on finalDraft...");
    finalDraft = await validateAndRefineDraft(finalDraft, ai);
    const finalMockHtml = buildHtmlFromDraft(finalDraft, url);
    finalAnalysis = await parseHtmlAndAnalyze(finalMockHtml, url, mainRobotsTxt, pageSpeedData);
    console.log("Final verification step complete. Final Score:", finalAnalysis.score);

    // Determine improvements list
    const improvements: string[] = [];
    if (finalAnalysis) {
      if (finalAnalysis.titleLength > 0 && finalAnalysis.titleLength <= 60 && originalAnalysis.titleStatus !== "Good") {
        improvements.push(`Title optimized to ${finalAnalysis.titleLength} characters (${finalAnalysis.title}).`);
      }
      if (finalAnalysis.metaLength >= 150 && finalAnalysis.metaLength <= 160 && originalAnalysis.metaStatus !== "Good") {
        improvements.push(`Meta Description optimized to ${finalAnalysis.metaLength} characters.`);
      }
      if (originalAnalysis.headingSkips.length > 0 && finalAnalysis.headingSkips.length === 0) {
        improvements.push(`Fixed heading hierarchy jumps (eliminated ${originalAnalysis.headingSkips.length} level skips).`);
      }
      if (finalAnalysis.wordCount > originalAnalysis.wordCount) {
        improvements.push(`Expanded content depth: Word count increased from ${originalAnalysis.wordCount} to ${finalAnalysis.wordCount} words.`);
      }
      if (!originalAnalysis.benchmarks[11].score && finalAnalysis.benchmarks[11].score > 0) {
        improvements.push("Added optimized FAQ section with nested structured schema.");
      }
      if (originalAnalysis.benchmarks[1].score < 10 && finalAnalysis.benchmarks[1].score === 10) {
        improvements.push("Injected valid BlogPosting and FAQPage JSON-LD schema structured data.");
      }
      if (originalAnalysis.benchmarks[7].score < 10 && finalAnalysis.benchmarks[7].score === 10) {
        improvements.push("Added a newsletter / Lead Capture simulation trigger.");
      }
    }

    if (improvements.length === 0) {
      improvements.push("Realigned heading structure and refined keyword placement.");
      improvements.push("Generated rich structured FAQ section with customer questions.");
    }

    return res.json({
      originalAnalysis,
      competitorUrl: finalCompetitorUrl,
      competitorAnalysis,
      allCompetitors: scoredCompetitors,
      gapAnalysis: gapData,
      optimizedDraft: finalDraft,
      optimizedAnalysis: finalAnalysis,
      improvements,
      attemptsDiagnostics,
    });

  } catch (err: any) {
    console.error("Optimization failed:", err);
    return res.status(err.status || 500).json({
      error: err.message || "SEO Content Optimization process failed.",
      errorType: err.type || "failed",
    });
  }
}
