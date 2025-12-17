import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { supabase } from './supabase';

export interface VoiceSearchResult {
  query: string;
  confidence: number;
  intent?: string;
  entities?: {
    category?: string;
    location?: string;
    priceRange?: { min?: number; max?: number };
    rating?: number;
    keywords?: string[];
  };
}

export interface VoiceSearchOptions {
  language?: string;
  maxDuration?: number;
  continuous?: boolean;
}

let isListening = false;
let recognitionTimeout: NodeJS.Timeout | null = null;

// Initialize audio recording
export async function requestAudioPermissions(): Promise<boolean> {
  try {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting audio permissions:', error);
    return false;
  }
}

// Start voice recording (Web-based implementation)
export async function startVoiceRecording(
  options: VoiceSearchOptions = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    if (isListening) {
      return { success: false, error: 'Already listening' };
    }

    const hasPermission = await requestAudioPermissions();
    if (!hasPermission) {
      return { success: false, error: 'Audio permission not granted' };
    }

    // Check if Web Speech API is available
    if (typeof window === 'undefined' || !('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      return { success: false, error: 'Speech recognition not supported' };
    }

    isListening = true;
    return { success: true };
  } catch (error: any) {
    console.error('Error starting voice recording:', error);
    return { success: false, error: error.message };
  }
}

// Stop voice recording
export function stopVoiceRecording(): void {
  isListening = false;
  if (recognitionTimeout) {
    clearTimeout(recognitionTimeout);
    recognitionTimeout = null;
  }
}

// Parse voice search query using NLP
export function parseVoiceQuery(transcript: string): VoiceSearchResult {
  const query = transcript.toLowerCase().trim();

  const result: VoiceSearchResult = {
    query: transcript,
    confidence: 0.8,
    entities: {},
  };

  // Detect intent
  if (query.includes('find') || query.includes('search') || query.includes('looking for')) {
    result.intent = 'search';
  } else if (query.includes('book') || query.includes('hire') || query.includes('schedule')) {
    result.intent = 'book';
  } else if (query.includes('show me') || query.includes('list')) {
    result.intent = 'browse';
  }

  // Extract category
  const categories = [
    'plumber', 'plumbing',
    'electrician', 'electrical',
    'carpenter', 'carpentry',
    'cleaner', 'cleaning',
    'painter', 'painting',
    'mechanic', 'automotive',
    'landscaper', 'landscaping',
    'handyman',
    'hvac', 'heating', 'cooling',
    'roofer', 'roofing',
  ];

  for (const category of categories) {
    if (query.includes(category)) {
      result.entities!.category = category;
      break;
    }
  }

  // Extract location
  const locationPatterns = [
    /near\s+(.+?)(?:\s|$)/,
    /in\s+(.+?)(?:\s|$)/,
    /at\s+(.+?)(?:\s|$)/,
    /around\s+(.+?)(?:\s|$)/,
  ];

  for (const pattern of locationPatterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      result.entities!.location = match[1].trim();
      break;
    }
  }

  // Extract price range
  const pricePatterns = [
    /under\s+\$?(\d+)/,
    /below\s+\$?(\d+)/,
    /less than\s+\$?(\d+)/,
    /between\s+\$?(\d+)\s+and\s+\$?(\d+)/,
    /\$?(\d+)\s+to\s+\$?(\d+)/,
  ];

  for (const pattern of pricePatterns) {
    const match = query.match(pattern);
    if (match) {
      if (match[2]) {
        result.entities!.priceRange = {
          min: parseInt(match[1]),
          max: parseInt(match[2]),
        };
      } else {
        result.entities!.priceRange = { max: parseInt(match[1]) };
      }
      break;
    }
  }

  // Extract rating
  const ratingPatterns = [
    /(\d+(?:\.\d+)?)\s+stars?\s+or\s+(?:higher|more|better)/,
    /rated\s+(\d+(?:\.\d+)?)\s+or\s+(?:higher|more|better)/,
    /at least\s+(\d+(?:\.\d+)?)\s+stars?/,
  ];

  for (const pattern of ratingPatterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      result.entities!.rating = parseFloat(match[1]);
      break;
    }
  }

  // Extract keywords
  const stopWords = [
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
    'find', 'search', 'show', 'me', 'looking', 'need', 'want', 'book', 'hire',
  ];

  const words = query
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.includes(word));

  result.entities!.keywords = words;

  return result;
}

// Search providers based on voice query
export async function searchByVoice(
  voiceResult: VoiceSearchResult,
  userId?: string
): Promise<any[]> {
  try {
    let query = supabase
      .from('profiles')
      .select('*, category:categories(name)')
      .eq('role', 'Provider')
      .eq('is_verified', true);

    // Apply category filter
    if (voiceResult.entities?.category) {
      query = query.ilike('category.name', `%${voiceResult.entities.category}%`);
    }

    // Apply price filter
    if (voiceResult.entities?.priceRange) {
      if (voiceResult.entities.priceRange.min) {
        query = query.gte('hourly_rate', voiceResult.entities.priceRange.min);
      }
      if (voiceResult.entities.priceRange.max) {
        query = query.lte('hourly_rate', voiceResult.entities.priceRange.max);
      }
    }

    // Apply rating filter
    if (voiceResult.entities?.rating) {
      query = query.gte('average_rating', voiceResult.entities.rating);
    }

    // Apply keyword search
    if (voiceResult.entities?.keywords && voiceResult.entities.keywords.length > 0) {
      const keywordQuery = voiceResult.entities.keywords.join(' | ');
      query = query.textSearch('bio', keywordQuery);
    }

    // Limit results
    query = query.limit(20);

    const { data, error } = await query;

    if (error) throw error;

    // Log voice search for analytics
    if (userId) {
      await logVoiceSearch(userId, voiceResult);
    }

    return data || [];
  } catch (error) {
    console.error('Error searching by voice:', error);
    return [];
  }
}

// Search jobs based on voice query
export async function searchJobsByVoice(
  voiceResult: VoiceSearchResult,
  userId?: string
): Promise<any[]> {
  try {
    let query = supabase
      .from('job_postings')
      .select('*, category:categories(name), customer:profiles!customer_id(full_name)')
      .eq('status', 'Open');

    // Apply category filter
    if (voiceResult.entities?.category) {
      query = query.ilike('category.name', `%${voiceResult.entities.category}%`);
    }

    // Apply budget filter
    if (voiceResult.entities?.priceRange) {
      if (voiceResult.entities.priceRange.min) {
        query = query.gte('budget', voiceResult.entities.priceRange.min);
      }
      if (voiceResult.entities.priceRange.max) {
        query = query.lte('budget', voiceResult.entities.priceRange.max);
      }
    }

    // Apply keyword search
    if (voiceResult.entities?.keywords && voiceResult.entities.keywords.length > 0) {
      const keywordQuery = voiceResult.entities.keywords.join(' | ');
      query = query.textSearch('description', keywordQuery);
    }

    // Limit results
    query = query.limit(20);

    const { data, error } = await query;

    if (error) throw error;

    // Log voice search
    if (userId) {
      await logVoiceSearch(userId, voiceResult);
    }

    return data || [];
  } catch (error) {
    console.error('Error searching jobs by voice:', error);
    return [];
  }
}

// Log voice search for analytics
async function logVoiceSearch(
  userId: string,
  voiceResult: VoiceSearchResult
): Promise<void> {
  try {
    await supabase.from('search_history').insert({
      user_id: userId,
      query: voiceResult.query,
      search_type: 'voice',
      filters: voiceResult.entities,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error logging voice search:', error);
  }
}

// Text-to-speech for results
export async function speakText(text: string, options?: Speech.SpeechOptions): Promise<void> {
  try {
    const isSpeaking = await Speech.isSpeakingAsync();
    if (isSpeaking) {
      await Speech.stop();
    }

    await Speech.speak(text, {
      language: 'en-US',
      pitch: 1.0,
      rate: 0.9,
      ...options,
    });
  } catch (error) {
    console.error('Error speaking text:', error);
  }
}

// Stop text-to-speech
export async function stopSpeaking(): Promise<void> {
  try {
    await Speech.stop();
  } catch (error) {
    console.error('Error stopping speech:', error);
  }
}

// Format search results for voice feedback
export function formatResultsForVoice(results: any[], type: 'providers' | 'jobs'): string {
  if (results.length === 0) {
    return "I couldn't find any results matching your search. Please try again with different keywords.";
  }

  if (type === 'providers') {
    if (results.length === 1) {
      const provider = results[0];
      return `I found one provider: ${provider.full_name}, a ${provider.category?.name || 'service provider'} with a ${provider.average_rating || 'new'} star rating.`;
    } else {
      const topProvider = results[0];
      return `I found ${results.length} providers. The top result is ${topProvider.full_name}, a ${topProvider.category?.name || 'service provider'} with a ${topProvider.average_rating || 'new'} star rating. Would you like to see more?`;
    }
  } else {
    if (results.length === 1) {
      const job = results[0];
      return `I found one job: ${job.title} posted by ${job.customer?.full_name || 'a customer'} with a budget of $${job.budget}.`;
    } else {
      const topJob = results[0];
      return `I found ${results.length} jobs. The top result is ${topJob.title} with a budget of $${topJob.budget}. Would you like to see more?`;
    }
  }
}

// Get voice search suggestions based on history
export async function getVoiceSearchSuggestions(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('search_history')
      .select('query')
      .eq('user_id', userId)
      .eq('search_type', 'voice')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    return data?.map((item) => item.query) || [];
  } catch (error) {
    console.error('Error getting voice search suggestions:', error);
    return [];
  }
}

// Helper: Check if voice search is supported
export function isVoiceSearchSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

// Helper: Get supported languages
export function getSupportedLanguages(): string[] {
  return [
    'en-US',
    'en-GB',
    'es-ES',
    'fr-FR',
    'de-DE',
    'it-IT',
    'pt-BR',
    'zh-CN',
    'ja-JP',
    'ko-KR',
  ];
}

// Helper: Format voice command examples
export function getVoiceCommandExamples(): string[] {
  return [
    'Find a plumber near downtown',
    'Search for electricians under $100',
    'Show me carpenters with 4 stars or higher',
    'Looking for cleaning services in Boston',
    'Find handyman jobs between $50 and $150',
    'Search for painters rated 4.5 or better',
  ];
}
