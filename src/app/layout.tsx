import type { Metadata, Viewport } from "next";
import { SitzungsAnbieter } from "@/lib/sitzung";
import "./globals.css";

export const metadata: Metadata = {
  title: "Makanda – Betriebs-App",
  description: "Betriebs-App für den SHK-Betrieb",
  // Name unter dem Symbol auf dem Home-Bildschirm (iPhone/iPad)
  appleWebApp: { title: "Makanda", capable: true, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Farbe der Browser-Leiste (Safari) passend zum hellen bzw. dunklen Modus
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>
        <SitzungsAnbieter>{children}</SitzungsAnbieter>
      </body>
    </html>
  );
}
