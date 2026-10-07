import React, { useState, useEffect, useMemo } from 'react';
import WebsiteAdminLayout from '../components/WebsiteAdminLayout';
import { 
  ImageIcon, 
  Upload, 
  Trash2, 
  Copy, 
  Check, 
  Search, 
  Eye, 
  Layers, 
  Calendar, 
  Camera, 
  Users,
  HardDrive,
  FolderSync,
  FolderTree,
  Building2,
  GraduationCap,
  Sparkles,
  CreditCard,
  UserCheck,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  MediaUpload, 
  CloudinaryImage, 
  CLOUDINARY_FOLDERS, 
  CANONICAL_NACOS_FOLDERS,
  TRANSFORMATION_PRESETS, 
  getOptimizedImageUrl,
  deleteMedia,
  getCloudinaryFoldersStatus,
  syncCloudinaryFolders
} from '@nacos/media';
import { recordAdminAction } from '@nacos/supabase/adminAuth';
import { syncMediaAsset, deleteMediaAsset, fetchMediaAssets } from '@nacos/supabase/media';

const INITIAL_WEBSITE_MEDIA = [];

const AdminMedia = () => {
  const [mediaList, setMediaList] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewMedia, setPreviewMedia] = useState(null);
  const [activePreset, setActivePreset] = useState('card');
  const [copiedId, setCopiedId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Folder Tracking & Cloudinary Sync State
  const [folderSyncStatus, setFolderSyncStatus] = useState({
    configured: false,
    cloudName: 'nacos-futo',
    folders: CANONICAL_NACOS_FOLDERS
  });
  const [isSyncingFolders, setIsSyncingFolders] = useState(false);
  const [showFolderSection, setShowFolderSection] = useState(true);

  // Upload Form State
  const [uploadCategory, setUploadCategory] = useState('events');
  const [uploadAlt, setUploadAlt] = useState('');

  useEffect(() => {
    async function loadData() {
      const res = await fetchMediaAssets({ category: selectedCategory });
      setMediaList(res.data || []);
    }
    loadData();

    // Query folder status on mount
    async function loadFolderStatus() {
      try {
        const status = await getCloudinaryFoldersStatus();
        if (status) {
          setFolderSyncStatus(status);
        }
      } catch (e) {
        console.warn('Could not query folder status', e);
      }
    }
    loadFolderStatus();
  }, [selectedCategory]);

  const showFeedback = (text, type = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleSyncFolders = async () => {
    setIsSyncingFolders(true);
    try {
      const res = await syncCloudinaryFolders();
      if (res.success) {
        showFeedback(
          res.mode === 'live_cloudinary'
            ? `All ${res.totalFolders || 12} canonical folders verified & provisioned live!`
            : `All ${res.results?.length || 12} canonical folders cataloged and ready for upload!`
        );
        const updated = await getCloudinaryFoldersStatus();
        if (updated) setFolderSyncStatus(updated);
      } else {
        showFeedback(`Folder sync notice: ${res.error || 'Folders tracked locally'}`, 'info');
      }
    } catch (err) {
      showFeedback(`Sync error: ${err.message}`, 'error');
    } finally {
      setIsSyncingFolders(false);
    }
  };

  const filteredMedia = useMemo(() => {
    return mediaList.filter(item => {
      const matchesCat = 
        selectedCategory === 'all' || 
        item.category === selectedCategory ||
        item.cloudinary_public_id.startsWith(`nacos/${selectedCategory}`);
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        !searchQuery || 
        item.cloudinary_public_id.toLowerCase().includes(q) || 
        (item.image_alt && item.image_alt.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [mediaList, selectedCategory, searchQuery]);

  const handleCopyUrl = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    showFeedback('Media URL copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.cloudinary_public_id}" from storage and database?`)) return;

    await deleteMediaAsset(item.cloudinary_public_id);
    const updated = mediaList.filter(m => m.cloudinary_public_id !== item.cloudinary_public_id);
    setMediaList(updated);

    await recordAdminAction('image_delete', 'media', item.cloudinary_public_id, {
      category: item.category
    });

    showFeedback('Media asset removed from storage and database.');
  };

  const handleUploadSuccess = async ({ url, publicId, format, bytes, width, height }) => {
    const res = await syncMediaAsset({
      publicId,
      url,
      folder: `nacos/${uploadCategory}`,
      category: uploadCategory,
      image_alt: uploadAlt || `NACOS ${uploadCategory} media`,
      entity_type: uploadCategory,
      entity_id: publicId.split('/').pop(),
      format: format || 'jpg',
      bytes: bytes || 180000,
      width: width || 800,
      height: height || 600
    });

    const newAsset = res.data || {
      cloudinary_public_id: publicId,
      image_url: url,
      image_alt: uploadAlt || `NACOS ${uploadCategory} media`,
      category: uploadCategory,
      folder: `nacos/${uploadCategory}`,
      format: format || 'jpg',
      bytes: bytes || 180000,
      width: width || 800,
      height: height || 600,
      created_at: new Date().toISOString()
    };

    const updated = [newAsset, ...mediaList.filter(m => m.cloudinary_public_id !== publicId)];
    setMediaList(updated);

    await recordAdminAction('image_upload', 'media', publicId, {
      category: uploadCategory,
      url
    });

    setIsUploadOpen(false);
    setUploadAlt('');
    showFeedback('Image successfully uploaded & synced with database!');
  };

  const categories = [
    { id: 'all', label: 'All Website Media' },
    { id: 'events', label: 'Events & Flyers', icon: Calendar },
    { id: 'gallery', label: 'Campus Gallery', icon: Camera },
    { id: 'executives', label: 'Executives & Staff', icon: Users },
    { id: 'yellow_pages', label: 'Yellow Pages', icon: Building2 },
    { id: 'alumni', label: 'Alumni Network', icon: GraduationCap },
    { id: 'news', label: 'News & Journal', icon: Layers },
    { id: 'homepage', label: 'Homepage & Hero', icon: Sparkles },
    { id: 'students', label: 'Student Photos', icon: UserCheck },
    { id: 'ids', label: 'ID Cards', icon: CreditCard },
    { id: 'certificates', label: 'Certificates', icon: HardDrive },
    { id: 'general', label: 'General Banners', icon: HardDrive }
  ];

  // Helper to map folder category key to icon
  const getFolderIcon = (key) => {
    switch (key) {
      case 'yellow_pages': return Building2;
      case 'alumni': return GraduationCap;
      case 'executives': return Users;
      case 'events': return Calendar;
      case 'gallery': return Camera;
      case 'news': return Layers;
      case 'homepage': return Sparkles;
      case 'students': return UserCheck;
      case 'ids': return CreditCard;
      default: return HardDrive;
    }
  };

  return (
    <WebsiteAdminLayout
      title="Website Media Management"
      subtitle="Media asset management for public website images, Yellow Pages flyers, alumni spotlight, and hero banners."
    >
      <div className="space-y-6">
        
        {/* =========================================================================
            FOLDER ARCHITECTURE TRACKER & SYNC PANEL
            ========================================================================= */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-[#138601]/20">
            <div>
              <div className="flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-[#138601] dark:text-[#4bd043]" />
                <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                  Folder Architecture & Auto-Provisioning
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300">
                  Active Storage
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-green-200/70 mt-0.5">
                Dedicated folder partitions ensure clean segregation between Website, Portal, and Shared assets.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSyncFolders}
                disabled={isSyncingFolders}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                <FolderSync className={`w-3.5 h-3.5 ${isSyncingFolders ? 'animate-spin' : ''}`} />
                <span>{isSyncingFolders ? 'Syncing...' : 'Sync Asset Folders'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowFolderSection(!showFolderSection)}
                className="p-1.5 rounded-lg text-gray-500 dark:text-green-200/80 hover:bg-gray-100 dark:hover:bg-[#041801] transition-colors"
                title={showFolderSection ? 'Collapse Folder View' : 'Expand Folder View'}
              >
                {showFolderSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {showFolderSection && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-1">
              {(folderSyncStatus.folders || CANONICAL_NACOS_FOLDERS).map((folder) => {
                const IconComponent = getFolderIcon(folder.categoryKey);
                const isCurrent = selectedCategory === folder.categoryKey;
                const assetCount = mediaList.filter(m => 
                  m.category === folder.categoryKey || 
                  m.cloudinary_public_id?.startsWith(folder.path)
                ).length;

                return (
                  <div
                    key={folder.path}
                    onClick={() => setSelectedCategory(folder.categoryKey === 'root' ? 'all' : folder.categoryKey)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                      isCurrent
                        ? 'bg-[#138601]/10 border-[#138601] shadow-sm'
                        : 'bg-gray-50 dark:bg-[#041801] border-gray-200 dark:border-[#138601]/20 hover:border-[#138601]/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <div className="p-1.5 rounded-lg bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30">
                          <IconComponent className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          folder.surface === 'website' 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                            : folder.surface === 'portal'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}>
                          {folder.surface}
                        </span>
                      </div>

                      <div className="font-bold text-xs text-gray-900 dark:text-white truncate">
                        {folder.name}
                      </div>
                      <div className="font-mono text-[10px] text-[#138601] dark:text-[#4bd043] truncate">
                        /{folder.path}
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-green-200/70 line-clamp-2 mt-1">
                        {folder.description}
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-gray-200/60 dark:border-[#138601]/20 flex items-center justify-between text-[10px] text-gray-500 dark:text-green-200/60">
                      <span className="font-semibold text-gray-700 dark:text-green-300">
                        {assetCount} {assetCount === 1 ? 'Asset' : 'Assets'}
                      </span>
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <ShieldCheck className="w-3 h-3" /> Ready
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* =========================================================================
            MEDIA CONTROLS BAR & CATEGORY FILTER TABS
            ========================================================================= */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === c.id
                    ? 'bg-[#138601] text-white'
                    : 'bg-gray-100 dark:bg-[#041801] text-gray-700 dark:text-green-200 hover:bg-gray-200 dark:hover:bg-black'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-60">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search media by ID or alt..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg text-xs bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#138601]"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Upload className="w-4 h-4" /> Upload Media
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800/40 animate-fade-in">
            <Check className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Grid Display */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredMedia.map((item) => (
            <div
              key={item.id || item.cloudinary_public_id}
              className="rounded-xl overflow-hidden bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 flex flex-col shadow-sm group hover:border-[#138601] transition-all"
            >
              <div className="relative aspect-[16/10] bg-gray-100 dark:bg-[#041801] overflow-hidden">
                <CloudinaryImage
                  src={item.image_url}
                  alt={item.image_alt}
                  preset="card"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                
                <div className="absolute top-2 left-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-black/75 text-white backdrop-blur">
                    {item.category}
                  </span>
                </div>

                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                  <button
                    type="button"
                    title="Preview Transformation"
                    onClick={() => setPreviewMedia(item)}
                    className="p-2 rounded-full bg-white text-gray-900 hover:bg-gray-100 shadow cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    title="Copy URL"
                    onClick={() => handleCopyUrl(item.image_url, item.id)}
                    className="p-2 rounded-full bg-[#138601] text-white hover:bg-[#0f6c01] shadow cursor-pointer"
                  >
                    {copiedId === item.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    title="Delete Image"
                    onClick={() => handleDelete(item)}
                    className="p-2 rounded-full bg-red-600 text-white hover:bg-red-700 shadow cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2 text-xs">
                <div>
                  <div className="font-mono text-[11px] font-bold text-gray-900 dark:text-white truncate" title={item.cloudinary_public_id}>
                    {item.cloudinary_public_id}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-green-200/70 truncate mt-0.5">
                    {item.image_alt}
                  </p>
                </div>

                <div className="pt-2 border-t border-gray-100 dark:border-[#138601]/20 flex items-center justify-between text-[10px] text-gray-500 dark:text-green-200/60 font-mono">
                  <span>{item.format?.toUpperCase() || 'JPG'} • {((item.bytes || 0) / 1024).toFixed(0)} KB</span>
                  <span>{item.width || 800}×{item.height || 600}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredMedia.length === 0 && (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 space-y-2">
            <ImageIcon className="w-10 h-10 text-gray-400 mx-auto" />
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">No media assets in this folder category</h4>
            <p className="text-xs text-gray-500 dark:text-green-200/70">
              Upload images to <span className="font-mono text-[#138601]">nacos/{selectedCategory}</span> or select another category tab above.
            </p>
          </div>
        )}

        {/* =========================================================================
            UPLOAD MODAL (ALL CANONICAL NACOS FOLDERS SUPPORTED)
            ========================================================================= */}
        {isUploadOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#138601]/20 pb-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Upload Media Asset
                </h3>
                <button onClick={() => setIsUploadOpen(false)} className="text-gray-400 cursor-pointer">✕</button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Target Asset Folder</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40"
                  >
                    <option value="events">Events & Flyers (nacos/events)</option>
                    <option value="gallery">Campus Gallery (nacos/gallery)</option>
                    <option value="executives">Executives & Staff (nacos/executives)</option>
                    <option value="yellow_pages">Yellow Pages Businesses (nacos/yellow_pages)</option>
                    <option value="alumni">Alumni Network (nacos/alumni)</option>
                    <option value="news">News & Journal (nacos/news)</option>
                    <option value="homepage">Homepage & Hero (nacos/homepage)</option>
                    <option value="students">Student Passports (nacos/students)</option>
                    <option value="ids">Student ID Cards (nacos/ids)</option>
                    <option value="certificates">Certificates & Awards (nacos/certificates)</option>
                    <option value="general">General Branding (nacos/general)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Image Description / Alt Text</label>
                  <input
                    type="text"
                    placeholder="e.g. Peacemaker Tech business flyer or 2026 Tech Rewind"
                    value={uploadAlt}
                    onChange={(e) => setUploadAlt(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40"
                  />
                </div>

                <div className="pt-2">
                  <MediaUpload
                    folder={`nacos/${uploadCategory}`}
                    label="Select or Drop Image"
                    aspectRatio={uploadCategory === 'students' ? 'portrait' : 'landscape'}
                    onUploadSuccess={handleUploadSuccess}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TRANSFORMATION INSPECTOR MODAL
            ========================================================================= */}
        {previewMedia && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#138601]/20 pb-3">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Media Delivery Inspector
                </h3>
                <button onClick={() => setPreviewMedia(null)} className="text-gray-400 cursor-pointer">✕</button>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {Object.keys(TRANSFORMATION_PRESETS).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActivePreset(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                      activePreset === key ? 'bg-[#138601] text-white' : 'bg-gray-100 dark:bg-[#041801]'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>

              <div className="bg-gray-100 dark:bg-[#041801] rounded-xl p-4 flex items-center justify-center min-h-[260px]">
                <img
                  src={getOptimizedImageUrl(previewMedia.image_url, { preset: activePreset })}
                  alt={previewMedia.image_alt}
                  className="max-h-[300px] w-auto object-contain rounded-lg shadow-md"
                />
              </div>

              <div className="flex items-center gap-2 text-xs">
                <input
                  type="text"
                  readOnly
                  value={getOptimizedImageUrl(previewMedia.image_url, { preset: activePreset })}
                  className="flex-1 text-[11px] font-mono bg-gray-50 dark:bg-[#041801] p-2 rounded-lg border border-gray-300 dark:border-[#138601]/30 truncate"
                />
                <button
                  type="button"
                  onClick={() => handleCopyUrl(getOptimizedImageUrl(previewMedia.image_url, { preset: activePreset }), 'modal')}
                  className="px-4 py-2 rounded-lg bg-[#138601] text-white font-semibold cursor-pointer"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </WebsiteAdminLayout>
  );
};

export default AdminMedia;
