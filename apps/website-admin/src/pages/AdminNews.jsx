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
  Upload, 
  Clock, 
  Tag, 
  User 
} from 'lucide-react';
import { MediaUpload, CloudinaryImage, CLOUDINARY_FOLDERS, deleteMedia } from '@nacos/media';
import { recordAdminAction } from '@nacos/supabase/adminAuth';
import { saveNewsArticle, deleteNewsArticle } from '@nacos/supabase';

const INITIAL_ARTICLES = [
  {
    id: 'art-1',
    title: 'NACOS FUTO Announces BuildX 2026 National Computing Hackathon',
    slug: 'buildx-2026-hackathon-announcement',
    summary: 'Registration opens for undergraduate developers across Nigerian tertiary institutions with over ₦5M in startup grants.',
    content: 'The Nigerian Association of Computer Science Students (NACOS), FUTO Chapter, is proud to announce the official launch of BuildX NACOS 2026...',
    cover_image_url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=1200',
    cloudinary_public_id: 'nacos/news/buildx_cover',
    author: 'NACOS Press Bureau',
    category: 'Hackathon',
    is_published: true,
    created_at: '2026-09-01T10:00:00Z'
  },
  {
    id: 'art-2',
    title: 'Department Welcomes 2026/2027 Freshmen at Orientation Week',
    slug: 'freshmen-orientation-2026',
    summary: 'Staff advisers and departmental executive leaders address incoming 100 level students on curriculum excellence.',
    content: 'Over 400 new students were formally inducted into the Department of Computer Science at the SOPS Theatre...',
    cover_image_url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=1200',
    cloudinary_public_id: 'nacos/news/orientation_cover',
    author: 'PRO Desk',
    category: 'Campus Life',
    is_published: true,
    created_at: '2026-08-28T09:30:00Z'
  }
];

const AdminNews = () => {
  const [articles, setArticles] = useState(INITIAL_ARTICLES);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState('add'); // 'add' | 'edit'
  const [selectedArticleId, setSelectedArticleId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Form State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('NACOS Press Desk');
  const [category, setCategory] = useState('Tech & Academics');
  const [coverUrl, setCoverUrl] = useState('');
  const [coverPublicId, setCoverPublicId] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('nacos_website_articles_store');
    if (stored) {
      try {
        setArticles(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }
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
    setCategory('Tech & Academics');
    setCoverUrl('');
    setCoverPublicId('');
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (art) => {
    setEditorMode('edit');
    setSelectedArticleId(art.id);
    setTitle(art.title || '');
    setSlug(art.slug || '');
    setSummary(art.summary || '');
    setContent(art.content || '');
    setAuthor(art.author || 'NACOS Press Desk');
    setCategory(art.category || 'Tech & Academics');
    setCoverUrl(art.cover_image_url || '');
    setCoverPublicId(art.cloudinary_public_id || '');
    setIsEditorOpen(true);
  };

  const handleTitleChange = (val) => {
    setTitle(val);
    if (editorMode === 'add') {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  };

  const handleTogglePublish = async (id) => {
    const updated = articles.map(art => {
      if (art.id === id) {
        const next = !art.is_published;
        recordAdminAction(next ? 'news_publish' : 'news_unpublish', 'news', art.slug, {
          title: art.title
        });
        const updatedArt = { ...art, is_published: next };
        saveNewsArticle(updatedArt);
        return updatedArt;
      }
      return art;
    });

    setArticles(updated);
    localStorage.setItem('nacos_website_articles_store', JSON.stringify(updated));
    showFeedback('Article publication status updated.');
  };

  const handleDelete = async (article) => {
    if (!window.confirm(`Delete article "${article.title}"?`)) return;

    if (article.cloudinary_public_id) {
      await deleteMedia(article.cloudinary_public_id);
    }

    const updated = articles.filter(a => a.id !== article.id);
    setArticles(updated);
    localStorage.setItem('nacos_website_articles_store', JSON.stringify(updated));

    await deleteNewsArticle(article.id, article.slug);

    await recordAdminAction('news_delete', 'news', article.slug, {
      title: article.title
    });

    showFeedback('Article deleted.');
  };

  const handleSaveArticle = async (e) => {
    e.preventDefault();
    if (!title || !content) return;

    if (editorMode === 'edit') {
      const existing = articles.find(a => a.id === selectedArticleId);
      const updatedArticle = {
        ...existing,
        id: selectedArticleId,
        title,
        slug: slug || existing?.slug || `article-${Date.now()}`,
        summary,
        content,
        cover_image_url: coverUrl || existing?.cover_image_url || 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=1200',
        cloudinary_public_id: coverPublicId || existing?.cloudinary_public_id,
        author,
        category,
        updated_at: new Date().toISOString()
      };

      const updated = articles.map(a => a.id === selectedArticleId ? updatedArticle : a);
      setArticles(updated);
      localStorage.setItem('nacos_website_articles_store', JSON.stringify(updated));

      await saveNewsArticle(updatedArticle);

      await recordAdminAction('news_update', 'news', updatedArticle.slug, {
        title: updatedArticle.title
      });

      setIsEditorOpen(false);
      showFeedback('News article updated successfully!');
    } else {
      const newArticle = {
        id: `art-${Date.now()}`,
        title,
        slug: slug || `article-${Date.now()}`,
        summary,
        content,
        cover_image_url: coverUrl || 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=1200',
        cloudinary_public_id: coverPublicId,
        author,
        category,
        is_published: true,
        created_at: new Date().toISOString()
      };

      const updated = [newArticle, ...articles];
      setArticles(updated);
      localStorage.setItem('nacos_website_articles_store', JSON.stringify(updated));

      await saveNewsArticle(newArticle);

      await recordAdminAction('news_create', 'news', newArticle.slug, {
        title: newArticle.title
      });

      setIsEditorOpen(false);
      setTitle('');
      setSlug('');
      setSummary('');
      setContent('');
      setCoverUrl('');
      setCoverPublicId('');
      showFeedback('News article published successfully to the website!');
    }
  };

  return (
    <WebsiteAdminLayout
      title="News & Articles Manager"
      subtitle="Publish departmental announcements, hackathon updates, and technology insights to the public portal."
    >
      <div className="space-y-6">
        
        {/* Top Actions */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 flex items-center justify-between">
          <div className="text-xs text-gray-500 dark:text-green-200/70">
            Total Articles: <strong className="text-gray-900 dark:text-white">{articles.length}</strong>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create New Article
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800/40">
            <Check className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Article Cards */}
        <div className="space-y-4">
          {articles.map((art) => (
            <div
              key={art.id}
              className="p-5 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 flex flex-col md:flex-row items-start gap-5 shadow-sm hover:border-[#138601] transition-all"
            >
              <div className="w-full md:w-48 h-32 rounded-xl overflow-hidden bg-gray-100 dark:bg-[#041801] shrink-0">
                <CloudinaryImage
                  src={art.cover_image_url}
                  alt={art.title}
                  preset="card"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 space-y-2 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    art.is_published 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' 
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                  }`}>
                    {art.is_published ? 'Published' : 'Draft'}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-[#041801] text-gray-600 dark:text-green-200">
                    {art.category}
                  </span>
                  <span className="text-[11px] text-gray-400 dark:text-green-200/50 font-mono">
                    /{art.slug}
                  </span>
                </div>

                <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug">
                  {art.title}
                </h3>

                <p className="text-xs text-gray-600 dark:text-green-100/70 line-clamp-2">
                  {art.summary}
                </p>

                <div className="pt-2 flex items-center justify-between text-[11px] text-gray-400 dark:text-green-200/50">
                  <span>By {art.author} • {new Date(art.created_at).toLocaleDateString()}</span>

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
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                      title="Delete Article"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal */}
        {isEditorOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#138601]/20 pb-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {editorMode === 'edit' ? 'Edit News Article' : 'Create News Article'}
                </h3>
                <button onClick={() => setIsEditorOpen(false)} className="text-gray-400">✕</button>
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
                  <label className="block font-semibold mb-1">Article Headline / Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NACOS Hackathon 2026 Launches"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">URL Slug</label>
                    <input
                      type="text"
                      required
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40"
                    >
                      <option value="Tech & Academics">Tech & Academics</option>
                      <option value="Hackathon">Hackathon</option>
                      <option value="Campus Life">Campus Life</option>
                      <option value="Executive Update">Executive Update</option>
                      <option value="Career & Opportunities">Career & Opportunities</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Author</label>
                  <input
                    type="text"
                    placeholder="e.g. NACOS Press Desk"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Short Summary / Excerpt</label>
                  <input
                    type="text"
                    required
                    placeholder="Brief 1-2 sentence lead for cards and social previews"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Full Article Body</label>
                  <textarea
                    rows={6}
                    required
                    placeholder="Full article content in markdown or text..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40"
                  />
                </div>

                <div className="pt-2">
                  <MediaUpload
                    folder={CLOUDINARY_FOLDERS.NEWS}
                    label="Article Featured Cover Image"
                    aspectRatio="landscape"
                    onUploadSuccess={({ url, publicId }) => {
                      setCoverUrl(url);
                      setCoverPublicId(publicId);
                    }}
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-gray-100 dark:border-[#138601]/20">
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(false)}
                    className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-[#041801] text-gray-700 dark:text-gray-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl bg-[#138601] hover:bg-[#0f6c01] text-white font-semibold cursor-pointer"
                  >
                    {editorMode === 'edit' ? 'Save Changes' : 'Publish to Website'}
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
