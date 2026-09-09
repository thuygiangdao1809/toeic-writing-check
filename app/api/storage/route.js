import { put, list, del } from "@vercel/blob";

// Vercel Blob is built into your Vercel account — no external service or API key
// needed. Just enable a Blob store for this project in Vercel > Storage > Create
// Database > Blob and connect it here; Vercel then injects BLOB_READ_WRITE_TOKEN
// into this project's env vars automatically (no manual copy/paste needed).
//
// Each app "key" (e.g. "tests-index", "test:<id>", "history") is stored as its own
// JSON file. Writes overwrite the same path in place (allowOverwrite) so a key
// always has exactly one current blob, instead of piling up versions.
//
// Trade-off vs. the previous Redis setup: blobs are served from a public CDN URL.
// Anyone who had that exact URL could read it directly, bypassing this API route.
// The URL isn't listed or guessable anywhere, so in practice this matches the same
// "no login, anyone with the app URL sees everything" model this app already uses —
// but it's a step less private than data that only ever lived behind a server route.

function blobPath(key) {
  // Blob pathnames behave like file paths; keep them simple and collision-free.
  return `toeic-writing/${key.replace(/:/g, "-")}.json`;
}

async function findBlob(key) {
  const path = blobPath(key);
  const { blobs } = await list({ prefix: path, limit: 1 });
  return blobs.find((b) => b.pathname === path) || null;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  if (!key) return Response.json({ error: "key is required" }, { status: 400 });
  try {
    const blob = await findBlob(key);
    if (!blob) return Response.json({ value: null });
    // cache: "no-store" avoids reading a stale edge-cached copy right after a write.
    const res = await fetch(blob.url, { cache: "no-store" });
    if (!res.ok) throw new Error(`fetch blob content failed (${res.status})`);
    const value = await res.json();
    return Response.json({ value });
  } catch (e) {
    return Response.json({ error: `storage read failed: ${e.message || e}` }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { key, value } = await req.json();
    if (!key) return Response.json({ error: "key is required" }, { status: 400 });
    await put(blobPath(key), JSON.stringify(value), {
      access: "public",
      addRandomSuffix: false, // keep a stable, predictable path so we can find/overwrite it later
      allowOverwrite: true, // this app intentionally treats each key as a single mutable record
      contentType: "application/json",
      cacheControlMaxAge: 0
    });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: `storage write failed: ${e.message || e}` }, { status: 500 });
  }
}

export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  if (!key) return Response.json({ error: "key is required" }, { status: 400 });
  try {
    const blob = await findBlob(key);
    if (blob) await del(blob.url);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: `storage delete failed: ${e.message || e}` }, { status: 500 });
  }
}
