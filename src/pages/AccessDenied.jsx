import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

export default function AccessDenied() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080c10] p-4">
      <div className="glass-panel p-8 max-w-md w-full flex flex-col items-center text-center">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-gray-400 mb-6">
          You do not have permission to view this page. Ensure you are logged in with the correct role.
        </p>
        <Link 
          to="/role-selection" 
          className="bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Return to Role Selection
        </Link>
      </div>
    </div>
  );
}
