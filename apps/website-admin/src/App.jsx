import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ThemeProvider } from './context/ThemeContext';

import AdminLogin from './pages/AdminLogin';
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const AdminMedia = React.lazy(() => import('./pages/AdminMedia'));
const AdminGallery = React.lazy(() => import('./pages/AdminGallery'));
const AdminNews = React.lazy(() => import('./pages/AdminNews'));
const AdminEvents = React.lazy(() => import('./pages/AdminEvents'));
const AdminHomepage = React.lazy(() => import('./pages/AdminHomepage'));
const AdminAuditLogs = React.lazy(() => import('./pages/AdminAuditLogs'));
const AdminUsers = React.lazy(() => import('./pages/AdminUsers'));
const AdminYellowPages = React.lazy(() => import('./pages/AdminYellowPages'));
const AdminClubs = React.lazy(() => import('./pages/AdminClubs'));
const AdminSpiritualLife = React.lazy(() => import('./pages/AdminSpiritualLife'));
const AdminAlumni = React.lazy(() => import('./pages/AdminAlumni'));
const AdminExecutives = React.lazy(() => import('./pages/AdminExecutives'));
const AdminAdministration = React.lazy(() => import('./pages/AdminAdministration'));
import { AdminProtectedRoute } from './components/AdminProtectedRoute';

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#031201]">
    <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
  </div>
);

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Website Admin ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white dark:bg-[#031201] text-gray-900 dark:text-white flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-white dark:bg-[#083002] border border-red-300 dark:border-red-800/60 rounded-2xl p-6 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/40 border border-red-400 dark:border-red-500/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto text-xl font-bold">
              !
            </div>
            <h2 className="text-lg font-bold">Something went wrong</h2>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              {this.state.error?.message || 'A render error occurred in the Website Administration application.'}
            </p>
            <div className="pt-2 flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#138601] hover:bg-[#0f6c01] text-white transition-colors cursor-pointer"
              >
                Reload Page
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = '/login';
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-800 dark:text-white transition-colors cursor-pointer"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const isLocal = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.endsWith('.local')
  );
  const isNestedUnderAdmin = !isLocal && typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
        <BrowserRouter basename={isNestedUnderAdmin ? '/admin' : '/'}>
          <React.Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Authentication */}
              <Route path="/login" element={<AdminLogin />} />
              <Route path="/admin/login" element={<AdminLogin />} />

              {/* Core Dashboard */}
              <Route path="/" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
              <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
              <Route path="/dashboard" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
              <Route path="/admin/dashboard" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />

            {/* CMS Content Modules */}
            <Route path="/media" element={<AdminProtectedRoute requiredPermission="main_website.media"><AdminMedia /></AdminProtectedRoute>} />
            <Route path="/admin/media" element={<AdminProtectedRoute requiredPermission="main_website.media"><AdminMedia /></AdminProtectedRoute>} />

            <Route path="/gallery" element={<AdminProtectedRoute requiredPermission="main_website.gallery"><AdminGallery /></AdminProtectedRoute>} />
            <Route path="/admin/gallery" element={<AdminProtectedRoute requiredPermission="main_website.gallery"><AdminGallery /></AdminProtectedRoute>} />

            <Route path="/news" element={<AdminProtectedRoute requiredPermission="main_website.news"><AdminNews /></AdminProtectedRoute>} />
            <Route path="/admin/news" element={<AdminProtectedRoute requiredPermission="main_website.news"><AdminNews /></AdminProtectedRoute>} />

            <Route path="/events" element={<AdminProtectedRoute requiredPermission="main_website.events"><AdminEvents /></AdminProtectedRoute>} />
            <Route path="/admin/events" element={<AdminProtectedRoute requiredPermission="main_website.events"><AdminEvents /></AdminProtectedRoute>} />

            <Route path="/homepage" element={<AdminProtectedRoute requiredPermission="main_website.homepage"><AdminHomepage /></AdminProtectedRoute>} />
            <Route path="/admin/homepage" element={<AdminProtectedRoute requiredPermission="main_website.homepage"><AdminHomepage /></AdminProtectedRoute>} />

            {/* Yellow Pages, Clubs, Alumni Directories */}
            <Route path="/yellow-pages" element={<AdminProtectedRoute><AdminYellowPages /></AdminProtectedRoute>} />
            <Route path="/admin/yellow-pages" element={<AdminProtectedRoute><AdminYellowPages /></AdminProtectedRoute>} />

            <Route path="/clubs" element={<AdminProtectedRoute><AdminClubs /></AdminProtectedRoute>} />
            <Route path="/admin/clubs" element={<AdminProtectedRoute><AdminClubs /></AdminProtectedRoute>} />

            <Route path="/spiritual-life" element={<AdminProtectedRoute><AdminSpiritualLife /></AdminProtectedRoute>} />
            <Route path="/admin/spiritual-life" element={<AdminProtectedRoute><AdminSpiritualLife /></AdminProtectedRoute>} />

            <Route path="/alumni" element={<AdminProtectedRoute><AdminAlumni /></AdminProtectedRoute>} />
            <Route path="/admin/alumni" element={<AdminProtectedRoute><AdminAlumni /></AdminProtectedRoute>} />

            <Route path="/executives" element={<AdminProtectedRoute><AdminExecutives /></AdminProtectedRoute>} />
            <Route path="/admin/executives" element={<AdminProtectedRoute><AdminExecutives /></AdminProtectedRoute>} />

            <Route path="/administration" element={<AdminProtectedRoute><AdminAdministration /></AdminProtectedRoute>} />
            <Route path="/admin/administration" element={<AdminProtectedRoute><AdminAdministration /></AdminProtectedRoute>} />

            <Route path="/audit-logs" element={<AdminProtectedRoute requiredPermission="main_website.view"><AdminAuditLogs /></AdminProtectedRoute>} />
            <Route path="/admin/audit-logs" element={<AdminProtectedRoute requiredPermission="main_website.view"><AdminAuditLogs /></AdminProtectedRoute>} />

            {/* User & Access Management (Super Admin) */}
            <Route path="/admins" element={<AdminProtectedRoute requiredPermission="super_admin"><AdminUsers /></AdminProtectedRoute>} />
            <Route path="/admin/admins" element={<AdminProtectedRoute requiredPermission="super_admin"><AdminUsers /></AdminProtectedRoute>} />

            <Route path="/settings" element={<AdminProtectedRoute requiredPermission="main_website.settings"><AdminHomepage /></AdminProtectedRoute>} />
            <Route path="/admin/settings" element={<AdminProtectedRoute requiredPermission="main_website.settings"><AdminHomepage /></AdminProtectedRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </React.Suspense>
      </BrowserRouter>
    </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
