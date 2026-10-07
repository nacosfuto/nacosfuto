import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, BookOpen, RotateCcw, ArrowRight, Play, Video, Clock, CheckCircle, CheckCircle2, Plus } from "lucide-react";
import { useCourseStore } from "../stores/courseStore";
import { useAuthStore } from "../stores/authStore";
import { checkCreatorVerifiedSync } from "../services/mockDatabase";

export function CoursesPage() {
  const navigate = useNavigate();
  const { user, activeMode, isCreatorApproved } = useAuthStore();
  const allCourses = useCourseStore((state) => state.allCourses);
  const userEnrollments = useCourseStore((state) => state.userEnrollments);
  const status = useCourseStore((state) => state.status);
  const fetchAllCourses = useCourseStore((state) => state.fetchAllCourses);
  const fetchUserEnrollments = useCourseStore((state) => state.fetchUserEnrollments);

  const isTutor = activeMode === 'creator' || (isCreatorApproved && isCreatorApproved());

  const [search, setSearch] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [selectedType, setSelectedType] = useState("all");

  useEffect(() => {
    fetchAllCourses();
    if (user?.id) {
      fetchUserEnrollments(user.id);
    }
  }, [fetchAllCourses, fetchUserEnrollments, user]);

  // Filtered courses
  const filteredCourses = useMemo(() => {
    return (allCourses || []).filter((course) => {
      // Level filter
      if (selectedLevel !== "all") {
        const cLevel = (course.level || "").toLowerCase();
        const sLevel = selectedLevel.toLowerCase();
        if (!cLevel.includes(sLevel) && !sLevel.includes(cLevel)) {
          return false;
        }
      }
      // Type filter (self-paced vs live workshop)
      if (selectedType === "workshop" && !course.is_live_workshop) return false;
      if (selectedType === "self-paced" && course.is_live_workshop) return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = (course.title || "").toLowerCase().includes(q);
        const matchDesc = (course.description || "").toLowerCase().includes(q);
        const matchCreator = (course.creator_name || "").toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchCreator) return false;
      }
      return true;
    });
  }, [allCourses, selectedLevel, selectedType, search]);

  const resetFilters = () => {
    setSearch("");
    setSelectedLevel("all");
    setSelectedType("all");
  };

  const hasActiveFilters = search.trim() !== "" || selectedLevel !== "all" || selectedType !== "all";

  return (
    <div className="flex-1 w-full bg-[#F8FAFC] text-[#000000] transition-colors duration-300">
      
      {/* ─── Top Filter & Taskbar ─── */}
      <div className="bg-white border-b border-gray-200 py-3.5 px-4 sticky top-16 z-20 shadow-xs">
        <div className="site-container flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded bg-[#0056D2] flex items-center justify-center text-white shadow-xs font-black text-sm">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-black text-[#000000] uppercase tracking-wider">
                Courses & Learning Tracks
              </h1>
              <p className="text-[11px] text-[#0056D2] font-semibold">
                {filteredCourses.length} Learning Modules Available
              </p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 flex-1 md:max-w-xl justify-end w-full">
            {/* Search Input */}
            <div className="relative w-full sm:flex-1 sm:min-w-[180px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tracks, topics..."
                className="w-full bg-gray-50 text-[#000000] placeholder-gray-400 text-xs pl-9 pr-7 py-2 rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#0056D2] focus:border-[#0056D2] font-medium"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter selectors row on mobile */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="flex-1 sm:flex-none px-2.5 sm:px-3 py-2 rounded bg-gray-50 text-xs font-semibold text-[#000000] border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#0056D2] cursor-pointer"
              >
                <option value="all">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="professional">Professional</option>
                <option value="100">100 Level</option>
                <option value="200">200 Level</option>
                <option value="300">300 Level</option>
              </select>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="flex-1 sm:flex-none px-2.5 sm:px-3 py-2 rounded bg-gray-50 text-xs font-semibold text-[#000000] border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#0056D2] cursor-pointer"
              >
                <option value="all">All Formats</option>
                <option value="self-paced">Self-Paced Track</option>
                <option value="workshop">Live Workshop</option>
              </select>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs cursor-pointer shrink-0"
                  title="Reset filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}

              {isTutor && (
                <Link
                  to="/create-course"
                  className="px-3.5 py-2 rounded bg-[#0056D2] hover:bg-[#0043aa] text-white text-xs font-bold shrink-0 shadow-xs inline-flex items-center gap-1.5"
                >
                  <span>+ Create Course</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Courses Grid ─── */}
      <main className="site-container py-8 sm:py-10">
        
        {/* Open Learning Contribution Callout Banner */}
        <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50 via-white to-blue-50/60 border border-blue-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[#0056D2]">
              Open Source Learning Catalog
            </p>
            <h3 className="text-sm sm:text-base font-bold text-gray-900">
              Free & Community Driven: Anyone Can Learn or Request to Contribute a Course
            </h3>
            <p className="text-xs text-gray-600 max-w-2xl leading-relaxed">
              Upskill Hub is an open educational initiative by NACOS FUTO. Have expertise in an emerging framework, algorithm, or skill? Request to contribute a course and empower tech scholars worldwide.
            </p>
          </div>
          <Link
            to="/create-course"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0056D2] hover:bg-[#0043aa] text-white text-xs font-bold shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Contribute a Course</span>
          </Link>
        </div>

        {status === "PENDING" && allCourses.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded border border-gray-200 p-5 space-y-4 animate-pulse">
                <div className="h-40 bg-gray-100 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-5 bg-gray-200 rounded w-4/5"></div>
              </div>
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white rounded border border-dashed border-gray-300">
            <BookOpen className="mx-auto text-4xl text-gray-400 mb-3" />
            <h3 className="text-base font-bold text-[#000000]">No courses match your filter</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Try adjusting your search query, level, or format filter.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 px-5 py-2 bg-[#0056D2] hover:bg-[#0043aa] text-white text-xs font-bold rounded shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => {
              const enrollment = userEnrollments.find(
                (e) => String(e.course_id) === String(course.id)
              );
              const isEnrolled = Boolean(enrollment);
              const progress = enrollment?.progress || 0;

              return (
                <div
                  key={course.id}
                  className="bg-white rounded overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 border border-gray-200 hover:border-[#0056D2] flex flex-col justify-between group cursor-pointer"
                  onClick={() => navigate(`/courses/${course.id}`)}
                >
                  <div>
                    {/* Visual Thumbnail */}
                    <div className="relative aspect-video overflow-hidden bg-gray-100">
                      <img
                        src={course.thumbnail || "https://res.cloudinary.com/a2mmcttn/image/upload/v1788569330/nacos/gallery/nacos2.jpg"}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/75 backdrop-blur-xs text-white uppercase font-mono">
                          {course.level || "Track"}
                        </span>
                        {course.is_live_workshop && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500 text-black uppercase font-mono">
                            Live Workshop
                          </span>
                        )}
                      </div>

                      {isEnrolled && (
                        <div className="absolute bottom-2.5 right-2.5 bg-black/80 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] text-[#1d72fe] font-bold border border-white/20 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-[#1d72fe]" />
                          <span>{progress}% Complete</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4 sm:p-5 space-y-2">
                      <div className="flex flex-wrap gap-1.5 mb-1">
                        {(course.tags || []).map((t) => (
                          <span
                            key={t}
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-[#0056D2] border border-blue-200 font-semibold"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>

                      <h3 className="text-base font-bold text-[#000000] group-hover:text-[#0056D2] transition-colors leading-snug line-clamp-2">
                        {course.title}
                      </h3>

                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                        {course.description}
                      </p>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="p-4 sm:p-5 pt-0">
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                      {(() => {
                        const isVerified = checkCreatorVerifiedSync(course.creator_name || course.creator_id || course.instructor_name);
                        return (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const slug = String(course.creator_name || course.instructor_name || 'instructor').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                              navigate(`/instructors/${slug}`);
                            }}
                            className="font-semibold text-gray-700 hover:text-[#0056D2] hover:underline truncate max-w-[140px] text-left cursor-pointer flex items-center gap-1"
                            title={`View ${course.creator_name || 'Instructor'}'s profile and published courses`}
                          >
                            <span className="truncate">{course.creator_name || "Instructor"}</span>
                            {isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-[#0056D2] shrink-0" title="Verified Creator" />}
                          </button>
                        );
                      })()}
                      <div className="inline-flex items-center gap-1 font-bold text-[#0056D2] group-hover:translate-x-1 transition-transform shrink-0">
                        <span>Learn Track</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#0056D2]" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

    </div>
  );
}

export default CoursesPage;
