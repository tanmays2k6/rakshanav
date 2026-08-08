const fs = require('fs');
const path = 'e:/rakshanav-main/rakshanav-main/rakshanav/src/pages/citizen/Emergency.jsx';

let c = fs.readFileSync(path, 'utf8');

// 1. Add toast state to Emergency component
c = c.replace(
  'const [isContactModalOpen, setIsContactModalOpen] = useState(false);',
  `const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 3000);
  };`
);

// 2. Replace alert() with showToast() in Emergency component
c = c.replace(/alert\('Geolocation is not supported by your browser\.'\);/, "showToast('Geolocation is not supported by your browser.', 'error');");
c = c.replace(/alert\('Failed to trigger SOS on server\. Please call emergency services manually\.'\);/, "showToast('Failed to trigger SOS on server. Please call emergency services manually.', 'error');");
c = c.replace(/alert\('Failed to get location\. Please enable GPS\.'\);/, "showToast('Failed to get location. Please enable GPS.', 'error');");
c = c.replace(/alert\('Copied!'\);/, "showToast('Copied!', 'success');");

// 3. Render Toast component inside Emergency
c = c.replace(
  '{/* Modals */}',
  `{/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={\`fixed top-6 left-1/2 -translate-x-1/2 z-[10000] px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl border \${toast.type === 'error' ? 'bg-red-950/90 border-red-500/50 text-red-200' : 'bg-green-950/90 border-green-500/50 text-green-200'}\`}
          >
            {toast.type === 'error' ? <AlertTriangle className="w-5 h-5 text-red-500" /> : <Check className="w-5 h-5 text-green-500" />}
            <span className="text-sm font-semibold tracking-wide">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}`
);

// 4. Update Modal props
c = c.replace(
  '<MedicalProfileModal isOpen={isMedicalModalOpen} onClose={() => setIsMedicalModalOpen(false)} user={user} existingData={medicalInfo} />',
  '<MedicalProfileModal isOpen={isMedicalModalOpen} onClose={() => setIsMedicalModalOpen(false)} user={user} existingData={medicalInfo} showToast={showToast} />'
);
c = c.replace(
  '<ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} user={user} editingContact={editingContact} />',
  '<ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} user={user} editingContact={editingContact} contacts={contacts} loadContacts={loadContacts} showToast={showToast} />'
);

// 5. Replace alert in MedicalProfileModal
c = c.replace(
  'function MedicalProfileModal({ isOpen, onClose, user, existingData }) {',
  'function MedicalProfileModal({ isOpen, onClose, user, existingData, showToast }) {'
);
c = c.replace(
  'if (res.success) onClose();\n    else alert(res.error);',
  'if (res.success) {\n      showToast("Medical profile updated successfully.");\n      onClose();\n    } else {\n      showToast(res.error, "error");\n    }'
);

// 6. Restrict to 5 contacts in the UI
c = c.replace(
  '{contacts.length > 0 && contacts.length < 5 && (',
  '{contacts.length >= 5 ? (\n                <button disabled className="text-13 text-gray-500 flex items-center gap-1 cursor-not-allowed opacity-50" title="You can save up to 5 emergency contacts."><Plus className="w-4 h-4"/> Add</button>\n              ) : ('
);
// Make sure to close the ternary we just injected instead of `)`
c = c.replace(
  '               </button>\n              )}',
  '               </button>\n              )}'
);

// Wait, the original was:
/*
{contacts.length > 0 && contacts.length < 5 && (
  <button onClick={() => { setEditingContact(null); setIsContactModalOpen(true); }} className="text-13 text-brand-blue hover:text-white flex items-center gap-1 transition-colors">
     <Plus className="w-4 h-4"/> Add
  </button>
)}
*/
// Let's accurately replace that block
c = c.replace(
  /\{contacts\.length > 0 && contacts\.length < 5 && \(\s*<button[\s\S]*?<\/button>\s*\)\}/,
  `{contacts.length > 0 ? (
                contacts.length >= 5 ? (
                  <button onClick={() => showToast("You can save up to 5 emergency contacts.", "error")} className="text-13 text-gray-500 flex items-center gap-1 cursor-not-allowed">
                     <Plus className="w-4 h-4"/> Add
                  </button>
                ) : (
                  <button onClick={() => { setEditingContact(null); setIsContactModalOpen(true); }} className="text-13 text-brand-blue hover:text-white flex items-center gap-1 transition-colors">
                     <Plus className="w-4 h-4"/> Add
                  </button>
                )
              ) : null}`
);

// Wait, the empty state add button shouldn't be disabled because length == 0.
// But wait, the empty state button is handled separately further down in `<div className="flex-1 flex flex-col items-center justify-center... ">`

// 7. Re-write ContactModal completely
const oldContactModalStart = c.indexOf('function ContactModal');
const originalPart = c.substring(0, oldContactModalStart);

const newContactModal = `function ContactModal({ isOpen, onClose, user, editingContact, contacts, loadContacts, showToast }) {
    const [formData, setFormData] = useState({
      name: editingContact?.name || '',
      relationship: editingContact?.relationship || '',
      phone: editingContact?.phone || '',
      priority: editingContact?.priority || 'Secondary'
    });
    const [isSaving, setIsSaving] = useState(false);
  
    const validateIndianPhone = (phone) => {
      // Remove all non-digits
      const digits = phone.replace(/\\D/g, '');
      // E.164 for India is +91 followed by 10 digits
      if (digits.length === 10) return '+91' + digits;
      if (digits.length === 12 && digits.startsWith('91')) return '+' + digits;
      if (digits.length === 13 && digits.startsWith('091')) return '+91' + digits.substring(3);
      return null;
    };
  
    const handleSave = async () => {
      // 6. User Verification
      if (!user) {
         showToast("You must be signed in.", "error");
         return;
      }
      
      // 8. Required fields
      if (!formData.name || !formData.relationship || !formData.phone || !formData.priority) {
         showToast("All fields are required.", "error");
         return;
      }

      // 13. Validate phone number
      const formattedPhone = validateIndianPhone(formData.phone);
      if (!formattedPhone) {
         showToast("Please enter a valid 10-digit Indian mobile number.", "error");
         return;
      }

      // 12. Prevent duplicate phone numbers
      if (!editingContact && contacts.some(c => c.phone === formattedPhone)) {
         showToast("This phone number is already in your emergency contacts.", "error");
         return;
      }

      // 11. Max Limit Verification (Backend safety)
      if (!editingContact && contacts.length >= 5) {
         showToast("You can save up to 5 emergency contacts.", "error");
         return;
      }

      setIsSaving(true);
      
      // 5. Always explicitly send user_id = auth.uid()
      const payload = { 
        user_id: user.id, 
        name: formData.name,
        relationship: formData.relationship,
        phone: formattedPhone,
        priority: formData.priority
      };
      
      // 14. Log Supabase request in development
      if (process.env.NODE_ENV === 'development') {
         console.log("Supabase Request Payload (Emergency Contact):", payload);
      }
      
      let res;
      if (editingContact) {
        res = await emergencyService.updateContact(editingContact.id, payload);
      } else {
        res = await emergencyService.addContact(payload);
      }
      
      if (process.env.NODE_ENV === 'development') {
         console.log("Supabase Response (Emergency Contact):", res);
      }
      
      setIsSaving(false);
      
      if (res.success) {
        showToast("Contact added successfully.");
        // 10. Refresh immediately
        if (loadContacts) await loadContacts();
        onClose();
      } else {
        showToast(res.error || "Permission denied. Unable to save contact.", "error");
      }
    };
  
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-fade-in">
         <div className="glass-panel w-full max-w-md border border-white/10 shadow-2xl overflow-hidden bg-[#080c12]/90">
            <div className="flex justify-between items-center p-5 border-b border-white/10">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 <Users className="w-5 h-5 text-brand-blue"/> {editingContact ? 'Edit Contact' : 'Add Contact'}
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1.5 uppercase tracking-widest">Contact Name</label>
                <input type="text" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} placeholder="e.g. Jane Doe" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white text-13 outline-none focus:border-brand-blue transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1.5 uppercase tracking-widest">Relationship</label>
                <input type="text" value={formData.relationship} onChange={e=>setFormData({...formData, relationship: e.target.value})} placeholder="e.g. Mother, Partner" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white text-13 outline-none focus:border-brand-blue transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1.5 uppercase tracking-widest">Phone Number</label>
                <input type="tel" value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} placeholder="10-digit Indian Mobile" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white text-13 outline-none focus:border-brand-blue transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1.5 uppercase tracking-widest">Priority</label>
                <select value={formData.priority} onChange={e=>setFormData({...formData, priority: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white text-13 outline-none focus:border-brand-blue transition-colors">
                  <option value="Primary" className="bg-[#080c12]">Primary (First to contact)</option>
                  <option value="Secondary" className="bg-[#080c12]">Secondary</option>
                </select>
              </div>
            </div>
            
            <div className="p-5 border-t border-white/10 bg-black/40 flex justify-end gap-3">
               <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-13 font-bold text-gray-300 hover:bg-white/5 hover:text-white transition-colors">Cancel</button>
               <button onClick={handleSave} disabled={isSaving} className="px-8 py-2.5 rounded-xl text-13 font-bold text-white bg-brand-blue hover:bg-blue-600 flex items-center gap-2 transition-colors shadow-[0_0_15px_rgba(59,130,246,0.3)] disabled:opacity-50">
                  {isSaving ? 'Saving...' : 'Save'}
               </button>
            </div>
         </div>
      </div>
    );
}
`;

fs.writeFileSync(path, originalPart + newContactModal, 'utf8');
console.log('Emergency.jsx patched successfully.');
