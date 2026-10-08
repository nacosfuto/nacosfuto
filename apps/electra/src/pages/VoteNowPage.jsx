import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Vote, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle, 
  Lock, 
  ArrowRight, 
  KeyRound, 
  ExternalLink,
  ChevronRight,
  UserCheck,
  FileText,
  RotateCcw
} from 'lucide-react';
import { 
  getActiveElection, 
  getElectraPosts, 
  getContestants,
  fetchLiveElectraData,
  apiGetVotingSessionStatus,
  apiSubmitElectoralBallot
} from '@nacos/supabase/electraService';

export default function VoteNowPage({ 
  voter, 
  votingSessionToken, 
  onConnectVoter, 
  onOpenAccreditation 
}) {
  const navigate = useNavigate();
  const [election, setElection] = useState(() => getActiveElection());
  const [posts, setPosts] = useState(() => getElectraPosts());
  const [allContestants, setAllContestants] = useState(() => getContestants());
  const [isLoading, setIsLoading] = useState(true);

  // Ballot selections: { [postId]: contestantId }
  const [selections, setSelections] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voteError, setVoteError] = useState('');
  const [votedPositions, setVotedPositions] = useState([]);
  const [submittedReceipt, setSubmittedReceipt] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(false);

  // Sync live election data on mount
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetchLiveElectraData().then(data => {
      if (!isMounted) return;
      setElection(data.election);
      setPosts(data.posts || []);
      setAllContestants(data.contestants || []);
      setIsLoading(false);
    }).catch(err => {
      console.warn('[VoteNowPage] Live sync warning:', err);
      if (isMounted) setIsLoading(false);
    });

    const handleUpdate = () => {
      setElection(getActiveElection());
      setPosts(getElectraPosts());
      setAllContestants(getContestants());
    };

    window.addEventListener('nacos_electra_election_updated', handleUpdate);
    window.addEventListener('nacos_electra_posts_updated', handleUpdate);
    window.addEventListener('nacos_electra_contestants_updated', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('nacos_electra_election_updated', handleUpdate);
      window.removeEventListener('nacos_electra_posts_updated', handleUpdate);
      window.removeEventListener('nacos_electra_contestants_updated', handleUpdate);
    };
  }, []);

  // Check voting session status on mount or token change
  useEffect(() => {
    if (votingSessionToken) {
      setSessionLoading(true);
      apiGetVotingSessionStatus(votingSessionToken)
        .then(res => {
          setSessionLoading(false);
          if (res.authenticated) {
            setVotedPositions(res.votedPositions || []);
            if (res.voter && onConnectVoter) {
              onConnectVoter(res.voter, votingSessionToken);
            }
          }
        })
        .catch(() => setSessionLoading(false));
    }
  }, [votingSessionToken]);

  // Radio button behavior: select exactly one candidate per office
  const handleSelect = (postId, contestantId) => {
    if (votedPositions.includes(postId)) return; // Locked if already voted
    setVoteError('');
    setSelections(prev => ({
      ...prev,
      [postId]: contestantId
    }));
  };

  // Abstain / clear choice for a specific office
  const handleClearPost = (postId) => {
    if (votedPositions.includes(postId)) return;
    setSelections(prev => {
      const next = { ...prev };
      delete next[postId];
      return next;
    });
  };

  // Submit the ballot atomically
  const handleSubmitBallot = async (e) => {
    e.preventDefault();
    setVoteError('');

    if (!votingSessionToken) {
      setVoteError('Voter accreditation is required before submitting your ballot.');
      if (onOpenAccreditation) onOpenAccreditation();
      return;
    }

    const selectedKeys = Object.keys(selections);
    if (selectedKeys.length === 0) {
      setVoteError('Please select at least one candidate before submitting your ballot.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await apiSubmitElectoralBallot({
        votingSessionToken,
        selections
      });

      setIsSubmitting(false);

      if (!res.success) {
        setVoteError(res.error || 'Failed to record your vote. Please try again.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // Vote successfully recorded!
      setSubmittedReceipt(res.receipt);
      setVotedPositions(prev => [...new Set([...prev, ...selectedKeys])]);
      setSelections({});
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setIsSubmitting(false);
      setVoteError('A network error occurred while submitting your ballot. Please try again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const selectedCount = Object.keys(selections).length;
  const totalPositions = posts.length;
  const hasVotedAll = totalPositions > 0 && votedPositions.length >= totalPositions;

  return (
    <div className="w-full bg-[#F8FAFC] min-h-screen text-slate-900 pb-20">
      
      <div className="site-container max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10 space-y-8">
        
        {/* ── Page Header (Clean, authoritative) ── */}
        <div className="space-y-2 border-b border-slate-200 pb-6">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[3px] bg-green-50 text-[#138601] border border-green-200 text-xs font-bold uppercase tracking-wider">
            <Vote className="w-3.5 h-3.5 text-[#138601]" />
            <span>Certified Electoral Ballot</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 font-display tracking-tight">
            Official Ballot: Vote Now
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
            {election?.title || 'NACOS FUTO General Elections'}. Review each contested executive office below, select your preferred candidates using the radio buttons, and submit your official ballot at the bottom of the page.
          </p>
        </div>

        {/* ── VOTER ACCREDITATION STATUS BAR ── */}
        {votingSessionToken && voter ? (
          <div className="bg-white border border-green-300 rounded-[4px] p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[4px] bg-green-50 border border-green-200 text-[#138601] flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">{voter.name || 'Accredited Voter'}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-green-100 text-[#138601] px-2 py-0.5 rounded-[2px]">
                    Accredited
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-mono mt-0.5">
                  Reg No: <strong className="text-slate-700">{voter.registrationNumber || voter.matricNumber}</strong> • {voter.level || 'Computer Science'}
                </div>
              </div>
            </div>

            <div className="text-right text-xs text-slate-500 font-medium">
              <span>{votedPositions.length} of {totalPositions} offices voted</span>
            </div>
          </div>
        ) : (
          /* ── UNACCREDITED CALLOUT BANNER ── */
          <div className="bg-white border-2 border-[#138601] rounded-[4px] p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-[4px] bg-green-50 text-[#138601] border border-green-200 flex items-center justify-center shrink-0">
                <KeyRound className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-display">
                  Accreditation Required to Cast Ballot
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  To ensure democratic integrity, all electors must verify their student identity (Registration Number, First Name, Last Name) and receive a one-time passcode before voting. No student portal password is required.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onOpenAccreditation}
                className="px-6 py-3 rounded-[4px] text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <span>Accredit / Vote Now</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
              <Link
                to="/guidelines"
                className="px-4 py-3 rounded-[4px] text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors inline-flex items-center gap-1.5"
              >
                <span>Voting Guidelines</span>
              </Link>
            </div>
          </div>
        )}

        {/* ── SUCCESSFUL VOTE RECEIPT MODAL / BANNER ── */}
        {submittedReceipt && (
          <div className="bg-white border-2 border-[#138601] rounded-[4px] p-6 sm:p-8 shadow-sm space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 text-[#138601]">
              <div className="w-10 h-10 rounded-[3px] bg-green-50 border border-green-200 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-6 h-6 text-[#138601]" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  Your Vote Has Been Successfully Submitted
                </h2>
                <p className="text-xs text-slate-500">
                  Your ballot has been cryptographically signed and atomically recorded in the electoral ledger.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-[3px] p-4 sm:p-5 space-y-2.5 text-xs">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-slate-500 font-semibold">Cryptographic Receipt Hash:</span>
                <span className="font-mono font-bold text-[#138601] break-all">{submittedReceipt.receiptHash}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-slate-500 font-semibold">Voter Registration:</span>
                <span className="font-mono font-bold text-slate-900">{submittedReceipt.voterRegistration}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-slate-500 font-semibold">Ballot Timestamp:</span>
                <span className="text-slate-700">{new Date(submittedReceipt.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-slate-500 font-semibold">Recorded Offices Count:</span>
                <span className="font-bold text-slate-900">{submittedReceipt.recordedVotesCount}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                to="/results"
                className="px-5 py-2.5 rounded-[4px] text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] transition-colors shadow-xs inline-flex items-center gap-2"
              >
                <span>View Live Poll Results</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                to="/"
                className="px-5 py-2.5 rounded-[4px] text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors inline-flex items-center gap-2"
              >
                <span>Return to Election Home</span>
              </Link>
            </div>
          </div>
        )}

        {/* ── ERROR NOTIFICATION ── */}
        {voteError && (
          <div className="bg-red-50 border border-red-300 rounded-[4px] p-4 text-xs text-red-700 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-snug">{voteError}</span>
          </div>
        )}

        {/* ── CONTESTED OFFICES BALLOT ── */}
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-3 border-[#138601] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs text-slate-500 font-medium">Loading official ballot from election ledger...</p>
          </div>
        ) : !election ? (
          <div className="bg-white border rounded-[4px] p-8 text-center shadow-xs space-y-3">
            <Lock className="w-10 h-10 text-slate-400 mx-auto" />
            <h2 className="text-lg font-bold text-slate-900">Electoral Ballot Box Closed</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              There is currently no active election session open for balloting. Balloting will be enabled once an election is activated by the Electoral Commission.
            </p>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white border rounded-[4px] p-8 text-center shadow-xs space-y-3">
            <Vote className="w-10 h-10 text-slate-400 mx-auto" />
            <h2 className="text-lg font-bold text-slate-900">No Offices Opened for Balloting</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              The Electoral Commission has not configured any contested offices or positions for {election.title} yet.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmitBallot} className="space-y-8">
          {posts.map((post, postIndex) => {
            const postCandidates = allContestants.filter(c => c.postId === post.id);
            const isOfficeVoted = votedPositions.includes(post.id);
            const selectedCandidateId = selections[post.id];

            return (
              <div 
                key={post.id}
                className={`bg-white border rounded-[4px] shadow-xs overflow-hidden transition-all ${
                  isOfficeVoted 
                    ? 'border-slate-200 bg-slate-50/50 opacity-90' 
                    : selectedCandidateId 
                      ? 'border-[#138601]/60 ring-1 ring-[#138601]/30' 
                      : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Office Header Strip */}
                <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/70">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-slate-500">
                        #{post.order || postIndex + 1}
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                        {post.title}
                      </h3>
                      <span className="text-[10px] font-mono font-bold text-[#138601] bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-[2px]">
                        {post.code}
                      </span>
                    </div>
                    {post.description && (
                      <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                        {post.description}
                      </p>
                    )}
                  </div>

                  {/* Office Status Badge */}
                  <div>
                    {isOfficeVoted ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] bg-slate-200 text-slate-700 text-xs font-bold">
                        <Lock className="w-3 h-3" />
                        <span>Vote Recorded</span>
                      </div>
                    ) : selectedCandidateId ? (
                      <div className="inline-flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#138601]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Candidate Selected</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleClearPost(post.id)}
                          className="text-[11px] text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-semibold">
                        Select 1 candidate
                      </span>
                    )}
                  </div>
                </div>

                {/* Candidate Selection Cards */}
                <div className="p-5 sm:p-6">
                  {postCandidates.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 italic">
                      No certified contestants configured for this office.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {postCandidates.map((candidate) => {
                        const isChosen = selectedCandidateId === candidate.id;

                        return (
                          <div
                            key={candidate.id}
                            onClick={() => {
                              if (!isOfficeVoted) {
                                if (!votingSessionToken && onOpenAccreditation) {
                                  onOpenAccreditation();
                                } else {
                                  handleSelect(post.id, candidate.id);
                                }
                              }
                            }}
                            className={`relative border rounded-[4px] p-4 transition-all flex items-start gap-3.5 ${
                              isOfficeVoted 
                                ? 'cursor-not-allowed opacity-60 bg-slate-50' 
                                : 'cursor-pointer hover:border-[#138601]/50 hover:bg-green-50/20'
                            } ${
                              isChosen 
                                ? 'border-[#138601] bg-green-50/40 shadow-xs' 
                                : 'border-slate-200'
                            }`}
                          >
                            {/* Candidate Radio Button */}
                            <div className="pt-0.5 shrink-0">
                              <input
                                type="radio"
                                name={`post-${post.id}`}
                                value={candidate.id}
                                checked={isChosen}
                                disabled={isOfficeVoted}
                                onChange={() => handleSelect(post.id, candidate.id)}
                                className="w-4 h-4 text-[#138601] border-slate-300 focus:ring-[#138601] cursor-pointer"
                              />
                            </div>

                            {/* Candidate Avatar */}
                            <div className="w-12 h-12 rounded-[4px] overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                              <img
                                src={candidate.photoUrl || candidate.imageUrl || '/default-avatar.png'}
                                alt={candidate.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.src = 'https://res.cloudinary.com/a2mmcttn/image/upload/v1788569274/nacos/executives/president_irechukwu.jpg';
                                }}
                              />
                            </div>

                            {/* Candidate Details */}
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center justify-between gap-1">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                  {candidate.name}
                                </h4>
                                {candidate.level && (
                                  <span className="text-[10px] text-slate-500 font-mono shrink-0">
                                    {candidate.level}
                                  </span>
                                )}
                              </div>

                              {candidate.slogan && (
                                <p className="text-[11px] text-slate-600 italic line-clamp-1">
                                  "{candidate.slogan}"
                                </p>
                              )}

                              {candidate.manifesto?.headline && (
                                <p className="text-[11px] text-slate-500 line-clamp-1 font-medium">
                                  {candidate.manifesto.headline}
                                </p>
                              )}

                              <div className="pt-1 flex items-center justify-between">
                                <Link
                                  to="/manifestos"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[10px] font-semibold text-[#138601] hover:underline flex items-center gap-0.5"
                                >
                                  <span>View Manifesto</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </Link>

                                {isChosen && (
                                  <span className="text-[10px] font-bold text-[#138601] bg-green-100 px-1.5 py-0.5 rounded-[2px]">
                                    Selected
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* ── STICKY / BOTTOM BALLOT SUBMISSION DOCK ── */}
          <div className="sticky bottom-4 z-40 bg-white/95 backdrop-blur-md border border-slate-200 rounded-[5px] p-4 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Ballot Selections Summary
              </div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                <span className="text-[#138601]">{selectedCount}</span> of {totalPositions} contested offices selected
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!votingSessionToken ? (
                <button
                  type="button"
                  onClick={onOpenAccreditation}
                  className="w-full sm:w-auto px-6 py-3 rounded-[4px] text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] transition-all shadow-xs inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 stroke-[2.2]" />
                  <span>Accredit to Cast Ballot</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting || selectedCount === 0}
                  className="w-full sm:w-auto px-7 py-3 rounded-[4px] text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] transition-all shadow-xs inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span>Sealing & Recording Ballot...</span>
                  ) : (
                    <>
                      <span>Submit Official Ballot</span>
                      <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
        )}

      </div>
    </div>
  );
}
