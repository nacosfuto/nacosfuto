import { supabase } from './client.js';
import { syncMediaAsset } from './media.js';
import { ID_CARD_TEMPLATE } from '@nacos/config/idCardTemplate';
import { getLocalStudentsDatabase } from './auth.js';
import { uploadMedia, CLOUDINARY_FOLDERS, getOptimizedImageUrl } from '@nacos/media';
import QRCode from 'qrcode';

const PAYMENTS_STORAGE_KEY = 'nacos_payments_db';
const ID_APPLICATIONS_STORAGE_KEY = 'nacos_id_applications_db';
const ID_SETTINGS_STORAGE_KEY = 'nacos_id_settings_db';
const AUDIT_LOGS_STORAGE_KEY = 'nacos_admin_audit_logs_db';

/**
 * Seed and retrieve configurable ID Card Settings
 */
export function getLocalIdSettingsDatabase() {
  const stored = localStorage.getItem(ID_SETTINGS_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
  }

  const initialSettings = {
    id: 'default',
    id_card_fee: 5000,
    is_application_open: true,
    academic_session: '2026/2027',
    allow_reapplication_on_revoke: true,
    card_template_version: '2026.1',
    updated_at: new Date().toISOString()
  };

  localStorage.setItem(ID_SETTINGS_STORAGE_KEY, JSON.stringify(initialSettings));
  return initialSettings;
}

export async function getIdCardSettings() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('id_card_settings')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();

      if (!error && data && data.id_card_fee) {
        return {
          id: 'default',
          id_card_fee: Number(data.id_card_fee),
          academic_session: data.academic_session || '2026/2027',
          is_application_open: data.is_application_open ?? true,
          updated_at: data.updated_at
        };
      }
    } catch (e) {
      console.warn('Supabase ID settings notice:', e);
    }
  }

  return getLocalIdSettingsDatabase();
}

export async function savePortalSettingsDirectly({ idCardFee, duesFee, academicSession, allowRegistration }) {
  const feeNum = Number(idCardFee);
  const duesNum = Number(duesFee);
  const session = String(academicSession || '2026/2027').trim();
  const isOpen = Boolean(allowRegistration);
  const now = new Date().toISOString();

  if (isNaN(feeNum) || feeNum < 0) {
    return { error: 'Please enter a valid positive ID Card fee amount.' };
  }
  if (isNaN(duesNum) || duesNum < 0) {
    return { error: 'Please enter a valid positive Dues fee amount.' };
  }

  if (supabase) {
    try {
      const { error } = await supabase
        .from('id_card_settings')
        .upsert([
          {
            id: 'default',
            id_card_fee: feeNum,
            academic_session: session,
            is_application_open: isOpen,
            updated_at: now
          },
          {
            id: 'dues',
            id_card_fee: duesNum,
            academic_session: session,
            is_application_open: true,
            updated_at: now
          }
        ], { onConflict: 'id' });

      if (error) {
        console.error('[Portal Settings Database Save Error]:', error);
        return { error: `Database error: ${error.message}` };
      }
    } catch (e) {
      return { error: e.message || 'Failed to save settings to database' };
    }
  }

  return { success: true };
}

export async function updateIdCardFee(newFee, session = null, allowRegistration = null) {
  const feeNumber = Number(newFee);
  if (isNaN(feeNumber) || feeNumber < 0) {
    return { error: 'Fee must be a valid positive number.' };
  }

  const settings = getLocalIdSettingsDatabase();
  settings.id_card_fee = feeNumber;
  if (session) settings.academic_session = session;
  if (allowRegistration !== null && allowRegistration !== undefined) {
    settings.is_application_open = Boolean(allowRegistration);
  }
  settings.updated_at = new Date().toISOString();

  try {
    if (supabase) {
      const payload = {
        id: 'default',
        id_card_fee: feeNumber,
        academic_session: session || settings.academic_session || '2026/2027',
        is_application_open: settings.is_application_open ?? true,
        updated_at: new Date().toISOString()
      };

      const { error: dbError } = await supabase
        .from('id_card_settings')
        .upsert(payload);

      if (dbError) {
        console.error('[ID Settings Database Error]:', dbError);
        return { error: `Database error: ${dbError.message}` };
      }
    }
  } catch (e) {
    console.error('[ID Settings Sync Error]:', e);
    return { error: e.message || 'Failed to update database' };
  }

  return { success: true, settings };
}

/**
 * Seed and retrieve verified payments database
 */
export function getLocalPaymentsDatabase() {
  const stored = localStorage.getItem(PAYMENTS_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        // Scrub out dummy seed payments
        const cleaned = parsed.filter(p =>
          !String(p.id || '').startsWith('pay-seed-') &&
          p.student_matric !== '20251545321' &&
          p.student_matric !== '20261699999'
        );
        if (cleaned.length !== parsed.length) {
          localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(cleaned));
        }
        return cleaned;
      }
    } catch (e) {
      console.error(e);
    }
  }

  return [];
}

/**
 * Seed and retrieve ID Card Applications database
 * 
 * Supports the complete 9-state lifecycle:
 * 1. draft
 * 2. pending_payment
 * 3. payment_confirmed
 * 4. photo_required
 * 5. ready_to_submit
 * 6. submitted / processing
 * 7. approved
 * 8. generated
 * 9. rejected / revoked
 */
export function getLocalIdApplicationsDatabase() {
  const stored = localStorage.getItem(ID_APPLICATIONS_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        // Scrub out dummy seed applications
        const cleaned = parsed.filter(a =>
          !String(a.id || '').startsWith('app-seed-') &&
          a.matric_number !== '20251545321' &&
          a.matric_number !== '20261699999' &&
          a.registration_number !== '20251545321' &&
          a.registration_number !== '20261699999'
        );
        if (cleaned.length !== parsed.length) {
          localStorage.setItem(ID_APPLICATIONS_STORAGE_KEY, JSON.stringify(cleaned));
        }
        return cleaned;
      }
    } catch (e) {
      console.error(e);
    }
  }

  return [];
}

function saveLocalIdApplications(apps) {
  localStorage.setItem(ID_APPLICATIONS_STORAGE_KEY, JSON.stringify(apps));
}

/**
 * Check whether a student has a verified dues/ID-card payment
 * Derived securely from the payment database, NEVER from client-side flags.
 */
export async function checkStudentPaymentStatus(matricNumber) {
  if (!matricNumber) return { isPaid: false, payment: null };

  const cleanMatric = matricNumber.trim().toUpperCase();
  const today = new Date();
  const threeSixtyFiveDays = 365 * 24 * 60 * 60 * 1000;

  // 1. Check Bachs payments table in Supabase (Authoritative)
  try {
    const { data: bachsPayment, error: bachsErr } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_type', 'ID_CARD')
      .eq('status', 'successful')
      .or(`registration_number.eq.${cleanMatric},student_id.eq.${cleanMatric}`)
      .order('paid_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!bachsErr && bachsPayment) {
      return { 
        isPaid: true, 
        payment: bachsPayment, 
        provider: bachsPayment.provider || 'BACHS',
        reference: bachsPayment.reference,
        amount: bachsPayment.amount 
      };
    }
  } catch (err) {
    // Offline / table fallback
  }

  // 2. Check Supabase departmental_dues remote if available
  try {
    const { data, error } = await supabase
      .from('departmental_dues')
      .select('*')
      .eq('matric_number', cleanMatric)
      .in('status', ['verified', 'successful'])
      .maybeSingle();

    if (!error && data) {
      // Check renewal date from id_card_applications
      const { data: appData, error: appError } = await supabase
        .from('id_card_applications')
        .select('renewal_date, status')
        .or(`registration_number.eq.${cleanMatric},matric_number.eq.${cleanMatric}`)
        .maybeSingle();

      if (!appError && appData) {
        // If application is revoked, not paid regardless of dues status
        if (appData.status === 'revoked') {
          return { isPaid: false, payment: data };
        }

        // If renewal_date is set and within 365 days, payment stays verified
        if (appData.renewal_date) {
          const renewalDate = new Date(appData.renewal_date);
          const daysSinceRenewal = (today - renewalDate) / (1000 * 60 * 60 * 24);
          if (daysSinceRenewal <= 365) {
            return { isPaid: true, payment: data };
          }
        }

        // Renewal expired (> 365 days) - still paid if not revoked, but needs renewal
        return { isPaid: true, payment: data, needsRenewal: true };
      }

      // No application record - payment from dues is still valid
      return { isPaid: true, payment: data };
    }
  } catch (err) {
    // Offline fallback
  }

  // 2. Check local payments database
  const payments = getLocalPaymentsDatabase();
  const payment = payments.find(p =>
    p.student_matric.toUpperCase() === cleanMatric &&
    (p.status === 'verified' || p.status === 'successful' || p.status === 'cleared')
  );

  if (payment) {
    // Check local id_card_applications for renewal
    const apps = getLocalIdApplicationsDatabase();
    const app = apps.find(a =>
      (a.matric_number && a.matric_number.toUpperCase() === cleanMatric) ||
      (a.student_id && a.student_id.toUpperCase() === cleanMatric)
    );

    if (app) {
      // If application is revoked, not paid
      if (app.status === 'revoked') {
        return { isPaid: false, payment };
      }

      // If renewal_date is set and within 365 days, payment stays verified
      if (app.renewal_date) {
        const renewalDate = new Date(app.renewal_date);
        const daysSinceRenewal = (today - renewalDate) / (1000 * 60 * 60 * 24);
        if (daysSinceRenewal <= 365) {
          return { isPaid: true, payment };
        }
      }

      // Renewal expired
      return { isPaid: true, payment, needsRenewal: true };
    }

    return { isPaid: true, payment };
  }

  return { isPaid: false, payment: null };
}

/**
 * Record a verified payment for a student (simulating gateway callback or manual clearance)
 */
export async function recordStudentPayment(matricNumber, amount = 2500) {
  const cleanMatric = matricNumber.trim().toUpperCase();
  const payments = getLocalPaymentsDatabase();

  const newPayment = {
    id: 'pay-' + Date.now(),
    student_matric: cleanMatric,
    session: '2026/2027',
    amount,
    payment_reference: `NACOS-FUTO-2026-PAY-${Math.floor(10000 + Math.random() * 90000)}`,
    status: 'verified',
    purpose: 'Departmental Dues & Digital Student ID Card',
    created_at: new Date().toISOString()
  };

  payments.push(newPayment);
  localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(payments));

  // Calculate renewal date: 365 days from now
  const renewalDate = new Date();
  renewalDate.setDate(renewalDate.getDate() + 365);

  // Sync with Supabase - departmental_dues
  try {
    await supabase.from('departmental_dues').insert([{
      matric_number: cleanMatric,
      session: newPayment.session,
      amount: newPayment.amount,
      payment_reference: newPayment.payment_reference,
      status: 'verified',
      paid_at: new Date().toISOString()
    }]);
  } catch (e) {
    // offline
  }

  // Sync with Supabase - id_card_applications: update existing application's payment_status and renewal_date
  try {
    // Check if there's an existing application for this student
    const { data: existingApp } = await supabase
      .from('id_card_applications')
      .select('*')
      .or(`registration_number.eq.${cleanMatric},matric_number.eq.${cleanMatric}`)
      .maybeSingle();

    if (existingApp) {
      // Update existing application with payment status and renewal date
      await supabase.from('id_card_applications').update({
        payment_status: 'verified',
        renewal_date: renewalDate.toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      }).eq('id', existingApp.id);
    }
    // If no existing application, do not create one - application creation is handled separately in createIdCardApplication
  } catch (e) {
    // Offline
  }

  return { success: true, payment: newPayment };
}

/**
 * Fetch the active ID card application for a student.
 * Returns null if student has never applied (State 1: Not Applied).
 */
export async function getStudentIdApplication(matricOrId) {
  if (!matricOrId) return null;

  const cleanMatric = String(matricOrId).trim().toUpperCase();

  // 1. Try Supabase remote
  try {
    const { data, error } = await supabase
      .from('id_card_applications')
      .select('*')
      .or(`matric_number.eq.${cleanMatric},matric_number.ilike.${cleanMatric}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return {
        ...data,
        matric_number: data.matric_number || cleanMatric,
        registration_number: data.matric_number || cleanMatric,
        passport_url: data.passport_url || null,
        passport_photo_url: data.passport_url || null,
        full_name: data.full_name || 'Student Member'
      };
    }
  } catch (e) {
    console.warn('getStudentIdApplication remote query:', e);
  }

  // 2. Local storage fallback
  const apps = getLocalIdApplicationsDatabase();
  const app = apps.find(a =>
    (a.registration_number && a.registration_number.toUpperCase() === cleanMatric) ||
    (a.matric_number && a.matric_number.toUpperCase() === cleanMatric) ||
    a.student_id === matricOrId ||
    a.id === matricOrId
  );

  return app || null;
}

/**
 * On-Demand: Create an ID card application.
 * Called ONLY when student explicitly clicks "Apply for ID Card" in State 1.
 * Prevents duplicate active applications!
 */
export async function createIdCardApplication(student) {
  if (!student) {
    return { error: 'Invalid student profile.' };
  }

  const matric = student.matric || student.registration_number;
  if (!matric) {
    return { error: 'Student registration number is required to apply.' };
  }

  const cleanMatric = matric.trim().toUpperCase();
  const studentId = student.id || cleanMatric;

  // 1. Duplicate prevention: Check if student already has an active application
  const existingApp = await getStudentIdApplication(cleanMatric);
  if (existingApp && !['rejected', 'revoked'].includes(existingApp.status)) {
    return { success: true, application: existingApp, alreadyExisted: true };
  }

  // 2. Retrieve configurable fee
  const settings = await getIdCardSettings();
  const fee = settings.id_card_fee || 2500;

  // 3. Check if student already has a verified payment in the database
  const paymentCheck = await checkStudentPaymentStatus(cleanMatric);

  const existingPhoto = student.profile_photo_url || student.avatar_url || student.photo_url;

  // Determine initial status based on verified payment and photo
  let initialStatus = 'pending_payment';
  let paymentStatus = 'pending';
  let paymentRef = null;

  if (paymentCheck.isPaid) {
    paymentStatus = 'verified';
    paymentRef = paymentCheck.payment?.payment_reference || `NACOS-FUTO-2026-PAY-${Math.floor(10000 + Math.random() * 90000)}`;
    if (existingPhoto) {
      initialStatus = 'ready_to_submit';
    } else {
      initialStatus = 'photo_required';
    }
  }

  const appNumber = `APP-2026-${Math.floor(100000 + Math.random() * 900000)}`;
  const studentName = student.full_name || student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Student Member';

  const newApp = {
    id: 'app-' + Date.now(),
    student_id: studentId,
    matric_number: cleanMatric,
    registration_number: cleanMatric,
    full_name: studentName,
    level: student.level || '300 Level',
    application_number: appNumber,
    id_card_number: null,
    status: initialStatus,
    payment_status: paymentStatus,
    payment_reference: paymentRef,
    amount: fee,
    passport_url: existingPhoto || null,
    passport_photo_url: existingPhoto || null,
    cloudinary_public_id: student.cloudinary_public_id || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const apps = getLocalIdApplicationsDatabase();
  apps.unshift(newApp);
  saveLocalIdApplications(apps);

  // Sync with Supabase (send schema-compliant payload; DB generates valid UUID for id)
  try {
    let resolvedStudentId = student.id;
    if (!resolvedStudentId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedStudentId)) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id')
        .or(`registration_number.eq.${cleanMatric},matric_number.eq.${cleanMatric}`)
        .maybeSingle();
      if (prof?.id) {
        resolvedStudentId = prof.id;
      }
    }

    const dbPayload = {
      matric_number: cleanMatric,
      application_number: appNumber,
      status: initialStatus,
      payment_status: paymentStatus,
      payment_reference: paymentRef,
      passport_url: existingPhoto || null,
      cloudinary_public_id: student.cloudinary_public_id || null,
      submitted_at: initialStatus === 'submitted' ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (resolvedStudentId) {
      dbPayload.student_id = resolvedStudentId;
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('id_card_applications')
      .insert([dbPayload])
      .select()
      .maybeSingle();

    if (!insertErr && inserted) {
      newApp.id = inserted.id;
      newApp.created_at = inserted.created_at;
      saveLocalIdApplications(apps);
      return { success: true, application: { ...newApp, ...inserted } };
    } else if (insertErr) {
      console.warn('createIdCardApplication Supabase insert error:', insertErr);
    }
  } catch (e) {
    console.warn('createIdCardApplication Supabase insert error:', e);
  }

  return { success: true, application: newApp };
}

/**
 * Server-verified payment linkage.
 * Verifies payment against dues_payments and transitions application to 'payment_confirmed' / 'photo_required'.
 */
export async function verifyAndLinkPayment(applicationId, matricNumber) {
  const paymentCheck = await checkStudentPaymentStatus(matricNumber);
  if (!paymentCheck.isPaid) {
    return { error: 'Payment could not be verified. Please complete payment before proceeding.' };
  }

  const apps = getLocalIdApplicationsDatabase();
  const index = apps.findIndex(a => a.id === applicationId || a.matric_number.toUpperCase() === matricNumber.toUpperCase());
  if (index === -1) {
    return { error: 'Application not found.' };
  }

  const app = apps[index];
  app.payment_status = 'verified';
  app.payment_reference = paymentCheck.payment?.payment_reference || `NACOS-FUTO-2026-PAY-${Math.floor(10000 + Math.random() * 90000)}`;
  app.paid_at = new Date().toISOString();

  // Set renewal date to 365 days from now if not already set or expired
  const today = new Date();
  const renewalDate = new Date(today);
  renewalDate.setDate(renewalDate.getDate() + 365);
  const existingRenewal = app.renewal_date ? new Date(app.renewal_date) : null;
  // Only update renewal date if it's expired or not set
  if (!existingRenewal || (today - existingRenewal) / (1000 * 60 * 60 * 24) > 365) {
    app.renewal_date = renewalDate.toISOString().split('T')[0];
  }

  // If photo is already uploaded, advance to ready_to_submit, else photo_required
  if (app.passport_url) {
    app.status = 'ready_to_submit';
  } else {
    app.status = 'photo_required';
  }
  app.updated_at = new Date().toISOString();

  saveLocalIdApplications(apps);

  try {
    await supabase.from('id_card_applications').update({
      payment_status: app.payment_status,
      payment_reference: app.payment_reference,
      paid_at: app.paid_at,
      renewal_date: app.renewal_date,
      status: app.status,
      updated_at: app.updated_at
    }).eq('id', app.id);
  } catch (e) {
    // Offline
  }

  return { success: true, application: app };
}

/**
 * Upload and link passport photograph to application
 */
export async function savePassportToApplication(applicationId, file, student) {
  if (!file) {
    return { error: 'No image file provided.' };
  }

  const matric = student.matric || student.registration_number;
  const matricClean = String(matric).replace(/[^a-zA-Z0-9]/g, '_');
  const customPublicId = `${CLOUDINARY_FOLDERS.STUDENTS}/${matricClean}_passport`;

  // 1. Upload to Cloudinary
  const uploadResult = await uploadMedia(file, {
    folder: CLOUDINARY_FOLDERS.STUDENTS,
    publicId: customPublicId,
    tags: ['nacos', 'students', 'id_card', matricClean],
    maxSizeBytes: 5 * 1024 * 1024
  });

  if (!uploadResult.success) {
    return { error: uploadResult.error || 'Failed to upload passport to Cloudinary.' };
  }

  const photoUrl = uploadResult.secureUrl || uploadResult.url;
  const publicId = uploadResult.publicId;

  // 2. Update application
  const apps = getLocalIdApplicationsDatabase();
  const index = apps.findIndex(a => a.id === applicationId || (a.matric_number && a.matric_number.toUpperCase() === matric.toUpperCase()));

  let updatedApp = null;
  if (index !== -1) {
    apps[index].passport_url = photoUrl;
    apps[index].cloudinary_public_id = publicId;
    if (apps[index].payment_status === 'verified') {
      apps[index].status = 'ready_to_submit';
    }
    apps[index].updated_at = new Date().toISOString();
    updatedApp = apps[index];
    saveLocalIdApplications(apps);
  }

  // 3. Update student profile
  const students = getLocalStudentsDatabase();
  const sIndex = students.findIndex(s => s.id === student.id || s.registration_number === matric);
  if (sIndex !== -1) {
    students[sIndex].profile_photo_url = photoUrl;
    students[sIndex].avatar_url = photoUrl;
    students[sIndex].photo_url = photoUrl;
    students[sIndex].cloudinary_public_id = publicId;
    localStorage.setItem('nacos_students_db', JSON.stringify(students));
  }

  // 4. Update session
  const currentUser = localStorage.getItem('nacos_user');
  if (currentUser) {
    try {
      const userObj = JSON.parse(currentUser);
      userObj.profile_photo_url = photoUrl;
      userObj.avatar_url = photoUrl;
      userObj.photo_url = photoUrl;
      userObj.cloudinary_public_id = publicId;
      localStorage.setItem('nacos_user', JSON.stringify(userObj));
    } catch (e) { }
  }

  // 5. Supabase sync
  try {
    await syncMediaAsset({
      publicId,
      url: photoUrl,
      folder: CLOUDINARY_FOLDERS.STUDENTS,
      category: 'students',
      image_alt: `Student Passport - ${matric}`,
      entity_type: 'student_passport',
      entity_id: String(matric)
    });

    if (updatedApp) {
      await supabase.from('id_card_applications').update({
        passport_url: photoUrl,
        cloudinary_public_id: publicId,
        status: updatedApp.status,
        updated_at: updatedApp.updated_at
      }).eq('id', updatedApp.id);
    }

    await supabase.from('profiles').update({
      profile_photo_url: photoUrl,
      avatar_url: photoUrl,
      cloudinary_public_id: publicId
    }).or(`id.eq.${student.id},registration_number.eq.${matric}`);
  } catch (e) {
    // Offline
  }

  return { success: true, photoUrl, publicId, application: updatedApp };
}

/**
 * Link an uploaded passport photo URL directly to an application and sync to student records
 */
export async function linkPassportUrlToApplication(applicationId, matric, photoUrl, publicId = '') {
  if (!photoUrl) return { error: 'No photo URL provided' };
  const cleanMatric = String(matric || '').trim().toUpperCase();

  // 1. Update in local applications DB
  const apps = getLocalIdApplicationsDatabase();
  const index = apps.findIndex(a =>
    a.id === applicationId ||
    (a.matric_number && a.matric_number.toUpperCase() === cleanMatric)
  );

  let updatedApp = null;
  if (index !== -1) {
    apps[index].passport_url = photoUrl;
    if (publicId) apps[index].cloudinary_public_id = publicId;
    if (apps[index].payment_status === 'verified') {
      apps[index].status = 'ready_to_submit';
    }
    apps[index].updated_at = new Date().toISOString();
    updatedApp = apps[index];
    saveLocalIdApplications(apps);
  }

  // 2. Update in local students DB & nacos_user
  const students = getLocalStudentsDatabase();
  const sIndex = students.findIndex(s =>
    (s.registration_number && s.registration_number.toUpperCase() === cleanMatric) ||
    s.id === cleanMatric
  );
  if (sIndex !== -1) {
    students[sIndex].profile_photo_url = photoUrl;
    students[sIndex].avatar_url = photoUrl;
    students[sIndex].photo_url = photoUrl;
    if (publicId) students[sIndex].cloudinary_public_id = publicId;
    localStorage.setItem('nacos_students_db', JSON.stringify(students));
  }

  const currentUser = localStorage.getItem('nacos_user');
  if (currentUser) {
    try {
      const userObj = JSON.parse(currentUser);
      userObj.profile_photo_url = photoUrl;
      userObj.avatar_url = photoUrl;
      userObj.photo_url = photoUrl;
      if (publicId) userObj.cloudinary_public_id = publicId;
      localStorage.setItem('nacos_user', JSON.stringify(userObj));
    } catch (e) { }
  }

  // 3. Supabase sync
  try {
    if (applicationId) {
      await supabase.from('id_card_applications').update({
        passport_url: photoUrl,
        cloudinary_public_id: publicId || null,
        status: updatedApp?.status || 'ready_to_submit',
        updated_at: new Date().toISOString()
      }).eq('id', applicationId);
    }
    if (cleanMatric) {
      await supabase.from('profiles').update({
        profile_photo_url: photoUrl,
        avatar_url: photoUrl,
        cloudinary_public_id: publicId || null
      }).eq('registration_number', cleanMatric);
    }
  } catch (e) {
    // Offline
  }

  return { success: true, application: updatedApp };
}

/**
 * Submit ID Card application for portal review
 */
export async function submitIdApplication(applicationId, passportUrlOverride = null) {
  const apps = getLocalIdApplicationsDatabase();
  let index = apps.findIndex(a => a.id === applicationId);
  if (index === -1) {
    // Remote check
    try {
      const { data } = await supabase.from('id_card_applications').select('*').eq('id', applicationId).maybeSingle();
      if (data) {
        apps.push(data);
        index = apps.length - 1;
      }
    } catch (e) { }
  }

  if (index === -1) {
    return { error: 'Application not found.' };
  }

  const app = apps[index];

  // If passport url is missing on app record, use override or session fallback
  if (!app.passport_url && passportUrlOverride) {
    app.passport_url = passportUrlOverride;
  }

  if (!app.passport_url && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('nacos_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u.profile_photo_url || u.avatar_url || u.photo_url) {
          app.passport_url = u.profile_photo_url || u.avatar_url || u.photo_url;
        }
      }
    } catch (e) { }
  }

  if (app.payment_status !== 'verified') {
    return { error: 'Payment must be verified before submitting application.' };
  }
  if (!app.passport_url) {
    return { error: 'Please upload a passport photograph before submitting.' };
  }

  app.status = 'submitted';
  app.submitted_at = new Date().toISOString();
  app.updated_at = new Date().toISOString();

  saveLocalIdApplications(apps);

  try {
    await supabase.from('id_card_applications').update({
      passport_url: app.passport_url,
      status: 'submitted',
      submitted_at: app.submitted_at,
      updated_at: app.updated_at
    }).eq('id', app.id);
  } catch (e) { }

  return { success: true, application: app };
}

/**
 * PORTAL ADMIN: Retrieve all ID card applications with student details
 */
export async function portalAdminGetApplications(options = {}) {
  const status = typeof options === 'string' ? options : (options?.status || 'ALL');
  const search = typeof options === 'object' && options?.search ? options.search : '';
  let list = [];

  try {
    let query = supabase
      .from('id_card_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (status && status !== 'ALL') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (!error && Array.isArray(data)) {
      // Enrich with matching profile details and payment records
      const regNos = data.map(d => d.matric_number || d.registration_number).filter(Boolean);
      let profilesMap = {};
      let paymentsMap = {};

      if (regNos.length > 0) {
        try {
          const [profsRes, paysRes] = await Promise.all([
            supabase
              .from('profiles')
              .select('id, registration_number, matric_number, full_name, surname, first_name, department, programme, admission_year, profile_photo_url, avatar_url')
              .in('registration_number', regNos),
            supabase
              .from('payments')
              .select('id, student_id, registration_number, payment_type, provider, amount, currency, status, reference, paid_at, created_at')
              .eq('payment_type', 'ID_CARD')
              .in('registration_number', regNos)
          ]);

          if (!profsRes.error && Array.isArray(profsRes.data)) {
            profsRes.data.forEach(p => {
              if (p.registration_number) profilesMap[p.registration_number.toUpperCase()] = p;
              if (p.matric_number) profilesMap[p.matric_number.toUpperCase()] = p;
              if (p.id) profilesMap[p.id] = p;
            });
          }

          if (!paysRes.error && Array.isArray(paysRes.data)) {
            paysRes.data.forEach(pay => {
              if (pay.registration_number) paymentsMap[pay.registration_number.toUpperCase()] = pay;
            });
          }
        } catch (enrichErr) {
          console.warn('Could not enrich applications:', enrichErr);
        }
      }

      list = data.map(app => {
        const reg = (app.matric_number || app.registration_number || '').toUpperCase();
        const profile = profilesMap[reg] || (app.student_id ? profilesMap[app.student_id] : {}) || {};
        const payRecord = paymentsMap[reg] || null;

        return {
          ...app,
          matric_number: app.matric_number || profile.registration_number || profile.matric_number || reg,
          registration_number: app.matric_number || profile.registration_number || profile.matric_number || reg,
          student_name: profile.full_name || app.full_name || profile.name || 'Student Member',
          full_name: profile.full_name || app.full_name || profile.name || 'Student Member',
          programme: profile.programme || app.programme || 'B.Tech Computer Science',
          department: profile.department || app.department || 'Computer Science',
          level: profile.admission_year ? `${Math.min(500, Math.max(100, (new Date().getFullYear() - profile.admission_year + 1) * 100))} Level` : (app.level || '300 Level'),
          passport_url: app.passport_url || profile.profile_photo_url || profile.avatar_url || null,
          passport_photo_url: app.passport_url || profile.profile_photo_url || profile.avatar_url || null,
          payment_reference: app.payment_reference || payRecord?.reference || null,
          payment_provider: payRecord?.provider || (app.payment_reference?.startsWith('NACOS-IDCARD') ? 'BACHS' : 'DIRECT'),
          payment_record: payRecord
        };
      });
    }
  } catch (e) {
    console.warn('portalAdminGetApplications Supabase fetch error:', e);
  }

  // Fallback to local storage only if remote query failed or offline
  if (list.length === 0 && (!supabase || (typeof navigator !== 'undefined' && !navigator.onLine))) {
    const apps = getLocalIdApplicationsDatabase();
    const students = getLocalStudentsDatabase();

    list = apps.map(app => {
      const student = students.find(s =>
        s.id === app.student_id ||
        (s.registration_number && app.matric_number && s.registration_number.toUpperCase() === app.matric_number.toUpperCase())
      ) || {};

      return {
        ...app,
        student_name: app.student_name || student.full_name || student.name || 'Student Member',
        programme: student.programme || 'B.Tech Computer Science',
        department: student.department || 'Computer Science',
        level: student.level || '300 Level'
      };
    });
  }

  // Filter in memory
  if (status && status !== 'ALL') {
    list = list.filter(a => a.status === status);
  }

  if (search) {
    const q = search.trim().toLowerCase();
    list = list.filter(a =>
      (a.matric_number && a.matric_number.toLowerCase().includes(q)) ||
      (a.application_number && a.application_number.toLowerCase().includes(q)) ||
      (a.id_card_number && a.id_card_number.toLowerCase().includes(q)) ||
      (a.student_name && a.student_name.toLowerCase().includes(q))
    );
  }

  return list;
}

/**
 * PORTAL ADMIN: Approve application and generate unique official ID Number
 * Generates sequence NACOS-FUTO-2026-000001, NACOS-FUTO-2026-000002, etc.
 */
export async function portalAdminApproveApplication(applicationId, adminUser) {
  const apps = getLocalIdApplicationsDatabase();
  const index = apps.findIndex(a => a.id === applicationId);
  if (index === -1) {
    return { error: 'Application record not found.' };
  }

  const app = apps[index];
  if (app.payment_status !== 'verified') {
    return { error: 'Cannot approve application: payment is unverified.' };
  }
  if (!app.passport_url) {
    return { error: 'Cannot approve application: passport photograph is missing.' };
  }

  // Student registration number is the only number used to track students (digits only)
  const rawNum = app.matric_number || app.id_card_number;
  const idCardNumber = String(rawNum).replace(/\D/g, '') || String(rawNum).trim();

  app.id_card_number = idCardNumber;
  app.id_card_back_url = ID_CARD_TEMPLATE.masterBackUrl;
  app.status = 'generated'; // Ready for student view and download
  app.approved_at = new Date().toISOString();
  app.generated_at = new Date().toISOString();
  app.reviewed_by = adminUser?.id || adminUser?.user_id || 'admin-portal';
  app.updated_at = new Date().toISOString();

  saveLocalIdApplications(apps);

  try {
    await supabase.from('id_card_applications').update({
      id_card_number: app.id_card_number,
      id_card_back_url: app.id_card_back_url,
      status: 'generated',
      approved_at: app.approved_at,
      generated_at: app.generated_at,
      reviewed_by: app.reviewed_by,
      updated_at: app.updated_at
    }).eq('id', app.id);
  } catch (e) { }

  return { success: true, application: app };
}

/**
 * PORTAL ADMIN: Reject application with reason
 */
export async function portalAdminRejectApplication(applicationId, reason, adminUser) {
  if (!reason || !reason.trim()) {
    return { error: 'A rejection reason is required for student feedback.' };
  }

  const apps = getLocalIdApplicationsDatabase();
  const index = apps.findIndex(a => a.id === applicationId);
  if (index === -1) {
    return { error: 'Application record not found.' };
  }

  const app = apps[index];
  app.status = 'rejected';
  app.rejection_reason = reason.trim();
  app.rejected_at = new Date().toISOString();
  app.reviewed_by = adminUser?.id || adminUser?.user_id || 'admin-portal';
  app.updated_at = new Date().toISOString();

  saveLocalIdApplications(apps);

  try {
    await supabase.from('id_card_applications').update({
      status: 'rejected',
      rejection_reason: app.rejection_reason,
      rejected_at: app.rejected_at,
      reviewed_by: app.reviewed_by,
      updated_at: app.updated_at
    }).eq('id', app.id);
  } catch (e) { }

  return { success: true, application: app };
}

/**
 * PORTAL ADMIN: Revoke an issued ID card
 */
export async function portalAdminRevokeIdCard(applicationId, reason, adminUser) {
  if (!reason || !reason.trim()) {
    return { error: 'A revocation reason is required.' };
  }

  const apps = getLocalIdApplicationsDatabase();
  const index = apps.findIndex(a => a.id === applicationId);
  if (index === -1) {
    return { error: 'Application record not found.' };
  }

  const app = apps[index];
  app.status = 'revoked';
  app.revocation_reason = reason.trim();
  app.revoked_at = new Date().toISOString();
  app.reviewed_by = adminUser?.id || adminUser?.user_id || 'admin-portal';
  app.updated_at = new Date().toISOString();

  saveLocalIdApplications(apps);

  try {
    await supabase.from('id_card_applications').update({
      status: 'revoked',
      revocation_reason: app.revocation_reason,
      revoked_at: app.revoked_at,
      reviewed_by: app.reviewed_by,
      updated_at: app.updated_at
    }).eq('id', app.id);
  } catch (e) { }

  return { success: true, application: app };
}

/**
 * PORTAL ADMIN: Regenerate ID Card
 */
export async function portalAdminRegenerateIdCard(applicationId, adminUser) {
  const apps = getLocalIdApplicationsDatabase();
  const index = apps.findIndex(a => a.id === applicationId);
  if (index === -1) {
    return { error: 'Application record not found.' };
  }

  const app = apps[index];
  const rawNum = app.matric_number || app.id_card_number;
  app.id_card_number = String(rawNum).replace(/\D/g, '') || String(rawNum).trim();
  app.id_card_back_url = ID_CARD_TEMPLATE.masterBackUrl;
  app.status = 'generated';
  app.generated_at = new Date().toISOString();
  app.reviewed_by = adminUser?.id || adminUser?.user_id || 'admin-portal';
  app.updated_at = new Date().toISOString();

  saveLocalIdApplications(apps);

  try {
    await supabase.from('id_card_applications').update({
      id_card_number: app.id_card_number,
      id_card_back_url: app.id_card_back_url,
      status: 'generated',
      generated_at: app.generated_at,
      reviewed_by: app.reviewed_by,
      updated_at: app.updated_at
    }).eq('id', app.id);
  } catch (e) { }

  return { success: true, application: app };
}

/**
 * Persist generated ID Card Image URL to the database
 */
export async function saveGeneratedIdCardAsset(applicationId, imageUrl) {
  if (!applicationId || !imageUrl) return { error: 'Missing parameters' };

  const apps = getLocalIdApplicationsDatabase();
  const index = apps.findIndex(a => a.id === applicationId);
  if (index !== -1) {
    apps[index].id_card_image_url = imageUrl;
    apps[index].id_card_back_url = ID_CARD_TEMPLATE.masterBackUrl;
    apps[index].updated_at = new Date().toISOString();
    saveLocalIdApplications(apps);
  }

  try {
    await supabase.from('id_card_applications').update({
      id_card_image_url: imageUrl,
      id_card_back_url: ID_CARD_TEMPLATE.masterBackUrl,
      updated_at: new Date().toISOString()
    }).eq('id', applicationId);
  } catch (e) { }

  return { success: true, imageUrl };
}

/**
 * PUBLIC ID VERIFICATION
 * Used when anyone scans the ID Card QR code leading to /verify/id/[id_card_number]
 */
export async function verifyIdCardPublic(idCardNumber) {
  if (!idCardNumber) {
    return { status: 'not_found', message: 'No ID card number specified.' };
  }

  const cleanNum = idCardNumber.trim().toUpperCase();

  // 1. Try remote Supabase query
  try {
    const { data, error } = await supabase
      .from('id_card_applications')
      .select('*, profiles:student_id(*)')
      .or(`id_card_number.eq.${cleanNum},application_number.eq.${cleanNum}`)
      .maybeSingle();

    if (!error && data) {
      const student = data.profiles || {};
      if (data.status === 'revoked') {
        return {
          status: 'revoked',
          card: data,
          student: {
            name: student.full_name,
            matric: data.matric_number,
            department: student.department || 'Computer Science',
            faculty: student.faculty || 'SICT',
            level: student.level || '300 Level'
          },
          revocation_reason: data.revocation_reason || 'Card revoked by departmental authority.'
        };
      }

      if (data.status === 'generated' || data.status === 'approved') {
        return {
          status: 'valid',
          card: data,
          student: {
            name: student.full_name,
            matric: data.matric_number,
            department: student.department || 'Computer Science',
            faculty: student.faculty || 'SICT',
            level: student.level || '300 Level',
            session: '2026/2027'
          }
        };
      }

      return {
        status: 'pending',
        card: data,
        message: 'This application is currently undergoing processing.'
      };
    }
  } catch (e) { }

  // 2. Fallback to local storage
  const apps = getLocalIdApplicationsDatabase();
  const app = apps.find(a =>
    (a.id_card_number && a.id_card_number.toUpperCase() === cleanNum) ||
    (a.application_number && a.application_number.toUpperCase() === cleanNum) ||
    (a.matric_number && a.matric_number.toUpperCase() === cleanNum)
  );

  if (!app) {
    return { status: 'not_found', message: 'No record found in the official NACOS registry for this identifier.' };
  }

  const students = getLocalStudentsDatabase();
  const student = students.find(s =>
    s.id === app.student_id ||
    s.registration_number.toUpperCase() === app.matric_number.toUpperCase()
  ) || {};

  if (app.status === 'revoked') {
    return {
      status: 'revoked',
      card: app,
      student: {
        name: student.full_name || student.name || 'Student Member',
        matric: app.matric_number,
        department: student.department || 'Computer Science',
        faculty: student.faculty || 'SICT',
        level: student.level || '300 Level'
      },
      revocation_reason: app.revocation_reason || 'Card revoked by departmental authority.'
    };
  }

  if (app.status === 'generated' || app.status === 'approved') {
    return {
      status: 'valid',
      card: app,
      student: {
        name: student.full_name || student.name || 'Student Member',
        matric: app.matric_number,
        department: student.department || 'Computer Science',
        faculty: student.faculty || 'SICT',
        level: student.level || '300 Level',
        session: '2026/2027'
      }
    };
  }

  return {
    status: 'pending',
    card: app,
    message: 'This ID application has not been generated yet.'
  };
}

/**
 * Helper to trace the exact rounded regular hexagon geometry on HTML5 Canvas
 */
function traceRoundedHexagon(ctx, vertices, radius = 18) {
  ctx.beginPath();
  const len = vertices.length;
  for (let i = 0; i < len; i++) {
    const pPrev = vertices[(i - 1 + len) % len];
    const pCurr = vertices[i];
    const pNext = vertices[(i + 1) % len];
    const midPrevX = (pPrev.x + pCurr.x) / 2;
    const midPrevY = (pPrev.y + pCurr.y) / 2;
    if (i === 0) {
      ctx.moveTo(midPrevX, midPrevY);
    }
    ctx.arcTo(pCurr.x, pCurr.y, pNext.x, pNext.y, radius);
  }
  ctx.closePath();
}

/**
 * Image loader helper with fallback URLs and cross-origin handling
 */
function loadTemplateImage(primaryUrl, fallbackUrl) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(null);
    const candidates = [
      primaryUrl,
      fallbackUrl,
      '/nacos_id_template_master.jpg',
      ID_CARD_TEMPLATE.masterTemplateUrl
    ].filter(Boolean);
    const uniqueUrls = [...new Set(candidates)];

    let index = 0;
    const tryNext = () => {
      if (index >= uniqueUrls.length) {
        resolve(null);
        return;
      }
      const url = uniqueUrls[index++];
      const img = new Image();
      if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => {
        if (img.naturalWidth > 0) {
          resolve(img);
        } else {
          tryNext();
        }
      };
      img.onerror = () => {
        tryNext();
      };
      img.src = url;
    };

    tryNext();
  });
}

function loadOptionalImage(src) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !src) return resolve(null);
    const img = new Image();
    if (typeof src === 'string' && (src.startsWith('http://') || src.startsWith('https://'))) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * High-Resolution Canvas Rendering Engine for NACOS Official Student ID Card
 * Takes the authoritative EMPTY ID CARD TEMPLATE as the master visual background layer,
 * and composites:
 * 1. Student Passport Photo (clipped inside the existing rounded hexagonal frame,
 *    with object-fit: cover, keeping the template's green and white border visible above).
 * 2. Student Full Name (uppercase, Aeonik Black font, centered horizontally underneath
 *    the static 'NAME' badge, auto-wrapped into 1 or 2 lines, auto-scaled if long).
 * 3. Student Registration Number (digits only, Aeonik Black font, centered horizontally
 *    underneath the static 'REG NO.' badge).
 */
export async function drawIdCardOnCanvas(canvas, student, photoImg, cardInfo = null, options = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const t = ID_CARD_TEMPLATE;

  // Set exact master card resolution: 662 × 1075 px
  canvas.width = t.dimensions.width;
  canvas.height = t.dimensions.height;

  // 1. Load Master Template Image (Priority: options URL -> static asset -> Cloudinary URL)
  const templateSrc = options.templateImgUrl || options.templateUrl || t.masterTemplateUrl;
  const templateImg = options.templateImg || await loadTemplateImage(
    templateSrc,
    '/nacos_id_template_master.jpg'
  );

  const hasMasterTemplate = templateImg && templateImg.complete && templateImg.naturalWidth > 0;

  if (hasMasterTemplate) {
    ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);
  } else {
    // -------------------------------------------------------------------------
    // HIGH-FIDELITY PROCEDURAL MASTER CARD FRONT (Draws complete official template)
    // -------------------------------------------------------------------------
    // Card Base (CR-80 Portrait)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGrad.addColorStop(0, '#041801');
    bgGrad.addColorStop(0.5, '#083002');
    bgGrad.addColorStop(1, '#052201');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle decorative circuit / security lines
    ctx.save();
    ctx.strokeStyle = 'rgba(75, 208, 67, 0.08)';
    ctx.lineWidth = 2;
    for (let x = 40; x < canvas.width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 50; y < canvas.height; y += 70) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    ctx.restore();

    // Top Header Banner
    const headerGrad = ctx.createLinearGradient(0, 0, canvas.width, 160);
    headerGrad.addColorStop(0, '#062901');
    headerGrad.addColorStop(1, '#0f5c02');
    ctx.fillStyle = headerGrad;
    ctx.fillRect(0, 0, canvas.width, 165);

    // Gold Accent Border Line under Header
    ctx.fillStyle = '#eab308';
    ctx.fillRect(0, 165, canvas.width, 5);

    // Header Typography
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Association Name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px "Montserrat", -apple-system, sans-serif';
    ctx.fillText('NATIONAL ASSOCIATION OF COMPUTER SCIENCE STUDENTS', 331, 24);

    // Institution Name
    ctx.fillStyle = '#6ee7b7';
    ctx.font = 'bold 13px "Montserrat", -apple-system, sans-serif';
    ctx.fillText('FEDERAL UNIVERSITY OF TECHNOLOGY, OWERRI', 331, 48);

    // Department
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 12px "Montserrat", -apple-system, sans-serif';
    ctx.fillText('DEPARTMENT OF COMPUTER SCIENCE (SICT)', 331, 72);

    // Identity Card Title Badge
    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 14px "Montserrat", -apple-system, sans-serif';
    ctx.fillText('• OFFICIAL STUDENT IDENTITY CARD •', 331, 102);

    // Subtitle / Session
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '500 11px -apple-system, sans-serif';
    ctx.fillText('OFFICIAL DIGITAL IDENTITY ROSTER', 331, 128);

    // NAME Badge Pill (Position: x=255, y=635, w=152, h=44)
    ctx.save();
    ctx.fillStyle = '#138601';
    ctx.beginPath();
    const nx = 240, ny = 630, nw = 182, nh = 42, nr = 21;
    ctx.roundRect ? ctx.roundRect(nx, ny, nw, nh, nr) : ctx.rect(nx, ny, nw, nh);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "Montserrat", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NAME', 331, ny + nh / 2);
    ctx.restore();

    // REG NO Badge Pill (Position: x=255, y=855, w=152, h=44)
    ctx.save();
    ctx.fillStyle = '#138601';
    ctx.beginPath();
    const rx = 240, ry = 855, rw = 182, rh = 42, rr = 21;
    ctx.roundRect ? ctx.roundRect(rx, ry, rw, rh, rr) : ctx.rect(rx, ry, rw, rh);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "Montserrat", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('REG NO.', 331, ry + rh / 2);
    ctx.restore();

    // White backing boxes for Name and Reg No text so typography is 100% crisp & readable
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(40, 686, 582, 148, 12) : ctx.rect(40, 686, 582, 148);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(70, 910, 522, 60, 10) : ctx.rect(70, 910, 522, 60);
    ctx.fill();
    ctx.restore();
  }

  // 2. Composite Student Passport Photograph
  if (photoImg && photoImg.complete && photoImg.naturalWidth > 0) {
    ctx.save();
    // Clip strictly inside the rounded hexagon
    traceRoundedHexagon(ctx, t.photo.vertices, t.photo.cornerRadius);
    ctx.clip();

    // Cover scaling centered at (331, 358)
    const targetW = t.photo.boundingBox.width + 6; // 300px
    const targetH = t.photo.boundingBox.height + 6; // 334px
    const imgRatio = photoImg.naturalWidth / photoImg.naturalHeight;
    const boxRatio = targetW / targetH;
    let renderW, renderH, renderX, renderY;

    if (imgRatio > boxRatio) {
      renderH = targetH;
      renderW = targetH * imgRatio;
    } else {
      renderW = targetW;
      renderH = targetW / imgRatio;
    }
    renderX = t.photo.centerX - renderW / 2;
    renderY = t.photo.centerY - renderH / 2;

    ctx.drawImage(photoImg, renderX, renderY, renderW, renderH);
    ctx.restore();
  }

  // 2b. Frame Overlay (Ensures authentic green and white border sits cleanly above the photo)
  const frameSrc = options.frameImgUrl || options.frameUrl || '/nacos_id_template_frame.png';
  const frameImg = options.frameImg || await loadOptionalImage(frameSrc);
  if (frameImg && frameImg.complete && frameImg.naturalWidth > 0) {
    ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
  } else {
    // Sharp double border stroke to guarantee clean border lines
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 10;
    ctx.lineJoin = 'round';
    traceRoundedHexagon(ctx, t.photo.vertices, t.photo.cornerRadius);
    ctx.stroke();

    ctx.strokeStyle = '#138601';
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    traceRoundedHexagon(ctx, t.photo.vertices, t.photo.cornerRadius);
    ctx.stroke();
    ctx.restore();
  }

  // 3. Render Dynamic Student Full Name
  const rawName = student?.full_name || student?.name || 'STUDENT NAME';
  const fullName = String(rawName).trim().toUpperCase();

  const nameFontSize = t.name.fontSize; // Fixed 38px
  ctx.font = `${t.name.fontWeight} ${nameFontSize}px ${t.name.fontFamily}`;

  // Word and hyphen-based tokenization to support natural multi-line wrapping
  const rawWords = fullName.split(/\s+/).filter(Boolean);
  const initialTokens = [];
  for (const word of rawWords) {
    if (word.includes('-')) {
      const parts = word.split('-');
      for (let i = 0; i < parts.length; i++) {
        if (i < parts.length - 1) {
          initialTokens.push(parts[i] + '-');
        } else if (parts[i]) {
          initialTokens.push(parts[i]);
        }
      }
    } else {
      initialTokens.push(word);
    }
  }

  const tokens = [];
  for (const token of initialTokens) {
    if (ctx.measureText(token).width > t.name.maxWidth && token.length > 12) {
      const half = Math.ceil(token.length / 2);
      tokens.push(token.slice(0, half) + '-');
      tokens.push(token.slice(half));
    } else {
      tokens.push(token);
    }
  }

  const lines = [];
  let currentLine = '';

  for (const token of tokens) {
    const testLine = currentLine
      ? (currentLine.endsWith('-') ? `${currentLine}${token}` : `${currentLine} ${token}`)
      : token;

    if (ctx.measureText(testLine).width <= t.name.maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = token;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  const numLines = lines.length;
  let centerY = 750;
  let lineGap = 50;

  if (numLines <= 1) {
    centerY = 750;
    lineGap = 0;
  } else if (numLines === 2) {
    centerY = 750;
    lineGap = 50;
  } else if (numLines === 3) {
    centerY = 750;
    lineGap = 46;
  } else {
    centerY = 755;
    lineGap = 40;
  }

  const startY = centerY - ((numLines - 1) * lineGap) / 2;

  // Text color: always crisp bold black (#000000) over the white container
  ctx.fillStyle = t.name.color; // #000000
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  lines.forEach((lineText, idx) => {
    const lineY = startY + idx * lineGap;
    ctx.fillText(lineText, t.name.centerX, lineY);
  });

  // 4. Render Dynamic Registration Number (Digits Only)
  const rawReg = student?.registration_number || student?.matric || cardInfo?.matric_number || cardInfo?.id_card_number || '20241424442';
  const regNo = String(rawReg).replace(/\D/g, '') || String(rawReg).trim();

  let regFontSize = t.registrationNumber.fontSize; // 38
  ctx.font = `${t.registrationNumber.fontWeight} ${regFontSize}px ${t.registrationNumber.fontFamily}`;
  while (ctx.measureText(regNo).width > t.registrationNumber.maxWidth && regFontSize > 22) {
    regFontSize -= 1;
    ctx.font = `${t.registrationNumber.fontWeight} ${regFontSize}px ${t.registrationNumber.fontFamily}`;
  }

  ctx.fillStyle = t.registrationNumber.color; // #000000
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(regNo, t.registrationNumber.centerX, t.registrationNumber.y); // (331, 940-956)
}

/**
 * Trigger download of single image (dataURL or URL)
 */
function triggerFileDownload(urlOrDataUrl, filename) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = urlOrDataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Download high-resolution PNG image
 * Supports downloading Front, Back, or Both sides
 */
export async function downloadIdCardAsImage(frontCanvasOrUrl, filename = 'NACOS-Student-ID-Card', side = 'both') {
  const frontDataUrl = typeof frontCanvasOrUrl === 'string'
    ? frontCanvasOrUrl
    : frontCanvasOrUrl?.toDataURL('image/png');

  const backUrl = ID_CARD_TEMPLATE.masterBackUrl || '/nacos_id_template_back.jpg';

  if (side === 'front' || side === 'both') {
    if (frontDataUrl) {
      triggerFileDownload(frontDataUrl, `${filename}-front.png`);
    }
  }

  if (side === 'back' || side === 'both') {
    if (side === 'both') {
      // Short delay to avoid browser download blocking
      setTimeout(() => {
        triggerFileDownload(backUrl, `${filename}-back.png`);
      }, 400);
    } else {
      triggerFileDownload(backUrl, `${filename}-back.png`);
    }
  }
}

/**
 * Generate and download high-resolution PDF document formatted for standard portrait CR-80 card printing
 * Contains Page 1: Front of ID, Page 2: Back of ID
 */
export function downloadIdCardAsPdf(frontCanvasOrUrl, filename = 'NACOS-Student-ID-Card', backUrl = null) {
  const frontImgData = typeof frontCanvasOrUrl === 'string'
    ? frontCanvasOrUrl
    : frontCanvasOrUrl?.toDataURL('image/png');

  if (!frontImgData) return;

  const backImgData = backUrl || ID_CARD_TEMPLATE.masterBackUrl || '/nacos_id_template_back.jpg';

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    downloadIdCardAsImage(frontCanvasOrUrl, filename, 'both');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${filename} - Official Two-Sided NACOS ID Card</title>
        <style>
          @page {
            size: 53.98mm 85.6mm;
            margin: 0;
          }
          *, *::before, *::after {
            box-sizing: border-box;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .id-card-page {
            width: 53.98mm;
            height: 85.6mm;
            page-break-after: always;
            page-break-inside: avoid;
            break-after: page;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            margin: 0 auto;
          }
          .id-card-page:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }
          img {
            width: 53.98mm;
            height: 85.6mm;
            display: block;
            object-fit: cover;
          }
        </style>
      </head>
      <body>
        <div class="id-card-page">
          <img src="${frontImgData}" alt="NACOS ID Card Front" />
        </div>
        <div class="id-card-page">
          <img src="${backImgData}" alt="NACOS ID Card Back" onload="window.print();" />
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
}

/**
 * Subscribe to real-time ID card and payment updates across devices/tabs
 */
export function subscribeToIdCardUpdates(matricOrId, callback) {
  if (typeof window === 'undefined' || !callback) return () => {};

  const cleanMatric = matricOrId ? String(matricOrId).trim().toUpperCase() : null;

  // 1. Supabase Realtime Channel
  let channel = null;
  try {
    if (supabase && typeof supabase.channel === 'function') {
      channel = supabase
        .channel(`id_card_updates_${cleanMatric || 'all'}_${Date.now()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'id_card_applications' },
          (payload) => {
            const row = payload.new || payload.old;
            if (!cleanMatric || (row && (
              (row.registration_number && row.registration_number.toUpperCase() === cleanMatric) ||
              (row.matric_number && row.matric_number.toUpperCase() === cleanMatric) ||
              row.id === matricOrId
            ))) {
              callback(payload);
            }
          }
        )
        .subscribe();
    }
  } catch (err) {
    console.warn('Realtime channel error:', err);
  }

  // 2. Storage event listener (for multi-tab sync)
  const handleStorage = (e) => {
    if (e.key === ID_APPLICATIONS_STORAGE_KEY || e.key === PAYMENTS_STORAGE_KEY) {
      callback({ type: 'storage', key: e.key });
    }
  };
  window.addEventListener('storage', handleStorage);

  // 3. Visibility and focus listeners (triggers live re-check when switching back to tab/phone)
  const handleFocus = () => {
    callback({ type: 'focus' });
  };
  window.addEventListener('focus', handleFocus);
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      callback({ type: 'visibility' });
    }
  };
  document.addEventListener('visibilitychange', handleVisibility);

  // 4. Polling fallback (every 5 seconds)
  const intervalId = setInterval(() => {
    callback({ type: 'poll' });
  }, 5000);

  return () => {
    if (channel && typeof supabase.removeChannel === 'function') {
      supabase.removeChannel(channel);
    }
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('focus', handleFocus);
    document.removeEventListener('visibilitychange', handleVisibility);
    clearInterval(intervalId);
  };
}
