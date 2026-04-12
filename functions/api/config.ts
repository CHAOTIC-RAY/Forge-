export const onRequestGet: PagesFunction<{ 
  GEMINI_API_KEY: string;
  GROQ_API_KEY: string;
}> = async (context) => {
  return new Response(JSON.stringify({
    geminiApiKey: context.env.GEMINI_API_KEY || null,
    groqApiKey: context.env.GROQ_API_KEY || null,
  }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    }
  });
};
