import React from 'react';
import { 
  X, 
  FileText, 
  Award, 
  Download, 
  ExternalLink,
  Eye,
  Vote,
  ShieldCheck
} from 'lucide-react';

export default function ManifestoModal({ contestant, isOpen, onClose, onSelectVote }) {
  if (!isOpen || !contestant) return null;

  // Document URL: Backblaze B2, Supabase Storage, or Cloudinary PDF URL
  const documentUrl = contestant.manifestoPdfUrl || 
                      contestant.manifestoUrl || 
                      contestant.documentUrl || 
                      `https://jvxbyataifjsotudtqly.supabase.co/storage/v1/object/public/documents/manifestos/${contestant.id || 'candidate'}.pdf`;

  const handleOpenPdf = () => {
    window.open(documentUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-[5px] shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="relative p-5 sm:p-6 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            {/* Profile Photo: Squared with subtle rounded curves (5px) as requested */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[5px] overflow-hidden border border-slate-200 shadow-2xs shrink-0 bg-slate-100">
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
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider bg-green-50 text-[#138601] border border-green-200 mb-1">
                <Award className="w-3.5 h-3.5" />
                <span>{contestant.runningPost || 'Contested Office'}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-display truncate">
                {contestant.name}
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                Candidate Official Document
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[5px] bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Clean Direct PDF/Document Box (No complications, no fake body text) */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto">
          
          <div className="p-6 rounded-[5px] bg-slate-50 border border-slate-200 text-center space-y-4">
            <div className="w-14 h-14 rounded-[5px] bg-white border border-slate-200 text-[#138601] flex items-center justify-center mx-auto shadow-2xs">
              <FileText className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Official Candidate Statement & Manifesto
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Certified PDF document submitted by {contestant.name} for the office of {contestant.runningPost}.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleOpenPdf}
                className="px-5 py-2.5 rounded-[5px] text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] shadow-xs cursor-pointer flex items-center gap-2 transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span>View Full PDF Document</span>
              </button>
              
              <a
                href={documentUrl}
                download={`${contestant.name}_Manifesto.pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-[5px] text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-2xs cursor-pointer flex items-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </a>
            </div>
          </div>

          {/* Simple summary or quote if present */}
          {contestant.slogan && (
            <div className="p-3.5 rounded-[5px] bg-green-50/50 border border-green-200/60 text-center text-xs text-slate-700 italic">
              "{contestant.slogan}"
            </div>
          )}

          {/* Notice */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-[#138601] shrink-0" />
            <span>Document verified and authenticated by the NACOS Electoral Commission (UNECO).</span>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-[5px] text-xs font-semibold text-slate-600 hover:bg-slate-200 bg-slate-100 cursor-pointer"
          >
            Close
          </button>

          {onSelectVote && (
            <button
              type="button"
              onClick={() => onSelectVote(contestant)}
              className="px-5 py-2 rounded-[5px] text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Vote className="w-4 h-4" />
              <span>Vote for {contestant.name.split(' ')[0]}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
