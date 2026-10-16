import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import PortalLayout from '../components/PortalLayout';
import {
  CreditCard,
  Camera,
  CheckCircle,
  AlertCircle,
  Download,
  Printer,
  Loader,
  BadgeCheck,
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
  X,
  ArrowLeft
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
import { 
  supabase, 
  getLocalPaymentsDatabase,
  getCachedStudentClearance,
  extractCachedIdCardData,
  invalidateStudentDataCache,
  getStudentClearanceSummary
} from '@nacos/supabase';
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

const IdCard = ({ viewMode = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const canvasRef = useRef(null);
  const pollIntervalRef = useRef(null);

  const isViewRoute = Boolean(
    viewMode ||
    location.pathname.endsWith('/view') ||
    location.pathname === '/id-card/view' ||
    location.pathname === '/id/view' ||
    searchParams.get('view') === 'true'
  );
  const queryLevel = searchParams.get('level');

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
  const initialCache = getCachedStudentClearance(student);
  const initialIdData = extractCachedIdCardData(student, initialCache);

  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(() => initialIdData?.idCardSettings || { id_card_fee: null, academic_session: '2026/2027' });
  const [idCardPayments, setIdCardPayments] = useState(() => initialIdData?.collectedIdCardPays || []);
  const [isInitialLoading, setIsInitialLoading] = useState(() => !initialIdData);
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

  // Persistent confirmed paid levels Set - once a level is confirmed paid, it NEVER reverts during re-fetches
  const confirmedPaidLevelsRef = useRef(new Set());
  if (initialCache?.levelClearanceMatrix) {
    Object.entries(initialCache.levelClearanceMatrix).forEach(([lvl, data]) => {
      if (data?.idCard) confirmedPaidLevelsRef.current.add(lvl);
    });
  }
  if (initialIdData?.collectedIdCardPays) {
    initialIdData.collectedIdCardPays.forEach(p => {
      if (p.isPaid && p.level) {
        const lvlNum = String(p.level).replace(/\D/g, '');
        if (lvlNum) confirmedPaidLevelsRef.current.add(lvlNum);
      }
    });
  }

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

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 4500);
  };

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
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  // ID Card Display On-Demand & Backend Access Verification States
  const [isCardViewRequested, setIsCardViewRequested] = useState(false);
  const [isVerifyingCardAccess, setIsVerifyingCardAccess] = useState(false);
  const [isChangingPhoto, setIsChangingPhoto] = useState(false);

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

    // Check for explicit callback from payment gateway (URL: ?payment=verifying&reference=...)
    try {
      const paymentAction = searchParams.get('payment');
      const ref = searchParams.get('reference') || searchParams.get('checkout_id') || searchParams.get('checkoutId');

      // Strip query parameters from URL immediately so subsequent page refreshes do NOT re-trigger this
      if (paymentAction || ref) {
        try {
          window.history.replaceState({}, '', window.location.pathname);
        } catch (_) {}
      }

      if (paymentAction === 'verifying' && ref) {
        setVerifyingReference(ref);
        setIsVerifyingPayment(true);
        setPaymentStatusOutcome('PENDING');
        startPaymentVerificationPolling(ref, null, formLevelRef.current);
      } else if (paymentAction === 'cancelled') {
        showNotification('Payment process was cancelled. You can retry checkout when you are ready.', 'info');
      }
    } catch (_) {}

    const handleSettingsUpdated = (e) => {
      if (e.detail) setSettings(e.detail);
      else {
        getIdCardSettings().then(cfg => { if (cfg) setSettings(cfg); });
      }
    };

    const handleDataUpdated = () => {
      loadStudentAndApplication(formLevelRef.current);
    };

    const unsubSession = onAcademicSessionChange(({ sessionName }) => {
      if (sessionName && sessionName !== formSessionRef.current) {
        formSessionRef.current = sessionName;
        setFormSession(sessionName);
        loadStudentAndApplication(formLevelRef.current);
      }
    });

    window.addEventListener('nacos_id_card_settings_updated', handleSettingsUpdated);
    window.addEventListener('nacos_user_updated', handleDataUpdated);
    window.addEventListener('nacos_payment_sync', handleDataUpdated);

    let bc = null;
    try {
      bc = new BroadcastChannel('nacos_payment_sync');
      bc.onmessage = (e) => {
        if (e.data?.status === 'successful') {
          handleDataUpdated();
        }
      };
    } catch (_) {}

    return () => {
      window.removeEventListener('nacos_id_card_settings_updated', handleSettingsUpdated);
      window.removeEventListener('nacos_user_updated', handleDataUpdated);
      window.removeEventListener('nacos_payment_sync', handleDataUpdated);
      if (bc) bc.close();
      if (unsubSession) unsubSession();
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (tabWatchIntervalRef.current) clearInterval(tabWatchIntervalRef.current);
    };
  }, []);

  // Synchronize route-based view mode with browser navigation (Back/Forward buttons)
  useEffect(() => {
    if (isViewRoute) {
      if (queryLevel) {
        const norm = normalizeLevel(queryLevel);
        if (norm !== formLevelRef.current) {
          formLevelRef.current = norm;
          setFormLevel(norm);
          loadStudentAndApplication(norm);
        }
      }
      setIsChangingPhoto(false);
    } else {
      setIsCardViewRequested(false);
    }
  }, [isViewRoute, queryLevel]);

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

      const matric = parsed.matric || parsed.registration_number || parsed.matricNumber || parsed.reg_number || '';
      const cleanMatric = String(matric || '').replace(/[\/\s\-]/g, '').trim().toUpperCase();
      const strippedDigits = cleanMatric.replace(/\D/g, '');
      const userId = parsed?.id;
      const cleanEmail = parsed?.email ? String(parsed.email).trim().toLowerCase() : null;

      const pProg = calculateAcademicProgression(parsed, getActiveAcademicSession());
      const maxLvlNum = (pProg?.numericLevel || 1) * 100;
      let rawLookupLevel = preferredLevel ? normalizeLevel(preferredLevel) : (formLevelRef.current || defaultStudentLevel);
      const rawLookupNum = parseInt(String(rawLookupLevel).replace(/\D/g, ''), 10);
      const lookupLevel = (!isNaN(rawLookupNum) && rawLookupNum > maxLvlNum) ? defaultStudentLevel : rawLookupLevel;

      // Safe PostgREST filters for payments and profiles
      const payConds = [];
      const addPayCond = (col, val) => {
        if (!val) return;
        const clean = String(val).trim();
        if (!clean) return;
        if (/[\.@,\s]/.test(clean)) {
          payConds.push(`${col}.eq."${clean}"`);
        } else {
          payConds.push(`${col}.eq.${clean}`);
        }
      };

      if (cleanMatric) {
        addPayCond('registration_number', cleanMatric);
        addPayCond('matric_number', cleanMatric);
      }
      if (strippedDigits && strippedDigits !== cleanMatric) {
        addPayCond('registration_number', strippedDigits);
        addPayCond('matric_number', strippedDigits);
      }
      if (userId && !String(userId).startsWith('student-')) {
        addPayCond('student_id', userId);
      }
      if (cleanEmail) {
        addPayCond('email', cleanEmail);
      }
      const orFilter = payConds.join(',');

      const profConds = [];
      const addProfCond = (col, val) => {
        if (!val) return;
        const clean = String(val).trim();
        if (!clean) return;
        if (/[\.@,\s]/.test(clean)) {
          profConds.push(`${col}.eq."${clean}"`);
        } else {
          profConds.push(`${col}.eq.${clean}`);
        }
      };
      if (cleanMatric) {
        addProfCond('registration_number', cleanMatric);
        addProfCond('matric_number', cleanMatric);
      }
      if (strippedDigits && strippedDigits !== cleanMatric) {
        addProfCond('registration_number', strippedDigits);
        addProfCond('matric_number', strippedDigits);
      }
      if (cleanEmail) {
        addProfCond('email', cleanEmail);
      }
      const profOrFilter = profConds.join(',');

      // Parallelize settings, profile check, payments ledger, application, and clearance summary queries
      const [cfg, profRow, dbPays, rawApp, clearanceSummary] = await Promise.all([
        withTimeout(getIdCardSettings(), 6000).catch(() => null),
        supabase && profOrFilter
          ? withTimeout(
              supabase.from('profiles').select('*').or(profOrFilter).limit(1).maybeSingle(),
              6000
            ).then(res => res.data).catch(() => null)
          : Promise.resolve(null),
        supabase && orFilter
          ? withTimeout(
              supabase.from('payments').select('*').or(orFilter).order('created_at', { ascending: false }),
              6000
            ).then(res => res.data || []).catch(() => [])
          : Promise.resolve([]),
        cleanMatric
          ? withTimeout(getStudentIdApplication(cleanMatric, lookupLevel), 6000).catch(() => null)
          : Promise.resolve(null),
        withTimeout(getStudentClearanceSummary(parsed), 6000).catch(() => null)
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
        const normLvl = normalizeLevel(payLevel);
        const lvlNum = String(normLvl).replace(/\D/g, '');

        if (isPaid && lvlNum) {
          confirmedPaidLevelsRef.current.add(lvlNum);
        }

        collectedIdCardPays.push({
          id: p.id || p.reference,
          receiptNo: p.reference || `NACOS/IDCARD/${cleanMatric}-${lvlNum || '100'}L`,
          transactionId: p.provider_payment_id || p.id || p.reference || 'TX-CONFIRMED',
          amount: amt,
          formattedAmount: amt > 0 ? `₦${amt.toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : '—',
          session: paySession,
          level: normLvl,
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

      // Check clearance summary for any cleared ID card levels
      if (clearanceSummary?.levelClearanceMatrix) {
        ['100', '200', '300', '400', '500'].forEach(lvlNum => {
          if (clearanceSummary.levelClearanceMatrix[lvlNum]?.idCard) {
            confirmedPaidLevelsRef.current.add(lvlNum);
            const alreadyInList = collectedIdCardPays.some(p => p.isPaid && String(p.level).replace(/\D/g, '') === lvlNum);
            if (!alreadyInList) {
              const amt = Number(cfg?.id_card_fee || 0);
              collectedIdCardPays.push({
                id: `summary-id-${cleanMatric}-${lvlNum}`,
                receiptNo: `NACOS/IDCARD/${cleanMatric}-${lvlNum}L`,
                transactionId: 'TX-CONFIRMED',
                amount: amt,
                formattedAmount: amt > 0 ? `₦${amt.toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : '—',
                session: getActiveAcademicSession(),
                level: `${lvlNum} Level`,
                paymentType: 'Student ID Card Issuance',
                paymentMethod: 'Online Gateway (Verified)',
                status: 'PAID',
                isPaid: true,
                date: 'Verified',
                time: '',
                created_at: new Date().toISOString()
              });
            }
          }
        });
      }

      // Check local storage payments fallback to prevent transient network misses
      try {
        const localDb = getLocalPaymentsDatabase();
        if (Array.isArray(localDb)) {
          localDb.filter(p =>
            (p.student_matric && (p.student_matric.toUpperCase() === cleanMatric || p.student_matric.replace(/\D/g, '') === strippedDigits)) ||
            (p.registration_number && (p.registration_number.toUpperCase() === cleanMatric || p.registration_number.replace(/\D/g, '') === strippedDigits))
          ).forEach(processIdPayItem);
        }
      } catch (_) {}

      // If rawApp is verified/paid, ensure a corresponding paid entry exists in collectedIdCardPays
      if (rawApp && (rawApp.payment_status === 'paid' || rawApp.payment_status === 'verified' || rawApp.status === 'generated')) {
        const appLvl = rawApp.level || curOb?.level || defaultStudentLevel;
        const appLvlNum = String(appLvl).replace(/\D/g, '');
        if (appLvlNum) confirmedPaidLevelsRef.current.add(appLvlNum);
        const alreadyInPays = collectedIdCardPays.some(p => p.isPaid && String(p.level).replace(/\D/g, '') === appLvlNum);
        if (!alreadyInPays) {
          const amt = Number(rawApp.amount_paid || rawApp.amount || cfg?.id_card_fee || 0);
          collectedIdCardPays.unshift({
            id: rawApp.id || `idpay-${cleanMatric}`,
            receiptNo: rawApp.payment_reference || `NACOS/IDCARD/${cleanMatric}-${appLvlNum || '100'}L`,
            transactionId: rawApp.payment_reference || 'TX-CONFIRMED',
            amount: amt,
            formattedAmount: amt > 0 ? `₦${amt.toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : '—',
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
      const activeTargetLvl = preferredLevel 
        ? normalizeLevel(preferredLevel) 
        : (curOb?.level ? normalizeLevel(curOb.level) : defaultStudentLevel);

      const activeTargetLvlNum = activeTargetLvl ? String(activeTargetLvl).replace(/\D/g, '') : null;
      const activeOb = pObs.find(o => {
        const lNum = String(o.level || '').replace(/\D/g, '');
        return lNum && activeTargetLvlNum && lNum === activeTargetLvlNum;
      }) || curOb || pObs[0];

      if (activeOb && (preferredLevel || !formLevelRef.current)) {
        const canonicalLvl = normalizeLevel(activeOb.level);
        formLevelRef.current = canonicalLvl;
        setFormLevel(canonicalLvl);
        if (activeOb.session) {
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
            const key = normalizeLevel(p.level);
            map.set(key, p);
          }
        });
        (collectedIdCardPays || []).forEach(p => {
          const key = normalizeLevel(p.level);
          // Never overwrite an existing PAID payment with an UNPAID record for the same level!
          if (p.isPaid || !map.has(key)) {
            map.set(key, p);
          }
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
      setIsInitialLoading(false);
      lastFetchTimeRef.current = Date.now();
    }
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

    // Automatic authoritative recheck when student switches back to this tab (only when actively verifying payment)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isVerifyingPaymentRef.current) {
        const targetRef = paymentTransactionRef.current?.reference || verifyingReferenceRef.current;
        const targetChk = paymentTransactionRef.current?.checkoutId;
        if (targetRef || targetChk) {
          await checkPaymentStatusAuthoritative(targetRef, targetChk, formLevelRef.current);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorageEvent);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const startPaymentVerificationPolling = (reference, checkoutId, targetLevel = null) => {
    let attempts = 0;
    const maxAttempts = 10; // 10 attempts (~40 seconds max)

    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    const checkStatus = async () => {
      attempts++;
      const outcome = await checkPaymentStatusAuthoritative(reference, checkoutId, targetLevel);
      if (outcome === 'SUCCESS' || outcome === 'FAILED' || outcome === 'CANCELLED') {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        return;
      }

      if (attempts >= maxAttempts) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setIsPaymentDelayed(true);
      }
    };

    pollIntervalRef.current = setInterval(checkStatus, 4000);
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

  const handleCancelVerification = () => {
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
    showNotification('Returned to ID card overview.', 'info');
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
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  padding: 24px;
                  text-align: center;
                }
                .spinning-logo {
                  width: clamp(90px, 25vw, 130px);
                  height: clamp(90px, 25vw, 130px);
                  object-fit: contain;
                  animation: spin 2.5s linear infinite;
                }
                .loading-title {
                  margin-top: 24px;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                  font-size: clamp(16px, 4vw, 19px);
                  font-weight: 700;
                  color: #0e8040;
                  letter-spacing: -0.3px;
                }
                .loading-desc {
                  margin-top: 8px;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                  font-size: clamp(12px, 3.2vw, 14px);
                  color: #64748b;
                  max-width: 380px;
                  line-height: 1.5;
                }
                .pulse-bar {
                  margin: 22px auto 0;
                  width: 48px;
                  height: 3.5px;
                  background: #0e8040;
                  border-radius: 999px;
                  animation: pulseBar 1.2s infinite ease-in-out;
                }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pulseBar { 0%, 100% { opacity: 0.25; transform: scaleX(0.6); } 50% { opacity: 1; transform: scaleX(1.3); } }
              </style>
            </head>
            <body>
              <div class="spinner-wrap">
                <img class="spinning-logo" src="https://res.cloudinary.com/a2mmcttn/image/upload/v1791451674/DICT_Synergy_Logo.png" alt="Loading" />
                <h2 class="loading-title">Connecting to Secure Payment Gateway</h2>
                <p class="loading-desc">Setting up your clearance checkout session. You will be redirected to Bachs in a moment...</p>
                <div class="pulse-bar"></div>
              </div>
            </body>
          </html>
        `);
        gatewayTab.document.close();
      }
      gatewayWindowRef.current = gatewayTab;
    } catch (_) {}

    // Determine target level and session directly from user's current selection
    const targetObligation = selectedObligation || levelObligations.find(ob => 
      String(ob.level).replace(/\D/g, '') === String(formLevel).replace(/\D/g, '')
    );

    const targetLevel = targetObligation?.level ? normalizeLevel(targetObligation.level) : normalizeLevel(formLevel || studentLevel);
    const targetSession = targetObligation?.session || formSession || currentAcademicSession;

    formLevelRef.current = targetLevel;
    formSessionRef.current = targetSession;

    // Immediately activate the waiting state on our own portal side so the portal shows "Waiting for payment confirmation" right away!
    setIsVerifyingPayment(true);
    setPaymentStatusOutcome('PENDING');
    setPaymentStatusMessage('Connecting to payment gateway...');
    setGatewayTabClosed(false);
    setIsPaymentDelayed(false);
    setVerifyingReference(targetLevel || 'Processing...');

    await executeIdCardCheckout(null, gatewayTab, targetLevel, targetSession);
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
      setIsVerifyingPayment(false);
      showNotification(`Payment not allowed: You cannot pay for future academic level (${reqLvlNum} Level). Your active level is ${prog?.levelString || '100 Level'}.`, 'error');
      return;
    }

    try {

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
        setIsVerifyingPayment(false);
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
        setIsVerifyingPayment(false);
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
        setIsVerifyingPayment(false);
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
      setIsVerifyingPayment(false);
      showNotification('Payment service unreachable. Please try again.', 'error');
    }
  };

  const handleOpenReceipt = (row) => {
    const cleanM = student?.matric || student?.registration_number || '';
    const lvlNum = String(row?.level || '').replace(/\D/g, '') || '100';
    const payload = {
      receiptNo: row.receiptNo || `NACOS/IDCARD/${cleanM || 'STUDENT'}-${lvlNum}L`,
      transactionId: row.transactionId || 'TX-CONFIRMED',
      date: row.date || 'Verified',
      time: row.time || '',
      studentName: student?.full_name || student?.name || 'Student Member',
      matricNo: cleanM,
      department: student?.department || 'Computer Science',
      level: row.level,
      session: row.session,
      amount: row.amount,
      rawAmount: row.amount,
      paymentType: 'Student ID Card Issuance',
      paymentMethod: row.paymentMethod || 'Online Gateway (Confirmed)',
      status: 'APPROVED',
      isInvoice: false
    };
    navigate(`/receipt?reference=${encodeURIComponent(payload.receiptNo || payload.transactionId)}&type=id_card`, {
      state: { receiptData: payload }
    });
  };

  // State 3 -> State 7: Photo Upload & Instant ID Generation
  const handlePhotoUploaded = async (media) => {
    setUploadError('');
    const rawPhotoUrl = media?.secureUrl || media?.url;
    if (!rawPhotoUrl) return;
    const matric = student?.matric || student?.registration_number;
    const cleanDigits = String(matric || '').replace(/\D/g, '') || matric;
    const now = new Date().toISOString();
    const timestamp = Date.now();

    // Cache-busted URL so browser disk/memory cache immediately requests & updates new photo
    const photoUrl = (rawPhotoUrl.startsWith('data:') || rawPhotoUrl.startsWith('blob:'))
      ? rawPhotoUrl
      : `${rawPhotoUrl}${rawPhotoUrl.includes('?') ? '&' : '?'}t=${timestamp}`;

    setIsUploadingPhoto(true);

    // 1. Sync photo to student profile & verified_students in Supabase
    try {
      if (supabase && matric) {
        const cleanMatricUpper = String(matric).trim().toUpperCase();
        const matricConds = [`registration_number.eq.${cleanMatricUpper}`, `matric_number.eq.${cleanMatricUpper}`];
        if (cleanDigits && cleanDigits !== cleanMatricUpper) {
          matricConds.push(`registration_number.eq.${cleanDigits}`);
          matricConds.push(`matric_number.eq.${cleanDigits}`);
        }
        const orFilter = matricConds.join(',');

        await Promise.allSettled([
          supabase.from('profiles').update({
            profile_photo_url: rawPhotoUrl,
            avatar_url: rawPhotoUrl,
            photo_url: rawPhotoUrl,
            cloudinary_public_id: media?.publicId || null,
            updated_at: now
          }).or(orFilter),
          supabase.from('verified_students').update({
            passport_url: rawPhotoUrl,
            profile_photo_url: rawPhotoUrl,
            photo_url: rawPhotoUrl,
            updated_at: now
          }).or(orFilter)
        ]);
      }
    } catch (e) {
      console.warn('Profile photo update warning:', e);
    }

    // 2. Link photo to ID card application and auto-generate ON THE SPOT
    if (application?.id) {
      await linkPassportUrlToApplication(application.id, matric, photoUrl, media?.publicId || '');
    }

    setStudent(prev => ({
      ...prev,
      profile_photo_url: photoUrl,
      avatar_url: photoUrl,
      passport_url: photoUrl,
      photo_url: photoUrl,
      avatar: photoUrl,
      photo_updated_at: timestamp,
      cloudinary_public_id: media?.publicId || ''
    }));

    const stored = localStorage.getItem('nacos_user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        u.profile_photo_url = photoUrl;
        u.avatar_url = photoUrl;
        u.passport_url = photoUrl;
        u.photo_url = photoUrl;
        u.avatar = photoUrl;
        u.photo_updated_at = timestamp;
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

    setIsChangingPhoto(false);
    setIsUploadingPhoto(false);
    window.dispatchEvent(new Event('nacos_user_updated'));
    showNotification('Photograph uploaded successfully! Official ID card generated.');
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

    const isMatrixIdPaid = Boolean(initialCache?.levelClearanceMatrix?.[obLvlNum]?.idCard);
    const isAppPaid = Boolean(
      application &&
      ['paid', 'verified', 'generated'].includes(String(application.payment_status || application.status).toLowerCase()) &&
      (!application.level || String(application.level).replace(/\D/g, '') === obLvlNum)
    );
    const isConfirmedPaid = confirmedPaidLevelsRef.current.has(obLvlNum);
    const isObligationPaid = Boolean(matchingPayment?.isPaid || isMatrixIdPaid || isAppPaid || isConfirmedPaid);
    if (isObligationPaid) {
      confirmedPaidLevelsRef.current.add(obLvlNum);
    }

    const status = isObligationPaid ? 'PAID' : 'UNPAID';
    const liveFee = settings?.id_card_fee != null && !isNaN(Number(settings.id_card_fee)) && Number(settings.id_card_fee) > 0 ? Number(settings.id_card_fee) : null;
    const resolvedAmount = isObligationPaid ? (matchingPayment?.amount ? Number(matchingPayment.amount) : liveFee) : liveFee;

    const cleanM = String(student?.matric || student?.registration_number || '').trim().toUpperCase();
    const fallbackReceiptNo = application?.payment_reference || `NACOS/IDCARD/${cleanM || 'STUDENT'}-${obLvlNum}L`;
    const fallbackTxId = application?.payment_reference || 'TX-CONFIRMED';
    const fallbackDate = application?.paid_at ? new Date(application.paid_at).toLocaleDateString('en-GB') : 'Verified';

    const resolvedPayment = matchingPayment || (isObligationPaid ? {
      receiptNo: fallbackReceiptNo,
      transactionId: fallbackTxId,
      amount: resolvedAmount,
      session: ob.session,
      level: ob.level,
      status: 'PAID',
      isPaid: true,
      date: fallbackDate
    } : null);

    return {
      ...ob,
      amount: resolvedAmount,
      status,
      isPaid: isObligationPaid,
      payment: resolvedPayment,
      receiptNo: matchingPayment?.receiptNo || (isObligationPaid ? fallbackReceiptNo : null),
      transactionId: matchingPayment?.transactionId || (isObligationPaid ? fallbackTxId : null),
      date: matchingPayment?.date || (isObligationPaid ? fallbackDate : null)
    };
  });

  const currentLevelObligation = levelObligations.find(o => o.isCurrent) || levelObligations[levelObligations.length - 1];
  const isCurrentLevelPaid = Boolean(currentLevelObligation?.isPaid);
  const isCardViewActive = Boolean((isViewRoute || isCardViewRequested) && isCurrentLevelPaid);
  const hasAnyPaidLevel = levelObligations.some(o => o.isPaid);

  // Enforce current-level ID card eligibility on route access
  useEffect(() => {
    if (isViewRoute) {
      const activeLvlNum = String(studentLevel).replace(/\D/g, '') || '100';
      if (!isCurrentLevelPaid && !isInitialLoading) {
        setIsCardViewRequested(false);
        navigate('/id-card', { replace: true });
        const activeSessionText = currentLevelObligation?.session || currentAcademicSession;
        showNotification(
          activeSessionText
            ? `Please renew your ID card for the current active session (${activeSessionText}) to view your ID card.`
            : 'Please renew your ID card for the current active session to view your ID card.',
          'error'
        );
        return;
      }

      if (queryLevel) {
        const norm = normalizeLevel(queryLevel);
        const queryNum = String(norm).replace(/\D/g, '');
        if (queryNum !== activeLvlNum) {
          navigate(`/id-card/view?level=${encodeURIComponent(studentLevel)}`, { replace: true });
        }
      }
    }
  }, [isViewRoute, queryLevel, studentLevel, isInitialLoading, isCurrentLevelPaid, currentLevelObligation?.session, currentAcademicSession]);

  const selectedObligation = levelObligations.find(o => {
    const l1 = String(o.level || '').replace(/\D/g, '');
    const l2 = String(formLevel || '').replace(/\D/g, '');
    const s1 = String(o.session || '').trim();
    const s2 = String(formSession || '').trim();
    return l1 && l2 && l1 === l2 && (!s2 || s1 === s2);
  }) || levelObligations.find(o => {
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

    const normLvl = normalizeLevel(ob.level);
    formLevelRef.current = normLvl;
    formSessionRef.current = ob.session;
    setFormLevel(normLvl);
    setFormSession(ob.session);
    setIsNewPaymentModalOpen(true);
  };

  const handleViewIdCard = async (obligation = null) => {
    // 1. Authoritative active level derived from progression
    const activeLevel = studentLevel;
    const activeLevelNum = String(activeLevel).replace(/\D/g, '') || '100';

    // 2. Authoritative check: has the student successfully paid for their CURRENT level?
    const currentOb = levelObligations.find(o => String(o.level).replace(/\D/g, '') === activeLevelNum) || currentLevelObligation;
    const isCurrentPaid = Boolean(currentOb?.isPaid);

    if (!isCurrentPaid) {
      const activeSessionText = currentOb?.session || currentLevelObligation?.session || currentAcademicSession;
      showNotification(
        activeSessionText
          ? `Please renew your ID card for the current active session (${activeSessionText}) to view your ID card.`
          : 'Please renew your ID card for the current active session to view your ID card.',
        'error'
      );
      setIsCardViewRequested(false);
      return;
    }

    // 3. If student clicked on a past level obligation, inform them that previous level card has expired
    if (obligation && String(obligation.level).replace(/\D/g, '') !== activeLevelNum) {
      showNotification(`ID cards from previous levels are expired. Displaying your current ${activeLevel} ID Card.`, 'info');
    }

    // 4. Synchronize state strictly to the current level
    const targetLvl = currentOb?.level || activeLevel;
    const targetSess = currentOb?.session || currentAcademicSession;
    formLevelRef.current = normalizeLevel(targetLvl);
    formSessionRef.current = targetSess;
    setFormLevel(normalizeLevel(targetLvl));
    setFormSession(targetSess);

    // 5. Authoritative Backend Validation:
    setIsVerifyingCardAccess(true);

    try {
      await loadStudentAndApplication(targetLvl);
      setIsCardViewRequested(true);
      setIsChangingPhoto(false);
      setIsVerifyingCardAccess(false);
      navigate(`/id-card/view?level=${encodeURIComponent(targetLvl)}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.warn('Backend verification notice:', err);
      setIsCardViewRequested(true);
      setIsChangingPhoto(false);
      setIsVerifyingCardAccess(false);
      navigate(`/id-card/view?level=${encodeURIComponent(targetLvl)}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const isSelectedLevelPaid = Boolean(selectedObligation?.isPaid);
  const isPaid = isSelectedLevelPaid;

  const cardLevelRaw = String(application?.level || selectedObligation?.level || '');
  const cardLevelNum = cardLevelRaw.match(/\d{3}/)?.[1] || (cardLevelRaw ? studentProgression.numericLevel * 100 : null);
  const cardLevel = cardLevelNum ? `${cardLevelNum} Level` : null;

  const appStatus = application?.status;

  const isState1 = !isVerifyingPayment && !application && !isSelectedLevelPaid;
  const isState2 = !isVerifyingPayment && !isSelectedLevelPaid && Boolean(application) && (appStatus === 'pending_payment' || appStatus === 'draft' || (!isPaid && appStatus !== 'rejected' && appStatus !== 'revoked'));
  const isState3 = isSelectedLevelPaid && (appStatus === 'photo_required' || (!application?.passport_url && !student?.profile_photo_url));
  const isState4 = isSelectedLevelPaid && !isState3 && (application?.passport_url || student?.profile_photo_url) && appStatus === 'ready_to_submit';
  const isState5 = isSelectedLevelPaid && !isState3 && (appStatus === 'submitted' || appStatus === 'processing');
  const isState6 = isSelectedLevelPaid && !isState3 && appStatus === 'approved';
  const isState7 = isSelectedLevelPaid && (appStatus === 'generated' || (!['photo_required', 'ready_to_submit', 'submitted', 'processing', 'rejected', 'revoked'].includes(appStatus) && Boolean(application?.passport_url || student?.profile_photo_url)));
  const isState8 = Boolean(application) && appStatus === 'rejected';
  const isState9 = Boolean(application) && appStatus === 'revoked';

  // Redraw canvas whenever student requests card view and application reaches 'generated' state
  useEffect(() => {
    if (isCardViewActive && canvasRef.current && student) {
      const photoUrl = application?.passport_url || student.profile_photo_url || student.avatar_url;
      const cardLevel = currentLevelObligation?.level || studentLevel || '100 Level';
      const cardSession = currentLevelObligation?.session || currentAcademicSession || '2026/2027';
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
  }, [isCardViewActive, isChangingPhoto, application?.status, application?.passport_url, isState7, student?.matric, student?.profile_photo_url, student?.avatar_url, selectedObligation?.level, selectedObligation?.session]);

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

  const currentPhotoUrl = application?.passport_url || student?.profile_photo_url || student?.avatar_url;
  const isPhotoMissingOrChanging = !currentPhotoUrl || isChangingPhoto;

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

  return (
    <PortalLayout>
      <div className="space-y-6">

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

        {isVerifyingPayment ? (
          /* ==================================================================== */
          /* VIEW 1: DEDICATED PAYMENT PROCESSING & GATEWAY CONFIRMATION VIEW     */
          /* ==================================================================== */
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Dedicated Navigation Bar & Status Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#083002] p-4 sm:p-5 rounded-2xl border border-gray-200/80 dark:border-[#138601]/30 shadow-xs">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCancelVerification}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 dark:text-green-200 bg-gray-100 dark:bg-[#041801] hover:bg-gray-200 dark:hover:bg-[#138601]/30 border border-gray-200/80 dark:border-[#138601]/30 transition-all cursor-pointer active:scale-95"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Payment Options</span>
                </button>
                <div className="h-6 w-px bg-gray-200 dark:bg-[#138601]/30 hidden sm:block" />
                <div>
                  <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                    Payment Processing &amp; Verification
                  </h1>
                  <p className="text-[11px] sm:text-xs text-gray-500 dark:text-green-200/70">
                    Department of Computer Science • Official Student ID Card Clearance
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  paymentStatusOutcome === 'SUCCESS'
                    ? 'bg-emerald-100 text-[#0e8040] dark:bg-emerald-950 dark:text-[#4bd043] border border-emerald-200 dark:border-emerald-800'
                    : paymentStatusOutcome === 'FAILED' || paymentStatusOutcome === 'CANCELLED'
                    ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-800'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                }`}>
                  {paymentStatusOutcome === 'SUCCESS' ? (
                    <><BadgeCheck className="w-3.5 h-3.5 text-emerald-500" /> Clearance Verified</>
                  ) : paymentStatusOutcome === 'FAILED' || paymentStatusOutcome === 'CANCELLED' ? (
                    <><AlertCircle className="w-3.5 h-3.5" /> Transaction Incomplete</>
                  ) : (
                    <><Clock className="w-3.5 h-3.5" /> Processing / Awaiting Confirmation</>
                  )}
                </span>
              </div>
            </div>

            {/* Waiting / Processing Card */}
            <div className="p-6 sm:p-10 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200/80 dark:border-[#138601]/30 text-center space-y-6 shadow-xs">
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
                        <Loader className="w-3 h-3 animate-spin" /> Awaiting Gateway Confirmation
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
                      {isPaying ? <Loader className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
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
                    <BadgeCheck className="w-8 h-8" />
                  </div>

                  <div className="max-w-md mx-auto space-y-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-[#0e8040] dark:bg-emerald-950/60 dark:text-[#4bd043]">
                      <BadgeCheck className="w-3.5 h-3.5" /> Verified &amp; Cleared
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
                      onClick={() => {
                        setIsVerifyingPayment(false);
                        handleViewIdCard(selectedObligation || currentLevelObligation);
                      }}
                      className="w-full sm:w-auto px-6 py-3 min-h-[44px] text-xs sm:text-sm font-semibold text-white bg-[#0e8040] hover:bg-[#0b6a34] rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>View &amp; Download ID Card</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsVerifyingPayment(false);
                        setPaymentStatusOutcome('PENDING');
                      }}
                      className="w-full sm:w-auto px-4 py-3 min-h-[44px] text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#041801] rounded-xl transition-colors cursor-pointer"
                    >
                      Return to Overview
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
                      <RotateCcw className="w-4 h-4" />
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
                      Return to Overview
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : isCardViewActive ? (
          /* ==================================================================== */
          /* DEDICATED ID CARD STUDIO PAGE VIEW (Loads like a new page)           */
          /* ==================================================================== */
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Studio Navigation & Status Header */}
            <div className="flex flex-row items-center justify-between gap-4 bg-white dark:bg-[#083002] p-4 sm:p-5 rounded-2xl border border-gray-200/80 dark:border-[#138601]/30 shadow-xs">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCardViewRequested(false);
                    if (isViewRoute) {
                      navigate('/id-card');
                    }
                  }}
                  aria-label="Back"
                  className="p-2 -ml-2 rounded-lg text-gray-700 hover:text-black hover:bg-gray-100 dark:text-green-100 dark:hover:text-white dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
                </button>
                <h1 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                  Official Student Identity Card ({currentLevelObligation?.level || studentLevel || 'Active'})
                </h1>
              </div>
            </div>

            {/* If photo is missing or user clicked 'Change Photograph': Prompt to upload image first */}
            {isPhotoMissingOrChanging ? (
              <div className="p-8 sm:p-12 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200/80 dark:border-[#138601]/30 text-center space-y-6 shadow-xs max-w-2xl mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-green-50 dark:bg-green-900/20 text-[#138601] dark:text-[#4bd043] flex items-center justify-center mx-auto border border-green-200 dark:border-green-800/40">
                  <Camera className="w-8 h-8" />
                </div>

                <div className="max-w-md mx-auto space-y-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" /> Step: ID Card Photograph Required
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    {isChangingPhoto ? 'Update Your ID Card Photograph' : 'Upload ID Card Photograph'}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-green-100/80 leading-relaxed">
                    To generate your official student identity card on the spot, please provide a clear front-facing portrait photograph on a light background.
                  </p>
                </div>

                {uploadError && (
                  <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-300 font-semibold max-w-md mx-auto">
                    {uploadError}
                  </div>
                )}

                <div className="max-w-md mx-auto text-left space-y-4">
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
                    <div className="p-3.5 rounded-xl bg-gray-50/80 dark:bg-[#041801] border border-gray-200/60 dark:border-[#138601]/25 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={student.profile_photo_url || student.avatar_url}
                          alt="Current Profile Photo"
                          className="w-10 h-10 rounded-full object-cover border-2 border-[#138601]"
                        />
                        <div>
                          <div className="text-xs font-semibold text-gray-800 dark:text-white">Use Current Account Photo</div>
                          <div className="text-[11px] text-gray-500 dark:text-green-200/60">Generate card using existing portrait</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePhotoUploaded({ url: student.profile_photo_url || student.avatar_url })}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0e8040] hover:bg-[#0b6a34] rounded-lg transition-colors cursor-pointer"
                      >
                        Use Photo
                      </button>
                    </div>
                  )}

                  {/* Direct file picker fallback */}
                  <div className="pt-1 text-center">
                    <label className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-white cursor-pointer underline">
                      <Camera className="w-3.5 h-3.5" />
                      <span>Choose image directly from device</span>
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

                  {isChangingPhoto && currentPhotoUrl && (
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => setIsChangingPhoto(false)}
                        className="text-xs font-semibold text-gray-500 hover:text-gray-800 dark:text-green-200/70 dark:hover:text-white cursor-pointer"
                      >
                        Cancel and keep current photo
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* TWO-SIDED ID CARD GENERATED STUDIO VIEW */
              <div className="space-y-6">
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

                    {/* Front / Back Toggle Buttons & Action Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsChangingPhoto(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-green-200 bg-gray-100 dark:bg-[#041801] hover:bg-gray-200 dark:hover:bg-[#138601]/20 border border-gray-200/80 dark:border-[#138601]/30 transition-colors cursor-pointer"
                        title="Change ID Card Photograph"
                      >
                        <Camera className="w-3.5 h-3.5 text-[#138601] dark:text-[#4bd043]" />
                        <span>Change Photo</span>
                      </button>

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
                    <li>Student Name: <strong className="text-gray-900 dark:text-white">{student?.name || student?.full_name || 'Student'}</strong></li>
                    <li>NACOS ID Number: <strong className="font-mono text-gray-900 dark:text-white">{application?.id_card_number || student?.matric || 'N/A'}</strong></li>
                    <li>Valid for Session: <strong className="text-gray-900 dark:text-white">{currentLevelObligation?.session || currentAcademicSession || 'Current'}</strong></li>
                    <li>Expiration Date: <strong className="text-[#138601] dark:text-[#4bd043]">{expiryDateFormatted} (1-Year Validity)</strong></li>
                    <li>Present this digital or printed card for departmental verification, election voting, and lab access.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ==================================================================== */
          /* VIEW 3: DEFAULT OVERVIEW (HEADER + OBLIGATIONS TABLE ONLY)           */
          /* ==================================================================== */
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Header */}
            <div className="print:hidden">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                Student ID Card Application &amp; Issuance
              </h1>
            </div>



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
                            <BadgeCheck className="w-3.5 h-3.5" />
                            PAID
                          </span>
                        ) : isInitialLoading ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500 dark:bg-green-950/40 dark:text-green-300/80">
                            <Loader className="w-3 h-3 animate-spin text-gray-400" />
                            <span>Verifying...</span>
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
                        ) : isInitialLoading ? (
                          <div className="h-7 w-20 bg-gray-100 dark:bg-green-950/40 rounded-md animate-pulse ml-auto" />
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
                  Confirm ID Card Payment
                </h3>
                <p className="text-xs text-gray-500 dark:text-green-200/70 mt-0.5">
                  Review obligation details and proceed to secure payment gateway.
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
                    value={selectedObligation ? `${selectedObligation.level}|${selectedObligation.session}` : `${formLevel}|${formSession}`}
                    onChange={(e) => {
                      const selectedVal = e.target.value;
                      const matched = levelObligations.find(ob => `${ob.level}|${ob.session}` === selectedVal);
                      if (matched) {
                        const normLvl = normalizeLevel(matched.level);
                        setFormLevel(normLvl);
                        setFormSession(matched.session);
                        formLevelRef.current = normLvl;
                        formSessionRef.current = matched.session;
                      } else {
                        const [lvl, sess] = selectedVal.split('|');
                        const normLvl = normalizeLevel(lvl);
                        setFormLevel(normLvl);
                        setFormSession(sess);
                        formLevelRef.current = normLvl;
                        formSessionRef.current = sess;
                      }
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
