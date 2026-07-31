"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import * as THREE from "three";

type WidgetSize = "half" | "full";
type NavPosition = "top" | "left";
type WidgetId = "hero" | "twitch" | "video" | "music" | "ranks" | `page:${string}`;

type LayoutItem = {
  id: WidgetId;
  size: WidgetSize;
};

type ThreeLayoutLabProps = {
  widgets: Record<Exclude<WidgetId, `page:${string}`>, ReactNode>;
};

const DEFAULT_LAYOUT: LayoutItem[] = [
  { id: "hero", size: "half" },
  { id: "twitch", size: "half" },
  { id: "video", size: "full" },
  { id: "music", size: "half" },
  { id: "ranks", size: "half" },
];

const LABELS: Record<Exclude<WidgetId, `page:${string}`>, string> = {
  hero: "Identidade",
  twitch: "Twitch",
  video: "Vídeo em destaque",
  music: "Ouvindo agora",
  ranks: "Ranks",
};

const PAGE_OPTIONS = [
  { path: "/projects", label: "Projetos" },
  { path: "/gallery", label: "Galeria" },
  { path: "/equipment", label: "Equipamentos" },
  { path: "/contact-me", label: "Contato" },
];

function ThreeBackdrop() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!host.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.current.appendChild(renderer.domElement);

    const geometry = new THREE.IcosahedronGeometry(1.55, 2);
    const material = new THREE.MeshBasicMaterial({
      color: 0x8b5cf6,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const starsGeometry = new THREE.BufferGeometry();
    const points = new Float32Array(450 * 3);
    for (let i = 0; i < points.length; i += 3) {
      points[i] = (Math.random() - 0.5) * 12;
      points[i + 1] = (Math.random() - 0.5) * 8;
      points[i + 2] = (Math.random() - 0.5) * 8;
    }
    starsGeometry.setAttribute("position", new THREE.BufferAttribute(points, 3));
    const stars = new THREE.Points(
      starsGeometry,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.018, transparent: true, opacity: 0.55 }),
    );
    scene.add(stars);

    let frame = 0;
    const resize = () => {
      if (!host.current) return;
      const { clientWidth, clientHeight } = host.current;
      camera.aspect = clientWidth / Math.max(clientHeight, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight, false);
    };
    const animate = () => {
      mesh.rotation.x += 0.0018;
      mesh.rotation.y += 0.003;
      stars.rotation.y -= 0.00025;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    resize();
    animate();
    const observer = new ResizeObserver(resize);
    observer.observe(host.current);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      geometry.dispose();
      material.dispose();
      starsGeometry.dispose();
      (stars.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={host} className="pointer-events-none fixed inset-0 -z-10 opacity-90" aria-hidden />;
}

export function ThreeLayoutLab({ widgets }: ThreeLayoutLabProps) {
  const [editing, setEditing] = useState(true);
  const [layout, setLayout] = useState<LayoutItem[]>(DEFAULT_LAYOUT);
  const [navPosition, setNavPosition] = useState<NavPosition>("top");
  const [dragged, setDragged] = useState<WidgetId | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("voidscope:3js-layout");
      if (saved) {
        const parsed = JSON.parse(saved) as { layout?: LayoutItem[]; navPosition?: NavPosition };
        if (Array.isArray(parsed.layout)) setLayout(parsed.layout);
        if (parsed.navPosition === "top" || parsed.navPosition === "left") {
          setNavPosition(parsed.navPosition);
        }
      }
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (ready) {
      localStorage.setItem("voidscope:3js-layout", JSON.stringify({ layout, navPosition }));
    }
  }, [layout, navPosition, ready]);

  const moveBefore = (target: WidgetId) => {
    if (!dragged || dragged === target) return;
    setLayout((current) => {
      const next = current.filter((item) => item.id !== dragged);
      const targetIndex = next.findIndex((item) => item.id === target);
      const moved = current.find((item) => item.id === dragged);
      if (!moved) return current;
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const toggleSize = (id: WidgetId) => {
    setLayout((current) =>
      current.map((item) =>
        item.id === id ? { ...item, size: item.size === "full" ? "half" : "full" } : item,
      ),
    );
  };

  const addPage = (path: string) => {
    const id = `page:${path}` as WidgetId;
    setLayout((current) =>
      current.some((item) => item.id === id) ? current : [...current, { id, size: "full" }],
    );
  };

  return (
    <div className={navPosition === "left" ? "sm:pl-44" : ""}>
      <ThreeBackdrop />

      <nav
        className={
          navPosition === "left"
            ? "fixed left-4 top-24 z-40 hidden w-36 flex-col gap-1 rounded-2xl border border-white/15 bg-black/80 p-2 backdrop-blur-xl sm:flex"
            : "mb-8 flex flex-wrap justify-center gap-1 rounded-2xl border border-white/15 bg-black/65 p-2 backdrop-blur-xl"
        }
      >
        {PAGE_OPTIONS.map((page) => (
          <Link key={page.path} href={page.path} className="rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white hover:text-black">
            {page.label}
          </Link>
        ))}
      </nav>

      <div className="sticky top-20 z-40 mb-6 rounded-2xl border border-violet-400/30 bg-[#0b0912]/90 p-3 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-auto font-mono text-xs font-bold uppercase tracking-[0.18em] text-violet-300">
            3JS Layout Lab
          </span>
          <button onClick={() => setEditing((value) => !value)} className="rounded-lg bg-violet-500 px-3 py-2 text-xs font-bold text-white hover:bg-violet-400">
            {editing ? "Concluir edição" : "Editar página"}
          </button>
          {editing && (
            <>
              <button onClick={() => setNavPosition((value) => value === "top" ? "left" : "top")} className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/80 hover:bg-white/10">
                Navegação: {navPosition === "top" ? "topo" : "lateral"}
              </button>
              <select
                aria-label="Adicionar página"
                defaultValue=""
                onChange={(event) => {
                  if (event.target.value) addPage(event.target.value);
                  event.target.value = "";
                }}
                className="rounded-lg border border-white/15 bg-black px-3 py-2 text-xs text-white"
              >
                <option value="" disabled>+ Inserir página</option>
                {PAGE_OPTIONS.map((page) => <option key={page.path} value={page.path}>{page.label}</option>)}
              </select>
              <button onClick={() => { setLayout(DEFAULT_LAYOUT); setNavPosition("top"); }} className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/60 hover:text-white">
                Restaurar
              </button>
            </>
          )}
        </div>
        {editing && <p className="mt-2 text-xs text-white/45">Arraste os blocos pela alça. O layout é salvo automaticamente neste navegador.</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {layout.map((item) => {
          const isPage = item.id.startsWith("page:");
          const pagePath = isPage ? item.id.slice(5) : "";
          const page = PAGE_OPTIONS.find((option) => option.path === pagePath);
          return (
            <section
              key={item.id}
              draggable={editing}
              onDragStart={() => setDragged(item.id)}
              onDragEnd={() => setDragged(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => moveBefore(item.id)}
              className={[
                item.size === "full" ? "sm:col-span-2" : "",
                editing ? "group relative rounded-2xl outline outline-1 outline-dashed outline-violet-400/55" : "",
                dragged === item.id ? "opacity-40" : "",
              ].join(" ")}
            >
              {editing && (
                <div className="absolute -top-3 right-3 z-30 flex overflow-hidden rounded-lg border border-violet-300/30 bg-[#171225] text-[11px] shadow-xl">
                  <span className="cursor-grab px-2 py-1.5 text-violet-200" title="Arrastar">⠿ {isPage ? page?.label : LABELS[item.id as keyof typeof LABELS]}</span>
                  <button onClick={() => toggleSize(item.id)} className="border-l border-white/10 px-2 py-1.5 text-white/65 hover:bg-white/10">
                    {item.size === "full" ? "½" : "↔"}
                  </button>
                  {isPage && (
                    <button onClick={() => setLayout((current) => current.filter((entry) => entry.id !== item.id))} className="border-l border-white/10 px-2 py-1.5 text-red-300 hover:bg-red-500/15">×</button>
                  )}
                </div>
              )}
              {isPage ? (
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/70">
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                    <span className="text-sm font-semibold">{page?.label ?? pagePath}</span>
                    <Link href={pagePath} className="text-xs text-violet-300 hover:text-violet-200">Abrir página ↗</Link>
                  </div>
                  <iframe src={pagePath} title={page?.label ?? pagePath} className="h-[480px] w-full bg-black" />
                </div>
              ) : widgets[item.id as keyof typeof widgets]}
            </section>
          );
        })}
      </div>
    </div>
  );
}
