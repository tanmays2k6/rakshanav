const fetch = require('node-fetch'); // actually the backend uses global fetch if Node 18+

async function run() {
  try {
    const supabaseUrl = "https://mikcukapkejtsnzlnwvi.supabase.co";
    const supabaseKey = "sb_publishable_pChIn782AZyJFMwUG8GmnQ_JraTyeK4";
    const sRes = await fetch(`${supabaseUrl}/rest/v1/incident_reports?status=eq.pending&select=*`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    if (sRes.ok) {
       const allReports = await sRes.json();
       console.log("Supabase Success, count:", allReports.length);
    } else {
       console.error("Supabase Failed:", sRes.status, sRes.statusText);
       console.error(await sRes.text());
    }
  } catch (e) {
    console.error(e);
  }
}

run();
