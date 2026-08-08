const fs = require('fs');

const path = 'e:/rakshanav-main/rakshanav-main/rakshanav/src/pages/citizen/Emergency.jsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  `        if (res.success) {
          setActiveSosEvent(res.data);
          setShareToken(res.shareToken);
        } else {
          showToast('Failed to trigger SOS on server. Please call emergency services manually.', 'error');
        }`,
  `        if (res.success) {
          setActiveSosEvent(res.data);
          setShareToken(res.shareToken);
        } else {
          if (process.env.NODE_ENV === 'development') {
             console.error("SOS Trigger Failed Details:", res.fullError || res.error);
             const details = res.fullError?.details || res.fullError?.message || res.error;
             showToast(\`SOS Failed: \${details}\`, 'error');
          } else {
             showToast(res.error || 'Failed to trigger SOS on server. Please call emergency services manually.', 'error');
          }
        }`
);

fs.writeFileSync(path, c, 'utf8');
console.log('Patched Emergency.jsx');
