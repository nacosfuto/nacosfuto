import React, { useState, useEffect } from 'react';
import WebsiteAdminLayout from '../components/WebsiteAdminLayout';
import { 
  Heart, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Search, 
  ExternalLink, 
  Globe, 
  AlertCircle, 
  CheckCircle,
  Tag,
  Edit3,
  MapPin,
  Calendar,
  Clock
} from 'lucide-react';
import { 
  getSpiritualFellowships, 
  approveSpiritualFellowship, 
  denySpiritualFellowship, 
  deleteSpiritualFellowship, 
  submitSpiritualFellowship,
  updateSpiritualFellowship,
  fetchSpiritualFellowshipsFromSupabase
} from '@nacos/supabase';
import { MediaUpload, CLOUDINARY_FOLDERS } from '@nacos/media';
import { recordAdminAction } from '@nacos/supabase/adminAuth';

const AdminSpiritualLife = () => {
  const [fellowships, setFellowships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [notification, setNotification] = useState({ message: '', type: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedId, setSelectedId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Interdenominational',
    venue: '',
    meetingTimes: '',
    leadName: '',
    description: '',
    image: '',
    link: ''
  });

  useEffect(() => {
    loadFellowships();
    const handleUpdate = () => loadFellowships();
    window.addEventListener('nacos_spiritual_life_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('nacos_spiritual_life_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const loadFellowships = async () => {
    setLoading(true);
    try {
      const live = await fetchSpiritualFellowshipsFromSupabase('all');
      if (Array.isArray(live)) {
        setFellowships(live);
      } else {
        setFellowships(getSpiritualFellowships('all'));
      }
    } catch (e) {
      setFellowships(getSpiritualFellowships('all'));
    }
    setLoading(false);
  };

  const showNotice = (msg, type = 'success') => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 4000);
  };

  const handleOpenAdd = () => {
    setModalMode('add');
    setSelectedId(null);
    setFormData({
      name: '',
      category: 'Interdenominational',
      venue: '',
      meetingTimes: '',
      leadName: '',
      description: '',
      image: '',
      link: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (fel) => {
    setModalMode('edit');
    setSelectedId(fel.id);
    setFormData({
      name: fel.name || '',
      category: fel.category || 'Interdenominational',
      venue: fel.venue || '',
      meetingTimes: fel.meetingTimes || '',
      leadName: fel.leadName || '',
      description: fel.description || '',
      image: fel.image || '',
      link: fel.link || '',
      status: fel.status || 'approved'
    });
    setIsModalOpen(true);
  };

  const handleApprove = async (fel) => {
    await approveSpiritualFellowship(fel.id);
    await recordAdminAction('approve_spiritual_fellowship', 'spiritual_life', fel.id, { name: fel.name });
    showNotice(`Fellowship "${fel.name}" approved and published!`);
    await loadFellowships();
  };

  const handleDeny = async (fel) => {
    await denySpiritualFellowship(fel.id);
    await recordAdminAction('deny_spiritual_fellowship', 'spiritual_life', fel.id, { name: fel.name });
    showNotice(`Fellowship "${fel.name}" denied.`, 'error');
    await loadFellowships();
  };

  const handleDelete = async (fel) => {
    if (window.confirm(`Delete spiritual fellowship "${fel.name}" from directory?`)) {
      await deleteSpiritualFellowship(fel.id);
      await recordAdminAction('delete_spiritual_fellowship', 'spiritual_life', fel.id, { name: fel.name });
      showNotice(`Fellowship "${fel.name}" deleted.`);
      await loadFellowships();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (modalMode === 'edit' && selectedId) {
      await updateSpiritualFellowship(selectedId, formData);
      await recordAdminAction('update_spiritual_fellowship', 'spiritual_life', selectedId, {
        name: formData.name,
        category: formData.category
      });
      showNotice(`Fellowship "${formData.name}" updated successfully!`);
    } else {
      await submitSpiritualFellowship({
        ...formData,
        status: 'approved'
      });
      await recordAdminAction('create_spiritual_fellowship', 'spiritual_life', formData.name, { category: formData.category });
      showNotice(`Fellowship "${formData.name}" added successfully!`);
    }

    setIsModalOpen(false);
    await loadFellowships();
  };

  const filteredFellowships = fellowships.filter(fel => {
    const matchesSearch = 
      fel.name?.toLowerCase().includes(search.toLowerCase()) ||
      fel.leadName?.toLowerCase().includes(search.toLowerCase()) ||
      fel.category?.toLowerCase().includes(search.toLowerCase()) ||
      fel.venue?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || fel.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: fellowships.length,
    approved: fellowships.filter(f => f.status === 'approved').length,
    pending: fellowships.filter(f => f.status === 'pending').length,
    denied: fellowships.filter(f => f.status === 'denied').length
  };

  return (
    <WebsiteAdminLayout
      title="Spiritual Life & Fellowships Manager"
      subtitle="Review student fellowship submissions, chaplaincy listings, service times, and community links."
    >
      <div className="space-y-6">

        {/* Notification Toast */}
        {notification.message && (
          <div className={`p-4 rounded-xl flex items-center justify-between shadow-lg text-white animate-in fade-in ${
            notification.type === 'error' ? 'bg-red-600' : 'bg-[#138601]'
          }`}>
            <div className="flex items-center space-x-2 text-sm font-medium">
              {notification.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification({ message: '', type: '' })}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30">
            <span className="text-xs text-gray-500 dark:text-green-200/70 font-semibold uppercase">Total Fellowships</span>
            <p className="text-2xl font-black mt-1 text-gray-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30">
            <span className="text-xs text-[#138601] dark:text-[#4bd043] font-semibold uppercase">Published Active</span>
            <p className="text-2xl font-black mt-1 text-[#138601] dark:text-[#4bd043]">{stats.approved}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30">
            <span className="text-xs text-amber-500 font-semibold uppercase">Pending Approval</span>
            <p className="text-2xl font-black mt-1 text-amber-500">{stats.pending}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30">
            <span className="text-xs text-red-500 font-semibold uppercase">Denied Requests</span>
            <p className="text-2xl font-black mt-1 text-red-500">{stats.denied}</p>
          </div>
        </div>

        {/* Action Header & Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-[#083002] p-4 rounded-2xl border border-gray-200 dark:border-[#138601]/30 shadow-xs">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search fellowships, venue, lead..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-[#138601]/40 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#138601]"
              />
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="py-2 px-3 text-xs rounded-xl border border-gray-200 dark:border-[#138601]/40 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="denied">Denied</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="w-full sm:w-auto px-4 py-2 bg-[#138601] hover:bg-[#0f6c01] text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-2 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Fellowship</span>
          </button>
        </div>

        {/* Fellowships List Table / Cards */}
        <div className="bg-white dark:bg-[#083002] rounded-2xl border border-gray-200 dark:border-[#138601]/30 overflow-hidden shadow-xs">
          {loading ? (
            <div className="p-8 text-center text-xs text-gray-500 dark:text-green-200/60">
              Loading fellowships database...
            </div>
          ) : filteredFellowships.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-500 dark:text-green-200/60">
              No spiritual fellowships found matching the active filters.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-[#138601]/20">
              {filteredFellowships.map((fel) => (
                <div key={fel.id} className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-gray-50/50 dark:hover:bg-[#041801]/30 transition-colors">
                  
                  {/* Left: Image & Info */}
                  <div className="flex items-start space-x-4">
                    <img
                      src={fel.image || 'https://images.unsplash.com/photo-1548625361-12503a277713?auto=format&fit=crop&w=400&q=80'}
                      alt={fel.name}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover shrink-0 border border-gray-100 dark:border-[#138601]/30"
                    />
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                          {fel.name}
                        </h4>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#041801] text-gray-700 dark:text-green-200 border border-gray-200 dark:border-[#138601]/30">
                          {fel.category}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          fel.status === 'approved' ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300' :
                          fel.status === 'pending' ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300' :
                          'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                        }`}>
                          {fel.status}
                        </span>
                      </div>

                      <p className="text-xs text-gray-500 dark:text-green-200/70 mt-1 line-clamp-2 max-w-2xl">
                        {fel.description}
                      </p>

                      <div className="flex items-center space-x-4 mt-2 text-[11px] text-gray-400 dark:text-green-200/50 flex-wrap gap-y-1">
                        {fel.venue && (
                          <span className="flex items-center gap-1 text-[#138601] dark:text-[#4bd043]">
                            <MapPin className="w-3 h-3" />
                            {fel.venue}
                          </span>
                        )}
                        {fel.meetingTimes && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {fel.meetingTimes}
                          </span>
                        )}
                        {fel.leadName && <span>• Led by: {fel.leadName}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
                    {fel.link && (
                      <a
                        href={fel.link}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#041801] transition-colors"
                        title="Open WhatsApp/Contact Link"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(fel)}
                      className="p-2 rounded-lg text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                      title="Edit Fellowship"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {fel.status !== 'approved' && (
                      <button
                        type="button"
                        onClick={() => handleApprove(fel)}
                        className="p-2 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors"
                        title="Approve & Publish"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}

                    {fel.status !== 'denied' && (
                      <button
                        type="button"
                        onClick={() => handleDeny(fel)}
                        className="p-2 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                        title="Deny Fellowship"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(fel)}
                      className="p-2 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 text-gray-900 dark:text-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-gray-100 dark:border-[#138601]/30 flex items-center justify-between">
              <h3 className="text-base font-bold">
                {modalMode === 'edit' ? 'Edit Campus Fellowship' : 'Add New Campus Fellowship'}
              </h3>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-gray-700 dark:text-green-200">
                  Fellowship / Community Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. National Federation of Catholic Students (NFCS)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#138601]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-gray-700 dark:text-green-200">
                    Category / Denomination *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none"
                  >
                    <option value="Catholic">Catholic</option>
                    <option value="Protestant">Protestant</option>
                    <option value="Pentecostal">Pentecostal</option>
                    <option value="Interdenominational">Interdenominational</option>
                    <option value="Muslim / MSSN">Muslim / MSSN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-gray-700 dark:text-green-200">
                    Leader / President / Amir
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bro. Paschal Nwankwo"
                    value={formData.leadName}
                    onChange={(e) => setFormData({ ...formData, leadName: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-gray-700 dark:text-green-200">
                    Meeting Venue
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. STACC Chaplaincy, FUTO"
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-gray-700 dark:text-green-200">
                    Meeting Days & Times
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sundays 8:00 AM • Wed 5:00 PM"
                    value={formData.meetingTimes}
                    onChange={(e) => setFormData({ ...formData, meetingTimes: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-gray-700 dark:text-green-200">
                  Flyer / Cover Photo
                </label>
                <div className="mb-2">
                  <MediaUpload
                    folder={CLOUDINARY_FOLDERS.GENERAL || 'spiritual'}
                    onSuccess={({ url }) => setFormData({ ...formData, image: url })}
                  />
                </div>
                {formData.image && (
                  <div className="w-full h-24 rounded-lg overflow-hidden border border-gray-200 dark:border-[#138601]/30">
                    <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-gray-700 dark:text-green-200">
                  Description *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe fellowship mission and activities..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-gray-700 dark:text-green-200">
                  WhatsApp Group / Community Link *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://chat.whatsapp.com/..."
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-gray-100 dark:border-[#138601]/20">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-[#138601]/40 rounded-xl text-xs font-semibold hover:bg-gray-100 dark:hover:bg-[#041801] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#138601] hover:bg-[#0f6c01] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  {modalMode === 'edit' ? 'Update Fellowship' : 'Save & Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </WebsiteAdminLayout>
  );
};

export default AdminSpiritualLife;
