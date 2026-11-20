import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Check,
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Play, 
  ArrowLeft, 
  Menu, 
  X, 
  Award, 
  FileText, 
  HelpCircle, 
  Share2, 
  Download,
  GraduationCap,
  Clock,
  BookOpen,
  LayoutGrid
} from 'lucide-react';
import { useCourseStore } from '../stores/courseStore';
import { useAuthStore } from '../stores/authStore';
import upskillLogo from '../assets/upskill-full-logo.png';

const CourseDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
    currentCourse, 
    currentTopics, 
    fetchCourseById, 
    currentEnrollment, 
    fetchCurrentEnrollment, 
    enrollInCourse, 
    markTopicComplete, 
    status 
  } = useCourseStore();

  // Active video & curriculum states
  const [activeTopicIndex, setActiveTopicIndex] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });
  const [activeTab, setActiveTab] = useState('content'); // 'content' | 'quizzes' | 'certificates'
  const [expandedModules, setExpandedModules] = useState({ 0: true, 1: true, 2: true });
  const [personalNotes, setPersonalNotes] = useState('');
  const [showCompletionToast, setShowCompletionToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Lesson updated!');

  useEffect(() => {
    if (!user) {
      navigate(`/courses/${id}`, { replace: true });
      return;
    }
    if (id) {
      fetchCourseById(id);
      if (user?.id) {
        fetchCurrentEnrollment(user.id, id);
      }
    }
  }, [id, user]);

  const activeTopic = currentTopics[activeTopicIndex] || currentTopics[0];

  // Group topics into 2-3 logical course modules (like Coursera / screenshot)
  const modules = useMemo(() => {
    if (!currentTopics || currentTopics.length === 0) return [];

    const total = currentTopics.length;
    if (total <= 3) {
      return [
        {
          id: 'mod-1',
          title: currentCourse?.title ? `${currentCourse.title} - Core Architecture` : 'Core Foundations',
          topics: currentTopics,
        }
      ];
    }

    const mid = Math.ceil(total / 2);
    return [
      {
        id: 'mod-1',
        title: 'Foundations & Architectural Overview',
        topics: currentTopics.slice(0, mid),
      },
      {
        id: 'mod-2',
        title: 'Deep Dive & Practical Implementation',
        topics: currentTopics.slice(mid, total - 1),
      },
      {
        id: 'mod-3',
        title: 'Production Testing & Conclusion',
        topics: currentTopics.slice(total - 1),
      }
    ];
  }, [currentTopics, currentCourse]);

  // Completed topics tracker
  const completedTopicIds = useMemo(() => {
    return currentEnrollment?.completed_topic_ids || [];
  }, [currentEnrollment]);

  // Derived progress percentage
  const progressPercent = useMemo(() => {
    if (!currentTopics || currentTopics.length === 0) return 0;
    if (currentEnrollment?.progress !== undefined) {
      return currentEnrollment.progress;
    }
    if (currentEnrollment?.progress_percentage !== undefined) {
      return currentEnrollment.progress_percentage;
    }
    const completedCount = completedTopicIds.length;
    return Math.min(100, Math.round((completedCount / currentTopics.length) * 100));
  }, [currentTopics, currentEnrollment, completedTopicIds]);

  const handleToggleModule = (index) => {
    setExpandedModules(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleSelectTopic = (index) => {
    setActiveTopicIndex(index);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const isCurrentTopicCompleted = activeTopic ? completedTopicIds.includes(activeTopic.id) : false;

  const handleToggleComplete = async () => {
    if (!activeTopic) return;
    if (!user?.id) return;
    if (!currentEnrollment) {
      await enrollInCourse(user.id, id);
    }
    const wasCompleted = isCurrentTopicCompleted;
    await markTopicComplete(activeTopic.id);
    setToastMessage(
      wasCompleted 
        ? "Lesson marked as incomplete." 
        : "Lesson marked as complete! Progress updated."
    );
    setShowCompletionToast(true);
    setTimeout(() => setShowCompletionToast(false), 2500);
  };

  const handlePrevTopic = () => {
    if (activeTopicIndex > 0) {
      setActiveTopicIndex(activeTopicIndex - 1);
    }
  };

  const handleNextTopic = () => {
    if (activeTopicIndex < currentTopics.length - 1) {
      setActiveTopicIndex(activeTopicIndex + 1);
    }
  };

  const activeModule = useMemo(() => {
    return modules.find(m => m.topics.some(t => t.id === activeTopic?.id)) || modules[0];
  }, [modules, activeTopic]);

  // Extract clean YouTube embed ID safely from any URL format
  const youtubeVideoId = useMemo(() => {
    if (!activeTopic?.video_url) return 'W6NZfCO5SIk';
    const str = String(activeTopic.video_url).trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
    const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : 'W6NZfCO5SIk';
  }, [activeTopic]);

  if (status === 'PENDING' && !currentCourse) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#0056D2] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-gray-300">Loading course player...</p>
        </div>
      </div>
    );
  }

  const courseTitle = currentCourse?.title || "Modern JavaScript & Architecture";

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col overflow-hidden bg-[#f8fafc] text-gray-900 font-sans relative">
      
      {/* ─── EXACT TOP BAR MATCHING REFERENCE SCREENSHOTS ─── */}
      <header className="shrink-0 z-30 w-full bg-white border-b border-gray-200 px-4 sm:px-6 py-3 shadow-2xs">
        
        {/* Row 1: Brand Logo on Left + Action Buttons on Right */}
        <div className="flex items-center justify-between gap-3">
          <Link to="/courses" className="flex items-center gap-2 group" title="Back to Courses">
            <img 
              src={upskillLogo} 
              alt="NACOS FUTO Upskill Hub" 
              className="h-7 sm:h-8 w-auto object-contain" 
            />
          </Link>

          <div className="flex items-center gap-2">
            <Link
              to="/courses"
              className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-md shadow-2xs transition-colors"
            >
              Course Page
            </Link>

            <Link
              to="/my-learning"
              className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-md shadow-2xs transition-colors"
            >
              My courses
            </Link>
          </div>
        </div>

        {/* Row 2: Course Title */}
        <h1 className="text-base sm:text-lg font-bold text-gray-900 mt-2.5 truncate">
          {courseTitle}
        </h1>

        {/* Row 3: Orange Progress Bar + % Learnt + Hamburger Menu Button */}
        <div className="flex items-center justify-between gap-4 mt-2">
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(4, progressPercent)}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">
              {progressPercent}% Learnt
            </span>
          </div>

          {/* Hamburger Menu Toggle (Curriculum Sidebar) */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 text-gray-800 hover:text-black transition-colors cursor-pointer"
            title={sidebarOpen ? "Close syllabus" : "Open syllabus"}
            aria-label="Toggle Syllabus"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

      </header>

      {/* ─── MAIN CONTENT VIEW (RESPONSIVE: LESSON PLAYER VS SYLLABUS) ─── */}
      <div className="flex-1 flex overflow-hidden min-h-0 w-full relative">
        
        {/* ─── LEFT / CENTER: LESSON PLAYER VIEW (FLUSH LAPTOP-FIT EDGES) ─── */}
        <div className={`flex-1 overflow-y-auto min-h-0 bg-[#f8fafc] flex flex-col justify-between overscroll-contain w-full p-0 sm:p-3 lg:p-4 ${
          sidebarOpen ? 'hidden md:flex' : 'flex'
        }`}>
          <div className="w-full space-y-3 sm:space-y-4">
            
            {/* Slide / Video Player Card Container - Flush to edges on mobile, snug on laptop */}
            <div className="bg-black sm:rounded-2xl overflow-hidden shadow-sm border-b sm:border border-gray-200">
              <div className="w-full aspect-video bg-black relative">
                <iframe
                  key={youtubeVideoId}
                  src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1`}
                  title={activeTopic?.title || "Course Video"}
                  className="w-full h-full border-0 block"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="eager"
                />
              </div>
            </div>

            {/* Bottom Status Row: Module | Topic Title + Status Dot + Lesson Completed + Toggle Switch */}
            <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4 mx-3 sm:mx-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                <h2 className="text-sm sm:text-base font-bold text-gray-900 leading-snug">
                  {activeModule?.title || 'Foundations'} | {activeTopic?.title || 'Interactive Lesson'}
                </h2>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    isCurrentTopicCompleted ? 'bg-[#0056D2]' : 'bg-amber-500'
                  }`} />
                  <span className={`text-xs font-semibold whitespace-nowrap ${
                    isCurrentTopicCompleted ? 'text-[#0056D2]' : 'text-gray-600 font-medium'
                  }`}>
                    {isCurrentTopicCompleted ? 'Lesson completed' : 'Lesson incomplete'}
                  </span>
                  
                  {/* Switch Toggle */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isCurrentTopicCompleted}
                    onClick={handleToggleComplete}
                    className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                      isCurrentTopicCompleted ? 'bg-[#0056D2]' : 'bg-gray-300'
                    }`}
                    title={isCurrentTopicCompleted ? "Click to mark as incomplete" : "Click to mark as complete"}
                  >
                    <div
                      className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${
                        isCurrentTopicCompleted ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Navigation Action Buttons: Previous & Next */}
              <div className="flex items-center justify-between gap-4 pt-1">
                <button
                  type="button"
                  onClick={handlePrevTopic}
                  disabled={activeTopicIndex === 0}
                  className="px-6 py-2.5 rounded-lg border border-[#0056D2] text-[#0056D2] hover:bg-blue-50 text-xs sm:text-sm font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  Previous
                </button>

                <button
                  type="button"
                  onClick={handleNextTopic}
                  disabled={activeTopicIndex >= currentTopics.length - 1}
                  className="px-6 py-2.5 rounded-lg bg-[#0056D2] hover:bg-[#0046a8] text-white text-xs sm:text-sm font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                >
                  Next
                </button>
              </div>

              {/* Requirement Alert Banner */}
              <div className="p-4 rounded-xl bg-sky-50/80 border border-sky-100 text-sky-950 text-xs sm:text-sm leading-relaxed">
                You are required to complete <strong className="font-bold">100%</strong> of the course and mandatory quiz(s) to get a certificate. Progress: <strong className="font-bold">{completedTopicIds.length}/{currentTopics.length}</strong> mandatory topic(s) completed ({progressPercent}%)
              </div>

              {/* Educational Summary & Learner Notes */}
              <div className="pt-4 border-t border-gray-100 grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-2">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Educational Summary
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                    {activeTopic?.summary_text || currentCourse?.description || "In this module, you will gain hands-on architectural experience, study best practices, and implement key features with step-by-step guidance."}
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-2">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#0056D2]" />
                    <span>Lesson Notes</span>
                  </h4>
                  <textarea
                    value={personalNotes}
                    onChange={(e) => setPersonalNotes(e.target.value)}
                    placeholder="Type personal takeaways or code notes..."
                    className="w-full h-20 p-2 text-xs bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#0056D2] resize-none"
                  />
                  <button
                    onClick={() => alert('Note saved to your session!')}
                    className="w-full py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Save Note
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ─── RIGHT / FULL ON MOBILE: ACCORDION SYLLABUS VIEW (Screenshot 1) ─── */}
        {sidebarOpen && (
          <aside className="w-full md:w-80 lg:w-96 bg-white border-l border-gray-200 flex flex-col shrink-0 h-full overflow-hidden min-h-0 z-30 shadow-lg animate-in fade-in duration-150">
            
            {/* Top Navigation Tabs: Content | Quizzes | Certificates */}
            <div className="border-b border-gray-200 flex items-center justify-around px-4 pt-3 shrink-0 bg-white">
              <button
                onClick={() => setActiveTab('content')}
                className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer border-b-2 ${
                  activeTab === 'content'
                    ? 'text-sky-600 border-sky-600'
                    : 'text-gray-500 border-transparent hover:text-gray-900'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Content</span>
              </button>

              <button
                onClick={() => setActiveTab('quizzes')}
                className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer border-b-2 ${
                  activeTab === 'quizzes'
                    ? 'text-sky-600 border-sky-600'
                    : 'text-gray-500 border-transparent hover:text-gray-900'
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>Quizzes</span>
              </button>

              <button
                onClick={() => setActiveTab('certificates')}
                className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer border-b-2 ${
                  activeTab === 'certificates'
                    ? 'text-sky-600 border-sky-600'
                    : 'text-gray-500 border-transparent hover:text-gray-900'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>Certificates</span>
              </button>
            </div>

            {/* TAB 1: CONTENT (ACCORDION MODULES MATCHING SCREENSHOT 1) */}
            {activeTab === 'content' && (
              <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3.5 overscroll-contain bg-white">
                {modules.map((mod, modIdx) => {
                  const isExpanded = Boolean(expandedModules[modIdx]);
                  const modTopicCount = mod.topics.length;
                  const modPassedCount = mod.topics.filter(t => completedTopicIds.includes(t.id)).length;
                  const isModCompleted = modPassedCount === modTopicCount && modTopicCount > 0;

                  return (
                    <div 
                      key={mod.id} 
                      className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-2xs"
                    >
                      {/* Module Accordion Header */}
                      <button
                        onClick={() => handleToggleModule(modIdx)}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/80 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Circular Blue Icon */}
                          <div className="w-10 h-10 rounded-full bg-[#0056D2] flex items-center justify-center text-white shrink-0 shadow-2xs">
                            <LayoutGrid className="w-5 h-5" />
                          </div>

                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug truncate">
                              {mod.title}
                            </h4>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mt-1">
                              {isModCompleted ? (
                                <span className="inline-flex items-center gap-1 text-[#0056D2] font-semibold">
                                  <CheckCircle2 className="w-4 h-4 fill-[#0056D2] text-white" />
                                  <span>{modPassedCount}/{modTopicCount} passed</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-gray-500">
                                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                                  <span>{modPassedCount}/{modTopicCount} passed</span>
                                </span>
                              )}
                              <span>·</span>
                              <span>{modTopicCount} Topics</span>
                            </div>
                          </div>
                        </div>

                        {/* Chevron Toggle */}
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400 shrink-0 ml-2" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400 shrink-0 ml-2" />
                        )}
                      </button>

                      {/* Expanded Topics List */}
                      {isExpanded && (
                        <div className="border-t border-gray-100 p-2 space-y-1.5 bg-gray-50/40">
                          {mod.topics.map((topic) => {
                            const globalIndex = currentTopics.findIndex(t => t.id === topic.id);
                            const isActive = globalIndex === activeTopicIndex;
                            const isTopicCompleted = completedTopicIds.includes(topic.id);

                            return (
                              <button
                                key={topic.id}
                                onClick={() => handleSelectTopic(globalIndex)}
                                className={`w-full p-3 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                                  isActive
                                    ? 'bg-sky-50 border border-sky-300 shadow-2xs'
                                    : isTopicCompleted
                                      ? 'bg-emerald-50/40 hover:bg-emerald-50/70 border border-emerald-100'
                                      : 'hover:bg-white border border-transparent'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {/* Topic Icon */}
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                    isTopicCompleted
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : isActive
                                        ? 'bg-[#0056D2] text-white'
                                        : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {isTopicCompleted ? (
                                      <Check className="w-4 h-4 stroke-[3] text-emerald-700" />
                                    ) : (
                                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                                    )}
                                  </div>

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <p className={`text-xs font-bold leading-snug truncate ${
                                        isTopicCompleted ? 'text-emerald-950 font-bold' : 'text-gray-900'
                                      }`}>
                                        {topic.title}
                                      </p>
                                    </div>
                                    <p className="text-[11px] text-gray-500 mt-0.5">
                                      Video · {topic.duration || '12:30'}
                                    </p>
                                  </div>
                                </div>

                                {/* Sub Course Completion Checkmark Badge - Clean blue checkmark, no 'Done' text */}
                                <div className="shrink-0 ml-2">
                                  {isTopicCompleted ? (
                                    <div className="w-5 h-5 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0056D2]" title="Lesson Completed">
                                      <Check className="w-3.5 h-3.5 stroke-[3] text-[#0056D2]" />
                                    </div>
                                  ) : (
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 inline-block" title="Lesson incomplete" />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 2: QUIZZES */}
            {activeTab === 'quizzes' && (
              <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3 overscroll-contain bg-white">
                <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-sky-950">
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-1">Knowledge Checks</h4>
                  <p className="text-xs text-sky-800">
                    Test your understanding after completing modules to unlock your graduation certificate.
                  </p>
                </div>

                <div className="border border-gray-200 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold text-gray-900">Module 1 Assessment</p>
                  <p className="text-[11px] text-gray-500">5 Multiple Choice Questions · 80% passing mark</p>
                  <button 
                    onClick={() => alert('Quiz simulation: Congratulations, you passed with 100%!')}
                    className="w-full py-2 bg-[#0056D2] hover:bg-[#0043aa] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Start Assessment
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: CERTIFICATES */}
            {activeTab === 'certificates' && (
              <div className="flex-1 overflow-y-auto min-h-0 p-4 text-center space-y-4 overscroll-contain bg-white">
                <div className="p-6 border border-gray-200 rounded-2xl bg-gray-50">
                  <Award className="w-12 h-12 text-amber-500 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-gray-900">Certificate of Completion</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Issued by NACOS FUTO Academic Board upon 100% course completion.
                  </p>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs font-bold text-gray-700 mb-2">
                      Current Progress: {progressPercent}%
                    </p>
                    <button
                      disabled={progressPercent < 100}
                      className="w-full py-2.5 rounded-xl bg-[#0056D2] text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                    >
                      {progressPercent >= 100 ? 'Claim Verified Certificate' : 'Complete All Modules to Unlock'}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </aside>
        )}

      </div>

      {/* Completion Toast Notification */}
      {showCompletionToast && (
        <div className="fixed bottom-6 left-6 z-50 bg-[#0056D2] text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-white/20 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

    </div>
  );
};

export default CourseDetailPage;
