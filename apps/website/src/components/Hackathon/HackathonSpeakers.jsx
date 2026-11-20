import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpRight, Sparkles, X, User } from 'lucide-react';

const HackathonSpeakers = ({ speakers = [] }) => {
  const scrollContainerRef = useRef(null);
  const [selectedSpeaker, setSelectedSpeaker] = useState(null);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (!speakers || speakers.length === 0) return null;

  return (
    <section 
      id="speakers" 
      className="py-16 md:py-20 border-b border-gray-200 dark:border-[#138601]/25 bg-[#f8fafc] dark:bg-[#041801] text-gray-900 dark:text-white transition-colors duration-200 relative overflow-hidden"
    >
      {/* Subtle Pixel Dot Pattern matching hackathon theme */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.04] dark:opacity-[0.08]" 
        style={{
          backgroundImage: `radial-gradient(#138601 1.5px, transparent 1.5px)`,
          backgroundSize: '24px 24px'
        }}
      />

      <div className="site-container relative z-10">
        
        {/* Section Header: Our Hackathon UI Typography & Retro Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-minecraft text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight uppercase">
                Featured Speakers
              </h2>
              <span className="font-mono text-[11px] font-black uppercase tracking-wider bg-amber-400 text-gray-950 px-2.5 py-0.5 rounded border border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                Keynotes
              </span>
            </div>
            <p className="font-mono text-xs sm:text-sm text-gray-600 dark:text-green-300 mt-2">
              Preparatory Learning Sessions • Masterclasses with Industry Leaders
            </p>
          </div>

          {/* Retro OS Style Carousel Navigation Controls */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => scroll('left')}
              type="button"
              aria-label="Previous speakers"
              className="p-2 sm:p-2.5 rounded bg-white dark:bg-[#083002] text-gray-900 dark:text-green-200 hover:text-black dark:hover:text-white border-2 border-gray-900 dark:border-[#138601] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_#138601] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => scroll('right')}
              type="button"
              aria-label="Next speakers"
              className="p-2 sm:p-2.5 rounded bg-white dark:bg-[#083002] text-gray-900 dark:text-green-200 hover:text-black dark:hover:text-white border-2 border-gray-900 dark:border-[#138601] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_#138601] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Carousel / Cards Track using our Hackathon Card styling */}
        <div
          ref={scrollContainerRef}
          className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-4 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {speakers.map((speaker, index) => {
            const hasImage = Boolean(speaker.image);
            const initials = speaker.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2);

            return (
              <div
                key={speaker.id || index}
                onClick={() => setSelectedSpeaker(speaker)}
                className="w-[260px] sm:w-[280px] md:w-[290px] xl:w-[calc(20%-16px)] shrink-0 snap-start rounded-lg bg-white dark:bg-[#072402] border-2 border-gray-900 dark:border-[#138601] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_#138601] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_#138601] transition-all flex flex-col justify-between overflow-hidden group cursor-pointer"
              >
                {/* Speaker Photo / Portrait Area */}
                <div className="aspect-square w-full overflow-hidden bg-gray-100 dark:bg-[#041801] border-b-2 border-gray-900 dark:border-[#138601]/60 relative select-none">
                  {hasImage ? (
                    <img
                      src={speaker.image}
                      alt={speaker.name}
                      loading="lazy"
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-amber-50 via-amber-100 to-amber-200 dark:from-[#0c2409] dark:via-[#071705] dark:to-[#041103] text-gray-950 dark:text-white">
                      <div className="w-20 h-20 rounded bg-amber-400 dark:bg-[#138601]/30 border-2 border-gray-900 dark:border-[#4bd043] flex items-center justify-center font-minecraft text-2xl font-bold text-gray-950 dark:text-[#4bd043] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        {initials}
                      </div>
                      <div className="mt-3 flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-white dark:bg-black/50 border border-gray-900 dark:border-[#138601]/60 text-[10px] font-mono uppercase font-bold tracking-wider text-gray-900 dark:text-green-300">
                        <Sparkles className="w-3 h-3 text-amber-500 dark:text-[#4bd043]" />
                        <span>AI Speaker</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Speaker Info Body */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Speaker Name */}
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight leading-snug group-hover:text-[#138601] dark:group-hover:text-[#4bd043] transition-colors">
                      {speaker.name}
                    </h3>

                    {/* Role & Company */}
                    <div className="mt-1 space-y-0.5">
                      <p className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 uppercase">
                        {speaker.role}
                      </p>
                      {speaker.company && (
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {speaker.company}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Retro Divider Accent */}
                  <div className="mt-3.5 mb-3">
                    <div className="h-[2px] w-full bg-gray-900 dark:bg-[#138601]/40 group-hover:bg-[#138601] dark:group-hover:bg-[#4bd043] transition-colors" />
                  </div>

                  {/* Talk Topic with Arrow */}
                  <div className="flex items-start gap-1.5 text-xs text-gray-800 dark:text-green-100 font-bold leading-relaxed">
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#138601] dark:text-[#4bd043] shrink-0 mt-0.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    <span className="line-clamp-2">
                      {speaker.topic}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Speaker Detail Modal: Retro OS Window Style */}
      {selectedSpeaker && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeInUp"
          onClick={() => setSelectedSpeaker(null)}
        >
          <div 
            className="relative w-full max-w-lg rounded-lg overflow-hidden bg-white dark:bg-[#072402] border-[3px] border-gray-900 dark:border-[#138601] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_#138601]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Retro OS Window Header Bar */}
            <div className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 border-b-2 border-gray-900 px-5 py-3 flex items-center justify-between select-none">
              <span className="font-mono text-sm sm:text-base font-black text-gray-950 tracking-tight lowercase">
                speaker.profile
              </span>
              <button
                onClick={() => setSelectedSpeaker(null)}
                className="font-mono text-base font-black text-gray-950 hover:opacity-75 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="p-6 sm:p-8 space-y-5 text-gray-900 dark:text-white">
              <div className="flex items-start gap-4">
                {selectedSpeaker.image ? (
                  <img
                    src={selectedSpeaker.image}
                    alt={selectedSpeaker.name}
                    className="w-20 h-20 rounded object-cover object-top border-2 border-gray-900 dark:border-[#138601] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded bg-amber-400 dark:bg-[#138601]/30 border-2 border-gray-900 dark:border-[#4bd043] flex items-center justify-center font-minecraft text-xl font-bold text-gray-950 dark:text-[#4bd043] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] shrink-0">
                    {selectedSpeaker.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-bold text-gray-950 dark:text-white leading-tight">
                    {selectedSpeaker.name}
                  </h3>
                  <p className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 uppercase mt-0.5">
                    {selectedSpeaker.role}
                  </p>
                  {selectedSpeaker.company && (
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                      {selectedSpeaker.company}
                    </p>
                  )}
                </div>
              </div>

              {/* Topic Box */}
              <div className="p-4 rounded bg-gray-50 dark:bg-[#041801] border-2 border-gray-900 dark:border-[#138601]/40">
                <span className="font-mono text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-1">
                  Keynote Session Topic
                </span>
                <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-start gap-2">
                  <ArrowUpRight className="w-4 h-4 text-[#138601] dark:text-[#4bd043] shrink-0 mt-1" />
                  <span>{selectedSpeaker.topic}</span>
                </p>
              </div>

              {selectedSpeaker.bio && (
                <p className="text-xs sm:text-sm text-gray-700 dark:text-green-100/90 leading-relaxed">
                  {selectedSpeaker.bio}
                </p>
              )}

              <div className="pt-3 border-t border-gray-200 dark:border-[#138601]/30 flex items-center justify-between text-xs font-mono text-gray-500 dark:text-green-300">
                <span>The Agentic Build '26</span>
                <span>Department of Computer Science, FUTO</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </section>
  );
};

export default HackathonSpeakers;
