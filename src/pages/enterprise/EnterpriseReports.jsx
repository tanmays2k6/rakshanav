import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { hazardService } from '../../services/hazardService';
import { ShieldCheck, AlertTriangle, CheckCircle, FileText } from 'lucide-react';

export default function EnterpriseReports() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reportData, setReportData] = useState({
    title: '',
    category: 'Safety Violation',
    priority: 'Medium',
    description: '',
    address: 'Enterprise HQ',
    city: 'Bengaluru'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);

    try {
      // Flag as enterprise via a specific category/title, or if we had a role/org field.
      // We will just submit it to incident_reports with user_id to link it.
      const payload = {
        user_id: user.id,
        title: `[Enterprise] ${reportData.title}`,
        category: reportData.category,
        priority: reportData.priority,
        latitude: 12.9716, // using static GPS for enterprise form simplicity
        longitude: 77.5946,
        address: reportData.address,
        city: reportData.city,
        description: reportData.description,
        severity: reportData.priority === 'High' ? 'High' : 'Medium',
        is_anonymous: false
      };

      const res = await hazardService.submitReport(payload);
      if (res.success) {
        setSubmitted(true);
      } else {
        alert("Submission failed: " + res.error);
      }
    } catch (err) {
       alert("Error submitting report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
     return (
        <div className="p-8 h-full flex flex-col items-center justify-center animate-fade-up">
           <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-brand-neonGreen" />
           </div>
           <h2 className="text-3xl font-display font-bold text-white mb-2">Enterprise Report Filed</h2>
           <p className="text-gray-400 mb-8 max-w-md text-center">
             Your official enterprise report has been submitted to the central municipal database.
           </p>
           <button 
             onClick={() => { setSubmitted(false); setReportData({...reportData, title:'', description:''}); }}
             className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-colors"
           >
             Submit Another Report
           </button>
        </div>
     )
  }

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar animate-fade-up">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-white mb-2 flex items-center gap-3">
             <FileText className="w-8 h-8 text-brand-orange" />
             Official Enterprise Reporting
          </h1>
          <p className="text-gray-400">Submit formal hazard reports or safety violations on behalf of your organization directly to the Government Command Center.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="glass-panel p-8 border border-white/10 rounded-xl space-y-6 shadow-xl">
           
           <div>
              <label className="block text-xs font-mono text-gray-500 mb-2">REPORT TITLE</label>
              <input 
                 required
                 type="text"
                 value={reportData.title}
                 onChange={e => setReportData({...reportData, title: e.target.value})}
                 className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl text-sm outline-none focus:border-brand-orange"
                 placeholder="E.g. Hazard near East Gate Campus"
              />
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                 <label className="block text-xs font-mono text-gray-500 mb-2">CATEGORY</label>
                 <select 
                    value={reportData.category}
                    onChange={e => setReportData({...reportData, category: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl text-sm outline-none focus:border-brand-orange"
                 >
                    <option value="Safety Violation">Safety Violation</option>
                    <option value="Infrastructure Damage">Infrastructure Damage</option>
                    <option value="Security Threat">Security Threat</option>
                 </select>
              </div>
              <div>
                 <label className="block text-xs font-mono text-gray-500 mb-2">PRIORITY</label>
                 <select 
                    value={reportData.priority}
                    onChange={e => setReportData({...reportData, priority: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl text-sm outline-none focus:border-brand-orange"
                 >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                 </select>
              </div>
           </div>

           <div>
              <label className="block text-xs font-mono text-gray-500 mb-2">DESCRIPTION / INCIDENT DETAILS</label>
              <textarea 
                 required
                 rows="4"
                 value={reportData.description}
                 onChange={e => setReportData({...reportData, description: e.target.value})}
                 className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl text-sm outline-none focus:border-brand-orange resize-none"
                 placeholder="Provide detailed description of the incident..."
              ></textarea>
           </div>

           <div className="bg-black/40 p-4 border border-white/5 rounded-xl flex items-start gap-4">
              <ShieldCheck className="w-6 h-6 text-brand-orange shrink-0 mt-1" />
              <div>
                 <p className="text-sm font-bold text-white mb-1">Official Submission Notice</p>
                 <p className="text-xs text-gray-400 leading-relaxed">
                   Reports submitted through this portal are marked as official enterprise communications. They bypass standard citizen verification and are routed directly to the Government Command Center queue.
                 </p>
              </div>
           </div>

           <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-brand-orange hover:bg-orange-600 text-white font-bold py-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
           >
              {isSubmitting ? <span className="animate-spin text-xl leading-none">⟳</span> : <AlertTriangle className="w-5 h-5" />}
              {isSubmitting ? 'Submitting to Government...' : 'Submit Official Report'}
           </button>

        </form>
      </div>
    </div>
  );
}
