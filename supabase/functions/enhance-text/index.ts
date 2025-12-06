import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, context } = await req.json();
    
    if (!text || text.trim() === '') {
      return new Response(
        JSON.stringify({ enhanced: text }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Updated system prompt to preserve user's original words and intent
    const systemPrompt = `You are a speech-to-text transcription enhancer. Your ONLY job is to:

1. PRESERVE the user's exact words and meaning - DO NOT change what they said
2. Fix only obvious spelling mistakes from speech recognition
3. Add proper punctuation (periods, commas, question marks)
4. Fix capitalization at the start of sentences
5. Remove word repetitions caused by speech recognition errors (e.g., "how are you how are you" → "How are you?")

CRITICAL RULES:
- NEVER change the user's vocabulary or word choice
- NEVER add words they didn't say
- NEVER remove content words (only remove duplicates from speech errors)
- NEVER change the meaning or rephrase
- NEVER add your own interpretation
- Keep their natural speaking style and expression
- Study their intention and expression, then only fix grammar

Context: ${context || 'general'}

Return ONLY the cleaned transcription, nothing else. No explanations.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const enhanced = data.choices?.[0]?.message?.content || text;

    console.log("Enhanced text:", { original: text, enhanced: enhanced.trim() });

    return new Response(
      JSON.stringify({ enhanced: enhanced.trim() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in enhance-text function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage, enhanced: "" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
