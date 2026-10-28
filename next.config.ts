import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite bringt eigene WebAssembly-Dateien mit und darf nicht gebündelt werden.
  serverExternalPackages: ["@electric-sql/pglite"],
  experimental: {
    // Rechnungen als PDF oder Foto hochladen
    serverActions: { bodySizeLimit: "15mb" },
  },
};

export default nextConfig;
