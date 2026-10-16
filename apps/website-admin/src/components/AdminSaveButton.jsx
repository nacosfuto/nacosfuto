import React from 'react';
import { Loader, Save } from 'lucide-react';

/**
 * Standardized Loading-Aware Action / Save Button for Website Admin Dashboard
 * Communicates async state, disables duplicate submissions, and renders a smooth spinner.
 */
export const AdminSaveButton = ({
  loading = false,
  loadingText = 'Saving...',
  children = 'Save Changes',
  icon: Icon = Save,
  type = 'submit',
  disabled = false,
  variant = 'primary', // 'primary' | 'danger' | 'secondary' | 'amber'
  className = '',
  onClick,
  ...props
}) => {
  const isDisabled = Boolean(disabled || loading);

  const variantStyles = {
    primary: 'bg-[#138601] hover:bg-[#0f6c01] text-white shadow-xs',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-xs',
    secondary: 'border border-gray-300 dark:border-[#138601]/30 hover:bg-gray-100 dark:hover:bg-[#041801] text-gray-700 dark:text-gray-200',
    amber: 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
  }[variant] || 'bg-[#138601] hover:bg-[#0f6c01] text-white shadow-xs';

  const handleClick = (e) => {
    if (loading) {
      e.preventDefault();
      return;
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={handleClick}
      aria-busy={loading}
      className={`relative inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all select-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${variantStyles} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader className="w-3.5 h-3.5 animate-spin shrink-0" aria-hidden="true" />
          <span>{loadingText}</span>
        </>
      ) : (
        <>
          {Icon && <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
          <span>{children}</span>
        </>
      )}
    </button>
  );
};

export default AdminSaveButton;
