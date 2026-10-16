import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, ArrowRight, AlertCircle, ShieldCheck, CirclePower } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { getAppUrls } from '@nacos/config/urls';
import upskillLogo from '../assets/upskill-full-logo.png';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isNacosAccountPrompt, setIsNacosAccountPrompt] = useState(false);

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
          Sign In to <span className="text-[#1d72fe]">Upskill Hub</span>
        </h2>
        
        <p className="text-xs sm:text-sm text-blue-100/80">
          Open Source Learning Platform · Free for All Students & Tech Learners
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#07101e] py-8 px-6 sm:px-10 border border-[#0056D2]/30 rounded-2xl shadow-2xl space-y-6">
          
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
                    Tip: Use your standard student portal password or visit the NACOS portal to reset it.
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
                <a
                  href={`${getAppUrls().portal}/forgot-password`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-[#1d72fe] hover:underline"
                >
                  Forgot Password?
                </a>
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

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
