import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { Mail, Lock } from 'lucide-react-native';
import { supabase, clearAuthStorage } from '@/lib/supabase';
import { signInWithGoogle, signInWithApple } from '@/lib/oauth';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [enabledProviders, setEnabledProviders] = useState<{
    google: boolean;
    apple: boolean;
  }>({ google: false, apple: false });

  useEffect(() => {
    fetchEnabledProviders();
  }, []);

  const fetchEnabledProviders = async () => {
    const { data } = await supabase
      .from('oauth_providers')
      .select('provider, is_enabled')
      .in('provider', ['google', 'apple']);

    if (data) {
      const providers = {
        google: data.find(p => p.provider === 'google')?.is_enabled ?? false,
        apple: data.find(p => p.provider === 'apple')?.is_enabled ?? false,
      };
      setEnabledProviders(providers);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      setLoading(false);

      if (error) {
        console.error('Login error:', error);
        Alert.alert('Login Failed', error.message || 'Unable to sign in. Please check your credentials.');
      } else if (data?.session) {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      setLoading(false);
      console.error('Login exception:', err);

      let errorMessage = 'An unexpected error occurred. Please try again.';

      if (err.message && err.message.includes('JSON')) {
        await clearAuthStorage();
        errorMessage = 'Storage cleared. Please try logging in again.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      Alert.alert('Login Failed', errorMessage);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const success = await signInWithGoogle();
    setLoading(false);

    if (success) {
      router.replace('/(tabs)');
    } else {
      Alert.alert('Login Failed', 'Unable to sign in with Google');
    }
  };

  const handleAppleLogin = async () => {
    setLoading(true);
    const success = await signInWithApple();
    setLoading(false);

    if (success) {
      router.replace('/(tabs)');
    } else {
      Alert.alert('Login Failed', 'Unable to sign in with Apple');
    }
  };


  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Image
            source={{ uri: 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/sign/assets/Iimages/Dollarsmiley%20logo.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9mZDMzNWQ3Ni02ZmRjLTRjNTAtYjRjMS1hNGI2ZWZhMzhiNjkiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhc3NldHMvSWltYWdlcy9Eb2xsYXJzbWlsZXkgbG9nby5wbmciLCJpYXQiOjE3NjU3NTg0MDQsImV4cCI6MzM0MjU1ODQwNH0.5ZsGC2LcLf-pw-kuoYVn-t56rfmy0X-0EdwytDTRIJ4' }}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>Dollarsmiley</Text>
          <Text style={styles.tagline}>Spend Smart. Smile Big.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Log in to continue</Text>

          <Input
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={<Mail size={20} color={colors.textSecondary} />}
          />

          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            leftIcon={<Lock size={20} color={colors.textSecondary} />}
          />

          <Button
            title="Log In"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginButton}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {(enabledProviders.google || (enabledProviders.apple && Platform.OS === 'ios')) && (
            <View style={styles.oauthButtons}>
              {enabledProviders.google && (
                <TouchableOpacity
                  style={[styles.oauthButton, styles.googleButton]}
                  onPress={handleGoogleLogin}
                  disabled={loading}
                >
                  <View style={styles.oauthButtonContent}>
                    <View style={styles.googleLogo}>
                      <Text style={styles.googleLogoText}>G</Text>
                    </View>
                    <Text style={styles.oauthButtonText}>Continue with Google</Text>
                  </View>
                </TouchableOpacity>
              )}

              {enabledProviders.apple && Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={[styles.oauthButton, styles.appleButton]}
                  onPress={handleAppleLogin}
                  disabled={loading}
                >
                  <View style={styles.oauthButtonContent}>
                    <Text style={styles.appleIcon}>􀣺</Text>
                    <Text style={styles.oauthButtonText}>Continue with Apple</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}

          <Button
            title="Don't have an account? Sign Up"
            onPress={() => router.push('/(auth)/register')}
            variant="text"
            style={styles.signupButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: spacing.md,
  },
  appName: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  tagline: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  form: {
    width: '100%',
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  loginButton: {
    marginTop: spacing.md,
  },
  signupButton: {
    marginTop: spacing.md,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: spacing.md,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  oauthButtons: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  oauthButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
  },
  appleButton: {
    backgroundColor: '#FFFFFF',
  },
  oauthButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  googleLogo: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  googleLogoText: {
    fontSize: 14,
    fontWeight: fontWeight.bold,
    color: '#4285F4',
  },
  appleIcon: {
    fontSize: 20,
    color: colors.text,
  },
  oauthButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
});
