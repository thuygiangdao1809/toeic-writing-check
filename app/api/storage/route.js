import { Redis } from "@upstash/redis";

// Uses UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from env (set these in Vercel project settings).
const redis = Redis.fromEnv();

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  if (!key) return Response.json({ error: "key is required" }, { status: 400 });
  try {
    const value = await redis.get(key);
    return Response.json({ value: value ?? null });
  } catch (e) {
    return Response.json({ error: "storage read failed" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { key, value } = await req.json();
    if (!key) return Response.json({ error: "key is required" }, { status: 400 });
    await redis.set(key, value);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: "storage write failed" }, { status: 500 });
  }
}

export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  if (!key) return Response.json({ error: "key is required" }, { status: 400 });
  try {
    await redis.del(key);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: "storage delete failed" }, { status: 500 });
  }
}
