import React, { useState } from 'react';
import { 
  X, 
  Vote, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle, 
  Hash, 
  Lock, 
  ArrowRight,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { castBallot, getElectraPosts, getContestants } from '@nacos/supabase/electraService';

export default function BallotVotingModal({ 
  isOpen, 
  onClose, 
  voter, 
  onRequireConnect, 
  targetCandidate = null,
  onVoteCastSuccess 
}) {
  const [selectedOffice, setSelectedOffice] = useState('post-president');
  const [selectedCandidates, setSelectedCandidates] = useState(
    targetCandidate ? { [targetCandidate.postId]: targetCandidate.id } : {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [castSuccessReceipt, setCastSuccessReceipt] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const posts = getElectraPosts();
  const allContestants = getContestants();

  const handleSelectCandidate = (postId, candidateId) => {
    setSelectedCandidates(prev => ({
      ...prev,
      [postId]: candidateId
    }));
    setErrorMessage('');
  };

  const handleSubmitBallot = async () => {
    if (!voter) {
      onRequireConnect();
      return;
    }

    const votesArray = Object.entries(selectedCandidates).map(([postId, contestantId]) => ({
      postId,
      contestantId
    }));

    if (votesArray.length === 0) {
      setErrorMessage('Please select at least one candidate on your ballot.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await castBallot(
        voter.matricNumber,
        votesArray,
        voter.level || '300 Level'
      );

      if (res.error) {
        setErrorMessage(res.error.message || 'Failed to submit ballot.');
        setIsSubmitting(false);
        return;
      }

      setCastSuccessReceipt(res.receipt);
      if (onVoteCastSuccess) onVoteCastSuccess(res.receipt);
    } catch (err) {
      setErrorMessage(err.message || 'Ballot casting failed. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-[5px] shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Modal Sticky Header */}
        <div className="relative p-5 sm:p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[5px] bg-[#138601] text-white flex items-center justify-center font-bold shadow-xs">
              <Vote className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-display">
                Official Electoral Ballot
              </h2>
              <p className="text-xs text-slate-500">
                {voter ? `Voter: ${voter.matricNumber} • ${voter.level}` : 'Student Identity Verification Required'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[5px] bg-slate-200 hover:bg-slate-300 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* Success State */}
          {castSuccessReceipt ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-full bg-green-50 text-[#138601] border-2 border-[#138601] flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900 font-display">
                  Ballot Cryptographically Sealed!
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Your votes have been permanently stamped onto the NACOS FUTO immutable electoral ledger.
                </p>
              </div>

              {/* Receipt Box */}
              <div className="p-4 rounded-[5px] bg-slate-50 border border-slate-200 max-w-lg mx-auto text-left space-y-2.5 font-mono text-xs">
                <div className="flex justify-between items-center text-slate-600 pb-2 border-b border-slate-200">
                  <span>Ballot Reference</span>
                  <span className="text-slate-900 font-bold">{castSuccessReceipt.ballotId}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 pb-2 border-b border-slate-200">
                  <span>Voter Matric</span>
                  <span className="text-[#138601] font-bold">{castSuccessReceipt.voterMatric}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 pb-2 border-b border-slate-200">
                  <span>Audit Timestamp</span>
                  <span className="text-slate-900">{new Date(castSuccessReceipt.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest block">Cryptographic Hash</span>
                  <div className="p-2 rounded-[4px] bg-white border border-slate-200 text-[11px] text-[#138601] break-all select-all font-mono">
                    {castSuccessReceipt.ballotHash}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-[5px] text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] cursor-pointer shadow-xs"
                >
                  Return to Election Hub
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Not Connected Banner */}
              {!voter && (
                <div className="p-3.5 rounded-[5px] bg-amber-50 border border-amber-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-amber-800 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>You must connect your accredited NACOS account to cast your ballot.</span>
                  </div>
                  <button
                    type="button"
                    onClick={onRequireConnect}
                    className="px-3 py-1 rounded-[4px] bg-[#138601] hover:bg-[#0f6c01] text-white font-bold text-[11px] shrink-0 shadow-xs cursor-pointer"
                  >
                    Accredit Now
                  </button>
                </div>
              )}

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 rounded-[5px] bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Office Selector Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {posts.map((post) => {
                  const hasSelection = !!selectedCandidates[post.id];
                  const isCurrent = selectedOffice === post.id;
                  return (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => setSelectedOffice(post.id)}
                      className={`px-3 py-1.5 rounded-[5px] text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                        isCurrent
                          ? 'bg-[#138601] text-white shadow-xs'
                          : hasSelection
                          ? 'bg-green-50 text-[#138601] border border-green-200'
                          : 'bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200'
                      }`}
                    >
                      <span>{post.title}</span>
                      {hasSelection && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>

              {/* Candidates for Current Selected Office */}
              {(() => {
                const currentPost = posts.find(p => p.id === selectedOffice) || posts[0];
                const contestants = allContestants.filter(c => c.postId === currentPost?.id);

                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        {currentPost?.title} Candidates ({contestants.length})
                      </span>
                      <span className="text-[11px] text-[#138601] font-mono font-bold">
                        Max 1 Choice
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {contestants.map((cnd) => {
                        const isChosen = selectedCandidates[currentPost.id] === cnd.id;
                        return (
                          <div
                            key={cnd.id}
                            onClick={() => handleSelectCandidate(currentPost.id, cnd.id)}
                            className={`p-3.5 rounded-[5px] border transition-all cursor-pointer flex items-center gap-3 ${
                              isChosen
                                ? 'border-[#138601] shadow-xs bg-green-50/60 ring-1 ring-[#138601]'
                                : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="w-12 h-12 rounded-[4px] overflow-hidden bg-slate-200 shrink-0 relative">
                              <img
                                src={cnd.photoUrl}
                                alt={cnd.name}
                                className="w-full h-full object-cover"
                              />
                              {isChosen && (
                                <div className="absolute inset-0 bg-[#138601]/40 flex items-center justify-center">
                                  <CheckCircle2 className="w-5 h-5 text-white" />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-slate-900 truncate">{cnd.name}</div>
                              <div className="text-[10px] text-slate-500 truncate">{cnd.slogan}</div>
                              <div className="text-[10px] text-[#138601] font-mono mt-0.5">{cnd.level}</div>
                            </div>

                            <div className="shrink-0">
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                isChosen ? 'border-[#138601] bg-[#138601]' : 'border-slate-300'
                              }`}>
                                {isChosen && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Chosen Summary */}
              <div className="p-3.5 rounded-[5px] bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Ballot Summary: {Object.keys(selectedCandidates).length} of {posts.length} Contests Filled
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(selectedCandidates).map(([pId, cId]) => {
                    const post = posts.find(p => p.id === pId);
                    const cnd = allContestants.find(c => c.id === cId);
                    return (
                      <span key={pId} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-white border border-slate-200 text-[11px] text-slate-900 shadow-2xs">
                        <span className="text-slate-500">{post?.code}:</span>
                        <span className="font-bold text-[#138601]">{cnd?.name?.split(' ')[0]}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Security Footnote */}
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <ShieldCheck className="w-4 h-4 text-[#138601] shrink-0" />
                <span>One-time cryptographic signature. You cannot recast your ballot once sealed.</span>
              </div>
            </>
          )}

        </div>

        {/* Modal Sticky Footer */}
        {!castSuccessReceipt && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-[5px] text-xs font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isSubmitting || Object.keys(selectedCandidates).length === 0}
              onClick={handleSubmitBallot}
              className="inline-flex items-center gap-2 px-6 py-2 rounded-[5px] text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] transition-all cursor-pointer shadow-xs disabled:opacity-40"
            >
              {isSubmitting ? (
                <span>Sealing Ballot on Ledger...</span>
              ) : (
                <>
                  <Vote className="w-4 h-4 stroke-[2.2]" />
                  <span>Cast Certified Ballot</span>
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
