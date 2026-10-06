import React, { useState, useEffect } from 'react';
import WebsiteAdminLayout from '../components/WebsiteAdminLayout';
import { 
  Building2, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Search, 
  ExternalLink, 
  Phone, 
  MapPin, 
  Star, 
  AlertCircle, 
  CheckCircle,
  Clock,
  Eye,
  Tag,
  Edit3
} from 'lucide-react';
import { 
  getYellowPages, 
  approveYellowPageBusiness, 
  denyYellowPageBusiness, 
  deleteYellowPageBusiness, 
  submitYellowPageBusiness,
  updateYellowPageBusiness,
  fetchYellowPagesFromSupabase
} from '@nacos/supabase';
import { MediaUpload, CLOUDINARY_FOLDERS } from '@nacos/media';
import { recordAdminAction } from '@nacos/supabase/adminAuth';

const AdminYellowPages = () => {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [notification, setNotification] = useState({ message: '', type: '' });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedBizId, setSelectedBizId] = useState(null);

  // New Business Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'Food & Drinks',
    ownerName: '',
    ownerLevel: 'Student Business',
    description: '',
    location: 'FUTO Campus / Hostel Area',
    phone: '',
    whatsapp: '',
    image: '',
    imagePosition: 'top center',
    rating: 5.0,
    reviewsCount: 1
  });

  const categories = [
    'Food & Drinks',
    'Tech & Coding',
    'Graphics & Printing',
    'Fashion & Styling',
    'Gadgets & Repairs',
    'Tutoring & Books',
    'Other Services'
  ];

  useEffect(() => {
    loadBusinesses();
    const handleUpdate = () => loadBusinesses();
    window.addEventListener('nacos_yellow_pages_updated', handleUpdate);
    return () => window.removeEventListener('nacos_yellow_pages_updated', handleUpdate);
  }, []);

  const loadBusinesses = async () => {
    setLoading(true);
    setBusinesses(getYellowPages('all'));
    try {
      const live = await fetchYellowPagesFromSupabase('all');
      if (live && live.length > 0) {
        setBusinesses(live);
      }
    } catch (e) {}
    setLoading(false);
  };

  const showNotice = (msg, type = 'success') => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 4000);
  };

  const handleApprove = async (biz) => {
    approveYellowPageBusiness(biz.id);
    await recordAdminAction('approve_yellow_pages', 'business', biz.id, { name: biz.name });
    showNotice(`Business "${biz.name}" approved and published to Yellow Pages!`);
    loadBusinesses();
  };

  const handleDeny = async (biz) => {
    denyYellowPageBusiness(biz.id);
    await recordAdminAction('deny_yellow_pages', 'business', biz.id, { name: biz.name });
    showNotice(`Business "${biz.name}" marked as denied.`, 'error');
    loadBusinesses();
  };

  const handleDelete = async (biz) => {
    if (window.confirm(`Are you sure you want to permanently delete "${biz.name}"?`)) {
      deleteYellowPageBusiness(biz.id);
      await recordAdminAction('delete_yellow_pages', 'business', biz.id, { name: biz.name });
      showNotice(`Business "${biz.name}" deleted successfully.`);
      loadBusinesses();
    }
  };

  const handleOpenAdd = () => {
    setModalMode('add');
    setSelectedBizId(null);
    setFormData({
      name: '',
      category: 'Food & Drinks',
      ownerName: '',
      ownerLevel: 'Student Business',
      description: '',
      location: 'FUTO Campus / Hostel Area',
      phone: '',
      whatsapp: '',
      image: '',
      imagePosition: 'top center',
      rating: 5.0,
      reviewsCount: 1
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (biz) => {
    setModalMode('edit');
    setSelectedBizId(biz.id);
    setFormData({
      name: biz.name || '',
      category: biz.category || 'Food & Drinks',
      ownerName: biz.ownerName || '',
      ownerLevel: biz.ownerLevel || 'Student Business',
      description: biz.description || '',
      location: biz.location || 'FUTO Campus / Hostel Area',
      phone: biz.phone || '',
      whatsapp: biz.whatsapp || '',
      image: biz.image || '',
      imagePosition: biz.imagePosition || 'top center',
      rating: biz.rating || 5.0,
      reviewsCount: biz.reviewsCount || 1,
      status: biz.status || 'approved'
    });
    setIsAddModalOpen(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (modalMode === 'edit' && selectedBizId) {
      await updateYellowPageBusiness(selectedBizId, formData);
      await recordAdminAction('update_yellow_pages', 'business', selectedBizId, {
        name: formData.name,
        category: formData.category
      });
      showNotice(`Business "${formData.name}" updated successfully!`);
    } else {
      await submitYellowPageBusiness({
        ...formData,
        status: 'approved' // Direct admin adds are approved
      });
      await recordAdminAction('create_yellow_pages', 'business', formData.name, {
        category: formData.category,
        owner: formData.ownerName
      });
      showNotice(`Business "${formData.name}" added and published to Yellow Pages!`);
    }

    setIsAddModalOpen(false);
    loadBusinesses();
  };

  const filtered = businesses.filter((b) => {
    if (selectedStatus !== 'all' && b.status !== selectedStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = (b.name || '').toLowerCase().includes(q);
      const matchOwner = (b.ownerName || '').toLowerCase().includes(q);
      const matchCat = (b.category || '').toLowerCase().includes(q);
      if (!matchName && !matchOwner && !matchCat) return false;
    }
    return true;
  });

  const pendingCount = businesses.filter(b => b.status === 'pending').length;

  return (
    <WebsiteAdminLayout
      title="Yellow Pages Directory Management"
      subtitle="Review, approve, reject, and publish indigenous student businesses, brand flyers, and service listings."
    >
      <div className="space-y-6">

        {/* Notification Toast */}
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

        {/* Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Business Directory Listings</h2>
              <p className="text-xs text-gray-500 dark:text-green-200/60">
                {businesses.length} total registered · <strong className="text-amber-600">{pendingCount} awaiting approval</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Business</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 rounded-xl p-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search business name, category, or student owner..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:border-[#138601]"
            />
          </div>

          <div className="flex items-center gap-2">
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
        </div>

        {/* Listings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-[#083002] border border-dashed border-gray-300 dark:border-[#138601]/30 rounded-2xl p-12 text-center text-gray-500">
              <Building2 className="w-10 h-10 mx-auto text-gray-400 mb-2" />
              <p className="font-bold text-gray-700 dark:text-white">No businesses match your filter.</p>
              <p className="text-xs text-gray-400 mt-1">Try switching status filters or adding a new business.</p>
            </div>
          ) : (
            filtered.map((biz) => (
              <div
                key={biz.id}
                className="bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Flyer Image with imagePosition support */}
                  <div className="relative aspect-video bg-gray-100 dark:bg-black/40 overflow-hidden">
                    <img
                      src={biz.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80'}
                      alt={biz.name}
                      style={{ objectPosition: biz.imagePosition || 'center' }}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2.5 right-2.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        biz.status === 'approved'
                          ? 'bg-green-600 text-white'
                          : biz.status === 'pending'
                          ? 'bg-amber-500 text-white animate-pulse'
                          : 'bg-red-600 text-white'
                      }`}>
                        {biz.status === 'approved' ? 'Live' : biz.status === 'pending' ? 'Pending Approval' : 'Denied'}
                      </span>
                    </div>

                    <div className="absolute bottom-2.5 left-2.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/75 text-white backdrop-blur-xs">
                        {biz.category}
                      </span>
                    </div>
                  </div>

                  {/* Content Info */}
                  <div className="p-4 sm:p-5 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug">
                        {biz.name}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-amber-500 font-bold shrink-0">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{biz.rating || 5.0}</span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-600 dark:text-green-200/80 line-clamp-2 leading-relaxed">
                      {biz.description}
                    </p>

                    <div className="space-y-1 pt-2 border-t border-gray-100 dark:border-[#138601]/20 text-[11px] text-gray-500 dark:text-green-200/70">
                      <div>Owner: <strong className="text-gray-800 dark:text-white">{biz.ownerName}</strong> ({biz.ownerLevel})</div>
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3 h-3 text-[#138601]" />
                        <span className="truncate">{biz.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-[#138601]" />
                        <span>{biz.phone || biz.whatsapp || 'Contact via WhatsApp'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Controls */}
                <div className="p-4 pt-0">
                  <div className="pt-3 border-t border-gray-100 dark:border-[#138601]/20 flex items-center justify-between gap-2">
                    {biz.status === 'pending' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApprove(biz)}
                          className="flex-1 py-1.5 px-3 rounded-lg bg-[#138601] hover:bg-[#0f6c01] text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeny(biz)}
                          className="py-1.5 px-3 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-colors cursor-pointer"
                        >
                          Deny
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] text-gray-400">
                        {biz.status === 'approved' ? 'Verified Directory Listing' : 'Listing Rejected'}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(biz)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-[#138601] hover:bg-green-50 dark:hover:bg-[#041801] transition-colors cursor-pointer ml-auto"
                      title="Edit Business Listing"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(biz)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                      title="Permanently Delete Business"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            ))
          )}
        </div>

        {/* Add / Edit Business Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#083002] rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 dark:border-[#138601]/40 space-y-4 max-h-[90vh] overflow-y-auto text-gray-900 dark:text-white">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#138601]/20">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#138601]" />
                  <h3 className="text-base font-bold">
                    {modalMode === 'edit' ? 'Edit Business Listing' : 'Add Business to Yellow Pages'}
                  </h3>
                </div>
                <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer">✕</button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold mb-1">Business / Brand Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Peacemaker Tech or Nina's Luxury Braids"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] focus:outline-none focus:border-[#138601]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] focus:outline-none focus:border-[#138601]"
                    >
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold mb-1">Owner Name / Level</label>
                    <input
                      type="text"
                      value={formData.ownerName}
                      onChange={(e) => setFormData(prev => ({ ...prev, ownerName: e.target.value }))}
                      placeholder="e.g. Somto (300L)"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] focus:outline-none focus:border-[#138601]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-1">Description & Services</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe offerings, special student discounts, delivery options..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] focus:outline-none focus:border-[#138601]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+234..."
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] focus:outline-none focus:border-[#138601]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">WhatsApp Number</label>
                    <input
                      type="text"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                      placeholder="234..."
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] focus:outline-none focus:border-[#138601]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-1">Campus Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g. Hostel B / Eziobodo Market"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] focus:outline-none focus:border-[#138601]"
                  />
                </div>

                {/* Cloudinary Flyer Upload */}
                <div>
                  <label className="block font-bold mb-1">Upload Flyer / Cover Photo (Cloudinary)</label>
                  <MediaUpload
                    folder={CLOUDINARY_FOLDERS.YELLOW_PAGES}
                    aspectRatio="landscape"
                    currentImageUrl={formData.image}
                    onUploadSuccess={(asset) => {
                      setFormData(prev => ({
                        ...prev,
                        image: asset.secure_url || asset.url
                      }));
                    }}
                  />
                </div>

                {/* Image Position Selector per AGENTS.md rule */}
                <div>
                  <label className="block font-bold mb-1">Flyer Brand Logo Crop Position (AGENTS.md Guideline)</label>
                  <select
                    value={formData.imagePosition}
                    onChange={(e) => setFormData(prev => ({ ...prev, imagePosition: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] focus:outline-none focus:border-[#138601]"
                  >
                    <option value="top left">top left (e.g. Peacemaker Tech)</option>
                    <option value="top right">top right (e.g. Niforix)</option>
                    <option value="top center">top center (e.g. Cypher.dev)</option>
                    <option value="center">center</option>
                  </select>
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
                    {modalMode === 'edit' ? 'Save Changes' : 'Publish Business'}
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

export default AdminYellowPages;
