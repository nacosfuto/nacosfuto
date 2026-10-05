import React from 'react';
import Navbar from '../components/Nav/Navbar';
import Footer from '../components/Footer';
import { useTheme } from '../context/ThemeContext';
import { FiCheckSquare, FiAlertCircle } from 'react-icons/fi';
import ScrollToTopLink from '../components/ScrollToTopLink';

const HowToApply = () => {
    const { theme } = useTheme();

    return (
        <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-[#041801] text-white' : 'bg-white text-black'} transition-colors duration-300`}>
            <Navbar />
            <div className="flex-grow max-w-4xl mx-auto px-6 py-16 w-full">
                <header className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-black dark:text-white tracking-tight">
                        How To <span className="text-[#138601] dark:text-[#4bd043]">Apply</span>
                    </h1>
                     <p className="text-base sm:text-lg text-black/75 dark:text-green-100/75 max-w-xl mx-auto leading-relaxed">
                        Step-by-step guideline to securing your undergraduate or postgraduate admission into FUTO Computer Science.
                    </p>
                </header>

                <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[#138601]/30 before:to-transparent">
                    {/* Step 1 */}
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-[#138601] text-white font-bold text-sm shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                            1
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-2xl border border-[#138601]/20 dark:border-[#138601]/30 shadow-sm bg-white dark:bg-[#083002]">
                           <div className="flex items-center justify-between space-x-2 mb-1.5">
                               <div className="font-bold text-base text-black dark:text-white">JAMB UTME Registration</div>
                           </div>
                           <div className="text-xs text-black/75 dark:text-green-100/75 leading-relaxed">Register for the Unified Tertiary Matriculation Examination (UTME) and select Federal University of Technology Owerri (FUTO) as your first-choice institution.</div>
                       </div>
                    </div>

                    {/* Step 2 */}
                     <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-[#138601] text-white font-bold text-sm shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                            2
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-2xl border border-[#138601]/20 dark:border-[#138601]/30 shadow-sm bg-white dark:bg-[#083002]">
                           <div className="flex items-center justify-between space-x-2 mb-1.5">
                               <div className="font-bold text-base text-black dark:text-white">FUTO Post-UTME Screening</div>
                           </div>
                           <div className="text-xs text-black/75 dark:text-green-100/75 leading-relaxed">Purchase the Post-UTME screening application form online via the official university portal within the announced window.</div>
                       </div>
                    </div>

                     {/* Step 3 */}
                     <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-[#138601] text-white font-bold text-sm shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                            3
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-2xl border border-[#138601]/20 dark:border-[#138601]/30 shadow-sm bg-white dark:bg-[#083002]">
                           <div className="flex items-center justify-between space-x-2 mb-1.5">
                               <div className="font-bold text-base text-black dark:text-white">Accept Offer on JAMB CAPS</div>
                           </div>
                           <div className="text-xs text-black/75 dark:text-green-100/75 leading-relaxed">Regularly monitor your JAMB CAPS portal and FUTO admission portal. Once offered admission, accept the offer and print your original admission letter.</div>
                       </div>
                    </div>
                </div>

                <div className="mt-14 bg-[#138601]/10 dark:bg-[#083002] border border-[#138601]/30 rounded-2xl p-6 flex items-start">
                    <FiAlertCircle className="text-[#138601] dark:text-[#4bd043] text-2xl mr-4 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-sm text-black dark:text-white">Important Anti-Fraud Notice</h4>
                        <p className="text-xs text-black/75 dark:text-green-100/75 mt-1.5 leading-relaxed">
                             Beware of impostors posing as admission agents. FUTO CSC does NOT charge admission fees outside official university invoice payments. Always use official university portal channels.
                        </p>
                    </div>
                </div>
                 <div className="mt-10 text-center">
                    <a href="https://portal.futo.edu.ng" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-7 py-2.5 bg-[#138601] hover:bg-[#0f6c01] text-white font-semibold text-sm rounded shadow-sm transition-colors cursor-pointer min-h-[42px]">
                        <span>Go to FUTO Portal</span>
                        <span className="ml-1.5">↗</span>
                    </a>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default HowToApply;
