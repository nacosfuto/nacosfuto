import React, { useEffect } from 'react';
import { getCloudinaryAssetUrl } from '@nacos/media';
import { FaTimes, FaCalendarAlt, FaClock, FaUser } from 'react-icons/fa';

export const NewsArticleModal = ({ article, onClose }) => {
  useEffect(() => {
    if (!article) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow || 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [article, onClose]);

  if (!article) return null;

  const coverImage = article.cover_image_url || article.image || getCloudinaryAssetUrl('research') || 'https://res.cloudinary.com/a2mmcttn/image/upload/v1788569339/nacos/gallery/research.jpg';

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-[#083002] overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full min-h-screen flex flex-col bg-white dark:bg-[#083002]">
        {/* Header Cover Banner */}
        <div className="relative h-72 sm:h-96 md:h-[420px] w-full bg-gray-950 shrink-0">
          <img
            src={coverImage}
            alt={article.title}
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={onClose}
            className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 w-11 h-11 rounded-full bg-black/75 hover:bg-black text-white flex items-center justify-center text-xl font-bold transition-all shadow-xl cursor-pointer hover:scale-105 border border-white/20"
            title="Close Story"
            aria-label="Close Story"
          >
            <FaTimes />
          </button>
          <div className="absolute bottom-4 left-4 sm:left-8 bg-[#138601] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow">
            {article.category || 'Department News'}
          </div>
        </div>

        {/* Formal Article Details & Body Content */}
        <div className="p-6 sm:p-10 md:p-12 max-w-4xl w-full mx-auto space-y-5 flex-grow pb-24">
          <div className="flex items-center gap-4 text-xs sm:text-sm text-black/60 dark:text-green-200/60 flex-wrap">
            <span className="inline-flex items-center gap-1.5">
              <FaCalendarAlt className="text-[#138601] dark:text-[#4bd043]" />
              {article.date}
            </span>
            <span>&bull;</span>
            <span className="inline-flex items-center gap-1.5">
              <FaClock className="text-[#138601] dark:text-[#4bd043]" />
              {article.readTime || `${article.read_time_minutes || 3} min read`}
            </span>
            <span>&bull;</span>
            <span className="inline-flex items-center gap-1.5">
              <FaUser className="text-[#138601] dark:text-[#4bd043]" />
              By {article.author || 'NACOS Press'}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-black dark:text-white leading-tight">
            {article.title}
          </h1>

          <div className="text-base sm:text-lg leading-relaxed text-black/85 dark:text-green-100/85 space-y-4 pt-4 border-t border-[#138601]/15 dark:border-white/10">
            {(article.summary || article.excerpt) && (
              <p className="font-semibold text-black dark:text-white text-base sm:text-lg leading-relaxed">
                {article.summary || article.excerpt}
              </p>
            )}
            <p className="whitespace-pre-line leading-relaxed">
              {article.content || article.summary || article.excerpt}
            </p>
          </div>

          <div className="pt-8 border-t border-gray-200 dark:border-white/10 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-[#138601] hover:bg-[#0f6c01] text-white font-bold text-sm transition-colors cursor-pointer inline-flex items-center gap-2 shadow"
            >
              <FaTimes className="text-xs" />
              <span>Close Story</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsArticleModal;
