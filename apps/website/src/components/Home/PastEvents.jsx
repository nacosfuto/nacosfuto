import React, { useState } from 'react';
import { FaCalendarAlt, FaClock, FaMapMarkerAlt } from 'react-icons/fa';
import ScrollToTopLink from '../ScrollToTopLink';

// Asset imports for events
import eventFoundersTable from '../../assets/event_founders_table.jpg';
import eventZonalConvention from '../../assets/event_zonal_convention.jpg';
import eventTechRewind from '../../assets/event_tech_rewind.jpg';
import eventNacosSchedule from '../../assets/event_nacos_schedule.jpg';

const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=600&q=80";

const UpcomingEvents = () => {
  const events = [
    {
      id: 1,
      title: "NACOS Week 2026: Synergy & Innovation",
      date: "August 2026 (Scheduled)",
      time: "10:00 AM",
      location: "FUTO ICT Center & SEET Complex",
      image: eventNacosSchedule,
      description: "A 5-day celebration featuring hackathons, gaming contests, project pitchings, industry tech talks, traditional day, and dinner night."
    },
    {
      id: 2,
      title: "FUTO Tech Rewind & Showcase 2026",
      date: "August 2026 (Upcoming)",
      time: "11:00 AM",
      location: "School of Computing Hall, FUTO",
      image: eventTechRewind,
      description: "Celebrating innovative tech breakthroughs, student developer showcases, startup demos, and community networking."
    },
    {
      id: 3,
      title: "The Founders Table 1.0",
      date: "August 2026 (Anticipated)",
      time: "12:00 PM",
      location: "CSC Seminar Hall, FUTO",
      image: eventFoundersTable,
      description: "Convened by Kelechukwu Okere and Nestor Anyanwu. Delving into tech startups, entrepreneurship, venture capital, and building products."
    },
    {
      id: 4,
      title: "16th Annual Zonal Convention (NACOS SE)",
      date: "Sept 22-26, 2026",
      time: "9:00 AM",
      location: "Ogbonnaya Onu Polytechnic, Aba",
      image: eventZonalConvention,
      description: "Theme: d.i.g.i.t (Develop, Innovate, Grow, Inspire, Transform). Featuring keynote talks, hackathons, and regional networking."
    }
  ];

  const [showAll] = useState(false);
  const displayedEvents = showAll ? events : events.slice(0, 4);

  return (
    <section className="py-20 bg-white dark:bg-[#041801] transition-colors duration-300">
      <div className="site-container">
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-black dark:text-white tracking-tight mb-3">
            Upcoming <span className="text-[#138601] dark:text-[#4bd043]">Events</span>
          </h2>
          <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed max-w-2xl mx-auto">
            Stay updated with department hackathons, technical conferences, conventions, and networking sessions.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {displayedEvents.map((event) => (
            <div
              key={event.id}
              className="group flex flex-col sm:flex-row rounded overflow-hidden border border-gray-200 dark:border-[#138601]/30 bg-white dark:bg-[#083002] shadow-sm hover:shadow-xl hover:border-[#138601] dark:hover:border-[#4bd043] transform hover:-translate-y-1.5 transition-all duration-300"
            >
              {/* Image Container */}
              <div className="sm:w-2/5 h-52 sm:h-auto overflow-hidden relative bg-[#041801]">
                <img
                  src={event.image || PLACEHOLDER_IMG}
                  alt={event.title}
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-[#138601] text-white px-2.5 py-0.5 rounded font-bold text-[10px] uppercase tracking-wider shadow-sm">
                  UPCOMING
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
                    <span className="font-semibold text-black dark:text-white">{event.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaClock className="text-[#138601] dark:text-[#4bd043]" />
                    <span>{event.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaMapMarkerAlt className="text-[#138601] dark:text-[#4bd043]" />
                    <span className="truncate">{event.location}</span>
                  </div>
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
