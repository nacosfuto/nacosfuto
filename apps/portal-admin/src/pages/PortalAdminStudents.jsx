import React, { useState, useEffect, useMemo, useRef } from 'react';
import PortalAdminLayout from '../components/PortalAdminLayout';
import { 
  Users, 
  Search, 
  UserPlus, 
  Upload, 
  Download, 
  RotateCcw, 
  CheckCircle, 
  XCircle, 
  KeyRound, 
  Edit, 
  Eye, 
  Filter,
  GraduationCap,
  RefreshCw,
  CreditCard,
  ShieldCheck,
  FileSpreadsheet,
  AlertTriangle,
  Trash2,
  Lock,
  UserCheck,
  Building2
} from 'lucide-react';
import { 
  adminGetAllStudents, 
  adminAddStudent, 
  adminUpdateStudent, 
  adminToggleStudentStatus, 
  adminResetStudentPassword,
  adminGetAllVerifiedStudents,
  adminImportVerifiedStudents,
  adminResetVerifiedStudentRegistration,
  adminToggleVerifiedStudentStatus,
  adminAddVerifiedStudent,
  adminDeleteVerifiedStudent,
  submitAccountRecoveryRequest,
  getRecoveryRequests,
  reviewRecoveryRequest
} from '@nacos/supabase';
import { 
  parseAdmissionYear, 
  calculateCurrentLevel, 
  calculateExpectedGraduation, 
  CURRENT_ACADEMIC_YEAR_START,
  getAcademicSession
} from '@nacos/config/academic';
import { getPortalAdminSession, canAccessLevel, getAccessibleLevels } from '@nacos/auth';

const AdminStudents = () => {
  // Navigation tabs: 'roster' (Verified Whitelist) or 'accounts' (Active Registered Users)
  const [activeTab, setActiveTab] = useState('roster');

  // Admin session & level scoping
  const [adminSession, setAdminSession] = useState(null);

  // Datasets
  const [verifiedRoster, setVerifiedRoster] = useState([]);
  const [activeAccounts, setActiveAccounts] = useState([]);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [regStatusFilter, setRegStatusFilter] = useState('ALL'); // 'ALL', 'REGISTERED', 'PENDING'

  // Modals
  const [isAddRosterModalOpen, setIsAddRosterModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Notifications
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [currentUser, setCurrentUser] = useState(null);

  // Add Verified Student Form State
  const [newRosterStudent, setNewRosterStudent] = useState({
    surname: '',
    firstName: '',
    middleName: '',
    fullName: '',
    matricNumber: '',
    email: '',
    phone: '',
    department: 'Computer Science',
    faculty: 'School of Information & Communication Tech (SICT)',
    programme: 'B.Tech Computer Science',
    programmeDuration: 5
  });

  // Bulk CSV Import State
  const fileInputRef = useRef(null);
  const [importFileName, setImportFileName] = useState('');
  const [parsedImportData, setParsedImportData] = useState([]);
  const [importValidation, setImportValidation] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  // Edit / Password Reset States
  const [editStudentData, setEditStudentData] = useState({});
  const [newPasswordInput, setNewPasswordInput] = useState('password');

  // Account Recovery Requests
  const [recoveryRequests, setRecoveryRequests] = useState([]);
  const [recoveryReviewNote, setRecoveryReviewNote] = useState('');
  const [selectedRecoveryRequest, setSelectedRecoveryRequest] = useState(null);

  useEffect(() => {
    loadData();
    const session = getPortalAdminSession();
    setAdminSession(session);
    if (session?.assigned_level && session.assigned_level !== 'all') {
      const clean = session.assigned_level.replace(/[^0-9]/g, '');
      setLevelFilter(clean);
    }

    const stored = localStorage.getItem('nacos_user');
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const loadData = async () => {
    const roster = await adminGetAllVerifiedStudents();
    setVerifiedRoster(roster);

    const accounts = await adminGetAllStudents();
    setActiveAccounts(accounts);

    const recovery = await getRecoveryRequests();
    setRecoveryRequests(Array.isArray(recovery) ? recovery : []);
  };

  const showNotification = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback({ message: '', type: '' }), 4000);
  };

  // Real-time calculation for Add Modal
  const newStudentAcademic = useMemo(() => {
    if (!newRosterStudent.matricNumber || newRosterStudent.matricNumber.trim().length < 4) return null;
    const parse = parseAdmissionYear(newRosterStudent.matricNumber, CURRENT_ACADEMIC_YEAR_START);
    if (!parse.valid) return { valid: false, error: parse.error };
    
    const duration = parseInt(newRosterStudent.programmeDuration, 10) || 5;
    const levelInfo = calculateCurrentLevel(parse.admissionYear, CURRENT_ACADEMIC_YEAR_START, duration);
    const gradYear = calculateExpectedGraduation(parse.admissionYear, duration);
    return {
      valid: true,
      admissionYear: parse.admissionYear,
      levelString: levelInfo.levelString,
      gradYear
    };
  }, [newRosterStudent.matricNumber, newRosterStudent.programmeDuration]);

  // Filtered Roster
  const filteredRoster = useMemo(() => {
    return verifiedRoster.filter(s => {
      // Level authority guard
      if (!canAccessLevel(adminSession, s.level)) {
        return false;
      }

      const matchSearch = 
        s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.registration_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchDept = departmentFilter === 'ALL' || s.department === departmentFilter;
      const matchLevel = levelFilter === 'ALL' || s.level?.includes(levelFilter);
      
      let matchStatus = true;
      if (regStatusFilter === 'REGISTERED') matchStatus = s.has_registered === true;
      if (regStatusFilter === 'PENDING') matchStatus = s.has_registered !== true;

      return matchSearch && matchDept && matchLevel && matchStatus;
    });
  }, [verifiedRoster, searchTerm, departmentFilter, levelFilter, regStatusFilter, adminSession]);

  // Filtered Active Accounts
  const filteredAccounts = useMemo(() => {
    return activeAccounts.filter(s => {
      // Level authority guard
      if (!canAccessLevel(adminSession, s.current_level)) {
        return false;
      }

      const matchSearch = 
        s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.registration_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchDept = departmentFilter === 'ALL' || s.department === departmentFilter;
      const matchLevel = levelFilter === 'ALL' || s.current_level?.includes(levelFilter);
      return matchSearch && matchDept && matchLevel;
    });
  }, [activeAccounts, searchTerm, departmentFilter, levelFilter, adminSession]);

  // =========================================================================
  // ACTIONS: VERIFIED ROSTER
  // =========================================================================

  // Add individual student to verified roster
  const handleAddRosterSubmit = async (e) => {
    e.preventDefault();
    if (!newStudentAcademic || !newStudentAcademic.valid) {
      showNotification(newStudentAcademic?.error || 'Invalid registration number.', 'error');
      return;
    }

    const res = await adminAddVerifiedStudent(newRosterStudent);
    if (res.error) {
      showNotification(res.error.message, 'error');
    } else {
      showNotification(`Student ${newRosterStudent.fullName || newRosterStudent.surname} successfully added and synced to Supabase!`);
      setIsAddRosterModalOpen(false);
      setNewRosterStudent({
        surname: '',
        firstName: '',
        middleName: '',
        fullName: '',
        matricNumber: '',
        email: '',
        phone: '',
        department: 'Computer Science',
        faculty: 'School of Information & Communication Tech (SICT)',
        programme: 'B.Tech Computer Science',
        programmeDuration: 5
      });
      loadData();
    }
  };

  // Reset student registration (unlinks auth user and resets has_registered)
  const handleResetRegistration = async (student) => {
    if (!window.confirm(`Are you sure you want to reset the registration for ${student.full_name} (${student.registration_number})? This will unlink their portal login so they can re-register.`)) {
      return;
    }

    const res = await adminResetVerifiedStudentRegistration(student.registration_number);
    if (res.error) {
      showNotification(res.error.message, 'error');
    } else {
      showNotification(`Registration reset for ${student.full_name}. The student can now re-register.`);
      loadData();
    }
  };

  // Toggle Roster Status (Active / Inactive)
  const handleToggleRosterStatus = async (student) => {
    const res = await adminToggleVerifiedStudentStatus(student.registration_number);
    if (res.error) {
      showNotification(res.error.message, 'error');
    } else {
      showNotification(`Student ${student.full_name} is now ${res.status}.`);
      loadData();
    }
  };

  // Delete from Roster
  const handleDeleteFromRoster = async (student) => {
    if (!window.confirm(`Are you sure you want to remove ${student.full_name} (${student.registration_number}) from the departmental roster?`)) {
      return;
    }

    await adminDeleteVerifiedStudent(student.registration_number);
    showNotification(`Student removed from verified roster.`);
    loadData();
  };

  // =========================================================================
  // ACTIONS: BULK CSV IMPORT & DUPLICATE VALIDATION
  // =========================================================================

  // Parse CSV text
  const parseCSVText = (text) => {
    const lines = text.split(/\r\n|\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) return [];

    // Header row
    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const records = [];

    for (let i = 1; i < lines.length; i++) {
      // Regex to handle quoted CSV columns
      const rowRegex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
      const values = [];
      let match;
      while ((match = rowRegex.exec(lines[i])) !== null) {
        let val = match[1];
        if (val === undefined) break;
        val = val.replace(/^["']|["']$/g, '').trim();
        values.push(val);
        if (rowRegex.lastIndex >= lines[i].length) break;
      }

      if (values.length >= 3) {
        const item = {};
        headers.forEach((h, idx) => {
          item[h] = values[idx] || '';
        });
        records.push(item);
      }
    }
    return records;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const rows = parseCSVText(text);
      validateCSVImport(rows);
    };
    reader.readAsText(file);
  };

  // Validate duplicates and structure
  const validateCSVImport = (rows) => {
    const existingMatrics = new Set(verifiedRoster.map(s => s.registration_number.toUpperCase()));
    const existingEmails = new Set(verifiedRoster.map(s => s.email.toLowerCase()));

    const validRows = [];
    const duplicates = [];
    const errors = [];
    const batchMatrics = new Set();
    const batchEmails = new Set();

    rows.forEach((row, idx) => {
      const regNo = (row['Registration Number'] || row['registration_number'] || row['Matric Number'] || row['Matric'] || row['Reg No'] || '').toString().trim().toUpperCase();
      const fullName = (row['Full Name'] || row['full_name'] || row['Name'] || '').toString().trim();
      const email = (row['Email'] || row['email'] || row['Student Email'] || '').toString().trim().toLowerCase();

      if (!regNo || !fullName || !email) {
        errors.push({ row: idx + 2, reason: 'Missing Registration Number, Name, or Email' });
        return;
      }

      // Check within file duplicates
      if (batchMatrics.has(regNo) || batchEmails.has(email)) {
        duplicates.push({ regNo, fullName, email, reason: 'Duplicate inside CSV file' });
        return;
      }
      batchMatrics.add(regNo);
      batchEmails.add(email);

      // Check against existing roster
      if (existingMatrics.has(regNo)) {
        duplicates.push({ regNo, fullName, email, reason: 'Already exists in departmental roster' });
        return;
      }
      if (existingEmails.has(email)) {
        duplicates.push({ regNo, fullName, email, reason: 'Email already exists in departmental roster' });
        return;
      }

      validRows.push({
        registration_number: regNo,
        full_name: fullName,
        email: email,
        phone_number: row['Phone Number'] || row['Phone'] || '',
        department: row['Department'] || 'Computer Science',
        faculty: row['Faculty'] || 'School of Information & Communication Tech (SICT)',
        level: row['Level'] || '100 Level',
        programme: row['Programme'] || 'B.Tech Computer Science',
        programme_duration: parseInt(row['Duration'] || '5', 10),
        academic_session: row['Academic Session'] || row['Session'] || getAcademicSession(CURRENT_ACADEMIC_YEAR_START)
      });
    });

    setParsedImportData(validRows);
    setImportValidation({
      total: rows.length,
      validCount: validRows.length,
      duplicateCount: duplicates.length,
      errorCount: errors.length,
      duplicates,
      errors
    });
  };

  const handleExecuteImport = async () => {
    if (parsedImportData.length === 0) return;
    setIsImporting(true);

    const res = await adminImportVerifiedStudents(parsedImportData);
    setIsImporting(false);

    if (res.error) {
      showNotification(res.error.message, 'error');
    } else {
      showNotification(`Successfully imported ${res.importedCount} students into the verified roster!`);
      setIsImportModalOpen(false);
      setParsedImportData([]);
      setImportValidation(null);
      setImportFileName('');
      loadData();
    }
  };

  const downloadSampleCSV = () => {
    const csvHeader = 'Registration Number,Full Name,Email,Department,Faculty,Level,Programme,Duration,Academic Session\n';
    const sampleRows = [
      '20241030001,Ifeanyi Kingsley Obi,ifeanyi.obi@futo.edu.ng,Computer Science,School of Information & Communication Tech (SICT),100 Level,B.Tech Computer Science,5,2024/2025\n',
      '20241030002,Kelechi Cynthia Alaba,kelechi.alaba@futo.edu.ng,Computer Science,School of Information & Communication Tech (SICT),100 Level,B.Tech Computer Science,5,2024/2025\n',
      '20241030003,Uchechukwu Collins Nnamdi,uche.nnamdi@futo.edu.ng,Computer Science,School of Information & Communication Tech (SICT),100 Level,B.Tech Computer Science,5,2024/2025\n'
    ].join('');

    const blob = new Blob([csvHeader + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'nacos_verified_students_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // =========================================================================
  // ACTIONS: ACTIVE ACCOUNTS TAB
  // =========================================================================

  const handleToggleAccountStatus = async (student) => {
    const res = await adminToggleStudentStatus(student.id);
    if (res.error) {
      showNotification(res.error.message, 'error');
    } else {
      showNotification(`Student account ${student.is_active ? 'deactivated' : 'activated'}.`);
      loadData();
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPasswordInput || !selectedStudent) return;
    const res = await adminResetStudentPassword(selectedStudent.id, newPasswordInput);
    if (res.error) {
      showNotification(res.error.message, 'error');
    } else {
      showNotification(`Password for ${selectedStudent.full_name} reset successfully.`);
      setIsResetPasswordModalOpen(false);
      setNewPasswordInput('password');
    }
  };

  const handleAdminRegenerateId = (student) => {
    const idCardsStored = localStorage.getItem('nacos_id_cards_db');
    let idCards = [];
    if (idCardsStored) {
      try { idCards = JSON.parse(idCardsStored); } catch (e) {}
    }
    const matric = student.registration_number || student.matric;
    idCards = idCards.filter(c => c.registration_number !== matric);
    localStorage.setItem('nacos_id_cards_db', JSON.stringify(idCards));
    showNotification(`Student ID card for ${student.full_name} (${matric}) invalidated & regenerated with template 2026.1.`);
  };

  // =========================================================================
  // ACTIONS: ACCOUNT RECOVERY REQUESTS
  // =========================================================================

  const handleReviewRecoveryRequest = async (request, status) => {
    const note = status === 'approved'
      ? (window.prompt('Add a note (optional):') || '')
      : (window.prompt('Rejection reason:') || '');

    const res = await reviewRecoveryRequest(request.id, status, note, currentUser?.id);
    if (res.error) {
      showNotification(res.error.message, 'error');
    } else {
      showNotification(`Recovery request ${status} for ${request.registration_number}.`);
      setSelectedRecoveryRequest(null);
      setRecoveryReviewNote('');
      loadData();
    }
  };

  return (
    <PortalAdminLayout>
      <div className="space-y-6">
        
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-6 h-6 text-[#138601] dark:text-[#4bd043]" />
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                Student Roster & Controlled Registration
              </h1>
            </div>
            <p className="text-xs text-gray-500 dark:text-green-100/70">
              Active Academic Session: <strong className="text-gray-800 dark:text-white">{getAcademicSession(CURRENT_ACADEMIC_YEAR_START)}</strong> • Department of Computer Science, FUTO
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-4 py-2.5 min-h-[40px] text-xs font-semibold text-gray-800 dark:text-white bg-gray-100 hover:bg-gray-200 dark:bg-[#041801] dark:hover:bg-[#062402] border border-gray-300 dark:border-[#138601]/40 rounded transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#138601]" />
              <span>Import Roster (CSV)</span>
            </button>

            <button
              onClick={() => setIsAddRosterModalOpen(true)}
              className="px-4 py-2.5 min-h-[40px] text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] rounded shadow-sm transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>Enroll Student</span>
            </button>
          </div>
        </div>

        {/* Level Restriction Alert Banner */}
        {adminSession?.assigned_level && adminSession.assigned_level !== 'all' && !adminSession.is_super_admin && (
          <div className="p-4 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 flex items-center justify-between gap-3 text-amber-900 dark:text-amber-200 text-xs">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Academic Scope Restriction Active:</strong> Student roster access is restricted to <strong>{adminSession.assigned_level} Level</strong> records.
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded font-bold uppercase text-[10px] bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
              {adminSession.assigned_level}L Coordinator
            </span>
          </div>
        )}

        {/* Feedback Alert */}
        {feedback.message && (
          <div className={`p-3.5 rounded text-xs font-semibold flex items-center gap-2 shadow-sm ${
            feedback.type === 'error' 
              ? 'bg-red-50 text-red-700 border border-red-200' 
              : 'bg-green-50 text-green-800 border border-green-200'
          }`}>
            {feedback.type === 'error' ? <XCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0 text-[#138601]" />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Tabs: Verified Department Roster vs Active Portal Accounts */}
        <div className="flex items-center gap-3 border-b border-gray-200 dark:border-[#138601]/30">
          <button
            onClick={() => setActiveTab('roster')}
            className={`pb-3 px-2 text-xs font-bold transition-all relative inline-flex items-center gap-2 cursor-pointer ${
              activeTab === 'roster'
                ? 'text-[#138601] dark:text-[#4bd043]'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Verified Department Roster</span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-[#041801] text-gray-700 dark:text-gray-300 font-bold">
              {verifiedRoster.length}
            </span>
            {activeTab === 'roster' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#138601] dark:bg-[#4bd043]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('accounts')}
            className={`pb-3 px-2 text-xs font-bold transition-all relative inline-flex items-center gap-2 cursor-pointer ${
              activeTab === 'accounts'
                ? 'text-[#138601] dark:text-[#4bd043]'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Active Enrolled Accounts</span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-[#041801] text-gray-700 dark:text-gray-300 font-bold">
              {activeAccounts.length}
            </span>
            {activeTab === 'accounts' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#138601] dark:bg-[#4bd043]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('recovery')}
            className={`pb-3 px-2 text-xs font-bold transition-all relative inline-flex items-center gap-2 cursor-pointer ${
              activeTab === 'recovery'
                ? 'text-[#138601] dark:text-[#4bd043]'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Recovery Requests</span>
            {recoveryRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="px-2 py-0.5 rounded text-[10px] bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold">
                {recoveryRequests.filter(r => r.status === 'pending').length}
              </span>
            )}
            {activeTab === 'recovery' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#138601] dark:bg-[#4bd043]" />
            )}
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Search bar */}
          <div className="sm:col-span-2 relative">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by student name, registration number, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded border border-gray-300 dark:border-[#138601]/30 bg-white dark:bg-[#083002] text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-[#138601]"
            />
          </div>

          {/* Level Filter */}
          <div className="relative">
            <select
              disabled={Boolean(adminSession?.assigned_level && adminSession.assigned_level !== 'all' && !adminSession.is_super_admin)}
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className={`w-full px-3.5 py-2.5 text-xs rounded border border-gray-300 dark:border-[#138601]/30 bg-white dark:bg-[#083002] text-gray-900 dark:text-white outline-none focus:border-[#138601] ${
                adminSession?.assigned_level && adminSession.assigned_level !== 'all' && !adminSession.is_super_admin ? 'opacity-75 cursor-not-allowed font-bold' : ''
              }`}
            >
              {adminSession?.assigned_level && adminSession.assigned_level !== 'all' && !adminSession.is_super_admin ? (
                <option value={adminSession.assigned_level.replace(/[^0-9]/g, '')}>
                  {adminSession.assigned_level} Level Only (Locked)
                </option>
              ) : (
                <>
                  <option value="ALL">All Academic Levels</option>
                  <option value="100">100 Level</option>
                  <option value="200">200 Level</option>
                  <option value="300">300 Level</option>
                  <option value="400">400 Level</option>
                  <option value="500">500 Level</option>
                </>
              )}
            </select>
          </div>

          {/* Registration Status Filter (Active on Roster tab) */}
          {activeTab === 'roster' ? (
            <div className="relative">
              <select
                value={regStatusFilter}
                onChange={(e) => setRegStatusFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded border border-gray-300 dark:border-[#138601]/30 bg-white dark:bg-[#083002] text-gray-900 dark:text-white outline-none focus:border-[#138601]"
              >
                <option value="ALL">All Registration States</option>
                <option value="REGISTERED">Registered Users Only</option>
                <option value="PENDING">Pending Registration</option>
              </select>
            </div>
          ) : (
            <div className="relative">
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded border border-gray-300 dark:border-[#138601]/30 bg-white dark:bg-[#083002] text-gray-900 dark:text-white outline-none focus:border-[#138601]"
              >
                <option value="ALL">All Departments</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Software Engineering">Software Engineering</option>
                <option value="Cyber Security">Cyber Security</option>
                <option value="Information Technology">Information Technology</option>
              </select>
            </div>
          )}
        </div>

        {/* =========================================================================
            TAB 1: VERIFIED DEPARTMENT ROSTER
            ========================================================================= */}
        {activeTab === 'roster' && (
          <div className="rounded bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 overflow-x-auto shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-[#041801] text-gray-500 dark:text-green-200/70 border-b border-gray-200 dark:border-[#138601]/30 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Student & Reg No</th>
                  <th className="py-3.5 px-4">Department & Level</th>
                  <th className="py-3.5 px-4">Session</th>
                  <th className="py-3.5 px-4">Portal Registration</th>
                  <th className="py-3.5 px-4">Roster Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#138601]/20">
                {filteredRoster.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-10 text-center text-gray-500">
                      No verified students found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredRoster.map((s) => (
                    <tr key={s.id || s.registration_number} className="hover:bg-gray-50/50 dark:hover:bg-[#041801]/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900 dark:text-white">{s.full_name}</div>
                        <div className="text-[11px] font-mono text-gray-500 dark:text-green-100/70">{s.registration_number}</div>
                        <div className="text-[10px] text-gray-400">{s.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-800 dark:text-gray-200">{s.programme || s.department}</div>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded font-bold text-[10px] bg-[#138601]/10 text-[#138601] dark:text-[#4bd043] border border-[#138601]/20">
                          {s.level}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-gray-700 dark:text-green-100/80">
                        {s.academic_session || '2024/2025'}
                      </td>
                      <td className="py-3.5 px-4">
                        {s.has_registered ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800/40">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            <span>Registered</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
                            <span>Pending Sign-up</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                          s.status === 'active' 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        }`}>
                          {s.status === 'active' ? 'Active Roster' : 'Suspended'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Reset Registration (Only if registered) */}
                          {s.has_registered && (
                            <button
                              title="Reset Registration (Allow re-registering)"
                              onClick={() => handleResetRegistration(s)}
                              className="p-1.5 rounded hover:bg-amber-100 dark:hover:bg-amber-950/50 text-amber-700 dark:text-amber-400 transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Toggle Active / Inactive status */}
                          <button
                            title={s.status === 'active' ? 'Deactivate Student' : 'Activate Student'}
                            onClick={() => handleToggleRosterStatus(s)}
                            className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-[#041801] transition-colors ${
                              s.status === 'active' ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            {s.status === 'active' ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                          </button>

                          {/* Delete from roster */}
                          <button
                            title="Delete Student from Roster"
                            onClick={() => handleDeleteFromRoster(s)}
                            className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-950/40 text-red-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* =========================================================================
            TAB 2: ACTIVE PORTAL ACCOUNTS (Registered Users with Login Credentials)
            ========================================================================= */}
        {activeTab === 'accounts' && (
          <div className="rounded bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 overflow-x-auto shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-[#041801] text-gray-500 dark:text-green-200/70 border-b border-gray-200 dark:border-[#138601]/30 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Student & Reg No</th>
                  <th className="py-3 px-4">Admission</th>
                  <th className="py-3 px-4">Calculated Level</th>
                  <th className="py-3 px-4">Programme & Duration</th>
                  <th className="py-3 px-4">Graduation</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#138601]/20">
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-gray-500">
                      No registered student accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50/50 dark:hover:bg-[#041801]/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900 dark:text-white">{s.full_name}</div>
                        <div className="text-[11px] font-mono text-gray-500 dark:text-green-100/70">{s.registration_number}</div>
                        <div className="text-[10px] text-gray-400">{s.email}</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#138601] dark:text-[#4bd043]">
                        {s.admission_year}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2.5 py-1 rounded font-bold text-[11px] bg-[#138601]/10 text-[#138601] dark:text-[#4bd043] border border-[#138601]/20">
                          {s.current_level}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-gray-800 dark:text-gray-200">{s.programme}</div>
                        <div className="text-[10px] text-gray-400">{s.programme_duration} Years Duration</div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-gray-900 dark:text-white">
                        {s.expected_graduation_year}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                          s.is_active 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        }`}>
                          {s.is_active ? 'Active Enrolled' : 'Suspended'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            title="View Profile"
                            onClick={() => setSelectedStudent(s)}
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-[#041801] text-gray-600 dark:text-gray-300"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Edit Information"
                            onClick={() => {
                              setEditStudentData({ ...s });
                              setIsEditModalOpen(true);
                            }}
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-[#041801] text-blue-600 dark:text-blue-400"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Reset Password"
                            onClick={() => {
                              setSelectedStudent(s);
                              setIsResetPasswordModalOpen(true);
                            }}
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-[#041801] text-amber-600 dark:text-amber-400"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Regenerate ID Card"
                            onClick={() => handleAdminRegenerateId(s)}
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-[#041801] text-emerald-600 dark:text-emerald-400"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title={s.is_active ? 'Deactivate Student' : 'Activate Student'}
                            onClick={() => handleToggleAccountStatus(s)}
                            className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-[#041801] ${
                              s.is_active ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            {s.is_active ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* =========================================================================
            TAB 3: ACCOUNT RECOVERY REQUESTS
            ========================================================================= */}
        {activeTab === 'recovery' && (
          <div className="rounded bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 overflow-x-auto shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-[#041801] text-gray-500 dark:text-green-200/70 border-b border-gray-200 dark:border-[#138601]/30 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Student & Reg No</th>
                  <th className="py-3.5 px-4">Requested Changes</th>
                  <th className="py-3.5 px-4">Reason</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#138601]/20">
                {recoveryRequests.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-10 text-center text-gray-500">
                      No account recovery requests found.
                    </td>
                  </tr>
                ) : (
                  recoveryRequests.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-[#041801]/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900 dark:text-white">{r.full_name || 'Unknown'}</div>
                        <div className="text-[11px] font-mono text-gray-500 dark:text-green-100/70">{r.registration_number}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {r.requested_email && (
                          <div className="text-[11px] text-gray-700 dark:text-gray-300">
                            Email: <span className="font-semibold">{r.requested_email}</span>
                          </div>
                        )}
                        {r.requested_phone && (
                          <div className="text-[11px] text-gray-700 dark:text-gray-300">
                            Phone: <span className="font-semibold">{r.requested_phone}</span>
                          </div>
                        )}
                        {!r.requested_email && !r.requested_phone && (
                          <span className="text-[11px] text-gray-400">No contact changes requested</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-[11px] text-gray-700 dark:text-gray-300 max-w-[200px] truncate" title={r.reason}>
                          {r.reason}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                          r.status === 'pending'
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                            : r.status === 'approved'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        }`}>
                          {r.status === 'pending' && <Clock className="w-3 h-3" />}
                          {r.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                          {r.status === 'rejected' && <XCircle className="w-3 h-3" />}
                          <span className="capitalize">{r.status}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[11px] text-gray-500">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {r.status === 'pending' && (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              title="Approve Recovery Request"
                              onClick={() => handleReviewRecoveryRequest(r, 'approved')}
                              className="p-1.5 rounded hover:bg-green-100 dark:hover:bg-green-950/40 text-green-600 transition-colors"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="Reject Recovery Request"
                              onClick={() => handleReviewRecoveryRequest(r, 'rejected')}
                              className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-950/40 text-red-600 transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* =========================================================================
            MODAL 1: BULK CSV IMPORT & DUPLICATE VALIDATION
            ========================================================================= */}
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="max-w-xl w-full p-6 rounded bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 shadow-2xl space-y-4 my-8">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#138601]/20">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-[#138601]" />
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">
                    Bulk Import Verified Student Roster
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportValidation(null);
                    setParsedImportData([]);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-gray-600 dark:text-green-100/80 leading-relaxed">
                Upload a CSV spreadsheet containing official student admissions data. The portal will automatically detect academic levels, validate against duplicates, and pre-authorize these students for registration.
              </p>

              {/* Sample template link */}
              <div className="flex items-center justify-between p-3 rounded bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/20 text-xs">
                <span className="text-gray-600 dark:text-green-200/80">Need the standardized CSV formatting template?</span>
                <button
                  type="button"
                  onClick={downloadSampleCSV}
                  className="text-[#138601] dark:text-[#4bd043] font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample CSV</span>
                </button>
              </div>

              {/* File upload zone */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-[#138601]/40 rounded p-6 text-center cursor-pointer hover:border-[#138601] transition-all bg-gray-50/50 dark:bg-[#041801]/50"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".csv,text/csv" 
                  className="hidden" 
                />
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <div className="text-xs font-semibold text-gray-700 dark:text-green-200">
                  {importFileName ? importFileName : 'Click to select CSV file or drag and drop'}
                </div>
                <div className="text-[10px] text-gray-400 mt-1">
                  Supported format: .csv (UTF-8)
                </div>
              </div>

              {/* Validation Summary Preview */}
              {importValidation && (
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2.5 rounded bg-green-50 dark:bg-[#041801] border border-green-200 dark:border-[#138601]/40">
                      <span className="block text-[10px] text-green-700 dark:text-green-300 font-semibold uppercase">Valid Ready</span>
                      <strong className="text-base text-green-900 dark:text-green-200 font-bold">{importValidation.validCount}</strong>
                    </div>

                    <div className="p-2.5 rounded bg-amber-50 dark:bg-[#041801] border border-amber-200 dark:border-amber-700/40">
                      <span className="block text-[10px] text-amber-700 dark:text-amber-300 font-semibold uppercase">Duplicates</span>
                      <strong className="text-base text-amber-900 dark:text-amber-200 font-bold">{importValidation.duplicateCount}</strong>
                    </div>

                    <div className="p-2.5 rounded bg-red-50 dark:bg-[#041801] border border-red-200 dark:border-red-700/40">
                      <span className="block text-[10px] text-red-700 dark:text-red-300 font-semibold uppercase">Format Errors</span>
                      <strong className="text-base text-red-900 dark:text-red-200 font-bold">{importValidation.errorCount}</strong>
                    </div>
                  </div>

                  {/* Duplicate Warnings List */}
                  {importValidation.duplicates.length > 0 && (
                    <div className="p-3 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-900 max-h-32 overflow-y-auto space-y-1">
                      <div className="font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Skipped Duplicates ({importValidation.duplicates.length}):</span>
                      </div>
                      {importValidation.duplicates.map((d, i) => (
                        <div key={i} className="text-[10px]">
                          • <strong className="font-mono">{d.regNo}</strong> ({d.fullName || d.email}): {d.reason}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Error List */}
                  {importValidation.errors.length > 0 && (
                    <div className="p-3 rounded bg-red-50 border border-red-200 text-[11px] text-red-900 max-h-28 overflow-y-auto space-y-1">
                      <div className="font-bold">Missing Required Fields ({importValidation.errors.length}):</div>
                      {importValidation.errors.map((err, i) => (
                        <div key={i} className="text-[10px]">
                          • Row {err.row}: {err.reason}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 flex justify-end gap-2 border-t border-gray-100 dark:border-[#138601]/20">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportValidation(null);
                    setParsedImportData([]);
                  }}
                  className="px-4 py-2 rounded bg-gray-100 dark:bg-[#041801] text-gray-700 dark:text-gray-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isImporting || !parsedImportData.length}
                  onClick={handleExecuteImport}
                  className="px-5 py-2 rounded text-white bg-[#138601] hover:bg-[#0f6c01] text-xs font-semibold disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
                >
                  {isImporting ? 'Importing Records...' : `Commit & Import ${parsedImportData.length} Students`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL 2: ENROLL INDIVIDUAL STUDENT INTO VERIFIED ROSTER
            ========================================================================= */}
        {isAddRosterModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="max-w-md w-full p-6 rounded bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 shadow-2xl space-y-4">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Add Student to Verified Department Roster
              </h2>
              <form onSubmit={handleAddRosterSubmit} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-700 dark:text-green-200 font-semibold mb-1">Surname (Last Name) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Anyanwu"
                      value={newRosterStudent.surname}
                      onChange={(e) => {
                        const val = e.target.value;
                        const full = [val, newRosterStudent.firstName, newRosterStudent.middleName].filter(Boolean).map(s => s.trim()).join(' ');
                        setNewRosterStudent({ ...newRosterStudent, surname: val, fullName: full });
                      }}
                      className="w-full px-3 py-2 rounded border border-gray-300 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 dark:text-green-200 font-semibold mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Nestor"
                      value={newRosterStudent.firstName}
                      onChange={(e) => {
                        const val = e.target.value;
                        const full = [newRosterStudent.surname, val, newRosterStudent.middleName].filter(Boolean).map(s => s.trim()).join(' ');
                        setNewRosterStudent({ ...newRosterStudent, firstName: val, fullName: full });
                      }}
                      className="w-full px-3 py-2 rounded border border-gray-300 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-700 dark:text-green-200 font-semibold mb-1">Middle Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Chukwuemeka"
                      value={newRosterStudent.middleName}
                      onChange={(e) => {
                        const val = e.target.value;
                        const full = [newRosterStudent.surname, newRosterStudent.firstName, val].filter(Boolean).map(s => s.trim()).join(' ');
                        setNewRosterStudent({ ...newRosterStudent, middleName: val, fullName: full });
                      }}
                      className="w-full px-3 py-2 rounded border border-gray-300 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 dark:text-green-200 font-semibold mb-1">Auto Full Legal Name</label>
                    <input
                      type="text"
                      readOnly
                      placeholder="Surname Firstname Middlename"
                      value={newRosterStudent.fullName}
                      className="w-full px-3 py-2 rounded border border-gray-200 dark:border-[#138601]/20 bg-gray-100 dark:bg-[#083002]/50 text-gray-700 dark:text-green-200 cursor-not-allowed font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 dark:text-green-200 font-semibold mb-1">Registration Number (Digits only) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 20241429481"
                    value={newRosterStudent.matricNumber}
                    onChange={(e) => setNewRosterStudent({ ...newRosterStudent, matricNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white font-mono"
                  />
                </div>

                {/* Auto level detection preview */}
                {newStudentAcademic && (
                  <div className={`p-2.5 rounded border text-[11px] ${
                    newStudentAcademic.valid ? 'bg-green-50 dark:bg-[#041801] border-green-200 dark:border-[#138601]/40 text-green-900 dark:text-green-300' : 'bg-red-50 text-red-700'
                  }`}>
                    {newStudentAcademic.valid ? (
                      <div>
                        Admission: <strong>{newStudentAcademic.admissionYear}</strong> • Level: <strong>{newStudentAcademic.levelString}</strong> • Graduation: <strong>{newStudentAcademic.gradYear}</strong>
                      </div>
                    ) : (
                      <span>{newStudentAcademic.error}</span>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-700 dark:text-green-200 font-semibold mb-1">Official Student Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="student@futo.edu.ng"
                      value={newRosterStudent.email}
                      onChange={(e) => setNewRosterStudent({ ...newRosterStudent, email: e.target.value })}
                      className="w-full px-3 py-2 rounded border border-gray-300 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 dark:text-green-200 font-semibold mb-1">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="08012345678"
                      value={newRosterStudent.phone}
                      onChange={(e) => setNewRosterStudent({ ...newRosterStudent, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded border border-gray-300 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-700 dark:text-green-200 font-semibold mb-1">Programme Duration</label>
                    <select
                      value={newRosterStudent.programmeDuration}
                      onChange={(e) => setNewRosterStudent({ ...newRosterStudent, programmeDuration: parseInt(e.target.value, 10) })}
                      className="w-full px-3 py-2 rounded border border-gray-300 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white"
                    >
                      <option value={4}>4 Years</option>
                      <option value={5}>5 Years (B.Tech Computer Science)</option>
                      <option value={6}>6 Years</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 dark:text-green-200 font-semibold mb-1">Department</label>
                    <select
                      value={newRosterStudent.department}
                      onChange={(e) => setNewRosterStudent({ ...newRosterStudent, department: e.target.value })}
                      className="w-full px-3 py-2 rounded border border-gray-300 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white"
                    >
                      <option value="Computer Science">Computer Science</option>
                      <option value="Software Engineering">Software Engineering</option>
                      <option value="Cyber Security">Cyber Security</option>
                      <option value="Information Technology">Information Technology</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddRosterModalOpen(false)}
                    className="px-4 py-2 rounded bg-gray-100 dark:bg-[#041801] text-gray-700 dark:text-gray-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded text-white bg-[#138601] hover:bg-[#0f6c01] font-semibold cursor-pointer"
                  >
                    Authorize & Enroll
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL 3: EDIT STUDENT ACCOUNT
            ========================================================================= */}
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="max-w-md w-full p-6 rounded bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 shadow-2xl space-y-4">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Edit Student Account</h2>
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await adminUpdateStudent(editStudentData.id, editStudentData);
                  if (res.error) showNotification(res.error.message, 'error');
                  else {
                    showNotification('Student records updated.');
                    setIsEditModalOpen(false);
                    loadData();
                  }
                }} 
                className="space-y-3 text-xs"
              >
                <div>
                  <label className="block text-gray-700 dark:text-green-200 font-semibold mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    value={editStudentData.full_name || ''}
                    onChange={(e) => setEditStudentData({ ...editStudentData, full_name: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 dark:text-green-200 font-semibold mb-1">Registration Number</label>
                  <input
                    type="text"
                    value={editStudentData.registration_number || ''}
                    onChange={(e) => setEditStudentData({ ...editStudentData, registration_number: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-700 dark:text-green-200 font-semibold mb-1">Programme Duration</label>
                    <select
                      value={editStudentData.programme_duration || 5}
                      onChange={(e) => setEditStudentData({ ...editStudentData, programme_duration: parseInt(e.target.value, 10) })}
                      className="w-full px-3 py-2 rounded border border-gray-300 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white"
                    >
                      <option value={4}>4 Years</option>
                      <option value={5}>5 Years</option>
                      <option value={6}>6 Years</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 dark:text-green-200 font-semibold mb-1">Programme</label>
                    <input
                      type="text"
                      value={editStudentData.programme || ''}
                      onChange={(e) => setEditStudentData({ ...editStudentData, programme: e.target.value })}
                      className="w-full px-3 py-2 rounded border border-gray-300 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 rounded bg-gray-100 dark:bg-[#041801] text-gray-700 dark:text-gray-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded text-white bg-[#138601] hover:bg-[#0f6c01] font-semibold cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL 4: RESET PASSWORD
            ========================================================================= */}
        {isResetPasswordModalOpen && selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="max-w-sm w-full p-6 rounded bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 shadow-2xl space-y-4">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Reset Account Password</h2>
              <p className="text-xs text-gray-600 dark:text-green-100/80">
                Enter a temporary password for <strong>{selectedStudent.full_name}</strong> ({selectedStudent.registration_number}).
              </p>
              <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-700 dark:text-green-200 font-semibold mb-1">New Password</label>
                  <input
                    type="text"
                    required
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsResetPasswordModalOpen(false)}
                    className="px-4 py-2 rounded bg-gray-100 dark:bg-[#041801] text-gray-700 dark:text-gray-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded text-white bg-[#138601] hover:bg-[#0f6c01] font-semibold cursor-pointer"
                  >
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL 5: STUDENT PREVIEW
            ========================================================================= */}
        {selectedStudent && !isResetPasswordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="max-w-md w-full p-6 rounded bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#138601]/20 pb-3">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  Student Record: {selectedStudent.full_name}
                </h2>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-[#138601]/10">
                  <span className="text-gray-500">Reg. Number:</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">{selectedStudent.registration_number}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-[#138601]/10">
                  <span className="text-gray-500">Admission Year:</span>
                  <span className="font-bold text-[#138601] dark:text-[#4bd043]">{selectedStudent.admission_year}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-[#138601]/10">
                  <span className="text-gray-500">Current Academic Level:</span>
                  <span className="font-bold text-[#138601] dark:text-[#4bd043]">{selectedStudent.current_level || selectedStudent.level}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-[#138601]/10">
                  <span className="text-gray-500">Programme:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{selectedStudent.programme}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-[#138601]/10">
                  <span className="text-gray-500">Official Email:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{selectedStudent.email}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-[#138601]/10">
                  <span className="text-gray-500">Status:</span>
                  <span className={selectedStudent.is_active ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                    {selectedStudent.is_active ? 'Active Enrolled' : 'Deactivated'}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="px-4 py-2 rounded text-xs font-semibold bg-gray-100 dark:bg-[#041801] text-gray-800 dark:text-white cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </PortalAdminLayout>
  );
};

export default AdminStudents;
