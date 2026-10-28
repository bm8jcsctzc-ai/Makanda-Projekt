"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Einstellungen() {
  const router = useRouter();
  useEffect(() => router.replace("/einstellungen/checklisten/"), [router]);
  return null;
}
