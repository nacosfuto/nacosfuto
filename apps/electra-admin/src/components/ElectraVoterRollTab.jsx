import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Upload, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  Vote, 
  AlertCircle, 
  Check, 
  X, 
  FileText,
  FileSpreadsheet,
  ChevronDown,
  Layers,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { 
  adminGetAllVerifiedStudents, 
  adminCreateVerifiedStudent, 
  adminImportVerifiedStudents 
} from '@nacos/supabase/verifiedStudents';
import { 
  processStudentCsv, 
  generateSampleCsvTemplate, 
  exportErrorReportCsv 
} from '@nacos/supabase/studentCsvEngine';
import { getElectionAccreditations } from '@nacos/supabase/electraService';

export default function ElectraVoterRollTab({ 
  selectedElectionId, 
  currentElection, 
  isDark, 
  showToast 
}) {
  const [students, setStudents] = useState([]);
  const [accreditations, setAccreditations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Add Student Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [addForm, setAddForm] = useState({
    registration_number: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    level: '100 Level',
    email: '',
    phone_number: ''
  });
  const [addError, setAddError] = useState('');

  // CSV Import Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvRawText, setCsvRawText] = useState('');
  const [importMode, setImportMode] = useState('add_only');
  const [customColumnMappings, setCustomColumnMappings] = useState(null);
  const [showMappingSettings, setShowMappingSettings] = useState(false);
  const [importActiveViewTab, setImportActiveViewTab] = useState('valid');
  const [csvValidationResult, setCsvValidationResult] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgressStatus, setImportProgressStatus] = useState('');
  const fileInputRef = useRef(null);

  // Load students & accreditations
  const loadRosterData = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [allStudents, accList] = await Promise.all([
        adminGetAllVerifiedStudents(),
        getElectionAccreditations(selectedElectionId)
      ]);
      setStudents(Array.isArray(allStudents) ? allStudents : []);
      setAccreditations(Array.isArray(accList) ? accList : []);
    } catch (err) {
      console.error('Error loading voter roll data:', err);
      if (showToast) showToast('Failed to load roster data', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadRosterData();
  }, [selectedElectionId]);

  // Merge students with accreditation state
  const accMap = useMemo(() => {
    const map = new Map();
    accreditations.forEach(a => {
      if (a.registration_number) {
        map.set(a.registration_number.toUpperCase().trim(), a);
      }
    });
    return map;
  }, [accreditations]);

  const mergedRoster = useMemo(() => {
    return students.map(student => {
      const reg = (student.registration_number || '').toUpperCase().trim();
      const acc = accMap.get(reg);
      let status = 'pending';
      if (acc) {
        status = acc.status === 'voted' ? 'voted' : 'accredited';
      }
      return {
        ...student,
        accreditationStatus: status,
        accreditedRecord: acc || null
      };
    });
  }, [students, accMap]);

  // Filtered Roster
  const filteredRoster = useMemo(() => {
    return mergedRoster.filter(s => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        (s.registration_number || '').toLowerCase().includes(q) ||
        (s.full_name || '').toLowerCase().includes(q) ||
        (s.first_name || '').toLowerCase().includes(q) ||
        (s.last_name || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q);

      const matchesLevel = levelFilter === 'all' || 
        (s.level || '').toLowerCase().includes(levelFilter.toLowerCase());

      const matchesStatus = statusFilter === 'all' || s.accreditationStatus === statusFilter;

      return matchesSearch && matchesLevel && matchesStatus;
    });
  }, [mergedRoster, searchQuery, levelFilter, statusFilter]);

  // Stat Counters
  const stats = useMemo(() => {
    const total = mergedRoster.length;
    let accredited = 0;
    let voted = 0;
    let pending = 0;

    mergedRoster.forEach(s => {
      if (s.accreditationStatus === 'voted') {
        voted++;
        accredited++;
      } else if (s.accreditationStatus === 'accredited') {
        accredited++;
      } else {
        pending++;
      }
    });

    return { total, accredited, voted, pending };
  }, [mergedRoster]);

  // Handle Add Individual Student
  const handleAddStudentSubmit = async (e) => {
    e.preventDefault();
    setAddError('');

    if (!addForm.registration_number.trim() || !addForm.first_name.trim() || !addForm.last_name.trim() || !addForm.level) {
      setAddError('Registration number, First name, Last name, and Academic level are required.');
      return;
    }

    setIsAddingStudent(true);

    try {
      const fullName = `${addForm.last_name.trim().toUpperCase()} ${addForm.first_name.trim()} ${addForm.middle_name.trim()}`.trim();
      const cleanReg = addForm.registration_number.trim().toUpperCase();

      const newRecord = {
        registration_number: cleanReg,
        matric_number: cleanReg,
        first_name: addForm.first_name.trim(),
        middle_name: addForm.middle_name.trim(),
        last_name: addForm.last_name.trim(),
        surname: addForm.last_name.trim(),
        full_name: fullName,
        level: addForm.level,
        email: addForm.email.trim() || null,
        phone_number: addForm.phone_number.trim() || '',
        department: 'Computer Science',
        faculty: 'Physical Sciences'
      };

      const result = await adminCreateVerifiedStudent(newRecord);

      if (result?.error) {
        setIsAddingStudent(false);
        setAddError(result.error.message || 'Failed to add student to roster.');
        return;
      }

      setIsAddingStudent(false);
      setIsAddModalOpen(false);
      setAddForm({
        registration_number: '',
        first_name: '',
        middle_name: '',
        last_name: '',
        level: '100 Level',
        email: '',
        phone_number: ''
      });
      loadRosterData(true);
      if (showToast) showToast(`Student ${cleanReg} added to institutional roll`);
    } catch (err) {
      setIsAddingStudent(false);
      setAddError(err.message || 'An unexpected error occurred while adding student.');
    }
  };

  // CSV Validation Pipeline
  const runCsvValidation = (text, mappingsOverride = null) => {
    if (!text || !text.trim()) {
      setCsvValidationResult(null);
      return;
    }

    const processed = processStudentCsv(text, students, {
      mode: importMode,
      customMappings: mappingsOverride || customColumnMappings
    });

    setCsvValidationResult(processed);
  };

  const handleCsvFileSelect = (file) => {
    if (!file) return;
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      setCsvRawText(content);
      runCsvValidation(content);
    };
    reader.readAsText(file);
  };

  // Execute CSV Import
  const handleCommitCsvImport = async () => {
    if (!csvValidationResult || !csvValidationResult.validRecords || csvValidationResult.validRecords.length === 0) {
      if (showToast) showToast('No valid records to import', 'error');
      return;
    }

    setIsImporting(true);
    setImportProgressStatus(`Importing ${csvValidationResult.validRecords.length} student records...`);

    try {
      const res = await adminImportVerifiedStudents(csvValidationResult.validRecords, {
        mode: importMode,
        onProgress: (statusText) => setImportProgressStatus(statusText)
      });

      setIsImporting(false);

      if (res?.error) {
        if (showToast) showToast(res.error.message || 'Import failed', 'error');
        return;
      }

      const importedCount = res.importedCount || csvValidationResult.validRecords.length;
      if (showToast) {
        showToast(`Successfully imported ${importedCount} student records to voter roll!`);
      }

      setIsImportModalOpen(false);
      setCsvFile(null);
      setCsvRawText('');
      setCsvValidationResult(null);
      loadRosterData(true);
    } catch (err) {
      setIsImporting(false);
      if (showToast) showToast(err.message || 'Failed to complete student import', 'error');
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = generateSampleCsvTemplate();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'nacos_futo_voter_roll_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportErrorReport = () => {
    if (!csvValidationResult) return;
    const reportCsv = exportErrorReportCsv(csvValidationResult);
    const blob = new Blob([reportCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `import_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-green-200/60">
              Institutional Electoral Roster
            </span>
            <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40">
              {currentElection?.session || '2026/2027'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-display tracking-tight">
            Voter Roll & Accreditation
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Institutional ground-truth student register. Manage, accredit, and import eligible departmental electors.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
          <button
            type="button"
            onClick={() => loadRosterData(true)}
            disabled={isRefreshing}
            className="px-3 py-1.5 rounded-[5px] text-xs font-bold bg-white dark:bg-[#083002] hover:bg-gray-50 dark:hover:bg-white/5 border border-gray-200 dark:border-[#138601]/30 text-gray-700 dark:text-gray-200 shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Refresh Roster"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#138601] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-1.5 rounded-[5px] text-xs font-bold bg-white dark:bg-[#083002] hover:bg-gray-50 dark:hover:bg-white/5 border border-gray-300 dark:border-[#138601]/40 text-gray-800 dark:text-gray-100 shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[#138601]" />
            <span>Import CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-1.5 rounded-[5px] text-xs font-bold bg-[#138601] hover:bg-[#0f6c01] text-white shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Roster Stat Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className={`p-4 rounded-[5px] border ${isDark ? 'bg-[#083002]/60 border-[#138601]/25' : 'bg-white border-gray-200 shadow-xs'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-gray-400">Total Electors</span>
            <Users className="w-4 h-4 text-[#138601]" />
          </div>
          <div className="text-2xl font-black font-display mt-2">{stats.total}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Enrolled CS Students</div>
        </div>

        <div className={`p-4 rounded-[5px] border ${isDark ? 'bg-[#083002]/60 border-[#138601]/25' : 'bg-white border-gray-200 shadow-xs'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-gray-400">Accredited</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black font-display mt-2 text-emerald-600 dark:text-emerald-400">{stats.accredited}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Identity Verified</div>
        </div>

        <div className={`p-4 rounded-[5px] border ${isDark ? 'bg-[#083002]/60 border-[#138601]/25' : 'bg-white border-gray-200 shadow-xs'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-gray-400">Ballots Cast</span>
            <Vote className="w-4 h-4 text-[#4bd043]" />
          </div>
          <div className="text-2xl font-black font-display mt-2 text-[#138601] dark:text-[#4bd043]">{stats.voted}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Voted in Election</div>
        </div>

        <div className={`p-4 rounded-[5px] border ${isDark ? 'bg-[#083002]/60 border-[#138601]/25' : 'bg-white border-gray-200 shadow-xs'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-gray-400">Pending</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black font-display mt-2 text-amber-600 dark:text-amber-400">{stats.pending}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Awaiting Accreditation</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={`p-4 rounded-[5px] border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 ${
        isDark ? 'bg-[#083002]/40 border-[#138601]/20' : 'bg-white border-gray-200 shadow-xs'
      }`}>
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by registration number, name, or email..."
            className="w-full pl-10 pr-3.5 py-1.5 text-xs rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#138601]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#138601] cursor-pointer"
          >
            <option value="all">All Academic Levels</option>
            <option value="100">100 Level</option>
            <option value="200">200 Level</option>
            <option value="300">300 Level</option>
            <option value="400">400 Level</option>
            <option value="500">500 Level</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#138601] cursor-pointer"
          >
            <option value="all">All Accreditation Statuses</option>
            <option value="pending">Pending Accreditation</option>
            <option value="accredited">Accredited</option>
            <option value="voted">Voted (Ballot Cast)</option>
          </select>

          {(searchQuery || levelFilter !== 'all' || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setLevelFilter('all');
                setStatusFilter('all');
              }}
              className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-red-500 cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Roster Table */}
      <div className={`rounded-[5px] border overflow-hidden shadow-xs ${
        isDark ? 'bg-[#083002]/60 border-[#138601]/25' : 'bg-white border-gray-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b text-[11px] font-bold uppercase tracking-wider ${
              isDark ? 'bg-black/30 border-white/10 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}>
              <tr>
                <th className="py-3 px-4">Registration No</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Level</th>
                <th className="py-3 px-4">Contact (Email / Phone)</th>
                <th className="py-3 px-4 text-center">Accreditation Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#138601]" />
                      <span>Loading institutional voter roll...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRoster.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-gray-400">
                    <Users className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                    <p className="font-semibold text-gray-600 dark:text-gray-300">No student records found</p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {students.length === 0 
                        ? 'Upload your department student spreadsheet using the "Import CSV" button.' 
                        : 'No records match your active search filter.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRoster.map((student) => {
                  return (
                    <tr 
                      key={student.id || student.registration_number}
                      className="hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-white">
                        {student.registration_number}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {student.full_name || `${student.surname || student.last_name || ''} ${student.first_name || ''}`}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {student.department || 'Computer Science'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-bold uppercase bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10">
                          {student.level || '300 Level'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                        <div>{student.email || <span className="text-gray-400 italic">No email (Optional)</span>}</div>
                        {student.phone_number && (
                          <div className="text-[11px] text-gray-400">{student.phone_number}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {student.accreditationStatus === 'voted' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>Voted</span>
                          </span>
                        ) : student.accreditationStatus === 'accredited' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/40">
                            <UserCheck className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            <span>Accredited</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40">
                            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================
          MODAL 1: ADD INDIVIDUAL STUDENT
         ========================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 rounded-xl shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#138601]" />
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Add Student to Institutional Roll</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleAddStudentSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                  Registration / Matriculation Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 20241429481"
                  value={addForm.registration_number}
                  onChange={(e) => setAddForm({ ...addForm, registration_number: e.target.value })}
                  className="w-full px-3 py-2 rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#138601]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nestor"
                    value={addForm.first_name}
                    onChange={(e) => setAddForm({ ...addForm, first_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#138601]"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    placeholder="Emeka"
                    value={addForm.middle_name}
                    onChange={(e) => setAddForm({ ...addForm, middle_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#138601]"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                    Last Name (Surname) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Anyanwu"
                    value={addForm.last_name}
                    onChange={(e) => setAddForm({ ...addForm, last_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#138601]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                    Academic Level *
                  </label>
                  <select
                    value={addForm.level}
                    onChange={(e) => setAddForm({ ...addForm, level: e.target.value })}
                    className="w-full px-3 py-2 rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#138601] cursor-pointer"
                  >
                    <option value="100 Level">100 Level</option>
                    <option value="200 Level">200 Level</option>
                    <option value="300 Level">300 Level</option>
                    <option value="400 Level">400 Level</option>
                    <option value="500 Level">500 Level</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                    Email Address <span className="text-gray-400 font-normal lowercase">(optional)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="student@futo.edu.ng"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#138601]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number <span className="text-gray-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="tel"
                  placeholder="08012345678"
                  value={addForm.phone_number}
                  onChange={(e) => setAddForm({ ...addForm, phone_number: e.target.value })}
                  className="w-full px-3 py-2 rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#138601]"
                />
              </div>

              <div className="p-3 rounded-lg bg-green-50/60 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30 text-[11px] text-gray-600 dark:text-gray-300">
                <span className="font-bold text-[#138601]">Notice:</span> Email is completely optional. Electors can authenticate using their matriculation number, name, and level.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-[5px] font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingStudent}
                  className="px-5 py-2 rounded-[5px] font-bold bg-[#138601] hover:bg-[#0f6c01] text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isAddingStudent ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Add to Voter Roll</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 2: SMART CSV IMPORTER
         ========================================================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 rounded-xl shadow-2xl p-6 flex flex-col space-y-4 animate-in fade-in zoom-in-95 overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#138601]" />
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Import Student Spreadsheets</h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Smart column alias matching • Email is strictly optional • Safe duplicate detection
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsImportModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {/* Instructions Badge */}
              <div className="p-3 rounded-lg bg-green-50/70 dark:bg-green-950/30 border border-green-200 dark:border-green-800/40 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="font-bold text-[#138601] dark:text-[#4bd043]">
                    Required: Registration No • First Name • Last Name • Level
                  </div>
                  <div className="text-[11px] text-gray-600 dark:text-gray-300">
                    Email and Phone are optional. Columns like "Matric No.", "Surname", "200L" are detected automatically.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3 py-1.5 rounded-[5px] text-[11px] font-bold bg-white dark:bg-[#041801] text-gray-700 dark:text-gray-200 hover:bg-gray-50 border border-gray-300 dark:border-white/10 shadow-2xs shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#138601]" />
                  <span>Download Sample Template</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              {!csvValidationResult ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-8 border-2 border-dashed border-gray-300 dark:border-white/20 hover:border-[#138601] dark:hover:border-[#138601] rounded-xl text-center cursor-pointer transition-colors space-y-3 bg-gray-50/50 dark:bg-black/20"
                >
                  <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                  <div>
                    <span className="font-bold text-gray-800 dark:text-white">Click or drag CSV file to upload</span>
                    <p className="text-[11px] text-gray-500 mt-0.5">Accepts standard .csv exports from Excel, Google Sheets, or school portal</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => handleCsvFileSelect(e.target.files?.[0])}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary Bar */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#138601]" />
                      <span className="font-bold text-gray-900 dark:text-white">{csvFile?.name || 'Selected CSV'}</span>
                      <span className="text-gray-400 font-mono">({csvValidationResult.totalRows} records)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCsvFile(null);
                        setCsvRawText('');
                        setCsvValidationResult(null);
                      }}
                      className="text-xs font-bold text-red-500 hover:text-red-700 cursor-pointer"
                    >
                      Change File
                    </button>
                  </div>

                  {/* Mode Selector */}
                  <div className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                    <span className="font-bold text-gray-700 dark:text-gray-300">Import Mode:</span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        value="add_only"
                        checked={importMode === 'add_only'}
                        onChange={() => {
                          setImportMode('add_only');
                          runCsvValidation(csvRawText);
                        }}
                        className="text-[#138601]"
                      />
                      <span>Add New Only (Skip Existing)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        value="update"
                        checked={importMode === 'update'}
                        onChange={() => {
                          setImportMode('update');
                          runCsvValidation(csvRawText);
                        }}
                        className="text-[#138601]"
                      />
                      <span>Update Matching Students</span>
                    </label>
                  </div>

                  {/* Stat Cards */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                      <div className="text-[10px] uppercase font-bold text-gray-400">Total Rows</div>
                      <div className="text-lg font-black text-gray-900 dark:text-white">{csvValidationResult.totalRows}</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
                      <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Valid Ready</div>
                      <div className="text-lg font-black text-emerald-700 dark:text-emerald-300">{csvValidationResult.validRecords.length}</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40">
                      <div className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">Duplicates</div>
                      <div className="text-lg font-black text-amber-700 dark:text-amber-300">{csvValidationResult.duplicates.length}</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40">
                      <div className="text-[10px] uppercase font-bold text-red-600 dark:text-red-400">Format Errors</div>
                      <div className="text-lg font-black text-red-700 dark:text-red-300">{csvValidationResult.errors.length}</div>
                    </div>
                  </div>

                  {/* Tabs: Valid / Duplicates / Errors */}
                  <div className="flex items-center gap-2 border-b border-gray-200 dark:border-white/10 pb-1">
                    <button
                      type="button"
                      onClick={() => setImportActiveViewTab('valid')}
                      className={`px-3 py-1.5 font-bold rounded-t-[5px] cursor-pointer transition-colors ${
                        importActiveViewTab === 'valid'
                          ? 'bg-emerald-50 text-emerald-800 border-b-2 border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Valid Preview ({csvValidationResult.validRecords.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportActiveViewTab('duplicates')}
                      className={`px-3 py-1.5 font-bold rounded-t-[5px] cursor-pointer transition-colors ${
                        importActiveViewTab === 'duplicates'
                          ? 'bg-amber-50 text-amber-800 border-b-2 border-amber-500 dark:bg-amber-950/40 dark:text-amber-300'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Duplicates ({csvValidationResult.duplicates.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportActiveViewTab('errors')}
                      className={`px-3 py-1.5 font-bold rounded-t-[5px] cursor-pointer transition-colors ${
                        importActiveViewTab === 'errors'
                          ? 'bg-red-50 text-red-800 border-b-2 border-red-500 dark:bg-red-950/40 dark:text-red-300'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Errors ({csvValidationResult.errors.length})
                    </button>

                    {(csvValidationResult.duplicates.length > 0 || csvValidationResult.errors.length > 0) && (
                      <button
                        type="button"
                        onClick={handleExportErrorReport}
                        className="ml-auto text-[11px] font-bold text-gray-600 dark:text-gray-300 hover:text-[#138601] flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Report (.csv)</span>
                      </button>
                    )}
                  </div>

                  {/* Tab View Content */}
                  <div className="max-h-56 overflow-y-auto border rounded-lg border-gray-200 dark:border-white/10 p-2 bg-gray-50/50 dark:bg-black/20">
                    {importActiveViewTab === 'valid' && (
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="text-gray-400 uppercase font-bold border-b border-gray-200 dark:border-white/10">
                            <th className="py-1.5 px-2">Reg No</th>
                            <th className="py-1.5 px-2">Name</th>
                            <th className="py-1.5 px-2">Level</th>
                            <th className="py-1.5 px-2">Email</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                          {csvValidationResult.validRecords.slice(0, 50).map((r, i) => (
                            <tr key={i}>
                              <td className="py-1.5 px-2 font-mono font-bold">{r.registration_number}</td>
                              <td className="py-1.5 px-2">{r.full_name}</td>
                              <td className="py-1.5 px-2">{r.level}</td>
                              <td className="py-1.5 px-2 text-gray-500">{r.email || '— (Optional)'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {importActiveViewTab === 'duplicates' && (
                      <div className="space-y-1.5">
                        {csvValidationResult.duplicates.length === 0 ? (
                          <div className="py-6 text-center text-gray-400">No duplicate records detected</div>
                        ) : (
                          csvValidationResult.duplicates.map((d, i) => (
                            <div key={i} className="p-2 rounded bg-amber-50/70 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 text-[11px] flex items-center justify-between">
                              <div>
                                <span className="font-bold">Row {d.row}:</span> {d.regNo || d.email} — {d.reason}
                              </div>
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/40">
                                {d.type === 'batch' ? 'In CSV' : 'In Database'}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {importActiveViewTab === 'errors' && (
                      <div className="space-y-1.5">
                        {csvValidationResult.errors.length === 0 ? (
                          <div className="py-6 text-center text-gray-400">No format errors detected</div>
                        ) : (
                          csvValidationResult.errors.map((e, i) => (
                            <div key={i} className="p-2 rounded bg-red-50/70 dark:bg-red-950/20 text-red-800 dark:text-red-300 text-[11px]">
                              <span className="font-bold">Row {e.row}:</span> {e.reason} ({e.field})
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-3 border-t border-gray-100 dark:border-white/10 flex items-center justify-between shrink-0">
              <div className="text-[11px] text-gray-500">
                {importProgressStatus || (csvValidationResult ? `${csvValidationResult.validRecords.length} ready to persist` : 'Upload CSV to proceed')}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 rounded-[5px] font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                {csvValidationResult && csvValidationResult.validRecords.length > 0 && (
                  <button
                    type="button"
                    onClick={handleCommitCsvImport}
                    disabled={isImporting}
                    className="px-5 py-2 rounded-[5px] font-bold bg-[#138601] hover:bg-[#0f6c01] text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Importing Records...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Commit Import ({csvValidationResult.validRecords.length})</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
