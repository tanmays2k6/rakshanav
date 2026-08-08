import { supabase } from '../lib/supabase';

class NotificationService {
  constructor() {
    this.subscription = null;
    this.subscribers = new Set();
    this.notificationsCache = [];
  }

  // Subscribe to live updates in the frontend
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers(data) {
    this.subscribers.forEach(cb => cb(data));
  }

  async fetchNotifications(userId, limit = 50) {
    if (!userId) return { success: false, data: [] };

    try {
      // 1. Fetch raw notifications for the user via RLS filtering
      const { data: notifs, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (notifError) throw notifError;

      // 2. Fetch read statuses for this user for broadcast messages
      const { data: reads, error: readError } = await supabase
        .from('notification_reads')
        .select('notification_id')
        .eq('user_id', userId);

      if (readError) throw readError;

      const readSet = new Set(reads.map(r => r.notification_id));

      // 3. Merge read status
      const processed = notifs.map(n => ({
        ...n,
        // If it's a broadcast (all, role, city) it relies on notification_reads
        // If it's a direct user message, it could use n.is_read or notification_reads
        is_read: n.recipient_type === 'user' ? n.is_read : readSet.has(n.id)
      }));

      // Filter out expired natively (could also be done in SQL, doing it here for safety fallback)
      const now = new Date();
      const valid = processed.filter(n => !n.expires_at || new Date(n.expires_at) > now);

      this.notificationsCache = valid;
      return { success: true, data: valid };
    } catch (err) {
      console.error('Error fetching notifications:', err);
      return { success: false, error: err.message, data: [] };
    }
  }

  startRealtime(userId) {
    if (this.subscription) return;

    this.subscription = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
           // We could refetch or inject if we know it applies to us. 
           // Simplest robust method: trigger a refetch so read states sync properly.
           this.fetchNotifications(userId).then(res => {
             if(res.success) this.notifySubscribers(res.data);
           });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notification_reads', filter: `user_id=eq.\${userId}` },
        (payload) => {
           this.fetchNotifications(userId).then(res => {
             if(res.success) this.notifySubscribers(res.data);
           });
        }
      )
      .subscribe();
  }

  stopRealtime() {
    if (this.subscription) {
      supabase.removeChannel(this.subscription);
      this.subscription = null;
    }
  }

  async markAsRead(userId, notification) {
    if (!userId || !notification) return { success: false };

    try {
      if (notification.recipient_type === 'user') {
        // Direct update
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notification.id);
        if (error) throw error;
      } else {
        // Broadcast update via notification_reads
        const { error } = await supabase
          .from('notification_reads')
          .upsert({ user_id: userId, notification_id: notification.id, read_at: new Date().toISOString() });
        if (error) throw error;
      }
      return { success: true };
    } catch (err) {
      console.error('Failed to mark read:', err);
      return { success: false, error: err.message };
    }
  }

  // Admin/Gov/Enterprise only
  async createNotification(payload) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([payload])
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error('Create notification failed:', err);
      return { success: false, error: err.message };
    }
  }
}

export const notificationService = new NotificationService();
