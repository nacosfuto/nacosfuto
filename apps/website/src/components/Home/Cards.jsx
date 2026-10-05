import React from 'react';
import { FaGraduationCap, FaLaptopCode, FaUserShield, FaRocket, FaArrowRight } from 'react-icons/fa';
import ScrollToTopLink from '../ScrollToTopLink';
import { getAppUrls } from '@nacos/config/urls';

const Cards = () => {
  const { portal, upskillHub } = getAppUrls();
  const portalUrl = portal.includes('login') ? portal : `${portal}/login`;
  const upskillHubUrl = upskillHub;

  const quickAccessLinks = [
    {
      icon: <FaGraduationCap />,
      title: "Admissions & Programs",
      description: "Discover our curriculum, degree options, admission requirements, and what it takes to join the next generation of tech leaders.",
      link: "/admissions",
      buttonText: "Explore Admissions",
      isExternal: false
    },
    {
      icon: <FaLaptopCode />,
      title: "Learning Resources",
      description: "Access curated lecture notes, textbook materials, video lectures, and recommended study resources in one convenient hub.",
      link: "/resources",
      buttonText: "Browse Resources",
      isExternal: false
    },
    {
      icon: <FaRocket />,
      title: "Upskill Hub",
      description: "Empower your technical growth with AI-generated curriculums, interactive video workshops, and hands-on developer tracks.",
      link: upskillHubUrl,
      buttonText: "Launch Upskill Hub",
      isExternal: true
    },
    {
      icon: <FaUserShield />,
      title: "Student Portal",
      description: "Access course registration, departmental dues clearance, digital ID card application, and academic results in the portal.",
      link: portalUrl,
      buttonText: "Access Portal",
      isExternal: true
    }
  ];

  return (
    <section className="py-20 bg-[#f8f9fa] dark:bg-[#061e02] border-b border-gray-200/80 dark:border-[#138601]/25 transition-colors duration-300">
      <div className="site-container">
        <div className="flex flex-col items-center mb-12 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-black dark:text-white tracking-tight mb-3">
            Academic & Community <span className="text-[#138601] dark:text-[#4bd043]">Gateways</span>
          </h2>
          <p className="text-gray-700 dark:text-gray-300 max-w-2xl text-base leading-relaxed">
            Essential tools, academic resources, and skill pathways tailored for our computing community.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickAccessLinks.map((item, index) => {
            const CardWrapper = item.isExternal ? 'a' : ScrollToTopLink;
            const linkProps = item.isExternal
              ? { href: item.link, target: '_blank', rel: 'noopener noreferrer' }
              : { to: item.link };

            return (
              <CardWrapper
                key={index}
                {...linkProps}
                className="group relative bg-white dark:bg-[#083002] rounded p-6 border border-gray-200 dark:border-[#138601]/30 hover:border-[#138601] dark:hover:border-[#4bd043] transform hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 flex flex-col h-full overflow-hidden shadow-sm cursor-pointer"
              >
                {/* Icon Container with smooth hover pulse */}
                <div className="mb-5 flex items-center justify-between">
                  <div className="w-12 h-12 rounded bg-[#138601] group-hover:bg-[#0f6c01] flex items-center justify-center text-white text-xl shadow-md transition-all duration-300 group-hover:scale-105">
                    {item.icon}
                  </div>
                  {item.badge && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#138601]/10 dark:bg-[#138601]/25 text-[#138601] dark:text-[#4bd043] border border-[#138601]/20">
                      {item.badge}
                    </span>
                  )}
                </div>

                {/* Content */}
                <h3 className="text-lg font-bold text-black dark:text-white mb-2 group-hover:text-[#138601] dark:group-hover:text-[#4bd043] transition-colors duration-300 tracking-tight leading-snug">
                  {item.title}
                </h3>
                
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed mb-6 flex-grow">
                  {item.description}
                </p>

                {/* Action Button Link */}
                <div className="mt-auto inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#138601] group-hover:bg-[#0f6c01] rounded shadow-sm transition-colors w-fit min-h-[36px]">
                  <span>{item.buttonText || 'Explore'}</span>
                  <FaArrowRight className="ml-1 text-xs group-hover:translate-x-0.5 transition-transform duration-200" />
                </div>
              </CardWrapper>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Cards;
