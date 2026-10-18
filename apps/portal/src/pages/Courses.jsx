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
  X,
  ArrowLeft,
  Calendar,
  FileText,
  BadgeCheck,
  ShieldCheck,
  Sparkles,
  Loader
} from 'lucide-react';
import PortalLayout from '../components/PortalLayout';
import { getAppUrls } from '@nacos/config/urls';
import { fetchCourses } from '@nacos/supabase';
import { 
  calculateAcademicProgression, 
  getActiveAcademicSession, 
  getActiveAcademicSemester,
  onAcademicSessionChange,
  onAcademicSemesterChange,
  getEligibleAcademicRecords 
} from '@nacos/config/academic';

const Courses = () => {
  // User Authentication / State
  const [user, setUser] = useState(() => {
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

  const [activeSession, setActiveSession] = useState(getActiveAcademicSession);
  const [activeSemester, setActiveSemester] = useState(getActiveAcademicSemester);

  // Sync user and session changes
  useEffect(() => {
    const handleUserUpdate = () => {
      const stored = localStorage.getItem('nacos_user');
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch (e) {}
      }
    };

    window.addEventListener('storage', handleUserUpdate);
    window.addEventListener('nacos_user_updated', handleUserUpdate);

    const unsubSession = onAcademicSessionChange(({ sessionName }) => {
      if (sessionName) setActiveSession(sessionName);
    });

    const unsubSemester = onAcademicSemesterChange((sem) => {
      if (sem) setActiveSemester(sem);
    });

    return () => {
      window.removeEventListener('storage', handleUserUpdate);
      window.removeEventListener('nacos_user_updated', handleUserUpdate);
      if (unsubSession) unsubSession();
      if (unsubSemester) unsubSemester();
    };
  }, []);

  // Calculate Student Progression
  const progression = useMemo(() => {
    return calculateAcademicProgression(user, activeSession);
  }, [user, activeSession]);

  const studentCurrentLevel = useMemo(() => {
    if (progression && progression.valid && progression.numericLevel) {
      return Math.min(500, Math.max(100, progression.numericLevel * 100));
    }
    const levelStr = (user.level || user.current_level || '').toString();
    const match = levelStr.match(/(\d{3})/);
    return match ? parseInt(match[1], 10) : 100;
  }, [progression, user]);

  // Authoritative progression-filtered academic records
  // Implements Section 4: 100L 1st sees only 100L 1st; 200L 1st sees 100L 1st, 100L 2nd, 200L 1st, etc.
  const eligibleRecords = useMemo(() => {
    return getEligibleAcademicRecords(user, {
      currentYearStart: activeSession,
      currentSemester: activeSemester
    });
  }, [user, activeSession, activeSemester]);

  // Live Database Courses State
  const [coursesList, setCoursesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Navigation View State: null = Overview Table, Object = Course Details View
  const [selectedOffering, setSelectedOffering] = useState(null);

  // Syllabus Topic Modal State
  const [activeCourseModal, setActiveCourseModal] = useState(null);

  // Detail View Search Term
  const [detailSearch, setDetailSearch] = useState('');

  const loadCourses = async () => {
    try {
      setIsLoading(true);
      const res = await fetchCourses();
      if (res && res.data) {
        setCoursesList(res.data);
      } else {
        setCoursesList([]);
      }
    } catch (err) {
      console.warn('Error loading dynamic courses from database:', err);
      setCoursesList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();

    const handleUpdate = () => loadCourses();
    window.addEventListener('nacos_courses_updated', handleUpdate);
    return () => window.removeEventListener('nacos_courses_updated', handleUpdate);
  }, []);

  // Map courses to each eligible record
  const recordsWithCourseCounts = useMemo(() => {
    return eligibleRecords.map((rec) => {
      const matching = coursesList.filter((c) => {
        const matchesLevel = c.level.includes(String(rec.numericLevel));
        const matchesSession = c.academic_session === rec.academicSession;
        const matchesSemester = c.semester.toLowerCase() === rec.semester.toLowerCase();
        return matchesLevel && matchesSession && matchesSemester;
      });

      const totalUnits = matching.reduce((acc, c) => acc + (Number(c.credit_units) || 0), 0);

      return {
        ...rec,
        courseCount: matching.length,
        totalUnits,
        courses: matching
      };
    });
  }, [eligibleRecords, coursesList]);

  // Courses for currently selected offering
  const currentOfferingCourses = useMemo(() => {
    if (!selectedOffering) return [];
    
    // Find matching courses strictly for this level, session, and semester
    const matching = coursesList.filter((c) => {
      const matchesLevel = c.level.includes(String(selectedOffering.numericLevel));
      const matchesSession = c.academic_session === selectedOffering.academicSession;
      const matchesSemester = c.semester.toLowerCase() === selectedOffering.semester.toLowerCase();
      return matchesLevel && matchesSession && matchesSemester;
    });

    if (!detailSearch.trim()) return matching;

    const q = detailSearch.toLowerCase().trim();
    return matching.filter(c => 
      (c.code || '').toLowerCase().includes(q) ||
      (c.title || '').toLowerCase().includes(q) ||
      (c.lecturer || '').toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q)
    );
  }, [selectedOffering, coursesList, detailSearch]);

  const currentOfferingTotalUnits = useMemo(() => {
    if (!selectedOffering) return 0;
    const all = coursesList.filter((c) => {
      const matchesLevel = c.level.includes(String(selectedOffering.numericLevel));
      const matchesSession = c.academic_session === selectedOffering.academicSession;
      const matchesSemester = c.semester.toLowerCase() === selectedOffering.semester.toLowerCase();
      return matchesLevel && matchesSession && matchesSemester;
    });
    return all.reduce((acc, c) => acc + (Number(c.credit_units) || 0), 0);
  }, [selectedOffering, coursesList]);

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
              Official course registration is conducted on the university portal (<strong>portal.futo.edu.ng</strong>). Please visit the FUTO portal to register courses for your active semester. Departmental curriculum outlines and study materials synchronize here.
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

        {/* ==================================================================== */}
        {/* VIEW 1: REGISTERED COURSES OVERVIEW TABLE (Progression-Gated)        */}
        {/* ==================================================================== */}
        {!selectedOffering ? (
          <div className="space-y-6 animate-in fade-in duration-150">
            
            {/* Header Banner */}
            <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="p-1.5 rounded-lg bg-gray-50 dark:bg-[#041801] text-[#138601] dark:text-[#4bd043] border border-gray-200 dark:border-[#138601]/30">
                    <Layers className="w-4 h-4" />
                  </span>
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                    Registered Courses & Academic Progression
                  </h1>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-green-200/80 font-normal">
                  View your eligible registered academic course offerings from your admission intake through your current semester.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 text-xs">
                  <span className="text-gray-500 dark:text-green-200/70">Current Level: </span>
                  <strong className="text-gray-900 dark:text-white font-bold">{studentCurrentLevel}L</strong>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 text-xs">
                  <span className="text-gray-500 dark:text-green-200/70">Active Session: </span>
                  <strong className="text-[#138601] dark:text-[#4bd043] font-bold">{activeSession}</strong>
                </div>
              </div>
            </div>

            {/* Student-facing Table */}
            <div className="rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 overflow-hidden shadow-xs">
              {isLoading ? (
                <div className="p-12 text-center text-xs text-gray-500 dark:text-green-200/70">
                  <Loader className="w-6 h-6 animate-spin text-[#138601] mx-auto mb-2" />
                  Loading your eligible academic course offerings...
                </div>
              ) : recordsWithCourseCounts.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <BookOpen className="w-10 h-10 text-gray-400 mx-auto" />
                  <p className="text-sm font-bold text-gray-900 dark:text-white">No academic progression records found</p>
                  <p className="text-xs text-gray-500 dark:text-green-200/70 max-w-sm mx-auto">
                    Please ensure your student registration number is verified to load your eligible course history.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 dark:bg-[#041801] border-b border-gray-200 dark:border-[#138601]/30 text-gray-600 dark:text-green-200/80 uppercase tracking-wider text-[10px] font-bold">
                      <tr>
                        <th className="py-4 px-4 sm:px-6">Academic Level</th>
                        <th className="py-4 px-4 sm:px-6">Academic Session</th>
                        <th className="py-4 px-4 sm:px-6">Semester</th>
                        <th className="py-4 px-4 sm:px-6">Curriculum Status</th>
                        <th className="py-4 px-4 sm:px-6 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-[#138601]/20">
                      {recordsWithCourseCounts.map((rec) => {
                        return (
                          <tr 
                            key={`${rec.level}__${rec.academicSession}__${rec.semester}`}
                            className="hover:bg-gray-50/60 dark:hover:bg-[#041801]/40 transition-colors"
                          >
                            {/* Academic Level */}
                            <td className="py-4 px-4 sm:px-6 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-gray-900 dark:text-white text-xs sm:text-sm">
                                  {rec.level}
                                </span>
                                {rec.isCurrent && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 dark:bg-green-950/60 text-[#138601] dark:text-[#4bd043] border border-green-300 dark:border-green-800/40">
                                    Current
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Academic Session */}
                            <td className="py-4 px-4 sm:px-6 whitespace-nowrap font-mono text-xs sm:text-sm text-gray-700 dark:text-gray-200">
                              {rec.academicSession}
                            </td>

                            {/* Semester */}
                            <td className="py-4 px-4 sm:px-6 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                                rec.semester.includes('First')
                                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40'
                                  : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40'
                              }`}>
                                {rec.semester}
                              </span>
                            </td>

                            {/* Curriculum Status / Course count */}
                            <td className="py-4 px-4 sm:px-6 whitespace-nowrap">
                              {rec.courseCount > 0 ? (
                                <span className="inline-flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 font-medium">
                                  <strong className="text-gray-900 dark:text-white font-bold">{rec.courseCount} Courses</strong>
                                  <span className="text-gray-400 font-mono">({rec.totalUnits} Units)</span>
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400 italic">
                                  No courses configured yet
                                </span>
                              )}
                            </td>

                            {/* Action: View Courses */}
                            <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOffering(rec);
                                  setDetailSearch('');
                                }}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] transition-all cursor-pointer shadow-xs"
                              >
                                <span>View Courses</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Academic Progression Rule Notice Card */}
            <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-[#041801]/60 border border-gray-200 dark:border-[#138601]/25 flex items-start gap-3 text-xs text-gray-600 dark:text-green-200/80">
              <GraduationCap className="w-4 h-4 text-[#138601] dark:text-[#4bd043] shrink-0 mt-0.5" />
              <div>
                <strong className="text-gray-900 dark:text-white block mb-0.5">Automated Academic Progression Safeguard</strong>
                Your registered course table reflects only the academic levels and semesters you are eligible to view based on your matriculation cohort. Future levels and upcoming semesters will unlock automatically as you advance.
              </div>
            </div>

          </div>
        ) : (
          /* ==================================================================== */
          /* VIEW 2: COURSE DETAILS VIEW (Dedicated Exact Level/Session/Semester) */
          /* ==================================================================== */
          <div className="space-y-6 animate-in fade-in duration-150">
            
            {/* Top Navigation Bar with Back Button */}
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setSelectedOffering(null)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 hover:bg-gray-100 dark:hover:bg-[#041801] transition-colors cursor-pointer shadow-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Registered Courses Overview</span>
              </button>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-400">Showing:</span>
                <span className="font-bold text-gray-900 dark:text-white">{selectedOffering.level}</span>
                <span className="text-gray-400">•</span>
                <span className="font-semibold text-gray-700 dark:text-gray-200">{selectedOffering.semester}</span>
              </div>
            </div>

            {/* Course Details Header Card with Summary Metrics */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-[#138601]/10 text-[#138601] dark:text-[#4bd043] border border-[#138601]/25">
                    {selectedOffering.level}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-[#041801] text-gray-700 dark:text-green-200">
                    {selectedOffering.academicSession} Session
                  </span>
                  {selectedOffering.isCurrent && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-green-100 text-[#138601] dark:bg-green-950 dark:text-[#4bd043]">
                      Active Semester
                    </span>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {selectedOffering.level} — {selectedOffering.semester} Course List
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-green-200/80 mt-1">
                  Departmental syllabus modules, accredited credit loads, and faculty lecturer assignments.
                </p>
              </div>

              {/* Summary Badges: Total Courses & Total Credit Units */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 text-center min-w-[100px]">
                  <span className="text-[10px] text-gray-400 dark:text-green-200/60 uppercase font-bold block">Courses</span>
                  <span className="text-lg font-extrabold text-gray-900 dark:text-white">
                    {currentOfferingCourses.length}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 text-center min-w-[110px]">
                  <span className="text-[10px] text-gray-400 dark:text-green-200/60 uppercase font-bold block">Credit Load</span>
                  <span className="text-lg font-extrabold text-[#138601] dark:text-[#4bd043]">
                    {currentOfferingTotalUnits} Units
                  </span>
                </div>
              </div>
            </div>

            {/* Search Filter Bar (if courses exist) */}
            {currentOfferingCourses.length > 0 && (
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 shadow-xs flex items-center justify-between gap-3">
                <div className="relative w-full max-w-sm">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={detailSearch}
                    onChange={(e) => setDetailSearch(e.target.value)}
                    placeholder="Search by course code, title, lecturer..."
                    className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#138601]"
                  />
                  {detailSearch && (
                    <button
                      type="button"
                      onClick={() => setDetailSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <span className="text-xs text-gray-500 dark:text-green-200/70 hidden sm:inline">
                  Showing <strong>{currentOfferingCourses.length}</strong> registered subjects
                </span>
              </div>
            )}

            {/* Course List Table */}
            <div className="rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 overflow-hidden shadow-xs">
              {currentOfferingCourses.length === 0 ? (
                <div className="p-12 text-center space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 flex items-center justify-center text-[#138601] dark:text-[#4bd043]">
                    <BookOpen className="w-7 h-7" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      No courses configured for this academic record
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-green-200/80 leading-relaxed">
                      No departmental course entries have been configured in the database for <strong>{selectedOffering.level} — {selectedOffering.semester} ({selectedOffering.academicSession})</strong> yet.
                    </p>
                  </div>
                  <div className="pt-2">
                    <a
                      href={futoPortalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] cursor-pointer"
                    >
                      <span>Check FUTO School Portal</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 dark:bg-[#041801] border-b border-gray-200 dark:border-[#138601]/30 text-gray-600 dark:text-green-200/80 uppercase tracking-wider text-[10px] font-bold">
                      <tr>
                        <th className="py-4 px-4 sm:px-6">Course Code</th>
                        <th className="py-4 px-4 sm:px-6">Course Title</th>
                        <th className="py-4 px-4 sm:px-6">Credit Units</th>
                        <th className="py-4 px-4 sm:px-6">Course Type</th>
                        <th className="py-4 px-4 sm:px-6">Lecturer</th>
                        <th className="py-4 px-4 sm:px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-[#138601]/20">
                      {currentOfferingCourses.map((c) => (
                        <tr 
                          key={c.id || c.code} 
                          className="hover:bg-gray-50/60 dark:hover:bg-[#041801]/40 transition-colors"
                        >
                          {/* Code */}
                          <td className="py-4 px-4 sm:px-6 whitespace-nowrap">
                            <span className="font-extrabold text-[#138601] dark:text-[#4bd043] bg-emerald-50 dark:bg-[#041801] px-2.5 py-1 rounded-md border border-[#138601]/20 font-mono text-xs">
                              {c.code}
                            </span>
                          </td>

                          {/* Title */}
                          <td className="py-4 px-4 sm:px-6">
                            <p className="font-bold text-gray-900 dark:text-white leading-snug">{c.title}</p>
                            {c.description && (
                              <p className="text-[11px] text-gray-500 dark:text-green-200/70 line-clamp-1 mt-0.5">
                                {c.description}
                              </p>
                            )}
                          </td>

                          {/* Units */}
                          <td className="py-4 px-4 sm:px-6 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                              {c.credit_units} Units
                            </span>
                          </td>

                          {/* Type */}
                          <td className="py-4 px-4 sm:px-6 whitespace-nowrap">
                            <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300">
                              {c.course_type}
                            </span>
                          </td>

                          {/* Lecturer */}
                          <td className="py-4 px-4 sm:px-6 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                              <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span>{c.lecturer || 'Faculty Lecturer'}</span>
                            </div>
                          </td>

                          {/* Actions: View Outline & Materials */}
                          <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setActiveCourseModal(c)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-[#041801] hover:bg-gray-100 dark:hover:bg-[#138601]/30 border border-gray-200 dark:border-[#138601]/30 transition-colors cursor-pointer"
                              >
                                View Outline
                              </button>

                              <a
                                href={`${resourceHubUrl}?search=${encodeURIComponent(c.code)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] transition-colors cursor-pointer"
                              >
                                <span>Materials</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Back Button Footer */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedOffering(null)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 hover:bg-gray-100 cursor-pointer shadow-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Registered Courses Overview</span>
              </button>
            </div>

          </div>
        )}

        {/* ─── COURSE SYLLABUS & DETAILS MODAL ─── */}
        {activeCourseModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              
              {/* Modal Header */}
              <div className="p-5 border-b border-gray-100 dark:border-[#138601]/25 flex items-center justify-between gap-3 shrink-0 bg-gray-50/70 dark:bg-[#041801]/60">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-green-50 dark:bg-[#041801] text-[#138601] dark:text-[#4bd043] border border-[#138601]/30 font-mono">
                      {activeCourseModal.code}
                    </span>
                    <span className="text-xs font-medium text-gray-500 dark:text-green-200/70">
                      {activeCourseModal.level} • {activeCourseModal.semester} ({activeCourseModal.academic_session})
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
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{activeCourseModal.credit_units} Credit Units</span>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30">
                    <span className="text-[10px] text-gray-400 dark:text-green-200/60 uppercase font-bold block">Type</span>
                    <span className="text-xs font-bold text-[#138601] dark:text-[#4bd043] truncate block">{activeCourseModal.course_type || 'Core / Compulsory'}</span>
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
