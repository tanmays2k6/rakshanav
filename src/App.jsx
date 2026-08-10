import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AIProvider } from './contexts/AIContext';
import ProtectedRoute from './components/ProtectedRoute';


// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Onboarding from './pages/Onboarding';
import AccessDenied from './pages/AccessDenied';
import CitizenDashboard from './pages/CitizenDashboard';
import EnterpriseDashboard from './pages/EnterpriseDashboard';
import {
  LiveOperations, EmployeeManagement, CommuteAnalytics, RoutesHotspots, SafetyAlerts,
  IncidentManagement, EnterpriseNotifications, EmergencyPolicies,
  OrgSettings, TeamRoles, AuditLogs
} from './pages/enterprise/Placeholders';
import EnterpriseReports from './pages/enterprise/EnterpriseReports';
import GovernmentDashboard from './pages/government/CommandCenter'; // We will create this
import LiveReports from './pages/government/LiveReports';
import ReportDetail from './pages/government/ReportDetail';
import GovNotifications from './pages/government/Notifications';
import GovAnalytics from './pages/government/Analytics';
import WardMonitoring from './pages/government/WardMonitoring';
import Infrastructure from './pages/government/Infrastructure';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import { AdminUsers, AdminReports, AdminAudit, AdminSettings } from './pages/admin/Placeholders';

import NotFound from './pages/NotFound';
import DashboardLayout from './layouts/DashboardLayout';
import PublicTracking from './pages/PublicTracking';
import GovernmentSignup from './pages/GovernmentSignup';

// Citizen Sub-pages
import SafeNavigation from './pages/citizen/SafeNavigation';
import AiAssistant from './pages/citizen/AiAssistant';
import LiveTracking from './pages/citizen/LiveTracking';
import ReportHazard from './pages/citizen/ReportHazard';
import TripHistory from './pages/citizen/TripHistory';
import SavedPlaces from './pages/citizen/SavedPlaces';
import Emergency from './pages/citizen/Emergency';
import CommunityReports from './pages/citizen/CommunityReports';
import Notifications from './pages/citizen/Notifications';
import ProfileSettings from './pages/citizen/ProfileSettings';

export default function App() {
  return (
    <AuthProvider>
      <AIProvider>
        <BrowserRouter>
          <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/government-signup" element={<GovernmentSignup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/access-denied" element={<AccessDenied />} />
          <Route path="/live/:trackingToken" element={<PublicTracking />} />

          {/* Onboarding Flow (needs auth) */}
          <Route 
            path="/onboarding" 
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            } 
          />

          {/* Citizen Routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['citizen']}>
                <DashboardLayout>
                  <Outlet />
                </DashboardLayout>
              </ProtectedRoute>
            }
          >
            <Route index element={<CitizenDashboard />} />
            <Route path="navigation" element={<SafeNavigation />} />
            <Route path="ai" element={<AiAssistant />} />
            <Route path="tracking" element={<LiveTracking />} />
            <Route path="report" element={<ReportHazard />} />
            <Route path="history" element={<TripHistory />} />
            <Route path="places" element={<SavedPlaces />} />
            <Route path="emergency" element={<Emergency />} />
            <Route path="community" element={<CommunityReports />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<ProfileSettings />} />
            <Route path="settings" element={<ProfileSettings />} />
          </Route>

          {/* Enterprise Routes */}
          <Route 
            path="/enterprise" 
            element={
              <ProtectedRoute allowedRoles={['enterprise']}>
                <DashboardLayout>
                  <Outlet />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          >
            <Route index element={<EnterpriseDashboard />} />
            <Route path="live" element={<LiveOperations />} />
            <Route path="employees" element={<EmployeeManagement />} />
            <Route path="analytics" element={<CommuteAnalytics />} />
            <Route path="routes" element={<RoutesHotspots />} />
            <Route path="alerts" element={<SafetyAlerts />} />
            <Route path="incidents" element={<IncidentManagement />} />
            <Route path="reports" element={<EnterpriseReports />} />
            <Route path="notifications" element={<EnterpriseNotifications />} />
            <Route path="emergency" element={<EmergencyPolicies />} />
            <Route path="settings" element={<OrgSettings />} />
            <Route path="team" element={<TeamRoles />} />
            <Route path="audit" element={<AuditLogs />} />
          </Route>

          {/* Government Routes */}
          <Route 
            path="/government" 
            element={
              <ProtectedRoute allowedRoles={['government']}>
                <DashboardLayout>
                  <Outlet />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          >
            <Route index element={<GovernmentDashboard />} />
            <Route path="reports" element={<LiveReports />} />
            <Route path="reports/:id" element={<ReportDetail />} />
            <Route path="ward" element={<WardMonitoring />} />
            <Route path="infrastructure" element={<Infrastructure />} />
            <Route path="notifications" element={<GovNotifications />} />
            <Route path="analytics" element={<GovAnalytics />} />
          </Route>

          {/* Admin Routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DashboardLayout>
                  <Outlet />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="audit" element={<AdminAudit />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Default Redirect & 404 */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </BrowserRouter>

      </AIProvider>
    </AuthProvider>
  );
}
