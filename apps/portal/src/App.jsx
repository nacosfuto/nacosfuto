import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';

// Core entry routes (loaded eagerly for instant authentication)
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';

// On-demand code-split routes
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Results = lazy(() => import('./pages/Results'));
const Dues = lazy(() => import('./pages/Dues'));
const Courses = lazy(() => import('./pages/Courses'));
const Profile = lazy(() => import('./pages/Profile'));
const IdCard = lazy(() => import('./pages/IdCard'));
const IdVerification = lazy(() => import('./pages/IdVerification'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const Notices = lazy(() => import('./pages/Notices'));
const Receipt = lazy(() => import('./pages/Receipt'));
const HackathonDetail = lazy(() => import('./pages/HackathonDetail'));
const HackathonApply = lazy(() => import('./pages/HackathonApply'));
const AdminHub = lazy(() => import('./pages/AdminHub'));
import { getAppUrls } from '@nacos/config/urls';

const PortalPageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#041801]">
    <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
  </div>
);

const WebsiteAdminRedirect = () => {
  const location = useLocation();
  const { websiteAdmin } = getAppUrls();

  useEffect(() => {
    const baseUrl = websiteAdmin.replace(/\/+$/, '');
    const cleanSearch = location.search || '';
    const cleanPath = location.pathname.replace(/^\/admin(-login)?/, '');
    const targetPath = cleanPath || '/login';
    const destination = `${baseUrl}${targetPath.startsWith('/') ? targetPath : `/${targetPath}`}${cleanSearch}`;
    if (window.location.href !== destination) {
      window.location.replace(destination);
    }
  }, [location, websiteAdmin]);

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-[#041801]">
      <div className="w-8 h-8 border-3 border-[#138601] border-t-transparent rounded-full animate-spin" />
    </div>
  );
};

const PortalAdminRedirect = () => {
  const location = useLocation();
  const { portalAdmin } = getAppUrls();

  useEffect(() => {
    const baseUrl = portalAdmin.replace(/\/+$/, '');
    const cleanSearch = location.search || '';
    const cleanPath = location.pathname.replace(/^\/portal-admin/, '');
    const targetPath = cleanPath || '/login';
    const destination = `${baseUrl}${targetPath.startsWith('/') ? targetPath : `/${targetPath}`}${cleanSearch}`;
    if (window.location.href !== destination) {
      window.location.replace(destination);
    }
  }, [location, portalAdmin]);

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-[#041801]">
      <div className="w-8 h-8 border-3 border-[#138601] border-t-transparent rounded-full animate-spin" />
    </div>
  );
};

const ElectraRedirect = () => {
  const location = useLocation();
  const { electra } = getAppUrls();

  useEffect(() => {
    const baseUrl = electra.replace(/\/+$/, '');
    const cleanSearch = location.search || '';
    const cleanPath = location.pathname.replace(/^\/electra/, '');
    const destination = `${baseUrl}${cleanPath}${cleanSearch}`;
    if (window.location.href !== destination) {
      window.location.replace(destination);
    }
  }, [location, electra]);

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-[#041801]">
      <div className="w-8 h-8 border-3 border-[#138601] border-t-transparent rounded-full animate-spin" />
    </div>
  );
};

const ElectraAdminRedirect = () => {
  const location = useLocation();
  const { electraAdmin } = getAppUrls();

  useEffect(() => {
    const baseUrl = electraAdmin.replace(/\/+$/, '');
    const cleanSearch = location.search || '';
    const cleanPath = location.pathname.replace(/^\/electra-admin/, '');
    const destination = `${baseUrl}${cleanPath}${cleanSearch}`;
    if (window.location.href !== destination) {
      window.location.replace(destination);
    }
  }, [location, electraAdmin]);

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-[#041801]">
      <div className="w-8 h-8 border-3 border-[#138601] border-t-transparent rounded-full animate-spin" />
    </div>
  );
};

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
      '/receipt': 'Official Payment Receipt | NACOS FUTO Portal',
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
        <Suspense fallback={<PortalPageLoader />}>
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
            <Route path="/receipt" element={<Receipt />} />
            <Route path="/receipt/:reference" element={<Receipt />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/verify" element={<PaymentSuccess />} />

            {/* Dedicated Administrative Direct Login & Dashboard Routes */}
            <Route path="/admin/login" element={<WebsiteAdminRedirect />} />
            <Route path="/admin/*" element={<WebsiteAdminRedirect />} />
            <Route path="/portal-admin" element={<PortalAdminRedirect />} />
            <Route path="/portal-admin/login" element={<PortalAdminRedirect />} />
            <Route path="/portal-admin/*" element={<PortalAdminRedirect />} />

            {/* Dedicated ELECTRA Electoral Platform & Admin Routes */}
            <Route path="/electra" element={<ElectraRedirect />} />
            <Route path="/electra/*" element={<ElectraRedirect />} />
            <Route path="/electra-admin" element={<ElectraAdminRedirect />} />
            <Route path="/electra-admin/*" element={<ElectraAdminRedirect />} />

            {/* Dedicated Administrative Gateway & Control Center */}
            <Route path="/admin-hub" element={<AdminHub />} />
            <Route path="/admin-portal" element={<AdminHub />} />
            <Route path="/admin-gateway" element={<AdminHub />} />
            <Route path="/admin-access" element={<AdminHub />} />
            <Route path="/admin-login" element={<WebsiteAdminRedirect />} />
            <Route path="/admin" element={<WebsiteAdminRedirect />} />

            {/* Public Verification Route */}
            <Route path="/verify/id/:id" element={<IdVerification />} />

            {/* Dedicated National Hackathon Module (Accessible via button/link without cluttering student portal) */}
            <Route path="/hackathons" element={<Navigate to="/hackathons/BuildXNACOS" replace />} />
            <Route path="/hackathons/BuildXNACOS" element={<HackathonDetail />} />
            <Route path="/hackathons/BuildXNACOS/apply" element={<HackathonApply />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
