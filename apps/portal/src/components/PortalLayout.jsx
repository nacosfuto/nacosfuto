import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  CreditCard,
  BookOpen,
  User,
  Users,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  Globe,
  Image as ImageIcon,
  Sun,
  Moon,
  Bell,
  Settings,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { hashPassword, isLocalEnvironment } from '@nacos/supabase/auth';
import { supabase, fetchActivePopupNotice } from '@nacos/supabase';
import { getAppUrls } from '@nacos/config/urls';
import NoticeModal from './NoticeModal';
import logoDark from '../assets/full-logo-dark.png';
import logoLight from '../assets/full-logo-light.png';

const PortalLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  
  // Off-canvas navigation sidebar drawer state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar drawer on route navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const [user, setUser] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('nacos_user');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) { }
      }
    }
    return {};
  });

  useEffect(() => {
    const handleUserUpdate = () => {
      const stored = localStorage.getItem('nacos_user');
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
    };

    handleUserUpdate();
    window.addEventListener('storage', handleUserUpdate);
    window.addEventListener('nacos_user_updated', handleUserUpdate);
    return () => {
      window.removeEventListener('storage', handleUserUpdate);
      window.removeEventListener('nacos_user_updated', handleUserUpdate);
    };
  }, []);

  // Dropdown & Modal states
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activePopupNotice, setActivePopupNotice] = useState(null);

  // Auto-check and trigger urgent pop-up notice for student on login / session mount
  useEffect(() => {
    let isMounted = true;
    const checkPopup = async () => {
      try {
        const studentLevel = user?.level || user?.currentLevel || user?.current_level;
        const notice = await fetchActivePopupNotice({ level: studentLevel });
        if (isMounted && notice) {
          setActivePopupNotice(notice);
        }
      } catch (err) {
        console.warn('Popup notice check error:', err);
      }
    };
    checkPopup();
    return () => { isMounted = false; };
  }, [user?.level, user?.id, user?.current_level, user?.currentLevel]);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const profileRef = useRef(null);
  const notifRef = useRef(null);



  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1-Hour Inactivity Watchdog & Auto-Logout
  useEffect(() => {
    const ONE_HOUR_MS = 60 * 60 * 1000;
    const now = Date.now();

    // Check on initial page load / route change
    const storedUser = localStorage.getItem('nacos_user');
    if (!storedUser) {
      navigate('/login');
      return;
    }

    const lastActivity = parseInt(localStorage.getItem('nacos_last_activity') || '0', 10);
    if (lastActivity && (now - lastActivity >= ONE_HOUR_MS)) {
      // Inactivity exceeded 1 hour! Log out immediately!
      localStorage.removeItem('nacos_user');
      localStorage.removeItem('nacos_last_activity');
      window.dispatchEvent(new Event('nacos_user_logged_out'));
      navigate('/login?reason=inactivity', { replace: true });
      return;
    }

    // Session is valid: initialize/refresh activity timestamp
    localStorage.setItem('nacos_last_activity', now.toString());

    let lastRecorded = now;
    // Record user activity (throttled to once every 10 seconds)
    const recordActivity = () => {
      const current = Date.now();
      if (current - lastRecorded > 10000) {
        lastRecorded = current;
        localStorage.setItem('nacos_last_activity', current.toString());
      }
    };

    // Check periodically if inactivity has exceeded 1 hour
    const checkInactivity = () => {
      const u = localStorage.getItem('nacos_user');
      if (!u) return;

      const act = parseInt(localStorage.getItem('nacos_last_activity') || '0', 10);
      if (act && (Date.now() - act >= ONE_HOUR_MS)) {
        localStorage.removeItem('nacos_user');
        localStorage.removeItem('nacos_last_activity');
        window.dispatchEvent(new Event('nacos_user_logged_out'));
        navigate('/login?reason=inactivity', { replace: true });
      }
    };

    const intervalId = setInterval(checkInactivity, 15000);
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach(ev => window.addEventListener(ev, recordActivity, { passive: true }));

    return () => {
      clearInterval(intervalId);
      events.forEach(ev => window.removeEventListener(ev, recordActivity));
    };
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('nacos_user');
    localStorage.removeItem('nacos_last_activity');
    navigate('/login');
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const studentsRaw = localStorage.getItem('nacos_students_db');
      const regNo = (user.regNo || user.matric || user.registration_number || '').toUpperCase();
      let students = [];
      if (studentsRaw) {
        try {
          students = JSON.parse(studentsRaw);
        } catch (err) { }
      }

      const studentIdx = students.findIndex(s =>
        (s.registration_number && s.registration_number.toUpperCase() === regNo) ||
        (s.matric && s.matric.toUpperCase() === regNo)
      );

      const currentHash = await hashPassword(currentPassword);
      const isLocal = isLocalEnvironment();
      const isDefault = isLocal && (currentPassword === 'password' || currentPassword === 'admin123');

      // Verify current password against active session or local storage
      const existingHash = user.password_hash || (studentIdx >= 0 ? students[studentIdx].password_hash : null);
      if (existingHash && existingHash !== currentHash && !isDefault) {
        setPasswordError('Current password is incorrect.');
        setIsChangingPassword(false);
        return;
      }

      const newHash = await hashPassword(newPassword);

      // 1. Update remote Supabase profile if available
      try {
        if (supabase && (regNo || user.id)) {
          const query = user.id
            ? supabase.from('profiles').update({ password_hash: newHash, updated_at: new Date().toISOString() }).eq('id', user.id)
            : supabase.from('profiles').update({ password_hash: newHash, updated_at: new Date().toISOString() }).eq('registration_number', regNo);
          await query;
        }
      } catch (dbErr) {
        console.warn('Could not sync password update to Supabase:', dbErr);
      }

      // 2. Update local storage cache
      if (studentIdx >= 0) {
        students[studentIdx].password_hash = newHash;
        students[studentIdx].updated_at = new Date().toISOString();
        localStorage.setItem('nacos_students_db', JSON.stringify(students));
      }

      // Update active user session
      const updatedUser = {
        ...user,
        password_hash: newHash
      };
      localStorage.setItem('nacos_user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      setPasswordSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsSettingsOpen(false);
        setPasswordSuccess('');
      }, 1500);
    } catch (err) {
      setPasswordError('Failed to change password. Please try again.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const navItems = [
    { label: 'Dashboard Overview', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Notices & Bulletin', path: '/notices', icon: Bell },
    { label: 'Dues & Clearance', path: '/dues', icon: CreditCard },
    { label: 'ID Card Application', path: '/id-card', icon: ShieldCheck },
    { label: 'Academic Results', path: '/results', icon: GraduationCap },
    { label: 'Registered Courses', path: '/courses', icon: BookOpen },
    { label: 'Student Profile', path: '/profile', icon: User }
  ];

  const isItemActive = (path) => {
    if (path === '/courses') {
      return location.pathname === '/courses' || location.pathname === '/resources' || location.pathname === '/resource-hub';
    }
    return location.pathname === path;
  };

  const isDark = theme === 'dark';

  const rawName = (user.fullName || user.full_name || user.name || `${user.firstName || ''} ${user.lastName || ''}`).trim();
  const displayName = rawName.toLowerCase().includes('president') ? 'Emmanuel Irechukwu' : (rawName || 'Student Profile');
  const displayMatric = user.regNo || user.matric || user.registration_number || user.studentId || '20241429481';
  const avatarUrl = user.avatar || user.profile_photo_url || user.avatar_url;
  const displayInitials = displayName
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'ST';
  const displayFirstName = (user.firstName && !user.firstName.toLowerCase().includes('president'))
    ? user.firstName
    : (user.first_name && !user.first_name.toLowerCase().includes('president'))
      ? user.first_name
      : displayName.split(' ')[0];

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#041801] text-gray-900 dark:text-white flex flex-col font-sans selection:bg-[#138601] selection:text-white">

      {/* Top Header */}
      <header className={`sticky top-0 z-40 w-full border-b print:hidden ${isDark
          ? 'bg-[#083002] border-[#138601]/25 text-white'
          : 'bg-white border-gray-200 text-gray-900'
        }`}>
        <div className="site-container h-16 flex items-center justify-between">

          {/* Left: Hamburger Icon (comes BEFORE the logo) and Logo */}
          <div className="flex items-center gap-3">
            {/* Hamburger / Close (X) Toggle Button - stays at the same position */}
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-2 rounded cursor-pointer transition-colors relative w-9 h-9 flex items-center justify-center border shrink-0 ${
                isDark
                  ? 'text-gray-200 hover:text-white bg-[#041801] hover:bg-[#138601]/20 border-[#138601]/30 active:scale-95'
                  : 'text-gray-700 bg-gray-100 hover:bg-gray-200 border-gray-200 active:scale-95'
              }`}
              title={sidebarOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-label={sidebarOpen ? "Close navigation menu" : "Open navigation menu"}
            >
              <Menu className={`w-4.5 h-4.5 absolute transition-all duration-200 ${sidebarOpen ? 'opacity-0 scale-75 rotate-90' : 'opacity-100 scale-100 rotate-0'}`} />
              <X className={`w-4.5 h-4.5 absolute transition-all duration-200 ${sidebarOpen ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-75 -rotate-90'}`} />
            </button>

            <Link to="/dashboard" className="flex items-center shrink-0">
              <img src={isDark ? logoDark : logoLight} alt="NACOS FUTO Logo" className="h-8 md:h-9 w-auto object-contain" />
            </Link>
          </div>

          {/* Right actions: Notifications, Settings, Theme toggle, Profile Avatar, and Mobile Menu Toggle */}
          <div className="flex items-center space-x-2 sm:space-x-3">

            {/* Notification Bell Icon & Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setProfileDropdownOpen(false);
                }}
                className={`p-2 rounded text-gray-600 dark:text-green-300 hover:bg-gray-100 dark:hover:bg-[#041801] border border-transparent dark:border-[#138601]/20 transition-colors relative cursor-pointer ${notificationsOpen ? 'bg-gray-100 dark:bg-[#041801]' : ''
                  }`}
                aria-label="View notifications"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#138601] ring-2 ring-white dark:ring-[#083002]"></span>
              </button>

              {/* Notifications Dropdown Menu */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 shadow-xl z-50 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2.5 border-b border-gray-100 dark:border-[#138601]/20 flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Notifications</h4>
                    <span className="text-[10px] font-semibold text-[#138601] dark:text-[#4bd043] bg-green-50 dark:bg-[#138601]/20 px-2 py-0.5 rounded">2 New</span>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-[#138601]/10 text-xs max-h-72 overflow-y-auto">
                    <div className="p-3 hover:bg-gray-50 dark:hover:bg-[#041801]/60 transition-colors">
                      <p className="font-semibold text-gray-900 dark:text-white">Academic Appraisal Open</p>
                      <p className="text-gray-500 dark:text-green-200/70 text-[11px] mt-0.5">Please complete your semester appraisal form.</p>
                      <span className="text-[10px] text-gray-400 mt-1 block">10 mins ago</span>
                    </div>
                    <div className="p-3 hover:bg-gray-50 dark:hover:bg-[#041801]/60 transition-colors">
                      <p className="font-semibold text-gray-900 dark:text-white">ID Card Ready for Verification</p>
                      <p className="text-gray-500 dark:text-green-200/70 text-[11px] mt-0.5">Your official digital student ID card is available.</p>
                      <span className="text-[10px] text-gray-400 mt-1 block">1 hour ago</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar & Interactive Dropdown Menu */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => {
                  setProfileDropdownOpen(!profileDropdownOpen);
                  setNotificationsOpen(false);
                }}
                className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-[#041801] border border-gray-200/80 dark:border-[#138601]/30 transition-all cursor-pointer group"
                title="User Profile Menu"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-[#138601] flex items-center justify-center text-white font-bold text-xs ring-2 ring-[#138601]/30 shrink-0">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    displayInitials
                  )}
                </div>
                <span className="hidden sm:inline text-xs font-semibold text-gray-800 dark:text-white max-w-[120px] truncate">
                  {displayFirstName}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 group-hover:text-gray-700 dark:text-green-300 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 shadow-xl z-50 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* User Details Header */}
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-[#138601]/20">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                      {displayName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-green-200/80 font-mono mt-0.5 truncate">
                      {displayMatric}
                    </p>
                  </div>

                  {/* Dropdown Navigation Links */}
                  <div className="py-1">
                    <Link
                      to="/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#041801]/60 hover:text-[#138601] dark:hover:text-[#4bd043] transition-colors"
                    >
                      <User className="w-4 h-4 text-gray-400 dark:text-green-400" />
                      <span>Student Profile</span>
                    </Link>

                    {/* Manage Password / Settings inside Profile Dropdown */}
                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setIsSettingsOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#041801]/60 hover:text-[#138601] dark:hover:text-[#4bd043] transition-colors text-left cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-gray-400 dark:text-green-400" />
                      <span>Manage Password & Security</span>
                    </button>

                    {/* Dark Mode Toggle inside Profile Dropdown */}
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#041801]/60 hover:text-[#138601] dark:hover:text-[#4bd043] transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        {isDark ? (
                          <Sun className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Moon className="w-4 h-4 text-gray-500 dark:text-green-400" />
                        )}
                        <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium bg-gray-100 dark:bg-[#041801] px-2 py-0.5 rounded-md">
                        {isDark ? 'Active' : 'Off'}
                      </span>
                    </button>

                    <a
                      href={getAppUrls().website}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#041801]/60 hover:text-[#138601] dark:hover:text-[#4bd043] transition-colors"
                    >
                      <Globe className="w-4 h-4 text-gray-400 dark:text-green-400" />
                      <span>Main Website</span>
                    </a>

                    <a
                      href={getAppUrls().adminHub}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-green-700 dark:text-[#4bd043] hover:bg-gray-50 dark:hover:bg-[#041801]/60 transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Admin Command Center</span>
                    </a>
                  </div>

                  {/* Sign Out Action */}
                  <div className="pt-1 border-t border-gray-100 dark:border-[#138601]/20">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </header>

      {/* ─── Password Management / Settings Modal ─── */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 rounded w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-gray-100 dark:border-[#138601]/25 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded bg-green-50 dark:bg-[#138601]/20 text-[#138601] dark:text-[#4bd043] flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">Manage Password</h3>
                  <p className="text-[11px] text-gray-500 dark:text-green-200/70">Update your student account security credentials</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSettingsOpen(false);
                  setPasswordError('');
                  setPasswordSuccess('');
                }}
                className="p-1.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#041801] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePasswordChange} className="p-5 space-y-4">
              {passwordError && (
                <div className="p-3 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-600 dark:text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 rounded bg-green-50 dark:bg-[#138601]/20 border border-green-200 dark:border-[#138601]/40 text-xs text-[#138601] dark:text-[#4bd043] flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-green-200 block mb-1">
                  Current Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded border border-gray-200 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#138601]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-green-200 block mb-1">
                  New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded border border-gray-200 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#138601]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-green-200 block mb-1">
                  Confirm New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded border border-gray-200 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#138601]"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-gray-500 dark:text-green-200/80 hover:text-gray-900 dark:hover:text-white inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassword ? 'Hide Passwords' : 'Show Passwords'}</span>
                </button>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsOpen(false);
                    setPasswordError('');
                    setPasswordSuccess('');
                  }}
                  className="px-4 py-2 rounded text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-5 py-2 rounded text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isChangingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Off-Canvas Navigation Sidebar Drawer & Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity duration-200 print:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-16 left-0 bottom-0 z-50 w-72 max-w-[85vw] flex flex-col justify-between py-6 px-4 overflow-y-auto sidebar-scroll transition-transform duration-300 ease-in-out print:hidden ${
          isDark
            ? 'bg-[#083002] border-r border-[#138601]/30 text-white shadow-2xl'
            : 'bg-white border-r border-gray-200 text-gray-900 shadow-2xl'
        } ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-4">
          {/* Header inside sidebar */}
          <div className="px-2 pb-1 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-green-300/70">
              Menu Navigation
            </span>
            <span className="text-xs font-mono text-gray-400 dark:text-green-300/50">
              {displayMatric}
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const active = isItemActive(item.path);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded text-sm font-medium transition-all cursor-pointer ${
                    active
                      ? 'bg-[#138601] text-white shadow-xs font-semibold'
                      : isDark
                      ? 'text-green-100/90 hover:text-white hover:bg-[#083002]/80 border border-transparent hover:border-[#138601]/20'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-[#f1f3f5] border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4.5 h-4.5 shrink-0 ${active ? 'text-white' : isDark ? 'text-[#4bd043]' : 'text-gray-500'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {active && <ChevronRight className="w-4 h-4 text-white shrink-0" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* External Portals & Actions */}
        <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-[#138601]/20">
          <div className="grid grid-cols-2 gap-2">
            <a
              href={getAppUrls().website}
              target="_blank"
              rel="noreferrer"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded text-xs font-semibold border transition-colors ${
                isDark
                  ? 'bg-[#041801] text-gray-200 border-[#138601]/30 hover:bg-[#138601]/20'
                  : 'bg-[#f8fafc] text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-[#138601] dark:text-[#4bd043]" />
              <span>Website</span>
            </a>

            <a
              href={getAppUrls().adminHub}
              target="_blank"
              rel="noreferrer"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded text-xs font-semibold border transition-colors ${
                isDark
                  ? 'bg-[#041801] text-[#4bd043] border-[#138601]/30 hover:bg-[#138601]/20'
                  : 'bg-green-50 text-[#138601] border-green-200 hover:bg-green-100'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Hub</span>
            </a>
          </div>

          {/* Bottom Semester Progress Bar */}
          <div className={`p-4 rounded border mt-2 shrink-0 space-y-2.5 ${
            isDark ? 'bg-[#041801]/60 border-[#138601]/30' : 'bg-[#f8fafc] border-gray-200/80'
          }`}>
            <div className="flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-green-200">
              <span>Semester 1 of 2</span>
              <span className="text-[#138601] dark:text-[#4bd043]">2025/2026</span>
            </div>
            {/* Clean Progress Track */}
            <div className="w-full h-1.5 bg-gray-200 dark:bg-[#041801] rounded-full overflow-hidden">
              <div className="h-full bg-[#138601] w-3/5 rounded-full"></div>
            </div>
            <div className="text-[11px] text-gray-500 dark:text-green-200/70 font-normal">
              First Semester Examinations
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN BODY VIEW - Elements can now take up the full screen */}
      <div className="flex-1 site-container w-full min-h-0 print:p-0 print:m-0 print:max-w-none print:w-full">
        <main className="w-full py-5 sm:py-6 overflow-x-hidden print:py-0 print:m-0 print:w-full">
          {children}
        </main>
      </div>

      {/* Institutional Login Urgent Pop-up Notice */}
      <NoticeModal
        notice={activePopupNotice}
        isOpen={Boolean(activePopupNotice)}
        onClose={() => setActivePopupNotice(null)}
      />

    </div>
  );
};

export default PortalLayout;
