import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Require server/package.json so Vercel includes it in the build, 
// which forces Node to treat the server folder as CommonJS.
require('../server/package.json'); 

const app = require('../server/index.js');

export default app;
