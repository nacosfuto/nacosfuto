import React, { useState, useEffect } from 'react';
import Navbar from '../components/Nav/Navbar';
import Footer from '../components/Footer';
import { useTheme } from '../context/ThemeContext';
import { FaCalendarAlt, FaClock, FaNewspaper, FaTag, FaSearch, FaArrowRight, FaShareAlt, FaUserEdit } from 'react-icons/fa';
import { supabase } from '@nacos/supabase';
import { getCloudinaryAssetUrl } from '@nacos/media';
import newsImg1 from '../assets/research.jpg';
import newsImg2 from '../assets/academics.jpg';
import newsImg3 from '../assets/gallery_dept_front.jpg';
import headerImg from '../assets/header.jpg';

const HERO_IMAGE_URL = "https://res.cloudinary.com/z3wgqisj/image/upload/v1789824604/20250304_223205_Destiny_Eke_ce1a4da154_hxay39.jpg";

const CANONICAL_ARTICLES = [
  {
    id: 1,
    slug: 'futo-csc-nuc-accreditation-2026',
    title: 'Department of Computer Science Achieves Full 5-Year NUC Accreditation Status',
    category: 'Academics',
    author: 'Office of the HOD',
    date: 'August 28, 2026',
    readTime: '3 min read',
    image: getCloudinaryAssetUrl('academics') || newsImg2,
    excerpt: 'Following comprehensive infrastructure audits and academic curriculum assessments, the National Universities Commission (NUC) has certified FUTO Computer Science with highest tier accreditation.',
    content: 'The National Universities Commission (NUC) has officially granted full accreditation status to the Department of Computer Science, Federal University of Technology, Owerri (FUTO). The accreditation panel commended the department for its modernized software engineering syllabus, state-of-the-art computational laboratories in the TETFUND complex, and highly distinguished faculty.'
  },
  {
    id: 2,
    slug: 'ai-research-cluster-grant-expansion',
    title: 'SICT Research Cluster Secures Multi-Million Compute Grant for Applied AI',
    category: 'Research',
    author: 'Directorate of Research',
    date: 'August 14, 2026',
    readTime: '4 min read',
    image: getCloudinaryAssetUrl('research') || newsImg1,
    excerpt: 'Department faculty and student researchers expand high-performance compute clusters focused on African healthcare and natural language processing solutions.',
    content: 'In collaboration with international research partners, the Department of Computer Science has secured compute hardware funding to deploy GPU-accelerated clusters. The infrastructure will accelerate doctoral, postgraduate, and final-year student investigations into low-resource language models, medical image classification, and precision agriculture.'
  },
  {
    id: 3,
    slug: 'nacos-tech-summit-hackathon-champions',
    title: 'FUTO Computing Students Clinch Top Honours at National Hackathon Challenge',
    category: 'Innovation',
    author: 'NACOS Press & PRO Office',
    date: 'July 29, 2026',
    readTime: '3 min read',
    image: getCloudinaryAssetUrl('gallery_dept_front') || newsImg3,
    excerpt: 'Undergraduate student innovators develop distributed fintech and agricultural supply chain models, winning accolades across regional and national computing leagues.',
    content: 'A delegation of undergraduate computing students representing NACOS FUTO emerged champions at the 2026 National Inter-University Software Innovation Hackathon. Their winning prototype featured an offline-first distributed ledger system enabling rural farmers to verify decentralized payments and track logistics.'
  },
  {
    id: 4,
    slug: 'departmental-curriculum-modernization-2026',
    title: 'Senate Approves New Curricula in Cloud Architecture, AI Systems, and Cyber Security',
    category: 'Academics',
    author: 'Departmental Academic Board',
    date: 'July 10, 2026',
    readTime: '5 min read',
    image: getCloudinaryAssetUrl('header') || headerImg,
    excerpt: 'The university senate has approved revised undergraduate course modules emphasizing industry readiness, microservices architecture, and modern cryptographic defenses.',
    content: 'Starting in the current academic session, CSC undergraduate students will benefit from hands-on practical labs spanning DevOps pipelines, modern full-stack web architectures, container orchestration, and practical machine learning engineering.'
  },
  {
    id: 5,
    slug: 'alumni-mentorship-fellowship-announcement',
    title: 'Global Alumni Chapter Launches Annual Computing Mentorship Fellowship',
    category: 'Alumni',
    author: 'NACOS Alumni Relations',
    date: 'June 22, 2026',
    readTime: '4 min read',
    image: getCloudinaryAssetUrl('research') || newsImg1,
    excerpt: 'FUTO CSC alumni working across global tech leaders launch direct mentorship pairing, career advisory webinars, and resume clinics for 300L and 400L students.',
    content: 'The NACOS FUTO Alumni Network has formally initiated its 2026 Industry Fellowship. Selected students receive 1-on-1 mentorship from software engineers, tech founders, and data scientists stationed across Silicon Valley, Europe, and Nigeria.'
  },
  {
    id: 6,
    slug: 'annual-cybersecurity-awareness-week-highlights',
    title: 'Cybersecurity Week: Department Partners with Industry Experts on Digital Safety',
    category: 'Campus Press',
    author: 'Office of the Director of ICT',
    date: 'May 18, 2026',
    readTime: '3 min read',
    image: getCloudinaryAssetUrl('academics') || newsImg2,
    excerpt: 'Students and staff participate in ethical hacking demonstrations, identity defense workshops, and credential protection seminars.',
    content: 'Organized by the Office of the Director of ICT in partnership with cybersecurity analysts, the event empowered hundreds of undergraduates with skills in penetration testing, multi-factor authentication setup, and digital footprint management.'
  }
];

const News = () => {
  const { theme } = useTheme();
  const [articles, setArticles] = useState(CANONICAL_ARTICLES);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeArticleModal, setActiveArticleModal] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.body.style.overflow = 'auto';

    async function fetchLiveNews() {
      try {
        if (!supabase) return;
        const { data, error } = await supabase
          .from('news_articles')
          .select('*')
          .eq('is_published', true)
          .order('published_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const live = data.map(d => ({
            id: d.id,
            slug: d.slug,
            title: d.title,
            category: d.category || 'Department News',
            author: d.author || 'NACOS Editorial',
            date: d.published_at ? new Date(d.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Recent',
            readTime: `${d.read_time_minutes || 3} min read`,
            image: d.cover_image_url || getCloudinaryAssetUrl('research') || newsImg1,
            excerpt: d.summary || d.excerpt || '',
            content: d.content || d.excerpt || ''
          }));

          const liveSlugs = new Set(live.map(l => l.slug));
          setArticles([...live, ...CANONICAL_ARTICLES.filter(c => !liveSlugs.has(c.slug))]);
        }
      } catch (err) {
        // fallback to canonical
      }
    }
    fetchLiveNews();
  }, []);

  const filtered = articles.filter(article => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      article.title.toLowerCase().includes(q) ||
      (article.excerpt && article.excerpt.toLowerCase().includes(q)) ||
      (article.content && article.content.toLowerCase().includes(q))
    );
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

        {/* Clean Search Bar (Without Tags) */}
        <section className="py-6 bg-[#f8f9fa] dark:bg-[#083002]/50 border-b border-[#138601]/20 dark:border-[#138601]/30">
          <div className="site-container flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300">
              Showing <span className="font-bold text-black dark:text-white">{filtered.length}</span> {filtered.length === 1 ? 'article' : 'articles'}
            </p>

            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded bg-white dark:bg-[#083002] text-black dark:text-white border border-[#138601]/25 focus:outline-none focus:ring-1 focus:ring-[#138601]"
              />
              <FaSearch className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>
        </section>

        {/* Articles Grid */}
        <section className="py-16 site-container">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-500 dark:text-gray-400">
              <p className="text-base font-semibold">No news articles found matching your criteria.</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 px-5 py-2 text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] rounded cursor-pointer"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filtered.map((item) => (
                <article
                  key={item.id || item.slug}
                  className="group bg-white dark:bg-[#083002] rounded overflow-hidden border border-[#138601]/20 dark:border-[#138601]/30 hover:border-[#138601] dark:hover:border-[#4bd043] shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full transform hover:-translate-y-1.5"
                >
                  <div className="relative h-52 w-full overflow-hidden bg-gray-900">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                    />
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
                          {item.readTime}
                        </span>
                      </div>

                      <h2 className="text-lg font-bold text-black dark:text-white group-hover:text-[#138601] dark:group-hover:text-[#4bd043] transition-colors line-clamp-2 mb-3 leading-snug">
                        {item.title}
                      </h2>

                      <p className="text-sm text-black/75 dark:text-green-100/75 line-clamp-3 leading-relaxed mb-6">
                        {item.excerpt}
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
            <div className="bg-white dark:bg-[#083002] max-w-2xl w-full rounded-2xl overflow-hidden shadow-2xl border border-[#138601]/30 my-8">
              <div className="relative h-64 w-full bg-gray-950">
                <img
                  src={activeArticleModal.image}
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
              </div>

              <div className="p-6 sm:p-8 space-y-4">
                <div className="flex items-center gap-4 text-xs text-black/60 dark:text-green-200/60">
                  <span>{activeArticleModal.date}</span>
                  <span>&bull;</span>
                  <span>{activeArticleModal.readTime}</span>
                  <span>&bull;</span>
                  <span>By {activeArticleModal.author}</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-black dark:text-white leading-tight">
                  {activeArticleModal.title}
                </h2>

                <div className="text-sm leading-relaxed text-black/85 dark:text-green-100/85 space-y-3 pt-2 border-t border-[#138601]/15 dark:border-white/10">
                  <p>{activeArticleModal.content || activeArticleModal.excerpt}</p>
                  <p>
                    For official press inquiries, contact the Department of Computer Science or the NACOS Public Relations Directorate via <strong>hod.csc@futo.edu.ng</strong>.
                  </p>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveArticleModal(null)}
                    className="px-6 py-2.5 bg-[#138601] hover:bg-[#0f6c01] text-white font-semibold text-xs rounded transition-colors cursor-pointer"
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
