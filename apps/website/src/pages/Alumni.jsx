import React, { useState, useEffect } from "react";
import Navbar from "../components/Nav/Navbar";
import Footer from "../components/Footer";
import { useTheme } from "../context/ThemeContext";
import {
  FiUsers,
  FiAward,
  FiBriefcase,
  FiGlobe,
  FiLinkedin,
  FiPlus,
  FiX,
  FiCheckCircle,
  FiUploadCloud
} from "react-icons/fi";
import { FaGraduationCap, FaAward, FaBuilding, FaGlobeAmericas, FaLinkedin, FaUserGraduate } from "react-icons/fa";
import ScrollToTopLink from "../components/ScrollToTopLink";
import { getCloudinaryAssetUrl, MediaUpload, CLOUDINARY_FOLDERS } from "@nacos/media";
import { getAlumniDirectory, submitAlumniRequest, fetchAlumniFromSupabase } from "@nacos/supabase";
const alumniImage = '';
const departmentImage = '';
const benitaImg = '';
const godfirstImg = '';

const Alumni = () => {
  const { theme } = useTheme();
  const [alumniList, setAlumniList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const heroSlides = [
    {
      id: 1,
      title: "FUTO CSC Alumni Network: Global Tech Fellowship",
      subtitle: "Connecting over 5,000+ technology leaders, software architects, founders, and research scientists worldwide.",
      bgImage: alumniImage
    },
    {
      id: 2,
      title: "Pioneering Computing Innovations Across Silicon Valley & Africa",
      subtitle: "Empowering current scholars with mentorship, tech opportunities, internship pipelines, and masterclasses.",
      bgImage: departmentImage
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlideIndex(prev => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const loadAlumni = async () => {
    try {
      const local = getAlumniDirectory('approved');
      if (local && local.length > 0) {
        setAlumniList(local);
      }
      const remote = await fetchAlumniFromSupabase('approved');
      if (remote && remote.length > 0) {
        setAlumniList(remote);
      }
    } catch (e) {
      console.warn('Error loading alumni directory:', e);
    }
  };

  useEffect(() => {
    loadAlumni();
    const handleUpdate = () => loadAlumni();
    window.addEventListener('nacos_alumni_directory_updated', handleUpdate);
    window.addEventListener('nacos_alumni_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('nacos_alumni_directory_updated', handleUpdate);
      window.removeEventListener('nacos_alumni_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const [newAlumni, setNewAlumni] = useState({
    name: '',
    gradYear: '',
    position: '',
    company: '',
    linkedin: '',
    bio: '',
    image: ''
  });

  const handleRegisterAlumni = async (e) => {
    e.preventDefault();
    if (!newAlumni.name || !newAlumni.position) {
      alert('Please fill in your name and current position.');
      return;
    }

    await submitAlumniRequest({
      ...newAlumni,
      image: newAlumni.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'
    });

    setIsModalOpen(false);
    setToastMsg('Profile submitted for review! It will appear once approved by the administrators.');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000);

    setNewAlumni({
      name: '',
      gradYear: '',
      position: '',
      company: '',
      linkedin: '',
      bio: '',
      image: ''
    });
  };

  const alumniStats = [
    {
      value: "5,000+",
      label: "Graduates Worldwide",
      icon: <FaGraduationCap className="text-[#138601] dark:text-[#4bd043] text-2xl mx-auto" />,
    },
    {
      value: "20+",
      label: "Countries Represented",
      icon: <FaGlobeAmericas className="text-[#138601] dark:text-[#4bd043] text-2xl mx-auto" />,
    },
    {
      value: "100+",
      label: "Tech Companies Founded",
      icon: <FaBuilding className="text-[#138601] dark:text-[#4bd043] text-2xl mx-auto" />,
    },
    {
      value: "50+",
      label: "Industry Leadership Awards",
      icon: <FaAward className="text-[#138601] dark:text-[#4bd043] text-2xl mx-auto" />,
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#041801] text-black dark:text-white transition-colors duration-300 font-sans">
      <Navbar />

      {/* Success Toast */}
      {showToast && (
        <div className="fixed top-20 right-6 z-[60] bg-[#138601] text-white px-6 py-4 rounded-xl shadow-2xl flex items-center space-x-3 border border-[#138601] animate-in fade-in slide-in-from-top-3">
          <FiCheckCircle className="text-2xl shrink-0" />
          <div>
            <p className="font-bold text-sm">Submission Received!</p>
            <p className="text-xs opacity-90">{toastMsg}</p>
          </div>
        </div>
      )}

      {/* ─── Hero Banner: Authentic Image Backdrop & Carousel Headline (Same styling as Resources & Yellow Pages) ─── */}
      <div className="relative w-full h-[150px] sm:h-[190px] md:h-[220px] overflow-hidden flex items-center justify-center select-none">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-all duration-700 transform scale-105"
          style={{ backgroundImage: `url(${heroSlides[activeSlideIndex].bgImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/70 to-black/80" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#138601]/90 text-white text-[11px] font-bold uppercase tracking-wider mb-2">
            <FaGraduationCap className="text-xs" />
            <span>Alumni Fellowship</span>
          </div>

          <h1 className="text-lg sm:text-2xl md:text-3xl font-black text-white uppercase tracking-wide sm:tracking-wider drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] transition-all duration-500 leading-tight">
            {heroSlides[activeSlideIndex].title}
          </h1>

          <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-gray-200/95 max-w-2xl font-normal leading-relaxed drop-shadow-md line-clamp-2 sm:line-clamp-none">
            {heroSlides[activeSlideIndex].subtitle}
          </p>
        </div>

        {/* Carousel Pagination Dots */}
        <div className="absolute bottom-2.5 sm:bottom-3 right-4 sm:right-8 flex items-center gap-2 z-10">
          {heroSlides.map((slide, idx) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setActiveSlideIndex(idx)}
              aria-label={`Switch to slide ${idx + 1}`}
              className={`rounded transition-all duration-300 cursor-pointer ${
                activeSlideIndex === idx
                  ? 'w-4 h-2 bg-white shadow-lg'
                  : 'w-2 h-2 bg-white/40 hover:bg-white/75'
              }`}
            />
          ))}
        </div>
      </div>

      {/* ─── Taskbar with Join CTA ─── */}
      <div className="py-5 px-4 bg-white dark:bg-[#062402] border-b border-gray-200 dark:border-[#138601]/20">
        <div className="site-container flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Are you an alumnus of FUTO Computer Science?
            </h2>
            <p className="text-xs text-gray-500 dark:text-green-200/70">
              Join our verified alumni directory and help mentor the next generation of tech scholars.
            </p>
          </div>

          <button 
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#138601] hover:bg-[#0f6c01] text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm hover:shadow transition-all cursor-pointer whitespace-nowrap w-full sm:w-auto"
          >
            <FiPlus className="text-base" />
            <span>Join Alumni Directory</span>
          </button>
        </div>
      </div>

      {/* Alumni Impact Stats */}
      <section className="py-16 bg-[#f8f9fa] dark:bg-[#041801] border-b border-[#138601]/20 dark:border-[#138601]/30">
        <div className="site-container">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {alumniStats.map((stat, index) => (
              <div
                key={index}
                className="bg-white dark:bg-[#083002] p-6 rounded-2xl text-center shadow-xs hover:shadow-md border border-[#138601]/20 dark:border-[#138601]/30 border-b-4 border-b-[#138601] transition-all"
              >
                {stat.icon}
                <h4 className="text-3xl font-extrabold text-[#138601] dark:text-[#4bd043] mt-3 mb-1">
                  {stat.value}
                </h4>
                <p className="text-xs font-semibold text-black/80 dark:text-green-200/80 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Notable Alumni Directory */}
      <section className="py-16 bg-white dark:bg-[#041801]">
        <div className="site-container">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[#138601] dark:text-[#4bd043] bg-green-50 dark:bg-[#0d4603] px-3 py-1 rounded-md border border-green-200 dark:border-[#138601]/40">
              Alumni Hall of Fame
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-black dark:text-white tracking-tight mt-2 mb-2">
              Distinguished Alumni Directory
            </h2>
            <p className="text-xs sm:text-sm text-black/70 dark:text-green-100/70 max-w-xl mx-auto leading-relaxed">
              Spotlighting our extraordinary graduates excelling across major global tech leaders and startups.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
            {alumniList.map((alum) => (
              <div
                key={alum.id}
                className="group w-full max-w-[340px] flex flex-col bg-white dark:bg-[#083002] p-5 rounded-2xl border border-gray-200 dark:border-[#138601]/30 shadow-xs hover:shadow-md transition-all"
              >
                <div className="w-full aspect-square overflow-hidden rounded-xl border border-gray-100 dark:border-[#138601]/20 bg-gray-100 dark:bg-[#041801] flex items-center justify-center relative">
                  {alum.image ? (
                    <img 
                      src={alum.image} 
                      alt={alum.name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-[#138601] dark:text-[#4bd043] p-4">
                      <FaUserGraduate className="text-6xl opacity-60 mb-2" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col flex-grow text-center items-center pt-4 space-y-2">
                  <h3 className="font-bold text-lg tracking-tight text-black dark:text-white uppercase line-clamp-1">
                    {alum.name}
                  </h3>

                  <p className="text-xs font-bold uppercase tracking-wider text-[#138601] dark:text-[#4bd043]">
                    {alum.position} {alum.company ? `· ${alum.company}` : ''}
                  </p>

                  {alum.gradYear && (
                    <span className="text-[11px] text-gray-500 dark:text-green-200/60 font-medium">
                      Class of {alum.gradYear}
                    </span>
                  )}

                  {alum.bio && (
                    <p className="text-xs text-gray-600 dark:text-green-100/75 leading-relaxed line-clamp-2 pt-1">
                      "{alum.bio}"
                    </p>
                  )}

                  {alum.linkedin && (
                    <div className="pt-3 border-t w-full border-gray-100 dark:border-[#138601]/20 mt-auto flex justify-center">
                      <a
                        href={alum.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#138601] hover:bg-[#0f6c01] text-white font-semibold text-xs transition-colors shadow-xs"
                        title={`Connect with ${alum.name} on LinkedIn`}
                      >
                        <FaLinkedin className="text-sm" />
                        <span>Connect on LinkedIn</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Register Alumni Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={`relative w-full max-w-xl rounded-2xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
            theme === 'dark' ? 'bg-[#083002] border-[#138601]/40 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-[#138601]/20">
              <div>
                <h2 className="text-xl font-black tracking-tight">Join Alumni Network</h2>
                <p className="text-xs text-gray-500 dark:text-green-200/60 mt-0.5">
                  Submit your profile for the FUTO CSC Alumni Directory
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#041801] transition-colors cursor-pointer ${
                  theme === 'dark' ? 'text-green-200' : 'text-gray-500'
                }`}
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleRegisterAlumni} className="p-6 overflow-y-auto max-h-[75vh] space-y-4 text-left">
              {/* Cloudinary Portrait Upload */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801]">
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-800 dark:text-green-100 flex items-center gap-1.5">
                  <FiUploadCloud className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
                  <span>Professional Headshot / Photo (Cloudinary)</span>
                </label>
                <MediaUpload
                  currentImageUrl={newAlumni.image}
                  folder={CLOUDINARY_FOLDERS.GENERAL || 'alumni'}
                  label="Upload Profile Photo"
                  aspectRatio="square"
                  onUploadSuccess={(mediaData) => {
                    setNewAlumni(prev => ({
                      ...prev,
                      image: mediaData.url || mediaData.secure_url
                    }));
                  }}
                  onError={(err) => {
                    console.warn('Cloudinary upload error:', err);
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">Full Name *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Godfirst Asogwa" 
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-transparent text-xs focus:outline-none focus:border-[#138601] text-gray-900 dark:text-white"
                  value={newAlumni.name}
                  onChange={(e) => setNewAlumni({...newAlumni, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">Current Job Title *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Lead Software Engineer" 
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-transparent text-xs focus:outline-none focus:border-[#138601] text-gray-900 dark:text-white"
                    value={newAlumni.position}
                    onChange={(e) => setNewAlumni({...newAlumni, position: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">Organization / Company</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Microsoft / Stripe / Founder" 
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-transparent text-xs focus:outline-none focus:border-[#138601] text-gray-900 dark:text-white"
                    value={newAlumni.company}
                    onChange={(e) => setNewAlumni({...newAlumni, company: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">Graduation Year</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 2021 or 2018" 
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-transparent text-xs focus:outline-none focus:border-[#138601] text-gray-900 dark:text-white"
                    value={newAlumni.gradYear}
                    onChange={(e) => setNewAlumni({...newAlumni, gradYear: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">LinkedIn Profile URL</label>
                  <input 
                    type="url" 
                    placeholder="https://linkedin.com/in/..." 
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-transparent text-xs focus:outline-none focus:border-[#138601] text-gray-900 dark:text-white"
                    value={newAlumni.linkedin}
                    onChange={(e) => setNewAlumni({...newAlumni, linkedin: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">Advice for Undergraduates / Bio</label>
                <textarea 
                  rows="3" 
                  placeholder="Share a key insight, career tip, or words of encouragement for students..." 
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-transparent text-xs focus:outline-none focus:border-[#138601] text-gray-900 dark:text-white resize-none"
                  value={newAlumni.bio}
                  onChange={(e) => setNewAlumni({...newAlumni, bio: e.target.value})}
                />
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-[#138601]/20 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-gray-300 dark:border-[#138601]/30 text-xs font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-[#041801] transition-colors cursor-pointer text-gray-900 dark:text-white"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-[#138601] hover:bg-[#0f6c01] text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  Submit Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Alumni;