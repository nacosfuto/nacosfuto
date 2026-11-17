import React from 'react';
import { X, Users, AlertCircle } from 'lucide-react';
import { markNoticeDismissed } from '@nacos/supabase';

/**
 * NoticeModal Component
 * Institutional pop-up modal for urgent departmental & university announcements.
 * Styled precisely to institutional academic portal standard.
 */
export default function NoticeModal({ notice, isOpen, onClose }) {
  if (!isOpen || !notice) return null;

  const handleClose = () => {
    if (notice?.id) {
      markNoticeDismissed(notice.id);
    }
    if (onClose) {
      onClose();
    }
  };

  // Split content into clean paragraphs
  const paragraphs = String(notice.content || '')
    .split(/\n\s*\n|\n/)
    .map(p => p.trim())
    .filter(Boolean);

  const audienceText = (notice.target_audience || 'ALL STUDENTS').toUpperCase();

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notice-modal-title"
    >
      {/* Modal Container */}
      <div 
        className="bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header Bar */}
        <div className="border-b border-gray-200 dark:border-[#138601]/25 px-6 py-4 flex items-center justify-between bg-white dark:bg-[#062402]">
          <h2 id="notice-modal-title" className="text-base font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            {notice.is_urgent ? (
              <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400 font-extrabold">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                Urgent Notice
              </span>
            ) : (
              <span>{notice.category ? `${notice.category} Notice` : 'Official Notice'}</span>
            )}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#041801] transition-colors cursor-pointer"
            aria-label="Close Notice"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Target Audience & Urgent Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-bold tracking-wider uppercase bg-[#ede9fe] text-[#6d28d9] dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40">
              <Users className="w-3.5 h-3.5" />
              <span>{audienceText}</span>
            </span>

            {notice.is_urgent && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-extrabold uppercase bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-300/60">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Urgent Attention Required</span>
              </span>
            )}
          </div>

          {/* Notice Title & Published Date */}
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-gray-100 dark:border-[#138601]/15 pb-4">
            <h3 className="text-base sm:text-lg font-extrabold text-[#111827] dark:text-white tracking-wide uppercase leading-snug">
              {notice.title}
            </h3>
            {notice.published_date && (
              <span className="text-xs text-gray-400 dark:text-gray-400 font-medium shrink-0">
                {notice.published_date}
              </span>
            )}
          </div>

          {/* Structured Notice Paragraphs */}
          <div className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed space-y-4 font-normal">
            {paragraphs.length > 0 ? (
              paragraphs.map((para, idx) => (
                <p key={idx}>{para}</p>
              ))
            ) : (
              <p>{notice.content}</p>
            )}
          </div>

          {/* Author Unit Sign-off */}
          <div className="pt-2">
            <p className="text-sm font-bold text-[#111827] dark:text-white">
              {notice.author_unit || 'NACOS Directorate'}
            </p>
          </div>
        </div>

        {/* Footer Action */}
        <div className="border-t border-gray-100 dark:border-[#138601]/20 px-6 py-3.5 bg-gray-50/70 dark:bg-[#041801]/60 flex items-center justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-semibold rounded bg-[#138601] hover:bg-[#0f6c01] text-white transition-colors cursor-pointer shadow-xs"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
}
