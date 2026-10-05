import React from 'react';
import { FiArrowRight } from 'react-icons/fi';
import devVictor from '../assets/executives/ict_asst_victory.jpg';
import devIfeanyi from '../assets/executives/ict_dir_ifeanyi.jpg';
import devDaniel from '../assets/executives/daniel_chukwuka.jpg';
import devDavid from '../assets/executives/state_ict_okikere.jpg';

const TechTeamSection = () => {
    const team = [
        {
            name: "Nestor Anyanwu",
            role: "Fullstack / Lead Dev",
            association: "Director of ICT, NACOS FUTO",
            image: devIfeanyi,
            portfolio: "https://www.linkedin.com/in/anyanwu-ifeanyichukwu-63309a250/",
            track: "Full-Stack & Systems"
        },
        {
            name: "Victory Otuonye",
            role: "Frontend Engineer",
            association: "Asst. Director of ICT, NACOS FUTO",
            image: devVictor,
            portfolio: "https://www.linkedin.com/in/victory-otuonye-a99166324/",
            track: "Frontend & Architecture"
        },
        {
            name: "Kelechukwu Okere",
            role: "Lead Software Architect",
            association: "State Director of ICT, NACOS Imo",
            image: devDavid,
            portfolio: "https://www.linkedin.com/in/kelechi-okere-854722245/",
            track: "Backend & Cloud"
        },
        {
            name: "Daniel Chukwuka",
            role: "Frontend Engineer",
            association: "Full-Stack Dev, NACOS FUTO",
            image: devDaniel,
            portfolio: "https://www.linkedin.com/in/daniel-maduka-a312b7345/",
            track: "UI & Client State"
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
                                    <div className="w-full h-full rounded-full overflow-hidden border-2 border-white dark:border-[#083002] bg-[#041801]">
                                        <img
                                            src={member.image}
                                            alt={member.name}
                                            className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Info & Details */}
                            <div className="px-6 pt-3 pb-6 flex-grow flex flex-col justify-between text-center items-center">
                                <div>
                                    <h3 className="text-base font-bold text-black dark:text-white tracking-tight mb-0.5">{member.name}</h3>
                                    <p className="text-xs font-semibold text-[#138601] dark:text-[#4bd043] mb-2 uppercase tracking-wider">{member.role}</p>

                                    <span className="inline-block text-[10px] font-medium text-gray-800 dark:text-green-200/80 mb-5 bg-gray-50 dark:bg-[#041801] px-2.5 py-1 rounded border border-gray-200 dark:border-[#138601]/30">
                                        {member.association}
                                    </span>
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
