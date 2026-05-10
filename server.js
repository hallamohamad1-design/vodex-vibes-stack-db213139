// server.js — Serves the Vite production build for Railway
// Handles React Router client-side routing by returning index.html for all unknown routes.

import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const DIST = join(__dirname, "dist");

// Serve static assets (JS, CSS, images, fonts…)
app.use(express.static(DIST, { maxAge: "1y", immutable: true }));

// Health check endpoint for Railway
app.get("/health", (_req, res) => {
  res.json({ status: "ok", game: "ECHO", timestamp: new Date().toISOString() });
});

// SPA fallback — let React Router handle all navigation
app.get("*", (_req, res) => {
  res.sendFile(join(DIST, "index.html"));
});

app.listen(PORT, () => {
  console.log(`[ECHO] Server running on port ${PORT}`);
  console.log(`[ECHO] Serving from ${DIST}`);
});
