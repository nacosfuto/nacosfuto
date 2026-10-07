import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  Star, 
  Users, 
  BookOpen, 
  ArrowLeft, 
  ArrowRight, 
  Globe, 
  Award,
  Video,
  Layers,
  Sparkles,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { useCourseStore } from '../stores/courseStore';
import { useAuthStore } from '../stores/authStore';
import { db, checkCreatorVerifiedSync } from '../services/mockDatabase';

const INSTRUCTOR_BIOS = {
  'john-smilga': {
    name: 'John Smilga',
    title: 'Full-Stack Developer & Technical Educator',
    bio: 'Renowned software engineer and educator with hundreds of thousands of students worldwide. Specializes in building project-driven curriculum around modern JavaScript, React hooks, Node.js microservices, and fullstack cloud architectures.',
    avatar: 'JS'
  },
  'learnit-anytime': {
    name: 'Learnit Anytime',
    title: 'Senior Digital Media Specialist & Instructor',
    bio: 'Professional creative technologist with over a decade of industry expertise delivering enterprise design and digital media masterclasses, from Photoshop and UI/UX to motion graphics.',
    avatar: 'LA'
  },
  'ai-research-group': {
    name: 'AI Research Group',
    title: 'Machine Learning & AI Research Collective',
    bio: 'Dedicated team of research scientists, AI fellows, and machine learning practitioners focused on practical generative AI frameworks, prompt engineering, and ethical deployment.',
    avatar: 'AI'
  },
  'grow-with-google': {
    name: 'Grow with Google',
    title: 'Official Google Career Certificate Partner',
    bio: 'Industry training initiative by Google providing job-ready credentials in artificial intelligence, digital productivity, and cloud technology.',
    avatar: 'GG'
  }
};

const slugify = (str) => {
  if (!str) return '';
  return String(str).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

const InstructorProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { allCourses, fetchAllCourses, userEnrollments } = useCourseStore();

  const targetSlug = slugify(id || '');
  const [isVerified, setIsVerified] = useState(() => checkCreatorVerifiedSync(targetSlug));
  const [updatingBadge, setUpdatingBadge] = useState(false);

  useEffect(() => {
    if (!allCourses || allCourses.length === 0) {
      fetchAllCourses();
    }
  }, [allCourses?.length]);

  useEffect(() => {
    setIsVerified(checkCreatorVerifiedSync(targetSlug));
    const handleSync = () => {
      setIsVerified(checkCreatorVerifiedSync(targetSlug));
    };
    window.addEventListener('storage', handleSync);
    return () => window.removeEventListener('storage', handleSync);
  }, [targetSlug]);

  // Filter courses published by this instructor
  const publishedCourses = useMemo(() => {
    if (!allCourses || allCourses.length === 0) return [];

    return allCourses.filter((c) => {
      const cId = slugify(c.creator_id || '');
      const cName = slugify(c.creator_name || '');
      const cInstructor = slugify(c.instructor_name || '');

      return (
        cId === targetSlug ||
        cName === targetSlug ||
        cInstructor === targetSlug ||
        (targetSlug && (cName.includes(targetSlug) || targetSlug.includes(cName))) ||
        (targetSlug && (cInstructor.includes(targetSlug) || targetSlug.includes(cInstructor)))
      );
    });
  }, [allCourses, targetSlug]);

  // Determine Instructor Details
  const instructor = useMemo(() => {
    // 1. Direct match from curated bio table
    if (INSTRUCTOR_BIOS[targetSlug]) {
      return INSTRUCTOR_BIOS[targetSlug];
    }

    // 2. Find from published courses
    const sampleCourse = publishedCourses[0] || allCourses?.find((c) => 
      slugify(c.creator_name || '') === targetSlug || 
      slugify(c.creator_id || '') === targetSlug
    );

    if (sampleCourse) {
      const name = sampleCourse.creator_name || sampleCourse.instructor_name || 'Senior Instructor';
      return {
        name,
        title: sampleCourse.instructor_title || 'Software Engineer & Technical Educator',
        bio: sampleCourse.instructor_bio || `${name} is an experienced industry practitioner and educator on Upskill Hub, mentoring developers and building practical, project-based curriculum.`,
        avatar: name.split(' ').map(n => n[0]).slice(0, 2).join('')
      };
    }

    // 3. Fallback un-slugified name
    const humanName = (id || 'Instructor')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());

    return {
      name: humanName,
      title: 'Course Instructor & Technical Mentor',
      bio: `${humanName} is an active educator on Upskill Hub delivering production-grade curricula and mentoring computing students.`,
      avatar: humanName.split(' ').map(n => n[0]).slice(0, 2).join('')
    };
  }, [targetSlug, id, publishedCourses, allCourses]);

  // Handle Admin Verification Toggle
  const handleToggleVerification = async () => {
    setUpdatingBadge(true);
    try {
      const nextStatus = !isVerified;
      await db.setCreatorVerification(targetSlug, nextStatus);
      setIsVerified(nextStatus);
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error('Error toggling creator verification badge:', err);
    } finally {
      setUpdatingBadge(false);
    }
  };

  // Compute aggregate instructor metrics
  const totalStudents = useMemo(() => {
    if (publishedCourses.length === 0) return 2480;
    return publishedCourses.reduce((acc, c) => acc + (c.enrolled_count || 1240), 0);
  }, [publishedCourses]);

  const uniqueTags = useMemo(() => {
    const set = new Set();
    publishedCourses.forEach(c => {
      (c.tags || []).forEach(t => set.add(t));
    });
    return Array.from(set);
  }, [publishedCourses]);

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
          <span className="text-blue-300">Instructors</span>
          <span>/</span>
          <span className="text-white font-medium truncate max-w-xs">{instructor.name}</span>
        </div>
      </div>

      {/* ─── INSTRUCTOR PROFILE HEADER ─── */}
      <section className="bg-gradient-to-b from-[#031B4E] to-[#0A2540] text-white pt-12 pb-16">
        <div className="site-container">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 lg:gap-8">
            
            {/* Avatar with checkmark only when verified */}
            <div className="relative shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-tr from-[#0056D2] to-blue-400 text-white font-black text-3xl sm:text-4xl flex items-center justify-center shadow-xl border-2 border-white/20">
                {instructor.avatar}
              </div>
              {isVerified && (
                <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-md" title="Verified Creator Badge">
                  <CheckCircle2 className="w-6 h-6 text-[#0056D2] fill-white" />
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="space-y-3 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight flex items-center gap-2.5">
                  <span>{instructor.name}</span>
                  {isVerified && (
                    <CheckCircle2 className="w-6 h-6 text-sky-400 fill-sky-400/20 shrink-0" title="Verified Creator" />
                  )}
                </h1>
              </div>

              <p className="text-sm sm:text-base text-blue-200 font-semibold">
                {instructor.title}
              </p>

              <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed max-w-3xl">
                {instructor.bio}
              </p>

              {/* Stats Bar */}
              <div className="flex flex-wrap items-center gap-6 pt-3 text-xs sm:text-sm text-blue-200 border-t border-white/10">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-blue-300" />
                  <span><strong className="text-white">{publishedCourses.length}</strong> {publishedCourses.length === 1 ? 'Course' : 'Courses'} Published</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-300" />
                  <span><strong className="text-white">{totalStudents.toLocaleString()}</strong> Students Taught</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <span className="font-bold text-white">4.9</span>
                  <span className="opacity-75">Instructor Rating</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── CREATOR BADGE MANAGEMENT (ADMIN PRIVILEGE CONTROL) ─── */}
      <div className="site-container -mt-6">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isVerified ? 'bg-blue-50 text-[#0056D2]' : 'bg-gray-100 text-gray-400'}`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-bold text-gray-900">
                  {isVerified ? 'Verified Creator Badge Assigned' : 'Creator Unverified'}
                </h4>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider font-mono ${isVerified ? 'bg-blue-100 text-[#0056D2]' : 'bg-gray-100 text-gray-500'}`}>
                  {isVerified ? 'Active' : 'Not Assigned'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Verified badges are assigned by the Academic Council when a creator demonstrates high pedagogical excellence.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleVerification}
            disabled={updatingBadge}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 ${
              isVerified 
                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200' 
                : 'bg-[#0056D2] text-white hover:bg-[#0046a8] shadow-md'
            }`}
          >
            {updatingBadge ? (
              <span>Updating...</span>
            ) : isVerified ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Revoke Verification Badge</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Assign Verified Badge</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─── INSTRUCTOR COURSES CATALOG ─── */}
      <div className="site-container mt-12 space-y-8">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2.5">
              <span>Courses Published by {instructor.name}</span>
              <span className="text-xs font-bold text-[#0056D2] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                {publishedCourses.length}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Explore all learning tracks, practical projects, and certifications published by this instructor
            </p>
          </div>

          <Link
            to="/courses"
            className="text-xs font-bold text-[#0056D2] hover:text-[#0046a8] hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>View All Platform Courses</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Course Cards Grid */}
        {publishedCourses.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white rounded-2xl border border-dashed border-gray-300 space-y-4">
            <BookOpen className="w-10 h-10 text-gray-400 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-gray-900">No courses published yet</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                {instructor.name} does not have any active public courses at the moment.
              </p>
            </div>
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0056D2] hover:bg-[#0046a8] text-white text-xs font-bold rounded-xl transition-all shadow-md"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Explore Course Catalog</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {publishedCourses.map((course) => {
              const enrollment = userEnrollments.find(
                (e) => String(e.course_id) === String(course.id)
              );
              const isEnrolled = Boolean(enrollment);

              return (
                <div
                  key={course.id}
                  onClick={() => navigate(`/courses/${course.id}`)}
                  className="bg-white rounded-2xl overflow-hidden shadow-2xs hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-[#0056D2] flex flex-col justify-between group cursor-pointer"
                >
                  <div>
                    {/* Visual Thumbnail */}
                    <div className="relative aspect-video overflow-hidden bg-gray-100">
                      <img
                        src={course.thumbnail || "https://res.cloudinary.com/a2mmcttn/image/upload/v1788569330/nacos/gallery/nacos2.jpg"}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/75 backdrop-blur-xs text-white uppercase font-mono">
                          {course.level || "Track"}
                        </span>
                        {course.is_live_workshop && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500 text-black uppercase font-mono">
                            Live Workshop
                          </span>
                        )}
                      </div>

                      {isEnrolled && (
                        <div className="absolute bottom-2.5 right-2.5 bg-black/80 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] text-sky-400 font-bold border border-white/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-sky-400" />
                          <span>Enrolled</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-2.5">
                      <div className="flex flex-wrap gap-1.5 mb-1">
                        {(course.tags || []).slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-[#0056D2] border border-blue-200/80 font-semibold"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>

                      <h3 className="text-base font-bold text-gray-900 group-hover:text-[#0056D2] transition-colors leading-snug line-clamp-2">
                        {course.title}
                      </h3>

                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                        {course.description}
                      </p>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="p-5 pt-0">
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span className="font-bold text-gray-800">4.9</span>
                        <span className="text-[11px] text-gray-400">({course.enrolled_count || 1240})</span>
                      </div>

                      <div className="inline-flex items-center gap-1 font-bold text-[#0056D2] group-hover:translate-x-1 transition-transform shrink-0">
                        <span>View Course</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#0056D2]" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Instructor Topics / Specialties */}
        {uniqueTags.length > 0 && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
              Instructor Teaching Specializations:
            </h3>
            <div className="flex flex-wrap gap-2">
              {uniqueTags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-md bg-gray-50 text-gray-700 border border-gray-200 text-xs font-semibold capitalize"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  );
};

export default InstructorProfilePage;
