const fs = require('fs');
const pathFeature = 'e:/rakshanav-main/rakshanav-main/rakshanav/server/services/routeFeatureService.js';
const pathSafety = 'e:/rakshanav-main/rakshanav-main/rakshanav/server/services/SafetyEngine.js';

// --- Fix routeFeatureService.js ---
let fContent = fs.readFileSync(pathFeature, 'utf8');

// Replace getZeroInfrastructure with getNullInfrastructure
const zeroRegex = /const getZeroInfrastructure = \(\) => \(\{[\s\S]*?\}\);/;
const getNullInfrastructure = `const getNullInfrastructure = () => ({
  police: null,
  hospitals: null,
  metro: null,
  commercial: null,
  busStops: null,
  pharmacies: null,
  fireStations: null,
  petrolPumps: null,
  trafficSignals: null,
  schools: null,
  banks: null,
  highwayTags: []
});`;
fContent = fContent.replace(zeroRegex, getNullInfrastructure);

// Replace usages
fContent = fContent.replace(/let infrastructure = getZeroInfrastructure\(\);/g, 'let infrastructure = getNullInfrastructure();');
fContent = fContent.replace(/const fallback = getZeroInfrastructure\(\);/g, 'const fallback = null;');

// Change the counter defaults to 0 internally so math works if data is present
const processNodesRegex = /\/\/ Process nodes \([\s\S]*?\}\);/;
const newProcessNodes = `// Process nodes
    infrastructure = {
      police: 0, hospitals: 0, metro: 0, commercial: 0,
      busStops: 0, pharmacies: 0, fireStations: 0, petrolPumps: 0,
      trafficSignals: 0, schools: 0, banks: 0, highwayTags: []
    };

    data.elements.forEach(el => {
      const tags = el.tags || {};
      const am = tags.amenity;
      
      if (am === 'police') infrastructure.police++;
      else if (am === 'hospital' || am === 'clinic') infrastructure.hospitals++;
      else if (am === 'bus_station') infrastructure.busStops++;
      else if (am === 'fire_station') infrastructure.fireStations++;
      else if (am === 'fuel') infrastructure.petrolPumps++;
      else if (am === 'bank' || am === 'atm') infrastructure.banks++;
      else if (am === 'school' || am === 'college' || am === 'university') infrastructure.schools++;
      else if (tags.railway === 'station') infrastructure.metro++;
      else if (tags.leisure === 'park') infrastructure.parks++;
      else if (tags.highway === 'traffic_signals' || tags.highway === 'crossing') infrastructure.trafficSignals++;
      
      if (tags.shop || tags.landuse === 'commercial' || am === 'restaurant') {
        infrastructure.commercial++;
      }
      
      if (el.type === 'way' && tags.highway) {
        infrastructure.highwayTags.push(tags.highway);
      }
    });`;
fContent = fContent.replace(processNodesRegex, newProcessNodes);
fs.writeFileSync(pathFeature, fContent, 'utf8');
console.log('Patched routeFeatureService.js');

// --- Fix SafetyEngine.js ---
let sContent = fs.readFileSync(pathSafety, 'utf8');

// Replace calc routing logic to handle null properly
sContent = sContent.replace(/_calculateEmergencyScore\(infra\) \{[\s\S]*?\},/, 
`_calculateEmergencyScore(infra) {
    if (!infra || infra.police === null) return null;
    const police = infra.police || 0;
    const hospitals = infra.hospitals || 0;
    const pharmacies = infra.pharmacies || 0;
    let score = (police * 25) + (hospitals * 40) + (pharmacies * 10);
    return Math.min(100, score);
  },`);

sContent = sContent.replace(/_calculateLightingScore\(infra, isNightTime\) \{[\s\S]*?\},/, 
`_calculateLightingScore(infra, isNightTime) {
    if (!isNightTime) return 100;
    if (!infra || infra.commercial === null) return null;
    const commercial = infra.commercial || 0;
    let score = commercial * 10;
    return Math.max(10, Math.min(100, score)); 
  },`);

sContent = sContent.replace(/_calculateTransitScore\(infra\) \{[\s\S]*?\},/, 
`_calculateTransitScore(infra) {
    if (!infra || infra.metro === null) return null;
    const metro = infra.metro || 0;
    const signals = infra.trafficSignals || 0;
    const bus = infra.busStops || 0;
    let score = (metro * 20) + (bus * 5) + (signals * 2);
    return Math.min(100, score);
  },`);

sContent = sContent.replace(/_calculateIsolationScore\(infra, isNightTime\) \{[\s\S]*?\},/, 
`_calculateIsolationScore(infra, isNightTime) {
    if (!isNightTime) return 100; 
    if (!infra || infra.parks === null) return null;
    const parks = infra.parks || 0;
    const commercial = infra.commercial || 0;
    if (parks > 0 && commercial === 0) return 10; 
    if (parks > 0 && commercial > 0) return 60;   
    if (parks === 0 && commercial === 0) return 40; 
    return 100; 
  },`);

// Update calculateRouteSafety to handle null subscores
const calcRegex = /let score = 0;[\s\S]*?score = Math.max\(0, Math.min\(100, Math.round\(score\)\)\);/;
const newCalc = `let score = 0;
    let totalWeight = 0;
    
    const addScore = (val, weight) => {
       if (val !== null) {
          score += val * weight;
          totalWeight += weight;
       }
    };

    addScore(breakdown.emergency, WEIGHTS.emergency);
    addScore(breakdown.lighting, WEIGHTS.lighting);
    addScore(breakdown.community, WEIGHTS.community);
    addScore(breakdown.roadClass, WEIGHTS.roadClass);
    addScore(breakdown.transit, WEIGHTS.transit);
    addScore(breakdown.weather, WEIGHTS.weather);
    addScore(breakdown.isolation, WEIGHTS.isolation);
    addScore(breakdown.historical, WEIGHTS.historical);

    if (totalWeight === 0) {
       score = null;
    } else {
       score = score / totalWeight; // Normalize to available data
       score = Math.max(0, Math.min(100, Math.round(score)));
    }`;
sContent = sContent.replace(calcRegex, newCalc);

fs.writeFileSync(pathSafety, sContent, 'utf8');
console.log('Patched SafetyEngine.js');
