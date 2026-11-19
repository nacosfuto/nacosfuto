import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaStar, FaArrowRight } from 'react-icons/fa';
import { FiUserCheck, FiExternalLink, FiCheckCircle } from 'react-icons/fi';
import ScrollToTopLink from '../ScrollToTopLink';
import { getEvents, fetchEventsFromSupabase } from '@nacos/supabase';
import { getCloudinaryAssetUrl } from '@nacos/media';

const PLACEHOLDER_IMG = getCloudinaryAssetUrl('event_tech_day') || "https://res.cloudinary.com/a2mmcttn/image/upload/v1788569305/nacos/events/event_tech_day.jpg";

const resolveRegistrationUrl = (event) => {
  const explicit = event.registration_link || event.registrationLink || event.link;
  if (explicit && typeof explicit === 'string' && explicit.trim()) {
    let clean = explicit.trim();
    clean = clean.replace(/\/portal\/hackathons\//g, '/hackathons/');
    return clean;
  }
  if (event.slug === 'the-agentic-build' || event.title?.toLowerCase().includes('agentic build')) {
    return '/hackathons/the-agentic-build';
  }
  return 'https://forms.gle/nacosfutoregistration';
};

const isInternalUrl = (url) => {
  if (!url) return false;
  if (url.startsWith('/')) return true;
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.nacosfuto.com.ng';
    const parsed = new URL(url, origin);
    const hostname = parsed.hostname.toLowerCase();
    return (
      hostname === 'www.nacosfuto.com.ng' ||
      hostname === 'nacosfuto.com.ng' ||
      hostname === 'nacosfuto.com' ||
      hostname === 'www.nacosfuto.com' ||
      (typeof window !== 'undefined' && hostname === window.location.hostname)
    );
  } catch {
    return false;
  }
};

const getInternalPath = (url) => {
  if (url.startsWith('/')) return url;
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.nacosfuto.com.ng';
    const parsed = new URL(url, origin);
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return url;
  }
};

const UpcomingEvents = () => {
  const [featuredEvents, setFeaturedEvents] = useState(() => {
    const all = getEvents({ category: 'all', publishedOnly: true });
    const featured = all.filter(e => Boolean(e.is_featured));
    if (featured.length > 0) return featured;
    const upcoming = all.filter(e => e.category === 'upcoming');
    return upcoming.length > 0 ? upcoming : all;
  });

  useEffect(() => {
    const syncFeaturedEvents = () => {
      const all = getEvents({ category: 'all', publishedOnly: true });
      const featured = all.filter(e => Boolean(e.is_featured));
      if (featured.length > 0) {
        setFeaturedEvents([...featured].sort((a, b) => {
          if (a.category === 'upcoming' && b.category !== 'upcoming') return -1;
          if (a.category !== 'upcoming' && b.category === 'upcoming') return 1;
          return 0;
        }));
      } else {
        const upcoming = all.filter(e => e.category === 'upcoming');
        setFeaturedEvents(upcoming.length > 0 ? upcoming : all);
      }
    };

    fetchEventsFromSupabase().then(() => syncFeaturedEvents()).catch(() => {});

    window.addEventListener('nacos_website_events_updated', syncFeaturedEvents);
    window.addEventListener('storage', syncFeaturedEvents);

    return () => {
      window.removeEventListener('nacos_website_events_updated', syncFeaturedEvents);
      window.removeEventListener('storage', syncFeaturedEvents);
    };
  }, []);

  // Display at most 4 spotlight featured events on homepage
  const displayedEvents = featuredEvents.slice(0, 4);

  if (featuredEvents.length === 0) {
    return null;
  }

  return (
    <section className="py-20 bg-white dark:bg-[#041801] transition-colors duration-300">
      <div className="site-container">
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-black dark:text-white tracking-tight mb-3">
            Featured <span className="text-[#138601] dark:text-[#4bd043]">Events</span>
          </h2>
          <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed max-w-2xl mx-auto">
            Explore department spotlight hackathons, technical conferences, conventions, and networking sessions.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {displayedEvents.map((event) => {
            const isPast = event.category === 'past';
            const regUrl = resolveRegistrationUrl(event);
            const internal = isInternalUrl(regUrl);
            const internalPath = internal ? getInternalPath(regUrl) : '';

            return (
              <div
                key={event.id || event.slug}
                className="group flex flex-col sm:flex-row rounded overflow-hidden border border-gray-200 dark:border-[#138601]/30 bg-white dark:bg-[#083002] shadow-sm hover:shadow-xl hover:border-[#138601] dark:hover:border-[#4bd043] transform hover:-translate-y-1.5 transition-all duration-300"
              >
                {/* Image Container */}
                <div className="sm:w-2/5 h-52 sm:h-auto overflow-hidden relative bg-[#041801]">
                  {internal ? (
                    <ScrollToTopLink to={internalPath} className="block w-full h-full">
                      <img
                        src={event.image || event.image_url || PLACEHOLDER_IMG}
                        alt={event.title}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                      />
                    </ScrollToTopLink>
                  ) : (
                    <a href={regUrl} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                      <img
                        src={event.image || event.image_url || PLACEHOLDER_IMG}
                        alt={event.title}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                      />
                    </a>
                  )}
                  <div className="absolute top-3 left-3 bg-[#138601] text-white px-2.5 py-0.5 rounded font-bold text-[10px] uppercase tracking-wider shadow-sm flex items-center gap-1 pointer-events-none">
                    <FaStar className="text-[9px] text-amber-300" />
                    FEATURED
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 sm:w-3/5 flex flex-col justify-between text-black dark:text-white">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold mb-2 text-black dark:text-white group-hover:text-[#138601] dark:group-hover:text-[#4bd043] transition-colors leading-snug tracking-tight">
                      {internal ? (
                        <ScrollToTopLink to={internalPath} className="hover:underline">
                          {event.title}
                        </ScrollToTopLink>
                      ) : (
                        <a href={regUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {event.title}
                        </a>
                      )}
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-4 line-clamp-2">
                      {event.description}
                    </p>
                  </div>
                  
                  <div>
                    <div className="space-y-1.5 border-t pt-3 border-gray-100 dark:border-white/10 text-xs text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <FaCalendarAlt className="text-[#138601] dark:text-[#4bd043]" />
                        <span className="font-semibold text-black dark:text-white">{event.date || event.event_date}</span>
                      </div>
                      {event.time && (
                        <div className="flex items-center gap-2">
                          <FaClock className="text-[#138601] dark:text-[#4bd043]" />
                          <span>{event.time || event.event_time}</span>
                        </div>
                      )}
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <FaMapMarkerAlt className="text-[#138601] dark:text-[#4bd043]" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Registration CTA Button */}
                    <div className="pt-4 mt-3 border-t border-gray-100 dark:border-white/10 flex items-center justify-between">
                      {isPast ? (
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded text-xs font-semibold bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400">
                          <FiCheckCircle className="text-xs text-gray-400" />
                          <span>Event Concluded</span>
                        </span>
                      ) : internal ? (
                        <ScrollToTopLink
                          to={internalPath}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#138601] hover:bg-[#0f6c01] text-white text-xs font-bold uppercase tracking-wider rounded shadow-sm hover:shadow transition-all cursor-pointer"
                        >
                          <FiUserCheck className="text-sm" />
                          <span>Register for Event</span>
                          <FaArrowRight className="text-[10px]" />
                        </ScrollToTopLink>
                      ) : (
                        <a
                          href={regUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#138601] hover:bg-[#0f6c01] text-white text-xs font-bold uppercase tracking-wider rounded shadow-sm hover:shadow transition-all cursor-pointer"
                        >
                          <FiUserCheck className="text-sm" />
                          <span>Register for Event</span>
                          <FiExternalLink className="text-xs opacity-90" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <ScrollToTopLink
            to="/events"
            className="inline-flex items-center justify-center px-7 py-2.5 bg-[#138601] hover:bg-[#0f6c01] text-white font-semibold text-sm rounded shadow-sm transition-colors cursor-pointer min-h-[42px]"
          >
            View All Department Events &rarr;
          </ScrollToTopLink>
        </div>
      </div>
    </section>
  );
};

export default UpcomingEvents;
