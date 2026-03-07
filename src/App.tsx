import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth, AuthProvider } from "@/hooks/useAuth";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import AdminPage from "./pages/AdminPage";
import UnitSelectionPage from "./pages/UnitSelectionPage";
import UnitLandingPage from "./pages/UnitLandingPage";
import TutorPage from "./pages/TutorPage";
import TeacherPage from "./pages/TeacherPage";
import StudentProfilePage from "./pages/StudentProfilePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { isAuthenticated, isTeacher, loading } = useAuth();

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

  if (isTeacher) {
    return (
      <Routes>
        <Route path="/" element={<TeacherPage />} />
        <Route path="/dashboard" element={<TeacherPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<UnitSelectionPage />} />
      <Route path="/profile" element={<StudentProfilePage />} />
      <Route path="/admin" element={<AdminPage />} />
      {/* Unit landing */}
      <Route path="/unit/:unitId" element={<UnitLandingPage />} />
      <Route path="/unit/:unitId/:lessonIndex" element={<UnitLandingPage />} />
      {/* Tutor */}
      <Route path="/tutor/:unitId/:lessonIndex" element={<TutorPage />} />
      <Route path="/tutor/:unitId" element={<TutorPage />} />
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
