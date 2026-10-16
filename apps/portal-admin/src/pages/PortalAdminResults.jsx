import React, { useState, useEffect, useMemo, useRef } from 'react';
import PortalAdminLayout from '../components/PortalAdminLayout';
import { 
  Award, 
  Search, 
  Upload, 
  Plus, 
  Filter, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  X, 
  FileText, 
  Download, 
  AlertCircle, 
  Lock, 
  BookOpen,
  Calendar,
  Check,
  Percent,
  Loader
} from 'lucide-react';
import { 
  adminFetchResultsCatalog, 
  adminSaveSingleResult, 
  adminUploadResultsBatch, 
  adminDeleteResult, 
  calculateFutoGrade,
  fetchCourses
} from '@nacos/supabase';
import { getPortalAdminSession, canAccessLevel, getAccessibleLevels } from '@nacos/auth';

export default function PortalAdminResults() {
  const [results, setResults] = useState([]);
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('All');
  const [selectedCourse, setSelectedCourse] = useState('All');
  const [selectedSession, setSelectedSession] = useState('All');
  const [toastMessage, setToastMessage] = useState(null);

  // Admin session & level scoping
  const [adminSession, setAdminSession] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState('All');

  // Modals
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [editingResult, setEditingResult] = useState(null);
  const [deleteConfirmResult, setDeleteConfirmResult] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Manual Form State
  const [formData, setFormData] = useState({
    matric_number: '',
    student_name: '',
    course_code: '',
    course_title: '',
    units: 3,
    level: 100,
    semester: '1st Semester',
    session: '2026/2027',
    test: 25,
    exam: 50
  });

  // CSV Upload State
  const fileInputRef = useRef(null);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvParsedRecords, setCsvParsedRecords] = useState([]);
  const [csvParseError, setCsvParseError] = useState('');
  const [isUploadingCsv, setIsUploadingCsv] = useState(false);

  useEffect(() => {
    const session = getPortalAdminSession();
    setAdminSession(session);
    if (session?.assigned_level && session.assigned_level !== 'all') {
      const clean = session.assigned_level.replace(/[^0-9]/g, '');
      setSelectedLevel(`${clean}L`);
      setFormData(prev => ({ ...prev, level: parseInt(clean, 10) || 100 }));
    }
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [resData, courseData] = await Promise.all([
        adminFetchResultsCatalog(),
        fetchCourses()
      ]);
      if (resData.data) setResults(resData.data);
      if (courseData.data) setCourses(courseData.data);
    } catch (e) {
      console.error('Error fetching results:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('nacos_results_updated', handleUpdate);
    return () => window.removeEventListener('nacos_results_updated', handleUpdate);
  }, []);

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
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

  // Unique session list
  const sessionOptions = useMemo(() => {
    const set = new Set(results.map(r => r.session).filter(Boolean));
    set.add('2026/2027');
    set.add('2025/2026');
    set.add('2024/2025');
    return ['All', ...Array.from(set)];
  }, [results]);

  // Available courses for selected level
  const courseOptions = useMemo(() => {
    const list = courses.filter(c => {
      if (selectedLevel !== 'All') {
        return Number(c.level) === parseInt(selectedLevel.replace('L', ''), 10);
      }
      return canAccessLevel(adminSession, c.level);
    });
    return list;
  }, [courses, selectedLevel, adminSession]);

  // Filtered results
  const filteredResults = useMemo(() => {
    return results.filter((r) => {
      // Level authority guard
      if (!canAccessLevel(adminSession, r.level)) {
        return false;
      }

      // Level filter
      if (selectedLevel !== 'All') {
        const cleanLvl = parseInt(selectedLevel.replace('L', ''), 10);
        if (Number(r.level) !== cleanLvl) return false;
      }

      // Semester filter
      if (selectedSemester !== 'All') {
        if (!r.semester || !r.semester.toLowerCase().includes(selectedSemester.toLowerCase())) {
          return false;
        }
      }

      // Session filter
      if (selectedSession !== 'All') {
        if ((r.session || '').toLowerCase() !== selectedSession.toLowerCase()) {
          return false;
        }
      }

      // Course filter
      if (selectedCourse !== 'All') {
        if ((r.course_code || '').toUpperCase() !== selectedCourse.toUpperCase()) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchMatric = (r.matric_number || '').toLowerCase().includes(q);
        const matchName = (r.student_name || '').toLowerCase().includes(q);
        const matchCode = (r.course_code || '').toLowerCase().includes(q);
        if (!matchMatric && !matchName && !matchCode) return false;
      }

      return true;
    });
  }, [results, selectedLevel, selectedSemester, selectedSession, selectedCourse, searchQuery, adminSession]);

  // Real-time grade preview for manual modal
  const liveGrade = useMemo(() => {
    return calculateFutoGrade(formData.test, formData.exam, formData.units);
  }, [formData.test, formData.exam, formData.units]);

  // Metrics summary
  const metrics = useMemo(() => {
    const count = filteredResults.length;
    if (count === 0) return { count: 0, passed: 0, failed: 0, passRate: '0%', avgScore: '0' };
    const passed = filteredResults.filter(r => r.grade !== 'F').length;
    const failed = count - passed;
    const passRate = `${((passed / count) * 100).toFixed(1)}%`;
    const totalScore = filteredResults.reduce((acc, r) => acc + (Number(r.score) || 0), 0);
    const avgScore = (totalScore / count).toFixed(1);
    return { count, passed, failed, passRate, avgScore };
  }, [filteredResults]);

  const handleOpenCreate = () => {
    const defaultLevel = isLevelRestricted
      ? parseInt(adminSession.assigned_level.replace(/[^0-9]/g, ''), 10) || 100
      : selectedLevel !== 'All' 
        ? parseInt(selectedLevel.replace('L', ''), 10) 
        : 100;

    const firstCourse = courseOptions[0];

    setEditingResult(null);
    setFormData({
      matric_number: '',
      student_name: '',
      course_code: firstCourse?.code || 'CSC 201',
      course_title: firstCourse?.title || 'Computer Programming I',
      units: firstCourse?.units || 3,
      level: defaultLevel,
      semester: '1st Semester',
      session: '2026/2027',
      test: 25,
      exam: 50
    });
    setIsManualModalOpen(true);
  };

  const handleOpenEdit = (res) => {
    setEditingResult(res);
    setFormData({
      id: res.id,
      matric_number: res.matric_number || '',
      student_name: res.student_name || '',
      course_code: res.course_code || '',
      course_title: res.course_title || '',
      units: res.units || 3,
      level: res.level || 100,
      semester: res.semester || '1st Semester',
      session: res.session || '2026/2027',
      test: res.test || 0,
      exam: res.exam || 0
    });
    setIsManualModalOpen(true);
  };

  const handleSelectCourseInForm = (code) => {
    const found = courses.find(c => c.code.toUpperCase() === code.toUpperCase());
    if (found) {
      setFormData(prev => ({
        ...prev,
        course_code: found.code,
        course_title: found.title,
        units: found.units,
        level: found.level,
        semester: found.semester?.includes('Second') ? '2nd Semester' : '1st Semester'
      }));
    } else {
      setFormData(prev => ({ ...prev, course_code: code }));
    }
  };

  const handleSaveManualResult = async (e) => {
    e.preventDefault();
    if (!formData.matric_number.trim() || !formData.course_code.trim()) {
      showToast('Please enter both student matric number and course code', 'error');
      return;
    }

    try {
      setIsSaving(true);
      await adminSaveSingleResult(formData);
      showToast(`Grade for ${formData.matric_number} (${formData.course_code}) recorded successfully!`);
      setIsManualModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.message || 'Error saving result', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteResult = async () => {
    if (!deleteConfirmResult) return;
    try {
      await adminDeleteResult(deleteConfirmResult.id);
      showToast(`Result record deleted`);
      setDeleteConfirmResult(null);
      loadData();
    } catch (e) {
      showToast('Failed to delete record', 'error');
    }
  };

  // CSV File Parsing
  const handleCsvFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    setCsvParseError('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result;
        if (typeof text !== 'string') throw new Error('Could not read file');

        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length < 2) throw new Error('CSV file is empty or missing data rows');

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[\"']/g, ''));
        const matricIdx = headers.findIndex(h => h.includes('matric') || h.includes('reg'));
        const courseIdx = headers.findIndex(h => h.includes('course') || h.includes('code'));
        const testIdx = headers.findIndex(h => h.includes('test') || h.includes('ca'));
        const examIdx = headers.findIndex(h => h.includes('exam'));
        const unitsIdx = headers.findIndex(h => h.includes('unit'));
        const nameIdx = headers.findIndex(h => h.includes('name'));

        if (matricIdx === -1 || courseIdx === -1) {
          throw new Error('CSV must contain "matric_number" and "course_code" columns');
        }

        const parsed = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim().replace(/[\"']/g, ''));
          if (cols.length < 2) continue;

          const matric = cols[matricIdx] || '';
          const code = (cols[courseIdx] || '').toUpperCase();
          if (!matric || !code) continue;

          const testVal = testIdx !== -1 ? parseFloat(cols[testIdx]) || 0 : 25;
          const examVal = examIdx !== -1 ? parseFloat(cols[examIdx]) || 0 : 50;
          const unitsVal = unitsIdx !== -1 ? parseInt(cols[unitsIdx], 10) || 3 : 3;
          const nameVal = nameIdx !== -1 ? cols[nameIdx] : 'Student';

          const matchingCourse = courses.find(c => c.code.toUpperCase() === code);
          const lvl = matchingCourse?.level || (isLevelRestricted ? parseInt(adminSession.assigned_level.replace(/[^0-9]/g, ''), 10) || 100 : 100);

          // Level restriction check
          if (!canAccessLevel(adminSession, lvl)) {
            continue; // Skip lines not belonging to this admin's level
          }

          const gradeCalc = calculateFutoGrade(testVal, examVal, unitsVal);

          parsed.push({
            matric_number: matric.toUpperCase(),
            student_name: nameVal,
            course_code: code,
            course_title: matchingCourse?.title || code,
            units: unitsVal,
            level: lvl,
            semester: matchingCourse?.semester?.includes('Second') ? '2nd Semester' : '1st Semester',
            session: '2026/2027',
            test: gradeCalc.test,
            exam: gradeCalc.exam,
            score: gradeCalc.score,
            grade: gradeCalc.grade,
            gp: gradeCalc.gp,
            status: gradeCalc.status
          });
        }

        if (parsed.length === 0) {
          throw new Error('No valid records found for your authorized level');
        }

        setCsvParsedRecords(parsed);
      } catch (err) {
        setCsvParseError(err.message || 'Failed to parse CSV file');
        setCsvParsedRecords([]);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmBatchUpload = async () => {
    if (csvParsedRecords.length === 0) return;
    setIsUploadingCsv(true);
    try {
      const res = await adminUploadResultsBatch(csvParsedRecords);
      if (res.success) {
        showToast(`Successfully uploaded ${res.count} student grades!`);
        setIsCsvModalOpen(false);
        setCsvParsedRecords([]);
        setCsvFileName('');
        loadData();
      } else {
        showToast(res.error || 'Upload failed', 'error');
      }
    } catch (e) {
      showToast(e.message || 'Error processing batch upload', 'error');
    } finally {
      setIsUploadingCsv(false);
    }
  };

  const handleDownloadCsvTemplate = () => {
    const headers = 'matric_number,student_name,course_code,units,test,exam,semester,session\n';
    const sample = '20221234567,Daniel Chukwuka,CSC 201,3,26,58,1st Semester,2026/2027\n20229876543,Emeka Okafor,CSC 201,3,24,51,1st Semester,2026/2027\n20221122334,Blessing Nnadi,CSC 201,3,28,60,1st Semester,2026/2027\n';
    const blob = new Blob([headers + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nacos_futo_results_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PortalAdminLayout 
      title="Academic Results & Gradebook Gateway"
      subtitle="Upload semester examination results, grade student course rosters, and compute academic standing"
    >
      <div className="space-y-6">
        {/* Toast alert */}
        {toastMessage && (
          <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-bottom-5 ${
            toastMessage.type === 'error' ? 'bg-red-600 text-white' : 'bg-[#138601] text-white'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Level Restriction Alert */}
        {isLevelRestricted && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 flex items-center justify-between gap-3 text-amber-900 dark:text-amber-200 text-xs">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Academic Scope Restriction Active:</strong> Grade uploads and viewing are restricted to <strong>{adminSession.assigned_level} Level</strong> student records.
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded font-bold uppercase text-[10px] bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
              {adminSession.assigned_level}L Coordinator
            </span>
          </div>
        )}

        {/* Top Control & Metrics Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#083002] p-5 sm:p-6 rounded-xl border border-gray-200 dark:border-[#138601]/25 shadow-xs">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#138601] dark:text-[#4bd043] uppercase tracking-wider mb-1">
              <Award className="w-3.5 h-3.5" />
              <span>Official Departmental Grading</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
              Results & Examination Scores
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-green-200/80 mt-1">
              Publish continuous assessments (CA / 40) and semester examinations (Exam / 60).
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setCsvParsedRecords([]);
                setCsvParseError('');
                setIsCsvModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Bulk CSV Upload</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#138601] hover:bg-[#0f6c01] text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record Single Grade</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Stat Boxes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-[#083002] p-4 rounded-xl border border-gray-200 dark:border-[#138601]/25 shadow-xs">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-green-200/70">Published Grades</span>
            <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-1">{metrics.count}</p>
          </div>

          <div className="bg-white dark:bg-[#083002] p-4 rounded-xl border border-gray-200 dark:border-[#138601]/25 shadow-xs">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-[#4bd043]">Passed Courses</span>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-[#4bd043] mt-1">{metrics.passed}</p>
          </div>

          <div className="bg-white dark:bg-[#083002] p-4 rounded-xl border border-gray-200 dark:border-[#138601]/25 shadow-xs">
            <span className="text-[11px] font-semibold text-red-500">Carry Over Count</span>
            <p className="text-xl sm:text-2xl font-black text-red-500 mt-1">{metrics.failed}</p>
          </div>

          <div className="bg-white dark:bg-[#083002] p-4 rounded-xl border border-gray-200 dark:border-[#138601]/25 shadow-xs">
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">Pass Rate</span>
            <p className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{metrics.passRate}</p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white dark:bg-[#083002] rounded-xl p-4 border border-gray-200 dark:border-[#138601]/25 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Search */}
            <div className="relative w-full md:max-w-xs">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search matric, student name, course..."
                className="w-full pl-10 pr-4 py-2 text-xs rounded-lg border border-gray-200 dark:border-[#138601]/30 bg-gray-50/50 dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#138601]"
              />
            </div>

            {/* Level Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
              <span className="text-[11px] font-semibold text-gray-400 mr-1 flex items-center gap-1 shrink-0">
                <Filter className="w-3 h-3" /> Level:
              </span>
              {levelOptions.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSelectedLevel(lvl)}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                    selectedLevel === lvl
                      ? 'bg-[#138601] text-white shadow-xs'
                      : 'bg-gray-100 dark:bg-[#041801] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#138601]/20 border border-gray-200 dark:border-[#138601]/20'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Sub-Filters: Semester, Course, Session */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 dark:border-[#138601]/15 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 font-semibold text-[11px]">Semester:</span>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="p-1.5 rounded border border-gray-200 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white text-xs"
              >
                <option value="All">All Semesters</option>
                <option value="1st">1st Semester</option>
                <option value="2nd">2nd Semester</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 font-semibold text-[11px]">Course:</span>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="p-1.5 rounded border border-gray-200 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white text-xs max-w-[150px] truncate"
              >
                <option value="All">All Courses</option>
                {courseOptions.map(c => (
                  <option key={c.id || c.code} value={c.code}>{c.code} - {c.title}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 font-semibold text-[11px]">Session:</span>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className="p-1.5 rounded border border-gray-200 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white text-xs"
              >
                {sessionOptions.map(s => (
                  <option key={s} value={s}>{s === 'All' ? 'All Sessions' : s}</option>
                ))}
              </select>
            </div>

            {(selectedCourse !== 'All' || selectedSemester !== 'All' || selectedSession !== 'All' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCourse('All');
                  setSelectedSemester('All');
                  setSelectedSession('All');
                  setSearchQuery('');
                }}
                className="text-[11px] font-semibold text-[#138601] dark:text-[#4bd043] hover:underline cursor-pointer ml-auto"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white dark:bg-[#083002] rounded-xl border border-gray-200 dark:border-[#138601]/25 shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-gray-500 animate-pulse">Loading grades catalog...</div>
          ) : filteredResults.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Award className="w-8 h-8 text-gray-400 mx-auto" />
              <p className="text-sm font-bold text-gray-800 dark:text-white">No result records found</p>
              <p className="text-xs text-gray-500">Record individual scores or upload a batch CSV grade sheet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/75 dark:bg-[#041801]/60 text-gray-500 dark:text-green-200/70 border-b border-gray-200 dark:border-[#138601]/20 uppercase tracking-wider font-bold text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Course</th>
                    <th className="py-3 px-4">CA (40)</th>
                    <th className="py-3 px-4">Exam (60)</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Grade</th>
                    <th className="py-3 px-4">GP</th>
                    <th className="py-3 px-4">Session & Level</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#138601]/15">
                  {filteredResults.map((r) => {
                    const isPass = r.grade !== 'F';
                    return (
                      <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-[#062602]/50 transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono font-bold text-[#138601] dark:text-[#4bd043]">{r.matric_number}</span>
                          <p className="text-[11px] text-gray-700 dark:text-gray-300 font-medium">{r.student_name}</p>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-bold text-gray-900 dark:text-white">{r.course_code}</span>
                          <p className="text-[10px] text-gray-500 dark:text-green-200/70 truncate max-w-[150px]">{r.course_title}</p>
                        </td>

                        <td className="py-3.5 px-4 font-mono">{r.test}</td>
                        <td className="py-3.5 px-4 font-mono">{r.exam}</td>

                        <td className="py-3.5 px-4 font-mono font-extrabold text-gray-900 dark:text-white">
                          {r.score}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded font-black text-xs ${
                            r.grade === 'A' 
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' 
                              : r.grade === 'B' 
                                ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300' 
                                : r.grade === 'C' 
                                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                                  : r.grade === 'D' 
                                    ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300'
                                    : 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300'
                          }`}>
                            {r.grade}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-gray-700 dark:text-gray-300">
                          {r.gp}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-[11px] text-gray-500 dark:text-gray-400">
                          <span>{r.session}</span> • <span className="font-bold text-gray-700 dark:text-gray-300">{r.level}L</span> ({r.semester})
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(r)}
                              className="p-1.5 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-[#041801] cursor-pointer"
                              title="Edit Grade"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmResult(r)}
                              className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-[#041801] cursor-pointer"
                              title="Delete Result"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Manual Record Single Grade Modal */}
        {isManualModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#138601]/20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#138601]/10 text-[#138601] dark:text-[#4bd043] flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    {editingResult ? 'Update Student Grade' : 'Record Student Grade'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveManualResult} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">Matric / Reg Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 20221234567"
                      value={formData.matric_number}
                      onChange={(e) => setFormData({ ...formData, matric_number: e.target.value.toUpperCase() })}
                      className="w-full p-2 rounded border border-gray-200 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">Student Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Daniel Chukwuka"
                      value={formData.student_name}
                      onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                      className="w-full p-2 rounded border border-gray-200 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">Course Selection *</label>
                  <select
                    value={formData.course_code}
                    onChange={(e) => handleSelectCourseInForm(e.target.value)}
                    className="w-full p-2 rounded border border-gray-200 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white font-bold"
                  >
                    {courseOptions.map(c => (
                      <option key={c.id || c.code} value={c.code}>{c.code} — {c.title} ({c.units} Units)</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">Level</label>
                    <input
                      type="number"
                      disabled={isLevelRestricted}
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value, 10) })}
                      className="w-full p-2 rounded border border-gray-200 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">Semester</label>
                    <select
                      value={formData.semester}
                      onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                      className="w-full p-2 rounded border border-gray-200 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white"
                    >
                      <option value="1st Semester">1st Semester</option>
                      <option value="2nd Semester">2nd Semester</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">Session</label>
                    <input
                      type="text"
                      value={formData.session}
                      onChange={(e) => setFormData({ ...formData, session: e.target.value })}
                      className="w-full p-2 rounded border border-gray-200 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Score inputs & real-time calculation preview */}
                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/25 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">CA Test Score (Max 40)</label>
                      <input
                        type="number"
                        min="0"
                        max="40"
                        required
                        value={formData.test}
                        onChange={(e) => setFormData({ ...formData, test: parseFloat(e.target.value) || 0 })}
                        className="w-full p-2 rounded border border-gray-200 dark:border-[#138601]/30 bg-white dark:bg-[#062602] text-gray-900 dark:text-white font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">Exam Score (Max 60)</label>
                      <input
                        type="number"
                        min="0"
                        max="60"
                        required
                        value={formData.exam}
                        onChange={(e) => setFormData({ ...formData, exam: parseFloat(e.target.value) || 0 })}
                        className="w-full p-2 rounded border border-gray-200 dark:border-[#138601]/30 bg-white dark:bg-[#062602] text-gray-900 dark:text-white font-mono font-bold"
                      />
                    </div>
                  </div>

                  {/* Calculated FUTO Outcome */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-[#138601]/20">
                    <span className="text-[11px] font-semibold text-gray-500">Calculated Outcome:</span>
                    <div className="flex items-center gap-2 font-bold">
                      <span>Total: {liveGrade.score}/100</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs">
                        Grade {liveGrade.grade} ({liveGrade.gp} GP)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#138601]/20">
                  <button
                    type="button"
                    onClick={() => setIsManualModalOpen(false)}
                    className="px-4 py-2 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#041801] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 bg-[#138601] hover:bg-[#0f6c01] text-white font-bold rounded shadow-xs cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSaving ? <Loader className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>{isSaving ? 'Saving...' : editingResult ? 'Update Grade' : 'Record Grade'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bulk CSV Upload Modal */}
        {isCsvModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 rounded-xl w-full max-w-2xl shadow-2xl p-6 space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#138601]/20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Batch Results CSV Upload</h3>
                    <p className="text-[11px] text-gray-500">Upload bulk examination scores from departmental spreadsheets</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(false)}
                  className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40">
                  <div>
                    <p className="font-semibold text-blue-900 dark:text-blue-200">Need the official formatting template?</p>
                    <p className="text-[11px] text-blue-700 dark:text-blue-300">Download the standard CSV template containing proper header columns.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadCsvTemplate}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CSV Template</span>
                  </button>
                </div>

                {/* Drag & Drop File Picker */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 dark:border-[#138601]/30 rounded-xl p-6 text-center cursor-pointer hover:border-[#138601] dark:hover:border-[#4bd043] transition-colors"
                >
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="font-bold text-gray-800 dark:text-white">
                    {csvFileName ? `Selected: ${csvFileName}` : 'Click to select CSV score spreadsheet'}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">Accepts UTF-8 .csv files with matric_number, course_code, test, exam</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleCsvFileSelect}
                    className="hidden"
                  />
                </div>

                {/* Error Banner */}
                {csvParseError && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{csvParseError}</span>
                  </div>
                )}

                {/* Pre-Upload Validation Preview */}
                {csvParsedRecords.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-800 dark:text-white">
                        Validated Records Preview ({csvParsedRecords.length} ready)
                      </span>
                    </div>

                    <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-[#138601]/25 rounded-lg">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-gray-100 dark:bg-[#041801] sticky top-0 font-bold text-gray-600 dark:text-gray-300">
                          <tr>
                            <th className="p-2">Matric</th>
                            <th className="p-2">Course</th>
                            <th className="p-2">CA</th>
                            <th className="p-2">Exam</th>
                            <th className="p-2">Total</th>
                            <th className="p-2">Grade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-[#138601]/15">
                          {csvParsedRecords.slice(0, 15).map((rec, i) => (
                            <tr key={i}>
                              <td className="p-2 font-mono">{rec.matric_number}</td>
                              <td className="p-2 font-bold">{rec.course_code}</td>
                              <td className="p-2 font-mono">{rec.test}</td>
                              <td className="p-2 font-mono">{rec.exam}</td>
                              <td className="p-2 font-mono font-bold">{rec.score}</td>
                              <td className="p-2 font-bold text-[#138601]">{rec.grade}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {csvParsedRecords.length > 15 && (
                        <p className="text-[10px] text-gray-400 text-center py-1 bg-gray-50 dark:bg-[#041801]">
                          ...and {csvParsedRecords.length - 15} more records
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-[#138601]/20">
                  <button
                    type="button"
                    onClick={() => setIsCsvModalOpen(false)}
                    className="px-4 py-2 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#041801] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={csvParsedRecords.length === 0 || isUploadingCsv}
                    onClick={handleConfirmBatchUpload}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    {isUploadingCsv ? 'Processing Upload...' : `Import ${csvParsedRecords.length} Grades`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmResult && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#083002] border border-gray-200 dark:border-red-500/40 rounded-xl w-full max-w-sm shadow-2xl p-6 space-y-4">
              <div className="flex items-center gap-3 text-red-600">
                <Trash2 className="w-5 h-5 shrink-0" />
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Delete Result Record?</h3>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Are you sure you want to remove the grade record for <strong>{deleteConfirmResult.matric_number}</strong> in <strong>{deleteConfirmResult.course_code}</strong>?
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmResult(null)}
                  className="px-3 py-1.5 rounded text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#041801] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteResult}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-xs shadow-xs cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PortalAdminLayout>
  );
}
