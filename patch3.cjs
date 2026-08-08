const fs = require('fs');

const path = 'e:/rakshanav-main/rakshanav-main/rakshanav/src/components/UserView.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Reduce Route Engine Width
content = content.replace("width: '380px'", "width: 'min(340px, 30vw)'");
content = content.replace("width: '380px'", "width: 'min(340px, 30vw)'"); // Just in case there are multiple

// 2. Adjust inputs for perfect alignment
const oldInputs = `<div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>`;
const newInputs = `<div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>`;
content = content.replace(oldInputs, newInputs);

const swapBtnOld = `<div style={{ position: 'absolute', right: '-12px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>`;
const swapBtnNew = `<div style={{ position: 'absolute', right: '-16px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>`;
content = content.replace(swapBtnOld, swapBtnNew);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched UserView successfully.');
