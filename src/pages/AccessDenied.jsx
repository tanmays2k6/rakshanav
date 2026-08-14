import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, LogOut, Home } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function AccessDenied() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080c10] p-4">
      <div className="glass-panel p-8 max-w-md w-full flex flex-col items-center text-center">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-gray-400 mb-6">
          You do not have permission to view this page. Ensure you are logged in with the correct role.
        </p>
        <div className="flex flex-col gap-3 w-full">
          <Link 
            to="/" 
            className="bg-brand-blue hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex justify-center items-center gap-2"
          >
            <Home className="w-4 h-4" />
            Return Home
          </Link>
          {user && (
            <button 
              onClick={handleLogout}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-medium py-2 px-4 rounded-lg transition-colors flex justify-center items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
