import { OpenAI } from "npm:openai@4.67.3";

export interface OpenAIConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface OpenAIResponse {
  text: string;
  tokensUsed?: number;
  finishReason?: string;
}

export class OpenAIService {
  private client: OpenAI;
  private defaultModel: string = "gpt-4o-mini";

  constructor() {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    this.client = new OpenAI({ apiKey });
  }

  async generateText(
    prompt: string,
    config?: OpenAIConfig
  ): Promise<OpenAIResponse> {
    const response = await this.client.chat.completions.create({
      model: config?.model || this.defaultModel,
      messages: [{ role: "user", content: prompt }],
      temperature: config?.temperature ?? 0.7,
      max_tokens: config?.maxTokens ?? 1000,
      top_p: config?.topP ?? 1.0,
    });

    return {
      text: response.choices[0].message.content || "",
      tokensUsed: response.usage?.total_tokens,
      finishReason: response.choices[0].finish_reason,
    };
  }

  async generateStructuredOutput<T>(
    prompt: string,
    config?: OpenAIConfig
  ): Promise<T> {
    try {
      const response = await this.client.chat.completions.create({
        model: config?.model || this.defaultModel,
        messages: [{ role: "user", content: prompt }],
        temperature: config?.temperature ?? 0.7,
        max_tokens: config?.maxTokens ?? 1000,
        top_p: config?.topP ?? 1.0,
        response_format: { type: "json_object" },
      });

      const text = response.choices[0].message.content || "";
      return JSON.parse(text) as T;
    } catch (error: any) {
      if (error.message?.includes("invalid_api_key")) {
        throw new Error("Invalid OpenAI API key. Please check your configuration.");
      }
      if (error.message?.includes("insufficient_quota")) {
        throw new Error("OpenAI API quota exceeded. Please check your billing.");
      }
      if (error.message?.includes("content_filter")) {
        throw new Error("Content was blocked by AI safety filters. Please try different wording.");
      }
      throw error;
    }
  }

  async moderateContent(
    content: string,
    contentType: string
  ): Promise<{
    decision: "safe" | "review" | "block" | "warning";
    flaggedCategories: string[];
    confidenceScores: Record<string, number>;
    reasoning: string;
  }> {
    const prompt = `You are a content moderation AI. Analyze the following ${contentType} and determine if it violates community guidelines.

Content: "${content}"

Evaluate for:
1. Spam (promotional content, repetitive messaging)
2. Harassment (bullying, personal attacks, threats)
3. Hate speech (discrimination, slurs, bigotry)
4. Violence (graphic content, threats of harm)
5. Adult content (explicit material, sexual content)
6. Misinformation (false claims, misleading information)

Respond with a JSON object in this exact format:
{
  "decision": "safe|review|block|warning",
  "flaggedCategories": ["category1", "category2"],
  "confidenceScores": {
    "spam": 0.0,
    "harassment": 0.0,
    "hate_speech": 0.0,
    "violence": 0.0,
    "adult_content": 0.0,
    "misinformation": 0.0
  },
  "reasoning": "Brief explanation of the decision"
}

Rules:
- "safe": No violations detected (max score < 0.3)
- "warning": Minor issues detected (max score 0.3-0.5)
- "review": Potential violations need human review (max score 0.5-0.8)
- "block": Clear violations detected (max score >= 0.8)
- Confidence scores should be between 0.0 and 1.0
- Only include categories with scores > 0.3 in flaggedCategories`;

    return await this.generateStructuredOutput(prompt, {
      temperature: 0.3,
      maxTokens: 500,
    });
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

    return await this.generateStructuredOutput(prompt, {
      temperature: 0.3,
      maxTokens: 400,
    });
  }

  async generateRecommendations(
    userId: string,
    userBehavior: {
      recentSearches: string[];
      recentBookings: Array<{ category: string; subcategory: string }>;
      savedListings: Array<{ category: string; subcategory: string }>;
      location?: { lat: number; lng: number };
    },
    availableListings: Array<{
      id: string;
      title: string;
      category: string;
      subcategory: string;
      description: string;
      rating?: number;
      price?: number;
    }>
  ): Promise<
    Array<{
      listingId: string;
      score: number;
      reasoning: string;
    }>
  > {
    const listingsText = availableListings
      .slice(0, 50)
      .map(
        (listing) =>
          `ID: ${listing.id}\nTitle: ${listing.title}\nCategory: ${listing.category} > ${listing.subcategory}\nRating: ${listing.rating || "N/A"}\nPrice: ${listing.price || "N/A"}\nDescription: ${listing.description.slice(0, 100)}...`
      )
      .join("\n\n");

    const prompt = `You are a recommendation engine for a services marketplace. Analyze user behavior and recommend the most relevant listings.

User Behavior:
- Recent Searches: ${userBehavior.recentSearches.join(", ")}
- Recent Bookings: ${userBehavior.recentBookings.map((b) => `${b.category} > ${b.subcategory}`).join(", ")}
- Saved Listings: ${userBehavior.savedListings.map((s) => `${s.category} > ${s.subcategory}`).join(", ")}

Available Listings:
${listingsText}

Recommend the top 10 most relevant listings based on user behavior. Respond with a JSON array:
[
  {
    "listingId": "uuid",
    "score": 0.9,
    "reasoning": "Brief explanation of why this listing is recommended"
  }
]

Rules:
- Scores should be between 0.0 and 1.0
- Prioritize listings that match user interests
- Consider variety in recommendations
- Return 5-10 recommendations`;

    return await this.generateStructuredOutput(prompt, {
      temperature: 0.7,
      maxTokens: 1500,
    });
  }

  async enhanceDescription(
    originalDescription: string,
    category: string,
    subcategory: string
  ): Promise<{
    enhancedDescription: string;
    suggestedKeywords: string[];
    improvements: string[];
  }> {
    const prompt = `You are a professional copywriter for a services marketplace. Enhance the following service description to make it more appealing and professional.

Category: ${category}
Subcategory: ${subcategory}
Original Description: "${originalDescription}"

Improve the description by:
1. Making it more professional and engaging
2. Highlighting key benefits and features
3. Using clear, concise language
4. Maintaining authenticity
5. Adding relevant keywords for searchability

Respond with a JSON object:
{
  "enhancedDescription": "The improved description",
  "suggestedKeywords": ["keyword1", "keyword2"],
  "improvements": ["improvement1", "improvement2"]
}

Rules:
- Keep the same general meaning
- Length should be 2-3 paragraphs
- Make it compelling but not exaggerated`;

    return await this.generateStructuredOutput(prompt, {
      temperature: 0.7,
      maxTokens: 1000,
    });
  }
}

export function createOpenAIService(): OpenAIService {
  return new OpenAIService();
}
