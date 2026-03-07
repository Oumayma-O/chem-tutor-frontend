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

export type AppRole = "student" | "teacher";

interface ProfileState {
  display_name: string;
  grade_level: string | null;
  grade: string | null;
  course: string | null;
  interests: string[] | null;
  avatar_url: string | null;
  classroom_name: string | null;
  classroom_code: string | null;
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
    setState({
      user: { id: me.user_id, email: me.email },
      role: me.role as AppRole,
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
      const me = await apiMe();
      applyMe(me);
      return { data: res, error: null };
    } catch (err: unknown) {
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
        class_name: className || null,
        interests: interests || [],
      });
      setStoredToken(res.access_token);
      const me = await apiMe();
      applyMe(me);
      return { data: res, error: null };
    } catch (err: unknown) {
      return { data: null, error: { message: err instanceof Error ? err.message : "Registration failed" } };
    }
  }, [applyMe]);

  const signOut = useCallback(() => {
    clearStoredToken();
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
    isAuthenticated: !!state.user,
  };

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
