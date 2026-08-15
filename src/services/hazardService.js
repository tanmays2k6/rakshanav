import { supabase } from '../lib/supabase';

export const hazardService = {
  
  /**
   * Fetch all active incident reports (limit 500 for performance)
   */
  async getReports() {
    // NOTE: Do NOT join auth.users from the client — it is not accessible via RLS.
    // Use public_incident_view for community maps (safe public fields only).
    // This query is used for the map overlay on the Report Hazard page.
    const { data, error } = await supabase
      .from('public_incident_view')
      .select('id, category, status, lat, lng, latitude, longitude, upvotes, created_at')
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
  async uploadPhoto(file, userId) {
    if (!file) return null;
    
    try {
      // Scope upload path to the authenticated user's UUID
      const ext = file.name ? file.name.split('.').pop().toLowerCase() : 'jpg';
      const cleanExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${cleanExt}`;
      const storagePath = userId ? `${userId}/${fileName}` : `public/${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('hazards')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'image/jpeg'
        });

      if (error) {
        console.error('[hazardService] Error uploading photo to hazards bucket:', {
          message: error.message,
          error
        });
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('hazards')
        .getPublicUrl(storagePath);
        
      return urlData?.publicUrl || null;
    } catch (e) {
      console.error('[hazardService] Unexpected error in uploadPhoto:', e);
      return null;
    }
  },

  /**
   * Submit a new hazard/incident report
   */
  async submitReport(reportData) {
    // Verify the session is still live before attempting the insert.
    const { data: { user }, error: sessionError } = await supabase.auth.getUser();
    if (sessionError || !user) {
      return { 
        success: false, 
        error: 'Your session has expired. Please sign in again.', 
        code: 'SESSION_EXPIRED' 
      };
    }

    // Clean payload to match exact Supabase schema
    const payload = {
      user_id: user.id,
      title: reportData.title || `${reportData.category || 'Hazard'} Report`,
      category: reportData.category,
      priority: reportData.priority || 'Medium',
      latitude: Number(reportData.latitude),
      longitude: Number(reportData.longitude),
      address: reportData.address || null,
      city: reportData.city || 'Bengaluru',
      description: reportData.description || null,
      photo_url: reportData.photo_url || null,
      severity: reportData.severity || 'Medium',
      is_anonymous: Boolean(reportData.is_anonymous)
    };

    const { error, data } = await supabase
      .from('incident_reports')
      .insert([payload])
      .select('id')
      .single();

    if (error) {
      console.error('[Supabase] Error submitting incident report:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return { 
        success: false, 
        error: error.message, 
        code: error.code, 
        details: error.details,
        hint: error.hint
      };
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
    // NOTE: Do NOT join auth.users — it is blocked by RLS from the client.
    // Comments only expose the user_id UUID, not the full profile.
    const { data, error } = await supabase
      .from('incident_comments')
      .select('*')
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
          // payload.new contains the actual inserted/updated row.
          // Pass both the event type and the new row so callers can act accordingly.
          onChange(payload.eventType || payload.type, payload.new || null, payload.old || null);
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
