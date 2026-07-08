import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import GuestOnly from '../components/GuestOnly.jsx';
import BrandLogo from '../components/BrandLogo.jsx';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [devNote, setDevNote] = useState('');

  const sendOtp = async (e) => {
    e?.preventDefault?.();
    setDevOtp('');
    setDevNote('');
    if (!email.trim()) {
      toast.error('Enter your account email.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: email.trim() });
      if (data.devOtp) {
        setDevOtp(String(data.devOtp));
        setOtp(String(data.devOtp));
        setDevNote(data.devNote || 'Email is not configured on the server. Use the code below.');
        toast.success(`Dev code: ${data.devOtp}`);
      } else {
        toast.success(data.message || 'If an account exists, a code was sent.');
      }
      setStep('reset');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    if (!otp.trim() || !newPassword || !confirmPassword) {
      toast.error('Enter the code and your new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/reset-password', {
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      });
      toast.success(data.message || 'Password updated. You can sign in now.');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GuestOnly>
      <div className="app-page flex min-h-[calc(100dvh-5rem)] w-full flex-col items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md animate-fade-in">
          <div className="flex justify-center mb-5">
            <BrandLogo size="lg" showTagline />
          </div>
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Forgot password</h1>
            <p className="mt-2 text-sm sm:text-base text-muted">
              {step === 'email'
                ? 'Enter your email and we will send a one-time verification code.'
                : 'Enter the code from your email and choose a new password.'}
            </p>
          </div>

          {step === 'email' ? (
            <form onSubmit={sendOtp} className="glass-panel p-5 sm:p-6 space-y-4 w-full">
              <div>
                <label className="block text-sm font-medium text-foreground/90 mb-1">Email</label>
                <input
                  type="email"
                  required
                  className="input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Sending…' : 'Send verification code'}
              </button>
              <p className="text-sm text-muted text-center">
                <Link to="/login" className="text-brand-400 font-medium hover:text-brand-300 hover:underline">
                  Back to sign in
                </Link>
              </p>
            </form>
          ) : (
            <form onSubmit={resetPassword} className="glass-panel p-5 sm:p-6 space-y-4 w-full">
              {devOtp ? (
                <div className="rounded-xl border border-brand-500/40 bg-brand-500/10 p-4 text-center space-y-1">
                  <p className="text-sm font-semibold text-foreground">Your verification code</p>
                  <p className="text-3xl font-bold tracking-[0.2em] text-brand-400">{devOtp}</p>
                  {devNote ? <p className="text-xs text-muted">{devNote}</p> : null}
                </div>
              ) : null}
              <div>
                <label className="block text-sm font-medium text-foreground/90 mb-1">Email</label>
                <input type="email" className="input" value={email} readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/90 mb-1">Verification code</label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/90 mb-1">New password</label>
                <input
                  type="password"
                  required
                  className="input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/90 mb-1">Confirm new password</label>
                <input
                  type="password"
                  required
                  className="input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Updating…' : 'Reset password'}
              </button>
              <button
                type="button"
                className="w-full text-sm text-brand-400 font-medium hover:text-brand-300"
                disabled={loading}
                onClick={sendOtp}
              >
                Resend code
              </button>
              <p className="text-sm text-muted text-center">
                <Link to="/login" className="text-brand-400 font-medium hover:text-brand-300 hover:underline">
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </GuestOnly>
  );
}
