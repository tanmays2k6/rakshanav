const routeFeatureService = require('./server/services/routeFeatureService');

const polylineCoords = [
  [77.5946, 12.9716],
  [77.5956, 12.9726],
  [77.5966, 12.9736]
];

async function run() {
  try {
    const res = await routeFeatureService.extractFeaturesForPolyline(polylineCoords);
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error(err);
  }
}

run();
