const fs = require('fs');

// Patch frontend geminiService.js
const pathGeminiFrontend = 'e:/rakshanav-main/rakshanav-main/rakshanav/src/services/geminiService.js';
let gemContent = fs.readFileSync(pathGeminiFrontend, 'utf8');

const oldFrontendAnalyze = `  async analyzeSingleRoute(routeData) {
    try {
      const response = await fetch('/api/ai/analyze-single-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(routeData)
      });
      if (!response.ok) throw new Error('Failed to analyze single route');
      const data = await response.json();
      return data.analysis;
    } catch (error) {
      console.error(error);
      throw error;
    }
  },`;

const newFrontendAnalyze = `  async analyzeSingleRoute(routeData) {
    try {
      const response = await fetch('/api/ai/analyze-single-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(routeData)
      });
      if (!response.ok) throw new Error('Failed to analyze single route');
      const data = await response.json();
      return data; // Returns { success, analysis, isFallback, error }
    } catch (error) {
      console.error(error);
      throw error;
    }
  },`;

gemContent = gemContent.replace(oldFrontendAnalyze, newFrontendAnalyze);
fs.writeFileSync(pathGeminiFrontend, gemContent, 'utf8');
console.log('Patched frontend/geminiService.js');

// Patch UserView.jsx
const pathUserView = 'e:/rakshanav-main/rakshanav-main/rakshanav/src/components/UserView.jsx';
let uvContent = fs.readFileSync(pathUserView, 'utf8');

uvContent = uvContent.replace(
  `const [routeAnalyses, setRouteAnalyses] = useState({})`,
  `const [routeAnalyses, setRouteAnalyses] = useState({})\n  const [routeFallbacks, setRouteFallbacks] = useState({})`
);

uvContent = uvContent.replace(
  `      // Trigger AI Analysis independently for each route
      setIsAiLoading(true);
      setRouteAnalyses({});`,
  `      // Trigger AI Analysis independently for each route
      setIsAiLoading(true);
      setRouteAnalyses({});
      setRouteFallbacks({});`
);

const oldAiMap = `      const analysisPromises = response.routes.map(async (r) => {
        try {
          console.log(\`Gemini Request: Analyzing route \${r.id}\`);
          const analysis = await geminiService.analyzeSingleRoute({
            source: fromShort,
            destination: toShort,
            type: r.type,
            distance: r.distance,
            duration: r.duration,
            safetyScore: r.score ?? 'Unknown',
            lighting: r.breakdown?.lighting !== undefined ? Math.round(r.breakdown.lighting) + '/100' : 'Unknown',
            hospitals: r.infrastructure?.hospitals ?? 'Unknown',
            police: r.infrastructure?.police ?? 'Unknown',
            commercial: r.infrastructure?.commercial ?? 'Unknown',
            communityReports: r.reports ?? 'Unknown',
            weather: r.weather && r.weather.isRaining ? 'Raining' : (r.weather && r.weather.isFoggy ? 'Foggy' : 'Clear')
          });
          console.log(\`Gemini Response [\${r.id}]: \${analysis}\`);
          return { id: r.id, analysis, success: true };
        } catch (e) {
          console.log(\`Gemini Request Failed [\${r.id}]: \${e.message}\`);
          return { id: r.id, analysis: "AI Analysis unavailable for this route.", success: false };
        }
      });

      Promise.all(analysisPromises).then(results => {
        const analysesMap = {};
        let geminiSuccessCount = 0;
        results.forEach(res => {
          analysesMap[res.id] = res.analysis;
          if (res.success) geminiSuccessCount++;
        });
        setRouteAnalyses(analysesMap);
        setDevDiagnostics(prev => ({ ...prev, gemini: geminiSuccessCount > 0 ? 'success' : 'error' }));
        setIsAiLoading(false);
        console.log(\`==================================================\\n\`);
      });`;

const newAiMap = `      const analysisPromises = response.routes.map(async (r) => {
        try {
          console.log(\`Gemini Request: Analyzing route \${r.id}\`);
          const aiRes = await geminiService.analyzeSingleRoute({
            source: fromShort,
            destination: toShort,
            type: r.type,
            distance: r.distance,
            duration: r.duration,
            safetyScore: r.score ?? 'Unknown',
            lighting: r.breakdown?.lighting !== undefined ? Math.round(r.breakdown.lighting) + '/100' : 'Unknown',
            hospitals: r.infrastructure?.hospitals ?? 'Unknown',
            police: r.infrastructure?.police ?? 'Unknown',
            commercial: r.infrastructure?.commercial ?? 'Unknown',
            communityReports: r.reports ?? 'Unknown',
            weather: r.weather && r.weather.isRaining ? 'Raining' : (r.weather && r.weather.isFoggy ? 'Foggy' : 'Clear')
          });
          console.log(\`Gemini Response [\${r.id}]: \${aiRes.analysis.substring(0,50)}... [Fallback: \${aiRes.isFallback}]\`);
          return { id: r.id, analysis: aiRes.analysis, isFallback: aiRes.isFallback, success: true };
        } catch (e) {
          console.log(\`Gemini Request Failed [\${r.id}]: \${e.message}\`);
          return { id: r.id, analysis: "AI Analysis temporarily unavailable.", isFallback: true, success: false };
        }
      });

      Promise.all(analysisPromises).then(results => {
        const analysesMap = {};
        const fallbackMap = {};
        let geminiSuccessCount = 0;
        results.forEach(res => {
          analysesMap[res.id] = res.analysis;
          fallbackMap[res.id] = res.isFallback;
          // Only count as success if it's NOT a fallback!
          if (res.success && !res.isFallback) geminiSuccessCount++;
        });
        setRouteAnalyses(analysesMap);
        setRouteFallbacks(fallbackMap);
        setDevDiagnostics(prev => ({ ...prev, gemini: geminiSuccessCount > 0 ? 'success' : 'error' }));
        setIsAiLoading(false);
        console.log(\`==================================================\\n\`);
      });`;

uvContent = uvContent.replace(oldAiMap, newAiMap);

// Also update RouteCard to show if it's a fallback
const oldRouteCardProp = `function RouteCard({ data, darkMode, sub, card, txt, color, routeAnalyses, onStart }) {`;
const newRouteCardProp = `function RouteCard({ data, darkMode, sub, card, txt, color, routeAnalyses, routeFallbacks, onStart }) {`;
uvContent = uvContent.replace(oldRouteCardProp, newRouteCardProp);

const oldRouteCardUse = `<RouteCard key={r.id} data={r} darkMode={darkMode} sub={sub} card={card} txt={txt} color={getRouteColor(r.type)} routeAnalyses={routeAnalyses} onStart={() => handleStartNavigation(r)} />`;
const newRouteCardUse = `<RouteCard key={r.id} data={r} darkMode={darkMode} sub={sub} card={card} txt={txt} color={getRouteColor(r.type)} routeAnalyses={routeAnalyses} routeFallbacks={routeFallbacks} onStart={() => handleStartNavigation(r)} />`;
uvContent = uvContent.replaceAll(oldRouteCardUse, newRouteCardUse); // Could be two places

const oldAnalysisRender = `      <div style={{ fontSize: '12px', color: sub, marginBottom: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '14px' }}>✨</span> AI Safety Analysis:
      </div>
      <div style={{ padding: '10px 12px', background: 'rgba(15,23,42,0.4)', borderRadius: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.9)', lineHeight: 1.5, marginBottom: '16px', borderLeft: '2px solid #60a5fa' }}>
        {routeAnalyses[data.id] ? (
          routeAnalyses[data.id]
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid rgba(96,165,250,0.3)', borderTopColor: '#60a5fa', animation: 'spin 1s linear infinite' }} />
             <span style={{ color: sub }}>Analyzing...</span>
          </div>
        )}
      </div>`;

const newAnalysisRender = `      <div style={{ fontSize: '12px', color: sub, marginBottom: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '14px' }}>✨</span> {routeFallbacks && routeFallbacks[data.id] ? 'Deterministic Safety Summary:' : 'AI Safety Analysis:'}
      </div>
      <div style={{ padding: '10px 12px', background: 'rgba(15,23,42,0.4)', borderRadius: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.9)', lineHeight: 1.5, marginBottom: '16px', borderLeft: \`2px solid \${routeFallbacks && routeFallbacks[data.id] ? '#94a3b8' : '#60a5fa'}\` }}>
        {routeAnalyses[data.id] ? (
          routeAnalyses[data.id]
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid rgba(96,165,250,0.3)', borderTopColor: '#60a5fa', animation: 'spin 1s linear infinite' }} />
             <span style={{ color: sub }}>Analyzing...</span>
          </div>
        )}
      </div>`;
uvContent = uvContent.replace(oldAnalysisRender, newAnalysisRender);

fs.writeFileSync(pathUserView, uvContent, 'utf8');
console.log('Patched UserView.jsx');
