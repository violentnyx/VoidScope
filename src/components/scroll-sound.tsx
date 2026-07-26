"use client";

import { useEffect, useRef } from "react";
import { playUISound } from "@/lib/site-sounds";

export function ScrollSound() {
  const lastY = useRef(0);
  const accumulated = useRef(0);
  const lastPlayed = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    const onScroll = () => {
      const now = performance.now();
      const currentY = window.scrollY;
      accumulated.current += Math.abs(currentY - lastY.current);
      lastY.current = currentY;
      if (accumulated.current >= 150 && now - lastPlayed.current >= 90) {
        accumulated.current = 0;
        lastPlayed.current = now;
        playUISound("scroll");
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return null;
}
