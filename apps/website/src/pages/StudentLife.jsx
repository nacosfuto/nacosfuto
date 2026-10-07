import React, { useState, useEffect, useRef } from "react";
import Navbar from "../components/Nav/Navbar";
import Footer from "../components/Footer";
import {
  FiUsers,
  FiAward,
  FiBook,
  FiHeart,
  FiCompass,
  FiCheck,
} from "react-icons/fi";
import ScrollToTopLink from "../components/ScrollToTopLink";
import { getCloudinaryAssetUrl } from "@nacos/media";
const studentLifeImageFallback = '';

const StudentLife = () => {
  const studentLifeImage = getCloudinaryAssetUrl('student-life') || studentLifeImageFallback;
  const clubs = [
    {
      title: "Google Developer Student Club",
      description: "Learn Google technologies and build solutions for local businesses",
      icon: <FiUsers className="w-8 h-8 text-[#138601] dark:text-[#4bd043]" />,
    },
    {
      title: "NACOS Competitive Programming Club",
      description: "Algorithm practice, problem solving, and ICPC contest preparation",
      icon: <FiAward className="w-8 h-8 text-[#138601] dark:text-[#4bd043]" />,
    },
    {
      title: "Cybersecurity & Ethical Hacking",
      description: "Hands-on penetration testing, CTF competitions, and system defenses",
      icon: <FiBook className="w-8 h-8 text-[#138601] dark:text-[#4bd043]" />,
    },
    {
      title: "AI & Data Science Society",
      description: "Machine learning research, data visualization, and predictive modeling",
      icon: <FiHeart className="w-8 h-8 text-[#138601] dark:text-[#4bd043]" />,
    },
  ];

  const events = [
    {
      month: "AUG",
      title: "NACOS Week",
      description: "Annual tech conference, hackathons, dinner night, and sports festivals",
    },
    {
      month: "NOV",
      title: "Department Hackathon",
      description: "48-hour build sprint addressing campus and national software challenges",
    },
    {
      month: "FEB",
      title: "Tech Expo & Project Day",
      description: "Showcase of student research projects, startup MVPs, and innovations",
    },
    {
      month: "APR",
      title: "Cultural & Synergy Day",
      description: "Celebration of student community unity, heritage, and creative talents",
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#041801] text-black dark:text-white transition-colors duration-300">
      <Navbar />

      {/* Hero Section */}
      <section className="relative py-20 bg-white dark:bg-[#041801] border-b border-[#138601]/20 dark:border-[#138601]/30">
        <div className="site-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold mb-6 text-black dark:text-white tracking-tight leading-tight">
                Student <span className="text-[#138601] dark:text-[#4bd043]">Life & Community</span>
              </h1>
              <p className="text-base sm:text-lg text-black/75 dark:text-green-100/75 mb-8 leading-relaxed">
                Beyond rigorous academics, we offer a vibrant, supportive campus life filled with opportunities for leadership development, collaborative hackathons, and lifelong friendships.
              </p>
              <ScrollToTopLink
                to="/clubs"
                className="inline-flex items-center justify-center px-7 py-2.5 bg-[#138601] hover:bg-[#0f6c01] text-white font-semibold text-sm rounded shadow-sm transition-colors cursor-pointer min-h-[42px]"
              >
                Explore Clubs & Activities
              </ScrollToTopLink>
            </div>
            <div className="rounded overflow-hidden shadow-lg border border-[#138601]/20 dark:border-[#138601]/30">
              <img
                src={studentLifeImage}
                alt="FUTO Student Life"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Campus Clubs */}
      <section className="py-20 bg-[#f8f9fa] dark:bg-[#041801] border-b border-[#138601]/20 dark:border-[#138601]/30">
        <div className="site-container">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-black dark:text-white tracking-tight mb-3">
              Campus <span className="text-[#138601] dark:text-[#4bd043]">Clubs & Societies</span>
            </h2>
            <p className="text-base text-black/70 dark:text-green-100/70 max-w-xl mx-auto leading-relaxed">
              Find your tribe, build collaborative software projects, and sharpen your technical skills.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {clubs.map((club, index) => (
              <div
                key={index}
                className="bg-white dark:bg-[#083002] p-8 rounded shadow-sm hover:shadow-xl hover:border-[#138601] dark:hover:border-[#4bd043] border border-[#138601]/20 dark:border-[#138601]/30 transform hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="mb-4">{club.icon}</div>
                  <h3 className="text-lg font-bold text-black dark:text-white mb-2 leading-snug">
                    {club.title}
                  </h3>
                  <p className="text-xs text-black/75 dark:text-green-100/75 leading-relaxed">
                    {club.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Annual Events */}
      <section className="py-20 bg-white dark:bg-[#041801] border-b border-[#138601]/20 dark:border-[#138601]/30">
        <div className="site-container">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-black dark:text-white tracking-tight mb-3">
              Annual <span className="text-[#138601] dark:text-[#4bd043]">Events</span>
            </h2>
            <p className="text-base text-black/70 dark:text-green-100/70 max-w-xl mx-auto leading-relaxed">
              Mark your calendar for our premier hackathons, conferences, and student celebrations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {events.map((event, index) => (
              <div
                key={index}
                className="bg-white dark:bg-[#083002] p-6 rounded shadow-sm hover:shadow-xl hover:border-[#138601] dark:hover:border-[#4bd043] border border-[#138601]/20 dark:border-[#138601]/30 border-t-4 border-t-[#138601] transform hover:-translate-y-1.5 transition-all duration-300"
              >
                <div className="text-[#138601] dark:text-[#4bd043] font-bold text-xl mb-2">
                  {event.month}
                </div>
                <h3 className="text-base font-bold text-black dark:text-white mb-2">
                  {event.title}
                </h3>
                <p className="text-xs text-black/75 dark:text-green-100/75 leading-relaxed">
                  {event.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Support and Facilities */}
      <section className="py-20 bg-[#f8f9fa] dark:bg-[#041801]">
        <div className="site-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-black dark:text-white mb-4 tracking-tight">
                Student <span className="text-[#138601] dark:text-[#4bd043]">Support Services</span>
              </h2>
              <p className="text-sm text-black/75 dark:text-green-100/75 mb-6 leading-relaxed">
                We provide comprehensive academic mentoring, career placement guidance, and wellness resources to help students thrive throughout their university journey.
              </p>
              <div className="space-y-4">
                <div className="bg-white dark:bg-[#083002] p-4 rounded border border-[#138601]/20 dark:border-[#138601]/30 shadow-sm">
                  <h4 className="font-bold text-sm text-black dark:text-white">
                    Academic Advising
                  </h4>
                  <p className="text-xs text-black/70 dark:text-green-100/70 mt-0.5">
                    Dedicated faculty advisors to guide course registration and academic standing.
                  </p>
                </div>
                <div className="bg-white dark:bg-[#083002] p-4 rounded border border-[#138601]/20 dark:border-[#138601]/30 shadow-sm">
                  <h4 className="font-bold text-sm text-black dark:text-white">
                    Career & Internship Guidance
                  </h4>
                  <p className="text-xs text-black/70 dark:text-green-100/70 mt-0.5">
                    Resume reviews, mock interviews, and SIWES industrial training placements.
                  </p>
                </div>
                <div className="bg-white dark:bg-[#083002] p-4 rounded border border-[#138601]/20 dark:border-[#138601]/30 shadow-sm">
                  <h4 className="font-bold text-sm text-black dark:text-white">
                    Mentorship & Welfare
                  </h4>
                  <p className="text-xs text-black/70 dark:text-green-100/70 mt-0.5">
                    Senior student peer mentorship and department welfare committee support.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-black dark:text-white mb-4 tracking-tight">
                Department <span className="text-[#138601] dark:text-[#4bd043]">Facilities</span>
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-[#083002] p-4 rounded border border-[#138601]/20 dark:border-[#138601]/30 shadow-sm">
                  <h4 className="font-bold text-sm text-black dark:text-white">
                    24/7 Software Labs
                  </h4>
                  <p className="text-xs text-black/70 dark:text-green-100/70 mt-0.5">
                    High-speed internet and workstation workstations.
                  </p>
                </div>
                <div className="bg-white dark:bg-[#083002] p-4 rounded border border-[#138601]/20 dark:border-[#138601]/30 shadow-sm">
                  <h4 className="font-bold text-sm text-black dark:text-white">
                    Innovation Sandbox
                  </h4>
                  <p className="text-xs text-black/70 dark:text-green-100/70 mt-0.5">
                    Collaborative space for hackathons and projects.
                  </p>
                </div>
                <div className="bg-white dark:bg-[#083002] p-4 rounded border border-[#138601]/20 dark:border-[#138601]/30 shadow-sm">
                  <h4 className="font-bold text-sm text-black dark:text-white">
                    Seminar Hall
                  </h4>
                  <p className="text-xs text-black/70 dark:text-green-100/70 mt-0.5">
                    Equipped with projectors for technical seminars.
                  </p>
                </div>
                <div className="bg-white dark:bg-[#083002] p-4 rounded border border-[#138601]/20 dark:border-[#138601]/30 shadow-sm">
                  <h4 className="font-bold text-sm text-black dark:text-white">
                    Department Library
                  </h4>
                  <p className="text-xs text-black/70 dark:text-green-100/70 mt-0.5">
                    Physical textbooks and digital research vault.
                  </p>
                </div>
              </div>
              <div className="mt-4 bg-white dark:bg-[#083002] p-4 rounded border border-[#138601]/20 dark:border-[#138601]/30 shadow-sm">
                <h4 className="font-bold text-sm text-black dark:text-white">
                  University Student Housing
                </h4>
                <p className="text-xs text-black/70 dark:text-green-100/70 mt-0.5">
                  Comfortable on-campus hostels with 24/7 security and water supply.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default StudentLife;
