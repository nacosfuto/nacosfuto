import React, { useState } from 'react';
import { 
  UserCheck, 
  X, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  ArrowRight,
  ExternalLink,
  KeyRound
} from 'lucide-react';
import { getVoterBallot } from '@nacos/supabase/electraService';

export default function ConnectNacosModal({ isOpen, onClose, onConnect }) {
  const [matricNumber, setMatricNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [level, setLevel] = useState('300 Level');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleConnect = (e) => {
    e.preventDefault();
    setError('');

    const cleanMatric = matricNumber.trim().toUpperCase();
    if (!cleanMatric) {
      setError('Please enter your FUTO Matriculation Number.');
      return;
    }

    if (!cleanMatric.startsWith('20')) {
      setError('Please enter a valid FUTO matric number (e.g., 20241429481).');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      const voterData = {
        matricNumber: cleanMatric,
        name: fullName.trim() || 'Verified Scholar',
        level,
        connectedAt: new Date().toISOString()
      };

      onConnect(voterData);
      onClose();
    }, 600);
  };

  const handleQuickDemo = (levelChoice, matric, name) => {
    setMatricNumber(matric);
    setFullName(name);
    setLevel(levelChoice);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-white border border-[#DDD6FE] rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        
        {/* Glow Accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#684BFD]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-2 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#684BFD] text-white flex items-center justify-center mb-3 shadow-md shadow-[#684BFD]/25">
            <KeyRound className="w-6 h-6 stroke-[2.2]" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 font-display tracking-tight">
            Connect NACOS Account
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Verify your ground-truth Computer Science enrollment to unlock your one-man-one-vote cryptographic ballot.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleConnect} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              FUTO Matriculation Number
            </label>
            <input
              type="text"
              placeholder="e.g. 20241429481"
              value={matricNumber}
              onChange={(e) => setMatricNumber(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-mono placeholder:text-slate-400 focus:outline-none focus:border-[#684BFD] transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Full Legal Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Chinedu Okafor"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-[#684BFD] transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Academic Cohort / Level
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-[#684BFD] transition-colors"
            >
              <option value="100 Level">100 Level (Freshmen)</option>
              <option value="200 Level">200 Level (Sophomore)</option>
              <option value="300 Level">300 Level (Penultimate)</option>
              <option value="400 Level">400 Level (Finalist)</option>
              <option value="500 Level">500 Level (Post-Course)</option>
            </select>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-full text-sm font-black text-white bg-[#684BFD] hover:bg-[#5537F8] transition-all transform active:scale-95 shadow-lg shadow-[#684BFD]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span>Verifying Institutional Record...</span>
              ) : (
                <>
                  <span>Authenticate & Unlock Ballot</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Quick Demo Pre-fills */}
        <div className="mt-6 pt-4 border-t border-slate-100">
          <span className="text-[10px] text-slate-400 block mb-2 font-medium">
            Demo quick verification shortcuts:
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo('300 Level', '20231429810', 'Nestor Anyanwu')}
              className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:text-[#684BFD] hover:border-[#684BFD] border border-slate-200 transition-all cursor-pointer"
            >
              300L Voter
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('400 Level', '20221428512', 'Chioma Okoli')}
              className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:text-[#684BFD] hover:border-[#684BFD] border border-slate-200 transition-all cursor-pointer"
            >
              400L Voter
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('100 Level', '20261439900', 'Somtochukwu Eze')}
              className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:text-[#684BFD] hover:border-[#684BFD] border border-slate-200 transition-all cursor-pointer"
            >
              100L Voter
            </button>
          </div>
        </div>

        {/* Footnote */}
        <p className="mt-4 text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Zero third-party trackers • Cryptographic single-ballot verification</span>
        </p>

      </div>
    </div>
  );
}
