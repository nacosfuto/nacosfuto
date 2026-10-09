import React, { useState, useEffect } from 'react';
import PortalAdminLayout from '../components/PortalAdminLayout';
import { 
  Settings, 
  Save, 
  Building2, 
  GraduationCap, 
  CreditCard, 
  CheckCircle2,
  Calendar,
  Users,
  Shield,
  Lock,
  ShieldAlert,
  UserCheck,
  UserPlus,
  Plus,
  X,
  Check,
  Eye,
  ArrowRight,
  Sparkles,
  History
} from 'lucide-react';
import { 
  getIdCardSettings, 
  getDuesSettings, 
  savePortalSettingsDirectly,
  fetchAcademicSessionsFromDatabase,
  setActiveAcademicSessionInDatabase,
  createAcademicSessionInDatabase
} from '@nacos/supabase';
import { 
  DEFAULT_ACADEMIC_YEAR_START,
  CURRENT_ACADEMIC_YEAR_START, 
  getAcademicSession,
  getActiveAcademicSession,
  getActiveAcademicYearStart,
  parseSessionYears,
  previewProgression,
  onAcademicSessionChange
} from '@nacos/config/academic';
import { useTheme } from '../context/ThemeContext';
import { 
  getLocalPortalAdmins, 
  fetchPortalAdminsFromSupabase, 
  updateAdminAssignedLevel, 
  getPortalAdminSession,
  createPortalAdmin,
  togglePortalAdminStatus
} from '@nacos/auth';

export const PortalAdminSettings = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [idCardFee, setIdCardFee] = useState('');
  const [duesFee, setDuesFee] = useState('');
  const [academicSession, setAcademicSession] = useState('2026/2027');
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Academic Sessions Management & Progression Preview
  const [sessionsList, setSessionsList] = useState([]);
  const [previewTargetSession, setPreviewTargetSession] = useState('2026/2027');
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isAddSessionModalOpen, setIsAddSessionModalOpen] = useState(false);
  const [isAddingSession, setIsAddingSession] = useState(false);
  const [sessionActionMsg, setSessionActionMsg] = useState('');
  const [newSessionData, setNewSessionData] = useState({
    sessionName: '2027/2028',
    makeCurrent: false
  });

  // Admin Scope Management
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [portalAdmins, setPortalAdmins] = useState([]);
  const [adminUpdateMsg, setAdminUpdateMsg] = useState('');
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [addAdminError, setAddAdminError] = useState('');
  const [newAdminData, setNewAdminData] = useState({
    fullName: '',
    email: '',
    role: 'course_adviser',
    assignedLevel: '100',
    password: 'password'
  });

  useEffect(() => {
    // 1. Authoritative fetch directly from Supabase database
    getIdCardSettings().then(s => {
      if (s?.id_card_fee) setIdCardFee(s.id_card_fee);
      if (s?.academic_session) {
        setAcademicSession(s.academic_session);
        setPreviewTargetSession(s.academic_session);
      }
      if (s?.is_application_open !== undefined) setAllowRegistration(Boolean(s.is_application_open));
    }).catch(e => console.warn('Supabase ID settings load warning:', e));

    getDuesSettings().then(ds => {
      if (ds?.dues_amount) setDuesFee(ds.dues_amount);
    }).catch(e => console.warn('Supabase Dues settings load warning:', e));

    fetchAcademicSessionsFromDatabase().then(sessions => {
      setSessionsList(Array.isArray(sessions) ? sessions : []);
      const cur = sessions.find(s => s.is_current === true);
      if (cur) {
        setAcademicSession(cur.session_name);
        setPreviewTargetSession(cur.session_name);
      }
    });

    const unsubSession = onAcademicSessionChange(({ sessionName }) => {
      setAcademicSession(sessionName);
      setPreviewTargetSession(sessionName);
    });

    const session = getPortalAdminSession();
    setCurrentAdmin(session);

    fetchPortalAdminsFromSupabase().then(liveAdmins => {
      setPortalAdmins(Array.isArray(liveAdmins) ? liveAdmins : []);
    });

    return () => {
      if (unsubSession) unsubSession();
    };
  }, []);

  // Confirmation modal for high-impact session switch
  const [confirmSessionModal, setConfirmSessionModal] = useState({ isOpen: false, session: null, targetSession: null, targetName: '' });

  const requestSwitchSession = (sess) => {
    const sName = sess?.session_name || sess?.id || String(sess);
    setConfirmSessionModal({
      isOpen: true,
      session: sess,
      targetSession: sess,
      targetName: sName
    });
  };

  const confirmAndExecuteSwitchSession = async () => {
    const target = confirmSessionModal.session || confirmSessionModal.targetSession;
    if (target) {
      await handleSwitchSession(target);
    }
  };

  const handleSwitchSession = async (sess) => {
    try {
      setIsSaving(true);
      setConfirmSessionModal({ isOpen: false, session: null });
      const res = await setActiveAcademicSessionInDatabase(sess.session_name || sess.id);
      if (res?.success) {
        setAcademicSession(res.sessionName);
        setPreviewTargetSession(res.sessionName);
        const updated = await fetchAcademicSessionsFromDatabase();
        setSessionsList(updated);
        setSessionActionMsg(`Active academic session switched to ${res.sessionName}. Student cohorts dynamically updated!`);
        setTimeout(() => setSessionActionMsg(''), 4500);
      }
    } catch (e) {
      setSaveError(`Failed to switch session: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNewSession = async (e) => {
    e.preventDefault();
    setIsAddingSession(true);
    try {
      const res = await createAcademicSessionInDatabase({
        sessionName: newSessionData.sessionName,
        isCurrent: newSessionData.makeCurrent
      });
      if (res?.success) {
        const updated = await fetchAcademicSessionsFromDatabase();
        setSessionsList(updated);
        if (newSessionData.makeCurrent) {
          setAcademicSession(newSessionData.sessionName);
          setPreviewTargetSession(newSessionData.sessionName);
        }
        setIsAddSessionModalOpen(false);
        setSessionActionMsg(`Academic session ${newSessionData.sessionName} added successfully.`);
        setTimeout(() => setSessionActionMsg(''), 4500);
      }
    } catch (err) {
      alert(`Error creating academic session: ${err.message}`);
    } finally {
      setIsAddingSession(false);
    }
  };

  const handleLevelChange = async (adminId, newLevel) => {
    try {
      const res = await updateAdminAssignedLevel(adminId, newLevel);
      if (res?.error) {
        setAdminUpdateMsg(`Error: ${res.error}`);
      } else {
        setPortalAdmins(res.admins);
        setAdminUpdateMsg(`Academic level assigned: ${newLevel === 'all' ? 'Full Level Rights' : `${newLevel} Level Only`}`);
      }
      setTimeout(() => setAdminUpdateMsg(''), 3500);
    } catch (e) {
      console.error(e);
      setAdminUpdateMsg(`Failed to update level in database: ${e.message}`);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setIsAddingAdmin(true);
    setAddAdminError('');
    try {
      const res = await createPortalAdmin({
        fullName: newAdminData.fullName,
        email: newAdminData.email,
        role: newAdminData.role,
        assignedLevel: newAdminData.assignedLevel,
        initialPassword: newAdminData.password || 'password'
      });

      if (res?.error) {
        setAddAdminError(res.error);
      } else {
        setPortalAdmins(res.admins);
        setAdminUpdateMsg(`Administrator ${newAdminData.fullName} created & synced to database!`);
        setIsAddAdminModalOpen(false);
        setNewAdminData({
          fullName: '',
          email: '',
          role: 'course_adviser',
          assignedLevel: '100',
          password: 'password'
        });
        setTimeout(() => setAdminUpdateMsg(''), 4000);
      }
    } catch (err) {
      setAddAdminError(err.message || 'Failed to create administrator.');
    } finally {
      setIsAddingAdmin(false);
    }
  };

  const handleToggleAdminStatus = async (adminId, currentActive) => {
    try {
      const res = await togglePortalAdminStatus(adminId, !currentActive);
      if (res?.admins) {
        setPortalAdmins(res.admins);
        setAdminUpdateMsg(`Admin account status updated.`);
        setTimeout(() => setAdminUpdateMsg(''), 3000);
      }
    } catch (e) {
      setAdminUpdateMsg(`Status update error: ${e.message}`);
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);
    setSaveError('');
    try {
      const parsedIdCard = Number(idCardFee);
      const parsedDues = Number(duesFee);

      if (isNaN(parsedIdCard) || parsedIdCard < 0) {
        throw new Error('Please enter a valid positive ID Card fee.');
      }
      if (isNaN(parsedDues) || parsedDues < 0) {
        throw new Error('Please enter a valid positive Departmental Dues fee.');
      }

      if (academicSession) {
        await setActiveAcademicSessionInDatabase(academicSession);
      }

      // Single fast atomic database write directly to Supabase
      const res = await savePortalSettingsDirectly({
        idCardFee: parsedIdCard,
        duesFee: parsedDues,
        academicSession: academicSession || getActiveAcademicSession(),
        allowRegistration
      });

      if (res?.error) {
        setSaveError(res.error);
      } else {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3500);
      }
    } catch (err) {
      console.error('Failed to save settings to database:', err);
      setSaveError(err.message || 'Failed to update settings in Supabase database.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PortalAdminLayout 
      title="Student Portal Configuration & Academic Parameters"
      subtitle="Manage department structures, academic calendars, fee schedules, and registration gating"
    >
      <div className="max-w-4xl space-y-6">
        {savedSuccess && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center gap-3 text-emerald-300 text-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Portal settings written directly to database and live across all devices.</span>
          </div>
        )}

        {saveError && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-center gap-3 text-rose-300 text-xs">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
            <span>Database Error: {saveError}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Academic Session Card */}
          <div className={`p-6 rounded-2xl border ${
            isDark ? 'bg-[#04160d] border-emerald-950/60' : 'bg-white border-slate-200'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-bold flex items-center gap-2 text-emerald-400">
                  <Calendar className="w-4 h-4" />
                  <span>Academic Sessions & Dynamic Progression System</span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Changing the active academic session automatically recalculates levels across all student cohorts without manual database editing.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewTargetSession(academicSession || getActiveAcademicSession());
                    setIsPreviewModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview Progression</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddSessionModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 shadow-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Session</span>
                </button>
              </div>
            </div>

            {sessionActionMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center gap-2 text-emerald-300 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{sessionActionMsg}</span>
              </div>
            )}

            {/* Current Active Session Spotlight */}
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Current Authoritative Session</span>
                <div className="flex items-center gap-2.5">
                  <span className="text-xl font-mono font-bold text-gray-900 dark:text-white">
                    {academicSession || getActiveAcademicSession()}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    Active System-Wide
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Progression rule: <code className="font-mono text-emerald-300">Level = {parseSessionYears(academicSession).startYear} - EntryYear + 1</code>.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewTargetSession(academicSession || getActiveAcademicSession());
                    setIsPreviewModalOpen(true);
                  }}
                  className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Inspect cohort progression</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Institutional Academic Sessions Table */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Institutional Academic Sessions Roster
              </label>
              <div className="divide-y divide-gray-100 dark:divide-white/10 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden text-xs">
                {sessionsList.map((sess) => {
                  const isCurrent = sess.is_current === true || sess.session_name === academicSession;
                  return (
                    <div key={sess.id || sess.session_name} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 dark:text-white font-mono text-sm">{sess.session_name}</span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              Current Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 font-mono">
                          Academic Inception Year: {sess.start_year || parseSessionYears(sess.session_name).startYear}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewTargetSession(sess.session_name);
                            setIsPreviewModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded text-[11px] font-medium border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          Preview Impact
                        </button>
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => requestSwitchSession(sess)}
                            className="px-2.5 py-1 rounded text-[11px] font-bold bg-[#138601] hover:bg-[#0f6c01] text-white transition-colors cursor-pointer"
                          >
                            Set As Active Session
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Department & Faculty Structure Card */}
          <div className={`p-6 rounded-2xl border ${
            isDark ? 'bg-[#04160d] border-emerald-950/60' : 'bg-white border-slate-200'
          }`}>
            <h2 className="text-sm font-bold flex items-center gap-2 mb-4 text-emerald-400">
              <Building2 className="w-4 h-4" />
              <span>Departmental Scope & Faculties</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Designated Department
                </label>
                <input
                  type="text"
                  disabled
                  value="Computer Science"
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs border opacity-75 cursor-not-allowed ${
                    isDark ? 'bg-black/40 border-white/5 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Parent School / Faculty
                </label>
                <input
                  type="text"
                  disabled
                  value="School of Information & Comm. Tech (SICT)"
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs border opacity-75 cursor-not-allowed ${
                    isDark ? 'bg-black/40 border-white/5 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Fees & ID Card Schedule Card */}
          <div className={`p-6 rounded-2xl border ${
            isDark ? 'bg-[#04160d] border-emerald-950/60' : 'bg-white border-slate-200'
          }`}>
            <h2 className="text-sm font-bold flex items-center gap-2 mb-4 text-emerald-400">
              <CreditCard className="w-4 h-4" />
              <span>Dues & ID Card Rates</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Student ID Card Fee (₦)
                </label>
                <input
                  type="number"
                  value={idCardFee}
                  onChange={(e) => setIdCardFee(e.target.value)}
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs border focus:outline-none transition-colors ${
                    isDark 
                      ? 'bg-black/30 border-white/10 text-white focus:border-emerald-500/60' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                  }`}
                  placeholder="e.g. 5000"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Live Bachs ID Card fee charged to students</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Departmental Dues Fee (₦)
                </label>
                <input
                  type="number"
                  value={duesFee}
                  onChange={(e) => setDuesFee(e.target.value)}
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs border focus:outline-none transition-colors ${
                    isDark 
                      ? 'bg-black/30 border-white/10 text-white focus:border-emerald-500/60' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                  }`}
                  placeholder="e.g. 2500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Live Bachs Dues clearance fee charged to students</span>
              </div>

              <div className="sm:col-span-2 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowRegistration}
                    onChange={(e) => setAllowRegistration(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300"
                  />
                  <span className="text-xs font-semibold">Enable Student Portal Self-Registration</span>
                </label>
              </div>

              {/* Bachs Live Gateway Banner */}
              <div className="sm:col-span-2 mt-2 p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 text-emerald-300">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-bold">Bachs Universal Payment Gateway Active (Live Production)</span>
                </div>
                <div className="text-[11px] text-emerald-400/80 font-mono">
                  All channels: ID Card, Dues, Events &amp; Custom Fees
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 py-2.5 px-6 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Syncing to Live Database...' : 'Save Portal Settings'}</span>
            </button>
          </div>
        </form>

        {/* ─── Administrator Academic Level Scoping Card ─── */}
        <div className={`p-6 rounded-2xl border space-y-4 ${
          isDark ? 'bg-[#04160d] border-emerald-950/60' : 'bg-white border-slate-200'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-emerald-400">
              <Users className="w-4 h-4" />
              <h2 className="text-sm font-bold">Administrator Level Assignments & Scope Rights</h2>
            </div>
            <div className="flex items-center gap-2.5">
              {adminUpdateMsg && (
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-md border border-emerald-800">
                  {adminUpdateMsg}
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsAddAdminModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 shadow-sm cursor-pointer transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Administrator</span>
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Assign designated academic levels and specific operational features (e.g. <em>Results Management</em>, <em>Student Registry</em>, or <em>ID Processing</em>) to individual administrators. Course Advisers solely manage their assigned cohort results and student records.
          </p>

          <div className="divide-y divide-gray-100 dark:divide-white/10 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden text-xs">
            {portalAdmins.map((admin) => {
              const isSuper = admin.scope === 'super_admin' || admin.role === 'super_admin';
              const assigned = admin.assigned_level || 'all';
              const features = admin.permissions?.filter(p => p.startsWith('feature:')) || [
                'feature:student_registry',
                'feature:results_management'
              ];

              return (
                <div key={admin.id || admin.email} className="p-4 flex flex-col gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 dark:text-white">{admin.full_name}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isSuper 
                            ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300' 
                            : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        }`}>
                          {admin.role?.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 font-mono">{admin.email}</p>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-gray-400">Level:</span>
                        <select
                          value={assigned}
                          onChange={(e) => handleLevelChange(admin.id, e.target.value)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                            assigned === 'all'
                              ? 'bg-emerald-50 dark:bg-[#041801] text-[#138601] dark:text-[#4bd043] border-[#138601]/30'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                          }`}
                        >
                          <option value="all">Full Access (All Levels)</option>
                          <option value="100">100 Level (Course Adviser)</option>
                          <option value="200">200 Level (Course Adviser)</option>
                          <option value="300">300 Level (Course Adviser)</option>
                          <option value="400">400 Level (Course Adviser)</option>
                          <option value="500">500 Level (Course Adviser)</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleAdminStatus(admin.id, admin.is_active !== false)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                          admin.is_active !== false
                            ? 'bg-emerald-100/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                            : 'bg-rose-100/60 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                        }`}
                        title={admin.is_active !== false ? 'Click to disable access' : 'Click to enable access'}
                      >
                        {admin.is_active !== false ? 'Active' : 'Disabled'}
                      </button>
                    </div>
                  </div>

                  {/* Feature-Based Capabilities Strip */}
                  <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Assigned Features:</span>
                    {[
                      { key: 'feature:student_registry', label: 'Student Registry' },
                      { key: 'feature:results_management', label: 'Results & Grading' },
                      { key: 'feature:id_management', label: 'ID Verification' },
                      { key: 'feature:resource_management', label: 'Resource Management' }
                    ].map(f => {
                      const isActive = isSuper || features.includes(f.key) || admin.role === 'course_adviser' && (f.key === 'feature:student_registry' || f.key === 'feature:results_management');
                      return (
                        <span 
                          key={f.key}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            isActive
                              ? 'bg-green-50 dark:bg-[#083002] text-[#138601] dark:text-[#4bd043] border-[#138601]/30'
                              : 'bg-gray-100 dark:bg-white/5 text-gray-400 border-transparent opacity-60'
                          }`}
                        >
                          {f.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal: Add New Portal Administrator */}
        {isAddAdminModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-5 border-b border-gray-100 dark:border-[#138601]/25 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Add Portal Administrator</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddAdminModalOpen(false)}
                  className="text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateAdmin} className="p-5 space-y-4 text-xs">
                {addAdminError && (
                  <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300">
                    {addAdminError}
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-green-200 mb-1">
                    Full Name &amp; Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Jacinta Odirichukwu"
                    value={newAdminData.fullName}
                    onChange={(e) => setNewAdminData({ ...newAdminData, fullName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/40 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-green-200 mb-1">
                    Official Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. jacinta.odirichukwu@futo.edu.ng"
                    value={newAdminData.email}
                    onChange={(e) => setNewAdminData({ ...newAdminData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/40 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-green-200 mb-1">
                      Administrative Role
                    </label>
                    <select
                      value={newAdminData.role}
                      onChange={(e) => setNewAdminData({ ...newAdminData, role: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/40 text-gray-900 dark:text-white"
                    >
                      <option value="course_adviser">Course Adviser</option>
                      <option value="portal_admin">Portal Administrator</option>
                      <option value="super_admin">Super Administrator</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-green-200 mb-1">
                      Assigned Level
                    </label>
                    <select
                      value={newAdminData.assignedLevel}
                      onChange={(e) => setNewAdminData({ ...newAdminData, assignedLevel: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/40 text-gray-900 dark:text-white"
                    >
                      <option value="all">Full Access (All Levels)</option>
                      <option value="100">100 Level</option>
                      <option value="200">200 Level</option>
                      <option value="300">300 Level</option>
                      <option value="400">400 Level</option>
                      <option value="500">500 Level</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-green-200 mb-1">
                    Initial Password
                  </label>
                  <input
                    type="text"
                    required
                    value={newAdminData.password}
                    onChange={(e) => setNewAdminData({ ...newAdminData, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/40 text-gray-900 dark:text-white font-mono"
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">Default initial password is 'password'. Admin can change after login.</span>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsAddAdminModalOpen(false)}
                    className="px-4 py-2 rounded-lg font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingAdmin}
                    className="px-5 py-2 rounded-lg font-bold text-white bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isAddingAdmin ? 'Syncing to Database...' : 'Create Administrator'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Progression Impact Preview */}
        {isPreviewModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-5 border-b border-gray-100 dark:border-[#138601]/25 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Cohort Progression Matrix Preview
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                {/* Session Selector in Modal */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-gray-50 dark:bg-[#041801]/60 border border-gray-200 dark:border-[#138601]/30">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">Previewing Target Session</span>
                    <span className="text-base font-mono font-bold text-gray-900 dark:text-white">{previewTargetSession}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Inspect other session:</span>
                    <select
                      value={previewTargetSession}
                      onChange={(e) => setPreviewTargetSession(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-[#138601]/40 bg-white dark:bg-[#083002] text-gray-900 dark:text-white font-mono font-bold"
                    >
                      {sessionsList.map(s => (
                        <option key={s.session_name} value={s.session_name}>
                          {s.session_name} {s.session_name === academicSession ? '(Current)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Cohort Progression Table */}
                <div className="border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 font-bold text-[11px] text-gray-600 dark:text-gray-300">
                      <tr>
                        <th className="py-2.5 px-3.5">Cohort (Entry Year)</th>
                        <th className="py-2.5 px-3.5">Calculated Level</th>
                        <th className="py-2.5 px-3.5">Academic Status</th>
                        <th className="py-2.5 px-3.5">Graduation Class</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5 font-mono text-[11px]">
                      {previewProgression(parseSessionYears(previewTargetSession).startYear).map((row) => (
                        <tr key={row.cohort} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                          <td className="py-2.5 px-3.5 font-bold text-gray-900 dark:text-white">
                            {row.cohort} Cohort ({row.cohort}XXXX)
                          </td>
                          <td className="py-2.5 px-3.5">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.isGraduated
                                ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800'
                                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            }`}>
                              {row.levelString}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5">
                            <span className={row.isGraduated ? 'text-purple-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                              {row.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 text-gray-600 dark:text-gray-300">
                            {row.classOfDisplay}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-[11px] text-emerald-300 leading-relaxed">
                  <strong>Scalable Progression Guarantee:</strong> Student levels are calculated dynamically using <code className="font-mono">CurrentYear - EntryYear + 1</code>. When students reach graduation, their portal accounts remain active as Alumni with their <code className="font-mono">Class of</code> preserved.
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setIsPreviewModalOpen(false)}
                    className="px-4 py-2 rounded-lg font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 transition-colors cursor-pointer"
                  >
                    Close Preview
                  </button>

                  {previewTargetSession !== academicSession && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsPreviewModalOpen(false);
                        requestSwitchSession({ session_name: previewTargetSession });
                      }}
                      className="px-5 py-2 rounded-lg font-bold text-white bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 shadow-sm transition-colors cursor-pointer"
                    >
                      Activate {previewTargetSession} Session System-Wide
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Confirm Session Switch */}
        {confirmSessionModal.isOpen && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#072402] border border-gray-200 dark:border-emerald-800/60 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-5 border-b border-gray-100 dark:border-emerald-900/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Change Academic Session?</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmSessionModal({ isOpen: false, targetSession: null, targetName: '' })}
                  className="text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  Changing the active academic session will update the academic level displayed across the portal based on each student&apos;s entry year.
                </p>

                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 flex items-center justify-between">
                  <span className="text-emerald-400 font-medium">Target Session:</span>
                  <span className="font-mono font-bold text-sm text-emerald-300">{confirmSessionModal.targetName}</span>
                </div>

                <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-300/90 leading-relaxed">
                  <strong>Notice:</strong> Permanent student records (registration numbers, entry years, historical payments, and completed election logs) will remain safely intact and will not be mutated.
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmSessionModal({ isOpen: false, targetSession: null, targetName: '' })}
                    className="px-4 py-2 rounded-lg font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#041801] border border-gray-200 dark:border-emerald-800/30 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmAndExecuteSwitchSession}
                    className="px-5 py-2 rounded-lg font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-md transition-colors cursor-pointer"
                  >
                    Change Session
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Add New Academic Session */}
        {isAddSessionModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-5 border-b border-gray-100 dark:border-[#138601]/25 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Add Future Academic Session</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddSessionModalOpen(false)}
                  className="text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateNewSession} className="p-5 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-green-200 mb-1">
                    Academic Session Name * (Format: YYYY/YYYY)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2027/2028"
                    value={newSessionData.sessionName}
                    onChange={(e) => setNewSessionData({ ...newSessionData, sessionName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/40 text-gray-900 dark:text-white font-mono"
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    Calculates entry year progression for {parseSessionYears(newSessionData.sessionName).startYear} inception.
                  </span>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newSessionData.makeCurrent}
                      onChange={(e) => setNewSessionData({ ...newSessionData, makeCurrent: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300"
                    />
                    <span className="font-semibold text-gray-700 dark:text-green-200">
                      Set as current active session immediately upon creation
                    </span>
                  </label>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsAddSessionModalOpen(false)}
                    className="px-4 py-2 rounded-lg font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingSession}
                    className="px-5 py-2 rounded-lg font-bold text-white bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isAddingSession ? 'Saving Session...' : 'Create Academic Session'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PortalAdminLayout>
  );
};

export default PortalAdminSettings;
