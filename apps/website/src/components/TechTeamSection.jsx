import React from 'react';
import { FiArrowRight } from 'react-icons/fi';

const TechTeamSection = () => {
    const team = [
        {
            name: "Nestor Anyanwu",
            role: "PM/Lead Developer",
            image: "",
            portfolio: "https://www.linkedin.com/in/nestoranyanwu"
        },
        {
            name: "Kelechukwu Okere",
            role: "QA/UX Personnel",
            image: "",
            portfolio: "https://www.linkedin.com/in/kelechukwu-okere-7173b52a7/"
        },
        {
            name: "Daniel Maduka",
            role: "Consultant Developer",
            image: "",
            portfolio: "https://www.linkedin.com/in/daniel-maduka-a312b7345/"
        },
        {
            name: "Dumebi Oruche",
            role: "Associate Developer",
            image: "",
            portfolio: "https://www.linkedin.com/in/dumebioruche/"
        }
    ];

    return (
        <section className="py-20 bg-white dark:bg-[#041801] border-t border-[#138601]/20 dark:border-[#138601]/30 transition-colors duration-300">
            <div className="site-container text-center">
                <h2 className="text-3xl sm:text-4xl font-extrabold text-black dark:text-white mb-3 tracking-tight leading-tight">
                    Developed by the <span className="text-[#138601] dark:text-[#4bd043]">ICT Team</span>
                </h2>
                <p className="text-base text-gray-700 dark:text-gray-300 max-w-2xl mx-auto mb-12 leading-relaxed">
                    Built with passion by the NACOS Synergy ICT Developers 2025/2026.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto justify-items-center">
                    {team.map((member, index) => (
                        <div
                            key={index}
                            className="w-full max-w-[280px] rounded-2xl overflow-hidden border border-gray-200 dark:border-[#138601]/30 bg-white dark:bg-[#083002] shadow-sm hover:shadow-xl hover:border-[#138601] dark:hover:border-[#4bd043] transform hover:-translate-y-1.5 transition-all duration-300 relative flex flex-col justify-between"
                        >
                            {/* Top abstract gradient mesh */}
                            <div className="h-16 w-full bg-gradient-to-r from-[#138601]/30 via-[#3db92c]/40 to-[#083002]/30 relative">
                                <div className="absolute inset-0 backdrop-blur-sm" />
                            </div>

                            {/* Overlapping Profile Photo */}
                            <div className="-mt-10 flex justify-center z-10">
                                <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-[#138601] to-[#4bd043] shadow-md">
                                    <div className="w-full h-full rounded-full overflow-hidden border-2 border-white dark:border-[#083002] bg-[#041801] flex items-center justify-center">
                                        {member.image ? (
                                            <img
                                                src={member.image}
                                                alt={member.name}
                                                className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-[#138601] to-[#041801] flex items-center justify-center text-white font-black text-lg tracking-wider">
                                                {member.name.split(' ').map(n => n[0]).join('')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Info & Details */}
                            <div className="px-6 pt-4 pb-6 flex-grow flex flex-col justify-between text-center items-center">
                                <div className="mb-6">
                                    <h3 className="text-base font-bold text-black dark:text-white tracking-tight mb-1">{member.name}</h3>
                                    <p className="text-xs font-semibold text-[#138601] dark:text-[#4bd043]">{member.role}</p>
                                </div>

                                <a
                                    href={member.portfolio}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-center gap-2 px-7 py-2.5 bg-[#138601] hover:bg-[#0f6c01] text-white font-semibold text-sm rounded shadow-sm transition-colors cursor-pointer min-h-[42px]"
                                >
                                    <span>View Portfolio</span>
                                    <FiArrowRight className="text-xs" />
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default TechTeamSection;
