"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Lets a full-screen overlay (currently just <MaintenanceShaderBackground/>)
 * tell the root <ShaderBackground/> to stop rendering while it's mounted.
 * Without this, both shaders run their own WebGPU render loop at the same
 * time on a Staging page — same pixels on screen, since the overlay is
 * fully opaque, but ~2x the GPU cost for a layer nobody can see.
 */
const BackgroundShaderVisibilityContext = createContext<{
  suppressed: boolean;
  setSuppressed: (value: boolean) => void;
} | null>(null);

export function BackgroundShaderVisibilityProvider({ children }: { children: ReactNode }) {
  const [suppressed, setSuppressed] = useState(false);
  const value = useMemo(() => ({ suppressed, setSuppressed }), [suppressed]);

  return (
    <BackgroundShaderVisibilityContext.Provider value={value}>
      {children}
    </BackgroundShaderVisibilityContext.Provider>
  );
}

/** Used by <ShaderBackground/> to know whether it should skip rendering. */
export function useBackgroundShaderSuppressed(): boolean {
  const ctx = useContext(BackgroundShaderVisibilityContext);
  return ctx?.suppressed ?? false;
}

/** Called by an overlay to suppress the background shader for as long as it's mounted. */
export function useSuppressBackgroundShader() {
  const ctx = useContext(BackgroundShaderVisibilityContext);

  useEffect(() => {
    if (!ctx) return;
    ctx.setSuppressed(true);
    return () => ctx.setSuppressed(false);
  }, [ctx]);
}
