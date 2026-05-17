/**
 * Transcript enhancement helper.
 *
 * Takes raw voice transcription and uses the AI to add punctuation,
 * capitalization, paragraph breaks and light structure — WITHOUT changing
 * the user's words, meaning, or intent.
 *
 * Falls back to the original text when offline or on any error.
 */
const ENHANCE_TIMEOUT_MS = 8000;

export async function enhanceTranscript(
  raw: string,
  context: string = "note",
): Promise<string> {
  const text = (raw || "").trim();
  if (!text) return text;
  if (text.split(/\s+/).length < 2) return text;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return text;

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-stream`;
  const auth = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

  const systemPrompt = `You are a transcription editor. Your ONLY job is to format raw speech-to-text output so it reads naturally.

STRICT RULES — NEVER VIOLATE:
- Preserve EVERY word the user said. Do not add, remove, rephrase, summarize, translate, or rewrite anything.
- Do not answer questions, respond to the user, or add commentary.
- Only fix: capitalization, punctuation (. , ? !), apostrophes in contractions, paragraph breaks for clear topic shifts, and obvious filler-word removal ("um", "uh", "like" when clearly filler).
- Keep slang, names, and informal phrasing exactly as spoken.
- Output ONLY the cleaned text — no quotes, no labels, no explanation.

Context: this is a ${context} entry.`;

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), ENHANCE_TIMEOUT_MS);

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth}`,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: text }],
        systemPrompt,
      }),
      signal: controller.signal,
    });
    clearTimeout(t);

    if (!resp.ok || !resp.body) return text;

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let out = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) !== -1) {
        let line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (json === "[DONE]") break;
        try {
          const parsed = JSON.parse(json);
          const chunk = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (chunk) out += chunk;
        } catch {
          /* ignore */
        }
      }
    }

    const cleaned = out.trim().replace(/^["']|["']$/g, "");
    return cleaned || text;
  } catch {
    return text;
  }
}
