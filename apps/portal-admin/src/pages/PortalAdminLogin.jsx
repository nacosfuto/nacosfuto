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
    if (params.get('reason') === 'inactivity' || params.get('reason') === 'session_expired') {
      setError('Your administrative session expired after 1 hour for security. Please sign in again.');
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
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#030d06] text-slate-100 font-sans selection:bg-emerald-500 selection:text-black">
      
      {/* LEFT HALF (50%): Executive Command Console Visual with Dark Emerald Cyber Accents */}
      <div 
        className="md:w-1/2 min-h-[360px] md:min-h-screen relative flex flex-col justify-between p-8 sm:p-12 md:p-14 lg:p-16 bg-cover bg-center overflow-hidden border-b md:border-b-0 md:border-r border-emerald-950/60"
        style={{ backgroundImage: `url(${getCloudinaryAssetUrl('drilldown') || getCloudinaryAssetUrl('header') || 'https://res.cloudinary.com/a2mmcttn/image/upload/v1791346769/drilldown.jpg'})` }}
      >
        {/* Deep Cyber Emerald Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#030d06] via-[#04160b]/90 to-[#030d06]/80 pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.15),transparent_60%)] pointer-events-none"></div>

        {/* Top Left NACOS Brand Logo & Executive Badge */}
        <div className="relative z-10 flex items-center gap-3">
          <img 
            src={getCloudinaryAssetUrl('full-logo-dark') || logoDark} 
            alt="NACOS FUTO Logo" 
            className="h-9 sm:h-11 w-auto object-contain drop-shadow-md" 
          />
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 text-xs uppercase font-extrabold tracking-widest backdrop-blur-md shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Portal Admin Console</span>
          </div>
        </div>

        {/* Text bottom left with Security Clearance Indicators */}
        <div className="relative z-10 max-w-lg space-y-4 mt-auto pt-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-xs font-semibold backdrop-blur-md shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Database Authentication &bull; Elevated Access</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-snug tracking-tight">
            Student Portal Administration &amp; Control Console
          </h2>
          
          <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
            Department of Computer Science &bull; Federal University of Technology, Owerri.<br />
            Privileged officer terminal for roster management, grading, and digital ID governance.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2 text-[11px] font-mono text-emerald-400/90">
            <div className="p-2.5 rounded-lg bg-black/40 border border-emerald-900/50 backdrop-blur-xs flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>PBKDF2 Hardened</span>
            </div>
            <div className="p-2.5 rounded-lg bg-black/40 border border-emerald-900/50 backdrop-blur-xs flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>60-Min Strict Token</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT HALF (50%): Executive Dark Form Panel */}
      <div className="md:w-1/2 flex items-center justify-center p-6 sm:p-10 md:p-12 lg:p-16 bg-[#040e07]">
        <div className="w-full max-w-md bg-[#071d0e]/90 border border-emerald-900/60 rounded-3xl p-7 sm:p-9 shadow-2xl backdrop-blur-md space-y-6">
          
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
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors mb-3 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Sign In</span>
                    </button>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Administrative Account Recovery</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                      Request Security Code
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1.5">
                      Enter your official administrator email address to receive an elevated 6-digit authorization code.
                    </p>
                  </div>

                  {resetError && (
                    <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                      <div className="flex-1 leading-relaxed">
                        <span>{resetError}</span>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleRequestReset} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                        Administrator Email Address
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          placeholder="admin@nacos.org.ng"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 text-sm rounded-xl bg-[#030d06] text-white placeholder-slate-500 border border-emerald-900/80 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all font-mono"
                        />
                        <Mail className="w-4 h-4 text-emerald-500/70 absolute left-3.5 top-3.5 pointer-events-none" />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isResetLoading}
                      className="w-full px-7 py-3 min-h-[46px] text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 rounded-xl shadow-lg shadow-emerald-950/60 transition-all cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {isResetLoading ? (
                        <>
                          <RotateCw className="w-4 h-4 animate-spin" />
                          <span>Dispatching Security Code...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Administrative Code</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}

              {/* Reset Step 2: Distinct Administrative Authorization Code Gate */}
              {resetStep === 2 && (
                <>
                  <div>
                    <button
                      type="button"
                      onClick={() => { setResetStep(1); setResetError(''); }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors mb-3 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Change Email</span>
                    </button>
                    
                    {/* Security Directive Banner */}
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-950/70 border border-amber-600/40 text-amber-300 text-[11px] font-bold tracking-wide uppercase mb-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span>Privileged Clearance Directive</span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                      Admin Authorization Code
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1">
                      We dispatched a single-use authorization code to <strong className="text-emerald-400 font-mono">{maskedResetEmail}</strong>.
                    </p>
                  </div>

                  {resetError && (
                    <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                      <div className="flex-1 leading-relaxed">
                        <span>{resetError}</span>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleConfirmReset} className="space-y-4">
                    {/* High-Security Distinct Segmented Monospace Authorization Field */}
                    <div className="p-4 rounded-2xl bg-[#020b05] border border-emerald-600/40 shadow-inner space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-emerald-300 uppercase tracking-widest flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                          <span>6-Digit Security Token</span>
                        </label>
                        <span className="text-[10px] text-amber-400 font-mono">15m TTL</span>
                      </div>
                      
                      <div className="relative">
                        <input
                          type="text"
                          required
                          maxLength={6}
                          placeholder="••••••"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                          className="w-full py-3 px-4 text-2xl font-mono tracking-[0.55em] rounded-xl bg-black/60 text-emerald-300 placeholder-emerald-800 border border-emerald-500/60 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40 text-center shadow-lg transition-all"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 text-center">
                        Elevated clearance token. Strictly confidential &bull; Do not disclose.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                        New Administrator Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          placeholder="At least 6 characters"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full pl-10 pr-11 py-3 text-sm rounded-xl bg-[#030d06] text-white placeholder-slate-500 border border-emerald-900/80 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all font-mono"
                        />
                        <Lock className="w-4 h-4 text-emerald-500/70 absolute left-3.5 top-3.5 pointer-events-none" />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white cursor-pointer"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          placeholder="Confirm password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 text-sm rounded-xl bg-[#030d06] text-white placeholder-slate-500 border border-emerald-900/80 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all font-mono"
                        />
                        <Lock className="w-4 h-4 text-emerald-500/70 absolute left-3.5 top-3.5 pointer-events-none" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                      <span>Didn't receive code?</span>
                      <button
                        type="button"
                        onClick={handleResendResetOTP}
                        disabled={resetCooldown > 0 || isResetLoading}
                        className="text-emerald-400 font-bold hover:underline disabled:opacity-50 cursor-pointer"
                      >
                        {resetCooldown > 0 ? `Resend in ${resetCooldown}s` : 'Resend Code'}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isResetLoading}
                      className="w-full px-7 py-3 min-h-[46px] text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 rounded-xl shadow-lg shadow-emerald-950/60 transition-all cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {isResetLoading ? (
                        <>
                          <RotateCw className="w-4 h-4 animate-spin" />
                          <span>Updating Administrative Password...</span>
                        </>
                      ) : (
                        <>
                          <span>Update Password &amp; Enter Console</span>
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
                  <div className="w-14 h-14 rounded-full bg-emerald-950 border border-emerald-500 flex items-center justify-center mx-auto shadow-lg text-emerald-400">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-extrabold text-white">
                    Password Updated Successfully
                  </h2>
                  <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                    Your administrative credentials have been updated and synchronized in the database. You can now access Portal Control.
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
                    className="w-full px-7 py-3 min-h-[46px] text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 rounded-xl shadow-lg transition-all cursor-pointer inline-flex items-center justify-center gap-2"
                  >
                    <span>Sign In Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

            </div>
          ) : (
            /* ================================================================= */
            /* VIEW B: STANDARD EXECUTIVE LOGIN FORM */
            /* ================================================================= */
            <div className="space-y-6">
              
              {/* Form Heading */}
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-[10px] font-extrabold tracking-widest uppercase mb-2">
                  <span>Authorized Personnel Only</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Sign in to Portal Control
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  Enter your authorized administrative credentials to manage student rosters, verifications, and digital ID cards.
                </p>
              </div>

              {/* Feedback & Error Alerts */}
              {error && (
                <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <div className="flex-1 leading-relaxed">
                    <span>{error}</span>
                  </div>
                </div>
              )}

              {/* Core Login Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                
                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Administrator Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="admin@nacos.org.ng"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 text-sm rounded-xl bg-[#030d06] text-white placeholder-slate-500 border border-emerald-900/80 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all font-mono"
                    />
                    <Mail className="w-4 h-4 text-emerald-500/70 absolute left-3.5 top-3.5 pointer-events-none" />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Administrative Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter administrative password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-11 py-3 text-sm rounded-xl bg-[#030d06] text-white placeholder-slate-500 border border-emerald-900/80 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all font-mono"
                    />
                    <Lock className="w-4 h-4 text-emerald-500/70 absolute left-3.5 top-3.5 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white cursor-pointer"
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
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Primary Action Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-7 py-3 min-h-[46px] text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 rounded-xl shadow-lg shadow-emerald-950/60 transition-all cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>Authenticating with Database...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Portal Control</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Standard Navigation Links */}
              <div className="pt-4 border-t border-emerald-950/80 flex items-center justify-center text-xs text-slate-400">
                <a
                  href={getAppUrls().adminHub}
                  className="text-emerald-400 hover:text-emerald-300 hover:underline font-semibold flex items-center gap-1"
                >
                  <span>Admin Command Hub &amp; Dashboards</span>
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
