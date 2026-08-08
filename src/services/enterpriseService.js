import { supabase } from '../lib/supabase';

export const enterpriseService = {
  // Fetch the organization for the current user
  async getCurrentOrganization(userId) {
    const { data, error } = await supabase
      .from('organization_members')
      .select('org_id, role, organizations(*)')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;
    return {
      ...data.organizations,
      memberRole: data.role
    };
  },

  // Get active commutes for the organization
  async getActiveCommutes(orgId) {
    if (!orgId) return [];
    
    // First get employee user_ids
    const { data: members, error: memberErr } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('org_id', orgId);
      
    if (memberErr || !members || members.length === 0) return [];
    
    const userIds = members.map(m => m.user_id);
    
    const { data, error } = await supabase
      .from('trips')
      .select(`
        *,
        profiles (full_name, avatar_url, role)
      `)
      .in('user_id', userIds)
      .eq('status', 'in_progress');
      
    if (error) {
      console.error('Error fetching active commutes:', error);
      return [];
    }
    return data || [];
  },

  // Get employees monitored
  async getEmployeesCount(orgId) {
    if (!orgId) return 0;
    const { count, error } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId);
      
    if (error) return 0;
    return count || 0;
  },

  // Get active alerts
  async getActiveAlerts(orgId) {
    if (!orgId) return [];
    const { data, error } = await supabase
      .from('enterprise_alerts')
      .select(`
        *,
        profiles (full_name)
      `)
      .eq('org_id', orgId)
      .in('status', ['new', 'investigating']);
      
    if (error) return [];
    return data || [];
  },

  // Get average safety score from completed trips
  async getAverageSafetyScore(orgId) {
    if (!orgId) return null;
    
    // First get employee user_ids
    const { data: members, error: memberErr } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('org_id', orgId);
      
    if (memberErr || !members || members.length === 0) return null;
    
    const userIds = members.map(m => m.user_id);

    const { data, error } = await supabase
      .from('trips')
      .select('safety_score')
      .in('user_id', userIds)
      .eq('status', 'completed')
      .not('safety_score', 'is', null);
      
    if (error || !data || data.length === 0) return null;
    
    const total = data.reduce((sum, trip) => sum + (trip.safety_score || 0), 0);
    return Math.round(total / data.length);
  },

  // Get incidents this month (only by employees of this org)
  async getRecentIncidents(orgId) {
    if (!orgId) return [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // First get employee user_ids
    const { data: members, error: memberErr } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('org_id', orgId);
      
    if (memberErr || !members || members.length === 0) return [];
    
    const userIds = members.map(m => m.user_id);
    
    const { data, error } = await supabase
      .from('incident_reports')
      .select('*')
      .in('user_id', userIds)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });
      
    if (error) return [];
    return data || [];
  },
  
  // Realtime Subscriptions
  subscribeToTrips(callback) {
    return supabase.channel('enterprise_active_trips')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, callback)
      .subscribe();
  },
  
  subscribeToAlerts(callback) {
    return supabase.channel('enterprise_alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enterprise_alerts' }, callback)
      .subscribe();
  }
};
