import React, { useState, useEffect } from 'react';
import { FaArrowRight, FaCalendarAlt, FaClock } from 'react-icons/fa';
import ScrollToTopLink from '../ScrollToTopLink';
import { getLocalNewsArticles, fetchNewsArticles } from '@nacos/supabase';

const HomeNewsSection = () => {
  const [articles, setArticles] = useState(() => {
    return getLocalNewsArticles({ publishedOnly: true }).slice(0, 3);
  });

  useEffect(() => {
    const syncArticles = () => {
      const all = getLocalNewsArticles({ publishedOnly: true });
      setArticles(all.slice(0, 3));
    };

    fetchNewsArticles({ publishedOnly: true })
      .then((items) => {
        if (Array.isArray(items) && items.length > 0) {
          setArticles(items.slice(0, 3));
        } else {
          syncArticles();
        }
      })
      .catch(() => syncArticles());

    window.addEventListener('nacos_website_articles_updated', syncArticles);
    window.addEventListener('storage', syncArticles);

    return () => {
      window.removeEventListener('nacos_website_articles_updated', syncArticles);
      window.removeEventListener('storage', syncArticles);
    };
  }, []);

  return (
    <section className="py-20 bg-[#f8f9fa] dark:bg-[#061e02] text-black dark:text-white transition-colors duration-300 border-b border-gray-200/80 dark:border-[#138601]/25">
      <div className="site-container">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
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
              className="group bg-white dark:bg-[#083002] rounded-2xl overflow-hidden border border-gray-200 dark:border-[#138601]/30 hover:border-[#138601] dark:hover:border-[#4bd043] shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full transform hover:-translate-y-1.5"
            >
              {/* Image Banner */}
              <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-gray-900">
                <img
                  src={item.cover_image_url || item.image}
                  alt={item.title}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute top-3 left-3 bg-[#138601] text-white px-2.5 py-0.5 rounded-lg font-bold text-[10px] uppercase tracking-wider shadow">
                  {item.category}
                </div>
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
                      {item.readTime || `${item.read_time_minutes || 3} min read`}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-black dark:text-white group-hover:text-[#138601] dark:group-hover:text-[#4bd043] transition-colors line-clamp-2 mb-3 leading-snug">
                    {item.title}
                  </h3>

                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 leading-relaxed mb-6">
                    {item.summary || item.excerpt}
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
