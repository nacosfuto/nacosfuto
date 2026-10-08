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
  KeyRound
} from 'lucide-react';
import { getAppUrls } from '@nacos/config/urls';

export default function ElectraNavbar({ voter, onOpenConnect, onDisconnect }) {
  const location = useLocation();
  const urls = getAppUrls();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Live Polls', path: '/' },
    { label: 'Contestants', path: '/contestants' },
    { label: 'Manifestos', path: '/manifestos' },
    { label: 'Audit Results', path: '/results' },
    { label: 'Guidelines', path: '/guidelines' },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/' || location.pathname === '/electra';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Brand matching Eligo Blu / Electra design */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-[#684BFD] text-white flex items-center justify-center font-black shadow-lg shadow-[#684BFD]/25 group-hover:scale-105 transition-transform">
              <Vote className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-2xl tracking-tight text-slate-900 font-display">
                  ELECTRA
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#F5F3FF] text-[#684BFD] border border-[#DDD6FE]">
                  NACOS FUTO
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium -mt-0.5 tracking-wide">
                E-Voting & Democratic Ballot Engine
              </p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-bold transition-colors ${
                  isActive(link.path)
                    ? 'text-[#684BFD] border-b-2 border-[#684BFD] pb-1'
                    : 'text-slate-600 hover:text-[#684BFD]'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Action Items */}
          <div className="hidden sm:flex items-center gap-3.5">
            {/* Student Portal Link */}
            <a
              href={urls.portal}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-slate-500 hover:text-[#684BFD] flex items-center gap-1 transition-colors px-2 py-1"
            >
              <span>Student Portal</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            {/* Voter Status / Connect Action */}
            {voter ? (
              <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                <div className="flex items-center gap-2 bg-[#F5F3FF] border border-[#DDD6FE] px-3 py-1.5 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-xs font-bold text-[#684BFD]">
                    {voter.registrationNumber || voter.reg_no || 'Voter Active'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onDisconnect}
                  title="Disconnect Voter Session"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenConnect}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#684BFD] hover:bg-[#5537F8] text-white text-xs font-bold shadow-md shadow-[#684BFD]/25 transition-all transform hover:scale-102 active:scale-98 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Insert Code / Connect</span>
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-700 bg-slate-100 border border-slate-200"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
          <nav className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                  isActive(link.path)
                    ? 'bg-[#F5F3FF] text-[#684BFD]'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
            {voter ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#F5F3FF] border border-[#DDD6FE]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-xs font-bold text-[#684BFD]">
                    {voter.registrationNumber || voter.reg_no}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onDisconnect();
                    setMobileMenuOpen(false);
                  }}
                  className="text-xs font-bold text-red-600 hover:underline"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onOpenConnect();
                  setMobileMenuOpen(false);
                }}
                className="w-full py-3 rounded-xl bg-[#684BFD] text-white text-xs font-bold text-center shadow-md shadow-[#684BFD]/25"
              >
                Insert Code / Connect Voter
              </button>
            )}

            <a
              href={urls.portal}
              target="_blank"
              rel="noreferrer"
              className="text-center text-xs font-medium text-slate-500 py-1"
            >
              Main Student Portal →
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
