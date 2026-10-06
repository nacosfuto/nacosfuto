import React, { useState, useEffect } from 'react';
import Navbar from '../components/Nav/Navbar';
import Footer from '../components/Footer';
import { useTheme } from '../context/ThemeContext';
import { FaCalendarAlt, FaClock, FaNewspaper, FaTag, FaSearch, FaArrowRight, FaBookOpen } from 'react-icons/fa';
import { getLocalNewsArticles, fetchNewsArticles } from '@nacos/supabase';
import { getCloudinaryAssetUrl } from '@nacos/media';

const HERO_IMAGE_URL = "https://res.cloudinary.com/z3wgqisj/image/upload/v1789824604/20250304_223205_Destiny_Eke_ce1a4da154_hxay39.jpg";

const CATEGORIES = [
  { id: 'all', label: 'All Articles' },
  { id: 'Research & Journal', label: 'Research & Journal' },
  { id: 'Academics', label: 'Academics' },
  { id: 'Innovation', label: 'Innovation' },
  { id: 'Hackathon', label: 'Hackathons' },
  { id: 'Campus Life', label: 'Campus Life' },
  { id: 'Alumni', label: 'Alumni' }
];

const News = () => {
  const { theme } = useTheme();
  const [articles, setArticles] = useState(() => getLocalNewsArticles({ publishedOnly: true }));
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeArticleModal, setActiveArticleModal] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.body.style.overflow = 'auto';

    // Fetch latest news & journal articles from Supabase in background
    fetchNewsArticles({ publishedOnly: true }).then(fetched => {
      if (fetched && fetched.length > 0) {
        setArticles(fetched);
      }
    });

    // Real-time listener for dashboard updates & multi-tab storage
    const handleSync = () => {
      setArticles(getLocalNewsArticles({ publishedOnly: true }));
    };

    window.addEventListener('nacos_website_articles_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('nacos_website_articles_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const filtered = articles.filter(article => {
    const matchesCategory = activeCategory === 'all' || article.category === activeCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      article.title.toLowerCase().includes(q) ||
      (article.excerpt && article.excerpt.toLowerCase().includes(q)) ||
      (article.summary && article.summary.toLowerCase().includes(q)) ||
      (article.content && article.content.toLowerCase().includes(q)) ||
      (article.author && article.author.toLowerCase().includes(q))
    );
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#041801] text-black dark:text-white transition-colors duration-200">
      <Navbar />

      <main className="flex-grow">
        {/* Full-width Home-Style Hero Section */}
        <section className="relative flex min-h-[460px] sm:min-h-[500px] md:h-[65vh] items-center justify-center overflow-hidden bg-gray-950">
          <img
            src={HERO_IMAGE_URL}
            alt="Department News Banner"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-[#041801]/95 via-[#041801]/60 to-black/35" />
          <div className="absolute inset-0 bg-black/25" />

          <div className="relative z-10 text-center px-4 sm:px-6 max-w-4xl mx-auto flex flex-col items-center py-16 sm:py-20 md:py-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#138601]/80 text-white font-bold text-xs uppercase tracking-wider mb-4 border border-green-400/30 shadow">
              <FaNewspaper className="text-xs" />
              <span>Official Press & Publications</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 drop-shadow-lg tracking-tight leading-[1.2]">
              Department <span className="text-[#4bd043]">News & Journal</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-100 max-w-2xl drop-shadow font-normal leading-relaxed text-center">
              Explore official announcements, research breakthroughs, academic milestones, and student leadership highlights from FUTO Computer Science.
            </p>
          </div>
        </section>

        {/* Category Filter and Search Toolbar */}
        <section className="py-6 bg-[#f8f9fa] dark:bg-[#083002]/50 border-b border-[#138601]/20 dark:border-[#138601]/30">
          <div className="site-container flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            
            {/* Category Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white dark:bg-[#041801] rounded-xl border border-gray-200 dark:border-[#138601]/30">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeCategory === cat.id
                      ? 'bg-[#138601] text-white shadow-sm'
                      : 'text-gray-600 dark:text-green-200/70 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <input
                type="text"
                placeholder="Search articles & journals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-white dark:bg-[#041801] text-black dark:text-white border border-[#138601]/25 focus:outline-none focus:ring-1 focus:ring-[#138601]"
              />
              <FaSearch className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>
        </section>

        {/* Articles Grid */}
        <section className="py-16 site-container">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-500 dark:text-gray-400">
              <p className="text-base font-semibold">No news or journal articles found matching your criteria.</p>
              <button
                onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
                className="mt-4 px-5 py-2 text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] rounded-xl cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filtered.map((item) => (
                <article
                  key={item.id || item.slug}
                  className="group bg-white dark:bg-[#083002] rounded-2xl overflow-hidden border border-[#138601]/20 dark:border-[#138601]/30 hover:border-[#138601] dark:hover:border-[#4bd043] shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full transform hover:-translate-y-1.5"
                >
                  <div className="relative h-52 w-full overflow-hidden bg-gray-900">
                    <img
                      src={item.cover_image_url || item.image}
                      alt={item.title}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute top-3 left-3 bg-[#138601] text-white px-2.5 py-0.5 rounded-lg font-bold text-[10px] uppercase tracking-wider shadow">
                      {item.category}
                    </div>
                  </div>

                  <div className="p-6 flex flex-col flex-grow justify-between">
                    <div>
                      <div className="flex items-center gap-3 text-xs text-black/60 dark:text-green-200/60 mb-3">
                        <span className="inline-flex items-center gap-1.5">
                          <FaCalendarAlt className="text-[#138601] dark:text-[#4bd043]" />
                          {item.date}
                        </span>
                        <span>&bull;</span>
                        <span className="inline-flex items-center gap-1.5">
                          <FaClock className="text-[#138601] dark:text-[#4bd043]" />
                          {item.readTime || `${item.read_time_minutes || 3} min read`}
                        </span>
                      </div>

                      <h2 className="text-lg font-bold text-black dark:text-white group-hover:text-[#138601] dark:group-hover:text-[#4bd043] transition-colors line-clamp-2 mb-3 leading-snug">
                        {item.title}
                      </h2>

                      <p className="text-sm text-black/75 dark:text-green-100/75 line-clamp-3 leading-relaxed mb-6">
                        {item.summary || item.excerpt}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-[#138601]/10 dark:border-white/10 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                        By {item.author || 'NACOS Press'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveArticleModal(item)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#138601] dark:text-[#4bd043] hover:underline cursor-pointer"
                      >
                        <span>Read Article</span>
                        <FaArrowRight className="text-[10px]" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Modal for Full Article View */}
        {activeArticleModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="bg-white dark:bg-[#083002] max-w-2xl w-full rounded-3xl overflow-hidden shadow-2xl border border-[#138601]/30 my-8">
              <div className="relative h-64 w-full bg-gray-950">
                <img
                  src={activeArticleModal.cover_image_url || activeArticleModal.image}
                  alt={activeArticleModal.title}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setActiveArticleModal(null)}
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  &times;
                </button>
                <div className="absolute bottom-3 left-4 bg-[#138601] text-white px-3 py-1 rounded-lg text-xs font-bold shadow">
                  {activeArticleModal.category}
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-4">
                <div className="flex items-center gap-4 text-xs text-black/60 dark:text-green-200/60 flex-wrap">
                  <span>{activeArticleModal.date}</span>
                  <span>&bull;</span>
                  <span>{activeArticleModal.readTime || `${activeArticleModal.read_time_minutes || 3} min read`}</span>
                  <span>&bull;</span>
                  <span>By {activeArticleModal.author}</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-black dark:text-white leading-tight">
                  {activeArticleModal.title}
                </h2>

                <div className="text-sm leading-relaxed text-black/85 dark:text-green-100/85 space-y-3 pt-3 border-t border-[#138601]/15 dark:border-white/10 max-h-96 overflow-y-auto">
                  <p className="font-medium text-black dark:text-white">
                    {activeArticleModal.summary || activeArticleModal.excerpt}
                  </p>
                  <p className="whitespace-pre-line">
                    {activeArticleModal.content || activeArticleModal.summary || activeArticleModal.excerpt}
                  </p>
                  <p className="pt-2 text-xs text-gray-500 dark:text-gray-400">
                    For official press inquiries and editorial publications, contact the Department of Computer Science or the NACOS Editorial Board at <strong>hod.csc@futo.edu.ng</strong>.
                  </p>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveArticleModal(null)}
                    className="px-6 py-2.5 bg-[#138601] hover:bg-[#0f6c01] text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Close Article
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default News;
