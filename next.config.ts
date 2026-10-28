import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite bringt eigene WebAssembly-Dateien mit und darf nicht gebündelt werden.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Die Datenbank-Migrationen werden zur Laufzeit gelesen und müssen mit auf den Server
  outputFileTracingIncludes: { "/**": ["./drizzle/**/*"] },
  experimental: {
    // Rechnungen als PDF oder Foto hochladen (max. 4 MB, siehe src/lib/dateien.ts)
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
