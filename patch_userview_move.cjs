const fs = require('fs');
const path = 'e:/rakshanav-main/rakshanav-main/rakshanav/src/components/UserView.jsx';
let c = fs.readFileSync(path, 'utf8');

const autoTriggerBlock = `  // ── Auto-Trigger from Gemini AI Navigation ────────────────────────────────
  const hasAutoTriggered = useRef(false);
  useEffect(() => {
    // Only run if autoTrigger is requested and hasn't been triggered yet
    if (autoTrigger && !hasAutoTriggered.current && (initialOrigin || initialDestination)) {
      hasAutoTriggered.current = true;
      
      // Wait for map to settle
      setTimeout(() => {
        let actualFrom = initialOrigin;
        let actualTo = initialDestination;
        let gpsActive = false;

        // "Current Location" mapping
        if (initialOrigin.toLowerCase() === 'current location') {
           gpsActive = true;
           actualFrom = '';
        }

        setFromVal(actualFrom);
        setToVal(actualTo);
        setUseGps(gpsActive);

        // Safely invoke handleSearch if destination exists
        if (actualTo) {
          handleSearch(actualFrom, actualTo, gpsActive).catch(err => {
            console.error('[UserView] Auto-trigger search failed:', err);
            // Error is already caught by handleSearch, but we catch here just in case.
          });
        }
      }, 800);
    }
  }, [autoTrigger, initialOrigin, initialDestination, handleSearch]);
`;

// Remove from old location
const regexToRemove = /\s*\/\/\s*──\s*Auto-Trigger from Gemini AI Navigation\s*────────────────────────────────[\s\S]*?\}, \[autoTrigger, initialOrigin, initialDestination, handleSearch\]\);/;
c = c.replace(regexToRemove, '');

// Insert after handleSearch finishes
const searchTarget = "  }, [fromVal, toVal, useGps, currentCoords, fromOpt, toOpt])";
c = c.replace(searchTarget, searchTarget + '\n\n' + autoTriggerBlock);

fs.writeFileSync(path, c, 'utf8');
console.log('Moved useEffect successfully');
