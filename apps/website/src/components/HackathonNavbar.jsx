import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import hackathonLogoDark from '../assets/hackathon-logo-dark.png';
import hackathonLogoLight from '../assets/hackathon-logo-light.png';

const HackathonNavbar = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <header className={`sticky top-0 z-50 w-full border-b transition-all duration-200 ${
      isDark ? 'bg-[#083002] border-[#138601]/30 text-white shadow-md' : 'bg-white border-[#138601]/15 text-[#083002] shadow-sm'
    }`}>
      <div className="site-container h-16 flex items-center justify-between">
        
        {/* Left: Logo returns to Hackathon Home */}
        <Link to="/hackathons/the-agentic-build" className="flex items-center group">
          <img 
            src={isDark ? hackathonLogoDark : hackathonLogoLight} 
            alt="The Agentic Build - Office of the Director of ICT" 
            className="h-9 md:h-11 w-auto object-contain transition-transform group-hover:scale-[1.02]" 
          />
        </Link>

        {/* Right: Register Button only */}
        <div>
          <Link
            to="/hackathons/the-agentic-build/apply"
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2 text-xs md:text-sm font-bold text-white bg-gradient-to-r from-[#138601] to-[#0f6c01] hover:from-[#169a01] hover:to-[#138601] rounded shadow-md transition-all transform hover:-translate-y-0.5 active:translate-y-0 border border-green-400/30"
          >
            <span>Register</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>
    </header>
  );
};

export default HackathonNavbar;
