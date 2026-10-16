import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Play, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  Award, 
  Video, 
  ArrowRight, 
  BarChart3,
  Calendar,
  Users,
  Search,
  Filter,
  Check,
  ChevronRight,
  TrendingUp,
  UserCheck,
  GraduationCap,
  ExternalLink,
  ShieldCheck,
  SlidersHorizontal,
  Mail
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useCourseStore } from '../stores/courseStore';

const INITIAL_MOCK_LEARNERS = [
  {
    id: 'lrn-1',
    name: 'Chukwuebuka Obi',
    matric: '20221345901',
    email: 'c.obi@futo.edu.ng',
    courseId: 'course-1',
    courseTitle: 'Modern Web Engineering with React & Node.js',
    progress: 88,
    completedTopics: 7,
    totalTopics: 8,
    currentLesson: 'Module 3: Cloud Deployment to Vercel & CI/CD',
    lastActive: '15 mins ago',
    status: 'In Progress',
    quizScore: '92%'
  },
  {
    id: 'lrn-2',
    name: 'Adaeze Victoria Nwosu',
    matric: '20211284720',
    email: 'a.nwosu@futo.edu.ng',
    courseId: 'course-1',
    courseTitle: 'Modern Web Engineering with React & Node.js',
    progress: 100,
    completedTopics: 8,
    totalTopics: 8,
    currentLesson: 'Course Completed · Certified',
    lastActive: 'Yesterday',
    status: 'Completed',
    quizScore: '98%'
  },
  {
    id: 'lrn-3',
    name: 'Emeka Divine Miracle',
    matric: '20231429810',
    email: 'e.miracle@futo.edu.ng',
    courseId: 'course-2',
    courseTitle: 'Python for Data Science & Machine Learning',
    progress: 45,
    completedTopics: 4,
    totalTopics: 9,
    currentLesson: 'Module 2: Pandas Data Cleaning & Aggregation',
    lastActive: '3 hours ago',
    status: 'In Progress',
    quizScore: '84%'
  },
  {
    id: 'lrn-4',
    name: 'Somtochukwu K. Ani',
    matric: '20221319020',
    email: 's.ani@futo.edu.ng',
    courseId: 'course-1',
    courseTitle: 'Modern Web Engineering with React & Node.js',
    progress: 25,
    completedTopics: 2,
    totalTopics: 8,
    currentLesson: 'Module 1: Architecture Fundamentals',
    lastActive: '2 days ago',
    status: 'In Progress',
    quizScore: '78%'
  },
  {
    id: 'lrn-5',
    name: 'Blessing Chinaza Eze',
    matric: '20211290310',
    email: 'b.eze@futo.edu.ng',
    courseId: 'course-3',
    courseTitle: 'DevOps & Cloud Systems Architecture',
    progress: 100,
    completedTopics: 6,
    totalTopics: 6,
    currentLesson: 'Course Completed · Certified',
    lastActive: '5 days ago',
    status: 'Completed',
    quizScore: '95%'
  },
  {
    id: 'lrn-6',
    name: 'Kelechi Joshua Anyanwu',
    matric: '20231410290',
    email: 'k.anyanwu@futo.edu.ng',
    courseId: 'course-2',
    courseTitle: 'Python for Data Science & Machine Learning',
    progress: 15,
    completedTopics: 1,
    totalTopics: 9,
    currentLesson: 'Module 1: NumPy Array Manipulation',
    lastActive: 'Just now',
    status: 'In Progress',
    quizScore: '70%'
  }
];

const MyLearningPage = () => {
  const navigate = useNavigate();
  const { user, activeMode, isCreatorApproved, switchMode } = useAuthStore();
  const { allCourses, fetchAllCourses, userEnrollments, fetchUserEnrollments } = useCourseStore();
  
  // Learner states
  const [activeTab, setActiveTab] = useState('in-progress');

  // Tutor states
  const isTutorMode = activeMode === 'creator' || (isCreatorApproved && isCreatorApproved());
  const [learnerSearch, setLearnerSearch] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [selectedLearnerModal, setSelectedLearnerModal] = useState(null);
  const [learnersList, setLearnersList] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('nacos_tutor_learners_db');
      if (stored) {
        try { return JSON.parse(stored); } catch (e) {}
      }
    }
    return INITIAL_MOCK_LEARNERS;
  });

  useEffect(() => {
    fetchAllCourses();
    if (user?.id) {
      fetchUserEnrollments(user.id);
    }
  }, [user?.id]);

  const saveLearners = (updated) => {
    setLearnersList(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nacos_tutor_learners_db', JSON.stringify(updated));
    }
  };

  // Derive enrolled courses with progress for learner view
  const enrolledCourses = allCourses.map((course) => {
    const enrollment = userEnrollments.find((e) => e.course_id === course.id);
    const progress = enrollment?.progress_percentage || enrollment?.progress || 0;
    const isCompleted = progress >= 100;
    return {
      ...course,
      enrolled: !!enrollment,
      progress,
      isCompleted,
      enrollmentId: enrollment?.id,
      completedTopics: enrollment?.completed_topic_ids || [],
    };
  }).filter((c) => c.enrolled);

  const inProgressCourses = enrolledCourses.filter((c) => !c.isCompleted);
  const completedCourses = enrolledCourses.filter((c) => c.isCompleted);

  const displayInProgress = inProgressCourses.length > 0 
    ? inProgressCourses 
    : allCourses.slice(0, 2).map((c, i) => ({ ...c, progress: i === 0 ? 65 : 30, isCompleted: false }));

  const activeCourseSpotlight = displayInProgress[0];

  const displayName = user?.user_metadata?.full_name || 'Scholar';
  const isNacosStudent = user?.isNacosStudent || user?.user_metadata?.is_nacos_student;
  const matricNo = user?.user_metadata?.matric_number;

  // Filtered learners for Tutor Mode
  const filteredLearners = useMemo(() => {
    return learnersList.filter((lrn) => {
      if (selectedCourseFilter !== 'all' && lrn.courseId !== selectedCourseFilter) return false;
      if (selectedStatusFilter !== 'all' && lrn.status.toLowerCase() !== selectedStatusFilter.toLowerCase()) return false;
      if (learnerSearch.trim()) {
        const q = learnerSearch.toLowerCase();
        const matchName = lrn.name.toLowerCase().includes(q);
        const matchMatric = lrn.matric.toLowerCase().includes(q);
        const matchEmail = lrn.email.toLowerCase().includes(q);
        const matchCourse = lrn.courseTitle.toLowerCase().includes(q);
        if (!matchName && !matchMatric && !matchEmail && !matchCourse) return false;
      }
      return true;
    });
  }, [learnersList, selectedCourseFilter, selectedStatusFilter, learnerSearch]);

  const handleUpdateStudentProgress = (studentId, newProgress) => {
    const updated = learnersList.map((s) => {
      if (s.id === studentId) {
        const prog = Math.min(100, Math.max(0, newProgress));
        return {
          ...s,
          progress: prog,
          status: prog >= 100 ? 'Completed' : 'In Progress',
          currentLesson: prog >= 100 ? 'Course Completed · Certified' : s.currentLesson
        };
      }
      return s;
    });
    saveLearners(updated);
    if (selectedLearnerModal && selectedLearnerModal.id === studentId) {
      setSelectedLearnerModal(prev => ({
        ...prev,
        progress: newProgress,
        status: newProgress >= 100 ? 'Completed' : 'In Progress'
      }));
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 1. TUTOR VIEW: LEARNERS PROGRESS TRACKING DASHBOARD
  // ─────────────────────────────────────────────────────────────
  if (isTutorMode) {
    const totalStudents = learnersList.length;
    const completedCount = learnersList.filter(s => s.status === 'Completed').length;
    const activeCount = learnersList.filter(s => s.status === 'In Progress').length;
    const avgProgress = Math.round(learnersList.reduce((acc, s) => acc + s.progress, 0) / (totalStudents || 1));

    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#000000] py-8 px-4 sm:px-6 lg:px-8">
        <div className="site-container space-y-8">
          
          {/* Header Banner */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#0056D2] mb-1 font-mono">
                  Tutor Management Console
                </p>
                <h1 className="text-2xl sm:text-3xl font-black text-[#000000]">
                  Learners & Student Progress Tracker
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1 max-w-2xl leading-relaxed">
                  Real-time registry of all students enrolled in your Upskill Hub courses. Track individual module progress, lesson completion, quiz scores, and certificate milestones.
                </p>
              </div>

              {/* Mode Switcher */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => switchMode && switchMode('learner')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 transition-colors cursor-pointer"
                >
                  Switch to Learner View
                </button>
                <Link
                  to="/create-course"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0056D2] hover:bg-[#0043aa] shadow-xs transition-colors"
                >
                  + Add New Course
                </Link>
              </div>
            </div>

            {/* Quick KPI Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-600 uppercase">Registered Students</span>
                  <Users className="w-4 h-4 text-[#0056D2]" />
                </div>
                <p className="text-2xl font-black text-[#0056D2] mt-2">{totalStudents}</p>
                <span className="text-[11px] text-gray-500">Across all catalog courses</span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-600 uppercase">Active In Progress</span>
                  <Clock className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-2xl font-black text-emerald-700 mt-2">{activeCount}</p>
                <span className="text-[11px] text-gray-500">Currently taking lessons</span>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-600 uppercase">Completed & Certified</span>
                  <Award className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-2xl font-black text-amber-700 mt-2">{completedCount}</p>
                <span className="text-[11px] text-gray-500">100% curriculum passed</span>
              </div>

              <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-600 uppercase">Avg. Cohort Progress</span>
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                </div>
                <p className="text-2xl font-black text-purple-700 mt-2">{avgProgress}%</p>
                <span className="text-[11px] text-gray-500">Overall syllabus coverage</span>
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={learnerSearch}
                onChange={(e) => setLearnerSearch(e.target.value)}
                placeholder="Search students by name, matriculation number, or email..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-[#0056D2] bg-white"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <select
                value={selectedCourseFilter}
                onChange={(e) => setSelectedCourseFilter(e.target.value)}
                className="text-xs px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 focus:outline-none focus:border-[#0056D2]"
              >
                <option value="all">All Courses</option>
                <option value="course-1">Modern Web Engineering</option>
                <option value="course-2">Python for Data Science</option>
                <option value="course-3">DevOps & Cloud Systems</option>
              </select>

              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="text-xs px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 focus:outline-none focus:border-[#0056D2]"
              >
                <option value="all">All Statuses</option>
                <option value="in progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Learners Roster List */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">
                Registered Students ({filteredLearners.length})
              </h2>
              <span className="text-xs text-gray-500">
                Showing active students
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-5">Student / Scholar</th>
                    <th className="py-3 px-5">Enrolled Course</th>
                    <th className="py-3 px-5">Progress</th>
                    <th className="py-3 px-5">Where They Are (Current Lesson)</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {filteredLearners.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400">
                        No students found matching your search and filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLearners.map((lrn) => (
                      <tr key={lrn.id} className="hover:bg-blue-50/30 transition-colors">
                        
                        {/* Student Name & Matric */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#0056D2] text-white font-bold flex items-center justify-center shrink-0 text-xs">
                              {lrn.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 leading-snug">{lrn.name}</p>
                              <p className="text-[11px] text-gray-500">{lrn.matric} · {lrn.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Course Title */}
                        <td className="py-3.5 px-5 font-semibold text-gray-800">
                          {lrn.courseTitle}
                        </td>

                        {/* Progress Bar */}
                        <td className="py-3.5 px-5">
                          <div className="space-y-1 w-32">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-[#0056D2]">{lrn.progress}%</span>
                              <span className="text-gray-400">{lrn.completedTopics}/{lrn.totalTopics}</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${
                                  lrn.progress >= 100 ? 'bg-[#0056D2]' : 'bg-[#0056D2]'
                                }`}
                                style={{ width: `${Math.max(5, lrn.progress)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Where They Are */}
                        <td className="py-3.5 px-5 text-gray-600 max-w-xs truncate" title={lrn.currentLesson}>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                            <span className="text-xs truncate">{lrn.currentLesson}</span>
                          </div>
                          <span className="text-[10px] text-gray-400 block mt-0.5">Active {lrn.lastActive}</span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold ${
                            lrn.status === 'Completed'
                              ? 'bg-blue-50 text-[#0056D2] border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {lrn.status === 'Completed' ? <CheckCircle2 className="w-3 h-3 text-[#0056D2]" /> : <Clock className="w-3 h-3 text-amber-600" />}
                            <span>{lrn.status}</span>
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-5 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedLearnerModal(lrn)}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 text-[#0056D2] bg-white hover:bg-blue-50 font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                          >
                            Inspect Progress
                          </button>
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Student Progress Detail Modal */}
          {selectedLearnerModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-5 animate-in fade-in zoom-in-95">
                <div className="flex items-start justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#0056D2] text-white font-bold flex items-center justify-center text-sm">
                      {selectedLearnerModal.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">{selectedLearnerModal.name}</h3>
                      <p className="text-xs text-gray-500">{selectedLearnerModal.matric} · {selectedLearnerModal.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedLearnerModal(null)}
                    className="p-1 rounded-md text-gray-400 hover:text-gray-700 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Enrolled Course</span>
                    <p className="text-sm font-bold text-gray-900">{selectedLearnerModal.courseTitle}</p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                      <span>Curriculum Completion</span>
                      <span className="text-[#0056D2]">{selectedLearnerModal.progress}% ({selectedLearnerModal.completedTopics}/{selectedLearnerModal.totalTopics} Topics)</span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#0056D2] rounded-full transition-all"
                        style={{ width: `${selectedLearnerModal.progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                      <span>Assessment Score: <strong className="text-gray-800">{selectedLearnerModal.quizScore}</strong></span>
                      <span>Last Active: <strong className="text-gray-800">{selectedLearnerModal.lastActive}</strong></span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-gray-500 uppercase block mb-1.5">Where the student is:</span>
                    <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-950 font-medium">
                      {selectedLearnerModal.currentLesson}
                    </div>
                  </div>

                  {/* Manual Progress Adjustment Controls for Tutor */}
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <span className="text-xs font-bold text-gray-800 block">Tutor Progress Override</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateStudentProgress(selectedLearnerModal.id, Math.min(100, selectedLearnerModal.progress + 15))}
                        className="flex-1 py-2 px-3 rounded-lg border border-gray-300 text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                      >
                        + Grant Next Lesson
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateStudentProgress(selectedLearnerModal.id, 100)}
                        className="flex-1 py-2 px-3 rounded-lg bg-[#0056D2] text-white text-xs font-bold hover:bg-[#0043aa] shadow-xs cursor-pointer"
                      >
                        Mark 100% & Certify
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-right">
                  <button
                    type="button"
                    onClick={() => setSelectedLearnerModal(null)}
                    className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-semibold cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. LEARNER VIEW: MY LEARNING ENROLLED COURSES
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#000000] py-8 px-4 sm:px-6 lg:px-8">
      <div className="site-container space-y-8">
        
        {/* Welcome Banner & KPI Metrics */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#000000]">
                Welcome back, {displayName}!
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                {isNacosStudent ? `NACOS Scholar (${matricNo || 'Department of Computer Science'})` : 'Continuous Tech Skills & Learning Track'}
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 shrink-0">
              <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-3.5 text-center min-w-[90px] shadow-2xs">
                <p className="text-xl sm:text-2xl font-black text-[#0056D2]">
                  {displayInProgress.length}
                </p>
                <p className="text-[10px] uppercase font-bold text-gray-600">In Progress</p>
              </div>

              <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-3.5 text-center min-w-[90px] shadow-2xs">
                <p className="text-xl sm:text-2xl font-black text-[#0056D2]">
                  {completedCourses.length || '1'}
                </p>
                <p className="text-[10px] uppercase font-bold text-gray-600">Completed</p>
              </div>

              <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-3.5 text-center min-w-[90px] shadow-2xs">
                <p className="text-xl sm:text-2xl font-black text-[#0056D2]">
                  14.5
                </p>
                <p className="text-[10px] uppercase font-bold text-gray-600">Hours Learnt</p>
              </div>
            </div>
          </div>
        </div>

        {/* Resume Learning Hero Card (Coursera-style Spotlight) */}
        {activeCourseSpotlight && (
          <div className="bg-white border-2 border-blue-200/80 hover:border-[#0056D2] rounded-2xl p-6 shadow-xs relative overflow-hidden transition-all">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <img
                  src={activeCourseSpotlight.thumbnail}
                  alt={activeCourseSpotlight.title}
                  className="w-24 h-20 sm:w-32 sm:h-24 object-cover rounded-xl border border-gray-200 shrink-0"
                />
                <div>
                  <span className="text-[11px] font-bold text-[#0056D2] uppercase tracking-wider block mb-1">
                    Resume Where You Left Off
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-[#000000] mb-2 leading-snug">
                    {activeCourseSpotlight.title}
                  </h3>
                  <div className="w-full max-w-md">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1 font-semibold">
                      <span>Course Progress</span>
                      <span className="font-bold text-[#0056D2]">{activeCourseSpotlight.progress}% completed</span>
                    </div>
                    <div className="w-full h-2.5 bg-blue-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#0056D2] rounded-full transition-all duration-500" 
                        style={{ width: `${Math.max(5, activeCourseSpotlight.progress)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full lg:w-auto">
                <button
                  onClick={() => navigate(`/courses/${activeCourseSpotlight.id}/learn`)}
                  className="flex-1 lg:flex-none px-7 py-3 rounded-xl bg-[#0056D2] hover:bg-[#0043aa] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all transform hover:-translate-y-0.5 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Resume Learning</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 flex items-center gap-6">
          <button
            onClick={() => setActiveTab('in-progress')}
            className={`pb-3 text-sm font-bold tracking-tight transition-colors border-b-2 cursor-pointer ${
              activeTab === 'in-progress'
                ? 'text-[#0056D2] border-[#0056D2]'
                : 'text-gray-500 border-transparent hover:text-[#0056D2]'
            }`}
          >
            In Progress ({displayInProgress.length})
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`pb-3 text-sm font-bold tracking-tight transition-colors border-b-2 cursor-pointer ${
              activeTab === 'completed'
                ? 'text-[#0056D2] border-[#0056D2]'
                : 'text-gray-500 border-transparent hover:text-[#0056D2]'
            }`}
          >
            Completed ({completedCourses.length})
          </button>

          <button
            onClick={() => setActiveTab('resources')}
            className={`pb-3 text-sm font-bold tracking-tight transition-colors border-b-2 cursor-pointer ${
              activeTab === 'resources'
                ? 'text-[#0056D2] border-[#0056D2]'
                : 'text-gray-500 border-transparent hover:text-[#0056D2]'
            }`}
          >
            Saved Academic Resources
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'in-progress' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayInProgress.map((course) => (
              <div
                key={course.id}
                className="bg-white border border-gray-200 hover:border-[#0056D2] rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-lg group shadow-xs"
              >
                <div>
                  <div className="relative aspect-video rounded-xl overflow-hidden mb-4 border border-gray-100 bg-gray-100">
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-2.5 right-2.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/75 text-white backdrop-blur-xs">
                      {course.level}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#000000] group-hover:text-[#0056D2] transition-colors leading-snug mb-2">
                    {course.title}
                  </h3>

                  <p className="text-xs text-gray-600 line-clamp-2 mb-4 leading-relaxed">
                    {course.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1.5 font-semibold">
                    <span>Progress</span>
                    <span className="font-bold text-[#0056D2]">{course.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden mb-4">
                    <div 
                      className="h-full bg-[#0056D2] rounded-full" 
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>

                  <button
                    onClick={() => navigate(`/courses/${course.id}/learn`)}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-50 hover:bg-[#0056D2] text-xs font-bold text-[#0056D2] hover:text-white border border-blue-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Go to Course</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'completed' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center py-12 shadow-xs">
            <Award className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-[#000000] mb-1">Foundational Web Architecture</h3>
            <p className="text-xs text-gray-600 max-w-md mx-auto mb-4">
              Completed 100% · Certificate of Completion generated on September 2026.
            </p>
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0056D2] text-white text-xs font-bold shadow-md cursor-pointer hover:bg-[#0043aa]">
              <Award className="w-4 h-4" />
              <span>Download Digital Certificate</span>
            </div>
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center py-12 shadow-xs">
            <BookOpen className="w-12 h-12 text-[#0056D2] mx-auto mb-3" />
            <h3 className="text-lg font-bold text-[#000000] mb-1">Academic Lecture Notes & Handouts</h3>
            <p className="text-xs text-gray-600 max-w-md mx-auto mb-6">
              Access synchronized semester handouts, past exam solutions, and textbooks for your department.
            </p>
            <Link
              to="/resources"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0056D2] text-white text-xs font-bold shadow-md hover:bg-[#0043aa]"
            >
              <span>Explore Resource Vault</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

      </div>
    </div>
  );
};

export default MyLearningPage;
