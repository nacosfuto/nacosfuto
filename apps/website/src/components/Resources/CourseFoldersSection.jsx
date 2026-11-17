import React, { useState, useEffect } from 'react';
import { FiExternalLink, FiFolder, FiCheck } from 'react-icons/fi';
import { fetchCourseFolders, getLocalCourseFolders, DEFAULT_COURSE_FOLDERS } from '@nacos/supabase';

/**
 * Pixel-perfect SVG Course Folder graphic matching the design specification.
 * Features an authentic amber/golden folder with an open front flap and document sheets peeking out.
 */
const CourseFolderGraphic = () => (
  <svg
    viewBox="0 0 176 124"
    className="w-full max-w-[210px] mx-auto h-auto transition-transform duration-300 group-hover:scale-105 select-none"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {/* Darker amber back folder flap with top-left tab */}
    <path
      d="M 12 28 C 12 18 18 14 26 14 L 60 14 C 66 14 70 17 73 22 L 78 30 L 154 30 C 162 30 166 34 166 42 L 166 98 C 166 106 160 110 152 110 L 26 110 C 18 110 12 106 12 98 Z"
      fill="#d97706"
    />

    {/* White inner paper document peeking out from folder opening */}
    <rect
      x="22"
      y="22"
      width="134"
      height="52"
      rx="6"
      fill="#ffffff"
      stroke="#e5e7eb"
      strokeWidth="1.2"
    />
    <rect x="28" y="27" width="122" height="3" rx="1.5" fill="#f1f5f9" />
    <rect x="28" y="34" width="86" height="3" rx="1.5" fill="#f1f5f9" />

    {/* Front golden amber folder body with smooth rounded bottom corners */}
    <path
      d="M 12 38 L 166 38 L 166 98 C 166 108 156 114 146 114 L 32 114 C 22 114 12 108 12 98 Z"
      fill="#f59e0b"
    />

    {/* Subtle top edge highlight on front flap */}
    <line
      x1="12"
      y1="38"
      x2="166"
      y2="38"
      stroke="#fbbf24"
      strokeWidth="1.5"
    />
  </svg>
);

export const CourseFoldersSection = ({ onToast }) => {
  const [folders, setFolders] = useState(() => getLocalCourseFolders() || DEFAULT_COURSE_FOLDERS);
  const [activeHoverLevel, setActiveHoverLevel] = useState(null);

  useEffect(() => {
    let isMounted = true;

    // Load latest live course folders from Supabase id_card_settings
    fetchCourseFolders()
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setFolders(data);
        }
      })
      .catch((err) => {
        console.warn('[CourseFoldersSection] Error loading folders:', err);
      });

    // Listen for real-time updates dispatched by admin dashboard
    const handleUpdate = (e) => {
      if (isMounted && e.detail && Array.isArray(e.detail)) {
        setFolders(e.detail);
      }
    };

    window.addEventListener('nacos_course_folders_updated', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('nacos_course_folders_updated', handleUpdate);
    };
  }, []);

  const handleFolderClick = (e, folder) => {
    if (!folder.drive_url || folder.drive_url.trim() === '' || folder.drive_url === '#') {
      e.preventDefault();
      if (onToast) {
        onToast(`The Google Drive folder for ${folder.level} is being configured by the academic committee.`, 'info');
      } else {
        alert(`The Google Drive folder for ${folder.level} is being configured by the academic committee.`);
      }
    }
  };

  return (
    <section className="mb-12 sm:mb-14 pt-2">
      {/* Header with authentic Left Green Accent Bar */}
      <div className="flex items-start gap-3 sm:gap-3.5 mb-6 sm:mb-8">
        <div className="w-1.5 h-11 bg-[#138601] rounded-full shrink-0 mt-0.5" />
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#041801] dark:text-white tracking-tight uppercase">
            COURSE FOLDERS
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-green-200/80 mt-1 font-normal max-w-2xl leading-relaxed">
            <span className="font-semibold text-[#138601] dark:text-[#4bd043]">Skip the hurdle</span> — explore lecture notes, past questions, and study materials contributed by department members across each academic level.
          </p>
        </div>
      </div>

      {/* 5-Column Grid Display (100 Level to 500 Level) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 sm:gap-6 lg:gap-8 items-stretch">
        {folders.map((folder) => {
          const hasUrl = Boolean(folder.drive_url && folder.drive_url.trim() && folder.drive_url !== '#');

          return (
            <a
              key={folder.level}
              href={hasUrl ? folder.drive_url : '#'}
              target={hasUrl ? '_blank' : '_self'}
              rel={hasUrl ? 'noopener noreferrer' : undefined}
              onClick={(e) => handleFolderClick(e, folder)}
              onMouseEnter={() => setActiveHoverLevel(folder.level)}
              onMouseLeave={() => setActiveHoverLevel(null)}
              className="group relative flex flex-col items-center p-3 sm:p-4 rounded-xl bg-white dark:bg-[#083002]/40 hover:bg-gray-50/80 dark:hover:bg-[#083002] border border-transparent hover:border-[#138601]/20 dark:hover:border-[#138601]/40 transition-all duration-300 hover:shadow-lg hover:-translate-y-1.5 text-center cursor-pointer"
              title={hasUrl ? `Open ${folder.level} Google Drive Folder in new tab` : `${folder.level} Google Drive folder`}
            >
              {/* Folder Graphic Container */}
              <div className="w-full flex items-center justify-center py-1 sm:py-2">
                <CourseFolderGraphic />
              </div>

              {/* Academic Level Label */}
              <div className="mt-2.5 sm:mt-3 space-y-1 w-full">
                <h3 className="font-extrabold text-gray-900 dark:text-white text-sm sm:text-base tracking-tight group-hover:text-[#138601] dark:group-hover:text-[#4bd043] transition-colors">
                  {folder.level}
                </h3>

                {/* Subtle Google Drive Indicator Pill */}
                <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 dark:text-green-200/70 group-hover:text-[#138601] dark:group-hover:text-[#4bd043] transition-colors">
                  <span>Google Drive</span>
                  <FiExternalLink className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </div>

              {/* Status Indicator Dot if connected */}
              <div className="absolute top-2.5 right-2.5">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    hasUrl ? 'bg-emerald-500' : 'bg-amber-400'
                  }`}
                  title={hasUrl ? 'Live Google Drive Linked' : 'Drive Link Pending'}
                />
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
};

export default CourseFoldersSection;
