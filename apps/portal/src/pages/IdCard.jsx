import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PortalLayout from '../components/PortalLayout';
import {
  CreditCard,
  Camera,
  CheckCircle,
  AlertCircle,
  Download,
  Printer,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Clock,
  FileText,
  ArrowRight,
  Info,
  Sparkles,
  ExternalLink,
  ChevronRight,
  RotateCcw,
  Lock,
  Check
} from 'lucide-react';
import {
  getIdCardSettings,
  getStudentIdApplication,
  createIdCardApplication,
  verifyAndLinkPayment,
  recordStudentPayment,
  checkStudentPaymentStatus,
  savePassportToApplication,
  linkPassportUrlToApplication,
  submitIdApplication,
  drawIdCardOnCanvas,
  downloadIdCardAsImage,
  downloadIdCardAsPdf,
  saveGeneratedIdCardAsset
} from '@nacos/supabase/idCard';
import { supabase } from '@nacos/supabase';
import { ID_CARD_TEMPLATE } from '@nacos/config/idCardTemplate';
import { MediaUpload, CLOUDINARY_FOLDERS, getOptimizedImageUrl, idTemplateMaster, idTemplateBack, idTemplateFrame } from '@nacos/media';
import StepUpAuthModal from '../components/StepUpAuthModal';

const masterTemplateAsset = idTemplateMaster;
const frameAsset = idTemplateFrame;

const IdCard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const canvasRef = useRef(null);
  const pollIntervalRef = useRef(null);

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({ id_card_fee: null, academic_session: '2026/2027' });
  const [application, setApplication] = useState(null);
  const [currentSide, setCurrentSide] = useState('front'); // 'front' | 'back'

  // Interaction feedback states
  const [isApplying, setIsApplying] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [notification, setNotification] = useState({ message: '', type: '' });

  // Bachs Payment Verification & Polling States
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [verifyingReference, setVerifyingReference] = useState('');
  const [isStepUpOpen, setIsStepUpOpen] = useState(false);

  useEffect(() => {
    loadStudentAndApplication();

    const handleSettingsUpdated = (e) => {
      if (e.detail) setSettings(e.detail);
      else {
        getIdCardSettings().then(cfg => { if (cfg) setSettings(cfg); });
      }
    };

    window.addEventListener('nacos_id_card_settings_updated', handleSettingsUpdated);
    return () => window.removeEventListener('nacos_id_card_settings_updated', handleSettingsUpdated);
  }, []);

  const loadStudentAndApplication = async () => {
    setLoading(true);
    const stored = localStorage.getItem('nacos_user');
    if (!stored) {
      navigate('/login');
      return;
    }

    try {
      let parsed = JSON.parse(stored);
      setStudent(parsed);

      // Load settings dynamically
      const cfg = await getIdCardSettings();
      if (cfg) setSettings(cfg);

      const matric = parsed.matric || parsed.registration_number;
      const cleanMatric = String(matric || '').trim().toUpperCase();

      // Check authoritative Supabase profiles table for fresh photo & profile details
      let resolvedPhoto = parsed.profile_photo_url || parsed.avatar_url || null;
      if (supabase && cleanMatric) {
        try {
          const { data: profRow } = await supabase
            .from('profiles')
            .select('*')
            .or(`registration_number.eq.${cleanMatric},matric_number.eq.${cleanMatric},id.eq.${parsed.id || ''}`)
            .maybeSingle();

          if (profRow) {
            const freshPhoto = profRow.profile_photo_url || profRow.avatar_url || profRow.photo_url;
            if (freshPhoto) {
              resolvedPhoto = freshPhoto;
              parsed = {
                ...parsed,
                ...profRow,
                profile_photo_url: freshPhoto,
                avatar_url: freshPhoto
              };
              localStorage.setItem('nacos_user', JSON.stringify(parsed));
              setStudent(parsed);
            }
          }
        } catch (profErr) {
          console.warn('Profile fetch warning:', profErr);
        }
      }

      // Check payment status dynamically (level-aware)
      const payStatus = await checkStudentPaymentStatus(cleanMatric, parsed?.level || parsed?.current_level);

      // Load application
      let app = await getStudentIdApplication(cleanMatric);

      // ON THE SPOT GENERATION:
      // If student has paid and is not expired:
      if (payStatus.isPaid && !payStatus.isExpired) {
        if (!app) {
          const createRes = await createIdCardApplication(parsed);
          app = createRes.application;
        }

        if (app && app.status !== 'revoked' && app.status !== 'rejected') {
          const photoToUse = app.passport_url || resolvedPhoto;
          const cleanDigits = String(cleanMatric).replace(/\D/g, '') || cleanMatric;

          if (photoToUse) {
            // Photo exists: auto-generate on the spot!
            app.status = 'generated';
            app.payment_status = 'verified';
            app.passport_url = photoToUse;
            if (!app.id_card_number) app.id_card_number = cleanDigits;
            app.generated_at = app.generated_at || new Date().toISOString();

            if (supabase && app.id) {
              await supabase.from('id_card_applications').update({
                status: 'generated',
                payment_status: 'paid',
                passport_url: photoToUse,
                id_card_number: app.id_card_number,
                generated_at: app.generated_at,
                updated_at: new Date().toISOString()
              }).eq('id', app.id);
            }
          } else {
            // Payment verified, photo required
            if (app.status === 'pending_payment' || app.status === 'draft') {
              app.status = 'photo_required';
              app.payment_status = 'verified';
            }
          }
        }
      }

      setApplication(app);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Redraw canvas whenever application reaches 'generated' state
  useEffect(() => {
    if (application && application.status === 'generated' && canvasRef.current && student) {
      const photoUrl = application.passport_url || student.profile_photo_url || student.avatar_url;
      const render = (img) => {
        drawIdCardOnCanvas(canvasRef.current, student, img, application, {
          templateImgUrl: masterTemplateAsset,
          frameImgUrl: frameAsset
        }).then(() => {
          if (!application.id_card_image_url && canvasRef.current) {
            try {
              const dataUrl = canvasRef.current.toDataURL('image/png');
              saveGeneratedIdCardAsset(application.id, dataUrl);
              setApplication(prev => ({ ...prev, id_card_image_url: dataUrl }));
            } catch (e) { }
          }
        });
      };

      if (photoUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => render(img);
        img.onerror = () => render(null);
        img.src = photoUrl;
      } else {
        render(null);
      }
    }
  }, [application?.status, student]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 4500);
  };

  // Bachs Verification Polling & URL Parameter Listener
  useEffect(() => {
    const paymentAction = searchParams.get('payment');
    const ref = searchParams.get('reference');
    const chkId = searchParams.get('checkout_id') || searchParams.get('checkoutId');

    if (paymentAction === 'verifying' && (ref || chkId)) {
      setIsVerifyingPayment(true);
      setVerifyingReference(chkId || ref);
      startPaymentVerificationPolling(ref, chkId);
    } else if (paymentAction === 'cancelled') {
      showNotification('Payment was cancelled. You can retry checkout when you are ready.', 'error');
      searchParams.delete('payment');
      searchParams.delete('reference');
      searchParams.delete('checkout_id');
      searchParams.delete('checkoutId');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const startPaymentVerificationPolling = (reference, checkoutId) => {
    let attempts = 0;
    const maxAttempts = 24; // 24 * 2.5s = 60s max polling

    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    const checkStatus = async () => {
      attempts++;
      try {
        const queryParams = new URLSearchParams();
        if (reference) queryParams.set('reference', reference);
        if (checkoutId) queryParams.set('checkoutId', checkoutId);

        const res = await fetch(`/api/payments/id-card/status?${queryParams.toString()}`);
        const data = await res.json();

        if (data.isPaid || data.status === 'successful') {
          clearInterval(pollIntervalRef.current);
          setIsVerifyingPayment(false);
          showNotification('Payment confirmed! Processing your official NACOS ID Card on the spot.');
          
          searchParams.delete('payment');
          searchParams.delete('reference');
          searchParams.delete('checkout_id');
          searchParams.delete('checkoutId');
          setSearchParams(searchParams, { replace: true });
          
          await loadStudentAndApplication();
          return;
        }
      } catch (err) {
        console.warn('Polling payment status error:', err);
      }

      if (attempts >= maxAttempts) {
        clearInterval(pollIntervalRef.current);
        setIsVerifyingPayment(false);
        showNotification('Payment verification timed out. If you were debited, click "Check Payment Status" below.', 'error');
      }
    };

    checkStatus();
    pollIntervalRef.current = setInterval(checkStatus, 2500);
  };

  const handleManualCheckStatus = async () => {
    const targetRef = verifyingReference || searchParams.get('reference') || searchParams.get('checkout_id') || searchParams.get('checkoutId');
    setIsPaying(true);
    try {
      const isChk = targetRef && targetRef.startsWith('chk_');
      const queryParams = new URLSearchParams();
      if (isChk) {
        queryParams.set('checkoutId', targetRef);
      } else if (targetRef) {
        queryParams.set('reference', targetRef);
      }
      const regNo = student?.matric_number || student?.registration_number;
      if (regNo) {
        queryParams.set('registrationNumber', regNo);
      }
      if (student?.id) {
        queryParams.set('studentId', student.id);
      }

      const res = await fetch(`/api/payments/id-card/status?${queryParams.toString()}`);
      const data = await res.json();
      setIsPaying(false);

      if (data.isPaid || data.status === 'successful') {
        setIsVerifyingPayment(false);
        showNotification('Payment confirmed! Processing your official NACOS ID Card on the spot.');
        searchParams.delete('payment');
        searchParams.delete('reference');
        searchParams.delete('checkout_id');
        searchParams.delete('checkoutId');
        setSearchParams(searchParams, { replace: true });
        await loadStudentAndApplication();
      } else {
        showNotification(`Payment status: ${data.status || 'pending'}. Waiting for gateway confirmation.`, 'error');
      }
    } catch (e) {
      setIsPaying(false);
      showNotification('Could not check status. Please check your network connection.', 'error');
    }
  };

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------

  // State 1 -> State 2: Student clicks "Apply for ID Card"
  const handleApply = async () => {
    setIsApplying(true);
    const res = await createIdCardApplication(student);
    setIsApplying(false);

    if (res.error) {
      showNotification(res.error, 'error');
    } else {
      setApplication(res.application);
      showNotification('ID Card application initiated successfully!');
    }
  };

  // State 2 -> State 3: Bachs Payment Checkout Session
  const handlePayment = () => {
    setIsStepUpOpen(true);
  };

  const executeIdCardCheckout = async (actionToken) => {
    setIsPaying(true);

    try {
      const resp = await fetch('/api/payments/id-card/create-checkout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': actionToken ? `Bearer ${actionToken}` : ''
        },
        body: JSON.stringify({
          student,
          returnBaseUrl: window.location.origin,
          stepUpToken: actionToken
        })
      });

      const data = await resp.json();

      if (data.alreadyPaid) {
        setIsPaying(false);
        showNotification('Payment already completed and confirmed!');
        await loadStudentAndApplication();
        return;
      }

      if (data.error) {
        setIsPaying(false);
        showNotification(data.error, 'error');
        return;
      }

      if (data.checkoutUrl) {
        // Authoritative redirect to Bachs Checkout
        window.location.href = data.checkoutUrl;
      } else {
        setIsPaying(false);
        showNotification('Could not obtain checkout session from Bachs gateway.', 'error');
      }
    } catch (e) {
      setIsPaying(false);
      showNotification('Payment service unreachable. Please try again.', 'error');
    }
  };

  // State 3 -> State 7: Photo Upload & Instant ID Generation
  const handlePhotoUploaded = async (media) => {
    const photoUrl = media?.secureUrl || media?.url;
    if (!photoUrl) return;
    const matric = student?.matric || student?.registration_number;
    const cleanDigits = String(matric || '').replace(/\D/g, '') || matric;

    setIsUploadingPhoto(true);

    // 1. Sync photo to student profile in Supabase
    try {
      if (supabase && matric) {
        await supabase.from('profiles').update({
          profile_photo_url: photoUrl,
          avatar_url: photoUrl,
          cloudinary_public_id: media?.publicId || null,
          updated_at: new Date().toISOString()
        }).or(`registration_number.eq.${matric},matric_number.eq.${matric}`);
      }
    } catch (e) {
      console.warn('Profile photo update warning:', e);
    }

    // 2. Link photo to ID card application and auto-generate ON THE SPOT
    if (application?.id) {
      await linkPassportUrlToApplication(application.id, matric, photoUrl, media?.publicId || '');
    }

    const now = new Date().toISOString();

    setStudent(prev => ({
      ...prev,
      profile_photo_url: photoUrl,
      avatar_url: photoUrl,
      cloudinary_public_id: media?.publicId || ''
    }));

    const stored = localStorage.getItem('nacos_user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        u.profile_photo_url = photoUrl;
        u.avatar_url = photoUrl;
        u.cloudinary_public_id = media?.publicId || '';
        localStorage.setItem('nacos_user', JSON.stringify(u));
      } catch (e) {}
    }

    // ON THE SPOT GENERATION:
    setApplication(prev => ({
      ...prev,
      passport_url: photoUrl,
      cloudinary_public_id: media?.publicId || '',
      id_card_number: prev?.id_card_number || cleanDigits,
      status: 'generated',
      generated_at: now
    }));

    setIsUploadingPhoto(false);
    window.dispatchEvent(new Event('nacos_user_updated'));
    showNotification('Photograph uploaded and synced to your profile! ID Card generated on the spot.');
  };

  // State 4 -> State 5: Submit Application
  const handleSubmitApplication = async () => {
    if (!application?.id) return;
    setIsSubmitting(true);
    const photoUrl = application.passport_url || student?.profile_photo_url || student?.avatar_url;

    // Ensure photo is linked in DB before submission
    const matric = student?.matric || student?.registration_number;
    if (photoUrl) {
      await linkPassportUrlToApplication(application.id, matric, photoUrl, application.cloudinary_public_id || '');
    }

    const res = await submitIdApplication(application.id, photoUrl);
    setIsSubmitting(false);

    if (res.error) {
      showNotification(res.error, 'error');
    } else {
      setApplication(res.application);
      showNotification('Your ID card application has been submitted for review!');
    }
  };

  // Reapply after rejection / revocation
  const handleReapply = async () => {
    setIsApplying(true);
    const res = await createIdCardApplication(student);
    setIsApplying(false);
    if (res.application) {
      setApplication(res.application);
      showNotification('New application started.');
    }
  };

  // Downloads
  const handleDownloadImage = (side = 'both') => {
    if (!student) return;
    const rawName = (student.name || student.full_name || 'Student').replace(/[^a-zA-Z0-9]/g, '-');
    const rawId = (application?.id_card_number || 'NACOS-ID').replace(/[^a-zA-Z0-9]/g, '-');
    const source = application?.id_card_image_url || canvasRef.current;
    downloadIdCardAsImage(source, `${rawName}-${rawId}`, side);
  };

  const handleDownloadPdf = () => {
    if (!student) return;
    const rawName = (student.name || student.full_name || 'Student').replace(/[^a-zA-Z0-9]/g, '-');
    const rawId = (application?.id_card_number || 'NACOS-ID').replace(/[^a-zA-Z0-9]/g, '-');
    const source = application?.id_card_image_url || canvasRef.current;
    downloadIdCardAsPdf(source, `${rawName}-${rawId}`, application?.id_card_back_url);
  };

  if (loading) {
    return (
      <PortalLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-2">
            <RefreshCw className="w-7 h-7 text-[#138601] animate-spin mx-auto" />
            <p className="text-xs text-gray-500 font-medium">Verifying ID application status & records...</p>
          </div>
        </div>
      </PortalLayout>
    );
  }

  // ---------------------------------------------------------------------------
  // Determine Exact State (1 through 9 + Level Expired)
  // ---------------------------------------------------------------------------
  const appStatus = application?.status;
  const isPaid = application?.payment_status === 'verified' || application?.payment_status === 'paid';

  // Level-based Validity calculation (ID card is valid per Academic Level)
  const studentLevelRaw = String(student?.level || student?.current_level || '100');
  const studentLevelNum = studentLevelRaw.match(/\d{3}/)?.[1] || '100';
  const studentLevel = `${studentLevelNum} Level`;

  const cardLevelRaw = String(application?.level || '');
  const cardLevelNum = cardLevelRaw.match(/\d{3}/)?.[1] || (cardLevelRaw ? studentLevelNum : null);
  const cardLevel = cardLevelNum ? `${cardLevelNum} Level` : null;

  // Expired if card was issued for a previous academic level
  const isLevelExpired = Boolean(cardLevel && studentLevel && cardLevel !== studentLevel);
  const isExpired = isLevelExpired;

  const isState1 = !application;
  const isStateExpired = application && isExpired && appStatus !== 'rejected' && appStatus !== 'revoked';
  const isState2 = !isStateExpired && application && (appStatus === 'pending_payment' || (!isPaid && appStatus !== 'rejected' && appStatus !== 'revoked'));
  const isState3 = !isStateExpired && application && isPaid && (appStatus === 'photo_required' || !application.passport_url);
  const isState4 = !isStateExpired && application && isPaid && application.passport_url && appStatus === 'ready_to_submit';
  const isState5 = !isStateExpired && application && (appStatus === 'submitted' || appStatus === 'processing');
  const isState6 = !isStateExpired && application && appStatus === 'approved';
  const isState7 = !isStateExpired && application && (appStatus === 'generated' || (isPaid && application.passport_url && appStatus !== 'rejected' && appStatus !== 'revoked'));
  const isState8 = application && appStatus === 'rejected';
  const isState9 = application && appStatus === 'revoked';

  return (
    <PortalLayout>
      <div className="space-y-6 max-w-5xl mx-auto">

        {/* Title Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200/80 dark:border-[#138601]/30 shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-5 h-5 text-[#138601] dark:text-[#4bd043]" />
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                Student ID Card Application & Issuance
              </h1>
            </div>
            <p className="text-xs text-gray-500 dark:text-green-100/70">
              Department of Computer Science • Federal University of Technology, Owerri
            </p>
          </div>

          <div className="flex items-center gap-2">
            {application && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold ${isStateExpired
                  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50'
                  : isState7
                    ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700/50'
                    : isState8 || isState9
                      ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700/50'
                      : 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50'
                }`}>
                {isStateExpired ? <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> : isState7 ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                <span className="capitalize">
                  {isStateExpired ? `Requires Renewal (${cardLevel || 'Old Level'} → ${studentLevel})` : isState7 ? `Active (${cardLevel || studentLevel})` : (application.status || 'In Progress').replace(/_/g, ' ')}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* ====================================================================
            STATE EXPIRED: LEVEL VALIDITY LAPSED (Requires Academic Level Renewal)
            ==================================================================== */}
        {isStateExpired && (
          <div className="p-8 sm:p-12 rounded-2xl bg-white dark:bg-[#083002] border border-amber-300 dark:border-amber-700/60 text-center space-y-6 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
              <Clock className="w-8 h-8" />
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <span className="inline-block px-3 py-1 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-xs font-bold uppercase tracking-wider">
                Level Renewal Required
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                New Academic Level ({studentLevel})
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-green-100/80 leading-relaxed">
                NACOS Student Identity Cards are validated for each academic level. Your card was issued for <strong>{cardLevel}</strong>, while your current standing is <strong>{studentLevel}</strong>. Renew your card for {studentLevel} to continue enjoying departmental clearance, election voting rights, and lab access.
              </p>
            </div>

            <div className="p-5 rounded-xl max-w-md mx-auto bg-gray-50/70 dark:bg-[#041801] border border-gray-200/60 dark:border-[#138601]/20 text-xs text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Student Reg No:</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">{student.matric || student.registration_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Previous Card Level:</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">{cardLevel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Target Renewal Level:</span>
                <span className="font-bold text-[#138601] dark:text-[#4bd043]">{studentLevel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Renewal Fee:</span>
                <span className="font-bold text-[#138601] dark:text-[#4bd043]">{settings.id_card_fee ? `₦${Number(settings.id_card_fee).toLocaleString()}.00` : 'Standard Fee'}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handlePayment}
                disabled={isPaying}
                className="px-8 py-3.5 min-h-[44px] text-xs sm:text-sm font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
              >
                {isPaying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span>Renew ID Card for Session {settings.academic_session}</span>
              </button>
            </div>
          </div>
        )}

        {/* Global Notification Banner */}
        {notification.message && (
          <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5 shadow-xs transition-all ${notification.type === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800'
              : 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800'
            }`}>
            {notification.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
            <span>{notification.message}</span>
          </div>
        )}

        {/* ====================================================================
            STATE 1: NOT APPLIED (Initial On-Demand State)
            ==================================================================== */}
        {isState1 && (
          <div className="p-8 sm:p-12 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200/80 dark:border-[#138601]/30 text-center space-y-6 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-green-50 dark:bg-[#041801] text-[#138601] dark:text-[#4bd043] flex items-center justify-center mx-auto border border-[#138601]/30">
              <CreditCard className="w-8 h-8" />
            </div>

            <div className="max-w-xl mx-auto space-y-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                Get Your NACOS Student ID Card
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-green-100/80 leading-relaxed">
                The official NACOS FUTO Student Identity Card is an on-demand credential that grants you access to departmental computing laboratories, election voting rights, academic library clearance, and verified national member benefits.
              </p>
            </div>

            {/* Checklist of What You Need */}
            <div className="max-w-lg mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-[#041801] border border-gray-200/60 dark:border-[#138601]/20 space-y-1">
                <div className="flex items-center gap-2 font-bold text-xs text-gray-900 dark:text-white">
                  <CreditCard className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
                  <span>ID Card Fee</span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-green-200/70">
                  Current fee: <strong className="text-[#138601] dark:text-[#4bd043]">{settings.id_card_fee ? `₦${Number(settings.id_card_fee).toLocaleString()}` : 'Configured via Admin'}</strong> for session {settings.academic_session}.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-[#041801] border border-gray-200/60 dark:border-[#138601]/20 space-y-1">
                <div className="flex items-center gap-2 font-bold text-xs text-gray-900 dark:text-white">
                  <Camera className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
                  <span>Passport Photo</span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-green-200/70">
                  A front-facing, high-resolution portrait photograph on a light background.
                </p>
              </div>
            </div>

            {/* Apply Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleApply}
                disabled={isApplying}
                className="px-8 py-3.5 min-h-[44px] text-xs sm:text-sm font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
              >
                {isApplying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{isApplying ? 'Initiating Application...' : 'Apply for ID Card'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ====================================================================
            STATE 2: PAYMENT REQUIRED (Pending Payment)
            ==================================================================== */}
        {isState2 && (
          <div className="p-8 sm:p-12 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200/80 dark:border-[#138601]/30 text-center space-y-6 shadow-xs">
            {isVerifyingPayment ? (
              /* Polling / Verifying State */
              <div className="space-y-6 max-w-md mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800 animate-pulse">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                </div>

                <div className="space-y-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    <Clock className="w-3.5 h-3.5" /> Awaiting Webhook Confirmation
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    Verifying Payment with Bachs
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-green-100/80 leading-relaxed">
                    We've detected your return from the Bachs payment gateway. We are waiting for authoritative server-to-server confirmation.
                  </p>
                </div>

                {verifyingReference && (
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/20 text-xs font-mono text-gray-700 dark:text-green-200">
                    Ref: <span className="font-bold text-[#138601] dark:text-[#4bd043]">{verifyingReference}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleManualCheckStatus}
                    disabled={isPaying}
                    className="w-full sm:w-auto px-6 py-3 min-h-[44px] text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
                  >
                    {isPaying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    <span>Check Payment Status</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Standard Payment Required Prompt */
              <>
                <div className="w-16 h-16 rounded-2xl bg-green-50 dark:bg-[#041801] text-[#138601] dark:text-[#4bd043] flex items-center justify-center mx-auto border border-[#138601]/30">
                  <CreditCard className="w-8 h-8" />
                </div>

                <div className="max-w-md mx-auto space-y-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    Payment Required to Continue
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-green-100/80 leading-relaxed">
                    Your ID card application (<span className="font-mono font-bold text-gray-800 dark:text-white">{application.application_number}</span>) has been initiated. Complete payment securely via <strong>Bachs</strong> to unlock passport upload.
                  </p>
                </div>

                {/* Invoice Summary Box */}
                <div className="p-5 rounded-xl max-w-md mx-auto bg-gray-50/70 dark:bg-[#041801] border border-gray-200/60 dark:border-[#138601]/20 text-xs text-left space-y-2.5">
                  <div className="flex justify-between pb-2 border-b border-gray-200/60 dark:border-[#138601]/20">
                    <span className="text-gray-500 dark:text-green-200/60">Student Reg No:</span>
                    <span className="font-mono font-bold text-gray-900 dark:text-white">{student.matric || student.registration_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-green-200/60">Purpose:</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">NACOS Student ID Card</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-green-200/60">Gateway Provider:</span>
                    <span className="font-semibold text-[#138601] dark:text-[#4bd043] flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Bachs (bachs.io)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-green-200/60">Academic Session:</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{settings.academic_session}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200/60 dark:border-[#138601]/20 text-sm">
                    <span className="font-bold text-gray-700 dark:text-gray-300">Amount Payable:</span>
                    <span className="font-bold text-[#138601] dark:text-[#4bd043]">{settings.id_card_fee ? `₦${Number(settings.id_card_fee).toLocaleString()}.00` : 'Fetching fee...'}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handlePayment}
                    disabled={isPaying || !settings.id_card_fee}
                    className="px-8 py-3.5 min-h-[44px] text-xs sm:text-sm font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isPaying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    <span>{isPaying ? 'Connecting to Bachs...' : (settings.id_card_fee ? `Pay ₦${Number(settings.id_card_fee).toLocaleString()} with Bachs` : 'Loading fee...')}</span>
                  </button>

                  <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400 dark:text-green-200/50">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#138601] dark:text-[#4bd043]" />
                    <span>256-bit encrypted • Authoritative server verification</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ====================================================================
            STATE 3: PAYMENT CONFIRMED / PHOTO REQUIRED
            ==================================================================== */}
        {isState3 && (
          <div className="p-8 sm:p-12 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200/80 dark:border-[#138601]/30 text-center space-y-6 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto border border-blue-200 dark:border-blue-800/40">
              <Camera className="w-8 h-8" />
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold">
                <CheckCircle className="w-3.5 h-3.5" /> Payment Verified ({application.payment_reference || 'CLEARED'})
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                Upload Passport Photograph
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-green-100/80 leading-relaxed">
                Your payment is verified. Please upload a clear front-facing photograph to complete your ID card application.
              </p>
            </div>

            {uploadError && (
              <div className="p-3.5 rounded-xl bg-red-50 text-xs text-red-600 font-semibold max-w-md mx-auto">
                {uploadError}
              </div>
            )}

            <div className="max-w-sm mx-auto text-left space-y-3">
              <MediaUpload
                folder={CLOUDINARY_FOLDERS.STUDENTS}
                publicId={`${CLOUDINARY_FOLDERS.STUDENTS}/${(student.matric || student.registration_number || 'student').replace(/[^a-zA-Z0-9]/g, '_')}_passport`}
                label="Passport Photograph (JPG/PNG/WebP, max 5MB)"
                helperText="Clear front portrait with neutral background"
                aspectRatio="portrait"
                previewPreset="id_card_photo"
                onUploadSuccess={handlePhotoUploaded}
                onError={(err) => setUploadError(err)}
              />

              {/* Option to use existing profile photo if student already has one */}
              {(student?.profile_photo_url || student?.avatar_url) && (
                <div className="pt-2 border-t border-gray-100 dark:border-[#138601]/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={student.profile_photo_url || student.avatar_url}
                      alt="Current Avatar"
                      className="w-8 h-8 rounded-full object-cover border border-gray-300 dark:border-[#138601]/40"
                    />
                    <span className="text-[11px] text-gray-600 dark:text-green-200">Use current profile photo</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePhotoUploaded({ url: student.profile_photo_url || student.avatar_url })}
                    className="px-3 py-1 text-xs font-semibold text-[#138601] dark:text-[#4bd043] hover:text-white hover:bg-[#138601] border border-[#138601] dark:border-[#138601]/50 rounded-lg transition-colors cursor-pointer"
                  >
                    Select Photo
                  </button>
                </div>
              )}

              {/* Direct file picker fallback */}
              <div className="pt-1 text-center">
                <label className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-white cursor-pointer underline">
                  <Camera className="w-3.5 h-3.5" />
                  <span>Choose file from device directly</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          handlePhotoUploaded({ url: evt.target.result });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            STATE 4: READY TO SUBMIT (Review & Submit Application)
            ==================================================================== */}
        {isState4 && (
          <div className="p-8 sm:p-12 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200/80 dark:border-[#138601]/30 text-center space-y-6 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-900/30 text-[#138601] dark:text-[#4bd043] flex items-center justify-center mx-auto border border-green-300 dark:border-green-800">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                Review & Submit Your Application
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-green-100/80 leading-relaxed">
                Please verify your details and photograph before submitting your application for administrator review.
              </p>
            </div>

            {/* Profile Confirmation Card */}
            <div className="max-w-md mx-auto p-5 rounded-xl bg-gray-50/70 dark:bg-[#041801] border border-gray-200/60 dark:border-[#138601]/20 flex items-center gap-5 text-left">
              <img
                src={application.passport_url || student.profile_photo_url}
                alt="Passport Photo"
                className="w-20 h-24 object-cover rounded-xl border-2 border-[#138601] shadow-xs"
              />
              <div className="space-y-1 text-xs">
                <div className="font-bold text-sm text-gray-900 dark:text-white">{student.name || student.full_name}</div>
                <div className="font-mono text-[#138601] dark:text-[#4bd043] font-semibold">{student.matric || student.registration_number}</div>
                <div className="text-gray-500 dark:text-green-200/70">{student.level || student.current_level} • {student.programme || 'B.Tech Computer Science'}</div>
                <div className="text-[11px] text-gray-400 dark:text-green-200/50 pt-1">
                  App No: {application.application_number}
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setApplication(prev => ({ ...prev, status: 'photo_required' }))}
                className="px-5 py-3 min-h-[44px] text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                Change Photograph
              </button>

              <button
                type="button"
                onClick={handleSubmitApplication}
                disabled={isSubmitting}
                className="px-8 py-3.5 min-h-[44px] text-xs sm:text-sm font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
              >
                {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                <span>{isSubmitting ? 'Submitting Application...' : 'Submit Application for Review'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ====================================================================
            STATE 5: PROCESSING (Under Review by Portal Admin)
            ==================================================================== */}
        {isState5 && (
          <div className="p-8 sm:p-12 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200/80 dark:border-[#138601]/30 text-center space-y-6 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800/40 animate-pulse">
              <Clock className="w-8 h-8" />
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <span className="inline-block px-3 py-1 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                Status: Application Under Review
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                Your ID Application is Being Reviewed
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-green-100/80 leading-relaxed">
                Your application has been received and is currently undergoing verification by the NACOS Student Portal Administrator. Once approved, your official digital ID card will be generated automatically.
              </p>
            </div>

            <div className="p-5 rounded-xl max-w-sm mx-auto bg-gray-50/70 dark:bg-[#041801] border border-gray-200/60 dark:border-[#138601]/20 text-xs text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Application Number:</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">{application.application_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Status:</span>
                <span className="font-semibold text-green-600 dark:text-green-400">Verified & Cleared</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Submitted On:</span>
                <span className="text-gray-700 dark:text-gray-300">
                  {application.submitted_at ? new Date(application.submitted_at).toLocaleDateString() : 'Today'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            STATE 6: APPROVED / PREPARING
            ==================================================================== */}
        {isState6 && (
          <div className="p-8 sm:p-12 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200/80 dark:border-[#138601]/30 text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-green-50 dark:bg-green-900/20 text-[#138601] dark:text-[#4bd043] flex items-center justify-center mx-auto border border-green-200">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your ID Card is Being Prepared</h2>
            <p className="text-xs text-gray-500 dark:text-green-100/80">
              Application approved! Generating high-resolution digital security assets...
            </p>
          </div>
        )}

        {/* ====================================================================
            STATE 7: GENERATED (Active Official Digital ID Card)
            ==================================================================== */}
        {isState7 && (
          <div className="space-y-6">

            {/* Visual Canvas Two-Sided ID Card Preview Container */}
            <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200/80 dark:border-[#138601]/30 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-[#138601]/20 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      Official Student Identity Card (Two-Sided)
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-green-200/70 mt-0.5">
                    Official NACOS FUTO double-sided identity card. Tap Front or Back to inspect each side.
                  </p>
                </div>

                {/* Front / Back Toggle Buttons */}
                <div className="flex items-center gap-2">
                  <div className="inline-flex p-1 rounded-xl bg-gray-100 dark:bg-[#041801] border border-gray-200/80 dark:border-[#138601]/30">
                    <button
                      type="button"
                      onClick={() => setCurrentSide('front')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${currentSide === 'front'
                          ? 'bg-[#138601] text-white shadow-xs'
                          : 'text-gray-600 dark:text-green-200/70 hover:text-black dark:hover:text-white'
                        }`}
                    >
                      Front Side
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentSide('back')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${currentSide === 'back'
                          ? 'bg-[#138601] text-white shadow-xs'
                          : 'text-gray-600 dark:text-green-200/70 hover:text-black dark:hover:text-white'
                        }`}
                    >
                      Back Side
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentSide(prev => prev === 'front' ? 'back' : 'front')}
                    className="p-2 rounded-xl bg-gray-100 dark:bg-[#041801] hover:bg-gray-200 dark:hover:bg-[#138601]/20 text-gray-700 dark:text-green-200 border border-gray-200/80 dark:border-[#138601]/30 transition-colors cursor-pointer"
                    title="Flip Card"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <a
                    href={`/verify/id/${application.id_card_number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-green-200 bg-gray-100 dark:bg-[#041801] hover:bg-gray-200 border border-gray-200/80 dark:border-[#138601]/30 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Verify</span>
                  </a>
                </div>
              </div>

              {/* Card Sides Preview Area (Portrait CR-80 Card: 662 × 1075 px) */}
              <div className="flex justify-center items-center py-4">
                <div className="max-w-xs sm:max-w-sm w-full rounded-2xl overflow-hidden shadow-2xl border-2 border-[#138601]/50 bg-[#083002]">

                  {/* FRONT SIDE */}
                  <div className={`${currentSide === 'front' ? 'block' : 'hidden'}`}>
                    <canvas
                      ref={canvasRef}
                      className="w-full h-auto block"
                      style={{ aspectRatio: `${ID_CARD_TEMPLATE.dimensions.aspectRatio}` }}
                    />
                  </div>

                  {/* BACK SIDE (Static Master Back Template) */}
                  <div className={`${currentSide === 'back' ? 'block' : 'hidden'}`}>
                    <img
                      src={application.id_card_back_url || ID_CARD_TEMPLATE.masterBackUrl || idTemplateBack}
                      alt="NACOS Student ID Card Back"
                      className="w-full h-auto block object-cover"
                      style={{ aspectRatio: `${ID_CARD_TEMPLATE.dimensions.aspectRatio}` }}
                    />
                  </div>

                </div>
              </div>

              {/* Side indicator badge */}
              <div className="text-center text-xs font-semibold text-gray-500 dark:text-green-200/70">
                Viewing: <span className="text-[#138601] dark:text-[#4bd043] uppercase font-bold">{currentSide} of official card</span>
              </div>

              {/* Download Buttons Bar */}
              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-4 border-t border-gray-100 dark:border-[#138601]/20">
                <button
                  type="button"
                  onClick={() => handleDownloadImage('front')}
                  className="px-4 py-2.5 min-h-[40px] text-xs font-semibold text-gray-800 dark:text-white bg-gray-100 dark:bg-[#041801] hover:bg-gray-200 dark:hover:bg-black rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-[#138601] dark:text-[#4bd043]" />
                  <span>Front (PNG)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadImage('back')}
                  className="px-4 py-2.5 min-h-[40px] text-xs font-semibold text-gray-800 dark:text-white bg-gray-100 dark:bg-[#041801] hover:bg-gray-200 dark:hover:bg-black rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-[#138601] dark:text-[#4bd043]" />
                  <span>Back (PNG)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadImage('both')}
                  className="px-4 py-2.5 min-h-[40px] text-xs font-semibold text-gray-800 dark:text-white bg-gray-100 dark:bg-[#041801] hover:bg-gray-200 dark:hover:bg-black rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-[#138601] dark:text-[#4bd043]" />
                  <span>Both Sides (PNG)</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="px-6 py-2.5 min-h-[40px] text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Two-Sided PDF</span>
                </button>
              </div>
            </div>

            {/* Verification & Metadata Summary */}
            <div className="p-5 rounded-xl bg-gray-50/70 dark:bg-[#041801] border border-gray-200/60 dark:border-[#138601]/20 text-xs space-y-2">
              <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
                <span>Card Validity & Details</span>
              </h4>
              <ul className="list-disc list-inside text-gray-600 dark:text-green-100/70 space-y-1">
                <li>NACOS ID Number: <strong className="font-mono text-gray-900 dark:text-white">{application.id_card_number}</strong></li>
                <li>Valid for Session: <strong className="text-gray-900 dark:text-white">{settings.academic_session}</strong></li>
                <li>Expiration Date: <strong className="text-[#138601] dark:text-[#4bd043]">{expiryDateFormatted} (1-Year Validity)</strong></li>
                <li>Present this digital or printed card for departmental verification, election voting, and lab access.</li>
              </ul>
            </div>

          </div>
        )}

        {/* ====================================================================
            STATE 8: REJECTED
            ==================================================================== */}
        {isState8 && (
          <div className="p-8 sm:p-12 rounded-2xl bg-white dark:bg-[#083002] border border-red-200/80 dark:border-red-900/50 text-center space-y-6 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto border border-red-200 dark:border-red-900">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <span className="inline-block px-3 py-1 rounded-md bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs font-semibold">
                Application Rejected
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                Action Required on Your Application
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-green-100/80 leading-relaxed">
                Your ID card application was not approved. Please review the feedback below and update your submission.
              </p>
            </div>

            {/* Rejection Reason Box */}
            <div className="p-4 rounded-xl max-w-md mx-auto bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-left space-y-1.5">
              <span className="font-bold text-red-800 dark:text-red-300">Administrator Feedback:</span>
              <p className="text-red-700 dark:text-red-200">
                {application.rejection_reason || 'Photograph did not meet passport criteria. Please upload a clear front-facing photo on a light background.'}
              </p>
            </div>

            <div>
              <button
                type="button"
                onClick={handleReapply}
                className="px-8 py-3.5 min-h-[44px] text-xs sm:text-sm font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Update Photo & Re-submit</span>
              </button>
            </div>
          </div>
        )}

        {/* ====================================================================
            STATE 9: REVOKED
            ==================================================================== */}
        {isState9 && (
          <div className="p-8 sm:p-12 rounded-2xl bg-white dark:bg-[#083002] border border-red-300 dark:border-red-900 text-center space-y-6 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto border border-red-300">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <span className="inline-block px-3 py-1 rounded-md bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-200 text-xs font-bold uppercase tracking-wider">
                Card Revoked
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                Your ID Card Has Been Revoked
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-green-100/80 leading-relaxed">
                This student identity card ({application.id_card_number || 'N/A'}) has been officially revoked by the NACOS Directorate. It will no longer scan as valid on the verification registry.
              </p>
            </div>

            <div className="p-4 rounded-xl max-w-md mx-auto bg-gray-50/70 dark:bg-[#041801] border border-gray-200/60 dark:border-[#138601]/20 text-xs text-left">
              <span className="font-semibold text-gray-500">Reason for Revocation:</span>
              <p className="font-medium text-gray-900 dark:text-white mt-1">
                {application.revocation_reason || 'Academic session expired or clearance revoked.'}
              </p>
            </div>

            {settings.allow_reapplication_on_revoke && (
              <div>
                <button
                  type="button"
                  onClick={handleReapply}
                  className="px-8 py-3.5 min-h-[44px] text-xs sm:text-sm font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Submit New Application</span>
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Step-Up Authentication Modal */}
      <StepUpAuthModal
        isOpen={isStepUpOpen}
        onClose={() => setIsStepUpOpen(false)}
        onSuccess={(token) => executeIdCardCheckout(token)}
        purpose="PAYMENT_CONFIRMATION"
        title="Confirm NACOS ID Card Payment"
        description="Verify your identity before proceeding to Bachs checkout."
        user={student}
      />
    </PortalLayout>
  );
};

export default IdCard;
