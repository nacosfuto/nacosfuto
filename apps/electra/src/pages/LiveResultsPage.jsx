import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Users, 
  Vote, 
  RefreshCw, 
  Clock, 
  Sparkles, 
  Award,
  Wifi,
  Zap,
  BarChart3,
  ArrowLeft
} from 'lucide-react';
import { 
  getLiveElectionResults, 
  apiGetAuthoritativeResults, 
  subscribeToElectionResults,
  getActiveElection,
  fetchLiveElectraData 
} from '@nacos/supabase/electraService';

export default function LiveResultsPage() {
  const [activeElection, setActiveElection] = useState(() => getActiveElection());
  const electionId = activeElection?.id || null;

  const [resultsData, setResultsData] = useState(() => getLiveElectionResults(electionId));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'connected' | 'connecting' | 'disconnected'
  const [recentUpdates, setRecentUpdates] = useState({}); // { [candidateId]: timestamp }
  const [lastLivePing, setLastLivePing] = useState(null);
  const lastAuthoritativeTimeRef = useRef(0);

  // Authoritative server fetch for initial load and reconciliation
  const fetchAuthoritative = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    try {
      if (!electionId) {
        const { election: liveEl } = await fetchLiveElectraData();
        if (liveEl) {
          setActiveElection(liveEl);
          const data = await apiGetAuthoritativeResults(liveEl.id);
          if (data && data.success && data.resultsByPost) {
            setResultsData({
              totalBallots: data.totalBallots || 0,
              resultsByPost: data.resultsByPost || [],
              turnoutByLevel: data.turnoutByLevel || {},
              lastUpdated: data.lastUpdated || new Date().toISOString()
            });
          }
        }
        return;
      }

      const data = await apiGetAuthoritativeResults(electionId);
      if (data && data.success && data.resultsByPost) {
        setResultsData(prev => ({
          totalBallots: data.totalBallots ?? prev.totalBallots,
          resultsByPost: data.resultsByPost,
          turnoutByLevel: data.turnoutByLevel || prev.turnoutByLevel,
          lastUpdated: data.lastUpdated || new Date().toISOString()
        }));
        lastAuthoritativeTimeRef.current = Date.now();
      }
    } catch (err) {
      console.warn('[LiveResultsPage] Error fetching authoritative results:', err);
    } finally {
      if (showSpinner) setIsRefreshing(false);
    }
  }, [electionId]);

  // In-place real-time atomic update handler (prevents full reload / UI flickering)
  const handleRealtimeUpdate = useCallback((payload) => {
    if (!payload || !payload.updates || !Array.isArray(payload.updates)) return;

    setLastLivePing(new Date());

    // Record timestamps for subtle pulse visual cues
    const now = Date.now();
    const newRecentUpdates = { ...recentUpdates };
    payload.updates.forEach(u => {
      newRecentUpdates[u.candidate_id] = now;
    });
    setRecentUpdates(newRecentUpdates);

    // Apply updates directly in-place
    setResultsData(prev => {
      const updatesMap = new Map();
      payload.updates.forEach(u => {
        updatesMap.set(u.candidate_id, u.vote_count);
      });

      const updatedPosts = prev.resultsByPost.map(postGroup => {
        let hasChanges = false;
        const newCandidates = postGroup.candidates.map(candidate => {
          if (updatesMap.has(candidate.id)) {
            hasChanges = true;
            return {
              ...candidate,
              votesCount: updatesMap.get(candidate.id)
            };
          }
          return candidate;
        });

        if (!hasChanges) return postGroup;

        // Recalculate post totals and percentage distributions atomically
        const newTotalVotes = newCandidates.reduce((sum, c) => sum + (c.votesCount || 0), 0);
        const candidatesWithPercent = newCandidates.map(c => ({
          ...c,
          percentage: newTotalVotes > 0 ? Math.round(((c.votesCount || 0) / newTotalVotes) * 100) : 0
        })).sort((a, b) => (b.votesCount || 0) - (a.votesCount || 0));

        return {
          ...postGroup,
          totalVotes: newTotalVotes,
          candidates: candidatesWithPercent,
          leadingCandidate: candidatesWithPercent[0] || null
        };
      });

      return {
        ...prev,
        totalBallots: payload.total_ballots != null ? payload.total_ballots : (prev.totalBallots + payload.updates.length),
        resultsByPost: updatedPosts,
        lastUpdated: payload.timestamp || new Date().toISOString()
      };
    });
  }, [recentUpdates]);

  // Lifecycle: initial authoritative fetch, WebSocket subscription, visibility reconciliation
  useEffect(() => {
    // 1. Initial Authoritative Fetch
    fetchAuthoritative();

    // 2. Realtime WebSocket Broadcast Subscription
    setConnectionStatus('connecting');
    const unsubscribe = subscribeToElectionResults({
      electionId,
      onUpdate: (payload) => {
        setConnectionStatus('connected');
        handleRealtimeUpdate(payload);
      },
      onReconnect: () => {
        setConnectionStatus('connected');
        // Authoritative reconciliation on reconnection to prevent missed packets
        fetchAuthoritative();
      }
    });

    const timer = setTimeout(() => {
      setConnectionStatus('connected');
    }, 1200);

    // 3. Tab Visibility Reconciliation (handles devices waking up or background tabs returning)
    let lastVisibilityCheck = Date.now();
    const handleVisibilityChange = () => {
      const now = Date.now();
      if (document.visibilityState === 'visible' && now - lastVisibilityCheck > 15000) {
        lastVisibilityCheck = now;
        fetchAuthoritative();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 4. Local synchronisation event listeners
    const handleLocalUpdate = () => {
      fetchAuthoritative();
    };
    window.addEventListener('nacos_electra_election_updated', handleLocalUpdate);
    window.addEventListener('nacos_electra_contestants_updated', handleLocalUpdate);
    window.addEventListener('nacos_electra_posts_updated', handleLocalUpdate);

    return () => {
      clearTimeout(timer);
      unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('nacos_electra_election_updated', handleLocalUpdate);
      window.removeEventListener('nacos_electra_contestants_updated', handleLocalUpdate);
      window.removeEventListener('nacos_electra_posts_updated', handleLocalUpdate);
    };
  }, [electionId, fetchAuthoritative, handleRealtimeUpdate]);

  // Visual pulse fade timer
  useEffect(() => {
    const hasKeys = Object.keys(recentUpdates).length > 0;
    if (!hasKeys) return;

    const timeout = setTimeout(() => {
      const now = Date.now();
      const filtered = {};
      Object.entries(recentUpdates).forEach(([k, t]) => {
        if (now - t < 4000) filtered[k] = t;
      });
      setRecentUpdates(filtered);
    }, 4000);

    return () => clearTimeout(timeout);
  }, [recentUpdates]);

  const { totalBallots, resultsByPost, lastUpdated } = resultsData;

  return (
    <div className="py-10 site-container bg-[#F8FAFC]">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 mb-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 sm:gap-6">
          {/* Left Side: Title & Subtitle */}
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight font-display">
              {activeElection?.title || 'Live Election Results'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-normal">
              Live results, updated in real time.
            </p>
          </div>

          {/* Right Side: Total Ballots / Voters Counter Card */}
          <div className="bg-slate-50/80 sm:bg-white border border-slate-200/80 rounded-xl sm:rounded-2xl px-5 py-3.5 sm:px-6 sm:py-4 shadow-2xs sm:shadow-xs flex items-center justify-between sm:flex-col sm:items-end shrink-0 min-w-[170px]">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block sm:mb-1">
              Total Voters
            </span>
            <div className="flex items-center sm:justify-end gap-2.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display tracking-tight">
                {(totalBallots || 0).toLocaleString()}
              </span>
              <button
                type="button"
                onClick={() => fetchAuthoritative(true)}
                disabled={isRefreshing}
                title="Refresh Results"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-40 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#138601]' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results by Contested Position */}
      <div className="space-y-6">
        {!activeElection ? (
          <div className="py-16 text-center rounded-[5px] bg-white border border-slate-200 p-8 shadow-2xs">
            <BarChart3 className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-900 mb-1">No Active Election Session</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Live results are offline because no election is currently active. Official tallies will be broadcast here once an election is opened.
            </p>
          </div>
        ) : resultsByPost.length === 0 ? (
          <div className="py-16 text-center rounded-[5px] bg-white border border-slate-200 p-8 shadow-2xs">
            <BarChart3 className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-900 mb-1">No results recorded yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No offices or votes have been recorded for {activeElection?.title || 'this election'}. Live tallies will update immediately when electors submit ballots.
            </p>
          </div>
        ) : (
          resultsByPost.map(({ post, totalVotes, candidates }) => (
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
                    {post?.title}
                  </h2>
                </div>
                <p className="text-xs text-slate-500">{post.description}</p>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs font-mono font-bold text-slate-900 block">
                  {totalVotes} {totalVotes === 1 ? 'Vote Cast' : 'Total Votes Cast'}
                </span>
              </div>
            </div>

            {/* Candidates Progress Bars */}
            <div className="space-y-4">
              {candidates.map((cnd) => {
                const isRecentlyUpdated = recentUpdates[cnd.id] && (Date.now() - recentUpdates[cnd.id] < 4000);

                return (
                  <div 
                    key={cnd.id} 
                    className={`p-2 rounded-[5px] transition-all duration-500 space-y-1.5 ${
                      isRecentlyUpdated ? 'bg-emerald-50/80 ring-1 ring-emerald-400' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <img
                          src={cnd.photoUrl}
                          alt={cnd.name}
                          className="w-8 h-8 rounded-[4px] object-cover border border-slate-200"
                        />
                        <div>
                          <span className="font-bold text-slate-900">{cnd.name}</span>
                          {isRecentlyUpdated && (
                            <span className="ml-2 px-1.5 py-0.5 rounded-[3px] text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse inline-flex items-center gap-1">
                              <Zap className="w-2.5 h-2.5 text-emerald-700" />
                              <span>Live +1</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <span className="font-bold text-[#138601] text-sm">{cnd.percentage}%</span>
                        <span className="text-slate-500 text-xs ml-2">({cnd.votesCount || 0} {cnd.votesCount === 1 ? 'vote' : 'votes'})</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2.5 w-full bg-slate-100 rounded-[3px] overflow-hidden p-0.5 border border-slate-200">
                      <div
                        className={`h-full rounded-[2px] transition-all duration-700 ${
                          isRecentlyUpdated
                            ? 'bg-emerald-500'
                            : cnd.votesCount > 0
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
        )))}
      </div>

    </div>
  );
}
