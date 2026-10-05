import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ThemeProvider } from './context/ThemeContext';

import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminMedia from './pages/AdminMedia';
import AdminGallery from './pages/AdminGallery';
import AdminNews from './pages/AdminNews';
import AdminEvents from './pages/AdminEvents';
import AdminHomepage from './pages/AdminHomepage';
import AdminAuditLogs from './pages/AdminAuditLogs';
import AdminUsers from './pages/AdminUsers';
import AdminYellowPages from './pages/AdminYellowPages';
import AdminClubs from './pages/AdminClubs';
import AdminAlumni from './pages/AdminAlumni';
import AdminExecutives from './pages/AdminExecutives';
import { AdminProtectedRoute } from './components/AdminProtectedRoute';

function App() {
  const isNestedUnderAdmin = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

  return (
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
        <Routes>
          {/* Authentication */}
          <Route path="/login" element={<AdminLogin />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Core Dashboard */}
          <Route path="/" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
          <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
          <Route path="/dashboard" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />

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

          <Route path="/alumni" element={<AdminProtectedRoute><AdminAlumni /></AdminProtectedRoute>} />
          <Route path="/admin/alumni" element={<AdminProtectedRoute><AdminAlumni /></AdminProtectedRoute>} />

          <Route path="/executives" element={<AdminProtectedRoute><AdminExecutives /></AdminProtectedRoute>} />
          <Route path="/admin/executives" element={<AdminProtectedRoute><AdminExecutives /></AdminProtectedRoute>} />

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
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
