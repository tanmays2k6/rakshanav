const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('\n======================================================');
console.log('🛡️  RAKSHANAV AUTOMATED SECURITY & SECRET AUDIT TEST');
console.log('======================================================\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition, name, details = '') {
  if (condition) {
    console.log(`✅ [PASS] ${name}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${name} ${details ? `(${details})` : ''}`);
    failedTests++;
  }
}

async function runTests() {
  // Test 1: Scan dist bundle for GEMINI_API_KEY and service_role secrets
  console.log('--- Test Suite 1: Client Bundle & Secret Leakage Scan ---');
  const distPath = path.resolve(__dirname, 'dist');
  let bundleLeaked = false;
  let sourceMapFound = false;

  if (fs.existsSync(distPath)) {
    const walk = (dir) => {
      const files = fs.readdirSync(dir);
      for (const f of files) {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) {
          walk(full);
        } else {
          if (f.endsWith('.map')) {
            sourceMapFound = true;
          }
          const content = fs.readFileSync(full, 'utf8');
          // Scan dynamically for configured server secret values if present
          const currentKey = process.env.GEMINI_API_KEY;
          if (currentKey && currentKey.length > 10 && content.includes(currentKey)) {
            bundleLeaked = true;
          }
          if (content.includes('service_role') && content.includes('eyJhbGciOi')) {
            bundleLeaked = true;
          }
        }
      }
    };
    walk(distPath);
  }
  
  assert(!bundleLeaked, 'Client bundle is free of privileged GEMINI & Service-Role secrets');
  assert(!sourceMapFound, 'Production build has source maps disabled (.map files absent)');

  // Test 2: Gitignore exclusions
  console.log('\n--- Test Suite 2: Repository Git Exclusions Scan ---');
  const gitignore = fs.readFileSync(path.resolve(__dirname, '.gitignore'), 'utf8');
  assert(gitignore.includes('.env'), '.gitignore excludes .env files');
  assert(gitignore.includes('*.pem') || gitignore.includes('*.key'), '.gitignore excludes private certificate/key files');

  // Test 3: Backend Security Middleware & Headers
  console.log('\n--- Test Suite 3: Backend Security Middleware & Response Headers ---');
  const app = require('./server/index');
  const server = app.listen(3999, async () => {
    try {
      // Test GET /api/health for Helmet headers
      const healthRes = await fetch('http://localhost:3999/api/health');
      const headers = healthRes.headers;
      
      assert(healthRes.status === 200, 'GET /api/health responds with 200 OK');
      assert(headers.has('x-content-type-options'), 'Security header X-Content-Type-Options is present');
      assert(headers.has('x-frame-options'), 'Security header X-Frame-Options is present');
      assert(headers.has('content-security-policy'), 'Content-Security-Policy header is configured');

      // Test 4: Rate Limiting & Input Validation on AI Endpoints
      console.log('\n--- Test Suite 4: Input Validation & Sanitization ---');
      
      // Invalid input length (exceeds 2000 chars)
      const oversizedMessage = 'A'.repeat(2500);
      const invalidAiRes = await fetch('http://localhost:3999/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        body: JSON.stringify({ message: oversizedMessage })
      });
      const invalidAiJson = await invalidAiRes.json();
      assert(invalidAiRes.status === 400, 'AI chat rejects oversized prompt (>2000 chars) with 400 Bad Request');
      assert(invalidAiJson.error && invalidAiJson.error.includes('maximum allowable limit'), 'AI chat returns informative validation error message');

      // Invalid image MIME type
      const invalidImageRes = await fetch('http://localhost:3999/api/ai/analyze-hazard-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: 'fakebase64string', mimeType: 'application/x-msdownload' })
      });
      const invalidImageJson = await invalidImageRes.json();
      assert(invalidImageRes.status === 400, 'Image analysis rejects executable/invalid MIME types with 400');

      // Radius capping on /api/nearby
      const nearbyRes = await fetch('http://localhost:3999/api/nearby?lat=12.9716&lng=77.5946&radius=9999999');
      assert(nearbyRes.status === 200, 'Nearby API safely handles extreme radius without crashing');

      // Test 5: Route Boundary & Coordinate Validation
      const invalidRouteRes = await fetch('http://localhost:3999/api/route?startLat=999&startLng=999&endLat=12.9&endLng=77.5');
      assert(invalidRouteRes.status === 400, 'Route API rejects coordinates outside bounds with 400');

      // Summary
      console.log('\n======================================================');
      console.log(`🏁 TESTS COMPLETED: ${passedTests} Passed, ${failedTests} Failed`);
      console.log('======================================================\n');
      
      server.close(() => {
        process.exit(failedTests > 0 ? 1 : 0);
      });
    } catch (err) {
      console.error('Error during automated tests:', err);
      server.close(() => process.exit(1));
    }
  });
}

runTests();
