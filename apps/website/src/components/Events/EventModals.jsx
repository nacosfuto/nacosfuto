import React from 'react';
import { FiX, FiInfo } from 'react-icons/fi';



export const EventRecapModal = ({ isOpen, event, theme, onClose, onExploreUpcoming }) => {
  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className={`relative w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
          theme === 'dark'
            ? 'bg-[#083002] border-[#138601]/40 text-white'
            : 'bg-white border-gray-200 text-gray-900'
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-[#138601]/20">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-[5px] text-[10px] font-bold uppercase tracking-wider bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              Past Event
            </span>
            <h2 className="text-lg font-bold tracking-tight">Event Recap</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#041801] transition-colors cursor-pointer text-gray-500 dark:text-green-200"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="aspect-video w-full rounded-xl overflow-hidden border border-gray-200 dark:border-[#138601]/20">
            <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
          </div>

          <div>
            <h3 className="text-xl font-bold mb-2">{event.title}</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-75 mb-3">
              <span>📅 {event.date}</span>
              <span>⏰ {event.time}</span>
              <span>📍 {event.location}</span>
            </div>
            <p className="text-sm leading-relaxed opacity-85">{event.description}</p>
          </div>

          <div className="p-3.5 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/40 text-xs text-[#083002] dark:text-green-200 flex items-start gap-2">
            <FiInfo className="w-4 h-4 text-[#138601] dark:text-[#4bd043] flex-shrink-0 mt-0.5" />
            <span>This event has concluded. Stay tuned for upcoming gatherings, conferences, and workshops.</span>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onExploreUpcoming}
              className="px-5 py-2.5 rounded-[5px] bg-[#138601] hover:bg-[#0f6b01] text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-all cursor-pointer"
            >
              Explore Upcoming Events
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
