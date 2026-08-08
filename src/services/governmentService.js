import { supabase } from '../lib/supabase';

export const governmentService = {
  
  /**
   * Fetch government organization for current user
   */
  async getCurrentOrganization(userId) {
    const { data, error } = await supabase
      .from('government_members')
      .select('org_id, role, department, designation, status, government_organizations(*)')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;
    return {
      ...data.government_organizations,
      memberRole: data.role,
      department: data.department,
      designation: data.designation,
      status: data.status
    };
  },

  /**
   * Register a new government user
   */
  async registerGovernmentUser(userId, orgId, department, designation) {
    // If orgId is not provided, maybe they are requesting a new org or joining a default one
    // For demo/simplicity, we assume they provide or select one, or we default to a central org.
    // In a real app, this would be an approval flow.
    const { data, error } = await supabase
      .from('government_members')
      .insert([{
        user_id: userId,
        org_id: orgId, // Needs to be a valid UUID from government_organizations
        role: 'officer',
        department: department,
        designation: designation,
        status: 'pending' // requires approval
      }])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },

  /**
   * Fetch live reports based on filters
   */
  async getLiveReports(filters = {}) {
    let query = supabase
      .from('incident_reports')
      .select(`
        *,
        auth_users:user_id ( id ),
        incident_updates (status, created_at)
      `)
      .order('created_at', { ascending: false });

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
    }
    
    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }
    
    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    const { data, error } = await query.limit(500);
      
    if (error) {
      return [];
    }
    return data;
  },

  /**
   * Get KPI Stats for the Dashboard
   */
  async getDashboardKPIs() {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      // Fetch recent reports to calculate accurate statistics
      const { data: reports, error } = await supabase
        .from('incident_reports')
        .select(`
          id, created_at, updated_at, status, priority, address,
          incident_updates (created_at, status)
        `)
        .order('created_at', { ascending: false })
        .limit(1000); // Reasonable limit for accurate metrics
        
      if (error || !reports) throw error;
      
      let activeComplaints = 0;
      let criticalIssues = 0;
      let resolvedThisMonth = 0;
      let totalResponseTimeMs = 0;
      let responseCount = 0;
      let totalResolutionTimeMs = 0;
      let resolutionCount = 0;
      const hotspotMap = {};

      reports.forEach(r => {
        const isResolved = r.status === 'Resolved' || r.status === 'Closed' || r.status === 'Rejected';
        
        // Active Complaints
        if (!isResolved) activeComplaints++;
        
        // Critical Issues
        if ((r.priority === 'High' || r.priority === 'Critical') && !isResolved) {
          criticalIssues++;
          
          // Hotspot clustering (group by area)
          if (r.address) {
             const parts = r.address.split(',');
             const area = parts.length > 1 ? parts[1].trim() : parts[0].trim();
             hotspotMap[area] = (hotspotMap[area] || 0) + 1;
          }
        }
        
        // Resolved this month
        if (r.status === 'Resolved' && r.updated_at) {
           const resolvedDate = new Date(r.updated_at);
           if (resolvedDate >= startOfMonth) {
             resolvedThisMonth++;
           }
           
           // Avg Resolution Time
           const createdDate = new Date(r.created_at);
           totalResolutionTimeMs += (resolvedDate.getTime() - createdDate.getTime());
           resolutionCount++;
        }
        
        // Avg Response Time (time to first update by Gov)
        if (r.incident_updates && r.incident_updates.length > 0) {
           const sortedUpdates = [...r.incident_updates].sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
           const firstUpdateDate = new Date(sortedUpdates[0].created_at);
           const createdDate = new Date(r.created_at);
           
           totalResponseTimeMs += (firstUpdateDate.getTime() - createdDate.getTime());
           responseCount++;
        }
      });
      
      const formatDuration = (ms) => {
         if (ms <= 0) return 'N/A';
         const totalMinutes = Math.floor(ms / 60000);
         const hours = Math.floor(totalMinutes / 60);
         const mins = totalMinutes % 60;
         if (hours === 0 && mins === 0) return '< 1m';
         if (hours === 0) return `${mins}m`;
         return `${hours}h ${mins}m`;
      };
      
      const avgResponseTime = responseCount > 0 ? formatDuration(totalResponseTimeMs / responseCount) : 'N/A';
      const avgResolutionTime = resolutionCount > 0 ? formatDuration(totalResolutionTimeMs / resolutionCount) : 'N/A';
      
      // A hotspot is an area with more than 1 active critical issue
      const safetyHotspots = Object.values(hotspotMap).filter(count => count > 1).length;

      return {
        activeComplaints,
        criticalIssues,
        resolvedThisMonth,
        avgResponseTime,
        avgResolutionTime,
        safetyHotspots,
        success: true
      };
    } catch (err) {
      return { success: false, activeComplaints: 0, criticalIssues: 0, resolvedThisMonth: 0, avgResponseTime: 'N/A', avgResolutionTime: 'N/A', safetyHotspots: 0 };
    }
  },

  /**
   * Update Report Status and create a timeline entry
   */
  async updateReportStatus(reportId, newStatus, assignedDepartment, notes, userId) {
    const updates = { status: newStatus, updated_at: new Date().toISOString() };
    if (assignedDepartment) updates.assigned_department = assignedDepartment;

    const { error } = await supabase
      .from('incident_reports')
      .update(updates)
      .eq('id', reportId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Insert into timeline (incident_updates)
    await supabase.from('incident_updates').insert([{
      incident_id: reportId,
      status: newStatus,
      description: notes || `Status updated to ${newStatus}`,
      updated_by: userId
    }]);

    // Send notification to the citizen
    const { data: report } = await supabase.from('incident_reports').select('user_id, title').eq('id', reportId).single();
    if (report && report.user_id) {
      await supabase.from('notifications').insert([{
        recipient_type: 'user',
        recipient_id: report.user_id,
        sender_role: 'government',
        sender_id: userId,
        title: 'Report Update',
        message: `Your report "${report.title}" is now: ${newStatus}. ${notes ? `Note: ${notes}` : ''}`,
        type: newStatus === 'Resolved' ? 'success' : 'info',
        related_report_id: reportId
      }]);
    }

    return { success: true };
  },

  /**
   * Send an official Government Notification
   */
  async sendOfficialNotification(orgId, authorId, data) {
    const { error } = await supabase
      .from('government_notifications')
      .insert([{
        org_id: orgId,
        author_id: authorId,
        title: data.title,
        message: data.message,
        category: data.category,
        severity: data.severity,
        target_area: data.target_area,
        target_ward: data.target_ward,
        status: data.isScheduled ? 'scheduled' : 'sent',
      }]);

    if (error) {
      return { success: false, error: error.message };
    }

    // Also broadcast to general citizens via public 'notifications' table
    let type = 'info';
    if (data.severity === 'Critical') type = 'danger';
    else if (data.severity === 'High') type = 'warning';

    const { error: broadcastError } = await supabase.from('notifications').insert([{
        recipient_type: data.target_ward ? 'city' : 'all',
        city: data.target_ward || null,
        sender_role: 'government',
        sender_id: authorId,
        title: data.title,
        message: data.message,
        type: type,
        priority: data.severity === 'Critical' ? 'critical' : (data.severity === 'High' ? 'high' : 'normal')
    }]);
    

    
    return { success: true };
  },

  /**
   * Get Government Notifications history
   */
  async getNotificationsHistory(orgId) {
    const { data, error } = await supabase
      .from('government_notifications')
      .select(`*, author:author_id(email)`)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return data;
  },

  /**
   * Realtime subscriptions
   */
  subscribeToReports(callback) {
    return supabase.channel('government_incident_reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incident_reports' }, callback)
      .subscribe();
  }
};
