import React, { useState, useEffect, useMemo } from 'react';
import PortalLayout from '../components/PortalLayout';
import NoticeModal from '../components/NoticeModal';
import { 
  Bell, 
  Search, 
  Users, 
  Calendar, 
  Building2, 
  AlertCircle, 
  Filter, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { fetchNotices } from '@nacos/supabase';

export default function Notices() {
  const [notices, setNotices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [selectedNoticeForModal, setSelectedNoticeForModal] = useState(null);

  // Load student profile to highlight relevant notices
  const [studentUser] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('nacos_user');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (_) {}
      }
    }
    return null;
  });

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetchNotices({ activeOnly: true });
      if (res.data) {
        setNotices(res.data);
      }
    } catch (e) {
      console.error('Error fetching notices:', e);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);

    // Listen for cross-tab or admin notice updates
    const handleUpdate = () => loadData(true);
    window.addEventListener('nacos_notices_updated', handleUpdate);
    return () => window.removeEventListener('nacos_notices_updated', handleUpdate);
  }, []);

  const levelOptions = ['All', '100L', '200L', '300L', '400L', '500L'];

  // Filtered notices
  const filteredNotices = useMemo(() => {
    return notices.filter(item => {
      // Level filter
      if (selectedLevel !== 'All') {
        const target = (item.target_audience || '').toUpperCase();
        if (target !== 'ALL STUDENTS' && target !== 'ALL' && !target.includes(selectedLevel.replace('L', ''))) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchContent = (item.content || '').toLowerCase().includes(q);
        const matchUnit = (item.author_unit || '').toLowerCase().includes(q);
        const matchAudience = (item.target_audience || '').toLowerCase().includes(q);
        if (!matchTitle && !matchContent && !matchUnit && !matchAudience) {
          return false;
        }
      }

      return true;
    });
  }, [notices, selectedLevel, searchQuery]);

  // Only the active assigned urgent/login pop-up notice should display the "Urgent Attention" badge
  const activeUrgentNoticeId = useMemo(() => {
    // 1. Find notice explicitly flagged as active login pop-up
    const popup = notices.find(n => n.is_popup === true && n.is_published !== false);
    if (popup) return popup.id;
    // 2. Otherwise find the single newest urgent notice
    const urgent = notices.find(n => n.is_urgent === true && n.is_published !== false);
    return urgent ? urgent.id : null;
  }, [notices]);

  return (
    <PortalLayout>
      <div className="space-y-6 pb-12">
        {/* Page Banner Header */}
        <div className="bg-gradient-to-r from-[#083002] to-[#0d4d03] text-white rounded-xl p-6 sm:p-8 shadow-sm border border-[#138601]/30 relative overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#138601]/30 border border-[#138601]/40 text-green-300 text-xs font-semibold">
              <Bell className="w-3.5 h-3.5" />
              <span>Official Academic Bulletin</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">
              Departmental Notices & Circulars
            </h1>
            <p className="text-green-100/80 text-xs sm:text-sm leading-relaxed max-w-2xl">
              Stay up-to-date with official directives, course registration deadlines, verification announcements, and academic circulars issued by university authorities and NACOS FUTO.
            </p>
          </div>
          {/* Subtle background art */}
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-8 translate-y-8">
            <Bell className="w-64 h-64 text-white" />
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white dark:bg-[#083002] rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-[#138601]/25 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notices by keyword, title, or unit..."
                className="w-full pl-10 pr-4 py-2 text-xs rounded border border-gray-200 dark:border-[#138601]/30 bg-gray-50/50 dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#138601] focus:border-[#138601]"
              />
            </div>

            {/* Level Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
              <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-400 mr-1 shrink-0 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Target:
              </span>
              {levelOptions.map((lvl) => {
                const isActive = selectedLevel === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSelectedLevel(lvl)}
                    className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#138601] text-white shadow-xs'
                        : 'bg-gray-100 dark:bg-[#041801] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#138601]/20 border border-gray-200 dark:border-[#138601]/20'
                    }`}
                  >
                    {lvl === 'All' ? 'All Bulletins' : lvl}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Notices Catalog List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-[#083002] rounded-xl border border-gray-200 dark:border-[#138601]/20 p-6 animate-pulse space-y-3">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : filteredNotices.length > 0 ? (
          <div className="space-y-4">
            {filteredNotices.map((notice) => {
              const isUrgent = notice.id === activeUrgentNoticeId;
              const audience = (notice.target_audience || 'ALL STUDENTS').toUpperCase();

              return (
                <div
                  key={notice.id}
                  onClick={() => setSelectedNoticeForModal(notice)}
                  className={`bg-white dark:bg-[#083002] rounded-xl border p-5 sm:p-6 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group ${
                    isUrgent
                      ? 'border-amber-400/60 dark:border-amber-500/40 bg-gradient-to-r from-amber-500/5 to-transparent'
                      : 'border-gray-200 dark:border-[#138601]/25 hover:border-[#138601]/50'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header Strip: Badges & Date */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {/* Purple Target Audience Badge */}
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-[#ede9fe] text-[#6d28d9] dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40">
                          <Users className="w-3 h-3" />
                          <span>{audience}</span>
                        </span>

                        {/* Urgent / Push Badge */}
                        {isUrgent && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200/60 dark:border-red-800/40">
                            <AlertCircle className="w-3 h-3" />
                            <span>Urgent Attention</span>
                          </span>
                        )}
                      </div>

                      {/* Date */}
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-400 font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{notice.published_date}</span>
                      </div>
                    </div>

                    {/* Notice Title */}
                    <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white group-hover:text-[#138601] dark:group-hover:text-[#4bd043] transition-colors leading-snug">
                      {notice.title}
                    </h2>

                    {/* Notice Excerpt */}
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed font-normal">
                      {notice.content}
                    </p>
                  </div>

                  {/* Card Bottom Meta & CTA */}
                  <div className="pt-4 mt-4 border-t border-gray-100 dark:border-[#138601]/15 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 font-semibold">
                      <Building2 className="w-3.5 h-3.5 text-[#138601] dark:text-[#4bd043]" />
                      <span>{notice.author_unit || 'Admissions Unit'}</span>
                    </div>

                    <span className="inline-flex items-center gap-1 text-[#138601] dark:text-[#4bd043] font-bold group-hover:translate-x-0.5 transition-transform">
                      Read Full Notice <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16 px-4 bg-white dark:bg-[#083002] rounded-xl border border-dashed border-gray-300 dark:border-[#138601]/30">
            <Bell className="mx-auto text-4xl text-gray-400 dark:text-gray-500 mb-3" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">No notices found</h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto">
              There are currently no active notices matching your selected filter or search query.
            </p>
            {(searchQuery || selectedLevel !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedLevel('All');
                }}
                className="mt-4 px-4 py-2 bg-[#138601] hover:bg-[#0f6c01] text-white font-semibold rounded text-xs transition-colors shadow-xs cursor-pointer"
              >
                Clear Search & Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pop-up Notice Modal for Reading Full Content */}
      <NoticeModal
        notice={selectedNoticeForModal}
        isOpen={Boolean(selectedNoticeForModal)}
        onClose={() => setSelectedNoticeForModal(null)}
      />
    </PortalLayout>
  );
}
