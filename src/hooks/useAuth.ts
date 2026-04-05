import { createContext, useContext, useState, useEffect, useCallback, createElement, type ReactNode } from "react";
import {
  apiLogin,
  apiMe,
  apiRegister,
  apiUpdateProfile,
  clearStoredToken,
  getStoredToken,
  setStoredToken,
  type MeResponse,
} from "@/lib/api";

// ── Profile cache (sync localStorage) ──────────────────────────────────────
// Persists grade_level + course so UnitSelectionPage can read them synchronously
// on mount, avoiding the FOUC that occurs when apiMe() hasn't resolved yet.
const PROFILE_CACHE_KEY = "chemtutor_profile_cache";

interface CachedProfile {
  grade_level: string | null;
  course: string | null;
}

function saveProfileCache(me: MeResponse) {
  try {
    localStorage.setItem(
      PROFILE_CACHE_KEY,
      JSON.stringify({ grade_level: me.grade_level ?? null, course: me.course ?? null }),
    );
  } catch { /* storage unavailable */ }
}

function clearProfileCache() {
  try { localStorage.removeItem(PROFILE_CACHE_KEY); } catch { /* ignore */ }
}

/** Read cached profile fields synchronously (available before apiMe resolves). */
export function getStoredProfile(): CachedProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    return raw ? (JSON.parse(raw) as CachedProfile) : null;
  } catch { return null; }
}

export type AppRole = "student" | "teacher" | "admin";

interface ProfileState {
  display_name: string;
  grade_level: string | null;
  grade: string | null;
  course: string | null;
  interests: string[] | null;
  avatar_url: string | null;
  classroom_name: string | null;
  classroom_code: string | null;
  classroom_id: string | null;
}

interface AuthState {
  user: { id: string; email: string } | null;
  role: AppRole | null;
  profile: ProfileState | null;
  loading: boolean;
}

type SignInResult = { data: unknown; error: null } | { data: null; error: { message: string } };

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signUp: (
    email: string,
    password: string,
    role: AppRole,
    displayName: string,
    gradeLevel?: string,
    grade?: string,
    course?: string,
    className?: string,
    interests?: string[],
  ) => Promise<SignInResult>;
  signOut: () => void;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: { grade?: string; course?: string; interests?: string[] }) => Promise<void>;
  isStudent: boolean;
  isTeacher: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

function meToProfile(me: MeResponse): ProfileState {
  return {
    display_name: me.name,
    grade_level: me.grade_level,
    grade: me.grade ?? null,
    course: me.course ?? null,
    interests: me.interests,
    avatar_url: null,
    classroom_name: me.classroom_name ?? null,
    classroom_code: me.classroom_code ?? null,
    classroom_id: me.classroom_id ?? null,
  };
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    role: null,
    profile: null,
    loading: true,
  });

  const applyMe = useCallback((me: MeResponse) => {
    saveProfileCache(me);
    setState({
      user: { id: me.user_id, email: me.email },
      role: (me.role === "admin" ? "admin" : me.role === "teacher" ? "teacher" : "student") as AppRole,
      profile: meToProfile(me),
      loading: false,
    });
  }, []);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }
    apiMe()
      .then(applyMe)
      .catch(() => {
        clearStoredToken();
        setState({ user: null, role: null, profile: null, loading: false });
      });
  }, [applyMe]);

  const signIn = useCallback(async (email: string, password: string): Promise<SignInResult> => {
    try {
      const res = await apiLogin({ email, password });
      setStoredToken(res.access_token);
      // Hold loading:true while we fetch the full profile (grade_level, course).
      // This keeps the AppRoutes auth gate closed so UnitSelectionPage never
      // mounts with an incomplete profile — the root cause of the course-filter FOUC.
      setState(prev => ({ ...prev, loading: true }));
      const me = await apiMe();
      applyMe(me);
      return { data: res, error: null };
    } catch (err: unknown) {
      setState(prev => ({ ...prev, loading: false }));
      return { data: null, error: { message: err instanceof Error ? err.message : "Login failed" } };
    }
  }, [applyMe]);

  const signUp = useCallback(async (
    email: string,
    password: string,
    role: AppRole,
    displayName: string,
    gradeLevel?: string,
    grade?: string,
    course?: string,
    className?: string,
    interests?: string[],
  ): Promise<SignInResult> => {
    try {
      const res = await apiRegister({
        email,
        password,
        role,
        name: displayName,
        grade_level: gradeLevel || null,
        grade: grade || null,
        course: course || null,
        class_name: role === "teacher" ? null : className ?? null,
        interests: interests || [],
      });
      setStoredToken(res.access_token);
      // Same gate as signIn — block until full profile is fetched.
      setState(prev => ({ ...prev, loading: true }));
      const me = await apiMe();
      applyMe(me);
      return { data: res, error: null };
    } catch (err: unknown) {
      setState(prev => ({ ...prev, loading: false }));
      return { data: null, error: { message: err instanceof Error ? err.message : "Registration failed" } };
    }
  }, [applyMe]);

  const signOut = useCallback(() => {
    clearStoredToken();
    clearProfileCache();
    setState({ user: null, role: null, profile: null, loading: false });
  }, []);

  const refreshProfile = useCallback(async () => {
    const me = await apiMe();
    applyMe(me);
  }, [applyMe]);

  const updateProfileFn = useCallback(async (data: { grade?: string; course?: string; interests?: string[] }) => {
    const me = await apiUpdateProfile(data);
    applyMe(me);
  }, [applyMe]);

  const value: AuthContextValue = {
    ...state,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    updateProfile: updateProfileFn,
    isStudent: state.role === "student",
    isTeacher: state.role === "teacher",
    isAdmin: state.role === "admin",
    isAuthenticated: !!state.user,
  };

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
