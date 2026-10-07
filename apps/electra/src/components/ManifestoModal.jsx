import React from 'react';
import { 
  X, 
  FileText, 
  Award, 
  Target, 
  CheckCircle2, 
  Vote, 
  Share2, 
  User, 
  GraduationCap,
  Sparkles,
  Download
} from 'lucide-react';

export default function ManifestoModal({ contestant, isOpen, onClose, onSelectVote }) {
  if (!isOpen || !contestant) return null;

  const manifesto = contestant.manifesto || {
    headline: `${contestant.name}'s Campaign Manifesto`,
    summary: contestant.bio || 'Building a more inclusive, high-tech, and accountable computing students association.',
    pillars: [
      {
        title: 'Academic Excellence & Practical Tech Pipelines',
        detail: 'Connecting classroom theory to high-value software internships and global developer certifications.'
      },
      {
        title: 'Equitable Student Welfare & Infrastructure',
        detail: 'Advocating for student needs, lab computer maintenance, and uninterrupted study environments.'
      }
    ],
    personalNote: 'Together, let us build a legacy of excellence for NACOS FUTO.'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 dark:bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-[#121316] border border-gray-200 dark:border-[#232529] rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col transition-colors duration-200">
        
        {/* Glow Accent */}
        <div className="absolute top-0 right-1/4 w-96 h-32 bg-[#c6ff00]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Sticky Header */}
        <div className="relative p-6 sm:p-8 bg-gray-50 dark:bg-[#161719] border-b border-gray-200 dark:border-[#232529] flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4 sm:gap-5 min-w-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-[#c6ff00] shrink-0 bg-gray-100 dark:bg-[#22252a]">
              <img
                src={contestant.photoUrl || 'https://res.cloudinary.com/a2mmcttn/image/upload/v1788569274/nacos/executives/president_irechukwu.jpg'}
                alt={contestant.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#c6ff00] text-black mb-1.5 shadow-sm">
                <Award className="w-3.5 h-3.5" />
                <span>Aspiring {contestant.runningPost}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-950 dark:text-white font-display truncate">
                {contestant.name}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-0.5">
                <span>{contestant.level}</span>
                <span>•</span>
                <span className="font-mono text-emerald-600 dark:text-[#c6ff00] font-bold">{contestant.matricNumber}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-[#202227] text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 sm:p-8 space-y-8 overflow-y-auto custom-scroll">
          
          {/* Campaign Slogan & Headline */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gray-100 dark:bg-gradient-to-r dark:from-[#1c1e24] dark:to-[#16171a] border border-gray-200 dark:border-[#2a2d36] space-y-2">
            <div className="text-[11px] font-black uppercase tracking-widest text-emerald-600 dark:text-[#c6ff00] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Official Campaign Vision</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-gray-950 dark:text-white font-display leading-snug">
              "{manifesto.headline}"
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed pt-1">
              {manifesto.summary}
            </p>
          </div>

          {/* Core Policy Pillars */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-600 dark:text-[#c6ff00]" />
              <span>Key Pillars & Policy Roadmap</span>
            </h4>

            <div className="grid grid-cols-1 gap-3.5">
              {manifesto.pillars?.map((pillar, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-gray-50 dark:bg-[#16171a] border border-gray-200 dark:border-[#23252a] hover:border-[#c6ff00] dark:hover:border-[#c6ff00]/50 transition-colors space-y-2 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-[#c6ff00]/25 dark:bg-[#c6ff00]/15 text-gray-900 dark:text-[#c6ff00] font-black text-xs flex items-center justify-center shrink-0">
                      0{idx + 1}
                    </span>
                    <h5 className="text-sm font-bold text-gray-900 dark:text-white">
                      {pillar.title}
                    </h5>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed pl-9">
                    {pillar.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Personal Message */}
          {manifesto.personalNote && (
            <div className="p-5 rounded-2xl bg-gray-50 dark:bg-[#141518] border-l-4 border-l-[#c6ff00] border-y border-r border-gray-200 dark:border-[#22252a] space-y-1.5">
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                Candidate's Personal Pledge
              </span>
              <p className="text-xs text-gray-700 dark:text-gray-300 italic leading-relaxed">
                "{manifesto.personalNote}"
              </p>
            </div>
          )}

          {/* Attached PDF / File */}
          {contestant.manifestoPdfUrl && (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-[#16171a] border border-gray-200 dark:border-[#232529]">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-[#c6ff00]" />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Full Certified Manifesto Document (.PDF)
                </span>
              </div>
              <a
                href={contestant.manifestoPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-200 dark:bg-[#22252a] text-xs font-bold text-gray-900 dark:text-white hover:text-black dark:hover:text-[#c6ff00]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </a>
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="p-5 sm:p-6 bg-gray-50 dark:bg-[#161719] border-t border-gray-200 dark:border-[#232529] flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Certified by Electoral Commission (DEC 2026)
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 sm:w-auto px-5 py-2.5 rounded-full text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-200 hover:bg-gray-300 dark:bg-[#22252a] dark:hover:bg-[#2b2e34] transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onSelectVote?.(contestant);
                onClose();
              }}
              className="w-1/2 sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs font-black text-black bg-[#c6ff00] hover:bg-[#b2e600] transition-all transform active:scale-95 cursor-pointer shadow-lg shadow-[#c6ff00]/20"
            >
              <Vote className="w-4 h-4 stroke-[2.5]" />
              <span>Vote {contestant.name.split(' ')[0]}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
