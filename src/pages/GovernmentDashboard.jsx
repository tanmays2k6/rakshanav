import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import GovtView from '../components/GovtView';
import { supabase } from '../lib/supabase';

export default function GovernmentDashboard() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    fetchReports();
    const subscription = supabase
      .channel('public:incident_reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incident_reports' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setReports(prev => [...prev, payload.new]);
        } else if (payload.eventType === 'UPDATE') {
          setReports(prev => prev.map(r => r.id === payload.new.id ? payload.new : r));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from('incident_reports')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setReports(data);
    }
  };

  const handleResolveReport = async (id) => {
    const { error } = await supabase
      .from('incident_reports')
      .update({ status: 'resolved' })
      .eq('id', id);

    if (error) {
      console.error("Error resolving report:", error);
      alert("Failed to resolve report");
    }
  };

  return (
    <DashboardLayout title="Government Dashboard">
      <div className="absolute inset-0">
        <GovtView userReports={reports} onResolveReport={handleResolveReport} />
      </div>
    </DashboardLayout>
  );
}
