import React, { useState, useEffect } from 'react';
import Navbar from '../components/Nav/Navbar';
import Footer from '../components/Footer';
import { useTheme } from '../context/ThemeContext';
import { 
  FiSearch, 
  FiUsers, 
  FiHeart, 
  FiCalendar, 
  FiMapPin, 
  FiPlus, 
  FiX, 
  FiCheckCircle,
  FiExternalLink
} from 'react-icons/fi';
import { MediaUpload, CLOUDINARY_FOLDERS } from '@nacos/media';
import { getSpiritualFellowships, submitSpiritualFellowship } from '@nacos/supabase';
import headerImg from '../assets/header.jpg';

const SpiritualLife = () => {
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
      title: "Spiritual Life & Campus Fellowships",
      subtitle: "Discover vibrant Christian chaplaincies, student fellowships, and the Muslim community nurturing faith and character at FUTO.",
      bgImage: headerImg
    },
    {
      id: 2,
      title: "Faith, Fellowship, and Holistic Student Growth",
      subtitle: "Connect with campus spiritual families dedicated to prayer, deep scriptures, mutual love, and moral integrity.",
      bgImage: 'https://images.unsplash.com/photo-1519791883288-dc8bd696e667?auto=format&fit=crop&w=1600&q=80'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlideIndex(prev => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  // Fellowships database state
  const [fellowships, setFellowships] = useState([]);

  const loadFellowships = () => {
    try {
      const data = getSpiritualFellowships('approved');
      if (data && data.length > 0) {
        setFellowships(data);
      }
    } catch (e) {
      console.warn('Error loading spiritual fellowships:', e);
    }
  };

  useEffect(() => {
    loadFellowships();
    const handleUpdate = () => loadFellowships();
    window.addEventListener('nacos_spiritual_life_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('nacos_spiritual_life_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Form State
  const [newFellowship, setNewFellowship] = useState({
    name: '',
    category: 'Interdenominational',
    venue: '',
    meetingTimes: '',
    leadName: '',
    description: '',
    link: '',
    image: ''
  });

  const handleRegisterFellowship = (e) => {
    e.preventDefault();
    if (!newFellowship.name || !newFellowship.description || !newFellowship.link) {
      alert('Please fill in the fellowship name, description, and WhatsApp/community contact link.');
      return;
    }

    submitSpiritualFellowship({
      ...newFellowship,
      image: newFellowship.image || 'https://images.unsplash.com/photo-1548625361-12503a277713?auto=format&fit=crop&w=800&q=80'
    });

    setIsModalOpen(false);
    setToastMsg('Fellowship profile submitted for review! It will appear once approved by administrators.');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000);

    setNewFellowship({
      name: '',
      category: 'Interdenominational',
      venue: '',
      meetingTimes: '',
      leadName: '',
      description: '',
      link: '',
      image: ''
    });
  };

  const categories = ['All', 'Catholic', 'Protestant', 'Pentecostal', 'Interdenominational', 'Muslim / MSSN'];

  const filteredFellowships = fellowships.filter(f => {
    const matchesSearch = 
      f.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.venue?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.meetingTimes?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'All' || f.category === selectedCategory;
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

      {/* ─── Hero Banner: Authentic Image Backdrop & Carousel Headline ─── */}
      <div className="relative w-full h-[150px] sm:h-[190px] md:h-[220px] overflow-hidden flex items-center justify-center select-none">
        {heroSlides.map((slide, idx) => (
          <div
            key={slide.id}
            className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
              idx === activeSlideIndex ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            <img
              src={slide.bgImage}
              alt={slide.title}
              className="w-full h-full object-cover object-center filter brightness-[0.38]"
            />
          </div>
        ))}

        {/* Ambient Dark Green Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-[#041801]/60 to-black/75 z-10" />

        {/* Hero Text Content */}
        <div className="relative z-20 site-container w-full text-center px-4 flex flex-col items-center">
          <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase text-[#4bd043] bg-[#138601]/25 px-2.5 py-0.5 rounded-full border border-[#138601]/40 mb-1.5 backdrop-blur-xs inline-flex items-center gap-1.5">
            <FiHeart className="text-xs" />
            <span>FUTO Student Community</span>
          </span>
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight max-w-4xl">
            {heroSlides[activeSlideIndex]?.title}
          </h1>
          <p className="text-[11px] sm:text-xs md:text-sm text-gray-200 mt-1 sm:mt-1.5 max-w-2xl font-normal leading-relaxed opacity-90 hidden sm:block">
            {heroSlides[activeSlideIndex]?.subtitle}
          </p>

          {/* Dots Indicator */}
          <div className="flex items-center space-x-1.5 mt-2.5 sm:mt-3">
            {heroSlides.map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                onClick={() => setActiveSlideIndex(dotIdx)}
                aria-label={`Go to slide ${dotIdx + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  dotIdx === activeSlideIndex ? 'w-5 bg-[#4bd043]' : 'w-1.5 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <main className="site-container py-8 flex-grow w-full">
        {/* Controls: Search, Filter Tabs, Add Fellowship Button */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="relative flex-grow max-w-md">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search fellowships, chaplaincy, venue, times..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#138601] ${
                theme === 'dark' 
                  ? 'bg-[#083002] border-[#138601]/40 text-white placeholder-green-200/50' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#138601] hover:bg-[#0f6c01] text-white font-semibold text-xs transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <FiPlus className="text-base" />
              <span>Register Fellowship</span>
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#138601] text-white shadow-xs'
                  : theme === 'dark'
                    ? 'bg-[#083002]/70 text-green-100 hover:bg-[#138601]/20 border border-[#138601]/30'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Fellowships Grid */}
        {filteredFellowships.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFellowships.map((fellowship) => (
              <div 
                key={fellowship.id}
                className={`group flex flex-col rounded-2xl overflow-hidden border shadow-xs hover:shadow-md transition-all duration-300 ${
                  theme === 'dark' ? 'bg-[#083002] border-[#138601]/30' : 'bg-white border-gray-200'
                }`}
              >
                <div className="h-44 overflow-hidden relative bg-gray-900">
                  <img 
                    src={fellowship.image} 
                    alt={fellowship.name} 
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30 z-10" />
                  <div className="absolute bottom-3 left-3 z-20">
                    <span className="px-2 py-0.5 rounded bg-[#138601]/95 text-white text-[10px] font-bold uppercase tracking-wider">
                      {fellowship.category}
                    </span>
                  </div>
                </div>

                <div className="p-6 flex-grow flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-xl font-bold mb-2 group-hover:text-[#138601] dark:group-hover:text-[#4bd043] transition-colors line-clamp-1">
                      {fellowship.name}
                    </h3>
                    <p className="opacity-75 text-xs leading-relaxed line-clamp-3 mb-3">
                      {fellowship.description}
                    </p>

                    <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-[#138601]/20">
                      {fellowship.venue && (
                        <div className="flex items-center gap-2 text-xs opacity-80">
                          <FiMapPin className="text-[#138601] dark:text-[#4bd043] shrink-0" />
                          <span className="truncate">{fellowship.venue}</span>
                        </div>
                      )}
                      {fellowship.meetingTimes && (
                        <div className="flex items-center gap-2 text-xs opacity-80">
                          <FiCalendar className="text-[#138601] dark:text-[#4bd043] shrink-0" />
                          <span className="truncate">{fellowship.meetingTimes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 dark:border-[#138601]/20 flex items-center justify-between">
                    <span className="text-[11px] text-gray-500 dark:text-green-200/60 font-medium truncate max-w-[150px]">
                      {fellowship.leadName ? fellowship.leadName : 'Campus Fellowship'}
                    </span>
                    <a
                      href={fellowship.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#138601] hover:bg-[#0f6c01] text-white text-xs font-bold transition-colors shadow-xs"
                    >
                      <span>Connect</span>
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
            <h3 className="text-xl font-bold mb-1">No fellowships found</h3>
            <p className="text-xs text-gray-500 dark:text-green-200/60">Try searching with other keywords or select a different category filter.</p>
          </div>
        )}
      </main>

      {/* Register Fellowship Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={`relative w-full max-w-xl rounded-2xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
            theme === 'dark' ? 'bg-[#083002] border-[#138601]/40 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="p-6 border-b border-gray-200 dark:border-[#138601]/30 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Register a Campus Fellowship</h3>
                <p className="text-xs opacity-75 mt-0.5">Submit fellowship details for official listing on the NACOS spiritual directory.</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#138601]/20 transition-colors cursor-pointer"
              >
                <FiX className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleRegisterFellowship} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1 opacity-80">
                  Fellowship / Community Name *
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. National Federation of Catholic Students (NFCS)"
                  value={newFellowship.name}
                  onChange={(e) => setNewFellowship({ ...newFellowship, name: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#138601] ${
                    theme === 'dark' ? 'bg-[#041801] border-[#138601]/40 text-white' : 'bg-white border-gray-300'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 opacity-80">
                    Category / Denomination *
                  </label>
                  <select
                    value={newFellowship.category}
                    onChange={(e) => setNewFellowship({ ...newFellowship, category: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#138601] cursor-pointer ${
                      theme === 'dark' ? 'bg-[#041801] border-[#138601]/40 text-white' : 'bg-white border-gray-300'
                    }`}
                  >
                    <option value="Catholic">Catholic</option>
                    <option value="Protestant">Protestant</option>
                    <option value="Pentecostal">Pentecostal</option>
                    <option value="Interdenominational">Interdenominational</option>
                    <option value="Muslim / MSSN">Muslim / MSSN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 opacity-80">
                    Leader / President / Amir
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. Bro. Paschal Nwankwo"
                    value={newFellowship.leadName}
                    onChange={(e) => setNewFellowship({ ...newFellowship, leadName: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#138601] ${
                      theme === 'dark' ? 'bg-[#041801] border-[#138601]/40 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 opacity-80">
                    Meeting Venue
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. STACC Chaplaincy, FUTO"
                    value={newFellowship.venue}
                    onChange={(e) => setNewFellowship({ ...newFellowship, venue: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#138601] ${
                      theme === 'dark' ? 'bg-[#041801] border-[#138601]/40 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 opacity-80">
                    Meeting Days & Times
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. Sundays 8:00 AM • Wed 5:00 PM"
                    value={newFellowship.meetingTimes}
                    onChange={(e) => setNewFellowship({ ...newFellowship, meetingTimes: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#138601] ${
                      theme === 'dark' ? 'bg-[#041801] border-[#138601]/40 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1 opacity-80">
                  Fellowship Flyer / Cover Image
                </label>
                <div className="mb-2">
                  <MediaUpload 
                    folder={CLOUDINARY_FOLDERS.GENERAL || 'spiritual'}
                    onSuccess={({ url }) => setNewFellowship({ ...newFellowship, image: url })}
                  />
                </div>
                {newFellowship.image && (
                  <div className="relative w-full h-28 rounded-lg overflow-hidden border border-gray-200 dark:border-[#138601]/40">
                    <img src={newFellowship.image} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1 opacity-80">
                  Brief Mission & Description *
                </label>
                <textarea 
                  rows={3}
                  required
                  placeholder="Describe your fellowship vision, services, and what students will experience..."
                  value={newFellowship.description}
                  onChange={(e) => setNewFellowship({ ...newFellowship, description: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#138601] ${
                    theme === 'dark' ? 'bg-[#041801] border-[#138601]/40 text-white' : 'bg-white border-gray-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1 opacity-80">
                  WhatsApp Group / Community Contact Link *
                </label>
                <input 
                  type="url" 
                  required
                  placeholder="https://chat.whatsapp.com/... or https://t.me/..."
                  value={newFellowship.link}
                  onChange={(e) => setNewFellowship({ ...newFellowship, link: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#138601] ${
                    theme === 'dark' ? 'bg-[#041801] border-[#138601]/40 text-white' : 'bg-white border-gray-300'
                  }`}
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-gray-200 dark:border-[#138601]/20">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 font-semibold text-xs hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#138601] hover:bg-[#0f6c01] text-white font-semibold text-xs shadow-md transition-colors cursor-pointer"
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

export default SpiritualLife;
