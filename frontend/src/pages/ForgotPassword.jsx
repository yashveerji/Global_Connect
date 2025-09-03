import React, { useContext, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { authDataContext } from '../context/AuthContext';

export default function ForgotPassword() {
  const { serverUrl } = useContext(authDataContext);
  const navigate = useNavigate();
  const [step, setStep] = useState('request'); // request | verify
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [otp, setOtp] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const sendOtp = async () => {
    setLoading(true); setErr(''); setMsg('');
    try {
      const res = await axios.post(serverUrl + '/api/auth/forgot-password', { email });
      if (res.data?.userId) setUserId(res.data.userId);
      setMsg('If the email exists, an OTP has been sent.');
      setStep('verify');
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to send OTP');
    }
    setLoading(false);
  };

  const resetPwd = async () => {
    setLoading(true); setErr(''); setMsg('');
    try {
      await axios.post(serverUrl + '/api/auth/reset-password', { userId, otp, newPassword: newPwd });
      setMsg('Password reset successful. You can now log in.');
      setTimeout(() => navigate('/login'), 800);
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to reset password');
    }
    setLoading(false);
  };

  return (
  <div className="w-full min-h-screen bg-gradient-to-br from-[#1A1F71] to-[#23243a] dark:from-[#121212] dark:to-[#121212] flex items-center justify-center px-4 py-10 animate-fade-in">
      <div className="w-full max-w-md card p-8 animate-scale-in">
        <h1 className="text-3xl font-extrabold text-[#1A1F71] dark:text-yellow-300 text-center">Forgot password</h1>
        <p className="text-sm text-gray-700 dark:text-yellow-200/90 mt-1 mb-6 text-center">Reset your password using the code sent to your email.</p>

        {msg && <div className="mb-3 text-green-600 dark:text-green-400 text-sm text-center">{msg}</div>}
        {err && <div className="mb-3 text-red-600 dark:text-red-400 text-sm text-center">{err}</div>}

        {step === 'request' && (
          <div>
            <label htmlFor="fp-email" className="sr-only">Email</label>
            <input
              id="fp-email"
              name="email"
              autoComplete="email"
              type="email"
              className="input h-11"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              className="btn-primary w-full h-11 mt-4"
              onClick={sendOtp}
              disabled={loading || !email}
            >
              {loading ? 'Sending…' : 'Send OTP'}
            </button>
            <button
              type="button"
              className="btn-secondary w-full h-11 mt-2"
              onClick={() => navigate('/login')}
            >
              Back to login
            </button>
          </div>
        )}

        {step === 'verify' && (
          <div>
            <label htmlFor="fp-otp" className="sr-only">OTP</label>
            <input
              id="fp-otp"
              name="otp"
              type="text"
              inputMode="numeric"
              className="input h-11 text-center tracking-widest"
              placeholder="6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              maxLength={6}
            />
            <label htmlFor="fp-password" className="sr-only">New password</label>
            <input
              id="fp-password"
              name="newPassword"
              autoComplete="new-password"
              type="password"
              className="input h-11 mt-3"
              placeholder="New password (min 8 chars)"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
            />
            <button
              className="btn-primary w-full h-11 mt-4"
              onClick={resetPwd}
              disabled={loading || !otp || !newPwd}
            >
              {loading ? 'Resetting…' : 'Reset password'}
            </button>
            <button
              type="button"
              className="btn-secondary w-full h-11 mt-2"
              onClick={() => setStep('request')}
            >
              Start over
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
