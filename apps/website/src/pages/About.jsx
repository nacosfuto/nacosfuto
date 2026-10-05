import React, { useEffect, useRef } from "react";
import Navbar from "../components/Nav/Navbar";
import Footer from "../components/Footer";
import {
  FaGraduationCap,
  FaUsers,
  FaChalkboardTeacher,
  FaLaptopCode,
  FaBook,
  FaBuilding,
  FaAward,
  FaUniversity,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaWater,
} from "react-icons/fa";
import ScrollToTopLink from "../components/ScrollToTopLink";
import departmentImage from "../assets/department.jpg";
import DepartmentStats from "../components/Home/DepartmentStats";

const About = () => {
  const sectionRefs = useRef([]);

  const addToRefs = (el) => {
    if (el && !sectionRefs.current.includes(el)) {
      sectionRefs.current.push(el);
    }
  };

  const features = [
    {
      icon: <FaAward className="text-[#138601] dark:text-[#4bd043] text-2xl" />,
      title: "Top-Tier NUC Accreditation",
      description:
        "Full accreditation by the National Universities Commission certifying excellence in computing curriculum and lab standards.",
    },
    {
      icon: <FaChalkboardTeacher className="text-[#138601] dark:text-[#4bd043] text-2xl" />,
      title: "Distinguished Academic Faculty",
      description:
        "Learn from industry-certified lecturers, distinguished professors, and prolific computer science researchers.",
    },
    {
      icon: <FaLaptopCode className="text-[#138601] dark:text-[#4bd043] text-2xl" />,
      title: "Modern Compute Laboratories",
      description:
        "Equipped with modern software architectures and hardware tools for hands-on programming and research.",
    },
    {
      icon: <FaBook className="text-[#138601] dark:text-[#4bd043] text-2xl" />,
      title: "Active Research Programs",
      description:
        "Engage in projects advancing technology across Africa, supported by faculty expertise and international research grants.",
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
                Department of{" "}
                <span className="text-[#138601] dark:text-[#4bd043]">Computer Science</span>
              </h1>
              <p className="text-base sm:text-lg text-black/75 dark:text-green-100/75 mb-8 leading-relaxed">
                At the Federal University of Technology Owerri, we are committed to nurturing tech innovators, software engineers, and researchers who drive Nigeria’s digital economy.
              </p>
              <ScrollToTopLink
                to="/programs"
                className="inline-flex items-center justify-center px-7 py-2.5 bg-[#138601] hover:bg-[#0f6c01] text-white font-semibold text-sm rounded shadow-sm transition-colors cursor-pointer min-h-[42px]"
              >
                Explore Our Programs
              </ScrollToTopLink>
            </div>
            <div className="rounded overflow-hidden shadow-lg border border-[#138601]/20 dark:border-[#138601]/30">
              <img
                src={departmentImage}
                alt="FUTO Computer Science Department"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 1. About Department Section (Department Overview & Startup) */}
      <section className="py-20 bg-[#f8f9fa] dark:bg-[#041801] border-b border-[#138601]/20 dark:border-[#138601]/30">
        <div className="site-container">
          <div className="text-center mb-14">
            <h2
              ref={addToRefs}
              className="text-3xl sm:text-4xl font-extrabold text-black dark:text-white tracking-tight mb-3"
            >
              About <span className="text-[#138601] dark:text-[#4bd043]">Our Department</span>
            </h2>
            <p className="text-base text-black/70 dark:text-green-100/70 max-w-xl mx-auto leading-relaxed">
              Four decades of academic distinction, technological leadership, and engineering excellence.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="mb-10">
              <h3
                ref={addToRefs}
                className="text-2xl font-bold text-black dark:text-white mb-4 flex items-center gap-3"
              >
                <FaLaptopCode className="text-[#138601] dark:text-[#4bd043]" /> Department of Computer Science Overview
              </h3>

              <p className="text-sm sm:text-base text-black/75 dark:text-green-100/75 mb-6 leading-relaxed">
                The Department of Computer Science at the Federal University of Technology Owerri (FUTO) is a premier center of excellence for computing education, software engineering, and technological research in West Africa. We equip students with theoretical foundations and practical skills required to lead in Artificial Intelligence, Cybersecurity, Data Science, Cloud Computing, and Software Engineering.
              </p>

              <p className="text-sm sm:text-base text-black/75 dark:text-green-100/75 mb-8 leading-relaxed">
                As part of the School of Information and Communication Technology (SICT) established in 2018, the department earned full National Universities Commission (NUC) accreditation in 2021. Through rigorous academic coursework, industry partnerships, hands-on lab experiences, and active student tech communities like NACOS FUTO, our graduates consistently excel as software engineers, tech founders, and researchers worldwide.
              </p>

              {/* Department Startup & Milestones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white dark:bg-[#083002] p-6 rounded border border-[#138601]/20 dark:border-[#138601]/30 shadow-sm">
                  <h4 className="font-bold text-black dark:text-white mb-2 text-base">School of ICT Integration (2018)</h4>
                  <p className="text-xs text-black/75 dark:text-green-100/75 leading-relaxed">
                    Integrated into the newly created School of Information and Communication Technology (SICT) to foster interdisciplinary tech innovation and specialized computing research.
                  </p>
                </div>
                <div className="bg-white dark:bg-[#083002] p-6 rounded border border-[#138601]/20 dark:border-[#138601]/30 shadow-sm">
                  <h4 className="font-bold text-black dark:text-white mb-2 text-base">Full NUC Accreditation (2021)</h4>
                  <p className="text-xs text-black/75 dark:text-green-100/75 leading-relaxed">
                    Awarded top-tier full accreditation by the National Universities Commission (NUC), certifying high academic quality, modern laboratory facilities, and outstanding faculty standards.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Why Study Computer Science at FUTO */}
      <section className="py-20 bg-white dark:bg-[#041801] border-b border-[#138601]/20 dark:border-[#138601]/30">
        <div className="site-container">
          <div className="text-center mb-14">
            <h2
              ref={addToRefs}
              className="text-3xl sm:text-4xl font-extrabold text-black dark:text-white tracking-tight mb-3"
            >
              Why Study <span className="text-[#138601] dark:text-[#4bd043]">Computer Science at FUTO</span>
            </h2>
            <p className="text-base text-black/70 dark:text-green-100/70 max-w-xl mx-auto leading-relaxed">
              Equipping ambitious students with technical depth, ethical standards, and global problem-solving capabilities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white dark:bg-[#083002] p-8 rounded shadow-sm hover:shadow-xl hover:border-[#138601] dark:hover:border-[#4bd043] border border-[#138601]/20 dark:border-[#138601]/30 border-l-4 border-l-[#138601] transform hover:-translate-y-1.5 transition-all duration-300"
              >
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-lg font-bold text-black dark:text-white mb-2 leading-snug">
                  {feature.title}
                </h3>
                <p className="text-xs text-black/75 dark:text-green-100/75 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Department Stats */}
      <DepartmentStats />

      {/* 4. FUTO History & University Details */}
      <section className="py-20 bg-[#f8f9fa] dark:bg-[#041801] border-b border-[#138601]/20 dark:border-[#138601]/30">
        <div className="site-container">
          <div className="text-center mb-14">
            <h2
              ref={addToRefs}
              className="text-3xl sm:text-4xl font-extrabold text-black dark:text-white tracking-tight mb-3"
            >
              History of <span className="text-[#138601] dark:text-[#4bd043]">FUTO</span>
            </h2>
            <p className="text-base text-black/70 dark:text-green-100/70 max-w-xl mx-auto leading-relaxed">
              The premier and oldest federal university of technology in Nigeria.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <p className="text-sm sm:text-base text-black/75 dark:text-green-100/75 mb-8 leading-relaxed">
              FUTO, as the Oldest University of Technology in Nigeria, was established in 1980 by Executive fiat with the composition and appointment of the first provisional Council by Nigeria's First Executive President, Shehu Shagari. It became the first of three such Universities set up by the Federal Government of Nigeria who sought to establish a University of Technology in each geo-political region.
            </p>

            {/* FUTO History Milestones */}
            <div className="space-y-4 mb-8">
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 rounded bg-[#138601]/10 dark:bg-[#138601]/25 flex items-center justify-center text-[#138601] dark:text-[#4bd043]">
                  <FaCalendarAlt />
                </div>
                <div className="bg-white dark:bg-[#083002] p-4 rounded border border-[#138601]/20 dark:border-[#138601]/30 flex-1 shadow-sm">
                  <h4 className="font-bold text-sm text-black dark:text-white mb-1">November 28, 1980</h4>
                  <p className="text-xs text-black/75 dark:text-green-100/75 leading-relaxed">
                    On the premises of the Old Government Technical College (GTC), FUTO opened its doors to staff and inaugural students.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 rounded bg-[#138601]/10 dark:bg-[#138601]/25 flex items-center justify-center text-[#138601] dark:text-[#4bd043]">
                  <FaCalendarAlt />
                </div>
                <div className="bg-white dark:bg-[#083002] p-4 rounded border border-[#138601]/20 dark:border-[#138601]/30 flex-1 shadow-sm">
                  <h4 className="font-bold text-sm text-black dark:text-white mb-1">January 1982</h4>
                  <p className="text-xs text-black/75 dark:text-green-100/75 leading-relaxed">
                    The permanent site was approved by the government, and the comprehensive physical masterplan was commissioned.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 rounded bg-[#138601]/10 dark:bg-[#138601]/25 flex items-center justify-center text-[#138601] dark:text-[#4bd043]">
                  <FaMapMarkerAlt />
                </div>
                <div className="bg-white dark:bg-[#083002] p-4 rounded border border-[#138601]/20 dark:border-[#138601]/30 flex-1 shadow-sm">
                  <h4 className="font-bold text-sm text-black dark:text-white mb-1">The Permanent Site (Ihiagwa / Eziobodo)</h4>
                  <p className="text-xs text-black/75 dark:text-green-100/75 leading-relaxed">
                    Spanning over 4,000 hectares along the scenic Otamiri River basin, situated 25 kilometers south of Owerri metropolis.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FUTO Mission & Vision */}
      <section className="py-20 bg-white dark:bg-[#041801]">
        <div className="site-container">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-black dark:text-white tracking-tight mb-3">
              FUTO <span className="text-[#138601] dark:text-[#4bd043]">Mission & Vision</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-[#083002] p-8 rounded shadow-sm border border-[#138601]/20 dark:border-[#138601]/30 border-t-4 border-t-[#138601]">
              <h3 className="text-xl font-bold text-black dark:text-white mb-3 flex items-center">
                <span className="w-7 h-7 bg-[#138601] rounded flex items-center justify-center text-white text-xs font-black mr-3">
                  V
                </span>
                Our Vision
              </h3>
              <p className="text-xs sm:text-sm text-black/75 dark:text-green-100/75 leading-relaxed">
                To re-engineer and re-position the Federal University of Technology Owerri to be a truly world class university through nurturing uniquely promising students and exceptional staff in Science, Technology, and enterprise.
              </p>
            </div>
            <div className="bg-white dark:bg-[#083002] p-8 rounded shadow-sm border border-[#138601]/20 dark:border-[#138601]/30 border-t-4 border-t-[#138601]">
              <h3 className="text-xl font-bold text-black dark:text-white mb-3 flex items-center">
                <span className="w-7 h-7 bg-[#138601] rounded flex items-center justify-center text-white text-xs font-black mr-3">
                  M
                </span>
                Our Mission
              </h3>
              <p className="text-xs sm:text-sm text-black/75 dark:text-green-100/75 leading-relaxed">
                To operate practical and technological training geared towards transforming the nation's economy from consumer-oriented to production-oriented, with a sound computing and engineering base.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
