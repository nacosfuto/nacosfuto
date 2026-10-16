import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../stores/authStore';
import { getAppUrls } from '@nacos/config/urls';
import upskillLogo from '../../assets/upskill-full-logo.png';
import { FiMenu, FiX, FiSearch, FiUser, FiRefreshCw, FiPlusCircle, FiBookOpen } from 'react-icons/fi';
import { CirclePower } from 'lucide-react';
import { BsSun, BsMoon } from 'react-icons/bs';

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, activeMode, switchMode, isCreatorApproved } = useAuthStore();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isApproved = isCreatorApproved ? isCreatorApproved() : false;

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/courses?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setMobileNavOpen(false);
    }
  };

  const displayName = user?.user_metadata?.full_name || user?.name || user?.email?.split('@')[0] || 'Scholar';
  const isNacosStudent = user?.isNacosStudent || user?.user_metadata?.is_nacos_student;
  const matricNo = user?.user_metadata?.matric_number || user?.registration_number;

  // Learner Navigation Links
  const learnerLinks = [
    { name: 'HOME', path: '/' },
    { name: 'COURSES', path: '/courses' },
    { name: 'RESOURCES', path: '/resources' },
    { name: 'WORKSHOPS', path: '/workshops' },
    { name: 'MY LEARNING', path: '/my-learning' },
    { name: 'TEACH', path: '/create-course' },
  ];

  // Creator Studio Navigation Links
  const creatorLinks = [
    { name: 'STUDIO OVERVIEW', path: '/create-course' },
    { name: 'MY COURSES', path: '/my-learning' },
    { name: 'WORKSHOPS', path: '/my-workshops' },
    { name: 'LEARNING CATALOG', path: '/courses' },
    { name: 'RESOURCES', path: '/resources' },
  ];

  const currentNavLinks = activeMode === 'creator' ? creatorLinks : learnerLinks;

  return (
    <header className="top-0 z-50 w-full transition-all duration-300 sticky shadow-xs border-b bg-white border-gray-200 text-[#000000]">
      <div className="flex items-center justify-between h-16 site-container w-full">
        {/* Left: Official NACOS FUTO Logo */}
        <div className="flex items-center flex-shrink-0 mr-4 lg:mr-6 gap-2">
          <Link to="/" className="flex items-center">
            <img
              src={upskillLogo}
              alt="NACOS FUTO Upskill Hub"
              className="h-8 md:h-10 w-auto object-contain transition-all duration-300 hidden sm:block"
            />
            <img
              src={upskillLogoMark}
              alt="NACOS FUTO Upskill Hub"
              className="h-8 w-auto object-contain sm:hidden"
            />
          </Link>

          {/* Active Mode Indicator Badge */}
          {activeMode === 'creator' && (
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 border border-amber-500/30 font-mono">
              Creator Studio
            </span>
          )}
        </div>

        {/* Center: Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-6 flex-1 justify-center">
          {currentNavLinks.map((link) => {
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`tracking-wide font-bold text-xs lg:text-sm uppercase transition-colors whitespace-nowrap ${
                  active
                    ? 'text-[#0056D2] border-b-2 border-[#0056D2] pb-0.5'
                    : 'text-[#000000] hover:text-[#0056D2]'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Right Utilities & Actions */}
        <div className="flex items-center gap-2 lg:gap-3">
          
          {/* Creator / Learner Mode Switcher (For authenticated users) */}
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => {
                if (activeMode === 'creator') {
                  switchMode('learner');
                  navigate('/');
                } else {
                  switchMode('creator');
                  navigate('/create-course');
                }
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-bold transition-all border border-[#0056D2]/40 hover:border-[#0056D2] bg-[#0056D2]/10 text-[#0056D2] dark:text-[#1d72fe] cursor-pointer"
              title="Toggle between Learner and Creator mode"
            >
              <FiRefreshCw className="w-3 h-3" />
              <span>{activeMode === 'creator' ? 'Learner View' : 'Creator Studio'}</span>
            </button>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded text-base transition-all cursor-pointer ${
              theme === 'light'
                ? 'text-[#07101e] bg-[#eef5ff] hover:bg-[#e4f7e2] hover:text-[#0056D2]'
                : 'text-yellow-300 bg-[#0d4603] hover:bg-[#0056D2]/40'
            }`}
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? <BsSun className="text-yellow-300" /> : <BsMoon className="text-[#07101e]" />}
          </button>

          {/* Search Bar on Desktop */}
          <form onSubmit={handleSearchSubmit} className="hidden lg:flex items-center relative w-40 xl:w-52">
            <FiSearch className="absolute left-3 text-gray-400 text-xs" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search catalog..."
              className="pl-8 pr-3 py-1.5 rounded w-full text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-[#0056D2] bg-gray-50 border border-gray-300 text-[#000000] placeholder-gray-400 font-medium"
            />
          </form>

          {/* User Profile or Sign In Buttons */}
          {isAuthenticated ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded bg-[#0056D2] flex items-center justify-center text-white text-xs font-bold">
                  {displayName.slice(0, 2).toUpperCase()}
                </div>
                <span className="hidden sm:inline text-xs font-bold text-[#000000] max-w-[100px] truncate">
                  {displayName}
                </span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-white border border-gray-200 rounded shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-xs font-bold text-[#000000] truncate">{displayName}</p>
                    <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-[#0056D2] border border-blue-200">
                        {activeMode === 'creator' ? 'Creator Mode' : 'Learner Mode'}
                      </span>
                      {isApproved && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Approved Creator
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Switch Mode Action in Profile Dropdown */}
                  <button
                    onClick={() => {
                      const next = activeMode === 'creator' ? 'learner' : 'creator';
                      switchMode(next);
                      setProfileOpen(false);
                      navigate(next === 'creator' ? '/create-course' : '/');
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-bold text-[#0056D2] hover:bg-blue-50 flex items-center justify-between cursor-pointer"
                  >
                    <span>Switch to {activeMode === 'creator' ? 'Learner Mode' : 'Creator Studio'}</span>
                    <FiRefreshCw className="w-3 h-3 text-[#0056D2]" />
                  </button>

                  <Link
                    to="/my-learning"
                    onClick={() => setProfileOpen(false)}
                    className="block px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-blue-50 hover:text-[#0056D2]"
                  >
                    My Learning
                  </Link>

                  <Link
                    to="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="block px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-blue-50 hover:text-[#0056D2]"
                  >
                    Scholar Profile
                  </Link>

                  <a
                    href={getAppUrls().portal}
                    target="_blank"
                    rel="noreferrer"
                    className="block px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-blue-50 hover:text-[#0056D2]"
                  >
                    Student Portal
                  </a>

                  <div className="pt-1 border-t border-gray-100">
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        logout();
                        navigate('/');
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 text-left transition-colors cursor-pointer"
                    >
                      <CirclePower size={14} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 border-2 border-[#0056D2] text-[#0056D2] hover:bg-[#0056D2] hover:text-white px-4 py-2 rounded font-black text-xs tracking-wider transition-all whitespace-nowrap uppercase shadow-xs"
              >
                <CirclePower size={13} />
                <span>Sign In</span>
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className={`md:hidden p-2 rounded cursor-pointer transition-colors ${
              theme === 'light'
                ? 'text-[#07101e] hover:bg-[#eef5ff]'
                : 'text-white hover:bg-white/10'
            }`}
            aria-label="Toggle mobile menu"
          >
            {mobileNavOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Drawer */}
      {mobileNavOpen && (
        <div className={`md:hidden border-t p-4 space-y-3 shadow-xl ${
          theme === 'light'
            ? 'bg-white border-gray-100 text-[#07101e]'
            : 'bg-[#07101e] border-[#0056D2]/30 text-white'
        }`}>
          {/* Mobile Drawer Brand Header */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <img src={upskillLogo} alt="Upskill Hub" className="h-7 w-auto object-contain" />
            <span className="text-[11px] font-bold text-[#0056D2] uppercase tracking-wide">Open Source</span>
          </div>

          {/* Mobile Search */}
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <FiSearch className="absolute left-3 top-3 text-gray-400 text-xs" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search catalog & courses..."
              className={`pl-9 pr-3 py-2 rounded w-full text-xs ${
                theme === 'light'
                  ? 'bg-gray-50 border border-gray-200 text-gray-900'
                  : 'bg-[#000000] border border-[#0056D2]/40 text-white'
              }`}
            />
          </form>

          {/* Mobile Mode Switcher */}
          {isAuthenticated && (
            <button
              onClick={() => {
                const next = activeMode === 'creator' ? 'learner' : 'creator';
                switchMode(next);
                setMobileNavOpen(false);
                navigate(next === 'creator' ? '/create-course' : '/');
              }}
              className="w-full py-2 px-3 rounded text-xs font-bold text-center border border-[#0056D2]/40 bg-[#0056D2]/10 text-[#0056D2] dark:text-[#1d72fe]"
            >
              Mode: {activeMode === 'creator' ? 'Creator Studio (Switch to Learner)' : 'Learner Mode (Switch to Studio)'}
            </button>
          )}

          <nav className="space-y-1">
            {currentNavLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileNavOpen(false)}
                className={`block px-3 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors ${
                  isActive(link.path)
                    ? 'bg-[#0056D2] text-white'
                    : theme === 'light'
                      ? 'text-[#07101e] hover:bg-[#eef5ff]'
                      : 'text-gray-200 hover:bg-[#000000]'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="pt-3 border-t border-gray-100 dark:border-[#0056D2]/20">
            {isAuthenticated ? (
              <button
                onClick={() => {
                  logout();
                  setMobileNavOpen(false);
                  navigate('/');
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded"
              >
                <CirclePower size={13} />
                <span>Sign Out</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileNavOpen(false)}
                  className="inline-flex items-center justify-center gap-1.5 py-2 text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-white bg-gray-100 dark:bg-[#000000] rounded"
                >
                  <CirclePower size={13} />
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/sign-up"
                  onClick={() => setMobileNavOpen(false)}
                  className="btn-primary text-xs text-center uppercase tracking-wider font-bold"
                  style={{ height: '36px', minHeight: '36px' }}
                >
                  Join Free
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
