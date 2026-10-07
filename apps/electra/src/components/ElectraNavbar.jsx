import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Vote, 
  CheckCircle2, 
  UserCheck, 
  FileText, 
  BarChart3, 
  ShieldCheck, 
  LogOut, 
  ExternalLink,
  ChevronDown,
  Menu,
  X,
  Sun,
  Moon
} from 'lucide-react';
import { getAppUrls } from '@nacos/config/urls';
import { useTheme } from '../context/ThemeContext';

export default function ElectraNavbar({ voter, onOpenConnect, onDisconnect }) {
  const location = useLocation();
  const urls = getAppUrls();
  const { isDark, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Live Polls', path: '/' },
    { label: 'Contestants', path: '/contestants' },
    { label: 'Manifestos', path: '/manifestos' },
    { label: 'Live Results', path: '/results' },
    { label: 'Guidelines', path: '/guidelines' },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-[#0c0d0e]/90 backdrop-blur-xl border-b border-gray-200 dark:border-[#22252a]/80 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-[#c6ff00] text-black flex items-center justify-center font-black shadow-lg shadow-[#c6ff00]/25 group-hover:scale-105 transition-transform">
              <Vote className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-2xl tracking-tight text-gray-950 dark:text-white font-display">
                  ELECTRA
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-100 dark:bg-[#22252a] text-gray-800 dark:text-[#c6ff00] border border-gray-200 dark:border-[#c6ff00]/30">
                  NACOS FUTO
                </span>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 -mt-0.5 tracking-wide">
                Decentralized Campus Ballot Engine
              </p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-semibold transition-colors ${
                  isActive(link.path)
                    ? 'text-black dark:text-[#c6ff00] font-bold'
                    : 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Action Items */}
          <div className="hidden sm:flex items-center gap-3.5">
            
            {/* Theme Toggle Switch */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              className="p-2.5 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-[#161719] dark:hover:bg-[#202227] text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-[#c6ff00] border border-gray-200 dark:border-[#232529] transition-all cursor-pointer flex items-center justify-center"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-[#c6ff00]" />
              ) : (
                <Moon className="w-4 h-4 text-gray-700" />
              )}
            </button>

            {/* Voter Status / Connect Action */}
            {voter ? (
              <div className="flex items-center gap-3 bg-gray-100 dark:bg-[#161719] border border-gray-200 dark:border-[#232529] p-1.5 pr-4 rounded-full">
                <div className="w-8 h-8 rounded-full bg-[#c6ff00] text-black flex items-center justify-center font-bold text-xs">
                  {voter.name?.charAt(0) || 'V'}
                </div>
                <div className="text-left text-xs">
                  <span className="font-bold text-gray-900 dark:text-white block leading-tight">{voter.matricNumber}</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 inline" /> Verified Scholar
                  </span>
                </div>
                <button
                  onClick={onDisconnect}
                  title="Disconnect voter session"
                  className="ml-2 text-gray-400 hover:text-red-500 transition-colors p-1"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenConnect}
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full text-sm font-black text-black bg-[#c6ff00] hover:bg-[#b2e600] transition-all transform active:scale-95 shadow-lg shadow-[#c6ff00]/25 cursor-pointer"
              >
                <UserCheck className="w-4 h-4 stroke-[2.5]" />
                <span>Connect NACOS Account</span>
              </button>
            )}

            {/* Commission Console Link */}
            <a
              href={urls.electraAdmin}
              className="text-xs text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors border border-gray-200 dark:border-[#22252a] px-3.5 py-2.5 rounded-full bg-white dark:bg-transparent"
            >
              Commission Console
            </a>
          </div>

          {/* Mobile Actions */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded-xl bg-gray-100 dark:bg-[#161719] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#23252a]"
            >
              {isDark ? <Sun className="w-5 h-5 text-[#c6ff00]" /> : <Moon className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-gray-100 dark:bg-[#161719] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#23252a]"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-white dark:bg-[#0c0d0e] border-b border-gray-200 dark:border-[#22252a] px-4 pt-3 pb-6 space-y-4">
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3.5 py-2.5 rounded-2xl text-sm font-semibold ${
                  isActive(link.path)
                    ? 'bg-gray-100 dark:bg-[#161719] text-black dark:text-[#c6ff00] font-bold'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="pt-3 border-t border-gray-200 dark:border-[#22252a]">
            {voter ? (
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-[#161719] border border-gray-200 dark:border-[#232529]">
                <div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">{voter.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{voter.matricNumber} • {voter.level}</div>
                </div>
                <button
                  onClick={() => { onDisconnect(); setMobileMenuOpen(false); }}
                  className="text-red-500 text-xs font-semibold"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => { onOpenConnect(); setMobileMenuOpen(false); }}
                className="w-full py-3 rounded-full text-center font-black text-black bg-[#c6ff00] text-sm shadow-md"
              >
                Connect NACOS Account
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
