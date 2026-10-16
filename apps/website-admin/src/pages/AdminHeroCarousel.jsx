import React, { useState, useEffect } from 'react';
import WebsiteAdminLayout from '../components/WebsiteAdminLayout';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  EyeOff, 
  Edit3, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink,
  Image as ImageIcon,
  Check,
  X,
  Layers,
  Sliders,
  MoveVertical
} from 'lucide-react';
import { MediaUpload, CLOUDINARY_FOLDERS } from '@nacos/media';
import { 
  fetchHeroSlides, 
  saveHeroSlide, 
  deleteHeroSlide, 
  reorderHeroSlides, 
  toggleHeroSlidePublish,
  HERO_SLIDES_EVENT
} from '@nacos/supabase';
import AdminSaveButton from '../components/AdminSaveButton';
import { adminToast, getSafeErrorMessage } from '../utils/adminToast';
import { getAppUrls } from '@nacos/config/urls';

const FOCAL_POSITIONS = [
  { label: 'Center 35% (Default Recommended)', value: 'center 35%' },
  { label: 'Center Center (Balanced)', value: 'center center' },
  { label: 'Top Center (Header / People Focus)', value: 'top center' },
  { label: 'Top Left (Branded Logo Top-Left)', value: 'top left' },
  { label: 'Top Right (Branded Logo Top-Right)', value: 'top right' },
  { label: 'Bottom Center (Ground / Stage Focus)', value: 'bottom center' }
];

export const AdminHeroCarousel = () => {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState(null);
  const [slideToDelete, setSlideToDelete] = useState(null);

  // Form States
  const [formData, setFormData] = useState({
    title: '',
    heading: '',
    subtext: '',
    cta_text: '',
    cta_link: '',
    image_url: '',
    cloudinary_public_id: '',
    image_position: 'center 35%',
    is_published: true
  });

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
    if (type === 'error') {
      adminToast.error(message);
    } else if (type === 'success') {
      adminToast.success(message);
    } else {
      adminToast.info(message);
    }
  };

  const loadSlides = async () => {
    setLoading(true);
    try {
      const data = await fetchHeroSlides();
      setSlides(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Failed to load hero slides:', err);
      showNotification('Failed to load hero slides from database.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlides();

    const handleSync = () => {
      fetchHeroSlides().then((data) => {
        if (Array.isArray(data)) setSlides(data);
      });
    };

    window.addEventListener(HERO_SLIDES_EVENT, handleSync);
    return () => window.removeEventListener(HERO_SLIDES_EVENT, handleSync);
  }, []);

  const openAddModal = () => {
    setEditingSlide(null);
    setFormData({
      title: '',
      heading: '',
      subtext: '',
      cta_text: '',
      cta_link: '',
      image_url: '',
      cloudinary_public_id: '',
      image_position: 'center 35%',
      is_published: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (slide) => {
    setEditingSlide(slide);
    setFormData({
      title: slide.title || '',
      heading: slide.heading || '',
      subtext: slide.subtext || '',
      cta_text: slide.cta_text || '',
      cta_link: slide.cta_link || '',
      image_url: slide.image_url || '',
      cloudinary_public_id: slide.cloudinary_public_id || '',
      image_position: slide.image_position || 'center 35%',
      is_published: slide.is_published !== undefined ? slide.is_published : true
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!formData.image_url) {
      showNotification('Please upload an image or provide a valid Image URL.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        id: editingSlide ? editingSlide.id : undefined,
        display_order: editingSlide ? editingSlide.display_order : undefined
      };

      await saveHeroSlide(payload);
      showNotification(
        editingSlide ? 'Hero slide updated successfully!' : 'New hero slide published to carousel!',
        'success'
      );
      setIsModalOpen(false);
      await loadSlides();
    } catch (err) {
      console.error('Error saving slide:', err);
      showNotification(err.message || 'Failed to persist slide to database.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (slide) => {
    try {
      const nextStatus = !slide.is_published;
      await toggleHeroSlidePublish(slide.id, nextStatus);
      showNotification(
        nextStatus ? `Slide "${slide.title || 'Untitled'}" published.` : `Slide "${slide.title || 'Untitled'}" unpublished.`,
        'success'
      );
      await loadSlides();
    } catch (err) {
      showNotification('Could not update publication status.', 'error');
    }
  };

  const handleMove = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= slides.length) return;

    const newSlides = [...slides];
    const [movedItem] = newSlides.splice(index, 1);
    newSlides.splice(targetIndex, 0, movedItem);

    setSlides(newSlides); // optimistic update

    try {
      const orderedIds = newSlides.map(s => s.id);
      await reorderHeroSlides(orderedIds);
      showNotification('Slide sequence updated and saved to database.', 'success');
    } catch (err) {
      showNotification('Failed to save reordered sequence.', 'error');
      await loadSlides();
    }
  };

  const confirmDelete = async () => {
    if (!slideToDelete) return;
    setSaving(true);
    try {
      await deleteHeroSlide(slideToDelete.id);
      showNotification('Hero slide deleted from carousel.', 'success');
      setIsDeleteModalOpen(false);
      setSlideToDelete(null);
      await loadSlides();
    } catch (err) {
      showNotification('Failed to delete slide from database.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const publishedCount = slides.filter(s => s.is_published).length;
  const draftCount = slides.length - publishedCount;

  return (
    <WebsiteAdminLayout
      title="Homepage Hero Carousel"
      subtitle="Manage background imagery, sequence order, focal positioning, and content overrides for the main website homepage."
    >
      <div className="space-y-6">

        {/* ─── Feedback Alert Banner ─── */}
        {notification && (
          <div
            className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs transition-all ${
              notification.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800/40'
                : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800/40'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="opacity-70 hover:opacity-100 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ─── Metric & Stats Strip ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-green-200/70 block uppercase tracking-wider">
              Total Slides
            </span>
            <span className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1 block">
              {slides.length}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30">
            <span className="text-[11px] font-semibold text-green-600 dark:text-[#4bd043] block uppercase tracking-wider">
              Live on Homepage
            </span>
            <span className="text-2xl font-extrabold text-green-700 dark:text-[#4bd043] mt-1 block">
              {publishedCount}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30">
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 block uppercase tracking-wider">
              Drafts / Offline
            </span>
            <span className="text-2xl font-extrabold text-gray-700 dark:text-gray-300 mt-1 block">
              {draftCount}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-green-200/70 block uppercase tracking-wider">
              Carousel Interval
            </span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                5.5s Cycle
              </span>
              <a
                href={getAppUrls().website}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#138601] dark:text-[#4bd043] hover:underline flex items-center gap-1 font-semibold"
              >
                <span>View Live</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* ─── Top Control Toolbar ─── */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
              Configured Hero Slides ({slides.length})
            </h2>
            <p className="text-xs text-gray-500 dark:text-green-200/70 mt-0.5">
              Drag or use Move Up/Down controls to sequence the carousel order. Slides rotate automatically on the homepage.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={loadSlides}
              disabled={loading}
              className="p-2.5 rounded-xl border border-gray-200 dark:border-[#138601]/30 text-gray-600 dark:text-green-200 hover:bg-gray-50 dark:hover:bg-[#041801] transition-colors cursor-pointer"
              title="Refresh from Database"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#138601]' : ''}`} />
            </button>

            <button
              type="button"
              onClick={openAddModal}
              className="px-4 py-2.5 rounded-xl bg-[#138601] hover:bg-[#0f6c01] text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Slide</span>
            </button>
          </div>
        </div>

        {/* ─── Slide Collection Grid / List ─── */}
        {loading ? (
          <div className="p-16 text-center text-xs text-gray-500 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30">
            <RefreshCw className="w-7 h-7 animate-spin text-[#138601] mx-auto mb-3" />
            <p className="font-semibold text-gray-800 dark:text-white">Connecting to Supabase...</p>
            <p className="text-[11px] text-gray-400 mt-1">Retrieving homepage hero slides and display ordering.</p>
          </div>
        ) : slides.length === 0 ? (
          // Graceful Empty State
          <div className="p-12 sm:p-16 text-center rounded-2xl bg-white dark:bg-[#083002] border border-dashed border-gray-300 dark:border-[#138601]/40 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#138601]/10 dark:bg-[#138601]/25 text-[#138601] dark:text-[#4bd043] flex items-center justify-center mx-auto">
              <ImageIcon className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                No Custom Hero Slides Yet
              </h3>
              <p className="text-xs text-gray-500 dark:text-green-200/70 leading-relaxed">
                The public homepage is currently displaying the default department hero imagery. Add your first rotating slide to showcase campus events, lab complexes, or student milestones.
              </p>
            </div>
            <button
              type="button"
              onClick={openAddModal}
              className="px-5 py-2.5 rounded-xl bg-[#138601] hover:bg-[#0f6c01] text-white text-xs font-semibold inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Your First Slide</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {slides.map((slide, index) => {
              const isFirst = index === 0;
              const isLast = index === slides.length - 1;

              return (
                <div
                  key={slide.id}
                  className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#083002] border transition-all ${
                    slide.is_published
                      ? 'border-gray-200 dark:border-[#138601]/30 hover:border-[#138601]'
                      : 'border-dashed border-gray-300 dark:border-gray-700 opacity-75'
                  } shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}
                >
                  {/* Left: Thumbnail & Content Info */}
                  <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                    {/* Ordering Badge & Arrows */}
                    <div className="flex flex-col items-center justify-center gap-1 shrink-0">
                      <span className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-[#041801] text-gray-700 dark:text-green-200 text-xs font-extrabold flex items-center justify-center border border-gray-200 dark:border-[#138601]/25">
                        #{index + 1}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleMove(index, -1)}
                          disabled={isFirst}
                          className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-[#041801] transition-colors ${
                            isFirst ? 'opacity-30 cursor-not-allowed text-gray-400' : 'text-gray-600 dark:text-green-200 cursor-pointer'
                          }`}
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(index, 1)}
                          disabled={isLast}
                          className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-[#041801] transition-colors ${
                            isLast ? 'opacity-30 cursor-not-allowed text-gray-400' : 'text-gray-600 dark:text-green-200 cursor-pointer'
                          }`}
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Image Preview with focal positioning */}
                    <div className="relative w-28 sm:w-36 h-20 rounded-xl overflow-hidden bg-gray-900 border border-gray-200 dark:border-[#138601]/30 shrink-0">
                      <img
                        src={slide.image_url}
                        alt={slide.title || 'Slide thumbnail'}
                        style={{ objectPosition: slide.image_position || 'center 35%' }}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-black/60 text-white backdrop-blur-xs">
                        {slide.image_position?.replace(' ', ' • ') || 'center'}
                      </span>
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                          {slide.title || 'Untitled Slide'}
                        </h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            slide.is_published
                              ? 'bg-green-100 text-green-800 dark:bg-green-950/80 dark:text-green-300 border border-green-300 dark:border-green-800'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-300 dark:border-gray-700'
                          }`}
                        >
                          {slide.is_published ? 'Published' : 'Draft / Offline'}
                        </span>
                      </div>

                      <p className="text-xs text-gray-600 dark:text-green-100/70 truncate">
                        {slide.heading ? (
                          <span><strong>Headline override:</strong> {slide.heading}</span>
                        ) : (
                          <span className="italic text-gray-400 dark:text-green-200/40">Uses global homepage headline</span>
                        )}
                      </p>

                      {slide.cta_text && slide.cta_link && (
                        <p className="text-[11px] text-[#138601] dark:text-[#4bd043] font-medium flex items-center gap-1">
                          <span>CTA: &ldquo;{slide.cta_text}&rdquo; &rarr; {slide.cta_link}</span>
                        </p>
                      )}

                      <span className="text-[10px] text-gray-400 dark:text-green-200/50 block">
                        Saved {new Date(slide.updated_at || slide.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Right: Management Actions */}
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-gray-100 dark:border-[#138601]/20">
                    {/* Publish / Unpublish Toggle */}
                    <button
                      type="button"
                      onClick={() => handleTogglePublish(slide)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        slide.is_published
                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40'
                          : 'bg-green-50 hover:bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300 border border-green-200 dark:border-green-800/40'
                      }`}
                      title={slide.is_published ? 'Unpublish slide' : 'Publish slide'}
                    >
                      {slide.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{slide.is_published ? 'Unpublish' : 'Publish'}</span>
                    </button>

                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={() => openEditModal(slide)}
                      className="p-2 rounded-xl text-gray-600 dark:text-green-200 hover:bg-gray-100 dark:hover:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 transition-colors cursor-pointer"
                      title="Edit Slide Details"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setSlideToDelete(slide);
                        setIsDeleteModalOpen(true);
                      }}
                      className="p-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/40 transition-colors cursor-pointer"
                      title="Delete Slide"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── Add / Edit Slide Modal ─── */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <div className="w-full max-w-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl my-8">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#138601]/20 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#138601]/15 text-[#138601] dark:text-[#4bd043] flex items-center justify-center font-bold">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      {editingSlide ? 'Edit Hero Slide' : 'Add New Hero Slide'}
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-green-200/70">
                      Configure background image, focal crop, and optional headline overrides.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-5">
                {/* Image Upload Area */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-green-200">
                    Hero Slide Image <span className="text-red-500">*</span>
                  </label>
                  <MediaUpload
                    currentImageUrl={formData.image_url}
                    currentPublicId={formData.cloudinary_public_id}
                    folder={CLOUDINARY_FOLDERS.HOMEPAGE}
                    aspectRatio="banner"
                    label=""
                    helperText="Upload 1920x1080 or high-res widescreen JPG, PNG, or WebP up to 5MB"
                    onUploadSuccess={(asset) => {
                      setFormData(prev => ({
                        ...prev,
                        image_url: asset.secure_url || asset.url,
                        cloudinary_public_id: asset.public_id || asset.publicId
                      }));
                    }}
                  />
                  {formData.image_url && (
                    <div className="text-[11px] text-gray-500 dark:text-green-200/70 truncate flex items-center gap-1.5 pt-1">
                      <span className="font-semibold text-gray-700 dark:text-white">Image URL:</span>
                      <span className="truncate">{formData.image_url}</span>
                    </div>
                  )}
                </div>

                {/* Slide Title / Internal Label */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-green-200 mb-1">
                    Internal Label / Admin Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Computing Lab Complex or 2026 Hackathon Banner"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 text-gray-900 dark:text-white font-medium"
                  />
                </div>

                {/* Focal Positioning Alignment */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-green-200 mb-1">
                    Focal Image Alignment (Crop Alignment)
                  </label>
                  <select
                    value={formData.image_position}
                    onChange={(e) => setFormData({ ...formData, image_position: e.target.value })}
                    className="w-full px-4 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 text-gray-900 dark:text-white font-medium cursor-pointer"
                  >
                    {FOCAL_POSITIONS.map((pos) => (
                      <option key={pos.value} value={pos.value}>
                        {pos.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-400 dark:text-green-200/60 mt-1">
                    Aligns where the camera focuses when the slide is cropped across responsive screens.
                  </p>
                </div>

                {/* Optional Heading Override */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-green-200 mb-1">
                    Headline Override <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Leave empty to use global homepage headline"
                    value={formData.heading}
                    onChange={(e) => setFormData({ ...formData, heading: e.target.value })}
                    className="w-full px-4 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 text-gray-900 dark:text-white"
                  />
                  <p className="text-[10px] text-gray-400 dark:text-green-200/60 mt-1">
                    If specified, this slide displays this custom heading instead of the general homepage headline.
                  </p>
                </div>

                {/* Optional Subtext Override */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-green-200 mb-1">
                    Subtext Narrative Override <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Leave empty to use global homepage subtext narrative"
                    value={formData.subtext}
                    onChange={(e) => setFormData({ ...formData, subtext: e.target.value })}
                    className="w-full px-4 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Optional Call to Action */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-green-200 mb-1">
                      CTA Button Label <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Explore Academics"
                      value={formData.cta_text}
                      onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-green-200 mb-1">
                      CTA Destination URL <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. /academics or /about/alumni"
                      value={formData.cta_link}
                      onChange={(e) => setFormData({ ...formData, cta_link: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Publication Status Toggle */}
                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-gray-900 dark:text-white block">
                      Publication Status
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-green-200/70">
                      When active, this slide will rotate live on the public website homepage.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_published}
                      onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-hidden rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#138601]"></div>
                  </label>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-gray-100 dark:border-[#138601]/20 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#041801] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <AdminSaveButton
                    loading={saving}
                    loadingText="Saving to Database..."
                    variant="primary"
                    icon={Check}
                  >
                    {editingSlide ? 'Save Changes' : 'Publish Slide'}
                  </AdminSaveButton>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── Delete Confirmation Modal ─── */}
        {isDeleteModalOpen && slideToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-md bg-white dark:bg-[#083002] border border-red-300 dark:border-red-800/60 rounded-3xl p-6 sm:p-7 space-y-4 shadow-2xl text-center">
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto border border-red-200 dark:border-red-800/40">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Delete Hero Slide?
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  Are you sure you want to remove &ldquo;<strong>{slideToDelete.title || 'Untitled Slide'}</strong>&rdquo; from the homepage carousel? This action cannot be undone.
                </p>
              </div>

              {slideToDelete.image_url && (
                <div className="w-full h-24 rounded-xl overflow-hidden bg-gray-900 border border-gray-200 dark:border-[#138601]/20 my-2">
                  <img
                    src={slideToDelete.image_url}
                    alt="Slide preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#041801] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <AdminSaveButton
                  type="button"
                  onClick={confirmDelete}
                  loading={saving}
                  loadingText="Deleting..."
                  variant="danger"
                  icon={Trash2}
                >
                  Yes, Delete Slide
                </AdminSaveButton>
              </div>
            </div>
          </div>
        )}

      </div>
    </WebsiteAdminLayout>
  );
};

export default AdminHeroCarousel;
