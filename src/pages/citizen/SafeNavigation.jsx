import React from 'react';
import { useLocation } from 'react-router-dom';
import UserView from '../../components/UserView';

export default function SafeNavigation() {
  const location = useLocation();
  
  // Safely parse state with strong defaults
  const state = location.state || {};
  const origin = typeof state.origin === 'string' ? state.origin : '';
  const destination = typeof state.destination === 'string' ? state.destination : '';
  const autoTrigger = typeof state.autoTrigger === 'boolean' ? state.autoTrigger : false;

  return (
    <div className="absolute inset-0 rounded-2xl overflow-hidden border border-white/10 shadow-xl z-0">
      <UserView 
        onAddReport={() => {}} 
        userReports={[]} 
        initialOrigin={origin}
        initialDestination={destination}
        autoTrigger={autoTrigger}
      />
    </div>
  );
}
