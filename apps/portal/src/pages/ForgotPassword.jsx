import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCloudinaryAssetUrl } from '@nacos/media';
import { requestStudentPasswordReset, confirmStudentPasswordReset } from '@nacos/supabase/auth';
import studentPhoto from '../assets/gallery_student_group.jpg';
import logoDark from '../assets/full-logo-dark.png';
import { CheckCircle2, ArrowLeft, KeyRound, Lock, Eye, EyeOff, RotateCw, AlertCircle, Mail } from 'lucide-react';

const ForgotPassword = () => {
  const navigate = useNavigate();

  // Step 1: Request, Step 2: Enter OTP & New Password, Step 3: Success
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [regNumber, setRegNumber] = useState('');

  // Step 2 Form
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const redirectTarget = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('redirect') || new URLSearchParams(window.location.search).get('returnUrl') || '' : '';
  const loginLink = redirectTarget ? `/login?redirect=${encodeURIComponent(redirectTarget)}` : '/login';

  // Cooldown ticker
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Handle Step 1: Send Reset OTP
  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('Please enter your Registration Number or Registered Email.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await requestStudentPasswordReset(identifier.trim());
      if (result.success) {
        setRegNumber(result.regNumber);
        setMaskedEmail(result.maskedEmail);
        setResendCooldown(60);
        setStep(2);
      } else {
        setError(result.error?.message || 'Failed to send reset code. Please verify your details.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Resend OTP in Step 2
  const handleResend = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setError('');
    setIsLoading(true);

    try {
      const result = await requestStudentPasswordReset(regNumber || identifier.trim());
      if (result.success) {
        setResendCooldown(60);
        setSuccessMessage('A new reset code has been sent to your email.');
        setTimeout(() => setSuccessMessage(''), 4000);
      } else {
        setError(result.error?.message || 'Failed to resend code.');
      }
    } catch (err) {
      setError('Failed to resend code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Step 2: Set New Password with OTP
  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setError('');

    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    if (!newPassword) {
      setError('Please enter a new password.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await confirmStudentPasswordReset(regNumber, otpCode.trim(), newPassword);
      if (result.success) {
        setStep(3);
      } else {
        setError(result.error?.message || 'Failed to reset password. Please check your code.');
      }
    } catch (err) {
      setError('An unexpected error occurred while resetting your password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white text-gray-900 font-sans selection:bg-black selection:text-white">
      
      {/* LEFT HALF (50%): Real Department Photo with Logo, Clean Overlay & Bold Text */}
      <div 
        className="md:w-1/2 min-h-[360px] md:min-h-screen relative flex flex-col justify-between p-8 sm:p-12 md:p-14 lg:p-16 bg-cover bg-center"
        style={{ backgroundImage: `url(${getCloudinaryAssetUrl('gallery_student_group') || studentPhoto})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/25 pointer-events-none"></div>

        <div className="relative z-10">
          <img 
            src={getCloudinaryAssetUrl('full-logo-dark') || logoDark} 
            alt="NACOS FUTO Logo" 
            className="h-9 sm:h-11 w-auto object-contain drop-shadow" 
          />
        </div>

        <div className="relative z-10 max-w-lg space-y-2 mt-auto pt-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-snug tracking-tight">
            Your NACOS account unlocks a world of computing excellence
          </h2>
          <p className="text-xs sm:text-sm text-gray-200 font-normal">
            Department of Computer Science • Federal University of Technology, Owerri
          </p>
        </div>
      </div>

      {/* RIGHT HALF (50%): Clean Form */}
      <div className="md:w-1/2 flex items-center justify-center p-6 sm:p-10 md:p-14 lg:p-20 bg-white">
        <div className="w-full max-w-md space-y-6">
          
          {/* STEP 1: Enter Identifier */}
          {step === 1 && (
            <>
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
                  Reset your password
                </h1>
                <p className="mt-1 text-xs text-gray-600">
                  Enter your Registration Number or Registered Email address to receive a secure password reset code.
                </p>
              </div>

              {error && (
                <div className="p-3.5 rounded bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <form onSubmit={handleRequestReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                    Registration No. or Student Email
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., 20241450682 or your.name@futo.edu.ng"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full px-4 py-3 text-sm rounded bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:outline-none focus:border-[#138601] focus:ring-1 focus:ring-[#138601] font-normal transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-7 py-2.5 min-h-[42px] text-sm font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] rounded shadow-sm transition-colors cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>Sending Code...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      <span>Send Reset Code</span>
                    </>
                  )}
                </button>

                <div className="pt-2">
                  <Link
                    to={loginLink}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-black transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                  </Link>
                </div>
              </form>
            </>
          )}

          {/* STEP 2: Enter OTP Code and Set New Password */}
          {step === 2 && (
            <>
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#138601] bg-green-50 px-2.5 py-1 rounded mb-3 border border-green-200">
                  <Mail className="w-3.5 h-3.5" /> Code Sent
                </div>
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
                  Enter code &amp; create password
                </h1>
                <p className="mt-1 text-xs text-gray-600">
                  We sent a 6-digit verification code to <strong className="text-gray-800">{maskedEmail}</strong>.
                </p>
              </div>

              {error && (
                <div className="p-3.5 rounded bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {successMessage && (
                <div className="p-3.5 rounded bg-green-50 border border-green-200 text-xs text-green-800 font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  <p>{successMessage}</p>
                </div>
              )}

              <form onSubmit={handleConfirmReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                    6-Digit Verification Code
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      required
                      placeholder="• • • • • •"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full pl-10 pr-4 py-3 text-center tracking-[0.4em] font-mono text-lg font-bold rounded bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:outline-none focus:border-[#138601] focus:ring-1 focus:ring-[#138601] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 text-sm rounded bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:outline-none focus:border-[#138601] focus:ring-1 focus:ring-[#138601] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 text-sm rounded bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:outline-none focus:border-[#138601] focus:ring-1 focus:ring-[#138601] transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || isLoading}
                    className="text-xs text-gray-500 hover:text-[#138601] transition-colors disabled:opacity-50"
                  >
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs text-gray-500 hover:text-black transition-colors"
                  >
                    Change email
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-7 py-2.5 min-h-[42px] text-sm font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] rounded shadow-sm transition-colors cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <span>Reset Password</span>
                  )}
                </button>
              </form>
            </>
          )}

          {/* STEP 3: Success Confirmation */}
          {step === 3 && (
            <div className="space-y-4 py-4 text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 text-[#138601] flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Password Reset Complete!</h2>
              <p className="text-xs text-gray-600 leading-relaxed max-w-sm mx-auto">
                Your password has been successfully updated. You can now sign in to your NACOS FUTO student account.
              </p>
              <div className="pt-4">
                <Link
                  to={loginLink}
                  className="w-full px-7 py-2.5 min-h-[42px] text-sm font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] rounded shadow-sm transition-colors inline-flex items-center justify-center"
                >
                  Proceed to Sign In
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
};

export default ForgotPassword;
