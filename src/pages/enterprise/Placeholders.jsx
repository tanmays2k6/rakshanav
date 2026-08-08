import React from 'react';

const EnterprisePlaceholder = ({ title, description }) => (
  <div className="p-8 h-full overflow-y-auto">
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-white mb-2">{title}</h1>
        <p className="text-gray-400">{description}</p>
      </div>
      <div className="glass-panel p-12 flex flex-col items-center justify-center border border-white/10 text-center min-h-[400px]">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
          <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Coming Soon</h3>
        <p className="text-gray-400 max-w-sm">This module is currently being implemented for the Enterprise Operations Center.</p>
      </div>
    </div>
  </div>
);

export const LiveOperations = () => <EnterprisePlaceholder title="Live Operations" description="Real-time monitoring of all active enterprise fleets and employee commutes." />;
export const EmployeeManagement = () => <EnterprisePlaceholder title="Employee Management" description="Manage enterprise personnel, roles, and commute monitoring status." />;
export const CommuteAnalytics = () => <EnterprisePlaceholder title="Commute Analytics" description="Historical analytics and trends for enterprise commutes." />;
export const RoutesHotspots = () => <EnterprisePlaceholder title="Routes & Hotspots" description="Identify high-risk areas and manage monitored routes." />;
export const SafetyAlerts = () => <EnterprisePlaceholder title="Safety Alerts" description="Enterprise-wide safety alerts and geofence violations." />;
export const IncidentManagement = () => <EnterprisePlaceholder title="Incident Management" description="Review and manage reported incidents across the organization." />;
export const EnterpriseReports = () => <EnterprisePlaceholder title="Reports" description="Generate and export compliance and safety reports." />;
export const EnterpriseNotifications = () => <EnterprisePlaceholder title="Notifications" description="Send push notifications and advisories to employees." />;
export const EmergencyPolicies = () => <EnterprisePlaceholder title="Emergency Policies" description="Configure SOS escalation protocols and emergency contacts." />;
export const OrgSettings = () => <EnterprisePlaceholder title="Organization Settings" description="Manage organization profile, billing, and API integrations." />;
export const TeamRoles = () => <EnterprisePlaceholder title="Team & Roles" description="Manage enterprise administrator access and permissions." />;
export const AuditLogs = () => <EnterprisePlaceholder title="Audit Logs" description="Review administrative actions and system access logs." />;
