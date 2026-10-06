import React, { useState, useEffect } from 'react';
import WebsiteAdminLayout from '../components/WebsiteAdminLayout';
import { 
  Building2, 
  Plus, 
  Trash2, 
  Edit, 
  Search, 
  Mail, 
  User, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  AlertCircle,
  Briefcase,
  GraduationCap
} from 'lucide-react';
import { MediaUpload, CLOUDINARY_FOLDERS, deleteMedia } from '@nacos/media';
import { recordAdminAction } from '@nacos/supabase/adminAuth';
import { 
  getLocalDepartmentStaff, 
  fetchDepartmentStaff, 
  saveDepartmentStaffMember, 
  deleteDepartmentStaffMember 
} from '@nacos/supabase';

const ROLE_CATEGORIES = [
  { id: 'all', label: 'All Staff' },
  { id: 'leadership', label: 'Leadership & Advisers' },
  { id: 'faculty', label: 'Faculty Members' },
  { id: 'technical', label: 'Technical Staff' },
  { id: 'administrative', label: 'Administrative Staff' }
];

const COMMON_RANKS = [
  'Senior Lecturer / HOD',
  'Senior Lecturer / Staff Adviser',
  'Professor',
  'Reader',
  'Senior Lecturer',
  'Lecturer I',
  'Lecturer II',
  'Assistant Lecturer',
  'Graduate Assistant',
  'Senior Computer Technologist',
  'Technologist II',
  'System Programmer/Analyst II',
  'Secretary I'
];

const AdminAdministration = () => {
  const [staffList, setStaffList] = useState(() => getLocalDepartmentStaff());
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState('add'); // 'add' | 'edit'
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [role, setRole] = useState('Faculty Member');
  const [rank, setRank] = useState('Senior Lecturer');
  const [email, setEmail] = useState('');
  const [image, setImage] = useState('');
  const [cloudinaryPublicId, setCloudinaryPublicId] = useState('');
  const [orderIndex, setOrderIndex] = useState(1);
  const [isActive, setIsActive] = useState(true);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Initial fetch and listener setup
  useEffect(() => {
    fetchDepartmentStaff({ activeOnly: false }).then(fetched => {
      if (fetched && fetched.length > 0) {
        setStaffList(fetched);
      }
    });

    const handleSync = () => {
      setStaffList(getLocalDepartmentStaff());
    };

    window.addEventListener('nacos_department_staff_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('nacos_department_staff_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleDeriveEmail = () => {
    if (!name.trim()) return;
    const clean = name.replace(/^(Dr\.?|Mr\.?|Mrs\.?|Prof\.?|DR\.?|MR\.?|PROF\.?)\s*/i, '').trim();
    const parts = clean.toLowerCase().split(/\s+/);
    if (parts.length >= 2) {
      setEmail(`${parts[0]}.${parts[parts.length - 1]}@futo.edu.ng`);
    } else {
      setEmail(`${parts[0] || 'staff'}@futo.edu.ng`);
    }
  };

  const handleOpenAdd = () => {
    setEditorMode('add');
    setSelectedStaffId(null);
    setName('');
    setRole('Faculty Member');
    setRank('Lecturer II');
    setEmail('');
    setImage('');
    setCloudinaryPublicId('');
    setOrderIndex(staffList.length + 1);
    setIsActive(true);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (person) => {
    setEditorMode('edit');
    setSelectedStaffId(person.id);
    setName(person.name || '');
    setRole(person.role || '');
    setRank(person.rank || '');
    setEmail(person.email || '');
    setImage(person.image || '');
    setCloudinaryPublicId(person.cloudinary_public_id || '');
    setOrderIndex(person.order_index ?? 1);
    setIsActive(person.is_active !== false);
    setIsEditorOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showFeedback('error', 'Staff member name is required.');
      return;
    }
    if (!role.trim()) {
      showFeedback('error', 'Designation / role is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        id: selectedStaffId || undefined,
        name: name.trim(),
        role: role.trim(),
        rank: rank.trim(),
        email: email.trim(),
        image: image || null,
        cloudinary_public_id: cloudinaryPublicId || null,
        order_index: Number(orderIndex) || (staffList.length + 1),
        is_active: Boolean(isActive)
      };

      const result = await saveDepartmentStaffMember(payload);
      if (result && result.success) {
        recordAdminAction({
          action: editorMode === 'add' ? 'create_staff' : 'update_staff',
          target: payload.name,
          details: { role: payload.role, rank: payload.rank }
        });
        showFeedback('success', `Staff member "${payload.name}" successfully saved and synced live!`);
        setIsEditorOpen(false);
      } else {
        showFeedback('error', 'Could not save staff member. Please check details.');
      }
    } catch (err) {
      showFeedback('error', err.message || 'An unexpected error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (person) => {
    try {
      const updated = {
        ...person,
        is_active: !person.is_active
      };
      await saveDepartmentStaffMember(updated);
      recordAdminAction({
        action: 'toggle_staff_visibility',
        target: person.name,
        details: { is_active: updated.is_active }
      });
      showFeedback('success', `${person.name} status updated to ${updated.is_active ? 'Active' : 'Hidden'}.`);
    } catch (err) {
      showFeedback('error', 'Failed to update visibility.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.cloudinary_public_id) {
        await deleteMedia(deleteTarget.cloudinary_public_id).catch(() => {});
      }
      await deleteDepartmentStaffMember(deleteTarget.id);
      recordAdminAction({
        action: 'delete_staff',
        target: deleteTarget.name,
        details: { id: deleteTarget.id }
      });
      showFeedback('success', `"${deleteTarget.name}" removed from departmental staff.`);
      setDeleteTarget(null);
    } catch (err) {
      showFeedback('error', 'Error deleting staff member.');
    }
  };

  // Filtered List
  const filteredStaff = staffList.filter(p => {
    // Search query
    const matchesSearch = 
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.rank?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeCategory === 'leadership') {
      return p.role?.includes('Head of Department') || p.role?.includes('HOD') || p.role?.includes('Staff Adviser');
    }
    if (activeCategory === 'faculty') {
      return p.role?.includes('Faculty') || p.rank?.includes('Lecturer') || p.rank?.includes('Reader') || p.rank?.includes('Professor');
    }
    if (activeCategory === 'technical') {
      return p.role?.includes('Technical') || p.rank?.includes('Technologist') || p.rank?.includes('Programmer');
    }
    if (activeCategory === 'administrative') {
      return p.role?.includes('Administrative') || p.rank?.includes('Secretary');
    }
    return true;
  });

  return (
    <WebsiteAdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
        
        {/* Feedback Alert Toast */}
        {feedback && (
          <div className={`p-4 rounded-xl flex items-center justify-between shadow-lg border animate-fade-in ${
            feedback.type === 'success' 
              ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300' 
              : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
          }`}>
            <div className="flex items-center gap-3">
              {feedback.type === 'success' ? <Check className="w-5 h-5 text-green-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />}
              <span className="text-sm font-semibold">{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                <Building2 className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                Departmental Administration
              </h1>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
              Manage academic, technical, and administrative staff profiles displayed on the Department Administration page. Changes sync live across all devices instantly.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Staff Member</span>
            </button>
          </div>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, role, rank, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Total Count Badge */}
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 self-end sm:self-center">
              Showing <span className="text-green-600 dark:text-green-400 font-bold">{filteredStaff.length}</span> of {staffList.length} staff
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {ROLE_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Staff Directory Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStaff.map((person) => (
            <div
              key={person.id}
              className={`flex flex-col border rounded-2xl p-5 shadow-sm transition-all duration-200 ${
                person.is_active !== false
                  ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:shadow-md'
                  : 'bg-gray-50 dark:bg-gray-900/40 border-gray-200/60 dark:border-gray-800/60 opacity-70'
              }`}
            >
              {/* Card Top: Portrait & Status Badge */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-20 h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex-shrink-0 flex items-center justify-center">
                  {person.image ? (
                    <img 
                      src={person.image} 
                      alt={person.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <User className="w-8 h-8 opacity-40 mb-1" />
                      <span className="text-[9px] font-semibold uppercase">No Photo</span>
                    </div>
                  )}
                </div>

                <div className="flex-grow min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-mono font-bold text-gray-400">
                      #{person.order_index ?? '-'}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      person.is_active !== false
                        ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400'
                        : 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {person.is_active !== false ? 'Active' : 'Hidden'}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-base text-gray-900 dark:text-white leading-tight mb-1 truncate">
                    {person.name}
                  </h3>

                  <p className="text-xs font-bold text-green-600 dark:text-green-400 mb-1 leading-snug">
                    {person.role}
                  </p>

                  <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                    {person.rank}
                  </p>
                </div>
              </div>

              {/* Email info */}
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-4 pt-3 border-t border-gray-100 dark:border-gray-800 truncate">
                <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <a 
                  href={person.email ? `mailto:${person.email}` : undefined} 
                  className="truncate hover:text-green-600 dark:hover:text-green-400 transition-colors"
                >
                  {person.email || 'No email registered'}
                </a>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleActive(person)}
                  className="px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  title={person.is_active !== false ? 'Hide from live page' : 'Show on live page'}
                >
                  {person.is_active !== false ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-green-500" />}
                  <span>{person.is_active !== false ? 'Hide' : 'Publish'}</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(person)}
                    className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    title="Edit Staff Member"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(person)}
                    className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                    title="Delete Staff Member"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredStaff.length === 0 && (
            <div className="col-span-full py-16 text-center bg-gray-50 dark:bg-gray-900/30 rounded-2xl border border-dashed border-gray-300 dark:border-gray-800">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3 opacity-50" />
              <h3 className="text-base font-bold text-gray-700 dark:text-gray-300 mb-1">
                No staff members found
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-4">
                {searchQuery ? `No staff matching "${searchQuery}" in this category.` : 'Start by adding a departmental staff member.'}
              </p>
              <button
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-green-600 text-white hover:bg-green-700 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Staff Member</span>
              </button>
            </div>
          )}
        </div>

        {/* Add / Edit Staff Modal */}
        {isEditorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh]">
              
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-900 dark:text-white">
                      {editorMode === 'add' ? 'Add Department Staff Member' : 'Edit Staff Profile'}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Syncs immediately to the live Administration page on all devices.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsEditorOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5">
                
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Full Name & Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Stanley Adiele Okolie"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Role / Designation */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Designation / Role <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Head of Department (CSC), Faculty Member, Staff Adviser"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  {/* Quick Suggestions */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {['Head of Department (CSC)', 'Staff Adviser / Course Adviser', 'Faculty Member', 'Technical Staff', 'Administrative Staff'].map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-green-100 hover:text-green-700 dark:hover:bg-green-950 dark:hover:text-green-400 transition-colors cursor-pointer"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rank & Order in 2-column */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                      Academic Rank
                    </label>
                    <input
                      type="text"
                      list="ranks-list"
                      placeholder="e.g. Senior Lecturer, Reader"
                      value={rank}
                      onChange={(e) => setRank(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <datalist id="ranks-list">
                      {COMMON_RANKS.map(rk => (
                        <option key={rk} value={rk} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                      Display Priority Order
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={orderIndex}
                      onChange={(e) => setOrderIndex(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                {/* Email with Auto-Derive Button */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      University Official Email
                    </label>
                    <button
                      type="button"
                      onClick={handleDeriveEmail}
                      className="text-[11px] font-bold text-green-600 dark:text-green-400 hover:underline cursor-pointer"
                    >
                      Generate from Name
                    </button>
                  </div>
                  <input
                    type="email"
                    placeholder="e.g. stanley.okolie@futo.edu.ng"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Cloudinary Portrait Upload */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Portrait Photo (Cloudinary CDN)
                  </label>
                  <MediaUpload
                    folder={CLOUDINARY_FOLDERS.GENERAL || 'nacos/general'}
                    currentUrl={image}
                    onUploadComplete={(result) => {
                      if (result && result.url) {
                        setImage(result.url);
                        setCloudinaryPublicId(result.publicId || result.public_id || '');
                      }
                    }}
                  />
                </div>

                {/* Active Toggle Switch */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/60">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                      Visible on Website
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      When enabled, this member is immediately visible on the Department Administration page.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.value ? e.target.checked : false)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>

                {/* Modal Footer */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-600/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving Live...' : (editorMode === 'add' ? 'Save Staff Member' : 'Update Profile')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                  Remove Staff Member
                </h3>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Are you sure you want to remove <span className="font-bold text-gray-900 dark:text-white">"{deleteTarget.name}"</span>? This will permanently remove their profile and Cloudinary portrait from the live directory.
              </p>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20 transition-all cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </WebsiteAdminLayout>
  );
};

export default AdminAdministration;
