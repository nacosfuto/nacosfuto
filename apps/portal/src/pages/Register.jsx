import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCloudinaryAssetUrl } from '@nacos/media';
import studentPhoto from '../assets/gallery_student_group.jpg';
import logoDark from '../assets/full-logo-dark.png';
import { 
  CheckCircle2, 
  ArrowLeft, 
  Lock, 
  Mail, 
  KeyRound, 
  RotateCw, 
  AlertCircle,
  Eye,
  EyeOff,
  Phone,
  Shield,
  MessageSquare,
  ArrowRight,
  Clock,
  UserCheck,
  AlertTriangle
} from 'lucide-react';
import { 
  lookupVerifiedStudentRecord, 
  checkIfStudentAccountExists,
  startRegistrationVerification,
  resendRegistrationOTP,
  verifyRegistrationOTP,
  completeSecureRegistration,
  getResendCooldownSeconds,
  submitAccountRecoveryRequest
} from '@nacos/supabase';
import { validateRegistrationNumberFormat } from '@nacos/config/academic';

const GENERIC_ERROR = 'Unable to verify these details. Please check your information and try again.';

const Register = () => {
  const navigate = useNavigate();
  // Steps: 1=find account, 2=choose method, 3=enter OTP, 4=create password, 5=success
  const [step, setStep] = useState(1);
  const [totalSteps] = useState(4);

  // Step 1: Registration lookup
  const [regNumber, setRegNumber] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [verifiedRecord, setVerifiedRecord] = useState(null);

  // Step 2: Verification method
  const [selectedChannel, setSelectedChannel] = useState('');
  const [maskedDestination, setMaskedDestination] = useState('');

  // Step 3: OTP
  const [otpCode, setOtpCode] = useState('');
  const [devTestCode, setDevTestCode] = useState('');
  const [sessionToken, setSessionToken] = useState('');

  // Step 4: Password
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [accountRecovered, setAccountRecovered] = useState(false);

  const getRedirectTarget = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('redirect') || params.get('returnUrl') || '';
    } catch {
      return '';
    }
  };

  // Resend cooldown timer
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const checkCooldown = useCallback(() => {
    if (regNumber && selectedChannel) {
      const remaining = getResendCooldownSeconds(regNumber, selectedChannel);
      setResendCooldown(remaining);
    }
  }, [regNumber, selectedChannel]);

  // =========================================================================
  // STEP 1: FIND ACCOUNT
  // =========================================================================
  const handleFindAccount = async (e) => {
    e.preventDefault();
    setError('');

    const cleanReg = regNumber.trim();
    if (!cleanReg) {
      setError('Please enter your registration number.');
      return;
    }

    const formatCheck = validateRegistrationNumberFormat(cleanReg);
    if (!formatCheck.valid) {
      setError(formatCheck.error);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    const cleanPhone = phone.trim().replace(/[\s\-()]/g, '');
    if (!cleanPhone) {
      setError('Please enter your phone number.');
      return;
    }
    if (cleanPhone.length < 10) {
      setError('Please enter a valid phone number (at least 10 digits).');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Explicitly check if student account already exists before generic checks
      const accountCheck = await checkIfStudentAccountExists(cleanReg, cleanEmail);
      if (accountCheck.exists) {
        setError(accountCheck.message);
        return;
      }

      const lookup = await lookupVerifiedStudentRecord(cleanReg);
      if (!lookup.found) {
        setError(lookup.error?.message || GENERIC_ERROR);
        return;
      }

      const record = lookup.data;
      const recordEmail = (record.email || '').trim().toLowerCase();
      const recordPhone = (record.phone_number || '').trim().replace(/[\s\-()]/g, '');
      const normalizeForCompare = (p) => p.replace(/\D/g, '').slice(-10);

      if (cleanEmail !== recordEmail) {
        setError('The email address provided does not match our departmental records for this registration number.');
        return;
      }

      if (normalizeForCompare(cleanPhone) !== normalizeForCompare(recordPhone)) {
        setError('The phone number provided does not match our departmental records for this registration number.');
        return;
      }

      setVerifiedRecord(record);
      setStep(2);
    } catch (err) {
      setError('An error occurred during verification. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================================
  // STEP 2: CHOOSE VERIFICATION METHOD & SEND OTP
  // =========================================================================
  const handleSendOTP = async (channel) => {
    setError('');
    setIsLoading(true);
    setSelectedChannel(channel);

    try {
      const result = await startRegistrationVerification(
        regNumber.trim(),
        email.trim(),
        phone.trim(),
        channel
      );

      if (result.success) {
        setMaskedDestination(result.maskedDestination);
        setResendCooldown(60);
        setStep(3);
      } else {
        setError(result.error?.message || "We couldn't send your verification code right now. Please try again later.");
      }
    } catch (err) {
      setError('Failed to send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setError('');
    setIsLoading(true);

    try {
      const result = await resendRegistrationOTP(regNumber.trim(), selectedChannel);
      if (result.success) {
        setResendCooldown(60);
      } else {
        setError(result.error?.message || 'Failed to resend verification code. Please try again.');
      }
    } catch (err) {
      setError('Failed to resend verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================================
  // STEP 3: VERIFY OTP CODE
  // =========================================================================
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');

    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await verifyRegistrationOTP(
        regNumber.trim(),
        selectedChannel,
        otpCode.trim()
      );

      if (result.success) {
        setSessionToken(result.sessionToken);
        setStep(4);
      } else {
        setError(result.error?.message || 'Incorrect verification code. Please try again.');
      }
    } catch (err) {
      setError('Code verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================================
  // STEP 4: CREATE PASSWORD & COMPLETE REGISTRATION
  // =========================================================================
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Please create a password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password.length > 128) {
      setError('Password must not exceed 128 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await completeSecureRegistration(
        sessionToken,
        regNumber.trim(),
        password,
        verifiedRecord?.full_name
      );

      if (result.error) {
        setError(result.error.message || 'Registration failed. Please contact an administrator.');
        return;
      }

      setIsSuccess(true);
      setTimeout(() => {
        const redirectTarget = getRedirectTarget();
        if (redirectTarget) {
          try {
            const userPayload = {
              id: result.data?.user?.id || verifiedRecord?.id,
              regNo: result.data?.user?.registration_number || verifiedRecord?.registration_number || regNumber.trim(),
              registration_number: result.data?.user?.registration_number || verifiedRecord?.registration_number || regNumber.trim(),
              full_name: result.data?.user?.full_name || verifiedRecord?.full_name,
              name: result.data?.user?.full_name || verifiedRecord?.full_name,
              firstName: verifiedRecord?.full_name ? verifiedRecord.full_name.split(' ')[0] : 'Student',
              lastName: verifiedRecord?.full_name ? verifiedRecord.full_name.split(' ').slice(1).join(' ') : '',
              email: result.data?.user?.email || verifiedRecord?.email,
              level: result.data?.user?.level || verifiedRecord?.level,
              role: 'student',
              is_verified: true
            };
            const encodedUser = encodeURIComponent(JSON.stringify(userPayload));

            if (redirectTarget.startsWith('http://') || redirectTarget.startsWith('https://')) {
              const targetUrl = new URL(redirectTarget);
              targetUrl.hash = `auth_user=${encodedUser}`;
              window.location.href = targetUrl.toString();
              return;
            }

            if (redirectTarget.startsWith('/')) {
              if (!redirectTarget.startsWith('/portal') && (redirectTarget.startsWith('/resources') || redirectTarget === '/')) {
                window.location.href = `${redirectTarget}#auth_user=${encodedUser}`;
                return;
              }
              navigate(redirectTarget, { replace: true });
              return;
            }
          } catch (err) {
            console.error('Redirect error:', err);
          }
        }
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================================
  // ACCOUNT RECOVERY
  // =========================================================================
  const handleAccountRecovery = async () => {
    setError('');
    const reason = window.prompt('Please explain why you cannot access the email/phone on your record (e.g., "lost access to email", "phone number changed"):');
    if (!reason || !reason.trim()) return;

    setIsLoading(true);
    try {
      const result = await submitAccountRecoveryRequest(
        regNumber.trim(),
        email.trim(),
        phone.trim(),
        reason.trim()
      );
      if (result.success) {
        setAccountRecovered(true);
      } else {
        setError(result.error?.message || 'Failed to submit recovery request.');
      }
    } catch (err) {
      setError('Failed to submit recovery request.');
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================================
  // RENDER
  // =========================================================================
  const getStepLabel = () => {
    switch (step) {
      case 1: return 'Find Your Account';
      case 2: return 'Verify Your Identity';
      case 3: return 'Enter Verification Code';
      case 4: return 'Create Password';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white text-gray-900 font-sans selection:bg-black selection:text-white">
      
      {/* LEFT HALF: Branding & Photo */}
      <div 
        className="md:w-1/2 min-h-[320px] md:min-h-screen relative flex flex-col justify-between p-8 sm:p-12 md:p-14 lg:p-16 bg-cover bg-center"
        style={{ backgroundImage: `url(${getCloudinaryAssetUrl('gallery_student_group') || studentPhoto})` }}
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
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-snug tracking-tight">
            Your NACOS account unlocks a world of computing excellence
          </h2>
          <p className="text-xs sm:text-sm text-gray-200 font-normal">
            Department of Computer Science &bull; Federal University of Technology, Owerri
          </p>
        </div>
      </div>

      {/* RIGHT HALF: Multi-Step Registration Form */}
      <div className="md:w-1/2 flex items-center justify-center p-6 sm:p-10 md:p-14 lg:p-16 bg-white overflow-y-auto">
        <div className="w-full max-w-md space-y-5 my-auto">
          
          {/* Header & Step Indicator */}
          {!isSuccess && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#138601]">
                  {step <= totalSteps ? `Step ${step} of ${totalSteps}` : 'Complete'}
                </span>
                <span className="text-xs text-gray-500">
                  {getStepLabel()}
                </span>
              </div>

              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
                <div 
                  className="h-full bg-[#138601] transition-all duration-300 rounded-full"
                  style={{ width: `${(step / totalSteps) * 100}%` }}
                ></div>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                {step === 1 && 'Find Your NACOS Account'}
                {step === 2 && 'Verify Your Identity'}
                {step === 3 && (selectedChannel === 'email' ? 'Check Your Email' : 'Check Your Phone')}
                {step === 4 && 'Create Your Password'}
              </h1>
              <p className="mt-1 text-xs text-gray-600">
                Already have an account?{' '}
                <Link 
                  to={getRedirectTarget() ? `/login?redirect=${encodeURIComponent(getRedirectTarget())}` : "/login"} 
                  className="text-[#138601] font-semibold hover:underline"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <div className="leading-relaxed flex-1">
                <p>{error}</p>
                {(error.toLowerCase().includes('already exist') || error.toLowerCase().includes('already been registered')) && (
                  <div className="mt-2 pt-2 border-t border-red-200/80">
                    <Link 
                      to={getRedirectTarget() ? `/login?redirect=${encodeURIComponent(getRedirectTarget())}` : "/login"} 
                      className="inline-flex items-center gap-1 font-bold text-[#138601] hover:underline"
                    >
                      <span>Click here to Sign In</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Success Screen */}
          {isSuccess ? (
            <div className="text-center py-10 space-y-3">
              <div className="w-16 h-16 rounded-full bg-green-100 text-[#138601] flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Account Created!</h2>
              <p className="text-xs text-gray-600 max-w-sm mx-auto">
                Welcome to NACOS FUTO, <strong>{verifiedRecord?.full_name || 'Student'}</strong>. Redirecting you {getRedirectTarget() ? 'back to your previous page...' : 'to your student dashboard...'}
              </p>
            </div>
          ) : accountRecovered ? (
            <div className="text-center py-10 space-y-3">
              <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
                <Shield className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Recovery Request Submitted</h2>
              <p className="text-xs text-gray-600 max-w-sm mx-auto">
                Your account recovery request has been submitted. A NACOS administrator will review it and contact you. You can sign in once your request is approved.
              </p>
              <Link 
                to={getRedirectTarget() ? `/login?redirect=${encodeURIComponent(getRedirectTarget())}` : "/login"} 
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#138601] hover:underline"
              >
                Go to Sign In
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div>

              {/* STEP 1: FIND ACCOUNT */}
              {step === 1 && (
                <form onSubmit={handleFindAccount} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      FUTO Registration Number *
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="e.g. 20241429481"
                      value={regNumber}
                      onChange={(e) => setRegNumber(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-3 text-sm rounded bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:outline-none focus:border-[#138601] focus:ring-1 focus:ring-[#138601] font-mono font-medium transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Email Address *
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        placeholder="e.g. student@futo.edu.ng"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 text-sm rounded bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:outline-none focus:border-[#138601] focus:ring-1 focus:ring-[#138601] font-medium transition-all"
                      />
                      <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 08012345678"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 text-sm rounded bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:outline-none focus:border-[#138601] focus:ring-1 focus:ring-[#138601] font-medium transition-all"
                      />
                      <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full px-7 py-3 min-h-[44px] text-sm font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] rounded shadow-sm transition-colors cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {isLoading ? (
                        <>
                          <RotateCw className="w-4 h-4 animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <span>Continue</span>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: CHOOSE VERIFICATION METHOD */}
              {step === 2 && verifiedRecord && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded bg-green-50 border border-green-200 text-xs text-green-900 flex items-start gap-2.5">
                    <UserCheck className="w-4 h-4 text-[#138601] mt-0.5 shrink-0" />
                    <div className="leading-relaxed">
                      We found a record for <strong>{verifiedRecord.full_name}</strong>. 
                      Choose how you would like to verify your identity.
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 font-medium">
                    Send verification code to:
                  </p>

                  <div className="space-y-3">
                    {verifiedRecord.masked_email && (
                      <button
                        onClick={() => handleSendOTP('email')}
                        disabled={isLoading}
                        className="w-full p-4 rounded-lg border-2 border-gray-200 hover:border-[#138601] hover:bg-green-50 transition-all cursor-pointer text-left inline-flex items-center gap-4 disabled:opacity-60 group"
                      >
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-200">
                          <Mail className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900">Email Verification</p>
                            <span className="text-[10px] font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">Resend</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{verifiedRecord.masked_email}</p>
                        </div>
                        {isLoading ? (
                          <RotateCw className="w-4 h-4 animate-spin text-gray-400" />
                        ) : (
                          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#138601]" />
                        )}
                      </button>
                    )}

                    {verifiedRecord.masked_phone && (
                      <button
                        onClick={() => handleSendOTP('phone')}
                        disabled={isLoading}
                        className="w-full p-4 rounded-lg border-2 border-gray-200 hover:border-[#138601] hover:bg-green-50 transition-all cursor-pointer text-left inline-flex items-center gap-4 disabled:opacity-60 group"
                      >
                        <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0 group-hover:bg-green-200">
                          <Phone className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900">SMS Verification</p>
                            <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">Termii</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{verifiedRecord.masked_phone}</p>
                        </div>
                        {isLoading ? (
                          <RotateCw className="w-4 h-4 animate-spin text-gray-400" />
                        ) : (
                          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#138601]" />
                        )}
                      </button>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => { setStep(1); setError(''); }}
                      className="px-4 py-2.5 min-h-[42px] text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: ENTER OTP CODE */}
              {step === 3 && (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div className="p-3.5 rounded bg-green-50 border border-green-200 text-xs text-green-900 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#138601] mt-0.5 shrink-0" />
                    <div className="leading-relaxed">
                      A 6-digit verification code has been dispatched via <strong>{selectedChannel === 'email' ? 'Resend Email' : 'Termii SMS'}</strong> to <strong>{maskedDestination}</strong>. 
                      Enter the code below to complete verification.
                    </div>
                  </div>

                  {/* Dev Test Code Banner */}
                  {devTestCode && (
                    <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Dev Code: <strong className="font-mono font-bold tracking-wider">{devTestCode}</strong></span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOtpCode(devTestCode)}
                        className="text-[11px] text-emerald-700 underline font-semibold hover:text-emerald-900 cursor-pointer"
                      >
                        Auto-fill
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      6-Digit Verification Code *
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      maxLength={6}
                      placeholder="000000"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-3 text-base text-center tracking-widest font-mono font-bold rounded bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:outline-none focus:border-[#138601] focus:ring-1 focus:ring-[#138601] transition-all"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                    <span>Didn't receive the code?</span>
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={resendCooldown > 0 || isLoading}
                      className="text-[#138601] hover:underline font-semibold disabled:opacity-50 disabled:no-underline cursor-pointer inline-flex items-center gap-1"
                    >
                      {isLoading && <RotateCw className="w-3 h-3 animate-spin" />}
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                    </button>
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => { setStep(2); setError(''); setOtpCode(''); }}
                      className="px-4 py-2.5 min-h-[42px] text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || otpCode.trim().length !== 6}
                      className="flex-1 px-6 py-2.5 min-h-[42px] text-sm font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] rounded shadow-sm transition-colors cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <RotateCw className="w-4 h-4 animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <span>Verify Code</span>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 4: CREATE PASSWORD */}
              {step === 4 && (
                <form onSubmit={handleCreateAccount} className="space-y-4">
                  <div className="p-3.5 rounded bg-green-50 border border-green-200 text-xs text-green-900 flex items-start gap-2.5">
                    <Shield className="w-4 h-4 text-[#138601] mt-0.5 shrink-0" />
                    <div className="leading-relaxed">
                      Your identity has been verified. Create a password to secure your NACOS portal account.
                    </div>
                  </div>

                  <div className="p-3 rounded bg-gray-50 border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Registering as:</p>
                    <p className="text-sm font-semibold text-gray-900">{verifiedRecord?.full_name}</p>
                    <p className="text-xs text-gray-600 font-mono">{verifiedRecord?.registration_number}</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Create Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoFocus
                        placeholder="At least 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 text-sm rounded bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:outline-none focus:border-[#138601] focus:ring-1 focus:ring-[#138601] font-normal transition-all pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3.5 text-gray-500 hover:text-gray-700 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Confirm Password *
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 text-sm rounded bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:outline-none focus:border-[#138601] focus:ring-1 focus:ring-[#138601] font-normal transition-all"
                    />
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => { setStep(3); setError(''); }}
                      className="px-4 py-2.5 min-h-[42px] text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 px-6 py-2.5 min-h-[42px] text-sm font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] rounded shadow-sm transition-colors cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <RotateCw className="w-4 h-4 animate-spin" />
                          <span>Activating Account...</span>
                        </>
                      ) : (
                        <span>Create Account</span>
                      )}
                    </button>
                  </div>
                </form>
              )}

            </div>
          )}

          {/* Account Recovery Link */}
          {!isSuccess && !accountRecovered && step >= 2 && (
            <div className="text-center pt-2 border-t border-gray-100">
              <p className="text-[11px] text-gray-500">
                Can't access these contact details?{' '}
                <button
                  onClick={handleAccountRecovery}
                  disabled={isLoading}
                  className="text-[#138601] font-semibold hover:underline cursor-pointer disabled:opacity-50"
                >
                  Request Manual Verification
                </button>
              </p>
            </div>
          )}

        </div>
      </div>

    </div>
  );
};

export default Register;
