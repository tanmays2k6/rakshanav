const fs = require('fs');

const pathUserView = 'e:/rakshanav-main/rakshanav-main/rakshanav/src/components/UserView.jsx';
let content = fs.readFileSync(pathUserView, 'utf8');

// 1. Add "Analyzing..." phase handler
// Find: setPhase('results')
// Replace it to: setPhase('analyzing'); ... then fetch metrics, then setPhase('results')
const oldPipelineStart = `      setRouteData({
        candidates: response.routes,
        bounds: getBounds(response.routes),
        start: { lat: startCoord.lat, lng: startCoord.lng, label: fromShort }, 
        end: { lat: endCoord.lat, lng: endCoord.lng, label: toShort },
        startLabel: fromShort, endLabel: toShort,
      })
      setPhase('results')

      // Trigger AI Analysis independently for each route`;

const newPipelineStart = `      setRouteData({
        candidates: response.routes,
        bounds: getBounds(response.routes),
        start: { lat: startCoord.lat, lng: startCoord.lng, label: fromShort }, 
        end: { lat: endCoord.lat, lng: endCoord.lng, label: toShort },
        startLabel: fromShort, endLabel: toShort,
      })
      
      setStatusMsg('🛡 Fetching Live Metrics...')
      setPhase('analyzing') // Block UI on skeletons

      // 1. Fetch metrics in parallel for all routes
      const metricsPromises = response.routes.map(async (r) => {
        try {
          const metrics = await mapService.getRouteMetrics(r.geometry, parseFloat(r.distance), parseInt(r.duration));
          r.infrastructure = metrics.infrastructure;
          r.reports = metrics.reports;
          r.score = metrics.score;
          r.confidence = metrics.confidence;
          r.breakdown = metrics.breakdown;
          r.weather = metrics.weather;
          r.metricsLoaded = true;
        } catch (err) {
          console.error(\`Failed to fetch metrics for \${r.id}:\`, err);
          r.infrastructure = null;
          r.reports = null;
          r.score = null;
          r.metricsLoaded = false;
        }
        return r;
      });

      await Promise.all(metricsPromises);

      // Re-rank routes based on score and duration
      response.routes.sort((a, b) => (b.score || 0) - (a.score || 0));
      if (response.routes.length > 0) response.routes[0].type = 'safest';
      
      let fastestRoute = [...response.routes].sort((a, b) => (a.durationRaw || 0) - (b.durationRaw || 0))[0];
      if (fastestRoute && fastestRoute.id !== response.routes[0].id) {
         fastestRoute.type = 'fastest';
      }
      
      response.routes.forEach(r => {
         if (!r.type || r.type === 'pending') r.type = 'balanced';
      });

      setRouteData(prev => ({ ...prev, candidates: response.routes }));
      setPhase('results')

      // Trigger AI Analysis independently for each route`;

content = content.replace(oldPipelineStart, newPipelineStart);

// 2. Add skeleton rendering for 'analyzing'
// Find: {phase === 'results' && routeData && (
const oldResultsPhase = `{phase === 'results' && routeData && (`;
const newResultsPhase = `{(phase === 'results' || phase === 'analyzing') && routeData && (`;
content = content.replace(oldResultsPhase, newResultsPhase);

// Find: {routeData.candidates.map(r => {
//              const isActive = activeRouteId === 'all' || activeRouteId === r.id;
//              if (!isActive) return null;
//              return <RouteCard
const oldRouteCardLoop = `{routeData.candidates.map(r => {
              const isActive = activeRouteId === 'all' || activeRouteId === r.id;
              if (!isActive) return null;
              return <RouteCard key={r.id} data={r} darkMode={darkMode} sub={sub} card={card} txt={txt} color={getRouteColor(r.type)} routeAnalyses={routeAnalyses} onStart={() => handleStartNavigation(r)} />
            })}`;
            
const newRouteCardLoop = `{routeData.candidates.map(r => {
              const isActive = activeRouteId === 'all' || activeRouteId === r.id;
              if (!isActive) return null;
              if (phase === 'analyzing') return <RouteSkeleton key={r.id} darkMode={darkMode} card={card} />;
              return <RouteCard key={r.id} data={r} darkMode={darkMode} sub={sub} card={card} txt={txt} color={getRouteColor(r.type)} routeAnalyses={routeAnalyses} onStart={() => handleStartNavigation(r)} />
            })}`;
            
content = content.replace(oldRouteCardLoop, newRouteCardLoop);

// 3. Update RouteCard to show 'Unknown' instead of '0' when data is missing
const oldRouteCard = `<div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <Pill label={\`\${data.infrastructure?.police ?? 0} Police\`} icon="👮" color={color} />
        <Pill label={\`\${data.infrastructure?.hospitals ?? 0} Hospitals\`} icon="🏥" color={color} />
        <Pill label={\`\${Math.round(data.breakdown?.lighting ?? 0)}/100 Light\`} icon="💡" color={color} />
        <Pill label={\`\${data.reports ?? 0} Reports\`} icon="⚠️" color={color} />
        <Pill label={\`\${data.confidence ?? 0}% Conf\`} icon="📊" color={color} />
      </div>`;

const newRouteCard = `<div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <Pill label={\`\${data.infrastructure?.police ?? 'Unknown'} Police\`} icon="👮" color={color} />
        <Pill label={\`\${data.infrastructure?.hospitals ?? 'Unknown'} Hospitals\`} icon="🏥" color={color} />
        <Pill label={\`\${data.breakdown?.lighting !== undefined ? Math.round(data.breakdown.lighting) + '/100' : 'Unknown'} Light\`} icon="💡" color={color} />
        <Pill label={\`\${data.reports ?? 'No data'} Reports\`} icon="⚠️" color={color} />
        <Pill label={\`\${data.confidence ?? 0}% Conf\`} icon="📊" color={color} />
      </div>`;

content = content.replace(oldRouteCard, newRouteCard);

// 4. Update AI Analysis fallback logic in RouteCard
const oldAiFallback = `      <div style={{ padding: '10px 12px', background: 'rgba(15,23,42,0.4)', borderRadius: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.9)', lineHeight: 1.5, marginBottom: '16px', borderLeft: '2px solid #60a5fa' }}>
        {routeAnalyses[data.id] ? (
          routeAnalyses[data.id]
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid rgba(96,165,250,0.3)', borderTopColor: '#60a5fa', animation: 'spin 1s linear infinite' }} />
             <span style={{ color: sub }}>Analyzing...</span>
          </div>
        )}
      </div>`;

// Keep it as is, but maybe add the RouteSkeleton component at the end
const routeSkeletonComponent = `
function RouteSkeleton({ darkMode, card }) {
  const bg = darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  return (
    <div style={{ ...card({ padding: '16px' }), border: '1px dashed rgba(156,163,175,0.3)', flexShrink: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <div style={{ width: '80px', height: '12px', background: bg, borderRadius: '4px', marginBottom: '8px', animation: 'pulse 1.5s infinite' }}></div>
          <div style={{ width: '120px', height: '18px', background: bg, borderRadius: '4px', animation: 'pulse 1.5s infinite' }}></div>
        </div>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: bg, animation: 'pulse 1.5s infinite' }}></div>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
         <div style={{ width: '70px', height: '24px', background: bg, borderRadius: '12px', animation: 'pulse 1.5s infinite' }}></div>
         <div style={{ width: '80px', height: '24px', background: bg, borderRadius: '12px', animation: 'pulse 1.5s infinite' }}></div>
         <div style={{ width: '90px', height: '24px', background: bg, borderRadius: '12px', animation: 'pulse 1.5s infinite' }}></div>
      </div>
      <div style={{ width: '100%', height: '60px', background: bg, borderRadius: '8px', animation: 'pulse 1.5s infinite' }}></div>
    </div>
  )
}
`;

if (!content.includes('function RouteSkeleton')) {
  content += routeSkeletonComponent;
}

fs.writeFileSync(pathUserView, content, 'utf8');
console.log('Patched UserView.jsx');
