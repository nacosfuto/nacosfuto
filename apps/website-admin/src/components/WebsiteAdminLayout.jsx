import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Image as ImageIcon, 
  Camera, 
  Newspaper, 
  Calendar, 
  Home, 
  Settings, 
  Users, 
  History, 
  LogOut, 
  Menu, 
  X, 
  Globe, 
  ShieldCheck, 
  Sparkles,
  ChevronRight,
  UserCheck,
  GraduationCap,
  ExternalLink,
  Store,
  Bell,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Award,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { getWebsiteAdminSession, logoutWebsiteAdmin, hasPermission } from '@nacos/auth';
import { getAppUrls } from '@nacos/config/urls';
import { 
  getAdminNotifications, 
  markNotificationRead, 
  markAllNotificationsRead 
} from '@nacos/supabase';
import logoDark from '../assets/full-logo-dark.png';
import logoLight from '../assets/full-logo-light.png';

export const WebsiteAdminLayout = ({ children, title, subtitle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  // Close sidebar drawer on route navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const session = getWebsiteAdminSession();
    if (session) {
      setAdmin(session);
    }
  }, []);

  useEffect(() => {
    const loadNotifs = () => {
      setNotifications(getAdminNotifications());
    };
    loadNotifs();
    window.addEventListener('nacos_notification_added', loadNotifs);
    window.addEventListener('nacos_notifications_updated', loadNotifs);
    return () => {
      window.removeEventListener('nacos_notification_added', loadNotifs);
      window.removeEventListener('nacos_notifications_updated', loadNotifs);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await logoutWebsiteAdmin();
    navigate('/admin/login');
  };

  const isDark = theme === 'dark';
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const rawNavItems = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard, exact: true },
    { label: 'Yellow Pages', path: '/admin/yellow-pages', icon: Store, permission: 'main_website.yellow_pages' },
    { label: 'Campus Clubs', path: '/admin/clubs', icon: Users, permission: 'main_website.clubs' },
    { label: 'Alumni Network', path: '/admin/alumni', icon: GraduationCap, permission: 'main_website.alumni' },
    { label: 'NACOS Executives', path: '/admin/executives', icon: Award, permission: 'main_website.homepage' },
    { label: 'Media Library', path: '/admin/media', icon: ImageIcon, permission: 'main_website.media' },
    { label: 'Campus Gallery', path: '/admin/gallery', icon: Camera, permission: 'main_website.gallery' },
    { label: 'News & Journal', path: '/admin/news', icon: Newspaper, permission: 'main_website.news' },
    { label: 'Events & Flyers', path: '/admin/events', icon: Calendar, permission: 'main_website.events' },
    { label: 'Homepage Content', path: '/admin/homepage', icon: Home, permission: 'main_website.homepage' },
    { label: 'Audit Trail', path: '/admin/audit-logs', icon: History, permission: 'main_website.view' },
    ...(admin?.is_super_admin
      ? [{ label: 'Admin Management', path: '/admin/admins', icon: ShieldCheck }]
      : []),
    { label: 'Website Settings', path: '/admin/settings', icon: Settings, permission: 'main_website.settings' }
  ];

  const navItems = rawNavItems.filter(item => {
    if (!item.permission) return true;
    return hasPermission(admin, item.permission);
  });

  const isActive = (item) => {
    if (item.exact) {
      return location.pathname === '/admin' || location.pathname === '/admin/dashboard';
    }
    return location.pathname.startsWith(item.path);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#041801] text-gray-900 dark:text-white flex flex-col font-sans selection:bg-[#138601] selection:text-white md:pl-16 print:pl-0">
      
      {/* ─── Collapsed Vertical Icon Rail (Matching Portal UI) ─── */}
      <aside
        className={`hidden md:flex fixed inset-y-0 left-0 top-0 bottom-0 w-16 flex-col justify-between items-center py-3.5 border-r z-30 select-none print:hidden transition-colors ${
          isDark
            ? 'bg-[#083002] border-[#138601]/25 text-white'
            : 'bg-white border-gray-200 text-gray-900 shadow-xs'
        }`}
        aria-label="Collapsed website admin rail"
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
          <nav className="flex flex-col items-center gap-1.5 w-full px-2 max-h-[calc(100vh-14rem)] overflow-y-auto sidebar-scroll" aria-label="Quick Navigation">
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
            to="/admin/settings"
            title="Website Settings"
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

      {/* ─── Top CMS Header ─── */}
      <header className={`sticky top-0 z-40 w-full border-b print:hidden ${
        isDark 
          ? 'bg-[#083002] border-[#138601]/25 text-white' 
          : 'bg-white border-gray-200 text-gray-900 shadow-xs'
      }`}>
        <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Left: Mobile Hamburger Toggle & Logo */}
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Toggle Button */}
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-2 rounded cursor-pointer transition-colors relative w-9 h-9 flex items-center justify-center border shrink-0 md:hidden ${
                isDark ? 'text-gray-200 bg-[#041801] border-[#138601]/30 active:scale-95' : 'text-gray-700 bg-gray-100 hover:bg-gray-200 border-gray-200 active:scale-95'
              }`}
              title="Open navigation menu"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4.5 h-4.5" />
            </button>

            <Link to="/admin/dashboard" className="flex items-center space-x-3 shrink-0">
              <img src={isDark ? logoDark : logoLight} alt="NACOS FUTO Logo" className="h-8 md:h-9 w-auto object-contain" />
              <div className="hidden sm:block border-l border-gray-200 dark:border-[#138601]/30 pl-3">
                <span className="text-xs font-bold text-[#138601] dark:text-[#4bd043] tracking-wide uppercase block">
                  Website CMS
                </span>
                <span className="text-[10px] text-gray-500 dark:text-green-200/60 block">
                  Editorial & Content Management
                </span>
              </div>
            </Link>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Notification Bell with Badge & Popover */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifOpen(!notifOpen)}
                className={`relative p-2 rounded-xl text-sm transition-colors cursor-pointer ${
                  isDark
                    ? 'text-green-200 bg-[#0d4603] hover:bg-[#138601]/40'
                    : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                }`}
                title="Admin Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover */}
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 shadow-2xl z-50 overflow-hidden font-sans">
                  <div className="p-3.5 border-b border-gray-100 dark:border-[#138601]/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
                      <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                        CMS Notifications
                      </span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                          {unreadCount} pending
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => markAllNotificationsRead()}
                        className="text-[11px] font-semibold text-[#138601] dark:text-[#4bd043] hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-[#138601]/20">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-gray-500 dark:text-green-200/60">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markNotificationRead(n.id);
                            setNotifOpen(false);
                            if (n.link) navigate(n.link);
                          }}
                          className={`p-3 text-xs transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-[#0d4603]/50 flex items-start gap-2.5 ${
                            !n.isRead ? 'bg-green-50/60 dark:bg-[#0b3d03]/40' : ''
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {n.type === 'yellow_pages' && <Store className="w-4 h-4 text-amber-500" />}
                            {n.type === 'alumni' && <GraduationCap className="w-4 h-4 text-purple-500" />}
                            {n.type === 'course' && <BookOpen className="w-4 h-4 text-blue-500" />}
                            {n.type === 'resource' && <CheckCircle2 className="w-4 h-4 text-[#138601]" />}
                            {!['yellow_pages', 'alumni', 'course', 'resource'].includes(n.type) && (
                              <AlertCircle className="w-4 h-4 text-[#138601]" />
                            )}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <p className={`font-bold ${!n.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                                {n.title}
                              </p>
                              {!n.isRead && (
                                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-green-200/70 leading-relaxed">
                              {n.message}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-green-200/50 pt-0.5">
                              <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              <span className="text-[#138601] dark:text-[#4bd043] font-semibold hover:underline">
                                Review Details &rarr;
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Main Portal Dynamic Link */}
            <a
              href={getAppUrls().portal}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#138601] hover:bg-[#0f6c01] text-white transition-all shadow-xs cursor-pointer"
              title="Open Student Portal"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Student Portal</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>

            {/* Admin Hub Link */}
            <a
              href={getAppUrls().adminHub}
              target="_blank"
              rel="noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-green-200 dark:border-[#138601]/40 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-[#041801] transition-all cursor-pointer"
              title="Open Admin Command Center"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Hub</span>
            </a>

            {/* Current Admin Pill */}
            {admin && (
              <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-[#138601]/30 text-xs">
                <div className="w-8 h-8 rounded-lg bg-[#138601] text-white font-bold flex items-center justify-center text-xs shadow-xs">
                  {admin.full_name?.slice(0, 2).toUpperCase() || 'AD'}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="font-bold text-gray-900 dark:text-white truncate max-w-[130px] leading-tight">
                    {admin.full_name}
                  </div>
                  <span className="text-[10px] text-[#138601] dark:text-[#4bd043] font-medium leading-none block capitalize">
                    {admin.role ? admin.role.replace(/_/g, ' ') : 'Admin'}
                  </span>
                </div>
              </div>
            )}

            {/* Mobile Logout */}
            <button
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
        {/* Drawer Brand Header: Covers the top navbar completely */}
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

          <Link to="/admin/dashboard" onClick={() => setSidebarOpen(false)} className="flex items-center shrink-0">
            <img src={isDark ? logoDark : logoLight} alt="NACOS FUTO Logo" className="h-8 md:h-9 w-auto object-contain" />
          </Link>
        </div>

        {/* Drawer Scrollable Navigation Body */}
        <div className="flex-1 overflow-y-auto sidebar-scroll p-4 space-y-4">
          <div className="px-2 pb-1 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-green-300/70">
              CMS Navigation
            </span>
            <span className="text-[10px] font-mono text-[#138601] dark:text-[#4bd043] bg-emerald-500/10 px-2 py-0.5 rounded">
              {admin?.is_super_admin ? 'Super Admin' : 'Editor'}
            </span>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);

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
                      ? 'text-green-100/90 hover:text-white hover:bg-white/5'
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
                <ShieldCheck className="w-3.5 h-3.5 text-[#138601] dark:text-[#4bd043]" />
                <span>Hub</span>
              </a>
            </div>
          </div>

          {/* Profile Card & Signout in Drawer */}
          <div className="pt-2 border-t border-gray-100 dark:border-[#138601]/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#138601] text-white flex items-center justify-center font-bold text-xs shrink-0">
                {admin?.full_name?.slice(0, 2).toUpperCase() || 'AD'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                  {admin?.full_name || 'Administrator'}
                </p>
                <p className="text-[10px] text-gray-400 truncate capitalize">
                  {admin?.role ? admin.role.replace(/_/g, ' ') : 'Website CMS'}
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

      {/* ─── Main Content Area ─── */}
      <main className="flex-1 min-w-0 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {(title || subtitle) && (
          <div className="p-6 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 shadow-xs">
            {title && (
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-green-200/80 mt-1">
                {subtitle}
              </p>
            )}
          </div>
        )}
        {children}
      </main>

    </div>
  );
};

export default WebsiteAdminLayout;
