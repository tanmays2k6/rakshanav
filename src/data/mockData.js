// Mock Data Service for RakshaNav Dashboard



export const mockKPIs = {
  currentLocation: {
    lat: 12.923,
    lng: 77.617,
    area: 'Koramangala, Bengaluru',
    accuracy: '± 4m',
    status: 'Excellent'
  },
  nearestSafeHaven: {
    type: 'Police Station',
    name: 'Koramangala Police Station',
    distance: '800m',
    etaWalking: '10 mins',
    lat: 12.925,
    lng: 77.620
  },
  activity: {
    trips: 3,
    reports: 1,
    score: '+15'
  }
};

export const mockLiveSafety = {
  rating: 8.5,
  environmentRating: 'Safe',
  lighting: 'Good (24 lux)',
  crowdDensity: 'Moderate',
  historicalRisk: 'Low',
  weather: 'Clear, 24°C',
  estimatedRisk: 'Minimal'
};

export const mockTrips = [
  {
    id: 't1',
    source: 'Tech Park, Whitefield',
    destination: 'Home, Koramangala',
    distance: '14 km',
    duration: '45 mins',
    safetyScore: 92,
    routeType: 'Preferred Safe Route',
    date: 'Today, 6:30 PM',
    status: 'completed'
  },
  {
    id: 't2',
    source: 'Home, Koramangala',
    destination: 'Cafe Coffee Day, Indiranagar',
    distance: '5 km',
    duration: '15 mins',
    safetyScore: 88,
    routeType: 'Standard Route',
    date: 'Yesterday, 8:00 PM',
    status: 'completed'
  },
  {
    id: 't3',
    source: 'MG Road Metro',
    destination: 'Commercial Street',
    distance: '2 km',
    duration: '10 mins',
    safetyScore: 75,
    routeType: 'Diverted due to poor lighting',
    date: '03 Aug, 9:15 PM',
    status: 'completed'
  }
];


export const mockReports = [
  { id: 'r1', type: 'Broken Streetlight', status: 'resolved', submittedTime: '2 days ago', location: '100ft Road, Indiranagar', timeline: [{ status: 'Submitted', date: '03 Aug' }, { status: 'Verified', date: '04 Aug' }, { status: 'Resolved by BBMP', date: '05 Aug' }] },
  { id: 'r2', type: 'Suspicious Activity', status: 'verified', submittedTime: '5 hours ago', location: 'Silk Board Junction', timeline: [{ status: 'Submitted', date: 'Today' }, { status: 'Police Dispatched', date: 'Today' }] },
  { id: 'r3', type: 'Road Damage', status: 'pending', submittedTime: 'Yesterday', location: 'HSR Layout Sector 2', timeline: [{ status: 'Submitted', date: 'Yesterday' }] }
];

export const mockNotifications = [
  { id: 'n1', title: 'Report Resolved', message: 'The BBMP has fixed the broken streetlight you reported.', time: '2 hours ago', type: 'success' },
  { id: 'n2', title: 'Safer Route Available', message: 'A safer route is available for your commute home due to recent incidents on your usual path.', time: '5 hours ago', type: 'alert' },
  { id: 'n3', title: 'Weather Alert', message: 'Heavy rainfall expected in your area in the next hour.', time: '1 day ago', type: 'warning' }
];


export const mockAiInsights = [
  "Crime rate in your destination area has dropped by 12% this month.",
  "Current route has 95% functional streetlights.",
  "Unusually high crowd density near MG Road, expecting delays."
];
