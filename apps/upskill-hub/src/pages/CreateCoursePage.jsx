import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Edit3, 
  PlayCircle, 
  X, 
  Layers, 
  Video, 
  Check, 
  AlertCircle, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight,
  Send,
  Users,
  Eye,
  RefreshCw
} from "lucide-react";
import { db } from "../services/mockDatabase";
import { useAuthStore } from "../stores/authStore";
import { useCourseStore } from "../stores/courseStore";

export function CreateCoursePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isCreatorApproved, switchMode } = useAuthStore();
  const { fetchAllCourses, allCourses } = useCourseStore();

  const isApproved = isCreatorApproved ? isCreatorApproved() : false;

  // Active Tab for Approved Creators: 'create' | 'manage'
  const [activeTab, setActiveTab] = useState('create');

  // Application States (for unapproved creators)
  const [hasApplied, setHasApplied] = useState(false);
  const [existingApp, setExistingApp] = useState(null);
  const [appSpecialization, setAppSpecialization] = useState("");
  const [appTopicIdea, setAppTopicIdea] = useState("");
  const [appExperience, setAppExperience] = useState("");
  const [appPortfolio, setAppPortfolio] = useState("");
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);
  const [appSuccessMsg, setAppSuccessMsg] = useState("");

  // Course Creator Form States
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("Beginner");
  const [thumbnail, setThumbnail] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  // Live Workshop fields
  const [isWorkshop, setIsWorkshop] = useState(false);
  const [workshopDate, setWorkshopDate] = useState("");
  const [workshopTime, setWorkshopTime] = useState("");
  const [workshopDuration, setWorkshopDuration] = useState("3 hours");
  const [workshopLocation, setWorkshopLocation] = useState("FUTO ICT Center / Virtual");

  // Curriculum Lessons State
  const [topics, setTopics] = useState([]);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonVideo, setLessonVideo] = useState("");
  const [lessonSummary, setLessonSummary] = useState("");
  const [lessonDuration, setLessonDuration] = useState("15:00");
  const [isAddingLesson, setIsAddingLesson] = useState(false);

  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [publishSuccessMsg, setPublishSuccessMsg] = useState("");

  // Check existing applications
  useEffect(() => {
    async function checkApplications() {
      if (user) {
        const apps = await db.getCreatorApplications();
        const found = apps.find(a => 
          (user.email && a.email?.toLowerCase() === user.email.toLowerCase()) || 
          (user.id && String(a.user_id) === String(user.id))
        );
        if (found) {
          setExistingApp(found);
          setHasApplied(true);
        }
      }
    }
    checkApplications();
  }, [user]);

  // Submit Creator Application
  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    if (!appSpecialization.trim() || !appTopicIdea.trim()) {
      setErrorMsg("Please specify your specialization and proposed course topic.");
      return;
    }
    setIsSubmittingApp(true);
    setErrorMsg("");

    try {
      const app = await db.submitCreatorApplication({
        user_id: user?.id,
        fullName: user?.user_metadata?.full_name || user?.name || "NACOS Scholar",
        email: user?.email,
        regNo: user?.user_metadata?.matric_number || user?.registration_number || "NACOS Student",
        specialization: appSpecialization.trim(),
        topic_idea: appTopicIdea.trim(),
        experience: appExperience.trim(),
        portfolio_url: appPortfolio.trim(),
      });
      setExistingApp(app);
      setHasApplied(true);
      setAppSuccessMsg("Application submitted successfully! The Super Admin has been notified.");
    } catch (err) {
      setErrorMsg(err.message || "Failed to submit application.");
    } finally {
      setIsSubmittingApp(false);
    }
  };

  // Add Lesson to Queue
  const handleAddLesson = () => {
    if (!lessonTitle.trim()) return;
    const newLesson = {
      id: `lesson-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: lessonTitle.trim(),
      video_url: lessonVideo.trim() || "https://www.youtube.com/watch?v=W6NZfCO5SIk",
      summary_text: lessonSummary.trim(),
      duration: lessonDuration || "15:00",
      order_index: topics.length + 1,
    };
    setTopics([...topics, newLesson]);
    setLessonTitle("");
    setLessonVideo("");
    setLessonSummary("");
    setIsAddingLesson(false);
  };

  // Publish Course to Database
  const handlePublishCourse = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMsg("Please provide a course title and description.");
      return;
    }
    setIsPublishing(true);
    setErrorMsg("");

    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const newCourse = await db.createCourse({
        creator_id: user?.id || "creator-1",
        creator_name: user?.user_metadata?.full_name || user?.name || "NACOS Instructor",
        title: title.trim(),
        description: description.trim(),
        level,
        thumbnail: thumbnail.trim() || "https://res.cloudinary.com/a2mmcttn/image/upload/v1788569330/nacos/gallery/nacos2.jpg",
        tags: tags.length > 0 ? tags : ["engineering", "nacos"],
        is_live_workshop: isWorkshop,
        workshop_details: isWorkshop
          ? {
              date: workshopDate || "2026-11-15",
              time: workshopTime || "14:00 GMT+1",
              duration: workshopDuration,
              location: workshopLocation,
              instructor: user?.user_metadata?.full_name || "NACOS Instructor",
            }
          : null,
      });

      // Save topics
      for (const t of topics) {
        await db.createTopic({
          ...t,
          course_id: newCourse.id,
        });
      }

      await fetchAllCourses();
      setPublishSuccessMsg(`"${newCourse.title}" published successfully! It is now live in the course catalog.`);
      
      // Reset form
      setTitle("");
      setDescription("");
      setThumbnail("");
      setTagsInput("");
      setTopics([]);
      setIsWorkshop(false);
      setActiveTab("manage");
    } catch (err) {
      setErrorMsg(err.message || "Failed to publish course.");
    } finally {
      setIsPublishing(false);
    }
  };

  // 1. Not Authenticated View (Inspiring Teach on Upskill Hub landing section)
  if (!isAuthenticated) {
    return (
      <div className="flex-1 w-full bg-white dark:bg-[#000000] text-gray-900 dark:text-white transition-colors duration-300">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-gray-200 dark:border-[#0056D2]/30 py-16 sm:py-24 bg-gradient-to-b from-[#f8fdf7] to-white dark:from-[#07101e] dark:to-[#000000]">
          <div className="site-container max-w-4xl mx-auto text-center space-y-6">
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#000000] dark:text-white leading-tight">
              Empower the Next Generation of <span className="text-[#0056D2] dark:text-[#1d72fe]">Tech Leaders</span>
            </h1>

            <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Share your hard-won technical expertise with fellow computer science scholars. Build structured curriculums, publish interactive video masterclasses, and mentor tomorrow's software engineers.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to={`/login?redirect=${encodeURIComponent('/create-course')}`}
                className="w-full sm:w-auto px-7 py-3.5 rounded bg-[#0056D2] hover:bg-[#0043aa] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all text-center uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <span>Sign In to Creator Studio</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/sign-up"
                className="w-full sm:w-auto px-7 py-3.5 rounded border border-gray-300 dark:border-[#0056D2]/40 text-[#000000] dark:text-white hover:bg-gray-100 dark:hover:bg-[#07101e] text-xs sm:text-sm font-semibold transition-colors text-center"
              >
                Apply as New Creator
              </Link>
            </div>

            {/* Quick Metrics */}
            <div className="pt-10 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-gray-200 dark:border-white/10 max-w-3xl mx-auto text-left">
              <div className="p-3">
                <p className="text-2xl font-black text-[#0056D2] dark:text-[#1d72fe]">1,200+</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Enrolled Tech Scholars</p>
              </div>
              <div className="p-3">
                <p className="text-2xl font-black text-[#000000] dark:text-white">100%</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Peer-to-Peer Impact</p>
              </div>
              <div className="p-3">
                <p className="text-2xl font-black text-[#0056D2] dark:text-[#1d72fe]">Verified</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Departmental Credentials</p>
              </div>
              <div className="p-3">
                <p className="text-2xl font-black text-[#000000] dark:text-white">Free</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Creator Studio Access</p>
              </div>
            </div>
          </div>
        </section>

        {/* Why Teach on Upskill Hub */}
        <section className="py-16 sm:py-20 border-b border-gray-200 dark:border-[#0056D2]/20">
          <div className="site-container max-w-5xl mx-auto space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#000000] dark:text-white">
                Why Instruct with NACOS FUTO?
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                Turn your project experience and technical mastery into recognized impact across the faculty.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded border border-gray-200 dark:border-[#0056D2]/30 bg-white dark:bg-[#07101e] space-y-3 shadow-xs">
                <div className="w-10 h-10 rounded bg-[#0056D2]/10 text-[#0056D2] dark:text-[#1d72fe] flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-[#000000] dark:text-white">
                  Direct Student Reach
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  Your course gets featured directly on the official departmental learning platform, putting your curriculum in front of hundreds of eager undergraduate and postgraduate scholars.
                </p>
              </div>

              <div className="p-6 rounded border border-gray-200 dark:border-[#0056D2]/30 bg-white dark:bg-[#07101e] space-y-3 shadow-xs">
                <div className="w-10 h-10 rounded bg-[#0056D2]/10 text-[#0056D2] dark:text-[#1d72fe] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-[#000000] dark:text-white">
                  Verified Instructor Profile
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  Receive verified instructor credentials issued by NACOS FUTO. Showcase public course track pages on your LinkedIn, GitHub, and resume for global tech recruiters.
                </p>
              </div>

              <div className="p-6 rounded border border-gray-200 dark:border-[#0056D2]/30 bg-white dark:bg-[#07101e] space-y-3 shadow-xs">
                <div className="w-10 h-10 rounded bg-[#0056D2]/10 text-[#0056D2] dark:text-[#1d72fe] flex items-center justify-center">
                  <Video className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-[#000000] dark:text-white">
                  Workshops & Video Tracks
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  Publish multi-module video lessons with YouTube embed support, host interactive weekend workshops, and provide downloadable project source code.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3 Step Onboarding Flow */}
        <section className="py-16 sm:py-20 bg-gray-50/70 dark:bg-[#07101e]/60 border-b border-gray-200 dark:border-[#0056D2]/20">
          <div className="site-container max-w-4xl mx-auto space-y-10">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#000000] dark:text-white">
                How It Works
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                From idea to approved course catalog in 3 easy steps.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 rounded bg-white dark:bg-[#000000] border border-gray-200 dark:border-[#0056D2]/30 space-y-2">
                <span className="w-7 h-7 rounded-full bg-[#0056D2] text-white text-xs font-black flex items-center justify-center">
                  1
                </span>
                <h3 className="text-sm font-bold text-[#000000] dark:text-white">
                  Apply with Your Topic Idea
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  Sign in with your student or creator details and submit a brief outline of the technical skill or module you wish to teach.
                </p>
              </div>

              <div className="p-5 rounded bg-white dark:bg-[#000000] border border-gray-200 dark:border-[#0056D2]/30 space-y-2">
                <span className="w-7 h-7 rounded-full bg-[#0056D2] text-white text-xs font-black flex items-center justify-center">
                  2
                </span>
                <h3 className="text-sm font-bold text-[#000000] dark:text-white">
                  Admin Verification
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  The NACOS FUTO Super Admin reviews your proposal to ensure high pedagogical quality and industry relevance for students.
                </p>
              </div>

              <div className="p-5 rounded bg-white dark:bg-[#000000] border border-gray-200 dark:border-[#0056D2]/30 space-y-2">
                <span className="w-7 h-7 rounded-full bg-[#0056D2] text-white text-xs font-black flex items-center justify-center">
                  3
                </span>
                <h3 className="text-sm font-bold text-[#000000] dark:text-white">
                  Upload & Launch
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  Once approved, access the Creator Studio to add structured video lessons, syllabus descriptions, and publish live to all students.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Bar */}
        <section className="py-14 bg-white dark:bg-[#000000] text-center">
          <div className="site-container max-w-2xl mx-auto space-y-4">
            <h2 className="text-2xl font-black text-[#000000] dark:text-white">
              Ready to Share Your Knowledge?
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
              Sign in to your account or register today to submit your instructor application.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <Link
                to={`/login?redirect=${encodeURIComponent('/create-course')}`}
                className="px-6 py-3 rounded bg-[#0056D2] hover:bg-[#0043aa] text-white text-xs font-bold shadow-md transition-colors uppercase tracking-wider"
              >
                Sign In to Creator Studio
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // 2. Unapproved Creator View (Application Form or Pending State)
  if (!isApproved) {
    return (
      <div className="flex-1 w-full bg-white dark:bg-[#000000] text-gray-900 dark:text-white transition-colors duration-300">
        <div className="site-container py-10 max-w-3xl mx-auto space-y-8">
          
          <div className="border-b border-[#0056D2]/20 dark:border-[#0056D2]/30 pb-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono">
                Creator Verification Required
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#07101e] dark:text-white">
              Apply for Creator & Instructor Privileges
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
              To maintain academic excellence, all course creators and workshop instructors are verified and approved by the NACOS FUTO Super Admin.
            </p>
          </div>

          {hasApplied && existingApp ? (
            <div className="bg-[#f8fdf7] dark:bg-[#07101e] rounded border border-[#0056D2]/30 p-6 sm:p-8 space-y-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-[#0056D2]/15 text-[#0056D2] dark:text-[#1d72fe] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Application Status: <span className="text-[#0056D2] dark:text-[#1d72fe] uppercase font-mono">{existingApp.status || 'Pending'}</span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-blue-200/70">
                    Submitted on {new Date(existingApp.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded bg-white dark:bg-[#000000] border border-[#0056D2]/20 space-y-2 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                <p><strong>Applicant:</strong> {existingApp.fullName} ({existingApp.email})</p>
                <p><strong>Specialization:</strong> {existingApp.specialization}</p>
                <p><strong>Proposed Course Idea:</strong> {existingApp.topic_idea}</p>
                {existingApp.portfolio_url && <p><strong>Portfolio / GitHub:</strong> {existingApp.portfolio_url}</p>}
              </div>

              <div className="p-3.5 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs leading-relaxed">
                Your application is currently under review by the NACOS Super Administrator. Once approved, you will be able to access the course creation studio and publish materials directly.
              </div>

              <div className="pt-2 flex items-center justify-between">
                <Link
                  to="/"
                  className="text-xs font-semibold text-[#0056D2] dark:text-[#1d72fe] hover:underline flex items-center gap-1"
                >
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  <span>Return to Learning Catalog</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setHasApplied(false)}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-white underline"
                >
                  Submit Updated Application
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitApplication} className="bg-[#f8fdf7] dark:bg-[#07101e] rounded border border-[#0056D2]/25 p-6 sm:p-8 space-y-5 shadow-xs">
              {errorMsg && (
                <div className="p-3 rounded bg-red-50 dark:bg-red-950/40 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 dark:text-blue-100 uppercase tracking-wider block mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user?.user_metadata?.full_name || user?.name || "Student"}
                    className="w-full px-3 py-2 text-xs rounded bg-gray-100 dark:bg-[#000000] border border-gray-300 dark:border-[#0056D2]/30 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 dark:text-blue-100 uppercase tracking-wider block mb-1">
                    Email Address
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user?.email || ""}
                    className="w-full px-3 py-2 text-xs rounded bg-gray-100 dark:bg-[#000000] border border-gray-300 dark:border-[#0056D2]/30 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-blue-100 uppercase tracking-wider block mb-1">
                  Primary Technical Specialization *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Frontend Development (React/Next.js), Python AI, Cybersecurity, Backend APIs..."
                  value={appSpecialization}
                  onChange={(e) => setAppSpecialization(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded bg-white dark:bg-[#000000] border border-gray-300 dark:border-[#0056D2]/40 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0056D2]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-blue-100 uppercase tracking-wider block mb-1">
                  Proposed Course Title & Brief Syllabus *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="What specific topic or module do you want to teach? (e.g. Practical Docker Pipelines for Undergraduates)"
                  value={appTopicIdea}
                  onChange={(e) => setAppTopicIdea(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded bg-white dark:bg-[#000000] border border-gray-300 dark:border-[#0056D2]/40 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0056D2]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-blue-100 uppercase tracking-wider block mb-1">
                  Relevant Experience / Background
                </label>
                <textarea
                  rows={2}
                  placeholder="Share any past internships, personal projects, or tutoring experience..."
                  value={appExperience}
                  onChange={(e) => setAppExperience(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded bg-white dark:bg-[#000000] border border-gray-300 dark:border-[#0056D2]/40 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0056D2]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-blue-100 uppercase tracking-wider block mb-1">
                  GitHub / Portfolio / LinkedIn Link (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/your-username"
                  value={appPortfolio}
                  onChange={(e) => setAppPortfolio(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded bg-white dark:bg-[#000000] border border-gray-300 dark:border-[#0056D2]/40 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0056D2]"
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-[#0056D2]/20">
                <Link to="/" className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-white">
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isSubmittingApp}
                  className="px-6 py-2.5 rounded bg-[#0056D2] hover:bg-[#0043aa] text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingApp ? "Submitting Application..." : "Submit Creator Application"}</span>
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    );
  }

  // 3. Approved Creator Studio & Course Management
  const myCourses = (allCourses || []).filter(c => 
    c.creator_id === user?.id || c.creator_id === "creator-1" || c.creator_id === "creator-admin"
  );

  return (
    <div className="flex-1 w-full bg-white dark:bg-[#000000] text-gray-900 dark:text-white transition-colors duration-300">
      
      {/* ─── Creator Studio Taskbar ─── */}
      <div className="bg-[#07101e] border-b border-[#0056D2]/30 py-3 px-4 sticky top-16 z-20 shadow-md">
        <div className="site-container flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-[#0056D2] flex items-center justify-center text-white shadow-xs font-black text-sm">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white uppercase tracking-wider">
                Creator Studio & Course Management
              </h1>
              <p className="text-[11px] text-blue-200/70">
                Verified Instructor: {user?.user_metadata?.full_name || user?.name || "NACOS Faculty"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher */}
            <button
              type="button"
              onClick={() => {
                switchMode('learner');
                navigate('/');
              }}
              className="px-3 py-1.5 rounded text-xs font-semibold bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Switch to Learner View</span>
            </button>

            {/* Tab Pills */}
            <div className="flex items-center gap-1 bg-[#000000] p-1 rounded border border-[#0056D2]/40">
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className={`px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'create'
                    ? "bg-[#0056D2] text-white"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                + New Course
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('manage')}
                className={`px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'manage'
                    ? "bg-[#0056D2] text-white"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                My Courses ({myCourses.length})
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ─── Main Content ─── */}
      <main className="site-container py-8 sm:py-10">
        
        {publishSuccessMsg && (
          <div className="mb-6 p-4 rounded bg-[#0056D2]/15 border border-[#0056D2]/40 text-[#0056D2] dark:text-[#1d72fe] text-xs font-semibold flex items-center justify-between">
            <span>{publishSuccessMsg}</span>
            <button onClick={() => setPublishSuccessMsg("")} className="text-xs font-bold">✕</button>
          </div>
        )}

        {activeTab === 'manage' ? (
          /* Manage Existing Courses */
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#0056D2]/20 pb-4">
              <div>
                <h2 className="text-xl font-bold text-[#07101e] dark:text-white">
                  Courses & Workshops You Created
                </h2>
                <p className="text-xs text-gray-500 dark:text-blue-100/70 mt-0.5">
                  Manage syllabus lessons, preview student player view, and review enrollment metrics.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className="px-4 py-2 bg-[#0056D2] hover:bg-[#0043aa] text-white text-xs font-bold rounded shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Track</span>
              </button>
            </div>

            {myCourses.length === 0 ? (
              <div className="text-center py-16 px-4 bg-[#f8fdf7] dark:bg-[#07101e] rounded border border-dashed border-[#0056D2]/30 space-y-3">
                <BookOpen className="w-10 h-10 mx-auto text-gray-400" />
                <p className="text-sm font-bold text-gray-800 dark:text-white">You haven't published any courses yet.</p>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">Click below to structure your first video course or schedule a live bootcamp.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  className="px-4 py-2 bg-[#0056D2] text-white text-xs font-bold rounded shadow-xs cursor-pointer"
                >
                  Create First Course
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myCourses.map((c) => (
                  <div
                    key={c.id}
                    className="bg-[#f8fdf7] dark:bg-[#07101e] rounded border border-[#0056D2]/25 overflow-hidden shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative aspect-video bg-[#000000]">
                        <img
                          src={c.thumbnail || "https://res.cloudinary.com/a2mmcttn/image/upload/v1788569330/nacos/gallery/nacos2.jpg"}
                          alt={c.title}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded bg-black/80 text-white uppercase font-mono">
                          {c.level || "Track"}
                        </span>
                        {c.is_live_workshop && (
                          <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500 text-black uppercase font-mono">
                            Live Workshop
                          </span>
                        )}
                      </div>

                      <div className="p-4 space-y-2">
                        <h3 className="text-sm font-bold text-[#07101e] dark:text-white leading-snug line-clamp-1">
                          {c.title}
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                          {c.description}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 pt-0">
                      <div className="pt-3 border-t border-[#0056D2]/15 dark:border-white/10 flex items-center justify-between gap-2">
                        <Link
                          to={`/courses/${c.id}`}
                          className="flex-1 py-1.5 px-3 rounded text-center text-xs font-semibold bg-[#0056D2] hover:bg-[#0043aa] text-white shadow-xs"
                        >
                          View / Learn
                        </Link>
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm(`Delete "${c.title}"?`)) {
                              await db.deleteCourse(c.id);
                              await fetchAllCourses();
                            }
                          }}
                          className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold cursor-pointer"
                          title="Delete course"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Course Creation Studio Form */
          <form onSubmit={handlePublishCourse} className="space-y-8 max-w-4xl mx-auto">
            {errorMsg && (
              <div className="p-3.5 rounded bg-red-50 dark:bg-red-950/40 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Section 1: Overview */}
            <div className="bg-[#f8fdf7] dark:bg-[#07101e] rounded border border-[#0056D2]/25 p-6 sm:p-8 space-y-4 shadow-xs">
              <h2 className="text-base font-bold text-[#07101e] dark:text-white border-b border-[#0056D2]/20 pb-2">
                1. Course Overview & Metadata
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1">
                    Course Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Modern Fullstack React 19 & Next.js"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded bg-white dark:bg-[#000000] border border-gray-300 dark:border-[#0056D2]/40 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0056D2]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1">
                    Level *
                  </label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded bg-white dark:bg-[#000000] border border-gray-300 dark:border-[#0056D2]/40 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0056D2] cursor-pointer"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Professional">Professional</option>
                    <option value="100 Level">100 Level</option>
                    <option value="200 Level">200 Level</option>
                    <option value="300 Level">300 Level</option>
                    <option value="400 Level">400 Level</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-1">
                  Description *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide a compelling overview of what students will master in this module..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded bg-white dark:bg-[#000000] border border-gray-300 dark:border-[#0056D2]/40 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0056D2]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1">
                    Cover Image URL (Cloudinary / Direct Link)
                  </label>
                  <input
                    type="url"
                    placeholder="https://res.cloudinary.com/a2mmcttn/..."
                    value={thumbnail}
                    onChange={(e) => setThumbnail(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded bg-white dark:bg-[#000000] border border-gray-300 dark:border-[#0056D2]/40 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0056D2]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1">
                    Topic Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="react, frontend, javascript, web-dev"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded bg-white dark:bg-[#000000] border border-gray-300 dark:border-[#0056D2]/40 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0056D2]"
                  />
                </div>
              </div>

              {/* Format Toggle: Self-Paced vs Live Workshop */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isWorkshop}
                    onChange={(e) => setIsWorkshop(e.target.checked)}
                    className="rounded text-[#0056D2] focus:ring-[#0056D2] cursor-pointer"
                  />
                  <span className="text-xs font-bold text-gray-800 dark:text-white">
                    This is a Live Interactive Workshop / Bootcamp session
                  </span>
                </label>
              </div>

              {isWorkshop && (
                <div className="p-4 rounded bg-white dark:bg-[#000000] border border-[#0056D2]/30 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#0056D2] dark:text-[#1d72fe]">
                    Live Workshop Logistics
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold block mb-1">Date</label>
                      <input
                        type="date"
                        value={workshopDate}
                        onChange={(e) => setWorkshopDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-700 bg-transparent"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold block mb-1">Time</label>
                      <input
                        type="text"
                        placeholder="14:00 GMT+1"
                        value={workshopTime}
                        onChange={(e) => setWorkshopTime(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-700 bg-transparent"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold block mb-1">Duration</label>
                      <input
                        type="text"
                        placeholder="3 hours"
                        value={workshopDuration}
                        onChange={(e) => setWorkshopDuration(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-700 bg-transparent"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="text-[11px] font-semibold block mb-1">Location / Virtual Meeting Link</label>
                      <input
                        type="text"
                        placeholder="FUTO ICT Innovation Center, Hall A or Google Meet URL"
                        value={workshopLocation}
                        onChange={(e) => setWorkshopLocation(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-700 bg-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Curriculum Lessons */}
            <div className="bg-[#f8fdf7] dark:bg-[#07101e] rounded border border-[#0056D2]/25 p-6 sm:p-8 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#0056D2]/20 pb-2">
                <div>
                  <h2 className="text-base font-bold text-[#07101e] dark:text-white">
                    2. Curriculum Lessons & Video Modules ({topics.length})
                  </h2>
                  <p className="text-[11px] text-gray-500 dark:text-blue-100/70">
                    Add lesson titles, YouTube video links, duration, and study notes.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddingLesson(true)}
                  className="px-3 py-1.5 rounded bg-[#0056D2] hover:bg-[#0043aa] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Lesson</span>
                </button>
              </div>

              {/* Lesson Creator Modal / Accordion */}
              {isAddingLesson && (
                <div className="p-4 rounded bg-white dark:bg-[#000000] border border-[#0056D2]/30 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#0056D2] dark:text-[#1d72fe]">
                    New Lesson Details
                  </h4>
                  
                  <div>
                    <label className="text-[11px] font-semibold block mb-1">Lesson Title *</label>
                    <input
                      type="text"
                      placeholder="e.g. Introduction to React Components & JSX"
                      value={lessonTitle}
                      onChange={(e) => setLessonTitle(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-700 bg-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold block mb-1">YouTube Video Link / ID *</label>
                      <input
                        type="text"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={lessonVideo}
                        onChange={(e) => setLessonVideo(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-700 bg-transparent font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold block mb-1">Duration (mm:ss)</label>
                      <input
                        type="text"
                        placeholder="18:30"
                        value={lessonDuration}
                        onChange={(e) => setLessonDuration(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-700 bg-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold block mb-1">Lesson Summary & Key Concepts</label>
                    <textarea
                      rows={2}
                      placeholder="Outline the core code patterns or concepts explained in this video..."
                      value={lessonSummary}
                      onChange={(e) => setLessonSummary(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-700 bg-transparent"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingLesson(false)}
                      className="px-3 py-1.5 rounded text-xs text-gray-500 hover:text-gray-800 dark:hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddLesson}
                      disabled={!lessonTitle.trim()}
                      className="px-4 py-1.5 rounded bg-[#0056D2] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      Save Lesson
                    </button>
                  </div>
                </div>
              )}

              {/* Added Lessons List */}
              {topics.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-500">
                  No lessons added yet. Add at least 1 video module or lesson for students to learn.
                </div>
              ) : (
                <div className="space-y-2">
                  {topics.map((t, idx) => (
                    <div
                      key={t.id}
                      className="p-3 rounded bg-white dark:bg-[#000000] border border-gray-200 dark:border-[#0056D2]/20 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-[#0056D2]/15 text-[#0056D2] dark:text-[#1d72fe] flex items-center justify-center font-bold text-[10px]">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 dark:text-white truncate">{t.title}</p>
                          <p className="text-[11px] text-gray-500 dark:text-blue-200/60 font-mono truncate">{t.duration} • {t.video_url}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setTopics(topics.filter(item => item.id !== t.id))}
                        className="text-red-500 hover:text-red-700 p-1 cursor-pointer shrink-0"
                        title="Remove lesson"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab('manage')}
                className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isPublishing || !title.trim()}
                className="px-8 py-3 rounded bg-[#0056D2] hover:bg-[#0043aa] text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>{isPublishing ? "Publishing Course..." : `Publish Course (${topics.length} Lessons)`}</span>
              </button>
            </div>
          </form>
        )}

      </main>

    </div>
  );
}

export default CreateCoursePage;
