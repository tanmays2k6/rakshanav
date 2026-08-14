import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [role, setRole] = useState(null)
  const [subRole, setSubRole] = useState(null)
  const [profileCompleted, setProfileCompleted] = useState(false)
  
  // loading is for the core Auth session
  const [loading, setLoading] = useState(true)
  // profileLoading is for the secondary Profile fetch
  const [profileLoading, setProfileLoading] = useState(true)
  
  const profileSubscriptionRef = useRef(null)

  useEffect(() => {
    let mounted = true;

    const setupSubscription = (userId) => {
      if (profileSubscriptionRef.current) return;
      profileSubscriptionRef.current = supabase
        .channel(`public:profiles:${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
          (payload) => {
            if (payload.new) {
              setProfile(payload.new);
              setRole(payload.new.role);
              setProfileCompleted(payload.new.profile_completed || false);
            }
          }
        )
        .subscribe();
    };

    const fetchProfile = async (sessionUser) => {
      if (!sessionUser) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sessionUser.id)
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') {
            console.warn('[AuthContext] Profile not found. Safely initializing profile for user:', sessionUser.id);
            // Profile is legitimately missing, we must safely create it
            const newProfile = {
              id: sessionUser.id,
              email: sessionUser.email,
              full_name: sessionUser.user_metadata?.full_name || '',
              avatar_url: sessionUser.user_metadata?.avatar_url || '',
              role: 'unassigned',
              profile_completed: false
            };
            
            const { data: insertData, error: insertError } = await supabase
              .from('profiles')
              .upsert(newProfile, { onConflict: 'id' })
              .select()
              .single();
              
            if (insertError) throw insertError;
            
            if (mounted) {
              setProfile(insertData);
              setRole(insertData.role);
              setProfileCompleted(false);
            }
          } else {
            throw error;
          }
        } else {
          // Profile exists
          let fetchedSubRole = null;
          if (data.role === 'government') {
            try {
              const { data: govData } = await supabase
                .from('government_members')
                .select('role')
                .eq('user_id', sessionUser.id)
                .single();
              if (govData) fetchedSubRole = govData.role;
            } catch (err) {
              console.error('[AuthContext] Error fetching subRole:', err);
            }
          }

          if (mounted) {
            setProfile(data);
            setRole(data.role);
            setSubRole(fetchedSubRole);
            setProfileCompleted(data.profile_completed || false);
          }
        }
      } catch (error) {
        console.error('[AuthContext] Error fetching/creating profile:', error);
        if (mounted) {
          setRole('unassigned');
          setSubRole(null);
          setProfile(null);
          setProfileCompleted(false);
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setProfileLoading(false);
        }
      }
    };

    // 1. Initial Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      setUser(session?.user ?? null);
      if (session?.user) {
        setProfileLoading(true);
        fetchProfile(session.user);
        setupSubscription(session.user.id);
      } else {
        setLoading(false);
        setProfileLoading(false);
      }
    }).catch(err => {
      console.error('[AuthContext] getSession error:', err);
      if (mounted) {
        setLoading(false);
        setProfileLoading(false);
      }
    });

    // 2. Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      
      setUser(session?.user ?? null);
      if (session?.user) {
        setProfileLoading(true);
        await fetchProfile(session.user);
        setupSubscription(session.user.id);
      } else {
        setRole(null);
        setSubRole(null);
        setProfile(null);
        setProfileCompleted(false);
        setLoading(false);
        setProfileLoading(false);
        
        if (profileSubscriptionRef.current) {
          supabase.removeChannel(profileSubscriptionRef.current);
          profileSubscriptionRef.current = null;
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (profileSubscriptionRef.current) {
        supabase.removeChannel(profileSubscriptionRef.current);
      }
    }
  }, []);

  const refreshProfile = async () => {
    if (user) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (!error && data) {
          let fetchedSubRole = null;
          if (data.role === 'government') {
             try {
                const { data: govData } = await supabase
                  .from('government_members')
                  .select('role')
                  .eq('user_id', user.id)
                  .single();
                if (govData) fetchedSubRole = govData.role;
             } catch (err) {}
          }

          setProfile(data);
          setRole(data.role);
          setSubRole(fetchedSubRole);
          setProfileCompleted(data.profile_completed || false);
        }
      } catch (err) {
        console.error('[AuthContext] refreshProfile error:', err);
      }
    }
  };

  const value = {
    user,
    profile,
    role,
    subRole,
    profileCompleted,
    setRole, 
    refreshProfile,
    loading,
    profileLoading,
    signOut: () => supabase.auth.signOut(),
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
