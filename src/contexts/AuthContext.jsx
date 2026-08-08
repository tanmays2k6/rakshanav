import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [role, setRole] = useState(null)
  const [profileCompleted, setProfileCompleted] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let profileSubscription = null;

    // Get active session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
        profileSubscription = subscribeToProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
        if (!profileSubscription) profileSubscription = subscribeToProfile(session.user.id)
      } else {
        setRole(null)
        setProfile(null)
        setProfileCompleted(false)
        setLoading(false)
        if (profileSubscription) {
          supabase.removeChannel(profileSubscription)
          profileSubscription = null
        }
      }
    })

    return () => {
      subscription.unsubscribe()
      if (profileSubscription) supabase.removeChannel(profileSubscription)
    }
  }, [])

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          // Profile not found - likely the trigger failed or RLS prevented insert.
          console.warn('[AuthContext] Profile not found for user. Will initialize as unassigned.');
          setRole('unassigned');
          setProfile(null);
        } else {
          throw error;
        }
      } else {
        setProfile(data);
        setRole(data.role);
        setProfileCompleted(data.profile_completed || false);
      }
    } catch (error) {
      console.error('[AuthContext] Error fetching profile:', error)
      setRole('unassigned')
      setProfile(null)
      setProfileCompleted(false)
    } finally {
      setLoading(false)
    }
  }

  const subscribeToProfile = (userId) => {
    return supabase
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

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const value = {
    user,
    profile,
    role,
    profileCompleted,
    setRole, // useful for immediate optimistic updates
    refreshProfile,
    loading,
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
