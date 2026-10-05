import React, { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation, Navigate } from "react-router-dom";
import GSAPWrapper from "./utils/GSAPWrapper";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getAppUrls } from "@nacos/config/urls";

// Page imports
import Home from "./pages/Home";
import About from "./pages/About";
import Administration from "./pages/Administration";
import Anthems from "./pages/Anthems";
import AcademicCalendar from "./pages/AcademicCalendar";
import Gallery from "./pages/Gallery";
import NacosExecutives from "./pages/NacosExecutives";
import Research from "./pages/Research";
import Alumni from "./pages/Alumni";
import StudentLife from "./pages/StudentLife";
import Academics from "./pages/Academics";
import Clubs from "./pages/Clubs";
import Contact from "./pages/Contact";
import Admissions from "./pages/Admissions";
import AcademicPrograms from "./pages/AcademicPrograms";
import HowToApply from "./pages/HowToApply";
import AdmissionRequirements from "./pages/AdmissionRequirements";
import TuitionFees from "./pages/TuitionFees";
import CampusTour from "./pages/CampusTour";
import CampusClubs from "./pages/CampusClubs";
import FAQsPage from "./pages/FAQsPage";
import ReportIssue from "./pages/ReportIssue";
import News from "./pages/News";
import Resources from "./pages/Resources";
import PlaceholderPage from "./pages/PlaceholderPage";
import NotFound from "./pages/NotFound";
import IdVerification from "./pages/IdVerification";
import AdminHub from "./pages/AdminHub";
import HealthServices from "./pages/HealthServices";

// Lazy-loaded pages
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
            <Route path="/events" element={<Suspense fallback={<PageLoader />}><Events /></Suspense>} />
            <Route path="/yellow-pages" element={<Suspense fallback={<PageLoader />}><YellowPages /></Suspense>} />
            <Route path="/spiritual-life" element={<PlaceholderPage title="Spiritual Life" />} />

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
            <Route path="/admin-access" element={<AdminHub />} />
            <Route path="/admin-login" element={<AdminHub />} />
            <Route path="/admin" element={<AdminHub />} />

            {/* 404 Not Found */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </GSAPWrapper>
    </>
  );
}

export default App;
