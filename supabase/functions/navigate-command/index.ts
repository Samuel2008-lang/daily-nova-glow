import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { command } = await req.json();
    
    if (!command || typeof command !== 'string') {
      throw new Error('Command is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are a navigation assistant for DailyNova app. Your job is to understand user navigation commands and return the correct route.

Available pages and their routes:
- Notes page: /notes (keywords: notes, note, write note, add note)
- Tasks page: /tasks (keywords: tasks, task, todo, todos, to-do)
- Habits page: /habits (keywords: habits, habit, track habit, habit tracker)
- Diary page: /diary (keywords: diary, daily diary, daily entry)
- Journal page: /journal (keywords: journal, journaling, journal entry)
- Quotes page: /quotes (keywords: quotes, quote, inspiration, inspirational quotes)
- Dashboard/Home: / (keywords: home, dashboard, main page)

Analyze the user's command and determine which page they want to navigate to. Be flexible with language - understand variations, misspellings, and different ways of asking.

Examples:
- "open my notes" → /notes
- "show me tasks" → /tasks
- "go to diary" → /diary
- "I want to write in my journal" → /journal
- "track my habits" → /habits
- "take me home" → /
- "show quotes" → /quotes

Return ONLY a JSON object with "route" and "page" fields. No other text.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Navigate to: ${command}` }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error('Failed to process navigation command');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in navigate-command:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
