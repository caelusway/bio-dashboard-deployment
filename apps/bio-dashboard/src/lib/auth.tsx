import { createContext } from 'preact';
import { useContext, useState, useEffect } from 'preact/hooks';
import { createClient } from '@supabase/supabase-js';
import type { Session, User } from '@supabase/supabase-js';

// Get Supabase URL from env or use default
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validate required env vars
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
  });
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any; // Will show error in UI

export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'member';
  fullName?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, inviteToken: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: preact.ComponentChildren }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if Supabase is configured
    if (!supabase) {
      console.error('Supabase not configured - missing env vars');
      setLoading(false);
      return;
    }

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadUserDetails(session.user);
      } else {
        setLoading(false);
      }
    }).catch((err) => {
      console.error('Failed to get session:', err);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadUserDetails(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserDetails = async (supabaseUser: User) => {
    // Just use Supabase user metadata directly - no backend call needed
    const user: AuthUser = {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      role: (supabaseUser.user_metadata?.role || (supabaseUser.email === 'emre@bio.xyz' ? 'admin' : 'member')) as 'admin' | 'member',
      fullName: supabaseUser.user_metadata?.full_name,
    };

    console.log('Setting user from Supabase:', user);
    setUser(user);
    setLoading(false);
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Supabase signIn error:', error);
      throw error;
    }

    if (!data.user) {
      throw new Error('No user data returned');
    }

    console.log('Login successful, loading user details...');
    await loadUserDetails(data.user);
    console.log('User details loaded:', data.user.email);
  };

  const signUp = async (email: string, password: string, fullName: string, inviteToken: string) => {
    // Use our backend API for signup (to validate invite)
    const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, fullName, inviteToken }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Signup failed');
    }

    // Now sign in
    await signIn(email, password);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
