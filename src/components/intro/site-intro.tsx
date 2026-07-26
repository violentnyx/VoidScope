"use client";

import { useEffect, useRef, useState } from "react";
import { introConfig } from "./intro-config";

type IntroPhase =
  | "off"
  | "powering"
  | "loading"
  | "ready"
  | "glitch"
  | "exiting"
  | "done";

export function SiteIntro({ enabled }: { enabled: boolean }) {
  const [phase, setPhase] = useState<IntroPhase>("off");
  const [logoReady, setLogoReady] = useState(false);
  const [glitchReady, setGlitchReady] = useState(false);
  const powerSound = useRef<HTMLAudioElement>(null);
  const logoSound = useRef<HTMLAudioElement>(null);
  const glitchVideo = useRef<HTMLVideoElement>(null);
  const glitchSound = useRef<HTMLAudioElement>(null);
  const shaderEntrySound = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!enabled) setPhase("done");
  }, [enabled]);

  useEffect(() => {
    if (phase !== "loading") return;

    const delay = logoReady && glitchReady ? introConfig.readyDelayMs : 4000;
    const timer = window.setTimeout(() => setPhase("ready"), delay);
    return () => window.clearTimeout(timer);
  }, [glitchReady, logoReady, phase]);

  useEffect(() => {
    if (phase !== "powering") return;

    const timer = window.setTimeout(
      () => startIntro(),
      introConfig.powerDurationMs,
    );
    return () => window.clearTimeout(timer);
  }, [phase]);

  function unlockAudio(audio: HTMLAudioElement | null, volume: number) {
    if (!audio) return;

    audio.volume = 0;
    void audio
      .play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = volume;
      })
      .catch(() => undefined);
  }

  function powerOn() {
    if (phase !== "off") return;

    const startup = powerSound.current;
    if (startup) {
      startup.currentTime = 0;
      startup.volume = introConfig.powerSoundVolume;
      void startup.play().catch(() => undefined);
    }

    unlockAudio(logoSound.current, introConfig.logoSoundVolume);
    unlockAudio(
      shaderEntrySound.current,
      introConfig.shaderEntrySoundVolume,
    );

    setPhase("powering");
  }

  function startIntro() {
    if (phase !== "powering") return;

    const firstSound = logoSound.current;
    if (firstSound) {
      firstSound.currentTime = 0;
      firstSound.volume = introConfig.logoSoundVolume;
      void firstSound.play().catch(() => undefined);
    }

    setPhase("loading");
  }

  function enterSite() {
    if (phase !== "ready") return;

    setPhase("glitch");
    const video = glitchVideo.current;
    const vhsSound = glitchSound.current;
    const revealSound = shaderEntrySound.current;

    if (video) {
      video.currentTime = 0;
      void video.play();
    }
    if (vhsSound) {
      vhsSound.currentTime = 0;
      vhsSound.volume = introConfig.glitchSoundVolume;
      void vhsSound.play().catch(() => undefined);
    }
    if (revealSound) {
      revealSound.volume = 0;
      void revealSound
        .play()
        .then(() => {
          revealSound.pause();
          revealSound.currentTime = 0;
          revealSound.volume = introConfig.shaderEntrySoundVolume;
        })
        .catch(() => undefined);
    }

    window.setTimeout(() => {
      document.documentElement.dataset.introReveal = "hold";
      setPhase("exiting");

      window.setTimeout(() => {
        document.documentElement.dataset.introReveal = "shader";

        if (revealSound) {
          revealSound.currentTime = 0;
          revealSound.volume = introConfig.shaderEntrySoundVolume;
          void revealSound.play().catch(() => undefined);
        }

        setPhase("done");

        window.setTimeout(() => {
          document.documentElement.dataset.introReveal = "content";
        }, 700);

        window.setTimeout(() => {
          delete document.documentElement.dataset.introReveal;
        }, 1900);
      }, introConfig.exitDurationMs);
    }, introConfig.glitchDurationMs);
  }

  const logoVisible = phase === "loading" || phase === "ready";

  return (
    <>
      {phase !== "done" && (
        <section
          className={`site-intro-overlay fixed inset-0 z-[200] grid place-items-center overflow-hidden bg-black ${
            phase === "exiting" ? "site-intro-exiting" : ""
          }`}
          aria-label="Introdução do site"
          aria-busy={phase === "powering" || phase === "loading"}
          onClick={phase === "ready" ? enterSite : undefined}
        >
          {(phase === "off" || phase === "powering") && (
            <button
              type="button"
              className={`site-power-switch relative z-10 text-white transition ${
                phase === "powering" ? "site-power-switch-on" : ""
              }`}
              onClick={powerOn}
              disabled={phase === "powering"}
              aria-label="Ligar introdução"
            >
              <span className="site-power-label" aria-hidden="true">
                ON
              </span>
              <span className="site-power-toggle" aria-hidden="true">
                <span className="site-power-lever" />
              </span>
              <span className="site-power-label" aria-hidden="true">
                OFF
              </span>
              <span className="sr-only">
                {phase === "powering" ? "Iniciando" : "Ligar"}
              </span>
            </button>
          )}

          <video
            className={`pointer-events-none absolute inset-0 h-full w-full object-contain transition-opacity duration-150 ${
              logoVisible ? "site-intro-logo" : "opacity-0"
            }`}
            src={introConfig.logoSrc}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onCanPlayThrough={() => setLogoReady(true)}
            onError={() => setLogoReady(true)}
          />
          <video
            aria-hidden
            className={`pointer-events-none absolute inset-0 h-full w-full object-contain ${
              logoVisible ? "site-intro-logo-smear" : "opacity-0"
            }`}
            src={introConfig.logoSrc}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
          />
          <video
            ref={glitchVideo}
            className={`pointer-events-none absolute inset-0 h-full w-full object-contain ${
              phase === "glitch" ? "opacity-100" : "opacity-0"
            }`}
            src={introConfig.glitchSrc}
            muted
            playsInline
            preload="auto"
            onCanPlayThrough={() => setGlitchReady(true)}
            onError={() => setGlitchReady(true)}
          />

          {phase === "loading" && (
            <p className="absolute bottom-[12vh] text-[10px] font-bold uppercase tracking-[0.32em] text-white/45">
              Carregando
            </p>
          )}

          {phase === "ready" && (
            <button
              type="button"
              className="site-intro-enter absolute inset-x-0 bottom-[10vh] mx-auto w-fit px-6 py-3 text-xs font-bold uppercase tracking-[0.3em] text-white/75 transition hover:text-white"
              onClick={enterSite}
            >
              Clique para entrar
            </button>
          )}
        </section>
      )}

      <audio ref={powerSound} src={introConfig.powerSoundSrc} preload="auto" />
      <audio ref={logoSound} src={introConfig.logoSoundSrc} preload="auto" />
      <audio
        ref={glitchSound}
        src={introConfig.glitchSoundSrc}
        preload="auto"
      />
      <audio
        ref={shaderEntrySound}
        src={introConfig.shaderEntrySoundSrc}
        preload="auto"
      />
    </>
  );
}
