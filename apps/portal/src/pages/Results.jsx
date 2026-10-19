import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  GraduationCap,
  Award,
  BookOpen,
  Download,
  Save,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  FileText,
  Sparkles,
  Calculator,
  HelpCircle,
  Check,
  Trash2,
  Loader2,
  Info,
  Layers,
  AlertTriangle
} from 'lucide-react';
import PortalLayout from '../components/PortalLayout';
import { 
  fetchCourses, 
  fetchAcademicSettingsFromDatabase,
  fetchStudentSavedResults,
  saveStudentCourseResult,
  batchSaveStudentCourseResults,
  deleteStudentCourseResult
} from '@nacos/supabase';
import {
  scoreToGrade,
  letterGradeToPoint,
  calculateQualityPoints,
  calculateSemesterGPA,
  calculateCumulativeCGPA,
  getDegreeClass,
  validateScore,
  validateGrade,
  DEFAULT_SCORE_BOUNDARIES,
  SUPPORTED_LETTER_GRADES,
  DEGREE_CLASSIFICATIONS
} from '@nacos/config/grading';
import {
  calculateAcademicProgression,
  getActiveAcademicSession,
  getActiveAcademicSemester,
  onAcademicSessionChange,
  onAcademicSemesterChange,
  getEligibleAcademicRecords
} from '@nacos/config/academic';
import { generateAcademicRecordPdf } from '../utils/generateAcademicRecordPdf';

const Results = () => {
  // Current Student Context
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

  // Authoritative Academic Settings State
  const [activeSession, setActiveSession] = useState(getActiveAcademicSession);
  const [activeSemester, setActiveSemester] = useState(getActiveAcademicSemester);

  // Synchronize student profile, database settings, and real-time session changes
  useEffect(() => {
    fetchAcademicSettingsFromDatabase()
      .then((settings) => {
        if (settings?.academicSession) setActiveSession(settings.academicSession);
        if (settings?.activeSemester) setActiveSemester(settings.activeSemester);
      })
      .catch(() => {});

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

  // Determine current student level (100, 200, 300, 400, 500)
  const progression = useMemo(() => {
    return calculateAcademicProgression(user, activeSession);
  }, [user, activeSession]);

  const currentLevel = useMemo(() => {
    if (user.is_graduated || user.level === 'Graduated' || String(user.level).toLowerCase().includes('graduat')) {
      return 500;
    }
    if (progression && progression.valid && progression.numericLevel) {
      return Math.min(500, Math.max(100, progression.numericLevel * 100));
    }
    const levelStr = (user.level || user.current_level || '').toString();
    const match = levelStr.match(/(\d{3})/);
    return match ? parseInt(match[1], 10) : 100;
  }, [user, progression]);

  // Authoritative progression-filtered academic records (Section 4 & 8)
  const eligibleRecords = useMemo(() => {
    return getEligibleAcademicRecords(user, {
      currentYearStart: activeSession,
      currentSemester: activeSemester
    });
  }, [user, activeSession, activeSemester]);

  // Database Courses & Saved Results State
  const [coursesList, setCoursesList] = useState([]);
  const [savedResultsMap, setSavedResultsMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // View Navigation: null = Overview Table, Object = Active Semester Details View
  const [selectedOffering, setSelectedOffering] = useState(null);

  // Local working draft of course results: { [courseId]: { entryMode, score, grade, gradePoint, qualityPoints, isDirty, error } }
  const [draftResults, setDraftResults] = useState({});

  // Feedback notifications & action states
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [saveToast, setSaveToast] = useState(null); // { type: 'success'|'error', message: string }
  const [modeConfirmModal, setModeConfirmModal] = useState(null); // { course, targetMode }

  // Load courses catalogue and student's saved results from Supabase
  const loadData = useCallback(async () => {
    const studentId = user?.registration_number || user?.matric_number || user?.matric || user?.id || '';
    setIsLoading(true);

    try {
      const [coursesRes, resultsRes] = await Promise.all([
        fetchCourses(),
        studentId ? fetchStudentSavedResults(studentId) : Promise.resolve({ mapByCourseId: {}, data: [] })
      ]);

      if (coursesRes && coursesRes.data) {
        setCoursesList(coursesRes.data);
      } else {
        setCoursesList([]);
      }

      if (resultsRes && resultsRes.mapByCourseId) {
        setSavedResultsMap(resultsRes.mapByCourseId);

        // Pre-populate drafts from saved results
        const drafts = {};
        Object.entries(resultsRes.mapByCourseId).forEach(([cId, res]) => {
          drafts[cId] = {
            entryMode: res.entry_mode || 'score',
            score: res.score !== null && res.score !== undefined ? String(res.score) : '',
            grade: res.grade || '',
            gradePoint: res.grade_point !== null && res.grade_point !== undefined ? res.grade_point : null,
            qualityPoints: res.quality_points !== null && res.quality_points !== undefined ? res.quality_points : null,
            isDirty: false,
            error: null
          };
        });
        setDraftResults(drafts);
      }
    } catch (err) {
      console.warn('Error loading courses or saved results:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();

    const handleCoursesUpdate = () => loadData();
    const handleResultsUpdate = () => loadData();

    window.addEventListener('nacos_courses_updated', handleCoursesUpdate);
    window.addEventListener('nacos_results_updated', handleResultsUpdate);

    let bc = null;
    try {
      if (typeof window !== 'undefined' && window.BroadcastChannel) {
        bc = new BroadcastChannel('nacos_results_sync');
        bc.onmessage = () => loadData();
      }
    } catch (_) {}

    return () => {
      window.removeEventListener('nacos_courses_updated', handleCoursesUpdate);
      window.removeEventListener('nacos_results_updated', handleResultsUpdate);
      if (bc) bc.close();
    };
  }, [loadData]);

  // Auto-dismiss save toast
  useEffect(() => {
    if (saveToast) {
      const timer = setTimeout(() => setSaveToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [saveToast]);

  // Combine eligible records with corresponding courses and current draft results
  const enrichedSemesters = useMemo(() => {
    return eligibleRecords.map((rec) => {
      // Find matching courses for this level, session, and semester
      const matchingCourses = coursesList.filter((c) => {
        const matchesLevel = (c.level || '').includes(String(rec.numericLevel));
        const matchesSession = c.academic_session === rec.academicSession;
        const matchesSemester = (c.semester || '').toLowerCase() === (rec.semester || '').toLowerCase();
        return matchesLevel && matchesSession && matchesSemester;
      });

      // Enrich each course with draft or saved grade
      const coursesWithResults = matchingCourses.map((c) => {
        const draft = draftResults[c.id];
        const saved = savedResultsMap[c.id];

        const entryMode = draft ? draft.entryMode : (saved?.entry_mode || 'score');
        const score = draft ? draft.score : (saved?.score !== null && saved?.score !== undefined ? saved.score : '');
        const grade = draft ? draft.grade : (saved?.grade || '');
        const gradePoint = draft ? draft.gradePoint : (saved?.grade_point !== undefined ? saved.grade_point : null);
        const qualityPoints = draft ? draft.qualityPoints : (saved?.quality_points !== undefined ? saved.quality_points : null);
        const isDirty = draft ? draft.isDirty : false;
        const isSaved = !!saved && !isDirty;

        return {
          ...c,
          credit_units: Number(c.credit_units) || 3,
          entryMode,
          score,
          grade,
          gradePoint,
          qualityPoints,
          isDirty,
          isSaved
        };
      });

      // Calculate semester GPA using the central grading engine
      const semStats = calculateSemesterGPA(coursesWithResults);

      return {
        ...rec,
        courses: coursesWithResults,
        courseCount: coursesWithResults.length,
        semStats
      };
    });
  }, [eligibleRecords, coursesList, draftResults, savedResultsMap]);

  // Overall Cumulative Academic Performance across all eligible semesters
  const overallCumulativeStats = useMemo(() => {
    const allEligibleCourses = [];
    enrichedSemesters.forEach((sem) => {
      sem.courses.forEach((c) => allEligibleCourses.push(c));
    });
    return calculateCumulativeCGPA(allEligibleCourses);
  }, [enrichedSemesters]);

  const degreeClassification = useMemo(() => {
    return getDegreeClass(overallCumulativeStats.cgpa);
  }, [overallCumulativeStats.cgpa]);

  // Active Semester Offering for Detailed Result Entry View
  const activeSemesterDetail = useMemo(() => {
    if (!selectedOffering) return null;
    return enrichedSemesters.find((s) => s.key === selectedOffering.key) || null;
  }, [selectedOffering, enrichedSemesters]);

  // Handle Score Input Change in Mode A
  const handleScoreChange = (course, rawVal) => {
    const cId = course.id;
    const units = Number(course.credit_units) || 3;

    if (rawVal === '') {
      setDraftResults((prev) => ({
        ...prev,
        [cId]: {
          ...(prev[cId] || {}),
          entryMode: 'score',
          score: '',
          grade: '',
          gradePoint: null,
          qualityPoints: null,
          isDirty: true,
          error: null
        }
      }));
      return;
    }

    const numVal = Number(rawVal);
    if (isNaN(numVal) || numVal < 0 || numVal > 100) {
      setDraftResults((prev) => ({
        ...prev,
        [cId]: {
          ...(prev[cId] || {}),
          entryMode: 'score',
          score: rawVal,
          error: 'Score must be between 0 and 100'
        }
      }));
      return;
    }

    const converted = scoreToGrade(numVal);
    const qp = calculateQualityPoints(units, converted.point);

    setDraftResults((prev) => ({
      ...prev,
      [cId]: {
        entryMode: 'score',
        score: rawVal,
        grade: converted.grade,
        gradePoint: converted.point,
        qualityPoints: qp,
        isDirty: true,
        error: null
      }
    }));
  };

  // Handle Direct Letter Grade Change in Mode B
  const handleGradeChange = (course, gradeVal) => {
    const cId = course.id;
    const units = Number(course.credit_units) || 3;

    if (!gradeVal) {
      setDraftResults((prev) => ({
        ...prev,
        [cId]: {
          ...(prev[cId] || {}),
          entryMode: 'grade',
          score: '',
          grade: '',
          gradePoint: null,
          qualityPoints: null,
          isDirty: true,
          error: null
        }
      }));
      return;
    }

    const cleanGrade = gradeVal.toUpperCase();
    const gp = letterGradeToPoint(cleanGrade);
    const qp = calculateQualityPoints(units, gp);

    setDraftResults((prev) => ({
      ...prev,
      [cId]: {
        entryMode: 'grade',
        score: '', // Do not fabricate numerical score
        grade: cleanGrade,
        gradePoint: gp,
        qualityPoints: qp,
        isDirty: true,
        error: null
      }
    }));
  };

  // Switch Entry Mode with safety check
  const requestModeSwitch = (course, targetMode) => {
    const cId = course.id;
    const currentDraft = draftResults[cId];
    const hasValue = (currentDraft && (currentDraft.score !== '' || currentDraft.grade !== '')) ||
                     (savedResultsMap[cId] && (savedResultsMap[cId].score !== null || savedResultsMap[cId].grade));

    if (hasValue) {
      setModeConfirmModal({
        course,
        targetMode
      });
    } else {
      applyModeSwitch(course, targetMode);
    }
  };

  const applyModeSwitch = (course, targetMode) => {
    const cId = course.id;
    setDraftResults((prev) => ({
      ...prev,
      [cId]: {
        entryMode: targetMode,
        score: '',
        grade: '',
        gradePoint: null,
        qualityPoints: null,
        isDirty: true,
        error: null
      }
    }));
    setModeConfirmModal(null);
  };

  // Clear / Reset a course result
  const handleClearCourseResult = async (course) => {
    const cId = course.id;
    const regNo = user?.registration_number || user?.matric_number || '';
    const saved = savedResultsMap[cId];

    if (saved && regNo) {
      setIsSaving(true);
      try {
        await deleteStudentCourseResult({
          registrationNumber: regNo,
          courseId: cId,
          resultId: saved.id
        });
      } catch (e) {
        console.error('Delete result error:', e);
      } finally {
        setIsSaving(false);
      }
    }

    // Reset local draft state
    setDraftResults((prev) => {
      const next = { ...prev };
      delete next[cId];
      return next;
    });

    setSavedResultsMap((prev) => {
      const next = { ...prev };
      delete next[cId];
      return next;
    });

    setSaveToast({
      type: 'success',
      message: `Cleared result for ${course.code}.`
    });
  };

  // Save all modified results in the active semester
  const handleSaveActiveSemester = async () => {
    if (!activeSemesterDetail) return;
    const regNo = user?.registration_number || user?.matric_number || user?.matric || '';
    if (!regNo) {
      setSaveToast({
        type: 'error',
        message: 'No student registration number found. Please log in again.'
      });
      return;
    }

    const payloadList = [];
    const courses = activeSemesterDetail.courses || [];

    for (const c of courses) {
      const draft = draftResults[c.id];
      if (!draft || !draft.isDirty) continue;

      if (draft.entryMode === 'score') {
        if (draft.score === '') continue; // Skip unentered
        if (!validateScore(draft.score)) {
          setSaveToast({
            type: 'error',
            message: `Please fix the score for ${c.code} (must be 0-100).`
          });
          return;
        }
      } else {
        if (!draft.grade) continue; // Skip unentered
        if (!validateGrade(draft.grade)) {
          setSaveToast({
            type: 'error',
            message: `Invalid letter grade for ${c.code}.`
          });
          return;
        }
      }

      payloadList.push({
        registrationNumber: regNo,
        studentName: user.fullName || user.full_name || 'Student',
        userId: user.id || null,
        courseId: c.id,
        courseCode: c.code,
        courseTitle: c.title,
        creditUnits: c.credit_units,
        level: activeSemesterDetail.level,
        semester: activeSemesterDetail.semester,
        academicSession: activeSemesterDetail.academicSession,
        entryMode: draft.entryMode,
        score: draft.entryMode === 'score' ? Number(draft.score) : null,
        grade: draft.grade
      });
    }

    if (payloadList.length === 0) {
      setSaveToast({
        type: 'info',
        message: 'No unsaved modifications to persist.'
      });
      return;
    }

    setIsSaving(true);
    try {
      const res = await batchSaveStudentCourseResults(payloadList);
      if (res.success) {
        // Update saved map
        const newSavedMap = { ...savedResultsMap };
        const newDrafts = { ...draftResults };

        (res.data || []).forEach((savedItem) => {
          if (savedItem.course_id) {
            newSavedMap[savedItem.course_id] = savedItem;
            if (newDrafts[savedItem.course_id]) {
              newDrafts[savedItem.course_id].isDirty = false;
            }
          }
        });

        setSavedResultsMap(newSavedMap);
        setDraftResults(newDrafts);
        setSaveToast({
          type: 'success',
          message: `Successfully saved ${payloadList.length} ${payloadList.length === 1 ? 'result' : 'results'} to database.`
        });
      } else {
        setSaveToast({
          type: 'error',
          message: 'Failed to save results. Please check your network connection.'
        });
      }
    } catch (e) {
      console.error('Save error:', e);
      setSaveToast({
        type: 'error',
        message: 'An unexpected error occurred while saving.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // PDF Generator Trigger
  const handleDownloadPdf = async (semesterFilter = null) => {
    setIsDownloadingPdf(true);
    try {
      let targetSemesters = enrichedSemesters;
      if (semesterFilter) {
        targetSemesters = enrichedSemesters.filter((s) => s.key === semesterFilter.key);
      }

      await generateAcademicRecordPdf({
        user,
        semesters: targetSemesters,
        options: {
          singleSemester: !!semesterFilter
        }
      });

      setSaveToast({
        type: 'success',
        message: 'Academic record PDF downloaded successfully.'
      });
    } catch (e) {
      console.error('PDF download error:', e);
      setSaveToast({
        type: 'error',
        message: 'Could not generate PDF. Please try again.'
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <PortalLayout>
      <div className="space-y-6 font-sans pb-12">
        {/* Save Toast Notification */}
        {saveToast && (
          <div
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-xs font-semibold border transition-all animate-bounce ${
              saveToast.type === 'success'
                ? 'bg-green-50 text-green-800 border-green-200 dark:bg-[#083002] dark:text-[#4bd043] dark:border-[#138601]'
                : saveToast.type === 'error'
                ? 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/80 dark:text-red-300 dark:border-red-800'
                : 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800'
            }`}
          >
            {saveToast.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-[#138601] dark:text-[#4bd043]" />}
            {saveToast.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />}
            {saveToast.type === 'info' && <Info className="w-4 h-4 shrink-0 text-blue-600" />}
            <span>{saveToast.message}</span>
          </div>
        )}

        {/* Confirmation Modal when switching entry mode */}
        {modeConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-md bg-white dark:bg-[#083002] rounded-2xl border border-gray-200 dark:border-[#138601]/40 p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Confirm Result Entry Mode Change
                </h3>
              </div>
              <p className="text-xs text-gray-600 dark:text-green-100/80 leading-relaxed">
                You are switching <strong className="text-gray-900 dark:text-white">{modeConfirmModal.course.code}</strong> to{' '}
                <strong>{modeConfirmModal.targetMode === 'grade' ? 'Direct Letter Grade (A-F)' : 'Numerical Score (0-100)'}</strong>.
                Switching modes will replace your existing value for this course upon saving. Do you wish to proceed?
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModeConfirmModal(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => applyModeSwitch(modeConfirmModal.course, modeConfirmModal.targetMode)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  Yes, Switch Mode
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mandatory Unofficial-Record Notice Box (Phase 2 & Phase 10 requirement) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/90 dark:bg-[#041801] border border-amber-200 dark:border-amber-600/40 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
              <FileText className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                  Unofficial Student-Maintained Academic Record
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-200/70 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200">
                  Self-Recorded
                </span>
              </div>
              <p className="text-xs text-amber-950/80 dark:text-amber-200/80 leading-relaxed max-w-4xl">
                This academic record is maintained by the student through the NACOS FUTO portal for personal progress tracking and CGPA calculation.
                It has not been verified or certified by the university and does not represent an official university transcript.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleDownloadPdf()}
            disabled={isDownloadingPdf || isLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] transition-all cursor-pointer shrink-0 shadow-xs disabled:opacity-50"
          >
            {isDownloadingPdf ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Preparing PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download Academic Record (PDF)</span>
              </>
            )}
          </button>
        </div>

        {/* VIEW 1: OVERVIEW & SEMESTER LIST */}
        {!selectedOffering ? (
          <>
            {/* Header Title Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 shadow-xs">
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-[#138601] dark:text-[#4bd043]" />
                  <span>My Academic Results & CGPA</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-green-200/80 font-normal mt-1">
                  Manage your semester grades, calculate real-time GPA and cumulative CGPA on a 5.0 scale, and download your academic record.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-medium text-gray-500 dark:text-green-200/80 bg-gray-50 dark:bg-[#041801] px-3 py-1.5 rounded-xl border border-gray-200 dark:border-[#138601]/30">
                  Standing: <strong>{currentLevel} Level</strong>
                </span>
                <span className="text-xs font-medium text-gray-500 dark:text-green-200/80 bg-gray-50 dark:bg-[#041801] px-3 py-1.5 rounded-xl border border-gray-200 dark:border-[#138601]/30">
                  Active: <strong>{activeSession}</strong>
                </span>
              </div>
            </div>

            {/* Overall Cumulative CGPA Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Cumulative CGPA */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 space-y-1 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 dark:text-green-200/80">Cumulative CGPA</span>
                  <Award className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {overallCumulativeStats.cgpaDisplay}{' '}
                  {overallCumulativeStats.isCalculated && (
                    <span className="text-xs text-gray-400 dark:text-green-300 font-normal">/ 5.00</span>
                  )}
                </div>
                <div className="text-xs text-[#138601] dark:text-[#4bd043] font-semibold truncate" title={degreeClassification}>
                  {overallCumulativeStats.isCalculated ? `Estimated: ${degreeClassification}*` : 'Classification: Not calculated'}
                </div>
              </div>

              {/* Card 2: Total Graded Units */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 space-y-1 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 dark:text-green-200/80">Graded Credit Units</span>
                  <BookOpen className="w-4 h-4 text-gray-700 dark:text-[#4bd043]" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {overallCumulativeStats.totalGradedUnits}{' '}
                  <span className="text-xs text-gray-400 dark:text-green-300 font-normal">Units</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-green-200/70 font-normal">
                  Out of {overallCumulativeStats.totalCourses} total registered courses
                </div>
              </div>

              {/* Card 3: Quality Points */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 space-y-1 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 dark:text-green-200/80">Total Quality Points</span>
                  <Calculator className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {overallCumulativeStats.totalQualityPoints.toFixed(1)}{' '}
                  <span className="text-xs text-gray-400 dark:text-green-300 font-normal">QP</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-green-200/70 font-normal">
                  Sum of (Credit Units × Grade Point)
                </div>
              </div>

              {/* Card 4: Semesters Graded */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 space-y-1 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 dark:text-green-200/80">Completed Semesters</span>
                  <Layers className="w-4 h-4 text-gray-700 dark:text-[#4bd043]" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {overallCumulativeStats.gradedCourses > 0 ? enrichedSemesters.filter((s) => s.semStats.gradedCourses > 0).length : 0}{' '}
                  <span className="text-xs text-gray-400 dark:text-green-300 font-normal">/ {enrichedSemesters.length}</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-green-200/70 font-normal">
                  Eligible terms based on progression
                </div>
              </div>
            </div>

            {/* Overview Table organized by Academic Session, Level, and Semester (Phase 9) */}
            <div className="rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 overflow-hidden shadow-xs">
              <div className="p-4 sm:p-5 bg-gray-50/70 dark:bg-[#041801]/60 border-b border-gray-200 dark:border-[#138601]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                    Academic Progression Semesters
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-green-200/80 font-normal mt-0.5">
                    Select a semester below to enter or edit grades, inspect quality points, and calculate semester GPA.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-600 dark:text-green-200">
                    {enrichedSemesters.length} {enrichedSemesters.length === 1 ? 'Term' : 'Terms'} Eligible
                  </span>
                </div>
              </div>

              {isLoading ? (
                <div className="p-12 text-center space-y-3">
                  <Loader2 className="w-6 h-6 animate-spin text-[#138601] dark:text-[#4bd043] mx-auto" />
                  <p className="text-xs text-gray-500 dark:text-green-200/80">Loading courses and saved results...</p>
                </div>
              ) : enrichedSemesters.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <BookOpen className="w-8 h-8 text-gray-400 dark:text-green-400/50 mx-auto" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">No Eligible Academic Records</h3>
                  <p className="text-xs text-gray-500 dark:text-green-200/80 max-w-md mx-auto">
                    No academic records were found for your current student profile. Ensure your department and academic level are configured.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs" style={{ minWidth: '680px' }}>
                    <thead className="bg-gray-50 dark:bg-[#041801]/60 text-gray-700 dark:text-green-200 font-semibold border-b border-gray-200 dark:border-[#138601]/30">
                      <tr>
                        <th className="py-3.5 px-4 whitespace-nowrap">Academic Session</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Level</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Semester</th>
                        <th className="py-3.5 px-4 text-center whitespace-nowrap">Courses Graded</th>
                        <th className="py-3.5 px-4 text-center whitespace-nowrap">Semester GPA</th>
                        <th className="py-3.5 px-4 text-right whitespace-nowrap">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-[#138601]/15 font-normal">
                      {enrichedSemesters.map((sem, idx) => {
                        const { semStats } = sem;
                        const gradedRatio = `${semStats.gradedCourses} / ${semStats.totalCourses}`;
                        const isComplete = semStats.totalCourses > 0 && semStats.gradedCourses === semStats.totalCourses;
                        const progressPct = semStats.totalCourses > 0 ? (semStats.gradedCourses / semStats.totalCourses) * 100 : 0;

                        return (
                          <tr
                            key={sem.key || idx}
                            className={
                              idx % 2 === 0
                                ? 'bg-white dark:bg-[#083002] hover:bg-gray-50 dark:hover:bg-[#041801]/40 transition-colors'
                                : 'bg-gray-50/50 dark:bg-[#041801]/25 hover:bg-gray-50 dark:hover:bg-[#041801]/40 transition-colors'
                            }
                          >
                            <td className="py-3.5 px-4 font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                              {sem.academicSession}
                            </td>
                            <td className="py-3.5 px-4 font-medium text-gray-700 dark:text-green-100 whitespace-nowrap">
                              {sem.level}
                            </td>
                            <td className="py-3.5 px-4 text-gray-700 dark:text-green-100 whitespace-nowrap">
                              {sem.semester}
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <div className="inline-flex flex-col items-center gap-1">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                                    isComplete
                                      ? 'bg-green-100 text-green-800 dark:bg-[#138601]/30 dark:text-[#4bd043]'
                                      : semStats.gradedCourses > 0
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                                      : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300'
                                  }`}
                                >
                                  {gradedRatio} Graded
                                </span>
                                <div className="w-16 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-[#138601] dark:bg-[#4bd043] rounded-full transition-all"
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              {semStats.isCalculated ? (
                                <span className="font-bold text-gray-900 dark:text-[#4bd043] text-sm">
                                  {semStats.gpaDisplay} <span className="text-[10px] text-gray-400 font-normal">/ 5.00</span>
                                </span>
                              ) : (
                                <span className="text-gray-400 dark:text-green-200/50 italic text-[11px]">
                                  Not calculated
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setSelectedOffering(sem)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] transition-colors cursor-pointer shadow-2xs"
                              >
                                <span>{semStats.gradedCourses > 0 ? 'Edit Results' : 'Enter Results'}</span>
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

            {/* FUTO Grading System & Degree Classification Guide Footer */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    Official FUTO Five-Point Grading Scale & Score Boundaries
                  </h3>
                </div>
                <span className="text-[11px] text-gray-400 dark:text-green-200/60 font-medium">
                  Standard 5.00 Academic Regulation Scale
                </span>
              </div>

              {/* Score Boundaries Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                {DEFAULT_SCORE_BOUNDARIES.map((b) => (
                  <div
                    key={b.grade}
                    className="p-3 rounded-xl bg-gray-50 dark:bg-[#041801]/60 border border-gray-200/80 dark:border-[#138601]/20 flex flex-col items-center justify-center text-center space-y-0.5"
                  >
                    <span className="font-extrabold text-sm text-[#138601] dark:text-[#4bd043]">{b.grade}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{b.point.toFixed(1)} GP</span>
                    <span className="text-[10px] text-gray-500 dark:text-green-200/70">
                      {b.displayRange || `${b.min}–${b.max}`}%
                    </span>
                  </div>
                ))}
              </div>

              {/* Degree Classification Thresholds */}
              <div className="pt-3 border-t border-gray-100 dark:border-[#138601]/20 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-700 dark:text-green-200">
                    FUTO Degree Classification Thresholds (5.00 Scale)
                  </span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium italic">
                    *Indicative projection based on self-entered results; not an official graduation award.
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                  {DEGREE_CLASSIFICATIONS.map((d) => (
                    <div
                      key={d.title}
                      className="p-2.5 rounded-lg bg-gray-50/70 dark:bg-[#041801]/40 border border-gray-200/60 dark:border-[#138601]/15 text-center space-y-0.5"
                    >
                      <div className="text-[11px] font-bold text-gray-900 dark:text-white truncate" title={d.title}>
                        {d.title}
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-green-200/70">{d.rangeDisplay}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* VIEW 2: SEMESTER RESULT ENTRY INTERFACE (Phase 4, 5, 6) */
          <>
            {/* Top Navigation & Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 shadow-xs">
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setSelectedOffering(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#138601] dark:text-[#4bd043] hover:underline cursor-pointer mb-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Semesters Overview</span>
                </button>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {activeSemesterDetail?.academicSession} • {activeSemesterDetail?.level} ({activeSemesterDetail?.semester})
                </h1>
                <p className="text-xs text-gray-500 dark:text-green-200/80 font-normal">
                  Enter numerical scores (0–100) or select direct letter grades (A–F). Changes are saved to Supabase.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(activeSemesterDetail)}
                  disabled={isDownloadingPdf}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-green-100 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Semester PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveActiveSemester}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to Supabase...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save All Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Semester & Cumulative Summary Metrics Row (Phase 6 & Requirement 7) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
              {/* 1. Total Courses */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 text-center space-y-0.5 shadow-2xs">
                <span className="text-[10px] font-semibold text-gray-500 dark:text-green-200/70 uppercase">Total Courses</span>
                <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                  {activeSemesterDetail?.semStats.totalCourses}
                </div>
              </div>

              {/* 2. Graded Courses */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 text-center space-y-0.5 shadow-2xs">
                <span className="text-[10px] font-semibold text-gray-500 dark:text-green-200/70 uppercase">Graded</span>
                <div className="text-base sm:text-lg font-bold text-[#138601] dark:text-[#4bd043]">
                  {activeSemesterDetail?.semStats.gradedCourses}
                </div>
              </div>

              {/* 3. Courses with no entered result */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 text-center space-y-0.5 shadow-2xs">
                <span className="text-[10px] font-semibold text-gray-500 dark:text-green-200/70 uppercase">No Result</span>
                <div className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400">
                  {activeSemesterDetail?.semStats.unenteredCourses}
                </div>
              </div>

              {/* 4. Total Graded Credit Units */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 text-center space-y-0.5 shadow-2xs">
                <span className="text-[10px] font-semibold text-gray-500 dark:text-green-200/70 uppercase">Graded Units</span>
                <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                  {activeSemesterDetail?.semStats.totalGradedUnits}{' '}
                  <span className="text-[9px] text-gray-400 font-normal">Units</span>
                </div>
              </div>

              {/* 5. Total Quality Points */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 text-center space-y-0.5 shadow-2xs">
                <span className="text-[10px] font-semibold text-gray-500 dark:text-green-200/70 uppercase">Quality Points</span>
                <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                  {activeSemesterDetail?.semStats.totalQualityPoints.toFixed(1)}
                </div>
              </div>

              {/* 6. Semester GPA */}
              <div className="p-3.5 rounded-xl bg-green-50/70 dark:bg-[#041801] border border-green-200 dark:border-[#138601]/50 text-center space-y-0.5 shadow-2xs">
                <span className="text-[10px] font-bold text-[#138601] dark:text-[#4bd043] uppercase">Semester GPA</span>
                <div className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white">
                  {activeSemesterDetail?.semStats.isCalculated ? (
                    activeSemesterDetail?.semStats.gpaDisplay
                  ) : (
                    <span className="text-[11px] text-gray-400 font-medium italic">Not calculated</span>
                  )}
                </div>
              </div>

              {/* 7. Cumulative CGPA */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 text-center space-y-0.5 shadow-2xs">
                <span className="text-[10px] font-semibold text-gray-500 dark:text-green-200/70 uppercase">Cumulative CGPA</span>
                <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                  {overallCumulativeStats.cgpaDisplay}
                </div>
              </div>

              {/* 8. Estimated Degree Classification */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 text-center space-y-0.5 shadow-2xs">
                <span className="text-[10px] font-semibold text-gray-500 dark:text-green-200/70 uppercase">Estimated Class*</span>
                <div className="text-xs sm:text-sm font-extrabold text-[#138601] dark:text-[#4bd043] truncate" title={degreeClassification}>
                  {degreeClassification}
                </div>
              </div>
            </div>

            {/* Result Entry Table (Phase 4 requirement) */}
            <div className="rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 overflow-hidden shadow-xs">
              <div className="p-4 sm:p-5 bg-gray-50/70 dark:bg-[#041801]/60 border-b border-gray-200 dark:border-[#138601]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Course Offerings & Result Entry Table
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-green-200/80 font-normal">
                    Course Code, Title, and Credit Units are official read-only records from the Registered Courses catalogue.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-green-200/70">
                    Auto-calculates on change
                  </span>
                </div>
              </div>

              {activeSemesterDetail?.courses.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <BookOpen className="w-8 h-8 text-gray-400 dark:text-green-400/50 mx-auto" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">No Courses Available</h4>
                  <p className="text-xs text-gray-500 dark:text-green-200/80 max-w-sm mx-auto">
                    No course catalogue offerings have been registered for this level and semester yet.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs" style={{ minWidth: '780px' }}>
                    <thead className="bg-gray-50 dark:bg-[#041801]/60 text-gray-700 dark:text-green-200 font-semibold border-b border-gray-200 dark:border-[#138601]/30">
                      <tr>
                        <th className="py-3.5 px-4 whitespace-nowrap">Course Code</th>
                        <th className="py-3.5 px-4">Course Title</th>
                        <th className="py-3.5 px-4 text-center whitespace-nowrap">Units</th>
                        <th className="py-3.5 px-4 text-center whitespace-nowrap">Entry Mode</th>
                        <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[150px]">Score / Grade</th>
                        <th className="py-3.5 px-4 text-center whitespace-nowrap">Grade Point</th>
                        <th className="py-3.5 px-4 text-right whitespace-nowrap">Quality Points</th>
                        <th className="py-3.5 px-4 text-center whitespace-nowrap">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-[#138601]/15 font-normal">
                      {activeSemesterDetail?.courses.map((course, idx) => {
                        const isScoreMode = course.entryMode !== 'grade';
                        const scoreError = draftResults[course.id]?.error;

                        return (
                          <tr
                            key={course.id || idx}
                            className={
                              idx % 2 === 0
                                ? 'bg-white dark:bg-[#083002] hover:bg-gray-50/70 dark:hover:bg-[#041801]/40 transition-colors'
                                : 'bg-gray-50/40 dark:bg-[#041801]/20 hover:bg-gray-50/70 dark:hover:bg-[#041801]/40 transition-colors'
                            }
                          >
                            {/* 1. Course Code (Read-only) */}
                            <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                              {course.code}
                            </td>

                            {/* 2. Course Title (Read-only) */}
                            <td className="py-3.5 px-4 text-gray-700 dark:text-green-100 min-w-[180px]">
                              {course.title}
                            </td>

                            {/* 3. Units (Read-only) */}
                            <td className="py-3.5 px-4 text-center font-semibold text-gray-800 dark:text-white whitespace-nowrap">
                              {course.credit_units}
                            </td>

                            {/* 4. Entry Mode Selector (Score vs Letter Grade) */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <div className="inline-flex rounded-lg bg-gray-100 dark:bg-[#041801] p-0.5 border border-gray-200 dark:border-[#138601]/30">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!isScoreMode) requestModeSwitch(course, 'score');
                                  }}
                                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                                    isScoreMode
                                      ? 'bg-white dark:bg-[#138601] text-[#138601] dark:text-white shadow-2xs'
                                      : 'text-gray-500 dark:text-green-200/60 hover:text-gray-900'
                                  }`}
                                >
                                  Score
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isScoreMode) requestModeSwitch(course, 'grade');
                                  }}
                                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                                    !isScoreMode
                                      ? 'bg-white dark:bg-[#138601] text-[#138601] dark:text-white shadow-2xs'
                                      : 'text-gray-500 dark:text-green-200/60 hover:text-gray-900'
                                  }`}
                                >
                                  Grade
                                </button>
                              </div>
                            </td>

                            {/* 5. Score / Grade Input Row */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              {isScoreMode ? (
                                <div className="inline-flex flex-col items-center">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="1"
                                      placeholder="0 - 100"
                                      value={course.score !== undefined && course.score !== null ? course.score : ''}
                                      onChange={(e) => handleScoreChange(course, e.target.value)}
                                      className={`w-20 px-2.5 py-1.5 text-xs text-center font-semibold rounded-lg border bg-white dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#138601] ${
                                        scoreError
                                          ? 'border-red-500'
                                          : 'border-gray-300 dark:border-[#138601]/40'
                                      }`}
                                    />
                                    {course.grade && (
                                      <span
                                        className={`w-6 h-6 flex items-center justify-center rounded-md font-bold text-xs ${
                                          course.grade === 'A'
                                            ? 'bg-green-100 text-green-800 dark:bg-[#138601]/40 dark:text-[#4bd043]'
                                            : course.grade === 'F'
                                            ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                                            : 'bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-gray-200'
                                        }`}
                                      >
                                        {course.grade}
                                      </span>
                                    )}
                                  </div>
                                  {scoreError && (
                                    <span className="text-[10px] text-red-500 mt-1">{scoreError}</span>
                                  )}
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-2">
                                  <select
                                    value={course.grade || ''}
                                    onChange={(e) => handleGradeChange(course, e.target.value)}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#138601] cursor-pointer"
                                  >
                                    <option value="">Select Grade</option>
                                    {SUPPORTED_LETTER_GRADES.map((g) => (
                                      <option key={g} value={g}>
                                        {g} ({letterGradeToPoint(g).toFixed(1)} GP)
                                      </option>
                                    ))}
                                  </select>
                                  <span className="text-[11px] text-gray-400 dark:text-green-200/50 italic">
                                    Direct
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* 6. Grade Point (5-Point Scale: A=5, B=4, C=3, D=2, E=1, F=0) */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              {course.gradePoint !== null && course.gradePoint !== undefined ? (
                                <span className="font-bold text-gray-900 dark:text-white">
                                  {Number(course.gradePoint).toFixed(1)}
                                </span>
                              ) : (
                                <span className="text-gray-300 dark:text-gray-600">—</span>
                              )}
                            </td>

                            {/* 7. Quality Points (Credit Units × Grade Point) */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              {course.qualityPoints !== null && course.qualityPoints !== undefined ? (
                                <span className="font-bold text-[#138601] dark:text-[#4bd043]">
                                  {Number(course.qualityPoints).toFixed(1)}
                                </span>
                              ) : (
                                <span className="text-gray-300 dark:text-gray-600">—</span>
                              )}
                            </td>

                            {/* 8. Status & Action */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                {course.isDirty ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                    Unsaved
                                  </span>
                                ) : course.isSaved ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-800 dark:bg-[#138601]/30 dark:text-[#4bd043]">
                                    <Check className="w-3 h-3" />
                                    <span>Saved</span>
                                  </span>
                                ) : (
                                  <span className="text-gray-400 dark:text-gray-500 text-[11px] italic">
                                    Not entered
                                  </span>
                                )}

                                {(course.grade || course.score !== '') && (
                                  <button
                                    type="button"
                                    onClick={() => handleClearCourseResult(course)}
                                    title="Clear this course result"
                                    className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer rounded-md hover:bg-gray-100 dark:hover:bg-white/10"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Semester Table Footer Summary */}
              <div className="p-4 bg-gray-50 dark:bg-[#041801]/60 border-t border-gray-200 dark:border-[#138601]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="text-gray-600 dark:text-green-200/80">
                  Total Graded Units: <strong className="text-gray-900 dark:text-white">{activeSemesterDetail?.semStats.totalGradedUnits}</strong> | Total Quality Points: <strong className="text-gray-900 dark:text-white">{activeSemesterDetail?.semStats.totalQualityPoints.toFixed(1)}</strong>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-900 dark:text-white">
                    Semester GPA:{' '}
                    <span className="text-base text-[#138601] dark:text-[#4bd043]">
                      {activeSemesterDetail?.semStats.isCalculated ? activeSemesterDetail?.semStats.gpaDisplay : 'Not calculated'}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveActiveSemester}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </PortalLayout>
  );
};

export default Results;
