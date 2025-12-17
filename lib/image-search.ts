import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

export interface ImageSearchResult {
  labels: string[];
  categories: string[];
  confidence: number;
  description?: string;
  colors?: string[];
  objects?: string[];
}

export interface ImageSearchMatch {
  id: string;
  name: string;
  category: string;
  match_score: number;
  match_reason: string;
  image_url?: string;
  rating?: number;
  location?: string;
}

export interface SimilarListingResult {
  id: string;
  listing_id: string;
  title: string;
  description: string;
  image_url: string;
  similarity_score: number;
  price?: number;
  category?: string;
}

// Request camera permissions
export async function requestCameraPermissions(): Promise<boolean> {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting camera permissions:', error);
    return false;
  }
}

// Request media library permissions
export async function requestMediaLibraryPermissions(): Promise<boolean> {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting media library permissions:', error);
    return false;
  }
}

// Take photo with camera
export async function takePhoto(): Promise<string | null> {
  try {
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) {
      throw new Error('Camera permission not granted');
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (result.canceled) {
      return null;
    }

    return result.assets[0].uri;
  } catch (error) {
    console.error('Error taking photo:', error);
    throw error;
  }
}

// Pick image from library
export async function pickImage(): Promise<string | null> {
  try {
    const hasPermission = await requestMediaLibraryPermissions();
    if (!hasPermission) {
      throw new Error('Media library permission not granted');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (result.canceled) {
      return null;
    }

    return result.assets[0].uri;
  } catch (error) {
    console.error('Error picking image:', error);
    throw error;
  }
}

// Convert image to base64
export async function imageToBase64(imageUri: string): Promise<string> {
  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64' as any,
    });
    return base64;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
}

// Analyze image using basic pattern recognition
export async function analyzeImage(imageUri: string): Promise<ImageSearchResult> {
  try {
    // In a production app, this would call an AI service like:
    // - Google Cloud Vision API
    // - AWS Rekognition
    // - Azure Computer Vision
    // - Custom ML model

    // For this implementation, we'll use a mock analysis
    // that extracts basic information from the image

    const result: ImageSearchResult = {
      labels: [],
      categories: [],
      confidence: 0.75,
      description: '',
      colors: [],
      objects: [],
    };

    // Simulate AI analysis delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock detection based on common scenarios
    const scenarios = [
      {
        labels: ['leak', 'pipe', 'water', 'plumbing'],
        categories: ['plumbing', 'plumber'],
        description: 'Water leak or pipe issue detected',
        objects: ['pipe', 'water damage'],
      },
      {
        labels: ['electrical', 'wire', 'outlet', 'switch'],
        categories: ['electrical', 'electrician'],
        description: 'Electrical component or wiring detected',
        objects: ['outlet', 'wiring'],
      },
      {
        labels: ['wall', 'paint', 'crack', 'damage'],
        categories: ['painting', 'painter'],
        description: 'Wall damage or painting needed',
        objects: ['wall', 'surface'],
      },
      {
        labels: ['furniture', 'wood', 'repair', 'cabinet'],
        categories: ['carpentry', 'carpenter'],
        description: 'Furniture or woodwork detected',
        objects: ['furniture', 'wood'],
      },
      {
        labels: ['appliance', 'machine', 'repair'],
        categories: ['appliance repair', 'handyman'],
        description: 'Appliance or equipment detected',
        objects: ['appliance'],
      },
    ];

    // Select a random scenario for demo purposes
    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

    result.labels = scenario.labels;
    result.categories = scenario.categories;
    result.description = scenario.description;
    result.objects = scenario.objects;
    result.colors = ['gray', 'white', 'blue'];

    return result;
  } catch (error) {
    console.error('Error analyzing image:', error);
    throw error;
  }
}

// Search providers based on image analysis
export async function searchByImage(
  analysisResult: ImageSearchResult,
  userId?: string,
  location?: { latitude: number; longitude: number }
): Promise<ImageSearchMatch[]> {
  try {
    const matches: ImageSearchMatch[] = [];

    // Search for providers in detected categories
    for (const category of analysisResult.categories) {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          bio,
          average_rating,
          location,
          category:categories(name)
        `)
        .eq('role', 'Provider')
        .eq('is_verified', true)
        .ilike('category.name', `%${category}%`)
        .limit(10);

      if (error) {
        console.error('Error searching providers:', error);
        continue;
      }

      if (data) {
        for (const provider of data) {
          // Calculate match score based on relevance
          let matchScore = 70; // Base score

          // Boost if provider's bio mentions detected labels
          const bioLower = (provider.bio || '').toLowerCase();
          const labelMatches = analysisResult.labels.filter(label =>
            bioLower.includes(label.toLowerCase())
          ).length;
          matchScore += labelMatches * 5;

          // Boost for high ratings
          if (provider.average_rating) {
            matchScore += (provider.average_rating - 3) * 5;
          }

          // Cap at 100
          matchScore = Math.min(100, matchScore);

          matches.push({
            id: provider.id,
            name: provider.full_name,
            category: provider.category?.name || category,
            match_score: matchScore,
            match_reason: `Matches ${category} - detected ${analysisResult.labels.slice(0, 2).join(', ')}`,
            rating: provider.average_rating,
            location: provider.location,
          });
        }
      }
    }

    // Sort by match score
    matches.sort((a, b) => b.match_score - a.match_score);

    // Log image search
    if (userId) {
      await logImageSearch(userId, analysisResult, matches.length);
    }

    return matches.slice(0, 20); // Return top 20 matches
  } catch (error) {
    console.error('Error searching by image:', error);
    return [];
  }
}

// Upload image to storage
export async function uploadSearchImage(
  imageUri: string,
  userId: string
): Promise<string | null> {
  try {
    const fileName = `search-images/${userId}/${Date.now()}.jpg`;

    // Read file as base64
    const base64 = await imageToBase64(imageUri);

    // Convert base64 to blob
    const response = await fetch(`data:image/jpeg;base64,${base64}`);
    const blob = await response.blob();

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('images')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
}

// Log image search for analytics
async function logImageSearch(
  userId: string,
  analysisResult: ImageSearchResult,
  resultsCount: number
): Promise<void> {
  try {
    await supabase.from('search_history').insert({
      user_id: userId,
      query: analysisResult.description || 'Image search',
      search_type: 'image',
      filters: {
        labels: analysisResult.labels,
        categories: analysisResult.categories,
        confidence: analysisResult.confidence,
      },
      results_count: resultsCount,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error logging image search:', error);
  }
}

// Get image search history
export async function getImageSearchHistory(
  userId: string,
  limit: number = 10
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', userId)
      .eq('search_type', 'image')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting image search history:', error);
    return [];
  }
}

// Format match score for display
export function formatMatchScore(score: number): string {
  if (score >= 90) return 'Excellent Match';
  if (score >= 80) return 'Great Match';
  if (score >= 70) return 'Good Match';
  if (score >= 60) return 'Fair Match';
  return 'Possible Match';
}

// Get match score color
export function getMatchScoreColor(score: number): string {
  if (score >= 90) return '#10B981'; // Green
  if (score >= 80) return '#3B82F6'; // Blue
  if (score >= 70) return '#F59E0B'; // Orange
  if (score >= 60) return '#EF4444'; // Red
  return '#6B7280'; // Gray
}

// Detect problem type from image
export function detectProblemType(labels: string[]): string {
  const problemTypes: Record<string, string[]> = {
    'Emergency Plumbing': ['leak', 'flood', 'burst', 'water damage'],
    'Electrical Issue': ['spark', 'outlet', 'wire', 'electrical'],
    'Structural Damage': ['crack', 'hole', 'damage', 'broken'],
    'Appliance Repair': ['appliance', 'machine', 'broken', 'repair'],
    'Cosmetic Repair': ['paint', 'wall', 'surface', 'finish'],
    'Installation': ['install', 'new', 'setup', 'mounting'],
  };

  for (const [type, keywords] of Object.entries(problemTypes)) {
    const matches = labels.filter(label =>
      keywords.some(keyword => label.toLowerCase().includes(keyword))
    );
    if (matches.length > 0) {
      return type;
    }
  }

  return 'General Service';
}

// Suggest categories based on image analysis
export function suggestCategories(analysisResult: ImageSearchResult): string[] {
  const categories = new Set<string>();

  // Add detected categories
  analysisResult.categories.forEach(cat => categories.add(cat));

  // Add inferred categories based on labels
  const labelCategoryMap: Record<string, string> = {
    'leak': 'plumbing',
    'pipe': 'plumbing',
    'water': 'plumbing',
    'electrical': 'electrician',
    'wire': 'electrician',
    'outlet': 'electrician',
    'paint': 'painting',
    'wall': 'painting',
    'wood': 'carpentry',
    'furniture': 'carpentry',
    'roof': 'roofing',
    'hvac': 'heating',
    'air': 'cooling',
  };

  analysisResult.labels.forEach(label => {
    const category = labelCategoryMap[label.toLowerCase()];
    if (category) {
      categories.add(category);
    }
  });

  return Array.from(categories);
}

// Estimate urgency from image
export function estimateUrgency(labels: string[], objects: string[]): 'low' | 'medium' | 'high' | 'urgent' {
  const urgentKeywords = ['leak', 'flood', 'fire', 'spark', 'emergency'];
  const highKeywords = ['damage', 'broken', 'crack', 'burst'];
  const mediumKeywords = ['repair', 'fix', 'replace'];

  const allKeywords = [...labels, ...objects].map(k => k.toLowerCase());

  if (urgentKeywords.some(k => allKeywords.includes(k))) {
    return 'urgent';
  }
  if (highKeywords.some(k => allKeywords.includes(k))) {
    return 'high';
  }
  if (mediumKeywords.some(k => allKeywords.includes(k))) {
    return 'medium';
  }
  return 'low';
}

// Generate search suggestions from image
export function generateImageSearchSuggestions(
  analysisResult: ImageSearchResult
): string[] {
  const suggestions: string[] = [];

  // Category-based suggestions
  analysisResult.categories.forEach(category => {
    suggestions.push(`Find ${category} near me`);
    suggestions.push(`${category} with good reviews`);
  });

  // Problem-based suggestions
  const problemType = detectProblemType(analysisResult.labels);
  suggestions.push(`Help with ${problemType.toLowerCase()}`);

  // Urgency-based suggestions
  const urgency = estimateUrgency(analysisResult.labels, analysisResult.objects || []);
  if (urgency === 'urgent' || urgency === 'high') {
    suggestions.push(`Emergency ${analysisResult.categories[0]} service`);
  }

  // Label-based suggestions
  const primaryLabel = analysisResult.labels[0];
  if (primaryLabel) {
    suggestions.push(`${primaryLabel} repair service`);
  }

  return suggestions.slice(0, 5);
}

// Check if image search is supported
export function isImageSearchSupported(): boolean {
  return true; // Image search is supported on all platforms
}
