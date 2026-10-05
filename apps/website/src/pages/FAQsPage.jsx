import React, { useState } from 'react';
import { FaQuestionCircle, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';
import Navbar from '../components/Nav/Navbar';
import Footer from '../components/Footer';
import ScrollToTopLink from '../components/ScrollToTopLink';

const FAQsPage = () => {
  const { theme } = useTheme();
  const [activeIndex, setActiveIndex] = useState(null);

  const toggleAccordion = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  const faqs = [
    {
      question: "How do I apply for admission to the Computer Science program?",
      answer: "Admission is through UTME or Direct Entry. Visit the FUTO portal to apply when admissions are open. You'll need to meet the minimum requirements including 5 credits in relevant subjects."
    },
    {
      question: "What are the career prospects for Computer Science graduates?",
      answer: "Our graduates work as software engineers, data scientists, cybersecurity experts, system analysts, and in various tech roles across industries. Many also pursue postgraduate studies or start their own tech companies."
    },
    {
      question: "Does the department offer scholarships?",
      answer: "Yes, there are several scholarship opportunities including the FUTO Merit Scholarship, MTN Foundation Scholarship, and others. Check our scholarships page for current opportunities."
    },
    {
      question: "Can I switch to Computer Science from another department?",
      answer: "Inter-departmental transfers are possible but competitive. You'll need to meet the minimum CGPA requirement (usually 3.5+) and pass any required screening tests. Contact the academic office for details."
    },
    {
      question: "What programming languages are taught?",
      answer: "Our curriculum covers Python, Java, C++, JavaScript, and others. The specific languages may vary by course and year of study."
    },
    {
      question: "Are there internship opportunities for students?",
      answer: "Yes, we have partnerships with tech companies that offer internships. Our career services office also helps students find internship placements."
    },
    {
      question: "What facilities are available for Computer Science students?",
      answer: "We have modern computer labs, an innovation hub, high-speed internet, specialized labs for AI, cybersecurity, and more. Students also have access to online learning resources."
    },
    {
      question: "How can I contact the department?",
      answer: "You can visit our office in the SICT building, call +234 801 234 5678, or email cs@futo.edu.ng. Our office hours are 8am-4pm Monday to Friday."
    }
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-[#041801] text-white' : 'bg-white text-[#083002]'}`}>
      <Navbar />

      <section className={`relative py-20 ${theme === 'dark' ? 'bg-[#041801]' : 'bg-white'} border-b border-[#138601]/20 dark:border-[#138601]/30`}>
        <div className="site-container">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
              Frequently Asked <span className="text-[#138601] dark:text-[#4bd043]">Questions</span>
            </h1>
            <p className="text-base sm:text-lg opacity-80 max-w-2xl mx-auto leading-relaxed">
              Find answers to common questions about our computing programs, admissions, student life, and research.
            </p>
          </div>
        </div>
      </section>

      <section className={`py-16 ${theme === 'dark' ? 'bg-[#041801]' : 'bg-[#f8f9fa]'}`}>
        <div className="max-w-4xl mx-auto padding-global">
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="border border-gray-200 dark:border-[#138601]/30 rounded-2xl overflow-hidden shadow-sm"
              >
                <button
                  className={`flex items-center justify-between w-full p-6 text-left transition-colors ${theme === 'dark' ? 'bg-[#083002] hover:bg-[#0c4004]' : 'bg-white hover:bg-gray-50'}`}
                  onClick={() => toggleAccordion(index)}
                >
                  <div className="flex items-center">
                    <FaQuestionCircle className="text-[#138601] dark:text-[#4bd043] mr-4 text-xl flex-shrink-0" />
                    <h3 className="text-base sm:text-lg font-bold text-[#083002] dark:text-white">
                      {faq.question}
                    </h3>
                  </div>
                  {activeIndex === index ? (
                    <FaChevronUp className="text-[#138601] dark:text-[#4bd043]" />
                  ) : (
                    <FaChevronDown className="text-gray-400" />
                  )}
                </button>
                {activeIndex === index && (
                  <div className={`p-6 text-xs sm:text-sm leading-relaxed border-t ${theme === 'dark' ? 'bg-[#083002] text-green-100/80 border-[#138601]/20' : 'bg-white text-gray-600 border-gray-100'}`}>
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className={`mt-12 p-8 rounded-2xl text-center shadow-sm border ${theme === 'dark' ? 'bg-[#083002] border-[#138601]/30' : 'bg-white border-gray-200'}`}>
            <h3 className="text-xl font-bold text-[#083002] dark:text-white mb-2">
              Still have questions?
            </h3>
            <p className="text-xs sm:text-sm opacity-80 mb-6">
              Contact our departmental secretariat or academic advising team.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <ScrollToTopLink
                to="/contact"
                className="inline-flex items-center justify-center px-7 py-2.5 bg-[#138601] hover:bg-[#0f6c01] text-white font-semibold text-sm rounded shadow-sm transition-colors cursor-pointer min-h-[42px]"
              >
                Contact Us
              </ScrollToTopLink>
              <ScrollToTopLink
                to="/admissions"
                className="inline-flex items-center justify-center px-7 py-2.5 font-medium text-sm text-gray-900 dark:text-white bg-[#f1f3f5] dark:bg-[#083002] hover:bg-[#e9ecef] dark:hover:bg-[#138601] rounded border border-gray-200 dark:border-[#138601]/30 transition-colors cursor-pointer min-h-[42px]"
              >
                Admissions Info
              </ScrollToTopLink>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default FAQsPage;
