
import React from 'react';
import Navbar from '../components/Nav/Navbar';
import Footer from '../components/Footer';
import { useTheme } from '../context/ThemeContext';
import { FiCheckCircle, FiFileText, FiAward } from 'react-icons/fi';
import ScrollToTopLink from '../components/ScrollToTopLink';

const AdmissionRequirements = () => {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-[#041801] text-white' : 'bg-white text-black'} transition-colors duration-300`}>
      <Navbar />
      <div className="flex-grow site-container py-16 w-full">
        <header className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-black mb-4">
            Admission <span className="text-[#138601] dark:text-[#4bd043]">Requirements</span>
          </h1>
          <p className="text-base sm:text-lg opacity-80 max-w-2xl mx-auto leading-relaxed">
            Everything you need to know to join the Department of Computer Science at FUTO.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* UTME Requirements */}
          <div className={`p-8 rounded-2xl shadow-sm border transition-all ${theme === 'dark' ? 'bg-[#083002] border-[#138601]/30' : 'bg-white border-gray-200'}`}>
            <h2 className="text-2xl font-bold mb-6 flex items-center text-[#138601] dark:text-[#4bd043]">
               <FiAward className="mr-3" /> UTME Candidates
            </h2>
            <ul className="space-y-4 text-sm opacity-90">
              <li className="flex items-start">
                <FiCheckCircle className="text-[#138601] dark:text-[#4bd043] mr-3 mt-1 flex-shrink-0" />
                <span>Five O'Level credit passes in English Language, Mathematics, Physics, Chemistry, and any other science subject.</span>
              </li>
              <li className="flex items-start">
                <FiCheckCircle className="text-[#138601] dark:text-[#4bd043] mr-3 mt-1 flex-shrink-0" />
                <span>Minimum JAMB score of <strong>200</strong> (subject to annual change).</span>
              </li>
              <li className="flex items-start">
                <FiCheckCircle className="text-[#138601] dark:text-[#4bd043] mr-3 mt-1 flex-shrink-0" />
                <span>Correct JAMB subject combination: English, Mathematics, Physics, and Chemistry.</span>
              </li>
            </ul>
          </div>

          {/* Direct Entry */}
          <div className={`p-8 rounded-2xl shadow-sm border transition-all ${theme === 'dark' ? 'bg-[#083002] border-[#138601]/30' : 'bg-white border-gray-200'}`}>
            <h2 className="text-2xl font-bold mb-6 flex items-center text-[#138601] dark:text-[#4bd043]">
               <FiFileText className="mr-3" /> Direct Entry
            </h2>
             <ul className="space-y-4">
              <li className="flex items-start">
                <FiCheckCircle className="text-blue-500 mr-3 mt-1 flex-shrink-0" />
                <span>A-Level passes in Mathematics, Physics, and Chemistry.</span>
              </li>
              <li className="flex items-start">
                <FiCheckCircle className="text-blue-500 mr-3 mt-1 flex-shrink-0" />
                <span>ND/HND with Upper Credit in Computer Science or related fields from a recognized institution.</span>
              </li>
               <li className="flex items-start">
                <FiCheckCircle className="text-blue-500 mr-3 mt-1 flex-shrink-0" />
                <span>Five O'Level credit passes as specified for UTME candidates.</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 text-center">
            <h3 className="text-xl font-bold mb-6">Ready to apply?</h3>
             <ScrollToTopLink to="/how-to-apply" className="inline-flex items-center justify-center px-7 py-2.5 text-sm font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] rounded shadow-sm transition-colors cursor-pointer min-h-[42px]">
                See How to Apply
            </ScrollToTopLink>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default AdmissionRequirements;
