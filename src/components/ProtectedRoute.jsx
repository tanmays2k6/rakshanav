import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, profileCompleted, loading, profileLoading } = useAuth();

  if (loading || profileLoading) {
    return <div className="h-screen flex items-center justify-center bg-[#080c10] text-white">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user profile is not completed, they must complete onboarding unless they're already on the onboarding page
  if (!profileCompleted && window.location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/access-denied" replace />;
  }

  return children ? children : <Outlet />;
}
