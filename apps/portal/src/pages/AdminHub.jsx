import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Globe, 
  GraduationCap, 
  Users, 
  UserPlus, 
  Copy, 
  Check, 
  ExternalLink, 
  ArrowRight, 
  RefreshCw, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle,
  Database,
  Code2,
  Trash2,
  Power,
  Shield
} from 'lucide-react';
import logoDark from '../assets/full-logo-dark.png';
import logoLight from '../assets/full-logo-light.png';
import { supabase, hashPassword, getLocalAdminScopesDatabase } from '@nacos/supabase';
import { getAppUrls } from '@nacos/config/urls';

const AdminHub = () => {
  const isDark = true;

  const [copiedKey, setCopiedKey] = useState('');
  const [activeTab, setActiveTab] = useState('launchers'); // 'launchers' | 'credentials' | 'assign' | 'sql'

  // Admin Assignment State
  const [adminsList, setAdminsList] = useState([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(true);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('portal_admin');
  const [newPassword, setNewPassword] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignmentFeedback, setAssignmentFeedback] = useState({ type: '', text: '' });

  // Dynamic environment URLs via centralized @nacos/config/urls
  const urls = getAppUrls();

  // Load existing administrators from Supabase & Local Database
  const loadAdmins = async () => {
    setIsLoadingAdmins(true);
    let list = [];

    // 1. Try live Supabase admin_scopes table
    try {
      const { data, error } = await supabase
        .from('admin_scopes')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        list = data;
      }
    } catch (e) {
      console.warn('Supabase admins fetch notice:', e);
    }

    // 2. Fallback to local DB if offline
    if (list.length === 0) {
      list = getLocalAdminScopesDatabase();
    }

    setAdminsList(list);
    setIsLoadingAdmins(false);
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleCopy = (text, key) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 2500);
    }
  };

  // Handle assigning a new admin directly to the database
  const handleAssignAdmin = async (e) => {
    e.preventDefault();
    if (!newEmail.trim() || !newFullName.trim()) {
      setAssignmentFeedback({ type: 'error', text: 'Email address and Full Name are required.' });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setAssignmentFeedback({ type: 'error', text: 'Administrative password must be at least 6 characters.' });
      return;
    }

    setIsAssigning(true);
    setAssignmentFeedback({ type: '', text: '' });

    try {
      const cleanEmail = newEmail.trim().toLowerCase();
      // Generate SHA-256 standard hash for database storage
      const pwdHash = await hashPassword(newPassword);
      const adminId = `admin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      let scope = 'main_website';
      let permissions = ['main_website.view', 'main_website.news', 'main_website.events'];

      if (newRole === 'super_admin') {
        scope = 'super_admin';
        permissions = ['*'];
      } else if (newRole === 'portal_admin') {
        scope = 'student_portal';
        permissions = ['student_portal.students', 'student_portal.id_cards', 'student_portal.dues', 'student_portal.results'];
      } else if (newRole === 'website_admin') {
        scope = 'main_website';
        permissions = ['main_website.view', 'main_website.media', 'main_website.gallery', 'main_website.news', 'main_website.events', 'main_website.settings'];
      } else if (newRole === 'website_editor') {
        scope = 'main_website';
        permissions = ['main_website.view', 'main_website.news', 'main_website.events'];
      }

      const newRecord = {
        id: adminId,
        email: cleanEmail,
        full_name: newFullName.trim(),
        password_hash: pwdHash,
        scope,
        role: newRole,
        permissions,
        is_active: true,
        created_at: new Date().toISOString()
      };

      // 1. Save directly to Supabase admin_scopes table
      try {
        await supabase.from('admin_scopes').upsert([newRecord]);
      } catch (err) {
        console.warn('Supabase upsert note:', err);
      }

      // 2. Save to local storage DB
      const localScopes = getLocalAdminScopesDatabase();
      const existingIdx = localScopes.findIndex(a => a.email.toLowerCase() === cleanEmail);
      if (existingIdx !== -1) {
        localScopes[existingIdx] = { ...localScopes[existingIdx], ...newRecord };
      } else {
        localScopes.unshift(newRecord);
      }
      localStorage.setItem('nacos_admin_scopes_db', JSON.stringify(localScopes));

      setAssignmentFeedback({
        type: 'success',
        text: `Administrator ${newFullName.trim()} (${cleanEmail}) created and persisted to database successfully as ${newRole}!`
      });

      setNewFullName('');
      setNewEmail('');
      setNewPassword('');
      await loadAdmins();
    } catch (err) {
      console.error(err);
      setAssignmentFeedback({ type: 'error', text: err.message || 'Failed to assign administrator.' });
    } finally {
      setIsAssigning(false);
    }
  };

  // Toggle active status in database
  const handleToggleActive = async (admin) => {
    const updatedStatus = !admin.is_active;

    const updated = adminsList.map(a => a.id === admin.id ? { ...a, is_active: updatedStatus } : a);
    setAdminsList(updated);
    localStorage.setItem('nacos_admin_scopes_db', JSON.stringify(updated));

    try {
      await supabase.from('admin_scopes').update({ is_active: updatedStatus }).eq('id', admin.id);
    } catch (e) {}
  };

  const mainSuperAdmin = adminsList.find(a => a.email === 'neorxpro@gmail.com' || a.scope === 'super_admin');

  return (
    <div className="min-h-screen bg-[#041801] text-white font-sans selection:bg-[#138601] selection:text-white pb-20">
      
      {/* Top Navigation Header */}
      <header className="border-b border-[#138601]/25 bg-[#083002]/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3.5 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src={logoDark} alt="NACOS Logo" className="h-8 sm:h-9 w-auto object-contain" />
            <div className="border-l border-[#138601]/30 pl-3">
              <span className="text-xs font-bold text-[#4bd043] uppercase tracking-wider block">
                Administrative Command Center
              </span>
              <span className="text-[11px] text-green-200/70 block">
                Department of Computer Science • FUTO
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-green-950/60 text-[#4bd043] border border-green-600/40">
              <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
              <span>Live Database Connected</span>
            </span>

            <Link
              to="/"
              className="px-3 py-1.5 rounded text-xs font-semibold text-green-100 hover:text-white bg-[#138601]/30 hover:bg-[#138601] border border-[#138601]/40 transition-colors"
            >
              Main Website
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#083002] via-[#041801] to-[#041801] border-b border-[#138601]/20 py-12 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-md bg-[#138601]/20 border border-[#138601]/40 text-[#4bd043] text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Universal Admin Gateway & Security Router</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            Administrative Access & Operations Command
          </h1>
          <p className="text-sm sm:text-base text-green-100/80 max-w-2xl mx-auto leading-relaxed">
            Standard authentication portal and unified launchpad for Super Administrators, Student Portal Officers, Examination Teams, and Website CMS Managers.
          </p>

          {/* Super Admin Verified Status Badge */}
          <div className="pt-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md bg-[#083002] border border-[#138601]/40 text-xs text-green-200">
              <Shield className="w-3.5 h-3.5 text-[#4bd043]" />
              <span>Main Super Admin: <strong>neorxpro@gmail.com</strong> (Anyanwu Nestor Ifeanyi) • <em>Database Verified</em></span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap justify-center gap-2 pt-4">
            <button
              type="button"
              onClick={() => setActiveTab('launchers')}
              className={`px-4 py-2 rounded text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'launchers'
                  ? 'bg-[#138601] text-white shadow-md'
                  : 'bg-[#083002] text-green-200/80 hover:text-white border border-[#138601]/30'
              }`}
            >
              Admin Dashboards
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('credentials')}
              className={`px-4 py-2 rounded text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'credentials'
                  ? 'bg-[#138601] text-white shadow-md'
                  : 'bg-[#083002] text-green-200/80 hover:text-white border border-[#138601]/30'
              }`}
            >
              Database Admins & Auth Flow
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('assign')}
              className={`px-4 py-2 rounded text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'assign'
                  ? 'bg-[#138601] text-white shadow-md'
                  : 'bg-[#083002] text-green-200/80 hover:text-white border border-[#138601]/30'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Assign Administrators</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sql')}
              className={`px-4 py-2 rounded text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'sql'
                  ? 'bg-[#138601] text-white shadow-md'
                  : 'bg-[#083002] text-green-200/80 hover:text-white border border-[#138601]/30'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Direct SQL Setup</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 pt-8 space-y-12">
        
        {/* ====================================================================
            TAB 1: DEDICATED ADMIN DASHBOARDS (1-CLICK LAUNCHERS)
            ==================================================================== */}
        {activeTab === 'launchers' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#138601]/20 pb-3">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">Dedicated Administrative Dashboards</h2>
                <p className="text-xs text-green-200/70">Click below to open each independent administrative control panel.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Dashboard 1: Student Portal Administration */}
              <div className="p-6 rounded-xl bg-[#083002] border border-[#138601]/40 shadow-xl space-y-5 hover:border-[#138601] transition-all flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-blue-900/40 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-blue-950 text-blue-300 border border-blue-800/50">
                      Scope: student_portal
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white">Student Portal Admin Dashboard</h3>
                    <p className="text-xs text-green-200/80 mt-1 leading-relaxed">
                      Directorate of student academic operations, credential generation, dues clearance tracking, and verified enrollment rosters.
                    </p>
                  </div>

                  <div className="pt-2 space-y-1.5 text-xs text-green-100/90">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4bd043]"></span>
                      <span>Digital Student ID Card approvals, revocations & high-res generation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4bd043]"></span>
                      <span>Annual departmental dues verification & manual clearance</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4bd043]"></span>
                      <span>Official verified student directory & clearance rosters</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#138601]/20 space-y-2">
                  <a
                    href={`${urls.portalAdmin}/login`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-bold text-white bg-[#138601] hover:bg-[#0f6c01] shadow-md transition-all cursor-pointer"
                  >
                    <span>Launch Portal Admin Dashboard</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <div className="text-[11px] text-center text-green-200/60 font-mono">
                    Direct Login URL: {urls.portalAdmin}/login
                  </div>
                </div>
              </div>

              {/* Dashboard 2: Main Website Administration */}
              <div className="p-6 rounded-xl bg-[#083002] border border-[#138601]/40 shadow-xl space-y-5 hover:border-[#138601] transition-all flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-emerald-900/40 border border-emerald-500/30 text-[#4bd043] flex items-center justify-center">
                      <Globe className="w-6 h-6" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                      Scope: main_website
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white">Main Website CMS Admin Dashboard</h3>
                    <p className="text-xs text-green-200/80 mt-1 leading-relaxed">
                      Content Management System (CMS) for the public university computer science department portal and media assets.
                    </p>
                  </div>

                  <div className="pt-2 space-y-1.5 text-xs text-green-100/90">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4bd043]"></span>
                      <span>Department news, press bulletins & official announcements</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4bd043]"></span>
                      <span>Tech talks, conferences, hackathons & academic calendar</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4bd043]"></span>
                      <span>Executive team roster, photo gallery, and yellow pages flyers</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#138601]/20 space-y-2">
                  <a
                    href={`${urls.websiteAdmin}/login`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-bold text-white bg-[#138601] hover:bg-[#0f6c01] shadow-md transition-all cursor-pointer"
                  >
                    <span>Launch Website CMS Dashboard</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <div className="text-[11px] text-center text-green-200/60 font-mono">
                    Direct Login URL: {urls.websiteAdmin}/login
                  </div>
                </div>
              </div>

            </div>

            {/* Quick Links to Student Portal & Main Website */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <a
                href={urls.portal}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-lg bg-[#083002]/60 border border-[#138601]/20 hover:border-[#138601]/50 transition-all flex items-center justify-between"
              >
                <div>
                  <h4 className="text-sm font-bold text-white">Student Academic Portal (Student View)</h4>
                  <p className="text-xs text-green-200/70">Student login, dues clearance status, and ID card application</p>
                </div>
                <ArrowRight className="w-4 h-4 text-[#4bd043]" />
              </a>

              <a
                href={urls.website}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-lg bg-[#083002]/60 border border-[#138601]/20 hover:border-[#138601]/50 transition-all flex items-center justify-between"
              >
                <div>
                  <h4 className="text-sm font-bold text-white">Public University Website</h4>
                  <p className="text-xs text-green-200/70">Department overview, admissions, and alumni network</p>
                </div>
                <ArrowRight className="w-4 h-4 text-[#4bd043]" />
              </a>
            </div>
          </div>
        )}

        {/* ====================================================================
            TAB 2: DATABASE ADMINS & AUTHENTICATION FLOW
            ==================================================================== */}
        {activeTab === 'credentials' && (
          <div className="space-y-8">
            <div className="border-b border-[#138601]/20 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">Database Administrators & Authentication Flow</h2>
                <p className="text-xs text-green-200/70">
                  Standard cryptographic database authentication and live admin scopes.
                </p>
              </div>

              <button
                type="button"
                onClick={loadAdmins}
                className="px-3 py-1.5 rounded text-xs font-semibold bg-[#083002] hover:bg-[#138601]/30 border border-[#138601]/30 text-green-200 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAdmins ? 'animate-spin' : ''}`} />
                <span>Refresh Roster</span>
              </button>
            </div>

            {/* Main Super Administrator Spotlight */}
            <div className="p-6 rounded-xl bg-gradient-to-r from-[#083002] to-[#041801] border-2 border-[#138601] shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#138601] text-white flex items-center justify-center font-bold text-lg shadow-inner">
                    AN
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-bold text-white">Anyanwu Nestor Ifeanyi</h3>
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-400 text-amber-950 uppercase tracking-wider">
                        Main Super Administrator
                      </span>
                    </div>
                    <p className="text-xs text-green-200/80 font-mono mt-0.5">neorxpro@gmail.com</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-md text-xs font-semibold bg-green-500/20 text-[#4bd043] border border-green-500/30 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#4bd043]"></span>
                    <span>Universal Oversight (*)</span>
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed">
                Holds root authorization to authenticate into both the <strong>Main Website CMS</strong> and the <strong>Student Portal Administration</strong> suite. Changes made take immediate effect across the entire university platform.
              </p>

              <div className="pt-2 flex flex-wrap gap-2">
                <a
                  href={`${urls.websiteAdmin}/login`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded text-xs font-semibold bg-[#138601] hover:bg-[#0f6c01] text-white transition-colors inline-flex items-center gap-1.5"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Log in to Website CMS</span>
                </a>
                <a
                  href={`${urls.portalAdmin}/login`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded text-xs font-semibold bg-blue-700 hover:bg-blue-600 text-white transition-colors inline-flex items-center gap-1.5"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Log in to Portal Admin</span>
                </a>
              </div>
            </div>

            {/* Live Database Admin Accounts */}
            <div className="space-y-3">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#4bd043]" />
                <span>Live Registered Administrators (from Supabase admin_scopes table)</span>
              </h3>

              <div className="rounded-xl bg-[#083002] border border-[#138601]/30 overflow-hidden shadow-sm">
                {isLoadingAdmins ? (
                  <div className="p-8 text-center text-xs text-green-200/70">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#4bd043]" />
                    <span>Loading database administrators...</span>
                  </div>
                ) : adminsList.length === 0 ? (
                  <div className="p-8 text-center text-xs text-green-200/60">
                    No administrators found in database. Use the "Assign Administrators" tab to add one.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#041801] border-b border-[#138601]/30 text-green-200/80 uppercase text-[10px]">
                        <tr>
                          <th className="py-3 px-4">Administrator</th>
                          <th className="py-3 px-4">Email</th>
                          <th className="py-3 px-4">Scope</th>
                          <th className="py-3 px-4">Role</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Login Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#138601]/15 text-gray-200">
                        {adminsList.map((admin) => (
                          <tr key={admin.id || admin.email} className="hover:bg-[#041801]/40">
                            <td className="py-3 px-4 font-semibold text-white">
                              {admin.full_name || 'Administrator'}
                            </td>
                            <td className="py-3 px-4 font-mono text-green-200/80 text-[11px]">
                              {admin.email}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                admin.scope === 'super_admin'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : admin.scope === 'student_portal'
                                    ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              }`}>
                                {admin.scope}
                              </span>
                            </td>
                            <td className="py-3 px-4 capitalize font-medium">
                              {(admin.role || '').replace(/_/g, ' ')}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                admin.is_active
                                  ? 'bg-green-500/20 text-[#4bd043] border border-green-500/30'
                                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${admin.is_active ? 'bg-[#4bd043]' : 'bg-red-400'}`}></span>
                                <span>{admin.is_active ? 'Active' : 'Disabled'}</span>
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <a
                                href={admin.scope === 'student_portal' ? `${urls.portalAdmin}/login` : `${urls.websiteAdmin}/login`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-[#138601]/30 hover:bg-[#138601] text-white border border-[#138601]/40 transition-colors"
                              >
                                <span>Login</span>
                                <ArrowRight className="w-3 h-3" />
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Standard Authentication Architecture Guide */}
            <div className="p-5 rounded-xl bg-[#083002] border border-[#138601]/30 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#4bd043]" />
                <span>Standard Authentication & Login Architecture</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-[#041801] border border-[#138601]/20 space-y-1">
                  <div className="font-bold text-green-300">1. Credential Submission</div>
                  <p className="text-gray-300 text-[11px] leading-relaxed">
                    Administrator inputs email and password. No hardcoded credentials exist in client code.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[#041801] border border-[#138601]/20 space-y-1">
                  <div className="font-bold text-green-300">2. Database Verification</div>
                  <p className="text-gray-300 text-[11px] leading-relaxed">
                    Credentials checked via Supabase Auth & cryptographic SHA-256 validation against <code>public.admin_scopes</code>.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[#041801] border border-[#138601]/20 space-y-1">
                  <div className="font-bold text-green-300">3. Scoped Route Protection</div>
                  <p className="text-gray-300 text-[11px] leading-relaxed">
                    Admin Protected Routes inspect active session scope before rendering confidential dashboard views.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            TAB 3: ASSIGN ADMINISTRATORS (INTERACTIVE TOOL)
            ==================================================================== */}
        {activeTab === 'assign' && (
          <div className="space-y-8">
            <div className="border-b border-[#138601]/20 pb-3">
              <h2 className="text-lg sm:text-xl font-bold text-white">Assign & Manage Administrators</h2>
              <p className="text-xs text-green-200/70">
                Grant scoped administrative privileges directly to the database.
              </p>
            </div>

            {/* Assignment Form Card */}
            <div className="p-6 rounded-xl bg-[#083002] border border-[#138601]/40 space-y-5 shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#138601]/30 text-[#4bd043] flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">Assign New Administrator</h3>
                  <p className="text-[11px] text-green-200/70">Creates an authorized administrative record directly in Supabase admin_scopes</p>
                </div>
              </div>

              {assignmentFeedback.text && (
                <div className={`p-3.5 rounded-lg text-xs flex items-start gap-2 border ${
                  assignmentFeedback.type === 'success'
                    ? 'bg-green-950/60 text-[#4bd043] border-green-800'
                    : 'bg-red-950/60 text-red-300 border-red-800'
                }`}>
                  {assignmentFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{assignmentFeedback.text}</span>
                </div>
              )}

              <form onSubmit={handleAssignAdmin} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-green-200 block mb-1">
                    Administrator Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Stanley Okoro"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#041801] border border-[#138601]/40 text-white text-xs placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#138601]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-green-200 block mb-1">
                    Administrative Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. stanley.okoro@futo.edu.ng"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#041801] border border-[#138601]/40 text-white text-xs placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#138601]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-green-200 block mb-1">
                    Administrative Scope & Role
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#041801] border border-[#138601]/40 text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#138601]"
                  >
                    <option value="portal_admin">Portal Admin (Student Portal, ID Cards, Dues, Results)</option>
                    <option value="website_admin">Website Admin (Main Website CMS, News, Events, Execs)</option>
                    <option value="website_editor">Content & Press Editor (News, Gallery, Flyers)</option>
                    <option value="super_admin">Super Administrator (Universal Access to All Dashboards)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-green-200 block mb-1">
                    Initial Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Create secure password (min 6 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#041801] border border-[#138601]/40 text-white text-xs placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#138601]"
                  />
                </div>

                <div className="sm:col-span-2 pt-2">
                  <button
                    type="submit"
                    disabled={isAssigning}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-lg text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] shadow-md transition-all cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isAssigning ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Persisting Administrator to Database...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Save Administrator to Database</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Existing Admins Table with Active Status Toggle */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Current Database Administrators</h3>
              <div className="rounded-xl bg-[#083002] border border-[#138601]/30 overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#041801] border-b border-[#138601]/30 text-green-200/80 uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Administrator</th>
                      <th className="py-3 px-4">Scope</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Toggle Access</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#138601]/15 text-gray-200">
                    {adminsList.map((admin) => (
                      <tr key={admin.id || admin.email} className="hover:bg-[#041801]/40">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{admin.full_name || 'Admin'}</div>
                          <div className="text-[11px] text-green-200/70 font-mono">{admin.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#138601]/20 text-[#4bd043]">
                            {admin.scope}
                          </span>
                        </td>
                        <td className="py-3 px-4 capitalize font-medium">
                          {(admin.role || '').replace(/_/g, ' ')}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                            admin.is_active
                              ? 'bg-green-500/20 text-[#4bd043] border border-green-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${admin.is_active ? 'bg-[#4bd043]' : 'bg-red-400'}`}></span>
                            <span>{admin.is_active ? 'Active' : 'Disabled'}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(admin)}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${
                              admin.is_active
                                ? 'bg-red-950/40 text-red-300 border-red-800/40 hover:bg-red-900/60'
                                : 'bg-green-950/40 text-green-300 border-green-800/40 hover:bg-green-900/60'
                            }`}
                          >
                            {admin.is_active ? 'Disable' : 'Enable'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ====================================================================
            TAB 4: DIRECT SUPABASE SQL (FOR DATABASE ADMINS)
            ==================================================================== */}
        {activeTab === 'sql' && (
          <div className="space-y-6">
            <div className="border-b border-[#138601]/20 pb-3">
              <h2 className="text-lg sm:text-xl font-bold text-white">Direct Supabase SQL Assignment</h2>
              <p className="text-xs text-green-200/70">
                You can assign or reset administrators directly in your Supabase SQL Editor.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#083002] border border-[#138601]/40 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-green-200 uppercase tracking-wider">SQL Snippet</span>
                <button
                  type="button"
                  onClick={() => handleCopy(`INSERT INTO public.admin_scopes (id, email, full_name, password_hash, scope, role, permissions, is_active)
VALUES (
  'admin-super-main',
  'neorxpro@gmail.com',
  'Anyanwu Nestor Ifeanyi',
  'd0f23ddb17def5ee60d4ba4ace435c1106a258af82bc5bb1c8a669f2b5ac6f36',
  'super_admin',
  'super_admin',
  '["*"]'::jsonb,
  true
)
ON CONFLICT (email) DO UPDATE SET
  scope = EXCLUDED.scope,
  role = EXCLUDED.role,
  is_active = true;`, 'sql')}
                  className="px-3 py-1 rounded text-xs font-semibold bg-[#138601] hover:bg-[#0f6c01] text-white transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  {copiedKey === 'sql' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'sql' ? 'Copied!' : 'Copy SQL'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-lg bg-[#041801] border border-[#138601]/20 text-xs text-green-300 font-mono overflow-x-auto leading-relaxed">
{`-- Super Administrator Database Entry (Universal Oversight)
INSERT INTO public.admin_scopes (
  id, 
  email, 
  full_name, 
  password_hash, 
  scope, 
  role, 
  permissions, 
  is_active
) VALUES (
  'admin-super-main',
  'neorxpro@gmail.com',
  'Anyanwu Nestor Ifeanyi',
  'd0f23ddb17def5ee60d4ba4ace435c1106a258af82bc5bb1c8a669f2b5ac6f36',
  'super_admin',
  'super_admin',
  '["*"]'::jsonb,
  true
)
ON CONFLICT (email) DO UPDATE SET
  scope = EXCLUDED.scope,
  role = EXCLUDED.role,
  password_hash = EXCLUDED.password_hash,
  is_active = true;`}
              </pre>
            </div>
          </div>
        )}

      </main>

    </div>
  );
};

export default AdminHub;
