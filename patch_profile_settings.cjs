const fs = require('fs');

const path = 'e:/rakshanav-main/rakshanav-main/rakshanav/src/pages/citizen/ProfileSettings.jsx';
let c = fs.readFileSync(path, 'utf8');

const notifTabRegex = /\{activeTab === 'notifications' && \([\s\S]*?\}\)/;

const newNotifTab = `{activeTab === 'notifications' && (
              <div className="space-y-6 max-w-2xl animate-fade-in">
                <div className="glass-panel p-6">
                  <h3 className="text-lg font-bold text-white mb-6">Notification Preferences</h3>
                  
                  <div className="space-y-6">
                    <div className="space-y-4">
                       <h4 className="text-sm font-mono text-gray-500 uppercase">Alert Types</h4>
                       {[
                         { id: 'route_alerts', label: 'Route & Navigation Alerts' },
                         { id: 'hazard_alerts', label: 'Hazard & Incident Reports' },
                         { id: 'weather_alerts', label: 'Weather Warnings' },
                         { id: 'gov_advisories', label: 'Official Gov Advisories' },
                         { id: 'enterprise_notifs', label: 'Enterprise Updates' },
                         { id: 'community_notifs', label: 'Community Messages' }
                       ].map(pref => (
                         <div key={pref.id} className="flex items-center justify-between">
                            <span className="text-gray-300 text-sm font-medium">{pref.label}</span>
                            <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                               <input type="checkbox" name="toggle" id={pref.id} className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer" defaultChecked={true}/>
                               <label htmlFor={pref.id} className="toggle-label block overflow-hidden h-5 rounded-full bg-brand-blue cursor-pointer"></label>
                            </div>
                         </div>
                       ))}
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/10">
                       <h4 className="text-sm font-mono text-gray-500 uppercase">Delivery Methods</h4>
                       {[
                         { id: 'push_enabled', label: 'Push Notifications' },
                         { id: 'email_enabled', label: 'Email Notifications' }
                       ].map(pref => (
                         <div key={pref.id} className="flex items-center justify-between">
                            <span className="text-gray-300 text-sm font-medium">{pref.label}</span>
                            <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                               <input type="checkbox" name="toggle" id={pref.id} className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer" defaultChecked={pref.id === 'push_enabled'}/>
                               <label htmlFor={pref.id} className="toggle-label block overflow-hidden h-5 rounded-full bg-brand-blue cursor-pointer"></label>
                            </div>
                         </div>
                       ))}
                    </div>
                  </div>
                  
                  <div className="mt-8 flex justify-end">
                     <button className="px-6 py-2 bg-brand-blue hover:bg-blue-600 text-white rounded-xl font-bold transition-colors">
                        Save Preferences
                     </button>
                  </div>
                </div>
              </div>
            )}`;

if (notifTabRegex.test(c)) {
   c = c.replace(notifTabRegex, newNotifTab);
} else {
   c = c.replace(
     "{activeTab === 'privacy' && (",
     newNotifTab + "\n\n            {activeTab === 'privacy' && ("
   );
}

fs.writeFileSync(path, c, 'utf8');
console.log('Patched ProfileSettings.jsx');
