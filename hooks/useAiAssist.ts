import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export function useAiAssist() {
  const { user } = useAuth();
  const [aiAssistEnabled, setAiAssistEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAiAssistEnabled(false);
      setLoading(false);
      return;
    }

    loadAiAssistPreference();
  }, [user]);

  async function loadAiAssistPreference() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('ai_assist_enabled')
        .eq('id', user!.id)
        .maybeSingle();

      if (error) throw error;

      setAiAssistEnabled(data?.ai_assist_enabled ?? true);
    } catch (error) {
      console.error('Error loading AI assist preference:', error);
      setAiAssistEnabled(true);
    } finally {
      setLoading(false);
    }
  }

  async function toggleAiAssist() {
    if (!user) return;

    const newValue = !aiAssistEnabled;
    setAiAssistEnabled(newValue);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ai_assist_enabled: newValue })
        .eq('id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error toggling AI assist:', error);
      setAiAssistEnabled(!newValue);
    }
  }

  return {
    aiAssistEnabled,
    toggleAiAssist,
    loading,
  };
}

export function meetsAiThreshold(text: string, minLength: number = 10): boolean {
  return text.trim().length >= minLength;
}
