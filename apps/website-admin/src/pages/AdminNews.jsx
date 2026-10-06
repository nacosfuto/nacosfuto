import React, { useState, useEffect } from 'react';
import WebsiteAdminLayout from '../components/WebsiteAdminLayout';
import { 
  Newspaper, 
  Plus, 
  Trash2, 
  Check, 
  Edit, 
  Eye, 
  EyeOff, 
  Search, 
  Clock, 
  Tag, 
  User,
  BookOpen,
  Sparkles
} from 'lucide-react';
import { MediaUpload, CloudinaryImage, CLOUDINARY_FOLDERS, deleteMedia } from '@nacos/media';
import { recordAdminAction } from '@nacos/supabase/adminAuth';
import { 
  getLocalNewsArticles, 
  fetchNewsArticles, 
  saveNewsArticle, 
  deleteNewsArticle, 
  toggleNewsPublish 
} from '@nacos/supabase';

const CATEGORIES = [
  { id: 'all', label: 'All Articles' },
  { id: 'Academics', label: 'Academics' },
  { id: 'Research & Journal', label: 'Research & Journal' },
  { id: 'Innovation', label: 'Innovation' },
  { id: 'Hackathon', label: 'Hackathons' },
  { id: 'Campus Life', label: 'Campus Life' },
  { id: 'Alumni', label: 'Alumni' }
];

const AdminNews = () => {
  const [articles, setArticles] = useState(() => getLocalNewsArticles({ publishedOnly: false }));
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState('add'); // 'add' | 'edit'
  const [selectedArticleId, setSelectedArticleId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('NACOS Press Desk');
  const [category, setCategory] = useState('Tech & Academics');
  const [readTime, setReadTime] = useState(3);
  const [coverUrl, setCoverUrl] = useState('');
  const [coverPublicId, setCoverPublicId] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  // Sync with Supabase on mount and listen for real-time updates
  useEffect(() => {
    fetchNewsArticles({ publishedOnly: false }).then(fetched => {
      if (fetched && fetched.length > 0) {
        setArticles(fetched);
      }
    });

    const handleSync = () => {
      setArticles(getLocalNewsArticles({ publishedOnly: false }));
    };

    window.addEventListener('nacos_website_articles_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('nacos_website_articles_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const showFeedback = (text, type = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleOpenAdd = () => {
    setEditorMode('add');
    setSelectedArticleId(null);
    setTitle('');
    setSlug('');
    setSummary('');
    setContent('');
    setAuthor('NACOS Press Desk');
    setCategory('Research & Journal');
    setReadTime(3);
    setCoverUrl('');
    setCoverPublicId('');
    setIsPublished(true);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (art) => {
    setEditorMode('edit');
    setSelectedArticleId(art.id);
    setTitle(art.title || '');
    setSlug(art.slug || '');
    setSummary(art.summary || art.excerpt || '');
    setContent(art.content || art.summary || art.excerpt || '');
    setAuthor(art.author || 'NACOS Press Desk');
    setCategory(art.category || 'Research & Journal');
    setReadTime(art.read_time_minutes || 3);
    setCoverUrl(art.cover_image_url || art.image || '');
    setCoverPublicId(art.cloudinary_public_id || '');
    setIsPublished(art.is_published !== false);
    setIsEditorOpen(true);
  };

  const handleTitleChange = (val) => {
    setTitle(val);
    if (editorMode === 'add') {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  };

  const handleTogglePublish = async (id) => {
    const updated = await toggleNewsPublish(id);
    setArticles(updated);
    const target = updated.find(a => a.id === id);
    if (target) {
      await recordAdminAction(target.is_published ? 'news_publish' : 'news_unpublish', 'news', target.slug, {
        title: target.title
      });
    }
    showFeedback(`Article publication status updated: ${target?.is_published ? 'Published' : 'Draft'}`);
  };

  const handleDelete = async (article) => {
    if (!window.confirm(`Delete article "${article.title}"? This will remove it from the website, database, and media storage.`)) return;

    await deleteNewsArticle(article.id, article.slug, article.cloudinary_public_id);
    setArticles(getLocalNewsArticles({ publishedOnly: false }));

    await recordAdminAction('news_delete', 'news', article.slug, {
      title: article.title
    });

    showFeedback('Article deleted successfully from database.');
  };

  const handleSaveArticle = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    try {
      const existing = editorMode === 'edit' ? articles.find(a => a.id === selectedArticleId) : null;
      const articleSlug = slug.trim() 
        ? slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        : title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const payload = {
        id: editorMode === 'edit' ? selectedArticleId : `art-${Date.now()}`,
        title: title.trim(),
        slug: articleSlug,
        summary: summary.trim(),
        excerpt: summary.trim(),
        content: content.trim(),
        cover_image_url: coverUrl || existing?.cover_image_url || 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569301/nacos/news/research.jpg',
        image: coverUrl || existing?.cover_image_url || 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569301/nacos/news/research.jpg',
        cloudinary_public_id: coverPublicId || existing?.cloudinary_public_id || null,
        author: author.trim() || 'NACOS Press Desk',
        category,
        read_time_minutes: parseInt(readTime, 10) || 3,
        is_published: isPublished,
        created_at: existing?.created_at || new Date().toISOString()
      };

      await saveNewsArticle(payload);

      await recordAdminAction(editorMode === 'edit' ? 'news_update' : 'news_create', 'news', payload.slug, {
        title: payload.title,
        category: payload.category
      });

      setArticles(getLocalNewsArticles({ publishedOnly: false }));
      setIsEditorOpen(false);
      showFeedback(editorMode === 'edit' ? 'News & Journal article updated!' : 'News & Journal article published to website!');
    } catch (err) {
      console.error('Error saving article:', err);
      showFeedback('Failed to save article. Check console for details.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredArticles = articles.filter(art => {
    const matchesCategory = activeCategory === 'all' || art.category === activeCategory;
    const matchesSearch = !searchQuery.trim() ||
      art.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.author?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <WebsiteAdminLayout
      title="News & Journal Manager"
      subtitle="Publish and sync departmental announcements, academic publications, hackathon updates, and journal articles across website, database, and Cloudinary CDN."
    >
      <div className="space-y-6">
        
        {/* Statistics & Actions Bar */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="flex items-center gap-4 text-xs">
            <span className="text-gray-500 dark:text-green-200/70">
              Total Articles: <strong className="text-gray-900 dark:text-white font-bold">{articles.length}</strong>
            </span>
            <span className="text-green-600 dark:text-[#4bd043]">
              Published: <strong className="font-bold">{articles.filter(a => a.is_published).length}</strong>
            </span>
            <span className="text-amber-600 dark:text-amber-400">
              Drafts: <strong className="font-bold">{articles.filter(a => !a.is_published).length}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" /> Create New Article
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-gray-100 dark:bg-[#041801] rounded-xl border border-gray-200 dark:border-[#138601]/20">
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

          {/* Search Box */}
          <div className="relative md:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search news & journals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 text-gray-900 dark:text-white focus:outline-none focus:border-[#138601]"
            />
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            feedback.type === 'error'
              ? 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800/40'
              : 'bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800/40'
          }`}>
            <Check className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Article Cards Grid / List */}
        <div className="space-y-4">
          {filteredArticles.map((art) => (
            <div
              key={art.id || art.slug}
              className="p-5 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 flex flex-col md:flex-row items-start gap-5 shadow-sm hover:border-[#138601] transition-all group"
            >
              <div className="w-full md:w-52 h-36 rounded-xl overflow-hidden bg-gray-100 dark:bg-[#041801] shrink-0 relative">
                <CloudinaryImage
                  src={art.cover_image_url || art.image}
                  alt={art.title}
                  preset="card"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-2 left-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    art.is_published 
                      ? 'bg-green-600 text-white' 
                      : 'bg-black/80 text-amber-300'
                  }`}>
                    {art.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-2 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-green-50 dark:bg-[#041801] text-[#138601] dark:text-[#4bd043] border border-green-200 dark:border-[#138601]/30">
                    {art.category}
                  </span>
                  <span className="text-[11px] text-gray-400 dark:text-green-200/50 font-mono">
                    /{art.slug}
                  </span>
                  <span className="text-[11px] text-gray-400 dark:text-green-200/50 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {art.read_time_minutes || 3} min read
                  </span>
                </div>

                <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug">
                  {art.title}
                </h3>

                <p className="text-xs text-gray-600 dark:text-green-100/70 line-clamp-2">
                  {art.summary || art.excerpt}
                </p>

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-gray-400 dark:text-green-200/50 border-t border-gray-100 dark:border-[#138601]/20">
                  <span>By {art.author} • {art.date || new Date(art.published_at || art.created_at).toLocaleDateString()}</span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(art)}
                      className="px-3 py-1 rounded-lg border border-gray-300 dark:border-[#138601]/40 hover:bg-[#138601] hover:text-white dark:hover:bg-[#138601] text-gray-700 dark:text-green-200 cursor-pointer flex items-center gap-1 transition-colors"
                      title="Edit Article"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTogglePublish(art.id)}
                      className="px-3 py-1 rounded-lg border border-gray-300 dark:border-[#138601]/40 hover:bg-gray-100 dark:hover:bg-black text-gray-700 dark:text-green-200 cursor-pointer flex items-center gap-1"
                    >
                      {art.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{art.is_published ? 'Unpublish' : 'Publish'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(art)}
                      className="px-3 py-1 rounded-lg border border-red-200 dark:border-red-900/40 hover:bg-red-600 hover:text-white text-red-600 dark:text-red-400 cursor-pointer flex items-center gap-1 transition-colors"
                      title="Delete Article"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredArticles.length === 0 && (
            <div className="p-12 text-center text-gray-400 dark:text-green-200/50 bg-white dark:bg-[#083002] rounded-2xl border border-gray-200 dark:border-[#138601]/30">
              <Newspaper className="w-10 h-10 mx-auto mb-2 opacity-40 text-[#138601]" />
              <p className="text-sm font-semibold">No news or journal articles found.</p>
              <p className="text-xs mt-1">Try switching category tabs or clearing your search term.</p>
            </div>
          )}
        </div>

        {/* Editor Modal */}
        {isEditorOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#138601]/20 pb-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
                  {editorMode === 'edit' ? 'Edit News & Journal Article' : 'Compose News & Journal Article'}
                </h3>
                <button onClick={() => setIsEditorOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
              </div>

              <form onSubmit={handleSaveArticle} className="space-y-3.5 text-xs">
                {coverUrl && (
                  <div className="relative aspect-[16/9] max-h-48 rounded-xl overflow-hidden bg-gray-100 dark:bg-[#041801]">
                    <img
                      src={coverUrl}
                      alt={title || 'Cover preview'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-green-200">Article Headline / Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Department Researchers Secure Multi-Million AI Compute Grant"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40 text-gray-900 dark:text-white focus:outline-none focus:border-[#138601]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-green-200">Category *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40 text-gray-900 dark:text-white focus:outline-none focus:border-[#138601]"
                    >
                      <option value="Research & Journal">Research & Journal</option>
                      <option value="Academics">Academics</option>
                      <option value="Innovation">Innovation</option>
                      <option value="Hackathon">Hackathon</option>
                      <option value="Campus Life">Campus Life</option>
                      <option value="Alumni">Alumni</option>
                      <option value="Career & Opportunities">Career & Opportunities</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-green-200">Author / Desk</label>
                    <input
                      type="text"
                      placeholder="e.g. Directorate of Research"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40 text-gray-900 dark:text-white focus:outline-none focus:border-[#138601]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-green-200">Read Time (minutes)</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={readTime}
                      onChange={(e) => setReadTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40 text-gray-900 dark:text-white focus:outline-none focus:border-[#138601]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-green-200">URL Slug (Auto-generated)</label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40 font-mono text-gray-900 dark:text-white focus:outline-none focus:border-[#138601]"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-green-200">Short Summary / Excerpt *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Brief 1-2 sentence overview for cards and meta previews..."
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40 text-gray-900 dark:text-white focus:outline-none focus:border-[#138601]"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-green-200">Full Article Content *</label>
                  <textarea
                    rows={7}
                    required
                    placeholder="Write the complete article body, citations, quotes, and research findings..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40 text-gray-900 dark:text-white focus:outline-none focus:border-[#138601]"
                  />
                </div>

                <div className="pt-1">
                  <MediaUpload
                    folder={CLOUDINARY_FOLDERS.NEWS}
                    label={editorMode === 'edit' ? 'Replace Cover Image (Cloudinary CDN)' : 'Official Cover Image (Cloudinary CDN)'}
                    aspectRatio="landscape"
                    onUploadSuccess={({ url, publicId }) => {
                      setCoverUrl(url);
                      setCoverPublicId(publicId);
                    }}
                  />
                </div>

                <div className="pt-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPublished}
                      onChange={(e) => setIsPublished(e.target.checked)}
                      className="rounded border-gray-300 text-[#138601] focus:ring-[#138601]"
                    />
                    <span className="font-semibold text-gray-700 dark:text-green-200">Publish immediately to website</span>
                  </label>
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-gray-100 dark:border-[#138601]/20">
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(false)}
                    className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-[#041801] text-gray-700 dark:text-gray-300 hover:bg-gray-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 rounded-xl bg-[#138601] hover:bg-[#0f6c01] text-white font-semibold cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : editorMode === 'edit' ? 'Save Changes' : 'Publish Article'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </WebsiteAdminLayout>
  );
};

export default AdminNews;
