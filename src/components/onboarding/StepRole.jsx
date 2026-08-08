import React, { useState } from 'react';
import { User, Building, Landmark, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function StepRole({ formData, updateFormData, onNext, onPrev }) {
  const { setRole } = useAuth();
  const [error, setError] = useState('');

  const handleRoleSelect = (selectedRole) => {
    updateFormData({ role: selectedRole });
    // Optimistically update the context so other components know (though it's fully saved at the end)
    setRole(selectedRole);
    setError('');
  };

  const handleContinue = () => {
    if (!formData.role || formData.role === 'unassigned') {
      setError('Please select a role to continue.');
      return;
    }
    onNext();
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-white mb-2">How will you use RakshaNav?</h2>
        <p className="text-gray-400">Select the role that best describes you.</p>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm text-center">
          {error}
        </div>
      )}

      <div className="grid gap-4">
        {/* Citizen */}
        <button 
          onClick={() => handleRoleSelect('citizen')}
          className={`p-4 text-left border rounded-xl transition-all flex items-start gap-4 ${
            formData.role === 'citizen' 
              ? 'bg-brand-blue/10 border-brand-blue' 
              : 'bg-white/5 border-white/10 hover:border-white/30'
          }`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            formData.role === 'citizen' ? 'bg-brand-blue text-black' : 'bg-white/10 text-brand-blue'
          }`}>
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Citizen</h3>
            <p className="text-gray-400 text-sm">Navigate safely, report hazards, contribute to safer cities.</p>
          </div>
        </button>

        {/* Enterprise */}
        <button 
          onClick={() => handleRoleSelect('enterprise')}
          className={`p-4 text-left border rounded-xl transition-all flex items-start gap-4 ${
            formData.role === 'enterprise' 
              ? 'bg-brand-orange/10 border-brand-orange' 
              : 'bg-white/5 border-white/10 hover:border-white/30'
          }`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            formData.role === 'enterprise' ? 'bg-brand-orange text-black' : 'bg-white/10 text-brand-orange'
          }`}>
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Enterprise</h3>
            <p className="text-gray-400 text-sm">Monitor employee travel, manage teams, improve workforce safety.</p>
          </div>
        </button>

        {/* Government */}
        <button 
          onClick={() => handleRoleSelect('government')}
          className={`p-4 text-left border rounded-xl transition-all flex items-start gap-4 ${
            formData.role === 'government' 
              ? 'bg-purple-500/10 border-purple-500' 
              : 'bg-white/5 border-white/10 hover:border-white/30'
          }`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            formData.role === 'government' ? 'bg-purple-500 text-white' : 'bg-white/10 text-purple-400'
          }`}>
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Government</h3>
            <p className="text-gray-400 text-sm">Monitor infrastructure, reports, city safety analytics.</p>
          </div>
        </button>
      </div>

      <div className="flex justify-between mt-6 pt-6 border-t border-white/10">
        <button
          onClick={onPrev}
          className="px-6 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={handleContinue}
          className="px-6 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
