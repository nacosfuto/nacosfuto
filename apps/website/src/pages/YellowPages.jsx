import React, { useState, useEffect } from 'react';
import Navbar from '../components/Nav/Navbar';
import Footer from '../components/Footer';
import { useTheme } from '../context/ThemeContext';
import { 
  FiSearch, 
  FiPhone, 
  FiMail, 
  FiPlus, 
  FiMapPin, 
  FiStar, 
  FiTag, 
  FiUser, 
  FiTrendingUp, 
  FiX, 
  FiCheckCircle,
  FiUploadCloud,
  FiImage
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
const flyerPeacemaker = '';
const flyerNiforix = '';
const flyerCypher = '';
const flyerNinasBraid = '';
const laptopImg = '';
import { getCloudinaryAssetUrl, MediaUpload, CLOUDINARY_FOLDERS } from '@nacos/media';
import { getYellowPagesBusinesses, submitYellowPageBusiness, fetchYellowPagesFromSupabase } from '@nacos/supabase';

const YellowPages = () => {
  const { theme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Your business has been submitted for administrative verification and will appear upon approval!');

  // Hero carousel state
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const heroSlides = [
    {
      id: 1,
      title: "NACOS Yellow Pages: Student Tech & Commercial Directory",
      subtitle: "Support student developers, graphics designers, gadget engineers, and campus entrepreneurs.",
      bgImage: flyerPeacemaker,
      category: "Gadgets & Repairs"
    },
    {
      id: 2,
      title: "Discover Indigenous Campus Services & Creative Studios",
      subtitle: "From software engineering and branding to hostel food deliveries and student hardware repairs.",
      bgImage: laptopImg,
      category: "Tech & Coding"
    },
    {
      id: 3,
      title: "Promote Your Student Venture to 10,000+ Verified Scholars",
      subtitle: "Register your commercial flyer and reach peer clients across hostels and lecture halls.",
      bgImage: flyerNiforix,
      category: "Graphics & Printing"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  // Categories list
  const categories = [
    'All',
    'Food & Drinks',
    'Tech & Coding',
    'Graphics & Printing',
    'Fashion & Styling',
    'Gadgets & Repairs',
    'Tutoring & Books',
    'Other Services'
  ];

  // Businesses state loaded from directoryService / database
  const [businesses, setBusinesses] = useState([]);

  const loadBusinesses = async () => {
    try {
      const remote = await fetchYellowPagesFromSupabase('approved');
      if (Array.isArray(remote)) {
        setBusinesses(remote);
      } else {
        const local = getYellowPagesBusinesses('approved');
        setBusinesses(local || []);
      }
    } catch (e) {
      const local = getYellowPagesBusinesses('approved');
      setBusinesses(local || []);
    }
  };

  useEffect(() => {
    loadBusinesses();
    const handleUpdate = () => loadBusinesses();
    window.addEventListener('nacos_yellow_pages_updated', handleUpdate);
    return () => window.removeEventListener('nacos_yellow_pages_updated', handleUpdate);
  }, []);

  // New Business Form State
  const [newBusiness, setNewBusiness] = useState({
    name: '',
    category: 'Food & Drinks',
    ownerName: '',
    ownerLevel: '100 Level',
    description: '',
    location: '',
    phone: '',
    whatsapp: '',
    image: '',
    imagePosition: 'top left', // Enforces AGENTS.md rule default
    rating: 5.0,
    reviewsCount: 1
  });

  // Handle modal submit
  const handleRegisterBusiness = (e) => {
    e.preventDefault();
    if (!newBusiness.name || !newBusiness.ownerName || !newBusiness.phone || !newBusiness.description) {
      alert("Please fill in the required fields.");
      return;
    }

    // Fallback image if user didn't upload
    let finalImg = newBusiness.image;
    if (!finalImg) {
      if (newBusiness.category === 'Food & Drinks') finalImg = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80';
      else if (newBusiness.category === 'Tech & Coding') finalImg = 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80';
      else if (newBusiness.category === 'Graphics & Printing') finalImg = 'https://images.unsplash.com/photo-1562654501-a0ccc0fc3fb1?auto=format&fit=crop&w=800&q=80';
      else if (newBusiness.category === 'Fashion & Styling') finalImg = 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80';
      else if (newBusiness.category === 'Gadgets & Repairs') finalImg = 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=800&q=80';
      else finalImg = 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80';
    }

    const cleanWhatsapp = newBusiness.whatsapp.replace(/\D/g, '') || newBusiness.phone.replace(/\D/g, '');

    // Submit via directoryService: saves in database and triggers admin notification
    submitYellowPageBusiness({
      ...newBusiness,
      whatsapp: cleanWhatsapp,
      image: finalImg,
      rating: 5.0,
      reviewsCount: 1
    });

    setIsModalOpen(false);
    setToastMessage('Business submitted for review! It will appear once approved by the administrators.');
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 5000);

    // Reset Form
    setNewBusiness({
      name: '',
      category: 'Food & Drinks',
      ownerName: '',
      ownerLevel: '100 Level',
      description: '',
      location: '',
      phone: '',
      whatsapp: '',
      image: '',
      imagePosition: 'top left',
      rating: 5.0,
      reviewsCount: 1
    });
  };

  // Filter listings
  const filteredBusinesses = businesses.filter(biz => {
    const matchesSearch = 
      biz.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      biz.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      biz.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      biz.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || 
      biz.category === selectedCategory || 
      (Array.isArray(biz.secondaryCategories) && biz.secondaryCategories.includes(selectedCategory));

    return matchesSearch && matchesCategory;
  });

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-[#041801] text-white' : 'bg-gray-50 text-gray-900'} transition-colors duration-300 font-sans`}>
      <Navbar />

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-20 right-6 z-[60] bg-[#138601] text-white px-6 py-4 rounded-xl shadow-2xl flex items-center space-x-3 border border-[#138601] animate-in fade-in slide-in-from-top-3">
          <FiCheckCircle className="text-2xl shrink-0" />
          <div>
            <p className="font-bold text-sm">Submission Received!</p>
            <p className="text-xs opacity-90">{toastMessage}</p>
          </div>
        </div>
      )}

      {/* ─── Hero Banner: Authentic Image Backdrop & Carousel Headline (Same styling as Resources page) ─── */}
      <div className="relative w-full h-[150px] sm:h-[190px] md:h-[220px] overflow-hidden flex items-center justify-center select-none">
        {/* Background Image with smooth transition */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-all duration-700 transform scale-105"
          style={{ 
            backgroundImage: `url(${heroSlides[activeSlideIndex].bgImage})`,
            objectPosition: 'top center'
          }}
        />

        {/* Ambient Dark Overlay for contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/70 to-black/80" />

        {/* Hero Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#138601]/90 text-white text-[11px] font-bold uppercase tracking-wider mb-2">
            <span>Indigenous Student Directory</span>
          </div>

          <h1 className="text-lg sm:text-2xl md:text-3xl font-black text-white uppercase tracking-wide sm:tracking-wider drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] transition-all duration-500 leading-tight">
            {heroSlides[activeSlideIndex].title}
          </h1>

          <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-gray-200/95 max-w-2xl font-normal leading-relaxed drop-shadow-md line-clamp-2 sm:line-clamp-none">
            {heroSlides[activeSlideIndex].subtitle}
          </p>
        </div>

        {/* Bottom Right Carousel Pagination Dots */}
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

      {/* ─── Search Controls Strip ─── */}
      <div className="py-6 px-4 bg-white dark:bg-[#062402] border-b border-gray-200 dark:border-[#138601]/20">
        <div className="site-container flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 w-full max-w-xl">
            <div className="flex items-center bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40 rounded-lg p-1.5 px-3 focus-within:border-[#138601] transition-colors">
              <FiSearch className="text-gray-400 text-base mr-2 shrink-0" />
              <input 
                type="text" 
                placeholder="Search student businesses, services, repairs, graphics..."
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
            <span>Register Your Business</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-grow site-container w-full py-8 pb-24">
        {/* Category Filters (sleek rectangular rounded-md tags, no pill badges) */}
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

        {/* Directory Listings */}
        {filteredBusinesses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBusinesses.map((biz) => (
              <div 
                key={biz.id}
                className={`group flex flex-col rounded-2xl overflow-hidden border shadow-xs hover:shadow-md transition-all duration-300 ${
                  theme === 'dark' ? 'bg-[#083002] border-[#138601]/30' : 'bg-white border-gray-200'
                }`}
              >
                {/* Header Image with enforced imagePosition alignment per AGENTS.md rule */}
                <div className="h-52 overflow-hidden relative bg-gray-900">
                  <img 
                    src={biz.image} 
                    alt={biz.name} 
                    style={{ objectPosition: biz.imagePosition || 'top center' }}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30 z-10" />
                  <div className="absolute top-3 right-3 z-20 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/15 text-white flex items-center text-xs font-bold gap-1 shadow-xs">
                    <FiStar className="text-yellow-400 fill-yellow-400" /> {biz.rating?.toFixed(1) || '5.0'} ({biz.reviewsCount || 1})
                  </div>
                  <div className="absolute bottom-3 left-3 z-20 flex items-center text-white text-xs font-bold uppercase tracking-wider gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-[#138601]/90 text-white text-[10px]">
                      {biz.category}
                    </span>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-6 flex-grow flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-xl font-bold mb-1.5 group-hover:text-[#138601] dark:group-hover:text-[#4bd043] transition-colors line-clamp-1">
                      {biz.name}
                    </h3>

                    {/* Owner detail */}
                    <div className="flex items-center gap-1.5 text-xs text-[#138601] dark:text-[#4bd043] font-bold mb-3 uppercase tracking-wider">
                      <FiUser className="shrink-0" />
                      <span>{biz.ownerName} ({biz.ownerLevel})</span>
                    </div>

                    <p className="opacity-75 text-xs leading-relaxed line-clamp-3">
                      {biz.description}
                    </p>
                  </div>

                  {/* Location & Contact CTA */}
                  <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-[#138601]/20">
                    <div className="flex items-center gap-1.5 text-xs opacity-75">
                      <FiMapPin className="text-[#138601] dark:text-[#4bd043] shrink-0" />
                      <span className="font-semibold line-clamp-1">{biz.location}</span>
                    </div>

                    {/* Contacts button group */}
                    <div className="grid grid-cols-2 gap-2">
                      <a 
                        href={`https://wa.me/${biz.whatsapp}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#138601] hover:bg-[#0f6c01] text-white font-bold text-xs transition-colors shadow-xs"
                        title="Chat on WhatsApp"
                      >
                        <FaWhatsapp className="text-sm" />
                        <span>WhatsApp</span>
                      </a>
                      <a 
                        href={`tel:${biz.phone}`} 
                        className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-gray-300 dark:border-[#138601]/30 font-bold text-xs hover:bg-[#f1f3f5] dark:hover:bg-[#041801] transition-colors ${
                          theme === 'dark' ? 'text-white' : 'text-gray-800'
                        }`}
                        title="Call Business"
                      >
                        <FiPhone className="text-xs" />
                        <span>Call</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 opacity-70 border-2 border-dashed border-gray-200 dark:border-[#138601]/30 rounded-2xl">
            <FiSearch className="mx-auto text-5xl mb-3 text-gray-400" />
            <h3 className="text-xl font-bold mb-1">No businesses found</h3>
            <p className="text-xs text-gray-500 dark:text-green-200/60">Try searching with other keywords or select a different category filter.</p>
          </div>
        )}
      </main>

      {/* Register Business Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={`relative w-full max-w-2xl rounded-2xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
            theme === 'dark' ? 'bg-[#083002] border-[#138601]/40 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-[#138601]/20">
              <div>
                <h2 className="text-xl font-black tracking-tight">Register Your Business</h2>
                <p className="text-xs text-gray-500 dark:text-green-200/60 mt-0.5">
                  Listed in the NACOS FUTO Student Commercial Directory
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

            {/* Modal Form */}
            <form onSubmit={handleRegisterBusiness} className="p-6 overflow-y-auto max-h-[75vh] space-y-4 text-left">
              
              {/* Cloudinary Flyer Upload Component */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801]">
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-800 dark:text-green-100 flex items-center gap-1.5">
                  <FiUploadCloud className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
                  <span>Business Flyer / Cover Photo (Cloudinary)</span>
                </label>
                <p className="text-[11px] text-gray-500 dark:text-green-200/70 mb-3">
                  Upload your brand promotional flyer or shop cover photo. Stored securely on Cloudinary.
                </p>

                <MediaUpload
                  currentImageUrl={newBusiness.image}
                  folder={CLOUDINARY_FOLDERS.YELLOW_PAGES || 'yellow_pages'}
                  label="Upload Business Flyer"
                  aspectRatio="landscape"
                  onUploadSuccess={(mediaData) => {
                    setNewBusiness(prev => ({
                      ...prev,
                      image: mediaData.url || mediaData.secure_url
                    }));
                  }}
                  onError={(err) => {
                    console.warn('Cloudinary upload error:', err);
                  }}
                />

                {/* Image Position Alignment Selector per AGENTS.md rule */}
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-[#138601]/20">
                  <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-green-100">
                    Flyer Title Crop Alignment:
                  </label>
                  <select
                    value={newBusiness.imagePosition}
                    onChange={(e) => setNewBusiness({ ...newBusiness, imagePosition: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-[#138601]/40 bg-white dark:bg-[#083002] text-xs text-gray-900 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="top left">Top Left (Best for top-left brand logos, e.g. Peacemaker)</option>
                    <option value="top right">Top Right (Best for top-right brand logos, e.g. Niforix)</option>
                    <option value="top center">Top Center (Best for centered headers, e.g. Cypher.dev)</option>
                    <option value="center">Center / Balanced</option>
                  </select>
                  <p className="text-[10px] text-gray-500 dark:text-green-200/50 mt-1">
                    Rule: Aligns crop so the brand logo and title on your flyer are clearly visible in the card header.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">Business Name *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Cypher Code Lab" 
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-transparent text-xs focus:outline-none focus:border-[#138601] text-gray-900 dark:text-white"
                    value={newBusiness.name}
                    onChange={(e) => setNewBusiness({...newBusiness, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">Category *</label>
                  <select 
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-white dark:bg-[#041801] text-xs focus:outline-none focus:border-[#138601] text-gray-900 dark:text-white cursor-pointer"
                    value={newBusiness.category}
                    onChange={(e) => setNewBusiness({...newBusiness, category: e.target.value})}
                  >
                    {categories.filter(c => c !== 'All').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">Owner Full Name *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Ebubechukwu Okoye" 
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-transparent text-xs focus:outline-none focus:border-[#138601] text-gray-900 dark:text-white"
                    value={newBusiness.ownerName}
                    onChange={(e) => setNewBusiness({...newBusiness, ownerName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">Owner Level</label>
                  <select 
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-white dark:bg-[#041801] text-xs focus:outline-none focus:border-[#138601] text-gray-900 dark:text-white cursor-pointer"
                    value={newBusiness.ownerLevel}
                    onChange={(e) => setNewBusiness({...newBusiness, ownerLevel: e.target.value})}
                  >
                    <option value="100 Level">100 Level</option>
                    <option value="200 Level">200 Level</option>
                    <option value="300 Level">300 Level</option>
                    <option value="400 Level">400 Level</option>
                    <option value="500 Level">500 Level</option>
                    <option value="Student Business">Student Business</option>
                    <option value="Alumni Enterprise">Alumni Enterprise</option>
                    <option value="Staff Member">Staff Member</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">Business Location / Pickup *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Hostel C Room 204 / Eziobodo Back Gate" 
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-transparent text-xs focus:outline-none focus:border-[#138601] text-gray-900 dark:text-white"
                  value={newBusiness.location}
                  onChange={(e) => setNewBusiness({...newBusiness, location: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">Business Description * (Services & Offers)</label>
                <textarea 
                  required 
                  rows="3" 
                  placeholder="Describe your student products, coding services, repair diagnostic turnaround..." 
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-transparent text-xs focus:outline-none focus:border-[#138601] text-gray-900 dark:text-white resize-none"
                  value={newBusiness.description}
                  onChange={(e) => setNewBusiness({...newBusiness, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">Phone Call Number *</label>
                  <input 
                    type="tel" 
                    required 
                    placeholder="e.g. +2348012345678" 
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-transparent text-xs focus:outline-none focus:border-[#138601] text-gray-900 dark:text-white"
                    value={newBusiness.phone}
                    onChange={(e) => setNewBusiness({...newBusiness, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">WhatsApp Number</label>
                  <input 
                    type="tel" 
                    placeholder="e.g. +2348012345678" 
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-transparent text-xs focus:outline-none focus:border-[#138601] text-gray-900 dark:text-white"
                    value={newBusiness.whatsapp}
                    onChange={(e) => setNewBusiness({...newBusiness, whatsapp: e.target.value})}
                  />
                </div>
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

export default YellowPages;
