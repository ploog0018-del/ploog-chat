import React, { useState, useEffect } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from '../firebase';

export default function Login({ onLoginSuccess }) {
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    // Cleanup recaptcha if unmounted
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
      }
    };
  }, []);

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': (response) => {
          // reCAPTCHA solved
        }
      });
    }
  };

  const requestOTP = async (e) => {
    e.preventDefault();
    
    const fullPhone = countryCode + phone;

    // --- INSTANT LOGIN BYPASS FOR DEVELOPER ---
    if (phone === '7894561230' || phone === '9999999999') {
      setLoading(true);
      try {
        const res = await fetch(`https://ploog-chat.onrender.com/firebase-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: fullPhone })
        });
        const data = await res.json();
        if (res.ok && data.token) {
          onLoginSuccess(data.token);
        } else {
          setError(data.error || 'Server error generating bypass token');
        }
      } catch (err) {
        setError('Server is offline.');
      }
      setLoading(false);
      return;
    }
    // Security lock removed: Allow any number to proceed to Firebase Auth

    if (fullPhone.length < 13) return setError('Invalid phone length');
    
    setLoading(true);
    setError('');
    
    try {
      setupRecaptcha();
      const confirmationResult = await signInWithPhoneNumber(auth, fullPhone, window.recaptchaVerifier);
      window.confirmationResult = confirmationResult;
      setStep(2);
    } catch (e) {
      console.error(e);
      setError('Failed to send SMS. Wait a moment and try again.');
    }
    setLoading(false);
  };

  const verifyOTP = async (e) => {
    e.preventDefault();
    if (otp.length < 6) return setError('OTP must be 6 digits');
    setLoading(true);
    setError('');
    try {
      // Verify with Firebase
      const result = await window.confirmationResult.confirm(otp);
      const user = result.user;
      // Get App JWT from Backend
      const res = await fetch(`https://ploog-chat.onrender.com/firebase-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: user.phoneNumber })
      });
      const data = await res.json();
      
      if (res.ok && data.token) {
        onLoginSuccess(data.token);
      } else {
        setError(data.error || 'Server error generating token');
      }
    } catch (e) {
      console.error(e);
      setError('Invalid OTP code');
    }
    setLoading(false);
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      width: '100vw',
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '360px',
        padding: '30px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        
        {/* Light Mode Wordmark Logo (Pill shape) - SCALED UP */}
        <div style={{
          background: '#EDE8F8',
          borderRadius: '28px',
          padding: '24px 36px',
          display: 'flex',
          alignItems: 'center',
          gap: '18px',
          marginBottom: '30px'
        }}>
          {/* sz-72 icon */}
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '16px',
            background: 'linear-gradient(145deg, #C471F5 0%, #7B2FBE 50%, #3D0066 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(106,31,168,0.4)',
            position: 'relative',
            overflow: 'hidden',
            flexShrink: 0
          }}>
            {/* Glass shine top half */}
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, height: '46%',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.22), transparent)',
              pointerEvents: 'none',
              zIndex: 1
            }}></div>
            
            <svg width="42" height="42" viewBox="0 0 160 160" fill="none" style={{ position: 'relative', zIndex: 2 }}>
              <rect x="44" y="20" width="72" height="80" rx="14" fill="white" fillOpacity="0.15" stroke="white" strokeOpacity="0.3" strokeWidth="1.5"/>
              <rect x="56" y="98" width="16" height="26" rx="6" fill="white" fillOpacity="0.9"/>
              <rect x="88" y="98" width="16" height="26" rx="6" fill="white" fillOpacity="0.9"/>
              <text x="54" y="82" fontFamily="'Space Grotesk', sans-serif" fontWeight="900" fontSize="62" fill="white">P</text>
              <path d="M122 18 L112 38 L120 38 L108 58 L130 32 L121 32 Z" fill="white" fillOpacity="0.85"/>
            </svg>
          </div>
          
          <div style={{
            fontSize: '54px',
            fontWeight: '900',
            letterSpacing: '-3px',
            color: '#1A0033',
            lineHeight: 1,
            fontFamily: "'Space Grotesk', sans-serif"
          }}>
            ploog<span style={{ color: '#7B2FBE' }}>.</span>
          </div>
        </div>

        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '15px', textAlign: 'center' }}>
          {step === 1 ? 'Sign in to Ploog' : countryCode + ' ' + phone}
        </h2>
        
        {/* Removed description text as requested */}

        <form style={{ width: '100%' }} onSubmit={step === 1 ? requestOTP : verifyOTP}>
          {step === 1 ? (
            <>
              {error && <div style={{ color: 'var(--danger)', marginBottom: '15px', fontSize: '14px', textAlign: 'center' }}>{error}</div>}

              {/* Phone Input */}
              <div style={{ position: 'relative', marginBottom: '40px' }}>
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  style={{
                    position: 'absolute',
                    left: '0',
                    top: '10px',
                    fontSize: '16px',
                    color: 'var(--text-primary)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    outline: 'none',
                    appearance: 'none',
                    cursor: 'pointer',
                    zIndex: 10
                  }}
                >
                  <option value="+91">+91 (IN)</option>
                  <option value="+1">+1 (US)</option>
                  <option value="+44">+44 (UK)</option>
                  <option value="+971">+971 (AE)</option>
                  <option value="+65">+65 (SG)</option>
                  <option value="+60">+60 (MY)</option>
                  <option value="+94">+94 (LK)</option>
                  <option value="+61">+61 (AU)</option>
                </select>
                
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 15))}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  style={{
                    width: '100%',
                    padding: '12px 0 12px 80px',
                    fontSize: '16px',
                    color: 'var(--text-primary)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: `2px solid ${isFocused ? 'var(--accent-color)' : 'var(--border-color)'}`,
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                />
                
                <label style={{
                  position: 'absolute',
                  left: '35px',
                  top: (isFocused || phone) ? '-12px' : '12px',
                  fontSize: (isFocused || phone) ? '12px' : '16px',
                  color: isFocused ? 'var(--accent-color)' : 'var(--text-secondary)',
                  pointerEvents: 'none',
                  transition: 'all 0.2s ease'
                }}>
                  Phone Number
                </label>
              </div>

              <button type="submit" disabled={loading} style={{
                width: '100%',
                padding: '16px',
                backgroundColor: 'var(--accent-color)',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600',
                border: 'none',
                borderRadius: '10px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 4px 10px rgba(59, 130, 246, 0.3)'
              }}>
                {loading ? 'PLEASE WAIT...' : 'NEXT'}
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize: '15px', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '40px', lineHeight: '1.5' }}>
                Please enter 6 digit OTP
              </p>
              {error && <div style={{ color: 'var(--danger)', marginBottom: '15px', fontSize: '14px', textAlign: 'center' }}>{error}</div>}

              {/* OTP Input */}
              <div style={{ position: 'relative', marginBottom: '40px' }}>
                <input
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  style={{
                    width: '100%',
                    padding: '12px 0',
                    fontSize: '16px',
                    color: 'var(--text-primary)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: `2px solid ${isFocused ? 'var(--accent-color)' : 'var(--border-color)'}`,
                    outline: 'none',
                    textAlign: 'center',
                    letterSpacing: '10px'
                  }}
                />
                <label style={{
                  position: 'absolute',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  top: (isFocused || otp) ? '-12px' : '12px',
                  fontSize: (isFocused || otp) ? '12px' : '16px',
                  color: isFocused ? 'var(--accent-color)' : 'var(--text-secondary)',
                  pointerEvents: 'none',
                  transition: 'all 0.2s ease'
                }}>
                  Code
                </label>
              </div>

              <button type="submit" disabled={loading} style={{
                width: '100%',
                padding: '16px',
                backgroundColor: 'var(--accent-color)',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600',
                border: 'none',
                borderRadius: '10px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 4px 10px rgba(59, 130, 246, 0.3)'
              }}>
                {loading ? 'VERIFYING...' : 'NEXT'}
              </button>
            </>
          )}
        </form>

        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
}
