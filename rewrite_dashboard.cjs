const fs = require('fs');
const path = 'e:/rakshanav-main/rakshanav-main/rakshanav/src/pages/CitizenDashboard.jsx';

let content = fs.readFileSync(path, 'utf8');

// I will find the exact bounds of the return block and replace it.
const startOfReturn = content.indexOf('return (');
const endOfReturn = content.indexOf('// ─── Subcomponents ────────────');

// We will construct the JSX precisely without string hacking to avoid mismatched tags.
const correctReturnBlock = `return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-[1800px] mx-auto p-6"
    >
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
        
        {/* ── LeftContent ── */}
        <div className="flex flex-col gap-6 min-w-0 w-auto">
          
          {/* KPI Cards (4 cols) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard 
              title="Live Safety Score" 
              value={safetyMetrics ? \`\${safetyMetrics.score}/100\` : 'N/A'}
              subtitle={safetyMetrics ? safetyMetrics.riskCategory : 'Awaiting data'}
              icon={<ShieldCheck className="w-[18px] h-[18px] text-brand-neonGreen" />} 
              trend="Live"
              glow="rgba(34,197,94,0.15)"
              loading={loading}
              isScore={true}
              scoreValue={safetyMetrics?.score || 0}
            />
            <KpiCard 
              title="Current Location" 
              value={addressData ? (addressData.address.suburb || addressData.address.city_district || 'Unknown') : 'N/A'}
              subtitle={liveLocation ? \`Accuracy: ±\${Math.round(liveLocation.accuracy)}m\` : 'Waiting for GPS'}
              icon={<MapPin className="w-[18px] h-[18px] text-brand-blue" />} 
              trend="GPS"
              glow="rgba(59,130,246,0.15)"
              loading={loading}
              actionIcon={<RefreshCw className={\`w-3 h-3 \${loading ? 'animate-spin' : ''}\`} />}
              onAction={fetchLiveData}
            />
            <KpiCard 
              title="Nearest Safe Haven" 
              value={nearestHaven ? nearestHaven.name : 'No haven < 5km'}
              subtitle={nearestHaven ? nearestHaven.type : 'N/A'}
              icon={<Activity className="w-[18px] h-[18px] text-brand-orange" />} 
              trend="OSM"
              glow="rgba(249,115,22,0.15)"
              loading={loading}
              actionIcon={nearestHaven && <Navigation className="w-3 h-3" />}
            />
            <KpiCard 
              title="Today's Activity" 
              value={tripsCount > 0 ? \`\${tripsCount} Trips\` : 'No trips yet'}
              subtitle={\`\${reports.length} Reports\`}
              icon={<Star className="w-[18px] h-[18px] text-yellow-400" />} 
              trend="Live DB"
              glow="rgba(250,204,21,0.15)"
              loading={loading}
            />
          </div>

          {/* Live Safety Map */}
          <div className="glass-panel relative overflow-hidden group min-h-[700px] h-[700px] w-full flex flex-col shadow-2xl ring-1 ring-white/5">
            <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start pointer-events-none">
              <div className="glass-panel px-4 py-2 flex items-center gap-3 pointer-events-auto bg-black/40 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <Radio className={\`w-4 h-4 \${loading ? 'text-yellow-400 animate-pulse' : 'text-brand-neonGreen'}\`} />
                  <span className="text-[13px] font-bold font-display tracking-wide text-white">
                    {loading ? 'Acquiring Signal...' : 'Live Safety Map'}
                  </span>
                </div>
                <div className="w-px h-4 bg-white/20 mx-1"></div>
                <div className="flex gap-2">
                  <MapToggle active={showTraffic} onClick={() => setShowTraffic(!showTraffic)} label="Traffic" />
                  <MapToggle active={showCommunity} onClick={() => setShowCommunity(!showCommunity)} label="Community" />
                  <MapToggle active={showStreetlights} onClick={() => setShowStreetlights(!showStreetlights)} label="Lights" />
                </div>
              </div>
              <div className="flex flex-col gap-2 pointer-events-auto">
                <MapBtn icon={<LocateFixed />} onClick={fetchLiveData} loading={loading} />
                <MapBtn icon={<Maximize />} />
                <MapBtn icon={<Layers />} />
              </div>
            </div>
            
            <div className="absolute inset-0 z-0 bg-gray-900/80 flex items-center justify-center">
              {errorMsg ? (
                 <div className="text-red-400 font-mono text-[13px] bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20">{errorMsg}</div>
              ) : (
                 <UserView onAddReport={handleAddReport} userReports={reports} isDashboard={true} liveLocation={liveLocation} />
              )}
            </div>
            
            <Link 
              to="/dashboard/navigation"
              className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 glass-panel px-6 py-2.5 flex items-center gap-2 hover:bg-white/10 transition-all text-[13px] font-semibold text-white group shadow-xl bg-black/50"
            >
              <Map className="w-4 h-4 text-brand-blue group-hover:scale-110 transition-transform" />
              Open Full Navigation
            </Link>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="text-2xl font-bold font-display mb-6 flex items-center gap-3 text-white">
              <Zap className="w-6 h-6 text-brand-orange" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <ActionCard title="Start Safe Navigation" icon={<Navigation2 />} to="/dashboard/navigation" color="blue" />
              <ActionCard title="AI Route Analysis" icon={<Bot />} to="/dashboard/ai" color="purple" />
              <ActionCard title="Report Hazard" icon={<AlertTriangle />} to="/dashboard/report" color="red" />
              <ActionCard title="Live Tracking" icon={<Activity />} to="/dashboard/tracking" color="green" />
            </div>
          </div>

        </div>

        {/* ── RightSidebar ── */}
        <div className="flex flex-col gap-6 xl:sticky xl:top-6 w-full xl:w-[380px] xl:min-w-[340px] xl:max-w-[420px]">
          
          {/* Card 1: Live Safety Rating */}
          <div className="glass-panel p-6 relative overflow-hidden flex flex-col gap-4 shadow-xl border-t-[3px] border-t-brand-neonGreen">
            <div className="absolute -right-16 -top-16 w-48 h-48 bg-brand-neonGreen/10 blur-[50px] rounded-full pointer-events-none"></div>
            
            <h3 className="text-[12px] font-mono text-gray-400 flex justify-between items-center uppercase tracking-widest">
              OVERALL SAFETY RATING
              <span className={\`w-2 h-2 rounded-full \${loading ? 'bg-yellow-400' : 'bg-brand-neonGreen'} animate-pulse\`}></span>
            </h3>
            
            {loading ? (
               <Skeleton className="w-full h-32 rounded-full" />
            ) : (
               <div className="flex flex-col items-center justify-center my-2">
                 <div className="relative w-32 h-32 flex items-center justify-center">
                   <svg className="w-full h-full transform -rotate-90">
                     <circle cx="64" cy="64" r="56" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="none" />
                     <motion.circle 
                       cx="64" cy="64" r="56" 
                       stroke="currentColor" 
                       strokeWidth="8" 
                       fill="none" 
                       strokeDasharray="351" 
                       initial={{ strokeDashoffset: 351 }}
                       animate={{ strokeDashoffset: 351 - (351 * (safetyMetrics?.score || 0)) / 100 }}
                       transition={{ duration: 1.5, ease: "easeOut" }}
                       className="text-brand-neonGreen"
                     />
                   </svg>
                   <div className="absolute flex flex-col items-center justify-center">
                     <span className="text-4xl font-display font-bold text-white leading-none">
                       {Math.round((safetyMetrics?.score || 0) / 10)}<span className="text-lg text-gray-500">.{(safetyMetrics?.score || 0) % 10}</span>
                     </span>
                   </div>
                 </div>
               </div>
            )}

            <div className="space-y-2 mt-2">
              <SafetyMetric label="Environment" value={safetyMetrics ? \`\${Math.round(safetyMetrics.breakdown.emergency)}/100\` : 'N/A'} color="text-brand-neonGreen" />
              <SafetyMetric label="Lighting" value={safetyMetrics ? \`\${Math.round(safetyMetrics.breakdown.lighting)}/100\` : 'N/A'} color="text-brand-blue" />
              <SafetyMetric label="Community Alerts" value={nearbyAlerts.length} color="text-brand-orange" />
              <SafetyMetric label="Weather" value={weatherData ? 'Clear' : 'N/A'} color="text-brand-blue" />
              <SafetyMetric label="Confidence" value={safetyMetrics ? \`\${safetyMetrics.confidence}%\` : 'N/A'} color="text-yellow-400" />
              <SafetyMetric label="Last Updated" value="Just now" color="text-gray-400" />
            </div>
          </div>

          {/* Card 2: Nearby Alerts */}
          <div className="glass-panel p-6 flex flex-col gap-4 shadow-xl">
            <h3 className="text-[13px] font-mono text-gray-400 flex items-center gap-2 uppercase tracking-widest">
              <AlertTriangle className="w-3.5 h-3.5 text-brand-orange" />
              NEARBY ALERTS
            </h3>
            
            <div className="flex flex-col gap-3">
              {loading ? (
                [1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)
              ) : nearbyAlerts.length > 0 ? (
                nearbyAlerts.map(alert => (
                  <div key={alert.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                     <div>
                       <h4 className="text-[13px] font-semibold text-white group-hover:text-brand-orange transition-colors capitalize">{alert.category || 'Hazard'}</h4>
                       <p className="text-[11px] text-gray-400 mt-0.5 capitalize">{alert.severity} • {new Date(alert.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • Near you</p>
                     </div>
                     <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                  </div>
                ))
              ) : (
                <div className="text-[13px] text-gray-400 py-4 text-center bg-white/5 rounded-xl border border-white/5">
                  No active alerts within 5km.
                </div>
              )}
            </div>
          </div>

          {/* Card 3: AI Safety Insights */}
          <div className="glass-panel p-6 flex-1 flex flex-col gap-4 shadow-xl border border-brand-purple/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-[40px] rounded-full pointer-events-none"></div>
            
            <h3 className="text-[13px] font-mono text-[#a855f7] flex items-center gap-2 uppercase tracking-widest z-10">
              <Bot className="w-4 h-4" />
              AI INSIGHTS
            </h3>
            
            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2 z-10">
              {loading ? (
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : safetyMetrics && safetyMetrics.explanation ? (
                Object.values(safetyMetrics.explanation).filter(v=>v).slice(0, 4).map((insight, idx) => (
                  <div key={idx} className="bg-[#a855f7]/10 p-3.5 rounded-xl border border-[#a855f7]/20 text-[13px] text-gray-200 leading-relaxed shadow-sm">
                    {insight}
                  </div>
                ))
              ) : (
                <div className="text-[13px] text-gray-400 py-4 text-center bg-white/5 rounded-xl border border-white/5">
                  Waiting for sufficient data to generate AI insights.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </motion.div>
  );
}

//`;

let newContent = content.substring(0, startOfReturn) + correctReturnBlock + content.substring(endOfReturn + 2);
fs.writeFileSync(path, newContent, 'utf8');
console.log('Restructured CitizenDashboard without string hacking.');
