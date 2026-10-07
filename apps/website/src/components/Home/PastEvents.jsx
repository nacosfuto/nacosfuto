import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaStar } from 'react-icons/fa';
import ScrollToTopLink from '../ScrollToTopLink';
import { getEvents, fetchEventsFromSupabase } from '@nacos/supabase';
import { getCloudinaryAssetUrl } from '@nacos/media';

const PLACEHOLDER_IMG = getCloudinaryAssetUrl('event_tech_day') || "https://res.cloudinary.com/a2mmcttn/image/upload/v1788569305/nacos/events/event_tech_day.jpg";

const UpcomingEvents = () => {
  const [featuredEvents, setFeaturedEvents] = useState(() => {
    return getEvents({ category: 'all', publishedOnly: true }).filter(e => e.is_featured);
  });

  useEffect(() => {
    const syncFeaturedEvents = () => {
      const all = getEvents({ category: 'all', publishedOnly: true });
      const featured = all.filter(e => Boolean(e.is_featured));
      setFeaturedEvents(featured);
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
          {displayedEvents.map((event) => (
            <div
              key={event.id || event.slug}
              className="group flex flex-col sm:flex-row rounded overflow-hidden border border-gray-200 dark:border-[#138601]/30 bg-white dark:bg-[#083002] shadow-sm hover:shadow-xl hover:border-[#138601] dark:hover:border-[#4bd043] transform hover:-translate-y-1.5 transition-all duration-300"
            >
              {/* Image Container */}
              <div className="sm:w-2/5 h-52 sm:h-auto overflow-hidden relative bg-[#041801]">
                <img
                  src={event.image || event.image_url || PLACEHOLDER_IMG}
                  alt={event.title}
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-[#138601] text-white px-2.5 py-0.5 rounded font-bold text-[10px] uppercase tracking-wider shadow-sm flex items-center gap-1">
                  <FaStar className="text-[9px] text-amber-300" />
                  FEATURED
                </div>
              </div>

              {/* Content */}
              <div className="p-6 sm:w-3/5 flex flex-col justify-between text-black dark:text-white">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold mb-2 text-black dark:text-white group-hover:text-[#138601] dark:group-hover:text-[#4bd043] transition-colors leading-snug tracking-tight">
                    {event.title}
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-4 line-clamp-2">
                    {event.description}
                  </p>
                </div>
                
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
              </div>
            </div>
          ))}
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
