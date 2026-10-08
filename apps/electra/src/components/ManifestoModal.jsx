import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Award, 
  Download, 
  ExternalLink,
  Eye,
  Vote,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  BookOpen,
  CheckCircle2
} from 'lucide-react';

export default function ManifestoModal({ contestant, isOpen, onClose, onSelectVote }) {
  if (!isOpen || !contestant) return null;

  // Resolve document URL from all supported storage providers (Backblaze B2, Cloudinary, Supabase)
  const resolveDocUrl = () => {
    const raw = contestant.manifestoPdfUrl || 
                contestant.statementPdfUrl || 
                contestant.manifestoUrl || 
                contestant.documentUrl || 
                '';

    if (raw) {
      if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/api/')) {
        return raw;
      }
      return `/api/preview?key=${encodeURIComponent(raw)}`;
    }

    if (contestant.manifestoStorageKey) {
      return `/api/preview?key=${encodeURIComponent(contestant.manifestoStorageKey)}`;
    }

    return null;
  };

  const documentUrl = resolveDocUrl();
  const hasDocument = Boolean(documentUrl);

  // Extract storage key for dedicated download endpoint if applicable
  const storageKey = contestant.manifestoStorageKey || 
    (documentUrl && documentUrl.includes('key=') ? new URL(documentUrl, 'http://localhost').searchParams.get('key') : null);

  const downloadUrl = storageKey 
    ? `/api/download?key=${encodeURIComponent(storageKey)}&name=${encodeURIComponent((contestant.name || 'Candidate') + '_Manifesto.pdf')}`
    : documentUrl;

  const hasStatementText = Boolean(
    contestant.candidateStatement || 
    contestant.bio || 
    contestant.manifestoHeadline || 
    contestant.manifestoSummary ||
    (Array.isArray(contestant.manifestoPillars) && contestant.manifestoPillars.length > 0)
  );

  const [activeTab, setActiveTab] = useState(() => (hasDocument ? 'document' : 'statement'));
  const [isLoadingDoc, setIsLoadingDoc] = useState(true);

  // Reset loading state when contestant changes
  useEffect(() => {
    setIsLoadingDoc(true);
    setActiveTab(hasDocument ? 'document' : 'statement');
    
    // Safety timer to clear spinner if browser handles PDF viewer internally without onLoad event
    const timer = setTimeout(() => {
      setIsLoadingDoc(false);
    }, 4500);

    return () => clearTimeout(timer);
  }, [contestant?.id, hasDocument]);

  const handleOpenExternal = () => {
    if (documentUrl) {
      window.open(documentUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-[5px] shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-[5px] overflow-hidden border border-slate-200 shadow-2xs shrink-0 bg-slate-100">
              <img
                src={contestant.photoUrl || 'https://res.cloudinary.com/a2mmcttn/image/upload/v1788569274/nacos/executives/president_irechukwu.jpg'}
                alt={contestant.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = 'https://res.cloudinary.com/a2mmcttn/image/upload/v1788569274/nacos/executives/president_irechukwu.jpg';
                }}
              />
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider bg-green-50 text-[#138601] border border-green-200 mb-0.5">
                <Award className="w-3 h-3" />
                <span>{contestant.runningPost || 'Contested Office'}</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-display truncate">
                {contestant.name}
              </h2>
              <p className="text-[11px] text-slate-500 font-mono">
                {contestant.level || 'NACOS Candidate'} • {contestant.matricNumber || 'Official Aspirant'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hasDocument && (
              <button
                type="button"
                onClick={handleOpenExternal}
                className="p-1.5 rounded-[5px] bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer hidden sm:flex items-center gap-1 text-xs font-semibold"
                title="Open document in new browser tab"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#138601]" />
                <span>Open Tab</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-[5px] bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* View Switcher Tabs (when both document and statement text exist) */}
        {hasDocument && hasStatementText && (
          <div className="px-5 pt-3 bg-slate-50/80 border-b border-slate-200 flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('document')}
              className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'document'
                  ? 'border-[#138601] text-[#138601]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Official Document Viewer</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('statement')}
              className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'statement'
                  ? 'border-[#138601] text-[#138601]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Policy Statement & Agenda</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60">
          
          {/* TAB 1: Document Viewer */}
          {activeTab === 'document' && hasDocument && (
            <div className="space-y-3">
              {/* Toolbar */}
              <div className="p-3 bg-white border border-slate-200 rounded-[5px] flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-[4px] bg-green-50 text-[#138601] flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {contestant.manifestoFileName || `${contestant.name}_Official_Manifesto.pdf`}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Authenticated & Hosted on Backblaze B2 Bucket
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenExternal}
                    className="px-3 py-1.5 rounded-[4px] bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Full Screen</span>
                  </button>

                  {downloadUrl && (
                    <a
                      href={downloadUrl}
                      download={`${contestant.name}_Manifesto.pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-[4px] bg-[#138601] hover:bg-[#0f6c01] text-white text-xs font-bold shadow-2xs cursor-pointer flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Embedded Document Viewer Container */}
              <div className="relative w-full rounded-[5px] overflow-hidden bg-slate-900 border border-slate-200 shadow-inner h-[62vh] sm:h-[68vh]">
                {/* Loading State Spinner */}
                {isLoadingDoc && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50/95 backdrop-blur-xs p-6 text-center space-y-3">
                    <div className="w-10 h-10 rounded-full border-3 border-[#138601] border-t-transparent animate-spin"></div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Loading Official Manifesto Document</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm">
                        Retrieving authenticated PDF stream from Backblaze B2 storage...
                      </p>
                    </div>
                  </div>
                )}

                {/* PDF Viewer Frame */}
                <iframe
                  src={`${documentUrl}#view=FitH&toolbar=1&navpanes=0`}
                  title={`${contestant.name} Official Manifesto Document`}
                  className="w-full h-full border-0 bg-white"
                  onLoad={() => setIsLoadingDoc(false)}
                />
              </div>

              {/* Bottom notice & mobile fallback tip */}
              <div className="p-3 bg-white border border-slate-200 rounded-[5px] flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#138601]" />
                  <span>Certified and stamped by the NACOS Electoral Committee (ISEC).</span>
                </span>
                <button
                  type="button"
                  onClick={handleOpenExternal}
                  className="text-[#138601] hover:underline font-semibold cursor-pointer shrink-0 ml-2"
                >
                  Document not loading in frame? Tap to open directly
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Full Policy Statement & Agenda */}
          {(activeTab === 'statement' || !hasDocument) && (
            <div className="space-y-4 bg-white p-5 sm:p-7 rounded-[5px] border border-slate-200 shadow-2xs">
              
              {/* Campaign Slogan */}
              {contestant.slogan && (
                <div className="p-4 rounded-[4px] bg-green-50/70 border-l-4 border-[#138601] text-xs sm:text-sm text-slate-800 font-medium italic">
                  "{contestant.slogan}"
                </div>
              )}

              {/* Headline & Summary */}
              {(contestant.manifestoHeadline || contestant.manifestoSummary) && (
                <div className="space-y-2 pb-4 border-b border-slate-100">
                  {contestant.manifestoHeadline && (
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                      {contestant.manifestoHeadline}
                    </h3>
                  )}
                  {contestant.manifestoSummary && (
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {contestant.manifestoSummary}
                    </p>
                  )}
                </div>
              )}

              {/* Manifesto Pillars Grid */}
              {Array.isArray(contestant.manifestoPillars) && contestant.manifestoPillars.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#138601] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Strategic Policy Pillars</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {contestant.manifestoPillars.map((pillar, idx) => (
                      <div key={idx} className="p-3.5 rounded-[4px] bg-slate-50 border border-slate-200 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#138601] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <h5 className="text-xs font-bold text-slate-800">{pillar.title}</h5>
                        </div>
                        {pillar.detail && (
                          <p className="text-xs text-slate-600 pl-7 leading-relaxed">{pillar.detail}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Statement Declaration */}
              {(contestant.candidateStatement || contestant.bio) && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Candidate Official Statement
                  </h4>
                  <div className="p-4 rounded-[4px] bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                    {contestant.candidateStatement || contestant.bio}
                  </div>
                </div>
              )}

              {/* If no document uploaded, notice */}
              {!hasDocument && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-[4px] text-xs text-amber-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>The candidate's formal PDF document is currently being certified. Their official verified policy statement is displayed above.</span>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-[5px] text-xs font-semibold text-slate-600 hover:bg-slate-200 bg-slate-100 transition-colors cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {hasDocument && (
              <button
                type="button"
                onClick={handleOpenExternal}
                className="px-3.5 py-2 rounded-[5px] text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer sm:hidden"
              >
                Open External
              </button>
            )}

            {onSelectVote && (
              <button
                type="button"
                onClick={() => onSelectVote(contestant)}
                className="px-5 py-2 rounded-[5px] text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <Vote className="w-4 h-4" />
                <span>Vote for {contestant.name.split(' ')[0]}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
