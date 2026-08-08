const fs = require('fs');

const path = 'e:/rakshanav-main/rakshanav-main/rakshanav/src/pages/CitizenDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Parent Wrapper Layout
content = content.replace(
  'className="grid grid-cols-12 gap-6 h-full"',
  'className="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(340px,1fr)] gap-6 items-start max-w-[1800px] mx-auto w-full"'
);

// 2. Left Column Layout (remove col-span)
content = content.replace(
  'className="col-span-12 xl:col-span-9 flex flex-col gap-6"',
  'className="flex flex-col gap-6"'
);

// 3. Right Sidebar Layout (remove col-span, add sticky top-6)
content = content.replace(
  'className="col-span-12 xl:col-span-3 flex flex-col gap-6 h-full"',
  'className="flex flex-col gap-6 sticky top-0"'
);

// 4. Map Container minimum height
content = content.replace(
  'h-[700px]',
  'min-h-[650px] h-[700px] w-full'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched CitizenDashboard layout successfully.');
