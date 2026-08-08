const fs = require('fs');
const path = 'e:/rakshanav-main/rakshanav-main/rakshanav/src/pages/CitizenDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

const startOfReturn = content.indexOf('return (');
const endOfReturn = content.indexOf('// ─── Subcomponents ────────────'); 

let returnBlock = content.substring(startOfReturn, endOfReturn);

const kpiStart = returnBlock.indexOf('{/* KPI Cards (4 cols) */}');
const mapStart = returnBlock.indexOf('{/* Live Safety Map - Made taller and more central */}');
const qaStart = returnBlock.indexOf('{/* Quick Actions (2x2 Grid) */}');
const rightPanelStart = returnBlock.indexOf('{/* ── RIGHT PANEL');

const kpiHtml = returnBlock.substring(kpiStart, mapStart);
const mapHtml = returnBlock.substring(mapStart, qaStart);
const qaHtml = returnBlock.substring(qaStart, rightPanelStart);

const card1Start = returnBlock.indexOf('{/* Card 1: Live Safety Rating');
const card2Start = returnBlock.indexOf('{/* Card 2: Nearby Alerts */}');
const card3Start = returnBlock.indexOf('{/* Card 3: AI Safety Insights */}');
const lastDivIndex = returnBlock.lastIndexOf('</div>');
const insightsEndIndex = returnBlock.lastIndexOf('</div>', lastDivIndex - 1);

const ratingHtml = returnBlock.substring(card1Start, card2Start);
const alertsHtml = returnBlock.substring(card2Start, card3Start);
const insightsHtml = returnBlock.substring(card3Start, insightsEndIndex);

let fixedMapHtml = mapHtml.replace('min-h-[650px] h-[700px]', 'min-h-[700px] h-[700px]');

const newReturnBlock = `return (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className="w-full max-w-[1800px] mx-auto p-6"
  >
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
      
      {/* ── LeftContent ── */}
      <div className="flex flex-col gap-6 min-w-0 w-auto">
${kpiHtml}
${fixedMapHtml}
${qaHtml}
      </div>

      {/* ── RightSidebar ── */}
      <div className="flex flex-col gap-6 xl:sticky xl:top-6 w-full xl:w-[380px] xl:min-w-[340px] xl:max-w-[420px]">
${ratingHtml}
${alertsHtml}
${insightsHtml}
      </div>

    </div>
  </motion.div>
);\n\n`;

const newContent = content.substring(0, startOfReturn) + newReturnBlock + content.substring(endOfReturn);
fs.writeFileSync(path, newContent, 'utf8');
console.log('Successfully refactored CitizenDashboard layout.');
