"use client";

import { Component, type ReactNode } from "react";

interface Props {
  fallback: ReactNode;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * <ShaderLabComposition/> exposes onRuntimeError so a failed init
 * degrades gracefully. The low-level useShaderLabCanvasSource hook
 * we use in <OptimizedShaderCanvas/> doesn't — so without this, a
 * hard init failure (no WebGPU, driver issue, shader compile error)
 * could throw and take the whole page down instead of just falling
 * back to the static CSS background. This is that safety net.
 */
export class ShaderErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Shader Lab runtime crashed:", error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
