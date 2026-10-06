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
  Shield,
  LayoutDashboard,
  CreditCard,
  BookOpen,
  Image as ImageIcon,
  Compass,
  Layers,
  ChevronRight,
  Server,
  Activity,
  X
} from 'lucide-react';
import logoDark from '../assets/full-logo-dark.png';
import logoLight from '../assets/full-logo-light.png';
import { supabase, hashPassword, getLocalAdminScopesDatabase } from '@nacos/supabase';
import { getAppUrls } from '@nacos/config/urls';

const AdminHub = () => {
  const isDark = true;
  const urls = getAppUrls();

  const [adminsList, setAdminsList] = useState([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(true);
  const [copiedKey, setCopiedKey] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State for Adding Admin
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('portal_admin');
  const [newPassword, setNewPassword] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  // Course Creators & Instructors State (Super Admin Control)
  const [creatorApps, setCreatorApps] = useState([]);
  const [approvedCreators, setApprovedCreators] = useState([]);
  const [isAddCreatorModalOpen, setIsAddCreatorModalOpen] = useState(false);
  const [creatorAssignName, setCreatorAssignName] = useState('');
  const [creatorAssignEmail, setCreatorAssignEmail] = useState('');
  const [creatorAssignSpecialization, setCreatorAssignSpecialization] = useState('Fullstack Engineering');
  const [creatorFeedback, setCreatorFeedback] = useState({ type: '', text: '' });

  // Load existing creators and applications
  const loadCreators = () => {
    try {
      const rawApps = localStorage.getItem('nacos_creator_applications_db');
      if (rawApps) {
        setCreatorApps(JSON.parse(rawApps));
      } else {
        const defaultApps = [
          {
            id: 'app-1',
            fullName: 'Emmanuel Chidubem',
            email: 'emmanuel.chidubem@student.futo.edu.ng',
            specialization: 'Cybersecurity & Network Security',
            topic_idea: 'Practical Linux Terminal & Wireshark Packet Analysis',
            experience: '3 years active CTF player, CompTIA Security+',
            status: 'pending',
            created_at: new Date(Date.now() - 86400000 * 2).toISOString()
          },
          {
            id: 'app-2',
            fullName: 'Blessing Amaka',
            email: 'blessing.amaka@student.futo.edu.ng',
            specialization: 'UI/UX & Product Design',
            topic_idea: 'Figma to Code: Building Accessible Design Systems',
            experience: 'Lead UI designer for departmental hackathon winners',
            status: 'pending',
            created_at: new Date(Date.now() - 86400000 * 1).toISOString()
          }
        ];
        localStorage.setItem('nacos_creator_applications_db', JSON.stringify(defaultApps));
        setCreatorApps(defaultApps);
      }

      const rawCreators = localStorage.getItem('nacos_approved_creators_db');
      if (rawCreators) {
        setApprovedCreators(JSON.parse(rawCreators));
      } else {
        const defaultCreators = [
          {
            id: 'creator-admin',
            name: 'Engr. David Okon',
            email: 'david.okon@futo.edu.ng',
            specialization: 'Fullstack Engineering & Cloud',
            status: 'approved',
            approved_at: '2026-01-01T00:00:00Z'
          },
          {
            id: 'creator-1',
            name: 'Ifeanyi John',
            email: 'ifeanyi.john@nacos.futo.edu.ng',
            specialization: 'React & Node.js',
            status: 'approved',
            approved_at: '2026-01-15T00:00:00Z'
          }
        ];
        localStorage.setItem('nacos_approved_creators_db', JSON.stringify(defaultCreators));
        setApprovedCreators(defaultCreators);
      }
    } catch (e) {
      console.warn('Error loading creators in AdminHub:', e);
    }
  };

  const handleApproveCreatorApp = (app) => {
    try {
      const updatedApps = creatorApps.map(a => a.id === app.id ? { ...a, status: 'approved' } : a);
      setCreatorApps(updatedApps);
      localStorage.setItem('nacos_creator_applications_db', JSON.stringify(updatedApps));

      const existing = approvedCreators.find(c => c.email?.toLowerCase() === app.email?.toLowerCase());
      if (!existing) {
        const newApproved = [
          {
            id: `creator-${Date.now()}`,
            user_id: app.user_id,
            name: app.fullName,
            email: app.email,
            specialization: app.specialization,
            status: 'approved',
            approved_at: new Date().toISOString()
          },
          ...approvedCreators
        ];
        setApprovedCreators(newApproved);
        localStorage.setItem('nacos_approved_creators_db', JSON.stringify(newApproved));
      }
      setCreatorFeedback({ type: 'success', text: `Approved ${app.fullName} as course creator!` });
      setTimeout(() => setCreatorFeedback({ type: '', text: '' }), 3500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectCreatorApp = (appId) => {
    try {
      const updatedApps = creatorApps.map(a => a.id === appId ? { ...a, status: 'rejected' } : a);
      setCreatorApps(updatedApps);
      localStorage.setItem('nacos_creator_applications_db', JSON.stringify(updatedApps));
      setCreatorFeedback({ type: 'info', text: 'Application rejected.' });
      setTimeout(() => setCreatorFeedback({ type: '', text: '' }), 3000);
    } catch (e) {
      console.error('Failed to reject creator application:', e);
    }
  };

  const handleDirectAssignCreator = (e) => {
    e.preventDefault();
    if (!creatorAssignEmail.trim() || !creatorAssignName.trim()) return;

    const newCreator = {
      id: `creator-${Date.now()}`,
      name: creatorAssignName.trim(),
      email: creatorAssignEmail.trim(),
      specialization: creatorAssignSpecialization.trim() || 'Technical Instructor',
      status: 'approved',
      assigned_by_superadmin: true,
      approved_at: new Date().toISOString()
    };

    const updated = [newCreator, ...approvedCreators];
    setApprovedCreators(updated);
    localStorage.setItem('nacos_approved_creators_db', JSON.stringify(updated));

    setCreatorFeedback({ type: 'success', text: `Directly granted creator privileges to ${newCreator.name}!` });
    setCreatorAssignName('');
    setCreatorAssignEmail('');
    setIsAddCreatorModalOpen(false);
    setTimeout(() => setCreatorFeedback({ type: '', text: '' }), 3500);
  };

  const handleRevokeCreator = (creatorId) => {
    const updated = approvedCreators.filter(c => c.id !== creatorId);
    setApprovedCreators(updated);
    localStorage.setItem('nacos_approved_creators_db', JSON.stringify(updated));
    setCreatorFeedback({ type: 'info', text: 'Creator privilege revoked.' });
    setTimeout(() => setCreatorFeedback({ type: '', text: '' }), 3000);
  };

  // Load existing administrators from Supabase & Local Database
  const loadAdmins = async () => {
    setIsLoadingAdmins(true);
    let list = [];

    // 1. Try live Supabase admin_scopes table
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('admin_scopes')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          list = data;
        }
      }
    } catch (e) {
      console.warn('Supabase admins fetch notice:', e);
    }

    // 2. Fallback to local DB if offline or empty
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

  const handleToggleActive = async (admin) => {
    const updatedStatus = !admin.is_active;
    const updated = adminsList.map(a => a.id === admin.id ? { ...a, is_active: updatedStatus } : a);
    setAdminsList(updated);
    localStorage.setItem('nacos_admin_scopes_db', JSON.stringify(updated));

    try {
      if (supabase) {
        await supabase.from('admin_scopes').update({ is_active: updatedStatus }).eq('id', admin.id);
      }
    } catch (e) {
      console.error('Failed to update admin scope:', e);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!newEmail.trim() || !newFullName.trim()) {
      setFeedback({ type: 'error', text: 'Full Name and Email are required.' });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setFeedback({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    setIsAssigning(true);
    setFeedback({ type: '', text: '' });

    try {
      const cleanEmail = newEmail.trim().toLowerCase();
      const pwdHash = await hashPassword(newPassword);
      const adminId = `admin-${Date.now()}`;

      let scope = 'student_portal';
      let permissions = ['student_portal.students', 'student_portal.id_cards', 'student_portal.dues'];

      if (newRole === 'super_admin') {
        scope = 'super_admin';
        permissions = ['*'];
      } else if (newRole === 'portal_admin') {
        scope = 'student_portal';
        permissions = ['student_portal.students', 'student_portal.id_cards', 'student_portal.dues', 'student_portal.results'];
      } else if (newRole === 'website_admin') {
        scope = 'main_website';
        permissions = ['main_website.view', 'main_website.media', 'main_website.news', 'main_website.events'];
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

      // 1. Save to Supabase
      try {
        if (supabase) {
          await supabase.from('admin_scopes').upsert([newRecord]);
        }
      } catch (err) {
        console.warn('Supabase upsert error:', err);
      }

      // 2. Save to local storage
      const localScopes = getLocalAdminScopesDatabase();
      const existingIdx = localScopes.findIndex(a => a.email.toLowerCase() === cleanEmail);
      if (existingIdx !== -1) {
        localScopes[existingIdx] = { ...localScopes[existingIdx], ...newRecord };
      } else {
        localScopes.unshift(newRecord);
      }
      localStorage.setItem('nacos_admin_scopes_db', JSON.stringify(localScopes));

      setFeedback({
        type: 'success',
        text: `Administrator ${newFullName.trim()} (${cleanEmail}) assigned successfully!`
      });

      setNewFullName('');
      setNewEmail('');
      setNewPassword('');
      await loadAdmins();
      setTimeout(() => {
        setIsAddModalOpen(false);
        setFeedback({ type: '', text: '' });
      }, 1500);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to assign administrator.' });
    } finally {
      setIsAssigning(false);
    }
  };

  const portalCards = [
    {
      id: 'student-portal',
      title: 'Student Portal',
      category: 'Self-Service & Academics',
      description: 'The core student dashboard for ID card applications, departmental dues clearance receipts, results appraisal, and course repositories.',
      icon: GraduationCap,
      accentColor: 'from-emerald-600 to-green-700',
      badge: 'Student Access',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      url: urls.portal,
      links: [
        { label: 'Open Student Portal', href: urls.portal, isExternal: false },
        { label: 'ID Card Application', href: `${urls.portal}/id-card`, isExternal: false },
        { label: 'Dues & Clearance', href: `${urls.portal}/dues`, isExternal: false }
      ]
    },
    {
      id: 'portal-admin',
      title: 'Portal Admin Command Center',
      category: 'Directorate of Student Operations',
      description: 'Comprehensive administrative console for vetting student registrations, approving official ID cards, dues clearance, and student rosters.',
      icon: ShieldCheck,
      accentColor: 'from-blue-600 to-indigo-700',
      badge: 'Portal Officers & HoD',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      url: urls.portalAdmin,
      links: [
        { label: 'Launch Admin Console', href: urls.portalAdmin, isExternal: true },
        { label: 'Manage ID Cards', href: `${urls.portalAdmin}/id-cards`, isExternal: true },
        { label: 'Student Whitelist', href: `${urls.portalAdmin}/students`, isExternal: true }
      ]
    },
    {
      id: 'website-admin',
      title: 'Website Content Manager (CMS)',
      category: 'Editorial & Media Directorate',
      description: 'Content management system for departmental announcements, academic news, executive team rosters, events, and Cloudinary media assets.',
      icon: ImageIcon,
      accentColor: 'from-purple-600 to-indigo-800',
      badge: 'Content Editors',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      url: urls.websiteAdmin,
      links: [
        { label: 'Launch Website CMS', href: urls.websiteAdmin, isExternal: true },
        { label: 'News & Announcements', href: `${urls.websiteAdmin}/news`, isExternal: true },
        { label: 'Media Library', href: `${urls.websiteAdmin}/media`, isExternal: true }
      ]
    },
    {
      id: 'main-website',
      title: 'Main Public Website',
      category: 'Public Gateway',
      description: 'The primary public web portal for NACOS FUTO, showcasing academic programs, campus life, yellow pages, anthems, and leadership.',
      icon: Globe,
      accentColor: 'from-amber-600 to-orange-700',
      badge: 'Public & Students',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      url: urls.website,
      links: [
        { label: 'Visit Main Website', href: urls.website, isExternal: false },
        { label: 'Academic Gateway', href: `${urls.website}/resources`, isExternal: false },
        { label: 'Yellow Pages', href: `${urls.website}/yellow-pages`, isExternal: false }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#041801] text-white font-sans selection:bg-[#138601] selection:text-white pb-20">
      
      {/* ─── Top Header Bar ─── */}
      <header className="border-b border-[#138601]/25 bg-[#083002]/95 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3.5 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center">
              <img src={logoDark} alt="NACOS FUTO Logo" className="h-8 sm:h-9 w-auto object-contain" />
            </Link>
            <div className="hidden sm:block border-l border-[#138601]/30 pl-3">
              <span className="text-xs font-bold text-[#4bd043] uppercase tracking-wider block">
                Central Portals & Admin Hub
              </span>
              <span className="text-[11px] text-green-200/70 block">
                Department of Computer Science • Federal University of Technology, Owerri
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center gap-1.5 text-xs text-[#4bd043] font-medium">
              <span className="w-2 h-2 rounded-full bg-[#4bd043]"></span>
              <span className="hidden sm:inline">Central Database Online</span>
              <span className="sm:hidden">Online</span>
            </div>

            <Link
              to="/"
              className="px-3.5 py-1.5 rounded text-xs font-semibold text-green-100 hover:text-white bg-[#138601]/30 hover:bg-[#138601] border border-[#138601]/40 transition-colors"
            >
              Main Website
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero Section ─── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#083002] via-[#041801] to-[#041801] border-b border-[#138601]/20 py-12 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto text-center space-y-4">

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            NACOS FUTO Central Operations & Portals Gateway
          </h1>
          <p className="text-xs sm:text-sm text-green-100/80 max-w-2xl mx-auto leading-relaxed">
            The central navigation gateway connecting all independent portals in the NACOS FUTO technology ecosystem. Launch student applications, manage academic verifications, or administer editorial publications below.
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto pt-4">
            <div className="p-3 rounded bg-[#083002]/80 border border-[#138601]/30 text-center">
              <div className="text-base sm:text-lg font-bold text-white">4 Portals</div>
              <div className="text-[11px] text-green-300/70">Unified Ecosystem</div>
            </div>
            <div className="p-3 rounded bg-[#083002]/80 border border-[#138601]/30 text-center">
              <div className="text-base sm:text-lg font-bold text-[#4bd043]">Live Sync</div>
              <div className="text-[11px] text-green-300/70">Supabase Realtime</div>
            </div>
            <div className="p-3 rounded bg-[#083002]/80 border border-[#138601]/30 text-center">
              <div className="text-base sm:text-lg font-bold text-white">256-Bit</div>
              <div className="text-[11px] text-green-300/70">Encrypted Auth</div>
            </div>
            <div className="p-3 rounded bg-[#083002]/80 border border-[#138601]/30 text-center">
              <div className="text-base sm:text-lg font-bold text-[#4bd043]">Role-Based</div>
              <div className="text-[11px] text-green-300/70">Scoped Security</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Main Content Container ─── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-10 space-y-12">
        
        {/* ─── 1. Universal Portals Gateway Grid ─── */}
        <section className="space-y-5">
          <div className="flex items-center justify-between border-b border-[#138601]/20 pb-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#4bd043]" />
                <span>Ecosystem Portals & Control Centers</span>
              </h2>
              <p className="text-xs text-green-200/70">One-click launchpads into each specialized application.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {portalCards.map((card) => {
              const Icon = card.icon;
              return (
                <div 
                  key={card.id}
                  className="rounded bg-[#083002] border border-[#138601]/30 hover:border-[#138601] p-6 shadow-xl flex flex-col justify-between transition-all group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 rounded bg-gradient-to-br ${card.accentColor} text-white flex items-center justify-center shadow-md`}>
                        <Icon className="w-6 h-6" />
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-green-400 block mb-1">
                        {card.category}
                      </span>
                      <h3 className="text-lg font-bold text-white group-hover:text-[#4bd043] transition-colors">
                        {card.title}
                      </h3>
                      <p className="text-xs text-green-100/80 mt-1.5 leading-relaxed">
                        {card.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-5 mt-5 border-t border-[#138601]/20 space-y-2">
                    <a
                      href={card.url}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded bg-[#138601] hover:bg-[#0f6c01] text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      <span>Open {card.title}</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {card.links.map((lnk, idx) => (
                        <a
                          key={idx}
                          href={lnk.href}
                          className="text-[11px] font-medium text-green-300/80 hover:text-white hover:underline inline-flex items-center gap-1 py-0.5 px-1.5 rounded hover:bg-[#041801]/60 transition-colors"
                        >
                          <span>{lnk.label}</span>
                          <ChevronRight className="w-3 h-3 text-green-400/60" />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── 2. Administrator Roster & Security Scopes ─── */}
        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#138601]/20 pb-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#4bd043]" />
                <span>Authorized Administrators & Scopes</span>
              </h2>
              <p className="text-xs text-green-200/70">Verified administrative personnel authorized across database domains.</p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={loadAdmins}
                className="px-3 py-1.5 rounded text-xs font-semibold text-green-200 bg-[#083002] hover:bg-[#138601]/20 border border-[#138601]/30 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Refresh from database"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAdmins ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="px-3.5 py-1.5 rounded text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Assign Administrator</span>
              </button>
            </div>
          </div>

          {/* Admins Table */}
          <div className="rounded bg-[#083002] border border-[#138601]/30 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#041801]/80 text-green-300/80 font-bold uppercase text-[10px] tracking-wider border-b border-[#138601]/20">
                  <tr>
                    <th className="py-3 px-4">Administrator</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Assigned Role & Scope</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#138601]/15 text-green-100">
                  {adminsList.map((adm) => {
                    const isSuper = adm.scope === 'super_admin' || adm.role === 'super_admin';
                    const isPortal = adm.scope === 'student_portal' || adm.role === 'portal_admin';

                    return (
                      <tr key={adm.id || adm.email} className="hover:bg-[#041801]/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-[#138601] text-white flex items-center justify-center font-bold text-xs shrink-0">
                              {(adm.full_name || adm.name || 'A')[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-white">{adm.full_name || adm.name || 'Admin Officer'}</div>
                              <div className="text-[10px] text-green-300/60 font-mono">ID: {adm.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-gray-300">
                          {adm.email}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-xs font-semibold text-green-200">
                            {adm.role || adm.scope}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`text-xs font-semibold ${adm.is_active !== false ? 'text-green-400' : 'text-red-400'}`}>
                            {adm.is_active !== false ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(adm)}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer border ${
                              adm.is_active !== false
                                ? 'text-red-400 hover:text-white bg-red-950/40 hover:bg-red-900/60 border-red-900/40'
                                : 'text-green-400 hover:text-white bg-green-950/40 hover:bg-green-900/60 border-green-900/40'
                            }`}
                          >
                            {adm.is_active !== false ? 'Disable' : 'Enable'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

      </main>

      {/* ─── Add Administrator Modal ─── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#083002] border border-[#138601]/40 rounded w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#138601]/25 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded bg-[#138601]/20 text-[#4bd043] flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Assign Administrator</h3>
                  <p className="text-[11px] text-green-200/70">Grant scoped administrative access credentials</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setFeedback({ type: '', text: '' });
                }}
                className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#041801] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="p-5 space-y-4">
              {feedback.text && (
                <div className={`p-3 rounded text-xs flex items-start gap-2 border ${
                  feedback.type === 'error'
                    ? 'bg-red-950/40 border-red-900/50 text-red-300'
                    : 'bg-green-950/40 border-[#138601]/40 text-[#4bd043]'
                }`}>
                  {feedback.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
                  <span>{feedback.text}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-green-200 block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Jane Okoro"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded border border-[#138601]/40 bg-[#041801] text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#138601]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-green-200 block mb-1">
                  Official Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. admin@nacos.org.ng"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded border border-[#138601]/40 bg-[#041801] text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#138601]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-green-200 block mb-1">
                  Administrative Role & Scope
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded border border-[#138601]/40 bg-[#041801] text-white focus:outline-none focus:ring-1 focus:ring-[#138601]"
                >
                  <option value="portal_admin">Portal Admin Officer (ID Cards, Dues, Student Records)</option>
                  <option value="website_admin">Website CMS Manager (News, Events, Media)</option>
                  <option value="super_admin">Super Administrator (Full System Scope)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-green-200 block mb-1">
                  Temporary / Initial Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded border border-[#138601]/40 bg-[#041801] text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#138601]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setFeedback({ type: '', text: '' });
                  }}
                  className="px-4 py-2 rounded text-xs font-semibold text-gray-300 hover:bg-[#041801] border border-[#138601]/30 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning}
                  className="px-5 py-2 rounded text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isAssigning ? 'Provisioning...' : 'Provision Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminHub;
