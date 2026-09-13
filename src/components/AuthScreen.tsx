import React, { useState } from 'react';
import { AppTheme } from '../App';
import { LandlordSettings } from '../types';
import {
  Building2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  User,
  Phone,
  AlertCircle,
  Loader2,
  UserPlus,
  LogIn,
  KeyRound,
  X,
  Zap,
  QrCode
} from 'lucide-react';
import { supabase, saveSettingsToSupabase } from '../lib/supabase';
import { isValidIndianPhone, cleanPhoneDigits } from '../utils/validation';

interface AuthScreenProps {
  theme: AppTheme;
  onToggleTheme: () => void;
  settings: LandlordSettings;
  initialAuthMode?: 'splash' | 'signin' | 'signup';
  onCompleteAuth: (
    authenticatedEmailOrPhone: string,
    updatedSettings?: Partial<LandlordSettings>,
    userUid?: string,
    isNewUser?: boolean,
    toastMessage?: string
  ) => void;
  onStartDemoMode: () => void;
}

type AuthMode = 'splash' | 'signin' | 'signup';

export const AuthScreen: React.FC<AuthScreenProps> = ({
  theme,
  settings,
  initialAuthMode,
  onCompleteAuth,
  onStartDemoMode,
}) => {
  const isDark = theme === 'dark';

  // Screen View State
  const [authMode, setAuthMode] = useState<AuthMode>(initialAuthMode || 'splash');

  React.useEffect(() => {
    if (initialAuthMode) {
      setAuthMode(initialAuthMode);
    }
  }, [initialAuthMode]);

  // Sign Up Form Fields (Unified Onboarding)
  const [signUpName, setSignUpName] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpPropertyName, setSignUpPropertyName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signUpUpiId, setSignUpUpiId] = useState('');
  const [signUpElectricityRate, setSignUpElectricityRate] = useState<number | string>(8.5);

  // Sign In Form Fields
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [isInvalidCredentials, setIsInvalidCredentials] = useState(false);

  // Forgot Password Modal State (2-Step In-App OTP Workflow)
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [localToast, setLocalToast] = useState<string | null>(null);

  // General Status & Loading
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Helper to validate standard email format
  const isValidEmail = (emailStr: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr.trim());
  };

  // Format Supabase error messages into human-friendly messages
  const parseSupabaseError = (error: any): string => {
    if (!error) return 'An error occurred. Please try again.';
    const msg = error.message || String(error);
    if (
      msg.includes('Invalid login credentials') ||
      msg.includes('invalid_credentials') ||
      msg.includes('user not found') ||
      msg.includes('User not found')
    ) {
      return 'No account found with this Gmail. Please Sign Up.';
    }
    if (
      msg.includes('User already registered') ||
      msg.includes('already registered') ||
      msg.includes('already exists') ||
      msg.includes('user_already_exists')
    ) {
      return 'Account already exists with this Gmail. Please sign in.';
    }
    if (msg.includes('Password should be at least')) {
      return 'Password must be at least 6 characters long.';
    }
    if (msg.includes('rate limit')) {
      return 'Too many attempts. Please wait a moment before trying again.';
    }
    if (msg.includes('Email not confirmed')) {
      return 'Your email has not been verified yet. We have sent a confirmation link to your inbox.';
    }
    return msg;
  };

  // Instant Demo Mode
  const handleDemoLogin = () => {
    onStartDemoMode();
  };

  // -------------------------------------------------------------
  // SIGN UP HANDLER
  // -------------------------------------------------------------
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = signUpEmail.trim().toLowerCase();
    const cleanPassword = signUpPassword;

    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      setErrorMsg('Please enter a valid email address (e.g. name@gmail.com)');
      return;
    }
    if (!cleanPassword || cleanPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (cleanPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setIsInvalidCredentials(false);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (error) throw error;

      let userUid = data.user?.id;

      if (!data.session) {
        try {
          const signInRes = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: cleanPassword,
          });
          if (signInRes.data?.user) {
            userUid = signInRes.data.user.id;
          }
        } catch {}
      }

      const uid = userUid || `user-${Date.now()}`;
      setConfirmPassword('');
      setSignUpPassword('');
      // On sign-up success, transition directly to landlord onboarding setup
      onCompleteAuth(cleanEmail, {}, uid, true, 'Account created! Complete your landlord onboarding setup.');
    } catch (err: any) {
      console.error('Sign up error:', err);
      const rawMsg = (err?.message || String(err || '')).toLowerCase();

      if (
        rawMsg.includes('user already registered') ||
        rawMsg.includes('already registered') ||
        rawMsg.includes('already exists') ||
        rawMsg.includes('user_already_exists')
      ) {
        // Automatically switch to 'signIn' with email prefilled and show required message
        setSignInEmail(cleanEmail);
        setAuthMode('signin');
        setIsInvalidCredentials(false);
        setErrorMsg('Account already exists with this Gmail. Please sign in.');
      } else {
        setErrorMsg(parseSupabaseError(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------
  // SIGN IN HANDLER
  // -------------------------------------------------------------
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = signInEmail.trim().toLowerCase();
    const cleanPassword = signInPassword;

    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      setErrorMsg('Please enter a valid email address');
      return;
    }
    if (!cleanPassword) {
      setErrorMsg('Please enter your password');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setIsInvalidCredentials(false);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (error) throw error;

      const user = data.user;
      const userUid = user?.id || `user-${Date.now()}`;

      const updatedSettings: Partial<LandlordSettings> = {
        landlordName: user?.user_metadata?.full_name || settings.landlordName,
        landlordPhone: user?.user_metadata?.phone || settings.landlordPhone,
        propertyName: user?.user_metadata?.property_name || settings.propertyName,
        upiId: user?.user_metadata?.upi_id || settings.upiId,
      };

      onCompleteAuth(cleanEmail, updatedSettings, userUid, false);
    } catch (err: any) {
      console.error('Sign in error:', err);
      const rawMsg = (err?.message || String(err || '')).toLowerCase();

      if (
        rawMsg.includes('invalid login credentials') ||
        rawMsg.includes('invalid_credentials') ||
        rawMsg.includes('user not found') ||
        rawMsg.includes('user_not_found')
      ) {
        // Automatically switch to 'signUp' with email prefilled and show required message
        setSignUpEmail(cleanEmail);
        setAuthMode('signup');
        setIsInvalidCredentials(true);
        setErrorMsg('No account found with this Gmail. Please Sign Up.');
      } else if (rawMsg.includes('email not confirmed')) {
        setIsInvalidCredentials(false);
        setErrorMsg('Your email has not been verified yet. Please check your inbox.');
      } else {
        setIsInvalidCredentials(false);
        setErrorMsg(parseSupabaseError(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // FORGOT PASSWORD WORKFLOW
  // -------------------------------------------------------------------------
  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = forgotEmail.trim().toLowerCase();

    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      setForgotError('Please enter a valid email address');
      return;
    }

    setForgotError('');
    setForgotSuccess('');
    setForgotLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
      if (error) throw error;

      setForgotStep(2);
      setForgotOtp('');
      setForgotNewPassword('');
      setForgotSuccess(`A 6-digit code has been sent to ${cleanEmail}`);
    } catch (err: any) {
      console.error('Password reset request error:', err);
      setForgotError(parseSupabaseError(err));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResendCode = async () => {
    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!cleanEmail) return;

    setForgotError('');
    setForgotSuccess('');
    setForgotLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
      if (error) throw error;
      setForgotSuccess(`A fresh 6-digit code has been sent to ${cleanEmail}`);
    } catch (err: any) {
      console.error('Resend OTP error:', err);
      setForgotError(parseSupabaseError(err));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyAndSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = forgotEmail.trim().toLowerCase();
    const otpCode = forgotOtp.trim();
    const newPassword = forgotNewPassword;

    if (!otpCode) {
      setForgotError('Please enter the 6-digit code from your email');
      return;
    }
    if (otpCode.length < 6) {
      setForgotError('Please enter the complete 6-digit code');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setForgotError('Password must be at least 6 characters long');
      return;
    }

    setForgotError('');
    setForgotSuccess('');
    setForgotLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: otpCode,
        type: 'recovery',
      });

      if (error) throw error;

      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      setLocalToast('Password updated successfully!');
      setIsForgotModalOpen(false);

      const user = data.user || updateData?.user;
      const userUid = user?.id || `user-${Date.now()}`;
      const updatedSettings: Partial<LandlordSettings> = {
        landlordName: user?.user_metadata?.full_name || settings.landlordName,
        landlordPhone: user?.user_metadata?.phone || settings.landlordPhone,
      };

      onCompleteAuth(cleanEmail, updatedSettings, userUid, false, 'Password updated successfully!');
    } catch (err: any) {
      console.error('Verify OTP and set password error:', err);
      const msg = err?.message || String(err);
      if (msg.includes('Token has expired') || msg.includes('invalid') || msg.includes('expired')) {
        setForgotError('Invalid or expired 6-digit code. Please check your email or click Resend Code.');
      } else {
        setForgotError(parseSupabaseError(err));
      }
    } finally {
      setForgotLoading(false);
    }
  };

  const openForgotPasswordModal = () => {
    setForgotEmail(signInEmail.trim() || signUpEmail.trim());
    setForgotOtp('');
    setForgotNewPassword('');
    setShowForgotNewPassword(false);
    setForgotStep(1);
    setForgotError('');
    setForgotSuccess('');
    setIsForgotModalOpen(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-neutral-950 text-neutral-100 selection:bg-emerald-500/30">
      <main className="w-full flex items-center justify-center">

        {/* VIEW 1: SPLASH SCREEN */}
        {authMode === 'splash' && (
          <div className="flex flex-col items-center justify-center text-center space-y-6 max-w-sm w-full py-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-xl shadow-emerald-500/25">
              <Building2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-white">
                  RentBook
                </h1>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  PRO
                </span>
              </div>
              <p className="text-sm text-neutral-400 font-normal">
                Smart Rental & Electricity Diary
              </p>
            </div>

            <div className="w-full max-w-xs space-y-3 pt-2">
              <button
                type="button"
                id="btn-splash-get-started"
                onClick={() => {
                  setErrorMsg('');
                  setAuthMode('signin');
                }}
                className="w-full py-3 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-emerald-500/20 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>

              <div>
                <button
                  type="button"
                  id="btn-splash-demo-mode"
                  onClick={handleDemoLogin}
                  className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer py-1"
                >
                  Explore Demo Mode
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2 & 3: SIGN IN / SIGN UP AUTH CARD */}
        {(authMode === 'signin' || authMode === 'signup') && (
          <div className="w-full max-w-md rounded-2xl border border-neutral-800/80 bg-neutral-900/60 p-5 sm:p-7 shadow-2xl backdrop-blur-xl transition-all space-y-4 max-h-[94vh] overflow-y-auto my-auto">

            <div className="flex items-center justify-between pb-1">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setIsInvalidCredentials(false);
                  setSuccessMsg('');
                  setAuthMode('splash');
                }}
                className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Home</span>
              </button>

              <div className="flex items-center bg-neutral-950/80 p-1 rounded-xl border border-neutral-800">
                <button
                  type="button"
                  id="tab-signin"
                  onClick={() => {
                    setErrorMsg('');
                    setIsInvalidCredentials(false);
                    setSuccessMsg('');
                    setConfirmPassword('');
                    setAuthMode('signin');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    authMode === 'signin'
                      ? 'bg-neutral-800 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  id="tab-signup"
                  onClick={() => {
                    setErrorMsg('');
                    setIsInvalidCredentials(false);
                    setSuccessMsg('');
                    setConfirmPassword('');
                    setAuthMode('signup');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    authMode === 'signup'
                      ? 'bg-neutral-800 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                {authMode === 'signup' ? (
                  <>
                    <UserPlus className="w-5 h-5 text-emerald-400" />
                    <span>Create Landlord Account</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5 text-teal-400" />
                    <span>Sign In to RentBook</span>
                  </>
                )}
              </h2>
              <p className="text-xs text-neutral-400">
                {authMode === 'signup'
                  ? 'Complete your setup in one quick step for instant access'
                  : 'Enter your credentials to access your properties & billing history'}
              </p>
            </div>

            {errorMsg && (
              <div
                id="auth-status-badge"
                className={`p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2.5 animate-in fade-in duration-200 border shadow-xs ${
                  isInvalidCredentials
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : errorMsg.includes('Account already exists')
                    ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                    : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">
                  <p>{errorMsg}</p>
                </div>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-start gap-2 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{successMsg}</span>
              </div>
            )}

            {authMode === 'signup' && (
              <form onSubmit={handleSignUpSubmit} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-neutral-300">
                    Gmail / Email Address <span className="text-emerald-400">*</span>
                  </label>
                  <div className="flex items-center rounded-xl border px-3.5 py-2.5 bg-neutral-950/60 border-neutral-800 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/30 transition-all">
                    <Mail className="w-4 h-4 mr-2.5 shrink-0 text-neutral-500" />
                    <input
                      type="email"
                      id="signup-email"
                      required
                      autoFocus
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      placeholder="e.g. yourname@gmail.com"
                      className="w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-neutral-600"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-neutral-300">
                    Create Password (min 6 chars) <span className="text-emerald-400">*</span>
                  </label>
                  <div className="flex items-center rounded-xl border px-3.5 py-2.5 bg-neutral-950/60 border-neutral-800 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/30 transition-all">
                    <Lock className="w-4 h-4 mr-2.5 shrink-0 text-neutral-500" />
                    <input
                      type={showSignUpPassword ? 'text' : 'password'}
                      id="signup-password"
                      required
                      minLength={6}
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-neutral-600"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                      className="text-neutral-500 hover:text-neutral-300 transition-colors p-1 cursor-pointer"
                      title={showSignUpPassword ? 'Hide password' : 'Show password'}
                    >
                      {showSignUpPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-neutral-300">
                    Confirm Password <span className="text-emerald-400">*</span>
                  </label>
                  <div className={`flex items-center rounded-xl border px-3.5 py-2.5 bg-neutral-950/60 transition-all ${
                    confirmPassword && signUpPassword && confirmPassword !== signUpPassword
                      ? 'border-rose-500/70 focus-within:border-rose-500 focus-within:ring-1 focus-within:ring-rose-500/30'
                      : 'border-neutral-800 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/30'
                  }`}>
                    <Lock className={`w-4 h-4 mr-2.5 shrink-0 ${
                      confirmPassword && signUpPassword && confirmPassword !== signUpPassword
                        ? 'text-rose-400'
                        : 'text-neutral-500'
                    }`} />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="signup-confirm-password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-neutral-600"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-neutral-500 hover:text-neutral-300 transition-colors p-1 cursor-pointer"
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  id="btn-create-account"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-xl text-sm shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-3"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Sign Up & Create Building</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-1">
                  <p className="text-xs text-neutral-400">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg('');
                        setIsInvalidCredentials(false);
                        setConfirmPassword('');
                        setAuthMode('signin');
                      }}
                      className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors cursor-pointer"
                    >
                      Sign In here
                    </button>
                  </p>
                </div>
              </form>
            )}

            {authMode === 'signin' && (
              <form onSubmit={handleSignInSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-neutral-300">
                    Email Address
                  </label>
                  <div className="flex items-center rounded-xl border px-3.5 py-2.5 bg-neutral-950/60 border-neutral-800 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/30 transition-all">
                    <Mail className="w-4 h-4 mr-2.5 shrink-0 text-neutral-500" />
                    <input
                      type="email"
                      id="signin-email"
                      required
                      autoFocus
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      placeholder="landlord@example.com"
                      className="w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-neutral-600"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-neutral-300">
                      Password
                    </label>
                    <button
                      type="button"
                      id="btn-forgot-password"
                      onClick={openForgotPasswordModal}
                      className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="flex items-center rounded-xl border px-3.5 py-2.5 bg-neutral-950/60 border-neutral-800 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/30 transition-all">
                    <Lock className="w-4 h-4 mr-2.5 shrink-0 text-neutral-500" />
                    <input
                      type={showSignInPassword ? 'text' : 'password'}
                      id="signin-password"
                      required
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-neutral-600"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowSignInPassword(!showSignInPassword)}
                      className="text-neutral-500 hover:text-neutral-300 transition-colors p-1 cursor-pointer"
                      title={showSignInPassword ? 'Hide password' : 'Show password'}
                    >
                      {showSignInPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  id="btn-sign-in"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-xl text-sm shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <p className="text-xs text-neutral-400">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg('');
                        setIsInvalidCredentials(false);
                        setConfirmPassword('');
                        if (signInEmail) setSignUpEmail(signInEmail);
                        setAuthMode('signup');
                      }}
                      className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors cursor-pointer"
                    >
                      Create Account
                    </button>
                  </p>
                </div>
              </form>
            )}

            <div className="pt-3 border-t border-neutral-800/80 text-center">
              <button
                type="button"
                onClick={handleDemoLogin}
                className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
              >
                Or try Demo Mode without signing in
              </button>
            </div>

          </div>
        )}

      </main>

      {/* FORGOT PASSWORD MODAL */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-neutral-800/90 bg-neutral-900/95 p-6 shadow-2xl backdrop-blur-xl transition-all space-y-4">

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400">
                <KeyRound className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Reset Password</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-neutral-400 px-2 py-0.5 rounded-full bg-neutral-800 border border-neutral-700/60">
                  Step {forgotStep} of 2
                </span>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              {forgotStep === 1
                ? 'Enter your registered email address. We will send an in-app 6-digit verification code to reset your password.'
                : 'Enter the 6-digit code sent to your email and your new password to complete the reset.'}
            </p>

            {forgotStep === 2 && (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-neutral-950/70 border border-neutral-800 text-xs">
                <div className="flex items-center gap-2 text-neutral-300 truncate">
                  <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate font-medium">{forgotEmail}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setForgotStep(1);
                    setForgotError('');
                    setForgotSuccess('');
                  }}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium ml-2 shrink-0 cursor-pointer"
                >
                  Change
                </button>
              </div>
            )}

            {forgotError && (
              <div className="p-3 rounded-xl text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{forgotError}</span>
              </div>
            )}

            {forgotSuccess && (
              <div className="p-3 rounded-xl text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{forgotSuccess}</span>
              </div>
            )}

            {forgotStep === 1 && (
              <form onSubmit={handleRequestResetCode} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-neutral-300">
                    Registered Email
                  </label>
                  <div className="flex items-center rounded-xl border px-3.5 py-2.5 bg-neutral-950/60 border-neutral-800 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/30 transition-all">
                    <Mail className="w-4 h-4 mr-2.5 shrink-0 text-neutral-500" />
                    <input
                      type="email"
                      id="forgot-email"
                      required
                      autoFocus
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="landlord@example.com"
                      className="w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-neutral-600"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-neutral-800 text-neutral-300 hover:bg-neutral-800 text-xs font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="btn-send-reset-code"
                    disabled={forgotLoading}
                    className="flex-1 py-2.5 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium rounded-xl text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {forgotLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <span>Send Reset Code</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 2 && (
              <form onSubmit={handleVerifyAndSetPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-neutral-300">
                    6-Digit Code from Email
                  </label>
                  <div className="flex items-center rounded-xl border px-3.5 py-2.5 bg-neutral-950/60 border-neutral-800 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/30 transition-all">
                    <KeyRound className="w-4 h-4 mr-2.5 shrink-0 text-neutral-500" />
                    <input
                      type="text"
                      id="forgot-otp"
                      inputMode="numeric"
                      required
                      autoFocus
                      maxLength={8}
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value.trim())}
                      placeholder="e.g. 123456"
                      className="w-full bg-transparent text-sm font-mono tracking-wider font-semibold text-white outline-none placeholder:text-neutral-600 placeholder:font-sans placeholder:tracking-normal placeholder:font-normal"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-neutral-300">
                    New Password
                  </label>
                  <div className="flex items-center rounded-xl border px-3.5 py-2.5 bg-neutral-950/60 border-neutral-800 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/30 transition-all">
                    <Lock className="w-4 h-4 mr-2.5 shrink-0 text-neutral-500" />
                    <input
                      type={showForgotNewPassword ? 'text' : 'password'}
                      id="forgot-new-password"
                      required
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-neutral-600"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                      className="text-neutral-500 hover:text-neutral-300 transition-colors p-1 cursor-pointer"
                      title={showForgotNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showForgotNewPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-0.5">
                  <span className="text-neutral-400">Didn't receive the code?</span>
                  <button
                    type="button"
                    disabled={forgotLoading}
                    onClick={handleResendCode}
                    className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Resend Code
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep(1);
                      setForgotError('');
                      setForgotSuccess('');
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-neutral-800 text-neutral-300 hover:bg-neutral-800 text-xs font-medium transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    id="btn-verify-set-password"
                    disabled={forgotLoading}
                    className="flex-1 py-2.5 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium rounded-xl text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {forgotLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <span>Set New Password</span>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {localToast && (
        <div
          id="auth-toast-notification"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-600 text-white font-medium text-xs shadow-xl shadow-emerald-950/40 border border-emerald-400/30 animate-in fade-in slide-in-from-top-3 duration-200"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-100 shrink-0" />
          <span>{localToast}</span>
        </div>
      )}
    </div>
  );
};