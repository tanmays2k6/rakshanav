import { supabase } from '../lib/supabase';

export const tripService = {
  
  /**
   * Save a completed trip to Supabase
   */
  async saveTrip(tripData) {
    const { error, data } = await supabase
      .from('trip_history')
      .insert([tripData])
      .select()
      .single();

    if (error) {
      console.error('Error saving trip:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  },

  /**
   * Get trips with optional filtering and sorting
   */
  async getTrips(timeFilter = 'all', sort = 'newest', search = '') {
    let query = supabase.from('trip_history').select('*');

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
      console.error('Error fetching trips:', error);
      return [];
    }

    // Manual client-side search across multiple text fields (Supabase text search is more complex to set up without full-text indexes)
    let filteredData = data;
    if (search && search.trim() !== '') {
      const q = search.toLowerCase();
      filteredData = data.filter(t => 
        (t.origin_name && t.origin_name.toLowerCase().includes(q)) || 
        (t.destination_name && t.destination_name.toLowerCase().includes(q))
      );
    }

    return filteredData;
  },

  /**
   * Get aggregated statistics using SQL queries (client-side aggregation of full set for simplicity if not using RPC)
   * Note: In a production app with millions of rows, use a Supabase RPC. Here we fetch the relevant rows.
   */
  async getTripStats() {
    const { data, error } = await supabase.from('trip_history').select('*');
    if (error) {
      console.error('Error fetching stats:', error);
      return null;
    }

    if (!data || data.length === 0) return null;

    const totalTrips = data.length;
    const totalDistance = data.reduce((sum, t) => sum + (t.distance_km || 0), 0);
    const totalDuration = data.reduce((sum, t) => sum + (t.duration_minutes || 0), 0);
    const avgSafetyScore = Math.round(data.reduce((sum, t) => sum + (t.safety_score || 0), 0) / totalTrips);

    // Calculate day/night (simplistic: if started_at hour > 18 or < 6)
    let nightTrips = 0;
    let dayTrips = 0;
    data.forEach(t => {
       if (t.started_at) {
          const hr = new Date(t.started_at).getHours();
          if (hr >= 18 || hr < 6) nightTrips++;
          else dayTrips++;
       }
    });

    // Most frequent destination
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
      totalDuration, // in minutes
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
    if (error) console.error('Error deleting trip:', error);
    return !error;
  },

  /**
   * Delete all trips for current user
   */
  async deleteAllTrips(userId) {
    const { error } = await supabase.from('trip_history').delete().eq('user_id', userId);
    if (error) console.error('Error deleting all trips:', error);
    return !error;
  },

  /**
   * Subscribe to Realtime Inserts
   */
  subscribeToTrips(userId, onInsert) {
    const channel = supabase
      .channel('public:trip_history')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'trip_history', filter: `user_id=eq.${userId}` },
        (payload) => {
          onInsert(payload.new);
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }
};
