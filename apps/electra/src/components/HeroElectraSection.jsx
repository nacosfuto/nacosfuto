import React, { useState } from 'react';
import { 
  ArrowRight, 
  Sparkles, 
  Check, 
  ShieldCheck, 
  Vote, 
  FileText,
  ChevronRight,
  Award,
  Lock,
  EyeOff,
  Shield,
  MessageSquare,
  Users2,
  KeyRound,
  Inbox
} from 'lucide-react';
import { Link } from 'react-router-dom';

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
      <div className="site-container space-y-8">
        
        {/* ========================================================
            HERO CONTAINER: ELIGO BLU / ELECTRA PURPLE LIGHT THEME
           ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* LEFT COLUMN: HERO BANNER (Extracted Purple #684BFD) */}
          <div className="lg:col-span-7 bg-[#684BFD] text-white rounded-3xl p-7 sm:p-12 relative overflow-hidden flex flex-col justify-between shadow-2xl shadow-[#684BFD]/25 min-h-[520px]">
            
            {/* Subtle Stylized Ballot Box Graphic Overlay */}
            <div className="absolute right-0 bottom-0 pointer-events-none opacity-15 translate-y-6 translate-x-6">
              <Vote className="w-80 h-80 text-white" />
            </div>

            {/* Top Eyebrow Tag */}
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider mb-5">
                <ShieldCheck className="w-4 h-4 text-white" />
                <span>Verified Democratic Ballot Engine</span>
              </div>

              {/* Bold Headline matching Eligo Blu Mockup */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.1] font-display">
                Share your Voice <br />
                Anonymously and Build a <br />
                Stronger Community
              </h1>

              <p className="text-sm sm:text-base font-medium text-white/90 max-w-lg mt-4 leading-relaxed">
                Empowering every Computer Science student with decentralized, tamper-proof ballots. Your vote is confidential, audited, and immutable.
              </p>
            </div>

            {/* 3 Core Value Pillars (Extracted from Eligo Blu Phone Screen 1) */}
            <div className="relative z-10 my-6 space-y-3">
              <div className="p-3.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center gap-3.5 text-xs text-white font-medium">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4 text-white" />
                </div>
                <span>Employs encryption to ensure confidentiality and voter anonymity.</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center gap-3.5 text-xs text-white font-medium">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <span>Offers an easy, creative, and anonymous way for users to express their democratic opinion.</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center gap-3.5 text-xs text-white font-medium">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Users2 className="w-4 h-4 text-white" />
                </div>
                <span>Helps to build a cohesive and forward-looking departmental community.</span>
              </div>
            </div>

            {/* Bottom: 3 Security Specs & Primary Action Button */}
            <div className="relative z-10 space-y-5 pt-2">
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl bg-black/20 text-center border border-white/10">
                  <Shield className="w-4 h-4 mx-auto mb-1 text-white/80" />
                  <span className="text-[10px] font-bold block leading-tight text-white/90">TLS 1.2 Protocol</span>
                </div>
                <div className="p-2.5 rounded-xl bg-black/20 text-center border border-white/10">
                  <EyeOff className="w-4 h-4 mx-auto mb-1 text-white/80" />
                  <span className="text-[10px] font-bold block leading-tight text-white/90">No Voter Tracking</span>
                </div>
                <div className="p-2.5 rounded-xl bg-black/20 text-center border border-white/10">
                  <Lock className="w-4 h-4 mx-auto mb-1 text-white/80" />
                  <span className="text-[10px] font-bold block leading-tight text-white/90">1024-Bit Client Cipher</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onStartVoting}
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-white hover:bg-slate-100 text-[#684BFD] text-sm font-extrabold shadow-xl transition-all transform hover:scale-103 active:scale-97 cursor-pointer group"
                >
                  <span>Start Now & Cast Ballot</span>
                  <ArrowRight className="w-4 h-4 text-[#684BFD] group-hover:translate-x-1 transition-transform" />
                </button>

                <Link
                  to="/results"
                  className="inline-flex items-center gap-2 px-6 py-4 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  <Inbox className="w-4 h-4" />
                  <span>Audit Live Results</span>
                </Link>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: INTERACTIVE BALLOT CARDS (Light Mode Cards) */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-6">

            {/* Quick Action Card 1: To Vote & Insert Code (Matching Eligo Blu Phone Screen 2) */}
            <div className="bg-white border border-[#DDD6FE] rounded-3xl p-6 sm:p-7 shadow-lg shadow-[#684BFD]/05 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-[#684BFD]">
                  To Vote...
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F5F3FF] text-[#684BFD] border border-[#DDD6FE]">
                  Active Ballot
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Insert Code Box */}
                <div className="p-4 rounded-2xl bg-[#F5F3FF] border border-[#DDD6FE] flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-xs font-black text-slate-900 leading-snug">
                      Join a new ballot by inserting a provided code
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Use your student matric credentials or commission passcode.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onStartVoting}
                    className="inline-flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#684BFD] hover:bg-[#5537F8] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    <span>Insert Code</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Past Votes Box */}
                <Link
                  to="/results"
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-[#F5F3FF] border border-slate-200 hover:border-[#DDD6FE] flex flex-col justify-between space-y-3 transition-colors"
                >
                  <div className="space-y-1">
                    <h3 className="text-xs font-black text-slate-900 leading-snug">
                      Go to Past Votes & Audit
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Inspect tally counts and cryptographic verification proofs.
                    </p>
                  </div>
                  <div className="inline-flex items-center justify-between text-xs font-bold text-[#684BFD]">
                    <span>View Audit</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              </div>
            </div>

            {/* Quick Action Card 2: Community Polls & Candidates (Matching Eligo Blu Phone Screen 2) */}
            <div className="bg-white border border-[#DDD6FE] rounded-3xl p-6 sm:p-7 shadow-lg shadow-[#684BFD]/05 space-y-5 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Community Polls
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    Dept. of Computer Science
                  </span>
                </div>

                {/* Poll Card Pill */}
                <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between shadow-md">
                  <div>
                    <h4 className="text-xs font-black">NACOS FUTO Executive Elections</h4>
                    <p className="text-[10px] text-slate-400">Departmental Electoral Commission</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-white" />
                  </div>
                </div>

                {/* Presidential Race Preview */}
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700">Presidential Post Contenders</span>
                    <span className="text-[11px] font-bold text-[#684BFD]">{total} Verified Ballots</span>
                  </div>

                  <div className="space-y-2">
                    <div className="p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src={c1.photoUrl} alt={c1.name} className="w-7 h-7 rounded-full object-cover border border-[#684BFD]" />
                        <span className="text-xs font-bold text-slate-800">{c1.name}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#684BFD]">{p1}%</span>
                    </div>

                    <div className="p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src={c2.photoUrl} alt={c2.name} className="w-7 h-7 rounded-full object-cover border border-slate-300" />
                        <span className="text-xs font-bold text-slate-800">{c2.name}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-600">{p2}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contestants Link Pill */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <Link to="/contestants" className="font-bold text-[#684BFD] hover:underline flex items-center gap-1">
                  <span>Browse All Contestants & Posts</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
                <Link to="/manifestos" className="text-slate-500 hover:text-slate-900 font-medium">
                  Manifestos →
                </Link>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
