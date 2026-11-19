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
const Events = lazy(() => import('./pages/Events'));
const Receipt = lazy(() => import('./pages/Receipt'));
const AdminHub = lazy(() => import('./pages/AdminHub'));
import { getAppUrls } from '@nacos/config/urls';
import { initAcademicSessionSync } from '@nacos/supabase';
import ErrorBoundary from './components/ErrorBoundary';

const PortalPageLoader = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f8fafc] dark:bg-[#041801] w-full min-h-[100dvh] h-full p-4 overflow-hidden">
    <div className="flex items-center justify-center p-4">
      <img
        src="https://res.cloudinary.com/a2mmcttn/image/upload/v1791451674/DICT_Synergy_Logo.png"
        alt="Loading"
        className="w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 max-w-[75vw] max-h-[75vh] object-contain animate-spin select-none pointer-events-none"
        style={{ animationDuration: '3s' }}
      />
    </div>
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

const DEFAULT_PORTAL_OG_IMAGE = 'https://nacosfuto.com/logo.png';
const BASE_DOMAIN = 'https://nacosfuto.com';

function setMetaTag(selector, attrName, attrValue, content) {
  if (typeof document === 'undefined') return;
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLinkTag(rel, href) {
  if (typeof document === 'undefined') return;
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function PortalSEOHandler() {
  const location = useLocation();

  useEffect(() => {
    const titles = {
      '/': 'Student Login | NACOS FUTO Portal',
      '/login': 'Student Login | NACOS FUTO Portal',
      '/register': 'Create Account | NACOS FUTO Student Portal',
      '/forgot-password': 'Reset Password | NACOS FUTO Portal',
      '/dashboard': 'Student Dashboard | NACOS FUTO Portal',
      '/events': 'Department Events & Summits | NACOS FUTO Portal',
      '/notices': 'Departmental Bulletins & Notices | NACOS FUTO Portal',
      '/bulletin': 'Departmental Bulletins | NACOS FUTO Portal',
      '/results': 'My Academic Results & CGPA | NACOS FUTO Portal',
      '/dues': 'Departmental Dues & Clearance | NACOS FUTO Portal',
      '/courses': 'Course Registration & Syllabi | NACOS FUTO Portal',
      '/profile': 'Student Academic Profile | NACOS FUTO Portal',
      '/id-card': 'Digital Student ID Card | NACOS FUTO Portal',
      '/id-card/view': 'View Student ID Card | NACOS FUTO Portal',
      '/id/view': 'View Student ID Card | NACOS FUTO Portal',
      '/receipt': 'Official Payment Receipt | NACOS FUTO Portal',
      '/admin-hub': 'Administrative Control Gateway | NACOS FUTO'
    };

    const title = titles[location.pathname] || 'NACOS FUTO Portal | Student Academic & Clearance Hub';
    const description = 'Official student academic portal for FUTO Computer Science. Register courses, pay departmental dues, generate verified digital student ID cards, view semester results, and track departmental clearances.';
    const image = DEFAULT_PORTAL_OG_IMAGE;
    const siteName = 'NACOS FUTO Student Portal';

    const canonicalPath = location.pathname.startsWith('/portal') 
      ? location.pathname 
      : `/portal${location.pathname}`;
    const canonicalUrl = `${BASE_DOMAIN}${canonicalPath}`;

    // 1. Update Document Title
    document.title = title;

    // 2. Primary Meta Tags
    setMetaTag('meta[name="title"]', 'name', 'title', title);
    setMetaTag('meta[name="description"]', 'name', 'description', description);
    setLinkTag('canonical', canonicalUrl);

    // 3. Open Graph Tags
    setMetaTag('meta[property="og:type"]', 'property', 'og:type', 'website');
    setMetaTag('meta[property="og:site_name"]', 'property', 'og:site_name', siteName);
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', title);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', description);
    setMetaTag('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    setMetaTag('meta[property="og:image"]', 'property', 'og:image', image);

    // 4. Twitter Cards
    setMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    setMetaTag('meta[name="twitter:site"]', 'name', 'twitter:site', '@nacosfuto');
    setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', image);
    setMetaTag('meta[name="twitter:url"]', 'name', 'twitter:url', canonicalUrl);
  }, [location.pathname]);

  return null;
}

function App() {
  const isNestedUnderPortal = typeof window !== 'undefined' && window.location.pathname.startsWith('/portal');

  useEffect(() => {
    initAcademicSessionSync();
  }, []);

  return (
    <ThemeProvider>
      <BrowserRouter basename={isNestedUnderPortal ? '/portal' : '/'}>
        <PortalSEOHandler />
        <ErrorBoundary>
          <Suspense fallback={<PortalPageLoader />}>
            <Routes>
              {/* Authentication & Student Entry */}
              <Route path="/" element={<Login />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* Core Student Academic Portal */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/events" element={<Events />} />
              <Route path="/notices" element={<Notices />} />
              <Route path="/bulletin" element={<Notices />} />
              <Route path="/results" element={<Results />} />
              <Route path="/dues" element={<Dues />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/resources" element={<Courses />} />
              <Route path="/resource-hub" element={<Courses />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/id-card" element={<IdCard />} />
              <Route path="/id-card/view" element={<IdCard viewMode={true} />} />
              <Route path="/id/view" element={<IdCard viewMode={true} />} />
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

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
