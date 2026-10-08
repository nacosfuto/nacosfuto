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

export default function ConnectNacosModal({ isOpen, onClose, onConnect }) {
  const [matricNumber, setMatricNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [level, setLevel] = useState('300 Level');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-[5px] p-6 sm:p-8 shadow-2xl overflow-hidden">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-[5px] bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="space-y-1.5 mb-6">
          <div className="w-10 h-10 rounded-[5px] bg-green-50 text-[#138601] flex items-center justify-center mb-3 border border-green-200">
            <KeyRound className="w-5 h-5 stroke-[2.2]" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 font-display tracking-tight">
            Voter Accreditation & Sign In
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Verify your official student registration to unlock your secure, single-ballot voting session.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-[5px] bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
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
              className="w-full px-3.5 py-2.5 rounded-[5px] bg-slate-50 border border-slate-300 text-slate-900 text-xs font-mono placeholder:text-slate-400 focus:outline-none focus:border-[#138601] transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Full Student Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Chinedu Okafor"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-[5px] bg-slate-50 border border-slate-300 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#138601] transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Academic Cohort / Level
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-[5px] bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-[#138601] transition-colors"
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
              className="w-full py-2.5 rounded-[5px] text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] transition-all active:scale-[0.99] shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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

        {/* Demo Shortcuts */}
        <div className="mt-5 pt-3 border-t border-slate-100">
          <span className="text-[10px] text-slate-400 block mb-1.5 font-medium">
            Demo accreditation shortcuts:
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickDemo('300 Level', '20231429810', 'Nestor Anyanwu')}
              className="text-[10px] px-2 py-0.5 rounded-[3px] bg-slate-100 text-slate-700 hover:text-[#138601] hover:border-[#138601] border border-slate-200 transition-all cursor-pointer"
            >
              300L Voter
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('400 Level', '20221428512', 'Chioma Okoli')}
              className="text-[10px] px-2 py-0.5 rounded-[3px] bg-slate-100 text-slate-700 hover:text-[#138601] hover:border-[#138601] border border-slate-200 transition-all cursor-pointer"
            >
              400L Voter
            </button>
          </div>
        </div>

        {/* Footnote */}
        <p className="mt-4 text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#138601]" />
          <span>Cryptographic single-ballot verification</span>
        </p>

      </div>
    </div>
  );
}
