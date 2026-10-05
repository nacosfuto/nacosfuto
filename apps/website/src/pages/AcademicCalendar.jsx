import React from 'react';
import Navbar from '../components/Nav/Navbar';
import Footer from '../components/Footer';
import { useTheme } from '../context/ThemeContext';
import { FiBookOpen, FiAward, FiClock, FiCalendar } from 'react-icons/fi';

const AcademicCalendar = () => {
    const { theme } = useTheme();

    const rainEvents = [
        { semester: "Rain Semester", title: "Week 1: Lectures Begin", badge: "Academic" },
        { semester: "Rain Semester", title: "Week 2: Lectures", badge: "Academic" },
        { semester: "Rain Semester", title: "Week 3: Lectures", badge: "Academic" },
        { semester: "Rain Semester", title: "Week 4: Lectures", badge: "Academic" },
        { semester: "Rain Semester", title: "Week 5: Lectures", badge: "Academic" },
        { semester: "Rain Semester", title: "Week 6: Lectures", badge: "Academic" },
        { semester: "Rain Semester", title: "University Senate Meeting", badge: "Administrative" },
        { semester: "Rain Semester", title: "Mid-Semester Break", badge: "Break" },
        { semester: "Rain Semester", title: "University Senate Meeting", badge: "Administrative" },
        { semester: "Rain Semester", title: "Resumption from Mid-Semester Break", badge: "Academic" },
        { semester: "Rain Semester", title: "Week 7: Lectures", badge: "Academic" },
        { semester: "Rain Semester", title: "Week 8: Lectures", badge: "Academic" },
        { semester: "Rain Semester", title: "Week 9: Lectures", badge: "Academic" },
        { semester: "Rain Semester", title: "Week 10: Lectures", badge: "Academic" },
        { semester: "Rain Semester", title: "Week 11: Lectures", badge: "Academic" },
        { semester: "Rain Semester", title: "University Senate Meeting", badge: "Administrative" },
        { semester: "Rain Semester", title: "Week 12: Lectures", badge: "Academic" },
        { semester: "Rain Semester", title: "Week 13: Lectures", badge: "Academic" },
        { semester: "Rain Semester", title: "Week 14: Lectures Conclude", badge: "Academic" },
        { semester: "Rain Semester", title: "Public Holiday (Id El Maulud)", badge: "Holiday" },
        { semester: "Rain Semester", title: "University Senate Meeting", badge: "Administrative" },
        { semester: "Rain Semester", title: "Revision Week", badge: "Revision" },
        { semester: "Rain Semester", title: "Commencement of Rain Semester Examinations", badge: "Examination" },
        { semester: "Rain Semester", title: "Continuation of Rain Semester Examinations", badge: "Examination" },
        { semester: "Rain Semester", title: "Conclusion of Rain Semester Examinations", badge: "Examination" },
        { semester: "Rain Semester", title: "Commencement of End of Session Break", badge: "Vacation" },
    ];

    const getBadgeStyle = (badge) => {
        switch (badge) {
            case 'Examination':
                return 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/50';
            case 'Revision':
                return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50';
            case 'Break':
            case 'Vacation':
            case 'Holiday':
                return 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200 dark:border-purple-900/50';
            case 'Administrative':
                return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
            default:
                return 'bg-green-50 text-[#138601] dark:bg-[#138601]/20 dark:text-[#4bd043] border border-green-200 dark:border-[#138601]/40';
        }
    };

    return (
        <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-[#041801] text-white' : 'bg-white text-black'} transition-colors duration-300`}>
            <Navbar />
            <div className="flex-grow max-w-5xl mx-auto px-6 py-16 w-full">
                <header className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
                        Academic <span className="text-[#138601] dark:text-[#4bd043]">Calendar</span>
                    </h1>
                    <p className="text-base sm:text-lg opacity-80 max-w-2xl mx-auto leading-relaxed">
                        Academic activity timeline and semester progression for Computer Science undergraduates
                    </p>
                </header>

                {/* Rain Semester */}
                <section>
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-px flex-1 bg-gradient-to-r from-[#138601]/0 via-[#138601] to-[#138601]/0"></div>
                        <h2 className="text-2xl font-bold text-[#138601] dark:text-[#4bd043] flex items-center gap-2">
                            <FiCalendar className="text-2xl" /> Rain Semester
                        </h2>
                        <div className="h-px flex-1 bg-gradient-to-r from-[#138601]/0 via-[#138601] to-[#138601]/0"></div>
                    </div>
                    <div className="relative border-l-4 border-[#138601]/30 ml-4 md:ml-10 space-y-5">
                        {rainEvents.map((event, index) => (
                            <div key={index} className="relative pl-8 md:pl-12">
                                <div className="absolute -left-[14px] top-4 w-5 h-5 rounded-full border-4 bg-[#138601] border-green-200 dark:border-[#041801] z-10 box-content"></div>
                                <div className={`p-5 rounded-[5px] shadow-sm border transition-all hover:shadow-md ${theme === 'dark' ? 'bg-[#083002] border-[#138601]/30' : 'bg-white border-gray-200'}`}>
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <span className="inline-block px-2.5 py-0.5 rounded-[5px] text-xs font-bold uppercase tracking-wider bg-green-100 text-black dark:bg-green-900/40 dark:text-green-200">
                                            {event.semester}
                                        </span>
                                        <span className={`inline-block px-2.5 py-0.5 rounded-[5px] text-xs font-semibold ${getBadgeStyle(event.badge)}`}>
                                            {event.badge}
                                        </span>
                                    </div>
                                    <h3 className="text-base sm:text-lg font-bold text-black dark:text-white">
                                        {event.title}
                                    </h3>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
            <Footer />
        </div>
    );
};

export default AcademicCalendar;
