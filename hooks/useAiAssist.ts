import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface UseAiAssistReturn {
  aiAssistEnabled: boolean;
  toggleAiAssist: () => Promise<void>;
  setAiAssistEnabled: (enabled: boolean) => Promise<void>;
  isLoading: boolean;
}

export function useAiAssist(): UseAiAssistReturn {
  const { profile, refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const aiAssistEnabled = profile?.ai_assist_enabled ?? true;

  const setAiAssistEnabled = useCallback(async (enabled: boolean) => {
    if (!profile?.id) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ai_assist_enabled: enabled })
        .eq('id', profile.id);

      if (error) {
        console.error('Failed to update AI Assist preference:', error);
        return;
      }

      await refreshProfile();
    } catch (error) {
      console.error('Error updating AI Assist preference:', error);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id, refreshProfile]);

  const toggleAiAssist = useCallback(async () => {
    await setAiAssistEnabled(!aiAssistEnabled);
  }, [aiAssistEnabled, setAiAssistEnabled]);

  return {
    aiAssistEnabled,
    toggleAiAssist,
    setAiAssistEnabled,
    isLoading,
  };
}

export function meetsAiThreshold(text: string): boolean {
  const trimmed = text.trim();
  const wordCount = trimmed.split(/\s+/).filter(word => word.length > 0).length;
  const charCount = trimmed.replace(/\s/g, '').length;
  return wordCount >= 2 || charCount >= 12;
}
