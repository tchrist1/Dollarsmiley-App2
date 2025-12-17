import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Phone,
  Check,
  X,
  AlertCircle,
  Clock,
  RefreshCw,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import {
  sendVerificationCode,
  verifyPhoneCode,
  normalizePhoneNumber,
  validatePhoneNumber,
  formatTimeRemaining,
} from '@/lib/phone-verification';

interface PhoneVerificationInputProps {
  onVerified: (phoneNumber: string) => void;
  initialPhoneNumber?: string;
}

type Step = 'input' | 'verify';

export function PhoneVerificationInput({
  onVerified,
  initialPhoneNumber = '',
}: PhoneVerificationInputProps) {
  const [step, setStep] = useState<Step>('input');
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  useEffect(() => {
    if (step === 'verify' && expiresAt) {
      const interval = setInterval(() => {
        const remaining = formatTimeRemaining(expiresAt);
        setTimeRemaining(remaining);

        if (remaining === 'Expired') {
          clearInterval(interval);
          setError('Verification code has expired');
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [step, expiresAt]);

  const handleSendCode = async () => {
    setError(null);

    if (!validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const result = await sendVerificationCode(normalizedPhone);

    setLoading(false);

    if (result.success) {
      setVerificationId(result.verificationId || null);
      setExpiresAt(result.expiresAt || null);
      setStep('verify');
      setAttemptsRemaining(5);
    } else {
      setError(result.error || 'Failed to send verification code');
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationId) {
      setError('Invalid verification session');
      return;
    }

    if (code.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setError(null);
    setLoading(true);

    const result = await verifyPhoneCode(verificationId, code);

    setLoading(false);

    if (result.success) {
      Alert.alert('Success', 'Phone number verified successfully!');
      onVerified(result.phoneNumber || phoneNumber);
    } else {
      setError(result.error || 'Invalid verification code');
      setAttemptsRemaining(result.attemptsRemaining || null);
    }
  };

  const handleResendCode = async () => {
    setCode('');
    setError(null);
    await handleSendCode();
  };

  const handleBack = () => {
    setStep('input');
    setCode('');
    setError(null);
    setVerificationId(null);
    setExpiresAt(null);
    setAttemptsRemaining(null);
  };

  if (step === 'input') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Phone size={32} color={colors.primary} />
          </View>
          <Text style={styles.title}>Verify Phone Number</Text>
          <Text style={styles.subtitle}>
            We'll send you a verification code to confirm your number
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.inputContainer}>
            <Phone size={20} color={colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="+1 (555) 123-4567"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              editable={!loading}
            />
          </View>
          <Text style={styles.hint}>Enter your phone number in international format (e.g., +1 for US)</Text>

          {error && (
            <View style={styles.errorContainer}>
              <AlertCircle size={16} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSendCode}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Text style={styles.buttonText}>Send Verification Code</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.info}>
          <AlertCircle size={16} color={colors.textSecondary} />
          <Text style={styles.infoText}>
            Standard SMS rates may apply. You can request up to 3 codes per hour.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Phone size={32} color={colors.primary} />
        </View>
        <Text style={styles.title}>Enter Verification Code</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to {formatPhoneNumber(phoneNumber)}
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Verification Code</Text>
        <View style={styles.codeInputContainer}>
          <TextInput
            style={styles.codeInput}
            value={code}
            onChangeText={(text) => {
              const cleaned = text.replace(/\D/g, '');
              setCode(cleaned.slice(0, 6));
            }}
            placeholder="000000"
            placeholderTextColor={colors.textSecondary}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            editable={!loading}
          />
        </View>

        {timeRemaining && (
          <View style={styles.timerContainer}>
            <Clock size={16} color={colors.textSecondary} />
            <Text style={styles.timerText}>Code expires in {timeRemaining}</Text>
          </View>
        )}

        {attemptsRemaining !== null && attemptsRemaining < 5 && (
          <View style={styles.attemptsContainer}>
            <AlertCircle size={16} color={colors.warning} />
            <Text style={styles.attemptsText}>
              {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining
            </Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <X size={16} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleVerifyCode}
          disabled={loading || code.length !== 6}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Check size={20} color={colors.white} />
              <Text style={styles.buttonText}>Verify Code</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleResendCode} disabled={loading}>
            <RefreshCw size={16} color={colors.primary} />
            <Text style={styles.secondaryButtonText}>Resend Code</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleBack} disabled={loading}>
            <Text style={styles.secondaryButtonText}>Change Number</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
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
    textAlign: 'center',
  },
  form: {
    padding: spacing.lg,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    marginBottom: spacing.xs,
  },
  inputIcon: {
    marginLeft: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  hint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  codeInputContainer: {
    marginBottom: spacing.md,
  },
  codeInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 8,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
    justifyContent: 'center',
  },
  timerText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  attemptsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.warning + '20',
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  attemptsText: {
    fontSize: fontSize.sm,
    color: colors.warning,
    fontWeight: fontWeight.semibold,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.error + '20',
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  secondaryButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.5,
  },
});
