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
  Image,
  useWindowDimensions,
} from 'react-native';
import {
  Lock,
  Mail,
  ArrowRight,
  QrCode,
  ShieldCheck,
} from 'lucide-react-native';
import { API_BASE_URL, fetchWithTimeout } from '../config';

export default function UserLogin({ onLoginSuccess }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 640;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sign In vs Sign Up toggle
  const [isRegistering, setIsRegistering] = useState(false);

  // 2FA verification step state
  const [showMfaStep, setShowMfaStep] = useState(false);
  const [isMfaSetup, setIsMfaSetup] = useState(false);
  const [mfaQrCodeUrl, setMfaQrCodeUrl] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaToken, setMfaToken] = useState('');

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

      if (data.mfaRequired) {
        setIsMfaSetup(data.mfaSetup || false);
        setMfaQrCodeUrl(data.qrCodeUrl || '');
        setMfaSecret(data.secret || '');
        setMfaToken('');
        setShowMfaStep(true);
      } else {
        onLoginSuccess(trimmedEmail, data.name || '', data.phone || '');
      }
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Could not connect to server.');
      setLoading(false);
    }
  };

  const handleRegister = async () => {
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

    if (trimmedPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: trimmedEmail, 
          password: trimmedPassword 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Registration failed. Please try again.');
        setLoading(false);
        return;
      }

      if (data.mfaRequired) {
        setIsMfaSetup(data.mfaSetup || false);
        setMfaQrCodeUrl(data.qrCodeUrl || '');
        setMfaSecret(data.secret || '');
        setMfaToken('');
        setShowMfaStep(true);
      } else {
        onLoginSuccess(trimmedEmail, data.name || '', data.phone || '');
      }
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Could not connect to server.');
      setLoading(false);
    }
  };

  const handleVerifyMfa = async () => {
    setError('');

    if (!mfaToken.trim()) {
      setError('Please enter the 6-digit Google Authenticator code.');
      return;
    }

    if (mfaToken.trim().length !== 6) {
      setError('Code must be exactly 6 digits.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/verify-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          token: mfaToken.trim(),
          isSetup: isMfaSetup,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Verification failed.');
        setLoading(false);
        return;
      }

      setLoading(false);
      onLoginSuccess(email.trim(), data.name || '', data.phone || '');
    } catch (err) {
      setError(err.message || 'Could not connect to server.');
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setShowMfaStep(false);
    setIsMfaSetup(false);
    setMfaQrCodeUrl('');
    setMfaSecret('');
    setMfaToken('');
    setError('');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        isWide && styles.contentContainerWide,
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.card, isWide && styles.cardWide]}>
        <View style={styles.headerContainer}>
          <View style={styles.iconContainer}>
            {showMfaStep ? (
              <ShieldCheck size={24} color="#1E40AF" />
            ) : (
              <Lock size={24} color="#1E40AF" />
            )}
          </View>

          <Text style={styles.title}>
            {showMfaStep
              ? isMfaSetup
                ? 'Setup Authenticator'
                : '2FA Verification'
              : isRegistering
              ? 'Create Account'
              : 'Sign In'}
          </Text>

          <Text style={styles.subtitle}>
            {showMfaStep
              ? isMfaSetup
                ? 'Scan the QR code with Google Authenticator or enter the manual key below, then input the 6-digit code.'
                : 'Enter the 6-digit verification code from Google Authenticator to secure your session.'
              : isRegistering
              ? 'Register a new support ticket portal account. Google Authenticator 2FA setup will start immediately.'
              : 'Access the Forte Support Ticket Portal to open requests and track active progress.'}
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* === STEP 1: Email + Password === */}
        {!showMfaStep && (
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

            {/* Demo Notice (Only visible when signing in) */}
            {!isRegistering ? (
              <View style={styles.demoNoticeBox}>
                <Text style={styles.demoNoticeText}>
                  <Text style={{ fontWeight: '700' }}>
                    Demo Accounts:
                  </Text>{' '}
                  admin@forte.com / admin123, user@forte.com / user123, demo@forte.com / demo123
                </Text>
              </View>
            ) : (
              <View style={styles.registerNoticeBox}>
                <Text style={styles.registerNoticeText}>
                  <Text style={{ fontWeight: '700' }}>Security Note:</Text> Accounts created are stored in the database. Google Authenticator 2FA will be initialized right after registration.
                </Text>
              </View>
            )}

            {/* Sign In / Register Button */}
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={isRegistering ? handleRegister : handleLogin}
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
                    {isRegistering ? 'Register & Setup 2FA' : 'Sign In to Portal'}
                  </Text>

                  <ArrowRight
                    size={16}
                    color="#FFFFFF"
                  />
                </View>
              )}
            </TouchableOpacity>

            {/* Toggle Link to switch views */}
            <View style={styles.toggleRow}>
              <Text style={styles.toggleText}>
                {isRegistering ? 'Already have an account? ' : "Don't have an account? "}
              </Text>
              <TouchableOpacity onPress={() => { setIsRegistering(!isRegistering); setError(''); }}>
                <Text style={styles.toggleLink}>
                  {isRegistering ? 'Sign In' : 'Sign Up'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* === STEP 2: Google Authenticator 2FA Setup/Verification === */}
        {showMfaStep && (
          <>
            {isMfaSetup && (
              <View style={styles.mfaSetupContainer}>
                {/* QR Code Container */}
                {mfaQrCodeUrl ? (
                  <View style={styles.qrContainer}>
                    <Image
                      source={{ uri: mfaQrCodeUrl }}
                      style={styles.qrCodeImage}
                      resizeMode="contain"
                    />
                  </View>
                ) : null}

                {/* Secret Key manual text */}
                <View style={styles.secretBox}>
                  <Text style={styles.secretLabel}>Manual Secret Key</Text>
                  <Text style={styles.secretText} selectable={true}>
                    {mfaSecret}
                  </Text>
                  <Text style={styles.secretHelp}>
                    If you cannot scan, manually add this key to your app.
                  </Text>
                </View>
              </View>
            )}

            {/* Token Input */}
            <Text style={styles.fieldLabel}>Authenticator Code (6-digit)</Text>

            <View style={styles.inputContainer}>
              <QrCode
                size={16}
                color="#64748B"
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                placeholder="000000"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={6}
                value={mfaToken}
                onChangeText={setMfaToken}
                editable={!loading}
              />
            </View>

            {/* Back link */}
            <View style={styles.linkRow}>
              <TouchableOpacity onPress={handleBackToLogin}>
                <Text style={styles.linkText}>← Back to Sign In</Text>
              </TouchableOpacity>
            </View>

            {/* Verify Button */}
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={handleVerifyMfa}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.btnRow}>
                  <Text style={styles.btnPrimaryText}>
                    {isMfaSetup ? 'Verify & Activate 2FA' : 'Verify & Sign In'}
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
    flexGrow: 1,
    padding: 16,
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainerWide: {
    paddingVertical: 60,
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
  cardWide: {
    maxWidth: 520,
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

  registerNoticeBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 10,
    marginBottom: 20,
  },

  registerNoticeText: {
    fontSize: 11,
    color: '#166534',
    lineHeight: 15,
  },

  mfaSetupContainer: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },

  qrContainer: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  qrCodeImage: {
    width: 180,
    height: 180,
  },

  secretBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    alignItems: 'center',
  },

  secretLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 4,
  },

  secretText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 1.5,
  },

  secretHelp: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 6,
    textAlign: 'center',
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

  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },

  toggleText: {
    fontSize: 13,
    color: '#64748B',
  },

  toggleLink: {
    fontSize: 13,
    color: '#1E40AF',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});