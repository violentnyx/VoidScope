import { NextRequest, NextResponse } from "next/server";
import { getGallery, saveGallery, type GalleryData, type GalleryItem } from "@/lib/gallery-store";

export async function GET() {
  return NextResponse.json(await getGallery());
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<GalleryData>;
    const items: GalleryItem[] = Array.isArray(body.items)
      ? body.items.slice(0, 200).flatMap((raw) => {
          if (!raw || typeof raw !== "object") return [];
          const item = raw as Partial<GalleryItem>;
          if (typeof item.imageUrl !== "string" || !/^https?:\/\//i.test(item.imageUrl)) return [];
          return [{
            id: typeof item.id === "string" && item.id ? item.id.slice(0, 80) : crypto.randomUUID(),
            title: typeof item.title === "string" ? item.title.slice(0, 120) : "Sem título",
            imageUrl: item.imageUrl.slice(0, 2000),
            linkUrl: typeof item.linkUrl === "string" && /^https?:\/\//i.test(item.linkUrl) ? item.linkUrl.slice(0, 2000) : "",
            description: typeof item.description === "string" ? item.description.slice(0, 500) : "",
            alt: typeof item.alt === "string" ? item.alt.slice(0, 200) : "",
            private: Boolean(item.private),
          }];
        })
      : [];
    const saved = await saveGallery({
      title: typeof body.title === "string" ? body.title.slice(0, 80) : "Galeria",
      lead: typeof body.lead === "string" ? body.lead.slice(0, 500) : "",
      items,
    });
    return NextResponse.json({ ok: true, gallery: saved });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar a galeria." }, { status: 400 });
  }
}
