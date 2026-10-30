import type { MetadataRoute } from "next";

// Für „Zum Home-Bildschirm“: Name, Symbol und Vollbild ohne Browser-Leiste
export const dynamic = "force-static";

const basis = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Makanda – Betriebs-App",
    short_name: "Makanda",
    start_url: `${basis}/`,
    scope: `${basis}/`,
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#1d4ed8",
    icons: [
      { src: `${basis}/icon-192.png`, sizes: "192x192", type: "image/png" },
      { src: `${basis}/icon-512.png`, sizes: "512x512", type: "image/png" },
    ],
  };
}
