import type { BrandContent } from "@/content/types";

export function SiteFooter({ brand }: { brand: BrandContent }) {
  return (
    <footer className="mx-auto w-full max-w-5xl px-4 py-10 text-center text-xs text-white/35 sm:px-6">
      {brand.name}
    </footer>
  );
}
