import React from 'react';
import { FiHelpCircle, FiMail, FiArrowRight } from 'react-icons/fi';
import ScrollToTopLink from '../ScrollToTopLink';

const QuickHelpCTA = () => {
    return (
        <section className="py-16 transition-colors duration-300 bg-[#f8f9fa] dark:bg-[#061e02] border-t border-gray-200/80 dark:border-[#138601]/25">
            <div className="max-w-5xl mx-auto padding-global">
                <div className="relative overflow-hidden rounded p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 border bg-white dark:bg-[#083002] border-gray-200 dark:border-[#138601]/30 shadow-sm">
                    
                    {/* Content */}
                    <div className="relative flex items-start gap-4 flex-1">
                        <div className="hidden sm:flex w-12 h-12 rounded bg-[#138601] items-center justify-center text-white text-xl flex-shrink-0">
                            <FiHelpCircle />
                        </div>
                        <div>
                            <h3 className="text-xl md:text-2xl font-bold mb-1.5 text-black dark:text-white tracking-tight">
                                Have Questions or Need Help?
                            </h3>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed max-w-lg">
                                Whether you have questions about admissions, courses, curriculum, or student clearance — the department is here to support you.
                            </p>
                        </div>
                    </div>

                    {/* CTA Buttons (Matching Login Button Style: 42px height, #138601 green, 5px rounded radius) */}
                    <div className="relative flex flex-col sm:flex-row gap-3 flex-shrink-0 w-full sm:w-auto">
                        <ScrollToTopLink
                            to="/contact"
                            className="inline-flex items-center justify-center gap-2 px-7 py-2.5 bg-[#138601] hover:bg-[#0f6c01] text-white font-semibold text-sm rounded shadow-sm transition-colors cursor-pointer min-h-[42px]"
                        >
                            <FiMail className="text-sm" />
                            <span>Contact Us</span>
                            <FiArrowRight className="text-xs" />
                        </ScrollToTopLink>
                        <ScrollToTopLink
                            to="/faqs"
                            className="inline-flex items-center justify-center gap-2 px-7 py-2.5 font-medium text-sm text-gray-900 dark:text-white bg-[#f1f3f5] dark:bg-[#041801] hover:bg-[#e9ecef] dark:hover:bg-[#138601] rounded border border-gray-200 dark:border-[#138601]/30 transition-colors cursor-pointer min-h-[42px]"
                        >
                            <FiHelpCircle className="text-sm" />
                            <span>View FAQs</span>
                        </ScrollToTopLink>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default QuickHelpCTA;
