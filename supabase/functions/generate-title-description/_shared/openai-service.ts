import { OpenAI } from "npm:openai@4.67.3";

export function createOpenAIService() {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not found");
  }
  const client = new OpenAI({ apiKey });

  return {
    async generateStructuredOutput<T>(
      prompt: string,
      options: { temperature?: number; maxTokens?: number } = {}
    ): Promise<T> {
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 500,
        response_format: { type: "json_object" },
      });
      const text = response.choices[0].message.content || "{}";
      return JSON.parse(text) as T;
    },
  };
}