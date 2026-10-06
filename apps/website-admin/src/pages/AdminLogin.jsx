import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { getCloudinaryAssetUrl } from '@nacos/media';
import { loginWebsiteAdmin, getWebsiteAdminSession } from '@nacos/auth';
import { getAppUrls } from '@nacos/config/urls';
import studentPhoto from '../assets/gallery_student_group.jpg';
import logoDark from '../assets/full-logo-dark.png';
import { Globe, Mail, Lock, ArrowRight, ShieldAlert, Eye, EyeOff, ShieldCheck, ExternalLink } from 'lucide-react';

export const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // If already logged in with authorized scope, redirect immediately
  useEffect(() => {
    const existing = getWebsiteAdminSession();
    if (existing) {
      navigate('/admin', { replace: true });
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
      const res = await loginWebsiteAdmin(email.trim(), password);
      setIsLoading(false);

      if (res?.error) {
        setError(res.error);
      } else {
        const destination = location.state?.from?.pathname || '/admin';
        navigate(destination, { replace: true });
      }
    } catch (err) {
      setIsLoading(false);
      setError('An unexpected error occurred during CMS authentication.');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white text-gray-900 font-sans selection:bg-[#138601] selection:text-white">
      
      {/* LEFT HALF (50%): Department Photo with Brand Logo, Clean Overlay & Website CMS Text */}
      <div 
        className="md:w-1/2 min-h-[360px] md:min-h-screen relative flex flex-col justify-between p-8 sm:p-12 md:p-14 lg:p-16 bg-cover bg-center"
        style={{ backgroundImage: `url(${getCloudinaryAssetUrl('gallery_student_group') || studentPhoto})` }}
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
            Website CMS
          </span>
        </div>

        {/* Text bottom left */}
        <div className="relative z-10 max-w-lg space-y-2 mt-auto pt-16">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/40 border border-white/20 text-white text-xs font-semibold backdrop-blur-xs mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#4bd043]" />
            <span>Secure Database Authentication</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-snug tracking-tight">
            Main Website Content & Media Management System
          </h2>
          <p className="text-sm sm:text-base text-gray-200 font-normal">
            Department of Computer Science • Federal University of Technology, Owerri
          </p>
        </div>
      </div>

      {/* RIGHT HALF (50%): Minimalist, Clean White Form Matching Portal UI */}
      <div className="md:w-1/2 flex items-center justify-center p-6 sm:p-10 md:p-14 lg:p-20 bg-white">
        <div className="w-full max-w-md space-y-6">
          
          {/* Form Heading */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Sign In to Website CMS
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Enter your authorized administrative credentials to manage public news, gallery, and media assets.
            </p>
          </div>

          {/* Feedback & Error Alerts */}
          {error && (
            <div className="p-4 rounded bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
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
                  className="w-full pl-10 pr-4 py-3 text-sm rounded bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:outline-none focus:border-[#138601] focus:ring-1 focus:ring-[#138601] font-normal transition-all"
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
                  className="w-full pl-10 pr-11 py-3 text-sm rounded bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:outline-none focus:border-[#138601] focus:ring-1 focus:ring-[#138601] font-normal transition-all"
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

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-7 py-3 min-h-[44px] text-sm font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] rounded shadow-sm transition-colors cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? (
                <span>Authenticating with Database...</span>
              ) : (
                <>
                  <span>Sign In to Website CMS</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Standard Navigation Links */}
          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
            <a
              href={getAppUrls().adminHub}
              className="text-[#138601] hover:underline font-semibold flex items-center gap-1"
            >
              <span>Admin Command Center</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <a
              href={getAppUrls().website}
              className="hover:text-gray-800 transition-colors flex items-center gap-1"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Back to NACOS Website</span>
            </a>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
