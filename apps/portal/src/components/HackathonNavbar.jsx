import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, ArrowRight, Home, CirclePower } from 'lucide-react';
import { BsSun, BsMoon } from 'react-icons/bs';
import { useTheme } from '../context/ThemeContext';
import logoDark from '../assets/full-logo-dark.png';
import logoLight from '../assets/full-logo-light.png';

const HackathonNavbar = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <header className={`sticky top-0 z-50 w-full border-b transition-all duration-200 ${
      isDark ? 'bg-[#083002] border-[#138601]/30 text-white shadow-md' : 'bg-white border-[#138601]/15 text-[#083002] shadow-sm'
    }`}>
      <div className="site-container h-16 flex items-center justify-between">
        
        {/* Left: Brand / Logo */}
        <div className="flex items-center space-x-3">
          <Link to="/" className="flex items-center space-x-3 group">
            <img src={isDark ? logoDark : logoLight} alt="NACOS FUTO Logo" className="h-8 md:h-9 w-auto object-contain" />
            <div className="hidden sm:block border-l border-[#138601]/30 pl-3">
              <span className="text-[10px] font-bold tracking-widest text-[#138601] dark:text-[#4bd043] uppercase block leading-none">
                BUILDX Hackathon
              </span>
              <span className={`text-[11px] font-semibold block leading-tight ${isDark ? 'text-green-200/80' : 'text-[#083002]/80'}`}>
                NACOS National Hub
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Navigation Links */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-semibold">
          <Link 
            to="/dashboard" 
            className={`${isDark ? 'text-green-100 hover:text-white' : 'text-[#083002] hover:text-[#138601]'} flex items-center gap-1.5 transition-colors`}
          >
            <Home className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
            Student Hub
          </Link>
          <a 
            href="#about" 
            className={`${isDark ? 'text-green-100 hover:text-[#4bd043]' : 'text-[#083002] hover:text-[#138601]'} transition-colors`}
          >
            About
          </a>
          <a 
            href="#prizes" 
            className={`${isDark ? 'text-green-100 hover:text-[#4bd043]' : 'text-[#083002] hover:text-[#138601]'} transition-colors`}
          >
            Prizes
          </a>
          <a 
            href="#tracks" 
            className={`${isDark ? 'text-green-100 hover:text-[#4bd043]' : 'text-[#083002] hover:text-[#138601]'} transition-colors`}
          >
            Tracks
          </a>
          <a 
            href="#timeline" 
            className={`${isDark ? 'text-green-100 hover:text-[#4bd043]' : 'text-[#083002] hover:text-[#138601]'} transition-colors`}
          >
            Timeline
          </a>
          <a 
            href="#rules" 
            className={`${isDark ? 'text-green-100 hover:text-[#4bd043]' : 'text-[#083002] hover:text-[#138601]'} transition-colors`}
          >
            Rules
          </a>
        </nav>

        {/* Right: CTA Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded text-lg transition-all cursor-pointer ${
              theme === 'light'
                ? 'text-[#083002] bg-[#f2fbf1] hover:bg-[#e4f7e2] hover:text-[#138601]'
                : 'text-yellow-300 bg-[#0d4603] hover:bg-[#138601]/40'
            }`}
            aria-label="Toggle dark mode"
          >
            {isDark ? <BsSun className="text-yellow-300" /> : <BsMoon className="text-[#083002]" />}
          </button>

          <Link
            to="/login"
            className={`hidden sm:inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded border transition-colors ${
              isDark ? 'text-green-100 hover:text-white bg-[#041801] hover:bg-[#083002] border-[#138601]/30' : 'text-[#083002] hover:text-[#138601] bg-[#f2fbf1] border-[#138601]/20'
            }`}
          >
            <CirclePower className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </Link>
          <Link
            to="/hackathons/BuildXNACOS/apply"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs md:text-sm font-bold text-white bg-[#138601] hover:bg-[#0f6c01] rounded shadow-md transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>Apply Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>
    </header>
  );
};

export default HackathonNavbar;
