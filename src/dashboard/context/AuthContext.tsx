import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "@shared/lib/supabase";
import type { Profile, UserRole } from "@shared/types/auth";
import type { User, Session } from "@supabase/supabase-js";

// Dev mode credentials for local testing
const DEV_EMAIL = "dev@test.com";
const DEV_PASSWORD = "devtest123";
const IS_DEV = import.meta.env.DEV;

// Mock user for dev mode
const DEV_USER: User = {
  id: "dev-user-id-12345",
  email: DEV_EMAIL,
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: new Date().toISOString(),
} as User;

const DEV_PROFILE: Profile = {
  id: "dev-user-id-12345",
  full_name: "Dev Admin",
  role: "admin" as UserRole,
  phone: "+256700000000",
  active: true,
  created_at: new Date().toISOString(),
};

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDevMode, setIsDevMode] = useState(false);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!error && data) {
      setProfile(data);
    } else if (error) {
      console.error("Error fetching profile:", error);
    }
  }, []);

  useEffect(() => {
    // Check for dev mode session in localStorage
    if (IS_DEV && localStorage.getItem("dev_mode") === "true") {
      setUser(DEV_USER);
      setProfile(DEV_PROFILE);
      setIsDevMode(true);
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isDevMode) return; // Skip if in dev mode
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, isDevMode]);

  const signIn = async (email: string, password: string) => {
    // Dev mode bypass for local testing
    if (IS_DEV && email === DEV_EMAIL && password === DEV_PASSWORD) {
      console.log("🔧 Dev mode login activated");
      localStorage.setItem("dev_mode", "true");
      setUser(DEV_USER);
      setProfile(DEV_PROFILE);
      setIsDevMode(true);
      return;
    }

    // Normal Supabase auth
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    // Handle dev mode signout
    if (isDevMode) {
      localStorage.removeItem("dev_mode");
      setUser(null);
      setProfile(null);
      setIsDevMode(false);
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: profile?.role ?? null,
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
