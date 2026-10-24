import { NextResponse } from "next/server";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS = ["correct", "wrong", "reveal", "win", "draw"];
const MIME: Record<string, string> = {
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg", ".m4a": "audio/mp4",
  ".aac": "audio/aac", ".flac": "audio/flac", ".webm": "audio/webm", ".opus": "audio/ogg",
};

// "Correct.MP3", "correct.mp3.mp3" (hidden Windows extensions) and "correct" + any known extension all count as "correct".
function baseName(file: string) {
  let name = file.toLowerCase().trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const ext of Object.keys(MIME)) if (name.endsWith(ext)) { name = name.slice(0, -ext.length).trim(); changed = true; }
  }
  return name;
}

async function scan() {
  const folder = path.join(process.cwd(), "public", "sounds");
  let files: string[] = [];
  try { files = (await readdir(folder, { withFileTypes: true })).filter(e => e.isFile()).map(e => e.name); } catch {}
  const audio = files.filter(f => path.extname(f).toLowerCase() in MIME);
  const found: Record<string, string | null> = {};
  for (const kind of KINDS) found[kind] = audio.find(f => baseName(f) === kind) ?? null;
  return { folder, files, found };
}

export async function GET(request: Request) {
  const kind = new URL(request.url).searchParams.get("kind");
  const { folder, files, found } = await scan();
  if (!kind) return NextResponse.json({ found, files }, { headers: { "Cache-Control": "no-store" } });
  const file = KINDS.includes(kind) ? found[kind] : null;
  if (!file) return new NextResponse("Not found", { status: 404 });
  const data = await readFile(path.join(folder, file));
  return new NextResponse(new Uint8Array(data), {
    headers: { "Content-Type": MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream", "Cache-Control": "no-store" },
  });
}
