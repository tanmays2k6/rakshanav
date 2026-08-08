const fs = require('fs');

const path = 'e:/rakshanav-main/rakshanav-main/rakshanav/src/pages/PublicTracking.jsx';
let c = fs.readFileSync(path, 'utf8');

const newFetchSession = `    const fetchSession = async () => {
      // 1. Fetch Session
      const { data: sessionData, error: sessionError } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('share_token', token)
        .single();

      if (sessionError) {
        if (process.env.NODE_ENV === 'development') {
          console.error("Live Tracking Error [live_sessions]:", sessionError);
        }
        // PGRST116 is thrown when .single() finds no rows.
        if (sessionError.code === 'PGRST116') {
           setError('Tracking Inactive – Link expired or invalid');
        } else {
           setError(\`Backend Error: \${sessionError.message} (\${sessionError.code})\`);
        }
        setLoading(false);
        return;
      }
      
      if (!sessionData) {
        setError('Link expired or invalid');
        setLoading(false);
        return;
      }

      if (!sessionData.is_active || new Date(sessionData.expires_at) < new Date()) {
        setError('This live tracking session has ended or expired.');
        setLoading(false);
        return;
      }

      setSession(sessionData);

      // 2. Fetch last 100 historical locations
      const { data: locData, error: locError } = await supabase
        .from('live_locations')
        .select('*')
        .eq('session_id', sessionData.id)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (locError && process.env.NODE_ENV === 'development') {
        console.error("Live Tracking Error [live_locations]:", locError);
      }

      if (locData && locData.length > 0) {
        setLocations(locData.reverse()); // old to new for polyline
      } else if (sessionData.last_location) {
        // Fallback to last known location if history is missing
        setLocations([sessionData.last_location]);
      }

      // 3. Subscribe to Realtime Updates
      setStatus('live');
      setLoading(false);

      subscription = supabase
        .channel(\`public:live_locations:\${sessionData.id}\`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'live_locations',
            filter: \`session_id=eq.\${sessionData.id}\`
          },
          (payload) => {
            setLocations((prev) => {
              const updated = [...prev, payload.new];
              if (updated.length > 100) updated.shift();
              return updated;
            });
          }
        )
        // Also listen for session updates in case it gets disabled
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'live_sessions',
            filter: \`id=eq.\${sessionData.id}\`
          },
          (payload) => {
            if (payload.new.is_active === false) {
               setError('This live tracking session was ended by the user.');
            }
          }
        )
        .subscribe();
    };`;

c = c.replace(
  /const fetchSession = async \(\) => \{[\s\S]*?\.subscribe\(\);\s*\};/,
  newFetchSession
);

fs.writeFileSync(path, c, 'utf8');
console.log('Patched PublicTracking.jsx');
