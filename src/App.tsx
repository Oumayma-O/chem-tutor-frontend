import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth, AuthProvider } from "@/hooks/useAuth";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import UnitSelectionPage from "./pages/UnitSelectionPage";
import UnitLandingPage from "./pages/UnitLandingPage";
import TutorPage from "./pages/TutorPage";
import StudentProfilePage from "./pages/StudentProfilePage";
import SimulationPage from "./pages/SimulationPage";

const TeacherPage = lazy(() => import("./pages/teacher/TeacherPage"));
const StaffDirectoryPage = lazy(() => import("./pages/teacher/StaffDirectoryPage"));
const ClassDashboardPage = lazy(() => import("./pages/teacher/ClassDashboardPage"));
const AccountSettingsPage = lazy(() => import("./pages/AccountSettingsPage"));

function StaffFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading dashboard…</p>
      </div>
    </div>
  );
}

function TeacherPageRoute() {
  return (
    <Suspense fallback={<StaffFallback />}>
      <TeacherPage />
    </Suspense>
  );
}

function StaffDirectoryRoute() {
  return (
    <Suspense fallback={<StaffFallback />}>
      <StaffDirectoryPage />
    </Suspense>
  );
}

function AccountSettingsRoute() {
  return (
    <Suspense fallback={<StaffFallback />}>
      <AccountSettingsPage />
    </Suspense>
  );
}

function ClassDashboardRoute() {
  return (
    <Suspense fallback={<StaffFallback />}>
      <ClassDashboardPage />
    </Suspense>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 30 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

function AppRoutes() {
  const { isAuthenticated, isTeacher, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  /** Admin / superadmin: directory landing + class drill-in + curriculum management. */
  if (isAdmin) {
    return (
      <Routes>
        <Route path="/" element={<StaffDirectoryRoute />} />
        <Route path="/class/:classroomId" element={<ClassDashboardRoute />} />
        <Route path="/settings" element={<AccountSettingsRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  /** Teachers: class dashboard at root. */
  if (isTeacher) {
    return (
      <Routes>
        <Route path="/" element={<TeacherPageRoute />} />
        <Route path="/dashboard" element={<TeacherPageRoute />} />
        <Route path="/teacher/dashboard" element={<TeacherPageRoute />} />
        <Route path="/settings" element={<AccountSettingsRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  /** Students: unit selection, tutor, simulation. */
  return (
    <Routes>
      <Route path="/" element={<UnitSelectionPage />} />
      <Route path="/profile" element={<StudentProfilePage />} />
      <Route path="/settings" element={<AccountSettingsRoute />} />
      <Route path="/admin" element={<Navigate to="/" replace />} />
      {/* Unit landing */}
      <Route path="/unit/:unitId" element={<UnitLandingPage />} />
      <Route path="/unit/:unitId/:lessonIndex" element={<UnitLandingPage />} />
      {/* Tutor */}
      <Route path="/tutor/:unitId/:lessonIndex" element={<TutorPage />} />
      <Route path="/tutor/:unitId" element={<TutorPage />} />
      {/* Simulation */}
      <Route path="/unit/:unitId/:lessonIndex/simulation" element={<SimulationPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
