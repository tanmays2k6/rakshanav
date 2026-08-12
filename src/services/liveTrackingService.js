import { supabase } from '../lib/supabase';
import { PUBLIC_APP_URL } from '../config/app';

// Generate a secure 16-character alphanumeric string for share links
const generateShareToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomValues = new Uint8Array(16);
  crypto.getRandomValues(randomValues);
  let token = '';
  for (let i = 0; i < 16; i++) {
    token += chars[randomValues[i] % chars.length];
  }
  return token;
};

export const getShareUrl = (token) => {
  return `${PUBLIC_APP_URL}/live/${token}`;
};

class LiveTrackingService {
  constructor() {
    this.watchId = null;       // Readable from outside for visibility-change detection
    this.currentSessionId = null;
    this.shareToken = null;
    this.lastSentLocation = null;
    this.isTracking = false;
    this.onUpdateCallback = null;
    this.onErrorCallback = null;
  }

  // Calculate Haversine distance in meters
  getDistanceInMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  async checkActiveSession(userId) {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('live_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (error && error.code !== 'PGRST116') {
      console.error('Error checking active session:', error);
    }
    
    // Validate expiration
    if (data && (!data.expires_at || new Date(data.expires_at) > new Date())) {
      return data;
    }
    return null;
  }

  // 1. Start a Live Tracking Session (or resume existing)
  async startSession(userId, durationHours = 1) {
    if (this.isTracking && this.currentSessionId && this.shareToken) {
      return { 
        success: true, 
        token: this.shareToken, 
        sessionId: this.currentSessionId,
        resumed: true
      };
    }
    
    try {
      // Check for an existing active non-expired session
      const existingSession = await this.checkActiveSession(userId);
      if (existingSession) {
        this.currentSessionId = existingSession.id;
        this.shareToken = existingSession.share_token;
        this.isTracking = true;
        
        return { 
          success: true, 
          token: this.shareToken, 
          sessionId: this.currentSessionId,
          expiresAt: existingSession.expires_at,
          resumed: true
        };
      }
      
      // Create new session if no active one exists
      this.shareToken = generateShareToken();
      const numHours = parseFloat(durationHours) || 1;
      const durationMs = Math.round(numHours * 60 * 60 * 1000);
      const expiresAt = new Date(Date.now() + durationMs).toISOString();
      const durationLabel = numHours < 1 ? `${Math.round(numHours * 60)}m` : `${numHours}h`;

      const { data, error } = await supabase
        .from('live_sessions')
        .insert([
            {
              user_id: userId,
              share_token: this.shareToken,
              is_active: true,
              expires_at: expiresAt,
              share_duration: durationLabel,
              last_updated: new Date().toISOString(),
              last_location: null
            }
        ])
        .select('id')
        .single();

      if (error) {
        console.error('Failed to create live session:', error);
        return { success: false, error: error.message, fullError: error };
      }

      this.currentSessionId = data.id;
      this.isTracking = true;

      return { 
        success: true, 
        token: this.shareToken, 
        sessionId: this.currentSessionId,
        expiresAt,
        resumed: false
      };
    } catch (err) {
      return { success: false, error: 'Failed to start tracking session' };
    }
  }

  // 2. Start physical GPS Watch
  startWatching(onUpdate, onError) {
    this.onUpdateCallback = onUpdate;
    this.onErrorCallback = onError;

    if (!navigator.geolocation) {
      if (this.onErrorCallback) this.onErrorCallback('Geolocation is not supported by your browser');
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      this.handlePositionUpdate.bind(this),
      (err) => {
        console.error('Geolocation error:', err);
        if (this.onErrorCallback) this.onErrorCallback(err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000
      }
    );
  }

  // Handle incoming physical GPS coordinates
  async handlePositionUpdate(position) {
    const { latitude, longitude, accuracy, speed, heading, altitude } = position.coords;
    
    // Throttle updates: Only send if moved > 20 meters, or if 10 seconds have passed.
    // In a real mobile app, background processing handles this aggressively.
    const now = Date.now();
    let shouldUpdate = false;

    if (!this.lastSentLocation) {
      shouldUpdate = true;
    } else {
      const dist = this.getDistanceInMeters(latitude, longitude, this.lastSentLocation.latitude, this.lastSentLocation.longitude);
      const timeDiff = now - this.lastSentLocation.time;
      if (dist > 20 || timeDiff > 10000) {
        shouldUpdate = true;
      }
    }

    const locData = {
      latitude, longitude, accuracy, speed, heading, altitude,
      battery: await this.getBatteryLevel(),
      timestamp: new Date(position.timestamp).toISOString()
    };

    if (shouldUpdate && this.currentSessionId && this.isTracking) {
      this.pushLocationToSupabase(locData);
      this.lastSentLocation = { latitude, longitude, time: now };
    }

    if (this.onUpdateCallback) {
      this.onUpdateCallback(locData);
    }
  }

  async getBatteryLevel() {
    try {
      if (navigator.getBattery) {
        const battery = await navigator.getBattery();
        return Math.round(battery.level * 100);
      }
    } catch(e) {}
    return null; 
  }

  async pushLocationToSupabase(locData) {
    // Insert into live_locations history
    const { error: insertError } = await supabase
      .from('live_locations')
      .insert([
        {
          session_id: this.currentSessionId,
          ...locData
        }
      ]);
      
    if (insertError) console.error('Failed to push location:', insertError);

    // Update live_sessions with the latest location data for quick access
    const { error: updateError } = await supabase
      .from('live_sessions')
      .update({
        last_location: locData,
        last_updated: new Date().toISOString()
      })
      .eq('id', this.currentSessionId);
      
    if (updateError) console.error('Failed to update session metadata:', updateError);
  }

  // 3. Stop Tracking
  async stopSession() {
    this.isTracking = false;
    
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.currentSessionId) {
      await supabase
        .from('live_sessions')
        .update({ is_active: false })
        .eq('id', this.currentSessionId);
    }

    this.currentSessionId = null;
    this.shareToken = null;
    this.lastSentLocation = null;
  }


  // 5. Fire SOS
  async triggerSOS(userId) {
    // Fire off to notifications or external webhook
    console.warn(`[EMERGENCY SOS] Triggered by ${userId}. Live Link: https://rakshanav.app/live/${this.shareToken}`);
    // Assuming we'd insert into an SOS table here or send SMS via backend
    return { success: true };
  }
}

export const liveTrackingService = new LiveTrackingService();
