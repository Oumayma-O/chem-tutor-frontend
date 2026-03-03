import { createContext, useContext, useState, useEffect, useCallback, createElement, type ReactNode } from "react";
import {
  apiLogin,
  apiMe,
  apiRegister,
  clearStoredToken,
  getStoredToken,
  setStoredToken,
  type MeResponse,
} from "@/lib/api";

export type AppRole = "student" | "teacher";

interface AuthState {
  user: { id: string; email: string } | null;
  role: AppRole | null;
  profile: {
    display_name: string;
    grade_level: string | null;
    interests: string[] | null;
    avatar_url: string | null;
  } | null;
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
    className?: string,
    interests?: string[],
  ) => Promise<SignInResult>;
  signOut: () => void;
  isStudent: boolean;
  isTeacher: boolean;
  isAuthenticated: boolean;
}

function meToProfile(me: MeResponse): AuthState["profile"] {
  return {
    display_name: me.name,
    grade_level: me.grade_level,
    interests: me.interests,
    avatar_url: null,
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

  // On mount: restore session from stored token
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }
    apiMe()
      .then((me) => {
        setState({
          user: { id: me.user_id, email: me.email },
          role: me.role as AppRole,
          profile: meToProfile(me),
          loading: false,
        });
      })
      .catch(() => {
        clearStoredToken();
        setState({ user: null, role: null, profile: null, loading: false });
      });
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<SignInResult> => {
    try {
      const res = await apiLogin({ email, password });
      setStoredToken(res.access_token);
      const me = await apiMe();
      setState({
        user: { id: me.user_id, email: me.email },
        role: me.role as AppRole,
        profile: meToProfile(me),
        loading: false,
      });
      return { data: res, error: null };
    } catch (err: unknown) {
      return { data: null, error: { message: err instanceof Error ? err.message : "Login failed" } };
    }
  }, []);

  const signUp = useCallback(async (
    email: string,
    password: string,
    role: AppRole,
    displayName: string,
    gradeLevel?: string,
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
        class_name: className || null,
        interests: interests || [],
      });
      setStoredToken(res.access_token);
      const me = await apiMe();
      setState({
        user: { id: me.user_id, email: me.email },
        role: me.role as AppRole,
        profile: meToProfile(me),
        loading: false,
      });
      return { data: res, error: null };
    } catch (err: unknown) {
      return { data: null, error: { message: err instanceof Error ? err.message : "Registration failed" } };
    }
  }, []);

  const signOut = useCallback(() => {
    clearStoredToken();
    setState({ user: null, role: null, profile: null, loading: false });
  }, []);

  const value: AuthContextValue = {
    ...state,
    signIn,
    signUp,
    signOut,
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
