import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveElection } from '@nacos/supabase/electraService';

export default function ElectraHome({ 
  election, 
  onOpenBallot, 
  onRequireConnect 
}) {
  const navigate = useNavigate();
  const activeElection = election || getActiveElection();

  // The Canonical Cards strictly ordered with Accreditation (1), Vote Now (2), Results (3)
  const cards = [
    {
      id: 'accreditation',
      title: 'Accreditation',
      step: 1,
      icon: (
        <svg className="w-12 h-12 text-[#138601]" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 8h16l10 10v22H12z" />
          <path d="M28 8v10h10" />
          <path d="M18 24h12" />
          <path d="M18 30h12" />
          <path d="M18 36h6" />
          <path d="M30 32l6-6 3 3-6 6h-3v-3z" stroke="currentColor" fill="#f0fdf4" />
        </svg>
      ),
      action: () => {
        if (onRequireConnect) onRequireConnect();
        else navigate('/vote');
      }
    },
    {
      id: 'vote-now',
      title: 'Vote Now',
      step: 2,
      icon: (
        <svg className="w-12 h-12 text-[#138601]" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 10h20v30H14z" />
          <path d="M20 6h8v4h-8z" rx="1" fill="#f0fdf4" />
          <path d="M18 18h2v2h-2z" />
          <path d="M23 19h7" />
          <path d="M18 24h2v2h-2z" />
          <path d="M23 25h7" />
          <path d="M18 30h2v2h-2z" />
          <path d="M23 31h7" />
        </svg>
      ),
      action: () => navigate('/vote')
    },
    {
      id: 'election-results',
      title: 'Results',
      step: 3,
      icon: (
        <svg className="w-12 h-12 text-[#138601]" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="8" y="8" width="32" height="22" rx="2" />
          <path d="M14 24l5-6 6 4 9-8" />
          <circle cx="34" cy="14" r="2" fill="currentColor" />
          <path d="M18 30l-4 12" />
          <path d="M30 30l4 12" />
          <path d="M24 30v12" />
        </svg>
      ),
      action: () => navigate('/results')
    },
    {
      id: 'how-to-vote',
      title: 'How to Vote Online',
      icon: (
        <svg className="w-12 h-12 text-[#138601]" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="8" y="14" width="32" height="24" rx="2" />
          <path d="M8 18l16 12 16-12" />
          <path d="M16 14V8h16v6" fill="#f0fdf4" />
          <path d="M21 11h6" />
        </svg>
      ),
      action: () => navigate('/guidelines')
    },
    {
      id: 'candidate-manifestos',
      title: 'Candidate Manifestos',
      icon: (
        <svg className="w-12 h-12 text-[#138601]" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="24" cy="20" r="10" />
          <path d="M20 20l3 3 5-5" />
          <path d="M18 28l-3 12 9-4 9 4-3-12" fill="#f0fdf4" />
        </svg>
      ),
      action: () => navigate('/manifestos')
    },
    {
      id: 'candidates',
      title: 'Candidates',
      icon: (
        <svg className="w-12 h-12 text-[#138601]" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="24" cy="16" r="8" fill="#f0fdf4" />
          <path d="M12 38c0-6.627 5.373-12 12-12s12 5.373 12 12" />
          <path d="M6 38c0-4.418 3.582-8 8-8" />
          <path d="M42 38c0-4.418-3.582-8-8-8" />
          <circle cx="14" cy="18" r="5" />
          <circle cx="34" cy="18" r="5" />
        </svg>
      ),
      action: () => navigate('/contestants')
    },
    {
      id: 'where-to-vote',
      title: 'Where to Vote in Person',
      icon: (
        <svg className="w-12 h-12 text-[#138601]" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 20h28v20H10z" />
          <path d="M24 8l16 12H8L24 8z" fill="#f0fdf4" />
          <path d="M16 26v8" />
          <path d="M24 26v8" />
          <path d="M32 26v8" />
          <path d="M24 8V4m0 0l4 2-4 2" />
        </svg>
      ),
      action: () => navigate('/where-to-vote')
    },
    {
      id: 'news-releases',
      title: 'News & Press Releases',
      icon: (
        <svg className="w-12 h-12 text-[#138601]" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 12h26v26H8z" />
          <path d="M34 18h6v20H14v-4" />
          <path d="M13 18h16" />
          <path d="M13 24h16" />
          <path d="M13 30h8" />
        </svg>
      ),
      action: () => navigate('/news-and-press')
    }
  ];

  return (
    <div className="w-full bg-[#f8fafc] text-slate-900 pb-16">
      {/* ── Responsive 8-Card Grid Layout ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {cards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={card.action}
              className="relative bg-white border border-slate-200 hover:border-[#138601] rounded-[4px] p-6 sm:p-8 flex flex-col items-center justify-center text-center gap-4 transition-all shadow-xs hover:shadow-md group cursor-pointer"
            >
              {/* Number Tag strictly for Cards 1, 2, and 3 */}
              {card.step && (
                <div className="absolute top-3 left-3 w-6 h-6 rounded-[3px] bg-[#138601] text-white font-mono font-bold text-xs flex items-center justify-center shadow-2xs">
                  {card.step}
                </div>
              )}

              <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center transition-transform group-hover:scale-105 shrink-0">
                {card.icon}
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-[#138601] transition-colors leading-snug">
                {card.title}
              </span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
