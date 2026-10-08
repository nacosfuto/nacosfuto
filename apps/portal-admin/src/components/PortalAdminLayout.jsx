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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [admin, setAdmin] = useState(null);

  // Close sidebar drawer on route navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

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
    { label: 'Dues Management', path: '/dues', icon: CreditCard },
    { label: 'ID Card Applications', path: '/id-cards', icon: ShieldCheck },
    { label: 'Course Management', path: '/courses', icon: BookOpen },
    { label: 'Results & Grades', path: '/results', icon: Award },
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
  const displayEmail = admin?.email || 'ict.nacosfuto@gmail.com';
  const displayInitials = displayName
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'PO';

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#041801] text-gray-900 dark:text-white flex flex-col font-sans selection:bg-[#138601] selection:text-white md:pl-16 print:pl-0">
      
      {/* ─── Collapsed Vertical Icon Rail (Matching Portal UI) ─── */}
      <aside
        className={`hidden md:flex fixed inset-y-0 left-0 top-0 bottom-0 w-16 flex-col justify-between items-center py-3.5 border-r z-30 select-none print:hidden transition-colors ${
          isDark
            ? 'bg-[#083002] border-[#138601]/25 text-white'
            : 'bg-white border-gray-200 text-gray-900 shadow-xs'
        }`}
        aria-label="Collapsed portal admin rail"
      >
        {/* Top: Hamburger Menu Button & Navigation Items */}
        <div className="flex flex-col items-center gap-4 w-full">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#138601] to-[#0d5c01] text-white flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer relative group"
            title={sidebarOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-label={sidebarOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            <Menu className="w-5 h-5 text-white" />
            
            {/* Tooltip on hover */}
            <span className="absolute left-full ml-2.5 px-2.5 py-1 rounded bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">
              Menu
            </span>
          </button>
          
          {/* Navigation Icons Column */}
          <nav className="flex flex-col items-center gap-1.5 w-full px-2" aria-label="Quick Navigation">
            {navItems.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={item.label}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all relative group cursor-pointer ${
                    active
                      ? isDark
                        ? 'bg-[#138601] text-white shadow-xs font-semibold'
                        : 'bg-[#138601] text-white shadow-xs font-semibold'
                      : isDark
                      ? 'text-green-100/70 hover:text-white hover:bg-[#041801]/70 border border-transparent hover:border-[#138601]/20'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  
                  {/* Tooltip on hover */}
                  <span className="absolute left-full ml-2.5 px-2.5 py-1 rounded bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Tools Column: Theme, Settings, Sign Out */}
        <div className="flex flex-col items-center gap-2 w-full px-2 pt-3 border-t border-gray-100 dark:border-[#138601]/20">
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 dark:text-green-200/70 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#041801]/70 transition-all cursor-pointer relative group"
          >
            {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
            <span className="absolute left-full ml-2.5 px-2.5 py-1 rounded bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">
              {isDark ? "Light Mode" : "Dark Mode"}
            </span>
          </button>

          {/* Settings */}
          <Link
            to="/settings"
            title="Portal Settings"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 dark:text-green-200/70 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#041801]/70 transition-all cursor-pointer relative group"
          >
            <Settings className="w-5 h-5" />
            <span className="absolute left-full ml-2.5 px-2.5 py-1 rounded bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">
              Settings
            </span>
          </Link>

          {/* Sign Out */}
          <button
            type="button"
            onClick={handleSignOut}
            title="Sign Out"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer relative group"
          >
            <LogOut className="w-5 h-5" />
            <span className="absolute left-full ml-2.5 px-2.5 py-1 rounded bg-red-600 text-white text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">
              Sign Out
            </span>
          </button>
        </div>
      </aside>

      {/* ─── Top Header ─── */}
      <header className={`sticky top-0 z-40 w-full border-b print:hidden ${
        isDark
          ? 'bg-[#083002] border-[#138601]/25 text-white'
          : 'bg-white border-gray-200 text-gray-900 shadow-xs'
      }`}>
        <div className="site-container h-16 flex items-center justify-between">
          
          {/* Left: Mobile Hamburger Toggle & Logo */}
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Toggle Button */}
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-2 rounded cursor-pointer transition-colors relative w-9 h-9 flex items-center justify-center border shrink-0 md:hidden ${
                isDark
                  ? 'text-gray-200 hover:text-white bg-[#041801] hover:bg-[#138601]/20 border-[#138601]/30 active:scale-95'
                  : 'text-gray-700 bg-gray-100 hover:bg-gray-200 border-gray-200 active:scale-95'
              }`}
              title="Open navigation menu"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4.5 h-4.5" />
            </button>

            <Link to="/" className="flex items-center gap-3 shrink-0">
              <img src={isDark ? logoDark : logoLight} alt="NACOS FUTO Logo" className="h-8 md:h-9 w-auto object-contain" />
              <div className="hidden sm:block border-l border-gray-200 dark:border-[#138601]/30 pl-3">
                <span className="text-xs font-bold text-[#138601] dark:text-[#4bd043] tracking-wide uppercase block">
                  Portal Admin
                </span>
                <span className="text-[10px] text-gray-500 dark:text-green-200/60 block">
                  {admin?.assigned_level && admin.assigned_level !== 'all' ? `${admin.assigned_level}L Coordinator` : 'Registry & Operations'}
                </span>
              </div>
            </Link>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-[#138601] dark:text-[#4bd043] border border-[#138601]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#138601] animate-pulse"></span>
              <span>System Live</span>
            </span>

            {/* Launch Student Portal */}
            <a
              href={getAppUrls().portal}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#138601] hover:bg-[#0f6c01] text-white transition-all shadow-xs cursor-pointer"
              title="Open Main Student Portal"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Student Portal</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>

            {/* Admin Profile Pill */}
            {admin && (
              <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-[#138601]/30 text-xs">
                <div className="w-8 h-8 rounded-lg bg-[#138601] text-white font-bold flex items-center justify-center text-xs shadow-xs">
                  {displayInitials}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="font-bold text-gray-900 dark:text-white truncate max-w-[130px] leading-tight">
                    {displayName}
                  </div>
                  <span className="text-[10px] text-[#138601] dark:text-[#4bd043] font-medium leading-none block capitalize">
                    {admin.role ? admin.role.replace(/_/g, ' ') : 'Portal Admin'}
                  </span>
                </div>
              </div>
            )}

            {/* Mobile Sign Out */}
            <button
              type="button"
              onClick={handleSignOut}
              className="md:hidden p-2 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── Off-Canvas Navigation Sidebar Drawer & Backdrop ─── */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity duration-200 print:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 top-0 left-0 bottom-0 z-50 w-72 sm:w-80 max-w-[85vw] flex flex-col justify-between overflow-y-auto sidebar-scroll transition-transform duration-300 ease-in-out print:hidden ${
          isDark
            ? 'bg-[#083002] border-r border-[#138601]/30 text-white shadow-2xl'
            : 'bg-white border-r border-gray-200 text-gray-900 shadow-2xl'
        } ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
      >
        {/* Drawer Brand Header: Covers top navbar completely */}
        <div className={`h-16 px-4 sm:px-5 lg:px-6 flex items-center gap-3 border-b shrink-0 ${
          isDark ? 'border-[#138601]/25 bg-[#083002]' : 'border-gray-200 bg-white'
        }`}>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className={`p-2 rounded cursor-pointer transition-colors relative w-9 h-9 flex items-center justify-center border shrink-0 ${
              isDark
                ? 'text-gray-200 hover:text-white bg-[#041801] hover:bg-[#138601]/20 border-[#138601]/30 active:scale-95'
                : 'text-gray-700 bg-gray-100 hover:bg-gray-200 border-gray-200 active:scale-95'
            }`}
            title="Close navigation menu"
            aria-label="Close navigation menu"
          >
            <X className="w-4.5 h-4.5" />
          </button>

          <Link to="/" onClick={() => setSidebarOpen(false)} className="flex items-center shrink-0">
            <img src={isDark ? logoDark : logoLight} alt="NACOS FUTO Logo" className="h-8 md:h-9 w-auto object-contain" />
          </Link>
        </div>

        {/* Drawer Scrollable Navigation Body */}
        <div className="flex-1 overflow-y-auto sidebar-scroll p-4 space-y-4">
          <div className="px-2 pb-1 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-green-300/70">
              Admin Navigation
            </span>
            <span className="text-[10px] font-mono text-[#138601] dark:text-[#4bd043] bg-emerald-500/10 px-2 py-0.5 rounded">
              {admin?.assigned_level && admin.assigned_level !== 'all' ? `${admin.assigned_level}L Coordinator` : 'Full Access'}
            </span>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
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
        </div>

        {/* External Portals & Actions */}
        <div className="p-4 pt-3 border-t shrink-0 space-y-3 border-gray-100 dark:border-[#138601]/20">
          <div className="space-y-1.5">
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

          {/* Profile Card & Theme/Signout in Drawer */}
          <div className="pt-2 border-t border-gray-100 dark:border-[#138601]/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#138601] text-white flex items-center justify-center font-bold text-xs shrink-0">
                {displayInitials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                  {displayName}
                </p>
                <p className="text-[10px] text-gray-400 truncate font-mono">
                  {displayEmail}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="p-2 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ─── Page Title Header Strip ─── */}
      <div className={`border-b ${
        isDark 
          ? 'bg-[#083002]/40 border-[#138601]/20' 
          : 'bg-white border-gray-200 shadow-xs'
      }`}>
        <div className="site-container py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              {title || 'Portal Administration Dashboard'}
            </h1>
            <p className="text-xs text-gray-500 dark:text-green-200/70 mt-0.5">
              {subtitle || 'Manage student verification records, digital ID applications, and portal access.'}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Main Content Body ─── */}
      <div className="flex-1 site-container w-full min-h-0 print:p-0 print:m-0 print:max-w-none print:w-full">
        <main className="w-full py-5 sm:py-6 space-y-6 overflow-x-hidden print:py-0 print:m-0 print:w-full">
          {children}
        </main>
      </div>

    </div>
  );
};

export default PortalAdminLayout;
