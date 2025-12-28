import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.38.4";
import { OpenAI } from "npm:openai@4.67.3";
import { getCache } from "../_shared/response-cache.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const suggestionCache = getCache<any>("category-suggestions", 1800000);

interface SuggestionResponse {
  suggested_category_id: string;
  suggested_category_name: string;
  suggested_subcategory_id: string;
  suggested_subcategory_name: string;
  confidence_score: number;
  reasoning: string;
  alternate_suggestions: Array<{
    category_id: string;
    subcategory_id: string;
    score: number;
  }>;
}

class OpenAIService {
  private client: OpenAI;
  private defaultModel: string = "gpt-4o-mini";

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async suggestCategory(
    title: string,
    description: string,
    availableCategories: Array<{
      id: string;
      name: string;
      subcategories: Array<{
        id: string;
        name: string;
      }>;
    }>
  ): Promise<{
    categoryId: string;
    categoryName: string;
    subcategoryId: string;
    subcategoryName: string;
    confidenceScore: number;
    reasoning: string;
    alternativeSuggestions: Array<{
      categoryId: string;
      subcategoryId: string;
      score: number;
    }>;
  }> {
    const categoriesText = availableCategories
      .map(
        (cat) =>
          `${cat.name} (${cat.id}): ${cat.subcategories.map((sub) => `${sub.name} (${sub.id})`).join(", ")}`
      )
      .join("\n");

    const prompt = `Categorize this listing into the most appropriate category and subcategory.

Title: "${title}"
Description: "${description}"

Categories:
${categoriesText}

Return JSON with: categoryId, categoryName, subcategoryId, subcategoryName, confidenceScore (0-1), reasoning (max 10 words), alternativeSuggestions (1-2 items with categoryId, subcategoryId, score).`;

    const response = await this.client.chat.completions.create({
      model: this.defaultModel,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 400,
      response_format: { type: "json_object" },
    });

    const text = response.choices[0].message.content || "";
    return JSON.parse(text);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiApiKey) {
      console.error("OPENAI_API_KEY not found in environment");
      return new Response(
        JSON.stringify({
          error: "AI Category Suggestion is not configured. Please select a category manually.",
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("ai_assist_enabled")
          .eq("id", user.id)
          .maybeSingle();

        if (profile && profile.ai_assist_enabled === false) {
          return new Response(
            JSON.stringify({ error: "AI Assist is disabled. Enable it in Settings to use AI features." }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }
    }

    const { title, description } = await req.json();

    if (!title && !description) {
      return new Response(
        JSON.stringify({
          error: "Either title or description is required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: allCategories, error: categoriesError } = await supabase
      .from("categories")
      .select("id, name, parent_id")
      .eq("is_active", true)
      .order("sort_order");

    if (categoriesError) {
      throw categoriesError;
    }

    if (!allCategories || allCategories.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No categories found",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const parentCategories = allCategories.filter((cat: any) => !cat.parent_id);
    const subcategories = allCategories.filter((cat: any) => cat.parent_id);

    const formattedCategories = parentCategories.map((parent: any) => ({
      id: parent.id,
      name: parent.name,
      subcategories: subcategories
        .filter((sub: any) => sub.parent_id === parent.id)
        .map((sub: any) => ({
          id: sub.id,
          name: sub.name,
        })),
    }));

    const cacheKey = suggestionCache.generateKey({
      title: (title || "").toLowerCase().trim(),
      description: (description || "").substring(0, 200).toLowerCase().trim(),
    });

    const cachedSuggestion = suggestionCache.get(cacheKey);
    if (cachedSuggestion) {
      return new Response(
        JSON.stringify(cachedSuggestion),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "HIT" },
        }
      );
    }

    const openaiService = new OpenAIService(openaiApiKey);

    let suggestion;
    try {
      suggestion = await openaiService.suggestCategory(
        title || "",
        description || "",
        formattedCategories
      );
    } catch (openaiError: any) {
      console.error("OpenAI API error:", openaiError);
      return new Response(
        JSON.stringify({
          error: `AI service error: ${openaiError.message || "Unable to generate suggestions"}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const response: SuggestionResponse = {
      suggested_category_id: suggestion.categoryId,
      suggested_category_name: suggestion.categoryName,
      suggested_subcategory_id: suggestion.subcategoryId,
      suggested_subcategory_name: suggestion.subcategoryName,
      confidence_score: suggestion.confidenceScore,
      reasoning: suggestion.reasoning,
      alternate_suggestions: suggestion.alternativeSuggestions || [],
    };

    suggestionCache.set(cacheKey, response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "MISS" },
    });
  } catch (error: any) {
    console.error("Error suggesting category:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});