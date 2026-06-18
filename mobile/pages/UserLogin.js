import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  Lock,
  Mail,
  ArrowRight,
  Smartphone,
} from 'lucide-react-native';
import { API_BASE_URL, fetchWithTimeout } from '../config';

export default function UserLogin({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // OTP verification step
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [userOtp, setUserOtp] = useState('');

  const handleLogin = async () => {
    setError('');

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError('Please fill in both Email Address and Password.');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed. Please try again.');
        setLoading(false);
        return;
      }

      // Server returns OTP for demo display
      setGeneratedOtp(data.otp || '');
      setShowOtpStep(true);
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Could not connect to server.');
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');

    if (!userOtp.trim()) {
      setError('Please enter the OTP code sent to your email.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp: userOtp.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'OTP verification failed.');
        setLoading(false);
        return;
      }

      // OTP verified — proceed to next page
      setLoading(false);
      onLoginSuccess(email.trim());
    } catch (err) {
      setError(err.message || 'Could not connect to server.');
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setUserOtp('');
    setLoading(true);

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to resend OTP.');
        setLoading(false);
        return;
      }

      setGeneratedOtp(data.otp || '');
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Could not connect to server.');
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setShowOtpStep(false);
    setGeneratedOtp('');
    setUserOtp('');
    setError('');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.card}>
        <View style={styles.headerContainer}>
          <View style={styles.iconContainer}>
            <Lock size={24} color="#1E40AF" />
          </View>

          <Text style={styles.title}>
            {showOtpStep ? 'Verify OTP' : 'Sign In'}
          </Text>

          <Text style={styles.subtitle}>
            {showOtpStep
              ? 'A 6-digit verification code has been sent to your email address. Please enter it below to continue.'
              : 'Access the Forte Support Ticket Portal to open requests and track active progress.'}
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* === STEP 1: Email + Password === */}
        {!showOtpStep && (
          <>
            {/* Email */}
            <Text style={styles.fieldLabel}>Email Address</Text>

            <View style={styles.inputContainer}>
              <Mail
                size={16}
                color="#64748B"
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                placeholder="customer@example.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                editable={!loading}
              />
            </View>

            {/* Password */}
            <Text style={styles.fieldLabel}>Password</Text>

            <View style={styles.inputContainer}>
              <Lock
                size={16}
                color="#64748B"
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                secureTextEntry={true}
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />
            </View>

            {/* Demo Notice */}
            <View style={styles.demoNoticeBox}>
              <Text style={styles.demoNoticeText}>
                <Text style={{ fontWeight: '700' }}>
                  Demo Accounts:
                </Text>{' '}
                admin@example.com / admin123, user@example.com / user123, demo@example.com / demo123
              </Text>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <View style={styles.btnRow}>
                  <Text style={styles.btnPrimaryText}>
                    Sign In to Portal
                  </Text>

                  <ArrowRight
                    size={16}
                    color="#FFFFFF"
                  />
                </View>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* === STEP 2: OTP Verification === */}
        {showOtpStep && (
          <>
            {/* OTP Input */}
            <Text style={styles.fieldLabel}>One-Time Password (OTP)</Text>

            <View style={styles.inputContainer}>
              <Smartphone
                size={16}
                color="#64748B"
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                placeholder="Enter 6-digit OTP code"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={6}
                value={userOtp}
                onChangeText={setUserOtp}
                editable={!loading}
              />
            </View>

            {/* Simulated OTP Display */}
            <View style={styles.otpDisplayBox}>
              <Text style={styles.otpDisplayText}>
                <Text style={{ fontWeight: '700' }}>OTP Gateway:</Text>{' '}
                A simulated 6-digit OTP code of{' '}
                <Text style={{ fontWeight: '800', textDecorationLine: 'underline' }}>
                  {generatedOtp}
                </Text>{' '}
                was sent to your email:{' '}
                <Text style={{ fontWeight: '700' }}>{email.trim()}</Text>.
              </Text>
            </View>

            {/* Resend & Back links */}
            <View style={styles.linkRow}>
              <TouchableOpacity onPress={handleBackToLogin}>
                <Text style={styles.linkText}>← Back to Sign In</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleResendOtp} disabled={loading}>
                <Text style={styles.linkText}>Resend OTP</Text>
              </TouchableOpacity>
            </View>

            {/* Verify Button */}
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={handleVerifyOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.btnRow}>
                  <Text style={styles.btnPrimaryText}>
                    Verify & Sign In
                  </Text>
                  <ArrowRight size={16} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  contentContainer: {
    padding: 16,
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    width: '100%',
    maxWidth: 450,

    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },

      android: {
        elevation: 2,
      },
    }),
  },

  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
  },

  errorBox: {
    backgroundColor: '#FEE2E2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    padding: 12,
    borderRadius: 6,
    marginBottom: 20,
  },

  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
  },

  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 10,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFCFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },

  inputIcon: {
    marginRight: 8,
  },

  input: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 14,
    color: '#0F172A',
  },

  demoNoticeBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 10,
    marginBottom: 20,
  },

  demoNoticeText: {
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 15,
  },

  otpDisplayBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 10,
    marginBottom: 12,
  },

  otpDisplayText: {
    fontSize: 11,
    color: '#166534',
    lineHeight: 16,
  },

  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  linkText: {
    fontSize: 12,
    color: '#0284C7',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  btn: {
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },

  btnPrimary: {
    backgroundColor: '#1E40AF',
  },

  btnPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});