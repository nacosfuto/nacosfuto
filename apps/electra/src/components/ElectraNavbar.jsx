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
  KeyRound,
  ShieldAlert
} from 'lucide-react';
import { getAppUrls } from '@nacos/config/urls';
import logoLight from '../assets/full-logo-light.png';

export default function ElectraNavbar({ voter, onOpenConnect, onDisconnect, onOpenBallot }) {
  const location = useLocation();
  const urls = getAppUrls();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Election Hub', path: '/' },
    { label: 'Candidate Statements', path: '/manifestos' },
    { label: 'Live Results', path: '/results' },
    { label: 'Contested Offices', path: '/contestants' },
    { label: 'Guidelines', path: '/guidelines' },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/' || location.pathname === '/electra';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200/90 shadow-xs">
      <div className="site-container w-full h-16 sm:h-18 flex items-center justify-between">
        
        {/* Brand: NACOS FUTO Logo + ELECTRA Brand arranged cleanly */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <Link to="/" className="flex items-center gap-3 group">
            <img 
              src={logoLight} 
              alt="NACOS FUTO Logo" 
              className="h-7 sm:h-8 md:h-9 w-auto object-contain transition-transform group-hover:scale-[1.02]" 
            />
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight font-display">
                ELECTRA
              </span>
              <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#F5F3FF] text-[#684BFD] border border-[#DDD6FE]">
                VOTER PORTAL
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Nav Links - Clean spacing & standard typography */}
        <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`text-xs sm:text-sm font-semibold transition-colors py-1 cursor-pointer ${
                isActive(link.path)
                  ? 'text-[#684BFD] border-b-2 border-[#684BFD] font-bold'
                  : 'text-slate-600 hover:text-[#684BFD]'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Action Items Strip */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          {/* Commission Admin Link */}
          <a
            href={urls.electraAdmin}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-slate-500 hover:text-[#684BFD] flex items-center gap-1 transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-50"
            title="Open Election Commission Admin"
          >
            <span>Commission Admin</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {/* Cast Ballot quick trigger */}
          {onOpenBallot && (
            <button
              type="button"
              onClick={onOpenBallot}
              className="hidden xl:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs cursor-pointer"
            >
              <Vote className="w-3.5 h-3.5" />
              <span>Cast Vote</span>
            </button>
          )}

          {/* Voter Authentication / Accreditation Status */}
          {voter ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="flex items-center gap-1.5 bg-[#F5F3FF] border border-[#DDD6FE] px-3 py-1.5 rounded-lg text-xs font-bold text-[#684BFD]">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono">{voter.registrationNumber || voter.reg_no || 'Accredited'}</span>
              </div>
              <button
                type="button"
                onClick={onDisconnect}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                title="Disconnect voter session"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenConnect}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-[#684BFD] hover:bg-[#5537F8] text-white transition-colors shadow-xs cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Voter Accreditation</span>
            </button>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex items-center gap-2 lg:hidden">
          {voter ? (
            <span className="text-[11px] font-mono font-bold text-[#684BFD] bg-[#F5F3FF] px-2 py-1 rounded border border-[#DDD6FE]">
              {voter.registrationNumber || 'Accredited'}
            </span>
          ) : (
            <button
              type="button"
              onClick={onOpenConnect}
              className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-[#684BFD] text-white cursor-pointer"
            >
              Sign In
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg animate-in slide-in-from-top-2">
          <nav className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                  isActive(link.path)
                    ? 'bg-[#F5F3FF] text-[#684BFD]'
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
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-[#684BFD] flex items-center justify-between rounded-lg hover:bg-slate-50"
            >
              <span>Electoral Commission Admin</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href={urls.portal}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-[#684BFD] flex items-center justify-between rounded-lg hover:bg-slate-50"
            >
              <span>NACOS Student Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
