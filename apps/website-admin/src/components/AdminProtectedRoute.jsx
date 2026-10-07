import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getWebsiteAdminSession, hasPermission } from '@nacos/supabase/adminAuth';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { logoutWebsiteAdmin } from '@nacos/supabase/adminAuth';

export const AdminProtectedRoute = ({ children, requiredPermission = 'main_website.view' }) => {
  const location = useLocation();
  const admin = getWebsiteAdminSession();

  // Step 1: Authentication & Scope Check
  if (!admin) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Step 2: Validate Scope is explicitly main_website or super_admin
  if (admin.scope !== 'main_website' && admin.scope !== 'super_admin') {
    return (
      <div className="min-h-screen bg-[#041801] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#083002] border border-red-800/60 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-950/60 border border-red-800 text-red-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Unauthorized Scope</h2>
          <p className="text-xs text-red-200/80 leading-relaxed">
            Your account ({admin.email}) holds the <code className="bg-black/50 px-2 py-0.5 rounded text-red-300 font-mono">{admin.scope}</code> scope.
            Access to the Main Website Administration interface is strictly restricted to <code className="bg-black/50 px-2 py-0.5 rounded text-green-300 font-mono">main_website</code> administrators.
          </p>
          <div className="pt-2 flex gap-3 justify-center">
            <button
              type="button"
              onClick={async () => {
                await logoutWebsiteAdmin();
                window.location.href = window.location.pathname.startsWith('/admin') ? '/admin/login' : '/login';
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-800 hover:bg-red-700 text-white transition-colors cursor-pointer"
            >
              Sign Out & Switch Account
            </button>
            <a
              href="/"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              Back to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Granular Permission Check
  if (requiredPermission && !hasPermission(admin, requiredPermission)) {
    return (
      <div className="min-h-screen bg-[#041801] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#083002] border border-amber-800/60 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-950/60 border border-amber-800 text-amber-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Insufficient Permission</h2>
          <p className="text-xs text-amber-200/80 leading-relaxed">
            Your role (<strong className="text-white">{admin.role}</strong>) does not have the required <code className="bg-black/50 px-2 py-0.5 rounded text-amber-300 font-mono">{requiredPermission}</code> permission to access this section.
          </p>
          <div className="pt-2">
            <a
              href="/admin"
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#138601] hover:bg-[#0f6c01] text-white transition-colors inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default AdminProtectedRoute;
