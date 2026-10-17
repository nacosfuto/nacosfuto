import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Printer,
  Download,
  CreditCard,
  Plus,
  Loader,
  RotateCcw,
  BadgeCheck,
  X,
  FileText,
  ChevronDown,
  ExternalLink,
  Check
} from 'lucide-react';
import PortalLayout from '../components/PortalLayout';
import { useTheme } from '../context/ThemeContext';
import { 
  supabase, 
  recordStudentPayment, 
  getDuesSettings, 
  getLocalPaymentsDatabase,
  getCachedStudentClearance,
  extractCachedDuesData,
  invalidateStudentDataCache
} from '@nacos/supabase';
import { enrichStudentProfile } from '@nacos/supabase/auth';
import {
  getActiveAcademicSession,
  SUPPORTED_ACADEMIC_SESSIONS,
  calculateAcademicProgression,
  extractEntryYearFromRegNumber,
  getStudentApplicableLevelSessions,
  onAcademicSessionChange
} from '@nacos/config/academic';
import StepUpAuthModal from '../components/StepUpAuthModal';
import PosThermalReceipt from '../components/PosThermalReceipt';

/**
 * Determine Progressive Levels for a student.
 * Students in 100L only see 100L. Students in 200L see 100L and 200L.
 * Students never see future levels beyond their current standing.
 */
export const getProgressiveLevels = (u) => {
  if (!u) return ['100'];
  if (u.is_graduated || String(u.level).toLowerCase().includes('graduat')) {
    return ['100', '200', '300', '400', '500'];
  }

  const progression = calculateAcademicProgression(u, getActiveAcademicSession());
  let lvlNum = 100;

  if (progression && progression.valid && progression.numericLevel) {
    lvlNum = progression.numericLevel * 100;
  } else {
    const raw = String(u.level || u.current_level || '100');
    const match = raw.match(/(\d{3})/);
    lvlNum = match ? parseInt(match[1], 10) : 100;
  }

  const validMax = Math.min(500, Math.max(100, Math.floor(lvlNum / 100) * 100));
  const allLevels = ['100', '200', '300', '400', '500'];
  const maxIdx = allLevels.indexOf(String(validMax));
  return maxIdx !== -1 ? allLevels.slice(0, maxIdx + 1) : ['100'];
};

const withTimeout = (promise, ms = 6000) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Operation timed out')), ms))
  ]);

const Dues = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [notification, setNotification] = useState({ message: '', type: '' });
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 5000);
  };

  const [isStepUpOpen, setIsStepUpOpen] = useState(false);

  const [user, setUser] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('nacos_user');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) { }
      }
    }
    return {};
  });

  const cleanMatric = String(user?.registration_number || user?.matric || user?.matricNumber || '').trim().toUpperCase();

  // Instant synchronous cache pre-load to eliminate "UNPAID" flashes
  const initialCache = getCachedStudentClearance(user);
  const initialDuesData = extractCachedDuesData(user, initialCache);

  const [duesFee, setDuesFee] = useState(() => {
    if (initialDuesData?.duesFee != null && !isNaN(Number(initialDuesData.duesFee))) {
      if (initialDuesData?.duesFee != null && !isNaN(Number(initialDuesData.duesFee)) && Number(initialDuesData.duesFee) > 0) {
        return Number(initialDuesData.duesFee);
      }
    }
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('nacos_dues_settings_db');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.dues_amount != null && !isNaN(Number(parsed.dues_amount)) && Number(parsed.dues_amount) > 0) {
            return Number(parsed.dues_amount);
          }
        }
      } catch (_) {}
    }
    return null;
  });

  const [isRevoked, setIsRevoked] = useState(false);
  const [revocationReason, setRevocationReason] = useState('');
  const [totalLifetimeDues, setTotalLifetimeDues] = useState(() => initialDuesData?.totalPaidSum ?? initialCache?.totalPaid ?? 0);

  // Complete list of ALL payments student has made (synced from DB)
  const [paymentHistoryList, setPaymentHistoryList] = useState(() => initialDuesData?.paymentHistoryList || []);

  const userCleared = Boolean(user?.dues_cleared || user?.has_paid_dues || ['cleared', 'successful', 'verified', 'paid'].includes(String(user?.payment_status).toLowerCase()));
  const studentLvl = String(user?.level || user?.current_level || '100').match(/\d{3}/)?.[0] || '100';

  // Level map storing dues clearance for each academic level
  const [levelDuesMap, setLevelDuesMap] = useState(() => {
    const base = initialDuesData?.levelDuesMap || {
      '100': null,
      '200': null,
      '300': null,
      '400': null,
      '500': null
    };
    if (userCleared && !base[studentLvl]) {
      const cleanMatric = String(user?.registration_number || user?.matric || '').trim().toUpperCase();
      base[studentLvl] = {
        id: `sess-${cleanMatric}-${studentLvl}`,
        receiptNo: user?.receipt_no || `NACOS/DUES/${cleanMatric || 'FUTO'}-${studentLvl}L`,
        transactionId: user?.receipt_no || 'TX-CONFIRMED',
        date: 'Confirmed',
        time: '',
        paymentDate: 'Confirmed (Database Verified)',
        amount: user?.dues_amount ? `₦${Number(user.dues_amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : (duesFee ? `₦${Number(duesFee).toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : '—'),
        rawAmount: Number(user?.dues_amount || duesFee || 0),
        status: 'PAID',
        isPaid: true,
        session: user?.academic_session || getActiveAcademicSession(),
        level: `${studentLvl} LEVEL`,
        levelNum: studentLvl,
        paymentType: 'Departmental Dues (Full Payment)',
        studentName: (user?.full_name || user?.name || 'Student Member').trim(),
        matricNo: cleanMatric,
        department: user?.department || 'Computer Science',
        created_at: user?.dues_paid_at || new Date().toISOString()
      };
    }
    return base;
  });

  const [isStatusChecking, setIsStatusChecking] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const inFlightCheckRef = useRef(false);

  // Allowed levels based on progressive student level
  const progressiveLevels = getProgressiveLevels(user);

  // New Invoice Modal state
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [formSession, setFormSession] = useState(getActiveAcademicSession);
  const [formPaymentType, setFormPaymentType] = useState('Departmental Dues - Full Payment');
  const [formLevel, setFormLevel] = useState(() => {
    const pLevels = getProgressiveLevels(user);
    return pLevels[pLevels.length - 1] || '100';
  });

  // Cross-tab Gateway Waiting & Polling State
  const [isAwaitingGateway, setIsAwaitingGateway] = useState(false);
  const [gatewayRef, setGatewayRef] = useState('');
  const pollTimerRef = useRef(null);
  const gatewayWindowRef = useRef(null);

  // Real Thermal POS Receipt Modal State
  const [isPosReceiptOpen, setIsPosReceiptOpen] = useState(false);
  const [posReceiptData, setPosReceiptData] = useState(null);
  const [isInvoiceSlip, setIsInvoiceSlip] = useState(false);

  // Persistent confirmed paid levels Set - once a level is confirmed paid, it NEVER reverts during re-fetches
  const confirmedPaidLevelsRef = useRef(new Set());
  if (initialDuesData?.levelDuesMap) {
    Object.entries(initialDuesData.levelDuesMap).forEach(([lvl, data]) => {
      if (data?.isPaid) confirmedPaidLevelsRef.current.add(lvl);
    });
  }
  if (initialCache?.levelClearanceMatrix) {
    Object.entries(initialCache.levelClearanceMatrix).forEach(([lvl, data]) => {
      if (data?.dues) confirmedPaidLevelsRef.current.add(lvl);
    });
  }
  if (userCleared) {
    confirmedPaidLevelsRef.current.add(studentLvl);
  }

  // Stable references for event listeners to avoid infinite effect teardowns/re-triggers
  const userRef = useRef(user);
  userRef.current = user;
  const duesFeeRef = useRef(duesFee);
  duesFeeRef.current = duesFee;
  const formSessionRef = useRef(formSession);
  formSessionRef.current = formSession;

  // Check payment status from Bachs payments table, departmental_dues, dues_payments, and Supabase across all levels
  const checkStatus = async (currentUser) => {
    if (inFlightCheckRef.current) return;
    inFlightCheckRef.current = true;
    setIsStatusChecking(true);
    try {
      const matric = currentUser?.registration_number || currentUser?.matric || currentUser?.matricNumber || '';
      const cleanMatric = String(matric).trim().toUpperCase();
      const strippedDigits = cleanMatric.replace(/\D/g, '');
      const userId = currentUser?.id;
      const progression = calculateAcademicProgression(currentUser);
      const studentHomeLevel = progression.valid && progression.numericLevel 
        ? String(progression.numericLevel * 100) 
        : (String(currentUser?.level || currentUser?.current_level || '100').match(/\d{3}/)?.[0] || '100');

      const newMap = {
        '100': null,
        '200': null,
        '300': null,
        '400': null,
        '500': null
      };

      let totalPaidSum = 0;
      const allRecords = [];

      // Helper to format and add a payment record to the master history list
      const processItem = (item) => {
        const amt = Number(item.amount || duesFeeRef.current || duesFee || 0);
        const isPaid = ['successful', 'paid', 'cleared', 'verified', 'completed'].includes(String(item.status).toLowerCase()) || Boolean(item.paid_at);

        if (isPaid) {
          totalPaidSum += amt;
        }

        const payDate = item.paid_at || item.created_at || new Date().toISOString();
        const dateObj = new Date(payDate);
        const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }) : 'Current Session';
        const timeStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleTimeString('en-GB') : '12:00:00';

        const itemLevelRaw = item.metadata?.level || item.level || '';
        const match = String(itemLevelRaw).match(/\d{3}/);
        const lvl = match ? match[0] : studentHomeLevel;

        const isIdCard = item.payment_type === 'ID_CARD' || 
          String(item.purpose || '').toLowerCase().includes('id card') ||
          String(item.title || '').toLowerCase().includes('id card') ||
          String(item.payment_title || '').toLowerCase().includes('id card');

        // STRICT USER RULE: ID Card payments NEVER show on Dues page
        if (isIdCard) return;

        const paymentTypeLabel = 'Departmental Dues (Full Payment)';
        const session = item.academic_session || item.metadata?.academic_session || item.session || currentUser?.academic_session || getActiveAcademicSession();

        const formatted = {
          id: item.id || item.reference || `pay-${Math.random()}`,
          receiptNo: item.reference || item.payment_reference || `NACOS/DUES/${cleanMatric}-${lvl}L`,
          transactionId: item.provider_payment_id || item.id || item.reference || 'TX-CONFIRMED',
          date: dateStr,
          time: timeStr,
          paymentDate: `${dateStr} (${timeStr} GMT+1)`,
          amount: `₦${amt.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
          rawAmount: amt,
          paymentMethod: item.provider ? `${String(item.provider).replace(/bachs/gi, 'Online Gateway')} (${isPaid ? 'Confirmed' : 'Unconfirmed'})` : `Online Gateway (${isPaid ? 'Confirmed' : 'Unconfirmed'})`,
          status: isPaid ? 'PAID' : 'UNPAID',
          isPaid,
          session: session,
          level: `${lvl} LEVEL`,
          levelNum: lvl,
          paymentType: paymentTypeLabel,
          studentName: (currentUser?.full_name || currentUser?.name || item.customer_name || 'Student Member').trim(),
          matricNo: cleanMatric || '',
          department: currentUser?.department || 'Computer Science',
          created_at: item.created_at || item.paid_at || new Date().toISOString()
        };

        allRecords.push(formatted);

        if (isPaid && ['100', '200', '300', '400', '500'].includes(lvl)) {
          confirmedPaidLevelsRef.current.add(lvl);
          if (!newMap[lvl]) {
            newMap[lvl] = formatted;
          }
        }

        // If cleared for 'All' levels by administration, populate all progressive levels
        if (isPaid && String(itemLevelRaw).toLowerCase() === 'all') {
          progressiveLevels.forEach(lvlCode => {
            confirmedPaidLevelsRef.current.add(lvlCode);
            if (!newMap[lvlCode]) {
              newMap[lvlCode] = {
                ...formatted,
                id: `dues-all-${cleanMatric}-${lvlCode}`,
                level: `${lvlCode} LEVEL`,
                levelNum: lvlCode,
                receiptNo: formatted.receiptNo || `NACOS/DUES/${cleanMatric}-${lvlCode}L`
              };
            }
          });
        }
      };

      // Prepare filter criteria with safe double-quoting for PostgREST .or() compatibility
      const filters = [];
      const addFilter = (col, val) => {
        if (!val) return;
        const clean = String(val).trim();
        if (!clean) return;
        if (/[\.@,\s]/.test(clean)) {
          filters.push(`${col}.eq."${clean}"`);
        } else {
          filters.push(`${col}.eq.${clean}`);
        }
      };

      if (cleanMatric) {
        addFilter('registration_number', cleanMatric);
        addFilter('matric_number', cleanMatric);
      }
      if (strippedDigits && strippedDigits !== cleanMatric) {
        addFilter('registration_number', strippedDigits);
        addFilter('matric_number', strippedDigits);
      }
      if (userId && /^[0-9a-fA-F-]{36}$/.test(userId)) {
        addFilter('student_id', userId);
      }
      if (currentUser?.email) {
        addFilter('email', String(currentUser.email).trim().toLowerCase());
      }

      const duesFilters = [];
      if (cleanMatric) duesFilters.push(`registration_number.eq.${cleanMatric}`);
      if (strippedDigits && strippedDigits !== cleanMatric) duesFilters.push(`registration_number.eq.${strippedDigits}`);
      if (userId && /^[0-9a-fA-F-]{36}$/.test(userId)) duesFilters.push(`student_id.eq.${userId}`);

      // Departmental dues table only has registration_number column (not matric_number)
      const deptFilters = [];
      if (cleanMatric) {
        deptFilters.push(`registration_number.eq.${cleanMatric}`);
      }
      if (strippedDigits && strippedDigits !== cleanMatric) {
        deptFilters.push(`registration_number.eq.${strippedDigits}`);
      }

      // Parallelize queries concurrently with withTimeout(..., 6000)
      const [
        paymentsResult,
        legacyDuesResult,
        deptDuesResult
      ] = await Promise.all([
        supabase && filters.length > 0
          ? withTimeout(
              supabase.from('payments').select('id, student_id, registration_number, payment_type, provider, amount, currency, status, reference, paid_at, created_at, metadata, academic_session, level').or(filters.join(',')).order('created_at', { ascending: false }),
              6000
            ).catch(err => { console.warn('Bachs payments check notice:', err); return { data: [] }; })
          : Promise.resolve({ data: [] }),

        supabase && duesFilters.length > 0
          ? withTimeout(
              supabase.from('dues_payments').select('id, student_id, registration_number, session, academic_session, level, amount, status, reference, paid_at, created_at').or(duesFilters.join(',')),
              6000
            ).catch(err => { console.warn('Legacy dues check notice:', err); return { data: [] }; })
          : Promise.resolve({ data: [] }),

        supabase && deptFilters.length > 0
          ? withTimeout(
              supabase.from('departmental_dues').select('id, student_id, registration_number, session, academic_session, level, amount, status, reference, paid_at, created_at').or(deptFilters.join(',')),
              6000
            ).catch(err => { console.warn('Dept dues check notice:', err); return { data: [] }; })
          : Promise.resolve({ data: [] })
      ]);

      // 1. Process Bachs live payments
      if (paymentsResult?.data && paymentsResult.data.length > 0) {
        paymentsResult.data.forEach(p => processItem(p));
      }

      // 2. Process legacy dues_payments
      if (legacyDuesResult?.data && legacyDuesResult.data.length > 0) {
        legacyDuesResult.data.forEach(item => processItem(item));
      }

      // 3. Process departmental_dues
      if (deptDuesResult?.data && deptDuesResult.data.length > 0) {
        deptDuesResult.data.forEach(item => processItem(item));
      }

      // 4. Process local storage verified payments database
      try {
        const localPays = getLocalPaymentsDatabase();
        if (Array.isArray(localPays)) {
          const userLocal = localPays.filter(p => 
            (p.student_matric && (p.student_matric.toUpperCase() === cleanMatric || p.student_matric.replace(/\D/g, '') === strippedDigits)) ||
            (p.registration_number && (p.registration_number.toUpperCase() === cleanMatric || p.registration_number.replace(/\D/g, '') === strippedDigits))
          );
          userLocal.forEach(p => processItem(p));
        }
      } catch (err) {
        console.warn('Local payments check error:', err);
      }

      const clearedRecord = null;

      if (clearedRecord) {
        const profLevel = String(clearedRecord.level || clearedRecord.current_level || studentHomeLevel).match(/\d{3}/)?.[0] || studentHomeLevel;
        const existingPaidForLevel = allRecords.find(r => r.levelNum === profLevel && r.isPaid);
        if (!existingPaidForLevel) {
          processItem({
            id: `prof-${cleanMatric}-${profLevel}`,
            reference: clearedRecord.receipt_no || `NACOS/DUES/${cleanMatric || 'FUTO'}-${profLevel}L`,
            amount: clearedRecord.dues_amount || duesFeeRef.current || duesFee || 0,
            status: 'successful',
            level: profLevel,
            session: progression.academicSession || currentUser?.academic_session || getActiveAcademicSession(),
            paid_at: clearedRecord.dues_paid_at || new Date().toISOString()
          });
        }

        // Update local user object to maintain cross-device sync
        if (!currentUser?.dues_cleared) {
          const updated = {
            ...currentUser,
            dues_cleared: true,
            has_paid_dues: true,
            payment_status: 'cleared',
            dues_paid_at: clearedRecord.dues_paid_at || new Date().toISOString()
          };
          try {
            localStorage.setItem('nacos_user', JSON.stringify(updated));
            window.dispatchEvent(new Event('nacos_user_updated'));
          } catch (_) {}
          setUser(updated);
        }
      }

      // 6. Fallback to profile flags for student's active level if marked cleared
      if (
        currentUser?.dues_cleared === true ||
        currentUser?.has_paid_dues === true ||
        ['cleared', 'successful', 'verified', 'paid'].includes(String(currentUser?.payment_status).toLowerCase())
      ) {
        const existingPaidForLevel = allRecords.find(r => r.levelNum === studentHomeLevel && r.isPaid);
        if (!existingPaidForLevel) {
          processItem({
            id: `prof-${cleanMatric}-${studentHomeLevel}`,
            reference: currentUser.receipt_no || currentUser.payment_reference || `NACOS/DUES/${cleanMatric || 'FUTO'}-${studentHomeLevel}L`,
            amount: currentUser.dues_amount || duesFeeRef.current || duesFee || 0,
            status: 'successful',
            level: studentHomeLevel,
            session: progression.academicSession || currentUser.academic_session || getActiveAcademicSession(),
            paid_at: currentUser.dues_paid_at || new Date().toISOString()
          });
        }
      }

      // Deduplicate records by receiptNo or transactionId
      const seenKeys = new Set();
      const uniqueRecords = [];
      for (const rec of allRecords) {
        const key = rec.receiptNo || rec.transactionId || rec.id;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          uniqueRecords.push(rec);
        }
      }

      // Sort latest first
      uniqueRecords.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      const finalPaidSum = uniqueRecords.filter(r => r.isPaid).reduce((acc, r) => acc + (r.rawAmount || 0), 0);
      setPaymentHistoryList(prev => {
        if (uniqueRecords.length > 0) return uniqueRecords;
        if (prev && prev.some(r => r.isPaid)) return prev;
        return uniqueRecords;
      });
      setLevelDuesMap(prev => {
        const merged = { ...newMap };
        ['100', '200', '300', '400', '500'].forEach(k => {
          if (!merged[k] && prev[k]?.isPaid) {
            merged[k] = prev[k];
          }
          if (confirmedPaidLevelsRef.current.has(k) && !merged[k]) {
            const histItem = uniqueRecords.find(r => r.isPaid && r.levelNum === k);
            if (histItem) {
              merged[k] = histItem;
            } else if (prev[k]?.isPaid) {
              merged[k] = prev[k];
            } else {
              merged[k] = {
                id: `confirmed-${cleanMatric}-${k}`,
                receiptNo: currentUser?.receipt_no || `NACOS/DUES/${cleanMatric || 'FUTO'}-${k}L`,
                transactionId: currentUser?.receipt_no || 'TX-CONFIRMED',
                date: 'Confirmed',
                time: '',
                paymentDate: 'Confirmed (Database Verified)',
                amount: duesFee ? `₦${Number(duesFee).toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : '—',
                rawAmount: Number(duesFee || 0),
                status: 'PAID',
                isPaid: true,
                session: currentUser?.academic_session || getActiveAcademicSession(),
                level: `${k} LEVEL`,
                levelNum: k,
                paymentType: 'Departmental Dues (Full Payment)',
                studentName: (currentUser?.full_name || currentUser?.name || 'Student Member').trim(),
                matricNo: cleanMatric,
                department: currentUser?.department || 'Computer Science',
                created_at: new Date().toISOString()
              };
            }
          }
          if (merged[k]?.isPaid) {
            confirmedPaidLevelsRef.current.add(k);
          }
        });
        return merged;
      });
      setTotalLifetimeDues(finalPaidSum);

      // Revocation status check
      const userIsRevoked = String(currentUser?.payment_status).toLowerCase() === 'revoked' || currentUser?.dues_revoked === true;
      if (userIsRevoked) {
        setIsRevoked(true);
        setRevocationReason(currentUser?.dues_revocation_reason || 'Departmental dues clearance was officially revoked by administration. A new dues payment is required to restore clearance.');
      } else {
        setIsRevoked(false);
        setRevocationReason('');
      }
    } finally {
      inFlightCheckRef.current = false;
      setIsStatusChecking(false);
      setIsInitialLoading(false);
    }
  };

  // Cross-tab Polling & Listener
  const startAwaitingPaymentSync = (ref, checkoutId, targetLevel) => {
    let attempts = 0;
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    const checkPayment = async () => {
      attempts++;
      try {
        const queryParams = new URLSearchParams();
        if (ref) queryParams.set('reference', ref);
        if (checkoutId) queryParams.set('checkoutId', checkoutId);
        const matric = user?.registration_number || user?.matric;
        if (matric) queryParams.set('registrationNumber', matric);
        queryParams.set('paymentType', 'DEPARTMENTAL_DUES');

        const resp = await fetch(`/api/payments/status?${queryParams.toString()}`);
        if (resp.ok) {
          const data = await resp.json();
          if (data.isPaid || data.status === 'successful') {
            clearInterval(pollTimerRef.current);
            setIsAwaitingGateway(false);

            // Update user record in session
            const updatedUser = {
              ...user,
              dues_cleared: true,
              has_paid_dues: true,
              payment_status: 'cleared',
              receipt_no: data.reference || ref,
              dues_paid_at: new Date().toISOString()
            };
            localStorage.setItem('nacos_user', JSON.stringify(updatedUser));
            setUser(updatedUser);
            window.dispatchEvent(new Event('nacos_user_updated'));

            await checkStatus(updatedUser);

            // Update notification and prepare receipt without abrupt screen takeover
            setNotification({
              type: 'success',
              message: `Payment confirmed! Departmental dues clearance for ${targetLevel} Level has been approved and recorded.`
            });

            const receiptPayload = {
              receiptNo: data.reference || ref || `NACOS/DUES/${matric}-${targetLevel}L`,
              transactionId: data.payment?.provider_payment_id || data.reference || ref || 'TX-CONFIRMED',
              date: new Date().toLocaleDateString('en-GB'),
              time: new Date().toLocaleTimeString('en-GB'),
              studentName: (user.full_name || user.name || 'Student Member').trim(),
              matricNo: matric || '',
              department: user.department || 'Computer Science',
              level: `${targetLevel} LEVEL`,
              session: formSession,
              amount: data.amount ? `₦${Number(data.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : (duesFee ? `₦${Number(duesFee).toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : '₦0.00'),
              rawAmount: data.amount || duesFee || 0,
              paymentType: 'Departmental Dues (Full Payment)',
              paymentMethod: 'Online Gateway (Confirmed)',
              status: 'APPROVED'
            };
            navigate(`/receipt?reference=${encodeURIComponent(receiptPayload.receiptNo)}&type=dues`, {
              state: { receiptData: receiptPayload }
            });
            return;
          }
        }
      } catch (err) {
        console.warn('Cross-tab sync poll error:', err);
      }

      if (attempts >= 20) {
        clearInterval(pollTimerRef.current);
        setIsAwaitingGateway(false);
      }
    };

    pollTimerRef.current = setInterval(checkPayment, 5000);
  };

  useEffect(() => {
    // Check for explicit callback from payment gateway (URL: ?payment=verifying&reference=...)
    try {
      const paymentAction = searchParams.get('payment');
      const ref = searchParams.get('reference');
      const chkId = searchParams.get('checkout_id') || searchParams.get('checkoutId');

      // Strip query parameters from URL immediately so subsequent page refreshes do NOT re-trigger this
      if (paymentAction || ref || chkId) {
        try {
          window.history.replaceState({}, '', window.location.pathname);
        } catch (_) {}
      }

      if (paymentAction === 'verifying' && (ref || chkId)) {
        setIsAwaitingGateway(true);
        setGatewayRef(chkId || ref);
        startAwaitingPaymentSync(ref, chkId, formLevel);
      } else if (paymentAction === 'cancelled') {
        showNotification('Payment process was cancelled. You can retry checkout when you are ready.', 'info');
      }
    } catch (_) {}

    // Cross-tab broadcast listener (when payment succeeds in another tab)
    let channel = null;
    try {
      channel = new BroadcastChannel('nacos_payment_sync');
      channel.onmessage = async (event) => {
        if (event.data?.status === 'successful' && (event.data.paymentType === 'dues' || event.data.paymentType === 'departmental_dues' || !event.data.paymentType)) {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setIsAwaitingGateway(false);
          const stored = localStorage.getItem('nacos_user');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              setUser(parsed);
              await checkStatus(parsed);

              const matric = parsed.registration_number || parsed.matric_number || parsed.matric || '';
              const targetLevel = event.data.level || parsed.level || '300';
              const resolvedFee = duesFeeRef.current || 0;
              const receiptPayload = {
                receiptNo: event.data.reference || parsed.receipt_no || `NACOS/DUES/${matric}-${targetLevel}L`,
                transactionId: event.data.reference || 'TX-CONFIRMED',
                date: new Date().toLocaleDateString('en-GB'),
                time: new Date().toLocaleTimeString('en-GB'),
                studentName: (parsed.full_name || parsed.name || 'Student Member').trim(),
                matricNo: matric,
                department: parsed.department || 'Computer Science',
                level: `${targetLevel} LEVEL`,
                session: formSessionRef.current || getActiveAcademicSession(),
                amount: event.data.amount ? `₦${Number(event.data.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : `₦${Number(resolvedFee).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
                rawAmount: event.data.amount || resolvedFee,
                paymentType: 'Departmental Dues (Full Payment)',
                paymentMethod: 'Online Gateway (Confirmed)',
                status: 'APPROVED'
              };
              navigate(`/receipt?reference=${encodeURIComponent(receiptPayload.receiptNo)}&type=dues`, {
                state: { receiptData: receiptPayload }
              });
            } catch (e) {}
          }
        }
      };
    } catch (e) {}

    const handleStorageEvent = (e) => {
      if (e.key === 'nacos_last_payment_success' || e.key === 'nacos_user') {
        const stored = localStorage.getItem('nacos_user');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            const enriched = enrichStudentProfile(parsed) || parsed;
            setUser(enriched);
            checkStatus(enriched);
          } catch (err) {}
        }
      } else if (e.key === 'nacos_dues_settings_db') {
        try {
          const ds = JSON.parse(e.newValue || '{}');
          if (ds?.dues_amount && !isNaN(Number(ds.dues_amount))) {
            setDuesFee(Number(ds.dues_amount));
          }
        } catch (_) {}
      }
    };

    const handleUserUpdated = () => {
      const stored = localStorage.getItem('nacos_user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const enriched = enrichStudentProfile(parsed) || parsed;
          setUser(enriched);
          checkStatus(enriched);
        } catch (err) {}
      }
    };

    window.addEventListener('storage', handleStorageEvent);
    window.addEventListener('nacos_user_updated', handleUserUpdated);

    const handleDuesSettingsUpdated = (e) => {
      if (e.detail?.dues_amount && !isNaN(Number(e.detail.dues_amount))) {
        setDuesFee(Number(e.detail.dues_amount));
      } else {
        getDuesSettings().then(ds => {
          if (ds?.dues_amount && !isNaN(Number(ds.dues_amount))) {
            setDuesFee(Number(ds.dues_amount));
          }
        }).catch(() => {});
      }
    };
    window.addEventListener('nacos_dues_settings_updated', handleDuesSettingsUpdated);

    const unsubSession = onAcademicSessionChange(({ sessionName }) => {
      if (sessionName) setFormSession(sessionName);
      handleUserUpdated();
    });

    // Real-time table subscription on Supabase payments & dues_payments
    let liveChannel = null;
    const cleanMatric = String(user?.registration_number || user?.matric || '').trim().toUpperCase();
    if (supabase && cleanMatric) {
      try {
        liveChannel = supabase
          .channel(`dues-live-${cleanMatric}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'payments',
              filter: `registration_number=eq.${cleanMatric}`
            },
            () => {
              checkStatus(userRef.current);
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'dues_payments',
              filter: `registration_number=eq.${cleanMatric}`
            },
            () => {
              checkStatus(userRef.current);
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('Real-time subscription notice:', err);
      }
    }

    // Automatic authoritative recheck when student switches back to this tab / window focuses
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        const stored = localStorage.getItem('nacos_user');
        let current = userRef.current;
        if (stored) {
          try { current = JSON.parse(stored); } catch (_) {}
        }
        checkStatus(current);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    // Initial Parallel Load
    const init = async () => {
      const stored = localStorage.getItem('nacos_user');
      let currentUser = user;
      if (stored) {
        try {
          currentUser = enrichStudentProfile(JSON.parse(stored)) || JSON.parse(stored);
          setUser(currentUser);
        } catch (e) {}
      }

      try {
        await Promise.all([
          withTimeout(getDuesSettings(), 6000)
            .then(ds => {
              if (ds?.dues_amount != null && !isNaN(Number(ds.dues_amount)) && Number(ds.dues_amount) > 0) {
                setDuesFee(Number(ds.dues_amount));
              }
              if (ds?.academic_session) {
                setFormSession(ds.academic_session);
              }
            })
            .catch(() => {}),
          checkStatus(currentUser)
        ]);
      } finally {
        setIsInitialLoading(false);
      }
    };

    init();

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (channel) channel.close();
      if (liveChannel) {
        try { supabase.removeChannel(liveChannel); } catch (_) {}
      }
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('nacos_user_updated', handleUserUpdated);
      window.removeEventListener('nacos_dues_settings_updated', handleDuesSettingsUpdated);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      if (unsubSession) unsubSession();
    };
  }, []);

  // Initiate Dues Payment
  const handleOpenNewInvoice = () => {
    setIsNewInvoiceOpen(true);
  };

  const handleSubmitNewInvoice = () => {
    const prog = calculateAcademicProgression(user, getActiveAcademicSession());
    const maxAllowedLvl = (prog?.numericLevel || 1) * 100;
    const lvlNum = parseInt(String(formLevel).replace(/\D/g, ''), 10);
    if (!isNaN(lvlNum) && lvlNum > maxAllowedLvl) {
      alert(`Payment not allowed: You cannot initiate payment for future academic level (${lvlNum} Level). Your active level is ${prog?.levelString || '100 Level'}.`);
      return;
    }

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
    setIsNewInvoiceOpen(false);
    executeCheckout(null, gatewayTab);
  };

  // Authoritative Checkout Handler: Opens Gateway in New Tab
  const executeCheckout = async (actionToken = null, existingGatewayTab = null, targetLevel = null, targetSession = null) => {
    setIsProcessing(true);
    const activeLevel = targetLevel || formLevel;
    const activeSession = targetSession || formSession;

    // Progressive academic-level guard: students cannot pay for future levels
    const prog = calculateAcademicProgression(user, getActiveAcademicSession());
    const maxAllowedLvl = (prog?.numericLevel || 1) * 100;
    const lvlInt = parseInt(String(activeLevel).replace(/\D/g, ''), 10);
    if (!isNaN(lvlInt) && lvlInt > maxAllowedLvl) {
      if (existingGatewayTab && !existingGatewayTab.closed) {
        existingGatewayTab.close();
      }
      setIsProcessing(false);
      alert(`Payment not allowed: You cannot initiate payment for future academic level (${lvlInt} Level). Your active level is ${prog?.levelString || '100 Level'}.`);
      return;
    }

    try {
      const resp = await fetch('/api/payments/dues/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': actionToken ? `Bearer ${actionToken}` : ''
        },
        body: JSON.stringify({
          student: user,
          academicSession: activeSession,
          level: activeLevel,
          stepUpToken: actionToken
        })
      });

      const data = await resp.json();

      if (data.checkoutUrl) {
        // Broadcast to localStorage for seamless cross-window sync
        try {
          localStorage.setItem('nacos_active_gateway_redirect', JSON.stringify({
            checkoutUrl: data.checkoutUrl,
            timestamp: Date.now()
          }));
        } catch (_) {}

        // 1. Direct gateway window to checkoutUrl
        let gatewayTab = existingGatewayTab;
        if (gatewayTab && !gatewayTab.closed) {
          try {
            gatewayTab.location.replace(data.checkoutUrl);
          } catch (_) {
            try { gatewayTab.location.href = data.checkoutUrl; } catch (_) {}
          }
        } else {
          try {
            window.open(data.checkoutUrl, '_blank');
          } catch (_) {}
        }

        // 2. Close New Invoice Form
        setIsNewInvoiceOpen(false);

        // 3. Keep current portal tab active with live listening
        setIsAwaitingGateway(true);
        setGatewayRef(data.providerCheckoutId || data.reference || '');
        startAwaitingPaymentSync(data.reference, data.providerCheckoutId, activeLevel);
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
        setIsProcessing(false);
        showNotification(data.error, 'error');
        return;
      }

      // Safe local fallback
      const matric = user?.registration_number || user?.matric || '';
      const res = await recordStudentPayment(matric, duesFee);
      if (res.success) {
        const updatedUser = {
          ...user,
          dues_cleared: true,
          has_paid_dues: true,
          payment_status: 'cleared',
          receipt_no: res.payment.payment_reference,
          dues_paid_at: new Date().toISOString()
        };
        localStorage.setItem('nacos_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        window.dispatchEvent(new Event('nacos_user_updated'));
        await checkStatus(updatedUser);
        setIsNewInvoiceOpen(false);
      }
    } catch (e) {
      console.error('Payment error:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  // Load Official In-Portal POS Receipt View for a specific row
  const handleOpenPosReceipt = (row, isInvoice = false) => {
    const payload = {
      ...row,
      isInvoice,
      isPaid: !isInvoice,
      paymentType: row.paymentType || 'Departmental Dues Clearance',
      department: user?.department || 'Computer Science',
      studentName: (user?.full_name || user?.name || 'Student Member').trim(),
      matricNo: user?.matric || user?.registration_number || '',
      session: row.session || formSession || getActiveAcademicSession(),
      level: row.level || (formLevel ? `${formLevel} Level` : '')
    };
    navigate(`/receipt?reference=${encodeURIComponent(row.receiptNo || row.id)}&type=dues${isInvoice ? '&invoice=true' : ''}`, {
      state: { receiptData: payload }
    });
  };

  const handlePayLevel = (lvl, session = null) => {
    const lvlNum = String(lvl || '').replace(/\D/g, '') || formLevel;
    const targetSession = session || formSession;

    // Validate level eligibility against student's current active level
    const prog = calculateAcademicProgression(user, getActiveAcademicSession());
    const maxAllowedLvl = (prog?.numericLevel || 1) * 100;
    if (parseInt(lvlNum, 10) > maxAllowedLvl) {
      alert(`Payment not allowed: You cannot initiate payment for future academic level (${lvlNum} Level). Your active academic level is ${prog?.levelString || '100 Level'}.`);
      return;
    }

    setFormLevel(lvlNum);
    if (session) {
      setFormSession(session);
    }

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

    executeCheckout(null, gatewayTab, lvlNum, targetSession);
  };

  // Progressive Academic-Level Representation:
  // Students only see payment options/rows for levels they have reached under the active session.
  // Preserves any historical paid dues for previously completed levels even if session moves backwards.
  const progression = calculateAcademicProgression(user, getActiveAcademicSession());
  const admissionYear = progression?.admissionYear || extractEntryYearFromRegNumber(user?.registration_number || user?.matric) || 2024;
  const reachableLevels = getProgressiveLevels(user);
  const paidHistoricalLevels = Object.keys(levelDuesMap).filter(lvl => {
    const p = levelDuesMap[lvl];
    return p && p.isPaid && !reachableLevels.includes(lvl);
  });
  const paidFromHistoryLevels = paymentHistoryList
    .filter(p => p.isPaid)
    .map(p => String(p.levelNum || p.level || '').match(/\d{3}/)?.[0])
    .filter(Boolean);
  const ACADEMIC_LEVELS = Array.from(new Set([
    ...reachableLevels,
    ...paidHistoricalLevels,
    ...paidFromHistoryLevels,
    ...Array.from(confirmedPaidLevelsRef.current)
  ])).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  const duesRowsByLevel = ACADEMIC_LEVELS.map(lvl => {
    const lvlNum = parseInt(lvl, 10);
    const cohortStartYear = admissionYear + (lvlNum / 100 - 1);
    const defaultSession = `${cohortStartYear}/${cohortStartYear + 1}`;

    const paidRow = levelDuesMap[lvl] || paymentHistoryList.find(p => p.isPaid && String(p.levelNum || p.level || '').replace(/\D/g, '') === lvl);
    const anyRow = paidRow || paymentHistoryList.find(p => String(p.levelNum || p.level || '').replace(/\D/g, '') === lvl);
    const isMatrixPaid = Boolean(initialCache?.levelClearanceMatrix?.[lvl]?.dues);
    const isPaid = Boolean((paidRow && paidRow.isPaid) || isMatrixPaid || confirmedPaidLevelsRef.current.has(lvl));
    if (isPaid) {
      confirmedPaidLevelsRef.current.add(lvl);
    }

    const session = paidRow?.session || anyRow?.session || defaultSession;
    // For paid rows, show what was actually paid from receipt.
    // For unpaid rows, ALWAYS show the live price of the moment from the database!
    const amountVal = isPaid ? (paidRow?.rawAmount || duesFee) : duesFee;
    const amountFormatted = amountVal != null && !isNaN(Number(amountVal)) && Number(amountVal) > 0
      ? `₦${Number(amountVal).toLocaleString('en-NG')}`
      : (duesFee != null && Number(duesFee) > 0 ? `₦${Number(duesFee).toLocaleString('en-NG')}` : '—');

    const fallbackReceiptNo = user?.receipt_no || `NACOS/DUES/${cleanMatric || 'FUTO'}-${lvl}L`;
    const fallbackTxId = user?.receipt_no || 'TX-CONFIRMED';
    const fallbackPayment = paidRow || (isPaid ? {
      id: `dues-row-${cleanMatric}-${lvl}`,
      receiptNo: fallbackReceiptNo,
      transactionId: fallbackTxId,
      amount: amountFormatted,
      rawAmount: amountVal || duesFee || 0,
      session,
      level: `${lvl} Level`,
      levelNum: lvl,
      status: 'PAID',
      isPaid: true,
      date: 'Confirmed',
      studentName: (user?.full_name || user?.name || 'Student Member').trim(),
      matricNo: cleanMatric,
      department: user?.department || 'Computer Science'
    } : null);

    return {
      levelCode: lvl,
      level: `${lvl} Level`,
      details: `${lvl} Level Dues`,
      session,
      amount: amountFormatted,
      rawAmount: amountVal || duesFee || 0,
      isPaid,
      status: isPaid ? 'PAID' : 'UNPAID',
      payment: fallbackPayment,
      receiptNo: paidRow?.receiptNo || (isPaid ? fallbackReceiptNo : null),
      transactionId: paidRow?.transactionId || (isPaid ? fallbackTxId : null),
      date: paidRow?.date || (isPaid ? 'Confirmed' : null)
    };
  });

  return (
    <PortalLayout>
      <div className="space-y-6">

        {/* Top Header */}
        <div className="print:hidden">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Departmental Dues &amp; Levies
          </h1>
        </div>

        {/* Notification Banner */}
        {notification?.message && (
          <div className={`p-4 rounded-xl flex items-center gap-3 border shadow-xs animate-in fade-in slide-in-from-top-2 duration-200 ${
            notification.type === 'error'
              ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-200'
              : notification.type === 'info'
                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60 text-blue-800 dark:text-blue-200'
                : 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-900/60 text-green-800 dark:text-green-200'
          }`}>
            {notification.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
            )}
            <p className="text-xs sm:text-sm font-medium flex-1">{notification.message}</p>
            <button
              type="button"
              onClick={() => setNotification({ message: '', type: '' })}
              className="text-xs opacity-70 hover:opacity-100 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Revocation Alert Banner */}
        {isRevoked && (
          <div className="p-5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 space-y-3 shadow-xs print:hidden">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-red-900 dark:text-red-100">
                  Departmental Dues Clearance Revoked
                </h3>
                <p className="text-xs text-red-700 dark:text-red-200">
                  {revocationReason || 'Your clearance standing was officially revoked by administration. A new dues payment is required to restore your clearance.'}
                </p>
              </div>
            </div>
            <div className="pt-1 flex items-center gap-3">
              <button
                type="button"
                onClick={handleOpenNewInvoice}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer shadow-xs"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pay Dues Now to Restore Clearance {duesFee ? `(₦${Number(duesFee).toLocaleString()})` : ''}</span>
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* BALANCED LEVEL-BY-LEVEL SCHOOL DUES OBLIGATIONS & HISTORY TABLE      */}
        {/* ==================================================================== */}
        <div className="bg-white dark:bg-[#083002] rounded-xl border border-gray-200/80 dark:border-[#138601]/30 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] table-fixed border-collapse text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-gray-200/70 dark:border-[#138601]/20 bg-gray-50/70 dark:bg-[#041801]/60 text-gray-500 dark:text-green-200/70 font-semibold text-[11px] sm:text-xs tracking-wider">
                  <th className="w-[18%] py-3.5 px-4 sm:px-6">Academic Level</th>
                  <th className="w-[22%] py-3.5 px-4 sm:px-6">Payment Details</th>
                  <th className="w-[18%] py-3.5 px-4 sm:px-6">Session</th>
                  <th className="w-[14%] py-3.5 px-4 sm:px-6">Amount ₦</th>
                  <th className="w-[13%] py-3.5 px-4 sm:px-6">Status</th>
                  <th className="w-[15%] py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#138601]/15 text-gray-800 dark:text-gray-100">
                {duesRowsByLevel.map((row) => (
                  <tr key={row.levelCode} className="hover:bg-gray-50/60 dark:hover:bg-[#041801]/40 transition-colors">
                    <td className="py-4 px-4 sm:px-6 font-bold text-gray-900 dark:text-white text-xs sm:text-sm">
                      {row.level}
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-xs sm:text-sm text-gray-700 dark:text-gray-200 font-medium truncate">
                      {row.details}
                    </td>
                    <td className="py-4 px-4 sm:px-6 font-mono text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                      {row.session}
                    </td>
                    <td className="py-4 px-4 sm:px-6 font-semibold text-gray-900 dark:text-white text-xs sm:text-sm">
                      {row.amount}
                    </td>
                    <td className="py-4 px-4 sm:px-6">
                      {row.isPaid ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-100 text-[#0e8040] dark:bg-emerald-950/60 dark:text-[#4bd043]">
                          <BadgeCheck className="w-3.5 h-3.5" />
                          PAID
                        </span>
                      ) : isInitialLoading ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-gray-100 text-gray-500 dark:bg-green-950/40 dark:text-green-300/80">
                          <Loader className="w-3 h-3 animate-spin text-gray-400" />
                          <span>Verifying...</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-gray-100 text-gray-700 dark:bg-[#041801] dark:text-gray-300">
                          <Clock className="w-3 h-3" />
                          UNPAID
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-right">
                      {row.isPaid ? (
                        <button
                          type="button"
                          onClick={() => handleOpenPosReceipt(row.payment || {
                            receiptNo: row.receiptNo,
                            transactionId: row.transactionId,
                            amount: row.amount,
                            rawAmount: row.rawAmount,
                            level: row.level,
                            session: row.session,
                            date: row.date
                          }, false)}
                          className="inline-block px-3 py-1.5 rounded-md text-xs font-semibold text-[#0e8040] hover:text-[#0b6a34] bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/40 transition-colors cursor-pointer"
                        >
                          Print Receipt
                        </button>
                      ) : isInitialLoading ? (
                        <div className="h-7 w-20 bg-gray-100 dark:bg-green-950/40 rounded-md animate-pulse ml-auto" />
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePayLevel(row.levelCode, row.session)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-[#0e8040] hover:bg-[#0b6a34] shadow-xs transition-colors cursor-pointer active:scale-95"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Pay Now</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* NEW INVOICE MODAL / "SELECT SESSION" (Matching User Image 2 Exactly)  */}
        {/* ==================================================================== */}
        {isNewInvoiceOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="relative max-w-2xl w-full bg-white dark:bg-[#083002] rounded-xl border border-gray-200 dark:border-[#138601]/40 shadow-2xl p-6 sm:p-8 space-y-6">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-[#138601]/25">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                    Select Session
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-green-200/70 mt-0.5">
                    Generate an official departmental dues clearance invoice.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewInvoiceOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body (Matching Image 2 field-for-field) */}
              <div className="space-y-5">
                
                {/* 1. Academic Session */}
                <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 sm:gap-4">
                  <label className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Academic Session
                  </label>
                  <div className="sm:col-span-2 relative">
                    <select
                      value={formSession}
                      onChange={(e) => setFormSession(e.target.value)}
                      className="w-full appearance-none px-4 py-2.5 pr-10 text-xs sm:text-sm rounded-lg border border-gray-200 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0e8040] cursor-pointer"
                    >
                      {SUPPORTED_ACADEMIC_SESSIONS.map((sess) => (
                        <option key={sess} value={sess}>
                          {sess} Academic Session
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 dark:text-green-300 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 2. Payment Type */}
                <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 sm:gap-4">
                  <label className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Payment Type
                  </label>
                  <div className="sm:col-span-2 relative">
                    <select
                      value={formPaymentType}
                      onChange={(e) => setFormPaymentType(e.target.value)}
                      className="w-full appearance-none px-4 py-2.5 pr-10 text-xs sm:text-sm rounded-lg border border-gray-200 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0e8040] cursor-pointer"
                    >
                      <option value="Departmental Dues - Full Payment">
                        Departmental Dues (Full Payment{duesFee ? ` - ₦${Number(duesFee).toLocaleString()}` : ''})
                      </option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 dark:text-green-300 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 3. Level (PROGRESSIVE DETERMINATION - Users cannot see levels ahead of them) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 sm:gap-4">
                  <label className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Level
                  </label>
                  <div className="sm:col-span-2 relative">
                    <select
                      value={formLevel}
                      onChange={(e) => setFormLevel(e.target.value)}
                      className="w-full appearance-none px-4 py-2.5 pr-10 text-xs sm:text-sm rounded-lg border border-[#0e8040] dark:border-[#138601] bg-white dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0e8040] cursor-pointer font-medium"
                    >
                      {progressiveLevels.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl} Level
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 dark:text-green-300 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Already Paid Warning in Modal */}
                {(() => {
                  const paidRow = levelDuesMap[formLevel];
                  if (paidRow && paidRow.isPaid) {
                    return (
                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200">
                        <span>This level is already cleared and verified.</span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsNewInvoiceOpen(false);
                            handleOpenPosReceipt(paidRow, false);
                          }}
                          className="font-bold underline cursor-pointer text-[#0e8040] dark:text-[#4bd043]"
                        >
                          View Receipt
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()}

              </div>

              {/* Modal Footer with "Pay Now" Button */}
              <div className="pt-4 border-t border-gray-100 dark:border-[#138601]/25 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewInvoiceOpen(false)}
                  className="px-4 py-2.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#041801] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                {(() => {
                  const isAlreadyPaid = Boolean(levelDuesMap[formLevel]?.isPaid);
                  return (
                    <button
                      type="button"
                      onClick={handleSubmitNewInvoice}
                      disabled={isProcessing || isAlreadyPaid}
                      className="px-6 py-2.5 rounded-lg text-xs sm:text-sm font-semibold text-white bg-[#0e8040] hover:bg-[#0b6a34] transition-all cursor-pointer shadow-xs inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? <Loader className="w-4 h-4 animate-spin" /> : null}
                      <span>{isAlreadyPaid ? 'Already Paid' : (duesFee ? `Make Payment (₦${Number(duesFee).toLocaleString()})` : 'Make Payment')}</span>
                      {!isAlreadyPaid && !isProcessing && <ExternalLink className="w-4 h-4" />}
                    </button>
                  );
                })()}
              </div>

            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* CROSS-TAB GATEWAY LISTENING OVERLAY (Opens Gateway in New Tab)        */}
        {/* ==================================================================== */}
        {isAwaitingGateway && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="max-w-md w-full bg-white dark:bg-[#083002] rounded-2xl border border-gray-200 dark:border-[#138601]/40 shadow-2xl p-6 sm:p-8 text-center space-y-5">
              <div className="flex items-center justify-center mx-auto py-2">
                <img
                  src="https://res.cloudinary.com/a2mmcttn/image/upload/v1791451674/DICT_Synergy_Logo.png"
                  alt="Loading"
                  className="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 object-contain animate-spin select-none pointer-events-none"
                  style={{ animationDuration: '3s' }}
                />
              </div>

              <div className="space-y-2">
                <span className="inline-block px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-[#0e8040] dark:bg-emerald-950/70 dark:text-[#4bd043]">
                  Secure Gateway Opened in New Tab
                </span>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Awaiting Payment Confirmation
                </h3>
                <p className="text-xs text-gray-600 dark:text-green-100/80 leading-relaxed">
                  We opened the secure checkout window in a new tab. Please complete payment there. This page will <strong>automatically refresh and display your official receipt</strong> once payment is received.
                </p>
              </div>

              {gatewayRef && (
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/20 text-xs font-mono text-gray-600 dark:text-green-200 break-all">
                  Ref: <span className="font-bold text-[#0e8040] dark:text-[#4bd043]">{gatewayRef}</span>
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => checkStatus(user)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-[#0e8040] hover:bg-[#0b6a34] transition-colors cursor-pointer shadow-xs inline-flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Check Status Now</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAwaitingGateway(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#041801] transition-colors cursor-pointer"
                >
                  Close Waiting Notice
                </button>
              </div>
            </div>
          </div>
        )}



        {/* Step-Up Authentication Modal */}
        <StepUpAuthModal
          isOpen={isStepUpOpen}
          onClose={() => setIsStepUpOpen(false)}
          onSuccess={(token) => executeCheckout(token)}
          purpose="PAYMENT_CONFIRMATION"
          title="Confirm Departmental Dues Payment"
          description={`Verify your identity before proceeding to secure payment checkout for ${formLevel} Level (${formSession}).`}
          user={user}
        />

      </div>
    </PortalLayout>
  );
};

export default Dues;
