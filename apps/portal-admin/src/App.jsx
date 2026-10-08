import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';

import PortalAdminLogin from './pages/PortalAdminLogin';
const PortalAdminDashboard = React.lazy(() => import('./pages/PortalAdminDashboard'));
const PortalAdminStudents = React.lazy(() => import('./pages/PortalAdminStudents'));
const PortalAdminDues = React.lazy(() => import('./pages/PortalAdminDues'));
const PortalAdminIdCards = React.lazy(() => import('./pages/PortalAdminIdCards'));
const PortalAdminResources = React.lazy(() => import('./pages/PortalAdminResources'));
const PortalAdminCourses = React.lazy(() => import('./pages/PortalAdminCourses'));
const PortalAdminResults = React.lazy(() => import('./pages/PortalAdminResults'));
const PortalAdminMedia = React.lazy(() => import('./pages/PortalAdminMedia'));
const PortalAdminNotices = React.lazy(() => import('./pages/PortalAdminNotices'));
const PortalAdminSettings = React.lazy(() => import('./pages/PortalAdminSettings'));
import PortalAdminProtectedRoute from './components/PortalAdminProtectedRoute';

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#041801]">
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
    console.error('Portal Admin ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#041801] text-white flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-[#083002] border border-[#138601]/40 rounded-2xl p-6 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-red-900/40 border border-red-500/50 text-red-400 flex items-center justify-center mx-auto text-xl font-bold">
              !
            </div>
            <h2 className="text-lg font-bold text-white">Something went wrong</h2>
            <p className="text-xs text-gray-300 leading-relaxed">
              {this.state.error?.message || 'A render error occurred in the Portal Administration application.'}
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
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
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
  const isNestedUnderPortalAdmin = typeof window !== 'undefined' && window.location.pathname.startsWith('/portal-admin');

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter basename={isNestedUnderPortalAdmin ? '/portal-admin' : '/'}>
          <React.Suspense fallback={<LoadingFallback />}>
          <Routes>
          {/* Public Administrative Authentication */}
          <Route path="/login" element={<PortalAdminLogin />} />
          <Route path="/portal-admin/login" element={<PortalAdminLogin />} />

          {/* Protected Portal Admin Operations */}
          <Route 
            path="/" 
            element={
              <PortalAdminProtectedRoute>
                <PortalAdminDashboard />
              </PortalAdminProtectedRoute>
            } 
          />
          <Route 
            path="/portal-admin" 
            element={
              <PortalAdminProtectedRoute>
                <PortalAdminDashboard />
              </PortalAdminProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <PortalAdminProtectedRoute>
                <PortalAdminDashboard />
              </PortalAdminProtectedRoute>
            } 
          />
          <Route 
            path="/portal-admin/dashboard" 
            element={
              <PortalAdminProtectedRoute>
                <PortalAdminDashboard />
              </PortalAdminProtectedRoute>
            } 
          />
          <Route 
            path="/students" 
            element={
              <PortalAdminProtectedRoute requiredPermission="student_portal.students">
                <PortalAdminStudents />
              </PortalAdminProtectedRoute>
            } 
          />
          <Route 
            path="/courses" 
            element={
              <PortalAdminProtectedRoute requiredPermission="student_portal.view">
                <PortalAdminCourses />
              </PortalAdminProtectedRoute>
            } 
          />
          <Route 
            path="/results" 
            element={
              <PortalAdminProtectedRoute requiredPermission="student_portal.results">
                <PortalAdminResults />
              </PortalAdminProtectedRoute>
            } 
          />
          <Route 
            path="/dues" 
            element={
              <PortalAdminProtectedRoute requiredPermission="student_portal.view">
                <PortalAdminDues />
              </PortalAdminProtectedRoute>
            } 
          />
          <Route 
            path="/portal-admin/dues" 
            element={
              <PortalAdminProtectedRoute requiredPermission="student_portal.view">
                <PortalAdminDues />
              </PortalAdminProtectedRoute>
            } 
          />
          <Route 
            path="/id-cards" 
            element={
              <PortalAdminProtectedRoute requiredPermission="student_portal.id_cards">
                <PortalAdminIdCards />
              </PortalAdminProtectedRoute>
            } 
          />
          <Route 
            path="/notices" 
            element={
              <PortalAdminProtectedRoute requiredPermission="student_portal.view">
                <PortalAdminNotices />
              </PortalAdminProtectedRoute>
            } 
          />
          <Route 
            path="/resources" 
            element={
              <PortalAdminProtectedRoute requiredPermission="student_portal.view">
                <PortalAdminResources />
              </PortalAdminProtectedRoute>
            } 
          />
          <Route 
            path="/media" 
            element={
              <PortalAdminProtectedRoute requiredPermission="student_portal.view">
                <PortalAdminMedia />
              </PortalAdminProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <PortalAdminProtectedRoute requiredPermission="student_portal.settings">
                <PortalAdminSettings />
              </PortalAdminProtectedRoute>
            } 
          />

          {/* Legacy Aliases */}
          <Route path="/admin/students" element={<Navigate to="/students" replace />} />
          <Route path="/admin/id-cards" element={<Navigate to="/id-cards" replace />} />
          <Route path="/admin/media" element={<Navigate to="/media" replace />} />

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
