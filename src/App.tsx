import React, { useState } from "react";
import { 
  Search, 
  Sparkles, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  ArrowRight, 
  ExternalLink, 
  Copy, 
  Check, 
  RotateCw, 
  FileText, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Cpu, 
  Layers, 
  Globe, 
  Smartphone, 
  AlertOctagon, 
  Edit3, 
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  Terminal,
  ChevronDown
} from "lucide-react";
import { SEOAnalysis } from "../server";

function getBenchmarkRecommendation(benchmarkName: string, recommendations: string[]): string {
  const nameLower = benchmarkName.toLowerCase();
  
  if (nameLower.includes("title") || nameLower.includes("meta")) {
    const found = recommendations.find(r => r.includes("title") || r.includes("meta description") || r.includes("Meta description"));
    if (found) return found;
    return "Optimize your meta title (40-60 chars) and meta description (150-160 chars) for better search CTR.";
  }
  if (nameLower.includes("schema") || nameLower.includes("json-ld")) {
    const found = recommendations.find(r => r.includes("schema") || r.includes("JSON-LD"));
    if (found) return found;
    return "Incorporate structured schema data (Article/BlogPosting, FAQPage, BreadcrumbList) to trigger rich snippets.";
  }
  if (nameLower.includes("depth") || nameLower.includes("density") || nameLower.includes("word count")) {
    const found = recommendations.find(r => r.includes("word count") || r.includes("depth") || r.includes("words"));
    if (found) return found;
    return "Expand content depth to cover top competitor themes and meet the recommended word count.";
  }
  if (nameLower.includes("heading") || nameLower.includes("hierarchy") || nameLower.includes("structure")) {
    const found = recommendations.find(r => r.includes("H1") || r.includes("heading") || r.includes("Heading") || r.includes("subheading"));
    if (found) return found;
    return "Ensure heading sequences follow proper hierarchy and subheading lengths are optimized (H2: 50-70 chars, H3: 40-60 chars).";
  }
  if (nameLower.includes("lead") || nameLower.includes("capture") || nameLower.includes("conversion")) {
    const found = recommendations.find(r => r.includes("lead magnet") || r.includes("signup") || r.includes("conversion") || r.includes("newsletter"));
    if (found) return found;
    return "Embed an interactive lead magnet (e.g., email signup, free workbook, newsletter form) to boost visitor conversions.";
  }
  if (nameLower.includes("e-e-a-t") || nameLower.includes("authority") || nameLower.includes("verification")) {
    const found = recommendations.find(r => r.includes("E-E-A-T") || r.includes("author") || r.includes("date") || r.includes("byline"));
    if (found) return found;
    return "Establish E-E-A-T authority: Clearly specify the article's author byline and publication date stamp.";
  }
  if (nameLower.includes("internal") || nameLower.includes("crawl") || nameLower.includes("link")) {
    const found = recommendations.find(r => r.includes("internal") || r.includes("underlinked") || r.includes("hyperlink"));
    if (found) return found;
    return "Incorporate at least 2-5 internal contextual hyperlinks referencing your other domain services or blog directories.";
  }
  if (nameLower.includes("external") || nameLower.includes("references") || nameLower.includes("outbound")) {
    const found = recommendations.find(r => r.includes("external") || r.includes("outbound") || r.includes("trustworthy"));
    if (found) return found;
    return "Add outbound hyperlinks to trustworthy, high-domain-authority websites to enhance content credibility.";
  }
  if (nameLower.includes("faq") || nameLower.includes("aeo")) {
    const found = recommendations.find(r => r.includes("FAQ") || r.includes("faq") || r.includes("answers"));
    if (found) return found;
    return "Add an optimized FAQ section targeting search intents with detailed questions and answers (> 50 words).";
  }
  if (nameLower.includes("technical") || nameLower.includes("meta health")) {
    const found = recommendations.find(r => r.includes("HTTPS") || r.includes("canonical") || r.includes("viewport") || r.includes("language") || r.includes("lang="));
    if (found) return found;
    return "Incorporate technical meta health elements including canonical tags, mobile viewports, HTTPS, and language attributes.";
  }
  if (nameLower.includes("social") || nameLower.includes("graph") || nameLower.includes("shareability")) {
    const found = recommendations.find(r => r.includes("OpenGraph") || r.includes("og:") || r.includes("Twitter"));
    if (found) return found;
    return "Add OpenGraph meta tags and Twitter Card tags to control and optimize rich snippets on social shares.";
  }
  if (nameLower.includes("discoverability") || nameLower.includes("robots") || nameLower.includes("index")) {
    const found = recommendations.find(r => r.includes("sitemap") || r.includes("robots.txt") || r.includes("noindex"));
    if (found) return found;
    return "Declare the XML sitemap URL explicitly in the robots.txt file and remove any 'noindex' robot directives.";
  }
  if (nameLower.includes("flesch") || nameLower.includes("readability")) {
    const found = recommendations.find(r => r.includes("Flesch") || r.includes("Reading Ease") || r.includes("readability") || r.includes("sentences"));
    if (found) return found;
    return "Improve Flesch Reading Ease score. Shorten sentences to average under 20 words and use simpler terminology.";
  }
  if (nameLower.includes("image") || nameLower.includes("alt") || nameLower.includes("media")) {
    const found = recommendations.find(r => r.includes("image") || r.includes("alt text") || r.includes("filenames") || r.includes("Alt"));
    if (found) return found;
    return "Ensure embedded images contain descriptive alt tags, short descriptions (<100 chars), and search-friendly filenames.";
  }

  return "Optimize content and structure to improve this benchmark score.";
}

export default function App() {
  // Form Inputs
  const [url, setUrl] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [targetTopic, setTargetTopic] = useState("");

  // Tabs
  const [activeTab, setActiveTab] = useState<"analysis" | "optimized">("analysis");

  // Cached Results
  const [analyzedUrl, setAnalyzedUrl] = useState<string | null>(null);
  const [cachedAnalysis, setCachedAnalysis] = useState<SEOAnalysis | null>(null);

  const [optimizedUrl, setOptimizedUrl] = useState<string | null>(null);
  const [cachedOptimization, setCachedOptimization] = useState<{
    originalAnalysis: SEOAnalysis;
    competitorUrl: string;
    competitorAnalysis: SEOAnalysis | null;
    allCompetitors?: { url: string; score: number; wordCount: number; title: string }[];
    gapAnalysis: {
      gaps: string[];
      missingTopics: string[];
      structuralWeaknesses: string[];
      contentRecommendations: string[];
    };
    optimizedDraft: {
      title: string;
      metaDescription: string;
      body: string;
      faq: { question: string; answer: string }[];
      schemaJson: string;
    };
    optimizedAnalysis: SEOAnalysis;
    improvements: string[];
    attemptsDiagnostics?: any[];
  } | null>(null);

  // Loading & Error States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<{ message: string; type: string } | null>(null);
  
  // Custom interactive state for optimization steps
  const [optStep, setOptStep] = useState(0);

  // Draft Editor Interactive state
  const [editMode, setEditMode] = useState<"preview" | "edit">("preview");
  const [editableBody, setEditableBody] = useState("");
  const [editableTitle, setEditableTitle] = useState("");
  const [editableMeta, setEditableMeta] = useState("");

  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Clear caches when URL field changes
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUrl(val);
    // Clear caches
    setAnalyzedUrl(null);
    setCachedAnalysis(null);
    setOptimizedUrl(null);
    setCachedOptimization(null);
    setError(null);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const triggerStepCounter = () => {
    setOptStep(1);
    const t1 = setTimeout(() => setOptStep(2), 3000);
    const t2 = setTimeout(() => setOptStep(3), 6000);
    const t3 = setTimeout(() => setOptStep(4), 10000);
    const t4 = setTimeout(() => setOptStep(5), 13000);
    return [t1, t2, t3, t4];
  };

  // Run SEO Analysis (Deterministic)
  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url) {
      setError({ message: "Please input a valid Blog Post URL.", type: "validation" });
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setActiveTab("analysis");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze URL.");
      }

      setCachedAnalysis(data.analysis);
      setAnalyzedUrl(url);
    } catch (err: any) {
      setError({ 
        message: err.message || "Something went wrong while requesting SEO analysis.", 
        type: err.type || "failed" 
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Run AI Optimization (Gemini workflow)
  const handleOptimize = async (forceReoptimize = false) => {
    if (!url) {
      setError({ message: "Please input a valid Blog Post URL.", type: "validation" });
      return;
    }

    // Check Cache first
    if (!forceReoptimize && optimizedUrl === url && cachedOptimization) {
      setActiveTab("optimized");
      return;
    }

    setIsOptimizing(true);
    setError(null);
    setActiveTab("optimized");
    
    const timers = triggerStepCounter();

    try {
      const response = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          url, 
          competitorUrl: competitorUrl || undefined, 
          topic: targetTopic || undefined 
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Optimization run failed.");
      }

      setCachedOptimization(data);
      setOptimizedUrl(url);
      setEditableTitle(data.optimizedDraft.title);
      setEditableMeta(data.optimizedDraft.metaDescription);
      setEditableBody(data.optimizedDraft.body);
    } catch (err: any) {
      setError({ 
        message: err.message || "The Gemini SEO Optimization process failed.", 
        type: err.type || "failed" 
      });
    } finally {
      setIsOptimizing(false);
      timers.forEach(clearTimeout);
      setOptStep(0);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Good":
      case "Optimized":
      case "Excellent":
      case "Present":
      case "Present & Valid":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Needs Improvement":
      case "Too Short":
      case "Too Long":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Critical":
      case "Missing":
      case "Present but Invalid":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  const isPageSpeedMeasured = cachedAnalysis?.benchmarks?.find(b => b.name === "Page Speed")?.status !== "Not Measurable";
  const apiDisclaimer = cachedAnalysis 
    ? (isPageSpeedMeasured 
        ? `(${cachedAnalysis.score}/94 achievable without off-page backlink APIs)`
        : `(${cachedAnalysis.score}/86 achievable without external APIs)`)
    : "";

  const isOptPageSpeedMeasured = cachedOptimization?.optimizedAnalysis?.benchmarks?.find(b => b.name === "Page Speed")?.status !== "Not Measurable";
  const optOriginalDisclaimer = cachedOptimization 
    ? (isOptPageSpeedMeasured
        ? `(${cachedOptimization.originalAnalysis.score}/94 achievable without off-page backlink APIs)`
        : `(${cachedOptimization.originalAnalysis.score}/86 achievable without external APIs)`)
    : "";
  const optOptimizedDisclaimer = cachedOptimization 
    ? (isOptPageSpeedMeasured
        ? `(${cachedOptimization.optimizedAnalysis.score}/94 achievable without off-page backlink APIs)`
        : `(${cachedOptimization.optimizedAnalysis.score}/86 achievable without external APIs)`)
    : "";

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans antialiased pb-16 flex flex-col justify-between">
      {/* Top Banner / Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                AI Blog SEO Optimizer
              </h1>
              <p className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">
                Dual-Engine SEO Intelligence
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              Deterministic + GenAI
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 pt-8 sm:px-6 lg:px-8">
        {/* Input SEO Dashboard Form */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-display text-xl font-semibold tracking-tight text-slate-900 mb-5 flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-600" />
            SEO Analysis & Rewrite Engine
          </h2>
          <form onSubmit={handleAnalyze} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-12">
              {/* Blog Post URL input */}
              <div className="md:col-span-6">
                <label htmlFor="blogUrl" className="block text-xs font-medium text-slate-600 uppercase tracking-wider mb-1">
                  Blog Post URL <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-lg shadow-xs">
                  <input
                    type="url"
                    name="blogUrl"
                    id="blogUrl"
                    required
                    value={url}
                    onChange={handleUrlChange}
                    placeholder="https://myblog.com/posts/seo-guide"
                    className="block w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 pl-3 pr-10 text-sm placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-hidden"
                  />
                </div>
              </div>

              {/* Target topic / keyword */}
              <div className="md:col-span-3">
                <label htmlFor="topic" className="block text-xs font-medium text-slate-600 uppercase tracking-wider mb-1">
                  Target Keyword / Topic
                </label>
                <input
                  type="text"
                  name="topic"
                  id="topic"
                  value={targetTopic}
                  onChange={(e) => setTargetTopic(e.target.value)}
                  placeholder="e.g. AI Content Strategy"
                  className="block w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 px-3 text-sm placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-hidden"
                />
              </div>

              {/* Competitor URL */}
              <div className="md:col-span-3">
                <label htmlFor="competitor" className="block text-xs font-medium text-slate-600 uppercase tracking-wider mb-1">
                  Competitor URL (Optional)
                </label>
                <input
                  type="url"
                  name="competitor"
                  id="competitor"
                  value={competitorUrl}
                  onChange={(e) => setCompetitorUrl(e.target.value)}
                  placeholder="https://competitor.com/blog-post"
                  className="block w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 px-3 text-sm placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-hidden"
                />
              </div>
            </div>

            {/* CTA Actions Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={isAnalyzing || isOptimizing}
                id="btn-analyze"
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 transition cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing HTML...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Analyze SEO
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleOptimize(false)}
                disabled={isAnalyzing || isOptimizing}
                id="btn-optimize"
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition cursor-pointer"
              >
                {isOptimizing ? (
                  <>
                    <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                    Optimizing via Gemini...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Optimize Content
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Dynamic Display of Current URL under context (CRITICAL RULE) */}
        {(analyzedUrl || optimizedUrl) && (
          <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between rounded-xl bg-slate-800 text-white p-4 shadow-xs">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="rounded-lg bg-slate-700 p-2 text-blue-400 shrink-0">
                <Globe className="h-5 w-5" />
              </div>
              <div className="overflow-hidden">
                <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase block">ACTIVE TARGET URL</span>
                <span className="font-mono text-xs sm:text-sm truncate block font-bold text-slate-200">
                  {analyzedUrl || optimizedUrl}
                </span>
              </div>
            </div>
            {targetTopic && (
              <div className="mt-2 md:mt-0 px-3 py-1 rounded-md bg-slate-700/60 border border-slate-600/50 self-start md:self-auto text-xs font-mono text-slate-300">
                Keyword: <span className="text-white font-semibold">{targetTopic}</span>
              </div>
            )}
          </div>
        )}

        {/* Global Error Alerts */}
        {error && (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 shadow-xs">
            <div className="flex items-start space-x-3">
              <AlertOctagon className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-rose-800">SEO Operation Failed</h3>
                <p className="mt-1 text-xs text-rose-700 font-mono leading-relaxed bg-white/50 p-2.5 rounded-lg border border-rose-100 mt-2">
                  {error.message}
                </p>
                <div className="mt-3 flex items-center space-x-2 text-xs text-rose-600 font-medium">
                  <span>Type: <strong className="font-mono uppercase">{error.type}</strong></span>
                  <span>•</span>
                  <span>Check network status, SSL configurations, or search parameters and try again.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Multi-Step Optimization Loader */}
        {isOptimizing && (
          <div className="mt-6 rounded-2xl border border-blue-100 bg-white p-8 shadow-sm text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 animate-pulse mb-6">
              <Sparkles className="h-7 w-7 animate-spin duration-3000" />
            </div>
            <h3 className="font-display text-lg font-bold text-slate-900 mb-2">Engaging SEO Optimization Loop...</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
              Gemini is carrying out on-page gap analysis, rewriting structure, and deterministic score validation.
            </p>
            
            {/* Steps tracker */}
            <div className="max-w-md mx-auto space-y-3.5 text-left border-t border-slate-100 pt-5">
              <div className="flex items-center space-x-3">
                <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${optStep >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  {optStep > 1 ? "✓" : "1"}
                </div>
                <span className={`text-xs ${optStep === 1 ? 'text-blue-600 font-semibold animate-pulse' : (optStep > 1 ? 'text-slate-500 line-through' : 'text-slate-400')}`}>
                  Fetching and parsing blog raw HTML source...
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${optStep >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  {optStep > 2 ? "✓" : "2"}
                </div>
                <span className={`text-xs ${optStep === 2 ? 'text-blue-600 font-semibold animate-pulse' : (optStep > 2 ? 'text-slate-500 line-through' : 'text-slate-400')}`}>
                  {competitorUrl ? "Analyzing competitor SEO profile..." : "Querying Google Search Grounding for competitor blogs..."}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${optStep >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  {optStep > 3 ? "✓" : "3"}
                </div>
                <span className={`text-xs ${optStep === 3 ? 'text-blue-600 font-semibold animate-pulse' : (optStep > 3 ? 'text-slate-500 line-through' : 'text-slate-400')}`}>
                  Running AI comparative Gap Analysis and listing topic shortages...
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${optStep >= 4 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  {optStep > 4 ? "✓" : "4"}
                </div>
                <span className={`text-xs ${optStep === 4 ? 'text-blue-600 font-semibold animate-pulse' : (optStep > 4 ? 'text-slate-500 line-through' : 'text-slate-400')}`}>
                  Rewriting Title, Meta, Heading structure, and FAQs via Gemini...
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${optStep >= 5 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  5
                </div>
                <span className={`text-xs ${optStep === 5 ? 'text-blue-600 font-semibold animate-pulse' : 'text-slate-400'}`}>
                  Running deterministic validation on draft content to verify H2/H3s and FAQ...
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab Switching Rail */}
        {(cachedAnalysis || cachedOptimization) && (
          <div className="mt-8 border-b border-slate-200">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab("analysis")}
                className={`border-b-2 py-3 px-1 text-sm font-semibold transition cursor-pointer ${
                  activeTab === "analysis"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                }`}
              >
                Deterministic Analysis
                {cachedAnalysis && (
                  <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-600">
                    {cachedAnalysis.score}/100
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("optimized")}
                className={`border-b-2 py-3 px-1 text-sm font-semibold transition cursor-pointer ${
                  activeTab === "optimized"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                }`}
              >
                AI Optimized Content
                {cachedOptimization && (
                  <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-600">
                    {cachedOptimization.optimizedAnalysis.score}/100
                  </span>
                )}
              </button>
            </nav>
          </div>
        )}

        {/* =========================================================================
            TAB 1: DETERMINISTIC ANALYSIS VIEW
            ========================================================================= */}
        {activeTab === "analysis" && cachedAnalysis && (
          <div className="mt-6 space-y-6">
            {/* Circular score banner and overview */}
            <div className="grid gap-6 md:grid-cols-12">
              <div className="md:col-span-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col items-center justify-center text-center">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">SEO Health Score</span>
                <div className="relative flex items-center justify-center">
                  <svg className="h-36 w-36 rotate-270 transform">
                    <circle
                      cx="72"
                      cy="72"
                      r="64"
                      className="text-slate-100"
                      strokeWidth="10"
                      fill="transparent"
                      stroke="currentColor"
                    />
                    <circle
                      cx="72"
                      cy="72"
                      r="64"
                      className="text-blue-600 transition-all duration-1000"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={402}
                      strokeDashoffset={402 - (402 * cachedAnalysis.score) / 100}
                      strokeLinecap="round"
                      stroke="currentColor"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-3xl font-extrabold text-slate-950 font-display">
                      {cachedAnalysis.score}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      / {cachedAnalysis.maxScore} MAX
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 flex flex-col items-center">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold border ${
                    cachedAnalysis.score >= 80 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                      : (cachedAnalysis.score >= 50 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-rose-50 text-rose-700 border-rose-200")
                  }`}>
                    {cachedAnalysis.score >= 80 ? "SEO Optimized" : (cachedAnalysis.score >= 50 ? "Needs Improvement" : "Critical SEO Risks")}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium mt-2">
                    {apiDisclaimer}
                  </span>
                </div>
              </div>

              {/* Title & Meta Descriptions detailed metrics */}
              <div className="md:col-span-8 grid gap-4 sm:grid-cols-2">
                {/* Title Analysis Card */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Page &lt;title&gt;</span>
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold border ${getStatusColor(cachedAnalysis.titleStatus)}`}>
                        {cachedAnalysis.titleStatus}
                      </span>
                    </div>
                    {cachedAnalysis.title ? (
                      <p className="text-sm font-medium text-slate-900 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                        "{cachedAnalysis.title}"
                      </p>
                    ) : (
                      <p className="text-sm italic text-rose-600 font-medium">Missing &lt;title&gt; element!</p>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Length: <strong>{cachedAnalysis.titleLength} characters</strong></span>
                    <span className="text-slate-400">Target: 50–60 chars</span>
                  </div>
                </div>

                {/* Meta Description Analysis Card */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Meta Description</span>
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold border ${getStatusColor(cachedAnalysis.metaStatus)}`}>
                        {cachedAnalysis.metaStatus}
                      </span>
                    </div>
                    {cachedAnalysis.metaDescription ? (
                      <p className="text-sm font-medium text-slate-900 bg-slate-50 p-3 rounded-lg border border-slate-100 line-clamp-3">
                        {cachedAnalysis.metaDescription}
                      </p>
                    ) : (
                      <p className="text-sm italic text-rose-600 font-medium">Missing meta description attribute!</p>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Length: <strong>{cachedAnalysis.metaLength} characters</strong></span>
                    <span className="text-slate-400">Target: 120–160 chars</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Metrics Bento Grid */}
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Word Count</span>
                <span className="font-display text-2xl font-bold text-slate-900 block">{cachedAnalysis.wordCount}</span>
                <span className="text-[10px] text-slate-500 block mt-1">Target: 800+ words</span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Content Blocks</span>
                <span className="font-display text-2xl font-bold text-slate-900 block">{cachedAnalysis.contentBlocksCount}</span>
                <span className="text-[10px] text-slate-500 block mt-1">p & li element count</span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Images & ALT Tags</span>
                <span className="font-display text-2xl font-bold text-slate-900 block">{cachedAnalysis.imageCount}</span>
                <span className={`inline-flex mt-1 items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold border ${getStatusColor(cachedAnalysis.altStatus)}`}>
                  {cachedAnalysis.imagesWithAlt}/{cachedAnalysis.imageCount} Alt Tagged ({cachedAnalysis.altStatus})
                </span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">On-Page Links</span>
                <span className="font-display text-2xl font-bold text-blue-600 block">
                  {cachedAnalysis.internalLinksCount} / {cachedAnalysis.externalLinksCount}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">Internal / External links</span>
              </div>
            </div>

            {/* Heading Hierarchy Map and skip warnings */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Heading Outline Mapping
                  </h3>
                  {cachedAnalysis.multipleH1s && (
                    <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 border border-rose-100">
                      Multiple H1s!
                    </span>
                  )}
                </div>

                {cachedAnalysis.multipleH1s && (
                  <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-700 flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      <strong>Multiple H1 elements found:</strong> Search crawlers prefer a single primary H1 title per page to resolve primary semantic topical intent. Convert extra H1 tags into H2s.
                    </span>
                  </div>
                )}

                <div className="max-h-72 overflow-y-auto space-y-2 border border-slate-100 rounded-lg p-3 bg-slate-50/50">
                  {cachedAnalysis.headings.length > 0 ? (
                    cachedAnalysis.headings.map((h, idx) => (
                      <div 
                        key={idx} 
                        className={`text-xs p-1.5 rounded-sm border ${
                          h.tag === "h1" 
                            ? "pl-2 bg-blue-50 border-blue-100 text-blue-800 font-bold" 
                            : (h.tag === "h2" ? "pl-6 bg-slate-100 border-slate-200 text-slate-800 font-semibold" : "pl-10 bg-transparent border-transparent text-slate-600")
                        }`}
                      >
                        <span className="font-mono text-[9px] uppercase tracking-wider text-slate-400 mr-2">{h.tag}</span>
                        {h.text}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-400 text-xs italic">
                      No H1, H2, or H3 headings detected in parsed HTML!
                    </div>
                  )}
                </div>
              </div>

              {/* Heading Jumps alert panel */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <h3 className="font-display text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Heading Level Jump Alerts
                </h3>
                {cachedAnalysis.headingSkips.length > 0 ? (
                  <div className="space-y-3">
                    {cachedAnalysis.headingSkips.map((skip, idx) => (
                      <div key={idx} className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 leading-relaxed font-mono">
                        {skip}
                      </div>
                    ))}
                    <p className="text-[10px] text-slate-400 leading-normal mt-2">
                      * Establishing a sequential progression of headers (e.g. H2 followed by H3, never jumping H2 to H4) ensures optimal semantic reading structure.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center py-12 border-2 border-dashed border-slate-100 rounded-xl">
                    <CheckCircle className="h-8 w-8 text-emerald-500 mb-2" />
                    <span className="text-xs font-semibold text-slate-700">Perfect Heading Sequence</span>
                    <span className="text-[10px] text-slate-500">No logical heading skips detected!</span>
                  </div>
                )}
              </div>
            </div>

            {/* Technical Checklist Grid */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h3 className="font-display text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
                On-Page Technical SEO Checks
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {Object.entries(cachedAnalysis.technical).map(([key, value]) => {
                  const labelMap: Record<string, string> = {
                    https: "HTTPS Secure",
                    canonical: "Canonical URL",
                    viewport: "Viewport Meta (Mobile)",
                    lang: "HTML Language Lang",
                    robots: "Robots Directives",
                    og: "Open Graph Tags",
                    twitter: "Twitter Card Tags",
                    favicon: "Favicon Setup",
                    schema: "JSON-LD Schema Markup",
                  };
                  const valStr = value as string;
                  return (
                    <div key={key} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                      <span className="text-xs font-medium text-slate-700">{labelMap[key] || key}</span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${getStatusColor(valStr)}`}>
                        {valStr === "Present" || valStr === "Present & Valid" ? (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        ) : (
                          <XCircle className="h-3 w-3 mr-1" />
                        )}
                        {valStr}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actionable To-Do Rule Recommendations list (No LLM) */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <h3 className="font-display text-base font-bold text-slate-900 mb-4 flex items-center gap-1.5">
                <FileText className="h-5 w-5 text-blue-600" />
                Deterministic To-Do Recommendations
              </h3>
              {cachedAnalysis.recommendations.length > 0 ? (
                <ul className="space-y-3">
                  {cachedAnalysis.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start text-xs text-slate-700">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 mr-3">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed mt-0.5">{rec}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-800 font-semibold text-center">
                  Congratulations! All evaluated deterministic on-page rules have passed successfully!
                </div>
              )}
            </div>

            {/* 14-Benchmark Full Table */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
              <div className="bg-slate-50 p-4 border-b border-slate-200">
                <h3 className="font-display text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Full 14-Benchmark Scoring Audit Breakdown
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 font-semibold text-slate-700">
                    <tr>
                      <th className="px-6 py-3">Audit Benchmark</th>
                      <th className="px-6 py-3">Score</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Evaluation Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {cachedAnalysis.benchmarks.map((b, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-semibold text-slate-900">{b.name}</td>
                        <td className="px-6 py-4 font-mono font-medium">
                          {b.score} / {b.maxScore}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold border ${getStatusColor(b.status)}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 max-w-sm leading-normal">{b.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: AI OPTIMIZED VIEW
            ========================================================================= */}
        {activeTab === "optimized" && (
          <div className="mt-6">
            {!cachedOptimization && !isOptimizing ? (
              // Empty State for Optimization tab
              <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center max-w-md mx-auto my-8">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 mb-4">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">No Optimized Draft Cached</h3>
                <p className="mt-1 text-xs text-slate-500">
                  We haven't generated an optimized draft yet. Fill in the parameters in the top form and click "Optimize Content" to begin the full workflow.
                </p>
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => handleOptimize(false)}
                    className="inline-flex items-center rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-500 cursor-pointer"
                  >
                    Optimize Now
                  </button>
                </div>
              </div>
            ) : cachedOptimization ? (
              // Optimization data is ready to display!
              <div className="space-y-6">
                
                {/* Score and Force Re-optimize Actions Bar */}
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-5 shadow-xs ${
                  cachedOptimization.optimizedAnalysis.score > cachedOptimization.originalAnalysis.score
                    ? "border-emerald-200 bg-emerald-50/40"
                    : "border-amber-200 bg-amber-50/40"
                }`}>
                  <div className="flex items-center space-x-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                      cachedOptimization.optimizedAnalysis.score > cachedOptimization.originalAnalysis.score
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-amber-100 text-amber-600"
                    }`}>
                      <Sparkles className="h-6 w-6 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-slate-950">
                        {cachedOptimization.optimizedAnalysis.score > cachedOptimization.originalAnalysis.score
                          ? "Content Fully Optimized via Gemini"
                          : "SEO Optimization Process Completed"}
                      </h3>
                      <p className="text-xs text-slate-600">
                        {cachedOptimization.optimizedAnalysis.score > cachedOptimization.originalAnalysis.score
                          ? "We conducted search comparisons, mapped contents, and rewrote layout down to H2/H3 hierarchies."
                          : "We conducted search comparisons and content structure refinements, but did not yield a higher audit score."}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOptimize(true)}
                    className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition shadow-xs cursor-pointer"
                  >
                    <RotateCw className="mr-1.5 h-3.5 w-3.5" />
                    Re-optimize Fresh
                  </button>
                </div>

                {/* Score Comparison Display */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Original Score Scorecard */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Original Audit Score
                      </span>
                      <span className="font-display text-3xl font-black text-slate-900 block leading-tight">
                        {cachedOptimization.originalAnalysis.score}/100
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 block mt-1">
                        {optOriginalDisclaimer}
                      </span>
                      <span className="text-xs text-slate-500 mt-2 block">
                        Calculated deterministically from the raw scraped HTML.
                      </span>
                    </div>
                    <div className="h-16 w-16 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-slate-500">
                      <FileText className="h-8 w-8" />
                    </div>
                  </div>

                  {/* Optimized Score Scorecard */}
                  <div className={`rounded-xl border p-5 shadow-xs flex items-center justify-between ${
                    cachedOptimization.optimizedAnalysis.score > cachedOptimization.originalAnalysis.score
                      ? "border-emerald-200 bg-emerald-50/50"
                      : "border-amber-200 bg-amber-50/50"
                  }`}>
                    <div>
                      <span className={`text-xs font-bold uppercase tracking-wider block mb-1 ${
                        cachedOptimization.optimizedAnalysis.score > cachedOptimization.originalAnalysis.score
                          ? "text-emerald-700"
                          : "text-amber-700"
                      }`}>
                        AI Optimized Audit Score
                      </span>
                      <span className={`font-display text-3xl font-black block leading-tight ${
                        cachedOptimization.optimizedAnalysis.score > cachedOptimization.originalAnalysis.score
                          ? "text-emerald-800"
                          : "text-amber-800"
                      }`}>
                        {cachedOptimization.optimizedAnalysis.score}/100
                      </span>
                      <span className={`text-[11px] font-semibold block mt-1 ${
                        cachedOptimization.optimizedAnalysis.score > cachedOptimization.originalAnalysis.score
                          ? "text-emerald-600"
                          : "text-amber-600"
                      }`}>
                        {optOptimizedDisclaimer}
                      </span>
                      {cachedOptimization.optimizedAnalysis.score > cachedOptimization.originalAnalysis.score ? (
                        <span className="text-xs text-emerald-700 font-semibold mt-2 block">
                          Gain: +{cachedOptimization.optimizedAnalysis.score - cachedOptimization.originalAnalysis.score} Points Improved
                        </span>
                      ) : (
                        <span className="text-xs text-amber-700 font-semibold mt-2 block">
                          Optimization did not improve the score ({cachedOptimization.optimizedAnalysis.score - cachedOptimization.originalAnalysis.score} points)
                        </span>
                      )}
                    </div>
                    <div className={`h-16 w-16 flex items-center justify-center rounded-full ${
                      cachedOptimization.optimizedAnalysis.score > cachedOptimization.originalAnalysis.score
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-amber-100 text-amber-600"
                    }`}>
                      {cachedOptimization.optimizedAnalysis.score > cachedOptimization.originalAnalysis.score ? (
                        <CheckCircle2 className="h-10 w-10" />
                      ) : (
                        <XCircle className="h-10 w-10" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Remaining Gaps to Reach Maximum Score Section */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-display text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Layers className="h-4 w-4 text-blue-600" />
                      Remaining Gaps to Reach Maximum Score
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Review the remaining gaps preventing this page from achieving a flawless 100/100 score.
                    </p>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Category 1: Fixable */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-50 text-amber-600">
                          <Edit3 className="h-3.5 w-3.5" />
                        </span>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                          Fixable — requires content/structure changes
                        </h4>
                      </div>

                      {(() => {
                        const fixableGaps = cachedOptimization.optimizedAnalysis.benchmarks.filter(
                          b => b.score < b.maxScore && b.name !== "Page Speed" && b.name !== "Backlinks Planning"
                        );

                        if (fixableGaps.length === 0) {
                          return (
                            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-800 font-semibold flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                              <span>No remaining fixable gaps! Content and structure are fully optimized.</span>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                            {fixableGaps.map((b, idx) => {
                              const fixNeeded = getBenchmarkRecommendation(
                                b.name, 
                                cachedOptimization.optimizedAnalysis.recommendations
                              );
                              return (
                                <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-800">{b.name}</span>
                                    <span className="font-mono text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                                      {b.score} / {b.maxScore}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-600 leading-relaxed">
                                    <strong className="text-slate-800">Fix Needed:</strong> {fixNeeded}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Category 2: Structurally Capped */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                          <Cpu className="h-3.5 w-3.5" />
                        </span>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                          Structurally capped — requires external API integration
                        </h4>
                      </div>

                      <div className="rounded-lg bg-blue-50/80 border border-blue-100 p-4 text-xs text-blue-800 leading-relaxed">
                        <p className="font-semibold mb-1">Google PageSpeed Insights Integrated</p>
                        Real page performance, Largest Contentful Paint (LCP), and Cumulative Layout Shift (CLS) are dynamically measured using your PageSpeed Insights API key. Backlinks planning still requires a live Moz/Ahrefs API integration to query off-page authority signals.
                      </div>

                      {(() => {
                        const cappedGaps = cachedOptimization.optimizedAnalysis.benchmarks.filter(
                          b => b.name === "Page Speed" || b.name === "Backlinks Planning"
                        );

                        return (
                          <div className="space-y-3">
                            {cappedGaps.map((b, idx) => (
                              <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-xs font-bold text-slate-800">{b.name}</span>
                                  <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                    {b.score} / {b.maxScore}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                  {b.name === "Page Speed" 
                                    ? "Requires real PageSpeed Insights API key to measure and grade actual Core Web Vitals, server response speed, and asset sizing."
                                    : "Requires real Ahrefs or Moz API data integration to query live off-page backlink equity and domain authority signals."}
                                </p>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Gap Analysis & Discovered Competitors section */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 mb-4 gap-2">
                    <h3 className="font-display text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Globe className="h-4 w-4 text-blue-600" />
                      Competitive SEO Gap Audit
                    </h3>
                    <span className="text-xs font-mono text-slate-500">
                      Primary Competitor: <strong className="text-blue-600 break-all">{cachedOptimization.competitorUrl || "AI Search Grounding"}</strong>
                    </span>
                  </div>

                  {/* All Competitors Scored List */}
                  {cachedOptimization.allCompetitors && cachedOptimization.allCompetitors.length > 0 ? (
                    <div className="mb-5 space-y-2">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Deterministically Scored Search Competitors:</div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {cachedOptimization.allCompetitors.map((comp, idx) => {
                          let hostname = "Competitor";
                          try {
                            hostname = new URL(comp.url).hostname;
                          } catch {}
                          return (
                            <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs flex flex-col justify-between">
                              <div>
                                <div className="font-semibold text-slate-800 truncate mb-1" title={comp.url}>
                                  {hostname}
                                </div>
                                <div className="space-y-1 text-slate-500">
                                  <div>Word Count: <strong className="text-slate-700">{comp.wordCount} words</strong></div>
                                  <div>SEO Score: <strong className="text-blue-600">{comp.score} / 100</strong></div>
                                </div>
                              </div>
                              <a 
                                href={comp.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="mt-2.5 text-[10px] font-semibold text-blue-600 hover:text-blue-500 flex items-center gap-0.5 self-start"
                              >
                                View Source <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : cachedOptimization.competitorAnalysis ? (
                    <div className="mb-4 bg-slate-50/80 p-3 rounded-lg border border-slate-100 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
                      <span>Fetched Competitor: <strong>{new URL(cachedOptimization.competitorUrl).hostname}</strong></span>
                      <span>Competitor Word Count: <strong>{cachedOptimization.competitorAnalysis.wordCount} words</strong></span>
                      <span>Competitor Score: <strong>{cachedOptimization.competitorAnalysis.score} / 100</strong></span>
                    </div>
                  ) : null}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3 bg-blue-50/30 p-4 rounded-xl border border-blue-100/40">
                      <span className="text-xs font-bold text-blue-900 block uppercase tracking-wider">Discovered Content Gaps</span>
                      <ul className="space-y-2 text-xs text-slate-700">
                        {cachedOptimization.gapAnalysis.gaps.map((gap, idx) => (
                          <li key={idx} className="flex items-start">
                            <span className="text-blue-600 mr-2 font-bold">•</span>
                            <span className="leading-relaxed">{gap}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-3 bg-amber-50/30 p-4 rounded-xl border border-amber-100/40">
                      <span className="text-xs font-bold text-amber-900 block uppercase tracking-wider">Missing Topics & Key terms</span>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {cachedOptimization.gapAnalysis.missingTopics.map((topic, idx) => (
                          <span key={idx} className="rounded-md bg-white border border-amber-200 px-2 py-1 text-xs text-amber-800 font-medium">
                            {topic}
                          </span>
                        ))}
                      </div>
                      <div className="pt-2 text-[10px] text-slate-500">
                        These structural terms were integrated into the rewritten draft below.
                      </div>
                    </div>
                  </div>
                </div>

                {/* What Improved Bullet list */}
                <div className="rounded-xl border border-emerald-200 bg-white p-5 shadow-xs">
                  <h3 className="font-display text-sm font-bold text-emerald-800 uppercase tracking-wider mb-3">
                    Audit Improvement Checklist
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {cachedOptimization.improvements.map((imp, idx) => (
                      <div key={idx} className="flex items-start text-xs text-slate-700 bg-emerald-50/30 border border-emerald-100 p-2.5 rounded-lg">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mr-2 mt-0.5" />
                        <span className="leading-relaxed font-medium">{imp}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Collapsible Debug diagnostics block */}
                <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 shadow-xs">
                  <details className="group">
                    <summary className="flex items-center justify-between cursor-pointer font-semibold text-slate-800 text-xs uppercase tracking-wider select-none">
                      <span className="flex items-center gap-1.5 text-blue-800">
                        <Terminal className="h-4 w-4 text-blue-600" />
                        DEBUG: Raw Gemini Optimization Diagnostics & Retry Logs
                      </span>
                      <span className="text-blue-500 group-open:rotate-180 transition-transform duration-200">
                        <ChevronDown className="h-4 w-4" />
                      </span>
                    </summary>
                    <div className="mt-4 pt-4 border-t border-blue-200/50 space-y-4">
                      {/* Sub-item 1: Gap List received as input */}
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Gap Analysis Input Payload</span>
                        <div className="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-[11px] overflow-auto max-h-40">
                          <pre>{JSON.stringify(cachedOptimization.gapAnalysis, null, 2)}</pre>
                        </div>
                      </div>

                      {/* Sub-item 2: Loop attempts diagnostics */}
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Optimization Loop Attempts ({cachedOptimization.attemptsDiagnostics?.length || 0} run)</span>
                        <div className="space-y-2">
                          {cachedOptimization.attemptsDiagnostics?.map((attempt: any, idx: number) => (
                            <div key={idx} className="bg-white border border-slate-200 rounded-lg p-3 text-xs shadow-xs">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-slate-900">Attempt #{attempt.attempt}</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">Score: {attempt.score} / 100</span>
                              </div>
                              <div className="grid gap-2 sm:grid-cols-2 text-[11px] text-slate-600">
                                <div className="truncate"><strong>Title:</strong> "{attempt.title}" ({attempt.titleLength} ch)</div>
                                <div className="truncate"><strong>Meta Description:</strong> "{attempt.metaDescription}" ({attempt.metaLength} ch)</div>
                                <div><strong>Headings Count:</strong> {attempt.headingsCount} (Hierarchy Skips: {attempt.headingSkipsCount})</div>
                                <div><strong>FAQs Count:</strong> {attempt.faqCount} | <strong>Schema Valid:</strong> {attempt.schemaValid ? "Yes" : "No"}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Sub-item 3: Full Raw Gemini Draft Generated */}
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Raw Selected Gemini Draft JSON</span>
                        <div className="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-[11px] overflow-auto max-h-60">
                          <pre>{JSON.stringify(cachedOptimization.optimizedDraft, null, 2)}</pre>
                        </div>
                      </div>
                    </div>
                  </details>
                </div>

                {/* Interactive Markdown Editor & Live Preview of Rewritten content */}
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="bg-slate-900 p-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
                    <div>
                      <h3 className="font-display text-sm font-bold tracking-wide">
                        Optimized Article Copy Draft
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Structured with proper H2/H3 tags, keyword inclusion, and FAQ section.
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditMode("preview")}
                        className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                          editMode === "preview" 
                            ? "bg-slate-700 text-white" 
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Eye className="mr-1 h-3.5 w-3.5" />
                        Preview Draft
                      </button>
                      <button
                        onClick={() => setEditMode("edit")}
                        className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                          editMode === "edit" 
                            ? "bg-slate-700 text-white" 
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Edit3 className="mr-1 h-3.5 w-3.5" />
                        Edit Source
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    {editMode === "edit" ? (
                      <div className="space-y-4 font-mono text-sm">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Optimized Title</label>
                          <input 
                            type="text" 
                            value={editableTitle} 
                            onChange={(e) => setEditableTitle(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-hidden focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Optimized Meta Description</label>
                          <textarea 
                            value={editableMeta} 
                            rows={2}
                            onChange={(e) => setEditableMeta(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Blog Post Content (Markdown)</label>
                          <textarea 
                            value={editableBody} 
                            rows={16}
                            onChange={(e) => setEditableBody(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 leading-relaxed font-mono focus:outline-hidden focus:border-blue-500"
                          />
                        </div>
                      </div>
                    ) : (
                      // Live HTML Preview representing the optimized content outline
                      <div className="prose prose-blue max-w-none text-slate-800">
                        <div className="mb-6 p-4 rounded-xl border border-blue-100 bg-blue-50/30">
                          <span className="text-[10px] font-bold text-blue-700 block uppercase tracking-wider mb-1">OPTIMIZED TITLE TAG (&lt;title&gt;)</span>
                          <h1 className="text-xl sm:text-2xl font-display font-bold text-slate-950 mt-0 leading-tight">
                            {editableTitle}
                          </h1>
                        </div>

                        <div className="mb-8 p-4 rounded-xl border border-slate-100 bg-slate-50">
                          <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider mb-1">OPTIMIZED META DESCRIPTION</span>
                          <p className="text-sm font-medium text-slate-700 my-0 leading-relaxed italic">
                            "{editableMeta}"
                          </p>
                        </div>

                        {/* Rendering preview content simply with proper headings spacing */}
                        <div className="space-y-4 text-sm leading-relaxed border-t border-slate-100 pt-6">
                          {editableBody.split("\n\n").map((chunk, idx) => {
                            const trimmed = chunk.trim();
                            if (!trimmed) return null;
                            if (trimmed.startsWith("# ")) {
                              return <h1 key={idx} className="font-display text-2xl font-bold text-slate-950 pt-3">{trimmed.replace("# ", "")}</h1>;
                            }
                            if (trimmed.startsWith("## ")) {
                              return <h2 key={idx} className="font-display text-xl font-bold text-slate-900 border-b border-slate-100 pb-1 pt-4">{trimmed.replace("## ", "")}</h2>;
                            }
                            if (trimmed.startsWith("### ")) {
                              return <h3 key={idx} className="font-display text-base font-bold text-slate-800 pt-3">{trimmed.replace("### ", "")}</h3>;
                            }
                            return <p key={idx} className="text-slate-700 my-0 leading-relaxed">{trimmed}</p>;
                          })}
                        </div>

                        {/* FAQ Rendering list */}
                        {cachedOptimization.optimizedDraft.faq.length > 0 && (
                          <div className="mt-8 border-t border-slate-200 pt-6">
                            <h2 className="font-display text-lg font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
                            <div className="space-y-4">
                              {cachedOptimization.optimizedDraft.faq.map((item, idx) => (
                                <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                                  <h3 className="font-display text-sm font-semibold text-slate-900 mb-1">{item.question}</h3>
                                  <p className="text-xs text-slate-600 leading-relaxed my-0">{item.answer}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions copy footer */}
                  <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-wrap items-center justify-end gap-3">
                    <button
                      onClick={() => handleCopy(editableBody, "markdown")}
                      className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition cursor-pointer"
                    >
                      {copiedText === "markdown" ? (
                        <>
                          <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                          Copied Markdown!
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1.5 h-3.5 w-3.5" />
                          Copy Markdown
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleCopy(cachedOptimization.optimizedDraft.schemaJson, "schema")}
                      className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition cursor-pointer"
                    >
                      {copiedText === "schema" ? (
                        <>
                          <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                          Copied Schema JSON-LD!
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1.5 h-3.5 w-3.5" />
                          Copy JSON-LD Schema
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Score Comparison Rubric breakdown side by side */}
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                  <div className="bg-slate-50 p-4 border-b border-slate-200">
                    <h3 className="font-display text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Side-by-Side Scoring Rubric Verification
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                      <thead className="bg-slate-50 font-semibold text-slate-700">
                        <tr>
                          <th className="px-6 py-3">Evaluation Rubric Row</th>
                          <th className="px-6 py-3 text-rose-700">Original Score</th>
                          <th className="px-6 py-3 text-emerald-700">Optimized Score</th>
                          <th className="px-6 py-3">Audit Improvement Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {cachedOptimization.originalAnalysis.benchmarks.map((originalB, idx) => {
                          const optB = cachedOptimization.optimizedAnalysis.benchmarks[idx];
                          return (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-6 py-4 font-semibold text-slate-900">{originalB.name}</td>
                              <td className="px-6 py-4 font-mono font-bold text-slate-700 bg-rose-50/20">
                                {originalB.score} / {originalB.maxScore}
                              </td>
                              <td className="px-6 py-4 font-mono font-bold text-emerald-800 bg-emerald-50/20">
                                {optB.score} / {optB.maxScore}
                              </td>
                              <td className="px-6 py-4 text-slate-600 max-w-sm leading-normal">
                                {optB.score > originalB.score ? (
                                  <span className="text-emerald-700 font-medium font-mono text-[11px]">
                                    → Improved: {optB.details}
                                  </span>
                                ) : (
                                  <span className="text-slate-500 text-[11px]">
                                    {optB.details}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            ) : null}
          </div>
        )}

      </main>

      {/* Footer Status Bar */}
      <footer className="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 mt-12">
        <div className="flex gap-4 text-[10px] font-medium text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
            Backend Connected
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
            Gemini 2.5 Flash (Ready)
          </span>
        </div>
        <div className="text-[10px] text-slate-400">v1.2.0-stable</div>
      </footer>
    </div>
  );
}
