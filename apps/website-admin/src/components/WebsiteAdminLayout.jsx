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
  Award
} from 'lucide-react';
import { BsSun, BsMoon } from 'react-icons/bs';
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  // Desktop sidebar collapse/expand state (persisted, matching portal)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nacos_website_admin_sidebar_collapsed') === 'true';
    }
    return false;
  });
  const [isHovered, setIsHovered] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('nacos_website_admin_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  const isExpanded = !isCollapsed || isHovered;

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

  const navItems = [
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

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#041801] text-gray-900 dark:text-white flex flex-col font-sans selection:bg-[#138601] selection:text-white">
      
      {/* Top CMS Header */}
      <header className={`sticky top-0 z-40 w-full border-b ${
        isDark 
          ? 'bg-[#083002] border-[#138601]/25 text-white' 
          : 'bg-white border-gray-200 text-gray-900 shadow-sm'
      }`}>
        <div className="site-container h-16 flex items-center justify-between">
          
          {/* Brand, Desktop Toggle & Mobile Trigger */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className={`md:hidden p-2 rounded cursor-pointer ${
                isDark ? 'text-gray-200 bg-[#041801] border border-[#138601]/30' : 'text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link to="/admin/dashboard" className="flex items-center space-x-3 shrink-0">
              <img src={isDark ? logoDark : logoLight} alt="NACOS FUTO Logo" className="h-9 w-auto object-contain" />
              <div className="hidden sm:block border-l border-gray-200 dark:border-[#138601]/30 pl-3">
                <span className="text-xs font-bold text-[#138601] dark:text-[#4bd043] tracking-wide uppercase block">
                  Website CMS
                </span>
                <span className="text-[11px] text-gray-500 dark:text-green-200/60 block">
                  Editorial & Media Management
                </span>
              </div>
            </Link>

            {/* Desktop Sidebar Collapse / Expand Toggle Button - Single Hamburger Icon (matching portal) */}
            <button
              type="button"
              onClick={toggleCollapse}
              className={`hidden md:flex items-center justify-center p-2 rounded transition-all duration-200 cursor-pointer border ${
                isDark
                  ? 'text-gray-300 hover:text-white bg-[#041801] hover:bg-[#138601]/20 border-[#138601]/30 active:scale-95'
                  : 'text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 border-gray-200 active:scale-95'
              }`}
              title={isCollapsed ? "Expand navigation sidebar" : "Collapse navigation sidebar"}
              aria-label={isCollapsed ? "Expand navigation sidebar" : "Collapse navigation sidebar"}
            >
              <Menu className="w-4.5 h-4.5 transition-transform duration-200" />
            </button>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center space-x-3">
            
            {/* Notification Bell with Badge & Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifOpen(!notifOpen)}
                className={`relative p-2 rounded-lg text-sm transition-colors cursor-pointer ${
                  isDark
                    ? 'text-green-200 bg-[#0d4603] hover:bg-[#138601]/40'
                    : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                }`}
                title="Admin Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-bold rounded flex items-center justify-center shadow-xs animate-pulse">
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
                                <span className="w-2 h-2 rounded bg-red-500 shrink-0"></span>
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

            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg text-sm transition-colors cursor-pointer ${
                isDark
                  ? 'text-yellow-300 bg-[#0d4603] hover:bg-[#138601]/40'
                  : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
              }`}
              aria-label="Toggle theme"
            >
              {isDark ? <BsSun className="w-4 h-4" /> : <BsMoon className="w-4 h-4" />}
            </button>

            {/* Main Portal Dynamic Link (No hardcoded localhost) */}
            <a
              href={getAppUrls().portal}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#138601] hover:bg-[#0f6c01] text-white transition-all shadow-xs cursor-pointer"
              title="Open Student Portal"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Main Portal</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>

            <a
              href={getAppUrls().adminHub}
              target="_blank"
              rel="noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-green-200 dark:border-[#138601]/40 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-[#041801] transition-all cursor-pointer"
              title="Open Admin Command Center"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Hub</span>
            </a>

            {/* Current Admin Pill */}
            {admin && (
              <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-[#138601]/30 text-xs">
                <div className="w-8 h-8 rounded-lg bg-[#138601] text-white font-bold flex items-center justify-center text-xs">
                  {admin.full_name?.slice(0, 2).toUpperCase() || 'AD'}
                </div>
                <div className="text-left">
                  <div className="font-bold text-gray-900 dark:text-white truncate max-w-[120px] leading-none">
                    {admin.full_name}
                  </div>
                  <span className="text-[10px] text-[#138601] dark:text-[#4bd043] font-medium leading-none block mt-0.5 capitalize">
                    {admin.role.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            )}

            {/* Logout Button */}
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:text-white bg-red-50 dark:bg-red-950/40 hover:bg-red-600 dark:hover:bg-red-900/70 border border-red-200 dark:border-red-900/50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main CMS Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 gap-6 items-start min-h-0">
        
        {/* DESKTOP SIDEBAR WRAPPER: Maintained Fixed Steady Position on Scroll */}
        <div className={`hidden md:block shrink-0 transition-all duration-300 sticky top-16 h-[calc(100vh-4rem)] z-30 ${isCollapsed ? 'w-16' : 'w-64'}`}>
          <aside
            onMouseEnter={() => isCollapsed && setIsHovered(true)}
            onMouseLeave={() => isCollapsed && setIsHovered(false)}
            className={`h-full overflow-y-auto overflow-x-hidden py-6 flex flex-col justify-between sidebar-scroll print:hidden transition-all duration-300 ease-in-out ${
              isCollapsed
                ? isHovered
                  ? 'w-64 z-40 bg-white dark:bg-[#083002] shadow-2xl px-3 border border-gray-200 dark:border-[#138601]/30 rounded-r-xl absolute top-0 left-0 bottom-0'
                  : 'w-16 px-2'
                : 'w-64 px-1 pr-2'
            }`}
          >
            <div className="space-y-4">
              {/* Header inside sidebar */}
              <div className="px-2 pb-1">
                {isExpanded && (
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-green-300/70">
                    CMS Navigation
                  </span>
                )}
              </div>

              {/* Navigation Links */}
              <nav className="space-y-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.exact 
                    ? location.pathname === item.path 
                    : location.pathname.startsWith(item.path);

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      title={!isExpanded ? item.label : undefined}
                      className={`group relative flex items-center rounded text-sm font-medium transition-all cursor-pointer ${
                        isExpanded 
                          ? 'justify-between px-3.5 py-2.5' 
                          : 'justify-center h-11 w-11 mx-auto'
                      } ${
                        isActive
                          ? 'bg-[#138601] text-white shadow-xs font-semibold'
                          : isDark
                          ? 'text-green-100/90 hover:text-white hover:bg-[#083002]/80 border border-transparent hover:border-[#138601]/20'
                          : 'text-gray-700 hover:text-gray-900 hover:bg-[#f1f3f5] border border-transparent'
                      }`}
                    >
                      <div className={`flex items-center ${isExpanded ? 'space-x-3' : 'justify-center'}`}>
                        <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-white' : isDark ? 'text-[#4bd043]' : 'text-gray-500'}`} />
                        {isExpanded && <span className="truncate">{item.label}</span>}
                      </div>
                      {isExpanded && isActive && <ChevronRight className="w-4 h-4 text-white shrink-0" />}

                      {/* Dynamic Floating Tooltip Popup when collapsed */}
                      {!isExpanded && (
                        <div className="pointer-events-none fixed left-18 z-50 hidden rounded bg-gray-900 px-2.5 py-1 text-xs font-semibold text-white shadow-md transition-opacity group-hover:block dark:bg-gray-800 whitespace-nowrap">
                          {item.label}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </nav>

              {/* Quick Cross-App Launchers */}
              <div className="space-y-1.5 pt-2 border-t border-gray-200 dark:border-[#138601]/20">
                <a
                  href={getAppUrls().portal}
                  target="_blank"
                  rel="noreferrer"
                  title={!isExpanded ? "Main Student Portal" : undefined}
                  className={`flex items-center rounded text-xs font-semibold bg-[#138601] hover:bg-[#0f6c01] text-white transition-all shadow-xs group ${
                    isExpanded ? 'justify-between px-3 py-2' : 'justify-center h-11 w-11 mx-auto'
                  }`}
                >
                  <div className={`flex items-center ${isExpanded ? 'gap-2' : 'justify-center'}`}>
                    <GraduationCap className="w-4 h-4 shrink-0" />
                    {isExpanded && <span>Main Student Portal</span>}
                  </div>
                  {isExpanded && <ExternalLink className="w-3 h-3 opacity-80 group-hover:translate-x-0.5 transition-transform shrink-0" />}
                </a>

                <a
                  href={getAppUrls().website}
                  target="_blank"
                  rel="noreferrer"
                  title={!isExpanded ? "Live Website" : undefined}
                  className={`flex items-center rounded text-xs font-medium border transition-colors ${
                    isDark
                      ? 'bg-white/5 border-[#138601]/25 text-gray-300 hover:text-white'
                      : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
                  } ${
                    isExpanded ? 'justify-between px-3 py-1.5' : 'justify-center h-11 w-11 mx-auto'
                  }`}
                >
                  <div className={`flex items-center ${isExpanded ? 'gap-2' : 'justify-center'}`}>
                    <Globe className="w-4 h-4 text-[#138601] dark:text-[#4bd043] shrink-0" />
                    {isExpanded && <span>Live Website</span>}
                  </div>
                  {isExpanded && <ExternalLink className="w-3 h-3 opacity-60 shrink-0" />}
                </a>

                <a
                  href={getAppUrls().adminHub}
                  target="_blank"
                  rel="noreferrer"
                  title={!isExpanded ? "Admin Hub" : undefined}
                  className={`flex items-center rounded text-xs font-medium border transition-colors ${
                    isDark
                      ? 'bg-white/5 border-[#138601]/25 text-green-300 hover:text-white hover:bg-[#138601]/20'
                      : 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100'
                  } ${
                    isExpanded ? 'justify-between px-3 py-1.5' : 'justify-center h-11 w-11 mx-auto'
                  }`}
                >
                  <div className={`flex items-center ${isExpanded ? 'gap-2' : 'justify-center'}`}>
                    <ShieldCheck className="w-4 h-4 text-[#138601] dark:text-[#4bd043] shrink-0" />
                    {isExpanded && <span>Admin Hub</span>}
                  </div>
                  {isExpanded && <ExternalLink className="w-3 h-3 opacity-60 shrink-0" />}
                </a>
              </div>

              {/* Scoped Security Assurance Badge */}
              {isExpanded && (
                <div className={`p-3.5 rounded border text-xs space-y-1 ${
                  isDark 
                    ? 'bg-[#083002]/60 border-[#138601]/25 text-green-200/80' 
                    : 'bg-green-50/60 border-green-200 text-green-800'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold text-xs text-green-800 dark:text-green-300">
                    <ShieldCheck className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
                    <span>Isolated Admin Scope</span>
                  </div>
                  <p className="text-[10.5px] leading-relaxed opacity-80">
                    Authorized exclusively for NACOS public web surfaces and media CDN.
                  </p>
                </div>
              )}
            </div>

            {isExpanded && (
              <div className="text-[10px] text-gray-400 dark:text-green-200/40 pt-4 border-t border-gray-200 dark:border-[#138601]/20">
                NACOS FUTO CMS v2.0
              </div>
            )}
          </aside>
        </div>

        {/* MOBILE DRAWER */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex">
            <div className="w-72 bg-white dark:bg-[#083002] border-r border-gray-200 dark:border-[#138601]/30 p-5 flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-[#138601]/20">
                  <span className="font-bold text-sm">Website Navigation</span>
                  <button onClick={() => setMobileOpen(false)} className="p-1 rounded">✕</button>
                </div>

                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.exact 
                      ? location.pathname === item.path 
                      : location.pathname.startsWith(item.path);

                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                          isActive
                            ? 'bg-[#138601] text-white'
                            : 'text-gray-700 dark:text-green-100 hover:bg-gray-100 dark:hover:bg-[#041801]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>

                <div className="pt-2 border-t border-gray-200 dark:border-[#138601]/20 space-y-1.5">
                  <a
                    href={getAppUrls().portal}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold bg-[#138601] text-white"
                  >
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Main Student Portal</span>
                    </div>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href={getAppUrls().adminHub}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold border border-inherit text-inherit"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Admin Hub</span>
                    </div>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/40 flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
            <div className="flex-1" onClick={() => setMobileOpen(false)} />
          </div>
        )}

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 min-w-0 py-6">
          {(title || subtitle) && (
            <div className="mb-6 p-6 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30">
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
    </div>
  );
};

export default WebsiteAdminLayout;
