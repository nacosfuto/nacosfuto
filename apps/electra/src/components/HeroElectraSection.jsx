import React, { useState } from 'react';
import { 
  ArrowRight, 
  Sparkles, 
  Check, 
  ShieldCheck, 
  Vote, 
  FileText,
  ChevronRight,
  Award
} from 'lucide-react';

export default function HeroElectraSection({ onStartVoting, onOpenManifesto, presidentialCandidates = [] }) {
  const [selectedCandidateId, setSelectedCandidateId] = useState(
    presidentialCandidates[0]?.id || 'cnd-pres-1'
  );

  const c1 = presidentialCandidates[0] || {
    id: 'cnd-pres-1',
    name: 'Chukwuebuka Anyanwu',
    slogan: 'The Catalyst Agenda',
    votesCount: 342,
    photoUrl: 'https://res.cloudinary.com/a2mmcttn/image/upload/v1788569274/nacos/executives/president_irechukwu.jpg'
  };

  const c2 = presidentialCandidates[1] || {
    id: 'cnd-pres-2',
    name: 'Somtochukwu Maduka',
    slogan: 'The CodeFirst Movement',
    votesCount: 289,
    photoUrl: 'https://res.cloudinary.com/a2mmcttn/image/upload/v1788569269/nacos/executives/daniel_chukwuka.jpg'
  };

  const total = (c1.votesCount || 1) + (c2.votesCount || 1);
  const p1 = Math.round(((c1.votesCount || 1) / total) * 100);
  const p2 = 100 - p1;

  return (
    <section className="pt-6 pb-12 sm:pb-16">
      <div className="site-container">
        
        {/* Main 2-Column Hero Grid Matching Reference Design */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* ========================================================
              LEFT COLUMN: VIBRANT ELECTRIC LIME HERO CARD
             ======================================================== */}
          <div className="lg:col-span-7 bg-[#c6ff00] text-black rounded-3xl p-7 sm:p-12 relative overflow-hidden flex flex-col justify-between shadow-2xl shadow-[#c6ff00]/15 min-h-[480px]">
            
            {/* Subtle Texture / Noise / Background Hands Graphic */}
            <div className="absolute right-0 bottom-0 pointer-events-none opacity-90 translate-y-2 translate-x-2">
              <svg 
                className="w-44 h-44 sm:w-56 sm:h-56 text-black" 
                viewBox="0 0 200 200" 
                fill="currentColor"
              >
                {/* Voting Hands Silhouette Graphic */}
                <path d="M70,200 L70,120 C70,114 74,110 80,110 C86,110 90,114 90,120 L90,140 C90,140 94,130 100,130 C106,130 110,134 110,140 L110,145 C110,145 114,136 120,136 C126,136 130,140 130,146 L130,152 C130,152 134,144 140,144 C146,144 150,148 150,154 L150,175 C150,195 135,200 120,200 Z" />
                <path d="M130,200 L130,105 C130,98 135,94 142,94 C149,94 154,98 154,105 L154,125 C154,125 158,115 165,115 C172,115 176,119 176,126 L176,132 C176,132 180,123 187,123 C194,123 198,127 198,134 L198,175 C198,195 180,200 160,200 Z" />
                <path d="M10,200 L10,135 C10,128 15,124 22,124 C29,124 34,128 34,135 L34,155 C34,155 38,145 45,145 C52,145 56,149 56,156 L56,180 C56,195 40,200 25,200 Z" />
              </svg>
            </div>

            {/* Top Eyebrow Tag */}
            <div className="relative z-10">
              <span className="text-xs sm:text-sm font-extrabold tracking-tight uppercase text-black/80 block mb-4">
                The #1 Decentralized Election Platform on Campus.
              </span>

              {/* Huge Bold Headline with Floating Micro-Badges */}
              <div className="relative inline-block mb-6">
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[0.98] font-display uppercase">
                  YOUR OPINION <br />
                  FINALLY PAYS OFF BRO
                </h1>

                {/* Floating Micro-Badge 1 */}
                <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-black text-xs font-black shadow-md absolute top-12 right-2 rotate-2 animate-bounce">
                  <span>+ 1 Verified Ballot</span>
                </div>

                {/* Floating Micro-Badge 2 */}
                <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-black text-xs font-black shadow-md absolute -bottom-4 right-16 -rotate-3">
                  <span>+ 100% Audit</span>
                </div>
              </div>

              <p className="text-sm sm:text-base font-semibold text-black/85 max-w-md leading-relaxed">
                Turn manifestos, debates and student leadership visions into verified real-time democratic rewards.
              </p>
            </div>

            {/* Bottom Action Button */}
            <div className="relative z-10 pt-8 sm:pt-12">
              <button
                type="button"
                onClick={onStartVoting}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-[#0a0b0d] hover:bg-black text-white text-base font-black transition-all transform hover:scale-105 active:scale-95 shadow-xl cursor-pointer group"
              >
                <span>Let's vote!</span>
                <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                  <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              </button>
            </div>

          </div>


          {/* ========================================================
              RIGHT COLUMN: INTERACTIVE VOTE CARD (LIGHT/DARK)
             ======================================================== */}
          <div className="lg:col-span-5 bg-white dark:bg-[#141518] border border-gray-200 dark:border-[#232529] rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-xl shadow-gray-200/50 dark:shadow-2xl relative overflow-hidden min-h-[480px] transition-colors duration-200">
            
            {/* Top Category Badge */}
            <div>
              <div className="inline-flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-[#c6ff00] text-black flex items-center justify-center font-black text-xs">
                  i
                </div>
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">#PresidentialRace</span>
              </div>

              {/* Poll Question */}
              <h2 className="text-xl sm:text-2xl font-black text-gray-950 dark:text-white font-display uppercase tracking-tight leading-snug mb-6">
                EXECOUNCIL 2026: WHO IS YOUR CHOICE FOR CHAPTER PRESIDENT?
              </h2>

              {/* 2 Contestant Choice Cards Side by Side */}
              <div className="grid grid-cols-2 gap-3.5">
                
                {/* Candidate 1 Card */}
                <div 
                  onClick={() => setSelectedCandidateId(c1.id)}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    selectedCandidateId === c1.id 
                      ? 'border-[#c6ff00] bg-[#f7fee7]/40 dark:bg-[#1b1d22] shadow-lg shadow-[#c6ff00]/15 ring-1 ring-[#c6ff00]' 
                      : 'bg-gray-50 dark:bg-[#1c1d22] border-gray-200 dark:border-[#2a2c33] hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="aspect-square rounded-xl overflow-hidden bg-gray-200 dark:bg-[#24262c] mb-3 relative">
                    <img
                      src={c1.photoUrl}
                      alt={c1.name}
                      className="w-full h-full object-cover"
                    />
                    {selectedCandidateId === c1.id && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#c6ff00] text-black flex items-center justify-center shadow-sm">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 mb-3">
                    <div className="text-xs font-black text-emerald-600 dark:text-[#c6ff00]">{p1}%</div>
                    <div className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1">{c1.name}</div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1">{c1.slogan}</p>
                  </div>

                  <div className="flex flex-col gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCandidateId(c1.id);
                        onStartVoting?.(c1);
                      }}
                      className={`w-full py-1.5 rounded-full text-xs font-black transition-colors ${
                        selectedCandidateId === c1.id
                          ? 'bg-[#c6ff00] text-black shadow-sm'
                          : 'border border-gray-300 dark:border-[#c6ff00]/60 text-gray-800 dark:text-[#c6ff00] hover:bg-[#c6ff00] hover:text-black hover:border-transparent'
                      }`}
                    >
                      Select
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenManifesto?.(c1);
                      }}
                      className="text-[10px] text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white underline text-center"
                    >
                      Manifesto
                    </button>
                  </div>
                </div>

                {/* Candidate 2 Card */}
                <div 
                  onClick={() => setSelectedCandidateId(c2.id)}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    selectedCandidateId === c2.id 
                      ? 'border-[#c6ff00] bg-[#f7fee7]/40 dark:bg-[#1b1d22] shadow-lg shadow-[#c6ff00]/15 ring-1 ring-[#c6ff00]' 
                      : 'bg-gray-50 dark:bg-[#1c1d22] border-gray-200 dark:border-[#2a2c33] hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="aspect-square rounded-xl overflow-hidden bg-gray-200 dark:bg-[#24262c] mb-3 relative">
                    <img
                      src={c2.photoUrl}
                      alt={c2.name}
                      className="w-full h-full object-cover"
                    />
                    {selectedCandidateId === c2.id && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#c6ff00] text-black flex items-center justify-center shadow-sm">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 mb-3">
                    <div className="text-xs font-black text-emerald-600 dark:text-[#c6ff00]">{p2}%</div>
                    <div className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1">{c2.name}</div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1">{c2.slogan}</p>
                  </div>

                  <div className="flex flex-col gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCandidateId(c2.id);
                        onStartVoting?.(c2);
                      }}
                      className={`w-full py-1.5 rounded-full text-xs font-black transition-colors ${
                        selectedCandidateId === c2.id
                          ? 'bg-[#c6ff00] text-black shadow-sm'
                          : 'border border-gray-300 dark:border-[#c6ff00]/60 text-gray-800 dark:text-[#c6ff00] hover:bg-[#c6ff00] hover:text-black hover:border-transparent'
                      }`}
                    >
                      Select
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenManifesto?.(c2);
                      }}
                      className="text-[10px] text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white underline text-center"
                    >
                      Manifesto
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Carousel Navigation Bar at Bottom */}
            <div className="pt-6 border-t border-gray-200 dark:border-[#232529] flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-8 h-1.5 rounded-full bg-gray-900 dark:bg-white"></span>
                <span className="w-8 h-1.5 rounded-full bg-gray-300 dark:bg-[#2a2c33]"></span>
                <span className="w-8 h-1.5 rounded-full bg-gray-300 dark:bg-[#2a2c33]"></span>
              </div>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                {total} Certified Ballots Cast
              </span>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
