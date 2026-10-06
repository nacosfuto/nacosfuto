import React, { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation, Navigate } from "react-router-dom";
import GSAPWrapper from "./utils/GSAPWrapper";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getAppUrls } from "@nacos/config/urls";

// Core Landing Pages (immediate load)
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import PlaceholderPage from "./pages/PlaceholderPage";

// Lazy-loaded pages (on-demand code-splitting)
const Administration = lazy(() => import("./pages/Administration"));
const Anthems = lazy(() => import("./pages/Anthems"));
const AcademicCalendar = lazy(() => import("./pages/AcademicCalendar"));
const Gallery = lazy(() => import("./pages/Gallery"));
const NacosExecutives = lazy(() => import("./pages/NacosExecutives"));
const Research = lazy(() => import("./pages/Research"));
const Alumni = lazy(() => import("./pages/Alumni"));
const StudentLife = lazy(() => import("./pages/StudentLife"));
const Academics = lazy(() => import("./pages/Academics"));
const Clubs = lazy(() => import("./pages/Clubs"));
const Admissions = lazy(() => import("./pages/Admissions"));
const AcademicPrograms = lazy(() => import("./pages/AcademicPrograms"));
const HowToApply = lazy(() => import("./pages/HowToApply"));
const AdmissionRequirements = lazy(() => import("./pages/AdmissionRequirements"));
const TuitionFees = lazy(() => import("./pages/TuitionFees"));
const CampusTour = lazy(() => import("./pages/CampusTour"));
const CampusClubs = lazy(() => import("./pages/CampusClubs"));
const SpiritualLife = lazy(() => import("./pages/SpiritualLife"));
const FAQsPage = lazy(() => import("./pages/FAQsPage"));
const ReportIssue = lazy(() => import("./pages/ReportIssue"));
const News = lazy(() => import("./pages/News"));
const Resources = lazy(() => import("./pages/Resources"));
const IdVerification = lazy(() => import("./pages/IdVerification"));
const AdminHub = lazy(() => import("./pages/AdminHub"));
const HealthServices = lazy(() => import("./pages/HealthServices"));
const Events = lazy(() => import("./pages/Events"));
const YellowPages = lazy(() => import("./pages/YellowPages"));

const UpskillCourseRedirect = () => {
  const location = useLocation();
  const { upskillHub } = getAppUrls();

  useEffect(() => {
    let targetPath = location.pathname;
    if (targetPath.startsWith('/upskill-hub')) {
      targetPath = targetPath.replace(/^\/upskill-hub/, '') || '/';
    } else if (targetPath.startsWith('/upskill')) {
      if (targetPath === '/upskill' || targetPath === '/upskill/all') {
        targetPath = '/courses';
      } else if (targetPath === '/upskill/web-development') {
        targetPath = '/courses/course-web-dev';
      } else if (targetPath === '/upskill/ai-fluency' || targetPath === '/upskill/ai-automation') {
        targetPath = '/courses/course-ai-fluency';
      } else {
        targetPath = '/courses';
      }
    }

    const baseUrl = upskillHub.replace(/\/+$/, '');
    const cleanPath = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
    const destination = baseUrl.startsWith('http')
      ? `${baseUrl}${cleanPath}${location.search}`
      : `${baseUrl}${cleanPath}${location.search}`;

    if (window.location.href !== destination) {
      window.location.replace(destination);
    }
  }, [location, upskillHub]);

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-white dark:bg-[#041801]">
      <div className="w-8 h-8 border-3 border-[#138601] border-t-transparent rounded-full animate-spin" />
    </div>
  );
};

const PortalLoginRedirect = () => {
  const location = useLocation();
  const { portal } = getAppUrls();

  useEffect(() => {
    const baseUrl = portal.replace(/\/+$/, '');
    const cleanSearch = location.search || '';
    const destination = `${baseUrl}/login${cleanSearch}`;
    if (window.location.href !== destination) {
      window.location.replace(destination);
    }
  }, [location, portal]);

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-white dark:bg-[#041801]">
      <div className="w-8 h-8 border-3 border-[#138601] border-t-transparent rounded-full animate-spin" />
    </div>
  );
};

import SEOHandler from "./components/SEO/SEOHandler";

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
  </div>
);

function App() {
  return (
    <>
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
      <GSAPWrapper>
        <BrowserRouter>
          <SEOHandler />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Core Website Pages */}
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/about/nacos-executives" element={<NacosExecutives />} />
              <Route path="/about/administration" element={<Administration />} />
              <Route path="/about/anthems" element={<Anthems />} />
              <Route path="/about/calendar" element={<AcademicCalendar />} />
              <Route path="/calendar" element={<Navigate to="/about/calendar" replace />} />
              <Route path="/about/gallery" element={<Gallery />} />
              <Route path="/about/alumni" element={<Alumni />} />

              {/* Academics & Programs */}
              <Route path="/academics" element={<Academics />} />
              <Route path="/programs" element={<AcademicPrograms />} />
              <Route path="/administration" element={<Administration />} />
              <Route path="/faculty" element={<Administration />} />
              <Route path="/news" element={<News />} />
              <Route path="/resources" element={<Resources />} />

              {/* Admissions */}
              <Route path="/admissions" element={<Admissions />} />
              <Route path="/how-to-apply" element={<HowToApply />} />
              <Route path="/admission-requirements" element={<AdmissionRequirements />} />
              <Route path="/tuition-fees" element={<TuitionFees />} />
              <Route path="/admission-portal" element={<PlaceholderPage title="Admission Portal" />} />

              {/* Campus Life */}
              <Route path="/students" element={<StudentLife />} />
              <Route path="/campus-tour" element={<CampusTour />} />
              <Route path="/campus-clubs" element={<CampusClubs />} />
              <Route path="/clubs" element={<Clubs />} />
              <Route path="/events" element={<Events />} />
              <Route path="/yellow-pages" element={<YellowPages />} />
              <Route path="/spiritual-life" element={<SpiritualLife />} />

              {/* Research */}
              <Route path="/research" element={<Research />} />
              <Route path="/student-research" element={<PlaceholderPage title="Student Research" />} />
              <Route path="/collaboration" element={<PlaceholderPage title="Research Collaboration" />} />
              <Route path="/research-facilities" element={<PlaceholderPage title="Research Facilities" />} />
              <Route path="/research-grants" element={<PlaceholderPage title="Research Grants" />} />

              {/* Student Resources & Guides */}
              <Route path="/student-handbook" element={<PlaceholderPage title="Student Handbook" />} />
              <Route path="/faqs" element={<FAQsPage />} />

              {/* Support & Health */}
              <Route path="/contact" element={<Contact />} />
              <Route path="/guidance-counselling" element={<PlaceholderPage title="Guidance & Counselling" />} />
              <Route path="/safety-alerts" element={<PlaceholderPage title="Safety Alerts" />} />
              <Route path="/health-services" element={<HealthServices />} />
              <Route path="/medical-services" element={<HealthServices />} />
              <Route path="/careers-recruitment" element={<PlaceholderPage title="Careers & Recruitment" />} />

              {/* Upskill Courses & Hub (Directs into Upskill Hub) */}
              <Route path="/upskill-hub/*" element={<UpskillCourseRedirect />} />
              <Route path="/upskill-hub" element={<UpskillCourseRedirect />} />
              <Route path="/courses/*" element={<UpskillCourseRedirect />} />
              <Route path="/courses" element={<UpskillCourseRedirect />} />
              <Route path="/upskill/*" element={<UpskillCourseRedirect />} />
              <Route path="/upskill" element={<UpskillCourseRedirect />} />

              {/* Public Student ID Card Verification */}
              <Route path="/verify/id/:id" element={<IdVerification />} />

              {/* Dedicated Administrative Gateway & Control Center */}
              <Route path="/admin-hub" element={<AdminHub />} />
              <Route path="/admin-portal" element={<AdminHub />} />
              <Route path="/admin-gateway" element={<AdminHub />} />
              {/* Student Portal Login Redirects */}
              <Route path="/login" element={<PortalLoginRedirect />} />
              <Route path="/portal/login" element={<PortalLoginRedirect />} />
              <Route path="/portal/*" element={<PortalLoginRedirect />} />

              {/* 404 Not Found */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </GSAPWrapper>
    </>
  );
}

export default App;
