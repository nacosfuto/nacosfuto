import React, { useState, useEffect } from 'react';
import WebsiteAdminLayout from '../components/WebsiteAdminLayout';
import { 
  Users, 
  Award, 
  Plus, 
  Trash2, 
  Edit3, 
  ArrowUp, 
  ArrowDown, 
  History, 
  Image as ImageIcon, 
  Save, 
  CheckCircle, 
  AlertCircle, 
  Search, 
  ExternalLink, 
  Archive, 
  RefreshCw, 
  X, 
  Check,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { 
  getExecutives, 
  saveExecutive, 
  deleteExecutive, 
  moveExecutiveToPast, 
  moveExecutiveToCurrent, 
  archiveCurrentTenure, 
  getExecutivesSettings, 
  updateExecutivesSettings, 
  DEFAULT_EXECUTIVES_PAGE_SETTINGS,
  getTenures,
  addTenure,
  fetchExecutivesFromSupabase
} from '@nacos/supabase';
import { MediaUpload, CLOUDINARY_FOLDERS } from '@nacos/media';
import { recordAdminAction } from '@nacos/supabase/adminAuth';

const AdminExecutives = () => {
  const [activeTab, setActiveTab] = useState('current'); // 'current', 'past', 'header'
  const [executives, setExecutives] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_EXECUTIVES_PAGE_SETTINGS);
  const [tenures, setTenures] = useState(() => getTenures());
  const [isAddTenureModalOpen, setIsAddTenureModalOpen] = useState(false);
  const [newTenureInput, setNewTenureInput] = useState('');
  const [isQuickAddingTenure, setIsQuickAddingTenure] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPastSession, setSelectedPastSession] = useState('all');
  const [notification, setNotification] = useState({ message: '', type: '' });

  // Modal State for Add/Edit Executive
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    role: '',
    image: '',
    cloudinary_public_id: '',
    category: 'current',
    session: '2025/2026',
    order_index: 0
  });

  // Archive Tenure Modal State
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archiveSessionInput, setArchiveSessionInput] = useState('2025/2026');
  const [newTenureSessionInput, setNewTenureSessionInput] = useState('2026/2027');

  // Header Settings State
  const [headerForm, setHeaderForm] = useState(DEFAULT_EXECUTIVES_PAGE_SETTINGS);
  const [isSavingHeader, setIsSavingHeader] = useState(false);

  useEffect(() => {
    loadAll();
    fetchExecutivesFromSupabase().then(() => loadAll()).catch(() => {});

    const handleUpdate = () => loadAll();
    const handleTenuresUpdate = () => setTenures(getTenures());

    window.addEventListener('nacos_executives_updated', handleUpdate);
    window.addEventListener('nacos_executives_settings_updated', handleUpdate);
    window.addEventListener('nacos_tenures_updated', handleTenuresUpdate);

    return () => {
      window.removeEventListener('nacos_executives_updated', handleUpdate);
      window.removeEventListener('nacos_executives_settings_updated', handleUpdate);
      window.removeEventListener('nacos_tenures_updated', handleTenuresUpdate);
    };
  }, []);

  const loadAll = () => {
    setLoading(true);
    try {
      const allExecs = getExecutives('all');
      setExecutives(allExecs);
      setTenures(getTenures());
      const currentSettings = getExecutivesSettings();
      setSettings(currentSettings);
      setHeaderForm(currentSettings);
    } catch (e) {
      console.warn('Error loading executives in admin:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNewTenure = (sessionVal) => {
    const val = (sessionVal || newTenureInput).trim();
    if (!val) {
      showNotice('Please enter a valid tenure session (e.g. 2026/2027)', 'error');
      return '';
    }
    const updated = addTenure(val);
    setTenures(updated);
    setNewTenureInput('');
    setIsAddTenureModalOpen(false);
    setIsQuickAddingTenure(false);
    showNotice(`Tenure "${val}" added successfully!`);
    return val;
  };

  const showNotice = (msg, type = 'success') => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 4000);
  };

  // Filtered lists
  const currentList = executives
    .filter(e => e.category === 'current')
    .filter(e => 
      e.name.toLowerCase().includes(search.toLowerCase()) || 
      e.role.toLowerCase().includes(search.toLowerCase())
    );

  const pastList = executives
    .filter(e => e.category === 'past')
    .filter(e => selectedPastSession === 'all' || e.session === selectedPastSession)
    .filter(e => 
      e.name.toLowerCase().includes(search.toLowerCase()) || 
      e.role.toLowerCase().includes(search.toLowerCase())
    );

  // Distinct past sessions for filter dropdown
  const pastSessions = Array.from(new Set(
    executives.filter(e => e.category === 'past' && e.session).map(e => e.session)
  ));

  // Open Add Modal
  const handleOpenAdd = (category = 'current') => {
    setModalMode('add');
    const categoryList = executives.filter(e => e.category === category);
    setFormData({
      id: null,
      name: '',
      role: '',
      image: '',
      cloudinary_public_id: '',
      category,
      session: category === 'current' ? '2025/2026' : (pastSessions[0] || '2024/2025'),
      order_index: categoryList.length
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (exec) => {
    setModalMode('edit');
    setFormData({
      id: exec.id,
      name: exec.name || '',
      role: exec.role || '',
      image: exec.image || '',
      cloudinary_public_id: exec.cloudinary_public_id || '',
      category: exec.category || 'current',
      session: exec.session || '2025/2026',
      order_index: exec.order_index ?? 0
    });
    setIsModalOpen(true);
  };

  // Save Add/Edit
  const handleSaveModal = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.role.trim()) {
      showNotice('Please provide both the executive name and position.', 'error');
      return;
    }

    await saveExecutive(formData);
    await recordAdminAction(
      modalMode === 'add' ? 'create_executive' : 'update_executive',
      'executives',
      formData.id || formData.name,
      { name: formData.name, role: formData.role, category: formData.category }
    );

    showNotice(`Executive "${formData.name}" successfully ${modalMode === 'add' ? 'added' : 'updated'}!`);
    setIsModalOpen(false);
    loadAll();
  };

  // Delete Executive
  const handleDelete = async (exec) => {
    if (window.confirm(`Permanently remove executive "${exec.name}" (${exec.role})?`)) {
      await deleteExecutive(exec.id);
      await recordAdminAction('delete_executive', 'executives', exec.id, { name: exec.name });
      showNotice(`Executive "${exec.name}" removed from directory.`);
      loadAll();
    }
  };

  // Move single to Past
  const handleMoveToPast = async (exec) => {
    const sessionLabel = window.prompt(`Enter past session tenure for "${exec.name}":`, '2024/2025');
    if (sessionLabel) {
      await moveExecutiveToPast(exec.id, sessionLabel);
      await recordAdminAction('move_executive_to_past', 'executives', exec.id, { session: sessionLabel });
      showNotice(`Moved "${exec.name}" to Past Executives (${sessionLabel}).`);
      loadAll();
    }
  };

  // Move single to Current
  const handleMoveToCurrent = async (exec) => {
    if (window.confirm(`Move "${exec.name}" back to Current Executives council?`)) {
      await moveExecutiveToCurrent(exec.id, '2025/2026');
      await recordAdminAction('move_executive_to_current', 'executives', exec.id);
      showNotice(`Moved "${exec.name}" to Current Executives.`);
      loadAll();
    }
  };

  // Reorder executive up/down
  const handleReorder = async (exec, direction) => {
    const list = executives
      .filter(e => e.category === exec.category)
      .sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999));

    const currentIndex = list.findIndex(e => e.id === exec.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    // Swap order_index
    const currentOrder = list[currentIndex].order_index ?? currentIndex;
    const targetOrder = list[targetIndex].order_index ?? targetIndex;

    await saveExecutive({ ...list[currentIndex], order_index: targetOrder });
    await saveExecutive({ ...list[targetIndex], order_index: currentOrder });

    loadAll();
  };

  // Full Tenure Archiving
  const handleExecuteArchive = async (e) => {
    e.preventDefault();
    if (!archiveSessionInput.trim() || !newTenureSessionInput.trim()) return;

    await archiveCurrentTenure(archiveSessionInput.trim(), newTenureSessionInput.trim());
    await recordAdminAction('archive_tenure', 'executives', archiveSessionInput, {
      archivedSession: archiveSessionInput,
      newSession: newTenureSessionInput
    });

    showNotice(`Successfully archived current council to ${archiveSessionInput}! Prepared for ${newTenureSessionInput}.`);
    setIsArchiveModalOpen(false);
    loadAll();
  };

  // Save Header Settings
  const handleSaveHeaderSettings = async (e) => {
    e.preventDefault();
    setIsSavingHeader(true);

    await updateExecutivesSettings(headerForm);
    await recordAdminAction('update_executives_settings', 'executives_settings', 'default', headerForm);

    showNotice('Executive page hero header and session titles saved successfully!');
    setIsSavingHeader(false);
    loadAll();
  };

  return (
    <WebsiteAdminLayout>
      <div className="space-y-6">
        
        {/* Page Top Title & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-[#138601]/20">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2.5">
              <Award className="w-7 h-7 text-[#138601] dark:text-[#4bd043]" />
              NACOS Executives Management
            </h1>
            <p className="text-xs text-gray-500 dark:text-green-200/60 mt-1">
              Manage the executive student council, archive past tenures, customize the page header, and upload official Cloudinary portraits.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <a 
              href="/about/nacos-executives" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-gray-300 dark:border-[#138601]/30 hover:bg-gray-100 dark:hover:bg-[#083002] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View Live Page
            </a>

            <button
              onClick={() => handleOpenAdd(activeTab === 'past' ? 'past' : 'current')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-[#138601] hover:bg-[#0f6c01] text-white shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Executive
            </button>

            <button
              type="button"
              onClick={() => setIsAddTenureModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border border-[#138601]/40 bg-[#138601]/10 text-[#138601] dark:text-[#4bd043] hover:bg-[#138601]/20 transition-all cursor-pointer"
              title="Add a new executive tenure session (e.g. 2026/2027)"
            >
              <Plus className="w-4 h-4" />
              Add Tenure
            </button>

            {activeTab === 'current' && (
              <button
                onClick={() => setIsArchiveModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-all cursor-pointer"
                title="Transition all current executives to past archives"
              >
                <Archive className="w-4 h-4" />
                Archive Tenure
              </button>
            )}
          </div>
        </div>

        {/* Global Notification Banner */}
        {notification.message && (
          <div className={`p-4 rounded-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in duration-200 ${
            notification.type === 'error'
              ? 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
              : 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
          }`}>
            {notification.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-green-200/50">Current Council</span>
            <div className="text-2xl font-black text-[#138601] dark:text-[#4bd043] mt-1">
              {executives.filter(e => e.category === 'current').length} Executives
            </div>
            <span className="text-[11px] text-gray-500 dark:text-green-200/70">Displayed in 3 columns on desktop</span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-green-200/50">Past Executives</span>
            <div className="text-2xl font-black text-gray-800 dark:text-white mt-1">
              {executives.filter(e => e.category === 'past').length} Archived
            </div>
            <span className="text-[11px] text-gray-500 dark:text-green-200/70">Historical administration rosters</span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-green-200/50">Current Tenure</span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {settings.currentSessionTitle.replace('Current Executives', '').replace(/[()]/g, '').trim() || '2025/2026'}
            </div>
            <span className="text-[11px] text-gray-500 dark:text-green-200/70">Hero Year: {settings.heroYear}</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-[#138601]/25">
          <button
            onClick={() => setActiveTab('current')}
            className={`px-5 py-3 text-xs font-bold border-b-2 -mb-px flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'current'
                ? 'border-[#138601] text-[#138601] dark:border-[#4bd043] dark:text-[#4bd043]'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-green-200/60 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            Current Executives ({executives.filter(e => e.category === 'current').length})
          </button>

          <button
            onClick={() => setActiveTab('past')}
            className={`px-5 py-3 text-xs font-bold border-b-2 -mb-px flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'past'
                ? 'border-[#138601] text-[#138601] dark:border-[#4bd043] dark:text-[#4bd043]'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-green-200/60 dark:hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            Past Executives Archive ({executives.filter(e => e.category === 'past').length})
          </button>

          <button
            onClick={() => setActiveTab('header')}
            className={`px-5 py-3 text-xs font-bold border-b-2 -mb-px flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'header'
                ? 'border-[#138601] text-[#138601] dark:border-[#4bd043] dark:text-[#4bd043]'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-green-200/60 dark:hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Page Header & Hero Settings
          </button>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 1: CURRENT EXECUTIVES */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === 'current' && (
          <div className="space-y-4">
            
            {/* Filter / Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 rounded-xl shadow-xs">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search current executive by name or role..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 rounded-lg text-gray-900 dark:text-white focus:outline-hidden focus:border-[#138601]"
                />
              </div>

              <div className="text-xs text-gray-500 dark:text-green-200/60 font-medium self-end sm:self-center">
                Showing {currentList.length} of {executives.filter(e => e.category === 'current').length}
              </div>
            </div>

            {/* Executives Cards Grid (3 per row layout preview) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {currentList.map((exec, idx) => (
                <div 
                  key={exec.id}
                  className="p-4 bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 rounded-xl flex flex-col justify-between shadow-xs hover:border-[#138601] transition-all"
                >
                  <div className="flex items-start gap-3.5">
                    {/* Portrait Thumbnail */}
                    <div className="w-20 h-24 shrink-0 rounded-lg overflow-hidden border border-gray-200 dark:border-[#138601]/25 bg-gray-100 dark:bg-[#041801] flex items-center justify-center">
                      {exec.image ? (
                        <img src={exec.image} alt={exec.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] text-gray-400">No Photo</span>
                      )}
                    </div>

                    <div className="flex-grow min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#138601] dark:text-[#4bd043] block truncate">
                        {exec.role}
                      </span>
                      <h3 className="font-bold text-sm text-gray-900 dark:text-white leading-tight mt-0.5 line-clamp-2">
                        {exec.name}
                      </h3>
                      <div className="text-[11px] text-gray-500 dark:text-green-200/60 mt-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                        Active Council (Order #{exec.order_index ?? idx})
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-[#138601]/20 flex items-center justify-between gap-1 text-xs">
                    {/* Ordering Buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleReorder(exec, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-[#041801] text-gray-600 dark:text-green-200/70 disabled:opacity-30 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleReorder(exec, 'down')}
                        disabled={idx === currentList.length - 1}
                        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-[#041801] text-gray-600 dark:text-green-200/70 disabled:opacity-30 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleMoveToPast(exec)}
                        className="px-2 py-1 rounded text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 transition-colors cursor-pointer"
                        title="Move to Past Executives"
                      >
                        Move to Past
                      </button>
                      <button
                        onClick={() => handleOpenEdit(exec)}
                        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-[#041801] text-blue-600 dark:text-blue-400 cursor-pointer"
                        title="Edit Executive"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(exec)}
                        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-[#041801] text-red-600 dark:text-red-400 cursor-pointer"
                        title="Delete Executive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {currentList.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 rounded-xl">
                <Users className="w-10 h-10 text-gray-400 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold text-gray-600 dark:text-green-200">No current executives found</p>
                <p className="text-xs text-gray-400 mt-1">Click "Add Executive" above to enlist officers into the active council.</p>
              </div>
            )}
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 2: PAST EXECUTIVES */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === 'past' && (
          <div className="space-y-4">
            
            {/* Filter / Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 rounded-xl shadow-xs">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search past executives..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 rounded-lg text-gray-900 dark:text-white focus:outline-hidden focus:border-[#138601]"
                  />
                </div>

                {/* Session Filter */}
                <select
                  value={selectedPastSession}
                  onChange={(e) => setSelectedPastSession(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 rounded-lg text-gray-900 dark:text-white"
                >
                  <option value="all">All Historical Sessions</option>
                  {pastSessions.map(sess => (
                    <option key={sess} value={sess}>{sess}</option>
                  ))}
                </select>
              </div>

              <div className="text-xs text-gray-500 dark:text-green-200/60 font-medium">
                Showing {pastList.length} of {executives.filter(e => e.category === 'past').length}
              </div>
            </div>

            {/* Past Executives Grid (3 per row) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {pastList.map((exec) => (
                <div 
                  key={exec.id}
                  className="p-4 bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 rounded-xl flex flex-col justify-between shadow-xs hover:border-[#138601] transition-all"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-20 h-24 shrink-0 rounded-lg overflow-hidden border border-gray-200 dark:border-[#138601]/25 bg-gray-100 dark:bg-[#041801] flex items-center justify-center">
                      {exec.image ? (
                        <img src={exec.image} alt={exec.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] text-gray-400">No Photo</span>
                      )}
                    </div>

                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#138601] dark:text-[#4bd043] truncate">
                          {exec.role}
                        </span>
                        {exec.session && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[#041801] text-gray-500 dark:text-green-200/60 border border-gray-200 dark:border-[#138601]/20">
                            {exec.session}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-sm text-gray-900 dark:text-white leading-tight mt-1 line-clamp-2">
                        {exec.name}
                      </h3>
                      <div className="text-[11px] text-gray-400 dark:text-green-200/50 mt-1">
                        Historical Record
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-[#138601]/20 flex items-center justify-end gap-1.5 text-xs">
                    <button
                      onClick={() => handleMoveToCurrent(exec)}
                      className="px-2.5 py-1 rounded text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                      title="Move back to Current Council"
                    >
                      Restore to Current
                    </button>
                    <button
                      onClick={() => handleOpenEdit(exec)}
                      className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-[#041801] text-blue-600 dark:text-blue-400 cursor-pointer"
                      title="Edit Executive"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(exec)}
                      className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-[#041801] text-red-600 dark:text-red-400 cursor-pointer"
                      title="Delete Executive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {pastList.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 rounded-xl">
                <History className="w-10 h-10 text-gray-400 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold text-gray-600 dark:text-green-200">No past executives found</p>
                <p className="text-xs text-gray-400 mt-1">Archived or older administrative tenures will appear here.</p>
              </div>
            )}
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 3: PAGE HEADER & HERO SETTINGS */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === 'header' && (
          <form onSubmit={handleSaveHeaderSettings} className="space-y-6">
            
            {/* Live Header Preview */}
            <div className="p-4 bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-green-200/70 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#138601] dark:text-[#4bd043]" />
                  Live Hero Banner Preview
                </span>
                <span className="text-[11px] text-gray-400">Desktop View Simulation</span>
              </div>

              <div className="relative w-full h-44 rounded-xl overflow-hidden bg-gray-950 flex flex-col justify-end p-6 border border-gray-200 dark:border-[#138601]/40 shadow-inner">
                {headerForm.heroImage ? (
                  <img src={headerForm.heroImage} alt="Hero Preview" className="absolute inset-0 w-full h-full object-cover object-[center_30%]" />
                ) : (
                  <div className="absolute inset-0 bg-gray-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-black/30"></div>

                <div className="relative z-10 text-white">
                  <h2 className="text-2xl font-black tracking-tight drop-shadow-md">
                    {headerForm.heroTitle || 'NACOS EXECUTIVES'}{' '}
                    {headerForm.heroYear && <span className="text-green-400">{headerForm.heroYear}</span>}
                  </h2>
                  <p className="text-xs text-gray-200 max-w-xl mt-1 drop-shadow-sm line-clamp-2">
                    {headerForm.heroSubtitle || 'Meet the team elected to serve and represent the students of the Department of Computer Science.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Form Settings Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 rounded-xl p-6">
              
              {/* Left Column: Text fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-green-200 mb-1">
                    Hero Main Headline
                  </label>
                  <input
                    type="text"
                    value={headerForm.heroTitle}
                    onChange={(e) => setHeaderForm({ ...headerForm, heroTitle: e.target.value })}
                    placeholder="e.g. NACOS EXECUTIVES"
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 rounded-lg text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-green-200 mb-1">
                    Hero Year / Badge
                  </label>
                  <input
                    type="text"
                    value={headerForm.heroYear}
                    onChange={(e) => setHeaderForm({ ...headerForm, heroYear: e.target.value })}
                    placeholder="e.g. 2026"
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 rounded-lg text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-green-200 mb-1">
                    Hero Subtitle & Description
                  </label>
                  <textarea
                    rows={3}
                    value={headerForm.heroSubtitle}
                    onChange={(e) => setHeaderForm({ ...headerForm, heroSubtitle: e.target.value })}
                    placeholder="Meet the team elected to serve..."
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 rounded-lg text-gray-900 dark:text-white"
                  />
                </div>

                <div className="pt-2 border-t border-gray-100 dark:border-[#138601]/20 space-y-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-green-200 mb-1">
                      Current Council Section Title
                    </label>
                    <input
                      type="text"
                      value={headerForm.currentSessionTitle}
                      onChange={(e) => setHeaderForm({ ...headerForm, currentSessionTitle: e.target.value })}
                      placeholder="e.g. Current Executives (2025/2026)"
                      className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 rounded-lg text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-green-200 mb-1">
                      Past Executives Section Title
                    </label>
                    <input
                      type="text"
                      value={headerForm.pastSessionTitle}
                      onChange={(e) => setHeaderForm({ ...headerForm, pastSessionTitle: e.target.value })}
                      placeholder="e.g. Past Executives (2024/2025)"
                      className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 rounded-lg text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Hero Image Upload */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-green-200 mb-2">
                    Hero Group Banner Photo (Cloudinary)
                  </label>
                  
                  <MediaUpload
                    currentImageUrl={headerForm.heroImage}
                    folder={CLOUDINARY_FOLDERS.EXECUTIVES}
                    aspectRatio="banner"
                    label="Upload Executive Banner"
                    helperText="Upload official group photograph (high-res landscape recommended)"
                    onUploadSuccess={({ secure_url }) => {
                      setHeaderForm({ ...headerForm, heroImage: secure_url });
                      showNotice('Group photograph uploaded to Cloudinary!');
                    }}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-500 dark:text-green-200/60 mb-1">
                    Or Direct Image URL
                  </label>
                  <input
                    type="text"
                    value={headerForm.heroImage}
                    onChange={(e) => setHeaderForm({ ...headerForm, heroImage: e.target.value })}
                    placeholder="https://res.cloudinary.com/..."
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 rounded-lg text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSavingHeader}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-lg bg-[#138601] hover:bg-[#0f6c01] text-white shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingHeader ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Header & Section Titles
              </button>
            </div>
          </form>
        )}

      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: ADD / EDIT EXECUTIVE */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl shadow-2xl border bg-white dark:bg-[#083002] border-gray-200 dark:border-[#138601]/40 text-gray-900 dark:text-white overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-[#138601]/25">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-[#138601] dark:text-[#4bd043]" />
                <h2 className="text-base font-black tracking-tight">
                  {modalMode === 'add' ? 'Add New Executive' : 'Edit Executive Profile'}
                </h2>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#041801] text-gray-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveModal} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-green-200 mb-1">
                  Full Name & Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Comrade Okolie Chinaemereme E."
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 rounded-lg text-gray-900 dark:text-white focus:outline-hidden focus:border-[#138601]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-green-200 mb-1">
                  Office / Position *
                </label>
                <input
                  type="text"
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g. Vice President, Director of ICT"
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 rounded-lg text-gray-900 dark:text-white focus:outline-hidden focus:border-[#138601]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-green-200 mb-1">
                    Classification
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 rounded-lg text-gray-900 dark:text-white"
                  >
                    <option value="current">Current Council</option>
                    <option value="past">Past Executives Archive</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-green-200">
                      Session / Tenure
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsQuickAddingTenure(!isQuickAddingTenure)}
                      className="text-[11px] font-semibold text-[#138601] dark:text-[#4bd043] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      {isQuickAddingTenure ? 'Select Existing' : 'New Tenure'}
                    </button>
                  </div>

                  {isQuickAddingTenure ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newTenureInput}
                        onChange={(e) => setNewTenureInput(e.target.value)}
                        placeholder="e.g. 2026/2027"
                        className="flex-1 px-3 py-2 text-xs bg-gray-50 dark:bg-[#041801] border border-[#138601]/50 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#138601]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newTenureInput.trim()) {
                            const added = handleSaveNewTenure(newTenureInput.trim());
                            setFormData({ ...formData, session: added });
                          }
                        }}
                        className="px-3 py-2 text-xs font-bold rounded-lg bg-[#138601] text-white hover:bg-[#0f6c01] cursor-pointer"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsQuickAddingTenure(false)}
                        className="p-1.5 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <select
                      value={formData.session}
                      onChange={(e) => setFormData({ ...formData, session: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#138601]"
                    >
                      {tenures.map((tenure) => (
                        <option key={tenure} value={tenure}>
                          {tenure}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Cloudinary Portrait Upload */}
              <div className="pt-2 border-t border-gray-100 dark:border-[#138601]/20">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-green-200 mb-2">
                  Executive Portrait Photo (Cloudinary)
                </label>
                
                <MediaUpload
                  currentImageUrl={formData.image}
                  folder={CLOUDINARY_FOLDERS.EXECUTIVES}
                  aspectRatio="portrait"
                  label="Upload Portrait Photo"
                  helperText="Upload official studio portrait photo"
                  onUploadSuccess={({ secure_url, public_id }) => {
                    setFormData({
                      ...formData,
                      image: secure_url,
                      cloudinary_public_id: public_id
                    });
                    showNotice('Portrait photo uploaded to Cloudinary!');
                  }}
                />

                <div className="mt-2">
                  <input
                    type="text"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="Or paste external image URL..."
                    className="w-full px-3 py-1.5 text-[11px] bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 rounded-lg text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-gray-200 dark:border-[#138601]/25 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-gray-200 dark:border-[#138601]/30 hover:bg-gray-100 dark:hover:bg-[#041801] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-[#138601] hover:bg-[#0f6c01] text-white transition-colors cursor-pointer"
                >
                  {modalMode === 'add' ? 'Save Executive' : 'Update Profile'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: ARCHIVE ENTIRE TENURE */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl shadow-2xl border bg-white dark:bg-[#083002] border-gray-200 dark:border-[#138601]/40 text-gray-900 dark:text-white overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
              <Archive className="w-6 h-6" />
              <h2 className="text-base font-black">Archive Entire Executive Tenure</h2>
            </div>

            <p className="text-xs text-gray-600 dark:text-green-200/80 leading-relaxed">
              This action will transition <strong>all {executives.filter(e => e.category === 'current').length} currently active executives</strong> into the historical Past Executives archive under the specified session label. Their order will be fully preserved.
            </p>

            <form onSubmit={handleExecuteArchive} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-green-200 mb-1">
                  Session to Archive As:
                </label>
                <input
                  type="text"
                  required
                  value={archiveSessionInput}
                  onChange={(e) => setArchiveSessionInput(e.target.value)}
                  placeholder="e.g. 2025/2026"
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 rounded-lg text-gray-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-green-200 mb-1">
                  New Incoming Tenure Session:
                </label>
                <input
                  type="text"
                  required
                  value={newTenureSessionInput}
                  onChange={(e) => setNewTenureSessionInput(e.target.value)}
                  placeholder="e.g. 2026/2027"
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 rounded-lg text-gray-900 dark:text-white font-mono"
                />
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-[#138601]/25 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsArchiveModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-gray-200 dark:border-[#138601]/30 hover:bg-gray-100 dark:hover:bg-[#041801] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                >
                  Confirm & Archive Council
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: ADD NEW TENURE */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isAddTenureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-2xl shadow-2xl border bg-white dark:bg-[#083002] border-gray-200 dark:border-[#138601]/40 text-gray-900 dark:text-white overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
                Add New Executive Tenure
              </h2>
              <button
                type="button"
                onClick={() => setIsAddTenureModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-xs text-gray-500 dark:text-green-200/70">
              Enter the academic tenure session label (e.g. <strong>2026/2027</strong>). Once added, it will immediately be available in all executive forms and public dropdowns.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveNewTenure();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-green-200 mb-1">
                  Tenure Session Label
                </label>
                <input
                  type="text"
                  required
                  value={newTenureInput}
                  onChange={(e) => setNewTenureInput(e.target.value)}
                  placeholder="e.g. 2026/2027"
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 rounded-lg text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-[#138601]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#138601]/20">
                <button
                  type="button"
                  onClick={() => setIsAddTenureModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-gray-200 dark:border-[#138601]/30 hover:bg-gray-100 dark:hover:bg-[#041801] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-[#138601] hover:bg-[#0f6c01] text-white cursor-pointer"
                >
                  Save Tenure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </WebsiteAdminLayout>
  );
};

export default AdminExecutives;
