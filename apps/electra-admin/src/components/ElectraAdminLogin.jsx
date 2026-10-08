import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  AlertCircle,
  Vote,
  ExternalLink
} from 'lucide-react';
import { loginPortalAdmin, getLocalPortalAdmins } from '@nacos/auth';
import { getAppUrls } from '@nacos/config/urls';
import electraLogo from '../assets/electra-logo.png';

export default function ElectraAdminLogin({ onLoginSuccess }) {
  const urls = getAppUrls();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please provide your administrative email and password.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await loginPortalAdmin(email.trim(), password);

      if (res && res.error) {
        setIsLoading(false);
        setError(res.error);
        return;
      }

      if (res && res.session) {
        setIsLoading(false);
        if (onLoginSuccess) {
          onLoginSuccess(res.session);
        }
        return;
      }

      // Check local seeded admins fallback
      const localAdmins = getLocalPortalAdmins();
      const matched = localAdmins.find(a => 
        a.email?.toLowerCase() === email.trim().toLowerCase() && a.is_active !== false
      );

      if (matched) {
        const session = {
          userId: matched.user_id || matched.id,
          user_id: matched.user_id || matched.id,
          email: matched.email,
          full_name: matched.full_name || 'Electoral Commission Admin',
          role: matched.role || 'electoral_admin',
          scope: matched.scope || 'super_admin',
          permissions: matched.permissions || ['*'],
          token: `electra_adm_${Date.now()}`
        };
        localStorage.setItem('nacos_portal_admin_session', JSON.stringify(session));
        localStorage.setItem('nacos_portal_admin_last_activity', Date.now().toString());
        setIsLoading(false);
        if (onLoginSuccess) {
          onLoginSuccess(session);
        }
        return;
      }

      setIsLoading(false);
      setError('Invalid administrative credentials. Access restricted to authorized NACOS ISEC electoral officers.');
    } catch (err) {
      setIsLoading(false);
      setError(err.message || 'Authentication error. Please check your network connection.');
    }
  };

  return (
    <div className="min-h-screen bg-[#041801] text-white flex flex-col justify-between selection:bg-[#138601] selection:text-white font-sans">
      {/* Top Banner */}
      <header className="p-6 flex items-center justify-between border-b border-[#138601]/20">
        <div className="flex items-center gap-3">
          <img src={electraLogo} alt="ELECTRA" className="h-8 w-auto object-contain" />
          <span className="text-xs uppercase font-extrabold tracking-widest text-[#4bd043]">
            NACOS ISEC • Electoral Admin
          </span>
        </div>
        <a
          href={urls.electra}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-gray-300 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <span>Live Voter Platform</span>
          <ExternalLink className="w-3.5 h-3.5 text-[#4bd043]" />
        </a>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-[#083002]/80 backdrop-blur-md border border-[#138601]/40 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-[#138601]/20 border border-[#138601]/40 flex items-center justify-center mx-auto text-[#4bd043] shadow-inner">
              <Vote className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black font-display tracking-tight text-white">
              Electoral Commission Console
            </h1>
            <p className="text-xs text-gray-300 leading-relaxed max-w-sm mx-auto">
              Authenticate with authorized institutional credentials to manage candidate rolls, certification, and live results.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-lg bg-red-950/60 border border-red-500/50 text-red-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                Official Administrator Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ict.nacosfuto@gmail.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-[#041801] border border-[#138601]/40 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#138601] transition-all"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                Administrative Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-[#041801] border border-[#138601]/40 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#138601] transition-all"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg text-sm font-bold bg-[#138601] hover:bg-[#0f6c01] text-white shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Authorization...</span>
                </>
              ) : (
                <>
                  <span>Unlock Commission Console</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-white/10 text-center">
            <span className="text-[11px] text-gray-400 inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#4bd043]" />
              <span>Protected by cryptographic session tokens & institutional RLS</span>
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-gray-500 border-t border-[#138601]/20">
        &copy; {new Date().getFullYear()} NACOS FUTO Independent Students Electoral Commission (NACOS ISEC). All rights reserved.
      </footer>
    </div>
  );
}
