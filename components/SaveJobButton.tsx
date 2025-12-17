import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Bookmark } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { toggleSavedJob, isJobSaved } from '@/lib/saved-jobs';
import { colors } from '@/constants/theme';

interface SaveJobButtonProps {
  jobId: string;
  onToggle?: (isSaved: boolean) => void;
  size?: number;
  iconOnly?: boolean;
}

export default function SaveJobButton({
  jobId,
  onToggle,
  size = 24,
  iconOnly = false,
}: SaveJobButtonProps) {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkSavedStatus();
  }, [jobId, user]);

  const checkSavedStatus = async () => {
    if (!user?.id) {
      setChecking(false);
      return;
    }

    setChecking(true);
    const saved = await isJobSaved(user.id, jobId);
    setIsSaved(saved);
    setChecking(false);
  };

  const handleToggle = async () => {
    if (!user?.id) {
      Alert.alert('Sign In Required', 'Please sign in to save jobs');
      return;
    }

    setLoading(true);
    try {
      const result = await toggleSavedJob(user.id, jobId);

      if (result.success && result.result) {
        const newSavedState = result.result.saved;
        setIsSaved(newSavedState);
        onToggle?.(newSavedState);

        // Show feedback
        if (newSavedState) {
          Alert.alert('Job Saved', 'Job added to your saved list');
        } else {
          Alert.alert('Job Removed', 'Job removed from your saved list');
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to save job');
      }
    } catch (error) {
      console.error('Error toggling saved job:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <TouchableOpacity style={styles.button} disabled>
        <ActivityIndicator size="small" color={colors.textSecondary} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.button, isSaved && styles.buttonActive]}
      onPress={handleToggle}
      disabled={loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isSaved ? colors.white : colors.primary}
        />
      ) : (
        <Bookmark
          size={size}
          color={isSaved ? colors.white : colors.primary}
          fill={isSaved ? colors.white : 'transparent'}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.primary + '20',
  },
  buttonActive: {
    backgroundColor: colors.primary,
  },
});
