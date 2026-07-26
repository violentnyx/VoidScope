"use client";

import { useState } from "react";
import { ShaderLabComposition, type ShaderLabConfig } from "@basementstudio/shader-lab";

/**
 * Exportado do Shader Lab especificamente pra tela de manutenção
 * ("Staging"). Diferente do <ShaderBackground /> normal, esse já traz
 * o texto "EM CONSTRUÇÃO :(" embutido como layer de texto (mais
 * chromatic aberration e bloom por cima) — não precisa de overlay HTML
 * separado pra isso. Se tweakar a composição no Shader Lab, cola o
 * `config` atualizado aqui.
 */
const maintenanceShaderConfig: ShaderLabConfig = {
  layers: [
    {
      blendMode: "normal",
      compositeMode: "filter",
      maskConfig: {
        invert: false,
        mode: "multiply",
        source: "luminance",
      },
      hue: 0,
      id: "e06eee58-d668-451f-a8d2-5f07eac32255",
      kind: "effect",
      name: "Chromatic Aberration",
      opacity: 1,
      params: {
        intensity: 26,
        direction: "radial",
        center: [0.5, 0.5],
        angle: 0,
      },
      saturation: 1,
      type: "chromatic-aberration",
      visible: true,
    },
    {
      blendMode: "normal",
      compositeMode: "filter",
      maskConfig: {
        invert: false,
        mode: "multiply",
        source: "luminance",
      },
      hue: 0,
      id: "87faf2ae-03df-4533-a09b-e60a2c82e565",
      kind: "effect",
      name: "Bloom",
      opacity: 1,
      params: {
        bloomIntensity: 0.19,
        bloomThreshold: 0.6,
        bloomRadius: 6,
        bloomSoftness: 0.35,
        bloomKnee: 0.2,
        highlightDrive: 1.5,
      },
      saturation: 1,
      type: "bloom",
      visible: true,
    },
    {
      blendMode: "normal",
      compositeMode: "filter",
      maskConfig: {
        invert: true,
        mode: "multiply",
        source: "luminance",
      },
      hue: 0,
      id: "b662f936-deaa-4d96-855c-de86b5985f25",
      kind: "source",
      name: "Text",
      opacity: 1,
      params: {
        text: "EM CONSTRUÇÃO :(",
        anchor: "center",
        offset: [0, 0],
        fontSize: 48,
        fontFamily: "sans",
        fontWeight: 700,
        letterSpacing: -0.05,
        textColor: "#FFFFFF",
        backgroundColor: "#000000",
        backgroundAlpha: 0.3,
      },
      saturation: 1,
      type: "text",
      visible: true,
    },
    {
      blendMode: "screen",
      compositeMode: "filter",
      maskConfig: {
        invert: false,
        mode: "multiply",
        source: "luminance",
      },
      hue: 0,
      id: "bea4dcf0-1e7d-4109-95b7-797359c02cfb",
      kind: "effect",
      name: "CRT",
      opacity: 0.98,
      params: {
        crtMode: "slot-mask",
        cellSize: 5,
        scanlineIntensity: 0.05,
        maskIntensity: 0.84,
        barrelDistortion: 0.055,
        chromaticAberration: 1.36,
        beamFocus: 0.45,
        brightness: 1.2,
        highlightDrive: 1,
        highlightThreshold: 0.62,
        shoulder: 0.25,
        chromaRetention: 1.15,
        shadowLift: 0.16,
        persistence: 0.18,
        vignetteIntensity: 0.45,
        flickerIntensity: 0.2,
        glitchIntensity: 0.25,
        glitchSpeed: 1.2,
        signalArtifacts: 0.45,
        bloomEnabled: true,
        bloomIntensity: 1.13,
        bloomThreshold: 0.03,
        bloomRadius: 8.75,
        bloomSoftness: 0.32,
      },
      saturation: 1.18,
      type: "crt",
      visible: true,
    },
    {
      blendMode: "normal",
      compositeMode: "filter",
      maskConfig: {
        invert: true,
        mode: "multiply",
        source: "luminance",
      },
      hue: 0,
      id: "09a49c60-4b26-4bc9-851c-3020260c1ab4",
      kind: "source",
      name: "Gradient",
      opacity: 1,
      params: {
        preset: "custom",
        activePoints: 4,
        point1Color: "#FF0000",
        point1Position: [0.71, 0.15000000000000013],
        point1Weight: 1.03,
        point2Color: "#FF1818",
        point2Position: [-1.06, -1.35],
        point2Weight: 1.36,
        point3Color: "#000000",
        point3Position: [-0.15999999999999992, -0.5599999999999999],
        point3Weight: 1.55,
        point4Color: "#5F1C53",
        point4Position: [0.07000000000000006, 0.13000000000000012],
        point4Weight: 1.81,
        point5Color: "#1a0a2e",
        point5Position: [-0.5, 0.7],
        point5Weight: 1,
        noiseType: "ridge",
        noiseSeed: 70.3,
        warpAmount: 0.22,
        warpScale: 2.54,
        warpIterations: 2,
        warpDecay: 1.2,
        warpBias: 0.43,
        vortexAmount: 0,
        animate: true,
        motionAmount: 1,
        motionSpeed: 0.31,
        falloff: 3.5,
        tonemapMode: "cinematic",
        glowStrength: 0.14,
        glowThreshold: 0.08,
        grainAmount: 0,
        vignetteStrength: 0.3,
        vignetteRadius: 1.4,
        vignetteSoftness: 0.8,
      },
      saturation: 1,
      type: "gradient",
      visible: true,
    },
  ],
  timeline: {
    duration: 8,
    loop: true,
    tracks: [],
  },
};

/**
 * Fallback estático (sem WebGPU ou se o runtime falhar) — mesma ideia
 * do ShaderFallback em shader-background.tsx: aproxima o gradiente em
 * CSS puro e escreve o texto direto em HTML por cima.
 */
function MaintenanceShaderFallback() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background:
          "radial-gradient(120% 90% at 80% 15%, #FF0000 0%, transparent 45%), " +
          "radial-gradient(110% 100% at 0% 0%, #FF1818 0%, transparent 50%), " +
          "radial-gradient(90% 80% at 40% 55%, #5F1C53 0%, transparent 60%), " +
          "radial-gradient(120% 100% at 20% 100%, #1a0a2e 0%, transparent 55%), " +
          "#000000",
      }}
    >
      <p className="px-6 text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
        EM CONSTRUÇÃO :(
      </p>
    </div>
  );
}

/**
 * Tela cheia (fixed inset-0), fica por cima do <ShaderBackground />
 * normal (que é -z-10) mas embaixo do header (z-50) — então o header
 * continua clicável, só o conteúdo da página some atrás desse shader.
 */
export function MaintenanceShaderBackground() {
  const [runtimeFailed, setRuntimeFailed] = useState(false);

  return (
    <div aria-hidden className="fixed inset-0 z-0 h-full w-full overflow-hidden bg-black">
      {!runtimeFailed && (
        <ShaderLabComposition
          config={maintenanceShaderConfig}
          onRuntimeError={(message) => {
            setRuntimeFailed(Boolean(message));
          }}
        />
      )}
      {runtimeFailed && <MaintenanceShaderFallback />}
    </div>
  );
}
