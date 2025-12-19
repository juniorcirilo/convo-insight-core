import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProjectSetup } from '@/hooks/useProjectSetup';

type AppRole = 'admin' | 'supervisor' | 'agent';

interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  status: 'online' | 'offline' | 'away' | 'busy';
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  markSetupRedirectDone: () => void;
  isAdmin: boolean;
  isSupervisor: boolean;
  isAgent: boolean;
  isApproved: boolean;
  shouldRedirectToSetup: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasRedirectedToSetup, setHasRedirectedToSetup] = useState(false);
  const { toast } = useToast();
  const { setupProject, isConfigured, isCheckingConfig } = useProjectSetup();

  const markSetupRedirectDone = () => {
    setHasRedirectedToSetup(true);
  };

  // Auto-create profile and role if missing
  const ensureUserProfile = async (userId: string, accessToken: string) => {
    try {
      console.log('🔧 [AuthContext] Attempting to auto-create profile/role...');
      
      const { data, error } = await supabase.functions.invoke('ensure-user-profile', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (error) {
        console.error('❌ [AuthContext] Error calling ensure-user-profile:', error);
        return false;
      }

      if (data?.profileCreated || data?.roleCreated) {
        console.log('✅ [AuthContext] Profile/role auto-created:', data);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ [AuthContext] Error auto-creating profile:', error);
      return false;
    }
  };

  // Load profile and role for a user
  const loadUserData = async (userId: string) => {
    console.log('🔍 [AuthContext] Loading user data for:', userId);
    try {
      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('❌ [AuthContext] Error loading profile:', profileError);
      } else if (profileData) {
        console.log('✅ [AuthContext] Profile loaded:', profileData);
        setProfile(profileData as Profile);
      } else {
        console.warn('⚠️ [AuthContext] No profile found for user:', userId);
      }

      // Load role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleError) {
        console.error('❌ [AuthContext] Error loading role:', roleError);
      } else if (roleData) {
        console.log('✅ [AuthContext] Role loaded:', roleData.role);
        setRole(roleData.role as AppRole);
      } else {
        console.warn('⚠️ [AuthContext] No role found for user:', userId);
      }

      // If profile OR role is missing, try to auto-create them
      if (!profileData || !roleData) {
        console.log('⚠️ [AuthContext] Profile or role missing, attempting auto-creation...');
        
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const wasCreated = await ensureUserProfile(userId, session.access_token);
          if (wasCreated) {
            // Reload user data after creation
            console.log('🔄 [AuthContext] Reloading user data after auto-creation...');
            setTimeout(() => {
              loadUserData(userId);
            }, 500);
            return;
          }
        }
      }
    } catch (error) {
      console.error('❌ [AuthContext] Error in loadUserData:', error);
    }
  };

  // Initialize auth state
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Defer loading user data
          setTimeout(() => {
            loadUserData(currentSession.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        loadUserData(currentSession.user.id).finally(() => {
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle tab/browser close - mark user as offline
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user && session?.access_token) {
        // Use fetch with keepalive for reliable offline status update on tab close
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`, {
          method: 'PATCH',
          keepalive: true,
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ status: 'offline' })
        }).catch(() => {
          // Ignore errors on page unload
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user, session]);

  // Auto-setup infrastructure for remix
  const setupRemixInfrastructure = async () => {
    try {
      console.log('[AuthContext] Setting up remix infrastructure...');
      
      const { data, error } = await supabase.functions.invoke('setup-remix-infrastructure');
      
      if (error) {
        console.error('[AuthContext] Error setting up infrastructure:', error);
      } else {
        console.log('[AuthContext] Infrastructure setup complete:', data);
      }
    } catch (error) {
      console.error('[AuthContext] Error in setupRemixInfrastructure:', error);
    }
  };

  // Auto-setup project for admin on first login
  useEffect(() => {
    if (role === 'admin' && !isCheckingConfig && isConfigured === false) {
      console.log('[AuthContext] Admin detected, running auto-setup...');
      setupProject();
      // Also setup infrastructure (storage buckets, realtime)
      setupRemixInfrastructure();
    }
  }, [role, isConfigured, isCheckingConfig, setupProject]);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && data.user) {
      // Update status to online after successful login
      await supabase
        .from('profiles')
        .update({ status: 'online' })
        .eq('id', data.user.id);

      toast({
        title: "Login realizado com sucesso",
        description: "Bem-vindo de volta!",
      });
    }

    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    if (!error) {
      // Check if email confirmation is required
      if (data.user && !data.session) {
        toast({
          title: "Cadastro realizado!",
          description: "Enviamos um email de confirmação. Por favor, verifique sua caixa de entrada e clique no link para ativar sua conta.",
          duration: 10000,
        });
        // Don't navigate - user needs to confirm email first
      } else {
        // Auto-confirm is enabled, can navigate
        toast({
          title: "Cadastro realizado com sucesso",
          description: "Bem-vindo ao sistema!",
        });
      }
    }

    return { error };
  };

  const signOut = async () => {
    // Update status to offline before logout
    if (user) {
      await supabase
        .from('profiles')
        .update({ status: 'offline' })
        .eq('id', user.id);
    }

    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    setHasRedirectedToSetup(false);
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
  };

  const refreshProfile = async () => {
    if (user) {
      await loadUserData(user.id);
    }
  };

  const isAdmin = role === 'admin';
  const isSupervisor = role === 'supervisor';
  const isAgent = role === 'agent';
  const isApproved = profile?.is_approved ?? true; // Default to true for safety
  
  // Determine if admin should be redirected to setup (only once per session)
  const shouldRedirectToSetup = isAdmin && !isCheckingConfig && isConfigured === false && !hasRedirectedToSetup;

  console.log('🔐 [AuthContext] Current auth state:', { 
    userId: user?.id, 
    role, 
    isAdmin, 
    isSupervisor, 
    isAgent,
    profileEmail: profile?.id,
    shouldRedirectToSetup
  });

  const value: AuthContextType = {
    user,
    session,
    profile,
    role,
    isLoading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    markSetupRedirectDone,
    isAdmin,
    isSupervisor,
    isAgent,
    isApproved,
    shouldRedirectToSetup,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
