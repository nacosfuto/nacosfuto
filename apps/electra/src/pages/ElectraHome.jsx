import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Vote, 
  ShieldCheck, 
  Users, 
  FileText, 
  BarChart3, 
  Clock, 
  ArrowRight, 
  Sparkles, 
  Award, 
  CheckCircle2, 
  Lock,
  ChevronDown,
  ChevronRight,
  Eye,
  Megaphone,
  Inbox,
  HelpCircle,
  Building2,
  Newspaper,
  BookOpen
} from 'lucide-react';
import { 
  getElectraPosts, 
  getContestants, 
  getActiveElection, 
  getLiveElectionResults 
} from '@nacos/supabase/electraService';

export default function ElectraHome({ 
  election, 
  onOpenBallot, 
  onOpenManifesto, 
  onRequireConnect 
}) {
  const activeElection = election || getActiveElection();
  const posts = getElectraPosts();
  const contestants = getContestants();
  const results = getLiveElectionResults();

  const [selectedPostFilter, setSelectedPostFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('cards'); // 'cards' | 'statements' | 'results'

  const filteredContestants = contestants.filter(c => 
    selectedPostFilter === 'all' || c.postId === selectedPostFilter
  );

  // 8 Direct Portal Cards (Directly structured to Image 2 reference)
  const portalCards = [
    {
      id: 'vote',
      title: 'Cast Your Vote',
      subtitle: 'Accredited Ballot Box',
      icon: Vote,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600',
      borderColor: 'hover:border-emerald-500',
      action: () => onOpenBallot ? onOpenBallot() : onRequireConnect?.(),
      badge: 'Ballot Open'
    },
    {
      id: 'statements',
      title: 'Candidate Statements',
      subtitle: 'Aspirant Agendas & Pledges',
      icon: FileText,
      color: 'bg-[#684BFD]',
      textColor: 'text-[#684BFD]',
      borderColor: 'hover:border-[#684BFD]',
      action: () => {
        const el = document.getElementById('candidate-statements-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        else window.location.href = '/manifestos';
      },
      badge: 'Certified'
    },
    {
      id: 'results',
      title: 'Live Election Results',
      subtitle: 'Real-time Cryptographic Audit',
      icon: BarChart3,
      color: 'bg-blue-600',
      textColor: 'text-blue-600',
      borderColor: 'hover:border-blue-500',
      link: '/results',
      badge: 'Live Counts'
    },
    {
      id: 'ballot',
      title: "What's on the Ballot",
      subtitle: '10 Executive Offices',
      icon: Award,
      color: 'bg-indigo-600',
      textColor: 'text-indigo-600',
      borderColor: 'hover:border-indigo-500',
      action: () => {
        const el = document.getElementById('offices-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        else window.location.href = '/contestants';
      },
      badge: `${posts.length} Offices`
    },
    {
      id: 'guidelines',
      title: 'How to Vote by Ballot',
      subtitle: 'Electoral Rules & Code',
      icon: BookOpen,
      color: 'bg-amber-500',
      textColor: 'text-amber-600',
      borderColor: 'hover:border-amber-500',
      link: '/guidelines',
      badge: 'Guidelines'
    },
    {
      id: 'accreditation',
      title: 'Voter Accreditation',
      subtitle: 'Student Identity Verification',
      icon: CheckCircle2,
      color: 'bg-teal-600',
      textColor: 'text-teal-600',
      borderColor: 'hover:border-teal-500',
      action: () => onRequireConnect?.(),
      badge: 'Free & Instant'
    },
    {
      id: 'committee',
      title: 'Electoral Commission',
      subtitle: 'UNECO Polling Secretariat',
      icon: Megaphone,
      color: 'bg-purple-600',
      textColor: 'text-purple-600',
      borderColor: 'hover:border-purple-500',
      link: '/guidelines#uneco',
      badge: 'Supervisory'
    },
    {
      id: 'notices',
      title: 'Election Notices & Press',
      subtitle: 'Official Circulars & Bulletins',
      icon: Newspaper,
      color: 'bg-slate-700',
      textColor: 'text-slate-700',
      borderColor: 'hover:border-slate-500',
      link: '/guidelines#notices',
      badge: 'Official'
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      
      {/* Top Direct Election Banner */}
      <section className="bg-gradient-to-r from-[#684BFD] via-[#5b3af7] to-[#4c2ee8] text-white py-10 sm:py-14 shadow-lg shadow-[#684BFD]/15">
        <div className="site-container">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-white" />
                <span>Active Election: {activeElection.session || '2026/2027'}</span>
              </div>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight font-display">
                {activeElection.title}
              </h1>
              <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-medium">
                Official democratic electoral engine of the Nigeria Association of Computing Students (NACOS), Federal University of Technology, Owerri.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onOpenBallot ? onOpenBallot() : onRequireConnect?.()}
                className="px-6 py-3 rounded-xl bg-white text-[#684BFD] hover:bg-slate-50 text-xs sm:text-sm font-black transition-all shadow-md cursor-pointer flex items-center gap-2"
              >
                <Vote className="w-4 h-4 stroke-[2.5]" />
                <span>Cast Your Vote Now</span>
              </button>
              <Link
                to="/results"
                className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/30 text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                <span>View Live Results</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 8 Direct Navigation Action Cards (Directly matching Image 2 reference) */}
      <section className="py-10 sm:py-14 site-container">
        <div className="mb-8">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
            Election Gateway & Quick Access
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Choose an option below to cast your ballot, review candidate statements, or inspect real-time results.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {portalCards.map((card) => {
            const Icon = card.icon;
            const content = (
              <div 
                className={`p-6 sm:p-7 rounded-2xl bg-white border border-gray-200/90 hover:border-[#684BFD] shadow-xs hover:shadow-md transition-all flex flex-col items-center text-center justify-between min-h-[190px] sm:min-h-[210px] group cursor-pointer ${card.borderColor}`}
                onClick={card.action}
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-50 group-hover:bg-[#F5F3FF] border border-slate-100 flex items-center justify-center transition-colors shadow-2xs">
                  <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${card.textColor} transition-transform group-hover:scale-110`} />
                </div>

                <div className="space-y-1 mt-3">
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-[#684BFD] transition-colors leading-snug">
                    {card.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 hidden sm:block font-medium">
                    {card.subtitle}
                  </p>
                </div>

                <div className="mt-3">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#684BFD] group-hover:underline">
                    <span>Access</span>
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );

            if (card.link) {
              return (
                <Link key={card.id} to={card.link} className="block">
                  {content}
                </Link>
              );
            }

            return (
              <div key={card.id} className="block">
                {content}
              </div>
            );
          })}
        </div>
      </section>

      {/* Embedded Candidate Statements Table (Image 1 reference) */}
      <section id="candidate-statements-section" className="py-10 bg-slate-50/70 border-y border-slate-200/90">
        <div className="site-container">
          
          <div className="mb-6 space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F5F3FF] text-[#684BFD] border border-[#DDD6FE]">
              <FileText className="w-3.5 h-3.5" />
              <span>Direct Candidate Statements</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black text-slate-900 font-display">
              Candidate Agendas & Manifestos
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
              Click to read each candidate's statement or use the menu to see the ones running to stand as the candidate for a particular office.
            </p>
          </div>

          {/* Office Filter Bar */}
          <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-2xs mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <span className="text-xs text-slate-600 font-semibold">
              Select an electoral office to view candidate statements:
            </span>
            <div className="relative min-w-[220px]">
              <select
                value={selectedPostFilter}
                onChange={(e) => setSelectedPostFilter(e.target.value)}
                className="w-full appearance-none pl-3.5 pr-10 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#684BFD] cursor-pointer"
              >
                <option value="all">All Contested Offices ({contestants.length})</option>
                {posts.map((post) => (
                  <option key={post.id} value={post.id}>
                    {post.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Candidate Statement Table (Directly matching Image 1) */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#1e3a8a] text-white text-xs uppercase font-bold tracking-wider">
                    <th scope="col" className="py-3.5 px-4 w-16 text-center">
                      Photo
                    </th>
                    <th scope="col" className="py-3.5 px-6">
                      Candidate's Name
                    </th>
                    <th scope="col" className="py-3.5 px-6">
                      Electoral District / Office
                    </th>
                    <th scope="col" className="py-3.5 px-6 text-right w-44">
                      Candidate's Statement
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/80 text-xs">
                  {filteredContestants.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-slate-500">
                        No candidates running for this specific position yet.
                      </td>
                    </tr>
                  ) : (
                    filteredContestants.map((c, idx) => (
                      <tr 
                        key={c.id} 
                        className={`hover:bg-slate-50/80 transition-colors ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center">
                          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-200 shadow-2xs mx-auto bg-slate-100 shrink-0">
                            <img
                              src={c.photoUrl || 'https://res.cloudinary.com/a2mmcttn/image/upload/v1788569274/nacos/executives/president_irechukwu.jpg'}
                              alt={c.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </td>
                        <td className="py-3.5 px-6 font-bold text-slate-900 text-sm">
                          {c.name}
                          {c.slogan && (
                            <div className="text-[11px] text-slate-500 font-normal italic mt-0.5 line-clamp-1">
                              "{c.slogan}"
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-6 font-medium text-slate-700">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                            <Award className="w-3 h-3 text-[#684BFD]" />
                            <span>{c.runningPost}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <button
                            type="button"
                            onClick={() => onOpenManifesto(c)}
                            className="px-4 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-b from-slate-100 to-slate-200 hover:from-[#684BFD] hover:to-[#5537F8] hover:text-white text-slate-800 border border-slate-300 hover:border-[#684BFD] transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Show</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 text-right">
            <Link
              to="/manifestos"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#684BFD] hover:underline"
            >
              <span>Open dedicated candidate statements page</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>
      </section>

      {/* Contested Executive Offices Section */}
      <section id="offices-section" className="py-12 sm:py-16 site-container">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl sm:text-3xl font-black text-slate-900 font-display">
              Contested Executive Offices
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Explore the 10 executive positions governing the NACOS FUTO student body.
            </p>
          </div>
          <Link
            to="/contestants"
            className="text-xs font-bold text-[#684BFD] hover:underline flex items-center gap-1 shrink-0"
          >
            <span>View all contestants</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.map((post) => {
            const postCandidates = contestants.filter(c => c.postId === post.id);
            return (
              <div
                key={post.id}
                className="p-5 sm:p-6 rounded-2xl bg-white border border-gray-200/90 hover:border-[#684BFD] shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-[#F5F3FF] text-[#684BFD] border border-[#DDD6FE]">
                      {post.code}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {postCandidates.length} Aspirant{postCandidates.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 font-display mb-1.5">
                    {post.title}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {post.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {postCandidates.map((cnd) => (
                      <img
                        key={cnd.id}
                        src={cnd.photoUrl}
                        alt={cnd.name}
                        title={cnd.name}
                        className="w-7 h-7 rounded-full border-2 border-white object-cover"
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPostFilter(post.id);
                      const el = document.getElementById('candidate-statements-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-xs font-bold text-[#684BFD] hover:underline cursor-pointer"
                  >
                    View Statements
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
