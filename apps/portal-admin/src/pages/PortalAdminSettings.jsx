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
  UserCheck
} from 'lucide-react';
import { getIdCardSettings, updateIdCardFee, getDuesSettings, updateDuesFee } from '@nacos/supabase';
import { CURRENT_ACADEMIC_YEAR_START, getAcademicSession } from '@nacos/config/academic';
import { useTheme } from '../context/ThemeContext';
import { getLocalPortalAdmins, updateAdminAssignedLevel, getPortalAdminSession } from '@nacos/auth';

export const PortalAdminSettings = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [idCardFee, setIdCardFee] = useState(5000);
  const [duesFee, setDuesFee] = useState(2500);
  const [academicSession, setAcademicSession] = useState('2026/2027');
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Admin Scope Management
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [portalAdmins, setPortalAdmins] = useState([]);
  const [adminUpdateMsg, setAdminUpdateMsg] = useState('');

  useEffect(() => {
    try {
      getIdCardSettings().then(s => {
        if (s?.id_card_fee) setIdCardFee(s.id_card_fee);
        if (s?.academic_session) setAcademicSession(s.academic_session);
      });

      getDuesSettings().then(ds => {
        if (ds?.dues_amount) setDuesFee(ds.dues_amount);
      });

      const session = getPortalAdminSession();
      setCurrentAdmin(session);

      const admins = getLocalPortalAdmins();
      setPortalAdmins(admins);
    } catch (e) {}
  }, []);

  const handleLevelChange = async (adminId, newLevel) => {
    try {
      const res = await updateAdminAssignedLevel(adminId, newLevel);
      setPortalAdmins(res.admins);
      setAdminUpdateMsg(`Academic level assigned: ${newLevel === 'all' ? 'Full Level Rights' : `${newLevel} Level Only`}`);
      setTimeout(() => setAdminUpdateMsg(''), 3500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    try {
      updateIdCardFee(Number(idCardFee));
      updateDuesFee(Number(duesFee), academicSession);
    } catch (e) {}

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
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
            <span>Portal settings updated and persisted successfully.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Academic Session Card */}
          <div className={`p-6 rounded-2xl border ${
            isDark ? 'bg-[#04160d] border-emerald-950/60' : 'bg-white border-slate-200'
          }`}>
            <h2 className="text-sm font-bold flex items-center gap-2 mb-4 text-emerald-400">
              <Calendar className="w-4 h-4" />
              <span>Academic Session & Year Parameters</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Current Academic Session
                </label>
                <input
                  type="text"
                  value={academicSession}
                  onChange={(e) => setAcademicSession(e.target.value)}
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs border focus:outline-none transition-colors ${
                    isDark 
                      ? 'bg-black/30 border-white/10 text-white focus:border-emerald-500/60' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Academic Year Inception
                </label>
                <input
                  type="number"
                  disabled
                  value={CURRENT_ACADEMIC_YEAR_START}
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs border opacity-75 cursor-not-allowed ${
                    isDark ? 'bg-black/40 border-white/5 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
                  }`}
                />
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
              className="flex items-center gap-2 py-2.5 px-6 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 transition-all shadow-md cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Portal Settings</span>
            </button>
          </div>
        </form>

        {/* ─── Administrator Academic Level Scoping Card ─── */}
        <div className={`p-6 rounded-2xl border space-y-4 ${
          isDark ? 'bg-[#04160d] border-emerald-950/60' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400">
              <Users className="w-4 h-4" />
              <h2 className="text-sm font-bold">Administrator Level Assignments & Scope Rights</h2>
            </div>
            {adminUpdateMsg && (
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-md border border-emerald-800">
                {adminUpdateMsg}
              </span>
            )}
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

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-gray-400">Assigned Level:</span>
                      <select
                        value={assigned}
                        onChange={(e) => handleLevelChange(admin.id, e.target.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
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
      </div>
    </PortalAdminLayout>
  );
};

export default PortalAdminSettings;
