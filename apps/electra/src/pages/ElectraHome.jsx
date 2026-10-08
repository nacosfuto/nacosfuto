import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  FileEdit, 
  Mail, 
  BarChart3, 
  ClipboardCheck, 
  Building2, 
  Award, 
  Megaphone, 
  Newspaper,
  X,
  ExternalLink,
  CheckCircle2,
  Vote,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { getActiveElection, getElectraPosts, getContestants } from '@nacos/supabase/electraService';

export default function ElectraHome({ 
  election, 
  onOpenBallot, 
  onRequireConnect 
}) {
  const navigate = useNavigate();
  const activeElection = election || getActiveElection();
  const posts = getElectraPosts();
  const contestants = getContestants();

  const [isHowToVoteOpen, setIsHowToVoteOpen] = useState(false);
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);

  // The 8 Canonical Cards strictly matching the reference image layout
  const cards = [
    {
      id: 'registration',
      title: 'Registration',
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
        else navigate('/contestants');
      }
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
      action: () => setIsHowToVoteOpen(true)
    },
    {
      id: 'election-results',
      title: 'Election Results',
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
      id: 'whats-on-ballot',
      title: "What's on the Ballot",
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
      action: () => {
        if (onOpenBallot) onOpenBallot();
        else navigate('/contestants');
      }
    },
    {
      id: 'candidate-statements',
      title: 'Candidate Statements',
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
      id: 'campaign-resources',
      title: 'Campaign Resources',
      icon: (
        <svg className="w-12 h-12 text-[#138601]" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 20h6l12-8v24L16 28h-6z" fill="#f0fdf4" />
          <path d="M14 28v8h4v-8" />
          <path d="M32 18c2 2 2 6 0 8" />
          <path d="M35 14c4 4 4 12 0 16" />
        </svg>
      ),
      action: () => navigate('/guidelines')
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
      action: () => setIsNewsModalOpen(true)
    }
  ];

  return (
    <div className="w-full bg-[#f8fafc] text-slate-900 pb-16">
      
      {/* ── 1. Top Announcement Notification Bar (Exact layout from reference image) ── */}
      <div className="w-full bg-[#0a1b2a] text-white py-2.5 px-4 text-center text-xs sm:text-sm font-semibold tracking-wide">
        <span>Official NACOS FUTO Electoral Commission Notice / Voting is conducted exclusively via accredited student credentials</span>
      </div>

      {/* ── 2. Official Website Hero Banner (Exact layout from reference image) ── */}
      <div className="w-full bg-[#0e3b68] text-white py-12 sm:py-16 px-6">
        <div className="max-w-5xl mx-auto space-y-3">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight font-display text-white">
            This is the official NACOS FUTO ELECTRA Elections website
          </h1>
          <p className="text-sm sm:text-base text-blue-100 max-w-3xl leading-relaxed">
            The website has been updated to provide voters an even easier way to find important election and voting information.
          </p>
        </div>
      </div>

      {/* ── 3. Exact 8-Card Grid Layout (4 columns x 2 rows, matching reference image) ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 sm:pt-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 sm:gap-6">
          {cards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={card.action}
              className="bg-white border border-slate-200 hover:border-[#138601] rounded-[5px] p-8 sm:p-10 flex flex-col items-center justify-center text-center gap-5 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-md group cursor-pointer"
            >
              <div className="w-16 h-16 flex items-center justify-center transition-transform group-hover:scale-105">
                {card.icon}
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-[#138601] transition-colors leading-snug">
                {card.title}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── 4. How To Vote Modal ── */}
      {isHowToVoteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="max-w-lg w-full bg-white rounded-[5px] border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[5px] bg-green-50 text-[#138601] flex items-center justify-center">
                  <Vote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">How to Vote in ELECTRA</h3>
                  <p className="text-[11px] text-slate-500">Official 3-Step Voting Workflow</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsHowToVoteOpen(false)}
                className="p-1.5 rounded-[5px] text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700">
              <div className="flex gap-3.5 items-start p-3.5 rounded-[5px] bg-slate-50 border border-slate-100">
                <span className="w-6 h-6 rounded-full bg-[#138601] text-white flex items-center justify-center font-bold text-xs shrink-0">1</span>
                <div>
                  <h4 className="font-bold text-slate-900">Accredit Your Student Account</h4>
                  <p className="text-slate-600 mt-0.5">Click <strong>Registration</strong> or <strong>Accreditation</strong> and verify your student registration number against the departmental roster.</p>
                </div>
              </div>

              <div className="flex gap-3.5 items-start p-3.5 rounded-[5px] bg-slate-50 border border-slate-100">
                <span className="w-6 h-6 rounded-full bg-[#138601] text-white flex items-center justify-center font-bold text-xs shrink-0">2</span>
                <div>
                  <h4 className="font-bold text-slate-900">Review Candidate Statements</h4>
                  <p className="text-slate-600 mt-0.5">Inspect all certified candidate statements & uploaded manifesto PDFs in <strong>Candidate Statements</strong>.</p>
                </div>
              </div>

              <div className="flex gap-3.5 items-start p-3.5 rounded-[5px] bg-slate-50 border border-slate-100">
                <span className="w-6 h-6 rounded-full bg-[#138601] text-white flex items-center justify-center font-bold text-xs shrink-0">3</span>
                <div>
                  <h4 className="font-bold text-slate-900">Cast Certified Ballot</h4>
                  <p className="text-slate-600 mt-0.5">Select your candidates for each office and cast your ballot. Your cryptographic vote hash will be registered instantly.</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsHowToVoteOpen(false)}
                className="px-4 py-2 rounded-[5px] text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsHowToVoteOpen(false);
                  if (onRequireConnect) onRequireConnect();
                  else navigate('/contestants');
                }}
                className="px-4 py-2 rounded-[5px] text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] shadow-xs cursor-pointer"
              >
                Start Accreditation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. News & Press Releases Modal ── */}
      {isNewsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="max-w-lg w-full bg-white rounded-[5px] border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[5px] bg-green-50 text-[#138601] flex items-center justify-center">
                  <Newspaper className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Electoral Press & Notices</h3>
                  <p className="text-[11px] text-slate-500">Official Commission Circulars</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsNewsModalOpen(false)}
                className="p-1.5 rounded-[5px] text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-[5px] bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">UNECO Notice No. 01/2026</span>
                  <span className="text-[10px] text-slate-500 font-mono">Certified</span>
                </div>
                <p className="text-slate-600">
                  Accreditation is now active for all verified regular undergraduate students in Computer Science.
                </p>
              </div>

              <div className="p-3.5 rounded-[5px] bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">UNECO Notice No. 02/2026</span>
                  <span className="text-[10px] text-slate-500 font-mono">Live</span>
                </div>
                <p className="text-slate-600">
                  Candidate statement documents and manifesto PDFs have been certified and uploaded to the portal registry.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsNewsModalOpen(false)}
                className="px-4 py-2 rounded-[5px] text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Strictly NO FOOTER as requested by user */}
    </div>
  );
}
