import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Check, 
  Star, 
  Users, 
  Clock, 
  Award, 
  BookOpen, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  Globe, 
  ShieldCheck, 
  CheckCircle2, 
  Lock,
  ArrowLeft,
  GraduationCap
} from 'lucide-react';
import { useCourseStore } from '../stores/courseStore';
import { useAuthStore } from '../stores/authStore';
import upskillLogoMark from '../assets/upskill-logo-mark.png';
import { checkCreatorVerifiedSync } from '../services/mockDatabase';

const slugify = (str) => {
  if (!str) return '';
  return String(str).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

const CoursePreviewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { 
    currentCourse, 
    currentTopics, 
    fetchCourseById, 
    currentEnrollment, 
    fetchCurrentEnrollment, 
    enrollInCourse, 
    status 
  } = useCourseStore();

  const [expandedModules, setExpandedModules] = useState({ 0: true, 1: true, 2: true });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [lockedTopicClicked, setLockedTopicClicked] = useState(null);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCourseById(id);
      if (user?.id) {
        fetchCurrentEnrollment(user.id, id);
      }
    }
  }, [id, user?.id]);

  // Derived course data with clean, relevant instructor & curriculum details
  const course = useMemo(() => {
    const raw = currentCourse || {};
    const instructorName = raw.creator_name || raw.instructor_name || 'Senior Course Instructor';

    let instructorTitle = raw.instructor_title;
    let instructorBio = raw.instructor_bio;

    if (!instructorTitle) {
      if (instructorName.toLowerCase().includes('smilga')) {
        instructorTitle = 'Full-Stack Developer & Technical Educator';
        instructorBio = 'Renowned software engineer and educator with hundreds of thousands of students worldwide, specializing in project-driven, practical JavaScript and React engineering.';
      } else if (instructorName.toLowerCase().includes('learnit')) {
        instructorTitle = 'Senior Digital Media Specialist & Instructor';
        instructorBio = 'Professional creative technologist with over a decade of industry expertise delivering enterprise design and digital media masterclasses.';
      } else {
        instructorTitle = 'Software Engineer & Technical Lead';
        instructorBio = 'Experienced software architect and mentor with over 7 years of industry background building scalable web applications and distributed systems.';
      }
    }

    return {
      id: raw.id || id,
      title: raw.title || 'Complete Modern Web Development & Full-Stack Mastery',
      description: raw.description || 'Master full-stack modern web development from fundamentals to production cloud deployment. Build scalable applications, dynamic interactive frontends, and robust RESTful APIs.',
      level: raw.level || 'Beginner to Advanced',
      duration: raw.duration || '6 Weeks · 4-6 hrs/week',
      rating: raw.rating || 4.9,
      enrolled_count: raw.enrolled_count || 2480,
      instructor_name: instructorName,
      instructor_title: instructorTitle,
      instructor_bio: instructorBio,
      prerequisites: raw.prerequisites || 'Basic familiarity with computer operations and internet access. Prior programming experience is helpful but not required.',
      skills: raw.skills || raw.tags || [
        'React.js',
        'TypeScript',
        'Node.js & Express',
        'RESTful APIs',
        'PostgreSQL',
        'Git & GitHub',
        'System Architecture',
        'Cloud Deployment'
      ]
    };
  }, [currentCourse, id]);

  const [isVerifiedInstructor, setIsVerifiedInstructor] = useState(() => 
    checkCreatorVerifiedSync(course.instructor_name || course.creator_name || course.creator_id)
  );

  useEffect(() => {
    setIsVerifiedInstructor(checkCreatorVerifiedSync(course.instructor_name || course.creator_name || course.creator_id));
    const handleSync = () => {
      setIsVerifiedInstructor(checkCreatorVerifiedSync(course.instructor_name || course.creator_name || course.creator_id));
    };
    window.addEventListener('storage', handleSync);
    return () => window.removeEventListener('storage', handleSync);
  }, [course.instructor_name, course.creator_name, course.creator_id]);

  // Group topics into logical modules
  const modules = useMemo(() => {
    if (!currentTopics || currentTopics.length === 0) {
      return [];
    }

    const total = currentTopics.length;
    if (total <= 3) {
      return [{
        id: 'mod-1',
        title: 'Module 1: Core Curriculum & Hands-on Labs',
        duration: '2 hrs 30 min',
        description: 'Complete hands-on topics and master the subject matter.',
        topics: currentTopics.map((t, idx) => ({ ...t, type: idx % 2 === 0 ? 'Video' : 'Lab' }))
      }];
    }

    const mid = Math.ceil(total / 2);
    return [
      {
        id: 'mod-1',
        title: 'Module 1: Foundations & Core Architecture',
        duration: '2 hrs 15 min',
        description: 'Fundamental principles, configuration, and architecture.',
        topics: currentTopics.slice(0, mid).map((t, idx) => ({ ...t, type: idx % 2 === 0 ? 'Video' : 'Lab' }))
      },
      {
        id: 'mod-2',
        title: 'Module 2: Advanced Topics & Hands-on Implementation',
        duration: '3 hrs 40 min',
        description: 'Deep dive into practical implementation, tests, and real-world projects.',
        topics: currentTopics.slice(mid).map((t, idx) => ({ ...t, type: idx % 2 === 0 ? 'Video' : 'Assessment' }))
      }
    ];
  }, [currentTopics]);

  const totalTopicsCount = currentTopics?.length || 8;
  const isEnrolled = Boolean(currentEnrollment);

  const handleGetStarted = async () => {
    if (!isAuthenticated || !user) {
      setLockedTopicClicked(null);
      setShowAuthModal(true);
      return;
    }

    setEnrolling(true);
    try {
      if (!isEnrolled && user?.id && id) {
        await enrollInCourse(user.id, id);
      }
      navigate(`/courses/${id}/learn`);
    } catch (err) {
      console.error('Enrollment error:', err);
      navigate(`/courses/${id}/learn`);
    } finally {
      setEnrolling(false);
    }
  };

  const handleLessonClick = (topic) => {
    if (isEnrolled) {
      navigate(`/courses/${id}/learn`);
      return;
    }
    setLockedTopicClicked(topic);
    setShowAuthModal(true);
  };

  const toggleModule = (idx) => {
    setExpandedModules(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const expandAllModules = () => {
    const all = {};
    modules.forEach((_, idx) => { all[idx] = true; });
    setExpandedModules(all);
  };

  const collapseAllModules = () => {
    const none = {};
    modules.forEach((_, idx) => { none[idx] = false; });
    setExpandedModules(none);
  };

  const areAllExpanded = modules.length > 0 && modules.every((_, idx) => expandedModules[idx]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 font-sans pb-24">
      
      {/* ─── BREADCRUMBS ─── */}
      <div className="bg-[#031B4E] text-blue-200 text-xs py-3 border-b border-blue-900/40">
        <div className="site-container flex items-center gap-2">
          <Link to="/courses" className="hover:text-white transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Browse Courses</span>
          </Link>
          <span>/</span>
          <span className="text-blue-300 truncate max-w-xs">{course.title}</span>
        </div>
      </div>

      {/* ─── HERO BANNER ─── */}
      <section className="bg-gradient-to-b from-[#031B4E] to-[#0A2540] text-white pt-10 pb-16 lg:pb-20">
        <div className="site-container grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Column: Info & Title */}
          <div className="lg:col-span-8 space-y-6">
            <p className="text-xs sm:text-sm font-semibold tracking-wider text-blue-200 uppercase font-mono">
              Professional Certificate
            </p>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
              {course.title}
            </h1>

            <p className="text-base sm:text-lg text-blue-100/90 leading-relaxed max-w-3xl">
              {course.description}
            </p>

            {/* Ratings, Enrolled, Language */}
            <div className="flex flex-wrap items-center gap-y-3 gap-x-6 text-xs sm:text-sm text-blue-200 pt-2 border-t border-white/10">
              <div className="flex items-center gap-1.5">
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <span className="font-bold text-white">4.9</span>
                <span className="opacity-75">({course.enrolled_count || 1240} ratings)</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-300" />
                <span><strong className="text-white">{(course.enrolled_count || 2480).toLocaleString()}</strong> students enrolled</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-blue-300" />
                <span>Taught in English</span>
              </div>
            </div>

            {/* Course Instructor Strip */}
            <div className="flex items-center gap-3.5 pt-2">
              <Link 
                to={`/instructors/${slugify(course.instructor_name)}`}
                className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-400 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-md border border-white/20 hover:scale-105 transition-transform"
                title={`View ${course.instructor_name}'s profile`}
              >
                {(course.instructor_name || 'CI').split(' ').map(n => n[0]).slice(0, 2).join('')}
              </Link>
              <div className="text-xs">
                <span className="text-blue-300 font-medium block">Taught by</span>
                <Link 
                  to={`/instructors/${slugify(course.instructor_name)}`}
                  className="text-white font-bold text-sm hover:text-blue-200 transition-colors flex items-center gap-1.5"
                >
                  <span>{course.instructor_name}</span>
                  {isVerifiedInstructor && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 fill-sky-400/20 shrink-0" title="Verified Creator" />
                  )}
                </Link>
                <p className="text-blue-200/80 text-[11px]">{course.instructor_title}</p>
              </div>
            </div>

            {/* Mobile Primary CTA */}
            <div className="block lg:hidden pt-4 space-y-3">
              <button
                type="button"
                onClick={handleGetStarted}
                disabled={enrolling}
                className="w-full py-4 px-6 rounded-xl bg-[#0056D2] hover:bg-[#0046a8] text-white font-bold text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{isEnrolled ? 'Continue Learning' : 'Get Started'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <p className="text-[11px] text-center text-blue-200">
                100% Free · Full Lifetime Access
              </p>
            </div>
          </div>

          {/* Right Column: Sticky Enrollment Action Card */}
          <div className="hidden lg:block lg:col-span-4">
            <div className="sticky top-24 bg-white text-gray-900 rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="p-6 space-y-5">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    Online Course
                  </span>
                  <div className="text-2xl font-extrabold text-gray-900 pt-1">
                    Free Enrollment
                  </div>
                  <p className="text-xs text-gray-500">
                    Full access to all course materials & certificate
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGetStarted}
                  disabled={enrolling}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#0056D2] hover:bg-[#0046a8] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>{isEnrolled ? 'Continue Learning' : 'Get Started'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <p className="text-center text-[11px] text-gray-500">
                  {isAuthenticated ? 'Instant access with your account' : 'Login or sign up to begin'}
                </p>

                <div className="border-t border-gray-100 pt-4 space-y-3 text-xs text-gray-600">
                  <div className="flex items-center gap-2.5">
                    <Award className="w-4 h-4 text-[#0056D2] shrink-0" />
                    <span>Shareable Certificate upon completion</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-[#0056D2] shrink-0" />
                    <span>{course.duration || 'Self-paced · Approx 6 weeks'}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 text-[#0056D2] shrink-0" />
                    <span>{totalTopicsCount} interactive video lessons & practical tasks</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-[#0056D2] shrink-0" />
                    <span>Beginner Friendly · Step-by-step guidance</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ─── QUICK STATS BAR ─── */}
      <div className="bg-white border-b border-gray-200">
        <div className="site-container py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="space-y-1">
            <span className="text-xs text-gray-500 font-medium">Skill Level</span>
            <p className="text-sm font-bold text-gray-900">{course.level || 'Beginner to Advanced'}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-gray-500 font-medium">Commitment</span>
            <p className="text-sm font-bold text-gray-900">{course.duration || 'Self-Paced'}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-gray-500 font-medium">Prerequisites</span>
            <p className="text-sm font-bold text-gray-900">None required</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-gray-500 font-medium">Credential</span>
            <p className="text-sm font-bold text-gray-900">Certificate of Completion</p>
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT BODY ─── */}
      <div className="site-container mt-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-10">
          
          {/* 1. About the Course Detail */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-2xs space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                About this Course
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Curriculum overview, technical scope & practical takeaways
              </p>
            </div>

            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
              {course.description}
            </p>

            {/* Course Specifications Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Skill Level</span>
                <p className="text-xs sm:text-sm font-bold text-gray-900">{course.level || 'Beginner to Advanced'}</p>
                <p className="text-[11px] text-gray-500">Step-by-step guidance from foundational principles to production</p>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Time Commitment</span>
                <p className="text-xs sm:text-sm font-bold text-gray-900">{course.duration || '6 Weeks · 4-6 hrs/week'}</p>
                <p className="text-[11px] text-gray-500">100% Self-Paced · Learn on your own schedule with lifetime access</p>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Prerequisites</span>
                <p className="text-xs sm:text-sm font-bold text-gray-900">None required</p>
                <p className="text-[11px] text-gray-500">{course.prerequisites || 'Basic familiarity with computer operations and internet access'}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Official Credential</span>
                <p className="text-xs sm:text-sm font-bold text-gray-900">Certificate of Completion</p>
                <p className="text-[11px] text-gray-500">Shareable certificate to showcase on your resume and LinkedIn</p>
              </div>
            </div>

            {/* Who Should Enroll */}
            <div className="pt-2 border-t border-gray-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-2">
                Who this course is for:
              </h3>
              <ul className="space-y-1.5 text-xs text-gray-600">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#0056D2]" />
                  <span>Aspiring software engineers looking for industry-grade skills and practical project experience.</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#0056D2]" />
                  <span>Developers preparing for technical interviews, internships, and corporate roles.</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#0056D2]" />
                  <span>Self-paced builders wanting a comprehensive, hands-on curriculum.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* 2. Course Instructor */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-2xs space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Course Instructor
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Learn directly from experienced practitioners and technical educators
                </p>
              </div>

              <Link
                to={`/instructors/${slugify(course.instructor_name)}`}
                className="text-xs font-bold text-[#0056D2] hover:text-[#0046a8] hover:underline flex items-center gap-1 shrink-0"
              >
                <span>View Full Profile</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row items-start gap-5">
              <Link
                to={`/instructors/${slugify(course.instructor_name)}`}
                className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#0056D2] to-blue-500 text-white font-extrabold text-xl flex items-center justify-center shrink-0 shadow-md hover:scale-105 transition-transform"
                title={`View ${course.instructor_name}'s profile`}
              >
                {(course.instructor_name || 'CI').split(' ').map(n => n[0]).slice(0, 2).join('')}
              </Link>

              <div className="space-y-3 flex-1">
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/instructors/${slugify(course.instructor_name)}`}
                      className="text-base sm:text-lg font-bold text-gray-900 hover:text-[#0056D2] transition-colors"
                    >
                      {course.instructor_name}
                    </Link>
                    {isVerifiedInstructor && (
                      <CheckCircle2 className="w-4 h-4 text-[#0056D2] fill-blue-50 shrink-0" title="Verified Creator" />
                    )}
                  </div>
                  <p className="text-xs text-[#0056D2] font-semibold mt-0.5">
                    {course.instructor_title}
                  </p>
                </div>

                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  {course.instructor_bio}
                </p>

                {/* Tutor Highlights Strip */}
                <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-gray-600 border-t border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span><strong className="text-gray-900">4.9 / 5</strong> Instructor Rating</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#0056D2]" />
                    <span><strong className="text-gray-900">{(course.enrolled_count || 2480).toLocaleString()}</strong> Students Taught</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Course Q&A & Code Support</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    to={`/instructors/${slugify(course.instructor_name)}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0056D2] hover:text-[#0046a8] hover:underline"
                  >
                    <span>Explore all courses published by {course.instructor_name}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* 3. What You Will Learn Card */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-2xs space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                What you will learn
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Core competencies, industry skills & practical takeaways
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                'Build and deploy robust production applications from ground up',
                'Master architectural patterns and state management with clean code',
                'Integrate databases, authentication & secure APIs',
                'Write modular, testable code adhering to industry standards',
                'Configure automated deployment pipelines and cloud infrastructure',
                'Earn a shareable certificate to showcase on your resume and LinkedIn'
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2.5 rounded-xl bg-gray-50/70 border border-gray-100">
                  <div className="w-5 h-5 rounded-md bg-blue-50 text-[#0056D2] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span className="text-xs sm:text-sm text-gray-800 leading-snug">{item}</span>
                </div>
              ))}
            </div>

            {/* Skills You Will Gain */}
            <div className="pt-3 border-t border-gray-100 space-y-2">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Skills you'll gain:
              </h3>
              <div className="flex flex-wrap gap-2">
                {course.skills.map((skill, idx) => (
                  <span 
                    key={idx} 
                    className="px-3 py-1 rounded-md bg-blue-50 text-[#0056D2] border border-blue-200/80 text-xs font-semibold capitalize"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Course Syllabus & Content (Explorable Dropdowns, Locked from Access) */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Course Syllabus & Curriculum
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {modules.length} Modules · {totalTopicsCount} Lessons · Full outline preview available
                </p>
              </div>

              {/* Expand / Collapse All Toggle Button */}
              <button
                type="button"
                onClick={areAllExpanded ? collapseAllModules : expandAllModules}
                className="text-xs font-bold text-[#0056D2] hover:text-[#0046a8] hover:underline self-start sm:self-auto cursor-pointer"
              >
                {areAllExpanded ? 'Collapse All Modules' : 'Expand All Modules'}
              </button>
            </div>

            {/* Explorable Preview Lock Notice */}
            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#0056D2] text-white flex items-center justify-center shrink-0 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-gray-900">
                  Explorable Syllabus Outline
                </h4>
                <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                  You can freely expand each module dropdown below to explore the syllabus, lesson titles, and durations. Individual video lectures, source code, and practical exercises require free enrollment to access.
                </p>
              </div>
            </div>

            {/* Module Accordions / Dropdowns */}
            <div className="space-y-4">
              {modules.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
                  Curriculum lessons are being scheduled by the instructor. Check back shortly!
                </div>
              ) : (
                modules.map((mod, modIdx) => {
                const isExpanded = Boolean(expandedModules[modIdx]);
                return (
                  <div 
                    key={mod.id}
                    className="border border-gray-200 rounded-xl overflow-hidden transition-all bg-white"
                  >
                    <button
                      type="button"
                      onClick={() => toggleModule(modIdx)}
                      className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors cursor-pointer bg-white"
                      aria-expanded={isExpanded}
                    >
                      <div className="space-y-1 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#0056D2] uppercase tracking-wider font-mono">
                            Module {modIdx + 1}
                          </span>
                          <span className="text-xs text-gray-300">·</span>
                          <span className="text-xs text-gray-500">{mod.duration || '2 hours'}</span>
                          <span className="text-xs text-gray-300">·</span>
                          <span className="text-xs text-gray-500">{mod.topics.length} lessons</span>
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-gray-900">
                          {mod.title}
                        </h3>
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {mod.description}
                        </p>
                      </div>

                      <div className="shrink-0 p-1 text-gray-400">
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-[#0056D2]" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </button>

                    {/* Explorable Lessons List (Clickable to trigger Lock Notice) */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50/60 p-4 space-y-2">
                        {mod.topics.map((t, tIdx) => (
                          <div 
                            key={t.id || tIdx}
                            onClick={() => handleLessonClick(t)}
                            className="p-3 bg-white rounded-lg border border-gray-200/80 flex items-center justify-between hover:border-amber-400 hover:bg-amber-50/20 transition-all cursor-pointer group shadow-2xs"
                            title="Click to view access requirement"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-7 h-7 rounded-md bg-gray-100 text-gray-500 group-hover:bg-amber-100 group-hover:text-amber-800 flex items-center justify-center shrink-0 transition-colors">
                                <Lock className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0 text-left">
                                <p className="text-xs font-semibold text-gray-900 group-hover:text-[#0056D2] transition-colors truncate">
                                  {t.title}
                                </p>
                                <span className="text-[11px] text-gray-500 font-medium">
                                  {t.type || 'Video Lecture'} · {t.duration || '15 min'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 bg-gray-100 group-hover:bg-amber-100 group-hover:text-amber-800 px-2.5 py-1 rounded transition-colors shrink-0">
                              <Lock className="w-3 h-3 text-gray-400 group-hover:text-amber-700" />
                              <span>Locked · Enroll to Access</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }))}
            </div>
          </div>

          {/* 5. Verified Credential Showcase */}
          <div className="bg-gradient-to-br from-[#021430] to-[#041c44] text-white rounded-2xl p-6 sm:p-8 shadow-md space-y-4 border border-blue-900/60">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5 font-mono">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Official Credential</span>
            </p>
            <h3 className="text-xl font-bold text-white">
              Earn a Certificate of Completion
            </h3>
            <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed max-w-xl">
              Add this certificate to your LinkedIn profile, resume, or CV. Showcase your hands-on mastery of modern tools and technologies to employers and recruiters worldwide.
            </p>
          </div>

        </div>
      </div>

      {/* ─── STICKY BOTTOM BAR FOR MOBILE ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 p-4 lg:hidden shadow-lg flex items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-blue-600 uppercase block">Free Course</span>
          <span className="text-xs font-bold text-gray-900 truncate max-w-[180px] block">{course.title}</span>
        </div>
        <button
          type="button"
          onClick={handleGetStarted}
          disabled={enrolling}
          className="px-6 py-2.5 rounded-xl bg-[#0056D2] hover:bg-[#0046a8] text-white text-xs font-bold transition-all shadow-md shrink-0 cursor-pointer disabled:opacity-50"
        >
          {isEnrolled ? 'Continue' : 'Get Started'}
        </button>
      </div>

      {/* ─── ENROLLMENT / AUTHENTICATION GUARD MODAL ─── */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-200 space-y-6 text-center animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-white p-2 flex items-center justify-center mx-auto border border-blue-200 shadow-md">
              <img src={upskillLogoMark} alt="Upskill Logo" className="w-full h-full object-contain" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Enrollment Required</span>
              </div>
              <h3 className="text-xl font-extrabold text-gray-900">
                {lockedTopicClicked ? lockedTopicClicked.title : 'Sign in to Start Learning'}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                {lockedTopicClicked 
                  ? 'This lesson is locked. To watch video lectures, access coding exercises, and earn your certificate, enroll in this course for free.'
                  : 'To access course lessons, track your progress, and earn certificates, please log in with your account or create a new student account.'}
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={handleGetStarted}
                  disabled={enrolling}
                  className="w-full py-3.5 rounded-xl bg-[#0056D2] hover:bg-[#0046a8] text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span>{enrolling ? 'Enrolling...' : 'Enroll Free & Access Lesson'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => navigate(`/login?redirect=/courses/${id}/learn`)}
                    className="w-full py-3.5 rounded-xl bg-[#0056D2] hover:bg-[#0046a8] text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer"
                  >
                    Log In to Your Account
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(`/sign-up?redirect=/courses/${id}/learn`)}
                    className="w-full py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-900 text-xs sm:text-sm font-bold transition-all cursor-pointer border border-gray-300"
                  >
                    Create Free Account
                  </button>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setShowAuthModal(false);
                setLockedTopicClicked(null);
              }}
              className="text-xs text-gray-500 hover:text-gray-800 transition-colors pt-1 block mx-auto cursor-pointer"
            >
              Cancel and continue previewing
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default CoursePreviewPage;
