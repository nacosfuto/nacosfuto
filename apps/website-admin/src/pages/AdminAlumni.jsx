import React, { useState, useEffect } from 'react';
import WebsiteAdminLayout from '../components/WebsiteAdminLayout';
import { 
  GraduationCap, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Search, 
  ExternalLink, 
  Linkedin, 
  Building, 
  AlertCircle, 
  CheckCircle,
  Award,
  Edit3
} from 'lucide-react';
import { 
  getAlumni, 
  approveAlumnus, 
  denyAlumnus, 
  deleteAlumnus, 
  submitAlumnus,
  updateAlumnus,
  fetchAlumniFromSupabase
} from '@nacos/supabase';
import { MediaUpload, CLOUDINARY_FOLDERS } from '@nacos/media';
import { recordAdminAction } from '@nacos/supabase/adminAuth';

const AdminAlumni = () => {
  const [alumni, setAlumni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [notification, setNotification] = useState({ message: '', type: '' });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedAlmId, setSelectedAlmId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    gradYear: 'Class of 2024',
    position: '',
    company: '',
    linkedin: '',
    bio: '',
    image: ''
  });

  useEffect(() => {
    loadAlumni();
    const handleUpdate = () => loadAlumni();
    window.addEventListener('nacos_alumni_updated', handleUpdate);
    return () => window.removeEventListener('nacos_alumni_updated', handleUpdate);
  }, []);

  const loadAlumni = async () => {
    setLoading(true);
    setAlumni(getAlumni('all'));
    try {
      const live = await fetchAlumniFromSupabase('all');
      if (live && live.length > 0) {
        setAlumni(live);
      }
    } catch (e) {}
    setLoading(false);
  };

  const showNotice = (msg, type = 'success') => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 4000);
  };

  const handleOpenAdd = () => {
    setModalMode('add');
    setSelectedAlmId(null);
    setFormData({
      name: '',
      gradYear: 'Class of 2024',
      position: '',
      company: '',
      linkedin: '',
      bio: '',
      image: ''
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (alm) => {
    setModalMode('edit');
    setSelectedAlmId(alm.id);
    setFormData({
      name: alm.name || '',
      gradYear: alm.gradYear || 'Class of 2024',
      position: alm.position || '',
      company: alm.company || '',
      linkedin: alm.linkedin || '',
      bio: alm.bio || '',
      image: alm.image || '',
      status: alm.status || 'approved'
    });
    setIsAddModalOpen(true);
  };

  const handleApprove = async (alm) => {
    approveAlumnus(alm.id);
    await recordAdminAction('approve_alumnus', 'alumni', alm.id, { name: alm.name });
    showNotice(`Alumnus "${alm.name}" approved and featured in directory!`);
    loadAlumni();
  };

  const handleDeny = async (alm) => {
    denyAlumnus(alm.id);
    await recordAdminAction('deny_alumnus', 'alumni', alm.id, { name: alm.name });
    showNotice(`Alumnus "${alm.name}" marked as denied.`, 'error');
    loadAlumni();
  };

  const handleDelete = async (alm) => {
    if (window.confirm(`Permanently remove alumnus "${alm.name}"?`)) {
      deleteAlumnus(alm.id);
      await recordAdminAction('delete_alumnus', 'alumni', alm.id, { name: alm.name });
      showNotice(`Alumnus "${alm.name}" removed.`);
      loadAlumni();
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (modalMode === 'edit' && selectedAlmId) {
      await updateAlumnus(selectedAlmId, formData);
      await recordAdminAction('update_alumnus', 'alumni', selectedAlmId, {
        name: formData.name,
        company: formData.company
      });
      showNotice(`Alumnus "${formData.name}" profile updated!`);
    } else {
      submitAlumnus({
        ...formData,
        status: 'approved'
      });

      await recordAdminAction('create_alumnus', 'alumni', formData.name, {
        position: formData.position,
        company: formData.company
      });

      showNotice(`Alumnus "${formData.name}" added to Alumni Hall of Fame!`);
    }

    setIsAddModalOpen(false);
    loadAlumni();
  };

  const filtered = alumni.filter((a) => {
    if (selectedStatus !== 'all' && a.status !== selectedStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = (a.name || '').toLowerCase().includes(q);
      const matchCompany = (a.company || '').toLowerCase().includes(q);
      const matchPos = (a.position || '').toLowerCase().includes(q);
      if (!matchName && !matchCompany && !matchPos) return false;
    }
    return true;
  });

  const pendingCount = alumni.filter(a => a.status === 'pending').length;

  return (
    <WebsiteAdminLayout
      title="Alumni Network & Hall of Fame Management"
      subtitle="Review graduate spotlight requests, manage notable alumni profiles, and celebrate department achievements."
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
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-[#138601] dark:text-[#4bd043] flex items-center justify-center font-bold">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Alumni Profiles & Spotlights</h2>
              <p className="text-xs text-gray-500 dark:text-green-200/60">
                {alumni.length} total graduates · <strong className="text-amber-600">{pendingCount} requests waiting</strong>
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Alumnus</span>
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
              placeholder="Search by name, company, or job role..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:border-[#138601]"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-800 dark:text-white focus:outline-none focus:border-[#138601]"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending Requests ({pendingCount})</option>
            <option value="approved">Approved & Live</option>
            <option value="denied">Denied</option>
          </select>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((alm) => (
            <div
              key={alm.id}
              className="bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-[4/3] bg-gray-100 dark:bg-black/40 overflow-hidden">
                  <img
                    src={alm.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'}
                    alt={alm.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2.5 right-2.5">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      alm.status === 'approved'
                        ? 'bg-green-600 text-white'
                        : alm.status === 'pending'
                        ? 'bg-amber-500 text-white animate-pulse'
                        : 'bg-red-600 text-white'
                    }`}>
                      {alm.status === 'approved' ? 'Verified' : alm.status === 'pending' ? 'Pending' : 'Denied'}
                    </span>
                  </div>
                  <div className="absolute bottom-2.5 left-2.5">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/75 text-white backdrop-blur-xs">
                      {alm.gradYear}
                    </span>
                  </div>
                </div>

                <div className="p-4 sm:p-5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug">
                      {alm.name}
                    </h3>
                    {alm.linkedin && (
                      <a href={alm.linkedin} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800">
                        <Linkedin className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  <p className="text-xs font-semibold text-[#138601] dark:text-[#4bd043]">
                    {alm.position} {alm.company ? `at ${alm.company}` : ''}
                  </p>

                  <p className="text-xs text-gray-600 dark:text-green-200/80 line-clamp-2 leading-relaxed">
                    {alm.bio || 'Honored alumnus making significant contributions to tech innovation.'}
                  </p>
                </div>
              </div>

              <div className="p-4 pt-0">
                <div className="pt-3 border-t border-gray-100 dark:border-[#138601]/20 flex items-center justify-between gap-2">
                  {alm.status === 'pending' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApprove(alm)}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-[#138601] hover:bg-[#0f6c01] text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeny(alm)}
                        className="py-1.5 px-3 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Deny
                      </button>
                    </>
                  ) : (
                    <span className="text-[11px] text-gray-400">
                      {alm.status === 'approved' ? 'Active Spotlight' : 'Rejected'}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(alm)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-[#138601] hover:bg-green-50 dark:hover:bg-[#041801] transition-colors cursor-pointer ml-auto"
                    title="Edit Alumnus Profile"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(alm)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    title="Delete Alumnus"
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
                  {modalMode === 'edit' ? 'Edit Alumnus Profile' : 'Add Alumnus Profile'}
                </h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 cursor-pointer">✕</button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Godfirst Asogwa"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] focus:outline-none focus:border-[#138601]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1">Graduation Class</label>
                    <input
                      type="text"
                      value={formData.gradYear}
                      onChange={(e) => setFormData(prev => ({ ...prev, gradYear: e.target.value }))}
                      placeholder="e.g. Class of 2023"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] focus:outline-none focus:border-[#138601]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Current Job Role</label>
                    <input
                      type="text"
                      value={formData.position}
                      onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                      placeholder="e.g. Lead Software Engineer"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] focus:outline-none focus:border-[#138601]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1">Company / Enterprise</label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="e.g. Google, Microsoft, Startup"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] focus:outline-none focus:border-[#138601]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">LinkedIn Profile URL</label>
                    <input
                      type="url"
                      value={formData.linkedin}
                      onChange={(e) => setFormData(prev => ({ ...prev, linkedin: e.target.value }))}
                      placeholder="https://linkedin.com/in/..."
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] focus:outline-none focus:border-[#138601]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-1">Biography / Career Highlights</label>
                  <textarea
                    rows={2}
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Key achievements, specialties, awards..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] focus:outline-none focus:border-[#138601]"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Portrait Photo (Cloudinary)</label>
                  <MediaUpload
                    folder={CLOUDINARY_FOLDERS.ALUMNI}
                    aspectRatio="portrait"
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
                    {modalMode === 'edit' ? 'Save Changes' : 'Publish Alumnus'}
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

export default AdminAlumni;
