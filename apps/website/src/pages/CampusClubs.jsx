import React, { useState, useEffect } from 'react';
import Navbar from '../components/Nav/Navbar';
import Footer from '../components/Footer';
import { useTheme } from '../context/ThemeContext';
import { 
  FiSearch, 
  FiUsers, 
  FiCpu, 
  FiGlobe, 
  FiCode, 
  FiActivity, 
  FiPlus, 
  FiX, 
  FiCheckCircle,
  FiUploadCloud,
  FiExternalLink
} from 'react-icons/fi';
import ScrollToTopLink from '../components/ScrollToTopLink';
const clubsImage = '';
const laptopImage = '';
import { MediaUpload, CLOUDINARY_FOLDERS } from '@nacos/media';
import { getCampusClubs, submitCampusClub, fetchCampusClubsFromSupabase } from '@nacos/supabase';

const CampusClubs = () => {
  const { theme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Hero Carousel State
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const heroSlides = [
    {
      id: 1,
      title: "Campus Clubs & Student Tech Communities",
      subtitle: "Join innovative developer guilds, open-source chapters, robotics collectives, and tech builder networks across FUTO.",
      bgImage: clubsImage
    },
    {
      id: 2,
      title: "Collaborate, Hack, and Build Real-World Solutions",
      subtitle: "Engage with GDG on Campus, AWS Builders, IEEE, MLSA, and AI Experience Centers.",
      bgImage: laptopImage
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlideIndex(prev => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  // Clubs database state
  const [clubs, setClubs] = useState([]);

  const loadClubs = async () => {
    try {
      const remote = await fetchCampusClubsFromSupabase('approved');
      if (Array.isArray(remote)) {
        setClubs(remote);
      } else {
        const local = getCampusClubs('approved');
        setClubs(local || []);
      }
    } catch (e) {
      const local = getCampusClubs('approved');
      setClubs(local || []);
    }
  };

  useEffect(() => {
    loadClubs();
    const handleUpdate = () => loadClubs();
    window.addEventListener('nacos_campus_clubs_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('nacos_campus_clubs_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Form State
  const [newClub, setNewClub] = useState({
    name: '',
    category: 'Tech',
    leadName: '',
    description: '',
    link: '',
    image: ''
  });

  const handleRegisterClub = async (e) => {
    e.preventDefault();
    if (!newClub.name || !newClub.description || !newClub.link) {
      alert('Please fill in the club name, description, and WhatsApp/community link.');
      return;
    }

    await submitCampusClub({
      ...newClub,
      image: newClub.image || 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80'
    });

    setIsModalOpen(false);
    setToastMsg('Club submitted for review! It will appear once approved by the administrators.');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000);

    setNewClub({
      name: '',
      category: 'Tech',
      leadName: '',
      description: '',
      link: '',
      image: ''
    });
  };

  const categories = ['All', 'Tech', 'Lifestyle', 'Academic'];

  const filteredClubs = clubs.filter(club => {
    const matchesSearch = 
      club.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      club.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'All' || club.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-[#041801] text-white' : 'bg-gray-50 text-gray-900'} transition-colors duration-300 font-sans`}>
      <Navbar />

      {/* Toast Notification */}
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
            <span>FUTO Student Ecosystem</span>
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

      {/* ─── Search & Register Taskbar ─── */}
      <div className="py-6 px-4 bg-white dark:bg-[#062402] border-b border-gray-200 dark:border-[#138601]/20">
        <div className="site-container flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 w-full max-w-xl">
            <div className="flex items-center bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40 rounded-lg p-1.5 px-3 focus-within:border-[#138601] transition-colors">
              <FiSearch className="text-gray-400 text-base mr-2 shrink-0" />
              <input 
                type="text" 
                placeholder="Search clubs, developer chapters, tech stacks..."
                className="w-full bg-transparent border-none text-xs sm:text-sm outline-none text-gray-900 dark:text-white font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  type="button" 
                  onClick={() => setSearchTerm('')}
                  className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-white font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <button 
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#138601] hover:bg-[#0f6c01] text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm hover:shadow transition-all cursor-pointer whitespace-nowrap w-full sm:w-auto"
          >
            <FiPlus className="text-base" />
            <span>Register a Campus Club</span>
          </button>
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <main className="flex-grow site-container w-full py-8 pb-24">
        {/* Category Filters (sleek rectangular badges) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-md font-bold text-xs transition-colors whitespace-nowrap cursor-pointer border ${
                selectedCategory === cat
                  ? 'bg-[#138601] text-white border-[#138601] shadow-xs'
                  : 'bg-white dark:bg-[#083002] hover:bg-[#f1f3f5] dark:hover:bg-[#138601]/50 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-[#138601]/30'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Clubs Grid */}
        {filteredClubs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClubs.map((club) => (
              <div 
                key={club.id}
                className={`group flex flex-col rounded-2xl overflow-hidden border shadow-xs hover:shadow-md transition-all duration-300 ${
                  theme === 'dark' ? 'bg-[#083002] border-[#138601]/30' : 'bg-white border-gray-200'
                }`}
              >
                <div className="h-44 overflow-hidden relative bg-gray-900">
                  <img 
                    src={club.image} 
                    alt={club.name} 
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 z-10" />
                  <div className="absolute bottom-3 left-3 z-20">
                    <span className="px-2 py-0.5 rounded bg-[#138601]/90 text-white text-[10px] font-bold uppercase tracking-wider">
                      {club.category}
                    </span>
                  </div>
                </div>

                <div className="p-6 flex-grow flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-xl font-bold mb-2 group-hover:text-[#138601] dark:group-hover:text-[#4bd043] transition-colors line-clamp-1">
                      {club.name}
                    </h3>
                    <p className="opacity-75 text-xs leading-relaxed line-clamp-3">
                      {club.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-gray-100 dark:border-[#138601]/20 flex items-center justify-between">
                    <span className="text-[11px] text-gray-500 dark:text-green-200/60 font-medium">
                      {club.leadName ? `Led by ${club.leadName}` : 'Student Community'}
                    </span>
                    <a
                      href={club.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#138601] hover:bg-[#0f6c01] text-white text-xs font-bold transition-colors shadow-xs"
                    >
                      <span>Join Community</span>
                      <FiExternalLink className="text-xs" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 opacity-70 border-2 border-dashed border-gray-200 dark:border-[#138601]/30 rounded-2xl">
            <FiSearch className="mx-auto text-5xl mb-3 text-gray-400" />
            <h3 className="text-xl font-bold mb-1">No clubs found</h3>
            <p className="text-xs text-gray-500 dark:text-green-200/60">Try searching with other keywords or select a different category filter.</p>
          </div>
        )}
      </main>

      {/* Register Club Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={`relative w-full max-w-xl rounded-2xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
            theme === 'dark' ? 'bg-[#083002] border-[#138601]/40 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-[#138601]/20">
              <div>
                <h2 className="text-xl font-black tracking-tight">Register a Campus Club</h2>
                <p className="text-xs text-gray-500 dark:text-green-200/60 mt-0.5">
                  Submit your student guild or developer chapter to the directory
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

            <form onSubmit={handleRegisterClub} className="p-6 overflow-y-auto max-h-[75vh] space-y-4 text-left">
              {/* Cloudinary Banner Upload */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801]">
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-800 dark:text-green-100 flex items-center gap-1.5">
                  <FiUploadCloud className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
                  <span>Club Logo or Banner Image (Cloudinary)</span>
                </label>
                <MediaUpload
                  currentImageUrl={newClub.image}
                  folder={CLOUDINARY_FOLDERS.GENERAL || 'clubs'}
                  label="Upload Club Banner"
                  aspectRatio="landscape"
                  onUploadSuccess={(mediaData) => {
                    setNewClub(prev => ({
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
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">Club / Chapter Name *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Flutter FUTO Developers Guild" 
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-transparent text-xs focus:outline-none focus:border-[#138601] text-gray-900 dark:text-white"
                  value={newClub.name}
                  onChange={(e) => setNewClub({...newClub, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">Category</label>
                  <select 
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-white dark:bg-[#041801] text-xs focus:outline-none focus:border-[#138601] text-gray-900 dark:text-white cursor-pointer"
                    value={newClub.category}
                    onChange={(e) => setNewClub({...newClub, category: e.target.value})}
                  >
                    <option value="Tech">Tech</option>
                    <option value="Lifestyle">Lifestyle</option>
                    <option value="Academic">Academic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">Lead / Coordinator Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Chinaza Miracle" 
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-transparent text-xs focus:outline-none focus:border-[#138601] text-gray-900 dark:text-white"
                    value={newClub.leadName}
                    onChange={(e) => setNewClub({...newClub, leadName: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">Community Description *</label>
                <textarea 
                  required 
                  rows="3" 
                  placeholder="Describe your tech mission, focus areas, weekly meetups, and member benefits..." 
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-transparent text-xs focus:outline-none focus:border-[#138601] text-gray-900 dark:text-white resize-none"
                  value={newClub.description}
                  onChange={(e) => setNewClub({...newClub, description: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">Join Link (WhatsApp / Discord / Telegram) *</label>
                <input 
                  type="url" 
                  required 
                  placeholder="https://chat.whatsapp.com/..." 
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-transparent text-xs focus:outline-none focus:border-[#138601] text-gray-900 dark:text-white"
                  value={newClub.link}
                  onChange={(e) => setNewClub({...newClub, link: e.target.value})}
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
                  Submit for Approval
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

export default CampusClubs;
