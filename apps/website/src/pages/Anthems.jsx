import React from 'react';
import Navbar from '../components/Nav/Navbar';
import Footer from '../components/Footer';
import { useTheme } from '../context/ThemeContext';
import { FiMusic } from 'react-icons/fi';

const Anthems = () => {
    const { theme } = useTheme();

    return (
        <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-[#041801] text-white' : 'bg-white text-black'} transition-colors duration-300`}>
            <Navbar />
            <div className="flex-grow max-w-5xl mx-auto px-6 py-16 w-full">
                <header className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-black mb-4">
                        Anthems & <span className="text-[#138601] dark:text-[#4bd043]">Pledge</span>
                    </h1>
                     <p className="text-base sm:text-lg opacity-80 max-w-2xl mx-auto leading-relaxed">
                        Symbols of our departmental unity, national pride, and commitment to technological excellence.
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* FUTO Anthem */}
                    <div className={`p-8 rounded-2xl shadow-sm border border-t-4 border-t-[#138601] ${theme === 'dark' ? 'bg-[#083002] border-[#138601]/30' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[#138601]/10 text-[#138601] dark:text-[#4bd043] mb-6 mx-auto">
                            <FiMusic size={26} />
                        </div>
                        <h2 className="text-xl font-bold text-center mb-6 uppercase tracking-wider text-black dark:text-white">FUTO Anthem</h2>
                        <div className="space-y-4 text-center leading-relaxed italic text-xs sm:text-sm opacity-90 font-serif">
                            <p>
                                Hurrah our great Fed Unitech,<br/>
                                Owerri town you've come to grade,<br/>
                                Hope of our land to industrialize<br/>
                                And comfort for our people,<br/>
                                My Alma Mater.
                            </p>
                            <p>
                                Here in Owerri! Unitech,<br/>
                                The world's great mind, and thinkers meet<br/>
                                To teach and mould talented youth,<br/>
                                Who'll build Africa's land of hope,<br/>
                                My Alma Mater.
                            </p>
                            <p>
                                From north and south and east to west,<br/>
                                Converge we wisdom here to seek,<br/>
                                Fellowship, endurance and skill,<br/>
                                May we these great virtues find,<br/>
                                My Alma Mater.
                            </p>
                        </div>
                    </div>

                    {/* National Anthem */}
                     <div className={`p-8 rounded-2xl shadow-sm border border-t-4 border-t-[#138601] ${theme === 'dark' ? 'bg-[#083002] border-[#138601]/30' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[#138601]/10 text-[#138601] dark:text-[#4bd043] mb-6 mx-auto">
                            <FiMusic size={26} />
                        </div>
                        <h2 className="text-xl font-bold text-center mb-6 uppercase tracking-wider text-black dark:text-white">National Anthem</h2>
                        <div className="space-y-4 text-center leading-relaxed italic text-xs sm:text-sm opacity-90 font-serif">
                            <p>
                                Nigeria, we hail thee,<br/>
                                Our own dear native land,<br/>
                                Though tribe and tongue may differ,<br/>
                                In brotherhood we stand,<br/>
                                Nigerians all, and proud to serve<br/>
                                Our sovereign Motherland.
                            </p>
                            <p>
                                Our flag shall be a symbol<br/>
                                That truth and justice reign,<br/>
                                In peace or battle honoured,<br/>
                                And this we count as gain,<br/>
                                To hand on to our children<br/>
                                A banner without stain.
                            </p>
                            <p>
                                O God of all creation,<br/>
                                Grant this our one request,<br/>
                                Help us to build a nation<br/>
                                Where no man is oppressed,<br/>
                                And so with peace and plenty<br/>
                                Nigeria may be blessed.
                            </p>
                        </div>
                    </div>

                    {/* National Pledge */}
                    <div className={`md:col-span-2 p-8 rounded-2xl shadow-sm border border-t-4 border-t-[#138601] ${theme === 'dark' ? 'bg-[#083002] border-[#138601]/30' : 'bg-white border-gray-200'}`}>
                        <h2 className="text-xl font-bold text-center mb-4 uppercase tracking-wider text-black dark:text-white">The National Pledge</h2>
                        <p className="text-center leading-loose max-w-2xl mx-auto font-medium text-sm sm:text-base opacity-90">
                            "I pledge to Nigeria my country.<br/>
                            To be faithful, loyal and honest.<br/>
                            To serve Nigeria with all my strength.<br/>
                            To defend her unity, and uphold her honour and glory.<br/>
                            So help me God."
                        </p>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default Anthems;
