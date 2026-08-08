import { supabase } from '../lib/supabase';

// Generate a random 10-character alphanumeric string for short share links
const generateShareToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 10; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

class LiveTrackingService {
  constructor() {
    this.watchId = null;
    this.currentSessionId = null;
    this.shareToken = null;
    this.lastSentLocation = null;
    this.isTracking = false;
    this.onUpdateCallback = null;
    this.onErrorCallback = null;
    this.demoInterval = null;
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

  // 1. Start a Live Tracking Session
  async startSession(userId, durationHours = 1) {
    if (this.isTracking) return { success: false, error: 'Tracking already active' };
    
    this.shareToken = generateShareToken();
    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('live_sessions')
      .insert([
          {
            user_id: userId,
            share_token: this.shareToken,
            is_active: true,
            expires_at: expiresAt,
            share_duration: `${durationHours}h`,
            last_updated: new Date().toISOString(),
            last_location: null
          }
      ])
      .select('id')
      .single();

    if (error) {
      if (process.env.NODE_ENV === 'development') console.error('Failed to create live session:', error);
      return { success: false, error: error.message, fullError: error };
    }

    this.currentSessionId = data.id;
    this.isTracking = true;

    return { 
      success: true, 
      token: this.shareToken, 
      sessionId: this.currentSessionId,
      expiresAt 
    };
  }

  // 2. Start physical GPS Watch
  startWatching(onUpdate, onError, useDemoMode = false) {
    this.onUpdateCallback = onUpdate;
    this.onErrorCallback = onError;

    if (useDemoMode) {
      this.startDemoTracking();
      return;
    }

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
      latitude, longitude, accuracy, speed: speed || 0, heading: heading || 0, altitude: altitude || 0,
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
    } catch (e) { /* ignore */ }
    return 100; // Mock full battery if API not available
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
    
    if (this.demoInterval) {
      clearInterval(this.demoInterval);
      this.demoInterval = null;
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

  // 4. Demo Mode (Simulation)
  startDemoTracking() {
    let lat = 12.9716; // Bengaluru center
    let lng = 77.5946;
    let heading = 90;
    
    this.demoInterval = setInterval(async () => {
      // Simulate moving east-ish
      lat += (Math.random() - 0.4) * 0.0001;
      lng += 0.0002;
      heading = (heading + (Math.random() * 10 - 5)) % 360;
      
      const locData = {
        latitude: lat,
        longitude: lng,
        accuracy: 10,
        speed: 12 + Math.random() * 5, // km/h
        heading,
        altitude: 900,
        battery: await this.getBatteryLevel(),
        timestamp: new Date().toISOString()
      };

      if (this.currentSessionId && this.isTracking) {
        this.pushLocationToSupabase(locData);
      }
      
      if (this.onUpdateCallback) {
        this.onUpdateCallback(locData);
      }
    }, 5000); // Demo updates every 5s
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
