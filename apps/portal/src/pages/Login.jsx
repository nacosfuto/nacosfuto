import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getCloudinaryAssetUrl } from '@nacos/media';
import { signInStudent, isLocalEnvironment } from '@nacos/supabase/auth';
import studentPhoto from '../assets/gallery_student_group.jpg';
import logoDark from '../assets/full-logo-dark.png';
import { FaUserShield } from 'react-icons/fa';
import { ShieldCheck, AlertCircle, Eye, EyeOff, RotateCw, ArrowRight } from 'lucide-react';
import { getAppUrls } from '@nacos/config/urls';

const Login = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const getRedirectTarget = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('redirect') || params.get('returnUrl') || '';
    } catch {
      return '';
    }
  };

  const handlePostLoginRedirect = (userObj) => {
    localStorage.setItem('nacos_last_activity', Date.now().toString());

    const redirectTarget = getRedirectTarget();
    if (redirectTarget) {
      try {
        const userPayload = {
          id: userObj?.id,
          regNo: userObj?.registration_number || userObj?.regNo || userObj?.matric,
          registration_number: userObj?.registration_number || userObj?.regNo || userObj?.matric,
          full_name: userObj?.full_name || userObj?.name || `${userObj?.first_name || ''} ${userObj?.last_name || ''}`.trim(),
          name: userObj?.full_name || userObj?.name || `${userObj?.first_name || ''} ${userObj?.last_name || ''}`.trim(),
          firstName: userObj?.first_name || userObj?.firstName || (userObj?.full_name ? userObj.full_name.split(' ')[0] : 'Student'),
          lastName: userObj?.last_name || userObj?.lastName || '',
          email: userObj?.email,
          level: userObj?.level,
          role: userObj?.role || 'student',
          is_verified: userObj?.is_verified ?? true
        };

        const encodedUser = encodeURIComponent(JSON.stringify(userPayload));

        // If target is an absolute URL (e.g. http://localhost:5173/resources or https://...)
        if (redirectTarget.startsWith('http://') || redirectTarget.startsWith('https://')) {
          const targetUrl = new URL(redirectTarget);
          targetUrl.hash = `auth_user=${encodedUser}`;
          window.location.href = targetUrl.toString();
          return;
        }

        // If target is a relative path
        if (redirectTarget.startsWith('/')) {
          if (!redirectTarget.startsWith('/portal') && (redirectTarget.startsWith('/resources') || redirectTarget === '/')) {
            window.location.href = `${redirectTarget}#auth_user=${encodedUser}`;
            return;
          }
          navigate(redirectTarget, { replace: true });
          return;
        }
      } catch (err) {
        console.error('Error executing redirect:', err);
      }
    }

    // Default to portal dashboard
    navigate('/dashboard');
  };

  // Auto-Continue: If already logged in & within 1-hour window, open target or dashboard automatically!
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reason') === 'not_registered') {
      setError('Your registration number was not found in our student database. Please create an account or contact the NACOS admin.');
    } else if (params.get('reason') === 'deactivated') {
      setError('Your account has been deactivated. Please contact the NACOS admin or your department to resolve this.');
    }

    const redirectTarget = params.get('redirect') || params.get('returnUrl') || '';

    try {
      const stored = localStorage.getItem('nacos_user');
      if (stored) {
        const lastActivity = parseInt(localStorage.getItem('nacos_last_activity') || '0', 10);
        const ONE_HOUR_MS = 60 * 60 * 1000;
        const now = Date.now();

        if (lastActivity && (now - lastActivity < ONE_HOUR_MS)) {
          // Session is fresh: update timestamp and automatically redirect or open dashboard!
          localStorage.setItem('nacos_last_activity', now.toString());
          const parsedUser = JSON.parse(stored);
          if (redirectTarget) {
            handlePostLoginRedirect(parsedUser);
            return;
          }
          navigate('/dashboard', { replace: true });
        } else if (lastActivity && (now - lastActivity >= ONE_HOUR_MS)) {
          // Session expired: clean up silently
          localStorage.removeItem('nacos_user');
          localStorage.removeItem('nacos_last_activity');
        } else {
          // Valid user without stored activity timestamp -> initialize and continue
          localStorage.setItem('nacos_last_activity', now.toString());
          const parsedUser = JSON.parse(stored);
          if (redirectTarget) {
            handlePostLoginRedirect(parsedUser);
            return;
          }
          navigate('/dashboard', { replace: true });
        }
      }
    } catch (e) {
      console.error('Session auto-continue error:', e);
    }
  }, [navigate]);

  const handleContinue = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter your Registration / Matric Number or Email.');
      return;
    }
    if (!password) {
      setError('Please enter your Password.');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const res = await signInStudent(identifier.trim(), password);
      if (res.error) {
        setError(res.error.message || 'Invalid credentials. Please verify your details.');
      } else {
        handlePostLoginRedirect(res.data?.user || { identifier: identifier.trim() });
      }
    } catch (err) {
      setError('A network or server error occurred during sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (role) => {
    setIsLoading(true);
    setError('');
    const regNo = role === 'President' ? '20201012948' : '20241429481';
    try {
      const res = await signInStudent(regNo, 'password');
      if (!res.error) {
        handlePostLoginRedirect(res.data?.user || { regNo });
      } else {
        setError(res.error.message || 'Demo login failed.');
      }
    } catch (err) {
      setError('Could not complete demo login.');
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
        {/* Subtle dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/25 pointer-events-none"></div>

        {/* Top Left NACOS Brand Logo */}
        <div className="relative z-10">
          <img src={getCloudinaryAssetUrl('full-logo-dark') || logoDark} alt="NACOS FUTO Logo" className="h-9 sm:h-11 w-auto object-contain drop-shadow" />
        </div>

        {/* Text bottom left */}
        <div className="relative z-10 max-w-lg space-y-2 mt-auto pt-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-snug tracking-tight">
            Your NACOS account unlocks a world of computing excellence
          </h2>
          <p className="text-sm sm:text-base text-gray-200 font-normal">
            Department of Computer Science • Federal University of Technology, Owerri
          </p>
        </div>
      </div>

      {/* RIGHT HALF (50%): Minimalist, Clean White Form */}
      <div className="md:w-1/2 flex items-center justify-center p-6 sm:p-10 md:p-14 lg:p-20 bg-white">
        <div className="w-full max-w-md space-y-6">
          
          {/* Form Heading & Sign up link */}
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900 tracking-tight">
              Sign in to your student account
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Don't have an account yet?{' '}
              <Link 
                to={getRedirectTarget() ? `/register?redirect=${encodeURIComponent(getRedirectTarget())}` : "/register"} 
                className="text-[#138601] font-semibold hover:underline"
              >
                Sign up here
              </Link>
            </p>
          </div>

          {/* Error Message with Context Actions */}
          {error && (
            <div className="p-3.5 rounded bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700 font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <div className="leading-relaxed flex-1">
                <p>{error}</p>
                {error.toLowerCase().includes('create an account') && (
                  <div className="mt-2 pt-2 border-t border-red-200/80">
                    <Link 
                      to={getRedirectTarget() ? `/register?redirect=${encodeURIComponent(getRedirectTarget())}` : "/register"} 
                      className="inline-flex items-center gap-1 font-bold text-[#138601] hover:underline"
                    >
                      <span>Go to Student Registration</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
                {error.toLowerCase().includes('incorrect password') && (
                  <div className="mt-2 pt-2 border-t border-red-200/80">
                    <Link 
                      to={getRedirectTarget() ? `/forgot-password?redirect=${encodeURIComponent(getRedirectTarget())}` : "/forgot-password"} 
                      className="inline-flex items-center gap-1 font-bold text-[#138601] hover:underline"
                    >
                      <span>Reset your forgotten password</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Clean Input Form Box */}
          <form onSubmit={handleContinue} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                Registration Number or Email
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 20241450682 or name@futo.edu.ng"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-4 py-3 text-sm sm:text-base rounded bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:outline-none focus:border-[#138601] focus:ring-1 focus:ring-[#138601] font-normal transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-4 pr-11 py-3 text-sm sm:text-base rounded bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:outline-none focus:border-[#138601] focus:ring-1 focus:ring-[#138601] font-normal transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="flex items-center justify-end text-sm">
              <Link 
                to={getRedirectTarget() ? `/forgot-password?redirect=${encodeURIComponent(getRedirectTarget())}` : "/forgot-password"} 
                className="text-[#138601] font-medium hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-7 py-3 min-h-[44px] text-sm sm:text-base font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] rounded shadow-sm transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Continue</span>
              )}
            </button>
          </form>

          {/* Administrative Gateway Button */}
          <div className="pt-2">
            <div className="relative flex items-center justify-center py-2 mb-3">
              <div className="w-full border-t border-gray-200"></div>
              <span className="bg-white px-3 text-xs text-gray-500 uppercase tracking-wider font-semibold whitespace-nowrap">
                Staff & Administrators
              </span>
              <div className="w-full border-t border-gray-200"></div>
            </div>

            <a
              href={getAppUrls().adminHub}
              className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-gray-800 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all duration-200 border border-gray-300 shadow-sm cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-[#138601] group-hover:scale-110 transition-transform" />
                <span>Login as Admin</span>
              </div>
              <div className="flex items-center text-xs text-gray-500 font-normal">
                <span>Admin Hub</span>
                <ArrowRight className="w-4 h-4 ml-1.5 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </a>
          </div>

        </div>
      </div>

    </div>
  );
};

export default Login;
