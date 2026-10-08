import React, { useState, useEffect, useMemo } from 'react';
import { Download, ChevronDown, Filter, GraduationCap, Award, BookOpen, Clock, FileText } from 'lucide-react';
import PortalLayout from '../components/PortalLayout';
import { fetchResultsForStudent } from '@nacos/supabase';

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

  // Semesters Data State (dynamic from database)
  const [allSemesters, setAllSemesters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter selection
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
        setIsLoading(true);
        const studentId = user?.registration_number || user?.matric_number || user?.matric || user?.id || '';
        if (!studentId) {
          if (isMounted) {
            setAllSemesters([]);
            setIsLoading(false);
          }
          return;
        }

        const res = await fetchResultsForStudent(studentId);
        if (isMounted) {
          if (res && res.data && res.data.length > 0) {
            const grouped = {};
            res.data.forEach((r) => {
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
                  title: `${lvl} Level - ${semNum === 1 ? '1st' : '2nd'} Semester (${r.session || '2024/2025'})`,
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

            const semList = Object.values(grouped).map((semData) => {
              const totalUnits = semData.courses.reduce((sum, c) => sum + (c.units || 0), 0);
              const totalGp = semData.courses.reduce((sum, c) => sum + (c.gp || 0), 0);
              const gpa = totalUnits > 0 ? (totalGp / totalUnits).toFixed(2) : '0.00';
              return {
                ...semData,
                gpa,
                totalUnits
              };
            });

            semList.sort((a, b) => {
              if (a.levelNumber !== b.levelNumber) return a.levelNumber - b.levelNumber;
              return a.semesterNumber - b.semesterNumber;
            });

            setAllSemesters(semList);
          } else {
            setAllSemesters([]);
          }
          setIsLoading(false);
        }
      } catch (err) {
        console.warn('Error loading student results:', err);
        if (isMounted) {
          setAllSemesters([]);
          setIsLoading(false);
        }
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
    return levels.filter((lvl) => lvl <= currentLevel);
  }, [currentLevel]);

  // Filter semesters based on student's current level and single filter
  const filteredSemesters = useMemo(() => {
    return allSemesters.filter((sem) => {
      if (sem.levelNumber > currentLevel) return false;
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
    const studentSemesters = allSemesters.filter((sem) => sem.levelNumber <= currentLevel);
    let totalQualityPoints = 0;
    let totalUnits = 0;

    studentSemesters.forEach((sem) => {
      sem.courses.forEach((c) => {
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

    filteredSemesters.forEach((sem) => {
      sem.courses.forEach((c) => {
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
      <div className="space-y-6 font-sans">
        
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 shadow-xs">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              Semester Result Checker
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-green-200/80 font-normal mt-1">
              Official semester grades, quality points, and cumulative CGPA standings up to your current standing ({currentLevel} Level).
            </p>
          </div>

          {allSemesters.length > 0 && (
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloading ? 'Preparing Statement...' : 'Download Statement (PDF)'}</span>
            </button>
          )}
        </div>

        {/* When No Results Are Published Yet in Database */}
        {allSemesters.length === 0 ? (
          <div className="p-8 sm:p-12 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 text-center space-y-4 shadow-xs">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 flex items-center justify-center text-[#138601] dark:text-[#4bd043]">
              <GraduationCap className="w-7 h-7" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-gray-100 dark:bg-[#041801] text-gray-700 dark:text-green-200 border border-gray-200 dark:border-[#138601]/30">
              <Clock className="w-3.5 h-3.5 text-[#138601] dark:text-[#4bd043]" />
              <span>Awaiting Departmental Senate Release</span>
            </div>

            <div className="max-w-md mx-auto space-y-1.5">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                Your results will show up here when available
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-green-200/80 leading-relaxed font-normal">
                Semester examination scores undergo official board approval before release. Once confirmed and published by the Departmental Examination Officer, your grade breakdown and cumulative CGPA standings will automatically synchronize here.
              </p>
            </div>

            {/* Alternating grey / white informational items */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto pt-2 text-left">
              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#041801]/60 border border-gray-200/80 dark:border-[#138601]/25">
                <span className="text-[11px] font-bold text-gray-900 dark:text-white block">Standard 5.0 Scale</span>
                <span className="text-[10px] text-gray-500 dark:text-green-200/70">FUTO grading system</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#083002] border border-gray-200/80 dark:border-[#138601]/25">
                <span className="text-[11px] font-bold text-gray-900 dark:text-white block">Verified Statements</span>
                <span className="text-[10px] text-gray-500 dark:text-green-200/70">Official downloadable PDF</span>
              </div>
              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#041801]/60 border border-gray-200/80 dark:border-[#138601]/25">
                <span className="text-[11px] font-bold text-gray-900 dark:text-white block">Automatic CGPA</span>
                <span className="text-[10px] text-gray-500 dark:text-green-200/70">Updated per semester</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* CGPA Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 space-y-1 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 dark:text-green-200/80">Cumulative CGPA</span>
                  <Award className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
                </div>
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {cumulativeStats.cgpa} <span className="text-xs text-gray-400 dark:text-green-300 font-normal">/ 5.00</span>
                </div>
                <div className="text-xs text-[#138601] dark:text-[#4bd043] font-semibold">
                  Academic Standing • {currentLevel}L Active
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-gray-50 dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 space-y-1 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 dark:text-green-200/80">
                    {selectedFilter === 'all' ? 'Overall Average GPA' : 'Selected Term GPA'}
                  </span>
                  <GraduationCap className="w-4 h-4 text-gray-700 dark:text-[#4bd043]" />
                </div>
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {filteredStats.gpa} <span className="text-xs text-gray-400 dark:text-green-300 font-normal">/ 5.00</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-green-200/70 font-normal">
                  {filteredStats.totalUnits} Credit Units across {filteredSemesters.length} {filteredSemesters.length === 1 ? 'semester' : 'semesters'}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 space-y-1 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 dark:text-green-200/80">Total Units Earned</span>
                  <BookOpen className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
                </div>
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {cumulativeStats.totalUnits} <span className="text-xs text-gray-400 dark:text-green-300 font-normal">Units</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-green-200/70 font-normal">
                  Official Registered Units
                </div>
              </div>
            </div>

            {/* Single Filter Box */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
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
                    className="appearance-none px-3.5 py-2 pr-8 text-xs rounded-lg bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/40 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-[#138601] cursor-pointer min-w-[240px] sm:min-w-[280px]"
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
              <div className="p-8 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 text-center space-y-2">
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
                    className="rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 overflow-hidden shadow-xs"
                  >
                    {/* Semester Header */}
                    <div className="p-4 sm:p-5 bg-gray-50/70 dark:bg-[#041801]/60 border-b border-gray-200 dark:border-[#138601]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                          {sem.title}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-green-200/80 font-normal mt-0.5">
                          Department of Computer Science • {sem.totalUnits} Credit Units
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-900 dark:text-[#4bd043] bg-white dark:bg-[#041801] px-3 py-1 rounded-md border border-gray-200 dark:border-[#138601]/30">
                          Semester GPA: {sem.gpa}
                        </span>
                      </div>
                    </div>

                    {/* Course Grade Breakdown Table */}
                    <div className="overflow-x-auto -mx-px">
                      <table className="w-full text-left text-xs" style={{ minWidth: '560px' }}>
                        <thead className="bg-gray-50 dark:bg-[#041801]/60 text-gray-700 dark:text-green-200 font-semibold border-b border-gray-200 dark:border-[#138601]/30">
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
                            <tr
                              key={idx}
                              className={idx % 2 === 0 ? 'bg-white dark:bg-[#083002] hover:bg-gray-50 dark:hover:bg-[#041801]/40 transition-colors' : 'bg-gray-50/60 dark:bg-[#041801]/30 hover:bg-gray-50 dark:hover:bg-[#041801]/50 transition-colors'}
                            >
                              <td className="py-3 px-3 sm:px-4 font-semibold text-gray-900 dark:text-white whitespace-nowrap">{course.code}</td>
                              <td className="py-3 px-3 sm:px-4 text-gray-700 dark:text-green-100 min-w-[160px]">{course.title}</td>
                              <td className="py-3 px-3 sm:px-4 text-center text-gray-600 dark:text-green-100">{course.units}</td>
                              <td className="py-3 px-3 sm:px-4 text-center text-gray-600 dark:text-green-100">{course.test}</td>
                              <td className="py-3 px-3 sm:px-4 text-center text-gray-600 dark:text-green-100">{course.exam}</td>
                              <td className="py-3 px-3 sm:px-4 text-center font-semibold text-gray-900 dark:text-white">{course.score}%</td>
                              <td className="py-3 px-3 sm:px-4 text-center">
                                <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                                  course.grade === 'A'
                                    ? 'bg-green-50 text-[#138601] border border-green-200 dark:bg-[#138601]/25 dark:border-[#138601]/40 dark:text-[#4bd043]'
                                    : 'bg-gray-100 text-gray-800 border border-gray-200 dark:bg-white/10 dark:text-gray-200'
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
          </>
        )}

      </div>
    </PortalLayout>
  );
};

export default Results;
