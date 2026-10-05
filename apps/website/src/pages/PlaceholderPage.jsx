import React from 'react';
import { useTheme } from '../context/ThemeContext';
import Navbar from '../components/Nav/Navbar';
import Footer from '../components/Footer';
import ScrollToTopLink from '../components/ScrollToTopLink';

const PlaceholderPage = ({ title, message }) => {
  const { theme } = useTheme();
  
  return (
    <div className={`min-h-screen flex flex-col relative overflow-hidden transition-colors duration-500 ${theme === 'dark' ? 'bg-[#041801] text-white' : 'bg-white text-black'}`}>
        <div className="relative">
            <Navbar />
        </div>

        <main className="flex-grow flex items-center justify-center p-6 z-10 relative">
            <div className={`
                max-w-3xl w-full text-center p-12 md:p-16 rounded-[2.5rem] 
                shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] 
                backdrop-blur-xl border 
                transform transition-all duration-500 hover:scale-[1.01]
                ${theme === 'dark' 
                    ? 'bg-[#083002]/80 border-[#138601]/30 shadow-black/50 text-white' 
                    : 'bg-[#f2fbf1] border-[#138601]/20 shadow-green-900/10 text-black'
                }
            `}>
                <div className="inline-block mb-6 px-4 py-1.5 rounded-xl border border-[#138601]/40 bg-[#138601]/10 text-[#138601] dark:text-[#4bd043] text-sm font-semibold tracking-wider uppercase">
                    Coming Soon
                </div>
                
                <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight leading-tight">
                    <span className="bg-gradient-to-r from-[#138601] via-[#4bd043] to-emerald-400 bg-clip-text text-transparent">
                        {title}
                    </span>
                </h1>
                
                <p className={`text-xl md:text-2xl mb-10 max-w-2xl mx-auto leading-relaxed font-light ${theme === 'dark' ? 'text-green-100/80' : 'text-black/80'}`}>
                    {message || "We're crafting an exceptional experience. This page is currently under construction but will be ready to blow your mind soon."}
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <ScrollToTopLink to="/" className="px-8 py-4 rounded-xl bg-[#138601] hover:bg-[#0f6c01] text-white font-bold text-lg shadow-lg shadow-[#138601]/30 transition-all hover:-translate-y-1">
                        Return Home
                    </ScrollToTopLink>
                    <button onClick={() => window.history.back()} className={`px-8 py-4 rounded-xl font-bold text-lg border-2 transition-all hover:-translate-y-1 ${theme === 'dark' ? 'border-[#138601]/30 hover:bg-[#138601]/20 text-white' : 'border-[#083002]/20 hover:bg-gray-100 text-black'}`}>
                        Go Back
                    </button>
                </div>
            </div>
        </main>
        <div className="z-10 relative">
            <Footer />
        </div>
    </div>
  );
};

export default PlaceholderPage;
