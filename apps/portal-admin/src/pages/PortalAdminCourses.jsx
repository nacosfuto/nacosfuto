import React, { useState, useEffect, useMemo } from 'react';
import PortalAdminLayout from '../components/PortalAdminLayout';
import { 
  BookOpen, 
  Search, 
  Plus, 
  Filter, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  X, 
  User, 
  Building2, 
  Award, 
  Layers, 
  Lock, 
  FileText,
  Clock,
  Sparkles,
  Loader,
  Calendar,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  AlertCircle,
  GraduationCap
} from 'lucide-react';
import { 
  fetchCourses, 
  fetchCourseOfferingsGrouped,
  adminCreateCourse, 
  adminUpdateCourse, 
  adminDeleteCourse 
} from '@nacos/supabase';
import { getPortalAdminSession, canAccessLevel, getAccessibleLevels } from '@nacos/auth';
import { 
  getActiveAcademicSession, 
  getActiveAcademicSemester, 
  SUPPORTED_ACADEMIC_SESSIONS,
  SUPPORTED_ACADEMIC_SEMESTERS,
  parseSessionYears 
} from '@nacos/config/academic';

export default function PortalAdminCourses() {
  const [courses, setCourses] = useState([]);
  const [groupedOfferings, setGroupedOfferings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [selectedSession, setSelectedSession] = useState('All');
  const [selectedSemester, setSelectedSemester] = useState('All');
  const [toastMessage, setToastMessage] = useState(null);

  // Admin session & level scoping
  const [adminSession, setAdminSession] = useState(null);

  // Modals & Active Offering Details State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [viewingOffering, setViewingOffering] = useState(null); // When an admin clicks "View / Edit" on a row
  const [previewCourseSyllabus, setPreviewCourseSyllabus] = useState(null);
  const [deleteConfirmCourse, setDeleteConfirmCourse] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    credit_units: 3,
    level: '100 Level',
    semester: getActiveAcademicSemester(),
    academic_session: getActiveAcademicSession(),
    course_type: 'Core / Compulsory',
    lecturer_name: '',
    office: '',
    prerequisites: 'None',
    description: '',
    syllabus: ''
  });

  useEffect(() => {
    const session = getPortalAdminSession();
    setAdminSession(session);
    if (session?.assigned_level && session.assigned_level !== 'all') {
      const clean = session.assigned_level.replace(/[^0-9]/g, '');
      setSelectedLevel(`${clean}L`);
      setFormData(prev => ({ ...prev, level: `${clean} Level` }));
    }
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [coursesRes, offeringsRes] = await Promise.all([
        fetchCourses(),
        fetchCourseOfferingsGrouped()
      ]);
      if (coursesRes.data) setCourses(coursesRes.data);
      if (offeringsRes.data) setGroupedOfferings(offeringsRes.data);

      // If an offering is currently open in detail modal, refresh its courses
      if (viewingOffering) {
        const refreshedGroup = (offeringsRes.data || []).find(
          g => g.level === viewingOffering.level && 
               g.academicSession === viewingOffering.academicSession && 
               g.semester === viewingOffering.semester
        );
        if (refreshedGroup) {
          setViewingOffering(refreshedGroup);
        }
      }
    } catch (e) {
      console.error('Error loading course curriculum data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('nacos_courses_updated', handleUpdate);
    return () => window.removeEventListener('nacos_courses_updated', handleUpdate);
  }, []);

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const isLevelRestricted = Boolean(
    adminSession?.assigned_level && 
    adminSession.assigned_level !== 'all' && 
    !adminSession.is_super_admin
  );

  const accessibleLevels = useMemo(() => {
    return getAccessibleLevels(adminSession);
  }, [adminSession]);

  const levelOptions = useMemo(() => {
    if (isLevelRestricted) {
      const clean = adminSession.assigned_level.replace(/[^0-9]/g, '');
      return [`${clean}L`];
    }
    return ['All', '100L', '200L', '300L', '400L', '500L'];
  }, [isLevelRestricted, adminSession]);

  // Available sessions in courses plus defaults
  const sessionOptions = useMemo(() => {
    const fromCourses = Array.from(new Set(courses.map(c => c.academic_session).filter(Boolean)));
    const combined = Array.from(new Set([...SUPPORTED_ACADEMIC_SESSIONS, ...fromCourses]));
    return combined.sort((a, b) => parseSessionYears(b).startYear - parseSessionYears(a).startYear);
  }, [courses]);

  // Filtered Grouped Offerings for the main table
  const filteredOfferings = useMemo(() => {
    return groupedOfferings.filter((offering) => {
      // Level authority guard
      if (!canAccessLevel(adminSession, offering.level)) {
        return false;
      }

      // Level filter
      if (selectedLevel !== 'All') {
        const cleanLvl = selectedLevel.replace('L', '');
        if (!offering.level.includes(cleanLvl)) return false;
      }

      // Session filter
      if (selectedSession !== 'All' && offering.academicSession !== selectedSession) {
        return false;
      }

      // Semester filter
      if (selectedSemester !== 'All' && offering.semester !== selectedSemester) {
        return false;
      }

      // Search query (matches level, session, semester, or course code/title in offering)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchMeta = 
          offering.level.toLowerCase().includes(q) ||
          offering.academicSession.toLowerCase().includes(q) ||
          offering.semester.toLowerCase().includes(q);

        const matchCourse = offering.courses.some(c => 
          (c.code || '').toLowerCase().includes(q) ||
          (c.title || '').toLowerCase().includes(q) ||
          (c.lecturer || '').toLowerCase().includes(q)
        );

        if (!matchMeta && !matchCourse) return false;
      }

      return true;
    });
  }, [groupedOfferings, selectedLevel, selectedSession, selectedSemester, searchQuery, adminSession]);

  // Overall statistics
  const totalAccreditedCourses = useMemo(() => courses.length, [courses]);
  const totalCreditLoad = useMemo(() => courses.reduce((acc, c) => acc + (Number(c.credit_units) || 0), 0), [courses]);
  const totalOfferingsCount = useMemo(() => groupedOfferings.length, [groupedOfferings]);

  // Open Add Course Modal with clean default values
  const handleOpenCreate = (preset = {}) => {
    const defaultLevel = isLevelRestricted
      ? `${adminSession.assigned_level.replace(/[^0-9]/g, '')} Level`
      : selectedLevel !== 'All'
        ? `${selectedLevel.replace('L', '')} Level`
        : (preset.level || '100 Level');

    setEditingCourse(null);
    setFormData({
      code: '',
      title: '',
      credit_units: 3,
      level: preset.level || defaultLevel,
      semester: preset.semester || (selectedSemester !== 'All' ? selectedSemester : getActiveAcademicSemester()),
      academic_session: preset.academicSession || (selectedSession !== 'All' ? selectedSession : getActiveAcademicSession()),
      course_type: 'Core / Compulsory',
      lecturer_name: '',
      office: 'Computer Science Dept',
      prerequisites: 'None',
      description: '',
      syllabus: ''
    });
    setIsFormModalOpen(true);
  };

  // Open Edit Course Modal
  const handleOpenEdit = (course) => {
    setEditingCourse(course);
    setFormData({
      code: course.code || '',
      title: course.title || '',
      credit_units: course.credit_units || 3,
      level: course.level || '100 Level',
      semester: course.semester || 'First Semester',
      academic_session: course.academic_session || getActiveAcademicSession(),
      course_type: course.course_type || 'Core / Compulsory',
      lecturer_name: course.lecturer || course.lecturer_name || '',
      office: course.office || '',
      prerequisites: course.prerequisites || 'None',
      description: course.description || '',
      syllabus: Array.isArray(course.syllabus) ? course.syllabus.join('\n') : (course.syllabus || '')
    });
    setIsFormModalOpen(true);
  };

  // Handle Save Course (Create or Update)
  const handleSaveCourse = async (e) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      showToast('Course code is required (e.g. CSC 101)', 'error');
      return;
    }
    if (!formData.title.trim()) {
      showToast('Course title is required', 'error');
      return;
    }
    if (!formData.academic_session.trim()) {
      showToast('Academic session is required', 'error');
      return;
    }

    try {
      setIsSaving(true);
      if (editingCourse) {
        const res = await adminUpdateCourse(editingCourse.id, formData);
        if (!res.success) {
          showToast(res.error || 'Failed to update course', 'error');
          return;
        }
        showToast(`Course "${formData.code.toUpperCase()}" updated successfully`);
      } else {
        const res = await adminCreateCourse(formData);
        if (!res.success) {
          showToast(res.error || 'Failed to create course', 'error');
          return;
        }
        showToast(`Course "${formData.code.toUpperCase()}" registered successfully for ${formData.academic_session}`);
      }
      setIsFormModalOpen(false);
      await loadData();
    } catch (err) {
      showToast(err.message || 'Error saving course', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete Course
  const handleDeleteCourse = async () => {
    if (!deleteConfirmCourse) return;
    try {
      setIsDeleting(true);
      const res = await adminDeleteCourse(deleteConfirmCourse.id);
      if (!res.success) {
        showToast(res.error || 'Failed to delete course', 'error');
        return;
      }
      showToast(`Course ${deleteConfirmCourse.code} deleted successfully`);
      setDeleteConfirmCourse(null);
      await loadData();
    } catch (e) {
      showToast('Failed to delete course', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <PortalAdminLayout 
      title="Registered Courses Management"
      subtitle="Configure accredited curriculum offerings, academic sessions, semester distributions, and credit allocations"
    >
      <div className="space-y-6 font-sans">
        
        {/* Toast Alert */}
        {toastMessage && (
          <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-bottom-5 ${
            toastMessage.type === 'error' 
              ? 'bg-red-600 text-white' 
              : 'bg-[#138601] text-white border border-green-500/30'
          }`}>
            {toastMessage.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Level Restriction Alert Banner if Coordinator */}
        {isLevelRestricted && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 flex items-center justify-between gap-3 text-amber-900 dark:text-amber-200 text-xs">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Academic Scope Restriction Active:</strong> Your administrative permissions are restricted to <strong>{adminSession.assigned_level} Level</strong> courses and students.
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded font-bold uppercase text-[10px] bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
              {adminSession.assigned_level}L Coordinator
            </span>
          </div>
        )}

        {/* ─── Metric Cards Row (Matches ID Card & Payments Tables) ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 space-y-1 shadow-xs">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-green-200/70 block">Course Offerings</span>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalOfferingsCount}</div>
            <span className="text-[10px] text-gray-400 dark:text-green-300/60">Distinct Level-Session groups</span>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 space-y-1 shadow-xs">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-green-200/70 block">Accredited Courses</span>
            <div className="text-2xl font-bold text-[#138601] dark:text-[#4bd043]">{totalAccreditedCourses}</div>
            <span className="text-[10px] text-gray-400 dark:text-green-300/60">Registered in live database</span>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 space-y-1 shadow-xs">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-green-200/70 block">Total Credit Units</span>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalCreditLoad} Units</div>
            <span className="text-[10px] text-gray-400 dark:text-green-300/60">Cumulative curriculum weight</span>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 space-y-1 shadow-xs">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-green-200/70 block">Active Academic Session</span>
            <div className="text-lg font-bold text-gray-900 dark:text-white truncate">{getActiveAcademicSession()}</div>
            <span className="text-[10px] text-[#138601] dark:text-[#4bd043] font-medium">{getActiveAcademicSemester()}</span>
          </div>
        </div>

        {/* ─── Top Control Header ─── */}
        <div className="p-5 sm:p-6 rounded-xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/25 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#138601] dark:text-[#4bd043] uppercase tracking-wider mb-1">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Registered Courses Management</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Course Offerings by Level & Session
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-green-200/80 mt-1">
              Courses grouped by academic level, academic session, and semester. Use <strong>View Courses</strong> to manage individual subjects.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenCreate()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#138601] hover:bg-[#0f6c01] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Course</span>
            </button>
          </div>
        </div>

        {/* ─── Filter & Search Bar (Matching ID Card & Payments pages) ─── */}
        <div className="bg-white dark:bg-[#083002] rounded-xl p-4 border border-gray-200 dark:border-[#138601]/25 shadow-xs flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          
          {/* Search Box */}
          <div className="relative w-full lg:max-w-xs">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search course code, title, level, session..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-lg border border-gray-200 dark:border-[#138601]/30 bg-gray-50/50 dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#138601]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Level Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              <span className="text-[11px] font-semibold text-gray-400 mr-1 flex items-center gap-1 shrink-0">
                <Filter className="w-3 h-3" /> Level:
              </span>
              {levelOptions.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSelectedLevel(lvl)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                    selectedLevel === lvl
                      ? 'bg-[#138601] text-white shadow-xs'
                      : 'bg-gray-100 dark:bg-[#041801] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#138601]/20 border border-gray-200 dark:border-[#138601]/20'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            {/* Session Dropdown */}
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-semibold text-gray-400 shrink-0">Session:</label>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-[#138601] cursor-pointer"
              >
                <option value="All">All Sessions</option>
                {sessionOptions.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Semester Filter */}
            <div className="flex items-center gap-1">
              {['All', 'First Semester', 'Second Semester'].map((sem) => (
                <button
                  key={sem}
                  type="button"
                  onClick={() => setSelectedSemester(sem)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                    selectedSemester === sem
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-[#041801] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#138601]/20 border border-gray-200 dark:border-[#138601]/20'
                  }`}
                >
                  {sem === 'All' ? 'All Semesters' : sem.replace(' Semester', '')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ─── GROUPED COURSE OFFERINGS TABLE ─── */}
        <div className="rounded-xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 overflow-hidden shadow-xs">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-gray-500 dark:text-green-200/70">
              <Loader className="w-6 h-6 animate-spin text-[#138601] mx-auto mb-2" />
              Loading curriculum catalog from database...
            </div>
          ) : filteredOfferings.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <BookOpen className="w-10 h-10 text-gray-400 dark:text-green-300/40 mx-auto" />
              <p className="text-sm font-bold text-gray-800 dark:text-white">No course offerings match your filter</p>
              <p className="text-xs text-gray-500 dark:text-green-200/70 max-w-sm mx-auto">
                No courses are registered for this level, session, or semester. Click below to add courses to the catalog.
              </p>
              <button
                type="button"
                onClick={() => handleOpenCreate()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Course</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-[#041801] border-b border-gray-200 dark:border-[#138601]/30 text-gray-600 dark:text-green-200/80 uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Level</th>
                    <th className="py-3.5 px-4 sm:px-6">Academic Session</th>
                    <th className="py-3.5 px-4 sm:px-6">Semester</th>
                    <th className="py-3.5 px-4 sm:px-6">Courses</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#138601]/20">
                  {filteredOfferings.map((offering) => {
                    const isCurrent = offering.academicSession === getActiveAcademicSession() && 
                                     offering.semester === getActiveAcademicSemester();

                    return (
                      <tr 
                        key={offering.key} 
                        className="hover:bg-gray-50/60 dark:hover:bg-[#041801]/40 transition-colors"
                      >
                        {/* Level */}
                        <td className="py-4 px-4 sm:px-6 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-gray-900 dark:text-white text-xs sm:text-sm">
                              {offering.level}
                            </span>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 dark:bg-green-950/60 text-[#138601] dark:text-[#4bd043] border border-green-300 dark:border-green-800/40">
                                Active Now
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Academic Session */}
                        <td className="py-4 px-4 sm:px-6 whitespace-nowrap font-mono text-xs sm:text-sm text-gray-700 dark:text-gray-200">
                          {offering.academicSession}
                        </td>

                        {/* Semester */}
                        <td className="py-4 px-4 sm:px-6 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                            offering.semester.includes('First')
                              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40'
                              : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40'
                          }`}>
                            {offering.semester}
                          </span>
                        </td>

                        {/* Courses Count */}
                        <td className="py-4 px-4 sm:px-6 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 dark:text-white">
                              {offering.courseCount} {offering.courseCount === 1 ? 'course' : 'courses'}
                            </span>
                            <span className="text-[11px] text-gray-400 dark:text-green-300/60 font-mono">
                              ({offering.totalUnits} Units)
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setViewingOffering(offering)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] transition-all cursor-pointer shadow-xs"
                          >
                            <span>View / Edit</span>
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

        {/* ─── DEDICATED VIEW / EDIT OFFERING MODAL (Courses inside combination) ─── */}
        {viewingOffering && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
            <div className="bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
              
              {/* Header */}
              <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-[#138601]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/70 dark:bg-[#041801]/60 shrink-0">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-[#138601]/10 text-[#138601] dark:text-[#4bd043] border border-[#138601]/20">
                      {viewingOffering.level}
                    </span>
                    <span className="text-xs font-medium text-gray-500 dark:text-green-200/70">
                      {viewingOffering.academicSession} Session • {viewingOffering.semester}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {viewingOffering.level} — {viewingOffering.semester} Course List
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-green-200/70 mt-0.5">
                    {viewingOffering.courses.length} courses registered • Total {viewingOffering.totalUnits} credit units
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenCreate({
                      level: viewingOffering.level,
                      semester: viewingOffering.semester,
                      academicSession: viewingOffering.academicSession
                    })}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Course to this Semester</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewingOffering(null)}
                    className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#041801] cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Table of courses in this offering */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                {viewingOffering.courses.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500">
                    No individual courses found for this combination.
                  </div>
                ) : (
                  <div className="border border-gray-200 dark:border-[#138601]/30 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 dark:bg-[#041801] border-b border-gray-200 dark:border-[#138601]/30 text-gray-600 dark:text-green-200/80 uppercase tracking-wider text-[10px] font-bold">
                        <tr>
                          <th className="py-3 px-4">Code</th>
                          <th className="py-3 px-4">Course Title</th>
                          <th className="py-3 px-4">Units</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Lecturer</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-[#138601]/20">
                        {viewingOffering.courses.map((c) => (
                          <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-[#041801]/40 transition-colors">
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="font-extrabold text-[#138601] dark:text-[#4bd043] bg-emerald-50 dark:bg-[#041801] px-2 py-0.5 rounded border border-[#138601]/20 font-mono">
                                {c.code}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <p className="font-bold text-gray-900 dark:text-white leading-snug">{c.title}</p>
                              {c.description && (
                                <p className="text-[11px] text-gray-500 dark:text-green-200/60 line-clamp-1 mt-0.5">{c.description}</p>
                              )}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                                {c.credit_units} Units
                              </span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">
                                {c.course_type}
                              </span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                              <div className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-gray-400" />
                                <span>{c.lecturer || 'Faculty Lecturer'}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setPreviewCourseSyllabus(c)}
                                  className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#041801] transition-colors cursor-pointer"
                                  title="View Outline"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(c)}
                                  className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-[#041801] transition-colors cursor-pointer"
                                  title="Edit Course"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmCourse(c)}
                                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-[#041801] transition-colors cursor-pointer"
                                  title="Delete Course"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-100 dark:border-[#138601]/25 flex items-center justify-between bg-gray-50 dark:bg-[#041801]">
                <span className="text-xs text-gray-500 dark:text-green-200/70">
                  Modifications persist directly to the authoritative database.
                </span>
                <button
                  type="button"
                  onClick={() => setViewingOffering(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 hover:bg-gray-100 cursor-pointer"
                >
                  Close View
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── ADD / EDIT COURSE MODAL ─── */}
        {isFormModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden p-6 space-y-4 my-8">
              
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#138601]/20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#138601]/10 text-[#138601] dark:text-[#4bd043] flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      {editingCourse ? `Edit Course: ${editingCourse.code}` : 'Register New Course'}
                    </h3>
                    <p className="text-[11px] text-gray-400 dark:text-green-200/60">
                      Fill all required fields to register course in official curriculum
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveCourse} className="space-y-4 text-xs">
                
                {/* Academic Level, Session, and Semester */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                      Academic Level *
                    </label>
                    <select
                      disabled={isLevelRestricted}
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                      className={`w-full p-2.5 rounded-lg border border-gray-200 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white font-medium ${
                        isLevelRestricted ? 'opacity-70 cursor-not-allowed' : ''
                      }`}
                    >
                      {['100 Level', '200 Level', '300 Level', '400 Level', '500 Level'].map(lvl => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                      Academic Session *
                    </label>
                    <select
                      value={formData.academic_session}
                      onChange={(e) => setFormData({ ...formData, academic_session: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white font-medium"
                    >
                      {sessionOptions.map(sess => (
                        <option key={sess} value={sess}>{sess}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                      Semester *
                    </label>
                    <select
                      value={formData.semester}
                      onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white font-medium"
                    >
                      <option value="First Semester">First Semester</option>
                      <option value="Second Semester">Second Semester</option>
                    </select>
                  </div>
                </div>

                {/* Course Code, Title, Units */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                      Course Code *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CSC 101"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white font-bold font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                      Course Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Introduction to Computer Science"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                      Credit Units *
                    </label>
                    <select
                      value={formData.credit_units}
                      onChange={(e) => setFormData({ ...formData, credit_units: parseInt(e.target.value, 10) })}
                      className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white font-bold"
                    >
                      {[1, 2, 3, 4, 6].map(u => (
                        <option key={u} value={u}>{u} {u === 1 ? 'Unit' : 'Units'}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Course Type and Prerequisites */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                      Course Type / Classification
                    </label>
                    <select
                      value={formData.course_type}
                      onChange={(e) => setFormData({ ...formData, course_type: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white"
                    >
                      <option value="Core / Compulsory">Core / Compulsory</option>
                      <option value="General / Faculty">General / Faculty</option>
                      <option value="Departmental Elective">Departmental Elective</option>
                      <option value="Industrial Training">Industrial Training</option>
                      <option value="Capstone Project">Capstone Project</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                      Prerequisites
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. None or CSC 101"
                      value={formData.prerequisites}
                      onChange={(e) => setFormData({ ...formData, prerequisites: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Lecturer and Office */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                      Lecturer In Charge
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. C. C. Nwokorie"
                      value={formData.lecturer_name}
                      onChange={(e) => setFormData({ ...formData, lecturer_name: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                      Office Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Computer Science Dept Block B, Rm 104"
                      value={formData.office}
                      onChange={(e) => setFormData({ ...formData, office: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    Course Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Brief description of the course content and learning goals..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white"
                  />
                </div>

                {/* Syllabus */}
                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    Syllabus Topics <span className="font-normal text-gray-400">(one topic per line)</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Topic 1: Foundations of computing&#10;Topic 2: Memory addressing&#10;Topic 3: Algorithm complexity"
                    value={formData.syllabus}
                    onChange={(e) => setFormData({ ...formData, syllabus: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white font-mono text-[11px]"
                  />
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-[#138601]/20">
                  <button
                    type="button"
                    onClick={() => setIsFormModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#041801] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-[#138601] hover:bg-[#0f6c01] text-white font-bold rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSaving ? <Loader className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>{isSaving ? 'Saving to Database...' : editingCourse ? 'Save Changes' : 'Register Course'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── SYLLABUS PREVIEW MODAL ─── */}
        {previewCourseSyllabus && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#138601]/20">
                <div>
                  <span className="text-xs font-bold text-[#138601] dark:text-[#4bd043]">{previewCourseSyllabus.code}</span>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">{previewCourseSyllabus.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewCourseSyllabus(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
                    {previewCourseSyllabus.credit_units} Credit Units
                  </span>
                  <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-[#041801] text-gray-700 dark:text-gray-300 font-semibold">
                    {previewCourseSyllabus.level} • {previewCourseSyllabus.semester}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-[#041801] text-[#138601] font-semibold">
                    {previewCourseSyllabus.course_type}
                  </span>
                </div>

                {previewCourseSyllabus.description && (
                  <div>
                    <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-1">Description</h4>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{previewCourseSyllabus.description}</p>
                  </div>
                )}

                <div>
                  <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-1.5">Syllabus Breakdown</h4>
                  {(Array.isArray(previewCourseSyllabus.syllabus) ? previewCourseSyllabus.syllabus : []).length === 0 ? (
                    <p className="text-gray-400 italic">No syllabus topics listed yet.</p>
                  ) : (
                    <ul className="space-y-1.5 list-disc list-inside text-gray-600 dark:text-gray-300">
                      {previewCourseSyllabus.syllabus.map((topic, i) => (
                        <li key={i}>{topic}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── DELETE CONFIRMATION MODAL ─── */}
        {deleteConfirmCourse && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#083002] border border-gray-200 dark:border-red-500/40 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3 text-red-600">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Delete Course?</h3>
                  <p className="text-[11px] text-gray-500">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                Are you sure you want to delete <strong>{deleteConfirmCourse.code} — {deleteConfirmCourse.title}</strong> ({deleteConfirmCourse.academic_session})? It will be removed from student course registration.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmCourse(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#041801] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteCourse}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  {isDeleting ? <Loader className="w-3 h-3 animate-spin" /> : null}
                  <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </PortalAdminLayout>
  );
}
