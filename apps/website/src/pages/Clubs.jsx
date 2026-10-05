import React, { useState, useEffect, useRef } from "react";
import Navbar from "../components/Nav/Navbar";
import Footer from "../components/Footer";
import {
  FiCode,
  FiCpu,
  FiTerminal,
  FiGlobe,
  FiShield,
  FiUsers,
} from "react-icons/fi";
import ScrollToTopLink from "../components/ScrollToTopLink";
import clubsImage from "../assets/clubs.jpg";

const Clubs = () => {
  const techClubs = [
    {
      name: "Google Developer Student Club (GDSC FUTO)",
      description: "Community groups for university students interested in Google developer technologies, mobile development, and cloud.",
      meeting: "Bi-weekly Saturdays • ICT Center",
      icon: <FiGlobe className="w-8 h-8 text-[#138601] dark:text-[#4bd043]" />,
    },
    {
      name: "Cybersecurity & Ethical Hacking Guild",
      description: "Hands-on vulnerability assessment, capture-the-flag competitions, reverse engineering, and threat analysis.",
      meeting: "Every Friday • SICT Lab 2",
      icon: <FiShield className="w-8 h-8 text-[#138601] dark:text-[#4bd043]" />,
    },
    {
      name: "NACOS Competitive Programming Circle",
      description: "Algorithm mastery, dynamic programming, graph traversal, and preparing for ACM-ICPC coding contests.",
      meeting: "Every Wednesday • Virtual / Discord",
      icon: <FiTerminal className="w-8 h-8 text-[#138601] dark:text-[#4bd043]" />,
    },
    {
      name: "AI & Machine Learning Guild",
      description: "Practical deep learning, LLM fine-tuning, computer vision projects, and PyTorch research papers.",
      meeting: "Monthly Saturdays • Innovation Hall",
      icon: <FiCpu className="w-8 h-8 text-[#138601] dark:text-[#4bd043]" />,
    },
    {
      name: "Open Source Software Developers",
      description: "Contributing to global GitHub open-source repositories, developer tooling, and modern web frameworks.",
      meeting: "Weekly Sundays • GitHub Classroom",
      icon: <FiCode className="w-8 h-8 text-[#138601] dark:text-[#4bd043]" />,
    },
    {
      name: "UI/UX & Product Design Collective",
      description: "Design sprints, Figma prototyping, user research interviews, and building human-centered software interfaces.",
      meeting: "Bi-weekly Thursdays • Design Lab",
      icon: <FiUsers className="w-8 h-8 text-[#138601] dark:text-[#4bd043]" />,
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#041801] text-[#083002] dark:text-white transition-colors duration-300">
      <Navbar />

      {/* Hero Section */}
      <section className="relative py-20 bg-white dark:bg-[#041801] border-b border-[#138601]/20 dark:border-[#138601]/30">
        <div className="site-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold mb-6 text-[#083002] dark:text-white tracking-tight leading-tight">
                Student <span className="text-[#138601] dark:text-[#4bd043]">Clubs & Chapters</span>
              </h1>
              <p className="text-base sm:text-lg text-[#083002]/75 dark:text-green-100/75 mb-8 leading-relaxed">
                Join our specialized tech communities to enhance your engineering skills, network with ambitious peers, and build portfolio projects beyond the lecture room.
              </p>
              <ScrollToTopLink
                to="/student-life"
                className="inline-flex items-center justify-center px-7 py-2.5 bg-[#138601] hover:bg-[#0f6c01] text-white font-semibold text-sm rounded shadow-sm transition-colors cursor-pointer min-h-[42px]"
              >
                Explore Student Life
              </ScrollToTopLink>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-lg border border-[#138601]/20 dark:border-[#138601]/30">
              <img
                src={clubsImage}
                alt="FUTO Student Clubs"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Technical Clubs Grid */}
      <section className="py-20 bg-[#f8f9fa] dark:bg-[#041801] border-b border-[#138601]/20 dark:border-[#138601]/30">
        <div className="site-container">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#083002] dark:text-white tracking-tight mb-3">
              Technical <span className="text-[#138601] dark:text-[#4bd043]">Guilds</span>
            </h2>
            <p className="text-base text-[#083002]/70 dark:text-green-100/70 max-w-xl mx-auto leading-relaxed">
              Explore specialized student chapters focused on practical software mastery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {techClubs.map((club, index) => (
              <div
                key={index}
                className="bg-white dark:bg-[#083002] p-8 rounded-2xl shadow-sm hover:shadow-xl hover:border-[#138601] dark:hover:border-[#4bd043] border border-[#138601]/20 dark:border-[#138601]/30 transform hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="mb-4">{club.icon}</div>
                  <h3 className="text-lg font-bold text-[#083002] dark:text-white mb-2 leading-snug">
                    {club.name}
                  </h3>
                  <p className="text-xs text-[#083002]/75 dark:text-green-100/75 leading-relaxed mb-4">
                    {club.description}
                  </p>
                </div>
                <div className="pt-3 border-t border-[#138601]/15 dark:border-white/10 text-xs font-semibold text-[#138601] dark:text-[#4bd043]">
                  {club.meeting}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Starting a Club & Resources */}
      <section className="py-20 bg-white dark:bg-[#041801]">
        <div className="site-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="bg-white dark:bg-[#083002] p-8 rounded-2xl shadow-sm border border-[#138601]/20 dark:border-[#138601]/30">
              <h2 className="text-2xl font-bold text-[#083002] dark:text-white mb-4 tracking-tight">
                Charter a New Student Club
              </h2>
              <p className="text-xs text-[#083002]/75 dark:text-green-100/75 mb-6 leading-relaxed">
                Have a vision for a new developer chapter or interest group? The department and NACOS secretariat support new student initiatives:
              </p>
              <ul className="space-y-3 text-xs text-[#083002]/85 dark:text-green-100/85 mb-8">
                <li className="flex items-start gap-2">
                  <span className="text-[#138601] dark:text-[#4bd043] font-bold">✓</span>
                  <span>Gather at least 10 committed computing student founders.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#138601] dark:text-[#4bd043] font-bold">✓</span>
                  <span>Select a faculty advisor from our academic staff directory.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#138601] dark:text-[#4bd043] font-bold">✓</span>
                  <span>Submit the charter proposal to the Head of Department.</span>
                </li>
              </ul>
              <ScrollToTopLink
                to="/contact"
                className="inline-flex items-center justify-center px-7 py-2.5 bg-[#138601] hover:bg-[#0f6c01] text-white font-semibold text-sm rounded shadow-sm transition-colors cursor-pointer min-h-[42px]"
              >
                Submit Proposal
              </ScrollToTopLink>
            </div>

            <div className="bg-white dark:bg-[#083002] p-8 rounded-2xl shadow-sm border border-[#138601]/20 dark:border-[#138601]/30">
              <h2 className="text-2xl font-bold text-[#083002] dark:text-white mb-4 tracking-tight">
                Club Resources & Benefits
              </h2>
              <p className="text-xs text-[#083002]/75 dark:text-green-100/75 mb-6">
                Registered student organizations receive direct departmental backing:
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#f8f9fa] dark:bg-[#041801] p-4 rounded-xl border border-[#138601]/20 dark:border-[#138601]/30 shadow-sm">
                  <h4 className="font-bold text-sm text-[#083002] dark:text-white">Lab & Hall Access</h4>
                  <p className="text-xs text-[#083002]/70 dark:text-green-100/70 mt-0.5">Free booking of SICT lecture halls.</p>
                </div>
                <div className="bg-[#f8f9fa] dark:bg-[#041801] p-4 rounded-xl border border-[#138601]/20 dark:border-[#138601]/30 shadow-sm">
                  <h4 className="font-bold text-sm text-[#083002] dark:text-white">Project Sponsorship</h4>
                  <p className="text-xs text-[#083002]/70 dark:text-green-100/70 mt-0.5">Eligibility for NACOS build grants.</p>
                </div>
                <div className="bg-[#f8f9fa] dark:bg-[#041801] p-4 rounded-xl border border-[#138601]/20 dark:border-[#138601]/30 shadow-sm">
                  <h4 className="font-bold text-sm text-[#083002] dark:text-white">Event Promotion</h4>
                  <p className="text-xs text-[#083002]/70 dark:text-green-100/70 mt-0.5">Broadcast on NACOS channels.</p>
                </div>
                <div className="bg-[#f8f9fa] dark:bg-[#041801] p-4 rounded-xl border border-[#138601]/20 dark:border-[#138601]/30 shadow-sm">
                  <h4 className="font-bold text-sm text-[#083002] dark:text-white">Faculty Mentors</h4>
                  <p className="text-xs text-[#083002]/70 dark:text-green-100/70 mt-0.5">Guidance from tech researchers.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Clubs;