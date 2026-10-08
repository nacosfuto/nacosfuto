/**
 * NACOS Student Registration & Data Validation Rules
 */

/**
 * Clean and normalize registration number
 */
export function sanitizeRegNumber(regNo) {
  if (!regNo) return '';
  return regNo.toString().trim().toUpperCase();
}

/**
 * Validate Student Registration Number presence and basic normalization.
 * Format-based validation (length, regex, admission year pattern) has been completely removed.
 * Registration numbers are treated as database identifiers verified against the student records.
 */
export function validateRegistrationNumber(regNo) {
  if (!regNo) {
    return { isValid: false, error: 'Registration number is required.' };
  }

  const clean = sanitizeRegNumber(regNo);
  if (!clean) {
    return { isValid: false, error: 'Registration number is required.' };
  }

  return { isValid: true, sanitized: clean };
}

/**
 * Validate Student Email Address
 */
export function validateEmail(email) {
  if (!email) {
    return { isValid: false, error: 'Email address is required.' };
  }

  const clean = email.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(clean)) {
    return { isValid: false, error: 'Please enter a valid email address.' };
  }

  const isInstitutional = clean.endsWith('@futo.edu.ng');

  return { isValid: true, sanitized: clean, isInstitutional };
}

/**
 * Validate Student Nigerian Phone Number
 * Accepts: +234XXXXXXXXXX, 080XXXXXXXX, 090XXXXXXXX, 070XXXXXXXX, 081XXXXXXXX, 234XXXXXXXXXX
 */
export function validatePhoneNumber(phone) {
  if (!phone) {
    return { isValid: false, error: 'Phone number is required.' };
  }

  let clean = phone.toString().replace(/[\s\-\(\)]/g, '');

  if (clean.startsWith('+234')) {
    clean = '0' + clean.slice(4);
  } else if (clean.startsWith('234')) {
    clean = '0' + clean.slice(3);
  }

  const ngPhoneRegex = /^0(70|80|81|90|91|80|71)\d{8}$/;

  if (!ngPhoneRegex.test(clean)) {
    return {
      isValid: false,
      error: 'Please enter a valid Nigerian mobile phone number (e.g., 08012345678).'
    };
  }

  return { 
    isValid: true, 
    sanitized: clean, 
    international: '+234' + clean.slice(1),
    termii: '234' + clean.slice(1)
  };
}

/**
 * Format Nigerian phone number for Termii API
 * Termii expects format: 2348012345678 (no leading '+' and no leading '0')
 */
export function formatPhoneForTermii(phone) {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 11) {
    return '234' + digits.slice(1);
  }
  if (digits.startsWith('234') && digits.length === 13) {
    return digits;
  }
  if (digits.length === 10) {
    return '234' + digits;
  }
  return digits;
}

