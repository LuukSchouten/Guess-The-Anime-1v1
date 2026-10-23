import { NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnimeCard = { id: string; title: string; image: string; imageName?: string };
const dataDir = path.join(process.cwd(), "data");
const uploadsDir = path.join(process.cwd(), "public", "uploads");
const listPath = path.join(dataDir, "sample-list.json");

function isCards(value: unknown): value is AnimeCard[] {
  return Array.isArray(value) && value.every((card) =>
    card && typeof card.id === "string" && typeof card.title === "string" && typeof card.image === "string" && (card.imageName === undefined || typeof card.imageName === "string")
  );
}

function extensionForMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  if (mime === "image/svg+xml") return "svg";
  return "png";
}

export async function GET() {
  try {
    const raw = await readFile(listPath, "utf8");
    const cards: unknown = JSON.parse(raw);
    if (!isCards(cards)) return NextResponse.json({ cards: null, error: "Saved sample list has an invalid format." }, { status: 500 });
    return NextResponse.json({ cards });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return NextResponse.json({ cards: null });
    return NextResponse.json({ error: "Could not read the saved sample list." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || !isCards(body.cards)) return NextResponse.json({ error: "Invalid sample list." }, { status: 400 });

    await mkdir(dataDir, { recursive: true });
    await mkdir(uploadsDir, { recursive: true });

    const savedCards: AnimeCard[] = [];
    for (const card of body.cards) {
      let image = card.image;
      const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/);
      if (match) {
        const mime = match[1].toLowerCase();
        if (!mime.startsWith("image/")) return NextResponse.json({ error: "Only image uploads are supported." }, { status: 400 });
        // Preserve the original uploaded filename; strip any path components for safety.
        const requestedName = (card.imageName || "").replace(/\\/g, "/").split("/").pop() || "";
        const safeOriginalName = requestedName
          .normalize("NFKC")
          .replace(/[^a-zA-Z0-9._ -]/g, "_")
          .replace(/^\.+/, "")
          .trim();
        const fallbackExt = extensionForMime(mime);
        const filename = safeOriginalName && /\.[a-zA-Z0-9]{1,8}$/.test(safeOriginalName)
          ? safeOriginalName
          : `${safeOriginalName || "image"}.${fallbackExt}`;
        await writeFile(path.join(uploadsDir, filename), Buffer.from(match[2], "base64"));
        image = `/uploads/${filename}`;
      }
      savedCards.push({ id: card.id, title: card.title, image, ...(card.imageName ? { imageName: card.imageName } : {}) });
    }

    await writeFile(listPath, JSON.stringify(savedCards, null, 2) + "\n", "utf8");
    return NextResponse.json({ ok: true, cards: savedCards });
  } catch {
    return NextResponse.json({ error: "Could not save the sample list to the project folder." }, { status: 500 });
  }
}
