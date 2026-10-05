import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Navbar from '../components/Nav/Navbar';
import Footer from '../components/Footer';
import { 
  FiBook, 
  FiFileText, 
  FiVideo, 
  FiExternalLink, 
  FiSearch, 
  FiRefreshCw, 
  FiDownload, 
  FiEye, 
  FiLock, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiX, 
  FiPlay, 
  FiFolder, 
  FiLayers, 
  FiUser, 
  FiArrowRight,
  FiChevronDown,
  FiBookOpen,
  FiUploadCloud
} from 'react-icons/fi';
import libraryShelfCloseup from '../assets/library_shelf_closeup.jpg';
import libraryHero from '../assets/library_hero.jpg';
import { 
  fetchResources, 
  fetchResourceCategories, 
  recordResourceDownload, 
  recordResourceView,
  storageService 
} from '@nacos/supabase';
import { getAppUrls } from '@nacos/config/urls';

// Pure real-time resource catalog connected to Supabase & Backblaze B2

const Resources = () => {
  // Active Filter States (Strictly Level and Semester per requirement)
  const [selectedLevel, setSelectedLevel] = useState('All Levels');
  const [selectedSemester, setSelectedSemester] = useState('All Semesters');
  const [activeCategory, setActiveCategory] = useState('All Resources');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Data States
  const [resources, setResources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  // Authentication State
  const [user, setUser] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('nacos_user');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.warn('Failed to parse nacos_user from localStorage', e);
        }
      }
    }
    return null;
  });

  // Modal States
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [targetResource, setTargetResource] = useState(null);
  const [activePreviewResource, setActivePreviewResource] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Hero Section States
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // Listen for user login/logout events across tabs
  useEffect(() => {
    const handleUserUpdate = () => {
      const stored = localStorage.getItem('nacos_user');
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch (e) {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };

    window.addEventListener('storage', handleUserUpdate);
    window.addEventListener('nacos_user_updated', handleUserUpdate);
    window.addEventListener('nacos_user_logged_out', handleUserUpdate);
    return () => {
      window.removeEventListener('storage', handleUserUpdate);
      window.removeEventListener('nacos_user_updated', handleUserUpdate);
      window.removeEventListener('nacos_user_logged_out', handleUserUpdate);
    };
  }, []);

  const pendingDownloadHandledRef = useRef(false);

  // Handle cross-app auth session returned via URL hash (#auth_user=...)
  useEffect(() => {
    try {
      const hash = window.location.hash;
      if (hash && hash.includes('auth_user=')) {
        const rawData = hash.substring(hash.indexOf('auth_user=') + 10);
        const cleanData = decodeURIComponent(rawData);
        const userData = JSON.parse(cleanData);
        if (userData && (userData.id || userData.registration_number || userData.regNo)) {
          localStorage.setItem('nacos_user', JSON.stringify(userData));
          localStorage.setItem('nacos_last_activity', Date.now().toString());
          setUser(userData);
          window.dispatchEvent(new Event('nacos_user_updated'));

          // Remove the hash fragment cleanly from URL bar without causing page reload
          const cleanUrl = window.location.pathname + window.location.search;
          window.history.replaceState(null, '', cleanUrl);

          const studentName = userData.firstName || userData.name || 'Student';
          showToast(`Welcome back, ${studentName}! Authenticated successfully.`);
        }
      }
    } catch (e) {
      console.warn('Error reading auth hash session:', e);
    }
  }, []);

  // Auto-trigger pending download once student is authenticated and resource catalog has loaded
  useEffect(() => {
    if (!user || resources.length === 0 || pendingDownloadHandledRef.current) return;

    try {
      const params = new URLSearchParams(window.location.search);
      const pendingDownloadId = params.get('download');
      if (pendingDownloadId) {
        const itemToDownload = resources.find(r => String(r.id) === String(pendingDownloadId));
        if (itemToDownload) {
          pendingDownloadHandledRef.current = true;
          // Clean the download param from URL bar
          params.delete('download');
          const newSearch = params.toString() ? `?${params.toString()}` : '';
          window.history.replaceState(null, '', window.location.pathname + newSearch);

          showToast(`Resuming download for "${itemToDownload.title}"...`);
          executeDownload(itemToDownload);
        }
      }
    } catch (e) {
      console.warn('Error handling pending download:', e);
    }
  }, [user, resources]);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 280);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load Categories on mount from Supabase
  useEffect(() => {
    async function loadCategories() {
      const res = await fetchResourceCategories();
      if (res.data && res.data.length > 0) {
        setCategories(res.data);
      } else {
        setCategories([]);
      }
    }
    loadCategories();
  }, []);

  // Load Resources from Supabase / Seed Fallback
  const loadResourceData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Map UI filters to Supabase query parameters
      const levelParam = selectedLevel === 'All Levels' 
        ? null 
        : parseInt(selectedLevel.replace(' Level', ''), 10);
      
      const semesterParam = selectedSemester === 'All Semesters' 
        ? null 
        : selectedSemester;

      const categoryParam = activeCategory === 'All Resources' 
        ? null 
        : activeCategory.toLowerCase().replace(/s$/, '');

      const res = await fetchResources({
        level: levelParam,
        semester: semesterParam,
        search: debouncedSearch,
        limit: 100
      });

      if (res.data && res.data.length > 0) {
        let items = res.data;
        // Filter by category if specified
        if (activeCategory !== 'All Resources') {
          const matchCat = activeCategory.toLowerCase();
          items = items.filter(r => {
            const catName = (r.category?.name || '').toLowerCase();
            const catSlug = (r.category?.slug || '').toLowerCase();
            const resType = (r.resource_type || '').toLowerCase();
            return catName.includes(matchCat) || catSlug.includes(matchCat) || `${resType}s` === matchCat || resType === matchCat;
          });
        }
        setResources(items);
      } else {
        setResources([]);
      }
    } catch (err) {
      console.warn('Supabase fetch error:', err);
      setResources([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLevel, selectedSemester, activeCategory, debouncedSearch]);

  useEffect(() => {
    loadResourceData();
  }, [loadResourceData]);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Preview Handler: Direct Fullscreen Preview (Free for all students and visitors without login)
  const handlePreviewClick = (resource) => {
    openPreviewModal(resource);
  };

  // Auth Guard Handler: Trigger Download or Prompt Sign-In
  const handleDownloadClick = (resource) => {
    const isUserLoggedIn = Boolean(
      user && (user.id || user.regNo || user.matric || user.registration_number || user.email)
    );

    if (!isUserLoggedIn) {
      setTargetResource(resource);
      setIsSignInModalOpen(true);
      return;
    }

    // User is logged in: proceed with direct download
    executeDownload(resource);
  };

  // Open Preview Modal
  const openPreviewModal = async (resource) => {
    setActivePreviewResource(resource);
    setIsLoadingPreview(true);
    setPreviewUrl(null);

    // Record view analytics in database
    if (resource.id) {
      recordResourceView(resource.id, { userId: user?.id || null }).catch(err => console.warn(err));
    }

    try {
      const url = await storageService.getPreviewUrl(resource.storage_key);
      setPreviewUrl(url || resource.storage_key);
    } catch (e) {
      setPreviewUrl(resource.storage_key);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Execute Download
  const executeDownload = async (resource) => {
    setDownloadingId(resource.id);
    try {
      // 1. Record download count in database
      if (resource.id) {
        recordResourceDownload(resource.id, {
          userId: user?.id || null,
          userAgent: navigator.userAgent
        }).catch(err => console.warn(err));
      }

      // Optimistically increment download count in UI
      setResources(prev => prev.map(r => r.id === resource.id ? { ...r, download_count: (r.download_count || 0) + 1 } : r));

      // 2. Obtain download URL from Backblaze B2
      let url = await storageService.getDownloadUrl(resource.storage_key, {
        downloadFileName: resource.file_name || `${resource.title}.${resource.file_extension || 'pdf'}`
      });

      if (!url) {
        url = `/downloads/${resource.file_name || 'document.pdf'}`;
      }

      // 3. Initiate silent background download (never opens a new tab or link)
      const downloadFileName = resource.file_name || `${resource.course_code || resource.title || 'Resource'}.${resource.file_extension || 'pdf'}`;
      showToast(`Preparing download for "${resource.title}"...`, 'info');

      await storageService.downloadFile(url, downloadFileName);
      showToast(`Downloaded "${resource.title}" successfully!`);
    } catch (err) {
      console.error('Download execution error:', err);
      showToast(err.message || 'Download failed. Please try again.', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  // Redirect to Portal Sign-In
  const handleRedirectToSignIn = () => {
    const portalUrl = getAppUrls().portal;
    let returnUrl = window.location.href;
    if (targetResource?.id) {
      try {
        const urlObj = new URL(window.location.href);
        urlObj.searchParams.set('download', targetResource.id);
        returnUrl = urlObj.toString();
      } catch (e) {
        const separator = returnUrl.includes('?') ? '&' : '?';
        returnUrl = `${returnUrl}${separator}download=${encodeURIComponent(targetResource.id)}`;
      }
    }
    const loginTarget = `${portalUrl}/login?redirect=${encodeURIComponent(returnUrl)}`;
    window.location.href = loginTarget;
  };

  const handleResetFilters = () => {
    setSelectedLevel('All Levels');
    setSelectedSemester('All Semesters');
    setActiveCategory('All Resources');
    setSearchQuery('');
  };

  const hasActiveFilters = selectedLevel !== 'All Levels' || selectedSemester !== 'All Semesters' || searchQuery.trim() !== '' || activeCategory !== 'All Resources';

  const formatFileSize = (bytes) => {
    if (!bytes || bytes <= 0) return 'Standard PDF';
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const getResourceIcon = (type, ext) => {
    const clean = (type || ext || '').toLowerCase();
    if (clean.includes('video') || clean.includes('mp4')) {
      return <FiVideo className="text-3xl sm:text-4xl text-[#4bd043]" />;
    }
    if (clean.includes('book')) {
      return <FiBook className="text-3xl sm:text-4xl text-[#4bd043]" />;
    }
    return <FiFileText className="text-3xl sm:text-4xl text-[#4bd043]" />;
  };



  // Hero carousel slides inspired by the literature / academic archive hero layout
  const heroSlides = useMemo(() => [
    {
      id: 'ebooks',
      title: 'THE ULTIMATE GUIDE TO FREE EBOOKS',
      subtitle: 'Not sure what to study next? Explore our catalog of public domain books, verified lecture notes, and departmental textbooks. Some real gems are hidden in our library.',
      linkText: 'Read more',
      category: 'Books',
      bgImage: libraryShelfCloseup,
    },
    {
      id: 'past-questions',
      title: 'PAST QUESTIONS & EXAM ARCHIVES',
      subtitle: 'Accelerate your semester revision with curated previous year question papers, marking schemes, and model solutions across 100L – 500L.',
      linkText: 'Explore past papers',
      category: 'Past Questions',
      bgImage: libraryHero,
    },
    {
      id: 'handouts',
      title: 'OFFICIAL HANDOUTS & STUDY GUIDES',
      subtitle: 'Browse authentic lecture notes, syllabus companion guides, and slides prepared for FUTO Computer Science undergraduates.',
      linkText: 'Explore handouts',
      category: 'Handouts',
      bgImage: libraryShelfCloseup,
    }
  ], []);

  // Auto-advance hero carousel every 7 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % heroSlides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const scrollToCatalog = () => {
    const el = document.getElementById('catalog-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleHeroSearchSubmit = (e) => {
    e.preventDefault();
    scrollToCatalog();
  };

  const handleSelectCategoryFromHero = (cat) => {
    setActiveCategory(cat);
    scrollToCatalog();
  };

  const handleSelectLevelFromHero = (lvl) => {
    setSelectedLevel(lvl);
    scrollToCatalog();
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#041801] text-gray-900 dark:text-white transition-colors duration-300">
      <Navbar />

      {/* Toast notification banner */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 p-3.5 rounded bg-white dark:bg-[#083002] border border-emerald-500/40 text-gray-900 dark:text-white shadow-xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3 duration-200">
          {toastMessage.type === 'error' ? (
            <FiAlertCircle className="w-4 h-4 text-red-500" />
          ) : (
            <FiCheckCircle className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
          )}
          <span className="text-xs font-semibold">{toastMessage.text}</span>
        </div>
      )}



      {/* ─── Integrated Taskbar (Emblem, Academic Level, Semester Term, Search Bar, and Log In) ─── */}
      <div className="bg-[#083002] border-b border-[#138601]/30 py-2 sm:py-2.5 px-3 sm:px-4 sticky top-0 z-20 shadow-md">
        <div className="site-container flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-4">
          
          {/* Top Row on Mobile: Brand Icon + Level + Semester + Log In */}
          <div className="flex items-center justify-between gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-[#138601] flex items-center justify-center text-white shadow-xs font-black text-xs sm:text-sm">
                <FiBookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="hidden sm:inline font-black tracking-wider text-xs uppercase text-white">
                NACOS Library
              </span>
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <select
                id="top-resource-level-filter"
                aria-label="Filter by academic level"
                value={selectedLevel}
                onChange={(e) => {
                  setSelectedLevel(e.target.value);
                  scrollToCatalog();
                }}
                className="px-2 py-1.5 rounded bg-[#041801] text-xs font-medium text-white border border-[#138601]/40 focus:outline-none focus:ring-1 focus:ring-[#4bd043] transition-colors cursor-pointer"
              >
                <option value="All Levels" className="bg-[#083002] text-white">All Levels</option>
                <option value="100 Level" className="bg-[#083002] text-white">100L</option>
                <option value="200 Level" className="bg-[#083002] text-white">200L</option>
                <option value="300 Level" className="bg-[#083002] text-white">300L</option>
                <option value="400 Level" className="bg-[#083002] text-white">400L</option>
                <option value="500 Level" className="bg-[#083002] text-white">500L</option>
              </select>

              <select
                id="top-resource-semester-filter"
                aria-label="Filter by semester"
                value={selectedSemester}
                onChange={(e) => {
                  setSelectedSemester(e.target.value);
                  scrollToCatalog();
                }}
                className="px-2 py-1.5 rounded bg-[#041801] text-xs font-medium text-white border border-[#138601]/40 focus:outline-none focus:ring-1 focus:ring-[#4bd043] transition-colors cursor-pointer"
              >
                <option value="All Semesters" className="bg-[#083002] text-white">All Terms</option>
                <option value="First Semester" className="bg-[#083002] text-white">1st Sem</option>
                <option value="Second Semester" className="bg-[#083002] text-white">2nd Sem</option>
              </select>
            </div>

            {/* Log in / User on Mobile row */}
            <div className="shrink-0">
              {user ? (
                <a
                  href={getAppUrls().portal}
                  className="text-xs text-white hover:text-[#4bd043] font-semibold transition-colors truncate max-w-[90px] sm:max-w-none inline-block"
                >
                  <span className="font-bold underline text-[#4bd043]">{user.firstName || user.name || 'Student'}</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={handleRedirectToSignIn}
                  className="text-xs text-white hover:text-[#4bd043] font-semibold transition-colors cursor-pointer px-2 py-1 rounded hover:bg-white/5 whitespace-nowrap"
                >
                  Log in
                </button>
              )}
            </div>
          </div>

          {/* Search Box — Full width on mobile, centered on desktop */}
          <form onSubmit={handleHeroSearchSubmit} className="w-full md:flex-1 md:max-w-md lg:max-w-lg">
            <div className="relative flex items-center w-full shadow-xs">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, author, course code..."
                className="w-full bg-white text-gray-900 placeholder-gray-400 text-xs sm:text-sm pl-3 pr-10 py-1.5 sm:py-2 rounded-sm border border-transparent focus:outline-none focus:ring-2 focus:ring-[#4bd043] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-9 text-gray-400 hover:text-gray-700 text-xs font-bold p-1 cursor-pointer"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
              <button
                type="submit"
                aria-label="Search"
                className="absolute right-0 top-0 bottom-0 px-3 bg-[#138601] hover:bg-[#0f6c01] text-white flex items-center justify-center rounded-r-sm transition-colors cursor-pointer"
              >
                <FiSearch className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

        </div>
      </div>

      {/* ─── Hero Banner: Authentic Bookshelf Backdrop & Editorial Headline (Reduced Height) ─── */}
      <div className="relative w-full h-[140px] sm:h-[180px] md:h-[210px] overflow-hidden flex items-center justify-center select-none">
        {/* Background Image with smooth transition */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-all duration-700 transform scale-105"
          style={{ backgroundImage: `url(${heroSlides[activeSlideIndex].bgImage})` }}
        />

        {/* Ambient Dark Overlay for contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/65 to-black/75" />

        {/* Hero Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center flex flex-col items-center">
          <h1 className="text-lg sm:text-2xl md:text-3xl font-black text-white uppercase tracking-wide sm:tracking-wider drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] transition-all duration-500 leading-tight">
            {heroSlides[activeSlideIndex].title}
          </h1>

          <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-gray-200/95 max-w-2xl font-normal leading-relaxed drop-shadow-md line-clamp-2 sm:line-clamp-none">
            {heroSlides[activeSlideIndex].subtitle}{' '}
            <button
              type="button"
              onClick={() => {
                setActiveCategory(heroSlides[activeSlideIndex].category);
                scrollToCatalog();
              }}
              className="text-[#4bd043] hover:text-[#38bdf8] font-bold underline transition-colors cursor-pointer ml-1 inline-flex items-center gap-0.5"
            >
              <span>{heroSlides[activeSlideIndex].linkText}</span>
            </button>
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
              className={`rounded-full transition-all duration-300 cursor-pointer ${
                activeSlideIndex === idx
                  ? 'w-2.5 h-2.5 bg-white scale-125 shadow-lg'
                  : 'w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white/40 hover:bg-white/75'
              }`}
            />
          ))}
        </div>
      </div>

      {/* ─── Main Resources Section ─── */}
      <main id="catalog-section" className="flex-grow site-container w-full py-8 sm:py-10">
        
        {/* Catalog Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-[#138601]/20 dark:border-[#138601]/30 gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-black dark:text-white tracking-tight flex items-center gap-2">
              <span>Catalog & Archive</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-[#138601]/10 dark:bg-[#138601]/30 text-[#138601] dark:text-[#4bd043]">
                {resources.length} Available
              </span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-green-200/70 mt-0.5">
              Filter by level, semester, or resource format to access verified departmental materials.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#138601]/10 dark:bg-[#138601]/20 border border-[#138601]/30 text-xs text-[#138601] dark:text-[#4bd043] font-semibold">
                <FiCheckCircle className="w-3.5 h-3.5" />
                <span>Signed in as {user.firstName || user.name || 'Student'}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleRedirectToSignIn}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#138601] hover:bg-[#0f6c01] text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
              >
                <FiUser className="w-3.5 h-3.5" />
                <span>Portal Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* ─── Category Filter Pills & Reset Action ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1.5 sm:pb-0 scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0">
            {['All Resources', 'Handouts', 'Books', 'Past Questions', 'Videos', 'Tutorials'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 sm:px-3.5 py-1.5 rounded font-semibold text-xs whitespace-nowrap transition-colors cursor-pointer border shrink-0 ${
                  activeCategory === cat
                    ? 'bg-[#138601] text-white border-[#138601] shadow-xs'
                    : 'bg-[#f2fbf1] dark:bg-[#083002] text-black dark:text-green-100 border-[#138601]/20 dark:border-[#138601]/30 hover:bg-[#e2f7df] dark:hover:bg-[#138601]/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 text-xs text-[#138601] dark:text-[#4bd043] font-semibold hover:underline cursor-pointer"
              >
                <FiRefreshCw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
            <span className="text-xs text-gray-500 dark:text-green-200/70 font-medium">
              Showing <strong className="text-gray-900 dark:text-white">{resources.length}</strong> resources
            </span>
          </div>
        </div>

        {/* ─── Resources Grid Display ─── */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white dark:bg-[#083002] rounded border border-gray-200 dark:border-[#138601]/20 p-4 sm:p-5 space-y-4 animate-pulse">
                <div className="h-32 bg-gray-200 dark:bg-[#041801] rounded"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : resources.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {resources.map((resource) => {
              const isVideo = resource.resource_type === 'video' || resource.file_extension === 'mp4';

              return (
                <div
                  key={resource.id}
                  className="bg-white dark:bg-[#083002] rounded overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 border border-gray-200 dark:border-[#138601]/30 flex flex-col justify-between group"
                >
                  {/* Card Visual Header */}
                  <div className="h-32 sm:h-36 bg-[#041801] flex items-center justify-center text-white border-b border-[#138601]/20 relative overflow-hidden">
                    {isVideo && (resource.thumbnail_storage_key || resource.thumbnail_key) ? (
                      <div className="relative w-full h-full">
                        <img 
                          src={resource.thumbnail_storage_key || resource.thumbnail_key} 
                          alt={resource.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-[#138601] text-white flex items-center justify-center shadow-md">
                            <FiPlay className="w-4 h-4 ml-0.5" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      getResourceIcon(resource.category?.name || resource.resource_type, resource.file_extension)
                    )}

                    {/* Format Badge */}
                    <div className="absolute top-2.5 right-2.5">
                      <span className="text-[10px] font-bold bg-black/75 backdrop-blur-xs text-white px-2 py-0.5 rounded border border-white/20 uppercase">
                        {resource.file_extension || (isVideo ? 'MP4' : 'PDF')}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 sm:p-5 flex-grow flex flex-col justify-between space-y-3 sm:space-y-4">
                    <div>
                      {/* Top Meta Line: Course Code & Category */}
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-bold text-[#138601] dark:text-[#4bd043] bg-emerald-50 dark:bg-[#041801] px-2 py-0.5 rounded border border-[#138601]/25">
                          {resource.course_code || 'GEN'}
                        </span>
                        <span className="text-[11px] text-gray-500 dark:text-green-200/70 font-medium">
                          {resource.category?.name || resource.resource_type || 'Material'}
                        </span>
                      </div>

                      {/* Course Title + Level & Semester Badges on the Same Line Header (Mobile Responsive) */}
                      <div className="flex flex-wrap sm:flex-nowrap items-baseline justify-between gap-x-2 gap-y-1">
                        <h3 className="text-sm sm:text-base font-bold text-black dark:text-white leading-snug group-hover:text-[#138601] dark:group-hover:text-[#4bd043] transition-colors flex-1 min-w-[140px] break-words">
                          {resource.title}
                        </h3>

                        {/* Level and Semester Badges on the same line */}
                        <div className="flex items-center gap-1.5 shrink-0 mt-0.5 sm:mt-0">
                          {resource.level && (
                            <span className="text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 whitespace-nowrap">
                              {resource.level.replace(' Level', '')}L
                            </span>
                          )}
                          {resource.semester && (
                            <span className="text-[10px] sm:text-[11px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-[#041801] text-[#138601] dark:text-[#4bd043] border border-[#138601]/25 whitespace-nowrap">
                              {resource.semester.includes('First') ? '1st Sem' : resource.semester.includes('Second') ? '2nd Sem' : resource.semester}
                            </span>
                          )}
                        </div>
                      </div>

                      {(resource.author || resource.lecturer) && (
                        <p className="text-xs text-black/70 dark:text-green-100/70 mt-1.5 font-medium">
                          Instructor: {resource.author || resource.lecturer}
                        </p>
                      )}

                      {resource.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 line-clamp-2 leading-relaxed">
                          {resource.description}
                        </p>
                      )}
                    </div>

                    {/* Card Footer Action Strip */}
                    <div className="pt-3 border-t border-[#138601]/15 dark:border-white/10 space-y-2.5">
                      <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-green-200/70 font-mono">
                        <span>{formatFileSize(resource.file_size)}</span>
                        <span>{resource.download_count || 0} downloads</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {/* Preview Button */}
                        <button
                          type="button"
                          onClick={() => handlePreviewClick(resource)}
                          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded text-xs font-semibold bg-white dark:bg-[#041801] hover:bg-[#138601]/10 dark:hover:bg-[#138601]/20 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-[#138601]/30 transition-colors cursor-pointer"
                        >
                          <FiEye className="w-3.5 h-3.5" />
                          <span>{isVideo ? 'Watch' : 'Preview'}</span>
                        </button>

                        {/* Download Button */}
                        <button
                          type="button"
                          disabled={downloadingId === resource.id}
                          onClick={() => handleDownloadClick(resource)}
                          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                        >
                          <FiDownload className="w-3.5 h-3.5" />
                          <span>{downloadingId === resource.id ? 'Loading...' : 'Download'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 px-4 bg-white dark:bg-[#083002] rounded border border-dashed border-gray-300 dark:border-[#138601]/30">
            <FiSearch className="mx-auto text-4xl text-gray-400 dark:text-gray-500 mb-3" />
            <h3 className="text-base font-bold text-gray-800 dark:text-white">No academic resources found</h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1 max-w-md mx-auto leading-relaxed">
              We couldn't find any resources matching your selected level, semester, or search query. Try adjusting your filter parameters.
            </p>
            <button
              onClick={handleResetFilters}
              className="mt-4 px-4 py-2 bg-[#138601] hover:bg-[#0f6c01] text-white font-semibold rounded text-xs transition-colors shadow-xs cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </main>

      {/* ─── AUTHENTICATION REQUIRED MODAL (FOR DOWNLOADS) ─── */}
      {isSignInModalOpen && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 rounded w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded bg-[#138601]/15 text-[#138601] dark:text-[#4bd043] flex items-center justify-center">
                  <FiLock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Portal Sign-In Required</h3>
                  <p className="text-[11px] text-gray-500 dark:text-green-200/70">NACOS FUTO Academic Portal</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSignInModalOpen(false);
                  setTargetResource(null);
                }}
                className="p-1.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#041801] transition-colors cursor-pointer"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded bg-[#f8fafc] dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 space-y-2">
              <p className="text-xs text-gray-700 dark:text-green-100 leading-relaxed">
                Previewing materials is free for all students. To <strong>download and save</strong> official lecture notes, textbooks, and past examination solutions to your device, please sign in to your student portal account.
              </p>
              {targetResource && (
                <div className="pt-2 border-t border-gray-200 dark:border-[#138601]/20">
                  <p className="text-[11px] text-gray-500 dark:text-green-200/70 font-semibold truncate">
                    Ready to download: {targetResource.course_code ? `${targetResource.course_code} — ` : ''}{targetResource.title}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsSignInModalOpen(false);
                  setTargetResource(null);
                }}
                className="w-full sm:w-auto flex-1 px-4 py-2.5 rounded text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#041801] hover:bg-gray-200 dark:hover:bg-[#138601]/20 border border-gray-200 dark:border-[#138601]/30 transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRedirectToSignIn}
                className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] shadow-xs transition-colors cursor-pointer"
              >
                <span>Sign In to Portal</span>
                <FiArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── FULLSCREEN RESOURCE PREVIEW MODAL ─── */}
      {activePreviewResource && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col w-screen h-screen overflow-hidden animate-in fade-in duration-150">
          
          {/* Fullscreen Header Bar */}
          <div className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-[#083002] border-b border-[#138601]/40 flex items-center justify-between gap-3 shrink-0 text-white shadow-xl z-20">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              {activePreviewResource.course_code && (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#138601] text-white shadow-xs shrink-0">
                  {activePreviewResource.course_code}
                </span>
              )}
              <div className="min-w-0">
                <h3 className="text-xs sm:text-base font-bold text-white truncate max-w-[200px] sm:max-w-md md:max-w-xl">
                  {activePreviewResource.title}
                </h3>
                <p className="text-[11px] text-green-200/70 font-mono truncate hidden sm:block">
                  {activePreviewResource.file_name} • {formatFileSize(activePreviewResource.file_size)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => handleDownloadClick(activePreviewResource)}
                className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] shadow-xs transition-colors cursor-pointer"
              >
                <FiDownload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Download</span>
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setActivePreviewResource(null);
                  setPreviewUrl(null);
                }}
                className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close preview"
                title="Close"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Fullscreen Viewer Area — Fills 100% of remaining screen height */}
          <div className="flex-1 w-full h-full overflow-hidden bg-neutral-950 flex flex-col relative">
            {isLoadingPreview ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-3">
                <div className="w-10 h-10 border-3 border-[#138601] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-gray-300 font-medium">Generating secure resource preview...</p>
              </div>
            ) : (
              <>
                {/* PDF Viewer — Fills 100% Fullscreen */}
                {(activePreviewResource.file_extension === 'pdf' || activePreviewResource.mime_type === 'application/pdf') && (
                  <iframe
                    src={previewUrl ? `${previewUrl}#toolbar=1` : ''}
                    title={activePreviewResource.title}
                    className="w-full h-full flex-1 border-0"
                  />
                )}

                {/* HTML5 Video Player — Fullscreen */}
                {(activePreviewResource.resource_type === 'video' || activePreviewResource.file_extension === 'mp4') && (
                  <div className="w-full h-full flex items-center justify-center p-2 sm:p-4 bg-black">
                    <video
                      src={previewUrl}
                      controls
                      controlsList="nodownload"
                      preload="metadata"
                      className="w-full h-full max-h-full object-contain"
                    >
                      Your browser does not support HTML5 video streaming.
                    </video>
                  </div>
                )}

                {/* Image Viewer — Fullscreen */}
                {(activePreviewResource.resource_type === 'image' || ['jpg', 'jpeg', 'png', 'webp'].includes(activePreviewResource.file_extension)) && (
                  <div className="w-full h-full flex items-center justify-center p-2 sm:p-4 bg-black">
                    <img
                      src={previewUrl}
                      alt={activePreviewResource.title}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                )}

                {/* Fallback info when preview not supported directly */}
                {!['pdf', 'mp4', 'jpg', 'jpeg', 'png', 'webp'].includes(activePreviewResource.file_extension) && (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
                    <FiFileText className="w-16 h-16 text-[#4bd043]" />
                    <h4 className="text-base font-bold text-white">Document Preview Not Supported Directly</h4>
                    <p className="text-xs text-gray-300 max-w-md">
                      This file ({activePreviewResource.file_name}) cannot be rendered directly inside the web browser previewer. Click download below to view it on your device.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleDownloadClick(activePreviewResource)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] shadow-md transition-colors cursor-pointer"
                    >
                      <FiDownload className="w-4 h-4" />
                      <span>Download {activePreviewResource.file_extension?.toUpperCase() || 'File'}</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}



      <Footer />
    </div>
  );
};

export default Resources;
