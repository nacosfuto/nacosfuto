import React, { useEffect, useState } from "react";
import Navbar from "../components/Nav/Navbar";
import { getCloudinaryAssetUrl } from "@nacos/media";
import { supabase } from "@nacos/supabase";
import ScrollToTopLink from "../components/ScrollToTopLink";
import DepartmentStats from "../components/Home/DepartmentStats";
import Cards from "../components/Home/Cards";
import Analytics from "../components/Home/Analytics";
import HomeNewsSection from "../components/Home/HomeNewsSection";
import UpcomingEvents from "../components/Home/PastEvents";
import NacosSection from "../components/Home/NacosSection";
import QuickHelpCTA from "../components/Home/QuickHelpCTA";
import TechTeamSection from "../components/TechTeamSection";
import Footer from "../components/Footer";

const alumniHomeImg = getCloudinaryAssetUrl('alumni_home') || "https://res.cloudinary.com/a2mmcttn/image/upload/v1788569286/nacos/alumni/alumni_home.jpg";

const HERO_IMAGE_URL = getCloudinaryAssetUrl('drilldown') || getCloudinaryAssetUrl('header') || "https://res.cloudinary.com/a2mmcttn/image/upload/v1791346769/drilldown.jpg";

const Home = () => {
  const liveAlumniHomeImg = getCloudinaryAssetUrl('alumni_home') || alumniHomeImg;
  const [cmsContent, setCmsContent] = useState({
    hero_headline: 'Empowering the Next Generation of Computer Scientists',
    hero_subtext: "Join FUTO's vibrant CS community. Innovate, learn, and lead the future of global computing technology.",
    announcement_active: false,
    announcement_text: '',
    announcement_link: '/news'
  });

  useEffect(() => {
    window.scrollTo(0, 0);
    document.body.style.overflow = "auto";

    // Load live homepage CMS from Supabase
    const loadCms = async () => {
      try {
        if (supabase) {
          const { data } = await supabase
            .from('id_card_settings')
            .select('academic_session')
            .eq('id', 'store_homepage_content')
            .maybeSingle();

          if (data?.academic_session) {
            const parsed = JSON.parse(data.academic_session);
            if (parsed && typeof parsed === 'object') {
              setCmsContent(prev => ({ ...prev, ...parsed }));
            }
          }
        }
      } catch (err) {}
    };
    loadCms();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#041801] text-black dark:text-white transition-colors duration-200">
      <Navbar />

      {cmsContent.announcement_active && cmsContent.announcement_text && (
        <div className="bg-[#138601] text-white px-4 py-2.5 text-xs sm:text-sm font-medium text-center flex items-center justify-center gap-2 relative z-20 shadow-sm">
          <span>📢 {cmsContent.announcement_text}</span>
          {cmsContent.announcement_link && (
            <ScrollToTopLink to={cmsContent.announcement_link} className="underline font-bold hover:text-green-200 ml-1">
              Learn More →
            </ScrollToTopLink>
          )}
        </div>
      )}
      
      <main className="flex-grow">
        {/* Standard Responsive Full-Screen Fitting Hero */}
        <section className="relative flex min-h-[calc(100dvh-64px)] md:h-[calc(100vh-64px)] items-center justify-center overflow-hidden bg-gray-950 px-4 sm:px-6">
          <img
            src={HERO_IMAGE_URL}
            alt="Department of Computer Science FUTO"
            className="absolute inset-0 w-full h-full object-cover object-[center_35%]"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-[#041801]/95 via-[#041801]/60 to-black/35" />
          <div className="absolute inset-0 bg-black/25" />

          <div className="relative z-10 text-center px-4 sm:px-6 max-w-4xl mx-auto flex flex-col items-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 sm:mb-6 drop-shadow-lg tracking-tight leading-[1.2]">
              {cmsContent.hero_headline}
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-100 max-w-2xl drop-shadow font-normal leading-relaxed text-center">
              {cmsContent.hero_subtext}
            </p>
          </div>
        </section>

        {/* 1. Department at a Glance */}
        <DepartmentStats />

        {/* 2. Quick Access Cards */}
        <Cards />

        {/* 3. NACOS Executives Section */}
        <NacosSection />

        {/* 4. Latest News & Articles */}
        <HomeNewsSection />

        {/* 5. Upcoming Events */}
        <UpcomingEvents />

        {/* 6. Educational Framework & Analytics */}
        <Analytics />

        {/* 7. Alumni Section */}
        <section className="py-20 bg-white dark:bg-[#041801] text-black dark:text-white transition-colors duration-300">
          <div className="site-container text-center">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3 text-black dark:text-white">
              Our Alumni <span className="text-[#138601] dark:text-[#4bd043]">Network</span>
            </h2>
            <p className="mb-10 text-gray-700 dark:text-gray-300 max-w-xl mx-auto text-base leading-relaxed">
              Join a network of successful graduates making waves across top global tech companies.
            </p>
            <div className="rounded overflow-hidden shadow-lg h-64 md:h-96 bg-gray-200 dark:bg-gray-700 relative border border-[#138601]/20 dark:border-[#138601]/30 group">
              <img src={liveAlumniHomeImg} alt="FUTO CSC Alumni Group" className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <ScrollToTopLink to="/about/alumni" className="inline-flex items-center justify-center px-7 py-2.5 bg-white text-black hover:text-[#138601] hover:bg-[#f1f3f5] font-semibold text-sm rounded shadow-md transition-colors cursor-pointer min-h-[42px]">
                  Meet Our Alumni
                </ScrollToTopLink>
              </div>
            </div>
          </div>
        </section>

        {/* 8. Quick Help CTA */}
        <QuickHelpCTA />

        {/* 9. Tech Team Section */}
        <TechTeamSection />
      </main>

      <Footer />
    </div>
  );
};

export default Home;
