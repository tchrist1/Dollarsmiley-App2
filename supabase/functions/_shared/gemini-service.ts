import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";

export interface GeminiConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
}

export interface GeminiResponse {
  text: string;
  tokensUsed?: number;
  finishReason?: string;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private defaultModel: string = "gemini-1.5-flash";

  constructor() {
    const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!apiKey) {
      throw new Error("GOOGLE_AI_API_KEY environment variable is required");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateText(
    prompt: string,
    config?: GeminiConfig
  ): Promise<GeminiResponse> {
    const model = this.genAI.getGenerativeModel({
      model: config?.model || this.defaultModel,
      generationConfig: {
        temperature: config?.temperature ?? 0.7,
        maxOutputTokens: config?.maxTokens ?? 1000,
        topP: config?.topP ?? 0.95,
        topK: config?.topK ?? 40,
      },
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    return {
      text,
      tokensUsed: response.usageMetadata?.totalTokenCount,
      finishReason: response.candidates?.[0]?.finishReason,
    };
  }

  async generateStructuredOutput<T>(
    prompt: string,
    config?: GeminiConfig
  ): Promise<T> {
    try {
      const response = await this.generateText(prompt, config);

      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("Response text:", response.text);
        throw new Error("No JSON found in AI response. Response: " + response.text.substring(0, 200));
      }

      return JSON.parse(jsonMatch[0]) as T;
    } catch (error: any) {
      if (error.message?.includes("API_KEY_INVALID")) {
        throw new Error("Invalid Google AI API key. Please check your configuration.");
      }
      if (error.message?.includes("QUOTA_EXCEEDED")) {
        throw new Error("Google AI API quota exceeded. Please check your billing.");
      }
      if (error.message?.includes("blocked") || error.message?.includes("safety")) {
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
      description?: string;
      subcategories: Array<{
        id: string;
        name: string;
        description?: string;
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
          `Category: ${cat.name} (${cat.id})\nDescription: ${cat.description || "N/A"}\nSubcategories:\n${cat.subcategories.map((sub) => `  - ${sub.name} (${sub.id}): ${sub.description || "N/A"}`).join("\n")}`
      )
      .join("\n\n");

    const prompt = `You are an intelligent categorization assistant for a services marketplace. Analyze the listing and suggest the most appropriate category and subcategory.

Listing Title: "${title}"
Listing Description: "${description}"

Available Categories and Subcategories:
${categoriesText}

Analyze the listing and respond with a JSON object in this exact format:
{
  "categoryId": "uuid",
  "categoryName": "category name",
  "subcategoryId": "uuid",
  "subcategoryName": "subcategory name",
  "confidenceScore": 0.85,
  "reasoning": "Brief explanation of why this category fits best",
  "alternativeSuggestions": [
    {"categoryId": "uuid", "subcategoryId": "uuid", "score": 0.6}
  ]
}

Rules:
- Choose the MOST specific and relevant subcategory
- confidenceScore should be between 0.0 and 1.0
- Provide 1-3 alternative suggestions with lower scores
- Use actual IDs from the provided categories`;

    return await this.generateStructuredOutput(prompt, {
      temperature: 0.5,
      maxTokens: 800,
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

export function createGeminiService(): GeminiService {
  return new GeminiService();
}