import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  ChevronRight,
  Sparkles,
  X,
  CheckCircle2,
  CalendarCheck2,
  ArrowUpRight
} from 'lucide-react';
import { fetchEventsFromSupabase, getEvents, supabase } from '@nacos/supabase';
import { getAppUrls } from '@nacos/config/urls';

export default function PortalEventsSection({
  limit = 6,
  showFilters = true,
  showViewAllLink = true,
  title = "Department Events & Gatherings",
  subtitle = "Live conferences, tech workshops, hackathons & student summits"
}) {
  const [events, setEvents] = useState(() => {
    // Initial load from local cache if present, otherwise clean empty array []
    try {
      const cached = getEvents({ category: 'all', publishedOnly: true });
      return Array.isArray(cached) ? cached : [];
    } catch (_) {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => events.length === 0);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'past' | 'all'
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Synchronous sync with Supabase and website-admin event dispatches
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const data = await fetchEventsFromSupabase();
        if (isMounted && Array.isArray(data)) {
          setEvents(data.filter(e => e.is_published !== false));
        }
      } catch (err) {
        console.warn('[PortalEvents] Could not fetch live events:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    const handleSync = () => {
      try {
        const updated = getEvents({ category: 'all', publishedOnly: true });
        if (Array.isArray(updated)) {
          setEvents(updated.filter(e => e.is_published !== false));
        }
      } catch (_) {}
    };

    window.addEventListener('nacos_website_events_updated', handleSync);
    window.addEventListener('storage', handleSync);

    // Supabase Realtime channel subscription on website_events table
    let channel = null;
    if (supabase) {
      try {
        channel = supabase
          .channel('portal_events_sync_' + Math.random().toString(36).substring(7))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'website_events' }, () => {
            loadData();
          })
          .subscribe();
      } catch (subErr) {
        console.warn('[PortalEvents] Realtime subscription notice:', subErr);
      }
    }

    return () => {
      isMounted = false;
      window.removeEventListener('nacos_website_events_updated', handleSync);
      window.removeEventListener('storage', handleSync);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const upcomingCount = events.filter(e => e.category === 'upcoming').length;
  const pastCount = events.filter(e => e.category === 'past' || e.category === 'recent').length;

  const filteredEvents = events.filter(e => {
    if (activeTab === 'upcoming') return e.category === 'upcoming';
    if (activeTab === 'past') return e.category === 'past' || e.category === 'recent';
    return true; // 'all'
  });

  const displayedEvents = limit ? filteredEvents.slice(0, limit) : filteredEvents;

  const { website } = getAppUrls();
  const mainWebsiteEventsUrl = `${website.replace(/\/+$/, '')}/events`;

  return (
    <div className="space-y-4">
      {/* Header Container */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#138601]/10 dark:bg-[#138601]/20 flex items-center justify-center text-[#138601] dark:text-[#4bd043] shrink-0 border border-[#138601]/20">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                {title}
              </h3>
              {upcomingCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {upcomingCount} Upcoming
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-green-200/70 font-normal">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Tab Controls and View All */}
        <div className="flex items-center gap-2 flex-wrap">
          {showFilters && (
            <div className="inline-flex items-center p-1 rounded-xl bg-gray-100 dark:bg-[#041801] border border-gray-200/80 dark:border-[#138601]/30 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('upcoming')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  activeTab === 'upcoming'
                    ? 'bg-[#138601] text-white shadow-xs'
                    : 'text-gray-600 dark:text-green-200/70 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Upcoming ({upcomingCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('past')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  activeTab === 'past'
                    ? 'bg-[#138601] text-white shadow-xs'
                    : 'text-gray-600 dark:text-green-200/70 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Past Events ({pastCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-[#138601] text-white shadow-xs'
                    : 'text-gray-600 dark:text-green-200/70 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                All ({events.length})
              </button>
            </div>
          )}

          {showViewAllLink && (
            <a
              href={mainWebsiteEventsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-[#138601]/30 bg-white dark:bg-[#083002] hover:border-[#138601] text-xs font-semibold text-gray-700 dark:text-green-200 hover:text-[#138601] dark:hover:text-[#4bd043] transition-all cursor-pointer shadow-2xs"
            >
              <span>Main Events Hub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Events Grid / State Views */}
      {loading ? (
        /* Skeleton Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(n => (
            <div
              key={n}
              className="rounded-2xl bg-white dark:bg-[#083002] border border-gray-200/80 dark:border-[#138601]/25 p-4 space-y-3 animate-pulse"
            >
              <div className="aspect-[16/9] w-full bg-gray-200 dark:bg-green-950/60 rounded-xl" />
              <div className="h-4 bg-gray-200 dark:bg-green-950/60 rounded w-3/4" />
              <div className="h-3 bg-gray-200 dark:bg-green-950/50 rounded w-1/2" />
              <div className="h-3 bg-gray-200 dark:bg-green-950/40 rounded w-full" />
            </div>
          ))}
        </div>
      ) : displayedEvents.length === 0 ? (
        /* Empty State */
        <div className="rounded-2xl bg-white dark:bg-[#083002] border border-dashed border-gray-300 dark:border-[#138601]/40 p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-[#041801] flex items-center justify-center text-gray-400 dark:text-green-300 mx-auto border border-gray-200 dark:border-[#138601]/20">
            <CalendarCheck2 className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">
            {activeTab === 'upcoming'
              ? 'No Upcoming Events Scheduled Yet'
              : activeTab === 'past'
              ? 'No Concluded Events Found'
              : 'No Department Events Published Yet'}
          </h4>
          <p className="text-xs text-gray-500 dark:text-green-200/70 max-w-md mx-auto">
            {activeTab === 'upcoming'
              ? 'Stay tuned! New technical workshops, symposiums, and departmental conferences will appear here once announced.'
              : 'All historical conferences, hackathons, and departmental symposiums will appear in this archive.'}
          </p>
          {activeTab !== 'all' && events.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className="text-xs font-semibold text-[#138601] dark:text-[#4bd043] hover:underline cursor-pointer pt-1"
            >
              View all {events.length} department events &rarr;
            </button>
          )}
        </div>
      ) : (
        /* Live Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedEvents.map((event) => {
            const isUpcoming = event.category === 'upcoming';
            const flyerUrl = event.image_url || event.image || 'https://res.cloudinary.com/a2mmcttn/image/upload/v1788569305/nacos/events/event_tech_day.jpg';

            return (
              <div
                key={event.id || event.slug}
                className="rounded-2xl bg-white dark:bg-[#083002] border border-gray-200/90 dark:border-[#138601]/30 hover:border-[#138601] dark:hover:border-[#4bd043] transition-all overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md group"
              >
                <div>
                  {/* Flyer Header Image */}
                  <div className="relative aspect-[16/9] w-full bg-gray-950 overflow-hidden cursor-pointer" onClick={() => setSelectedEvent(event)}>
                    <img
                      src={flyerUrl}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Category Pill Tag */}
                    <div className="absolute top-2.5 left-2.5">
                      {isUpcoming ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#138601] text-white shadow">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          Upcoming
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-gray-900/80 text-white backdrop-blur-xs">
                          Past Event
                        </span>
                      )}
                    </div>

                    {/* Featured Star */}
                    {event.is_featured && (
                      <div className="absolute top-2.5 right-2.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-white shadow">
                          <Sparkles className="w-3 h-3" />
                          Featured
                        </span>
                      </div>
                    )}

                    {/* Floating Date on Flyer bottom */}
                    <div className="absolute bottom-2 left-3 right-3 text-white text-xs font-semibold flex items-center gap-1.5 truncate drop-shadow">
                      <Calendar className="w-3.5 h-3.5 text-[#4bd043] shrink-0" />
                      <span className="truncate">{event.date || 'TBA'}</span>
                    </div>
                  </div>

                  {/* Card Content Body */}
                  <div className="p-4 space-y-2">
                    <h4
                      onClick={() => setSelectedEvent(event)}
                      className="text-sm sm:text-base font-bold text-gray-900 dark:text-white group-hover:text-[#138601] dark:group-hover:text-[#4bd043] transition-colors line-clamp-1 cursor-pointer"
                      title={event.title}
                    >
                      {event.title}
                    </h4>

                    {/* Time & Venue meta */}
                    <div className="space-y-1 text-[11px] text-gray-500 dark:text-green-200/70 font-medium">
                      {event.time && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#138601] dark:text-[#4bd043] shrink-0" />
                          <span className="truncate">{event.time}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#138601] dark:text-[#4bd043] shrink-0" />
                        <span className="truncate">{event.location || 'FUTO Computer Science Complex'}</span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-600 dark:text-green-100/80 line-clamp-2 leading-relaxed pt-1">
                      {event.description || 'Departmental gathering and technical conference for computing students.'}
                    </p>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-[#138601]/20 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedEvent(event)}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] hover:border-[#138601] text-xs font-semibold text-gray-800 dark:text-green-200 transition-all cursor-pointer shrink-0"
                  >
                    View Details
                  </button>

                  {isUpcoming && event.registration_link ? (
                    <a
                      href={event.registration_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#138601] hover:bg-[#107001] text-white text-xs font-bold transition-all shadow-2xs shrink-0 cursor-pointer"
                    >
                      <span>Register</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedEvent(event)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#138601] dark:text-[#4bd043] hover:underline cursor-pointer"
                    >
                      <span>{isUpcoming ? 'Learn More' : 'Highlights'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Full Event Details Preview */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 p-5 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#138601]/20">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                  selectedEvent.category === 'upcoming'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-800 text-white'
                }`}>
                  {selectedEvent.category === 'upcoming' ? 'Upcoming Event' : 'Concluded Gathering'}
                </span>
                {selectedEvent.is_featured && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-white">
                    Featured
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#041801] flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Flyer Image Preview */}
            <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-gray-950 border border-gray-100 dark:border-[#138601]/30">
              <img
                src={selectedEvent.image_url || selectedEvent.image}
                alt={selectedEvent.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Event Title */}
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                {selectedEvent.title}
              </h3>
            </div>

            {/* Schedule Details Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3.5 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-200/70 dark:border-[#138601]/25 text-xs text-gray-700 dark:text-green-200">
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-[#138601] dark:text-[#4bd043] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block text-gray-900 dark:text-white">Date:</span>
                  <span>{selectedEvent.date || 'To be announced'}</span>
                </div>
              </div>
              {selectedEvent.time && (
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-[#138601] dark:text-[#4bd043] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-gray-900 dark:text-white">Time:</span>
                    <span>{selectedEvent.time}</span>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2 sm:col-span-2">
                <MapPin className="w-4 h-4 text-[#138601] dark:text-[#4bd043] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block text-gray-900 dark:text-white">Location / Venue:</span>
                  <span>{selectedEvent.location || 'FUTO Computer Science Complex'}</span>
                </div>
              </div>
            </div>

            {/* Full Description */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-green-200/70">
                About this Event
              </h5>
              <p className="text-xs sm:text-sm text-gray-700 dark:text-green-100 leading-relaxed whitespace-pre-line">
                {selectedEvent.description || 'Join us for this official departmental computing event.'}
              </p>
            </div>

            {/* Modal Footer / Registration CTA */}
            <div className="pt-3 border-t border-gray-100 dark:border-[#138601]/20 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-[#138601]/30 bg-gray-100 dark:bg-[#041801] hover:bg-gray-200 dark:hover:bg-[#083002] text-xs font-semibold text-gray-800 dark:text-green-200 transition-colors cursor-pointer"
              >
                Close
              </button>

              {selectedEvent.registration_link && (
                <a
                  href={selectedEvent.registration_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#138601] hover:bg-[#107001] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <span>{selectedEvent.category === 'upcoming' ? 'Register Online' : 'Access Event Link'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
