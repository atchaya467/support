import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, QrCode, ShieldCheck } from 'lucide-react';
import { API_BASE_URL, fetchWithTimeout } from '../config';

export default function UserLogin({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // 2FA states
  const [showMfaStep, setShowMfaStep] = useState(false);
  const [isMfaSetup, setIsMfaSetup] = useState(false);
  const [mfaQrCodeUrl, setMfaQrCodeUrl] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaToken, setMfaToken] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
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

  const handleRegister = async (e) => {
    e.preventDefault();
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
        body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword }),
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

  const handleVerifyMfa = async (e) => {
    e.preventDefault();
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
    <div className="login-container">
      <div className="login-card animate-fade-in">
        <div className="login-header">
          <div className="login-icon-box">
            {showMfaStep ? <ShieldCheck size={28} /> : <Lock size={28} />}
          </div>
          <h2>
            {showMfaStep
              ? isMfaSetup
                ? 'Setup Authenticator'
                : '2FA Verification'
              : isRegistering
              ? 'Create Account'
              : 'Sign In'}
          </h2>
          <p>
            {showMfaStep
              ? isMfaSetup
                ? 'Scan the QR code with Google Authenticator or enter the manual key below, then input the 6-digit code.'
                : 'Enter the 6-digit verification code from Google Authenticator to secure your session.'
              : isRegistering
              ? 'Register a new support ticket portal account. Google Authenticator 2FA setup will start immediately.'
              : 'Access the Support Ticket Portal to open requests and track active progress.'}
          </p>
        </div>

        {error && (
          <div className="alert alert-error animate-slide-in">
            <span>{error}</span>
          </div>
        )}

        {!showMfaStep ? (
          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="login-form">
            <div className="form-group">
              <label>Email Address</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  placeholder="customer@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {!isRegistering ? (
              <div className="demo-notice">
                <strong>Demo Accounts:</strong> admin@forte.com / admin123, user@forte.com / user123, demo@forte.com / demo123
              </div>
            ) : (
              <div className="demo-notice success-notice">
                <strong>Security Note:</strong> Google Authenticator 2FA will be initialized right after registration.
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                'Processing...'
              ) : (
                <span className="btn-flex">
                  {isRegistering ? 'Register & Setup 2FA' : 'Sign In to Portal'}
                  <ArrowRight size={16} />
                </span>
              )}
            </button>

            <div className="toggle-auth">
              <span>{isRegistering ? 'Already have an account? ' : "Don't have an account? "}</span>
              <button
                type="button"
                className="auth-link-btn"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError('');
                }}
              >
                {isRegistering ? 'Sign In' : 'Sign Up'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyMfa} className="login-form">
            {isMfaSetup && (
              <div className="mfa-setup-box">
                {mfaQrCodeUrl && (
                  <div className="qr-container">
                    <img src={mfaQrCodeUrl} alt="2FA QR Code" />
                  </div>
                )}
                <div className="secret-display">
                  <span className="secret-label">Manual Secret Key</span>
                  <code className="secret-code">{mfaSecret}</code>
                  <span className="secret-help">If you cannot scan, manually add this key to your authenticator app.</span>
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Authenticator Code (6-digit)</label>
              <div className="input-wrapper">
                <QrCode size={18} className="input-icon" />
                <input
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={mfaToken}
                  onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, ''))}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="back-to-login">
              <button type="button" className="link-button" onClick={handleBackToLogin}>
                ← Back to Sign In
              </button>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
