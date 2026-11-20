import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Search, 
  Play, 
  GraduationCap, 
  BookOpen, 
  Video, 
  CheckCircle2, 
  Award, 
  ArrowRight,
  TrendingUp,
  Code2,
  Calendar,
  MapPin,
  Flame,
  Clock,
  Check,
  ChevronRight,
  PlusCircle,
  Star
} from "lucide-react";
import { useCourseStore } from "../stores/courseStore";
import { useAuthStore } from "../stores/authStore";

const HomePage = () => {
  const navigate = useNavigate();
  const { 
    allCourses, 
    fetchAllCourses, 
    userEnrollments, 
    fetchUserEnrollments,
    userWorkshopRegs,
    fetchUserWorkshopRegistrations,
    registerForWorkshop
  } = useCourseStore();
  const { user, isAuthenticated } = useAuthStore();
  
  const [selectedTag, setSelectedTag] = useState("all");
  const [heroSearch, setHeroSearch] = useState("");
  const [rsvpLoadingId, setRsvpLoadingId] = useState(null);
  const [rsvpSuccessMap, setRsvpSuccessMap] = useState({});

  useEffect(() => {
    fetchAllCourses();
    if (user?.id) {
      fetchUserEnrollments(user.id);
      fetchUserWorkshopRegistrations(user.id);
    }
  }, [user?.id]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (heroSearch.trim()) {
      navigate(`/courses?search=${encodeURIComponent(heroSearch.trim())}`);
    }
  };

  const categories = [
    { label: "All Topics", tag: "all" },
    { label: "Web Development", tag: "web-dev" },
    { label: "Python & AI", tag: "python" },
    { label: "Frontend React", tag: "frontend" },
    { label: "Backend & APIs", tag: "backend" },
    { label: "Data Science", tag: "data-science" },
  ];

  const liveWorkshops = allCourses.filter(c => c.is_live_workshop);

  // ─── LOGGED-IN DERIVED DATA ───
  const displayName = user?.user_metadata?.full_name || user?.name || "Scholar";
  const userLevel = user?.user_metadata?.level || "Undergraduate";
  const matricNo = user?.user_metadata?.matric_number;

  // Build enrolled courses list with progress
  const enrolledCourses = allCourses
    .map(course => {
      const enrollment = userEnrollments.find(e => String(e.course_id) === String(course.id));
      if (!enrollment) return null;
      return {
        ...course,
        enrolled: true,
        progress: enrollment.progress || 0,
        isCompleted: (enrollment.progress || 0) >= 100,
        current_topic_title: enrollment.current_topic_title || "Modern ES6+ Syntax & Features",
      };
    })
    .filter(Boolean);

  // Active in-progress courses
  const inProgressCourses = enrolledCourses.filter(c => !c.isCompleted);
  const displayInProgress = inProgressCourses;
  const activeContinueCourse = displayInProgress[0] || null;
  const otherInProgress = displayInProgress.slice(1);

  // Identify tags of user's active courses to recommend "Similar Courses"
  const enrolledCourseIds = new Set(enrolledCourses.map(c => c.id));
  const activeTags = new Set(enrolledCourses.flatMap(c => c.tags || []));

  // Find similar courses not yet enrolled
  const similarCourses = allCourses
    .filter(c => !enrolledCourseIds.has(c.id) && !c.is_live_workshop)
    .sort((a, b) => {
      const aMatches = (a.tags || []).filter(t => activeTags.has(t)).length;
      const bMatches = (b.tags || []).filter(t => activeTags.has(t)).length;
      return bMatches - aMatches;
    })
    .slice(0, 3);

  // Check if user is registered for a workshop
  const isUserRegisteredForWorkshop = (workshopId) => {
    if (rsvpSuccessMap[workshopId]) return true;
    return userWorkshopRegs.some(r => String(r.workshop_id) === String(workshopId));
  };

  const handleQuickRsvp = async (workshopId) => {
    if (!isAuthenticated) {
      navigate("/sign-in");
      return;
    }
    setRsvpLoadingId(workshopId);
    try {
      await registerForWorkshop(user?.id || "student-user", workshopId);
      setRsvpSuccessMap(prev => ({ ...prev, [workshopId]: true }));
    } catch (e) {
      console.error("RSVP failed:", e);
    } finally {
      setRsvpLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#000000]">

      {/* ─────────────────────────────────────────────────────────────
          1. HERO VIEW (DYNAMIC: LOGGED-IN vs PUBLIC GUEST)
      ───────────────────────────────────────────────────────────── */}
      {isAuthenticated ? (
        // ─── LOGGED-IN LEARNER MOMENTUM HERO (Clean white & blue with black text) ───
        <section className="relative overflow-hidden pt-8 pb-12 border-b border-blue-100 bg-white shadow-xs">
          <div className="relative site-container space-y-6">
            
            {/* Header greeting & learner badge */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#000000] tracking-tight">
                  Welcome back, <span className="text-[#0056D2]">{displayName}</span>!
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  {matricNo ? `Matric: ${matricNo} · ` : ""}Keep your momentum going. Pick up right where you left off.
                </p>
              </div>

              {/* Quick Metrics Bar */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="px-4 py-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-center gap-2.5 shadow-2xs">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <div>
                    <p className="text-xs font-black text-[#000000]">5-Day Streak</p>
                    <p className="text-[10px] text-gray-500 uppercase font-semibold">Keep it up!</p>
                  </div>
                </div>

                <div className="px-4 py-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-center gap-2.5 shadow-2xs">
                  <Clock className="w-4 h-4 text-[#0056D2]" />
                  <div>
                    <p className="text-xs font-black text-[#000000]">{displayInProgress.length} In Progress</p>
                    <p className="text-[10px] text-gray-500 uppercase font-semibold">Active Tracks</p>
                  </div>
                </div>

                <Link
                  to="/my-learning"
                  className="px-5 py-2.5 rounded-xl bg-[#0056D2] hover:bg-[#0043aa] text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>My Learning</span>
                </Link>
              </div>
            </div>

            {/* Quick Search */}
            <form onSubmit={handleSearchSubmit} className="relative max-w-3xl">
              <div className="flex items-center bg-white border-2 border-blue-200 rounded-xl p-1.5 shadow-sm focus-within:border-[#0056D2] transition-colors">
                <Search className="w-4 h-4 text-[#0056D2] ml-3 shrink-0" />
                <input
                  type="text"
                  value={heroSearch}
                  onChange={(e) => setHeroSearch(e.target.value)}
                  placeholder="Search courses, skills, or curriculum notes (e.g. React, Python, Web Dev)..."
                  className="w-full px-3 py-1.5 bg-transparent text-[#000000] placeholder-gray-400 text-xs sm:text-sm focus:outline-none font-medium"
                />
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0056D2] hover:bg-[#0043aa] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  Search
                </button>
              </div>
            </form>

          </div>
        </section>
      ) : (
        // ─── PUBLIC GUEST MARKETING HERO (Signature Deep Navy SaaS Gradient - Standard Height) ───
        <section className="relative overflow-hidden min-h-[500px] lg:min-h-[540px] flex items-center justify-center py-16 lg:py-20 bg-gradient-to-b from-[#021430] via-[#041c44] to-[#021430] text-white border-b border-blue-900/40 shadow-lg">
          {/* Ambient SaaS Glow & Subtle Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-80 bg-[#0056D2]/25 rounded-full blur-3xl pointer-events-none" />

          <div className="relative site-container text-center space-y-6 w-full">

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none">
              Learn Without Limits. <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300">
                Master In-Demand Tech Skills.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-blue-100/80 max-w-2xl mx-auto leading-relaxed font-normal">
              An open-access tech education platform built for everyone. Free courses, hands-on workshops, and community-contributed curriculums.
            </p>

            {/* Clean Centered Search Bar */}
            <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto relative pt-1">
              <div className="flex items-center bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-1.5 sm:p-2 shadow-2xl focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400/30 transition-all">
                <Search className="w-5 h-5 text-blue-300 ml-3 shrink-0" />
                <input
                  type="text"
                  value={heroSearch}
                  onChange={(e) => setHeroSearch(e.target.value)}
                  placeholder="What skill do you want to learn? (e.g. React, Python, Fullstack, AI...)"
                  className="w-full px-3 sm:px-4 py-2 bg-transparent text-white placeholder-blue-200/60 text-xs sm:text-sm focus:outline-none font-medium"
                />
                <button
                  type="submit"
                  className="px-5 sm:px-6 py-2.5 bg-[#0056D2] hover:bg-[#0043aa] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-colors shrink-0 cursor-pointer"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Clean Dual Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-1">
              <Link
                to="/sign-up"
                className="px-8 py-3.5 rounded-xl bg-[#0056D2] hover:bg-[#0043aa] text-white text-sm font-bold shadow-lg shadow-blue-900/50 transition-all transform hover:-translate-y-0.5"
              >
                Join for Free
              </Link>

              <Link
                to="/courses"
                className="px-8 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-bold border border-white/20 backdrop-blur-xs transition-colors"
              >
                Explore Catalog
              </Link>
            </div>

            {/* Clean Minimal Stats Row */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-5 border-t border-white/15 text-xs text-blue-200/70 font-medium max-w-xl mx-auto">
              <span><strong className="text-white">1,200+</strong> Active Scholars</span>
              <span>•</span>
              <span><strong className="text-white">100% Free</strong> Access</span>
              <span>•</span>
              <span><strong className="text-white">Community</strong> Contributed</span>
            </div>

          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. CONTINUE LEARNING (WHEN LOGGED IN)
      ───────────────────────────────────────────────────────────── */}
      {isAuthenticated && activeContinueCourse ? (
        <section className="site-container py-10 border-b border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0056D2] uppercase tracking-wider mb-1">
                <Play className="w-3.5 h-3.5 fill-[#0056D2]" />
                <span>Jump Back In</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#000000] tracking-tight">
                Continue <span className="text-[#0056D2]">Learning</span>
              </h2>
            </div>

            <Link
              to="/my-learning"
              className="text-xs sm:text-sm font-bold text-[#0056D2] hover:underline flex items-center gap-1"
            >
              <span>View All Enrolled ({displayInProgress.length})</span>
              <ArrowRight className="w-4 h-4 text-[#0056D2]" />
            </Link>
          </div>

          {/* Primary Active Course Spotlight Card */}
          <div className="bg-white border-2 border-blue-200/80 hover:border-[#0056D2] rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row items-center justify-between gap-6">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 w-full lg:w-auto">
              {/* Thumbnail with Level Badge */}
              <div className="relative w-full sm:w-52 h-32 rounded-xl overflow-hidden shrink-0 border border-gray-200 bg-gray-100">
                <img
                  src={activeContinueCourse.thumbnail}
                  alt={activeContinueCourse.title}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/80 text-white backdrop-blur-xs">
                  {activeContinueCourse.level}
                </span>
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-[#0056D2] flex items-center justify-center text-white shadow-lg">
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Title, description & Next Lesson */}
              <div className="space-y-2">
                <h3 className="text-xl font-black text-[#000000] hover:text-[#0056D2] transition-colors leading-snug">
                  {activeContinueCourse.title}
                </h3>
                <p className="text-xs text-gray-600 flex items-center gap-1.5">
                  <span className="font-bold text-[#000000]">Up Next:</span> {activeContinueCourse.current_topic_title}
                </p>

                {/* Progress bar */}
                <div className="w-full max-w-md pt-1">
                  <div className="flex items-center justify-between text-xs text-gray-700 mb-1 font-semibold">
                    <span>Course Progress</span>
                    <span className="font-bold text-[#0056D2]">{activeContinueCourse.progress}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-blue-100 overflow-hidden">
                    <div
                      className="h-full bg-[#0056D2] rounded-full transition-all duration-500"
                      style={{ width: `${activeContinueCourse.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Resume Button */}
            <div className="w-full lg:w-auto shrink-0">
              <button
                onClick={() => navigate(`/courses/${activeContinueCourse.id}`)}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#0056D2] hover:bg-[#0043aa] text-white text-sm font-bold shadow-md transition-transform transform hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Resume Course</span>
              </button>
            </div>

          </div>

          {/* Secondary In-Progress Courses */}
          {otherInProgress.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {otherInProgress.map((course) => (
                <div
                  key={course.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4 hover:border-[#0056D2] transition-colors shadow-2xs"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-16 h-12 rounded-lg object-cover shrink-0 border border-gray-200"
                    />
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-[#000000] truncate">{course.title}</h4>
                      <p className="text-[11px] text-gray-500 font-medium">{course.progress}% completed</p>
                      <div className="w-28 h-1.5 rounded-full bg-blue-100 mt-1 overflow-hidden">
                        <div
                          className="h-full bg-[#0056D2] rounded-full"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/courses/${course.id}/learn`)}
                    className="px-4 py-1.5 rounded-lg bg-blue-50 hover:bg-[#0056D2] text-[#0056D2] hover:text-white text-xs font-bold border border-blue-200 transition-colors shrink-0 cursor-pointer"
                  >
                    Resume
                  </button>
                </div>
              ))}
            </div>
          )}

        </section>
      ) : isAuthenticated ? (
        <section className="site-container py-8 border-b border-gray-200">
          <div className="bg-white border border-blue-200 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xs">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0056D2]">Start Your Learning Journey</span>
              <h3 className="text-xl font-black text-[#000000]">Explore Curated Hands-on Masterclasses</h3>
              <p className="text-xs sm:text-sm text-gray-600 max-w-xl">
                You have not enrolled in any courses yet. Enroll in a track today to start building production software and earning certificates.
              </p>
            </div>
            <Link
              to="/courses"
              className="px-6 py-3 rounded-xl bg-[#0056D2] hover:bg-[#0043aa] text-white text-xs sm:text-sm font-bold shadow-md transition-all shrink-0 flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              <span>Browse Catalog</span>
            </Link>
          </div>
        </section>
      ) : null}

      {/* ─────────────────────────────────────────────────────────────
          3. SIMILAR COURSES / RECOMMENDED FOR YOU (DYNAMIC)
      ───────────────────────────────────────────────────────────── */}
      {isAuthenticated && similarCourses.length > 0 && (
        <section className="site-container py-12 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0056D2] uppercase tracking-wider mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-[#0056D2]" />
                <span>Tailored Recommendations</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#000000] tracking-tight">
                Recommended <span className="text-[#0056D2]">For You</span>
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Based on your active study tracks and computing curriculum.
              </p>
            </div>

            <Link
              to="/courses"
              className="text-xs sm:text-sm font-bold text-[#0056D2] hover:underline flex items-center gap-1"
            >
              <span>Explore All Catalog</span>
              <ArrowRight className="w-4 h-4 text-[#0056D2]" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {similarCourses.map((course) => (
              <div
                key={course.id}
                onClick={() => navigate(`/courses/${course.id}`)}
                className="bg-white border border-gray-200 hover:border-[#0056D2] rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-lg group cursor-pointer shadow-xs"
              >
                <div>
                  <div className="relative aspect-video overflow-hidden bg-gray-100">
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/75 text-white backdrop-blur-xs">
                        {course.level}
                      </span>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {course.tags?.map((t) => (
                        <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-[#0056D2] border border-blue-200 font-semibold">
                          #{t}
                        </span>
                      ))}
                    </div>

                    <h3 className="text-base font-bold text-[#000000] group-hover:text-[#0056D2] transition-colors leading-snug mb-2">
                      {course.title}
                    </h3>

                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[11px] text-gray-500 font-medium">Self-Paced Track</span>
                    <div className="inline-flex items-center gap-1 text-xs font-bold text-[#0056D2] group-hover:translate-x-1 transition-transform">
                      <span>Start Learning</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#0056D2]" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. FEATURED COURSES CATALOG (ALL AUDIENCES)
      ───────────────────────────────────────────────────────────── */}
      <section className="site-container py-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#000000]">
              Explore Top <span className="text-[#0056D2]">Learning Tracks</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Start with fundamentals or dive deep into production-grade systems.
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.tag}
                onClick={() => setSelectedTag(cat.tag)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                  selectedTag === cat.tag
                    ? "bg-[#0056D2] text-white border-[#0056D2] shadow-xs"
                    : "bg-white text-[#000000] border-gray-200 hover:border-[#0056D2] hover:text-[#0056D2]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(selectedTag === "all" ? allCourses : allCourses.filter(c => c.tags?.includes(selectedTag)))
            .slice(0, 6)
            .map((course) => (
              <div
                key={course.id}
                className="bg-white border border-gray-200 hover:border-[#0056D2] rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-xl group cursor-pointer shadow-xs"
                onClick={() => navigate(`/courses/${course.id}`)}
              >
                <div>
                  {/* Thumbnail */}
                  <div className="relative aspect-video overflow-hidden bg-gray-100">
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/75 text-white backdrop-blur-xs">
                        {course.level}
                      </span>
                      {course.is_live_workshop && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500 text-black font-semibold">
                          Workshop
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {course.tags?.map((t) => (
                        <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-[#0056D2] border border-blue-200 font-semibold">
                          #{t}
                        </span>
                      ))}
                    </div>

                    <h3 className="text-lg font-bold text-[#000000] group-hover:text-[#0056D2] transition-colors leading-snug mb-2">
                      {course.title}
                    </h3>

                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>
                  </div>
                </div>

                <div className="p-6 pt-0">
                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">Self-Paced Track</span>
                    <div className="inline-flex items-center gap-1 text-xs font-bold text-[#0056D2] group-hover:translate-x-1 transition-transform">
                      <span>View Course</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#0056D2]" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>

        <div className="text-center mt-12">
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white hover:bg-gray-50 text-[#0056D2] text-xs sm:text-sm font-bold border-2 border-[#0056D2] transition-colors shadow-sm"
          >
            <span>View All Courses & Tracks</span>
            <ArrowRight className="w-4 h-4 text-[#0056D2]" />
          </Link>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. UPCOMING WORKSHOPS (WITH PERSONALIZED RSVP STATUS)
      ───────────────────────────────────────────────────────────── */}
      {liveWorkshops.length > 0 && (
        <section className="site-container py-16 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0056D2] uppercase tracking-wider mb-1">
                <Video className="w-3.5 h-3.5 text-[#0056D2]" />
                <span>Hands-on Sessions</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#000000]">
                Upcoming Live <span className="text-[#0056D2]">Workshops</span> You Might Be Interested In
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                RSVP for interactive hands-on developer workshops on campus and virtually.
              </p>
            </div>
            <Link
              to="/workshops"
              className="text-xs font-bold text-[#0056D2] hover:underline flex items-center gap-1"
            >
              <span>See All Workshops</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#0056D2]" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {liveWorkshops.map((w) => {
              const isRegistered = isUserRegisteredForWorkshop(w.id);

              return (
                <div
                  key={w.id}
                  className="bg-white border border-gray-200 hover:border-[#0056D2] rounded-2xl p-6 flex flex-col justify-between transition-all hover:shadow-lg shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-[#0056D2] border border-blue-200">
                          Live Hands-on
                        </span>
                        {isRegistered && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>RSVP Confirmed</span>
                          </span>
                        )}
                      </div>

                      <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{w.workshop_details?.date} · {w.workshop_details?.time}</span>
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-[#000000] mb-2">{w.title}</h3>
                    <p className="text-xs text-gray-600 mb-4">{w.description}</p>
                    
                    <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-gray-700 mb-4 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#0056D2] shrink-0" />
                      <span><strong className="text-[#000000]">Venue:</strong> {w.workshop_details?.location}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => navigate(`/courses/${w.id}`)}
                      className="flex-1 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-[#000000] text-xs font-bold border border-gray-200 transition-colors cursor-pointer"
                    >
                      View Details
                    </button>

                    {isRegistered ? (
                      <div className="flex-1 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-[#0056D2] text-xs font-bold flex items-center justify-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-[#0056D2]" />
                        <span>You're Registered</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleQuickRsvp(w.id)}
                        disabled={rsvpLoadingId === w.id}
                        className="flex-1 py-2.5 rounded-xl bg-[#0056D2] hover:bg-[#0043aa] text-white text-xs font-bold transition-colors cursor-pointer shadow-md disabled:opacity-50"
                      >
                        {rsvpLoadingId === w.id ? "Registering..." : "Reserve My Seat"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. WHY LEARN ON NACOS UPSKILL HUB
      ───────────────────────────────────────────────────────────── */}
      <section className="bg-white border-y border-gray-200 py-16">
        <div className="site-container">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-black text-[#000000]">
              Why Learn on <span className="text-[#0056D2]">Upskill Hub?</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-2">
              Engineered for computing scholars, developers, and aspiring software professionals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#F8FAFC] border border-blue-100 rounded-2xl p-6 shadow-2xs hover:border-[#0056D2] transition-colors">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-[#0056D2] mb-4">
                <BookOpen className="w-5 h-5 text-[#0056D2]" />
              </div>
              <h3 className="text-base font-bold text-[#000000] mb-2">Synchronized Syllabus</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Matches the departmental curriculum from 100L through 500L while teaching modern production tools.
              </p>
            </div>

            <div className="bg-[#F8FAFC] border border-blue-100 rounded-2xl p-6 shadow-2xs hover:border-[#0056D2] transition-colors">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-[#0056D2] mb-4">
                <Code2 className="w-5 h-5 text-[#0056D2]" />
              </div>
              <h3 className="text-base font-bold text-[#000000] mb-2">Hands-on Code Projects</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Build real-world portfolios with React, Python, APIs, and cloud services to stand out for internships.
              </p>
            </div>

            <div className="bg-[#F8FAFC] border border-blue-100 rounded-2xl p-6 shadow-2xs hover:border-[#0056D2] transition-colors">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-[#0056D2] mb-4">
                <Video className="w-5 h-5 text-[#0056D2]" />
              </div>
              <h3 className="text-base font-bold text-[#000000] mb-2">Live Coding Workshops</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Participate in live weekend bootcamps led by alumni and senior scholars at the FUTO ICT Innovation Center.
              </p>
            </div>

            <div className="bg-[#F8FAFC] border border-blue-100 rounded-2xl p-6 shadow-2xs hover:border-[#0056D2] transition-colors">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-[#0056D2] mb-4">
                <Award className="w-5 h-5 text-[#0056D2]" />
              </div>
              <h3 className="text-base font-bold text-[#000000] mb-2">Verified Skill Badges</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Earn certificates and badges directly verifiable by recruiters and departmental officials.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          7. CALL TO ACTION FOR CREATORS
      ───────────────────────────────────────────────────────────── */}
      <section className="site-container py-16">
        <div className="bg-gradient-to-r from-[#0056D2] via-[#004bbd] to-[#003e9c] text-white rounded-3xl p-8 sm:p-12 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Are you passionate about teaching tech?
            </h2>
            <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
              Create video modules, publish interactive curriculums, and mentor fellow scholars across the department.
            </p>
          </div>

          <Link
            to="/create-course"
            className="px-8 py-3.5 rounded-xl bg-white hover:bg-gray-100 text-[#0056D2] text-xs sm:text-sm font-black shadow-xl transition-all transform hover:-translate-y-0.5 shrink-0 flex items-center gap-2"
          >
            <span>Launch Creator Studio</span>
            <ArrowRight className="w-4 h-4 text-[#0056D2]" />
          </Link>
        </div>
      </section>

    </div>
  );
};

export default HomePage;
