import React, { useState, useEffect, useMemo } from 'react';
import { Download, ChevronDown, Filter, GraduationCap, Award, BookOpen } from 'lucide-react';
import PortalLayout from '../components/PortalLayout';
import { fetchResultsForStudent } from '@nacos/supabase';

const ALL_SEMESTERS_DATA = [
  {
    id: '100-1',
    levelNumber: 100,
    semesterNumber: 1,
    levelName: '100 Level',
    semesterName: '1st Semester',
    title: '100 Level - 1st Semester (2022/2023)',
    gpa: '4.74',
    totalUnits: 19,
    courses: [
      { code: 'CSC 101', title: 'Introduction to Computing Systems', units: 3, test: 27, exam: 58, score: 85, grade: 'A', gp: 15 },
      { code: 'MTH 101', title: 'Elementary Mathematics I (Algebra & Trig)', units: 3, test: 25, exam: 53, score: 78, grade: 'A', gp: 15 },
      { code: 'PHY 101', title: 'General Physics I (Mechanics)', units: 3, test: 23, exam: 51, score: 74, grade: 'A', gp: 15 },
      { code: 'CHM 101', title: 'General Chemistry I', units: 3, test: 22, exam: 48, score: 70, grade: 'A', gp: 15 },
      { code: 'GST 101', title: 'Use of English I', units: 2, test: 26, exam: 55, score: 81, grade: 'A', gp: 10 },
      { code: 'PHY 107', title: 'General Physics Laboratory I', units: 1, test: 28, exam: 50, score: 78, grade: 'A', gp: 5 },
      { code: 'CHM 107', title: 'General Chemistry Laboratory I', units: 1, test: 25, exam: 47, score: 72, grade: 'A', gp: 5 },
      { code: 'BIO 101', title: 'General Biology I', units: 3, test: 24, exam: 48, score: 72, grade: 'A', gp: 15 },
    ]
  },
  {
    id: '100-2',
    levelNumber: 100,
    semesterNumber: 2,
    levelName: '100 Level',
    semesterName: '2nd Semester',
    title: '100 Level - 2nd Semester (2022/2023)',
    gpa: '4.83',
    totalUnits: 18,
    courses: [
      { code: 'CSC 102', title: 'Introduction to Problem Solving & Programming', units: 3, test: 28, exam: 60, score: 88, grade: 'A', gp: 15 },
      { code: 'MTH 102', title: 'Elementary Mathematics II (Calculus)', units: 3, test: 24, exam: 54, score: 78, grade: 'A', gp: 15 },
      { code: 'PHY 102', title: 'General Physics II (Electricity & Magnetism)', units: 3, test: 22, exam: 49, score: 71, grade: 'A', gp: 15 },
      { code: 'CHM 102', title: 'General Chemistry II', units: 3, test: 21, exam: 47, score: 68, grade: 'B', gp: 12 },
      { code: 'GST 102', title: 'Use of English II', units: 2, test: 27, exam: 56, score: 83, grade: 'A', gp: 10 },
      { code: 'PHY 108', title: 'General Physics Laboratory II', units: 1, test: 26, exam: 52, score: 78, grade: 'A', gp: 5 },
      { code: 'CHM 108', title: 'General Chemistry Laboratory II', units: 1, test: 25, exam: 49, score: 74, grade: 'A', gp: 5 },
      { code: 'ENR 102', title: 'Engineering Drawing I', units: 2, test: 23, exam: 48, score: 71, grade: 'A', gp: 10 },
    ]
  },
  {
    id: '200-1',
    levelNumber: 200,
    semesterNumber: 1,
    levelName: '200 Level',
    semesterName: '1st Semester',
    title: '200 Level - 1st Semester (2023/2024)',
    gpa: '4.85',
    totalUnits: 20,
    courses: [
      { code: 'CSC 201', title: 'Computer Programming I (C++)', units: 3, test: 26, exam: 58, score: 84, grade: 'A', gp: 15 },
      { code: 'CSC 203', title: 'Discrete Structures', units: 3, test: 25, exam: 52, score: 77, grade: 'A', gp: 15 },
      { code: 'MTH 201', title: 'Mathematical Methods I', units: 3, test: 23, exam: 50, score: 73, grade: 'A', gp: 15 },
      { code: 'PHY 201', title: 'Modern Physics', units: 3, test: 22, exam: 48, score: 70, grade: 'A', gp: 15 },
      { code: 'STA 211', title: 'Probability & Statistics I', units: 3, test: 24, exam: 53, score: 77, grade: 'A', gp: 15 },
      { code: 'GST 201', title: 'Nigerian Peoples and Culture', units: 2, test: 28, exam: 54, score: 82, grade: 'A', gp: 10 },
      { code: 'EEE 201', title: 'Applied Electricity I', units: 3, test: 21, exam: 46, score: 67, grade: 'B', gp: 12 },
    ]
  },
  {
    id: '200-2',
    levelNumber: 200,
    semesterNumber: 2,
    levelName: '200 Level',
    semesterName: '2nd Semester',
    title: '200 Level - 2nd Semester (2023/2024)',
    gpa: '4.68',
    totalUnits: 19,
    courses: [
      { code: 'CSC 202', title: 'Computer Programming II (Java)', units: 3, test: 25, exam: 56, score: 81, grade: 'A', gp: 15 },
      { code: 'CSC 204', title: 'Fundamentals of Data Processing', units: 2, test: 22, exam: 52, score: 74, grade: 'A', gp: 10 },
      { code: 'CSC 206', title: 'Discrete Mathematics for Computing', units: 3, test: 21, exam: 47, score: 68, grade: 'B', gp: 12 },
      { code: 'MTH 202', title: 'Mathematical Methods II', units: 3, test: 23, exam: 50, score: 73, grade: 'A', gp: 15 },
      { code: 'PHY 202', title: 'Electric Circuits & Electronics', units: 3, test: 24, exam: 49, score: 73, grade: 'A', gp: 15 },
      { code: 'STA 212', title: 'Statistics for Physical Sciences', units: 3, test: 20, exam: 46, score: 66, grade: 'B', gp: 12 },
      { code: 'GST 222', title: 'Peace & Conflict Studies', units: 2, test: 27, exam: 54, score: 81, grade: 'A', gp: 10 },
    ]
  },
  {
    id: '300-1',
    levelNumber: 300,
    semesterNumber: 1,
    levelName: '300 Level',
    semesterName: '1st Semester',
    title: '300 Level - 1st Semester (2024/2025)',
    gpa: '4.81',
    totalUnits: 21,
    courses: [
      { code: 'CSC 301', title: 'Structured Programming (C++)', units: 3, test: 26, exam: 58, score: 84, grade: 'A', gp: 15 },
      { code: 'CSC 303', title: 'Data Structures & Algorithms', units: 3, test: 24, exam: 55, score: 79, grade: 'A', gp: 15 },
      { code: 'CSC 305', title: 'Operating Systems & Architecture', units: 3, test: 22, exam: 50, score: 72, grade: 'A', gp: 15 },
      { code: 'CSC 307', title: 'Object-Oriented Analysis & Design', units: 3, test: 21, exam: 48, score: 69, grade: 'B', gp: 12 },
      { code: 'CSC 309', title: 'Database Design & Relational Models', units: 2, test: 28, exam: 60, score: 88, grade: 'A', gp: 10 },
      { code: 'MTH 311', title: 'Numerical Analysis & Complex Analysis', units: 3, test: 23, exam: 53, score: 76, grade: 'A', gp: 15 },
      { code: 'ENS 301', title: 'Entrepreneurship & Innovation', units: 2, test: 25, exam: 52, score: 77, grade: 'A', gp: 10 },
      { code: 'CSC 313', title: 'Compiler Construction Fundamentals', units: 2, test: 24, exam: 48, score: 72, grade: 'A', gp: 10 },
    ]
  },
  {
    id: '300-2',
    levelNumber: 300,
    semesterNumber: 2,
    levelName: '300 Level',
    semesterName: '2nd Semester',
    title: '300 Level - 2nd Semester (2024/2025)',
    gpa: '5.00',
    totalUnits: 18,
    courses: [
      { code: 'CSC 302', title: 'Operating Systems Principles', units: 3, test: 25, exam: 55, score: 80, grade: 'A', gp: 15 },
      { code: 'CSC 304', title: 'Software Engineering Foundations', units: 3, test: 27, exam: 56, score: 83, grade: 'A', gp: 15 },
      { code: 'CSC 306', title: 'Automata Theory & Formal Languages', units: 3, test: 24, exam: 51, score: 75, grade: 'A', gp: 15 },
      { code: 'CSC 308', title: 'Web Technologies & Internet Programming', units: 3, test: 28, exam: 59, score: 87, grade: 'A', gp: 15 },
      { code: 'CSC 310', title: 'Computer Architecture & Microprocessors', units: 3, test: 23, exam: 50, score: 73, grade: 'A', gp: 15 },
      { code: 'CSC 312', title: 'Systems Analysis and Design', units: 3, test: 24, exam: 52, score: 76, grade: 'A', gp: 15 },
    ]
  },
  {
    id: '400-1',
    levelNumber: 400,
    semesterNumber: 1,
    levelName: '400 Level',
    semesterName: '1st Semester',
    title: '400 Level - 1st Semester (2025/2026)',
    gpa: '5.00',
    totalUnits: 14,
    courses: [
      { code: 'CSC 401', title: 'Technical Research Methodology', units: 2, test: 26, exam: 54, score: 80, grade: 'A', gp: 10 },
      { code: 'CSC 403', title: 'Computer Networks & Security', units: 3, test: 25, exam: 55, score: 80, grade: 'A', gp: 15 },
      { code: 'CSC 405', title: 'Software Engineering Methodologies', units: 3, test: 27, exam: 57, score: 84, grade: 'A', gp: 15 },
      { code: 'CSC 407', title: 'Computer Graphics & Visualization', units: 3, test: 24, exam: 51, score: 75, grade: 'A', gp: 15 },
      { code: 'CSC 409', title: 'Database Management Systems Implementation', units: 3, test: 28, exam: 58, score: 86, grade: 'A', gp: 15 },
    ]
  },
  {
    id: '400-2',
    levelNumber: 400,
    semesterNumber: 2,
    levelName: '400 Level',
    semesterName: '2nd Semester',
    title: '400 Level - 2nd Semester (2025/2026)',
    gpa: '5.00',
    totalUnits: 6,
    courses: [
      { code: 'CSC 410', title: 'Students Industrial Work Experience Scheme (SIWES)', units: 6, test: 28, exam: 62, score: 90, grade: 'A', gp: 30 },
    ]
  },
  {
    id: '500-1',
    levelNumber: 500,
    semesterNumber: 1,
    levelName: '500 Level',
    semesterName: '1st Semester',
    title: '500 Level - 1st Semester (2026/2027)',
    gpa: '5.00',
    totalUnits: 15,
    courses: [
      { code: 'CSC 501', title: 'Artificial Intelligence & Expert Systems', units: 3, test: 26, exam: 58, score: 84, grade: 'A', gp: 15 },
      { code: 'CSC 503', title: 'Distributed Computing Architecture', units: 3, test: 25, exam: 55, score: 80, grade: 'A', gp: 15 },
      { code: 'CSC 505', title: 'Cryptography & Information Security', units: 3, test: 27, exam: 56, score: 83, grade: 'A', gp: 15 },
      { code: 'CSC 507', title: 'Cloud Computing & Virtualization', units: 3, test: 24, exam: 52, score: 76, grade: 'A', gp: 15 },
      { code: 'CSC 509', title: 'Machine Learning & Neural Networks', units: 3, test: 28, exam: 59, score: 87, grade: 'A', gp: 15 },
    ]
  },
  {
    id: '500-2',
    levelNumber: 500,
    semesterNumber: 2,
    levelName: '500 Level',
    semesterName: '2nd Semester',
    title: '500 Level - 2nd Semester (2026/2027)',
    gpa: '5.00',
    totalUnits: 12,
    courses: [
      { code: 'CSC 502', title: 'Mobile Application Development', units: 3, test: 27, exam: 58, score: 85, grade: 'A', gp: 15 },
      { code: 'CSC 504', title: 'Advanced Computer Algorithms', units: 3, test: 26, exam: 56, score: 82, grade: 'A', gp: 15 },
      { code: 'CSC 599', title: 'Independent Capstone Project / Thesis', units: 6, test: 29, exam: 63, score: 92, grade: 'A', gp: 30 },
    ]
  }
];

const Results = () => {
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

  // Determine current student level (e.g. 100, 200, 300, 400, 500)
  const currentLevel = useMemo(() => {
    const levelStr = (user.level || '').toString();
    const match = levelStr.match(/(\d{3})/);
    if (match) {
      return parseInt(match[1], 10);
    }
    if (levelStr.toLowerCase().includes('alumni') || levelStr.toLowerCase().includes('graduated')) {
      return 500;
    }
    if (user.role && (user.role.toLowerCase().includes('admin') || user.role.toLowerCase().includes('president'))) {
      return 500;
    }
    if (user.admission_year) {
      const num = 2026 - parseInt(user.admission_year, 10) + 1;
      if (num >= 5) return 500;
      if (num <= 1) return 100;
      return num * 100;
    }
    return 300; // default fallback
  }, [user]);

  // Semesters Data State (dynamic from database or official curriculum seed)
  const [allSemesters, setAllSemesters] = useState(ALL_SEMESTERS_DATA);

  // By default, filter sets to current level & current semester (e.g. "300-1" or "500-1")
  const [selectedFilter, setSelectedFilter] = useState(() => `${currentLevel}-1`);
  const [hasUserChangedFilter, setHasUserChangedFilter] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const handleUserUpdate = () => {
      const stored = localStorage.getItem('nacos_user');
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch (e) {}
      }
    };
    handleUserUpdate();
    window.addEventListener('storage', handleUserUpdate);
    window.addEventListener('nacos_user_updated', handleUserUpdate);
    return () => {
      window.removeEventListener('storage', handleUserUpdate);
      window.removeEventListener('nacos_user_updated', handleUserUpdate);
    };
  }, []);

  // Dynamically load official recorded results for the current student
  useEffect(() => {
    let isMounted = true;
    const loadStudentResults = async () => {
      try {
        const studentId = user?.matric_number || user?.registration_number || user?.email || '20221234567';
        const res = await fetchResultsForStudent(studentId);
        if (isMounted && res && res.data && res.data.length > 0) {
          const grouped = {};
          res.data.forEach(r => {
            const semNum = String(r.semester || '').includes('2') ? 2 : 1;
            const lvl = Number(r.level) || 100;
            const key = `${lvl}-${semNum}`;
            if (!grouped[key]) {
              grouped[key] = {
                id: key,
                levelNumber: lvl,
                semesterNumber: semNum,
                levelName: `${lvl} Level`,
                semesterName: semNum === 1 ? '1st Semester' : '2nd Semester',
                title: `${lvl} Level - ${semNum === 1 ? '1st' : '2nd'} Semester (${r.session || '2023/2024'})`,
                courses: []
              };
            }
            grouped[key].courses.push({
              code: r.course_code,
              title: r.course_title,
              units: Number(r.units) || 3,
              test: Number(r.test) || 0,
              exam: Number(r.exam) || 0,
              score: Number(r.score) || 0,
              grade: r.grade || 'F',
              gp: Number(r.gp) || 0,
              status: r.status || 'Passed'
            });
          });

          const updated = ALL_SEMESTERS_DATA.map(defaultSem => {
            if (grouped[defaultSem.id] && grouped[defaultSem.id].courses.length > 0) {
              const semData = grouped[defaultSem.id];
              const totalUnits = semData.courses.reduce((sum, c) => sum + (c.units || 0), 0);
              const totalGp = semData.courses.reduce((sum, c) => sum + (c.gp || 0), 0);
              const gpa = totalUnits > 0 ? (totalGp / totalUnits).toFixed(2) : '0.00';
              return {
                ...defaultSem,
                title: semData.title,
                gpa,
                totalUnits,
                courses: semData.courses
              };
            }
            return defaultSem;
          });

          setAllSemesters(updated);
        }
      } catch (err) {
        console.warn('Error loading student results:', err);
      }
    };

    loadStudentResults();
    const handleResultsUpdate = () => loadStudentResults();
    window.addEventListener('storage', handleResultsUpdate);
    window.addEventListener('nacos_results_updated', handleResultsUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('storage', handleResultsUpdate);
      window.removeEventListener('nacos_results_updated', handleResultsUpdate);
    };
  }, [user]);

  // Update default filter when current level resolves, unless user explicitly chose another
  useEffect(() => {
    if (!hasUserChangedFilter) {
      setSelectedFilter(`${currentLevel}-1`);
    }
  }, [currentLevel, hasUserChangedFilter]);

  // Available levels strictly up to the student's current level
  const availableLevels = useMemo(() => {
    const levels = [100, 200, 300, 400, 500];
    return levels.filter(lvl => lvl <= currentLevel);
  }, [currentLevel]);

  // Filter semesters based on student's current level and single filter
  const filteredSemesters = useMemo(() => {
    return allSemesters.filter(sem => {
      // Must not exceed student's current level
      if (sem.levelNumber > currentLevel) return false;

      // Single combined filter
      if (selectedFilter !== 'all') {
        const [lvlStr, semStr] = selectedFilter.split('-');
        if (lvlStr && sem.levelNumber.toString() !== lvlStr) return false;
        if (semStr && semStr !== 'all' && sem.semesterNumber.toString() !== semStr) return false;
      }

      return true;
    });
  }, [allSemesters, currentLevel, selectedFilter]);

  // Calculate Cumulative CGPA (all completed semesters up to current level)
  const cumulativeStats = useMemo(() => {
    const studentSemesters = allSemesters.filter(sem => sem.levelNumber <= currentLevel);
    let totalQualityPoints = 0;
    let totalUnits = 0;

    studentSemesters.forEach(sem => {
      sem.courses.forEach(c => {
        totalQualityPoints += (c.gp || 0);
        totalUnits += (c.units || 0);
      });
    });

    const cgpa = totalUnits > 0 ? (totalQualityPoints / totalUnits).toFixed(2) : '0.00';
    return { cgpa, totalUnits };
  }, [allSemesters, currentLevel]);

  // Calculate stats for current filter selection
  const filteredStats = useMemo(() => {
    let totalQualityPoints = 0;
    let totalUnits = 0;

    filteredSemesters.forEach(sem => {
      sem.courses.forEach(c => {
        totalQualityPoints += (c.gp || 0);
        totalUnits += (c.units || 0);
      });
    });

    const gpa = totalUnits > 0 ? (totalQualityPoints / totalUnits).toFixed(2) : '0.00';
    return { gpa, totalUnits };
  }, [filteredSemesters]);

  const handleDownload = () => {
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);
      window.print();
    }, 400);
  };

  return (
    <PortalLayout>
      <div className="space-y-6">
        
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              Semester Result Checker
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-green-200/80 font-normal mt-1">
              Official semester grades, quality points, and cumulative CGPA standings up to your current level ({currentLevel} Level).
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>{isDownloading ? 'Preparing Statement...' : 'Download Statement (PDF)'}</span>
          </button>
        </div>

        {/* CGPA Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200/80 dark:border-[#138601]/30 space-y-1 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-green-200/80">Cumulative CGPA</span>
              <Award className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {cumulativeStats.cgpa} <span className="text-xs text-gray-400 dark:text-green-300 font-normal">/ 5.00</span>
            </div>
            <div className="text-xs text-[#138601] dark:text-[#4bd043] font-semibold">
              First Class Standing • {currentLevel}L Active
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200/80 dark:border-[#138601]/30 space-y-1 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-green-200/80">
                {selectedFilter === 'all' ? 'Overall Average GPA' : 'Selected Term GPA'}
              </span>
              <GraduationCap className="w-4 h-4 text-blue-600 dark:text-[#4bd043]" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-[#4bd043]">
              {filteredStats.gpa} <span className="text-xs text-gray-400 dark:text-green-300 font-normal">/ 5.00</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-green-200/70 font-normal">
              {filteredStats.totalUnits} Credit Units across {filteredSemesters.length} {filteredSemesters.length === 1 ? 'semester' : 'semesters'}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200/80 dark:border-[#138601]/30 space-y-1 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-green-200/80">Total Units Earned</span>
              <BookOpen className="w-4 h-4 text-amber-600 dark:text-[#4bd043]" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {cumulativeStats.totalUnits} <span className="text-xs text-gray-400 dark:text-green-300 font-normal">Units</span>
            </div>
            <div className="text-xs text-[#138601] dark:text-[#4bd043] font-semibold">
              0 Outstanding Deficiencies
            </div>
          </div>
        </div>

        {/* Single Filter Box - Defaults to Current Level & Semester */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#083002] border border-gray-200/80 dark:border-[#138601]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-gray-400 dark:text-green-300 shrink-0" />
            <label className="text-xs font-semibold text-gray-700 dark:text-green-200 whitespace-nowrap">Filter Academic Session:</label>
            <div className="relative">
              <select
                value={selectedFilter}
                onChange={(e) => {
                  setSelectedFilter(e.target.value);
                  setHasUserChangedFilter(true);
                }}
                className="appearance-none px-3.5 py-2 pr-8 text-xs rounded-lg bg-[#f8fafc] dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/40 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-[#138601] cursor-pointer min-w-[240px] sm:min-w-[280px]"
              >
                <option value="all">All Levels & Semesters (100L – {currentLevel}L)</option>
                {availableLevels.map((lvl) => (
                  <optgroup key={lvl} label={`${lvl} Level`} className="text-gray-900 dark:text-white bg-white dark:bg-[#083002]">
                    <option value={`${lvl}-all`}>{lvl} Level - All Semesters</option>
                    <option value={`${lvl}-1`}>
                      {lvl} Level - 1st Semester {lvl === currentLevel ? '(Current Level)' : ''}
                    </option>
                    <option value={`${lvl}-2`}>{lvl} Level - 2nd Semester</option>
                  </optgroup>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-500 dark:text-green-300 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-green-200/80 font-normal">
            <span>Showing <strong className="text-gray-900 dark:text-white">{filteredSemesters.length}</strong> {filteredSemesters.length === 1 ? 'semester' : 'semesters'}</span>
            {selectedFilter !== `${currentLevel}-1` && (
              <button
                type="button"
                onClick={() => {
                  setSelectedFilter(`${currentLevel}-1`);
                  setHasUserChangedFilter(false);
                }}
                className="text-[#138601] dark:text-[#4bd043] font-semibold hover:underline ml-1 cursor-pointer"
              >
                Reset to Current Semester
              </button>
            )}
          </div>
        </div>

        {/* Results Tables - One Card per Filtered Semester */}
        {filteredSemesters.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200/80 dark:border-[#138601]/30 text-center space-y-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">No results found for this filter selection.</p>
            <p className="text-xs text-gray-500 dark:text-green-200/80">Try selecting a different academic session or resetting the filter.</p>
            <button
              type="button"
              onClick={() => {
                setSelectedFilter(`${currentLevel}-1`);
                setHasUserChangedFilter(false);
              }}
              className="mt-2 inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] transition-colors cursor-pointer"
            >
              Reset to Current Semester
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredSemesters.map((sem) => (
              <div
                key={sem.id}
                className="rounded-2xl bg-white dark:bg-[#083002] border border-gray-200/80 dark:border-[#138601]/30 overflow-hidden shadow-xs"
              >
                {/* Semester Header */}
                <div className="p-4 sm:p-5 border-b border-gray-200/80 dark:border-[#138601]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                      {sem.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-green-200/80 font-normal mt-0.5">
                      Department of Computer Science • {sem.totalUnits} Credit Units
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-900 dark:text-[#4bd043] bg-[#f1f3f5] dark:bg-[#041801] px-3 py-1 rounded-md">
                      Semester GPA: {sem.gpa}
                    </span>
                  </div>
                </div>

                {/* Course Grade Breakdown Table */}
                <div className="overflow-x-auto -mx-px">
                  <table className="w-full text-left text-xs" style={{minWidth: '560px'}}>
                    <thead className="bg-[#f8fafc] dark:bg-[#041801]/60 text-gray-600 dark:text-green-200 font-semibold border-b border-gray-200 dark:border-[#138601]/30">
                      <tr>
                        <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Code</th>
                        <th className="py-3 px-3 sm:px-4">Course Title</th>
                        <th className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">Units</th>
                        <th className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">Test</th>
                        <th className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">Exam</th>
                        <th className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">Total</th>
                        <th className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">Grade</th>
                        <th className="py-3 px-3 sm:px-4 text-right whitespace-nowrap">GP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-[#138601]/15 font-normal">
                      {sem.courses.map((course, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/70 dark:hover:bg-[#041801]/40 transition-colors">
                          <td className="py-3 px-3 sm:px-4 font-semibold text-gray-900 dark:text-white whitespace-nowrap">{course.code}</td>
                          <td className="py-3 px-3 sm:px-4 text-gray-600 dark:text-green-100 min-w-[160px]">{course.title}</td>
                          <td className="py-3 px-3 sm:px-4 text-center text-gray-600 dark:text-green-100">{course.units}</td>
                          <td className="py-3 px-3 sm:px-4 text-center text-gray-600 dark:text-green-100">{course.test}</td>
                          <td className="py-3 px-3 sm:px-4 text-center text-gray-600 dark:text-green-100">{course.exam}</td>
                          <td className="py-3 px-3 sm:px-4 text-center font-semibold text-gray-900 dark:text-white">{course.score}%</td>
                          <td className="py-3 px-3 sm:px-4 text-center">
                            <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                              course.grade === 'A' 
                                ? 'bg-emerald-50 text-[#138601] border border-emerald-200 dark:bg-[#138601]/25 dark:border-[#138601]/40 dark:text-[#4bd043]' 
                                : 'bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-gray-200'
                            }`}>
                              {course.grade}
                            </span>
                          </td>
                          <td className="py-3 px-3 sm:px-4 text-right font-semibold text-gray-900 dark:text-white">{course.gp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </PortalLayout>
  );
};

export default Results;
