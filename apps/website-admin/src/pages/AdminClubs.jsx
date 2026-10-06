import React, { useState, useEffect } from 'react';
import WebsiteAdminLayout from '../components/WebsiteAdminLayout';
import { 
  Users, 
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
  Edit3
} from 'lucide-react';
import { 
  getCampusClubs, 
  approveCampusClub, 
  denyCampusClub, 
  deleteCampusClub, 
  submitCampusClub,
  updateCampusClub 
} from '@nacos/supabase';
import { MediaUpload, CLOUDINARY_FOLDERS } from '@nacos/media';
import { recordAdminAction } from '@nacos/supabase/adminAuth';

const AdminClubs = () => {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [notification, setNotification] = useState({ message: '', type: '' });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedClubId, setSelectedClubId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Software Engineering',
    description: '',
    image: '',
    leadName: '',
    link: ''
  });

  useEffect(() => {
    loadClubs();
    const handleUpdate = () => loadClubs();
    window.addEventListener('nacos_campus_clubs_updated', handleUpdate);
    return () => window.removeEventListener('nacos_campus_clubs_updated', handleUpdate);
  }, []);

  const loadClubs = () => {
    setLoading(true);
    setClubs(getCampusClubs('all'));
    setLoading(false);
  };

  const showNotice = (msg, type = 'success') => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 4000);
  };

  const handleOpenAdd = () => {
    setModalMode('add');
    setSelectedClubId(null);
    setFormData({
      name: '',
      category: 'Software Engineering',
      description: '',
      image: '',
      leadName: '',
      link: ''
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (club) => {
    setModalMode('edit');
    setSelectedClubId(club.id);
    setFormData({
      name: club.name || '',
      category: club.category || 'Software Engineering',
      description: club.description || '',
      image: club.image || '',
      leadName: club.leadName || '',
      link: club.link || '',
      status: club.status || 'approved'
    });
    setIsAddModalOpen(true);
  };

  const handleApprove = async (club) => {
    approveCampusClub(club.id);
    await recordAdminAction('approve_campus_club', 'club', club.id, { name: club.name });
    showNotice(`Club "${club.name}" approved and published!`);
    loadClubs();
  };

  const handleDeny = async (club) => {
    denyCampusClub(club.id);
    await recordAdminAction('deny_campus_club', 'club', club.id, { name: club.name });
    showNotice(`Club "${club.name}" denied.`, 'error');
    loadClubs();
  };

  const handleDelete = async (club) => {
    if (window.confirm(`Delete campus club "${club.name}"?`)) {
      deleteCampusClub(club.id);
      await recordAdminAction('delete_campus_club', 'club', club.id, { name: club.name });
      showNotice(`Club "${club.name}" deleted.`);
      loadClubs();
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (modalMode === 'edit' && selectedClubId) {
      await updateCampusClub(selectedClubId, formData);
      await recordAdminAction('update_campus_club', 'club', selectedClubId, {
        name: formData.name,
        category: formData.category
      });
      showNotice(`Club "${formData.name}" updated successfully!`);
    } else {
      submitCampusClub({
        ...formData,
        status: 'approved'
      });
      await recordAdminAction('create_campus_club', 'club', formData.name, { category: formData.category });
      showNotice(`Club "${formData.name}" added successfully!`);
    }

    setIsAddModalOpen(false);
    loadClubs();
  };

  const filtered = clubs.filter((c) => {
    if (selectedStatus !== 'all' && c.status !== selectedStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = (c.name || '').toLowerCase().includes(q);
      const matchCat = (c.category || '').toLowerCase().includes(q);
      if (!matchName && !matchCat) return false;
    }
    return true;
  });

  const pendingCount = clubs.filter(c => c.status === 'pending').length;

  return (
    <WebsiteAdminLayout
      title="Campus Clubs & Communities Management"
      subtitle="Review, approve, and manage official student tech clubs and departmental societies."
    >
      <div className="space-y-6">

        {notification.message && (
          <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            notification.type === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/60 dark:text-red-300'
              : 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-950/60 dark:text-green-300'
          }`}>
            {notification.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            <span>{notification.message}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#138601] dark:text-[#4bd043] flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Active Student Clubs</h2>
              <p className="text-xs text-gray-500 dark:text-green-200/60">
                {clubs.length} registered · <strong className="text-amber-600">{pendingCount} awaiting approval</strong>
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Club</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 rounded-xl p-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search club name or category..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:border-[#138601]"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-800 dark:text-white focus:outline-none focus:border-[#138601]"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending Approval ({pendingCount})</option>
            <option value="approved">Approved & Live</option>
            <option value="denied">Denied</option>
          </select>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((club) => (
            <div
              key={club.id}
              className="bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-video bg-gray-100 dark:bg-black/40 overflow-hidden">
                  <img
                    src={club.image || 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=800&q=80'}
                    alt={club.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2.5 right-2.5">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      club.status === 'approved'
                        ? 'bg-green-600 text-white'
                        : club.status === 'pending'
                        ? 'bg-amber-500 text-white animate-pulse'
                        : 'bg-red-600 text-white'
                    }`}>
                      {club.status === 'approved' ? 'Live' : club.status === 'pending' ? 'Pending' : 'Denied'}
                    </span>
                  </div>
                  <div className="absolute bottom-2.5 left-2.5">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/75 text-white backdrop-blur-xs">
                      {club.category}
                    </span>
                  </div>
                </div>

                <div className="p-4 sm:p-5 space-y-2">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug">
                    {club.name}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-green-200/80 line-clamp-2 leading-relaxed">
                    {club.description}
                  </p>
                  <div className="pt-2 border-t border-gray-100 dark:border-[#138601]/20 text-[11px] text-gray-500 dark:text-green-200/70">
                    Lead: <strong className="text-gray-800 dark:text-white">{club.leadName || 'Student Leadership'}</strong>
                  </div>
                </div>
              </div>

              <div className="p-4 pt-0">
                <div className="pt-3 border-t border-gray-100 dark:border-[#138601]/20 flex items-center justify-between gap-2">
                  {club.status === 'pending' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApprove(club)}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-[#138601] hover:bg-[#0f6c01] text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeny(club)}
                        className="py-1.5 px-3 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Deny
                      </button>
                    </>
                  ) : (
                    <span className="text-[11px] text-gray-400">
                      {club.status === 'approved' ? 'Verified Club' : 'Rejected'}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(club)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-[#138601] hover:bg-green-50 dark:hover:bg-[#041801] transition-colors cursor-pointer ml-auto"
                    title="Edit Campus Club"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(club)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    title="Delete Campus Club"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add / Edit Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#083002] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-[#138601]/40 space-y-4 max-h-[90vh] overflow-y-auto text-gray-900 dark:text-white">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#138601]/20">
                <h3 className="text-base font-bold">
                  {modalMode === 'edit' ? 'Edit Campus Club' : 'Register Campus Club'}
                </h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 cursor-pointer">✕</button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold mb-1">Club / Community Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. AWS Cloud Club FUTO"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] focus:outline-none focus:border-[#138601]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1">Category</label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="e.g. Cloud & AI"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] focus:outline-none focus:border-[#138601]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Lead / Ambassador Name</label>
                    <input
                      type="text"
                      value={formData.leadName}
                      onChange={(e) => setFormData(prev => ({ ...prev, leadName: e.target.value }))}
                      placeholder="Student Lead"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] focus:outline-none focus:border-[#138601]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Club mission and meeting schedules..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] focus:outline-none focus:border-[#138601]"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Join Link / Community URL</label>
                  <input
                    type="url"
                    value={formData.link}
                    onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                    placeholder="https://chat.whatsapp.com/..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] focus:outline-none focus:border-[#138601]"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Club Cover / Flyer Image</label>
                  <MediaUpload
                    folder={CLOUDINARY_FOLDERS.GENERAL}
                    aspectRatio="landscape"
                    currentImageUrl={formData.image}
                    onUploadSuccess={(asset) => {
                      setFormData(prev => ({ ...prev, image: asset.secure_url || asset.url }));
                    }}
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100 dark:border-[#138601]/20">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-gray-600 bg-gray-100 dark:bg-white/10 dark:text-gray-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg text-white bg-[#138601] hover:bg-[#0f6c01] font-bold shadow-xs cursor-pointer"
                  >
                    {modalMode === 'edit' ? 'Save Changes' : 'Publish Club'}
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

export default AdminClubs;
