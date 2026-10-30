import Image from "next/image";
import logo from "@/assets/logo.png";

/** Firmenlogo; im Dunkelmodus auf heller Fläche, weil der Schriftzug dunkelblau ist */
export function Logo({ hoehe = 36, className = "" }: { hoehe?: number; className?: string }) {
  return (
    <Image
      src={logo}
      alt="Makanda – Meisterbetrieb Sanitär, Heizung, Klima"
      height={hoehe}
      style={{ width: "auto", height: hoehe }}
      priority
      className={`dark:rounded-lg dark:bg-white dark:px-1.5 dark:py-0.5 ${className}`}
    />
  );
}
