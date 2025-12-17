import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, Image } from 'react-native';
import { router } from 'expo-router';
import { Mail, Lock, User } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    // Sign up user - profile is created automatically by database trigger
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
    });

    setLoading(false);

    if (authError) {
      Alert.alert('Registration Failed', authError.message);
      return;
    }

    if (authData.user) {
      // Profile is created automatically by trigger, proceed to onboarding
      router.replace('/(auth)/onboarding');
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
          <Text style={styles.tagline}>Join our community</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to get started</Text>

          <Input
            label="Full Name"
            placeholder="Enter your full name"
            value={fullName}
            onChangeText={setFullName}
            leftIcon={<User size={20} color={colors.textSecondary} />}
          />

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
            placeholder="Create a password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            leftIcon={<Lock size={20} color={colors.textSecondary} />}
            helperText="At least 6 characters"
          />

          <Input
            label="Confirm Password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            leftIcon={<Lock size={20} color={colors.textSecondary} />}
          />

          <Text style={styles.smsOptInText}>
            I agree to receive SMS alerts about jobs, bookings, and account updates. Msg & data rates may apply. Reply STOP to opt out.
          </Text>

          <Button
            title="Sign Up"
            onPress={handleRegister}
            loading={loading}
            style={styles.registerButton}
          />

          <Button
            title="Already have an account? Log In"
            onPress={() => router.push('/(auth)/login')}
            variant="text"
            style={styles.loginButton}
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
    width: 100,
    height: 100,
    marginBottom: spacing.sm,
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
  smsOptInText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textAlign: 'left',
  },
  registerButton: {
    marginTop: spacing.md,
  },
  loginButton: {
    marginTop: spacing.md,
  },
});
