import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getCloudinaryAssetUrl } from '@nacos/media';
import { 
  loginPortalAdmin, 
  getPortalAdminSession, 
  logoutPortalAdmin,
  requestAdminPasswordReset,
  confirmAdminPasswordReset
} from '@nacos/auth';
import { getAppUrls } from '@nacos/config/urls';
import logoDark from '../assets/full-logo-dark.png';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  ArrowRight, 
  ArrowLeft, 
  ShieldAlert, 
  Eye, 
  EyeOff, 
  GraduationCap, 
  ExternalLink,
  CheckCircle2,
  KeyRound,
  RotateCw
} from 'lucide-react';

export const PortalAdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Password reset state
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1 = Request Code, 2 = Enter Code & New Password, 3 = Success
  const [resetEmail, setResetEmail] = useState('');
  const [maskedResetEmail, setMaskedResetEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetCooldown, setResetCooldown] = useState(0);

  // Cooldown countdown timer
  useEffect(() => {
    let timer;
    if (resetCooldown > 0) {
      timer = setTimeout(() => setResetCooldown(resetCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resetCooldown]);

  // If already logged in with fresh session, auto-continue immediately
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reason') === 'inactivity') {
      setError('You were automatically logged out after 1 hour of inactivity for your security.');
    }

    const existing = getPortalAdminSession();
    if (existing) {
      const lastActivity = parseInt(localStorage.getItem('nacos_portal_admin_last_activity') || '0', 10);
      const ONE_HOUR_MS = 60 * 60 * 1000;
      const now = Date.now();

      if (lastActivity && (now - lastActivity < ONE_HOUR_MS)) {
        localStorage.setItem('nacos_portal_admin_last_activity', now.toString());
        navigate('/', { replace: true });
      } else if (lastActivity && (now - lastActivity >= ONE_HOUR_MS)) {
        logoutPortalAdmin();
        localStorage.removeItem('nacos_portal_admin_last_activity');
        setError('Your administrative session has expired due to 1 hour of inactivity. Please sign in again.');
      } else {
        localStorage.setItem('nacos_portal_admin_last_activity', now.toString());
        navigate('/', { replace: true });
      }
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your administrative email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await loginPortalAdmin(email.trim(), password);
      setIsLoading(false);

      if (res?.error) {
        setError(res.error);
      } else {
        const destination = location.state?.from?.pathname || '/';
        navigate(destination, { replace: true });
      }
    } catch (err) {
      setIsLoading(false);
      setError('An unexpected error occurred during portal authentication.');
    }
  };

  // Step 1: Request Admin Reset OTP
  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setResetError('Please enter your official administrator email address.');
      return;
    }

    setIsResetLoading(true);
    setResetError('');

    try {
      const result = await requestAdminPasswordReset(resetEmail.trim());
      setIsResetLoading(false);

      if (result.success) {
        setMaskedResetEmail(result.maskedEmail);
        setResetCooldown(60);
        setResetStep(2);
      } else {
        if (result.retryAfterSeconds) {
          setResetCooldown(result.retryAfterSeconds);
        }
        setResetError(result.error || 'Could not send verification code. Please check your email.');
      }
    } catch (err) {
      setIsResetLoading(false);
      setResetError('A network or server error occurred. Please try again.');
    }
  };

  // Resend OTP in Step 2
  const handleResendResetOTP = async () => {
    if (resetCooldown > 0 || isResetLoading) return;
    setIsResetLoading(true);
    setResetError('');

    try {
      const result = await requestAdminPasswordReset(resetEmail.trim());
      setIsResetLoading(false);
      if (result.success) {
        setResetCooldown(60);
      } else {
        setResetError(result.error || 'Failed to resend verification code.');
      }
    } catch (err) {
      setIsResetLoading(false);
      setResetError('Failed to resend code. Please try again.');
    }
  };

  // Step 2: Verify Code and Set New Password
  const handleConfirmReset = async (e) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setResetError('Please enter the 6-digit verification code.');
      return;
    }
    if (!newPassword) {
      setResetError('Please enter your new administrative password.');
      return;
    }
    if (newPassword.length < 6) {
      setResetError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsResetLoading(true);
    setResetError('');

    try {
      const result = await confirmAdminPasswordReset(resetEmail.trim(), otpCode.trim(), newPassword);
      setIsResetLoading(false);

      if (result.success) {
        setResetStep(3);
      } else {
        setResetError(result.error || 'Failed to update password. Please verify the code.');
      }
    } catch (err) {
      setIsResetLoading(false);
      setResetError('A network error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white text-gray-900 font-sans selection:bg-[#138601] selection:text-white">
      
      {/* LEFT HALF (50%): Department Photo with Brand Logo, Clean Overlay & Portal Admin Text */}
      <div 
        className="md:w-1/2 min-h-[360px] md:min-h-screen relative flex flex-col justify-between p-8 sm:p-12 md:p-14 lg:p-16 bg-cover bg-center"
        style={{ backgroundImage: `url(${getCloudinaryAssetUrl('drilldown') || getCloudinaryAssetUrl('header') || 'https://res.cloudinary.com/a2mmcttn/image/upload/v1791346769/drilldown.jpg'})` }}
      >
        {/* Subtle dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30 pointer-events-none"></div>

        {/* Top Left NACOS Brand Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <img 
            src={getCloudinaryAssetUrl('full-logo-dark') || logoDark} 
            alt="NACOS FUTO Logo" 
            className="h-9 sm:h-11 w-auto object-contain drop-shadow" 
          />
          <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-1 rounded bg-[#138601]/90 text-white border border-green-500/30">
            Portal Admin
          </span>
        </div>

        {/* Text bottom left */}
        <div className="relative z-10 max-w-lg space-y-2 mt-auto pt-16">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/40 border border-white/20 text-white text-xs font-semibold backdrop-blur-xs mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#4bd043]" />
            <span>Secure Database Authentication</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-snug tracking-tight">
            Student Portal Administration & Verification
          </h2>
          <p className="text-sm sm:text-base text-gray-200 font-normal">
            Department of Computer Science • Federal University of Technology, Owerri
          </p>
        </div>
      </div>

      {/* RIGHT HALF (50%): Clean White Form Pane */}
      <div className="md:w-1/2 flex items-center justify-center p-6 sm:p-10 md:p-14 lg:p-20 bg-white">
        <div className="w-full max-w-md space-y-6">
          
          {/* ================================================================= */}
          {/* VIEW A: FORGOT PASSWORD WORKFLOW */}
          {/* ================================================================= */}
          {isResetMode ? (
            <div className="space-y-6">
              
              {/* Reset Step 1: Request Reset Code */}
              {resetStep === 1 && (
                <>
                  <div>
                    <button
                      type="button"
                      onClick={() => { setIsResetMode(false); setResetError(''); }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-[#138601] transition-colors mb-3 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Sign In</span>
                    </button>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                      Reset Admin Password
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                      Enter your official administrator email address. We will send you a secure 6-digit verification code.
                    </p>
                  </div>

                  {resetError && (
                    <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="flex-1 leading-relaxed">
                        <span>{resetError}</span>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleRequestReset} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                        Administrator Email Address
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          placeholder="admin@nacos.org.ng"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 text-sm rounded-lg bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:outline-none focus:border-[#138601] focus:ring-1 focus:ring-[#138601] font-normal transition-all"
                        />
                        <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isResetLoading}
                      className="w-full px-7 py-3 min-h-[44px] text-sm font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] rounded-lg shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {isResetLoading ? (
                        <>
                          <RotateCw className="w-4 h-4 animate-spin" />
                          <span>Sending Verification Code...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Reset Code</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}

              {/* Reset Step 2: Enter Code & New Password */}
              {resetStep === 2 && (
                <>
                  <div>
                    <button
                      type="button"
                      onClick={() => { setResetStep(1); setResetError(''); }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-[#138601] transition-colors mb-3 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Change Email</span>
                    </button>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                      Enter Verification Code
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                      We sent a 6-digit code to <strong className="text-gray-900">{maskedResetEmail}</strong>. Enter it below along with your new password.
                    </p>
                  </div>

                  {resetError && (
                    <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="flex-1 leading-relaxed">
                        <span>{resetError}</span>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleConfirmReset} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                        6-Digit Verification Code
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          maxLength={6}
                          placeholder="e.g. 123456"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                          className="w-full pl-10 pr-4 py-3 text-lg font-mono tracking-widest rounded-lg bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:outline-none focus:border-[#138601] focus:ring-1 focus:ring-[#138601] text-center"
                        />
                        <KeyRound className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                        New Administrator Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          placeholder="At least 6 characters"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full pl-10 pr-11 py-3 text-sm rounded-lg bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:outline-none focus:border-[#138601] focus:ring-1 focus:ring-[#138601]"
                        />
                        <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-700 cursor-pointer"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          placeholder="Confirm password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 text-sm rounded-lg bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:outline-none focus:border-[#138601] focus:ring-1 focus:ring-[#138601]"
                        />
                        <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                      <span>Didn't receive the code?</span>
                      <button
                        type="button"
                        onClick={handleResendResetOTP}
                        disabled={resetCooldown > 0 || isResetLoading}
                        className="text-[#138601] font-semibold hover:underline disabled:opacity-50 cursor-pointer"
                      >
                        {resetCooldown > 0 ? `Resend code in ${resetCooldown}s` : 'Resend Code'}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isResetLoading}
                      className="w-full px-7 py-3 min-h-[44px] text-sm font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] rounded-lg shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {isResetLoading ? (
                        <>
                          <RotateCw className="w-4 h-4 animate-spin" />
                          <span>Updating Password...</span>
                        </>
                      ) : (
                        <>
                          <span>Update Password & Return</span>
                          <CheckCircle2 className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}

              {/* Reset Step 3: Success Confirmation */}
              {resetStep === 3 && (
                <div className="text-center space-y-4 py-4">
                  <div className="w-14 h-14 rounded-full bg-green-100 text-[#138601] border border-green-200 flex items-center justify-center mx-auto shadow-xs">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Password Reset Successful
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600 max-w-sm mx-auto">
                    Your administrative password has been updated in the database. You can now sign in with your new credentials.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(resetEmail);
                      setIsResetMode(false);
                      setResetStep(1);
                      setResetError('');
                      setError('');
                    }}
                    className="w-full px-7 py-3 min-h-[44px] text-sm font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] rounded-lg shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
                  >
                    <span>Sign In Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

            </div>
          ) : (
            /* ================================================================= */
            /* VIEW B: STANDARD LOGIN FORM */
            /* ================================================================= */
            <div className="space-y-6">
              
              {/* Form Heading */}
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                  Sign in to Portal Control
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Enter your authorized administrative credentials to manage student rosters, verifications, and digital ID cards.
                </p>
              </div>

              {/* Feedback & Error Alerts */}
              {error && (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-relaxed">
                    <span>{error}</span>
                  </div>
                </div>
              )}

              {/* Core Login Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                
                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                    Administrator Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="admin@nacos.org.ng"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 text-sm rounded-lg bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:outline-none focus:border-[#138601] focus:ring-1 focus:ring-[#138601] font-normal transition-all"
                    />
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                    Administrative Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter administrative password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-11 py-3 text-sm rounded-lg bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:outline-none focus:border-[#138601] focus:ring-1 focus:ring-[#138601] font-normal transition-all"
                    />
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-700 cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Forgot Password Link */}
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email);
                      setIsResetMode(true);
                      setResetStep(1);
                      setError('');
                      setResetError('');
                    }}
                    className="text-xs font-semibold text-[#138601] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Primary Action Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-7 py-3 min-h-[44px] text-sm font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] rounded-lg shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isLoading ? (
                    <span>Authenticating with Database...</span>
                  ) : (
                    <>
                      <span>Sign In as Portal Admin</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Standard Navigation Links */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-center text-xs text-gray-500">
                <a
                  href={getAppUrls().adminHub}
                  className="text-[#138601] hover:underline font-semibold flex items-center gap-1"
                >
                  <span>Admin Command Hub & Dashboards</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default PortalAdminLogin;
