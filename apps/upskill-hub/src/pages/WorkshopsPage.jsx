import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Video, Calendar, MapPin, Clock, ArrowRight, CheckCircle, Users, Plus, Trash2, X } from "lucide-react";
import { useCourseStore } from "../stores/courseStore";
import { useAuthStore } from "../stores/authStore";

export function WorkshopsPage() {
  const navigate = useNavigate();
  const { user, activeMode, isCreatorApproved } = useAuthStore();
  const allCourses = useCourseStore((state) => state.allCourses);
  const fetchAllCourses = useCourseStore((state) => state.fetchAllCourses);
  const registerForWorkshop = useCourseStore((state) => state.registerForWorkshop);

  const isTutor = activeMode === 'creator' || (isCreatorApproved && isCreatorApproved());

  const [registeredIds, setRegisteredIds] = useState(new Set());
  const [successToast, setSuccessToast] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newWorkshop, setNewWorkshop] = useState({
    title: '',
    description: '',
    date: 'Oct 15, 2026',
    time: '2:00 PM WAT',
    venue: 'Google Meet / Virtual Studio',
    instructor: 'NACOS Faculty Fellow',
    capacity: 100
  });

  useEffect(() => {
    fetchAllCourses();
  }, [fetchAllCourses]);

  const workshops = (allCourses || []).filter((c) => c.is_live_workshop);

  const handleRegister = async (ws) => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    await registerForWorkshop(user.id, ws.id, {
      fullName: user.name || user.email,
      email: user.email,
    });
    setRegisteredIds((prev) => new Set([...prev, ws.id]));
    setSuccessToast(`Successfully registered for "${ws.title}"!`);
    setTimeout(() => setSuccessToast(""), 4000);
  };

  const handleCreateWorkshop = (e) => {
    e.preventDefault();
    if (!newWorkshop.title.trim()) return;

    const created = {
      id: `ws-${Date.now()}`,
      title: newWorkshop.title,
      description: newWorkshop.description || 'Hands-on live engineering workshop and mentor office hours.',
      is_live_workshop: true,
      level: 'All Levels',
      thumbnail: 'https://res.cloudinary.com/a2mmcttn/image/upload/v1788569331/nacos/gallery/nacos3.jpg',
      tags: ['LiveWorkshop', 'Engineering'],
      workshop_details: {
        date: newWorkshop.date,
        time: newWorkshop.time,
        venue: newWorkshop.venue,
        speaker: newWorkshop.instructor,
        seats_left: newWorkshop.capacity,
        join_url: 'https://meet.google.com'
      }
    };

    useCourseStore.setState((prev) => ({
      allCourses: [created, ...(prev.allCourses || [])]
    }));

    setIsModalOpen(false);
    setNewWorkshop({
      title: '',
      description: '',
      date: 'Oct 15, 2026',
      time: '2:00 PM WAT',
      venue: 'Google Meet / Virtual Studio',
      instructor: 'NACOS Faculty Fellow',
      capacity: 100
    });
    setSuccessToast(`Workshop "${created.title}" scheduled successfully!`);
    setTimeout(() => setSuccessToast(''), 4000);
  };

  const handleDeleteWorkshop = (wsId) => {
    useCourseStore.setState((prev) => ({
      allCourses: (prev.allCourses || []).filter(c => c.id !== wsId)
    }));
    setSuccessToast('Workshop removed from schedule.');
    setTimeout(() => setSuccessToast(''), 4000);
  };

  return (
    <div className="flex-1 w-full bg-[#F8FAFC] text-[#000000] transition-colors duration-300">
      
      {/* Toast */}
      {successToast && (
        <div className="fixed top-20 right-6 z-50 p-3.5 rounded bg-white border border-[#0056D2] text-[#000000] shadow-xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3">
          <CheckCircle className="w-4 h-4 text-[#0056D2]" />
          <span className="text-xs font-bold">{successToast}</span>
        </div>
      )}

      {/* ─── Taskbar ─── */}
      <div className="bg-white border-b border-gray-200 py-3.5 px-4 sticky top-16 z-20 shadow-xs">
        <div className="site-container flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#0056D2] flex items-center justify-center text-white shadow-xs font-black text-sm">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-black text-[#000000] uppercase tracking-wider">
                Live Interactive Workshops
              </h1>
              <p className="text-[11px] text-[#0056D2] font-semibold">
                Departmental Bootcamps & Real-Time Code Reviews
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded bg-blue-50 text-[#0056D2] border border-blue-200">
              {workshops.length} Scheduled Sessions
            </span>
            {isTutor && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-3 py-1 rounded bg-[#0056D2] hover:bg-[#0043aa] text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Host Workshop</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Main Workshops List ─── */}
      <main className="site-container py-8 sm:py-10">
        {workshops.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white rounded border border-dashed border-gray-300">
            <Video className="mx-auto text-4xl text-gray-400 mb-3" />
            <h3 className="text-base font-bold text-[#000000]">No live workshops scheduled right now</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Check back soon for upcoming departmental bootcamps or live engineering masterclasses!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {workshops.map((ws) => {
              const details = ws.workshop_details || {};
              const isRegistered = registeredIds.has(ws.id);

              return (
                <div
                  key={ws.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-[#0056D2] flex flex-col justify-between"
                >
                  <div>
                    {/* Visual Banner */}
                    <div className="relative aspect-video overflow-hidden bg-gray-100">
                      <img
                        src={ws.thumbnail || "https://res.cloudinary.com/a2mmcttn/image/upload/v1788569331/nacos/gallery/nacos3.jpg"}
                        alt={ws.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500 text-black uppercase font-mono">
                          Live Bootcamp
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/75 text-white uppercase font-mono">
                          {ws.level || "Intermediate"}
                        </span>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="p-5 sm:p-6 space-y-4">
                      <div>
                        <h2 className="text-lg font-bold text-[#000000] leading-snug">
                          {ws.title}
                        </h2>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {ws.description}
                        </p>
                      </div>

                      {/* Schedule Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs bg-blue-50/60 p-3 rounded-xl border border-blue-100 text-gray-700">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[#0056D2]" />
                          <span>{details.date || "October 2026"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-[#0056D2]" />
                          <span>{details.time || "14:00 GMT+1"}</span>
                        </div>
                        <div className="flex items-center gap-2 col-span-2">
                          <MapPin className="w-3.5 h-3.5 text-[#0056D2] shrink-0" />
                          <span className="truncate">{details.location || "FUTO ICT Innovation Center"}</span>
                        </div>
                        <div className="flex items-center gap-2 col-span-2">
                          <Users className="w-3.5 h-3.5 text-[#0056D2] shrink-0" />
                          <span>Instructor: <strong>{details.instructor || ws.creator_name || "NACOS Faculty"}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="p-5 pt-0">
                    <div className="pt-3 border-t border-gray-100 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleRegister(ws)}
                        disabled={isRegistered}
                        className={`flex-1 py-2 px-4 rounded text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          isRegistered
                            ? "bg-blue-50 text-[#0056D2] border border-blue-200"
                            : "bg-[#0056D2] hover:bg-[#0043aa] text-white shadow-xs"
                        }`}
                      >
                        {isRegistered ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-[#0056D2]" />
                            <span>Registered</span>
                          </>
                        ) : (
                          <span>Register for Session</span>
                        )}
                      </button>

                      <Link
                        to={`/courses/${ws.id}`}
                        className="py-2 px-3 rounded text-xs font-bold bg-gray-50 border border-gray-200 hover:bg-gray-100 text-[#000000] transition-colors"
                      >
                        Details
                      </Link>

                      {isTutor && (
                        <button
                          type="button"
                          onClick={() => handleDeleteWorkshop(ws.id)}
                          className="p-2 rounded text-xs text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Cancel/Delete Workshop"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ─── HOST WORKSHOP MODAL ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-blue-50 text-[#0056D2] flex items-center justify-center font-bold">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Schedule Live Workshop</h3>
                  <p className="text-[11px] text-gray-500">Host an interactive bootcamp or code review session</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkshop} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Workshop Title *</label>
                <input
                  type="text"
                  required
                  value={newWorkshop.title}
                  onChange={(e) => setNewWorkshop(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Full-Stack API Performance & Caching Masterclass"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-[#0056D2]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newWorkshop.description}
                  onChange={(e) => setNewWorkshop(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What will learners build and master in this live session?"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-[#0056D2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Date</label>
                  <input
                    type="text"
                    value={newWorkshop.date}
                    onChange={(e) => setNewWorkshop(prev => ({ ...prev, date: e.target.value }))}
                    placeholder="e.g. Oct 20, 2026"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-[#0056D2]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Time</label>
                  <input
                    type="text"
                    value={newWorkshop.time}
                    onChange={(e) => setNewWorkshop(prev => ({ ...prev, time: e.target.value }))}
                    placeholder="e.g. 2:00 PM WAT"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-[#0056D2]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Venue / Meet Link</label>
                  <input
                    type="text"
                    value={newWorkshop.venue}
                    onChange={(e) => setNewWorkshop(prev => ({ ...prev, venue: e.target.value }))}
                    placeholder="Google Meet or FUTO Lab"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-[#0056D2]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Lead Instructor</label>
                  <input
                    type="text"
                    value={newWorkshop.instructor}
                    onChange={(e) => setNewWorkshop(prev => ({ ...prev, instructor: e.target.value }))}
                    placeholder="Tutor Name"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-[#0056D2]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-[#0056D2] hover:bg-[#0043aa] shadow-xs cursor-pointer"
                >
                  Schedule Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default WorkshopsPage;
