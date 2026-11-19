import React from 'react';
import { FaCalendarAlt, FaMapMarkerAlt, FaClock, FaArrowRight } from 'react-icons/fa';
import { FiUserCheck, FiCheckCircle, FiExternalLink } from 'react-icons/fi';
import ScrollToTopLink from '../ScrollToTopLink';

const BADGE_CONFIG = {
  upcoming: {
    label: 'UPCOMING',
    className: 'bg-green-600 text-white'
  },
  recent: {
    label: 'RECENT',
    className: 'bg-[#138601] text-white'
  },
  past: {
    label: 'PAST',
    className: 'bg-gray-500 text-white'
  }
};

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

export const EventCard = ({ event, type = 'upcoming', theme = 'light', onAction }) => {
  const isPast = type === 'past';
  const badge = BADGE_CONFIG[type] || BADGE_CONFIG.upcoming;
  const regUrl = resolveRegistrationUrl(event);
  const internal = isInternalUrl(regUrl);
  const internalPath = internal ? getInternalPath(regUrl) : '';

  return (
    <div
      className={`group flex flex-col lg:flex-row rounded-[5px] overflow-hidden border shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1.5 ${
        theme === 'dark' ? 'bg-[#083002] border-[#138601]/30' : 'bg-white border-gray-200'
      }`}
    >
      {/* Flyer / Banner Thumbnail */}
      <div className="lg:w-2/5 h-56 lg:h-auto overflow-hidden relative">
        <img
          src={event.image}
          alt={event.title}
          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
        />
        <div className={`absolute top-4 left-4 px-3 py-1.5 rounded-[5px] font-bold text-xs shadow ${badge.className}`}>
          {badge.label}
        </div>
      </div>

      {/* Event Details */}
      <div className="p-8 lg:w-3/5 flex flex-col justify-between text-gray-900 dark:text-white">
        <div>
          <h3
            className={`text-xl sm:text-2xl font-bold mb-3 transition-colors ${
              theme === 'dark'
                ? 'text-white group-hover:text-[#4bd043]'
                : 'text-gray-900 group-hover:text-[#138601]'
            }`}
          >
            {event.title}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6">
            {event.description}
          </p>
        </div>

        {/* Schedule & Location */}
        <div className="space-y-2 border-t pt-4 border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <FaCalendarAlt className="text-green-500" />
            <span className="font-semibold text-gray-850 dark:text-gray-200">{event.date}</span>
          </div>
          <div className="flex items-center gap-2">
            <FaClock className="text-green-500" />
            <span className="text-gray-700 dark:text-gray-300">{event.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <FaMapMarkerAlt className="text-green-500" />
            <span className="text-gray-700 dark:text-gray-300">{event.location}</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-5 mt-4 border-t border-gray-200 dark:border-gray-700/60 flex items-center justify-between">
          {isPast ? (
            <button
              type="button"
              className="w-full sm:w-auto px-5 py-2.5 rounded-[5px] border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-2xs opacity-85 cursor-default"
            >
              <FiCheckCircle className="text-sm text-gray-400 dark:text-gray-500" />
              <span>Event Concluded</span>
            </button>
          ) : internal ? (
            <ScrollToTopLink
              to={internalPath}
              className="w-full sm:w-auto px-5 py-2.5 rounded-[5px] bg-[#138601] hover:bg-[#0f6b01] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <FiUserCheck className="text-sm" />
              <span>Register for Event</span>
              <FaArrowRight className="text-xs opacity-90" />
            </ScrollToTopLink>
          ) : (
            <a
              href={regUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-5 py-2.5 rounded-[5px] bg-[#138601] hover:bg-[#0f6b01] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <FiUserCheck className="text-sm" />
              <span>Register for Event</span>
              <FiExternalLink className="text-xs opacity-80" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventCard;
