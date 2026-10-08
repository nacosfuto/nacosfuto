import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCloudinaryAssetUrl } from '@nacos/media';
import logoDark from '../assets/full-logo-dark.png';
import { 
  CheckCircle2, 
  ArrowLeft, 
  KeyRound, 
  Lock, 
  Eye, 
  EyeOff, 
  RotateCw, 
  AlertCircle, 
  Mail,
  Phone,
  Shield,
  ArrowRight,
  AlertTriangle,
  GraduationCap
} from 'lucide-react';
import {
  studentForgotPasswordStep1,
  studentForgotPasswordStep2,
  sendStudentOtp,
  verifyStudentOtp,
  completeStudentPasswordReset
} from '@nacos/supabase';
import { validateRegistrationNumberFormat } from '@nacos/config/academic';

const ForgotPassword = () => {
  const navigate = useNavigate();

  // 4 Steps: 1=Reg Check, 2=Name Verification, 3=OTP Verification, 4=New Password
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  // Step 1
  const [regNumber, setRegNumber] = useState('');
  const [step1Token, setStep1Token] = useState('');

  // Step 2
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [step2Token, setStep2Token] = useState('');
  const [availableChannels, setAvailableChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState('email');
  const [noVerifiedContact, setNoVerifiedContact] = useState(false);

  // Step 3
  const [otpCode, setOtpCode] = useState('');
  const [maskedDestination, setMaskedDestination] = useState('');
  const [authorizationToken, setAuthorizationToken] = useState('');

  // Step 4
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & UI
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

  // =========================================================================
  // STEP 1: REG NUMBER CHECK
  // =========================================================================
  const handleStep1Submit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanReg = regNumber.trim().toUpperCase();
    if (!cleanReg) {
      setError('Please enter your registration number.');
      return;
    }

    const formatCheck = validateRegistrationNumberFormat(cleanReg);
    if (!formatCheck.valid) {
      setError(formatCheck.error);
      return;
    }

    setIsLoading(true);
    try {
      const res = await studentForgotPasswordStep1(cleanReg);
      if (res.success && res.step1Token) {
        setStep1Token(res.step1Token);
        setStep(2);
      } else if (res.notRegistered) {
        setError(res.message || 'This registration number has not been registered yet. Please create an account first.');
      } else {
        setError(res.error || 'Registration number not found in official departmental records.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================================
  // STEP 2: NAME VERIFICATION & OTP DISPATCH
  // =========================================================================
  const handleStep2Submit = async (e) => {
    e.preventDefault();
    setError('');

    if (!firstName.trim() || !lastName.trim()) {
      setError('First Name and Last Name are required.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await studentForgotPasswordStep2(step1Token, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        middleName: middleName.trim()
      });

      if (res.success && res.step2Token) {
        setStep2Token(res.step2Token);
        setAvailableChannels(res.channels || []);
        const defaultChannel = res.channels?.[0]?.type || 'email';
        setSelectedChannel(defaultChannel);
        setStep(3);

        await triggerSendOtp(res.step2Token, defaultChannel);
      } else if (res.noVerifiedContact) {
        setNoVerifiedContact(true);
      } else {
        setError(res.error || 'The name entered does not match our departmental records for this registration number.');
      }
    } catch (err) {
      setError('Verification service unavailable. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const triggerSendOtp = async (tokenToUse, channelToUse) => {
    setError('');
    setIsLoading(true);
    try {
      const res = await sendStudentOtp({
        stepToken: tokenToUse || step2Token,
        channel: channelToUse || selectedChannel,
        purpose: 'PASSWORD_RESET'
      });

      if (res.success) {
        setMaskedDestination(res.maskedDestination);
        setResendCooldown(res.cooldownSeconds || 60);
      } else {
        setError(res.error || 'Failed to dispatch password reset code.');
      }
    } catch (err) {
      setError('Failed to send reset code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isLoading) return;
    await triggerSendOtp(step2Token, selectedChannel);
  };

  const handleChannelChange = async (newChannel) => {
    if (newChannel === selectedChannel || isLoading) return;
    setSelectedChannel(newChannel);
    setOtpCode('');
    await triggerSendOtp(step2Token, newChannel);
  };

  // =========================================================================
  // STEP 3: OTP VERIFICATION
  // =========================================================================
  const handleStep3Submit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanCode = (otpCode || '').toString().replace(/\D/g, '').trim();
    if (!cleanCode || cleanCode.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await verifyStudentOtp({
        stepToken: step2Token,
        otpCode: cleanCode,
        purpose: 'PASSWORD_RESET'
      });

      if (res.success && res.authorizationToken) {
        setAuthorizationToken(res.authorizationToken);
        setStep(4);
      } else {
        setError(res.error || 'Invalid verification code. Please check and try again.');
      }
    } catch (err) {
      setError('Verification error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================================
  // STEP 4: PASSWORD RESET
  // =========================================================================
  const handleStep4Submit = async (e) => {
    e.preventDefault();
    setError('');

    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await completeStudentPasswordReset({
        authorizationToken,
        newPassword
      });

      if (res.success) {
        setStep(5); // Success step
      } else {
        setError(res.error || 'Failed to reset password. Please try again.');
      }
    } catch (err) {
      setError('An error occurred while updating your password.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return '1. Registration Check';
      case 2: return '2. Identity Verification';
      case 3: return '3. Security Code';
      case 4: return '4. New Password';
      default: return 'Complete';
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white text-gray-900 font-sans selection:bg-black selection:text-white">
      
      {/* LEFT HALF: Branding & Visual */}
      <div 
        className="md:w-1/2 min-h-[320px] md:min-h-screen relative flex flex-col justify-between p-8 sm:p-12 md:p-14 lg:p-16 bg-cover bg-center"
        style={{ backgroundImage: `url(${getCloudinaryAssetUrl('drilldown') || getCloudinaryAssetUrl('header') || 'https://res.cloudinary.com/a2mmcttn/image/upload/v1791346769/drilldown.jpg'})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30 pointer-events-none"></div>

        <div className="relative z-10">
          <img 
            src={getCloudinaryAssetUrl('full-logo-dark') || logoDark} 
            alt="NACOS FUTO Logo" 
            className="h-9 sm:h-11 w-auto object-contain drop-shadow" 
          />
        </div>

        <div className="relative z-10 max-w-lg space-y-2 mt-auto pt-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <KeyRound className="w-3.5 h-3.5" />
            <span>Account Security & Recovery</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-snug tracking-tight">
            Recover access to your NACOS student account securely
          </h2>
          <p className="text-xs sm:text-sm text-gray-200 font-normal">
            Department of Computer Science &bull; Federal University of Technology, Owerri
          </p>
        </div>
      </div>

      {/* RIGHT HALF: Multi-Step Recovery Wizard */}
      <div className="md:w-1/2 flex items-center justify-center p-6 sm:p-10 md:p-14 lg:p-16 bg-white overflow-y-auto">
        <div className="w-full max-w-md space-y-6 my-auto">
          
          {step < 5 && !noVerifiedContact && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#138601]">
                  Step {step} of {totalSteps}
                </span>
                <span className="text-xs font-medium text-gray-500">
                  {getStepTitle()}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
                <div 
                  className="h-full bg-[#138601] transition-all duration-300 rounded-full"
                  style={{ width: `${(step / totalSteps) * 100}%` }}
                ></div>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                {step === 1 && 'Reset Your Password'}
                {step === 2 && 'Confirm Your Identity'}
                {step === 3 && 'Enter Security Code'}
                {step === 4 && 'Set Your New Password'}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-600">
                Remember your credentials?{' '}
                <Link to={loginLink} className="text-[#138601] font-semibold hover:underline">
                  Sign in here
                </Link>
              </p>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div 
              role="alert" 
              aria-live="polite" 
              className="p-3.5 rounded bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700 font-medium flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <div className="leading-relaxed flex-1">
                <p>{error}</p>
                {error.toLowerCase().includes('not been registered') && (
                  <div className="mt-2 pt-2 border-t border-red-200/80">
                    <Link 
                      to={`/register?reg=${encodeURIComponent(regNumber)}`} 
                      className="inline-flex items-center gap-1 font-bold text-[#138601] hover:underline"
                    >
                      <span>Create Account Now</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* NO VERIFIED CONTACT ERROR SCREEN */}
          {noVerifiedContact && (
            <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 space-y-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Contact Details Unavailable for Reset
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-gray-700 leading-relaxed">
                  Your official departmental record does not contain verified contact details. For security reasons, password resets require verification against registered contacts.
                </p>
                <div className="mt-4 p-3 rounded bg-white border border-amber-200 text-xs text-gray-600 space-y-1">
                  <p className="font-semibold text-gray-800">Please contact administration:</p>
                  <p>&bull; NACOS Secretariat, SICT Building, FUTO</p>
                  <p>&bull; Email: <a href="mailto:support@nacosfuto.com.ng" className="text-[#138601] font-semibold hover:underline">support@nacosfuto.com.ng</a></p>
                </div>
              </div>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded bg-[#138601] text-white hover:bg-[#0f6a01]"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          )}

          {/* SUCCESS SCREEN */}
          {step === 5 && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 text-[#138601] flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Password Reset Complete!</h2>
              <p className="text-xs sm:text-sm text-gray-600 max-w-sm mx-auto">
                Your password has been successfully updated. You can now sign in with your new password.
              </p>
              <div className="pt-2">
                <Link
                  to={loginLink}
                  className="inline-flex items-center justify-center px-6 py-2.5 rounded bg-[#138601] text-white text-sm font-semibold hover:bg-[#0f6a01] shadow transition"
                >
                  <span>Sign In to Student Portal</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Link>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 1: REGISTRATION NUMBER CHECK                                */}
          {/* ================================================================= */}
          {step === 1 && !noVerifiedContact && (
            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div>
                <label htmlFor="forgot-regNumber" className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Registration Number
                </label>
                <div className="relative">
                  <input
                    id="forgot-regNumber"
                    name="forgot-regNumber"
                    type="text"
                    required
                    autoComplete="username"
                    aria-required="true"
                    aria-invalid={Boolean(error)}
                    placeholder="e.g. 20241429481"
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 text-sm rounded bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:outline-none focus:border-[#138601] focus:ring-1 focus:ring-[#138601] font-mono tracking-wider transition-all"
                  />
                  <GraduationCap className="w-4 h-4 text-gray-400 absolute right-3.5 top-3.5 pointer-events-none" />
                </div>
                <p className="mt-1.5 text-xs text-gray-500">
                  Enter your official FUTO registration number to locate your account.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded bg-[#138601] text-white text-sm font-semibold hover:bg-[#0f6a01] focus:outline-none focus:ring-2 focus:ring-[#138601] focus:ring-offset-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Account...</span>
                  </>
                ) : (
                  <>
                    <span>Continue to Identity Check</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ================================================================= */}
          {/* STEP 2: NAME VERIFICATION                                         */}
          {/* ================================================================= */}
          {step === 2 && !noVerifiedContact && (
            <form onSubmit={handleStep2Submit} className="space-y-4">
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-600">
                <span className="font-semibold text-gray-800">Registration Number:</span>{' '}
                <span className="font-mono text-[#138601] font-bold">{regNumber}</span>
              </div>

              <div>
                <label htmlFor="forgot-firstName" className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="forgot-firstName"
                  name="forgot-firstName"
                  type="text"
                  required
                  autoComplete="given-name"
                  aria-required="true"
                  placeholder="e.g. Nestor"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:outline-none focus:border-[#138601] focus:ring-1 focus:ring-[#138601] transition-all"
                />
              </div>

              <div>
                <label htmlFor="forgot-lastName" className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Last Name (Surname) <span className="text-red-500">*</span>
                </label>
                <input
                  id="forgot-lastName"
                  name="forgot-lastName"
                  type="text"
                  required
                  autoComplete="family-name"
                  aria-required="true"
                  placeholder="e.g. Anyanwu"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:outline-none focus:border-[#138601] focus:ring-1 focus:ring-[#138601] transition-all"
                />
              </div>

              <div>
                <label htmlFor="forgot-middleName" className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Middle Name <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  id="forgot-middleName"
                  name="forgot-middleName"
                  type="text"
                  autoComplete="additional-name"
                  placeholder="e.g. Ifeanyi"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:outline-none focus:border-[#138601] focus:ring-1 focus:ring-[#138601] transition-all"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 text-sm font-semibold rounded border border-gray-300 text-gray-700 hover:bg-gray-100 flex items-center gap-1.5 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2.5 px-4 rounded bg-[#138601] text-white text-sm font-semibold hover:bg-[#0f6a01] focus:outline-none focus:ring-2 focus:ring-[#138601] focus:ring-offset-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>Verifying Identity...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify Identity</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ================================================================= */}
          {/* STEP 3: OTP VERIFICATION                                          */}
          {/* ================================================================= */}
          {step === 3 && !noVerifiedContact && (
            <form onSubmit={handleStep3Submit} className="space-y-4">
              
              {availableChannels.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                    Select Delivery Channel
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {availableChannels.map((ch) => (
                      <button
                        key={ch.type}
                        type="button"
                        onClick={() => handleChannelChange(ch.type)}
                        className={`p-2.5 text-xs rounded border text-left flex items-center gap-2 transition ${
                          selectedChannel === ch.type
                            ? 'border-[#138601] bg-green-50/50 text-[#138601] font-semibold'
                            : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {ch.type === 'email' ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                        <div className="truncate">
                          <div>{ch.label}</div>
                          <div className="text-[10px] text-gray-500 font-mono">{ch.masked}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3.5 rounded-lg bg-green-50 border border-green-200 text-xs text-green-900 flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-[#138601] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-950">Reset Code Dispatched</p>
                  <p className="mt-0.5 text-green-800">
                    We sent a 6-digit reset code to: <strong>{maskedDestination || 'your registered contact'}</strong>.
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="forgot-otpCode" className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Enter 6-Digit Code
                </label>
                <div className="relative">
                  <input
                    id="forgot-otpCode"
                    name="forgot-otpCode"
                    type="text"
                    required
                    maxLength={6}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    aria-required="true"
                    placeholder="••••••"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-4 py-3 text-center text-xl font-mono tracking-[0.5em] font-bold rounded bg-white text-gray-900 placeholder-gray-300 border border-gray-300 focus:outline-none focus:border-[#138601] focus:ring-1 focus:ring-[#138601] transition-all"
                  />
                  <KeyRound className="w-4 h-4 text-gray-400 absolute right-3.5 top-3.5 pointer-events-none" />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span>Code expires in 15 minutes</span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || isLoading}
                    className="text-[#138601] font-semibold hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer disabled:cursor-not-allowed"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 text-sm font-semibold rounded border border-gray-300 text-gray-700 hover:bg-gray-100 flex items-center gap-1.5 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  disabled={isLoading || otpCode.length !== 6}
                  className="flex-1 py-2.5 px-4 rounded bg-[#138601] text-white text-sm font-semibold hover:bg-[#0f6a01] focus:outline-none focus:ring-2 focus:ring-[#138601] focus:ring-offset-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>Verifying Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ================================================================= */}
          {/* STEP 4: SET NEW PASSWORD                                          */}
          {/* ================================================================= */}
          {step === 4 && !noVerifiedContact && (
            <form onSubmit={handleStep4Submit} className="space-y-4">
              <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-xs text-green-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#138601] shrink-0" />
                <span>Verification successful. Please enter your new password below.</span>
              </div>

              <div>
                <label htmlFor="forgot-newPassword" className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="forgot-newPassword"
                    name="forgot-newPassword"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    aria-required="true"
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm rounded bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:outline-none focus:border-[#138601] focus:ring-1 focus:ring-[#138601] transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="forgot-confirmPassword" className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="forgot-confirmPassword"
                    name="forgot-confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    aria-required="true"
                    placeholder="Repeat your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm rounded bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:outline-none focus:border-[#138601] focus:ring-1 focus:ring-[#138601] transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-2.5 rounded bg-gray-50 border border-gray-200 text-xs text-gray-600 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className={newPassword.length >= 6 ? 'text-green-600 font-bold' : 'text-gray-400'}>
                    {newPassword.length >= 6 ? '✓' : '•'}
                  </span>
                  <span>At least 6 characters long</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={newPassword && newPassword === confirmPassword ? 'text-green-600 font-bold' : 'text-gray-400'}>
                    {newPassword && newPassword === confirmPassword ? '✓' : '•'}
                  </span>
                  <span>Passwords match</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || newPassword.length < 6 || newPassword !== confirmPassword}
                className="w-full py-3 px-4 rounded bg-[#138601] text-white text-sm font-semibold hover:bg-[#0f6a01] focus:outline-none focus:ring-2 focus:ring-[#138601] focus:ring-offset-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Save New Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

        </div>
      </div>

    </div>
  );
};

export default ForgotPassword;
