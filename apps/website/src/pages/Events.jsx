import React, { useState, useEffect } from 'react';
import Navbar from '../components/Nav/Navbar';
import Footer from '../components/Footer';
import { useTheme } from '../context/ThemeContext';
import { FaCalendarAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { getCloudinaryAssetUrl } from '@nacos/media';
import { supabase } from '@nacos/supabase';
import EventCard from '../components/Events/EventCard';
import { EventRecapModal } from '../components/Events/EventModals';

// Local Fallback Flyer Images
import eventMaskedAffairs from '../assets/event_masked_affairs.jpg';
import eventFoundersTable from '../assets/event_founders_table.jpg';
import eventZonalConvention from '../assets/event_zonal_convention.jpg';
import eventAllstarsMedia from '../assets/event_allstars_media.jpg';
import eventUnfairAdvantage from '../assets/event_unfair_advantage.jpg';
import eventAsictsTechtalk from '../assets/event_asicts_techtalk.jpg';
import eventTechRewind from '../assets/event_tech_rewind.jpg';
import eventSaferInternet from '../assets/event_safer_internet.jpg';
import eventCvMasterclass from '../assets/event_cv_masterclass.jpg';
import eventLinkedinBranding from '../assets/event_linkedin_branding.jpg';
import eventAtfAiChallenge from '../assets/event_atf_ai_challenge.jpg';
import eventIeeeOpportunities from '../assets/event_ieee_opportunities.jpg';
import eventBridgingGap from '../assets/event_bridging_gap.jpg';
import eventTechDay from '../assets/event_tech_day.jpg';
import eventGlobalInternship from '../assets/event_global_internship.jpg';
import eventOldschoolPicnic from '../assets/event_oldschool_picnic.jpg';
import eventNacosSchedule from '../assets/event_nacos_schedule.jpg';
import eventNacosSportsday from '../assets/event_nacos_sportsday.jpg';
import eventNacosThanksgivingMass from '../assets/event_nacos_thanksgiving_mass.jpg';

const CANONICAL_UPCOMING_EVENTS = [
  {
    id: 1,
    slug: 'masked-affairs',
    title: "Masked Affairs: Cum and Mingle",
    date: "Aug 15, 2026",
    time: "8:00 PM",
    location: "SOPS Theatre, FUTO",
    image: getCloudinaryAssetUrl('event_masked_affairs') || eventMaskedAffairs,
    description: "Premium masked party, networking night, and social mixer hosted by the Office of the Directors of Socials. Dress code: Mask. Red carpet starts at 8:00 PM.",
    registrationLink: "https://forms.gle/nacosfuto-masked-affairs"
  },
  {
    id: 9,
    slug: 'founders-table-1',
    title: "The Founders Table 1.0",
    date: "August 2026 (Anticipated)",
    time: "12:00 PM",
    location: "CSC Seminar Hall, FUTO",
    image: getCloudinaryAssetUrl('event_founders_table') || eventFoundersTable,
    description: "Convened by Kelechukwu Okere and Nestor Anyanwu. Delving into tech startups, entrepreneurship, venture capital, and building 'The Next Big Thing'.",
    registrationLink: "https://forms.gle/nacosfuto-founders-table"
  },
  {
    id: 10,
    slug: 'zonal-convention-2026',
    title: "16th Annual Zonal Convention (NACOS SE)",
    date: "Sept 22-26, 2026",
    time: "9:00 AM",
    location: "Ogbonnaya Onu Polytechnic, Aba",
    image: getCloudinaryAssetUrl('event_zonal_convention') || eventZonalConvention,
    description: "Theme: d.i.g.i.t (Develop, Innovate, Grow, Inspire, Transform). Featuring panel sessions, keynote talks, hackathons, and regional networking.",
    registrationLink: "https://forms.gle/nacos-se-zonal-convention-2026"
  },
];

const CANONICAL_RECENT_EVENTS = [
  {
    id: 13,
    slug: 'allstars-media-1',
    title: "All-Stars Media Conference 1.0",
    date: "July 16, 2026",
    time: "11:00 AM",
    location: "SOPS Theater, FUTO",
    image: getCloudinaryAssetUrl('event_allstars_media') || eventAllstarsMedia,
    description: "Theme: The New Media Order: Risk, Innovation, Influence & Impact. Organized by the PRO/DOI of CSC in collaboration with FSSJ.",
    registrationLink: "https://forms.gle/nacosfuto-allstars-media"
  },
  {
    id: 18,
    slug: 'atf-ai-challenge',
    title: "The ATF AI Challenge",
    date: "May 27, 2026",
    time: "7:00 PM",
    location: "Google Meet",
    image: getCloudinaryAssetUrl('event_atf_ai_challenge') || eventAtfAiChallenge,
    description: "African Technology Forum presents the ATF AI Challenge: Don't just watch the AI Revolution, lead it.",
    registrationLink: "https://forms.gle/nacosfuto-atf-ai-challenge"
  },
  {
    id: 19,
    slug: 'ieee-opportunities',
    title: "From Campus to Global Opportunities with IEEE",
    date: "May 26, 2026",
    time: "7:00 PM",
    location: "Google Meet",
    image: getCloudinaryAssetUrl('event_ieee_opportunities') || eventIeeeOpportunities,
    description: "Office of the Director of ICT in collaboration with IEEE present global opportunities and community leverage.",
    registrationLink: "https://forms.gle/nacosfuto-ieee-opportunities"
  }
];

const CANONICAL_PAST_EVENTS = [
  {
    id: 22,
    slug: 'bridging-the-gap',
    title: "Bridging the Gap: Collaboration for Inclusion",
    date: "May 01, 2026",
    time: "7:00 PM",
    location: "Google Meet",
    image: getCloudinaryAssetUrl('event_bridging_gap') || eventBridgingGap,
    description: "International Women's Day Edition focusing on collaboration for inclusion in tech. Supported by GDG FUTO, J-Tech Academy, and IEEE."
  },
  {
    id: 20,
    slug: 'linkedin-winning',
    title: "Stand Out or Stay Stuck: Winning with LinkedIn",
    date: "April 28, 2026",
    time: "7:00 PM",
    location: "Google Meet",
    image: getCloudinaryAssetUrl('event_linkedin_branding') || eventLinkedinBranding,
    description: "Learn to build your personal brand and stand out on LinkedIn. Organized by FUTO Ambassadors."
  },
  {
    id: 21,
    slug: 'cv-cover-letter',
    title: "Global CV & Cover Letter Masterclass",
    date: "April 25, 2026",
    time: "7:00 PM",
    location: "Google Meet",
    image: getCloudinaryAssetUrl('event_cv_masterclass') || eventCvMasterclass,
    description: "Build, Optimize & Get Reviewed Live. Learn how to draft winning CVs and cover letters for global job roles."
  },
  {
    id: 14,
    slug: 'unfair-advantage',
    title: "Your Unfair Advantage: Winning in Tech in 2026",
    date: "March 21, 2026",
    time: "8:00 PM",
    location: "Google Meet",
    image: getCloudinaryAssetUrl('event_unfair_advantage') || eventUnfairAdvantage,
    description: "Organized by Beyonder Network. A comprehensive session detailing career positioning and strategies to build competitive advantages in modern tech fields."
  },
  {
    id: 28,
    slug: 'thanksgiving-mass',
    title: "NACOS Thanksgiving Mass",
    date: "March 07, 2026",
    time: "7:15 AM",
    location: "Campus Chapel, FUTO",
    image: getCloudinaryAssetUrl('event_nacos_thanksgiving_mass') || eventNacosThanksgivingMass,
    description: "Official NACOS Week Thanksgiving Mass hosted by the Office of the Vice President, Nigeria Association of Computing Students (NACOS), FUTO. Celebrating faith, gratitude, and unity to round off NACOS Week."
  },
  {
    id: 15,
    slug: 'asicts-tech-talk',
    title: "ASICTS Tech Talk: Google Tools for Student Techies",
    date: "March 07, 2026",
    time: "7:30 PM",
    location: "Google Meet",
    image: getCloudinaryAssetUrl('event_asicts_techtalk') || eventAsictsTechtalk,
    description: "In collaboration with Google Developer Group On Campus FUTO. Equipping students with Google workspace and developer toolchains."
  },
  {
    id: 25,
    slug: 'oldschool-picnic',
    title: "Old School & Picnic Day",
    date: "March 06, 2026",
    time: "All Day",
    location: "Picnic Ground, FUTO",
    image: getCloudinaryAssetUrl('event_oldschool_picnic') || eventOldschoolPicnic,
    description: "Featuring games, networking, treasure hunt, karaoke, drinks, and music. Organized by the Office of the Vice President as part of NACOS Week."
  },
  {
    id: 27,
    slug: 'sports-day',
    title: "NACOS Sports Day",
    date: "March 04, 2026",
    time: "10:00 AM",
    location: "CSC Building, FUTO",
    image: getCloudinaryAssetUrl('event_nacos_sportsday') || eventNacosSportsday,
    description: "NACOS Week Sports Day featuring football, indoor and outdoor games, and athletic competitions organized by the Office of the Vice President."
  },
  {
    id: 26,
    slug: 'nacos-week-schedule',
    title: "NACOS Week Program Schedule",
    date: "March 02 - 08, 2026",
    time: "Various Times",
    location: "FUTO Campus",
    image: getCloudinaryAssetUrl('event_nacos_schedule') || eventNacosSchedule,
    description: "Official program schedule for NACOS Week featuring Tech/Corporate Day, Sports Day, Cultural & Award Presentation, Picnic/Old School Day, and Thanksgiving Mass."
  },
  {
    id: 23,
    slug: 'tech-day-path-to-tech',
    title: "Tech Day: Path to Tech",
    date: "March 02, 2026",
    time: "10:00 AM",
    location: "CYB Research Center, FUTO",
    image: getCloudinaryAssetUrl('event_tech_day') || eventTechDay,
    description: "Explore the path to tech covering Innovation, AI, Software, and Future Tech during NACOS Week."
  },
  {
    id: 16,
    slug: 'tech-rewind-expo',
    title: "Tech Rewind & Expo",
    date: "Feb 20, 2026",
    time: "7:00 PM",
    location: "Google Meet",
    image: getCloudinaryAssetUrl('event_tech_rewind') || eventTechRewind,
    description: "Fireside chat and open-mic webinar organized by the Office of the Director of ICT. A review of tech trends and student project showcase."
  },
  {
    id: 17,
    slug: 'safer-internet-day',
    title: "Safer Internet Day: Smart Tech Safe Choices",
    date: "Feb 13, 2026",
    time: "1:00 PM",
    location: "CSC Department Building",
    image: getCloudinaryAssetUrl('event_safer_internet') || eventSaferInternet,
    description: "Presented by the Department of Computer Science in partnership with Internet Society Nigeria Chapter. Focus on safe, responsible use of AI."
  },
  {
    id: 24,
    slug: 'global-internship-series',
    title: "Global Internship Series (Technology Track)",
    date: "Jan 17, 2026",
    time: "5:00 PM",
    location: "Google Meet",
    image: getCloudinaryAssetUrl('event_global_internship') || eventGlobalInternship,
    description: "Featuring global internship application strategies, CV & LinkedIn optimization, interview preparation tips, and resources that actually work."
  }
];

const Events = () => {
  const { theme } = useTheme();
  const [upcomingEvents, setUpcomingEvents] = useState(CANONICAL_UPCOMING_EVENTS);
  const [recentEvents] = useState(CANONICAL_RECENT_EVENTS);
  const [pastEvents] = useState(CANONICAL_PAST_EVENTS);

  // Fetch dynamic upcoming events from Supabase
  useEffect(() => {
    async function fetchLiveEvents() {
      try {
        const { data, error } = await supabase
          .from('website_events')
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const liveUpcoming = data.map(d => ({
            id: d.id,
            slug: d.slug,
            title: d.title,
            date: d.event_date,
            time: d.event_time,
            location: d.location,
            image: d.image_url,
            description: d.description,
            registrationLink: d.registration_link || d.link || null
          }));

          const liveSlugs = new Set(liveUpcoming.map(l => l.slug));
          setUpcomingEvents([
            ...liveUpcoming,
            ...CANONICAL_UPCOMING_EVENTS.filter(c => !liveSlugs.has(c.slug))
          ]);
        }
      } catch (err) {
        console.warn('Could not query Supabase website_events:', err);
      }
    }
    fetchLiveEvents();
  }, []);

  // Recap Modal State for Concluded Events
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isRecapModalOpen, setIsRecapModalOpen] = useState(false);

  const handleOpenRecapModal = (event) => {
    setSelectedEvent(event);
    setIsRecapModalOpen(true);
  };

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-[#041801] text-white' : 'bg-white text-[#083002]'} transition-colors duration-300`}>
      <Navbar />

      <main className="flex-grow">
        {/* Full-width Home-Style Hero Section */}
        <section className="relative flex min-h-[460px] sm:min-h-[500px] md:h-[65vh] items-center justify-center overflow-hidden bg-gray-950">
          <img
            src={getCloudinaryAssetUrl('event_tech_day') || eventTechDay}
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

        {/* 2. Recent Events Section */}
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

        {/* 3. Past Events Section */}
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
