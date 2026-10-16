import { toast } from 'react-toastify';

/**
 * Standardized Admin Toast and Error Handling System
 * Ensures consistent feedback across all asynchronous actions in the Website Admin Dashboard.
 */
export const adminToast = {
  success: (message, options = {}) => {
    toast.success(message, {
      position: 'top-right',
      autoClose: 3500,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options
    });
  },

  error: (message, options = {}) => {
    toast.error(message || 'Failed to save changes. Please try again.', {
      position: 'top-right',
      autoClose: 4500,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options
    });
  },

  info: (message, options = {}) => {
    toast.info(message, {
      position: 'top-right',
      autoClose: 3500,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options
    });
  },

  warning: (message, options = {}) => {
    toast.warning(message, {
      position: 'top-right',
      autoClose: 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options
    });
  }
};

/**
 * Extracts a safe, user-friendly, actionable error message without exposing sensitive internals
 */
export const getSafeErrorMessage = (
  error, 
  fallback = 'Failed to save changes. Please check your network connection and retry.'
) => {
  if (!error) return fallback;
  if (typeof error === 'string') return error;

  const raw = error.message || error.error || error.details || '';
  if (!raw) return fallback;

  if (raw.includes('Failed to fetch') || raw.includes('NetworkError') || raw.includes('network')) {
    return 'Unable to save content due to a network connection error. Check your connection and retry.';
  }
  if (raw.includes('JWT') || raw.includes('token') || raw.includes('expired') || raw.includes('session')) {
    return 'Your administrative session may have expired. Please refresh the page or sign in again.';
  }
  if (raw.includes('duplicate key') || raw.includes('unique constraint')) {
    return 'An item with this title or identifier already exists. Please choose a different title.';
  }
  if (raw.includes('permission denied') || raw.includes('violates row-level security')) {
    return 'You do not have permission to perform this modification. Check your administrator role.';
  }

  return raw.length > 180 ? `${raw.slice(0, 180)}...` : raw;
};
