import React, { useState, useEffect, useRef } from "react";
import Navbar from "../components/Nav/Navbar";
import Footer from "../components/Footer";
import {
  FiBook,
  FiAward,
  FiCalendar,
  FiCheckCircle,
  FiArrowRight,
} from "react-icons/fi";
import { FaGraduationCap, FaCertificate, FaCalendarAlt, FaAward } from "react-icons/fa";
import ScrollToTopLink from "../components/ScrollToTopLink";
const academicsImage = '';

const Academics = () => {
  const sectionRefs = useRef([]);

  const addToRefs = (el) => {
    if (el && !sectionRefs.current.includes(el)) {
      sectionRefs.current.push(el);
    }
  };

  const programs = [
    {
      title: "B.Tech Computer Science",
      duration: "5 Years",
      level: "Undergraduate",
      description:
        "Comprehensive training in software engineering, algorithms, artificial intelligence, and hardware systems with one full year of industrial work experience (SIWES).",
      icon: <FaGraduationCap className="text-[#138601] dark:text-[#4bd043] text-3xl" />,
      link: "/programs/btech",
    },
    {
      title: "Postgraduate Diploma (PGD)",
      duration: "1-2 Years",
      level: "Postgraduate",
      description:
        "Bridge program for graduates in related quantitative disciplines seeking professional conversion into advanced computing careers.",
      icon: <FaCertificate className="text-[#138601] dark:text-[#4bd043] text-3xl" />,
      link: "/programs/pgd",
    },
    {
      title: "M.Sc. Computer Science",
      duration: "2 Years",
      level: "Postgraduate",
      description:
        "Advanced academic research degree offering specialization in Machine Learning, Distributed Systems, Cybersecurity, and Software Engineering.",
      icon: <FaGraduationCap className="text-[#138601] dark:text-[#4bd043] text-3xl" />,
      link: "/programs/msc",
    },
    {
      title: "Ph.D. Computer Science",
      duration: "3-5 Years",
      level: "Doctorate",
      description:
        "Terminal research degree pushing the frontiers of theoretical and applied computing through novel dissertation contributions.",
      icon: <FaAward className="text-[#138601] dark:text-[#4bd043] text-3xl" />,
      link: "/programs/phd",
    },
  ];

  const curriculum = [
    {
      year: "Year 1",
      focus: "Foundational Sciences & Intro to Logic",
      courses: [
        "MTH 101/102 - Elementary Mathematics",
        "PHY 101/102 - General Physics",
        "CSC 101 - Introduction to Computing Systems",
        "CHM 101 - General Chemistry",
      ],
    },
    {
      year: "Year 2",
      focus: "Core Programming & Data Structures",
      courses: [
        "CSC 201 - Computer Programming I (C++/Java)",
        "CSC 202 - Object-Oriented Programming",
        "CSC 203 - Discrete Structures",
        "CSC 204 - Digital Logic Design",
      ],
    },
    {
      year: "Year 3",
      focus: "Systems Architecture & Database Engines",
      courses: [
        "CSC 301 - Data Structures & Algorithms",
        "CSC 302 - Operating Systems Principles",
        "CSC 303 - Database Design & Management",
        "CSC 304 - Software Engineering Foundations",
      ],
    },
    {
      year: "Year 4",
      focus: "Industrial Training (SIWES) & Systems",
      courses: [
        "CSC 401 - Technical Research Methodology",
        "CSC 410 - 6-Month SIWES Internship",
        "CSC 403 - Computer Networks & Security",
        "CSC 404 - Compiler Construction",
      ],
    },
    {
      year: "Year 5",
      focus: "Advanced Computing & Capstone Dissertation",
      courses: [
        "CSC 501 - Artificial Intelligence & Expert Systems",
        "CSC 502 - Distributed Computing Architecture",
        "CSC 599 - Independent Capstone Project",
        "Electives in Cloud & Mobile Security",
      ],
    },
  ];

  const admissionRequirements = [
    {
      program: "Undergraduate (UTME)",
      requirements: [
        "Five O'Level credit passes in English, Mathematics, Physics, Chemistry, and any other science subject in no more than two sittings",
        "Competitive score in UTME (Subjects: English, Mathematics, Physics, Chemistry)",
        "Satisfactory score in the FUTO Post-UTME screening exercise",
      ],
    },
    {
      program: "Direct Entry",
      requirements: [
        "Two A-Level passes in Mathematics and Physics",
        "OND/HND Upper Credit in Computer Science from an accredited polytechnic",
        "NCE with Distinction/Credit in relevant computing subjects",
      ],
    },
    {
      program: "Postgraduate",
      requirements: [
        "First degree in Computer Science with at least Second Class Honours (Lower Division)",
        "PGD at Credit level from an approved university for conversion applicants",
        "Master's degree with a minimum CGPA of 3.5 on a 5-point scale for Ph.D. admission",
      ],
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
                Academic <span className="text-[#138601] dark:text-[#4bd043]">Programs</span>
              </h1>
              <p className="text-base sm:text-lg text-black/75 dark:text-green-100/75 mb-8 leading-relaxed">
                Our curriculum combines theoretical mathematical foundations with hands-on software engineering to prepare students for impactful careers across global tech industries.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <ScrollToTopLink
                  to="/admissions"
                  className="inline-flex items-center justify-center px-7 py-2.5 bg-[#138601] hover:bg-[#0f6c01] text-white font-semibold text-sm rounded shadow-sm transition-colors cursor-pointer min-h-[42px]"
                >
                  Admissions Information
                </ScrollToTopLink>
                <ScrollToTopLink
                  to="/courses"
                  className="inline-flex items-center justify-center px-7 py-2.5 font-medium text-sm text-gray-900 dark:text-white bg-[#f1f3f5] dark:bg-[#083002] hover:bg-[#e9ecef] dark:hover:bg-[#138601] rounded border border-gray-200 dark:border-[#138601]/30 transition-colors cursor-pointer min-h-[42px]"
                >
                  View Courses
                </ScrollToTopLink>
              </div>
            </div>
            <div className="rounded overflow-hidden shadow-lg border border-[#138601]/20 dark:border-[#138601]/30">
              <img
                src={academicsImage}
                alt="FUTO Academics"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Programs List */}
      <section className="py-20 bg-[#f8f9fa] dark:bg-[#041801] border-b border-[#138601]/20 dark:border-[#138601]/30">
        <div className="site-container">
          <div className="text-center mb-14">
            <h2
              ref={addToRefs}
              className="text-3xl sm:text-4xl font-extrabold text-black dark:text-white tracking-tight mb-3"
            >
              Our <span className="text-[#138601] dark:text-[#4bd043]">Degree Pathways</span>
            </h2>
            <p className="text-base text-black/70 dark:text-green-100/70 max-w-xl mx-auto leading-relaxed">
              Tailored undergraduate and postgraduate degrees recognized internationally.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {programs.map((program, index) => (
              <div
                key={index}
                className="bg-white dark:bg-[#083002] p-8 rounded shadow-sm hover:shadow-xl hover:border-[#138601] dark:hover:border-[#4bd043] border border-[#138601]/20 dark:border-[#138601]/30 border-l-4 border-l-[#138601] transform hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="mb-4">{program.icon}</div>
                  <h3 className="text-lg font-bold text-black dark:text-white mb-2 leading-snug">
                    {program.title}
                  </h3>
                  <div className="text-xs font-semibold text-[#138601] dark:text-[#4bd043] uppercase tracking-wider mb-3">
                    {program.duration} • {program.level}
                  </div>
                  <p className="text-xs text-black/75 dark:text-green-100/75 leading-relaxed mb-6">{program.description}</p>
                </div>
                <ScrollToTopLink
                  to={program.link}
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

      {/* Curriculum Overview */}
      <section className="py-20 bg-white dark:bg-[#041801] border-b border-[#138601]/20 dark:border-[#138601]/30">
        <div className="site-container">
          <div className="text-center mb-14">
            <h2
              ref={addToRefs}
              className="text-3xl sm:text-4xl font-extrabold text-black dark:text-white tracking-tight mb-3"
            >
              Curriculum <span className="text-[#138601] dark:text-[#4bd043]">Structure</span>
            </h2>
            <p className="text-base text-black/70 dark:text-green-100/70 max-w-xl mx-auto leading-relaxed">
              Step-by-step progression from core sciences to high-level system architecture.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {curriculum.map((year, index) => (
              <div
                key={index}
                className="bg-white dark:bg-[#083002] p-6 rounded shadow-sm hover:shadow-xl hover:border-[#138601] dark:hover:border-[#4bd043] border border-[#138601]/20 dark:border-[#138601]/30 transform hover:-translate-y-1.5 transition-all duration-300"
              >
                <div className="text-[#138601] dark:text-[#4bd043] font-black text-xl mb-1">{year.year}</div>
                <h3 className="text-xs font-bold text-black dark:text-white mb-3">
                  {year.focus}
                </h3>
                <ul className="space-y-1.5 text-xs text-black/75 dark:text-green-100/75">
                  {year.courses.map((course, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-[#138601] dark:text-[#4bd043] font-bold">•</span>
                      <span>{course}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements & Calendar */}
      <section className="py-20 bg-[#f8f9fa] dark:bg-[#041801]">
        <div className="site-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2
                ref={addToRefs}
                className="text-2xl sm:text-3xl font-extrabold text-black dark:text-white mb-6 tracking-tight"
              >
                Admission <span className="text-[#138601] dark:text-[#4bd043]">Criteria</span>
              </h2>
              
              {admissionRequirements.map((program, index) => (
                <div key={index} className="mb-6 p-5 rounded bg-white dark:bg-[#083002] border border-[#138601]/20 dark:border-[#138601]/30 shadow-sm">
                  <h3 className="text-base font-bold text-black dark:text-white mb-3">
                    {program.program}
                  </h3>
                  <ul className="space-y-2 text-xs text-black/75 dark:text-green-100/75">
                    {program.requirements.map((req, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#138601] dark:text-[#4bd043] font-bold">✓</span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            
            <div>
              <h2
                ref={addToRefs}
                className="text-2xl sm:text-3xl font-extrabold text-black dark:text-white mb-6 tracking-tight"
              >
                Academic <span className="text-[#138601] dark:text-[#4bd043]">Calendar</span>
              </h2>
              <div className="bg-white dark:bg-[#083002] p-8 rounded shadow-sm border border-[#138601]/20 dark:border-[#138601]/30">
                <div className="flex items-center mb-6">
                  <FaCalendarAlt className="text-[#138601] dark:text-[#4bd043] text-xl mr-3" />
                  <h3 className="text-lg font-bold text-black dark:text-white">
                    2025/2026 Academic Session
                  </h3>
                </div>
                <div className="space-y-4 text-xs text-black/75 dark:text-green-100/75">
                  <div className="border-b border-gray-200 dark:border-[#138601]/20 pb-3">
                    <p className="font-bold text-sm text-black dark:text-white">Harmattan Semester</p>
                    <p className="mt-0.5">Resumption: November 4, 2025</p>
                    <p>Lectures: Nov 4, 2025 - Feb 2026</p>
                    <p>Exams: March 2026</p>
                  </div>
                  <div className="border-b border-gray-200 dark:border-[#138601]/20 pb-3">
                    <p className="font-bold text-sm text-black dark:text-white">Rain Semester</p>
                    <p className="mt-0.5">Resumption: April 13, 2026</p>
                    <p>Lectures: April - July 2026</p>
                    <p>Exams: July - August 2026</p>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-black dark:text-white">Long Vacation</p>
                    <p className="mt-0.5">August - October 2026</p>
                  </div>
                </div>
                <ScrollToTopLink
                  to="/calendar"
                  className="inline-flex items-center gap-1.5 mt-6 text-xs font-bold text-[#138601] dark:text-[#4bd043] hover:underline"
                >
                  <span>View Full University Calendar</span>
                  <FiArrowRight className="text-xs" />
                </ScrollToTopLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Academics;