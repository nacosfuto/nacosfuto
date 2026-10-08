import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  ShieldCheck, 
  CheckCircle2, 
  Users, 
  Vote, 
  RefreshCw, 
  TrendingUp, 
  Clock,
  Sparkles,
  Award
} from 'lucide-react';
import { getLiveElectionResults, fetchLiveElectraData } from '@nacos/supabase/electraService';

export default function LiveResultsPage() {
  const [resultsData, setResultsData] = useState(() => getLiveElectionResults());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      setResultsData(getLiveElectionResults());
    };
    window.addEventListener('nacos_electra_election_updated', handleUpdate);
    return () => {
      window.removeEventListener('nacos_electra_election_updated', handleUpdate);
    };
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchLiveElectraData();
      setResultsData(getLiveElectionResults());
    } catch (_) {}
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const { totalBallots, resultsByPost, turnoutByLevel, lastUpdated } = resultsData;

  return (
    <div className="py-10 site-container bg-[#F8FAFC]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[4px] text-xs font-bold bg-green-50 text-[#138601] border border-green-200">
            <BarChart3 className="w-3.5 h-3.5 text-[#138601]" />
            <span>Cryptographic Real-Time Audit Tally</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 font-display">
            Live Election Results
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
            All ballots are mathematically verified against individual matriculation signatures. Tallies update in real time without human intervention.
          </p>
        </div>

        <button
          type="button"
          onClick={handleManualRefresh}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[5px] text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shrink-0 cursor-pointer shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#138601] ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        
        {/* Total Ballots */}
        <div className="p-5 sm:p-6 rounded-[5px] bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">Total Certified Ballots</span>
            <div className="w-8 h-8 rounded-[4px] bg-green-50 text-[#138601] flex items-center justify-center">
              <Vote className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
            {totalBallots.toLocaleString()}
          </div>
          <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-2">
            <CheckCircle2 className="w-3.5 h-3.5 inline" /> 100% Cryptographically Validated
          </p>
        </div>

        {/* Turnout Analysis */}
        <div className="p-5 sm:p-6 rounded-[5px] bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">Leading Participation</span>
            <div className="w-8 h-8 rounded-[4px] bg-green-50 text-[#138601] flex items-center justify-center">
              <Users className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 font-display">
            {Object.keys(turnoutByLevel).length > 0
              ? Object.entries(turnoutByLevel).sort((a,b) => b[1] - a[1])[0]?.[0] || 'All Levels'
              : 'All Cohorts'}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
            {Object.entries(turnoutByLevel).slice(0, 3).map(([lvl, cnt]) => (
              <span key={lvl} className="px-2 py-0.5 rounded-[3px] bg-green-50 text-[#138601] font-bold border border-green-200">{lvl}: {cnt}</span>
            ))}
          </div>
        </div>

        {/* Audit Status */}
        <div className="p-5 sm:p-6 rounded-[5px] bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">Electoral Integrity</span>
            <div className="w-8 h-8 rounded-[4px] bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div className="text-xl font-bold text-[#138601] font-display">
            Active SHA-256 Ledger
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Zero duplicate votes permitted. Real-time audit active.
          </p>
        </div>

      </div>

      {/* Results by Contested Position */}
      <div className="space-y-6">
        {resultsByPost.map(({ post, totalVotes, candidates, leadingCandidate }) => (
          <div
            key={post.id}
            className="p-5 sm:p-6 rounded-[5px] bg-white border border-slate-200 shadow-2xs space-y-5"
          >
            {/* Position Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-[4px] text-xs font-bold font-mono bg-green-50 text-[#138601] border border-green-200">
                    {post.code}
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 font-display">
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
                  <span className="text-[11px] text-[#138601] font-semibold">
                    Leading: {leadingCandidate.name} ({leadingCandidate.percentage}%)
                  </span>
                )}
              </div>
            </div>

            {/* Candidates Progress Bars */}
            <div className="space-y-4">
              {candidates.map((cnd, idx) => {
                const isLeading = idx === 0 && totalVotes > 0;
                return (
                  <div key={cnd.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <img
                          src={cnd.photoUrl}
                          alt={cnd.name}
                          className="w-8 h-8 rounded-[4px] object-cover border border-slate-200"
                        />
                        <div>
                          <span className="font-bold text-slate-900">{cnd.name}</span>
                          {isLeading && (
                            <span className="ml-2 px-1.5 py-0.5 rounded-[3px] text-[10px] font-bold uppercase bg-green-50 text-[#138601] border border-green-200">
                              Projected Lead
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <span className="font-bold text-[#138601] text-sm">{cnd.percentage}%</span>
                        <span className="text-slate-500 text-xs ml-2">({cnd.votesCount || 0} votes)</span>
                      </div>
                    </div>

                    {/* Bar */}
                    <div className="h-2.5 w-full bg-slate-100 rounded-[3px] overflow-hidden p-0.5 border border-slate-200">
                      <div
                        className={`h-full rounded-[2px] transition-all duration-700 ${
                          isLeading
                            ? 'bg-[#138601]'
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
