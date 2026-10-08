import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  BookOpen,
  ExternalLink,
  RotateCcw,
  CheckCircle2,
  Layers,
  GraduationCap,
  Clock,
  User,
  Award,
  ChevronRight,
  Info,
  X
} from 'lucide-react';
import PortalLayout from '../components/PortalLayout';
import { getAppUrls } from '@nacos/config/urls';
import { fetchCourses } from '@nacos/supabase';

const Courses = () => {
  // User Authentication / State
  const [user] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('nacos_user');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {}
      }
    }
    return {};
  });

  // Calculate Student Current Level
  const currentStudentLevel = useMemo(() => {
    const levelStr = (user.level || '').toString();
    const match = levelStr.match(/(\d{3})/);
    if (match) return parseInt(match[1], 10);
    if (user.admission_year) {
      const num = 2026 - parseInt(user.admission_year, 10) + 1;
      if (num >= 5) return 500;
      if (num <= 1) return 100;
      return num * 100;
    }
    return 300;
  }, [user]);

  // Courses Dynamic State (from database, defaults to [])
  const [coursesList, setCoursesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadCourses = async () => {
      try {
        setIsLoading(true);
        const res = await fetchCourses();
        if (isMounted) {
          if (res && res.data && res.data.length > 0) {
            setCoursesList(res.data);
          } else {
            setCoursesList([]);
          }
          setIsLoading(false);
        }
      } catch (err) {
        console.warn('Error loading dynamic courses:', err);
        if (isMounted) {
          setCoursesList([]);
          setIsLoading(false);
        }
      }
    };
    loadCourses();

    const handleStorageChange = () => loadCourses();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('nacos_courses_updated', handleStorageChange);
    return () => {
      isMounted = false;
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('nacos_courses_updated', handleStorageChange);
    };
  }, []);

  // Filters State
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedSemester, setSelectedSemester] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Course Details Modal State
  const [activeCourseModal, setActiveCourseModal] = useState(null);

  // Filtered registered courses
  const filteredCourses = useMemo(() => {
    return coursesList.filter((course) => {
      if (selectedLevel !== 'all' && String(course.level) !== selectedLevel) {
        return false;
      }
      if (selectedSemester !== 'all' && course.semester !== selectedSemester) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchCode = (course.code || '').toLowerCase().includes(q);
        const matchTitle = (course.title || '').toLowerCase().includes(q);
        const matchLecturer = (course.lecturer || '').toLowerCase().includes(q);
        const matchDesc = (course.description || '').toLowerCase().includes(q);
        if (!matchCode && !matchTitle && !matchLecturer && !matchDesc) {
          return false;
        }
      }
      return true;
    });
  }, [coursesList, selectedLevel, selectedSemester, searchTerm]);

  // Total Credit Units for currently displayed curriculum
  const totalUnits = useMemo(() => {
    return filteredCourses.reduce((acc, c) => acc + (Number(c.units) || 0), 0);
  }, [filteredCourses]);

  const handleResetFilters = () => {
    setSelectedLevel('all');
    setSelectedSemester('all');
    setSearchTerm('');
  };

  const hasActiveFilters = selectedLevel !== 'all' || selectedSemester !== 'all' || searchTerm.trim() !== '';

  const websiteUrl = getAppUrls().website;
  const resourceHubUrl = `${websiteUrl}/resources`;
  const futoPortalUrl = 'https://portal.futo.edu.ng';

  return (
    <PortalLayout>
      <div className="space-y-6 font-sans">
        
        {/* ─── PROMINENT FUTO COURSE REGISTRATION NOTICE ─── */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-gray-50 dark:bg-[#041801] text-[#138601] dark:text-[#4bd043] border border-gray-200 dark:border-[#138601]/30">
                <Info className="w-4 h-4" />
              </span>
              <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white tracking-tight">
                Official FUTO Semester Course Registration
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-green-200/80 max-w-2xl leading-relaxed font-normal">
              Official course registration is conducted on the university portal (<strong>portal.futo.edu.ng</strong>). Please visit the FUTO portal to select and register your courses for the current academic session. Departmental curriculum outlines and study materials synchronize here.
            </p>
          </div>

          <div className="shrink-0">
            <a
              href={futoPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] transition-all shadow-xs cursor-pointer"
            >
              <span>Visit FUTO School Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* ─── Page Title Header & Quick Summary ─── */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-gray-50 dark:bg-[#041801] text-[#138601] dark:text-[#4bd043] border border-gray-200 dark:border-[#138601]/30">
                <Layers className="w-4 h-4" />
              </span>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                Registered Courses & Academic Curriculum
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-green-200/80 font-normal">
              Departmental curriculum modules, course units, lecturer contacts, and syllabus outlines for Computer Science undergraduates.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 text-xs">
              <span className="text-gray-500 dark:text-green-200/70">Your Level: </span>
              <strong className="text-gray-900 dark:text-white font-bold">{currentStudentLevel}L</strong>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 text-xs">
              <span className="text-gray-500 dark:text-green-200/70">Total Units: </span>
              <strong className="text-[#138601] dark:text-[#4bd043] font-bold">{totalUnits} Units</strong>
            </div>
          </div>
        </div>

        {/* ─── Filter & Search Bar (Only shown if courses exist) ─── */}
        {coursesList.length > 0 && (
          <div className="p-4 rounded-xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Level Filter */}
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-semibold text-gray-600 dark:text-green-200">Level:</label>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/40 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-[#138601] cursor-pointer"
                >
                  <option value="all">All Levels (100L – 500L)</option>
                  <option value="100">100 Level</option>
                  <option value="200">200 Level</option>
                  <option value="300">300 Level</option>
                  <option value="400">400 Level</option>
                  <option value="500">500 Level</option>
                </select>
              </div>

              {/* Semester Filter */}
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-semibold text-gray-600 dark:text-green-200">Semester:</label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/40 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-[#138601] cursor-pointer"
                >
                  <option value="all">All Semesters (1st & 2nd)</option>
                  <option value="First Semester">First Semester</option>
                  <option value="Second Semester">Second Semester</option>
                </select>
              </div>
            </div>

            {/* Search Box */}
            <div className="flex items-center gap-2">
              <div className="relative w-full md:w-72">
                <Search className="w-3.5 h-3.5 text-gray-400 dark:text-green-300 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search course code, title or lecturer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/40 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-green-200/50 focus:outline-none focus:ring-1 focus:ring-[#138601]"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 text-xs text-[#138601] dark:text-[#4bd043] font-semibold hover:underline cursor-pointer shrink-0"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─── Courses Directory Grid or Clean Empty State ─── */}
        {coursesList.length === 0 ? (
          <div className="p-8 sm:p-12 text-center rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 space-y-4 shadow-xs">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 flex items-center justify-center text-[#138601] dark:text-[#4bd043]">
              <BookOpen className="w-7 h-7" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-gray-100 dark:bg-[#041801] text-gray-700 dark:text-green-200 border border-gray-200 dark:border-[#138601]/30">
              <Clock className="w-3.5 h-3.5 text-[#138601] dark:text-[#4bd043]" />
              <span>FUTO Portal Registration Required</span>
            </div>

            <div className="max-w-md mx-auto space-y-1.5">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                Course registration is conducted on the FUTO School Portal
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-green-200/80 leading-relaxed font-normal">
                Please visit the official FUTO School Portal to register your courses for this semester. Once registered, your departmental courses, syllabus modules, and academic resources will synchronize here.
              </p>
            </div>

            <div className="pt-2">
              <a
                href={futoPortalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] transition-all cursor-pointer shadow-xs"
              >
                <span>Go to FUTO School Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Alternating subtle cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto pt-4 text-left">
              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#041801]/60 border border-gray-200 dark:border-[#138601]/25">
                <span className="text-[11px] font-bold text-gray-900 dark:text-white block">Step 1: Course Enrolment</span>
                <span className="text-[10px] text-gray-500 dark:text-green-200/70">Register courses on portal.futo.edu.ng</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/25">
                <span className="text-[11px] font-bold text-gray-900 dark:text-white block">Step 2: Department Sync</span>
                <span className="text-[10px] text-gray-500 dark:text-green-200/70">Handouts and syllabus display in NACOS portal</span>
              </div>
            </div>
          </div>
        ) : filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCourses.map((course, idx) => {
              const isEven = idx % 2 === 0;

              return (
                <div
                  key={course.code + idx}
                  className={`p-5 rounded-2xl ${
                    isEven ? 'bg-white dark:bg-[#083002]' : 'bg-gray-50/70 dark:bg-[#083002]/90'
                  } border border-gray-200 dark:border-[#138601]/30 hover:border-[#138601] dark:hover:border-[#138601] transition-all flex flex-col justify-between space-y-4 shadow-xs group`}
                >
                  {/* Top Bar: Code, Level, Units */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-[#138601] dark:group-hover:text-[#4bd043] transition-colors">
                          {course.code}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white dark:bg-[#041801] text-gray-700 dark:text-green-200 border border-gray-200 dark:border-[#138601]/30">
                          {course.level}L
                        </span>
                      </div>

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-green-50 dark:bg-[#138601]/20 text-[#138601] dark:text-[#4bd043] border border-green-200 dark:border-[#138601]/40">
                        {course.units} Units
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug">
                      {course.title}
                    </h3>

                    {course.description && (
                      <p className="text-[11px] text-gray-500 dark:text-green-200/70 line-clamp-2 leading-relaxed font-normal">
                        {course.description}
                      </p>
                    )}
                  </div>

                  {/* Lecturer & Action */}
                  <div className="pt-2 border-t border-gray-100 dark:border-[#138601]/20 space-y-2.5">
                    {course.lecturer && (
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-green-200/70">
                        <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{course.lecturer}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setActiveCourseModal(course)}
                        className="flex-1 py-1.5 px-3 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-[#041801] hover:bg-gray-100 dark:hover:bg-[#138601]/30 border border-gray-200 dark:border-[#138601]/30 transition-colors cursor-pointer text-center"
                      >
                        View Outline
                      </button>

                      <a
                        href={`${resourceHubUrl}?search=${encodeURIComponent(course.code)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] transition-colors cursor-pointer shrink-0"
                      >
                        <span>Materials</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 space-y-3 shadow-xs">
            <BookOpen className="w-8 h-8 text-gray-400 mx-auto" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">No courses match your filter</h3>
            <p className="text-xs text-gray-500 dark:text-green-200/70 max-w-sm mx-auto">
              We couldn't find any courses matching your selected level, semester, or search query.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Filters</span>
            </button>
          </div>
        )}

        {/* ─── COURSE SYLLABUS & DETAILS MODAL ─── */}
        {activeCourseModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              
              {/* Modal Header */}
              <div className="p-5 border-b border-gray-100 dark:border-[#138601]/25 flex items-center justify-between gap-3 shrink-0 bg-gray-50/70 dark:bg-[#041801]/60">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-green-50 dark:bg-[#041801] text-[#138601] dark:text-[#4bd043] border border-[#138601]/30">
                      {activeCourseModal.code}
                    </span>
                    <span className="text-xs font-medium text-gray-500 dark:text-green-200/70">
                      {activeCourseModal.level}L • {activeCourseModal.semester}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white mt-1">
                    {activeCourseModal.title}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveCourseModal(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#041801] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
                
                {/* Key Course Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30">
                    <span className="text-[10px] text-gray-400 dark:text-green-200/60 uppercase font-bold block">Units</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{activeCourseModal.units} Credit Units</span>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30">
                    <span className="text-[10px] text-gray-400 dark:text-green-200/60 uppercase font-bold block">Classification</span>
                    <span className="text-xs font-bold text-[#138601] dark:text-[#4bd043] truncate block">{activeCourseModal.type || 'Departmental Core'}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 col-span-2">
                    <span className="text-[10px] text-gray-400 dark:text-green-200/60 uppercase font-bold block">Prerequisites</span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{activeCourseModal.prerequisites || 'None'}</span>
                  </div>
                </div>

                {/* Course Overview */}
                {activeCourseModal.description && (
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[11px]">Course Overview</h4>
                    <p className="text-gray-600 dark:text-green-100/80 leading-relaxed font-normal">
                      {activeCourseModal.description}
                    </p>
                  </div>
                )}

                {/* Course Lecturer */}
                {activeCourseModal.lecturer && (
                  <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#138601]/10 border border-gray-200 dark:border-[#138601]/25 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#138601] text-white flex items-center justify-center font-bold">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-bold text-gray-900 dark:text-white">{activeCourseModal.lecturer}</h5>
                        <p className="text-[11px] text-gray-500 dark:text-green-200/70">{activeCourseModal.office || 'Department of Computer Science'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Syllabus Modules Breakdown */}
                {activeCourseModal.syllabus && activeCourseModal.syllabus.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[11px]">Syllabus Topic Modules</h4>
                    <div className="space-y-1.5">
                      {activeCourseModal.syllabus.map((topic, i) => (
                        <div key={i} className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-md bg-[#138601]/15 text-[#138601] dark:text-[#4bd043] flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span className="text-gray-700 dark:text-gray-200 font-medium leading-relaxed">{topic}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-gray-100 dark:border-[#138601]/25 flex items-center justify-between gap-3 bg-gray-50 dark:bg-[#041801]">
                <button
                  type="button"
                  onClick={() => setActiveCourseModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#083002] transition-colors cursor-pointer"
                >
                  Close
                </button>

                <a
                  href={`${resourceHubUrl}?search=${encodeURIComponent(activeCourseModal.code)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] shadow-xs transition-colors cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Access Notes & Past Questions</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        )}

      </div>
    </PortalLayout>
  );
};

export default Courses;
