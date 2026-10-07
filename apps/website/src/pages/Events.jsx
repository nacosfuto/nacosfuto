import React, { useState, useEffect } from 'react';
import Navbar from '../components/Nav/Navbar';
import Footer from '../components/Footer';
import { useTheme } from '../context/ThemeContext';
import { FaCalendarAlt } from 'react-icons/fa';
import { getCloudinaryAssetUrl } from '@nacos/media';
import { getEvents, fetchEventsFromSupabase } from '@nacos/supabase';
import EventCard from '../components/Events/EventCard';
import { EventRecapModal } from '../components/Events/EventModals';

const Events = () => {
  const { theme } = useTheme();
  const [allEvents, setAllEvents] = useState(() => getEvents({ category: 'all', publishedOnly: true }));

  // Dynamic syncing with Supabase and real-time dashboard events
  useEffect(() => {
    fetchEventsFromSupabase().then(() => {
      setAllEvents(getEvents({ category: 'all', publishedOnly: true }));
    });

    const handleSync = () => {
      setAllEvents(getEvents({ category: 'all', publishedOnly: true }));
    };

    window.addEventListener('nacos_website_events_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('nacos_website_events_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const upcomingEvents = allEvents.filter(e => e.category === 'upcoming');
  const recentEvents = allEvents.filter(e => e.category === 'recent');
  const pastEvents = allEvents.filter(e => e.category === 'past');

  // Recap Modal State for Concluded Events
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isRecapModalOpen, setIsRecapModalOpen] = useState(false);

  const handleOpenRecapModal = (event) => {
    setSelectedEvent(event);
    setIsRecapModalOpen(true);
  };

  const heroImage = upcomingEvents[0]?.image || getCloudinaryAssetUrl('event_tech_day') || '';

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-[#041801] text-white' : 'bg-white text-black'} transition-colors duration-300`}>
      <Navbar />

      <main className="flex-grow">
        {/* Full-width Home-Style Hero Section */}
        <section className="relative flex min-h-[460px] sm:min-h-[500px] md:h-[65vh] items-center justify-center overflow-hidden bg-gray-950">
          <img
            src={heroImage}
            alt="Department Events Banner"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-[#041801]/95 via-[#041801]/60 to-black/35" />
          <div className="absolute inset-0 bg-black/25" />

          <div className="relative z-10 text-center px-4 sm:px-6 max-w-4xl mx-auto flex flex-col items-center py-16 sm:py-20 md:py-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#138601]/80 text-white font-bold text-xs uppercase tracking-wider mb-4 border border-green-400/30 shadow">
              <FaCalendarAlt className="text-xs" />
              <span>Conferences & Gatherings</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 drop-shadow-lg tracking-tight leading-[1.2]">
              Department <span className="text-[#4bd043]">Events</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-100 max-w-2xl drop-shadow font-normal leading-relaxed text-center">
              Explore our tech workshops, hackathons, regional coding competitions, and upcoming academic conferences.
            </p>
          </div>
        </section>

        <div className="site-container py-16 w-full">

          {/* 1. Upcoming Events Section */}
          {upcomingEvents.length > 0 && (
            <section id="upcoming-events-section" className="mb-20">
              <div className="flex items-center gap-4 mb-8">
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Upcoming Events</h2>
                <div className="h-1 flex-grow bg-gradient-to-r from-green-500 to-transparent rounded-full opacity-30"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {upcomingEvents.map(event => (
                  <EventCard
                    key={event.id || event.slug}
                    event={event}
                    type="upcoming"
                    theme={theme}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 2. Recent Events Section */}
          {recentEvents.length > 0 && (
            <section className="mb-20">
              <div className="flex items-center gap-4 mb-8">
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Recent Events</h2>
                <div className="h-1 flex-grow bg-gradient-to-r from-blue-500 to-transparent rounded-full opacity-30"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {recentEvents.map(event => (
                  <EventCard
                    key={event.id || event.slug}
                    event={event}
                    type="recent"
                    theme={theme}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 3. Past Events Section */}
          {pastEvents.length > 0 && (
            <section>
              <div className="flex items-center gap-4 mb-8">
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Past Events</h2>
                <div className="h-1 flex-grow bg-gradient-to-r from-gray-500 to-transparent rounded-full opacity-30"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {pastEvents.map(event => (
                  <EventCard
                    key={event.id || event.slug}
                    event={event}
                    type="past"
                    theme={theme}
                    onAction={handleOpenRecapModal}
                  />
                ))}
              </div>
            </section>
          )}

          {upcomingEvents.length === 0 && recentEvents.length === 0 && pastEvents.length === 0 && (
            <div className="py-20 text-center text-gray-500 dark:text-green-200/50">
              <FaCalendarAlt className="w-12 h-12 mx-auto mb-3 opacity-40 text-[#138601]" />
              <p className="text-lg font-semibold">No scheduled events published at the moment.</p>
              <p className="text-sm mt-1">Please check back soon for upcoming department updates and activities.</p>
            </div>
          )}

        </div>
      </main>

      {/* Past Event Recap Modal Overlay */}
      <EventRecapModal
        isOpen={isRecapModalOpen}
        event={selectedEvent}
        theme={theme}
        onClose={() => setIsRecapModalOpen(false)}
        onExploreUpcoming={() => {
          setIsRecapModalOpen(false);
          document.getElementById('upcoming-events-section')?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      <Footer />
    </div>
  );
};

export default Events;
