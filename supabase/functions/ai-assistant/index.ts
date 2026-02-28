import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const AI_GATEWAY_API_KEY = Deno.env.get('AI_GATEWAY_API_KEY');
    const AI_GATEWAY_URL = Deno.env.get('AI_GATEWAY_URL');
    if (!AI_GATEWAY_API_KEY) {
      throw new Error('AI_GATEWAY_API_KEY is not configured');
    }
    if (!AI_GATEWAY_URL) {
      throw new Error('AI_GATEWAY_URL is not configured');
    }

    const { messages, context, userRole, userName } = await req.json();

    console.log('AI Assistant request:', { context, userRole, messageCount: messages.length });

    // Enhanced system context based on user role
    const roleContext = userRole ? `The user is a ${userRole} named ${userName || 'User'}.` : '';
    
    // Prepare messages with enhanced context
    const enhancedMessages = messages.map((msg: any, idx: number) => {
      if (idx === 0 && msg.role === 'system') {
        return {
          ...msg,
          content: `${msg.content}\n\n${roleContext}\n\nBe helpful, accurate, and culturally aware. Provide practical, actionable advice. If you don't know something, admit it honestly. You can search the web for current information if needed.`
        };
      }
      return msg;
    });

    const response = await fetch(`${AI_GATEWAY_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_GATEWAY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: enhancedMessages,
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service quota exceeded. Please contact support.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || 'I apologize, but I couldn\'t generate a response. Please try again.';

    console.log('AI Assistant response generated successfully');

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('AI Assistant error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});