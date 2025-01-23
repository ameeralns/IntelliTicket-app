import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { getSession, getUser } from '@/lib/supabase/auth';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  role: 'admin' | 'agent' | 'customer' | null;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  role: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'admin' | 'agent' | 'customer' | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { user } = await getUser();
        if (user) {
          setUser(user);
          setRole(user.user_metadata.role);
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const value = {
    user,
    loading,
    role,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 