const fs = require('fs');

const pathGeminiService = 'e:/rakshanav-main/rakshanav-main/rakshanav/server/services/geminiService.js';
const pathUseGemini = 'e:/rakshanav-main/rakshanav-main/rakshanav/src/hooks/useGemini.js';
const pathNotifications = 'e:/rakshanav-main/rakshanav-main/rakshanav/src/pages/citizen/Notifications.jsx';

// 1. Patch geminiService.js
let geminiServiceContent = fs.readFileSync(pathGeminiService, 'utf8');
geminiServiceContent = geminiServiceContent.replace(
  'target="/dashboard/navigate"',
  'target="/dashboard/navigation"'
);
fs.writeFileSync(pathGeminiService, geminiServiceContent, 'utf8');
console.log('Patched geminiService.js');

// 2. Patch useGemini.js
let useGeminiContent = fs.readFileSync(pathUseGemini, 'utf8');
useGeminiContent = useGeminiContent.replace(
  'target="/dashboard/navigate"',
  'target="/dashboard/navigation"'
);
fs.writeFileSync(pathUseGemini, useGeminiContent, 'utf8');
console.log('Patched useGemini.js');

// 3. Patch Notifications.jsx
let notificationsContent = fs.readFileSync(pathNotifications, 'utf8');
notificationsContent = notificationsContent.replace(
  "navigate('/dashboard/navigate');",
  "navigate('/dashboard/navigation');"
);
fs.writeFileSync(pathNotifications, notificationsContent, 'utf8');
console.log('Patched Notifications.jsx');
