import React, { useState, useEffect, useMemo } from 'react';
import PortalAdminLayout from '../components/PortalAdminLayout';
import { 
  BookOpen, 
  Search, 
  Plus, 
  Filter, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  X, 
  User, 
  Building2, 
  Award, 
  Layers, 
  Lock, 
  FileText,
  Clock,
  Sparkles,
  Loader
} from 'lucide-react';
import { 
  fetchCourses, 
  adminCreateCourse, 
  adminUpdateCourse, 
  adminDeleteCourse 
} from '@nacos/supabase';
import { getPortalAdminSession, canAccessLevel, getAccessibleLevels } from '@nacos/auth';

export default function PortalAdminCourses() {
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('All');
  const [toastMessage, setToastMessage] = useState(null);

  // Admin session & level scoping
  const [adminSession, setAdminSession] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState('All');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [previewCourse, setPreviewCourse] = useState(null);
  const [deleteConfirmCourse, setDeleteConfirmCourse] = useState(null);

  const [formData, setFormData] = useState({
    code: '',
    title: '',
    units: 3,
    level: 100,
    semester: 'First Semester',
    type: 'Core / Compulsory',
    lecturer: '',
    office: '',
    prerequisites: 'None',
    description: '',
    syllabus: ''
  });

  useEffect(() => {
    const session = getPortalAdminSession();
    setAdminSession(session);
    if (session?.assigned_level && session.assigned_level !== 'all') {
      const clean = session.assigned_level.replace(/[^0-9]/g, '');
      setSelectedLevel(`${clean}L`);
      setFormData(prev => ({ ...prev, level: parseInt(clean, 10) || 100 }));
    }
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetchCourses();
      if (res.data) {
        setCourses(res.data);
      }
    } catch (e) {
      console.error('Error fetching courses:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('nacos_courses_updated', handleUpdate);
    return () => window.removeEventListener('nacos_courses_updated', handleUpdate);
  }, []);

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const isLevelRestricted = Boolean(
    adminSession?.assigned_level && 
    adminSession.assigned_level !== 'all' && 
    !adminSession.is_super_admin
  );

  const accessibleLevels = useMemo(() => {
    return getAccessibleLevels(adminSession);
  }, [adminSession]);

  const levelOptions = useMemo(() => {
    if (isLevelRestricted) {
      const clean = adminSession.assigned_level.replace(/[^0-9]/g, '');
      return [`${clean}L`];
    }
    return ['All', '100L', '200L', '300L', '400L', '500L'];
  }, [isLevelRestricted, adminSession]);

  // Filtered courses
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      // Level authority guard
      if (!canAccessLevel(adminSession, c.level)) {
        return false;
      }

      // Level filter
      if (selectedLevel !== 'All') {
        const cleanLvl = parseInt(selectedLevel.replace('L', ''), 10);
        if (Number(c.level) !== cleanLvl) return false;
      }

      // Semester filter
      if (selectedSemester !== 'All') {
        if (!c.semester || !c.semester.toLowerCase().includes(selectedSemester.toLowerCase())) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = (c.code || '').toLowerCase().includes(q);
        const matchTitle = (c.title || '').toLowerCase().includes(q);
        const matchLecturer = (c.lecturer || '').toLowerCase().includes(q);
        if (!matchCode && !matchTitle && !matchLecturer) return false;
      }

      return true;
    });
  }, [courses, selectedLevel, selectedSemester, searchQuery, adminSession]);

  const handleOpenCreate = () => {
    const defaultLevel = isLevelRestricted
      ? parseInt(adminSession.assigned_level.replace(/[^0-9]/g, ''), 10) || 100
      : selectedLevel !== 'All' 
        ? parseInt(selectedLevel.replace('L', ''), 10) 
        : 100;

    setEditingCourse(null);
    setFormData({
      code: '',
      title: '',
      units: 3,
      level: defaultLevel,
      semester: 'First Semester',
      type: 'Core / Compulsory',
      lecturer: '',
      office: 'Computer Science Dept',
      prerequisites: 'None',
      description: '',
      syllabus: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (course) => {
    setEditingCourse(course);
    setFormData({
      code: course.code || '',
      title: course.title || '',
      units: course.units || 3,
      level: course.level || 100,
      semester: course.semester || 'First Semester',
      type: course.type || 'Core / Compulsory',
      lecturer: course.lecturer || '',
      office: course.office || '',
      prerequisites: course.prerequisites || 'None',
      description: course.description || '',
      syllabus: Array.isArray(course.syllabus) ? course.syllabus.join('\n') : course.syllabus || ''
    });
    setIsModalOpen(true);
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.title.trim()) {
      showToast('Please enter both course code and title', 'error');
      return;
    }

    try {
      setIsSaving(true);
      if (editingCourse) {
        await adminUpdateCourse(editingCourse.id, formData);
        showToast(`Course "${formData.code.toUpperCase()}" updated successfully`);
      } else {
        await adminCreateCourse(formData);
        showToast(`Course "${formData.code.toUpperCase()}" registered successfully`);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.message || 'Error saving course', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!deleteConfirmCourse) return;
    try {
      await adminDeleteCourse(deleteConfirmCourse.id);
      showToast(`Course ${deleteConfirmCourse.code} deleted`);
      setDeleteConfirmCourse(null);
      loadData();
    } catch (e) {
      showToast('Failed to delete course', 'error');
    }
  };

  return (
    <PortalAdminLayout 
      title="Course Curriculum Management"
      subtitle="Manage departmental courses, academic credit units, lecture personnel, and syllabi"
    >
      <div className="space-y-6">
        {/* Toast alert */}
        {toastMessage && (
          <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-bottom-5 ${
            toastMessage.type === 'error' ? 'bg-red-600 text-white' : 'bg-[#138601] text-white'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Level Restriction Alert Banner if applicable */}
        {isLevelRestricted && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 flex items-center justify-between gap-3 text-amber-900 dark:text-amber-200 text-xs">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Academic Scope Restriction Active:</strong> Your administrative permissions are restricted to <strong>{adminSession.assigned_level} Level</strong> courses and students.
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded font-bold uppercase text-[10px] bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
              {adminSession.assigned_level}L Coordinator
            </span>
          </div>
        )}

        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#083002] p-5 sm:p-6 rounded-xl border border-gray-200 dark:border-[#138601]/25 shadow-xs">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#138601] dark:text-[#4bd043] uppercase tracking-wider mb-1">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Academic Curriculum Register</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
              Courses & Credit Load
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-green-200/80 mt-1">
              {filteredCourses.length} accredited departmental courses under management.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#138601] hover:bg-[#0f6c01] text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Course</span>
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white dark:bg-[#083002] rounded-xl p-4 border border-gray-200 dark:border-[#138601]/25 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-xs">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by code, title, lecturer..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-lg border border-gray-200 dark:border-[#138601]/30 bg-gray-50/50 dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#138601]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Level Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              <span className="text-[11px] font-semibold text-gray-400 mr-1 flex items-center gap-1 shrink-0">
                <Filter className="w-3 h-3" /> Level:
              </span>
              {levelOptions.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSelectedLevel(lvl)}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                    selectedLevel === lvl
                      ? 'bg-[#138601] text-white shadow-xs'
                      : 'bg-gray-100 dark:bg-[#041801] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#138601]/20 border border-gray-200 dark:border-[#138601]/20'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            {/* Semester Filter */}
            <div className="flex items-center gap-1">
              {['All', 'First', 'Second'].map((sem) => (
                <button
                  key={sem}
                  type="button"
                  onClick={() => setSelectedSemester(sem)}
                  className={`px-2.5 py-1.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    selectedSemester === sem
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-[#041801] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#138601]/20 border border-gray-200 dark:border-[#138601]/20'
                  }`}
                >
                  {sem === 'All' ? 'All Semesters' : `${sem} Sem`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Courses Table */}
        <div className="bg-white dark:bg-[#083002] rounded-xl border border-gray-200 dark:border-[#138601]/25 shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-gray-500 animate-pulse">Loading curriculum catalog...</div>
          ) : filteredCourses.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <BookOpen className="w-8 h-8 text-gray-400 mx-auto" />
              <p className="text-sm font-bold text-gray-800 dark:text-white">No courses match criteria</p>
              <p className="text-xs text-gray-500">Adjust your search parameters or register a new course.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/75 dark:bg-[#041801]/60 text-gray-500 dark:text-green-200/70 border-b border-gray-200 dark:border-[#138601]/20 uppercase tracking-wider font-bold text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Course</th>
                    <th className="py-3 px-4">Title & Details</th>
                    <th className="py-3 px-4">Units</th>
                    <th className="py-3 px-4">Level & Semester</th>
                    <th className="py-3 px-4">Lecturer / Office</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#138601]/15">
                  {filteredCourses.map((course) => (
                    <tr key={course.id} className="hover:bg-gray-50/50 dark:hover:bg-[#062602]/50 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-extrabold text-[#138601] dark:text-[#4bd043] bg-emerald-50 dark:bg-[#041801] px-2.5 py-1 rounded border border-[#138601]/25">
                          {course.code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-gray-900 dark:text-white leading-snug">{course.title}</p>
                        <span className="text-[10px] text-gray-500 dark:text-green-200/70">{course.type}</span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                          {course.units} Units
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-[#041801] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#138601]/20">
                            {course.level}L
                          </span>
                          <span className="text-gray-500 dark:text-gray-400 text-[11px]">
                            {course.semester}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-medium text-gray-800 dark:text-gray-200">
                          <User className="w-3 h-3 text-[#138601]" />
                          <span>{course.lecturer || 'Department Faculty'}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 truncate max-w-[180px]">{course.office}</p>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewCourse(course)}
                            className="p-1.5 rounded text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#041801] transition-colors cursor-pointer"
                            title="View Syllabus & Details"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(course)}
                            className="p-1.5 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-[#041801] transition-colors cursor-pointer"
                            title="Edit Course"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmCourse(course)}
                            className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-[#041801] transition-colors cursor-pointer"
                            title="Delete Course"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create / Edit Course Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden p-6 space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#138601]/20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#138601]/10 text-[#138601] dark:text-[#4bd043] flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    {editingCourse ? `Edit Course: ${editingCourse.code}` : 'Register New Course'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveCourse} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">Course Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CSC 201"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="w-full p-2 rounded border border-gray-200 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white font-bold"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">Course Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Computer Programming I (C++)"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full p-2 rounded border border-gray-200 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">Units (Credit Load)</label>
                    <select
                      value={formData.units}
                      onChange={(e) => setFormData({ ...formData, units: parseInt(e.target.value, 10) })}
                      className="w-full p-2 rounded border border-gray-200 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white"
                    >
                      {[1, 2, 3, 4, 6].map(u => <option key={u} value={u}>{u} Units</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">Level</label>
                    <select
                      disabled={isLevelRestricted}
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value, 10) })}
                      className={`w-full p-2 rounded border border-gray-200 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white ${
                        isLevelRestricted ? 'opacity-70 cursor-not-allowed' : ''
                      }`}
                    >
                      {accessibleLevels.map(l => (
                        <option key={l} value={parseInt(l, 10)}>{l} Level</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">Semester</label>
                    <select
                      value={formData.semester}
                      onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                      className="w-full p-2 rounded border border-gray-200 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white"
                    >
                      <option value="First Semester">First Semester</option>
                      <option value="Second Semester">Second Semester</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">Course Category</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full p-2 rounded border border-gray-200 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white"
                    >
                      <option value="Core / Compulsory">Core / Compulsory</option>
                      <option value="General / Faculty">General / Faculty</option>
                      <option value="Departmental Elective">Departmental Elective</option>
                      <option value="Industrial Training">Industrial Training</option>
                      <option value="Capstone Project">Capstone Project</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">Prerequisites</label>
                    <input
                      type="text"
                      placeholder="e.g. None or CSC 101"
                      value={formData.prerequisites}
                      onChange={(e) => setFormData({ ...formData, prerequisites: e.target.value })}
                      className="w-full p-2 rounded border border-gray-200 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">Lecturer In Charge</label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. C. C. Nwokorie"
                      value={formData.lecturer}
                      onChange={(e) => setFormData({ ...formData, lecturer: e.target.value })}
                      className="w-full p-2 rounded border border-gray-200 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">Office Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Computer Science Dept Block B, Rm 104"
                      value={formData.office}
                      onChange={(e) => setFormData({ ...formData, office: e.target.value })}
                      className="w-full p-2 rounded border border-gray-200 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">Course Overview & Description</label>
                  <textarea
                    rows={2}
                    placeholder="Brief description of the course content and learning objectives..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-2 rounded border border-gray-200 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    Syllabus Topics <span className="font-normal text-gray-400">(one topic per line)</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Topic 1: Introduction to computing concepts&#10;Topic 2: Memory addressing and buses&#10;Topic 3: Algorithm analysis"
                    value={formData.syllabus}
                    onChange={(e) => setFormData({ ...formData, syllabus: e.target.value })}
                    className="w-full p-2 rounded border border-gray-200 dark:border-[#138601]/30 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white font-mono text-[11px]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-[#138601]/20">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#041801] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 bg-[#138601] hover:bg-[#0f6c01] text-white font-bold rounded shadow-xs cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSaving ? <Loader className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>{isSaving ? 'Saving...' : editingCourse ? 'Save Changes' : 'Register Course'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Syllabus Modal */}
        {previewCourse && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 rounded-xl w-full max-w-lg shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#138601]/20">
                <div>
                  <span className="text-xs font-bold text-[#138601] dark:text-[#4bd043]">{previewCourse.code}</span>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">{previewCourse.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewCourse(null)}
                  className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
                    {previewCourse.units} Credit Units
                  </span>
                  <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-[#041801] text-gray-700 dark:text-gray-300 font-semibold">
                    {previewCourse.level}L • {previewCourse.semester}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-[#041801] text-[#138601] font-semibold">
                    {previewCourse.type}
                  </span>
                </div>

                {previewCourse.description && (
                  <div>
                    <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-1">Description</h4>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{previewCourse.description}</p>
                  </div>
                )}

                <div>
                  <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-1.5">Syllabus Breakdown</h4>
                  <ul className="space-y-1.5 list-disc list-inside text-gray-600 dark:text-gray-300">
                    {(Array.isArray(previewCourse.syllabus) ? previewCourse.syllabus : []).map((topic, i) => (
                      <li key={i}>{topic}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmCourse && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#083002] border border-gray-200 dark:border-red-500/40 rounded-xl w-full max-w-sm shadow-2xl p-6 space-y-4">
              <div className="flex items-center gap-3 text-red-600">
                <Trash2 className="w-5 h-5 shrink-0" />
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Delete Course?</h3>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Are you sure you want to delete <strong>{deleteConfirmCourse.code} — {deleteConfirmCourse.title}</strong>? Students will no longer see this course in curriculum registration.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmCourse(null)}
                  className="px-3 py-1.5 rounded text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#041801] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCourse}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-xs shadow-xs cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PortalAdminLayout>
  );
}
