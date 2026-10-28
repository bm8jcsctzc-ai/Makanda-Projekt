import type { NextConfig } from "next";

// Statische Website für GitHub Pages: alle Seiten werden beim Bauen zu HTML-Dateien,
// die Daten holt der Browser direkt von Supabase.
const nextConfig: NextConfig = {
  output: "export",
  // Auf GitHub Pages liegt die App unter /<Projektname>/ (wird im Workflow gesetzt)
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
