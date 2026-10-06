import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";

import Layout from "./components/layout/Layout";
import HomePage from "./pages/HomePage";

// Lazy-loaded routes for optimal bundle chunking
const CoursesPage = lazy(() => import("./pages/CoursesPage"));
const CourseDetailPage = lazy(() => import("./pages/CourseDetailPage"));
const CoursePreviewPage = lazy(() => import("./pages/CoursePreviewPage"));
const ResourcesPage = lazy(() => import("./pages/ResourcesPage"));
const MyLearningPage = lazy(() => import("./pages/MyLearningPage"));
const CreateCoursePage = lazy(() => import("./pages/CreateCoursePage"));
const WorkshopsPage = lazy(() => import("./pages/WorkshopsPage"));
const MyWorkshopsPage = lazy(() => import("./pages/MyWorkshopsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignUpPage = lazy(() => import("./pages/SignUpPage"));
const InstructorProfilePage = lazy(() => import("./pages/InstructorProfilePage"));

const UpskillPageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-[#0056D2] border-t-transparent animate-spin" />
  </div>
);

function UpskillSEOHandler() {
  const location = useLocation();

  React.useEffect(() => {
    const titles = {
      "/": "Upskill Hub | Free Tech Courses & Workshops - NACOS FUTO",
      "/courses": "Explore Free Tech Courses | Upskill Hub NACOS FUTO",
      "/resources": "Tech Curricula & Developer Resources | Upskill Hub",
      "/workshops": "Live Coding Workshops & Bootcamps | Upskill Hub",
      "/create-course": "Become an Instructor | Upskill Hub NACOS FUTO",
      "/my-learning": "My Learning Dashboard | Upskill Hub",
      "/my-workshops": "My Registered Workshops | Upskill Hub",
      "/profile": "Developer Profile | Upskill Hub",
      "/login": "Sign In | Upskill Hub NACOS FUTO",
      "/sign-up": "Create Student Account | Upskill Hub"
    };

    const title = titles[location.pathname] || "Upskill Hub - Open Source Learning Platform | NACOS FUTO";
    document.title = title;
  }, [location.pathname]);

  return null;
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Upskill Hub ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#000000] text-white flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-[#07101e] border border-[#0056D2]/40 rounded-xl p-6 text-center space-y-4 shadow-lg">
            <h2 className="text-lg font-bold text-white">Something went wrong</h2>
            <p className="text-xs text-gray-300">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2 rounded-md bg-[#0056D2] text-white text-xs font-semibold cursor-pointer"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function App() {
  const isNestedUnderUpskill =
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/upskill-hub");

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter basename={isNestedUnderUpskill ? "/upskill-hub" : "/"}>
          <UpskillSEOHandler />
          <Suspense fallback={<UpskillPageLoader />}>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/courses" element={<CoursesPage />} />
                <Route path="/courses/:id" element={<CoursePreviewPage />} />
                <Route path="/courses/:id/preview" element={<CoursePreviewPage />} />
                <Route path="/courses/:id/learn" element={<CourseDetailPage />} />
                <Route path="/resources" element={<ResourcesPage />} />
                <Route path="/my-learning" element={<MyLearningPage />} />
                <Route path="/my-courses" element={<Navigate to="/my-learning" replace />} />
                <Route path="/workshops" element={<WorkshopsPage />} />
                <Route path="/create-course" element={<CreateCoursePage />} />
                <Route path="/my-workshops" element={<MyWorkshopsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/instructors/:id" element={<InstructorProfilePage />} />
              </Route>

              <Route path="/login" element={<LoginPage />} />
              <Route path="/sign-up" element={<SignUpPage />} />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
