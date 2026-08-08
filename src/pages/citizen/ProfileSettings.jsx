import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { User, Mail, Phone, Clock, Shield, Bell, Lock, PhoneCall, Building, Check, Loader2, Camera, MapPin } from 'lucide-react';

export default function ProfileSettings() {
  const { user, profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  
  // Local form state for Profile
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  
  // Avatar upload state
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  // Delete profile state
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingConfirm, setIsDeletingConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const handleDeleteProfile = async () => {
    setIsDeletingConfirm(true);
    setDeleteError(null);
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);
        
      if (error) throw error;
      
      await refreshProfile(); // This will fetch and setProfileCompleted(false)
    } catch (err) {
      console.error(err);
      setDeleteError('Your profile could not be deleted. Please try again.');
    } finally {
      setIsDeletingConfirm(false);
    }
  };

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        city: profile.city || '',
        travel_preference: profile.travel_preference || '',
        home_address: profile.home_address || '',
        organization_name: profile.organization_name || '',
        government_department: profile.government_department || ''
      });
    }
  }, [profile]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setSaveMessage(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', user.id);
        
      if (error) throw error;
      
      setSaveMessage({ type: 'success', text: 'Saved Successfully' });
      // Realtime in AuthContext will auto-refresh the global profile,
      // but we can call refresh just in case.
      refreshProfile();
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setSaveMessage({ type: 'error', text: 'Failed to save changes' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("File size must be under 2MB");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      refreshProfile();
    } catch (err) {
      console.error("Avatar upload error:", err);
      alert("Failed to upload avatar");
    } finally {
      setIsUploading(false);
    }
  };

  if (!profile) return null;

  const currentAvatar = profile?.avatar_url || user?.user_metadata?.avatar_url;

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-up">
      <div>
        <h2 className="text-2xl font-display font-bold text-white tracking-tight">Profile & Settings</h2>
        <p className="text-sm text-gray-400 mt-1">Manage your account and preferences.</p>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        
        {/* Settings Sidebar */}
        <div className="w-64 shrink-0 flex flex-col gap-2 border-r border-white/5 pr-6">
          <TabButton icon={<User />} label="Personal Info" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
          <TabButton icon={<PhoneCall />} label="Emergency Contacts" active={activeTab === 'emergency'} onClick={() => setActiveTab('emergency')} />
          <TabButton icon={<Bell />} label="Notifications" active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} />
          <TabButton icon={<Lock />} label="Privacy & Security" active={activeTab === 'privacy'} onClick={() => setActiveTab('privacy')} />
        </div>

        {/* Settings Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
          
          {activeTab === 'profile' && (
            <div className="space-y-6 max-w-2xl">
              <div className="flex items-center gap-6 glass-panel p-6 relative">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full bg-brand-blue/20 border-2 border-brand-blue flex items-center justify-center overflow-hidden">
                    {currentAvatar ? (
                      <img src={currentAvatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-brand-blue" />
                    )}
                  </div>
                  {/* Upload Overlay */}
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    {isUploading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} accept="image/jpeg,image/png,image/gif" className="hidden" />
                </div>
                <div>
                  <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="bg-brand-blue hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors mb-2 disabled:opacity-50">
                    {isUploading ? 'Uploading...' : 'Change Avatar'}
                  </button>
                  <p className="text-xs text-gray-500">JPG, GIF or PNG. Max size of 2MB</p>
                </div>
              </div>

              <div className="glass-panel p-6 space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-display font-bold text-white">Personal Information</h3>
                  <span className="text-xs text-brand-neonGreen uppercase tracking-wider font-mono px-2 py-1 bg-brand-neonGreen/10 rounded">{profile.role}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="Full Name" name="full_name" icon={<User />} value={formData.full_name} onChange={handleChange} placeholder="Not provided" />
                  <div>
                    <label className="block text-xs font-mono text-gray-500 mb-1.5">Email Address</label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><Mail className="w-4 h-4"/></div>
                      <input type="text" value={user.email} disabled className="w-full bg-white/5 border border-white/10 text-gray-400 pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none cursor-not-allowed" />
                    </div>
                  </div>
                  <InputField label="Phone Number" name="phone" icon={<Phone />} value={formData.phone} onChange={handleChange} placeholder="Not provided" />
                  <InputField label="City" name="city" icon={<MapPin />} value={formData.city} onChange={handleChange} placeholder="Not provided" />
                </div>

                {/* Role Specific Fields */}
                <div className="pt-4 border-t border-white/5 mt-4">
                  <h4 className="text-sm font-bold text-white mb-4">Additional Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {profile.role === 'citizen' && (
                      <>
                        <InputField label="Preferred Travel Time" name="travel_preference" icon={<Clock />} value={formData.travel_preference} onChange={handleChange} placeholder="e.g. Evening (6 PM - 9 PM)" />
                        <InputField label="Home Address" name="home_address" icon={<Building />} value={formData.home_address} onChange={handleChange} placeholder="Not provided" />
                      </>
                    )}
                    {profile.role === 'enterprise' && (
                      <InputField label="Organization Name" name="organization_name" icon={<Building />} value={formData.organization_name} onChange={handleChange} placeholder="Not provided" />
                    )}
                    {profile.role === 'government' && (
                      <InputField label="Department" name="government_department" icon={<Shield />} value={formData.government_department} onChange={handleChange} placeholder="Not provided" />
                    )}
                  </div>
                </div>

                <div className="pt-4 text-right flex items-center justify-end gap-4">
                  {saveMessage && (
                    <span className={`text-sm font-medium flex items-center gap-2 ${saveMessage.type === 'success' ? 'text-brand-neonGreen' : 'text-red-500'}`}>
                      {saveMessage.type === 'success' && <Check className="w-4 h-4" />}
                      {saveMessage.text}
                    </span>
                  )}
                  <button onClick={handleSave} disabled={isSaving} className="bg-brand-neonGreen text-[#080c10] hover:bg-green-400 px-6 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-2">
                    {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'emergency' && (
            <div className="space-y-6 max-w-2xl animate-fade-in">
              <div className="glass-panel p-6 space-y-4 text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 mx-auto flex items-center justify-center mb-4">
                   <PhoneCall className="w-8 h-8" />
                </div>
                <h3 className="font-display font-bold text-white text-xl">Emergency Settings Moved</h3>
                <p className="text-gray-400 text-sm max-w-sm mx-auto mb-6">
                  Medical Information and Emergency Contacts are now managed in the dedicated Emergency Assistance module.
                </p>
                <button 
                  onClick={() => window.location.href = '/dashboard/emergency'}
                  className="bg-brand-blue hover:bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors"
                >
                  Go to Emergency Dashboard
                </button>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-6 max-w-2xl animate-fade-in">
              <div className="glass-panel p-6 space-y-4 border border-red-500/20">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-display font-bold text-red-400">Danger Zone</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-white font-medium mb-1">Delete Profile</h4>
                    <p className="text-sm text-gray-400">
                      This will permanently remove your RakshaNav profile information. Your underlying authentication account will remain active, but you will need to complete onboarding again. This action cannot be undone.
                    </p>
                  </div>
                  
                  {isDeleting ? (
                    <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4">
                      <p className="text-red-400 text-sm font-medium mb-4">Are you absolutely sure you want to delete your profile?</p>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => setIsDeleting(false)}
                          disabled={isDeletingConfirm}
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleDeleteProfile}
                          disabled={isDeletingConfirm}
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          {isDeletingConfirm ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                          {isDeletingConfirm ? 'Deleting...' : 'Yes, Delete Profile'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setIsDeleting(true)}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Delete Profile
                    </button>
                  )}
                  {deleteError && (
                    <p className="text-red-400 text-sm mt-2">{deleteError}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({ icon, label, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all text-sm font-medium
        ${active ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}
      `}
    >
      {React.cloneElement(icon, { className: "w-4 h-4" })}
      {label}
    </button>
  );
}

function InputField({ label, name, icon, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-mono text-gray-500 mb-1.5">{label}</label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
          {React.cloneElement(icon, { className: "w-4 h-4" })}
        </div>
        <input 
          type="text" 
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-white/5 border border-white/10 text-white pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none focus:border-brand-blue/50 transition-colors"
        />
      </div>
    </div>
  );
}
