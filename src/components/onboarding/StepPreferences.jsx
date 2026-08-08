import React from 'react';
import { ArrowLeft, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function StepPreferences({ formData, updateFormData, onNext, onPrev, isSubmitting, error }) {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    updateFormData({ [name]: type === 'checkbox' ? checked : value });
  };

  const travelModes = ['Walking', 'Scooter', 'Motorcycle', 'Car', 'Public Transport', 'Cycling', 'Other'];
  const routePrefs = ['Safest', 'Balanced', 'Fastest'];
  const nightTravelFreqs = ['Rarely', 'Occasionally', 'Frequently', 'Daily'];

  const roleColor = formData.role === 'citizen' ? 'text-brand-blue' : 
                    formData.role === 'enterprise' ? 'text-brand-orange' : 
                    'text-purple-400';

  return (
    <div className="flex flex-col space-y-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-white mb-2">Travel Preferences</h2>
        <p className="text-gray-400">Help us customize routing and alerts for you.</p>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm text-center">
          {error}
        </div>
      )}

      <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        
        {/* Travel Mode */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Primary Mode of Travel</label>
          <div className="flex flex-wrap gap-2">
            {travelModes.map(mode => (
              <button
                key={mode}
                onClick={() => updateFormData({ travel_mode: mode })}
                className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                  formData.travel_mode === mode 
                    ? `bg-white/10 ${formData.role === 'citizen' ? 'border-brand-blue text-brand-blue' : formData.role === 'enterprise' ? 'border-brand-orange text-brand-orange' : 'border-purple-400 text-purple-400'}`
                    : 'bg-black/50 border-white/10 text-gray-400 hover:border-white/30'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Preferred Routing */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Preferred Routing</label>
          <div className="grid grid-cols-3 gap-2">
            {routePrefs.map(route => (
              <button
                key={route}
                onClick={() => updateFormData({ preferred_route: route })}
                className={`py-3 rounded-lg text-sm font-medium border transition-colors ${
                  formData.preferred_route === route 
                    ? `bg-white/10 ${formData.role === 'citizen' ? 'border-brand-blue text-brand-blue' : formData.role === 'enterprise' ? 'border-brand-orange text-brand-orange' : 'border-purple-400 text-purple-400'}`
                    : 'bg-black/50 border-white/10 text-gray-400 hover:border-white/30'
                }`}
              >
                {route}
              </button>
            ))}
          </div>
        </div>

        {/* Night Travel */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Night Travel Frequency</label>
          <select 
            name="night_travel" 
            value={formData.night_travel} 
            onChange={handleChange}
            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-brand-blue appearance-none"
          >
            <option value="">Select Frequency</option>
            {nightTravelFreqs.map(freq => (
              <option key={freq} value={freq}>{freq}</option>
            ))}
          </select>
        </div>

        {/* Notifications */}
        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex items-center justify-center mt-1">
              <input 
                type="checkbox" 
                name="notifications_enabled"
                checked={formData.notifications_enabled}
                onChange={handleChange}
                className="sr-only"
              />
              <div className={`w-5 h-5 border rounded flex items-center justify-center transition-colors ${
                formData.notifications_enabled 
                  ? `border-transparent ${formData.role === 'citizen' ? 'bg-brand-blue text-black' : formData.role === 'enterprise' ? 'bg-brand-orange text-black' : 'bg-purple-500 text-white'}`
                  : 'border-white/30 bg-transparent group-hover:border-white/50'
              }`}>
                {formData.notifications_enabled && <CheckCircle2 className="w-4 h-4" />}
              </div>
            </div>
            <div>
              <p className="text-white font-medium mb-1">Enable Safety Notifications</p>
              <p className="text-sm text-gray-400">Receive real-time alerts about hazards, community reports, and emergency situations on your route.</p>
            </div>
          </label>
        </div>

        <div className="bg-[#080c10]/80 p-4 rounded-xl border border-white/5 flex gap-3">
          <ShieldAlert className={`w-5 h-5 shrink-0 ${roleColor}`} />
          <p className="text-xs text-gray-400 leading-relaxed">
            <strong className="text-gray-300">Privacy Notice:</strong> RakshaNav uses this information solely to personalize your experience, improve safety recommendations, and provide emergency assistance. Your data is securely stored in Supabase and will never be shared without your consent.
          </p>
        </div>

      </div>

      <div className="flex justify-between mt-6 pt-6 border-t border-white/10">
        <button
          onClick={onPrev}
          disabled={isSubmitting}
          className="px-6 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={onNext}
          disabled={isSubmitting}
          className="px-6 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving Profile...' : 'Save & Continue'}
        </button>
      </div>
    </div>
  );
}
