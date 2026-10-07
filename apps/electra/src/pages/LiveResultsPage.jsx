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
    <div className="py-10 site-container">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-[#1e2025] text-gray-900 dark:text-[#c6ff00]">
            <BarChart3 className="w-3.5 h-3.5 text-[#c6ff00]" />
            <span>Cryptographic Real-Time Audit Tally</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-gray-950 dark:text-white font-display">
            Live Election Results
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
            All ballots are mathematically verified against individual matriculation signatures. Tallies update in real time without human intervention.
          </p>
        </div>

        <button
          type="button"
          onClick={handleManualRefresh}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold bg-white dark:bg-[#18191d] hover:bg-gray-100 dark:hover:bg-[#202227] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#2a2c33] shrink-0 cursor-pointer shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 dark:text-[#c6ff00] ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        
        {/* Total Ballots */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#141518] border border-gray-200 dark:border-[#232529] shadow-lg shadow-gray-200/40 dark:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Total Certified Ballots</span>
            <div className="w-8 h-8 rounded-xl bg-[#c6ff00]/25 dark:bg-[#c6ff00]/15 text-black dark:text-[#c6ff00] flex items-center justify-center">
              <Vote className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-gray-950 dark:text-white font-display">
            {totalBallots.toLocaleString()}
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-2">
            <CheckCircle2 className="w-3.5 h-3.5 inline" /> 100% Cryptographically Validated
          </p>
        </div>

        {/* Turnout Analysis */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#141518] border border-gray-200 dark:border-[#232529] shadow-lg shadow-gray-200/40 dark:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Leading Participation</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Users className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-xl font-black text-gray-950 dark:text-white font-display">
            {Object.keys(turnoutByLevel).length > 0
              ? Object.entries(turnoutByLevel).sort((a,b) => b[1] - a[1])[0]?.[0] || 'All Levels'
              : 'All Cohorts'}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-500 dark:text-gray-400">
            {Object.entries(turnoutByLevel).slice(0, 3).map(([lvl, cnt]) => (
              <span key={lvl} className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-[#1e2025]">{lvl}: {cnt}</span>
            ))}
          </div>
        </div>

        {/* Audit Status */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#141518] border border-gray-200 dark:border-[#232529] shadow-lg shadow-gray-200/40 dark:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Electoral Integrity</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-[#c6ff00] font-display">
            Active SHA-256 Ledger
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
            Zero duplicate votes permitted. Automatic fraud mitigation active.
          </p>
        </div>

      </div>

      {/* Results by Contested Position */}
      <div className="space-y-8">
        {resultsByPost.map(({ post, totalVotes, candidates, leadingCandidate }) => (
          <div
            key={post.id}
            className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#141518] border border-gray-200 dark:border-[#232529] shadow-xl shadow-gray-200/40 dark:shadow-2xl space-y-6"
          >
            {/* Position Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-gray-200 dark:border-[#22252a]">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-black font-mono bg-gray-100 dark:bg-[#1c1d22] text-gray-900 dark:text-[#c6ff00] border border-gray-200 dark:border-[#2b2e38]">
                    {post.code}
                  </span>
                  <h2 className="text-xl font-black text-gray-950 dark:text-white font-display">
                    {post.title}
                  </h2>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{post.description}</p>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs font-mono font-bold text-gray-900 dark:text-white block">
                  {totalVotes} Total Votes Cast
                </span>
                {leadingCandidate && totalVotes > 0 && (
                  <span className="text-[11px] text-emerald-600 dark:text-[#c6ff00] font-semibold">
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
                          className="w-8 h-8 rounded-lg object-cover border border-gray-200 dark:border-[#2b2e38]"
                        />
                        <div>
                          <span className="font-bold text-gray-900 dark:text-white">{cnd.name}</span>
                          {isLeading && (
                            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#c6ff00] text-black">
                              Projected Lead
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <span className="font-black text-emerald-600 dark:text-[#c6ff00] text-sm">{cnd.percentage}%</span>
                        <span className="text-gray-500 dark:text-gray-400 text-xs ml-2">({cnd.votesCount || 0} votes)</span>
                      </div>
                    </div>

                    {/* Bar */}
                    <div className="h-3 w-full bg-gray-100 dark:bg-[#1b1d22] rounded-full overflow-hidden p-0.5 border border-gray-200 dark:border-[#262830]">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          isLeading
                            ? 'bg-gradient-to-r from-[#c6ff00] to-[#a6d800]'
                            : 'bg-gray-400 dark:bg-gray-600'
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
