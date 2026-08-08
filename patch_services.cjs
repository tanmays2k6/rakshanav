const fs = require('fs');

// 1. Patch liveTrackingService.js
const livePath = 'e:/rakshanav-main/rakshanav-main/rakshanav/src/services/liveTrackingService.js';
let liveContent = fs.readFileSync(livePath, 'utf8');

liveContent = liveContent.replace(
  `if (error) {
      console.error('Failed to create live session:', error);
      return { success: false, error: error.message };
    }`,
  `if (error) {
      if (process.env.NODE_ENV === 'development') console.error('Failed to create live session:', error);
      return { success: false, error: error.message, fullError: error };
    }`
);

fs.writeFileSync(livePath, liveContent, 'utf8');


// 2. Patch emergencyService.js
const emergPath = 'e:/rakshanav-main/rakshanav-main/rakshanav/src/services/emergencyService.js';
let emergContent = fs.readFileSync(emergPath, 'utf8');

emergContent = emergContent.replace(
  `if (error) {
      console.error('Error creating SOS event:', error);
      // Clean up the live session if SOS record failed? (Optional but good practice)
      if (sessionId) await liveTrackingService.stopSession();
      return { success: false, error: error.message };
    }`,
  `if (error) {
      if (process.env.NODE_ENV === 'development') console.error('Error creating SOS event:', error);
      // Clean up the live session if SOS record failed? (Optional but good practice)
      if (sessionId) await liveTrackingService.stopSession();
      return { success: false, error: error.message, fullError: error };
    }`
);

emergContent = emergContent.replace(
  `if (error) {
      console.error('Error resolving SOS:', error);
      return { success: false, error: error.message };
    }`,
  `if (error) {
      if (process.env.NODE_ENV === 'development') console.error('Error resolving SOS:', error);
      return { success: false, error: error.message, fullError: error };
    }`
);

fs.writeFileSync(emergPath, emergContent, 'utf8');
console.log('Patched service files.');
