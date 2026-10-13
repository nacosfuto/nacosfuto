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
  Check,
  Plus,
  ChevronDown,
  X
} from 'lucide-react';
import { getProgressiveLevels } from './Dues';
import { 
  SUPPORTED_ACADEMIC_SESSIONS, 
  getActiveAcademicSession, 
  getActiveAcademicYearStart,
  calculateAcademicProgression,
  getStudentApplicableLevelSessions,
  onAcademicSessionChange 
} from '@nacos/config/academic';
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
  saveGeneratedIdCardAsset,
  verifyStudentIdCardAccess
} from '@nacos/supabase/idCard';
import { supabase, getLocalPaymentsDatabase } from '@nacos/supabase';
import { enrichStudentProfile } from '@nacos/supabase/auth';
import { ID_CARD_TEMPLATE } from '@nacos/config/idCardTemplate';
import { MediaUpload, CLOUDINARY_FOLDERS, getOptimizedImageUrl, idTemplateMaster, idTemplateBack, idTemplateFrame } from '@nacos/media';
import StepUpAuthModal from '../components/StepUpAuthModal';
import PosThermalReceipt from '../components/PosThermalReceipt';

const masterTemplateAsset = idTemplateMaster;
const frameAsset = idTemplateFrame;

export const normalizeLevel = (lvl) => {
  if (!lvl) return '100 Level';
  const s = String(lvl).trim();
  if (s.toLowerCase().includes('level')) return s;
  const match = s.match(/\d{3}/);
  return match ? `${match[0]} Level` : `${s} Level`;
};

const withTimeout = (promise, ms = 6000) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Operation timed out')), ms))
  ]);

const IdCard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const canvasRef = useRef(null);
  const pollIntervalRef = useRef(null);

  const [student, setStudent] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('nacos_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          return enrichStudentProfile(parsed) || parsed;
        }
      } catch (e) {}
    }
    return null;
  });
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({ id_card_fee: null, academic_session: '2026/2027' });
  const [application, setApplication] = useState(null);
  const [currentSide, setCurrentSide] = useState('front'); // 'front' | 'back'

  const getInitialStudentLevel = () => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('nacos_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          const prog = calculateAcademicProgression(parsed, getActiveAcademicSession());
          return prog.levelString || parsed.level || (parsed.current_level ? `${parsed.current_level} Level` : '100 Level');
        }
      } catch (_) {}
    }
    return '100 Level';
  };

  const studentRef = useRef(student);
  const settingsRef = useRef(settings);
  const lastDrawnCardKeyRef = useRef('');
  const lastFetchTimeRef = useRef(0);
  const formLevelRef = useRef(getInitialStudentLevel());
  const formSessionRef = useRef(getActiveAcademicSession());
  const verifyingReferenceRef = useRef('');
  const isVerifyingPaymentRef = useRef(false);
  const paymentTransactionRef = useRef(null);

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

  // Dedicated Payment Verification & Transaction Monitoring State
  const [paymentTransaction, setPaymentTransaction] = useState(null);
  const [paymentStatusOutcome, setPaymentStatusOutcome] = useState('PENDING'); // 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED'
  const [paymentStatusMessage, setPaymentStatusMessage] = useState('');
  const [isPaymentDelayed, setIsPaymentDelayed] = useState(false);
  const [gatewayTabClosed, setGatewayTabClosed] = useState(false);
  const gatewayWindowRef = useRef(null);
  const tabWatchIntervalRef = useRef(null);

  // ID Card Payment History & Receipt States
  const [idCardPayments, setIdCardPayments] = useState([]);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  // ID Card Display On-Demand & Backend Access Verification States
  const [isCardViewRequested, setIsCardViewRequested] = useState(false);
  const [isVerifyingCardAccess, setIsVerifyingCardAccess] = useState(false);

  // Progressive Level & Session Selection Modal
  const [isNewPaymentModalOpen, setIsNewPaymentModalOpen] = useState(false);
  const [formSession, setFormSession] = useState(getActiveAcademicSession);
  const [formLevel, setFormLevel] = useState(getInitialStudentLevel);

  useEffect(() => {
    studentRef.current = student;
  }, [student]);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  useEffect(() => {
    formLevelRef.current = formLevel;
  }, [formLevel]);
  useEffect(() => {
    formSessionRef.current = formSession;
  }, [formSession]);
  useEffect(() => {
    verifyingReferenceRef.current = verifyingReference;
  }, [verifyingReference]);
  useEffect(() => {
    isVerifyingPaymentRef.current = isVerifyingPayment;
  }, [isVerifyingPayment]);
  useEffect(() => {
    paymentTransactionRef.current = paymentTransaction;
  }, [paymentTransaction]);

  useEffect(() => {
    loadStudentAndApplication();

    // Check for pending ID card payment transaction in localStorage to restore waiting state if URL indicates verifying
    try {
      const isVerifyingUrl = searchParams.get('payment') === 'verifying';
      const savedTxStr = localStorage.getItem('nacos_pending_id_card_tx');
      if (savedTxStr && isVerifyingUrl) {
        const savedTx = JSON.parse(savedTxStr);
        const ageMs = Date.now() - new Date(savedTx.initiatedAt || 0).getTime();
        if (ageMs < 15 * 60 * 1000) {
          setPaymentTransaction(savedTx);
          setIsVerifyingPayment(true);
          setPaymentStatusOutcome('PENDING');
          setVerifyingReference(savedTx.checkoutId || savedTx.reference || '');
          if (savedTx.level) {
            const norm = normalizeLevel(savedTx.level);
            formLevelRef.current = norm;
            setFormLevel(norm);
          }
          if (savedTx.session) {
            formSessionRef.current = savedTx.session;
            setFormSession(savedTx.session);
          }
          startPaymentVerificationPolling(savedTx.reference, savedTx.checkoutId, savedTx.level);
        } else {
          localStorage.removeItem('nacos_pending_id_card_tx');
        }
      }
    } catch (_) {}

    const handleSettingsUpdated = (e) => {
      if (e.detail) setSettings(e.detail);
      else {
        getIdCardSettings().then(cfg => { if (cfg) setSettings(cfg); });
      }
    };

    const unsubSession = onAcademicSessionChange(({ sessionName }) => {
      if (sessionName && sessionName !== formSessionRef.current) {
        formSessionRef.current = sessionName;
        setFormSession(sessionName);
        loadStudentAndApplication(formLevelRef.current);
      }
    });

    window.addEventListener('nacos_id_card_settings_updated', handleSettingsUpdated);
    return () => {
      window.removeEventListener('nacos_id_card_settings_updated', handleSettingsUpdated);
      if (unsubSession) unsubSession();
      if (tabWatchIntervalRef.current) clearInterval(tabWatchIntervalRef.current);
    };
  }, []);

  const loadStudentAndApplication = async (preferredLevel = null) => {
    const stored = localStorage.getItem('nacos_user');
    if (!stored && !student) {
      setLoading(false);
      navigate('/login');
      return;
    }

    try {
      let parsed = student;
      if (stored) {
        try {
          parsed = enrichStudentProfile(JSON.parse(stored)) || parsed;
        } catch (_) {}
      }
      if (!parsed) {
        navigate('/login');
        return;
      }
      setStudent(parsed);

      const pObs = getStudentApplicableLevelSessions(parsed) || [];
      const curOb = pObs.find(o => o.isCurrent) || pObs[pObs.length - 1];
      const defaultStudentLevel = curOb?.level || parsed.level || (parsed.current_level ? `${parsed.current_level} Level` : '100 Level');

      const matric = parsed.matric || parsed.registration_number;
      const cleanMatric = String(matric || '').trim().toUpperCase();

      const pProg = calculateAcademicProgression(parsed, getActiveAcademicSession());
      const maxLvlNum = (pProg?.numericLevel || 1) * 100;
      let rawLookupLevel = preferredLevel ? normalizeLevel(preferredLevel) : (formLevelRef.current || defaultStudentLevel);
      const rawLookupNum = parseInt(String(rawLookupLevel).replace(/\D/g, ''), 10);
      const lookupLevel = (!isNaN(rawLookupNum) && rawLookupNum > maxLvlNum) ? defaultStudentLevel : rawLookupLevel;

      // Parallelize settings, profile check, payments ledger, and application queries to eliminate waterfall
      const [cfg, profRow, dbPays, rawApp] = await Promise.all([
        withTimeout(getIdCardSettings(), 6000).catch(() => null),
        supabase && cleanMatric
          ? withTimeout(
              supabase.from('profiles').select('*').or(`registration_number.eq.${cleanMatric},matric_number.eq.${cleanMatric}`).limit(1).maybeSingle(),
              6000
            ).then(res => res.data).catch(() => null)
          : Promise.resolve(null),
        supabase && cleanMatric
          ? withTimeout(
              supabase.from('payments').select('*').or(`registration_number.eq.${cleanMatric},matric_number.eq.${cleanMatric}`).order('created_at', { ascending: false }),
              6000
            ).then(res => res.data || []).catch(() => [])
          : Promise.resolve([]),
        cleanMatric
          ? withTimeout(getStudentIdApplication(cleanMatric, lookupLevel), 6000).catch(() => null)
          : Promise.resolve(null)
      ]);

      if (cfg) setSettings(cfg);

      let resolvedPhoto = parsed.profile_photo_url || parsed.avatar_url || null;
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

      // Process collected ID Card payments
      const collectedIdCardPays = [];
      const processIdPayItem = (p) => {
        const isIdType = p.payment_type === 'ID_CARD' ||
          String(p.purpose || '').toLowerCase().includes('id card') ||
          String(p.title || '').toLowerCase().includes('id card') ||
          String(p.payment_title || '').toLowerCase().includes('id card');

        if (!isIdType) return;

        const rawStatus = String(p.status || '').toLowerCase();
        const isPaid = ['successful', 'paid', 'cleared', 'verified', 'completed'].includes(rawStatus) || Boolean(p.paid_at);
        const mappedStatus = isPaid ? 'PAID' : 'UNPAID';

        let payLevel = p.level || p.metadata?.level || p.metadata?.academic_level || '';
        let paySession = p.academic_session || p.metadata?.academic_session || p.metadata?.academicSession || p.session || '';

        if (!payLevel && paySession) {
          const match = pObs.find(o => String(o.session).trim() === String(paySession).trim());
          if (match) payLevel = match.level;
        } else if (!paySession && payLevel) {
          const match = pObs.find(o => String(o.level).replace(/\D/g, '') === String(payLevel).replace(/\D/g, ''));
          if (match) paySession = match.session;
        }

        // If payment record has neither level nor session in DB, anchor to student's current obligation
        if (!payLevel) {
          payLevel = curOb?.level || defaultStudentLevel;
        }
        if (!paySession) {
          paySession = curOb?.session || cfg?.academic_session || getActiveAcademicSession();
        }

        const payDate = p.paid_at || p.created_at || new Date().toISOString();
        const dObj = new Date(payDate);
        const amt = Number(p.amount || cfg?.id_card_fee || 0);

        collectedIdCardPays.push({
          id: p.id || p.reference,
          receiptNo: p.reference || `NACOS/IDCARD/${cleanMatric}`,
          transactionId: p.provider_payment_id || p.id || p.reference || 'TX-CONFIRMED',
          amount: amt,
          formattedAmount: `₦${amt.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
          session: paySession,
          level: normalizeLevel(payLevel),
          paymentType: 'Student ID Card Issuance',
          paymentMethod: p.provider ? `${String(p.provider).replace(/bachs/gi, 'Online Gateway')} (${mappedStatus})` : `Online Gateway (${mappedStatus})`,
          date: !isNaN(dObj.getTime()) ? dObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Current Session',
          time: !isNaN(dObj.getTime()) ? dObj.toLocaleTimeString('en-GB') : '12:00:00',
          status: mappedStatus,
          isPaid,
          rawPayment: p
        });
      };

      if (Array.isArray(dbPays) && dbPays.length > 0) {
        dbPays.forEach(processIdPayItem);
      }

      // Check local storage payments fallback to prevent transient network misses
      try {
        const localDb = getLocalPaymentsDatabase();
        if (Array.isArray(localDb)) {
          localDb.filter(p =>
            (p.student_matric && p.student_matric.toUpperCase() === cleanMatric) ||
            (p.registration_number && p.registration_number.toUpperCase() === cleanMatric)
          ).forEach(processIdPayItem);
        }
      } catch (_) {}

      // If rawApp is verified/paid, ensure a corresponding paid entry exists in collectedIdCardPays
      if (rawApp && (rawApp.payment_status === 'paid' || rawApp.payment_status === 'verified' || rawApp.status === 'generated')) {
        const appLvl = rawApp.level || curOb?.level || defaultStudentLevel;
        const appLvlNum = String(appLvl).replace(/\D/g, '');
        const alreadyInPays = collectedIdCardPays.some(p => p.isPaid && String(p.level).replace(/\D/g, '') === appLvlNum);
        if (!alreadyInPays) {
          const amt = Number(rawApp.amount_paid || rawApp.amount || cfg?.id_card_fee || 0);
          collectedIdCardPays.unshift({
            id: rawApp.id || `idpay-${cleanMatric}`,
            receiptNo: rawApp.payment_reference || `NACOS/IDCARD/${cleanMatric}`,
            transactionId: rawApp.payment_reference || 'TX-CONFIRMED',
            amount: amt,
            formattedAmount: `₦${amt.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
            session: rawApp.academic_session || curOb?.session || cfg?.academic_session || getActiveAcademicSession(),
            level: normalizeLevel(appLvl),
            paymentType: 'Student ID Card Issuance',
            paymentMethod: 'Online Gateway (Confirmed)',
            date: rawApp.paid_at ? new Date(rawApp.paid_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            time: rawApp.paid_at ? new Date(rawApp.paid_at).toLocaleTimeString('en-GB') : new Date().toLocaleTimeString('en-GB'),
            status: 'PAID',
            isPaid: true
          });
        }
      }

      // Authoritative Active Academic Level:
      // Strictly determined by the current academic session and student progression.
      // A previous-level payment must NEVER override or become the active level.
      const activeTargetLvl = curOb?.level ? normalizeLevel(curOb.level) : defaultStudentLevel;

      const activeTargetLvlNum = activeTargetLvl ? String(activeTargetLvl).replace(/\D/g, '') : null;
      const activeOb = pObs.find(o => {
        const lNum = String(o.level || '').replace(/\D/g, '');
        return lNum && activeTargetLvlNum && lNum === activeTargetLvlNum;
      }) || curOb || pObs[0];

      if (activeOb) {
        const canonicalLvl = normalizeLevel(activeOb.level);
        if (formLevelRef.current !== canonicalLvl) {
          formLevelRef.current = canonicalLvl;
          setFormLevel(canonicalLvl);
        }
        if (formSessionRef.current !== activeOb.session) {
          formSessionRef.current = activeOb.session;
          setFormSession(activeOb.session);
        }
      }

      const activeObLvlNum = activeOb ? String(activeOb.level).replace(/\D/g, '') : null;
      const targetPaidRecord = collectedIdCardPays.find(p => {
        if (!p.isPaid) return false;
        const pNum = String(p.level || '').replace(/\D/g, '');
        return Boolean(pNum && activeObLvlNum && pNum === activeObLvlNum);
      });

      const isTargetPaid = Boolean(targetPaidRecord);
      let app = rawApp;

      if (isTargetPaid) {
        if (!app) {
          const createRes = await withTimeout(createIdCardApplication(parsed), 6000).catch(() => ({ application: null }));
          app = createRes.application;
        }

        if (app && app.status !== 'revoked' && app.status !== 'rejected') {
          const photoToUse = app.passport_url || resolvedPhoto;
          const cleanDigits = String(cleanMatric).replace(/\D/g, '') || cleanMatric;

          app.payment_status = 'verified';
          app.level = activeOb?.level ? normalizeLevel(activeOb.level) : app.level;
          app.academic_session = activeOb?.session || app.academic_session;
          if (targetPaidRecord?.receiptNo) {
            app.payment_reference = targetPaidRecord.receiptNo;
          }

          if (photoToUse) {
            const needsDbSync = app.status !== 'generated' || app.payment_status !== 'paid' || !app.passport_url || !app.id_card_number;
            app.status = 'generated';
            app.passport_url = photoToUse;
            if (!app.id_card_number) app.id_card_number = cleanDigits;
            app.generated_at = app.generated_at || new Date().toISOString();

            if (needsDbSync && supabase && app.id) {
              supabase.from('id_card_applications').update({
                status: 'generated',
                payment_status: 'paid',
                level: app.level,
                academic_session: app.academic_session,
                passport_url: photoToUse,
                id_card_number: app.id_card_number,
                generated_at: app.generated_at,
                updated_at: new Date().toISOString()
              }).eq('id', app.id).then(() => {}).catch(() => {});
            }
          } else {
            app.status = 'photo_required';
          }
        }
      }

      // Merge and preserve previously confirmed payments against transient network dropouts
      setIdCardPayments(prev => {
        const map = new Map();
        (prev || []).forEach(p => {
          if (p.isPaid) {
            const key = p.receiptNo || p.transactionId || normalizeLevel(p.level);
            map.set(key, p);
          }
        });
        (collectedIdCardPays || []).forEach(p => {
          const key = p.receiptNo || p.transactionId || normalizeLevel(p.level);
          map.set(key, p);
        });
        return Array.from(map.values());
      });

      // Preserve application object if previously paid/generated and background fetch is temporarily null
      setApplication(prev => {
        if (!app && prev && (prev.payment_status === 'paid' || prev.status === 'generated')) {
          return prev;
        }
        return app || prev;
      });
    } catch (err) {
      console.error('ID Card page data load notice:', err);
    } finally {
      setLoading(false);
      lastFetchTimeRef.current = Date.now();
    }
  };




  const handleViewIdCard = async (obligation = null) => {
    const targetOb = obligation || selectedObligation || currentLevelObligation;
    const activeLevel = studentLevel; // Authoritative active level derived from progression
    const targetLvl = targetOb?.level || formLevel || activeLevel;
    const isLevelPaid = targetOb ? targetOb.isPaid : isSelectedLevelPaid;

    // Synchronize selection state so canvas renders the target obligation details
    if (targetOb) {
      if (targetOb.level) {
        formLevelRef.current = normalizeLevel(targetOb.level);
        setFormLevel(normalizeLevel(targetOb.level));
      }
      if (targetOb.session) {
        formSessionRef.current = targetOb.session;
        setFormSession(targetOb.session);
      }
    }

    // If neither the target obligation nor the overall student ID card is paid, prompt to pay
    if (!isLevelPaid && !hasAnyPaidLevel && !application?.payment_status) {
      showNotification(`Payment Required: Please complete payment for ${targetLvl} to access your ID card.`, 'error');
      setIsCardViewRequested(false);
      return;
    }

    // Authoritative Backend Validation:
    setIsVerifyingCardAccess(true);
    const regNo = student?.matric || student?.registration_number;

    try {
      const res = await verifyStudentIdCardAccess({
        registrationNumber: regNo,
        studentId: student?.id,
        level: targetLvl,
        session: targetOb?.session || formSession
      });

      if (!res.allowed) {
        // If client already confirmed payment locally, fallback gracefully
        if (isLevelPaid || targetOb?.isPaid) {
          setIsCardViewRequested(true);
          setIsVerifyingCardAccess(false);
          showNotification(`Official ID Card for ${targetLvl} verified and loaded!`);
          setTimeout(() => {
            const el = document.getElementById('nacos-id-card-stage');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 150);
          return;
        }

        showNotification(res.error || `Payment required for ${targetLvl}. Please complete payment to view your ID card.`, 'error');
        setIsCardViewRequested(false);
        setIsVerifyingCardAccess(false);
        return;
      }

      // Access Granted! Synchronize application and reveal card in page section
      if (res.application) {
        setApplication(prev => ({ ...prev, ...res.application }));
      }
      setIsCardViewRequested(true);
      setIsVerifyingCardAccess(false);
      showNotification(`Official ID Card for ${res.targetLevel || targetLvl} verified and loaded!`);

      setTimeout(() => {
        const el = document.getElementById('nacos-id-card-stage');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    } catch (err) {
      console.warn('Backend verification notice:', err);
      if (isLevelPaid || targetOb?.isPaid) {
        setIsCardViewRequested(true);
        setTimeout(() => {
          const el = document.getElementById('nacos-id-card-stage');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      } else {
        showNotification('Unable to verify ID card clearance. Please try again.', 'error');
        setIsCardViewRequested(false);
      }
      setIsVerifyingCardAccess(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 4500);
  };

  // Authoritative status verification against backend & gateway
  const checkPaymentStatusAuthoritative = async (reference, checkoutId, targetLevel = null, isTabCloseEvent = false) => {
    const currentStudent = studentRef.current;
    const queryParams = new URLSearchParams();
    if (reference) queryParams.set('reference', reference);
    if (checkoutId) queryParams.set('checkoutId', checkoutId);
    if (currentStudent?.matric || currentStudent?.registration_number) {
      queryParams.set('registrationNumber', currentStudent.matric || currentStudent.registration_number);
    }
    if (currentStudent?.id) {
      queryParams.set('studentId', currentStudent.id);
    }
    const lvlToPass = targetLevel || formLevel;
    if (lvlToPass) {
      queryParams.set('level', lvlToPass);
    }

    try {
      const res = await fetch(`/api/payments/id-card/status?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();

        // 1. Definitively Successful Outcome
        if (data.isPaid || data.status === 'successful') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          if (tabWatchIntervalRef.current) clearInterval(tabWatchIntervalRef.current);
          try {
            localStorage.removeItem('nacos_pending_id_card_tx');
          } catch (_) {}

          setIsVerifyingPayment(false);
          setPaymentStatusOutcome('SUCCESS');
          setPaymentStatusMessage('Payment confirmed! Processing your official NACOS ID Card on the spot.');
          showNotification('Payment verified! Processing your official NACOS ID Card on the spot.');

          try {
            window.history.replaceState({}, '', window.location.pathname);
          } catch (_) {}

          const paidLvl = data.level || data.payment?.level || lvlToPass;
          const canonicalLvl = normalizeLevel(paidLvl);
          formLevelRef.current = canonicalLvl;
          setFormLevel(canonicalLvl);

          await loadStudentAndApplication(canonicalLvl);
          return 'SUCCESS';
        }

        // 2. Definitively Failed Outcome
        if (data.status === 'failed' || data.status === 'declined' || data.status === 'error') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          if (tabWatchIntervalRef.current) clearInterval(tabWatchIntervalRef.current);
          try {
            localStorage.removeItem('nacos_pending_id_card_tx');
          } catch (_) {}

          setPaymentStatusOutcome('FAILED');
          setPaymentStatusMessage(data.error || 'Payment was declined or failed at the gateway.');
          return 'FAILED';
        }

        // 3. Definitively Cancelled Outcome
        if (data.status === 'cancelled' || data.status === 'abandoned') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          if (tabWatchIntervalRef.current) clearInterval(tabWatchIntervalRef.current);
          try {
            localStorage.removeItem('nacos_pending_id_card_tx');
          } catch (_) {}

          setPaymentStatusOutcome('CANCELLED');
          setPaymentStatusMessage('Transaction was cancelled. You can retry checkout when you are ready.');
          return 'CANCELLED';
        }

        // 4. Pending Outcome
        if (isTabCloseEvent) {
          // Tab closure alone does NOT mean failed; maintain verification state!
          setGatewayTabClosed(true);
        }
        return 'PENDING';
      }
    } catch (err) {
      console.warn('Authoritative payment status check notice:', err);
    }
    return 'PENDING';
  };

  // Helper to recheck payment status with backend directly
  const checkPaymentDirect = async (targetRef = null) => {
    const activeRef = targetRef || verifyingReference || paymentTransaction?.reference || searchParams.get('reference') || searchParams.get('checkout_id') || searchParams.get('checkoutId');
    const chkId = paymentTransaction?.checkoutId || (activeRef && activeRef.startsWith('chk_') ? activeRef : null);
    const ref = chkId ? null : activeRef;
    const outcome = await checkPaymentStatusAuthoritative(ref, chkId, formLevel);
    return outcome === 'SUCCESS';
  };

  // Cross-Tab BroadcastChannel & Storage Event Listeners (Registered once on mount)
  useEffect(() => {
    let channel = null;
    try {
      channel = new BroadcastChannel('nacos_payment_sync');
      channel.onmessage = async (event) => {
        if (event.data?.status === 'successful' && (event.data.paymentType === 'id_card' || !event.data.paymentType)) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          if (tabWatchIntervalRef.current) clearInterval(tabWatchIntervalRef.current);
          try {
            localStorage.removeItem('nacos_pending_id_card_tx');
          } catch (_) {}

          setIsVerifyingPayment(false);
          setPaymentStatusOutcome('SUCCESS');
          setPaymentStatusMessage('Payment confirmed in payment window! ID Card generated on the spot.');
          showNotification('Payment confirmed in payment window! ID Card generated on the spot.');

          try {
            window.history.replaceState({}, '', window.location.pathname);
          } catch (_) {}

          const paidLvl = event.data.level || formLevelRef.current;
          const canonicalLvl = normalizeLevel(paidLvl);
          formLevelRef.current = canonicalLvl;
          setFormLevel(canonicalLvl);

          await loadStudentAndApplication(canonicalLvl);
        }
      };
    } catch (e) {}

    const handleStorageEvent = (e) => {
      if (e.key === 'nacos_last_payment_success') {
        let paidLvl = null;
        if (e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            if (parsed.level) paidLvl = parsed.level;
          } catch (_) {}
        }
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        if (tabWatchIntervalRef.current) clearInterval(tabWatchIntervalRef.current);
        try {
          localStorage.removeItem('nacos_pending_id_card_tx');
        } catch (_) {}

        setIsVerifyingPayment(false);
        setPaymentStatusOutcome('SUCCESS');
        showNotification('Payment confirmed! Updating ID card...');
        loadStudentAndApplication(paidLvl ? normalizeLevel(paidLvl) : formLevelRef.current);
      } else if (e.key === 'nacos_id_card_settings_db') {
        try {
          const cfg = JSON.parse(e.newValue || '{}');
          if (cfg?.id_card_fee) setSettings(cfg);
        } catch (_) {}
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    // Automatic authoritative recheck when student switches back to this tab (visibilitychange only, throttled)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const targetRef = paymentTransactionRef.current?.reference || verifyingReferenceRef.current;
        const targetChk = paymentTransactionRef.current?.checkoutId;
        if (targetRef || targetChk || isVerifyingPaymentRef.current) {
          await checkPaymentStatusAuthoritative(targetRef, targetChk, formLevelRef.current);
        } else if (Date.now() - lastFetchTimeRef.current > 30000) {
          // Throttled: only re-fetch if at least 30s have elapsed
          await loadStudentAndApplication(formLevelRef.current);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorageEvent);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Handle URL Query Parameters on initial load
  useEffect(() => {
    const paymentAction = searchParams.get('payment');
    const ref = searchParams.get('reference');
    const chkId = searchParams.get('checkout_id') || searchParams.get('checkoutId');

    if (paymentAction === 'verifying' && (ref || chkId)) {
      setIsVerifyingPayment(true);
      setPaymentStatusOutcome('PENDING');
      setVerifyingReference(chkId || ref);
      startPaymentVerificationPolling(ref, chkId, formLevelRef.current);
    } else if (paymentAction === 'cancelled') {
      setIsVerifyingPayment(true);
      setPaymentStatusOutcome('CANCELLED');
      setPaymentStatusMessage('Payment was cancelled. You can retry checkout when you are ready.');
      try {
        window.history.replaceState({}, '', window.location.pathname);
      } catch (_) {}
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (tabWatchIntervalRef.current) clearInterval(tabWatchIntervalRef.current);
    };
  }, []);

  const startPaymentVerificationPolling = (reference, checkoutId, targetLevel = null) => {
    let attempts = 0;
    const maxAttempts = 60; // 60 attempts (~3-4 minutes)

    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    const checkStatus = async () => {
      attempts++;
      const outcome = await checkPaymentStatusAuthoritative(reference, checkoutId, targetLevel);
      if (outcome === 'SUCCESS' || outcome === 'FAILED' || outcome === 'CANCELLED') {
        return;
      }

      // If unresolved after 25 attempts (~50s), transition to delayed state & slow polling
      if (attempts === 25) {
        setIsPaymentDelayed(true);
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = setInterval(checkStatus, 5000);
      }

      if (attempts >= maxAttempts) {
        clearInterval(pollIntervalRef.current);
        setIsPaymentDelayed(true);
        showNotification('Payment confirmation is taking longer than expected. Use "Check Status Now" to refresh.', 'info');
      }
    };

    checkStatus();
    pollIntervalRef.current = setInterval(checkStatus, 2000);
  };

  const handleManualCheckStatus = async () => {
    setIsPaying(true);
    const ref = paymentTransaction?.reference || verifyingReference || searchParams.get('reference');
    const chkId = paymentTransaction?.checkoutId || searchParams.get('checkout_id') || searchParams.get('checkoutId');
    const lvl = paymentTransaction?.level || formLevel;

    const outcome = await checkPaymentStatusAuthoritative(ref, chkId, lvl);
    setIsPaying(false);

    if (outcome === 'PENDING') {
      showNotification('Payment is still being processed by the gateway. We are waiting for confirmation.');
    } else if (outcome === 'SUCCESS') {
      showNotification('Payment confirmed! Processing your official NACOS ID Card.');
    } else if (outcome === 'FAILED') {
      showNotification('Payment was declined or failed.', 'error');
    } else if (outcome === 'CANCELLED') {
      showNotification('Payment was cancelled.', 'error');
    }
  };

  const handleRetryPayment = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (tabWatchIntervalRef.current) clearInterval(tabWatchIntervalRef.current);
    try {
      localStorage.removeItem('nacos_pending_id_card_tx');
    } catch (_) {}
    setIsVerifyingPayment(false);
    setPaymentTransaction(null);
    setPaymentStatusOutcome('PENDING');
    setIsPaymentDelayed(false);
    setGatewayTabClosed(false);
    setIsNewPaymentModalOpen(true);
  };

  const handleCancelVerification = async () => {
    const ref = paymentTransaction?.reference || verifyingReference;
    const chkId = paymentTransaction?.checkoutId;
    const outcome = await checkPaymentStatusAuthoritative(ref, chkId, formLevel);
    if (outcome === 'SUCCESS') return;

    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (tabWatchIntervalRef.current) clearInterval(tabWatchIntervalRef.current);
    try {
      localStorage.removeItem('nacos_pending_id_card_tx');
    } catch (_) {}
    setIsVerifyingPayment(false);
    setPaymentTransaction(null);
    setPaymentStatusOutcome('PENDING');
    setIsPaymentDelayed(false);
    setGatewayTabClosed(false);
    showNotification('Payment verification cancelled. You can retry checkout when you are ready.', 'info');
  };

  const handleReopenGatewayTab = () => {
    if (paymentTransaction?.checkoutUrl) {
      const win = window.open(paymentTransaction.checkoutUrl, '_blank');
      gatewayWindowRef.current = win;
      setGatewayTabClosed(false);
      showNotification('Reopened payment gateway in a new tab.');
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

  // Universal "New Payment" Handler matching Dues.jsx
  const handleNewPayment = () => {
    setIsNewPaymentModalOpen(true);
  };

  const handleSubmitNewPayment = async () => {
    if (isVerifyingPayment && paymentStatusOutcome === 'PENDING') {
      showNotification('A payment transaction is already pending verification. Please complete it or wait for confirmation.', 'error');
      setIsNewPaymentModalOpen(false);
      return;
    }

    setIsNewPaymentModalOpen(false);

    // Synchronously open a new window on user click to guarantee no popup blocker interferes
    let gatewayTab = null;
    try {
      gatewayTab = window.open('about:blank', '_blank');
      if (gatewayTab && gatewayTab.document) {
        gatewayTab.document.open();
        gatewayTab.document.write(`
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
              <title>Connecting to Payment Gateway | NACOS FUTO</title>
              <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                html, body {
                  width: 100%;
                  height: 100%;
                  min-height: 100dvh;
                  background-color: #f8fafc;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  overflow: hidden;
                }
                .spinner-wrap {
                  width: 100%;
                  height: 100%;
                  min-height: 100dvh;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  padding: 16px;
                }
                .spinning-logo {
                  width: clamp(140px, 42vw, 220px);
                  height: clamp(140px, 42vw, 220px);
                  max-width: 80vw;
                  max-height: 80vh;
                  object-fit: contain;
                  animation: spin 3s linear infinite;
                }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
              </style>
            </head>
            <body>
              <div class="spinner-wrap">
                <img class="spinning-logo" src="https://res.cloudinary.com/a2mmcttn/image/upload/v1791451674/DICT_Synergy_Logo.png" alt="Loading" />
              </div>
            </body>
          </html>
        `);
        gatewayTab.document.close();
      }
      gatewayWindowRef.current = gatewayTab;
    } catch (_) {}

    await executeIdCardCheckout(null, gatewayTab);
  };

  const handlePayment = () => {
    if (isVerifyingPayment && paymentStatusOutcome === 'PENDING') {
      showNotification('A payment transaction is already pending verification.', 'error');
      return;
    }
    // If selected formLevel is ahead of student's active level, reset to active level
    const prog = calculateAcademicProgression(student, getActiveAcademicSession());
    const maxAllowedLvl = (prog?.numericLevel || 1) * 100;
    const curFormLvlNum = parseInt(String(formLevel || '').replace(/\D/g, ''), 10);
    if (!isNaN(curFormLvlNum) && curFormLvlNum > maxAllowedLvl) {
      const fallbackOb = levelObligations.find(o => o.isCurrent) || levelObligations[0];
      if (fallbackOb) {
        setFormLevel(fallbackOb.level);
        setFormSession(fallbackOb.session);
        formLevelRef.current = fallbackOb.level;
        formSessionRef.current = fallbackOb.session;
      }
    }
    setIsNewPaymentModalOpen(true);
  };

  const executeIdCardCheckout = async (actionToken = null, existingGatewayTab = null, targetLevel = null, targetSession = null) => {
    setIsPaying(true);
    const activeLevel = targetLevel || formLevel;
    const activeSession = targetSession || formSession;

    // Progressive level check: students cannot pay for future academic levels
    const prog = calculateAcademicProgression(student, getActiveAcademicSession());
    const maxAllowedLvl = (prog?.numericLevel || 1) * 100;
    const reqLvlNum = parseInt(String(activeLevel || '').replace(/\D/g, ''), 10);
    if (!isNaN(reqLvlNum) && reqLvlNum > maxAllowedLvl) {
      if (existingGatewayTab && !existingGatewayTab.closed) {
        existingGatewayTab.close();
      }
      setIsPaying(false);
      showNotification(`Payment not allowed: You cannot pay for future academic level (${reqLvlNum} Level). Your active level is ${prog?.levelString || '100 Level'}.`, 'error');
      return;
    }

    try {
      if (!application) {
        setIsApplying(true);
        const res = await createIdCardApplication(student);
        setIsApplying(false);
        if (res?.application) {
          setApplication(res.application);
        }
      }

      const resp = await fetch('/api/payments/id-card/create-checkout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': actionToken ? `Bearer ${actionToken}` : ''
        },
        body: JSON.stringify({
          student,
          academicSession: activeSession,
          level: activeLevel,
          returnBaseUrl: window.location.origin,
          stepUpToken: actionToken
        })
      });

      const data = await resp.json();

      if (data.alreadyPaid) {
        if (existingGatewayTab && !existingGatewayTab.closed) {
          try {
            existingGatewayTab.document.body.innerHTML = `
              <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;background:#f8fafc;padding:24px;text-align:center;">
                <img src="https://res.cloudinary.com/a2mmcttn/image/upload/v1791451674/DICT_Synergy_Logo.png" alt="NACOS" style="width:80px;height:80px;object-fit:contain;margin-bottom:16px;" />
                <h2 style="font-size:18px;font-weight:700;color:#0e8040;margin-bottom:8px;">Payment Already Confirmed</h2>
                <p style="font-size:13px;color:#64748b;max-width:400px;margin-bottom:20px;line-height:1.5;">This obligation is already cleared. You can view and print your receipt in the portal.</p>
                <button onclick="window.close()" style="background:#0e8040;color:white;border:none;padding:10px 24px;border-radius:8px;font-weight:600;font-size:13px;cursor:pointer;">Close Window</button>
              </div>
            `;
          } catch (_) { existingGatewayTab.close(); }
        }
        setIsPaying(false);
        showNotification('Payment already completed and confirmed!');
        await loadStudentAndApplication(formLevelRef.current);
        return;
      }

      if (data.error) {
        if (existingGatewayTab && !existingGatewayTab.closed) {
          try {
            existingGatewayTab.document.body.innerHTML = `
              <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;background:#f8fafc;padding:24px;text-align:center;">
                <img src="https://res.cloudinary.com/a2mmcttn/image/upload/v1791451674/DICT_Synergy_Logo.png" alt="NACOS" style="width:80px;height:80px;object-fit:contain;margin-bottom:16px;" />
                <h2 style="font-size:18px;font-weight:700;color:#dc2626;margin-bottom:8px;">Payment Gateway Notice</h2>
                <p style="font-size:13px;color:#64748b;max-width:400px;margin-bottom:20px;line-height:1.5;">${data.error}</p>
                <button onclick="window.close()" style="background:#0e8040;color:white;border:none;padding:10px 24px;border-radius:8px;font-weight:600;font-size:13px;cursor:pointer;">Return to Portal</button>
              </div>
            `;
          } catch (_) { existingGatewayTab.close(); }
        }
        setIsPaying(false);
        showNotification(data.error, 'error');
        return;
      }

      if (data.checkoutUrl) {
        // Broadcast to localStorage for seamless cross-window / redirect sync
        try {
          localStorage.setItem('nacos_active_gateway_redirect', JSON.stringify({
            checkoutUrl: data.checkoutUrl,
            timestamp: Date.now()
          }));
        } catch (_) {}

        // 1. Direct the new window to the payment gateway
        let gatewayTab = existingGatewayTab;
        if (gatewayTab && !gatewayTab.closed) {
          try {
            gatewayTab.location.replace(data.checkoutUrl);
          } catch (_) {
            try { gatewayTab.location.href = data.checkoutUrl; } catch (_) {}
          }
        } else {
          try {
            gatewayTab = window.open(data.checkoutUrl, '_blank');
          } catch (_) {}
        }
        gatewayWindowRef.current = gatewayTab;

        // 2. Persist active transaction in state & localStorage
        const txObj = {
          reference: data.reference,
          checkoutId: data.providerCheckoutId || '',
          checkoutUrl: data.checkoutUrl,
          amount: Number(data.amount || settingsRef.current?.id_card_fee || 0),
          level: activeLevel,
          session: activeSession,
          initiatedAt: new Date().toISOString()
        };

        try {
          localStorage.setItem('nacos_pending_id_card_tx', JSON.stringify(txObj));
        } catch (_) {}

        setPaymentTransaction(txObj);
        setIsVerifyingPayment(true);
        setPaymentStatusOutcome('PENDING');
        setIsPaymentDelayed(false);
        setGatewayTabClosed(false);
        setVerifyingReference(data.providerCheckoutId || data.reference || '');
        setIsPaying(false);
        setIsNewPaymentModalOpen(false);

        // 3. Monitor payment gateway tab closure
        if (tabWatchIntervalRef.current) clearInterval(tabWatchIntervalRef.current);
        tabWatchIntervalRef.current = setInterval(() => {
          if (gatewayWindowRef.current && gatewayWindowRef.current.closed) {
            clearInterval(tabWatchIntervalRef.current);
            tabWatchIntervalRef.current = null;
            setGatewayTabClosed(true);
            checkPaymentStatusAuthoritative(txObj.reference, txObj.checkoutId, txObj.level, true);
          }
        }, 1200);

        // 4. Start backend polling
        startPaymentVerificationPolling(data.reference, data.providerCheckoutId, activeLevel);
        showNotification('Payment gateway opened in a new window. Complete payment there to proceed.');
        return;
      } else {
        if (existingGatewayTab && !existingGatewayTab.closed) {
          try {
            existingGatewayTab.document.body.innerHTML = `
              <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;background:#f8fafc;padding:24px;text-align:center;">
                <img src="https://res.cloudinary.com/a2mmcttn/image/upload/v1791451674/DICT_Synergy_Logo.png" alt="NACOS" style="width:80px;height:80px;object-fit:contain;margin-bottom:16px;" />
                <h2 style="font-size:18px;font-weight:700;color:#dc2626;margin-bottom:8px;">Checkout Session Unavailable</h2>
                <p style="font-size:13px;color:#64748b;max-width:400px;margin-bottom:20px;line-height:1.5;">Could not initialize checkout session with the payment gateway. Please try again.</p>
                <button onclick="window.close()" style="background:#0e8040;color:white;border:none;padding:10px 24px;border-radius:8px;font-weight:600;font-size:13px;cursor:pointer;">Return to Portal</button>
              </div>
            `;
          } catch (_) { existingGatewayTab.close(); }
        }
        setIsPaying(false);
        showNotification('Could not obtain checkout session. Please try again.', 'error');
      }
    } catch (e) {
      if (existingGatewayTab && !existingGatewayTab.closed) {
        try {
          existingGatewayTab.document.body.innerHTML = `
            <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;background:#f8fafc;padding:24px;text-align:center;">
              <img src="https://res.cloudinary.com/a2mmcttn/image/upload/v1791451674/DICT_Synergy_Logo.png" alt="NACOS" style="width:80px;height:80px;object-fit:contain;margin-bottom:16px;" />
              <h2 style="font-size:18px;font-weight:700;color:#dc2626;margin-bottom:8px;">Payment Service Notice</h2>
              <p style="font-size:13px;color:#64748b;max-width:400px;margin-bottom:20px;line-height:1.5;">${e?.message || 'Payment gateway connection is currently unavailable.'}</p>
              <button onclick="window.close()" style="background:#0e8040;color:white;border:none;padding:10px 24px;border-radius:8px;font-weight:600;font-size:13px;cursor:pointer;">Return to Portal</button>
            </div>
          `;
        } catch (_) { existingGatewayTab.close(); }
      }
      setIsPaying(false);
      showNotification('Payment service unreachable. Please try again.', 'error');
    }
  };

  const handleOpenReceipt = (row) => {
    const payload = {
      receiptNo: row.receiptNo,
      transactionId: row.transactionId,
      date: row.date,
      time: row.time,
      studentName: student?.full_name || student?.name || 'Student Member',
      matricNo: student?.matric || student?.registration_number || '',
      department: student?.department || 'Computer Science',
      level: row.level,
      session: row.session,
      amount: row.amount,
      rawAmount: row.amount,
      paymentType: 'Student ID Card Issuance',
      paymentMethod: row.paymentMethod,
      status: 'APPROVED',
      isInvoice: false
    };
    navigate(`/receipt?reference=${encodeURIComponent(row.receiptNo || row.id)}&type=id_card`, {
      state: { receiptData: payload }
    });
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

  const handleDownloadZip = async () => {
    if (!student || !canvasRef.current) return;
    try {
      showNotification('Packaging ID card front & back into ZIP bundle...', 'info');
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      const rawName = (student.name || student.full_name || 'Student').replace(/[^a-zA-Z0-9]/g, '-');
      const rawId = (application?.id_card_number || student?.matric || student?.registration_number || 'NACOS-ID').replace(/[^a-zA-Z0-9]/g, '-');

      // 1. Front Side PNG from canvas
      const frontDataUrl = canvasRef.current.toDataURL('image/png');
      const frontBase64 = frontDataUrl.replace(/^data:image\/(png|jpeg);base64,/, '');
      zip.file(`${rawName}_${rawId}_Front.png`, frontBase64, { base64: true });

      // 2. Back Side Image
      const backUrl = application?.id_card_back_url || ID_CARD_TEMPLATE.masterBackUrl || idTemplateBack;
      if (backUrl) {
        try {
          const resp = await fetch(backUrl);
          if (resp.ok) {
            const blob = await resp.blob();
            zip.file(`${rawName}_${rawId}_Back.jpg`, blob);
          } else {
            throw new Error('Direct fetch failed');
          }
        } catch (fetchErr) {
          await new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = canvasRef.current.width || 662;
              tempCanvas.height = canvasRef.current.height || 1075;
              const ctx = tempCanvas.getContext('2d');
              ctx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
              const backBase64 = tempCanvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
              zip.file(`${rawName}_${rawId}_Back.png`, backBase64, { base64: true });
              resolve();
            };
            img.onerror = () => resolve();
            img.src = backUrl;
          });
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `NACOS_ID_Card_${rawId}_Bundle.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showNotification('ID Card bundle (Front & Back) downloaded as ZIP successfully!');
    } catch (err) {
      console.error('ZIP bundle generation error:', err);
      showNotification('Could not generate ZIP bundle. Please use PNG or PDF download.', 'error');
    }
  };


  if (!student) {
    return (
      <PortalLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-3 p-8 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Student Session Required</h2>
            <p className="text-xs text-gray-500 dark:text-green-200/70 font-medium">Please sign in to your student portal account to access ID card clearance.</p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-[#0e8040] hover:bg-[#0b6a34] cursor-pointer"
            >
              Sign In to Portal
            </button>
          </div>
        </div>
      </PortalLayout>
    );
  }

  // Dynamic Progression & Obligation Generation from shared academic engine
  let studentProgression = { numericLevel: 1, levelString: '100 Level' };
  try {
    studentProgression = calculateAcademicProgression(student, getActiveAcademicSession()) || studentProgression;
  } catch (err) {
    console.warn('Progression calculation fallback in IdCard:', err);
  }
  const currentAcademicSession = getActiveAcademicSession();
  const studentLevel = studentProgression.levelString || '100 Level';
  const activeLevelNum = (studentProgression.numericLevel || 1) * 100;

  // Base applicable obligations for levels the student has reached (100L up to current active level)
  let baseObligations = [];
  try {
    baseObligations = getStudentApplicableLevelSessions(student, getActiveAcademicYearStart()) || [];
  } catch (err) {
    console.warn('Applicable obligations calculation fallback:', err);
    baseObligations = [
      { levelNumber: 1, numericLevel: 100, levelCode: '100', level: '100 Level', session: currentAcademicSession, isCurrent: true }
    ];
  }

  // Filter to strictly guarantee NO future-level obligations exist as unpaid options
  const applicableObligations = baseObligations.filter(ob => {
    const obNum = parseInt(String(ob.level).replace(/[^0-9]/g, ''), 10);
    return isNaN(obNum) || obNum <= activeLevelNum;
  });

  // Preserve any historical paid records that might exist for other levels (e.g. if admin moved session backwards)
  const paidHistoricalPayments = idCardPayments.filter(p => {
    if (!p.isPaid) return false;
    const pLvlNum = parseInt(String(p.level || '').replace(/[^0-9]/g, ''), 10);
    return pLvlNum && !applicableObligations.some(ob => parseInt(String(ob.level).replace(/[^0-9]/g, ''), 10) === pLvlNum);
  });

  const historicalPaidObligations = paidHistoricalPayments.map(p => {
    const lvlNum = parseInt(String(p.level).replace(/[^0-9]/g, ''), 10) || 100;
    const lvlStr = `${lvlNum} Level`;
    return {
      levelNumber: Math.floor(lvlNum / 100),
      numericLevel: lvlNum,
      levelCode: `${lvlNum}`,
      level: lvlStr,
      levelString: lvlStr,
      session: p.session || currentAcademicSession,
      academicSession: p.session || currentAcademicSession,
      isCurrent: false,
      isHistoricalPaid: true
    };
  });

  const mergedObligations = [...applicableObligations, ...historicalPaidObligations].sort((a, b) => {
    const lA = parseInt(String(a.level).replace(/[^0-9]/g, ''), 10) || 0;
    const lB = parseInt(String(b.level).replace(/[^0-9]/g, ''), 10) || 0;
    return lA - lB;
  });

  // Map each applicable obligation to its payment status from database
  const levelObligations = mergedObligations.map(ob => {
    const obLvlNum = String(ob.level).replace(/[^0-9]/g, '');
    const obSess = String(ob.session).trim();

    // Match payment: prioritize exact level AND session, then exact level, then exact session
    const matches = idCardPayments.filter(p => {
      const pLvlNum = String(p.level || '').replace(/[^0-9]/g, '');
      const pSess = String(p.session || '').trim();
      const levelMatches = Boolean(pLvlNum && obLvlNum && pLvlNum === obLvlNum);
      const sessionMatches = Boolean(pSess && obSess && pSess === obSess);
      return (levelMatches && sessionMatches) || (levelMatches && !pSess) || (sessionMatches && !pLvlNum) || (levelMatches || sessionMatches);
    });

    const matchingPayment = matches.find(m => m.isPaid) || matches[0] || null;

    const isObligationPaid = Boolean(matchingPayment?.isPaid);
    const status = isObligationPaid ? 'PAID' : 'UNPAID';
    const liveFee = settings?.id_card_fee != null && !isNaN(Number(settings.id_card_fee)) && Number(settings.id_card_fee) > 0 ? Number(settings.id_card_fee) : null;
    const resolvedAmount = isObligationPaid ? (matchingPayment?.amount ? Number(matchingPayment.amount) : liveFee) : liveFee;

    return {
      ...ob,
      amount: resolvedAmount,
      status,
      isPaid: isObligationPaid,
      payment: matchingPayment || null,
      receiptNo: matchingPayment?.receiptNo || null,
      transactionId: matchingPayment?.transactionId || null,
      date: matchingPayment?.date || null
    };
  });

  const currentLevelObligation = levelObligations.find(o => o.isCurrent) || levelObligations[levelObligations.length - 1];
  const hasAnyPaidLevel = levelObligations.some(o => o.isPaid);

  const selectedObligation = levelObligations.find(o => {
    const l1 = String(o.level || '').replace(/\D/g, '');
    const l2 = String(formLevel || '').replace(/\D/g, '');
    return l1 && l2 && l1 === l2;
  }) || levelObligations.find(o => String(o.session).trim() === String(formSession).trim()) || currentLevelObligation || levelObligations[0] || {
    level: formLevel || studentLevel || '100 Level',
    session: formSession || currentAcademicSession || '2026/2027',
    amount: (settings?.id_card_fee != null ? Number(settings.id_card_fee) : null),
    status: 'UNPAID',
    isPaid: false
  };

  const handleSelectObligation = async (ob) => {
    formLevelRef.current = ob.level;
    formSessionRef.current = ob.session;
    setFormLevel(ob.level);
    setFormSession(ob.session);
    await loadStudentAndApplication(ob.level);
  };

  const handlePayObligation = (ob) => {
    const obLvlNum = parseInt(String(ob?.level || '').replace(/\D/g, ''), 10);
    if (!isNaN(obLvlNum) && obLvlNum > activeLevelNum) {
      showNotification(`Payment not allowed: You cannot pay for future academic level (${obLvlNum} Level). Your active level is ${studentLevel}.`, 'error');
      return;
    }

    formLevelRef.current = ob.level;
    formSessionRef.current = ob.session;
    setFormLevel(ob.level);
    setFormSession(ob.session);

    let gatewayTab = null;
    try {
      gatewayTab = window.open('about:blank', '_blank');
      if (gatewayTab && gatewayTab.document) {
        gatewayTab.document.open();
        gatewayTab.document.write(`
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
              <title>Connecting to Payment Gateway | NACOS FUTO</title>
              <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                html, body {
                  width: 100%;
                  height: 100%;
                  min-height: 100dvh;
                  background-color: #f8fafc;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  overflow: hidden;
                }
                .spinner-wrap {
                  width: 100%;
                  height: 100%;
                  min-height: 100dvh;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  padding: 16px;
                }
                .spinning-logo {
                  width: clamp(140px, 42vw, 220px);
                  height: clamp(140px, 42vw, 220px);
                  max-width: 80vw;
                  max-height: 80vh;
                  object-fit: contain;
                  animation: spin 3s linear infinite;
                }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
              </style>
            </head>
            <body>
              <div class="spinner-wrap">
                <img class="spinning-logo" src="https://res.cloudinary.com/a2mmcttn/image/upload/v1791451674/DICT_Synergy_Logo.png" alt="Loading" />
              </div>
            </body>
          </html>
        `);
        gatewayTab.document.close();
      }
      gatewayWindowRef.current = gatewayTab;
    } catch (_) {}

    executeIdCardCheckout(null, gatewayTab, ob.level, ob.session);
  };

  const isSelectedLevelPaid = Boolean(selectedObligation?.isPaid);
  const isPaid = isSelectedLevelPaid;

  const cardLevelRaw = String(application?.level || selectedObligation?.level || '');
  const cardLevelNum = cardLevelRaw.match(/\d{3}/)?.[1] || (cardLevelRaw ? studentProgression.numericLevel * 100 : null);
  const cardLevel = cardLevelNum ? `${cardLevelNum} Level` : null;

  const appStatus = application?.status;

  const isState1 = !isVerifyingPayment && !application && !isSelectedLevelPaid;
  const isStateExpired = !isVerifyingPayment && Boolean(application) && !isSelectedLevelPaid && hasAnyPaidLevel && appStatus !== 'rejected' && appStatus !== 'revoked';
  const isState2 = !isVerifyingPayment && !isStateExpired && !isSelectedLevelPaid && Boolean(application) && (appStatus === 'pending_payment' || appStatus === 'draft' || (!isPaid && appStatus !== 'rejected' && appStatus !== 'revoked'));
  const isState3 = isSelectedLevelPaid && (appStatus === 'photo_required' || (!application?.passport_url && !student?.profile_photo_url));
  const isState4 = isSelectedLevelPaid && !isState3 && (application?.passport_url || student?.profile_photo_url) && appStatus === 'ready_to_submit';
  const isState5 = isSelectedLevelPaid && !isState3 && (appStatus === 'submitted' || appStatus === 'processing');
  const isState6 = isSelectedLevelPaid && !isState3 && appStatus === 'approved';
  const isState7 = isSelectedLevelPaid && (appStatus === 'generated' || (!['photo_required', 'ready_to_submit', 'submitted', 'processing', 'rejected', 'revoked'].includes(appStatus) && Boolean(application?.passport_url || student?.profile_photo_url)));
  const isState8 = Boolean(application) && appStatus === 'rejected';
  const isState9 = Boolean(application) && appStatus === 'revoked';

  // Redraw canvas whenever student requests card view and application reaches 'generated' state
  useEffect(() => {
    if (isCardViewRequested && canvasRef.current && student) {
      const photoUrl = application?.passport_url || student.profile_photo_url || student.avatar_url;
      const cardLevel = selectedObligation?.level || application?.level || student?.level || '100 Level';
      const cardSession = selectedObligation?.session || application?.academic_session || settings?.academic_session || '2026/2027';
      const cardKey = `${student?.matric || student?.registration_number || 'NACOS'}-${cardLevel}-${cardSession}-${photoUrl || 'no_photo'}-${application?.status || 'gen'}`;

      if (lastDrawnCardKeyRef.current === cardKey && canvasRef.current.width > 0) {
        return;
      }

      const cardInfo = {
        ...application,
        level: cardLevel,
        academic_session: cardSession
      };

      const render = (img) => {
        drawIdCardOnCanvas(canvasRef.current, student, img, cardInfo, {
          templateImgUrl: masterTemplateAsset,
          frameImgUrl: frameAsset
        }).then(() => {
          lastDrawnCardKeyRef.current = cardKey;
          if (!application?.id_card_image_url && canvasRef.current && application?.id) {
            try {
              const dataUrl = canvasRef.current.toDataURL('image/png');
              if (dataUrl) {
                saveGeneratedIdCardAsset(application.id, dataUrl);
                setApplication(prev => {
                  if (prev?.id_card_image_url === dataUrl) return prev;
                  return { ...prev, id_card_image_url: dataUrl };
                });
              }
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
  }, [isCardViewRequested, application?.status, isState7, student?.matric, student?.profile_photo_url, selectedObligation?.level, selectedObligation?.session]);

  // Format card expiration date (1-year validity from generation or current session)
  const expiryDateFormatted = (() => {
    try {
      const baseDate = application?.generated_at ? new Date(application.generated_at) : new Date();
      if (isNaN(baseDate.getTime())) return '1 Year from Issuance';
      const expDate = new Date(baseDate);
      expDate.setFullYear(expDate.getFullYear() + 1);
      return expDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
      return '1 Year from Issuance';
    }
  })();

  return (
    <PortalLayout>
      <div className="space-y-6">

        {/* Top Header */}
        <div className="print:hidden">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Student ID Card Application &amp; Issuance
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-green-200/80 font-normal mt-0.5">
            Official clearance history and electronic POS receipts for Department of Computer Science.
          </p>
        </div>

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

        {/* ==================================================================== */}
        {/* LEVEL-BY-LEVEL ID CARD OBLIGATIONS & RENEWAL RECORDS TABLE             */}
        {/* ==================================================================== */}
        <div className="bg-white dark:bg-[#083002] rounded-xl border border-gray-200/80 dark:border-[#138601]/30 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-gray-200/70 dark:border-[#138601]/20 bg-gray-50/50 dark:bg-[#041801]/60 text-gray-500 dark:text-green-200/70 font-semibold text-[11px] sm:text-xs">
                  <th className="py-3.5 px-5">Level</th>
                  <th className="py-3.5 px-4">Session</th>
                  <th className="py-3.5 px-4">Amount ₦</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#138601]/15 text-gray-800 dark:text-gray-100">
                {levelObligations.length > 0 ? (
                  levelObligations.map((ob, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/60 dark:hover:bg-[#041801]/40 transition-colors">
                      <td className="py-4 px-5 font-bold text-gray-900 dark:text-white text-xs">
                        <div className="flex items-center gap-2">
                          <span>{ob.level}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-mono text-gray-600 dark:text-gray-300">
                        {ob.session}
                      </td>
                      <td className="py-4 px-4 font-semibold text-gray-900 dark:text-white">
                        {ob.amount != null && !isNaN(Number(ob.amount)) && Number(ob.amount) > 0 ? `₦${Number(ob.amount).toLocaleString('en-NG')}` : (settings?.id_card_fee != null && Number(settings.id_card_fee) > 0 ? `₦${Number(settings.id_card_fee).toLocaleString('en-NG')}` : '—')}
                      </td>
                      <td className="py-4 px-4">
                        {ob.isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#0e8040] dark:bg-emerald-950/60 dark:text-[#4bd043]">
                            <CheckCircle className="w-3 h-3" />
                            PAID
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 dark:bg-[#041801] dark:text-gray-300">
                            <Clock className="w-3 h-3" />
                            UNPAID
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-right space-y-1.5 sm:space-y-0 sm:space-x-2">
                        {ob.isPaid ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleViewIdCard(ob)}
                              disabled={isVerifyingCardAccess}
                              title={String(ob.level).replace(/\D/g, '') === String(studentLevel).replace(/\D/g, '') ? 'View ID Card' : `ID Card access is restricted to active level (${studentLevel})`}
                              className="inline-block px-3 py-1.5 rounded-md text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-[#041801] hover:bg-gray-200 dark:hover:bg-[#062402] border border-gray-200/80 dark:border-[#138601]/30 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {isVerifyingCardAccess ? 'Verifying...' : 'View ID Card'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenReceipt(ob.payment || {
                                receiptNo: ob.receiptNo,
                                transactionId: ob.transactionId,
                                amount: ob.amount,
                                level: ob.level,
                                session: ob.session,
                                date: ob.date
                              })}
                              className="inline-block px-3 py-1.5 rounded-md text-xs font-semibold text-[#0e8040] hover:text-[#0b6a34] bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/40 transition-colors cursor-pointer"
                            >
                              Print Receipt
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handlePayObligation(ob)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-[#0e8040] hover:bg-[#0b6a34] shadow-xs transition-colors cursor-pointer active:scale-95"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Pay Now</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-10 px-5 text-center space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#041801] text-gray-400 dark:text-green-200/50 flex items-center justify-center mx-auto">
                        <FileText className="w-5 h-5" />
                      </div>
                      <p className="font-semibold text-gray-800 dark:text-gray-200 text-xs sm:text-sm">
                        No ID Card Obligations Found
                      </p>
                      <p className="text-xs text-gray-500 dark:text-green-200/60 max-w-sm mx-auto">
                        Click "New Payment" to initialize student ID card payment.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* PAYMENT VERIFICATION & GATEWAY WAITING STATE INTERFACE                */}
        {/* ==================================================================== */}
        {isVerifyingPayment && (
          <div className="p-6 sm:p-10 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200/80 dark:border-[#138601]/30 text-center space-y-6 shadow-xs animate-in fade-in duration-200">
            {paymentStatusOutcome === 'PENDING' && (
              <>
                {/* Animated Loading Spinner */}
                <div className="flex items-center justify-center mx-auto py-2">
                  <img
                    src="https://res.cloudinary.com/a2mmcttn/image/upload/v1791451674/DICT_Synergy_Logo.png"
                    alt="Loading"
                    className="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 object-contain animate-spin select-none pointer-events-none"
                    style={{ animationDuration: '3s' }}
                  />
                </div>

                <div className="max-w-xl mx-auto space-y-2.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    <Clock className="w-3.5 h-3.5" /> Processing / Pending Gateway Confirmation
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                    Waiting for Payment Confirmation
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-green-100/90 leading-relaxed">
                    Your payment process has started. We are waiting for confirmation from the payment gateway. Please complete your payment in the other tab. This page will automatically update once your transaction status is verified.
                  </p>
                  <p className="text-[11px] sm:text-xs text-amber-700 dark:text-amber-300/90 font-medium">
                    Please do not close or refresh this page while your payment is being verified.
                  </p>

                  {isPaymentDelayed && (
                    <div className="p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 text-left">
                      <strong>Notice:</strong> Payment confirmation is taking longer than expected. We are still checking your transaction with the payment gateway. If you completed payment, click "I've completed payment (Check Now)" below.
                    </div>
                  )}

                  {gatewayTabClosed && !isPaymentDelayed && (
                    <div className="p-3.5 rounded-xl bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300 text-left flex items-start gap-2">
                      <Info className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>Payment gateway tab was closed. Still checking and verifying transaction with the server in the background...</span>
                    </div>
                  )}
                </div>

                {/* Transaction Details Card */}
                <div className="p-5 rounded-xl max-w-md mx-auto bg-gray-50/70 dark:bg-[#041801] border border-gray-200/60 dark:border-[#138601]/20 text-xs text-left space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-green-200/60">Transaction Reference:</span>
                    <span className="font-mono font-bold text-gray-900 dark:text-white break-all">
                      {paymentTransaction?.reference || verifyingReference || 'PENDING'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-green-200/60">Obligation:</span>
                    <span className="font-bold text-[#0e8040] dark:text-[#4bd043]">
                      {paymentTransaction?.level || formLevel} Level ({paymentTransaction?.session || formSession})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-green-200/60">Amount:</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {paymentTransaction?.amount || settings?.id_card_fee ? `₦${Number(paymentTransaction?.amount || settings?.id_card_fee).toLocaleString()}.00` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-green-200/60">Status:</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Awaiting Gateway Confirmation
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleManualCheckStatus}
                    disabled={isPaying}
                    className="w-full sm:w-auto px-6 py-3 min-h-[44px] text-xs sm:text-sm font-semibold text-white bg-[#0e8040] hover:bg-[#0b6a34] rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60"
                  >
                    {isPaying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    <span>{isPaying ? 'Checking...' : "I've completed payment (Check Now)"}</span>
                  </button>

                  {paymentTransaction?.checkoutUrl && (
                    <a
                      href={paymentTransaction.checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto px-5 py-3 min-h-[44px] text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] border border-transparent rounded-xl transition-all cursor-pointer inline-flex items-center justify-center gap-2 shadow-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Payment Gateway (New Window)</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={handleCancelVerification}
                    disabled={isPaying}
                    className="w-full sm:w-auto px-4 py-3 min-h-[44px] text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel / Return to payment options
                  </button>
                </div>
              </>
            )}

            {paymentStatusOutcome === 'SUCCESS' && (
              <>
                {/* Success State */}
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle className="w-8 h-8" />
                </div>

                <div className="max-w-md mx-auto space-y-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-[#0e8040] dark:bg-emerald-950/60 dark:text-[#4bd043]">
                    <CheckCircle className="w-3.5 h-3.5" /> Verified &amp; Cleared
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    Payment Successful
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-green-100/90 leading-relaxed">
                    Your payment of <strong className="text-[#0e8040] dark:text-[#4bd043]">{paymentTransaction?.amount || settings?.id_card_fee ? `₦${Number(paymentTransaction?.amount || settings?.id_card_fee).toLocaleString()}.00` : '—'}</strong> for <strong className="text-gray-900 dark:text-white">{paymentTransaction?.level || formLevel} Level ({paymentTransaction?.session || formSession})</strong> has been confirmed. Your official student ID card is ready!
                  </p>
                </div>

                <div className="p-4 rounded-xl max-w-md mx-auto bg-gray-50/70 dark:bg-[#041801] border border-gray-200/60 dark:border-[#138601]/20 text-xs text-left space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-green-200/60">Reference:</span>
                    <span className="font-mono font-bold text-gray-900 dark:text-white break-all">
                      {paymentTransaction?.reference || verifyingReference}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-green-200/60">Amount Paid:</span>
                    <span className="font-bold text-[#0e8040] dark:text-[#4bd043]">
                      {paymentTransaction?.amount || settings?.id_card_fee ? `₦${Number(paymentTransaction?.amount || settings?.id_card_fee).toLocaleString()}.00` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-green-200/60">Status:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">CLEARED &amp; APPROVED</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleViewIdCard(selectedObligation || currentLevelObligation)}
                    className="w-full sm:w-auto px-6 py-3 min-h-[44px] text-xs sm:text-sm font-semibold text-white bg-[#0e8040] hover:bg-[#0b6a34] rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>View &amp; Download ID Card</span>
                  </button>
                </div>
              </>
            )}

            {(paymentStatusOutcome === 'FAILED' || paymentStatusOutcome === 'CANCELLED') && (
              <>
                {/* Failure or Cancelled State */}
                <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto border border-red-200 dark:border-red-800">
                  <AlertCircle className="w-8 h-8" />
                </div>

                <div className="max-w-md mx-auto space-y-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                    <AlertCircle className="w-3.5 h-3.5" /> {paymentStatusOutcome === 'CANCELLED' ? 'Transaction Cancelled' : 'Payment Failed'}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    Payment Not Completed
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-green-100/90 leading-relaxed">
                    Your payment was not completed. No successful payment has been confirmed for this transaction. You can try again when you are ready.
                  </p>
                  {paymentStatusMessage && (
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                      {paymentStatusMessage}
                    </p>
                  )}
                </div>

                <div className="p-4 rounded-xl max-w-md mx-auto bg-gray-50/70 dark:bg-[#041801] border border-gray-200/60 dark:border-[#138601]/20 text-xs text-left space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-green-200/60">Reference:</span>
                    <span className="font-mono font-bold text-gray-900 dark:text-white break-all">
                      {paymentTransaction?.reference || verifyingReference || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-green-200/60">Obligation:</span>
                    <span className="font-medium text-gray-700 dark:text-gray-200">
                      {paymentTransaction?.level || formLevel} Level ({paymentTransaction?.session || formSession})
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleRetryPayment}
                    className="w-full sm:w-auto px-6 py-3 min-h-[44px] text-xs sm:text-sm font-semibold text-white bg-[#0e8040] hover:bg-[#0b6a34] rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Retry Payment</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsVerifyingPayment(false);
                      setPaymentStatusOutcome('PENDING');
                      try { localStorage.removeItem('nacos_pending_id_card_tx'); } catch (_) {}
                    }}
                    className="w-full sm:w-auto px-4 py-3 min-h-[44px] text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#041801] rounded-xl transition-colors cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </>
            )}
          </div>
        )}

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
                Academic Level Renewal ({studentLevel})
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-green-100/80 leading-relaxed">
                NACOS Student Identity Cards are validated level by level. Select an applicable past or current level below to review payment status or settle renewal.
              </p>
            </div>

            {/* Obligation Level Switcher */}
            <div className="max-w-md mx-auto space-y-2 text-left">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Select Level Obligation to Review &amp; Settle:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {levelObligations.map(ob => {
                  const isSelected = selectedObligation?.level === ob.level;
                  return (
                    <button
                      key={ob.level}
                      type="button"
                      onClick={() => handleSelectObligation(ob)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#0e8040] bg-emerald-50/70 dark:bg-[#0e8040]/25 ring-1 ring-[#0e8040]'
                          : 'border-gray-200 dark:border-[#138601]/25 hover:border-gray-300 dark:hover:border-[#138601]/50 bg-white dark:bg-[#041801]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-gray-900 dark:text-white">{ob.level}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          ob.isPaid ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-[#4bd043]' :
                          ob.isPending ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                          ob.isFailed ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300' :
                          'bg-gray-100 text-gray-700 dark:bg-[#041801] dark:text-gray-300'
                        }`}>
                          {ob.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-green-200/60 font-mono mt-0.5">{ob.session}</div>
                      <div className="text-[11px] font-semibold text-[#0e8040] dark:text-[#4bd043] mt-0.5">
                        {ob.amount || settings?.id_card_fee ? `₦${Number(ob.amount || settings?.id_card_fee).toLocaleString()}` : '—'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-5 rounded-xl max-w-md mx-auto bg-gray-50/70 dark:bg-[#041801] border border-gray-200/60 dark:border-[#138601]/20 text-xs text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Student Reg No:</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">{student?.matric || student?.registration_number || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Selected Level:</span>
                <span className="font-bold text-[#138601] dark:text-[#4bd043]">{selectedObligation?.level} ({selectedObligation?.session})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span className={`font-bold ${
                  selectedObligation?.isPaid ? 'text-emerald-600 dark:text-emerald-400' :
                  selectedObligation?.isPending ? 'text-amber-600 dark:text-amber-400' :
                  selectedObligation?.isFailed ? 'text-red-600 dark:text-red-400' :
                  'text-gray-600 dark:text-gray-300'
                }`}>{selectedObligation?.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Obligation Fee:</span>
                <span className="font-bold text-[#138601] dark:text-[#4bd043]">
                  {selectedObligation?.amount || settings?.id_card_fee ? `₦${Number(selectedObligation?.amount || settings?.id_card_fee).toLocaleString()}.00` : '—'}
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              {selectedObligation?.isPaid ? (
                <button
                  type="button"
                  onClick={() => handleOpenReceipt(selectedObligation?.payment || {
                    receiptNo: selectedObligation?.receiptNo,
                    transactionId: selectedObligation?.transactionId,
                    amount: selectedObligation?.amount,
                    level: selectedObligation?.level,
                    session: selectedObligation?.session,
                    date: selectedObligation?.date
                  })}
                  className="px-8 py-3.5 min-h-[44px] text-xs sm:text-sm font-semibold text-white bg-[#0e8040] hover:bg-[#0b6a34] rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>Print Receipt ({selectedObligation?.level || 'Card'})</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handlePayObligation(selectedObligation)}
                  disabled={isPaying}
                  className="px-8 py-3.5 min-h-[44px] text-xs sm:text-sm font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  {isPaying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  <span>Pay ID Card for {selectedObligation?.level} ({selectedObligation?.session})</span>
                </button>
              )}
            </div>
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
                  Current fee: <strong className="text-[#138601] dark:text-[#4bd043]">{settings?.id_card_fee ? `₦${Number(settings.id_card_fee).toLocaleString()}` : 'Configured via Admin'}</strong> for session {settings?.academic_session || 'Current'}.
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
            STATE 3: PAYMENT CONFIRMED / PHOTO REQUIRED
            ==================================================================== */}
        {isState3 && (
          <div className="p-8 sm:p-12 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200/80 dark:border-[#138601]/30 text-center space-y-6 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto border border-blue-200 dark:border-blue-800/40">
              <Camera className="w-8 h-8" />
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold">
                <CheckCircle className="w-3.5 h-3.5" /> Payment Verified ({application?.payment_reference || 'CLEARED'})
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
                publicId={`${CLOUDINARY_FOLDERS.STUDENTS}/${(student?.matric || student?.registration_number || 'student').replace(/[^a-zA-Z0-9]/g, '_')}_passport`}
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
                src={application?.passport_url || student?.profile_photo_url || ''}
                alt="Passport Photo"
                className="w-20 h-24 object-cover rounded-xl border-2 border-[#138601] shadow-xs"
              />
              <div className="space-y-1 text-xs">
                <div className="font-bold text-sm text-gray-900 dark:text-white">{student?.name || student?.full_name || 'Student'}</div>
                <div className="font-mono text-[#138601] dark:text-[#4bd043] font-semibold">{student?.matric || student?.registration_number || ''}</div>
                <div className="text-gray-500 dark:text-green-200/70">{student?.level || student?.current_level || '100 Level'} • {student?.programme || 'B.Tech Computer Science'}</div>
                <div className="text-[11px] text-gray-400 dark:text-green-200/50 pt-1">
                  App No: {application?.application_number || 'N/A'}
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
                <span className="font-mono font-bold text-gray-900 dark:text-white">{application?.application_number || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Status:</span>
                <span className="font-semibold text-green-600 dark:text-green-400">Paid</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Submitted On:</span>
                <span className="text-gray-700 dark:text-gray-300">
                  {application?.submitted_at ? new Date(application.submitted_at).toLocaleDateString() : 'Today'}
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
            Appears ONLY when student clicks "View ID Card" & passes verification
            ==================================================================== */}
        {isCardViewRequested && (
          <div className="space-y-6">

            {/* Visual Canvas Two-Sided ID Card Preview Container */}
            <div id="nacos-id-card-stage" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200/80 dark:border-[#138601]/30 shadow-xs space-y-5">
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
                    href={`/verify/id/${application?.id_card_number || student?.matric || 'NACOS'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-green-200 bg-gray-100 dark:bg-[#041801] hover:bg-gray-200 border border-gray-200/80 dark:border-[#138601]/30 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Verify</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setIsCardViewRequested(false)}
                    className="p-2 rounded-xl bg-gray-100 dark:bg-[#041801] hover:bg-gray-200 dark:hover:bg-[#138601]/20 text-gray-500 hover:text-gray-800 dark:text-green-200 border border-gray-200/80 dark:border-[#138601]/30 transition-colors cursor-pointer"
                    title="Close ID Card View"
                  >
                    <X className="w-4 h-4" />
                  </button>
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
                      src={application?.id_card_back_url || ID_CARD_TEMPLATE.masterBackUrl || idTemplateBack}
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
                  onClick={handleDownloadZip}
                  className="px-4 py-2.5 min-h-[40px] text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  title="Download Front & Back as ZIP Archive"
                >
                  <Download className="w-3.5 h-3.5 text-[#138601] dark:text-[#4bd043]" />
                  <span>Download Bundle (ZIP)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenReceipt(selectedObligation?.payment || {
                    receiptNo: selectedObligation?.receiptNo,
                    transactionId: selectedObligation?.transactionId,
                    amount: selectedObligation?.amount,
                    level: selectedObligation?.level,
                    session: selectedObligation?.session,
                    date: selectedObligation?.date
                  })}
                  className="px-5 py-2.5 min-h-[40px] text-xs font-semibold text-[#0e8040] hover:text-[#0b6a34] bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Receipt ({selectedObligation?.level || 'Card'})</span>
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
                <li>NACOS ID Number: <strong className="font-mono text-gray-900 dark:text-white">{application?.id_card_number || student?.matric || 'N/A'}</strong></li>
                <li>Valid for Session: <strong className="text-gray-900 dark:text-white">{settings?.academic_session || 'Current'}</strong></li>
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
                {application?.rejection_reason || 'Photograph did not meet passport criteria. Please upload a clear front-facing photo on a light background.'}
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
                This student identity card ({application?.id_card_number || 'N/A'}) has been officially revoked by the NACOS Directorate. It will no longer scan as valid on the verification registry.
              </p>
            </div>

            <div className="p-4 rounded-xl max-w-md mx-auto bg-gray-50/70 dark:bg-[#041801] border border-gray-200/60 dark:border-[#138601]/20 text-xs text-left">
              <span className="font-semibold text-gray-500">Reason for Revocation:</span>
              <p className="font-medium text-gray-900 dark:text-white mt-1">
                {application?.revocation_reason || 'Academic session expired or clearance revoked.'}
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handlePayment}
                disabled={isPaying}
                className="px-8 py-3.5 min-h-[44px] text-xs sm:text-sm font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pay &amp; Apply for New ID Card {settings?.id_card_fee ? `(₦${Number(settings.id_card_fee).toLocaleString()})` : ''}</span>
              </button>
              <button
                type="button"
                onClick={handleReapply}
                className="px-6 py-3.5 min-h-[44px] text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-[#083002] hover:bg-gray-200 dark:hover:bg-[#062402] border border-gray-200 dark:border-[#138601]/30 rounded-xl transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Application Details</span>
              </button>
            </div>
          </div>
        )}



      </div>

      {/* Select Session & Progressive Level Modal for ID Card Payment */}
      {isNewPaymentModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="relative max-w-2xl w-full bg-white dark:bg-[#083002] rounded-xl border border-gray-200 dark:border-[#138601]/40 shadow-2xl p-6 sm:p-8 space-y-6">
            
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-[#138601]/25">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                  Select Session &amp; Level
                </h3>
                <p className="text-xs text-gray-500 dark:text-green-200/70 mt-0.5">
                  Generate an official student ID card clearance invoice.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewPaymentModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              {/* 1. Obligation Selection (Level and Session paired together) */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Select Applicable Level &amp; Academic Session Obligation
                </label>
                <div className="relative">
                  <select
                    value={`${formLevel}|${formSession}`}
                    onChange={(e) => {
                      const [lvl, sess] = e.target.value.split('|');
                      setFormLevel(lvl);
                      setFormSession(sess);
                    }}
                    className="w-full appearance-none px-4 py-2.5 pr-10 text-xs sm:text-sm rounded-lg border border-[#0e8040] dark:border-[#138601] bg-white dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0e8040] cursor-pointer font-medium"
                  >
                    {levelObligations.map((ob) => (
                      <option key={`${ob.level}|${ob.session}`} value={`${ob.level}|${ob.session}`}>
                        {ob.level} ({ob.session}) — [{ob.status}] — {ob.amount || settings?.id_card_fee ? `₦${Number(ob.amount || settings?.id_card_fee).toLocaleString()}` : '—'}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 dark:text-green-300 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="text-[11px] text-gray-500 dark:text-green-200/60">
                  ID card clearance fees are settled level by level for each applicable academic session.
                </p>
              </div>

              {/* 2. Obligation Summary Details */}
              <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-[#041801] border border-gray-200/60 dark:border-[#138601]/25 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-green-200/60">Student Reg No:</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">{student?.matric || student?.registration_number || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-green-200/60">Target Academic Level:</span>
                  <span className="font-bold text-[#0e8040] dark:text-[#4bd043]">{selectedObligation?.level}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-green-200/60">Academic Session:</span>
                  <span className="font-mono text-gray-800 dark:text-gray-200">{selectedObligation?.session}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-green-200/60">Payment Status:</span>
                  <span className={`font-bold ${
                    selectedObligation?.isPaid ? 'text-emerald-600 dark:text-emerald-400' :
                    selectedObligation?.isPending ? 'text-amber-600 dark:text-amber-400' :
                    selectedObligation?.isFailed ? 'text-red-600 dark:text-red-400' :
                    'text-gray-600 dark:text-gray-300'
                  }`}>
                    {selectedObligation?.status}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200/60 dark:border-[#138601]/20 text-sm">
                  <span className="font-bold text-gray-800 dark:text-gray-200">Amount Payable:</span>
                  <span className="font-bold text-[#0e8040] dark:text-[#4bd043]">
                    {selectedObligation?.amount || settings?.id_card_fee ? `₦${Number(selectedObligation?.amount || settings?.id_card_fee).toLocaleString()}.00` : '—'}
                  </span>
                </div>
              </div>

              {/* Already Paid Banner & Receipt Option */}
              {selectedObligation?.isPaid && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200">
                  <div>
                    <strong className="block font-bold">Already Cleared &amp; Settled</strong>
                    <span className="text-[11px]">This obligation ({selectedObligation?.level} for {selectedObligation?.session}) is already verified in your student records.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewPaymentModalOpen(false);
                      handleOpenReceipt(selectedObligation?.payment || {
                        receiptNo: selectedObligation?.receiptNo,
                        transactionId: selectedObligation?.transactionId,
                        amount: selectedObligation?.amount,
                        level: selectedObligation?.level,
                        session: selectedObligation?.session,
                        date: selectedObligation?.date
                      });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#0e8040] text-white font-semibold text-xs hover:bg-[#0b6a34] transition-colors cursor-pointer shrink-0 ml-3"
                  >
                    Print Receipt
                  </button>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-[#138601]/25 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsNewPaymentModalOpen(false)}
                className="px-4 py-2.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#041801] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitNewPayment}
                disabled={isPaying || isApplying || selectedObligation?.isPaid || (isVerifyingPayment && paymentStatusOutcome === 'PENDING')}
                className="px-6 py-2.5 rounded-lg text-xs sm:text-sm font-semibold text-white bg-[#0e8040] hover:bg-[#0b6a34] transition-all cursor-pointer shadow-xs inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>
                  {selectedObligation?.isPaid
                    ? 'Already Settled'
                    : isVerifyingPayment && paymentStatusOutcome === 'PENDING'
                    ? 'Payment Pending Confirmation'
                    : `Make Payment (${selectedObligation?.amount || settings?.id_card_fee ? `₦${Number(selectedObligation?.amount || settings?.id_card_fee).toLocaleString()}` : 'Fee Pending'})`}
                </span>
                {!selectedObligation?.isPaid && !(isVerifyingPayment && paymentStatusOutcome === 'PENDING') && <ExternalLink className="w-4 h-4" />}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Step-Up Authentication Modal */}
      <StepUpAuthModal
        isOpen={isStepUpOpen}
        onClose={() => setIsStepUpOpen(false)}
        onSuccess={(token) => executeIdCardCheckout(token)}
        purpose="PAYMENT_CONFIRMATION"
        title="Confirm NACOS ID Card Payment"
        description="Verify your identity before proceeding to secure checkout."
        user={student}
      />
    </PortalLayout>
  );
};

export default IdCard;
