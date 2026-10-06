import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import WebsiteAdminLayout from '../components/WebsiteAdminLayout';
import { 
  ImageIcon, 
  Camera, 
  Newspaper, 
  Calendar, 
  Sparkles, 
  History, 
  ArrowUpRight, 
  ShieldCheck, 
  Eye, 
  Upload,
  Globe,
  Plus,
  Award,
  Building2
} from 'lucide-react';
import { getWebsiteAdminSession, getAdminAuditLogs } from '@nacos/supabase/adminAuth';

const AdminDashboard = () => {
  const [admin, setAdmin] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getWebsiteAdminSession();
    setAdmin(session);
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const logs = await getAdminAuditLogs('main_website', 6);
      setRecentLogs(logs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const quickStats = [
    { label: 'Published Articles', value: '14', change: '+3 this month', icon: Newspaper, path: '/admin/news' },
    { label: 'Upcoming Events', value: '8', change: '2 featured', icon: Calendar, path: '/admin/events' },
    { label: 'Gallery Photos', value: '32', change: 'Cloudinary CDN', icon: Camera, path: '/admin/gallery' },
    { label: 'Media Assets', value: '78', change: '0 MB DB storage', icon: ImageIcon, path: '/admin/media' }
  ];

  return (
    <WebsiteAdminLayout
      title={`Welcome back, ${admin?.full_name?.split(' ')[0] || 'Administrator'}`}
      subtitle={`Authenticated with scope: ${admin?.scope} • Role: ${admin?.role?.replace(/_/g, ' ')}`}
    >
      <div className="space-y-6">
        
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickStats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Link
                key={i}
                to={stat.path}
                className="p-5 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 hover:border-[#138601] transition-all shadow-sm group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-gray-500 dark:text-green-200/70">
                    {stat.label}
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-[#138601]/10 text-[#138601] dark:text-[#4bd043] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-gray-900 dark:text-white">
                  {stat.value}
                </div>
                <span className="text-[11px] text-green-600 dark:text-[#4bd043] font-medium block mt-1">
                  {stat.change}
                </span>
              </Link>
            );
          })}
        </div>

        {/* 2-Column Grid: Quick Actions & Audit Trail */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Quick Actions Panel */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 space-y-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
                <span>Quick Website Actions</span>
              </h3>

              <div className="space-y-2 text-xs font-semibold">
                <Link
                  to="/admin/media"
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#041801] hover:bg-gray-100 dark:hover:bg-black transition-colors"
                >
                  <span className="flex items-center gap-2 text-gray-800 dark:text-white">
                    <Upload className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" /> Upload Media to Cloudinary
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-gray-400" />
                </Link>

                <Link
                  to="/admin/news"
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#041801] hover:bg-gray-100 dark:hover:bg-black transition-colors"
                >
                  <span className="flex items-center gap-2 text-gray-800 dark:text-white">
                    <Newspaper className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" /> Publish News Article
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-gray-400" />
                </Link>

                <Link
                  to="/admin/events"
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#041801] hover:bg-gray-100 dark:hover:bg-black transition-colors"
                >
                  <span className="flex items-center gap-2 text-gray-800 dark:text-white">
                    <Calendar className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" /> Add Upcoming Event
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-gray-400" />
                </Link>

                <Link
                  to="/admin/homepage"
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#041801] hover:bg-gray-100 dark:hover:bg-black transition-colors"
                >
                  <span className="flex items-center gap-2 text-gray-800 dark:text-white">
                    <Globe className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" /> Edit Homepage Hero & Alerts
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-gray-400" />
                </Link>

                <Link
                  to="/admin/executives"
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#041801] hover:bg-gray-100 dark:hover:bg-black transition-colors"
                >
                  <span className="flex items-center gap-2 text-gray-800 dark:text-white">
                    <Award className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" /> Manage NACOS Executives & Header
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-gray-400" />
                </Link>

                <Link
                  to="/admin/administration"
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#041801] hover:bg-gray-100 dark:hover:bg-black transition-colors"
                >
                  <span className="flex items-center gap-2 text-gray-800 dark:text-white">
                    <Building2 className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" /> Manage Department Administration
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-gray-400" />
                </Link>
              </div>
            </div>

            {/* Architecture Scope Overview Box */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#083002] to-[#041801] border border-[#138601]/40 text-white space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#4bd043]">
                <ShieldCheck className="w-4 h-4" />
                <span>Isolated Administration Perimeter</span>
              </div>
              <p className="text-[11px] text-green-100/80 leading-relaxed">
                Changes made in this console affect the public website frontend. Student academic records and examination results remain locked inside the Student Portal.
              </p>
              <div className="pt-2 flex items-center justify-between text-[10px] font-mono text-green-300/70 border-t border-[#138601]/20">
                <span>Active Scope: {admin?.scope}</span>
                <span>Session: Secured</span>
              </div>
            </div>
          </div>

          {/* Audit Activity Stream */}
          <div className="lg:col-span-7">
            <div className="p-6 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#138601]/20 pb-3">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
                  <span>Recent Administrative Activity</span>
                </h3>
                <Link
                  to="/admin/audit-logs"
                  className="text-xs text-[#138601] dark:text-[#4bd043] font-semibold hover:underline"
                >
                  View Full Audit Log
                </Link>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-[#138601]/20">
                {recentLogs.map((log) => (
                  <div key={log.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-white capitalize">
                          {log.action.replace(/_/g, ' ')}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-gray-100 dark:bg-[#041801] text-gray-600 dark:text-green-300">
                          {log.resource_type}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-green-200/70 truncate">
                        By {log.admin_email}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-400 dark:text-green-200/50 shrink-0">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>

              {recentLogs.length === 0 && (
                <div className="text-center py-6 text-xs text-gray-400">
                  No recent audit activity recorded yet.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </WebsiteAdminLayout>
  );
};

export default AdminDashboard;
