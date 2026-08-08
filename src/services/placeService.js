import { supabase } from '../lib/supabase';

export const placeService = {
  
  /**
   * Add a new saved place
   */
  async addPlace(placeData) {
    const { error, data } = await supabase
      .from('saved_places')
      .insert([placeData])
      .select()
      .single();

    if (error) {
      console.error('Error adding place:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  },

  /**
   * Update an existing place
   */
  async updatePlace(id, placeData) {
    const { error, data } = await supabase
      .from('saved_places')
      .update(placeData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating place:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  },

  /**
   * Delete a saved place
   */
  async deletePlace(id) {
    const { error } = await supabase.from('saved_places').delete().eq('id', id);
    if (error) console.error('Error deleting place:', error);
    return { success: !error };
  },

  /**
   * Get all places for the current user
   */
  async getPlaces() {
    const { data, error } = await supabase
      .from('saved_places')
      .select('*')
      .order('favorite', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching places:', error);
      return [];
    }

    return data;
  },

  /**
   * Increment the visit count for a place
   */
  async recordVisit(id, currentVisitCount) {
    const { error } = await supabase
      .from('saved_places')
      .update({ 
        visit_count: (currentVisitCount || 0) + 1,
        last_visited: new Date().toISOString()
      })
      .eq('id', id);
      
    if (error) console.error('Error recording visit:', error);
    return { success: !error };
  },

  /**
   * Subscribe to Realtime Changes
   */
  subscribeToPlaces(userId, onChange) {
    const channel = supabase
      .channel('public:saved_places')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'saved_places', filter: `user_id=eq.${userId}` },
        (payload) => {
          onChange(payload);
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }
};
