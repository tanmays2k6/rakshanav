import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Loader } from 'lucide-react';

export default function StepFinish({ role }) {
  const navigate = useNavigate();

  useEffect(() => {
    // Automatically redirect after 3 seconds
    const timer = setTimeout(() => {
      if (role === 'citizen') navigate('/dashboard');
      else if (role === 'enterprise') navigate('/enterprise');
      else if (role === 'government') navigate('/government');
      else navigate('/dashboard'); // fallback
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate, role]);

  return (
    <div className="flex flex-col items-center justify-center text-center py-12 space-y-6">
      <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 mb-2 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
        <CheckCircle className="w-10 h-10" />
      </div>

      <div>
        <h2 className="text-3xl font-display font-bold text-white mb-3">Profile Completed!</h2>
        <p className="text-gray-400 text-lg">RakshaNav has been personalized for your safety.</p>
      </div>

      <div className="flex items-center gap-3 text-gray-500 mt-8">
        <Loader className="w-5 h-5 animate-spin" />
        <span>Redirecting to your dashboard...</span>
      </div>
    </div>
  );
}
