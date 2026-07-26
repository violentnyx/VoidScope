"use client";

import { useEffect, useState } from "react";

/**
 * Full-screen WebGPU shader compositions keep rendering every frame
 * even in a backgrounded tab unless something tells them to stop —
 * there's no built-in pause in the runtime. This reports `false`
 * while the tab isn't visible, or permanently for users who've asked
 * for reduced motion, so callers can unmount their
 * <ShaderLabComposition/> (and fall back to the static CSS version)
 * instead of paying for a render loop nobody can see or wants.
 */
export function useShaderRenderEnabled() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const update = () => {
      setEnabled(!reduceMotionQuery.matches && document.visibilityState === "visible");
    };

    update();
    document.addEventListener("visibilitychange", update);
    reduceMotionQuery.addEventListener("change", update);
    return () => {
      document.removeEventListener("visibilitychange", update);
      reduceMotionQuery.removeEventListener("change", update);
    };
  }, []);

  return enabled;
}
