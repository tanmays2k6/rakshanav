import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, MapPin, Info } from 'lucide-react';

export default function StepProfile({ formData, updateFormData, onNext, onPrev }) {
  const [errors, setErrors] = useState({});
  const [isLocating, setIsLocating] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value });
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleLocationDetection = () => {
    if (!navigator.geolocation) {
      setErrors(prev => ({ ...prev, location: 'Geolocation is not supported by your browser' }));
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        const data = await response.json();
        
        if (data.address) {
          updateFormData({
            city: data.address.city || data.address.town || data.address.village || '',
            state: data.address.state || '',
            country: data.address.country || ''
          });
          setErrors(prev => ({ ...prev, city: null }));
        }
      } catch (err) {
        console.error("Geocoding failed", err);
        setErrors(prev => ({ ...prev, location: 'Failed to detect location automatically' }));
      } finally {
        setIsLocating(false);
      }
    }, (error) => {
      setIsLocating(false);
      setErrors(prev => ({ ...prev, location: 'Permission denied or unable to fetch location' }));
    });
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.full_name) newErrors.full_name = 'Name is required';
    if (!formData.age || isNaN(formData.age) || formData.age < 16 || formData.age > 100) {
      newErrors.age = 'Valid age between 16 and 100 is required';
    }
    if (!formData.city) newErrors.city = 'City is required';


    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validate()) {
      onNext();
    }
  };

  const roleColor = formData.role === 'citizen' ? 'text-brand-blue' : 
                    formData.role === 'enterprise' ? 'text-brand-orange' : 
                    'text-purple-400';

  return (
    <div className="flex flex-col space-y-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-white mb-2">Complete Your Profile</h2>
        <p className="text-gray-400">This helps us personalize your safety experience.</p>
      </div>

      <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        
        {/* Basic Info */}
        <div className="space-y-4 bg-white/5 p-4 rounded-xl border border-white/10">
          <h3 className={`font-semibold ${roleColor}`}>Basic Information</h3>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Full Name *</label>
            <input 
              type="text" name="full_name"
              value={formData.full_name} onChange={handleChange}
              className={`w-full bg-black/50 border ${errors.full_name ? 'border-red-500' : 'border-white/10'} rounded-lg px-4 py-2.5 text-white outline-none focus:border-brand-blue`}
              placeholder="John Doe"
            />
            {errors.full_name && <p className="text-red-400 text-xs mt-1">{errors.full_name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Age *</label>
              <input 
                type="number" name="age" min="16" max="100"
                value={formData.age} onChange={handleChange}
                className={`w-full bg-black/50 border ${errors.age ? 'border-red-500' : 'border-white/10'} rounded-lg px-4 py-2.5 text-white outline-none focus:border-brand-blue`}
                placeholder="25"
              />
              {errors.age && <p className="text-red-400 text-xs mt-1">{errors.age}</p>}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Gender</label>
              <select 
                name="gender" value={formData.gender} onChange={handleChange}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-brand-blue"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="space-y-4 bg-white/5 p-4 rounded-xl border border-white/10">
          <div className="flex justify-between items-center">
            <h3 className={`font-semibold ${roleColor}`}>Location</h3>
            <button 
              onClick={handleLocationDetection}
              disabled={isLocating}
              className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
            >
              <MapPin className="w-3 h-3" />
              {isLocating ? 'Detecting...' : 'Auto-detect'}
            </button>
          </div>
          {errors.location && <p className="text-red-400 text-xs">{errors.location}</p>}

          <div>
            <label className="block text-sm text-gray-400 mb-1">City *</label>
            <input 
              type="text" name="city"
              value={formData.city} onChange={handleChange}
              className={`w-full bg-black/50 border ${errors.city ? 'border-red-500' : 'border-white/10'} rounded-lg px-4 py-2.5 text-white outline-none focus:border-brand-blue`}
              placeholder="e.g. New York"
            />
            {errors.city && <p className="text-red-400 text-xs mt-1">{errors.city}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">State/Region</label>
              <input 
                type="text" name="state"
                value={formData.state} onChange={handleChange}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-brand-blue"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Country</label>
              <input 
                type="text" name="country"
                value={formData.country} onChange={handleChange}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-brand-blue"
              />
            </div>
          </div>
        </div>

        {/* Role Specific */}
        {formData.role === 'citizen' && (
          <div className="space-y-4 bg-white/5 p-4 rounded-xl border border-white/10">
            <h3 className={`font-semibold ${roleColor}`}>Additional Info (Optional)</h3>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Occupation</label>
              <select 
                name="occupation" value={formData.occupation} onChange={handleChange}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-brand-blue"
              >
                <option value="">Select Occupation</option>
                <option value="Student">Student</option>
                <option value="Working Professional">Working Professional</option>
                <option value="Business">Business</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        )}

        {formData.role === 'enterprise' && (
          <div className="space-y-4 bg-white/5 p-4 rounded-xl border border-white/10">
            <h3 className={`font-semibold ${roleColor}`}>Enterprise Details</h3>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Organization Name</label>
              <input 
                type="text" name="organization"
                value={formData.organization} onChange={handleChange}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-brand-blue"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Employee ID</label>
              <input 
                type="text" name="employee_id"
                value={formData.employee_id} onChange={handleChange}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-brand-blue"
              />
            </div>
          </div>
        )}

        {formData.role === 'government' && (
          <div className="space-y-4 bg-white/5 p-4 rounded-xl border border-white/10">
            <h3 className={`font-semibold ${roleColor}`}>Government Details</h3>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Department</label>
              <input 
                type="text" name="department"
                value={formData.department} onChange={handleChange}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-brand-blue"
              />
            </div>
          </div>
        )}

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
