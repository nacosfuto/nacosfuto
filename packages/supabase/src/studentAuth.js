/**
 * @file packages/supabase/src/studentAuth.js
 * Client-Side Student Authentication & Identity Verification SDK
 * 
 * Communicates with authoritative serverless verification endpoints.
 * Never performs sensitive checks or holds arbitrary unverified state on client.
 */

/**
 * Step 1: Submit Registration Number for ground truth verification
 * @param {string} registrationNumber 
 * @returns {Promise<{ success: boolean, registered?: boolean, step1Token?: string, error?: string, message?: string }>}
 */
export async function studentSignupStep1(registrationNumber) {
  try {
    const res = await fetch('/api/auth/student/signup-step1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationNumber: String(registrationNumber || '').trim() })
    });
    const data = await res.json();
    return data;
  } catch (err) {
    return { success: false, error: 'Network error. Please check your internet connection.' };
  }
}

/**
 * Step 2: Verify Legal Names against official record
 * @param {string} step1Token 
 * @param {{ firstName: string, lastName: string, middleName?: string }} names 
 * @returns {Promise<{ success: boolean, step2Token?: string, channels?: Array<{ type: string, label: string, masked: string }>, noVerifiedContact?: boolean, error?: string, message?: string }>}
 */
export async function studentSignupStep2(step1Token, { firstName, lastName, middleName }) {
  try {
    const res = await fetch('/api/auth/student/signup-step2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step1Token, firstName, lastName, middleName })
    });
    const data = await res.json();
    return data;
  } catch (err) {
    return { success: false, error: 'Network error. Please check your internet connection.' };
  }
}

/**
 * Step 3: Request purpose-bound OTP to verified contact
 * @param {{ stepToken: string, channel: 'email' | 'phone', purpose?: string }} params 
 * @returns {Promise<{ success: boolean, maskedDestination?: string, cooldownSeconds?: number, error?: string, message?: string }>}
 */
export async function sendStudentOtp({ stepToken, channel = 'email', purpose = 'SIGNUP' }) {
  try {
    const res = await fetch('/api/auth/student/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stepToken, channel, purpose })
    });
    const data = await res.json();
    return data;
  } catch (err) {
    return { success: false, error: 'Network error. Please check your internet connection.' };
  }
}

/**
 * Step 3b: Verify 6-digit OTP code
 * @param {{ stepToken: string, otpCode: string, purpose?: string }} params 
 * @returns {Promise<{ success: boolean, authorizationToken?: string, error?: string, message?: string }>}
 */
export async function verifyStudentOtp({ stepToken, otpCode, purpose = 'SIGNUP' }) {
  try {
    const res = await fetch('/api/auth/student/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stepToken, otpCode, purpose })
    });
    const data = await res.json();
    return data;
  } catch (err) {
    return { success: false, error: 'Network error. Please check your internet connection.' };
  }
}

/**
 * Step 4: Complete Signup & Set Password
 * @param {{ authorizationToken: string, password: string }} params 
 * @returns {Promise<{ success: boolean, user?: object, error?: string, message?: string }>}
 */
export async function completeStudentSignup({ authorizationToken, password }) {
  try {
    const res = await fetch('/api/auth/student/complete-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorizationToken, password })
    });
    const data = await res.json();
    if (data.success && data.user) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('nacos_user', JSON.stringify(data.user));
        window.dispatchEvent(new Event('nacos_user_updated'));
      }
    }
    return data;
  } catch (err) {
    return { success: false, error: 'Network error. Please check your internet connection.' };
  }
}

/**
 * Forgot Password Step 1: Check registration number
 * @param {string} registrationNumber 
 */
export async function studentForgotPasswordStep1(registrationNumber) {
  try {
    const res = await fetch('/api/auth/student/forgot-password-step1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationNumber: String(registrationNumber || '').trim() })
    });
    const data = await res.json();
    return data;
  } catch (err) {
    return { success: false, error: 'Network error. Please check your internet connection.' };
  }
}

/**
 * Forgot Password Step 2: Name & contact verification
 * @param {string} step1Token 
 * @param {{ firstName: string, lastName: string, middleName?: string }} names 
 */
export async function studentForgotPasswordStep2(step1Token, { firstName, lastName, middleName }) {
  try {
    const res = await fetch('/api/auth/student/forgot-password-step2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step1Token, firstName, lastName, middleName })
    });
    const data = await res.json();
    return data;
  } catch (err) {
    return { success: false, error: 'Network error. Please check your internet connection.' };
  }
}

/**
 * Forgot Password Step 4: Complete password reset
 * @param {{ authorizationToken: string, newPassword: string }} params 
 */
export async function completeStudentPasswordReset({ authorizationToken, newPassword }) {
  try {
    const res = await fetch('/api/auth/student/complete-reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorizationToken, newPassword })
    });
    const data = await res.json();
    return data;
  } catch (err) {
    return { success: false, error: 'Network error. Please check your internet connection.' };
  }
}

/**
 * Sensitive Action Step-Up: Request OTP
 * @param {{ registrationNumber: string, purpose: string, channel?: string }} params 
 */
export async function requestSensitiveActionStepUp({ registrationNumber, purpose, channel = 'email' }) {
  try {
    const res = await fetch('/api/auth/student/sensitive-action/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationNumber, purpose, channel })
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: 'Network error.' };
  }
}

/**
 * Sensitive Action Step-Up: Verify OTP
 * @param {{ registrationNumber: string, purpose: string, otpCode: string }} params 
 */
export async function verifySensitiveActionStepUp({ registrationNumber, purpose, otpCode }) {
  try {
    const res = await fetch('/api/auth/student/sensitive-action/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationNumber, purpose, otpCode })
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: 'Network error.' };
  }
}

/**
 * Sensitive Action Step-Up: Verify with Password
 * @param {{ registrationNumber: string, password: string, purpose: string }} params 
 */
export async function verifySensitiveActionWithPassword({ registrationNumber, password, purpose }) {
  try {
    const res = await fetch('/api/auth/student/sensitive-action/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationNumber, password, purpose })
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: 'Network error.' };
  }
}
