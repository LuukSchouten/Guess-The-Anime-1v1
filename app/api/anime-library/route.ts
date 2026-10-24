import { NextResponse } from "next/server";
import { readdir } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const categories = [
  { id: "isekai", label: "Isekai" },
  { id: "shounen", label: "Shounen" },
  { id: "sport", label: "Sport" },
  { id: "yaoi-yuri", label: "Yaoi / Yuri" },
  { id: "anime-landschappen", label: "Anime Landschappen" },
  { id: "emojis", label: "Emojis" },
  { id: "quotes", label: "Quotes" },
];
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);

export async function GET() {
  const root = path.join(process.cwd(), "public", "anime");
  const cards: { id: string; title: string; image: string; category: string; kind: "image" }[] = [];
  for (const category of categories) {
    const folder = path.join(root, category.id);
    try {
      const entries = await readdir(folder, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        const ext = path.extname(entry.name).toLowerCase();
        const filename = entry.name;
        const title = path.basename(filename, ext);
        if (imageExtensions.has(ext)) {
          cards.push({ id: `${category.id}/${filename}`, title, image: `/anime/${category.id}/${encodeURIComponent(filename)}`, category: category.id, kind: "image" });
        }
      }
    } catch {
      // Missing or empty category folders are valid.
    }
  }
  return NextResponse.json({ categories, cards });
}
