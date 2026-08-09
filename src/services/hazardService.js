import { supabase } from '../lib/supabase';

export const hazardService = {
  
  /**
   * Fetch all active incident reports (limit 500 for performance)
   */
  async getReports() {
    const { data, error } = await supabase
      .from('incident_reports')
      .select(`
        *,
        auth_users:user_id ( id )
      `)
      .order('created_at', { ascending: false })
      .limit(500);
      
    if (error) {
      console.error('Error fetching incident reports:', error);
      return [];
    }
    return data;
  },

  /**
   * Fetch recent alerts for public dashboard
   */
  async getRecentAlerts() {
    const { data, error } = await supabase
      .from('public_incident_view')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (error) {
      console.error('Error fetching recent alerts:', error);
      return [];
    }
    return data;
  },

  /**
   * Fetch nearby hazards
   */
  async getNearbyHazards(lat, lng, radiusKm = 5) {
    const radiusDeg = radiusKm / 111;
      
    const { data, error } = await supabase
      .from('public_incident_view')
      .select('*')
      .gte('lat', lat - radiusDeg)
      .lte('lat', lat + radiusDeg)
      .gte('lng', lng - radiusDeg)
      .lte('lng', lng + radiusDeg);
      
    if (error) {
      console.error('Error fetching nearby hazards:', error);
      return [];
    }
    return data;
  },

  /**
   * Fetch live statistics directly from Supabase
   */
  async getReportStats() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const queries = [
        supabase.from('incident_reports').select('*', { count: 'exact', head: true }), // total
        supabase.from('incident_reports').select('*', { count: 'exact', head: true }).neq('status', 'Resolved').neq('status', 'Rejected'), // active
        supabase.from('incident_reports').select('*', { count: 'exact', head: true }).eq('status', 'Resolved'), // resolved
        supabase.from('incident_reports').select('*', { count: 'exact', head: true }).eq('severity', 'Critical'), // critical
        supabase.from('incident_reports').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()) // today
      ];
      
      const results = await Promise.all(queries);
      
      return {
        total: results[0].count || 0,
        active: results[1].count || 0,
        resolved: results[2].count || 0,
        critical: results[3].count || 0,
        today: results[4].count || 0,
        success: true
      };
    } catch (err) {
      console.error('Error fetching report stats:', err);
      return { success: false };
    }
  },

  /**
   * Upload an image to the Supabase Storage bucket 'hazards'
   */
  async uploadPhoto(file) {
    if (!file) return null;
    
    // Generate a unique filename using timestamp and random string
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
    
    const { data, error } = await supabase.storage
      .from('hazards')
      .upload(`public/${fileName}`, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading photo:', error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('hazards')
      .getPublicUrl(`public/${fileName}`);
      
    return urlData.publicUrl;
  },

  /**
   * Submit a new hazard/incident report
   */
  async submitReport(reportData) {

    
    const { error, data } = await supabase
      .from('incident_reports')
      .insert([reportData])
      .select('id')
      .single();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('[Supabase] Error submitting report:', error);
      }
      return { success: false, error: error.message, code: error.code };
    }
    

    return { success: true, id: data.id };
  },

  /**
   * Fetch Timeline (Updates) for a specific incident
   */
  async getIncidentTimeline(incidentId) {
    const { data, error } = await supabase
      .from('incident_updates')
      .select('*')
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching timeline:', error);
      return [];
    }
    return data;
  },

  /**
   * Fetch Comments for a specific incident
   */
  async getIncidentComments(incidentId) {
    const { data, error } = await supabase
      .from('incident_comments')
      .select(`
        *,
        auth_users:user_id ( id )
      `)
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching comments:', error);
      return [];
    }
    return data;
  },

  /**
   * Add a comment to an incident
   */
  async addComment(incidentId, userId, content) {
    const { error } = await supabase
      .from('incident_comments')
      .insert([{ incident_id: incidentId, user_id: userId, content }]);

    if (error) {
      console.error('Error adding comment:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  /**
   * Vote on an incident (confirm or reject)
   */
  async voteOnIncident(incidentId, userId, voteType) {
    // Attempt upsert (requires UNIQUE(incident_id, user_id) which we added)
    const { error } = await supabase
      .from('incident_votes')
      .upsert(
        { incident_id: incidentId, user_id: userId, vote_type: voteType },
        { onConflict: 'incident_id,user_id' }
      );

    if (error) {
      console.error('Error voting:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  /**
   * Fetch the user's vote for a specific incident
   */
  async getUserVote(incidentId, userId) {
    const { data, error } = await supabase
      .from('incident_votes')
      .select('vote_type')
      .eq('incident_id', incidentId)
      .eq('user_id', userId)
      .maybeSingle();
      
    if (error || !data) return null;
    return data.vote_type;
  },

  /**
   * Subscribe to new reports and updates (Realtime)
   */
  subscribeToReports(onChange) {
    const channel = supabase
      .channel('public:incident_reports')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incident_reports' },
        (payload) => {
          onChange(payload);
        }
      )
      .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    },
  
    /**
     * Submit feedback on a resolved incident
     */
    async submitFeedback(incidentId, rating, comment) {
      const { error } = await supabase
        .from('incident_reports')
        .update({ feedback_rating: rating, feedback_comment: comment })
        .eq('id', incidentId);
  
      if (error) {
        console.error('Error submitting feedback:', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    }
  };
