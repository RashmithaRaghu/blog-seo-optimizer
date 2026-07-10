import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import analyzeHandler from "./api/analyze";
import optimizeHandler from "./api/optimize";

dotenv.config();

export type { SEOAnalysis } from "./api/_seo-core";

export const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

app.post("/api/analyze", analyzeHandler);
app.post("/api/optimize", optimizeHandler);

// Global error-handling middleware to prevent HTML fallbacks on errors
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Unhandled server error:", err);
  let status = 500;
  if (err && typeof err.status === "number" && err.status >= 100 && err.status <= 599) {
    status = err.status;
  } else if (err && typeof err.statusCode === "number" && err.statusCode >= 100 && err.statusCode <= 599) {
    status = err.statusCode;
  }
  res.status(status).json({
    error: err.message || "An unexpected server-side error occurred.",
    errorType: err.type || "failed",
  });
});

async function startServer() {
  if (process.env.DISABLE_HMR === "true") {
    console.log("HMR is disabled via environment variable.");
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}
