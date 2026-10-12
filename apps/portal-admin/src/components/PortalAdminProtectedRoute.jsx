import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getPortalAdminSession, logoutPortalAdmin, verifyLiveAdminSession } from '@nacos/auth';
import { ShieldAlert, LogOut } from 'lucide-react';

export const PortalAdminProtectedRoute = ({ children, requiredPermission = 'student_portal.view' }) => {
  const location = useLocation();
  const admin = getPortalAdminSession();

  // Background Live Verification & Strict 1-Hour Expiration Check
  useEffect(() => {
    if (!admin) return;

    // Check on mount
    const checkSession = async () => {
      const res = await verifyLiveAdminSession('portal');
      if (!res.valid) {
        await logoutPortalAdmin();
        window.location.href = window.location.pathname.startsWith('/portal-admin') 
          ? '/portal-admin/login?reason=session_expired' 
          : '/login?reason=session_expired';
      }
    };

    checkSession();

    // Check every 30 seconds for 1-hour expiration deadline
    const interval = setInterval(() => {
      const current = getPortalAdminSession();
      if (!current) {
        clearInterval(interval);
        window.location.href = window.location.pathname.startsWith('/portal-admin') 
          ? '/portal-admin/login?reason=session_expired' 
          : '/login?reason=session_expired';
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Step 1: Authentication Check
  if (!admin) {
    return <Navigate to="/login?reason=session_expired" state={{ from: location }} replace />;
  }

  // Step 2: Validate Scope is student_portal or super_admin
  const isAllowedScope = 
    admin.scope === 'student_portal' || 
    admin.scope === 'super_admin' || 
    admin.role === 'super_admin' || 
    admin.role === 'portal_admin' || 
    admin.role === 'course_adviser';

  if (!isAllowedScope) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-red-800/60 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-950/60 border border-red-800 text-red-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Unauthorized Portal Scope</h2>
          <p className="text-xs text-red-200/80 leading-relaxed">
            Your account ({admin.email}) holds the <code className="bg-black/50 px-2 py-0.5 rounded text-red-300 font-mono">{admin.scope}</code> scope.
            Access to the Student Portal Administration is strictly reserved for <code className="bg-black/50 px-2 py-0.5 rounded text-emerald-300 font-mono">student_portal</code> administrators.
          </p>
          <div className="pt-2 flex gap-3 justify-center">
            <button
              type="button"
              onClick={async () => {
                await logoutPortalAdmin();
                window.location.href = '/login';
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-800 hover:bg-red-700 text-white transition-colors cursor-pointer flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out & Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default PortalAdminProtectedRoute;
