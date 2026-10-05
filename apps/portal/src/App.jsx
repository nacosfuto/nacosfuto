import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Results from './pages/Results';
import Dues from './pages/Dues';
import Courses from './pages/Courses';
import Profile from './pages/Profile';
import IdCard from './pages/IdCard';
import IdVerification from './pages/IdVerification';
import Notices from './pages/Notices';
import HackathonDetail from './pages/HackathonDetail';
import HackathonApply from './pages/HackathonApply';
import AdminHub from './pages/AdminHub';

function PortalSEOHandler() {
  const location = useLocation();

  useEffect(() => {
    const titles = {
      '/': 'Student Login | NACOS FUTO Portal',
      '/login': 'Student Login | NACOS FUTO Portal',
      '/register': 'Create Account | NACOS FUTO Student Portal',
      '/forgot-password': 'Reset Password | NACOS FUTO Portal',
      '/dashboard': 'Student Dashboard | NACOS FUTO Portal',
      '/notices': 'Departmental Bulletins & Notices | NACOS FUTO Portal',
      '/bulletin': 'Departmental Bulletins | NACOS FUTO Portal',
      '/results': 'Semester Results & CGPA | NACOS FUTO Portal',
      '/dues': 'Departmental Dues & Clearance | NACOS FUTO Portal',
      '/courses': 'Course Registration & Syllabi | NACOS FUTO Portal',
      '/profile': 'Student Academic Profile | NACOS FUTO Portal',
      '/id-card': 'Digital Student ID Card | NACOS FUTO Portal',
      '/admin-hub': 'Administrative Control Gateway | NACOS FUTO',
      '/hackathons/BuildXNACOS': 'BuildX NACOS National Hackathon | NACOS FUTO',
      '/hackathons/BuildXNACOS/apply': 'Apply - BuildX NACOS Hackathon | NACOS FUTO'
    };

    const title = titles[location.pathname] || 'NACOS FUTO Portal | Student Academic & Clearance Hub';
    document.title = title;
  }, [location.pathname]);

  return null;
}

function App() {
  const isNestedUnderPortal = typeof window !== 'undefined' && window.location.pathname.startsWith('/portal');

  return (
    <ThemeProvider>
      <BrowserRouter basename={isNestedUnderPortal ? '/portal' : '/'}>
        <PortalSEOHandler />
        <Routes>
          {/* Authentication & Student Entry */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Core Student Academic Portal */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/notices" element={<Notices />} />
          <Route path="/bulletin" element={<Notices />} />
          <Route path="/results" element={<Results />} />
          <Route path="/dues" element={<Dues />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/resources" element={<Courses />} />
          <Route path="/resource-hub" element={<Courses />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/id-card" element={<IdCard />} />

          {/* Dedicated Administrative Gateway & Control Center */}
          <Route path="/admin-hub" element={<AdminHub />} />
          <Route path="/admin-portal" element={<AdminHub />} />
          <Route path="/admin-gateway" element={<AdminHub />} />
          <Route path="/admin-access" element={<AdminHub />} />
          <Route path="/admin-login" element={<AdminHub />} />
          <Route path="/admin" element={<AdminHub />} />

          {/* Public Verification Route */}
          <Route path="/verify/id/:id" element={<IdVerification />} />

          {/* Dedicated National Hackathon Module (Accessible via button/link without cluttering student portal) */}
          <Route path="/hackathons" element={<Navigate to="/hackathons/BuildXNACOS" replace />} />
          <Route path="/hackathons/BuildXNACOS" element={<HackathonDetail />} />
          <Route path="/hackathons/BuildXNACOS/apply" element={<HackathonApply />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
