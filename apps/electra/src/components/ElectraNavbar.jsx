import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LogOut, 
  ExternalLink,
  Menu,
  X
} from 'lucide-react';
import { getAppUrls } from '@nacos/config/urls';
import electraLogo from '../assets/electra-logo.png';

export default function ElectraNavbar({ voter, onDisconnect }) {
  const location = useLocation();
  const urls = getAppUrls();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auto-close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Close menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    if (mobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  // Nav links matching the main website font size, font weight and uppercase casing
  const navLinks = [
    { label: 'HOME', path: '/' },
    { label: 'VOTING', path: '/vote' },
    { label: 'LIVE RESULTS', path: '/results' },
    { label: 'MANIFESTOS', path: '/manifestos' },
    { label: 'GUIDELINES', path: '/guidelines' },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/' || location.pathname === '/electra';
    if (path === '/vote') return location.pathname === '/vote' || location.pathname === '/electra/vote' || location.pathname === '/ballot' || location.pathname === '/electra/ballot';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-xs relative">
      <div className="site-container relative z-50 w-full h-16 sm:h-20 flex items-center justify-between">
        
        {/* Brand: Official ELECTRA Logo */}
        <div className="flex items-center shrink-0">
          <Link to="/" className="flex items-center group py-1">
            <img 
              src={electraLogo} 
              alt="ELECTRA NACOS FUTO" 
              className="h-10 sm:h-12 w-auto object-contain transition-transform group-hover:scale-[1.02]" 
            />
          </Link>
        </div>

        {/* Desktop Nav Links - Matching main website navbar font size and font weight */}
        <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`text-sm font-semibold uppercase tracking-wide transition-colors py-1 cursor-pointer ${
                isActive(link.path)
                  ? 'text-[#138601] border-b-2 border-[#138601]'
                  : 'text-slate-700 hover:text-[#138601]'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Action Items Strip - Removed Vote Now & Accreditation buttons */}
        <div className="hidden sm:flex items-center gap-4 shrink-0">
          {/* Commission Admin Link */}
          <a
            href={urls.electraAdmin}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold uppercase tracking-wide text-slate-600 hover:text-[#138601] flex items-center gap-1.5 transition-colors px-2 py-1.5 rounded-[4px] hover:bg-slate-50"
            title="Open Election Commission Admin"
          >
            <span>Commission Admin</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {/* Voter Authentication Status (if already accredited) */}
          {voter && (
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 px-3 py-1.5 rounded-[4px] text-xs font-bold text-[#138601]">
                <div className="w-2 h-2 rounded-full bg-[#138601] animate-pulse" />
                <span className="font-mono">{voter.registrationNumber || voter.matricNumber || 'Accredited'}</span>
              </div>
              <button
                type="button"
                onClick={onDisconnect}
                className="p-1.5 rounded-[4px] text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                title="Disconnect voter session"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Mobile Header Elements */}
        <div className="flex items-center gap-2 lg:hidden">
          {voter && (
            <span className="text-[11px] font-mono font-bold text-[#138601] bg-green-50 px-2 py-1 rounded-[3px] border border-green-200">
              {voter.registrationNumber || voter.matricNumber || 'Accredited'}
            </span>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-[4px] text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* ── Sub-Navbar Official Commission Notice Bar ── */}
      <div className="relative z-50 w-full bg-[#0a1b2a] text-white py-2.5 px-4 text-center text-xs sm:text-sm font-semibold tracking-wide border-t border-slate-800">
        <span>Official NACOS FUTO Independent Student Electoral Commission Ballot Platform</span>
      </div>

      {/* Mobile Drawer Menu as an Overlay (does not push down page content) */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop Overlay */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 lg:hidden transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Floating Dropdown Overlay */}
          <div className="absolute top-full left-0 right-0 w-full bg-white/98 backdrop-blur-md border-b border-slate-200 px-4 pt-3 pb-6 space-y-3 shadow-2xl z-50 lg:hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-[calc(100vh-120px)] overflow-y-auto">
            <nav className="space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-[4px] text-sm font-semibold uppercase tracking-wide transition-colors ${
                    isActive(link.path)
                      ? 'bg-green-50 text-[#138601]'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{link.label}</span>
                </Link>
              ))}
            </nav>

            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <a
                href={urls.electraAdmin}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 text-sm font-semibold uppercase tracking-wide text-slate-600 hover:text-[#138601] flex items-center justify-between rounded-[4px] hover:bg-slate-50"
              >
                <span>Electoral Commission Admin</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href={urls.portal}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 text-sm font-semibold uppercase tracking-wide text-slate-600 hover:text-[#138601] flex items-center justify-between rounded-[4px] hover:bg-slate-50"
              >
                <span>NACOS Student Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
