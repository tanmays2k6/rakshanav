const fs = require('fs');

const path = 'e:/rakshanav-main/rakshanav-main/rakshanav/src/pages/CitizenDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Grid
content = content.replace('className="col-span-12 xl:col-span-8 flex flex-col gap-6"', 'className="col-span-12 xl:col-span-9 flex flex-col gap-6"');
content = content.replace('className="col-span-12 xl:col-span-4 flex flex-col gap-6 h-full"', 'className="col-span-12 xl:col-span-3 flex flex-col gap-6 h-full"');

// 2. Map Container
content = content.replace('h-[600px]', 'h-[700px]');

// 3. KpiCard Overhaul
const newKpiCard = `  return (
    <div className="glass-panel p-6 hover-lift flex flex-col gap-3 h-[180px] relative group overflow-hidden justify-between">
      <div 
        className="absolute -right-8 -top-8 w-32 h-32 rounded-full blur-[40px] opacity-30 group-hover:opacity-50 transition-opacity"
        style={{ backgroundColor: glow }}
      ></div>
      
      <div className="z-10 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/5 rounded-[12px] border border-white/10 shadow-inner backdrop-blur-md">
            {icon}
          </div>
          <h4 className="text-[13px] text-gray-300 font-medium tracking-wide capitalize">{title}</h4>
        </div>
        
        {loading ? (
           <Skeleton className="h-8 w-24 mt-2" />
        ) : (
           <div className="flex items-center gap-3 mt-1">
             {isScore && (
               <div className="relative w-8 h-8 shrink-0">
                 <svg className="w-full h-full transform -rotate-90">
                   <circle cx="16" cy="16" r="14" stroke="rgba(255,255,255,0.1)" strokeWidth="3" fill="none" />
                   <circle cx="16" cy="16" r="14" stroke="#22c55e" strokeWidth="3" fill="none" strokeDasharray="88" strokeDashoffset={88 - (88 * scoreValue) / 100} />
                 </svg>
               </div>
             )}
             <div className="text-[20px] font-display font-bold text-white tracking-tight leading-none whitespace-normal break-words" style={{ fontSize: value.toString().length > 15 ? '16px' : '22px' }}>{value}</div>
           </div>
        )}
        <div className="text-[12px] text-gray-400 whitespace-normal break-words">{subtitle}</div>
      </div>

      <div className="flex justify-between items-end z-10">
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-mono text-brand-blue bg-brand-blue/10 px-2 py-1 rounded-[6px] border border-brand-blue/20 tracking-wider uppercase flex items-center gap-1.5">
             <span className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse"></span>
             {trend}
           </span>
        </div>
        {actionIcon && (
          <button onClick={onAction} className="p-2 bg-white/5 hover:bg-white/10 rounded-[12px] transition-colors text-gray-400 hover:text-white border border-white/5">
            {actionIcon}
          </button>
        )}
      </div>
    </div>
  );`;

// Regex replacement
content = content.replace(/return \(\s*<div className="glass-panel p-6 hover-lift[\s\S]*?\);\n}/, newKpiCard + '\n}');

fs.writeFileSync(path, content, 'utf8');
console.log('Patched CitizenDashboard.jsx successfully.');
