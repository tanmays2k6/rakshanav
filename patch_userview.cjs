const fs = require('fs');
const path = 'e:/rakshanav-main/rakshanav-main/rakshanav/src/components/UserView.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. In RouteCard, make pills handle nulls and skeletons
const pillRegex = /const Pill = \(\{ label, icon, color, animate \}\) => \([\s\S]*?\}\)/;
const newPill = `const Pill = ({ label, icon, color, animate, isLoading }) => {
  if (isLoading) {
     return (
       <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/5 bg-white/5 animate-pulse min-w-[80px]">
         <div className="w-4 h-4 bg-white/20 rounded-full"></div>
         <div className="w-12 h-3 bg-white/20 rounded"></div>
       </div>
     );
  }
  return (
    <div className={\`flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-\${color}/20 bg-\${color}/5 hover:bg-\${color}/10 transition-colors \${animate ? 'animate-pulse shadow-[0_0_15px_rgba(0,0,0,0.5)] shadow-'+color : ''}\`}>
      <span className="text-sm drop-shadow-md">{icon}</span>
      <span className={\`text-xs font-semibold text-\${color} drop-shadow-sm\`}>{label}</span>
    </div>
  )
}`;
content = content.replace(pillRegex, newPill);

const routeCardRegex = /const RouteCard = \(\{ data, isActive, onClick, onGo, aiAnalysis \}\) => \{[\s\S]*?return \([\s\S]*?\}\)/;
const newRouteCard = `const RouteCard = ({ data, isActive, onClick, onGo, aiAnalysis }) => {
  const isMetricsPending = !data.metricsLoaded;
  
  let color = 'brand-neonGreen'
  let label = 'Balanced Route'
  let rankIcon = '⚖️'
  if (data.type === 'safest') { color = 'brand-neonBlue'; label = 'Safest Route'; rankIcon = '🛡️' }
  else if (data.type === 'fastest') { color = 'brand-neonRed'; label = 'Fastest Route'; rankIcon = '⚡' }

  const policeLabel = data.infrastructure?.police === null ? 'Unknown' : \`\${data.infrastructure?.police ?? 0} Police\`;
  const hospLabel = data.infrastructure?.hospitals === null ? 'Unknown' : \`\${data.infrastructure?.hospitals ?? 0} Hospitals\`;
  const lightLabel = data.breakdown?.lighting === null ? 'Unknown' : \`\${Math.round(data.breakdown?.lighting ?? 0)}/100 Light\`;
  const reportsLabel = data.reports === null ? 'Unknown' : \`\${data.reports ?? 0} Reports\`;
  const confLabel = data.confidence === null ? 'Unknown' : \`\${data.confidence ?? 0}% Conf\`;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={\`relative cursor-pointer transition-all duration-300 rounded-2xl overflow-hidden \${
        isActive 
          ? \`ring-2 ring-\${color} shadow-[0_0_20px_rgba(var(--\${color}-rgb),0.3)] bg-[#0d1620]\` 
          : 'border border-white/10 bg-[#0a111a] hover:border-white/30'
      }\`}
    >
      <div className={\`absolute top-0 left-0 w-1 h-full bg-\${color}\`}></div>
      <div className="p-4 pl-5">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className={\`text-xs font-bold text-\${color} tracking-wider uppercase mb-1 flex items-center gap-1.5\`}>
              {rankIcon} {isMetricsPending ? 'Analyzing...' : label}
            </div>
            <div className="text-xl font-bold text-white flex items-baseline gap-2">
              {data.duration}
              <span className="text-sm font-normal text-white/50">{data.distance}</span>
            </div>
          </div>
          {isActive && (
            <button 
              onClick={(e) => { e.stopPropagation(); onGo(); }}
              className={\`px-4 py-2 bg-\${color} text-black font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-[0_0_15px_rgba(var(--\${color}-rgb),0.5)] flex items-center gap-2\`}
            >
              GO <span className="text-lg">›</span>
            </button>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2 mt-3">
          <Pill isLoading={isMetricsPending} label={policeLabel} icon="👮" color={color} />
          <Pill isLoading={isMetricsPending} label={hospLabel} icon="🏥" color={color} />
          <Pill isLoading={isMetricsPending} label={lightLabel} icon="💡" color={color} />
          <Pill isLoading={isMetricsPending} label={reportsLabel} icon="⚠️" color={color} />
          <Pill isLoading={isMetricsPending} label={confLabel} icon="📊" color={color} />
        </div>

        {isActive && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 pt-4 border-t border-white/10"
          >
            <div className="text-sm font-medium text-white/70 flex items-center gap-2 mb-2">
              ✨ AI Safety Analysis:
            </div>
            {isMetricsPending ? (
              <div className="space-y-2">
                <div className="h-4 bg-white/10 rounded w-3/4 animate-pulse"></div>
                <div className="h-4 bg-white/10 rounded w-5/6 animate-pulse"></div>
                <div className="h-4 bg-white/10 rounded w-1/2 animate-pulse"></div>
              </div>
            ) : (
              <p className="text-sm text-white/90 leading-relaxed">
                {aiAnalysis || "Analysis currently unavailable."}
              </p>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}`;
content = content.replace(routeCardRegex, newRouteCard);

// 2. Rewrite handleSearch to fetch routes then metrics
const handleSearchRegex = /const handleSearch = useCallback\(async \(forcedFrom, forcedTo, isGpsActive\) => \{[\s\S]*?setPhase\('results'\)[\s\S]*?\}\), \[fromVal, toVal, useGps, currentCoords, fromOpt, toOpt\]\)/;
const newHandleSearch = `const handleSearch = useCallback(async (forcedFrom, forcedTo, isGpsActive) => {
    const fVal = forcedFrom !== undefined ? forcedFrom : fromVal;
    const tVal = forcedTo !== undefined ? forcedTo : toVal;
    const gpsActive = isGpsActive !== undefined ? isGpsActive : useGps;

    if (!tVal.trim()) {
      setErrorMsg("Please enter a destination.");
      setPhase('error');
      return;
    }
    if (!gpsActive && !fVal.trim()) {
      setErrorMsg("Please enter a starting location or enable GPS.");
      setPhase('error');
      return;
    }

    setPhase('searching'); setErrorMsg(''); setActiveRouteId('all')
    setDevDiagnostics({
      geocodingOrigin: 'pending', geocodingDest: 'pending', boundary: 'pending',
      osrm: 'pending', overpass: 'pending', safety: 'pending', gemini: 'pending'
    });
    
    console.log(\`\\n==================================================\`);
    console.log(\`[ROUTE DEBUG LOGGER] PIPELINE STARTED\`);
    console.log(\`Origin Search: \${fVal}\`);
    console.log(\`Destination Search: \${tVal}\`);

    try {
      let startCoord;
      let fromShort;

      if (gpsActive && currentCoords) {
        startCoord = currentCoords;
        fromShort = 'Current Location';
      } else {
        setStatusMsg('📍 Resolving origin...')
        if (fromOpt && fromOpt.display_name === fVal) {
          startCoord = fromOpt;
          fromShort = fromOpt.display_name.split(',')[0];
        } else {
          const res = await locationService.forwardGeocode(fVal);
          if (res.length === 0) throw new Error("Location not found.");
          startCoord = res[0];
          fromShort = startCoord.display_name.split(',')[0];
        }
      }
      
      console.log(\`Origin Coordinates resolved: \${startCoord.lat}, \${startCoord.lng} (\${startCoord.display_name || fromShort})\`);
      setDevDiagnostics(prev => ({ ...prev, geocodingOrigin: 'success' }));

      setStatusMsg('📍 Resolving destination...')
      let endCoord;
      let toShort;
      try {
        if (toOpt && toOpt.display_name === tVal) {
          endCoord = toOpt;
          toShort = toOpt.display_name.split(',')[0];
        } else {
          const res = await locationService.forwardGeocode(tVal);
          if (res.length === 0) throw new Error("Location not found.");
          endCoord = res[0];
          toShort = endCoord.display_name.split(',')[0];
        }
        console.log(\`Destination Coordinates resolved: \${endCoord.lat}, \${endCoord.lng} (\${endCoord.display_name || toShort})\`);
        setDevDiagnostics(prev => ({ ...prev, geocodingDest: 'success' }));
      } catch (err) {
        setDevDiagnostics(prev => ({ ...prev, geocodingDest: 'error' }));
        throw err;
      }
      
      const isBoundaryValid = isWithinBengaluru(endCoord.lat, endCoord.lng) && isWithinBengaluru(startCoord.lat, startCoord.lng);
      if (!isBoundaryValid) {
        setDevDiagnostics(prev => ({ ...prev, boundary: 'error' }));
        throw new Error("Outside supported area.");
      }
      setDevDiagnostics(prev => ({ ...prev, boundary: 'success' }));

      setStatusMsg('🚀 Routing starts...')
      let response;
      try {
        response = await mapService.getRoute(startCoord.lat, startCoord.lng, endCoord.lat, endCoord.lng, 'driving')
        setDevDiagnostics(prev => ({ ...prev, osrm: response.diagnostics?.osrm?.status || 'success' }));
      } catch (err) {
        setDevDiagnostics(prev => ({ ...prev, osrm: 'error' }));
        throw err;
      }
      
      if (!response.routes || response.routes.length === 0) {
        throw new Error("No practical road connection exists between these locations.");
      }

      setStatusMsg('🛡 Rendering map...')

      // Initialize route state (geometries ready, metrics pending)
      setRouteData({
        candidates: response.routes,
        bounds: getBounds(response.routes),
        start: { lat: startCoord.lat, lng: startCoord.lng, label: fromShort }, 
        end: { lat: endCoord.lat, lng: endCoord.lng, label: toShort },
        startLabel: fromShort, endLabel: toShort,
      })
      setPhase('results')

      // Fetch safety metrics independently for each route in parallel
      setIsAiLoading(true);
      setRouteAnalyses({});
      
      const metricsPromises = response.routes.map(async (route) => {
        try {
          const m = await mapService.getRouteMetrics(route.geometry, route.distanceRaw, route.durationRaw);
          return { ...route, ...m, metricsLoaded: true };
        } catch(e) {
          return { ...route, metricsLoaded: true, score: null, confidence: 0 };
        }
      });

      const fullyLoadedRoutes = await Promise.all(metricsPromises);

      // Re-rank now that all data is available
      const safest = [...fullyLoadedRoutes].sort((a, b) => (b.score || 0) - (a.score || 0))[0];
      const fastest = [...fullyLoadedRoutes].sort((a, b) => a.durationRaw - b.durationRaw)[0];
      
      const rankedRoutes = fullyLoadedRoutes.map(r => {
        let type = 'balanced';
        if (r.id === safest.id) type = 'safest';
        else if (r.id === fastest.id && r.id !== safest.id) type = 'fastest';
        return { ...r, type };
      }).sort((a, b) => {
        const tr = { 'safest': 1, 'balanced': 2, 'fastest': 3 };
        if (tr[a.type] !== tr[b.type]) return tr[a.type] - tr[b.type];
        return (b.score || 0) - (a.score || 0);
      });

      // Update state with metrics
      setRouteData(prev => ({ ...prev, candidates: rankedRoutes }));

      // Now fetch Gemini analysis for the ranked routes
      const analysisPromises = rankedRoutes.map(async (r) => {
        try {
          const analysis = await geminiService.analyzeSingleRoute({
            source: fromShort, destination: toShort, type: r.type,
            distance: r.distance, duration: r.duration, safetyScore: r.score || 0,
            lighting: r.breakdown?.lighting || 'Unknown',
            hospitals: r.infrastructure?.hospitals || 0,
            police: r.infrastructure?.police || 0,
            commercial: r.infrastructure?.commercial || 0,
            communityReports: r.reports || 0,
            weather: r.weather && r.weather.isRaining ? 'Raining' : 'Clear'
          });
          return { id: r.id, analysis, success: true };
        } catch (e) {
          return { id: r.id, analysis: "AI Analysis unavailable.", success: false };
        }
      });

      Promise.all(analysisPromises).then(results => {
        const analysesMap = {};
        results.forEach(res => { analysesMap[res.id] = res.analysis; });
        setRouteAnalyses(analysesMap);
        setIsAiLoading(false);
      });

    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred.");
      setPhase('error')
    }
  }, [fromVal, toVal, useGps, currentCoords, fromOpt, toOpt])`;

content = content.replace(handleSearchRegex, newHandleSearch);

fs.writeFileSync(path, content, 'utf8');
console.log('Rewrote UserView.jsx');
