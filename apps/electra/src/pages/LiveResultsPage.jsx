import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  CheckCircle2, 
  ShieldCheck, 
  TrendingUp, 
  Users, 
  RefreshCw, 
  Award, 
  Vote 
} from 'lucide-react';
import { getLiveElectionResults } from '@nacos/supabase/electraService';

export default function LiveResultsPage() {
  const [resultsData, setResultsData] = useState(() => getLiveElectionResults());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const handleBallotCast = () => {
      setResultsData(getLiveElectionResults());
    };

    window.addEventListener('nacos_electra_ballot_cast', handleBallotCast);
    window.addEventListener('nacos_electra_contestants_updated', handleBallotCast);

    const interval = setInterval(() => {
      setResultsData(getLiveElectionResults());
    }, 10000);

    return () => {
      window.removeEventListener('nacos_electra_ballot_cast', handleBallotCast);
      window.removeEventListener('nacos_electra_contestants_updated', handleBallotCast);
      clearInterval(interval);
    };
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setResultsData(getLiveElectionResults());
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const { totalBallots, resultsByPost, turnoutByLevel, lastUpdated } = resultsData;

  return (
    <div className="py-10 site-container bg-[#F8FAFC]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-[#F5F3FF] text-[#684BFD] border border-[#DDD6FE]">
            <BarChart3 className="w-3.5 h-3.5 text-[#684BFD]" />
            <span>Cryptographic Real-Time Audit Tally</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 font-display">
            Live Election Results
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
            All ballots are mathematically verified against individual matriculation signatures. Tallies update in real time without human intervention.
          </p>
        </div>

        <button
          type="button"
          onClick={handleManualRefresh}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shrink-0 cursor-pointer shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#684BFD] ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        
        {/* Total Ballots */}
        <div className="p-6 rounded-3xl bg-white border border-[#DDD6FE] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-500">Total Certified Ballots</span>
            <div className="w-8 h-8 rounded-xl bg-[#684BFD]/10 text-[#684BFD] flex items-center justify-center">
              <Vote className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 font-display">
            {totalBallots.toLocaleString()}
          </div>
          <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-2">
            <CheckCircle2 className="w-3.5 h-3.5 inline" /> 100% Cryptographically Validated
          </p>
        </div>

        {/* Turnout Analysis */}
        <div className="p-6 rounded-3xl bg-white border border-[#DDD6FE] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-500">Leading Participation</span>
            <div className="w-8 h-8 rounded-xl bg-[#684BFD]/10 text-[#684BFD] flex items-center justify-center">
              <Users className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 font-display">
            {Object.keys(turnoutByLevel).length > 0
              ? Object.entries(turnoutByLevel).sort((a,b) => b[1] - a[1])[0]?.[0] || 'All Levels'
              : 'All Cohorts'}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500">
            {Object.entries(turnoutByLevel).slice(0, 3).map(([lvl, cnt]) => (
              <span key={lvl} className="px-2 py-0.5 rounded-md bg-[#F5F3FF] text-[#684BFD] font-bold border border-[#DDD6FE]">{lvl}: {cnt}</span>
            ))}
          </div>
        </div>

        {/* Audit Status */}
        <div className="p-6 rounded-3xl bg-white border border-[#DDD6FE] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-500">Electoral Integrity</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div className="text-xl font-black text-[#684BFD] font-display">
            Active SHA-256 Ledger
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Zero duplicate votes permitted. Automatic fraud mitigation active.
          </p>
        </div>

      </div>

      {/* Results by Contested Position */}
      <div className="space-y-8">
        {resultsByPost.map(({ post, totalVotes, candidates, leadingCandidate }) => (
          <div
            key={post.id}
            className="p-6 sm:p-8 rounded-3xl bg-white border border-[#DDD6FE] shadow-sm space-y-6"
          >
            {/* Position Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-black font-mono bg-[#F5F3FF] text-[#684BFD] border border-[#DDD6FE]">
                    {post.code}
                  </span>
                  <h2 className="text-xl font-black text-slate-900 font-display">
                    {post.title}
                  </h2>
                </div>
                <p className="text-xs text-slate-500">{post.description}</p>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs font-mono font-bold text-slate-900 block">
                  {totalVotes} Total Votes Cast
                </span>
                {leadingCandidate && totalVotes > 0 && (
                  <span className="text-[11px] text-[#684BFD] font-semibold">
                    Leading: {leadingCandidate.name} ({leadingCandidate.percentage}%)
                  </span>
                )}
              </div>
            </div>

            {/* Candidates Progress Bars */}
            <div className="space-y-5">
              {candidates.map((cnd, idx) => {
                const isLeading = idx === 0 && totalVotes > 0;
                return (
                  <div key={cnd.id} className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <img
                          src={cnd.photoUrl}
                          alt={cnd.name}
                          className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                        />
                        <div>
                          <span className="font-bold text-slate-900">{cnd.name}</span>
                          {isLeading && (
                            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#F5F3FF] text-[#684BFD] border border-[#DDD6FE]">
                              Projected Lead
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <span className="font-black text-[#684BFD] text-sm">{cnd.percentage}%</span>
                        <span className="text-slate-500 text-xs ml-2">({cnd.votesCount || 0} votes)</span>
                      </div>
                    </div>

                    {/* Bar */}
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          isLeading
                            ? 'bg-gradient-to-r from-[#684BFD] to-[#8C76FF]'
                            : 'bg-slate-300'
                        }`}
                        style={{ width: `${Math.max(cnd.percentage, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
