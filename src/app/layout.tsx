import type { Metadata, Viewport } from "next";
import { SitzungsAnbieter } from "@/lib/sitzung";
import "./globals.css";

export const metadata: Metadata = {
  title: "Makanda – Betriebs-App",
  description: "Betriebs-App für den SHK-Betrieb",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
