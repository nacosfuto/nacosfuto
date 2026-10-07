import React from 'react';
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
  Lock
} from 'lucide-react';
import HeroElectraSection from '../components/HeroElectraSection';
import { getElectraPosts, getContestants } from '@nacos/supabase/electraService';

export default function ElectraHome({ 
  election, 
  onOpenBallot, 
  onOpenManifesto,
  onRequireConnect 
}) {
  const posts = getElectraPosts();
  const contestants = getContestants();
  const presCandidates = contestants.filter(c => c.postId === 'post-president');

  const stats = [
    { label: 'Registered Voters', value: '1,420+', icon: Users },
    { label: 'Executive Offices', value: posts.length, icon: Award },
    { label: 'Certified Contestants', value: contestants.length, icon: Vote },
    { label: 'Audit Security', value: '100% SHA-256', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen">
      
      {/* Hero Section */}
      <HeroElectraSection
        onStartVoting={() => onOpenBallot()}
        onOpenManifesto={(cnd) => onOpenManifesto(cnd)}
        presidentialCandidates={presCandidates}
      />

      {/* Live Metrics Ticker */}
      <section className="py-6 border-y border-gray-200 dark:border-[#22252a] bg-white/70 dark:bg-[#0e0f12] transition-colors duration-200">
        <div className="site-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="flex items-center gap-3.5 p-3 rounded-2xl bg-gray-50/80 dark:bg-[#141518]/60 border border-gray-200 dark:border-[#232529]">
                  <div className="w-10 h-10 rounded-xl bg-[#c6ff00]/25 dark:bg-[#c6ff00]/15 text-black dark:text-[#c6ff00] flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-lg sm:text-xl font-black text-gray-900 dark:text-white font-display block leading-none">
                      {stat.value}
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                      {stat.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contested Offices Explorer */}
      <section className="py-14 sm:py-20">
        <div className="site-container">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-[#1e2025] text-gray-900 dark:text-[#c6ff00] mb-3">
                <Sparkles className="w-3.5 h-3.5 text-[#c6ff00]" />
                <span>Democratic Governance 2026/2027</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-gray-950 dark:text-white font-display">
                Contested Executive Positions
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-xl">
                Explore the leadership offices guiding NACOS FUTO forward, read candidate manifestos, and cast your vote.
              </p>
            </div>

            <Link
              to="/contestants"
              className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-[#c6ff00] hover:underline shrink-0"
            >
              <span>View all contestants</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Grid of Offices */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => {
              const postCandidates = contestants.filter(c => c.postId === post.id);

              return (
                <div
                  key={post.id}
                  className="p-6 rounded-3xl bg-white dark:bg-[#141518] border border-gray-200 dark:border-[#22252a] hover:border-[#c6ff00] dark:hover:border-[#c6ff00]/50 transition-all flex flex-col justify-between group shadow-lg shadow-gray-200/40 dark:shadow-xl"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-3 py-1 rounded-xl text-xs font-mono font-black bg-gray-100 dark:bg-[#1c1d22] text-gray-900 dark:text-[#c6ff00] border border-gray-200 dark:border-[#2b2e38]">
                        {post.code}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {postCandidates.length} {postCandidates.length === 1 ? 'Candidate' : 'Candidates'}
                      </span>
                    </div>

                    <h3 className="text-xl font-black text-gray-900 dark:text-white font-display mb-2 group-hover:text-[#c6ff00] transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3 mb-6">
                      {post.description}
                    </p>

                    {/* Candidate Preview Avatars */}
                    <div className="space-y-2 mb-6">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">
                        Contenders:
                      </span>
                      <div className="flex items-center gap-2">
                        {postCandidates.slice(0, 3).map((cnd) => (
                          <button
                            key={cnd.id}
                            type="button"
                            onClick={() => onOpenManifesto(cnd)}
                            title={`View ${cnd.name}'s Manifesto`}
                            className="relative group/avatar cursor-pointer"
                          >
                            <img
                              src={cnd.photoUrl}
                              alt={cnd.name}
                              className="w-10 h-10 rounded-xl object-cover border border-gray-200 dark:border-[#2b2e38] group-hover/avatar:border-[#c6ff00] transition-all"
                            />
                          </button>
                        ))}
                        {postCandidates.length > 3 && (
                          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#1c1d22] border border-gray-200 dark:border-[#2b2e38] text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-center">
                            +{postCandidates.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200 dark:border-[#22252a] flex items-center justify-between gap-3">
                    <span className="text-[11px] text-gray-500">
                      Eligible: {post.eligibilityLevel}
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenBallot(postCandidates[0] || null)}
                      className="px-4 py-2 rounded-full text-xs font-black text-black bg-[#c6ff00] hover:bg-[#b2e600] transition-colors cursor-pointer shadow-sm"
                    >
                      Vote Now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* Manifesto Callout Banner */}
      <section className="py-12 bg-gradient-to-b from-transparent to-gray-100/50 dark:to-[#0e0f12]">
        <div className="site-container">
          <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-[#15161a] border border-gray-200 dark:border-[#242730] flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-xl shadow-gray-200/50 dark:shadow-2xl">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#c6ff00]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-3 max-w-xl relative z-10">
              <span className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-[#c6ff00] flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span>Certified Candidate Manifestos</span>
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-gray-950 dark:text-white font-display leading-snug">
                Read the visions before you vote.
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                Every candidate has submitted an official, legally binding policy roadmap outlining their plans for student academics, welfare, tech hubs, and financial accountability.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto relative z-10 shrink-0">
              <Link
                to="/manifestos"
                className="w-full sm:w-auto px-8 py-3.5 rounded-full text-xs font-black text-black bg-[#c6ff00] hover:bg-[#b2e600] transition-all transform active:scale-95 text-center shadow-lg shadow-[#c6ff00]/20"
              >
                Browse Manifestos
              </Link>
              <Link
                to="/guidelines"
                className="w-full sm:w-auto px-6 py-3.5 rounded-full text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#1c1d22] hover:text-black dark:hover:text-white border border-gray-200 dark:border-[#2a2c33] text-center"
              >
                Electoral Guidelines
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
