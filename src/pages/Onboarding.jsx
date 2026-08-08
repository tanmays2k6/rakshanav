import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

import StepWelcome from '../components/onboarding/StepWelcome';
import StepRole from '../components/onboarding/StepRole';
import StepProfile from '../components/onboarding/StepProfile';
import StepPreferences from '../components/onboarding/StepPreferences';
import StepFinish from '../components/onboarding/StepFinish';

const steps = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'role', title: 'Role' },
  { id: 'profile', title: 'Profile' },
  { id: 'preferences', title: 'Preferences' },
  { id: 'finish', title: 'Finish' }
];

export default function Onboarding() {
  const { user, role: currentRole, refreshProfile } = useAuth();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    role: currentRole !== 'unassigned' ? currentRole : '',
    full_name: user?.user_metadata?.full_name || '',
    age: '',
    gender: '',
    city: '',
    state: '',
    country: '',
    language: 'English',
    occupation: '',
    organization: '',
    department: '',
    employee_id: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    travel_mode: '',
    preferred_route: '',
    night_travel: '',
    notifications_enabled: true
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // If user is already fully onboarded, redirect
  // ProtectedRoute handles this but just in case
  useEffect(() => {
    // We could check if they already completed this and redirect
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(s => s + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1);
    }
  };

  const updateFormData = (data) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const submitProfile = async () => {
    if (!user) {
      setError("Your session has expired. Please sign in again.");
      return;
    }
    
    if (!user.email) {
      setError("Authenticated account does not have an email address.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const payloadToSubmit = { ...formData };
      if (!payloadToSubmit.gender) {
        payloadToSubmit.gender = 'Prefer not to say';
      }
      
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          ...payloadToSubmit,
          profile_completed: true,
          updated_at: new Date().toISOString()
        });

      if (updateError) throw updateError;
      
      await refreshProfile();
      handleNext(); // go to finish step
    } catch (err) {
      console.error('[Onboarding] Error submitting profile:', err);
      setError(err.message || 'Failed to save profile information.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <StepWelcome onNext={handleNext} user={user} />;
      case 1:
        return <StepRole formData={formData} updateFormData={updateFormData} onNext={handleNext} onPrev={handlePrevious} />;
      case 2:
        return <StepProfile formData={formData} updateFormData={updateFormData} onNext={handleNext} onPrev={handlePrevious} />;
      case 3:
        return <StepPreferences formData={formData} updateFormData={updateFormData} onNext={submitProfile} onPrev={handlePrevious} isSubmitting={isSubmitting} error={error} />;
      case 4:
        return <StepFinish role={formData.role} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#080c10] text-white flex flex-col items-center justify-center p-4">
      {/* Progress Indicator */}
      {currentStep > 0 && currentStep < 4 && (
        <div className="max-w-2xl w-full mb-8">
          <div className="flex justify-between items-center mb-2 px-2">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  idx < currentStep ? 'bg-brand-blue text-black' :
                  idx === currentStep ? 'bg-brand-blue/20 text-brand-blue border border-brand-blue' :
                  'bg-white/5 text-gray-500 border border-white/10'
                }`}>
                  {idx < currentStep ? <CheckCircle className="w-5 h-5" /> : idx + 1}
                </div>
                <span className={`text-xs mt-2 ${idx <= currentStep ? 'text-gray-300' : 'text-gray-600'}`}>{step.title}</span>
              </div>
            ))}
          </div>
          <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-brand-blue"
              initial={{ width: 0 }}
              animate={{ width: `${(currentStep / (steps.length - 2)) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Main Card */}
      <div className="max-w-2xl w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="glass-panel p-8"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
