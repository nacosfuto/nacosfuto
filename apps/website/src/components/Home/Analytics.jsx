import React from 'react';
import { FaChartBar, FaUserShield, FaLock, FaGraduationCap } from 'react-icons/fa';
import ScrollToTopLink from '../ScrollToTopLink';

const Analytics = () => {
  return (
    <section className="py-20 bg-[#f8f9fa] dark:bg-[#061e02] border-b border-gray-200/80 dark:border-[#138601]/25 transition-colors duration-300">
      <div className="site-container grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-3 text-black dark:text-white tracking-tight leading-tight">
            Comprehensive <span className="text-[#138601] dark:text-[#4bd043]">Academic Framework</span>
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-8 text-sm sm:text-base leading-relaxed">
            Our curriculum and departmental system ensure top-tier computer science education, transparent evaluation standards, and continuous learning progression.
          </p>

          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 shadow-sm">
              <div className="w-10 h-10 rounded bg-[#138601]/10 dark:bg-[#138601]/25 flex items-center justify-center text-[#138601] dark:text-[#4bd043] text-lg flex-shrink-0">
                <FaUserShield />
              </div>
              <div>
                <h4 className="font-bold text-base text-black dark:text-white">Accredited Programs & Faculty</h4>
                <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                  NUC accredited undergraduate and postgraduate degree programs mentored by distinguished professors.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 shadow-sm">
              <div className="w-10 h-10 rounded bg-[#138601]/10 dark:bg-[#138601]/25 flex items-center justify-center text-[#138601] dark:text-[#4bd043] text-lg flex-shrink-0">
                <FaLock />
              </div>
              <div>
                <h4 className="font-bold text-base text-black dark:text-white">Research & Innovation Hub</h4>
                <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                  Active research clusters in Artificial Intelligence, Cyber Security, Distributed Systems, and Data Science.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="bg-white dark:bg-[#083002] p-8 rounded shadow-sm border border-gray-200 dark:border-[#138601]/30 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-white/10">
              <div className="w-12 h-12 rounded bg-[#138601] flex items-center justify-center text-white text-xl shadow-sm">
                <FaGraduationCap />
              </div>
              <div>
                <h3 className="text-xl font-bold text-black dark:text-white">Department Overview</h3>
                <span className="text-xs text-[#138601] dark:text-[#4bd043] font-bold">FUTO Computer Science</span>
              </div>
            </div>
            <p className="mb-6 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
              Explore academic roadmaps, departmental handbooks, lecture materials, and faculty directories.
            </p>
            <ScrollToTopLink to="/academics" className="w-full flex items-center justify-center px-7 py-2.5 bg-[#138601] hover:bg-[#0f6c01] text-white text-center font-semibold text-sm rounded shadow-sm transition-colors cursor-pointer min-h-[42px]">
              Explore Academic Programs &rarr;
            </ScrollToTopLink>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Analytics;
