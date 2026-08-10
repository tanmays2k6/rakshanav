import { supabase } from '../lib/supabase';

export const tripService = {
  
  /**
   * Start a new trip session in Supabase with status 'in_progress'
   */
  async startTrip(tripData) {
    if (!tripData.user_id) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User is not authenticated' };
      }
      tripData.user_id = user.id;
    }

    const payload = {
      ...tripData,
      status: 'in_progress',
      started_at: tripData.started_at || new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('trip_history')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('[tripService] Error starting trip:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  },

  /**
   * Complete an existing trip session by updating its status to 'completed'
   */
  async completeTrip(tripId, finalData = {}) {
    if (!tripId) {
      return { success: false, error: 'Trip ID is required to complete navigation' };
    }

    const payload = {
      ...finalData,
      status: 'completed',
      ended_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('trip_history')
      .update(payload)
      .eq('id', tripId)
      .select()
      .single();

    if (error) {
      console.error('[tripService] Error completing trip:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  },

  /**
   * Cancel an in-progress trip session
   */
  async cancelTrip(tripId) {
    if (!tripId) return { success: false };

    const { data, error } = await supabase
      .from('trip_history')
      .update({ status: 'cancelled', ended_at: new Date().toISOString() })
      .eq('id', tripId)
      .select()
      .single();

    if (error) console.error('[tripService] Error cancelling trip:', error);
    return { success: !error, data };
  },

  /**
   * General save/fallback method (inserts new or updates existing if id provided)
   */
  async saveTrip(tripData) {
    if (!tripData.user_id) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'User not authenticated' };
      tripData.user_id = user.id;
    }

    if (tripData.id) {
      const { id, ...updates } = tripData;
      return this.completeTrip(id, updates);
    }

    return this.startTrip(tripData);
  },

  /**
   * Get trips for a specific user with optional filtering and sorting
   */
  async getTrips(userId, timeFilter = 'all', sort = 'newest', search = '') {
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      userId = user.id;
    }

    let query = supabase
      .from('trip_history')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed'); // Only show fully completed trips in history


    // Time filtering
    if (timeFilter !== 'all') {
      const now = new Date();
      if (timeFilter === 'today') {
        now.setHours(0,0,0,0);
        query = query.gte('created_at', now.toISOString());
      } else if (timeFilter === '7days') {
        now.setDate(now.getDate() - 7);
        query = query.gte('created_at', now.toISOString());
      } else if (timeFilter === 'month') {
        now.setMonth(now.getMonth() - 1);
        query = query.gte('created_at', now.toISOString());
      }
    }

    // Sorting
    switch (sort) {
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'longest':
        query = query.order('distance_km', { ascending: false });
        break;
      case 'shortest':
        query = query.order('distance_km', { ascending: true });
        break;
      case 'safest':
        query = query.order('safety_score', { ascending: false });
        break;
      case 'unsafest':
        query = query.order('safety_score', { ascending: true });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    if (error) {
      console.error('[tripService] Error fetching trips:', error);
      return [];
    }

    // Filter client side search across origin and destination text
    let filteredData = data || [];
    if (search && search.trim() !== '') {
      const q = search.toLowerCase();
      filteredData = filteredData.filter(t => 
        (t.origin_name && t.origin_name.toLowerCase().includes(q)) || 
        (t.destination_name && t.destination_name.toLowerCase().includes(q))
      );
    }

    return filteredData;
  },

  /**
   * Get aggregated trip statistics for a user
   */
  async getTripStats(userId) {
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      userId = user.id;
    }

    const { data, error } = await supabase
      .from('trip_history')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('[tripService] Error fetching trip stats:', error);
      return null;
    }

    if (!data || data.length === 0) return null;

    const totalTrips = data.length;
    const totalDistance = data.reduce((sum, t) => sum + (parseFloat(t.distance_km) || 0), 0);
    const totalDuration = data.reduce((sum, t) => sum + (parseInt(t.duration_minutes) || 0), 0);
    const avgSafetyScore = Math.round(data.reduce((sum, t) => sum + (parseInt(t.safety_score) || 0), 0) / totalTrips);

    let nightTrips = 0;
    let dayTrips = 0;
    data.forEach(t => {
       if (t.started_at) {
          const hr = new Date(t.started_at).getHours();
          if (hr >= 18 || hr < 6) nightTrips++;
          else dayTrips++;
       }
    });

    const destCounts = {};
    let topDest = 'None';
    let maxCount = 0;
    data.forEach(t => {
      const dest = t.destination_name?.split(',')[0] || 'Unknown';
      destCounts[dest] = (destCounts[dest] || 0) + 1;
      if (destCounts[dest] > maxCount) {
        maxCount = destCounts[dest];
        topDest = dest;
      }
    });

    return {
      totalTrips,
      totalDistance: totalDistance.toFixed(1),
      totalDuration,
      avgSafetyScore,
      nightTrips,
      dayTrips,
      topDest
    };
  },

  /**
   * Delete a single trip
   */
  async deleteTrip(id) {
    const { error } = await supabase.from('trip_history').delete().eq('id', id);
    if (error) console.error('[tripService] Error deleting trip:', error);
    return !error;
  },

  /**
   * Delete all trips for current user
   */
  async deleteAllTrips(userId) {
    const { error } = await supabase.from('trip_history').delete().eq('user_id', userId);
    if (error) console.error('[tripService] Error deleting all trips:', error);
    return !error;
  },

  /**
   * Subscribe to Realtime Inserts and Updates
   */
  subscribeToTrips(userId, onUpdate) {
    const channel = supabase
      .channel(`public:trip_history:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trip_history', filter: `user_id=eq.${userId}` },
        (payload) => {
          onUpdate(payload);
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }
};
