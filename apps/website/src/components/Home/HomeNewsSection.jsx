import React, { useState, useEffect } from 'react';
import { FaArrowRight, FaCalendarAlt, FaClock, FaNewspaper } from 'react-icons/fa';
import ScrollToTopLink from '../ScrollToTopLink';
import { supabase } from '@nacos/supabase';
import { getCloudinaryAssetUrl } from '@nacos/media';
import newsImg1 from '../../assets/research.jpg';
import newsImg2 from '../../assets/academics.jpg';
import newsImg3 from '../../assets/gallery_dept_front.jpg';

export const CANONICAL_NEWS = [
  {
    id: 1,
    slug: 'futo-csc-nuc-accreditation-2026',
    title: 'Department of Computer Science Achieves Full 5-Year NUC Accreditation Status',
    category: 'Academics',
    date: 'Aug 28, 2026',
    readTime: '3 min read',
    image: getCloudinaryAssetUrl('academics') || newsImg2,
    excerpt: 'Following comprehensive infrastructure audits and academic curriculum assessments, the National Universities Commission (NUC) has certified FUTO Computer Science with highest tier accreditation.'
  },
  {
    id: 2,
    slug: 'ai-research-cluster-grant-expansion',
    title: 'SICT Research Cluster Secures Multi-Million Compute Grant for Applied AI',
    category: 'Research',
    date: 'Aug 14, 2026',
    readTime: '4 min read',
    image: getCloudinaryAssetUrl('research') || newsImg1,
    excerpt: 'Department faculty and student researchers expand high-performance compute clusters focused on African healthcare and natural language processing solutions.'
  },
  {
    id: 3,
    slug: 'nacos-tech-summit-hackathon-champions',
    title: 'FUTO Computing Students Clinch Top Honours at National Hackathon Challenge',
    category: 'Innovation',
    date: 'July 29, 2026',
    readTime: '3 min read',
    image: getCloudinaryAssetUrl('gallery_dept_front') || newsImg3,
    excerpt: 'Undergraduate student innovators develop distributed fintech and agricultural supply chain models, winning accolades across regional and national computing leagues.'
  }
];

const HomeNewsSection = () => {
  const [articles, setArticles] = useState(CANONICAL_NEWS);

  useEffect(() => {
    async function loadLiveNews() {
      try {
        if (!supabase) return;
        const { data, error } = await supabase
          .from('website_news')
          .select('*')
          .eq('is_published', true)
          .order('published_at', { ascending: false })
          .limit(3);

        if (!error && data && data.length > 0) {
          const live = data.map(d => ({
            id: d.id,
            slug: d.slug,
            title: d.title,
            category: d.category || 'Department News',
            date: d.published_at ? new Date(d.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent',
            readTime: `${d.read_time_minutes || 3} min read`,
            image: d.cover_image_url || getCloudinaryAssetUrl('research') || newsImg1,
            excerpt: d.excerpt || d.summary || ''
          }));
          setArticles(live);
        }
      } catch (err) {
        // use canonical fallback
      }
    }
    loadLiveNews();
  }, []);

  return (
    <section className="py-20 bg-[#f8f9fa] dark:bg-[#061e02] text-black dark:text-white transition-colors duration-300 border-b border-gray-200/80 dark:border-[#138601]/25">
      <div className="site-container">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#138601]/10 dark:bg-[#138601]/20 text-[#138601] dark:text-[#4bd043] font-bold text-xs uppercase tracking-wider mb-3">
              <FaNewspaper className="text-xs" />
              <span>Latest Updates & Press</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-black dark:text-white">
              Department <span className="text-[#138601] dark:text-[#4bd043]">News & Journal</span>
            </h2>
            <p className="mt-2 text-base text-gray-700 dark:text-gray-300 max-w-xl">
              Stay informed with recent achievements, research milestones, academic press releases, and computing innovations.
            </p>
          </div>

          <ScrollToTopLink
            to="/news"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#138601] hover:bg-[#0f6c01] text-white font-semibold text-sm rounded shadow-sm transition-colors w-fit min-h-[42px]"
          >
            <span>View All News</span>
            <FaArrowRight className="text-xs" />
          </ScrollToTopLink>
        </div>

        {/* News Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {articles.map((item) => (
            <article
              key={item.id || item.slug}
              className="group bg-white dark:bg-[#083002] rounded overflow-hidden border border-gray-200 dark:border-[#138601]/30 hover:border-[#138601] dark:hover:border-[#4bd043] shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full transform hover:-translate-y-1.5"
            >
              {/* Image Banner */}
              <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-gray-900">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                />
                <span className="absolute top-3 left-3 px-3 py-1 rounded bg-[#083002]/90 text-white text-[11px] font-bold tracking-wider uppercase border border-green-500/30">
                  {item.category}
                </span>
              </div>

              {/* Body */}
              <div className="p-6 flex flex-col flex-grow justify-between">
                <div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
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

                  <h3 className="text-lg font-bold text-black dark:text-white group-hover:text-[#138601] dark:group-hover:text-[#4bd043] transition-colors line-clamp-2 mb-3 leading-snug">
                    {item.title}
                  </h3>

                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 leading-relaxed mb-6">
                    {item.excerpt}
                  </p>
                </div>

                <ScrollToTopLink
                  to="/news"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#138601] dark:text-[#4bd043] group-hover:underline"
                >
                  <span>Read Full Story</span>
                  <FaArrowRight className="text-[10px] group-hover:translate-x-1 transition-transform" />
                </ScrollToTopLink>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeNewsSection;
