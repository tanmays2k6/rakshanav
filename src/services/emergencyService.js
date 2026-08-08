import { supabase } from '../lib/supabase';
import { liveTrackingService } from './liveTrackingService';
import { notificationService } from './notificationService';

export const emergencyService = {
  // -------------------------
  // MEDICAL PROFILE
  // -------------------------
  
  async getMedicalProfile(userId) {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('medical_profile')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(); 
    if (error) {
      console.error('Error fetching medical profile:', error);
      return null;
    }
    return data;
  },

  async upsertMedicalProfile(profileData) {
    const { error, data } = await supabase
      .from('medical_profile')
      .upsert({ ...profileData, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('Error saving medical profile:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },

  // -------------------------
  // EMERGENCY CONTACTS
  // -------------------------

  async getContacts() {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .order('priority', { ascending: true }) // Primary first
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching emergency contacts:', error);
      return [];
    }
    return data;
  },

  async addContact(contactData) {
    const { error, data } = await supabase
      .from('emergency_contacts')
      .insert([contactData])
      .select()
      .single();

    if (error) {
      console.error('Error adding emergency contact:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },

  async updateContact(id, contactData) {
    const { error, data } = await supabase
      .from('emergency_contacts')
      .update(contactData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating emergency contact:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },

  async deleteContact(id) {
    const { error } = await supabase.from('emergency_contacts').delete().eq('id', id);
    if (error) console.error('Error deleting contact:', error);
    return { success: !error };
  },

  // -------------------------
  // SOS PROTOCOL & LIVE TRACKING
  // -------------------------

  async triggerSOS(userId, locationData, device = navigator.userAgent) {
    // 1. Start Live Session to get a share_token and session_id
    const liveSession = await liveTrackingService.startSession(userId, 24); // 24 hours max
    let sessionId = null;
    
    if (liveSession.success) {
      sessionId = liveSession.sessionId;
      // Tell live tracking service to start reading GPS aggressively
      // We start it immediately
      liveTrackingService.startWatching(null, null, false); // Real GPS
    } else {
      console.error("Failed to start live tracking session during SOS:", liveSession.error);
    }

    // 2. Create the SOS Event record
    const sosEvent = {
      user_id: userId,
      session_id: sessionId,
      latitude: locationData.lat,
      longitude: locationData.lng,
      address: locationData.address || '',
      accuracy: locationData.accuracy || null,
      battery_level: locationData.battery || null,
      device: device,
      status: 'active'
    };

    const { error, data } = await supabase
      .from('sos_events')
      .insert([sosEvent])
      .select()
      .single();

    if (error) {
      if (process.env.NODE_ENV === 'development') console.error('Error creating SOS event:', error);
      // Clean up the live session if SOS record failed? (Optional but good practice)
      if (sessionId) await liveTrackingService.stopSession();
      return { success: false, error: error.message, fullError: error };
    }

    // 3. Simulate Emergency Notifications
    this.simulateEmergencyNotifications(userId, data.id, liveSession.token, locationData);

    return { 
      success: true, 
      data, 
      shareToken: liveSession.token 
    };
  },

  async simulateEmergencyNotifications(userId, eventId, token, locationData) {
    // In production, this would also trigger SMS/WhatsApp via Edge Functions.
    // Here we insert a critical system notification to alert authorities/contacts.
    const message = `SOS Activated! User needs immediate assistance at (${locationData.lat}, ${locationData.lng}). \nLive Tracking Link: https://rakshanav.app/live/${token}`;
    
    await notificationService.createNotification({
      title: '🚨 CRITICAL SOS ALERT',
      message: message,
      type: 'alert',
      priority: 'critical',
      recipient_type: 'all', // Or specific contacts if implemented
      sender_id: userId,
      metadata: { event_id: eventId, live_token: token }
    });
  },

  async resolveSOS(id) {
    // Stop Live Tracking
    await liveTrackingService.stopSession();

    // Mark event resolved
    const { error, data } = await supabase
      .from('sos_events')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (process.env.NODE_ENV === 'development') console.error('Error resolving SOS:', error);
      return { success: false, error: error.message, fullError: error };
    }
    return { success: true, data };
  },

  async getSOSHistory() {
    const { data, error } = await supabase
      .from('sos_events')
      .select('*')
      .order('triggered_at', { ascending: false });

    if (error) {
      console.error('Error fetching SOS history:', error);
      return [];
    }
    return data;
  },

  // -------------------------
  // REALTIME SUBSCRIPTIONS
  // -------------------------

  subscribeToContacts(userId, onChange) {
    const channel = supabase
      .channel('public:emergency_contacts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'emergency_contacts', filter: `user_id=eq.${userId}` },
        (payload) => onChange(payload)
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  },

  subscribeToMedicalProfile(userId, onChange) {
    const channel = supabase
      .channel('public:medical_profile')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'medical_profile', filter: `user_id=eq.${userId}` },
        (payload) => onChange(payload)
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  },
  
  subscribeToActiveSOS(userId, onChange) {
     const channel = supabase
      .channel('public:sos_events')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sos_events', filter: `user_id=eq.${userId}` },
        (payload) => onChange(payload)
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }
};
