import React, { useState, useEffect, useMemo } from 'react';
import PortalAdminLayout from '../components/PortalAdminLayout';
import { 
  Bell, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Eye, 
  Users, 
  Calendar, 
  Building2, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Check, 
  Send
} from 'lucide-react';
import { 
  fetchNotices, 
  adminCreateNotice, 
  adminUpdateNotice, 
  adminDeleteNotice,
  adminTogglePopup,
  supabase
} from '@nacos/supabase';

export default function PortalAdminNotices() {
  const [notices, setNotices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [previewNotice, setPreviewNotice] = useState(null);
  const [deleteConfirmNotice, setDeleteConfirmNotice] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    target_audience: 'ALL STUDENTS',
    category: 'Admissions',
    author_unit: 'Admissions Unit',
    content: '',
    is_popup: true,
    is_urgent: true,
    is_published: true
  });

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetchNotices({ activeOnly: false });
      if (res.data) {
        setNotices(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('nacos_notices_updated', handleUpdate);

    let channel = null;
    if (supabase) {
      channel = supabase
        .channel('admin-notices-live-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
          loadData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'id_card_settings' }, () => {
          loadData();
        })
        .subscribe();
    }

    return () => {
      window.removeEventListener('nacos_notices_updated', handleUpdate);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const handleOpenCreate = () => {
    setFormData({
      title: '',
      target_audience: 'ALL STUDENTS',
      category: 'Academic',
      author_unit: 'Admissions Unit',
      content: '',
      is_popup: false,
      is_urgent: false,
      is_published: true
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (notice) => {
    setEditingNotice(notice);
    setFormData({
      title: notice.title || '',
      target_audience: notice.target_audience || 'ALL STUDENTS',
      category: notice.category || 'General',
      author_unit: notice.author_unit || 'Admissions Unit',
      content: notice.content || '',
      is_popup: Boolean(notice.is_popup),
      is_urgent: Boolean(notice.is_urgent),
      is_published: notice.is_published !== false
    });
  };

  const handleSaveNotice = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      showToast('Please enter both title and notice content', 'error');
      return;
    }

    try {
      if (editingNotice) {
        await adminUpdateNotice(editingNotice.id, {
          title: formData.title.toUpperCase(),
          target_audience: formData.target_audience,
          category: formData.category,
          author_unit: formData.author_unit,
          content: formData.content,
          is_popup: formData.is_popup,
          is_urgent: formData.is_urgent || formData.is_popup,
          is_published: formData.is_published
        });
        showToast('Notice updated successfully');
        setEditingNotice(null);
      } else {
        await adminCreateNotice({
          ...formData,
          title: formData.title.toUpperCase()
        });
        showToast(formData.is_popup ? 'Urgent pop-up notice created & published!' : 'Notice published to bulletin');
        setIsCreateModalOpen(false);
      }
      loadData();
    } catch (err) {
      showToast(err.message || 'Error saving notice', 'error');
    }
  };

  const handleTogglePopup = async (notice) => {
    const nextState = !notice.is_popup;
    try {
      await adminTogglePopup(notice.id, nextState);
      showToast(nextState ? `"${notice.title}" is now active login pop-up!` : 'Login pop-up disabled');
      loadData();
    } catch (err) {
      showToast('Failed to update pop-up status', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmNotice) return;
    try {
      await adminDeleteNotice(deleteConfirmNotice.id);
      showToast('Notice deleted');
      setDeleteConfirmNotice(null);
      loadData();
    } catch (err) {
      showToast('Failed to delete notice', 'error');
    }
  };

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return notices;
    const q = searchQuery.toLowerCase();
    return notices.filter(n => 
      n.title.toLowerCase().includes(q) ||
      n.author_unit.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.target_audience.toLowerCase().includes(q)
    );
  }, [notices, searchQuery]);

  return (
    <PortalAdminLayout>
      <div className="space-y-6">
        {/* Toast alert */}
        {toastMessage && (
          <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-bottom-5 ${
            toastMessage.type === 'error' ? 'bg-red-600 text-white' : 'bg-[#138601] text-white'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Page Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#083002] p-5 sm:p-6 rounded-xl border border-gray-200 dark:border-[#138601]/25 shadow-xs">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#138601] dark:text-[#4bd043] uppercase tracking-wider mb-1">
              <Bell className="w-3.5 h-3.5" />
              <span>Student Notice Gateway</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
              Academic Bulletins & Pop-Up Notices
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-green-200/80 mt-1">
              Broadcast official circulars to the student portal and push urgent pop-up notices on student login.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#138601] hover:bg-[#0f6c01] text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Notice</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white dark:bg-[#083002] rounded-xl p-4 border border-gray-200 dark:border-[#138601]/25 shadow-xs flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by title, audience, or unit..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-lg border border-gray-200 dark:border-[#138601]/30 bg-gray-50/50 dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#138601]"
            />
          </div>
          <div className="text-xs font-semibold text-gray-500 dark:text-green-200/80 shrink-0">
            Total Notices: {notices.length}
          </div>
        </div>

        {/* Notices Table / Grid */}
        <div className="bg-white dark:bg-[#083002] rounded-xl border border-gray-200 dark:border-[#138601]/25 shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-gray-500">Loading notices...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Bell className="w-8 h-8 text-gray-400 mx-auto" />
              <p className="text-sm font-bold text-gray-800 dark:text-white">No notices found</p>
              <p className="text-xs text-gray-500">Create your first departmental notice or adjust your search.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-[#138601]/15">
              {filtered.map((notice) => {
                const isPopup = Boolean(notice.is_popup);

                return (
                  <div key={notice.id} className="p-5 sm:p-6 hover:bg-gray-50/60 dark:hover:bg-[#062602]/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Purple Audience Pill */}
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-[#ede9fe] text-[#6d28d9] dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40">
                          <Users className="w-3 h-3" />
                          <span>{notice.target_audience}</span>
                        </span>

                        {/* Pop-up Push status */}
                        {isPopup ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300 border border-green-300/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-ping" />
                            <span>Active Login Pop-up</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 px-2 py-0.5 rounded bg-gray-100 dark:bg-[#041801]">
                            Bulletin Only
                          </span>
                        )}

                        {notice.is_urgent && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-300/50">
                            <AlertCircle className="w-3 h-3" />
                            <span>Urgent Alert</span>
                          </span>
                        )}

                        <span className="text-xs text-gray-400 dark:text-gray-400 ml-auto md:ml-0">
                          {notice.published_date}
                        </span>
                      </div>

                      <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">
                        {notice.title}
                      </h3>

                      <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                        {notice.content}
                      </p>

                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-green-200/70 pt-1">
                        <Building2 className="w-3.5 h-3.5 text-[#138601]" />
                        <span className="font-semibold">{notice.author_unit}</span>
                      </div>
                    </div>

                    {/* Action Buttons Strip */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100 dark:border-white/10">
                      {/* Toggle Urgent Pop-up */}
                      <button
                        type="button"
                        onClick={() => handleTogglePopup(notice)}
                        className={`px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer border ${
                          isPopup
                            ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                            : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 dark:bg-[#041801] dark:text-gray-300 dark:border-[#138601]/30'
                        }`}
                        title={isPopup ? 'Click to disable login pop-up' : 'Click to make this pop up on student login'}
                      >
                        {isPopup ? 'Disable Pop-up' : 'Set as Login Pop-up'}
                      </button>

                      {/* Preview */}
                      <button
                        type="button"
                        onClick={() => setPreviewNotice(notice)}
                        className="p-2 rounded text-gray-600 hover:text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#041801] transition-colors cursor-pointer border border-transparent hover:border-gray-200"
                        title="Preview student pop-up"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(notice)}
                        className="p-2 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-[#041801] transition-colors cursor-pointer border border-transparent hover:border-blue-200"
                        title="Edit Notice"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmNotice(notice)}
                        className="p-2 rounded text-red-600 hover:bg-red-50 dark:hover:bg-[#041801] transition-colors cursor-pointer border border-transparent hover:border-red-200"
                        title="Delete Notice"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal: Create or Edit Notice */}
        {(isCreateModalOpen || editingNotice) && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-[#138601]/25 flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {editingNotice ? 'Edit Notice' : 'Broadcast New Notice'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setEditingNotice(null);
                  }}
                  className="text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveNotice} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-green-200 uppercase mb-1">
                    Notice Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NOTICE: O-LEVEL VERIFICATION"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded border border-gray-300 dark:border-[#138601]/30 bg-white dark:bg-[#041801] text-gray-900 dark:text-white font-bold"
                  />
                </div>

                {/* Target Audience & Author Unit */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-green-200 uppercase mb-1">
                      Target Audience
                    </label>
                    <select
                      value={formData.target_audience}
                      onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded border border-gray-300 dark:border-[#138601]/30 bg-white dark:bg-[#041801] text-gray-900 dark:text-white"
                    >
                      <option value="ALL STUDENTS">ALL STUDENTS</option>
                      <option value="100 LEVEL">100 LEVEL</option>
                      <option value="200 LEVEL">200 LEVEL</option>
                      <option value="300 LEVEL">300 LEVEL</option>
                      <option value="400 LEVEL">400 LEVEL</option>
                      <option value="500 LEVEL">500 LEVEL</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-green-200 uppercase mb-1">
                      Issuing Authority / Unit
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Admissions Unit, HOD Office"
                      value={formData.author_unit}
                      onChange={(e) => setFormData({ ...formData, author_unit: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded border border-gray-300 dark:border-[#138601]/30 bg-white dark:bg-[#041801] text-gray-900 dark:text-white font-semibold"
                    />
                  </div>
                </div>

                {/* Content */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-green-200 uppercase mb-1">
                    Notice Message / Directives
                  </label>
                  <textarea
                    required
                    rows={6}
                    placeholder="Enter the official circular or directive paragraphs here..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded border border-gray-300 dark:border-[#138601]/30 bg-white dark:bg-[#041801] text-gray-900 dark:text-white leading-relaxed font-normal"
                  />
                </div>

                {/* Urgent Pop-up Push Checkbox */}
                <div className="p-3.5 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 space-y-1">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_popup}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        is_popup: e.target.checked,
                        is_urgent: e.target.checked ? true : formData.is_urgent
                      })}
                      className="w-4 h-4 text-[#138601] rounded accent-[#138601]"
                    />
                    <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
                      Push as Urgent Pop-up on Student Login
                    </span>
                  </label>
                  <p className="text-[11px] text-purple-700/80 dark:text-purple-300/70 ml-6">
                    When active, any student logging in matching the target audience will immediately be presented with the institutional pop-up dialog.
                  </p>
                </div>

                {/* Mark as Urgent Checkbox */}
                <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 space-y-1">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_urgent}
                      onChange={(e) => setFormData({ ...formData, is_urgent: e.target.checked })}
                      className="w-4 h-4 text-red-600 rounded accent-red-600"
                    />
                    <span className="text-xs font-bold text-red-900 dark:text-red-200">
                      Mark as Urgent Notice (Banner on Student Dashboard)
                    </span>
                  </label>
                  <p className="text-[11px] text-red-700/80 dark:text-red-300/70 ml-6">
                    Highlights this directive prominently as an urgent bulletin banner at the top of the student dashboard.
                  </p>
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200 dark:border-[#138601]/20">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setEditingNotice(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold rounded text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#041801] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold rounded bg-[#138601] hover:bg-[#0f6c01] text-white transition-colors cursor-pointer shadow-xs"
                  >
                    {editingNotice ? 'Update Notice' : 'Publish Notice'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Student Pop-Up Preview */}
        {previewNotice && (
          <div 
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => setPreviewNotice(null)}
          >
            <div 
              className="bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="border-b border-gray-200 dark:border-[#138601]/25 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">General Notice</h3>
                  <span className="text-[10px] font-bold uppercase bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    Admin Preview
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewNotice(null)}
                  className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 sm:p-8 space-y-5">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-bold uppercase bg-[#ede9fe] text-[#6d28d9] border border-purple-200">
                    <Users className="w-3.5 h-3.5" />
                    <span>{(previewNotice.target_audience || 'ALL STUDENTS').toUpperCase()}</span>
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-2 border-b border-gray-100 pb-4">
                  <h3 className="text-base sm:text-lg font-extrabold text-[#111827] dark:text-white uppercase">
                    {previewNotice.title}
                  </h3>
                  <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
                    {previewNotice.published_date}
                  </span>
                </div>

                <div className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed space-y-4">
                  {previewNotice.content.split('\n\n').map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>

                <div className="pt-2">
                  <p className="text-sm font-bold text-[#111827] dark:text-white">
                    {previewNotice.author_unit || 'Admissions Unit'}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-100 px-6 py-3.5 bg-gray-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setPreviewNotice(null)}
                  className="px-4 py-2 text-xs font-semibold rounded bg-[#138601] text-white cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Delete Confirmation */}
        {deleteConfirmNotice && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Delete Notice?</h3>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                Are you sure you want to permanently remove <strong>"{deleteConfirmNotice.title}"</strong>?
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmNotice(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-600 rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PortalAdminLayout>
  );
}
