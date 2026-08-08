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
import GovernmentDashboard from './pages/GovernmentDashboard';
import NotFound from './pages/NotFound';
import DashboardLayout from './layouts/DashboardLayout';
import PublicTracking from './pages/PublicTracking';

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
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/access-denied" element={<AccessDenied />} />
          <Route path="/live/:token" element={<PublicTracking />} />

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
                <EnterpriseDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Government Routes */}
          <Route 
            path="/government" 
            element={
              <ProtectedRoute allowedRoles={['government']}>
                <GovernmentDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Default Redirect & 404 */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </BrowserRouter>

      </AIProvider>
    </AuthProvider>
  );
}
