import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@nacos/supabase';
import ScrollToTopLink from '../ScrollToTopLink';
import { Megaphone, ExternalLink, ArrowRight, X } from 'lucide-react';

const AnnouncementTicker = () => {
  const [tickerData, setTickerData] = useState(() => {
    try {
      const cached = localStorage.getItem('nacos_homepage_cms_db');
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          active: Boolean(parsed.announcement_active),
          text: parsed.announcement_text || '',
          link: parsed.announcement_link || '',
          linkText: parsed.announcement_link_text || 'Learn More'
        };
      }
    } catch (_) {}
    return {
      active: false,
      text: '',
      link: '',
      linkText: 'Learn More'
    };
  });

  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('nacos_ticker_dismissed') === 'true';
    } catch (_) {
      return false;
    }
  });

  const updateStateFromRaw = (raw) => {
    if (!raw || typeof raw !== 'object') return;
    const active = Boolean(raw.announcement_active);
    const text = (raw.announcement_text || '').trim();
    const link = (raw.announcement_link || '').trim();
    const linkText = (raw.announcement_link_text || 'Learn More').trim();

    setTickerData(prev => {
      // If the announcement message changed, un-dismiss it so visitors see the new announcement
      if (text !== prev.text) {
        try { sessionStorage.removeItem('nacos_ticker_dismissed'); } catch (_) {}
        setDismissed(false);
      }
      return { active, text, link, linkText: linkText || 'Learn More' };
    });
  };

  useEffect(() => {
    let isMounted = true;

    const loadLiveTicker = async () => {
      try {
        if (!supabase) return;
        const { data, error } = await supabase
          .from('id_card_settings')
          .select('id, academic_session')
          .eq('id', 'store_homepage_content')
          .maybeSingle();

        if (!error && data?.academic_session && isMounted) {
          try {
            const parsed = JSON.parse(data.academic_session);
            updateStateFromRaw(parsed);
          } catch (_) {}
        }
      } catch (err) {
        console.debug('Announcement ticker fetch notice:', err);
      }
    };

    loadLiveTicker();

    // Listen to real-time database updates for instant toggle
    let channel = null;
    try {
      if (supabase) {
        channel = supabase
          .channel('realtime_announcement_ticker')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'id_card_settings',
              filter: 'id=eq.store_homepage_content'
            },
            (payload) => {
              if (!isMounted) return;
              if (payload.new?.academic_session) {
                try {
                  const parsed = JSON.parse(payload.new.academic_session);
                  updateStateFromRaw(parsed);
                } catch (_) {}
              }
            }
          )
          .subscribe();
      }
    } catch (_) {}

    // Listen to local storage & cross-tab events
    const handleStorageChange = (e) => {
      if (e.key === 'nacos_homepage_cms_db' && e.newValue) {
        try {
          updateStateFromRaw(JSON.parse(e.newValue));
        } catch (_) {}
      }
    };

    const handleCustomCmsUpdate = (e) => {
      if (e.detail) {
        updateStateFromRaw(e.detail);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('nacos_homepage_cms_updated', handleCustomCmsUpdate);

    return () => {
      isMounted = false;
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('nacos_homepage_cms_updated', handleCustomCmsUpdate);
    };
  }, []);

  const handleDismiss = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setDismissed(true);
    try {
      sessionStorage.setItem('nacos_ticker_dismissed', 'true');
    } catch (_) {}
  };

  const isExternalLink = useMemo(() => {
    if (!tickerData.link) return false;
    return tickerData.link.startsWith('http://') || tickerData.link.startsWith('https://');
  }, [tickerData.link]);

  // Clean empty fallback / toggle condition
  if (!tickerData.active || !tickerData.text || dismissed) {
    return null;
  }

  // Ticker content item
  const renderItemContent = (keyPrefix) => {
    const content = (
      <span className="inline-flex items-center gap-2.5">
        <span className="font-medium text-white tracking-wide text-xs sm:text-[13px]">
          {tickerData.text}
        </span>

        {tickerData.link && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white text-[#138601] hover:bg-green-50 text-[11px] font-bold transition-all shadow-xs shrink-0 cursor-pointer border border-white">
            <span>{tickerData.linkText || 'Learn More'}</span>
            {isExternalLink ? (
              <ExternalLink className="w-3 h-3" />
            ) : (
              <ArrowRight className="w-3 h-3" />
            )}
          </span>
        )}
      </span>
    );

    if (tickerData.link) {
      if (isExternalLink) {
        return (
          <a
            key={keyPrefix}
            href={tickerData.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 text-white hover:text-green-100 transition-colors shrink-0"
          >
            {content}
          </a>
        );
      }
      return (
        <ScrollToTopLink
          key={keyPrefix}
          to={tickerData.link}
          className="inline-flex items-center gap-2.5 text-white hover:text-green-100 transition-colors shrink-0"
        >
          {content}
        </ScrollToTopLink>
      );
    }

    return (
      <div key={keyPrefix} className="inline-flex items-center gap-2.5 shrink-0">
        {content}
      </div>
    );
  };

  return (
    <>
      {/* Self-contained keyframes guarantee animation runs across all build environments */}
      <style>{`
        @keyframes nacosTickerScroll {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }
        .nacos-ticker-active-track {
          display: inline-flex !important;
          white-space: nowrap !important;
          width: max-content !important;
          animation: nacosTickerScroll 30s linear infinite !important;
          will-change: transform;
        }
        .nacos-ticker-active-track:hover {
          animation-play-state: paused !important;
        }
      `}</style>

      <div
        role="region"
        aria-label="Top Announcement Ticker"
        className="relative z-50 w-full bg-[#138601] text-white border-b border-[#0f6c01] shadow-xs overflow-hidden select-none"
      >
        <div className="flex items-center h-9 sm:h-10 px-2 sm:px-4">
          
          {/* Left Badge: Pinned Solid Badge */}
          <div className="relative z-10 flex items-center gap-1.5 bg-[#0a4800] border border-white/20 px-2.5 py-0.5 rounded-full shadow-xs shrink-0 mr-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4bd043] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4bd043]"></span>
            </span>
            <Megaphone className="w-3.5 h-3.5 text-[#4bd043]" />
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-white">
              Latest
            </span>
          </div>

          {/* Middle: Continuous Animated Scrolling Ticker */}
          <div className="relative flex-1 overflow-hidden h-full flex items-center">
            <div className="nacos-ticker-active-track flex items-center gap-10 whitespace-nowrap">
              {/* Duplicate set 1 */}
              <div className="flex items-center gap-10 shrink-0">
                {renderItemContent('ticker-a1')}
                <span className="text-white/40 text-xs select-none">✦</span>
                {renderItemContent('ticker-a2')}
                <span className="text-white/40 text-xs select-none">✦</span>
                {renderItemContent('ticker-a3')}
                <span className="text-white/40 text-xs select-none">✦</span>
              </div>
              {/* Duplicate set 2 (Seamless loop partner) */}
              <div className="flex items-center gap-10 shrink-0">
                {renderItemContent('ticker-b1')}
                <span className="text-white/40 text-xs select-none">✦</span>
                {renderItemContent('ticker-b2')}
                <span className="text-white/40 text-xs select-none">✦</span>
                {renderItemContent('ticker-b3')}
                <span className="text-white/40 text-xs select-none">✦</span>
              </div>
            </div>
          </div>

          {/* Right: Dismiss button */}
          <button
            onClick={handleDismiss}
            type="button"
            aria-label="Dismiss announcement"
            title="Dismiss announcement"
            className="relative z-10 p-1 ml-2 text-white/80 hover:text-white hover:bg-black/15 rounded-full transition-colors cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>

        </div>
      </div>
    </>
  );
};

export default AnnouncementTicker;
