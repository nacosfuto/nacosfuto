import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  User, 
  Pin, 
  RefreshCw, 
  ChevronRight, 
  ChevronDown,
  Tag, 
  ShieldCheck, 
  AlertCircle,
  ExternalLink,
  Search,
  Bell
} from 'lucide-react';
import { getElectraNews, fetchLiveElectraData } from '@nacos/supabase/electraService';

export default function NewsPressPage() {
  const [newsList, setNewsList] = useState(() => getElectraNews());
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      setNewsList(getElectraNews());
    };
    window.addEventListener('nacos_electra_news_updated', handleUpdate);
    return () => {
      window.removeEventListener('nacos_electra_news_updated', handleUpdate);
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchLiveElectraData();
      setNewsList(getElectraNews());
    } catch (_) {}
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const categories = ['All', 'Electoral Notice', 'Polling Station', 'Press Release', 'Urgent Announcement'];

  const filteredNews = newsList.filter(item => {
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const pinnedItems = filteredNews.filter(n => n.pinned);
  const regularItems = filteredNews.filter(n => !n.pinned);

  return (
    <div className="py-10 site-container bg-[#F8FAFC]">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 font-display">
            News & Press Releases
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
            Authoritative communications, polling announcements, debate schedules, and certified circulars issued by NACOS ISEC.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[5px] text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shrink-0 cursor-pointer shadow-2xs transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#138601] ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Releases</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 p-4 rounded-[5px] bg-white border border-slate-200 shadow-2xs">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-[4px] text-xs font-bold transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#138601] text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search announcements..."
            className="w-full pl-9 pr-3 py-1.5 rounded-[4px] text-xs bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#138601]"
          />
        </div>
      </div>

      {/* Pinned / Spotlight Releases */}
      {pinnedItems.length > 0 && (
        <div className="mb-8 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#138601]">
            <Pin className="w-3.5 h-3.5" />
            <span>Priority Bulletin</span>
          </div>

          <div className="space-y-4">
            {pinnedItems.map((item) => {
              const isExpanded = expandedId === item.id;
              return (
                <div
                  key={item.id}
                  className="p-5 sm:p-6 rounded-[5px] bg-gradient-to-br from-green-50/80 to-white border-2 border-green-300 shadow-xs space-y-3 transition-all"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-[3px] text-[10px] font-extrabold uppercase bg-[#138601] text-white">
                        {item.tag || 'Urgent Notice'}
                      </span>
                      <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-bold bg-white text-slate-700 border border-green-200">
                        {item.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#138601]" />
                        {item.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-[#138601]" />
                        {item.author || 'NACOS ISEC'}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 font-display">
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    {item.summary}
                  </p>

                  {/* Expandable Full Content */}
                  {isExpanded && item.content && (
                    <div className="pt-3 border-t border-green-200/80 text-xs sm:text-sm text-slate-800 space-y-2 whitespace-pre-line leading-relaxed bg-white/70 p-4 rounded-[4px]">
                      {item.content}
                    </div>
                  )}

                  {item.content && item.content !== item.summary && (
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="text-xs font-bold text-[#138601] hover:text-[#0f6c01] inline-flex items-center gap-1 cursor-pointer pt-1"
                    >
                      <span>{isExpanded ? 'Collapse Full Statement' : 'Read Full Circular'}</span>
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Regular Releases Grid */}
      <div className="space-y-4">
        {regularItems.length === 0 && pinnedItems.length === 0 ? (
          <div className="p-12 text-center rounded-[5px] bg-white border border-slate-200 space-y-3">
            <Bell className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-700">No Announcements Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are currently no press releases matching your filter. Check back for official updates from the Electoral Commission.
            </p>
          </div>
        ) : (
          regularItems.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                className="p-5 sm:p-6 rounded-[5px] bg-white border border-slate-200 shadow-2xs space-y-3 hover:border-slate-300 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-[3px] text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                    {item.category}
                  </span>

                  <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {item.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {item.author || 'NACOS ISEC Secretariat'}
                    </span>
                  </div>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                  {item.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {item.summary}
                </p>

                {isExpanded && item.content && (
                  <div className="pt-3 border-t border-slate-100 text-xs sm:text-sm text-slate-700 space-y-2 whitespace-pre-line leading-relaxed bg-slate-50 p-4 rounded-[4px]">
                    {item.content}
                  </div>
                )}

                {item.content && item.content !== item.summary && (
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="text-xs font-bold text-[#138601] hover:text-[#0f6c01] inline-flex items-center gap-1 cursor-pointer pt-1"
                  >
                    <span>{isExpanded ? 'Collapse Statement' : 'Read Full Release'}</span>
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
