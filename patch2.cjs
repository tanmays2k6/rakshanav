const fs = require('fs');

const path = 'e:/rakshanav-main/rakshanav-main/rakshanav/src/pages/CitizenDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Overall Safety Rating metrics
const oldMetrics = `<div className="space-y-3 mt-2">
            <SafetyMetric label="Infrastructure" value={safetyMetrics ? \`\${Math.round(safetyMetrics.breakdown.emergency)}/100\` : 'N/A'} color="text-brand-neonGreen" />
            <SafetyMetric label="Lighting" value={safetyMetrics ? \`\${Math.round(safetyMetrics.breakdown.lighting)}/100\` : 'N/A'} color="text-brand-blue" />
            <SafetyMetric label="Confidence" value={safetyMetrics ? \`\${safetyMetrics.confidence}%\` : 'N/A'} color="text-yellow-400" />
          </div>`;
          
const newMetrics = `<div className="space-y-2 mt-2">
            <SafetyMetric label="Environment" value={safetyMetrics ? \`\${Math.round(safetyMetrics.breakdown.emergency)}/100\` : 'N/A'} color="text-brand-neonGreen" />
            <SafetyMetric label="Lighting" value={safetyMetrics ? \`\${Math.round(safetyMetrics.breakdown.lighting)}/100\` : 'N/A'} color="text-brand-blue" />
            <SafetyMetric label="Community Alerts" value={nearbyAlerts.length} color="text-brand-orange" />
            <SafetyMetric label="Weather" value={weatherData ? 'Clear' : 'N/A'} color="text-brand-blue" />
            <SafetyMetric label="Confidence" value={safetyMetrics ? \`\${safetyMetrics.confidence}%\` : 'N/A'} color="text-yellow-400" />
            <SafetyMetric label="Last Updated" value="Just now" color="text-gray-400" />
          </div>`;

content = content.replace(oldMetrics, newMetrics);

// 2. ActionCard rewrite
const oldActionCardRegex = /function ActionCard\(\{ title, icon, to, color \}\) \{[\s\S]*?\n\s+\);\n\}/;
const newActionCard = `function ActionCard({ title, icon, to, color }) {
  const colorMap = {
    blue: 'from-brand-blue/10 to-brand-blue/5 text-brand-blue border-brand-blue/20 hover:border-brand-blue/40 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]',
    purple: 'from-purple-500/10 to-purple-600/5 text-purple-400 border-purple-500/20 hover:border-purple-500/40 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]',
    red: 'from-brand-neonRed/10 to-brand-neonRed/5 text-brand-neonRed border-brand-neonRed/20 hover:border-brand-neonRed/40 hover:shadow-[0_0_20px_rgba(239,68,68,0.15)]',
    green: 'from-brand-neonGreen/10 to-emerald-600/5 text-brand-neonGreen border-brand-neonGreen/20 hover:border-brand-neonGreen/40 hover:shadow-[0_0_20px_rgba(34,197,94,0.15)]',
  };

  return (
    <Link 
      to={to}
      className={\`glass-panel p-6 flex flex-col items-center justify-center gap-4 text-center transition-all duration-300 hover-lift border \${colorMap[color]} bg-gradient-to-br h-36\`}
    >
      <div className="p-3 bg-white/5 rounded-2xl shadow-inner border border-white/5">
        {React.cloneElement(icon, { className: "w-8 h-8 drop-shadow-md" })}
      </div>
      <span className="text-[13px] font-semibold text-gray-200">{title}</span>
    </Link>
  );
}`;
content = content.replace(oldActionCardRegex, newActionCard);

// 3. Typography fix
content = content.replace('text-[30px] font-display font-bold mb-6 flex items-center gap-3 text-white', 'text-2xl font-bold font-display mb-6 flex items-center gap-3 text-white');
content = content.replace("text-[11px] text-gray-400 mt-0.5 capitalize\">{alert.severity} • {new Date(alert.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>",
"text-[11px] text-gray-400 mt-0.5 capitalize\">{alert.severity} • {new Date(alert.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • Near you</p>");

fs.writeFileSync(path, content, 'utf8');
console.log('Patched CitizenDashboard part 2 successfully.');
