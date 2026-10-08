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
    <div className="min-h-screen bg-[#F8FAFC]">
      
      {/* Hero Section */}
      <HeroElectraSection
        onStartVoting={() => onOpenBallot()}
        onOpenManifesto={(cnd) => onOpenManifesto(cnd)}
        presidentialCandidates={presCandidates}
      />

      {/* Live Metrics Ticker */}
      <section className="py-6 border-y border-slate-200 bg-white">
        <div className="site-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="flex items-center gap-3.5 p-4 rounded-2xl bg-[#F5F3FF] border border-[#DDD6FE]">
                  <div className="w-10 h-10 rounded-xl bg-[#684BFD] text-white flex items-center justify-center shrink-0 shadow-sm shadow-[#684BFD]/25">
                    <Icon className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <span className="text-lg sm:text-xl font-black text-slate-900 font-display block leading-none">
                      {stat.value}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
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
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-[#F5F3FF] text-[#684BFD] border border-[#DDD6FE] mb-3">
                <Sparkles className="w-3.5 h-3.5 text-[#684BFD]" />
                <span>Democratic Governance 2026/2027</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-display">
                Contested Executive Positions
              </h2>
              <p className="text-sm text-slate-600 mt-1 max-w-xl">
                Explore the leadership offices guiding NACOS FUTO forward, read candidate manifestos, and cast your vote.
              </p>
            </div>

            <Link
              to="/contestants"
              className="inline-flex items-center gap-2 text-xs font-bold text-[#684BFD] hover:underline shrink-0"
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
                  className="p-6 rounded-3xl bg-white border border-[#DDD6FE] hover:border-[#684BFD] transition-all flex flex-col justify-between group shadow-sm hover:shadow-lg hover:shadow-[#684BFD]/10"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-3 py-1 rounded-xl text-xs font-mono font-black bg-[#F5F3FF] text-[#684BFD] border border-[#DDD6FE]">
                        {post.code}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {postCandidates.length} {postCandidates.length === 1 ? 'Candidate' : 'Candidates'}
                      </span>
                    </div>

                    <h3 className="text-xl font-black text-slate-900 font-display mb-2 group-hover:text-[#684BFD] transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 mb-6">
                      {post.description}
                    </p>

                    {/* Candidate Preview Avatars */}
                    <div className="space-y-2 mb-6">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
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
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200 group-hover/avatar:border-[#684BFD] transition-all"
                            />
                          </button>
                        ))}
                        {postCandidates.length > 3 && (
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-center">
                            +{postCandidates.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-500">
                      Eligible: {post.eligibilityLevel}
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenBallot(postCandidates[0] || null)}
                      className="px-4 py-2 rounded-full text-xs font-black text-white bg-[#684BFD] hover:bg-[#5537F8] transition-colors cursor-pointer shadow-sm shadow-[#684BFD]/25"
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
      <section className="py-12 bg-slate-50 border-t border-slate-200">
        <div className="site-container">
          <div className="p-8 sm:p-12 rounded-3xl bg-white border border-[#DDD6FE] flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-lg shadow-[#684BFD]/05">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#684BFD]/05 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-3 max-w-xl relative z-10">
              <span className="text-xs font-black uppercase tracking-widest text-[#684BFD] flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span>Certified Candidate Manifestos</span>
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-display leading-snug">
                Read the visions before you vote.
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Every candidate has submitted an official, legally binding policy roadmap outlining their plans for student academics, welfare, tech hubs, and financial accountability.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto relative z-10 shrink-0">
              <Link
                to="/manifestos"
                className="w-full sm:w-auto px-8 py-3.5 rounded-full text-xs font-black text-white bg-[#684BFD] hover:bg-[#5537F8] transition-all transform active:scale-95 text-center shadow-lg shadow-[#684BFD]/25"
              >
                Browse Manifestos
              </Link>
              <Link
                to="/guidelines"
                className="w-full sm:w-auto px-6 py-3.5 rounded-full text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-center"
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
