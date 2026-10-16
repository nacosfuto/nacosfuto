import React, { useState, useEffect } from 'react';
import WebsiteAdminLayout from '../components/WebsiteAdminLayout';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Trash2, 
  Mail, 
  X, 
  Check, 
  AlertTriangle,
  Loader
} from 'lucide-react';
import { 
  superAdminGetAdmins, 
  superAdminCreateAdmin, 
  superAdminToggleAdmin,
  superAdminDeleteAdmin,
  superAdminResendInvite,
  getWebsiteAdminSession,
  AVAILABLE_ADMIN_FEATURES 
} from '@nacos/supabase/adminAuth';
import AdminSaveButton from '../components/AdminSaveButton';
import { adminToast, getSafeErrorMessage } from '../utils/adminToast';

const AdminUsers = () => {
  const currentAdmin = getWebsiteAdminSession();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, admin: null, isDeleting: false });
  const [notification, setNotification] = useState({ message: '', type: '' });

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    scope: 'main_website',
    role: 'website_admin',
    assigned_level: 'all',
    permissions: [
      'main_website.view',
      'main_website.media',
      'feature:yellow_pages',
      'feature:campus_clubs',
      'feature:alumni_management'
    ]
  });

  useEffect(() => {
    loadAdmins();
  }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 5000);
    if (type === 'error') {
      adminToast.error(message);
    } else if (type === 'success') {
      adminToast.success(message);
    } else {
      adminToast.info(message);
    }
  };

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const res = await superAdminGetAdmins();
      setAdmins(Array.isArray(res) ? res : res?.admins || []);
    } catch (err) {
      showNotification('Failed to load administrators from database.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = (permKey) => {
    setFormData(prev => {
      const exists = prev.permissions.includes(permKey);
      return {
        ...prev,
        permissions: exists 
          ? prev.permissions.filter(p => p !== permKey)
          : [...prev.permissions, permKey]
      };
    });
  };

  const handleRoleChange = (role) => {
    let defaultPerms = [];
    let scope = formData.scope;
    let level = formData.assigned_level;

    if (role === 'course_adviser') {
      scope = 'student_portal';
      level = '100';
      defaultPerms = [
        'student_portal.results',
        'student_portal.students',
        'feature:results_management',
        'feature:student_registry',
        'feature:course_management'
      ];
    } else if (role === 'website_admin') {
      scope = 'main_website';
      level = 'all';
      defaultPerms = [
        'main_website.view',
        'main_website.media',
        'main_website.news',
        'main_website.events',
        'feature:yellow_pages',
        'feature:campus_clubs',
        'feature:alumni_management'
      ];
    } else if (role === 'portal_admin') {
      scope = 'student_portal';
      level = 'all';
      defaultPerms = [
        'student_portal.students',
        'student_portal.results',
        'student_portal.id_cards',
        'feature:student_registry',
        'feature:results_management',
        'feature:id_management',
        'feature:resource_management'
      ];
    } else if (role === 'electoral_admin') {
      scope = 'electoral_admin';
      level = 'all';
      defaultPerms = [
        'feature:election_management'
      ];
    } else if (role === 'super_admin') {
      scope = 'super_admin';
      level = 'all';
      defaultPerms = ['*'];
    }

    setFormData(prev => ({
      ...prev,
      role,
      scope,
      assigned_level: level,
      permissions: defaultPerms
    }));
  };

  // Add Administrator Submit
  const handleInvite = async (e) => {
    e.preventDefault();
    if (!formData.password || formData.password.trim().length < 6) {
      showNotification('Please enter an initial password with at least 6 characters.', 'error');
      return;
    }
    setActionLoadingId('invite');
    try {
      const cleanPassword = formData.password.trim();
      const res = await superAdminCreateAdmin({
        ...formData,
        initialPassword: cleanPassword,
        password: cleanPassword
      });
      if (res.error) {
        showNotification(res.error, 'error');
      } else {
        showNotification(`Administrator ${formData.fullName} (${formData.email}) created and notified via email!`, 'success');
        setIsInviteModalOpen(false);
        setFormData({
          fullName: '',
          email: '',
          password: '',
          scope: 'main_website',
          role: 'website_admin',
          assigned_level: 'all',
          permissions: ['main_website.view', 'main_website.media', 'feature:yellow_pages']
        });
        await loadAdmins();
      }
    } catch (err) {
      showNotification(err.message || 'Failed to provision administrator.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Suspend / Reactivate Administrator
  const handleToggleStatus = async (admin) => {
    if (currentAdmin && (currentAdmin.id === admin.id || currentAdmin.email === admin.email)) {
      showNotification('You cannot suspend your own administrative account.', 'error');
      return;
    }

    const nextState = !admin.is_active;
    setActionLoadingId(`status-${admin.id}`);
    try {
      const res = await superAdminToggleAdmin(admin.id, nextState);
      if (res.error) {
        showNotification(res.error, 'error');
      } else {
        showNotification(`Administrator ${admin.full_name} status updated to ${nextState ? 'Active' : 'Suspended'}.`, 'success');
        await loadAdmins();
      }
    } catch (err) {
      showNotification(err.message || 'Failed to update status.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Resend Invite Email
  const handleResendEmail = async (admin) => {
    setActionLoadingId(`email-${admin.id}`);
    try {
      const res = await superAdminResendInvite(admin.id);
      if (res.error) {
        showNotification(res.error, 'error');
      } else {
        showNotification(`Invitation & scope assignment email resent to ${admin.email}.`, 'success');
      }
    } catch (err) {
      showNotification('Failed to dispatch email.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete Administrator Confirmation
  const confirmDeleteAdmin = (admin) => {
    if (currentAdmin && (currentAdmin.id === admin.id || currentAdmin.email === admin.email)) {
      showNotification('Security Safeguard: You cannot delete your own logged-in account.', 'error');
      return;
    }
    setDeleteModal({ isOpen: true, admin, isDeleting: false });
  };

  const executeDeleteAdmin = async () => {
    if (!deleteModal.admin) return;
    setDeleteModal(prev => ({ ...prev, isDeleting: true }));

    try {
      const res = await superAdminDeleteAdmin(deleteModal.admin.id);
      if (res.error) {
        showNotification(res.error, 'error');
        setDeleteModal({ isOpen: false, admin: null, isDeleting: false });
      } else {
        showNotification(`Administrator ${deleteModal.admin.full_name} permanently deleted from database.`, 'success');
        setDeleteModal({ isOpen: false, admin: null, isDeleting: false });
        await loadAdmins();
      }
    } catch (err) {
      showNotification(err.message || 'Failed to delete administrator.', 'error');
      setDeleteModal({ isOpen: false, admin: null, isDeleting: false });
    }
  };

  return (
    <WebsiteAdminLayout
      title="Administrator Management"
      subtitle="Super Admin Oversight • Add, assign platform scopes, suspend, and manage departmental administrators across Website and Portal."
    >
      <div className="space-y-6">
        
        {notification.message && (
          <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 shadow-xs transition-all ${
            notification.type === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800'
              : 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800'
          }`}>
            <div className="flex items-center gap-2">
              {notification.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification({ message: '', type: '' })} className="cursor-pointer opacity-70 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Top Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#083002] p-4 rounded-2xl border border-gray-200 dark:border-[#138601]/30 shadow-xs">
          <div>
            <div className="text-xs text-gray-500 dark:text-green-200/70">
              Database Administrator Records: <strong className="text-gray-900 dark:text-white font-mono text-sm">{admins.length}</strong>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-green-200/50">
              Changes persist instantly to the database and revoke sessions in real-time.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={loadAdmins}
              disabled={loading}
              className="px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
              title="Refresh Registry from Database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] rounded-xl shadow-xs inline-flex items-center gap-2 cursor-pointer transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Administrator</span>
            </button>
          </div>
        </div>

        {/* Admins Table */}
        <div className="rounded-2xl border border-gray-200 dark:border-[#138601]/30 bg-white dark:bg-[#083002] overflow-hidden shadow-xs">
          {loading ? (
            <div className="p-12 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-2">
              <Loader className="w-6 h-6 animate-spin text-[#138601]" />
              <span>Connecting to database and verifying administrator identities...</span>
            </div>
          ) : admins.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-400">
              No administrator records found in database. Click "Add Administrator" to create the first admin.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#041801] border-b border-gray-200 dark:border-[#138601]/30 text-gray-500 dark:text-green-200/70 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Admin Name / Email</th>
                    <th className="py-3 px-4">Platform Scope</th>
                    <th className="py-3 px-4">Role / Level</th>
                    <th className="py-3 px-4">Features &amp; Scope</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#138601]/20">
                  {admins.map((adm) => {
                    const isSelf = currentAdmin && (currentAdmin.id === adm.id || currentAdmin.email === adm.email);
                    const isSuper = adm.scope === 'super_admin' || adm.role === 'super_admin';

                    return (
                      <tr key={adm.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 dark:text-white">{adm.full_name || 'Administrator'}</span>
                            {isSelf && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-green-200/60 font-mono">{adm.email}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border ${
                            adm.scope === 'super_admin'
                              ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
                              : adm.scope === 'electoral_admin' || adm.role === 'electoral_admin'
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                                : 'bg-green-50 text-[#138601] border-green-200 dark:bg-[#041801] dark:text-[#4bd043] dark:border-[#138601]/30'
                          }`}>
                            {adm.scope || 'main_website'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-gray-800 dark:text-green-100 capitalize">
                            {(adm.role || 'Admin').replace(/_/g, ' ')}
                          </div>
                          {adm.assigned_level && adm.assigned_level !== 'all' && (
                            <span className="text-[10px] text-amber-600 font-bold block">
                              {adm.assigned_level}L Coordinator
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {adm.permissions?.includes('*') || isSuper ? (
                              <span className="px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                                Universal All Access (*)
                              </span>
                            ) : (
                              adm.permissions?.map(p => (
                                <span key={p} className="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-[#041801] text-gray-700 dark:text-green-200 text-[9.5px] font-mono border border-gray-200 dark:border-[#138601]/30">
                                  {p.replace('main_website.', '').replace('student_portal.', '').replace('feature:', '')}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${
                            adm.is_active !== false
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${adm.is_active !== false ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {adm.is_active !== false ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Resend Email Button */}
                            <button
                              onClick={() => handleResendEmail(adm)}
                              disabled={actionLoadingId === `email-${adm.id}`}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                              title="Resend Access / Scope Email"
                            >
                              <Mail className={`w-3.5 h-3.5 ${actionLoadingId === `email-${adm.id}` ? 'animate-pulse text-[#138601]' : ''}`} />
                            </button>

                            {/* Suspend / Reactivate Button */}
                            <button
                              onClick={() => handleToggleStatus(adm)}
                              disabled={isSelf || actionLoadingId === `status-${adm.id}`}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                                isSelf
                                  ? 'opacity-40 cursor-not-allowed border-gray-200 text-gray-400'
                                  : adm.is_active !== false
                                    ? 'border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                    : 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                              }`}
                              title={adm.is_active !== false ? 'Suspend access immediately' : 'Reactivate administrator'}
                            >
                              {actionLoadingId === `status-${adm.id}` 
                                ? 'Updating...' 
                                : adm.is_active !== false ? 'Suspend' : 'Reactivate'}
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => confirmDeleteAdmin(adm)}
                              disabled={isSelf}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isSelf
                                  ? 'opacity-30 cursor-not-allowed text-gray-400'
                                  : 'text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40'
                              }`}
                              title={isSelf ? 'Cannot delete own account' : 'Permanently Delete Administrator'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Administrator Modal */}
        {isInviteModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#138601]/20">
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#138601]" />
                  <span>Provision & Assign Administrator</span>
                </h3>
                <button onClick={() => setIsInviteModalOpen(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer">✕</button>
              </div>

              <form onSubmit={handleInvite} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-green-200">Full Name &amp; Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. Dr. C. O. Ibe or Engr. Adaeze"
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-green-200">Official Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="adviser@nacosfuto.com.ng"
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 text-gray-900 dark:text-white font-mono"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    An official welcome and setup email will be automatically sent to this address via Resend.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-green-200">Initial Access Password *</label>
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter initial password (min. 6 characters)"
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 text-gray-900 dark:text-white font-mono text-sm"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Set a secure initial password. The administrator can change or reset this password anytime via email verification.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-green-200">Administrative Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => handleRoleChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 font-semibold text-gray-900 dark:text-white"
                    >
                      <option value="website_admin">Website Administrator</option>
                      <option value="portal_admin">Portal Administrator</option>
                      <option value="course_adviser">Course Adviser (Results &amp; Registry)</option>
                      <option value="electoral_admin">Electoral Commissioner (Electra)</option>
                      <option value="super_admin">Super Administrator (Universal)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-green-200">Platform Scope</label>
                    <select
                      value={formData.scope}
                      onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 font-semibold text-gray-900 dark:text-white"
                    >
                      <option value="main_website">Main Website</option>
                      <option value="student_portal">Student Portal</option>
                      <option value="electoral_admin">Electra Electoral System</option>
                      <option value="super_admin">Universal All Platforms</option>
                    </select>
                  </div>
                </div>

                {/* Academic Level Assignment for Course Advisers */}
                {formData.role === 'course_adviser' && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-1">
                    <label className="block font-bold text-amber-900 dark:text-amber-200">
                      Academic Level Restriction (Course Adviser)
                    </label>
                    <select
                      value={formData.assigned_level}
                      onChange={(e) => setFormData({ ...formData, assigned_level: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-black/40 border border-amber-300 dark:border-amber-700 text-xs font-semibold text-gray-900 dark:text-white"
                    >
                      <option value="100">100 Level Students &amp; Courses</option>
                      <option value="200">200 Level Students &amp; Courses</option>
                      <option value="300">300 Level Students &amp; Courses</option>
                      <option value="400">400 Level Students &amp; Courses</option>
                      <option value="500">500 Level Students &amp; Courses</option>
                      <option value="all">All Academic Levels</option>
                    </select>
                    <p className="text-[10px] text-amber-700 dark:text-amber-300">
                      Course Adviser will solely manage Results &amp; Grading and Student Registry for this designated level cohort.
                    </p>
                  </div>
                )}

                {/* Feature-Based Permissions Assignment */}
                <div>
                  <label className="block font-bold mb-2 text-gray-700 dark:text-green-200">Granular Capabilities &amp; Permissions</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-50 dark:bg-[#041801] p-3 rounded-xl border border-gray-200 dark:border-[#138601]/25">
                    {AVAILABLE_ADMIN_FEATURES.map(feat => (
                      <label key={feat.key} className="flex items-start gap-2 p-1.5 rounded hover:bg-white dark:hover:bg-white/5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes(feat.key)}
                          onChange={() => handleTogglePermission(feat.key)}
                          className="mt-0.5 w-3.5 h-3.5 text-[#138601] rounded"
                        />
                        <div>
                          <span className="font-semibold text-gray-900 dark:text-white block leading-tight">{feat.label}</span>
                          <span className="text-[10px] text-gray-400 block">{feat.description}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-[#138601]/20">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    disabled={actionLoadingId === 'invite'}
                    className="px-4 py-2 rounded-lg text-gray-600 bg-gray-100 dark:bg-white/10 dark:text-gray-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <AdminSaveButton
                    loading={actionLoadingId === 'invite'}
                    loadingText="Provisioning..."
                    variant="primary"
                    icon={Mail}
                  >
                    Save &amp; Send Invitation Email
                  </AdminSaveButton>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Explicit Confirmation Modal for Deletion */}
        {deleteModal.isOpen && deleteModal.admin && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#083002] border border-red-300 dark:border-red-800/80 p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/80 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Confirm Administrator Deletion</h3>
                  <p className="text-xs text-red-600 dark:text-red-400">This action is permanent and immediate.</p>
                </div>
              </div>

              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-xs space-y-2 text-gray-700 dark:text-red-200">
                <p>
                  You are about to permanently remove administrative access for:
                </p>
                <div className="font-bold text-gray-900 dark:text-white">
                  {deleteModal.admin.full_name} ({deleteModal.admin.email})
                </div>
                <div className="text-[11px] text-gray-500 dark:text-red-300/80">
                  Role: <strong className="capitalize">{deleteModal.admin.role}</strong> &bull; Scope: <code className="font-mono">{deleteModal.admin.scope}</code>
                </div>
                <p className="text-[11px] text-red-700 dark:text-red-300 mt-2">
                  All active sessions will be terminated. Departmental student records and grades will remain intact.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={deleteModal.isDeleting}
                  onClick={() => setDeleteModal({ isOpen: false, admin: null, isDeleting: false })}
                  className="px-4 py-2 rounded-lg text-gray-600 bg-gray-100 dark:bg-white/10 dark:text-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <AdminSaveButton
                  type="button"
                  disabled={deleteModal.isDeleting}
                  onClick={executeDeleteAdmin}
                  loading={deleteModal.isDeleting}
                  loadingText="Deleting..."
                  variant="danger"
                  icon={Trash2}
                >
                  Delete Permanently
                </AdminSaveButton>
              </div>
            </div>
          </div>
        )}

      </div>
    </WebsiteAdminLayout>
  );
};

export default AdminUsers;
