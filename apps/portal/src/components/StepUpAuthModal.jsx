import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  Mail, 
  RotateCw, 
  AlertCircle, 
  X, 
  CheckCircle2, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { 
  requestSensitiveActionStepUp, 
  verifySensitiveActionStepUp,
  verifySensitiveActionWithPassword 
} from '@nacos/supabase';

/**
 * StepUpAuthModal
 * Reusable step-up identity verification modal for sensitive operations.
 * 
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onSuccess: (actionToken: string) => void,
 *   purpose: 'PAYMENT_CONFIRMATION' | 'ID_CARD_GENERATION' | 'PASSWORD_CHANGE',
 *   title?: string,
 *   description?: string,
 *   user: object
 * }} props
 */
const StepUpAuthModal = ({
  isOpen,
  onClose,
  onSuccess,
  purpose = 'PAYMENT_CONFIRMATION',
  title = 'Security Verification Required',
  description = 'Confirm your identity before completing this transaction.',
  user
}) => {
  // Methods: 'password' | 'otp'
  const [method, setMethod] = useState('password');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [maskedContact, setMaskedContact] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const matric = user?.registration_number || user?.matric || user?.matricNumber || '';

  // Cooldown countdown
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Reset state when opening & listen for Escape key
  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setOtpCode('');
      setError('');
      setIsSuccess(false);
      setOtpSent(false);
      setMethod('password');
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  // Handle password verification
  const handleVerifyPassword = async (e) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter your portal password.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const res = await verifySensitiveActionWithPassword({
        registrationNumber: matric,
        password,
        purpose
      });

      if (res.success && res.actionToken) {
        setIsSuccess(true);
        setTimeout(() => {
          onSuccess(res.actionToken);
          onClose();
        }, 800);
      } else {
        setError(res.error || 'Incorrect password. Please verify and try again.');
      }
    } catch (err) {
      setError('Verification service unavailable.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle sending OTP
  const handleRequestOtp = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await requestSensitiveActionStepUp({
        registrationNumber: matric,
        purpose,
        channel: 'email'
      });

      if (res.success) {
        setOtpSent(true);
        setMaskedContact(res.maskedDestination || 'your registered contact');
        setCooldown(res.cooldownSeconds || 60);
      } else {
        setError(res.error || 'Failed to dispatch verification code.');
      }
    } catch (err) {
      setError('Could not dispatch code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP submission
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const res = await verifySensitiveActionStepUp({
        registrationNumber: matric,
        purpose,
        otpCode: otpCode.trim()
      });

      if (res.success && res.authorizationToken) {
        setIsSuccess(true);
        setTimeout(() => {
          onSuccess(res.authorizationToken);
          onClose();
        }, 800);
      } else {
        setError(res.error || 'Invalid or expired code.');
      }
    } catch (err) {
      setError('Could not verify code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="stepup-modal-title"
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative animate-scale-up"
      >
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          aria-label="Close verification dialog"
          className="absolute right-4 top-4 p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-[#138601] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 id="stepup-modal-title" className="text-base font-bold text-gray-900 leading-tight">
              {title}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {description}
            </p>
          </div>
        </div>

        {/* Student Identification Pill */}
        <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-600 flex items-center justify-between mb-4">
          <span>Student Account:</span>
          <span className="font-mono font-bold text-gray-900">{matric}</span>
        </div>

        {/* Method Toggle */}
        <div className="flex rounded-lg bg-gray-100 p-1 mb-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setMethod('password'); setError(''); }}
            className={`flex-1 py-1.5 rounded-md transition ${
              method === 'password'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Password Confirm
          </button>
          <button
            type="button"
            onClick={() => {
              setMethod('otp');
              setError('');
              if (!otpSent) handleRequestOtp();
            }}
            className={`flex-1 py-1.5 rounded-md transition ${
              method === 'otp'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Security OTP
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div 
            role="alert" 
            aria-live="polite" 
            className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-start gap-2 mb-4"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed flex-1">{error}</div>
          </div>
        )}

        {/* Success Alert */}
        {isSuccess && (
          <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-xs text-green-800 font-semibold flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-4 h-4 text-[#138601]" />
            <span>Verification confirmed! Authorizing transaction...</span>
          </div>
        )}

        {/* METHOD 1: PASSWORD CONFIRMATION */}
        {method === 'password' && !isSuccess && (
          <form onSubmit={handleVerifyPassword} className="space-y-4">
            <div>
              <label htmlFor="stepup-password" className="block text-xs font-semibold text-gray-700 mb-1.5">
                Portal Password
              </label>
              <div className="relative">
                <input
                  id="stepup-password"
                  name="stepup-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  aria-required="true"
                  placeholder="Enter your student password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:border-[#138601] focus:ring-1 focus:ring-[#138601] transition"
                />
                <Lock className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2.5 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !password}
                className="flex-1 py-2.5 px-4 rounded-lg bg-[#138601] text-white text-xs font-bold hover:bg-[#0f6a01] focus:outline-none transition disabled:opacity-60 flex items-center justify-center gap-2 shadow"
              >
                {isLoading ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Authorizing...</span>
                  </>
                ) : (
                  <>
                    <span>Authorize Transaction</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* METHOD 2: SECURITY OTP */}
        {method === 'otp' && !isSuccess && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            {otpSent ? (
              <div>
                <p className="text-xs text-gray-600 mb-2">
                  A 6-digit authorization code was sent to <strong>{maskedContact}</strong>.
                </p>
                <div className="relative">
                  <input
                    id="stepup-otp"
                    name="stepup-otp"
                    type="text"
                    required
                    maxLength={6}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    aria-required="true"
                    aria-label="6-digit authorization code"
                    placeholder="••••••"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-3 py-2.5 text-center text-lg font-mono font-bold tracking-widest rounded-lg border border-gray-300 focus:outline-none focus:border-[#138601] focus:ring-1 focus:ring-[#138601] transition"
                  />
                  <KeyRound className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span>Expires in 15 mins</span>
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={cooldown > 0 || isLoading}
                    className="text-[#138601] font-semibold hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <RotateCw className="w-6 h-6 animate-spin text-[#138601] mx-auto mb-2" />
                <p className="text-xs text-gray-600">Dispatching security code to verified contact...</p>
              </div>
            )}

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2.5 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || otpCode.length !== 6}
                className="flex-1 py-2.5 px-4 rounded-lg bg-[#138601] text-white text-xs font-bold hover:bg-[#0f6a01] focus:outline-none transition disabled:opacity-60 flex items-center justify-center gap-2 shadow"
              >
                {isLoading ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Proceed</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};

export default StepUpAuthModal;
