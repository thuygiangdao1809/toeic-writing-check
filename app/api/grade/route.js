// Server-side proxy to the Google Gemini API (free tier, no billing required).
// Converts Anthropic-style content blocks (from the frontend) into Gemini's "parts" format,
// then reshapes Gemini's response back into the {content:[{type:"text",text}]} envelope
// the frontend already expects — so the UI code needed zero changes.

const MODEL = "gemini-3.6-flash"; // Google's current free-tier Flash model as of writing.
// If this model ever gets retired, check https://ai.google.dev/gemini-api/docs/models
// for the current free-tier model ID and swap it in here — nothing else needs to change.

// Google's free-tier models occasionally return 503 ("high demand") or 429 (rate limit)
// during load spikes — this is transient on Google's side, not a bug here. Retry a few
// times with backoff before giving up, so a momentary spike doesn't force the user to
// manually hit "chấm lại" themselves.
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 800;
const RETRYABLE_STATUSES = new Set([429, 503]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toGeminiParts(content) {
  return (content || []).map((block) => {
    if (block.type === "text") return { text: block.text };
    if (block.type === "image") {
      return { inline_data: { mime_type: block.source.media_type, data: block.source.data } };
    }
    return { text: "" };
  });
}

export async function POST(req) {
  const { system, content } = await req.json();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Thiếu GEMINI_API_KEY trên server (đặt trong Vercel > Settings > Environment Variables)." },
      { status: 500 }
    );
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const body = JSON.stringify({
    system_instruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: toGeminiParts(content) }],
    generationConfig: {
      response_mime_type: "application/json", // asks Gemini to return valid JSON directly
      maxOutputTokens: 1200
    }
  });

  let response, data;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body
    });
    data = await response.json();

    if (response.ok) break;

    const shouldRetry = RETRYABLE_STATUSES.has(response.status) && attempt < MAX_RETRIES;
    if (!shouldRetry) {
      const friendly =
        response.status === 503 || response.status === 429
          ? "Model đang quá tải tạm thời (phía Google), đã thử lại vài lần nhưng chưa được. Vui lòng đợi một chút rồi bấm chấm lại."
          : data?.error?.message || "Gemini API error";
      return Response.json({ error: friendly }, { status: response.status });
    }

    await sleep(RETRY_BASE_DELAY_MS * Math.pow(2, attempt)); // 800ms, then 1600ms
  }

  const text = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("\n");
  // Same envelope shape the frontend's callClaudeRaw already parses — no frontend changes needed.
  return Response.json({ content: [{ type: "text", text }] });
}
