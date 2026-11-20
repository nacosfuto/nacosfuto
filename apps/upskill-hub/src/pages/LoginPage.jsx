import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, ArrowRight, AlertCircle, ShieldCheck, CirclePower, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { authService } from '../services/authService';
import { supabase } from '@nacos/supabase';
import { getAppUrls } from '@nacos/config/urls';
import upskillLogo from '../assets/upskill-full-logo.png';

const LoginPage = ({ initialForgotPassword = false }) => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [isForgotPassword, setIsForgotPassword] = useState(initialForgotPassword);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isNacosAccountPrompt, setIsNacosAccountPrompt] = useState(false);

  // Password Recovery States
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsNacosAccountPrompt(false);

    if (!identifier.trim()) {
      setError('Please enter your Registration / Matric Number or Email.');
      return;
    }
    if (!password) {
      setError('Please enter your Password.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(identifier.trim(), password);
      if (result.success) {
        navigate('/my-learning');
      } else {
        setError(result.error || 'Authentication failed. Please check your credentials.');
        if (result.isNacosAccount) {
          setIsNacosAccountPrompt(true);
        }
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    if (!resetIdentifier.trim()) {
      setResetError('Please enter your Registration / Matric Number or registered Email address.');
      return;
    }

    setResetLoading(true);
    try {
      const cleanVal = resetIdentifier.trim();

      // 1. Check if it's a NACOS student registration number
      const nacosCheck = await authService.verifyNacosRegNumber(cleanVal);
      if (nacosCheck.exists) {
        const student = nacosCheck.student;
        const maskedEmail = student?.email 
          ? student.email.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.min(5, b.length)) + c)
          : 'your registered student email';
        setResetSuccess(
          `Account found for ${student?.full_name || student?.name || cleanVal}! Password reset instructions have been prepared for ${maskedEmail}. If you need immediate portal recovery, you may also use the main student portal.`
        );
        return;
      }

      // 2. Check if email belongs to NACOS database
      const emailCheck = await authService.checkEmailInNacos(cleanVal);
      if (emailCheck.exists) {
        setResetSuccess(
          `NACOS student account verified for ${emailCheck.student?.full_name || 'Scholar'}! Password reset instructions sent to ${cleanVal}.`
        );
        return;
      }

      // 3. Supabase Auth reset for external users
      try {
        if (supabase) {
          await supabase.auth.resetPasswordForEmail(cleanVal, {
            redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined,
          });
        }
      } catch (_) {}

      setResetSuccess(
        `If an account exists with "${cleanVal}", password reset instructions have been dispatched. Please check your inbox and spam folder.`
      );
    } catch (err) {
      setResetError(err.message || 'Failed to process password recovery request.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-4">
        
        {/* Official Brand Logo */}
        <Link to="/" className="inline-block group">
          <img 
            src={upskillLogo} 
            alt="NACOS FUTO Upskill Hub" 
            className="h-10 md:h-12 w-auto object-contain mx-auto group-hover:scale-105 transition-transform" 
          />
        </Link>

        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
          {isForgotPassword ? (
            <>Reset Your <span className="text-[#1d72fe]">Password</span></>
          ) : (
            <>Sign In to <span className="text-[#1d72fe]">Upskill Hub</span></>
          )}
        </h2>
        
        <p className="text-xs sm:text-sm text-blue-100/80">
          {isForgotPassword
            ? 'Enter your Registration Number or Email to recover access'
            : 'Open Source Learning Platform · Free for All Students & Tech Learners'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#07101e] py-8 px-6 sm:px-10 border border-[#0056D2]/30 rounded-2xl shadow-2xl space-y-6">
          
          {/* FORGOT PASSWORD FORM */}
          {isForgotPassword ? (
            <div className="space-y-4">
              {resetError && (
                <div className="p-4 rounded-xl text-xs bg-red-950/40 border border-red-500/40 text-red-200 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                  <p className="font-semibold">{resetError}</p>
                </div>
              )}

              {resetSuccess ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl text-xs bg-emerald-950/40 border border-emerald-500/50 text-emerald-200 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                    <p className="leading-relaxed">{resetSuccess}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setResetSuccess('');
                      setResetError('');
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#0056D2] hover:bg-[#0043aa] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Return to Sign In</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                      Reg Number or Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={resetIdentifier}
                        onChange={(e) => setResetIdentifier(e.target.value)}
                        placeholder="e.g. 2021123456 or student@nacosfuto.org"
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-[#000000] border border-[#0056D2]/40 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#0056D2]"
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      NACOS scholars can enter their departmental Matric number.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full py-3 px-4 rounded-xl bg-[#0056D2] hover:bg-[#0043aa] text-white text-xs sm:text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                  >
                    {resetLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Send Recovery Instructions</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(false);
                        setResetError('');
                        setResetSuccess('');
                      }}
                      className="text-xs text-gray-400 hover:text-white inline-flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Sign In</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* STANDARD SIGN IN FORM */
            <>
              {error && (
                <div className={`p-4 rounded-xl text-xs flex items-start gap-2.5 border ${
                  isNacosAccountPrompt 
                    ? 'bg-amber-950/40 border-amber-500/50 text-amber-200' 
                    : 'bg-red-950/40 border-red-500/40 text-red-200'
                }`}>
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <div className="space-y-1">
                    <p className="font-semibold">{error}</p>
                    {isNacosAccountPrompt && (
                      <p className="text-[11px] text-amber-300/80">
                        Tip: NACOS students can use their portal credentials or click Forgot Password to recover.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Reg Number or Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. 2021123456 or student@nacosfuto.org"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-[#000000] border border-[#0056D2]/40 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#0056D2]"
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    NACOS scholars can use their Matric / Reg number.
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setResetError('');
                        setResetSuccess('');
                        setResetIdentifier(identifier);
                        setIsForgotPassword(true);
                      }}
                      className="text-[11px] text-[#1d72fe] hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-[#000000] border border-[#0056D2]/40 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#0056D2]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-[#0056D2] hover:bg-[#0043aa] text-white text-xs sm:text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign In to Learning Dashboard</span>
                      <CirclePower className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="pt-4 border-t border-[#0056D2]/20 text-center space-y-3 text-xs text-gray-400">
                <p>
                  New learner or external student?{' '}
                  <Link to="/sign-up" className="font-bold text-[#1d72fe] hover:underline">
                    Create Free Account
                  </Link>
                </p>
                
                <p className="text-[11px]">
                  Want to visit the main student portal?{' '}
                  <a href={getAppUrls().portal} target="_blank" rel="noreferrer" className="text-gray-300 hover:text-white underline">
                    Go to NACOS Portal
                  </a>
                </p>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
