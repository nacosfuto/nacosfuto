import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpRight, Mic, Sparkles, X, Building, User } from 'lucide-react';

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
    <section id="speakers" className="py-16 md:py-24 bg-[#0a1408] text-white border-b border-gray-900 dark:border-[#138601]/25 relative overflow-hidden">
      {/* Background Subtle Gradient & Grid Accent */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(#4bd043 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      <div className="site-container relative z-10">
        
        {/* Section Header: Styled exactly like the reference UI */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 sm:mb-12">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>Featured Speakers</span>
            </h2>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#138601]/30 text-[#4bd043] border border-[#138601]/50">
              Keynotes
            </span>
          </div>

          {/* Navigation Arrows */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => scroll('left')}
              aria-label="Previous speakers"
              className="w-10 h-10 rounded-full border border-white/20 bg-black/40 text-white/80 hover:text-white hover:border-[#138601] hover:bg-[#138601]/30 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll('right')}
              aria-label="Next speakers"
              className="w-10 h-10 rounded-full border border-white/20 bg-black/40 text-white/80 hover:text-white hover:border-[#138601] hover:bg-[#138601]/30 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Carousel / Multi-card Grid */}
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
                className="w-[260px] sm:w-[280px] md:w-[290px] xl:w-[calc(20%-16px)] shrink-0 snap-start rounded-xl overflow-hidden bg-[#0d1c0a] border border-white/10 hover:border-[#138601] transition-all duration-300 shadow-md hover:shadow-2xl hover:-translate-y-1.5 flex flex-col justify-between group cursor-pointer"
              >
                {/* Speaker Photo / Portrait Area */}
                <div className="aspect-square w-full overflow-hidden bg-[#071305] relative select-none">
                  {hasImage ? (
                    <img
                      src={speaker.image}
                      alt={speaker.name}
                      loading="lazy"
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center relative p-6 bg-gradient-to-br from-[#0c2409] via-[#071705] to-[#041103]">
                      <div className="w-20 h-20 rounded-2xl bg-[#138601]/25 border border-[#4bd043]/40 flex items-center justify-center text-[#4bd043] font-black text-2xl tracking-wider shadow-inner">
                        {initials}
                      </div>
                      <div className="mt-3 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase font-bold tracking-wider text-green-300">
                        <Sparkles className="w-3 h-3 text-[#4bd043]" />
                        <span>AI Speaker</span>
                      </div>
                    </div>
                  )}

                  {/* Dark subtle vignette overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d1c0a] via-transparent to-transparent opacity-80" />
                </div>

                {/* Speaker Info Body */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Speaker Name */}
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug group-hover:text-[#4bd043] transition-colors">
                      {speaker.name}
                    </h3>

                    {/* Role & Company */}
                    <div className="mt-1 space-y-0.5 text-xs">
                      <p className="text-gray-400 font-medium">
                        {speaker.role}
                      </p>
                      {speaker.company && (
                        <p className="text-gray-200 font-semibold">
                          {speaker.company}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Green Accent Divider (Matches reference style) */}
                  <div className="mt-3.5 mb-3">
                    <div className="h-[2px] w-full bg-[#138601]/40 group-hover:bg-[#4bd043] transition-colors" />
                  </div>

                  {/* Talk Title / Topic with Arrow */}
                  <div className="flex items-start gap-1.5 text-xs text-gray-300 group-hover:text-white transition-colors leading-relaxed font-medium">
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#4bd043] shrink-0 mt-0.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
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

      {/* Speaker Detail Modal */}
      {selectedSpeaker && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeInUp"
          onClick={() => setSelectedSpeaker(null)}
        >
          <div 
            className="relative w-full max-w-lg bg-[#0d1c0a] border border-[#138601]/50 rounded-2xl p-6 sm:p-8 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedSpeaker(null)}
              className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4">
              {selectedSpeaker.image ? (
                <img
                  src={selectedSpeaker.image}
                  alt={selectedSpeaker.name}
                  className="w-20 h-20 rounded-2xl object-cover object-top border-2 border-[#138601] shadow-md shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-[#138601]/30 border border-[#4bd043] flex items-center justify-center text-[#4bd043] font-bold text-xl shrink-0">
                  {selectedSpeaker.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
              )}

              <div>
                <h3 className="text-xl font-bold text-white">{selectedSpeaker.name}</h3>
                <p className="text-sm text-green-300 font-semibold">{selectedSpeaker.role}</p>
                {selectedSpeaker.company && (
                  <p className="text-xs text-gray-400">{selectedSpeaker.company}</p>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 space-y-3">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-green-400 block mb-1">
                  Keynote Session Topic
                </span>
                <p className="text-base font-bold text-white flex items-start gap-1.5">
                  <ArrowUpRight className="w-4 h-4 text-[#4bd043] shrink-0 mt-1" />
                  <span>{selectedSpeaker.topic}</span>
                </p>
              </div>

              {selectedSpeaker.bio && (
                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed pt-2">
                  {selectedSpeaker.bio}
                </p>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-400 font-mono">
              <span>The Agentic Build 2026</span>
              <span className="text-green-300">Department of Computer Science, FUTO</span>
            </div>
          </div>
        </div>
      )}

    </section>
  );
};

export default HackathonSpeakers;
