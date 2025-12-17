import { supabase } from './supabase';

export type TranslationStatus = 'draft' | 'review' | 'approved' | 'rejected';
export type TranslationPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TranslationRequestStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type ContentType = 'listing' | 'job' | 'post' | 'review' | 'bio' | 'category' | 'message';

export interface SupportedLanguage {
  id: string;
  code: string;
  name: string;
  native_name: string;
  direction: 'ltr' | 'rtl';
  is_active: boolean;
  is_default: boolean;
  translation_coverage: number;
  flag_emoji: string;
  sort_order: number;
  created_at: string;
}

export interface UserLanguagePreference {
  id: string;
  user_id: string;
  primary_language: string;
  fallback_languages: string[];
  auto_translate: boolean;
  show_original: boolean;
  updated_at: string;
}

export interface TranslationString {
  id: string;
  key: string;
  context: string | null;
  category: string;
  source_text: string;
  source_language: string;
  character_limit: number | null;
  interpolation_vars: string[];
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Translation {
  id: string;
  string_id: string;
  language_code: string;
  translated_text: string;
  status: TranslationStatus;
  quality_score: number | null;
  is_machine_translated: boolean;
  translator_id: string | null;
  reviewer_id: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentTranslation {
  id: string;
  content_type: ContentType;
  content_id: string;
  field_name: string;
  source_language: string;
  target_language: string;
  source_text: string;
  translated_text: string;
  is_machine_translated: boolean;
  quality_score: number | null;
  translator_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TranslationRequest {
  id: string;
  content_type: string;
  content_id: string;
  field_name: string;
  source_language: string;
  target_languages: string[];
  priority: TranslationPriority;
  status: TranslationRequestStatus;
  requester_id: string | null;
  assigned_to: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
}

/**
 * Get all supported languages
 */
export async function getSupportedLanguages(): Promise<SupportedLanguage[]> {
  try {
    const { data, error } = await supabase
      .from('supported_languages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching supported languages:', error);
    return [];
  }
}

/**
 * Get language by code
 */
export async function getLanguageByCode(code: string): Promise<SupportedLanguage | null> {
  try {
    const { data, error } = await supabase
      .from('supported_languages')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching language:', error);
    return null;
  }
}

/**
 * Get user language preferences
 */
export async function getUserLanguagePreferences(
  userId: string
): Promise<UserLanguagePreference | null> {
  try {
    const { data, error } = await supabase
      .from('user_language_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      const { data: newPrefs, error: insertError } = await supabase
        .from('user_language_preferences')
        .insert({ user_id: userId })
        .select()
        .single();

      if (insertError) throw insertError;
      return newPrefs;
    }

    return data;
  } catch (error) {
    console.error('Error fetching user language preferences:', error);
    return null;
  }
}

/**
 * Update user language preferences
 */
export async function updateUserLanguagePreferences(
  userId: string,
  preferences: Partial<UserLanguagePreference>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_language_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating language preferences:', error);
    return false;
  }
}

/**
 * Get translation for a key
 */
export async function getTranslation(
  key: string,
  languageCode: string,
  fallbackLanguages: string[] = ['en']
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('get_translation', {
      key_param: key,
      lang_param: languageCode,
      fallback_langs: fallbackLanguages,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching translation:', error);
    return null;
  }
}

/**
 * Get multiple translations at once
 */
export async function getTranslations(
  keys: string[],
  languageCode: string
): Promise<Record<string, string>> {
  try {
    const { data, error } = await supabase
      .from('translations')
      .select('translation_strings(key), translated_text')
      .eq('language_code', languageCode)
      .eq('status', 'approved')
      .in(
        'string_id',
        supabase
          .from('translation_strings')
          .select('id')
          .in('key', keys)
      );

    if (error) throw error;

    const translations: Record<string, string> = {};
    data?.forEach((item: any) => {
      if (item.translation_strings?.key) {
        translations[item.translation_strings.key] = item.translated_text;
      }
    });

    return translations;
  } catch (error) {
    console.error('Error fetching translations:', error);
    return {};
  }
}

/**
 * Get content translation
 */
export async function getContentTranslation(
  contentType: ContentType,
  contentId: string,
  fieldName: string,
  targetLanguage: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('get_content_translation', {
      content_type_param: contentType,
      content_id_param: contentId,
      field_name_param: fieldName,
      target_lang_param: targetLanguage,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching content translation:', error);
    return null;
  }
}

/**
 * Save content translation
 */
export async function saveContentTranslation(
  contentType: ContentType,
  contentId: string,
  fieldName: string,
  sourceLanguage: string,
  targetLanguage: string,
  sourceText: string,
  translatedText: string,
  isMachineTranslated: boolean = false
): Promise<boolean> {
  try {
    const { error } = await supabase.from('content_translations').upsert({
      content_type: contentType,
      content_id: contentId,
      field_name: fieldName,
      source_language: sourceLanguage,
      target_language: targetLanguage,
      source_text: sourceText,
      translated_text: translatedText,
      is_machine_translated: isMachineTranslated,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error saving content translation:', error);
    return false;
  }
}

/**
 * Create translation request
 */
export async function createTranslationRequest(
  contentType: string,
  contentId: string,
  fieldName: string,
  sourceLanguage: string,
  targetLanguages: string[],
  priority: TranslationPriority = 'medium',
  requesterId: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('translation_requests')
      .insert({
        content_type: contentType,
        content_id: contentId,
        field_name: fieldName,
        source_language: sourceLanguage,
        target_languages: targetLanguages,
        priority,
        requester_id: requesterId,
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error creating translation request:', error);
    return null;
  }
}

/**
 * Get translation requests
 */
export async function getTranslationRequests(
  status?: TranslationRequestStatus
): Promise<TranslationRequest[]> {
  try {
    let query = supabase
      .from('translation_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching translation requests:', error);
    return [];
  }
}

/**
 * Interpolate translation variables
 */
export function interpolate(template: string, variables: Record<string, string>): string {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  });
  return result;
}

/**
 * Detect text direction for language
 */
export function getTextDirection(languageCode: string): 'ltr' | 'rtl' {
  const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
  return rtlLanguages.includes(languageCode) ? 'rtl' : 'ltr';
}

/**
 * Format language display name
 */
export function formatLanguageName(language: SupportedLanguage, showNative: boolean = true): string {
  if (showNative && language.native_name !== language.name) {
    return `${language.name} (${language.native_name})`;
  }
  return language.name;
}

/**
 * Get translation coverage color
 */
export function getCoverageColor(coverage: number): string {
  if (coverage >= 90) return '#10B981';
  if (coverage >= 70) return '#F59E0B';
  if (coverage >= 50) return '#EF4444';
  return '#6B7280';
}

/**
 * Get language flag emoji
 */
export function getLanguageFlag(languageCode: string): string {
  const flags: Record<string, string> = {
    en: '🇬🇧',
    es: '🇪🇸',
    fr: '🇫🇷',
    de: '🇩🇪',
    it: '🇮🇹',
    pt: '🇵🇹',
    ru: '🇷🇺',
    ja: '🇯🇵',
    zh: '🇨🇳',
    ko: '🇰🇷',
    ar: '🇸🇦',
    hi: '🇮🇳',
    vi: '🇻🇳',
    tr: '🇹🇷',
    pl: '🇵🇱',
    uk: '🇺🇦',
    nl: '🇳🇱',
    sv: '🇸🇪',
    no: '🇳🇴',
    da: '🇩🇰',
    fi: '🇫🇮',
    cs: '🇨🇿',
    el: '🇬🇷',
    he: '🇮🇱',
    th: '🇹🇭',
    id: '🇮🇩',
    ms: '🇲🇾',
    ro: '🇷🇴',
  };
  return flags[languageCode] || '🌐';
}

/**
 * Get popular languages (top 10)
 */
export async function getPopularLanguages(): Promise<SupportedLanguage[]> {
  try {
    const languages = await getSupportedLanguages();
    return languages.slice(0, 10);
  } catch (error) {
    console.error('Error fetching popular languages:', error);
    return [];
  }
}

/**
 * Search languages
 */
export async function searchLanguages(query: string): Promise<SupportedLanguage[]> {
  try {
    const { data, error } = await supabase
      .from('supported_languages')
      .select('*')
      .eq('is_active', true)
      .or(`name.ilike.%${query}%,native_name.ilike.%${query}%,code.ilike.%${query}%`)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error searching languages:', error);
    return [];
  }
}

/**
 * Get translation statistics
 */
export async function getTranslationStatistics(languageCode: string): Promise<{
  totalStrings: number;
  translatedStrings: number;
  coverage: number;
  pendingReview: number;
}> {
  try {
    const [totalResult, translatedResult, reviewResult] = await Promise.all([
      supabase.from('translation_strings').select('id', { count: 'exact', head: true }),
      supabase
        .from('translations')
        .select('id', { count: 'exact', head: true })
        .eq('language_code', languageCode)
        .eq('status', 'approved'),
      supabase
        .from('translations')
        .select('id', { count: 'exact', head: true })
        .eq('language_code', languageCode)
        .eq('status', 'review'),
    ]);

    const totalStrings = totalResult.count || 0;
    const translatedStrings = translatedResult.count || 0;
    const pendingReview = reviewResult.count || 0;
    const coverage = totalStrings > 0 ? (translatedStrings / totalStrings) * 100 : 0;

    return {
      totalStrings,
      translatedStrings,
      coverage,
      pendingReview,
    };
  } catch (error) {
    console.error('Error fetching translation statistics:', error);
    return {
      totalStrings: 0,
      translatedStrings: 0,
      coverage: 0,
      pendingReview: 0,
    };
  }
}

/**
 * Get missing translations
 */
export async function getMissingTranslations(
  languageCode: string,
  limit: number = 50
): Promise<TranslationString[]> {
  try {
    const { data, error } = await supabase
      .from('translation_strings')
      .select('*')
      .not(
        'id',
        'in',
        supabase
          .from('translations')
          .select('string_id')
          .eq('language_code', languageCode)
          .eq('status', 'approved')
      )
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching missing translations:', error);
    return [];
  }
}

/**
 * Batch translate content
 */
export async function batchTranslateContent(
  items: Array<{
    contentType: ContentType;
    contentId: string;
    fieldName: string;
    sourceText: string;
  }>,
  sourceLanguage: string,
  targetLanguage: string
): Promise<boolean> {
  try {
    const translations = items.map((item) => ({
      content_type: item.contentType,
      content_id: item.contentId,
      field_name: item.fieldName,
      source_language: sourceLanguage,
      target_language: targetLanguage,
      source_text: item.sourceText,
      translated_text: item.sourceText,
      is_machine_translated: true,
    }));

    const { error } = await supabase.from('content_translations').upsert(translations);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error batch translating content:', error);
    return false;
  }
}

/**
 * Get language analytics
 */
export async function getLanguageAnalytics(
  languageCode: string,
  days: number = 30
): Promise<any[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('translation_analytics')
      .select('*')
      .eq('language_code', languageCode)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching language analytics:', error);
    return [];
  }
}

/**
 * Get default language
 */
export async function getDefaultLanguage(): Promise<SupportedLanguage | null> {
  try {
    const { data, error } = await supabase
      .from('supported_languages')
      .select('*')
      .eq('is_default', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching default language:', error);
    return null;
  }
}

/**
 * Validate translation variables
 */
export function validateTranslationVariables(
  template: string,
  requiredVars: string[]
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  requiredVars.forEach((varName) => {
    if (!template.includes(`{${varName}}`)) {
      missing.push(varName);
    }
  });

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Check if translation exceeds character limit
 */
export function checkCharacterLimit(text: string, limit: number | null): boolean {
  if (!limit) return true;
  return text.length <= limit;
}

/**
 * Get RTL languages
 */
export function isRTLLanguage(languageCode: string): boolean {
  const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
  return rtlLanguages.includes(languageCode);
}
