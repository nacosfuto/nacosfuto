import React, { useState, useEffect, useRef } from "react";
import Navbar from "../components/Nav/Navbar";
import Footer from "../components/Footer";
import {
  FiBook,
  FiAward,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiArrowRight,
} from "react-icons/fi";
import { FaGraduationCap, FaCertificate, FaGlobeAmericas, FaCalendarAlt } from "react-icons/fa";
import ScrollToTopLink from "../components/ScrollToTopLink";
import admissionsImage from "../assets/admissions.jpg";

const Admissions = () => {
  const sectionRefs = useRef([]);

  const addToRefs = (el) => {
    if (el && !sectionRefs.current.includes(el)) {
      sectionRefs.current.push(el);
    }
  };

  const admissionTypes = [
    {
      title: "UTME Entry (100 Level)",
      description: "Direct entry from secondary school through JAMB Unified Tertiary Matriculation Examination.",
      icon: <FaGraduationCap className="text-[#138601] dark:text-[#4bd043] text-3xl" />,
      requirements: [
        "Minimum of 5 credits in O'Level including English, Maths, Physics, and Chemistry",
        "JAMB subject combination: English, Maths, Physics, and Chemistry",
        "Competitive UTME score meeting departmental cutoff marks",
      ],
      link: "/admissions/utme",
    },
    {
      title: "Direct Entry (200 Level)",
      description: "For candidates with advanced level qualifications, diplomas, or relevant degrees.",
      icon: <FaCertificate className="text-[#138601] dark:text-[#4bd043] text-3xl" />,
      requirements: [
        "OND/ND with minimum Upper Credit in Computer Science or related fields",
        "Two A-Level passes in relevant subjects including Mathematics",
        "All basic O'Level requirements (5 credits in relevant subjects)",
      ],
      link: "/admissions/direct-entry",
    },
    {
      title: "Postgraduate Programs",
      description: "PGD, M.Sc., and Ph.D. degrees for graduates looking to advance their technical depth.",
      icon: <FiAward className="text-[#138601] dark:text-[#4bd043] text-3xl" />,
      requirements: [
        "First degree with at least Second Class Lower from an accredited university",
        "Academic transcripts and academic referee recommendations",
        "Research proposal statement for Ph.D. candidates",
      ],
      link: "/admissions/postgraduate",
    },
  ];

  const admissionTimeline = [
    {
      step: "1",
      title: "JAMB Registration & Examination",
      description: "Register for UTME and select FUTO as your first choice institution.",
      duration: "January - March",
    },
    {
      step: "2",
      title: "FUTO Post-UTME Screening",
      description: "Register for and participate in the departmental aptitude screening.",
      duration: "July - August",
    },
    {
      step: "3",
      title: "Admission Merit List & CAPS Acceptance",
      description: "Check FUTO admission status and accept offer via JAMB CAPS.",
      duration: "September - October",
    },
    {
      step: "4",
      title: "Clearance & Department Registration",
      description: "Submit original credentials and complete course enrollment.",
      duration: "October - November",
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
              <h1
                ref={addToRefs}
                className="text-4xl md:text-5xl font-extrabold mb-6 text-black dark:text-white tracking-tight leading-tight"
              >
                Admissions <span className="text-[#138601] dark:text-[#4bd043]">Information</span>
              </h1>
              <p className="text-base sm:text-lg text-black/75 dark:text-green-100/75 mb-8 leading-relaxed">
                Join one of Nigeria's premier computing science programs. Learn about requirements, dates, and how to apply for admission into FUTO's Department of Computer Science.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <ScrollToTopLink
                  to="/programs"
                  className="inline-flex items-center justify-center px-7 py-2.5 bg-[#138601] hover:bg-[#0f6c01] text-white font-semibold text-sm rounded shadow-sm transition-colors cursor-pointer min-h-[42px]"
                >
                  View Programs
                </ScrollToTopLink>
                <ScrollToTopLink
                  to="/how-to-apply"
                  className="inline-flex items-center justify-center px-7 py-2.5 font-medium text-sm text-gray-900 dark:text-white bg-[#f1f3f5] dark:bg-[#083002] hover:bg-[#e9ecef] dark:hover:bg-[#138601] rounded border border-gray-200 dark:border-[#138601]/30 transition-colors cursor-pointer min-h-[42px]"
                >
                  How To Apply
                </ScrollToTopLink>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-lg border border-[#138601]/20 dark:border-[#138601]/30">
              <img
                src={admissionsImage}
                alt="FUTO Admissions"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Admission Pathways */}
      <section className="py-20 bg-[#f8f9fa] dark:bg-[#041801] border-b border-[#138601]/20 dark:border-[#138601]/30">
        <div className="site-container">
          <div className="text-center mb-14">
            <h2
              ref={addToRefs}
              className="text-3xl sm:text-4xl font-extrabold text-black dark:text-white tracking-tight mb-3"
            >
              Admission <span className="text-[#138601] dark:text-[#4bd043]">Pathways</span>
            </h2>
            <p className="text-base text-black/70 dark:text-green-100/70 max-w-xl mx-auto leading-relaxed">
              Transparent entry requirements across undergraduate, direct entry, and postgraduate tracks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {admissionTypes.map((type, index) => (
              <div
                key={index}
                className="bg-white dark:bg-[#083002] p-8 rounded-2xl shadow-sm hover:shadow-xl hover:border-[#138601] dark:hover:border-[#4bd043] border border-[#138601]/20 dark:border-[#138601]/30 transform hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="mb-4">{type.icon}</div>
                  <h3 className="text-lg font-bold text-black dark:text-white mb-2 leading-snug">
                    {type.title}
                  </h3>
                  <p className="text-xs text-black/75 dark:text-green-100/75 leading-relaxed mb-4">{type.description}</p>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#138601] dark:text-[#4bd043] mb-2">Key Criteria:</h4>
                  <ul className="space-y-1.5 text-xs text-black/75 dark:text-green-100/75 mb-6">
                    {type.requirements.map((req, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-[#138601] dark:text-[#4bd043] font-bold">•</span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <ScrollToTopLink
                  to={type.link}
                  className="inline-flex items-center gap-1.5 text-[#138601] dark:text-[#4bd043] text-xs font-bold hover:underline"
                >
                  <span>Learn more</span>
                  <FiArrowRight className="text-xs" />
                </ScrollToTopLink>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Admission Timeline */}
      <section className="py-20 bg-white dark:bg-[#041801] border-b border-[#138601]/20 dark:border-[#138601]/30">
        <div className="site-container">
          <div className="text-center mb-14">
            <h2
              ref={addToRefs}
              className="text-3xl sm:text-4xl font-extrabold text-black dark:text-white tracking-tight mb-3"
            >
              Admissions <span className="text-[#138601] dark:text-[#4bd043]">Roadmap</span>
            </h2>
            <p className="text-base text-black/70 dark:text-green-100/70 max-w-xl mx-auto leading-relaxed">
              Step-by-step milestones to secure your enrollment into FUTO Computer Science.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {admissionTimeline.map((item, index) => (
              <div
                key={index}
                className="bg-white dark:bg-[#083002] p-6 rounded-2xl shadow-sm border border-[#138601]/20 dark:border-[#138601]/30 transform hover:-translate-y-1.5 transition-all duration-300"
              >
                <div className="w-8 h-8 rounded bg-[#138601] text-white font-black text-sm flex items-center justify-center mb-4">
                  {item.step}
                </div>
                <h3 className="text-base font-bold text-black dark:text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-xs text-black/75 dark:text-green-100/75 leading-relaxed mb-4">
                  {item.description}
                </p>
                <div className="flex items-center text-xs font-semibold text-[#138601] dark:text-[#4bd043]">
                  <FaCalendarAlt className="mr-1.5" />
                  {item.duration}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tuition and International Students */}
      <section className="py-20 bg-[#f8f9fa] dark:bg-[#041801]">
        <div className="site-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="bg-white dark:bg-[#083002] p-8 rounded-2xl shadow-sm border border-[#138601]/20 dark:border-[#138601]/30">
              <h2 className="text-2xl font-bold text-black dark:text-white mb-6">
                Tuition & Fee Structure
              </h2>
              <div className="space-y-4 text-xs">
                <div className="flex justify-between border-b border-gray-200 dark:border-[#138601]/20 pb-3">
                  <span className="text-black/75 dark:text-green-100/75">Undergraduate Tuition</span>
                  <span className="font-bold text-black dark:text-white">₦180,000 / session</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 dark:border-[#138601]/20 pb-3">
                  <span className="text-black/75 dark:text-green-100/75">Postgraduate Tuition</span>
                  <span className="font-bold text-black dark:text-white">₦200,000 / session</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 dark:border-[#138601]/20 pb-3">
                  <span className="text-black/75 dark:text-green-100/75">Freshers Acceptance Fee</span>
                  <span className="font-bold text-black dark:text-white">₦50,000 (one-time)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/75 dark:text-green-100/75">Departmental Dues & Levies</span>
                  <span className="font-bold text-black dark:text-white">₦20,000 / session</span>
                </div>
              </div>
              <div className="mt-6 bg-[#138601]/10 dark:bg-[#041801] p-4 rounded-xl border border-[#138601]/30">
                <h4 className="font-bold text-xs text-black dark:text-white mb-1">Scholarship Opportunities</h4>
                <p className="text-xs text-black/75 dark:text-green-100/75">
                  Merit-based scholarships from industry partners and alumni endowments cover tuition for high-performing students.
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#083002] p-8 rounded-2xl shadow-sm border border-[#138601]/20 dark:border-[#138601]/30">
              <h2 className="text-2xl font-bold text-black dark:text-white mb-6">
                International Applicants
              </h2>
              <p className="text-xs text-black/75 dark:text-green-100/75 mb-6 leading-relaxed">
                We welcome computing scholars across West Africa and internationally. Please ensure you satisfy these criteria:
              </p>
              <ul className="space-y-3 text-xs text-black/85 dark:text-green-100/85 mb-8">
                <li className="flex items-start gap-2">
                  <span className="text-[#138601] dark:text-[#4bd043] font-bold">•</span>
                  <span>Certified secondary certificate equivalent validated by the NUC.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#138601] dark:text-[#4bd043] font-bold">•</span>
                  <span>Valid student travel visa and national residence clearance.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#138601] dark:text-[#4bd043] font-bold">•</span>
                  <span>Standardized English proficiency certification where applicable.</span>
                </li>
              </ul>
              <ScrollToTopLink
                to="/contact"
                className="inline-flex items-center justify-center px-7 py-2.5 bg-[#138601] hover:bg-[#0f6c01] text-white font-semibold text-sm rounded shadow-sm transition-colors cursor-pointer min-h-[42px]"
              >
                Contact Admissions Office
              </ScrollToTopLink>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Admissions;