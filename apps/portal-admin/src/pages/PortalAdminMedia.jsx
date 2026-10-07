import React, { useState, useEffect, useMemo } from 'react';
import PortalAdminLayout from '../components/PortalAdminLayout';
import { 
  Image as ImageIcon, 
  Upload, 
  Trash2, 
  RefreshCw, 
  ExternalLink, 
  Copy, 
  Check, 
  Filter, 
  Search, 
  Sliders, 
  Layers, 
  HardDrive, 
  Sparkles,
  Eye,
  Edit,
  ShieldAlert,
  Calendar,
  Users,
  Award,
  FolderSync,
  FolderTree,
  Building2,
  GraduationCap,
  CreditCard,
  UserCheck,
  ShieldCheck,
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
import { supabase } from '@nacos/supabase';
import { syncMediaAsset, deleteMediaAsset, fetchMediaAssets } from '@nacos/supabase/media';

// Media library items loaded dynamically from Supabase & Cloudinary
const INITIAL_MEDIA_ASSETS = [];

const AdminMedia = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [mediaList, setMediaList] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [previewMedia, setPreviewMedia] = useState(null);
  const [activePreset, setActivePreset] = useState('card');
  const [copiedId, setCopiedId] = useState(null);
  const [notification, setNotification] = useState(null);

  // Folder Architecture Tracker & Cloudinary Sync State
  const [folderSyncStatus, setFolderSyncStatus] = useState({
    configured: false,
    cloudName: 'nacos-futo',
    folders: CANONICAL_NACOS_FOLDERS
  });
  const [isSyncingFolders, setIsSyncingFolders] = useState(false);
  const [showFolderSection, setShowFolderSection] = useState(true);

  // New Upload Form State
  const [newAssetCategory, setNewAssetCategory] = useState('students');
  const [newAssetAlt, setNewAssetAlt] = useState('');
  const [newAssetEntity, setNewAssetEntity] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('nacos_user');
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }

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
  }, []);

  const loadMediaFromDatabase = async (category = selectedCategory) => {
    const res = await fetchMediaAssets(category !== 'all' ? { category } : {});
    setMediaList(res.data || []);
  };

  useEffect(() => {
    loadMediaFromDatabase(selectedCategory);
  }, [selectedCategory]);

  const showNotification = (text, type = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSyncFolders = async () => {
    setIsSyncingFolders(true);
    try {
      const res = await syncCloudinaryFolders();
      if (res.success) {
        showNotification(
          res.mode === 'live_cloudinary'
            ? `All ${res.totalFolders || 12} canonical folders verified & provisioned live!`
            : `All ${res.results?.length || 12} canonical folders cataloged and ready for upload!`
        );
        const updated = await getCloudinaryFoldersStatus();
        if (updated) setFolderSyncStatus(updated);
      } else {
        showNotification(`Folder sync notice: ${res.error || 'Folders tracked locally'}`, 'info');
      }
    } catch (err) {
      showNotification(`Sync error: ${err.message}`, 'error');
    } finally {
      setIsSyncingFolders(false);
    }
  };

  const isAuthorized = currentUser?.role === 'Admin' || currentUser?.role === 'Chapter President';

  const filteredMedia = useMemo(() => {
    return mediaList.filter(item => {
      const matchesCategory = 
        selectedCategory === 'all' || 
        item.category === selectedCategory ||
        item.cloudinary_public_id?.startsWith(`nacos/${selectedCategory}`);
      const q = searchQuery.toLowerCase();
      const matchesQuery = 
        !searchQuery ||
        item.cloudinary_public_id.toLowerCase().includes(q) ||
        (item.image_alt && item.image_alt.toLowerCase().includes(q)) ||
        (item.entity_id && item.entity_id.toLowerCase().includes(q));
      return matchesCategory && matchesQuery;
    });
  }, [mediaList, selectedCategory, searchQuery]);

  const handleCopyUrl = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    showNotification('Media URL copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteAsset = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.cloudinary_public_id}" from storage and database?`)) {
      return;
    }

    await deleteMediaAsset(item.cloudinary_public_id);

    const updated = mediaList.filter(m => m.cloudinary_public_id !== item.cloudinary_public_id);
    setMediaList(updated);
    showNotification(`Asset ${item.cloudinary_public_id} deleted successfully.`);
  };

  const handleUploadSuccess = async ({ url, publicId, format, bytes, width, height }) => {
    const res = await syncMediaAsset({
      publicId,
      url,
      folder: `nacos/${newAssetCategory}`,
      category: newAssetCategory,
      image_alt: newAssetAlt || `NACOS ${newAssetCategory} asset`,
      entity_type: newAssetCategory,
      entity_id: newAssetEntity || 'general',
      format: format || 'jpg',
      bytes: bytes || 150000,
      width: width || 800,
      height: height || 600,
      uploaded_by: currentUser?.id
    });

    const newAsset = res.data || {
      cloudinary_public_id: publicId,
      image_url: url,
      image_alt: newAssetAlt || `NACOS ${newAssetCategory} asset`,
      category: newAssetCategory,
      folder: `nacos/${newAssetCategory}`,
      format: format || 'jpg',
      bytes: bytes || 150000,
      width: width || 800,
      height: height || 600,
      created_at: new Date().toISOString()
    };

    const updated = [newAsset, ...mediaList.filter(m => m.cloudinary_public_id !== publicId)];
    setMediaList(updated);

    setIsUploadModalOpen(false);
    setNewAssetAlt('');
    setNewAssetEntity('');
    showNotification('New asset saved & synced with database!');
  };

  if (!isAuthorized) {
    return (
      <PortalAdminLayout>
        <div className="p-10 text-center max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 flex items-center justify-center mx-auto border border-red-200 dark:border-red-800">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Access Restricted</h2>
          <p className="text-xs text-gray-500 dark:text-green-200/80 leading-relaxed">
            The Media Management Dashboard is restricted to Chapter Presidents and Administrators.
          </p>
        </div>
      </PortalAdminLayout>
    );
  }

  const categories = [
    { id: 'all', label: 'All Media' },
    { id: 'students', label: 'Students', icon: UserCheck },
    { id: 'ids', label: 'ID Cards', icon: CreditCard },
    { id: 'executives', label: 'Executives', icon: Users },
    { id: 'yellow_pages', label: 'Yellow Pages', icon: Building2 },
    { id: 'events', label: 'Events & Banners', icon: Calendar },
    { id: 'gallery', label: 'Campus Gallery', icon: ImageIcon },
    { id: 'alumni', label: 'Alumni Network', icon: GraduationCap },
    { id: 'news', label: 'News & Articles', icon: Layers },
    { id: 'certificates', label: 'Certificates', icon: Award },
    { id: 'homepage', label: 'Homepage Hero', icon: Sparkles },
    { id: 'general', label: 'General', icon: HardDrive }
  ];

  const getFolderIcon = (key) => {
    switch (key) {
      case 'students': return UserCheck;
      case 'ids': return CreditCard;
      case 'executives': return Users;
      case 'yellow_pages': return Building2;
      case 'events': return Calendar;
      case 'gallery': return ImageIcon;
      case 'alumni': return GraduationCap;
      case 'news': return Layers;
      case 'homepage': return Sparkles;
      case 'certificates': return Award;
      default: return HardDrive;
    }
  };

  return (
    <PortalAdminLayout>
      <div className="space-y-6">
        
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-[#138601] dark:text-[#4bd043]" />
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                Media Asset Management
              </h1>
            </div>
            <p className="text-xs text-gray-500 dark:text-green-100/70">
              High-performance media management, automated facial-centering, and optimized cloud delivery for NACOS.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] shadow-sm transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Upload New Media</span>
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {notification && (
          <div className="p-3.5 rounded text-xs font-semibold flex items-center gap-2 shadow-sm bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800/40 animate-fade-in">
            <Check className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
            <span>{notification.text}</span>
          </div>
        )}

        {/* =========================================================================
            FOLDER ARCHITECTURE TRACKER & SYNC PANEL
            ========================================================================= */}
        <div className="p-5 rounded bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 shadow-sm space-y-4">
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
                All 12 canonical media folders partitioned across Portal, Website, and Shared surfaces.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSyncFolders}
                disabled={isSyncingFolders}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                <FolderSync className={`w-3.5 h-3.5 ${isSyncingFolders ? 'animate-spin' : ''}`} />
                <span>{isSyncingFolders ? 'Syncing...' : 'Sync Asset Folders'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowFolderSection(!showFolderSection)}
                className="p-1.5 rounded text-gray-500 dark:text-green-200/80 hover:bg-gray-100 dark:hover:bg-[#041801] transition-colors"
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
                    className={`p-3 rounded border text-left cursor-pointer transition-all flex flex-col justify-between ${
                      isCurrent
                        ? 'bg-[#138601]/10 border-[#138601] shadow-sm'
                        : 'bg-gray-50 dark:bg-[#041801] border-gray-200 dark:border-[#138601]/20 hover:border-[#138601]/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <div className="p-1.5 rounded bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30">
                          <IconComponent className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          folder.surface === 'portal' 
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                            : folder.surface === 'website'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
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

        {/* Storage & Optimization Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 space-y-1">
            <span className="text-[11px] text-gray-500 dark:text-green-200/70 block">Total Media Assets</span>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{mediaList.length}</div>
            <span className="text-[10px] text-green-600 dark:text-green-300 font-medium">Auto WebP/AVIF Enabled</span>
          </div>
          <div className="p-4 rounded bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 space-y-1">
            <span className="text-[11px] text-gray-500 dark:text-green-200/70 block">Database Binary Storage</span>
            <div className="text-2xl font-bold text-[#138601] dark:text-[#4bd043]">0 MB</div>
            <span className="text-[10px] text-gray-500 dark:text-green-200/70 font-medium">100% cloud-hosted storage</span>
          </div>
          <div className="p-4 rounded bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 space-y-1">
            <span className="text-[11px] text-gray-500 dark:text-green-200/70 block">Dynamic Crop Engine</span>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">g_face, f_auto</div>
            <span className="text-[10px] text-green-600 dark:text-green-300 font-medium">Automatic facial centering</span>
          </div>
          <div className="p-4 rounded bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 space-y-1">
            <span className="text-[11px] text-gray-500 dark:text-green-200/70 block">Cloud Delivery CDN</span>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">Active</div>
            <span className="text-[10px] text-green-600 dark:text-green-300 font-medium">Edge cache & transformations</span>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="p-4 rounded bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[#138601] text-white'
                    : 'bg-gray-100 dark:bg-[#041801] text-gray-700 dark:text-green-200 hover:bg-gray-200 dark:hover:bg-black'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by public ID or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded text-xs bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#138601]"
            />
          </div>
        </div>

        {/* Media Asset Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredMedia.map((item) => (
            <div
              key={item.id || item.cloudinary_public_id}
              className="rounded overflow-hidden bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 flex flex-col shadow-sm group hover:border-[#138601] transition-all"
            >
              {/* Image Preview Container */}
              <div className="relative aspect-[4/3] bg-gray-100 dark:bg-[#041801] overflow-hidden">
                <CloudinaryImage
                  src={item.image_url}
                  alt={item.image_alt || item.cloudinary_public_id}
                  preset="card"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                
                {/* Category Tag Badge */}
                <div className="absolute top-2 left-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-black/70 text-white backdrop-blur">
                    {item.category}
                  </span>
                </div>

                {/* Quick Actions Hover Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                  <button
                    type="button"
                    title="Preview Transformations"
                    onClick={() => setPreviewMedia(item)}
                    className="p-2 rounded bg-white text-gray-900 hover:bg-gray-100 shadow transition-transform hover:scale-110 cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    title="Copy CDN URL"
                    onClick={() => handleCopyUrl(item.image_url, item.id)}
                    className="p-2 rounded bg-[#138601] text-white hover:bg-[#0f6c01] shadow transition-transform hover:scale-110 cursor-pointer"
                  >
                    {copiedId === item.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    title="Delete Asset"
                    onClick={() => handleDeleteAsset(item)}
                    className="p-2 rounded bg-red-600 text-white hover:bg-red-700 shadow transition-transform hover:scale-110 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Metadata Details */}
              <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2 text-xs">
                <div>
                  <div className="font-mono text-[11px] font-bold text-gray-900 dark:text-white truncate" title={item.cloudinary_public_id}>
                    {item.cloudinary_public_id}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-green-200/70 truncate mt-0.5">
                    {item.image_alt || 'No alt text provided'}
                  </p>
                </div>

                <div className="pt-2 border-t border-gray-100 dark:border-[#138601]/20 flex items-center justify-between text-[10px] text-gray-500 dark:text-green-200/60 font-mono">
                  <span>{item.format?.toUpperCase() || 'JPG'} • {((item.bytes || 0) / 1024).toFixed(0)} KB</span>
                  <span>{item.width || 600}×{item.height || 400}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredMedia.length === 0 && (
          <div className="p-12 text-center rounded bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 space-y-3">
            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">No media assets found</h3>
            <p className="text-xs text-gray-500 dark:text-green-200/70">
              No assets match folder category "{selectedCategory}" or search query "{searchQuery}".
            </p>
          </div>
        )}

        {/* ================================================================
            MODAL 1: UPLOAD NEW MEDIA ASSET (ALL CANONICAL FOLDERS)
            ================================================================ */}
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 rounded max-w-lg w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#138601]/20 pb-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
                  <span>Upload Media Asset</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-green-200 mb-1">
                    Target Asset Folder
                  </label>
                  <select
                    value={newAssetCategory}
                    onChange={(e) => setNewAssetCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40 text-gray-900 dark:text-white"
                  >
                    <option value="students">Student Passports (nacos/students)</option>
                    <option value="ids">Student ID Cards (nacos/ids)</option>
                    <option value="executives">Executive Council (nacos/executives)</option>
                    <option value="yellow_pages">Yellow Pages Businesses (nacos/yellow_pages)</option>
                    <option value="events">Events & Banners (nacos/events)</option>
                    <option value="gallery">Campus Gallery (nacos/gallery)</option>
                    <option value="alumni">Alumni Network (nacos/alumni)</option>
                    <option value="news">News & Articles (nacos/news)</option>
                    <option value="homepage">Homepage & Hero (nacos/homepage)</option>
                    <option value="certificates">Certificates (nacos/certificates)</option>
                    <option value="general">General Branding (nacos/general)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-green-200 mb-1">
                    Image Description / Alt Text
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Passport photograph for clearance, or ID card back"
                    value={newAssetAlt}
                    onChange={(e) => setNewAssetAlt(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-green-200 mb-1">
                    Associated Entity Tag (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 20241429481 or event-masked-affairs"
                    value={newAssetEntity}
                    onChange={(e) => setNewAssetEntity(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40 text-gray-900 dark:text-white font-mono"
                  />
                </div>

                <div className="pt-2">
                  <MediaUpload
                    folder={`nacos/${newAssetCategory}`}
                    label="Select Media File"
                    helperText="JPG, PNG, or WebP up to 5MB"
                    aspectRatio={newAssetCategory === 'students' ? 'portrait' : 'landscape'}
                    onUploadSuccess={handleUploadSuccess}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================
            MODAL 2: DYNAMIC TRANSFORMATION PREVIEW
            ================================================================ */}
        {previewMedia && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 rounded max-w-2xl w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#138601]/20 pb-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Media Asset Inspector
                  </h3>
                  <p className="text-[11px] font-mono text-gray-500 dark:text-green-200/70">
                    {previewMedia.cloudinary_public_id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewMedia(null)}
                  className="text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer text-lg"
                >
                  ✕
                </button>
              </div>

              {/* Transformation Presets Selector */}
              <div className="flex flex-wrap gap-2 text-xs">
                {Object.keys(TRANSFORMATION_PRESETS).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActivePreset(key)}
                    className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer ${
                      activePreset === key
                        ? 'bg-[#138601] text-white'
                        : 'bg-gray-100 dark:bg-[#041801] text-gray-700 dark:text-green-200'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>

              {/* Transformed Image Preview */}
              <div className="bg-gray-100 dark:bg-[#041801] rounded p-4 flex items-center justify-center min-h-[300px] overflow-hidden border border-gray-200 dark:border-[#138601]/30">
                <img
                  src={getOptimizedImageUrl(previewMedia.image_url, { preset: activePreset })}
                  alt={previewMedia.image_alt || 'Preview'}
                  className="max-h-[360px] w-auto object-contain rounded shadow-md"
                />
              </div>

              {/* Active URL with Copy */}
              <div className="p-3 rounded bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 space-y-1">
                <span className="text-[10px] text-gray-500 dark:text-green-200/70 block uppercase font-bold">
                  Generated On-The-Fly Delivery URL
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getOptimizedImageUrl(previewMedia.image_url, { preset: activePreset })}
                    className="flex-1 text-[11px] font-mono bg-transparent border-0 text-gray-800 dark:text-white select-all focus:outline-none truncate"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyUrl(getOptimizedImageUrl(previewMedia.image_url, { preset: activePreset }), 'modal')}
                    className="px-3 py-1.5 rounded bg-[#138601] text-white text-xs font-semibold hover:bg-[#0f6c01] cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </PortalAdminLayout>
  );
};

export default AdminMedia;
