import React, { useState, useEffect } from 'react';
import PortalAdminLayout from '../components/PortalAdminLayout';
import {
  ShieldCheck,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Eye,
  RotateCcw,
  DollarSign,
  Download,
  ShieldAlert,
  ExternalLink,
  Edit2,
  FileCheck,
  User
} from 'lucide-react';
import {
  portalAdminGetApplications,
  portalAdminApproveApplication,
  portalAdminRejectApplication,
  portalAdminRevokeIdCard,
  portalAdminRegenerateIdCard,
  getIdCardSettings,
  updateIdCardFee,
  drawIdCardOnCanvas,
  downloadIdCardAsImage,
  downloadIdCardAsPdf
} from '@nacos/supabase/idCard';
import { ID_CARD_TEMPLATE } from '@nacos/config/idCardTemplate';
import { getOptimizedImageUrl } from '@nacos/media';

const masterTemplateAsset = getOptimizedImageUrl('nacos/ids/nacos_id_template_master');
const frameAsset = getOptimizedImageUrl('nacos/ids/nacos_id_template_frame');

const AdminIdCards = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [settings, setSettings] = useState({ id_card_fee: null, academic_session: '2026/2027' });

  // Modals & Selection
  const [selectedApp, setSelectedApp] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [newFeeInput, setNewFeeInput] = useState('');
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [revokeReasonInput, setRevokeReasonInput] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [adminViewSide, setAdminViewSide] = useState('front'); // 'front' | 'back'
  const adminCanvasRef = React.useRef(null);

  // Notification
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [adminUser, setAdminUser] = useState(null);

  useEffect(() => {
    loadData();
    const stored = localStorage.getItem('nacos_user');
    if (stored) {
      try {
        setAdminUser(JSON.parse(stored));
      } catch (e) { }
    }
  }, [statusFilter]);

  const loadData = async () => {
    setLoading(true);
    const [apps, cfg] = await Promise.all([
      portalAdminGetApplications({ status: statusFilter, search: searchTerm }),
      getIdCardSettings()
    ]);
    setApplications(apps || []);
    if (cfg) {
      setSettings(cfg);
      setNewFeeInput(cfg.id_card_fee ? String(cfg.id_card_fee) : '');
    }
    setLoading(false);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    const apps = await portalAdminGetApplications({ status: statusFilter, search: searchTerm });
    setApplications(apps || []);
    setLoading(false);
  };

  const showNotification = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback({ message: '', type: '' }), 4000);
  };

  // Canvas render hook for Admin Review modal
  useEffect(() => {
    if (isReviewModalOpen && selectedApp && selectedApp.status === 'generated' && adminCanvasRef.current) {
      const studentObj = {
        name: selectedApp.student_name,
        full_name: selectedApp.student_name,
        registration_number: selectedApp.matric_number,
        matric: selectedApp.matric_number,
        department: selectedApp.department,
        programme: selectedApp.programme,
        level: selectedApp.level
      };
      if (selectedApp.passport_url) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        const drawOpts = { templateImgUrl: masterTemplateAsset, frameImgUrl: frameAsset };
        img.onload = () => {
          drawIdCardOnCanvas(adminCanvasRef.current, studentObj, img, selectedApp, drawOpts);
        };
        img.onerror = () => {
          drawIdCardOnCanvas(adminCanvasRef.current, studentObj, null, selectedApp, drawOpts);
        };
        img.src = selectedApp.passport_url;
      } else {
        drawIdCardOnCanvas(adminCanvasRef.current, studentObj, null, selectedApp, {
          templateImgUrl: masterTemplateAsset,
          frameImgUrl: frameAsset
        });
      }
    }
  }, [isReviewModalOpen, selectedApp?.id, selectedApp?.status, selectedApp?.generated_at]);

  const handleAdminDownloadImage = (side = 'both') => {
    if (!selectedApp) return;
    const rawName = (selectedApp.student_name || 'Student').replace(/[^a-zA-Z0-9]/g, '-');
    const rawId = (selectedApp.id_card_number || 'NACOS-ID').replace(/[^a-zA-Z0-9]/g, '-');
    const source = selectedApp.id_card_image_url || adminCanvasRef.current;
    downloadIdCardAsImage(source, `${rawName}-${rawId}`, side);
  };

  const handleAdminDownloadPdf = () => {
    if (!selectedApp) return;
    const rawName = (selectedApp.student_name || 'Student').replace(/[^a-zA-Z0-9]/g, '-');
    const rawId = (selectedApp.id_card_number || 'NACOS-ID').replace(/[^a-zA-Z0-9]/g, '-');
    const source = selectedApp.id_card_image_url || adminCanvasRef.current;
    downloadIdCardAsPdf(source, `${rawName}-${rawId}`, selectedApp.id_card_back_url);
  };

  // ---------------------------------------------------------------------------
  // Admin Actions
  // ---------------------------------------------------------------------------

  // 1. Approve Application & Generate ID
  const handleApprove = async (app) => {
    const res = await portalAdminApproveApplication(app.id, adminUser);
    if (res.error) {
      showNotification(res.error, 'error');
    } else {
      showNotification(`Application approved! Generated ID: ${res.application.id_card_number}`);
      setIsReviewModalOpen(false);
      loadData();
    }
  };

  // 2. Reject Application with reason
  const handleReject = async (app) => {
    if (!rejectReasonInput.trim()) {
      showNotification('Please provide a rejection reason.', 'error');
      return;
    }

    const res = await portalAdminRejectApplication(app.id, rejectReasonInput, adminUser);
    if (res.error) {
      showNotification(res.error, 'error');
    } else {
      showNotification(`Application ${app.application_number} rejected.`);
      setIsRejecting(false);
      setIsReviewModalOpen(false);
      setRejectReasonInput('');
      loadData();
    }
  };

  // 3. Revoke ID Card
  const handleRevoke = async (app) => {
    if (!revokeReasonInput.trim()) {
      showNotification('Please provide a revocation reason.', 'error');
      return;
    }

    const res = await portalAdminRevokeIdCard(app.id, revokeReasonInput, adminUser);
    if (res.error) {
      showNotification(res.error, 'error');
    } else {
      showNotification(`ID card ${app.id_card_number} revoked.`);
      setIsRevoking(false);
      setIsReviewModalOpen(false);
      setRevokeReasonInput('');
      loadData();
    }
  };

  // 4. Regenerate ID Card
  const handleRegenerate = async (app) => {
    const res = await portalAdminRegenerateIdCard(app.id, adminUser);
    if (res.error) {
      showNotification(res.error, 'error');
    } else {
      showNotification(`ID card ${app.id_card_number} regenerated successfully!`);
      loadData();
    }
  };

  // 5. Update Configurable Fee
  const handleSaveFee = async (e) => {
    e.preventDefault();
    const res = await updateIdCardFee(newFeeInput);
    if (res.error) {
      showNotification(res.error, 'error');
    } else {
      setSettings(res.settings);
      setIsFeeModalOpen(false);
      showNotification(`ID card fee updated to ₦${Number(newFeeInput).toLocaleString()}.00`);
    }
  };

  // Metric counts
  const countAll = applications.length;
  const countUnderReview = applications.filter(a => a.status === 'submitted' || a.status === 'processing').length;
  const countGenerated = applications.filter(a => a.status === 'generated' || a.status === 'approved').length;
  const countPendingPayment = applications.filter(a => a.status === 'pending_payment').length;

  return (
    <PortalAdminLayout>
      <div className="space-y-6 w-full">

        {/* Header with Fee Config Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-6 h-6 text-[#138601] dark:text-[#4bd043]" />
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                Student ID Card Applications Management
              </h1>
            </div>
            <p className="text-xs text-gray-500 dark:text-green-100/70">
              Student Portal Administration Scope • Review applications, verify passports, issue ID numbers, and revoke credentials.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsFeeModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded text-xs font-semibold text-gray-800 dark:text-white bg-gray-100 dark:bg-[#041801] hover:bg-gray-200 border border-gray-200 dark:border-[#138601]/30 transition-colors cursor-pointer"
            >
              <DollarSign className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
              <span>Config Fee ({settings.id_card_fee ? `₦${Number(settings.id_card_fee).toLocaleString()}` : 'Loading...'})</span>
            </button>
          </div>
        </div>

        {/* Global Feedback Alert */}
        {feedback.message && (
          <div className={`p-4 rounded text-xs font-semibold flex items-center gap-2.5 shadow-sm ${feedback.type === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/60 dark:text-red-300'
              : 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-950/60 dark:text-green-300'
            }`}>
            {feedback.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 space-y-1">
            <span className="text-[11px] font-medium text-gray-500 dark:text-green-200/70">Total Applications</span>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{countAll}</div>
          </div>
          <div className="p-4 rounded bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 space-y-1">
            <span className="text-[11px] font-medium text-gray-500 dark:text-green-200/70">Under Review</span>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{countUnderReview}</div>
          </div>
          <div className="p-4 rounded bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 space-y-1">
            <span className="text-[11px] font-medium text-gray-500 dark:text-green-200/70">Active Issued IDs</span>
            <div className="text-2xl font-bold text-[#138601] dark:text-[#4bd043]">{countGenerated}</div>
          </div>
          <div className="p-4 rounded bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 space-y-1">
            <span className="text-[11px] font-medium text-gray-500 dark:text-green-200/70">Pending Payment</span>
            <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">{countPendingPayment}</div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 rounded bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {['ALL', 'submitted', 'generated', 'pending_payment', 'photo_required', 'rejected', 'revoked'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded text-xs font-semibold capitalize transition-colors cursor-pointer ${statusFilter === status
                    ? 'bg-[#138601] text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-[#041801] text-gray-600 dark:text-green-200/70 hover:text-black dark:hover:text-white'
                  }`}
              >
                {status.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search matric, app or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#138601]"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-2 text-xs font-semibold rounded bg-[#138601] text-white hover:bg-[#0f6c01]"
            >
              Search
            </button>
          </form>
        </div>

        {/* Applications Data Table */}
        <div className="rounded bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-xs text-gray-500">
              <RefreshCw className="w-6 h-6 animate-spin text-[#138601] mx-auto mb-2" />
              Loading applications...
            </div>
          ) : applications.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-500 dark:text-green-200/70">
              No ID card applications found matching this criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-[#041801] border-b border-gray-200 dark:border-[#138601]/30 text-gray-600 dark:text-green-200/80 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Student Info</th>
                    <th className="py-3 px-4">App & ID Number</th>
                    <th className="py-3 px-4">Passport</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#138601]/20">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50/50 dark:hover:bg-[#041801]/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900 dark:text-white">{app.student_name || 'Student Member'}</div>
                        <div className="font-mono text-[11px] text-[#138601] dark:text-[#4bd043]">{app.matric_number}</div>
                        <div className="text-[10px] text-gray-400 dark:text-green-200/50">{app.department || 'Computer Science'}</div>
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <div className="text-gray-900 dark:text-white">{app.application_number}</div>
                        {app.id_card_number ? (
                          <div className="text-amber-600 dark:text-amber-400 font-bold text-[11px]">{app.id_card_number}</div>
                        ) : (
                          <div className="text-gray-400 text-[10px] italic">Not issued yet</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {app.passport_url ? (
                          <img
                            src={app.passport_url}
                            alt="Passport"
                            className="w-9 h-11 object-cover rounded border border-[#138601]/50 shadow-sm"
                          />
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">No photo</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            app.payment_status === 'verified' || app.payment_status === 'paid'
                              ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {app.payment_status === 'verified' || app.payment_status === 'paid'
                              ? `₦${(app.amount || 5000).toLocaleString()} Paid`
                              : 'Pending'}
                          </span>
                          {app.payment_reference && (
                            <div className="font-mono text-[9px] text-gray-500 truncate max-w-[120px]" title={app.payment_reference}>
                              {app.payment_reference}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold capitalize ${app.status === 'generated'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                            : app.status === 'submitted' || app.status === 'processing'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                              : app.status === 'rejected' || app.status === 'revoked'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                          }`}>
                          {app.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedApp(app);
                            setIsReviewModalOpen(true);
                            setIsRejecting(false);
                            setIsRevoking(false);
                          }}
                          className="px-3 py-1.5 rounded text-xs font-semibold text-gray-700 dark:text-white bg-gray-100 dark:bg-[#041801] hover:bg-gray-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* -------------------------------------------------------------------
            MODAL 1: APPLICATION REVIEW & APPROVAL DRAWER
            ------------------------------------------------------------------- */}
        {isReviewModalOpen && selectedApp && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="w-full max-w-lg rounded bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 p-6 space-y-5 shadow-2xl">

              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#138601]/20">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#138601] dark:text-[#4bd043]" />
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Review ID Application ({selectedApp.application_number})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="p-1 rounded text-gray-400 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Student & Passport Details */}
              <div className="flex items-center gap-4 p-4 rounded bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/20">
                {selectedApp.passport_url ? (
                  <img
                    src={selectedApp.passport_url}
                    alt="Passport"
                    className="w-20 h-24 object-cover rounded border border-[#138601] shadow-sm"
                  />
                ) : (
                  <div className="w-20 h-24 rounded bg-gray-200 dark:bg-[#083002] flex items-center justify-center text-xs text-gray-400">
                    No photo
                  </div>
                )}
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-sm text-gray-900 dark:text-white">{selectedApp.student_name}</div>
                  <div className="font-mono text-[#138601] dark:text-[#4bd043] font-bold">{selectedApp.matric_number}</div>
                  <div className="text-gray-500 dark:text-green-200/70">{selectedApp.department} • {selectedApp.level}</div>
                  <div className="text-[11px] text-gray-500 pt-1 space-y-0.5">
                    <div>Payment: <strong className="text-green-600 dark:text-green-400">{selectedApp.payment_status?.toUpperCase()}</strong></div>
                    <div>Gateway: <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedApp.payment_provider || 'BACHS'}</span> • ₦{(selectedApp.amount || 5000).toLocaleString()}</div>
                    {selectedApp.payment_reference && (
                      <div className="font-mono text-[10px] text-gray-400">Ref: {selectedApp.payment_reference}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Generated Two-Sided ID Card Preview */}
              {selectedApp.status === 'generated' && (
                <div className="p-4 rounded bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900 dark:text-white">Generated ID Card</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">
                        Official CR-80
                      </span>
                    </div>

                    {/* Front / Back Toggle */}
                    <div className="inline-flex p-0.5 rounded bg-gray-200 dark:bg-[#083002] text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setAdminViewSide('front')}
                        className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${adminViewSide === 'front'
                            ? 'bg-[#138601] text-white'
                            : 'text-gray-600 dark:text-green-200/70 hover:text-black dark:hover:text-white'
                          }`}
                      >
                        Front
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminViewSide('back')}
                        className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${adminViewSide === 'back'
                            ? 'bg-[#138601] text-white'
                            : 'text-gray-600 dark:text-green-200/70 hover:text-black dark:hover:text-white'
                          }`}
                      >
                        Back
                      </button>
                    </div>
                  </div>

                  {/* Card Display */}
                  <div className="flex justify-center py-1">
                    <div className="max-w-[240px] w-full rounded overflow-hidden shadow-md border border-[#138601]/40 bg-[#083002]">
                      <div className={`${adminViewSide === 'front' ? 'block' : 'hidden'}`}>
                        <canvas
                          ref={adminCanvasRef}
                          className="w-full h-auto block"
                          style={{ aspectRatio: `${ID_CARD_TEMPLATE.dimensions.aspectRatio}` }}
                        />
                      </div>
                      <div className={`${adminViewSide === 'back' ? 'block' : 'hidden'}`}>
                        <img
                          src={selectedApp.id_card_back_url || ID_CARD_TEMPLATE.masterBackUrl || ''}
                          alt="ID Card Back"
                          className="w-full h-auto block object-cover"
                          style={{ aspectRatio: `${ID_CARD_TEMPLATE.dimensions.aspectRatio}` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Admin Download Bar */}
                  <div className="flex flex-wrap items-center justify-end gap-1.5 pt-2 border-t border-gray-200 dark:border-[#138601]/20">
                    <button
                      type="button"
                      onClick={() => handleAdminDownloadImage('front')}
                      className="px-2.5 py-1 text-[11px] font-semibold text-gray-700 dark:text-white bg-gray-200/70 dark:bg-[#083002] hover:bg-gray-300 rounded transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5 text-[#138601] dark:text-[#4bd043]" />
                      <span>Front</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdminDownloadImage('back')}
                      className="px-2.5 py-1 text-[11px] font-semibold text-gray-700 dark:text-white bg-gray-200/70 dark:bg-[#083002] hover:bg-gray-300 rounded transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5 text-[#138601] dark:text-[#4bd043]" />
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdminDownloadImage('both')}
                      className="px-2.5 py-1 text-[11px] font-semibold text-gray-700 dark:text-white bg-gray-200/70 dark:bg-[#083002] hover:bg-gray-300 rounded transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5 text-[#138601] dark:text-[#4bd043]" />
                      <span>Both PNG</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAdminDownloadPdf}
                      className="px-3 py-1 text-[11px] font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] rounded shadow-sm transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <span>Print PDF</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Existing ID Number if generated */}
              {selectedApp.id_card_number && (
                <div className="p-3 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-xs flex items-center justify-between">
                  <span className="font-semibold text-amber-800 dark:text-amber-300">Official NACOS ID:</span>
                  <span className="font-mono font-bold text-amber-900 dark:text-amber-200">{selectedApp.id_card_number}</span>
                </div>
              )}

              {/* Reject Form Panel */}
              {isRejecting ? (
                <div className="p-4 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 space-y-3">
                  <label className="block text-xs font-bold text-red-800 dark:text-red-300">
                    Reason for Rejection (Visible to student):
                  </label>
                  <textarea
                    rows={2}
                    value={rejectReasonInput}
                    onChange={(e) => setRejectReasonInput(e.target.value)}
                    placeholder="e.g. Photo background is invalid or blurry. Please upload standard white background passport."
                    className="w-full p-2.5 text-xs rounded border border-red-300 dark:border-red-800 bg-white dark:bg-[#041801] text-gray-900 dark:text-white"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsRejecting(false)}
                      className="px-3 py-1.5 rounded text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(selectedApp)}
                      className="px-4 py-1.5 rounded text-xs font-semibold text-white bg-red-600 hover:bg-red-700"
                    >
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              ) : isRevoking ? (
                <div className="p-4 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 space-y-3">
                  <label className="block text-xs font-bold text-red-800 dark:text-red-300">
                    Reason for Revocation:
                  </label>
                  <textarea
                    rows={2}
                    value={revokeReasonInput}
                    onChange={(e) => setRevokeReasonInput(e.target.value)}
                    placeholder="e.g. Disciplinary suspension or academic session invalidation."
                    className="w-full p-2.5 text-xs rounded border border-red-300 dark:border-red-800 bg-white dark:bg-[#041801] text-gray-900 dark:text-white"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsRevoking(false)}
                      className="px-3 py-1.5 rounded text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRevoke(selectedApp)}
                      className="px-4 py-1.5 rounded text-xs font-semibold text-white bg-red-600 hover:bg-red-700"
                    >
                      Confirm Revocation
                    </button>
                  </div>
                </div>
              ) : (
                /* Primary Modal Actions */
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-[#138601]/20">
                  <div className="flex items-center gap-2">
                    {selectedApp.status === 'generated' ? (
                      <button
                        type="button"
                        onClick={() => setIsRevoking(true)}
                        className="px-3.5 py-2 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 rounded transition-colors"
                      >
                        Revoke Card
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsRejecting(true)}
                        className="px-3.5 py-2 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 rounded transition-colors"
                      >
                        Reject Application
                      </button>
                    )}

                    {selectedApp.status === 'generated' && (
                      <button
                        type="button"
                        onClick={() => handleRegenerate(selectedApp)}
                        className="px-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded transition-colors"
                      >
                        Regenerate
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedApp.status !== 'generated' && (
                      <button
                        type="button"
                        onClick={() => handleApprove(selectedApp)}
                        disabled={selectedApp.payment_status !== 'verified' || !selectedApp.passport_url}
                        className="px-5 py-2 text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] rounded shadow-sm transition-colors disabled:opacity-40"
                      >
                        Approve & Generate ID
                      </button>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------
            MODAL 2: CONFIGURABLE FEE MANAGEMENT
            ------------------------------------------------------------------- */}
        {isFeeModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#138601]/20">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-[#138601] dark:text-[#4bd043]" />
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Configure Student ID Card Fee
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFeeModalOpen(false)}
                  className="p-1 rounded text-gray-400 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveFee} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-green-200 mb-1">
                    ID Card Fee Amount (₦) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    required
                    value={newFeeInput}
                    onChange={(e) => setNewFeeInput(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm rounded bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 text-gray-900 dark:text-white font-bold"
                  />
                  <p className="text-[11px] text-gray-500 dark:text-green-200/60 mt-1">
                    Changing this fee updates all future applications instantly without changing source code.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsFeeModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] rounded"
                  >
                    Save Changes
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

export default AdminIdCards;
