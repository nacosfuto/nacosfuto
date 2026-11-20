import React from 'react';
import { Layers, Cpu, CreditCard, Server, ArrowRight } from 'lucide-react';

const ICONS = {
  'building-scaling': Layers,
  'ai-physical-world': Cpu,
  'digital-finance': CreditCard,
  'machines-infrastructure': Server
};

const HackathonKeyTopics = ({ keyTopics = [] }) => {
  if (!keyTopics || keyTopics.length === 0) return null;

  return (
    <section 
      id="key-topics" 
      className="py-16 md:py-20 border-b border-gray-200 dark:border-[#138601]/25 bg-white dark:bg-[#051c01] text-gray-900 dark:text-white transition-colors duration-200 relative overflow-hidden"
    >
      {/* Subtle Pixel Dot Pattern matching hackathon theme */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.06]" 
        style={{
          backgroundImage: `radial-gradient(#138601 1.5px, transparent 1.5px)`,
          backgroundSize: '24px 24px'
        }}
      />

      <div className="site-container relative z-10">
        
        {/* Section Header */}
        <div className="mb-10 text-left">
          <div className="flex items-center gap-3">
            <h2 className="font-minecraft text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight uppercase">
              Key Topics
            </h2>
            <span className="font-mono text-[11px] font-black uppercase tracking-wider bg-amber-400 text-gray-950 px-2.5 py-0.5 rounded border border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              Core Pillars
            </span>
          </div>
          <p className="font-mono text-xs sm:text-sm text-gray-600 dark:text-green-300 mt-2 max-w-2xl leading-relaxed">
            Foundational knowledge areas explored during the preparatory learning sessions and applied throughout the hackathon build sprint.
          </p>
        </div>

        {/* 4 Pillars Grid matching the reference UI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {keyTopics.map((topic, index) => {
            const Icon = ICONS[topic.id] || Layers;

            return (
              <div
                key={topic.id || index}
                className="p-6 rounded-lg bg-[#f8fafc] dark:bg-[#072402] border-2 border-gray-900 dark:border-[#138601] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_#138601] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_#138601] transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Topic Number Tag & Icon */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                      0{index + 1}.
                    </span>
                    <div className="w-8 h-8 rounded bg-white dark:bg-[#041801] border-2 border-gray-900 dark:border-[#138601]/60 flex items-center justify-center text-gray-900 dark:text-[#4bd043] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                      <Icon className="w-4 h-4 text-amber-500 dark:text-[#4bd043]" />
                    </div>
                  </div>

                  {/* Topic Title */}
                  <h3 className="text-lg sm:text-xl font-bold text-gray-950 dark:text-white tracking-tight leading-snug group-hover:text-[#138601] dark:group-hover:text-[#4bd043] transition-colors">
                    {topic.title}
                  </h3>

                  {/* Retro Divider Accent */}
                  <div className="mt-3.5 mb-3.5">
                    <div className="h-[2px] w-full bg-gray-900 dark:bg-[#138601]/40 group-hover:bg-[#138601] dark:group-hover:bg-[#4bd043] transition-colors" />
                  </div>

                  {/* Topic Narrative */}
                  <p className="text-xs sm:text-sm text-gray-700 dark:text-green-100/90 leading-relaxed font-normal">
                    {topic.description}
                  </p>
                </div>

                <div className="mt-6 pt-3 border-t border-dashed border-gray-300 dark:border-[#138601]/30 flex items-center justify-between text-[11px] font-mono text-gray-500 dark:text-green-300/80">
                  <span>The Agentic Build '26</span>
                  <span className="group-hover:translate-x-1 transition-transform text-[#138601] dark:text-[#4bd043] font-bold">
                    →
                  </span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default HackathonKeyTopics;
