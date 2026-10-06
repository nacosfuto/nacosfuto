import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  ShieldCheck, 
  Image as ImageIcon, 
  BookOpen,
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Sun, 
  Moon, 
  ChevronRight, 
  Shield, 
  CreditCard,
  GraduationCap,
  Globe,
  ExternalLink,
  Bell,
  Award,
  Lock
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { getPortalAdminSession, logoutPortalAdmin } from '@nacos/auth';
import { getAppUrls } from '@nacos/config/urls';
import logoDark from '../assets/full-logo-dark.png';
import logoLight from '../assets/full-logo-light.png';

export const PortalAdminLayout = ({ children, title, subtitle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [admin, setAdmin] = useState(null);

  // 1-Hour Inactivity Watchdog & Auto-Logout for Portal Admin
  useEffect(() => {
    const ONE_HOUR_MS = 60 * 60 * 1000;
    const now = Date.now();

    const session = getPortalAdminSession();
    if (!session) {
      navigate('/login');
      return;
    }
    setAdmin(session);

    const lastActivity = parseInt(localStorage.getItem('nacos_portal_admin_last_activity') || '0', 10);
    if (lastActivity && (now - lastActivity >= ONE_HOUR_MS)) {
      logoutPortalAdmin();
      localStorage.removeItem('nacos_portal_admin_last_activity');
      navigate('/login?reason=inactivity', { replace: true });
      return;
    }

    localStorage.setItem('nacos_portal_admin_last_activity', now.toString());

    let lastRecorded = now;
    const recordActivity = () => {
      const current = Date.now();
      if (current - lastRecorded > 10000) {
        lastRecorded = current;
        localStorage.setItem('nacos_portal_admin_last_activity', current.toString());
      }
    };

    const checkInactivity = () => {
      const s = getPortalAdminSession();
      if (!s) return;
      const act = parseInt(localStorage.getItem('nacos_portal_admin_last_activity') || '0', 10);
      if (act && (Date.now() - act >= ONE_HOUR_MS)) {
        logoutPortalAdmin();
        localStorage.removeItem('nacos_portal_admin_last_activity');
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

  const handleSignOut = async () => {
    localStorage.removeItem('nacos_portal_admin_last_activity');
    await logoutPortalAdmin();
    navigate('/login');
  };

  const isDark = theme === 'dark';

  const navItems = [
    { label: 'Portal Overview', path: '/', icon: LayoutDashboard, exact: true },
    { label: 'Student Registry', path: '/students', icon: Users },
    { label: 'Course Management', path: '/courses', icon: BookOpen },
    { label: 'Results & Grades', path: '/results', icon: Award },
    { label: 'ID Card Applications', path: '/id-cards', icon: ShieldCheck },
    { label: 'Notices & Bulletins', path: '/notices', icon: Bell },
    { label: 'Resource Hub', path: '/resources', icon: BookOpen },
    { label: 'Student Media', path: '/media', icon: ImageIcon },
    { label: 'Portal Settings', path: '/settings', icon: Settings }
  ];

  const isActive = (item) => {
    if (item.exact) {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(item.path);
  };

  const displayName = admin?.full_name || 'Portal Officer';
  const displayEmail = admin?.email || 'portaladmin@nacos.org.ng';
  const displayInitials = displayName
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'PO';

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#041801] text-gray-900 dark:text-white flex flex-col md:flex-row font-sans selection:bg-[#138601] selection:text-white">
      {/* Sidebar Desktop */}
      <aside className={`hidden md:flex flex-col w-64 border-r shrink-0 z-30 transition-colors duration-200 ${
        isDark 
          ? 'bg-[#083002] border-[#138601]/25 text-white' 
          : 'bg-white border-gray-200 text-gray-900 shadow-sm'
      }`}>
        {/* Brand Header */}
        <div className="p-5 border-b border-inherit flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img 
              src={isDark ? logoDark : logoLight} 
              alt="NACOS Logo" 
              className="h-8 w-auto object-contain"
            />
          </Link>
        </div>

        {/* Scope & Level Clearance Information */}
        <div className="px-5 py-3 border-b border-inherit">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#138601] dark:text-[#4bd043]">
            Portal Administration
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            {admin?.assigned_level && admin.assigned_level !== 'all' ? `${admin.assigned_level}L Coordinator` : 'Full Level Rights'}
          </p>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? isDark 
                      ? 'bg-[#138601] text-white shadow-sm font-bold'
                      : 'bg-[#138601] text-white shadow-sm font-bold'
                    : isDark
                      ? 'text-gray-300 hover:text-white hover:bg-white/5'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </div>
                {active && <ChevronRight className="w-3.5 h-3.5 text-white/80" />}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Card & Sign Out */}
        <div className="p-4 border-t border-inherit space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#138601] text-white flex items-center justify-center font-bold text-xs shadow-inner">
              {displayInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold truncate text-inherit">
                {displayName}
              </p>
              <p className="text-[10px] text-gray-500 dark:text-green-200/60 truncate font-mono">
                {displayEmail}
              </p>
            </div>
          </div>

          {/* Dynamic Cross-Portal Launch Links (No hardcoded localhost) */}
          <div className="space-y-1.5 pt-1">
            <a
              href={getAppUrls().portal}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold bg-[#138601] hover:bg-[#0f6c01] text-white transition-all shadow-xs group"
              title="Open Main Student Portal"
            >
              <div className="flex items-center gap-2">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Main Student Portal</span>
              </div>
              <ExternalLink className="w-3 h-3 opacity-80 group-hover:translate-x-0.5 transition-transform" />
            </a>

            <div className="grid grid-cols-2 gap-1.5">
              <a
                href={getAppUrls().website}
                target="_blank"
                rel="noreferrer"
                className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${
                  isDark
                    ? 'bg-white/5 border-[#138601]/25 text-gray-300 hover:text-white hover:bg-white/10'
                    : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
                }`}
                title="Open NACOS FUTO Main Website"
              >
                <Globe className="w-3 h-3 text-[#138601] dark:text-[#4bd043]" />
                <span>Website</span>
              </a>

              <a
                href={getAppUrls().adminHub}
                target="_blank"
                rel="noreferrer"
                className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${
                  isDark
                    ? 'bg-white/5 border-[#138601]/25 text-green-300 hover:text-white hover:bg-[#138601]/20'
                    : 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100'
                }`}
                title="Open Admin Command Center"
              >
                <Shield className="w-3 h-3 text-[#138601] dark:text-[#4bd043]" />
                <span>Hub</span>
              </a>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-inherit/40">
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-2 rounded-lg text-xs flex-1 flex items-center justify-center gap-1.5 border transition-colors cursor-pointer ${
                isDark 
                  ? 'bg-white/5 border-[#138601]/25 text-gray-200 hover:text-white hover:bg-white/10' 
                  : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
              <span>{isDark ? 'Light' : 'Dark'}</span>
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="p-2 rounded-lg text-xs flex items-center justify-center gap-1.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40 transition-colors cursor-pointer px-3"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className={`md:hidden flex items-center justify-between p-4 border-b sticky top-0 z-40 ${
          isDark 
            ? 'bg-[#083002] border-[#138601]/25 text-white' 
            : 'bg-white border-gray-200 text-gray-900 shadow-sm'
        }`}>
          <div className="flex items-center gap-3">
            <img src={isDark ? logoDark : logoLight} alt="Logo" className="h-7 w-auto" />
            <span className="text-xs font-bold text-[#138601] dark:text-[#4bd043]">Portal Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={toggleTheme} 
              className="p-1.5 rounded-lg border border-inherit text-inherit"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
            <button 
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)} 
              className="p-1.5 rounded-lg border border-inherit text-inherit"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Mobile Dropdown Nav */}
        {mobileOpen && (
          <div className={`md:hidden border-b px-4 py-3 space-y-1 ${
            isDark ? 'bg-[#083002] border-[#138601]/25' : 'bg-white border-gray-200'
          }`}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold ${
                    active 
                      ? 'bg-[#138601] text-white font-bold' 
                      : 'text-inherit hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <div className="py-2 border-t border-inherit space-y-1">
              <a
                href={getAppUrls().portal}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between px-3 py-2 rounded text-xs font-semibold bg-[#138601] text-white"
              >
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Main Student Portal</span>
                </div>
                <ExternalLink className="w-3 h-3" />
              </a>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={getAppUrls().website}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs border border-inherit text-inherit"
                >
                  <Globe className="w-3 h-3" />
                  <span>Website</span>
                </a>
                <a
                  href={getAppUrls().adminHub}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs border border-inherit text-inherit"
                >
                  <Shield className="w-3 h-3" />
                  <span>Admin Hub</span>
                </a>
              </div>
            </div>

            <div className="pt-2 border-t border-inherit flex items-center justify-between">
              <span className="text-xs text-inherit opacity-75">{displayName}</span>
              <button 
                type="button"
                onClick={handleSignOut} 
                className="text-xs text-red-500 font-semibold"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Top Header Bar for Desktop with Page Title and Quick Stats */}
        <div className={`px-6 sm:px-8 py-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isDark 
            ? 'bg-[#083002]/40 border-[#138601]/20' 
            : 'bg-white border-gray-200 shadow-sm'
        }`}>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-inherit">
              {title || 'Portal Administration Dashboard'}
            </h1>
            <p className="text-xs text-gray-500 dark:text-green-200/70 mt-0.5">
              {subtitle || 'Manage student verification records, digital ID applications, and portal access.'}
            </p>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <a
              href={getAppUrls().portal}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#138601] hover:bg-[#0f6c01] text-white transition-all shadow-xs cursor-pointer"
              title="Open Student Portal"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Open Student Portal</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>

            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-[#138601] dark:text-[#4bd043] border border-[#138601]/30">
              <span className="w-2 h-2 rounded-xs bg-[#138601] animate-pulse"></span>
              <span>System Live</span>
            </span>
          </div>
        </div>

        {/* Main Content Body */}
        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default PortalAdminLayout;
