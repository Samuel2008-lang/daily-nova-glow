import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Try ZenQuotes API first
    try {
      const resp = await fetch("https://zenquotes.io/api/quotes/random/3", {
        headers: { "User-Agent": "DailyNova/1.0" },
      });
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data) && data.length > 0 && data[0].q) {
          const quotes = data.map((q: any) => ({
            text: q.q,
            author: q.a || "Unknown",
          }));
          return new Response(JSON.stringify({ quotes }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } catch (e) {
      console.error("ZenQuotes failed:", e);
    }

    // Fallback: use Lovable AI to generate quotes
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (LOVABLE_API_KEY) {
      try {
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "user",
                content: `Generate 3 unique, real inspirational quotes from famous people. Return ONLY a JSON array with objects having "text" and "author" fields. No markdown, no explanation. Example: [{"text":"Quote here","author":"Person Name"}]`,
              },
            ],
          }),
        });

        if (aiResp.ok) {
          const aiData = await aiResp.json();
          const content = aiData.choices?.[0]?.message?.content || "";
          const match = content.match(/\[[\s\S]*\]/);
          if (match) {
            const quotes = JSON.parse(match[0]);
            if (Array.isArray(quotes) && quotes.length > 0) {
              return new Response(JSON.stringify({ quotes }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          }
        } else {
          console.error("AI fallback failed:", aiResp.status, await aiResp.text());
        }
      } catch (aiErr) {
        console.error("AI quote generation error:", aiErr);
      }
    }

    // Final fallback: hardcoded quotes
    const fallbackQuotes = [
      { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
      { text: "Your time is limited, so don't waste it living someone else's life.", author: "Steve Jobs" },
      { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
    ];
    return new Response(
      JSON.stringify({ quotes: fallbackQuotes }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("fetch-quotes error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
