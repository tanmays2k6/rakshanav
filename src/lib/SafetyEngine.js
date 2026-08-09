/**
 * RakshaNav Safety Engine V2 (Frontend ESM)
 * Fully Data-Driven, Normalized Weighted Model
 */

const WEIGHTS = {
  emergency: 0.25,
  lighting: 0.20,
  community: 0.20,
  roadClass: 0.10,
  transit: 0.10,
  weather: 0.05,
  isolation: 0.05,
  historical: 0.05
};

const CONFIDENCE_WEIGHTS = {
  gps: 0.20,
  infrastructure: 0.25,
  weather: 0.10,
  reports: 0.20,
  routing: 0.15,
  ai: 0.10
};

export const SafetyEngine = {
  
  calculateRouteSafety(infrastructure, communityReports, weather, context, confidenceMetrics) {
    const { distanceKm, isNightTime } = context;

    const breakdown = {
      emergency: this._calculateEmergencyScore(infrastructure),
      lighting: this._calculateLightingScore(infrastructure, isNightTime),
      community: this._calculateCommunityScore(communityReports, distanceKm),
      roadClass: this._calculateRoadClassScore(infrastructure?.highwayTags || []),
      transit: this._calculateTransitScore(infrastructure),
      weather: this._calculateWeatherScore(weather),
      isolation: this._calculateIsolationScore(infrastructure, isNightTime),
      historical: this._calculateHistoricalScore(infrastructure?.historicalIncidents || 0)
    };

    let score = 0;
    let totalWeight = 0;

    if (breakdown.emergency !== null) { score += breakdown.emergency * WEIGHTS.emergency; totalWeight += WEIGHTS.emergency; }
    if (breakdown.lighting !== null) { score += breakdown.lighting * WEIGHTS.lighting; totalWeight += WEIGHTS.lighting; }
    if (breakdown.community !== null) { score += breakdown.community * WEIGHTS.community; totalWeight += WEIGHTS.community; }
    if (breakdown.roadClass !== null) { score += breakdown.roadClass * WEIGHTS.roadClass; totalWeight += WEIGHTS.roadClass; }
    if (breakdown.transit !== null) { score += breakdown.transit * WEIGHTS.transit; totalWeight += WEIGHTS.transit; }
    if (breakdown.weather !== null) { score += breakdown.weather * WEIGHTS.weather; totalWeight += WEIGHTS.weather; }
    if (breakdown.isolation !== null) { score += breakdown.isolation * WEIGHTS.isolation; totalWeight += WEIGHTS.isolation; }
    if (breakdown.historical !== null) { score += breakdown.historical * WEIGHTS.historical; totalWeight += WEIGHTS.historical; }

    if (totalWeight === 0) {
      score = null;
    } else {
      score = Math.max(0, Math.min(100, Math.round(score / totalWeight)));
    }

    return {
      score,
      breakdown,
      confidence: this.calculateConfidence(confidenceMetrics),
      explanation: this._generateExplanation(breakdown)
    };
  },

  calculateLiveSafety(infrastructure, communityReports, weather, context, confidenceMetrics) {
    return this.calculateRouteSafety(infrastructure, communityReports, weather, { ...context, distanceKm: 1 }, confidenceMetrics);
  },

  calculateConfidence(metrics) {
    let confidence = 0;
    if (metrics.gps) confidence += 100 * CONFIDENCE_WEIGHTS.gps;
    if (metrics.infrastructure) confidence += 100 * CONFIDENCE_WEIGHTS.infrastructure;
    if (metrics.weather) confidence += 100 * CONFIDENCE_WEIGHTS.weather;
    if (metrics.reports) confidence += 100 * CONFIDENCE_WEIGHTS.reports;
    if (metrics.routing !== false) confidence += 100 * CONFIDENCE_WEIGHTS.routing; 
    if (metrics.ai !== false) confidence += 100 * CONFIDENCE_WEIGHTS.ai; 

    return Math.round(confidence);
  },

  _calculateEmergencyScore(infra) {
    if (!infra || (infra.police === null && infra.hospitals === null)) return null;
    const police = infra.police || 0;
    const hospitals = infra.hospitals || 0;
    const pharmacies = infra.pharmacies || 0;
    let score = (police * 25) + (hospitals * 40) + (pharmacies * 10);
    return Math.min(100, score);
  },

  _calculateLightingScore(infra, isNightTime) {
    if (!infra || infra.commercial === null) return null;
    const commercial = infra.commercial || 0;
    if (!isNightTime) return 100;
    let score = commercial * 10;
    return Math.max(10, Math.min(100, score)); 
  },

  _calculateCommunityScore(reports, distanceKm) {
    if (!reports || reports.length === 0) return 100; 
    
    let penalty = 0;
    const now = new Date().getTime();

    reports.forEach(report => {
      let sevPenalty = 10;
      if (report.severity === 'high') sevPenalty = 30;
      if (report.severity === 'critical') sevPenalty = 50;

      const reportTime = new Date(report.created_at).getTime();
      const ageHours = (now - reportTime) / (1000 * 60 * 60);
      let ageMultiplier = 1;
      if (ageHours > 24) ageMultiplier = 0.5;
      if (ageHours > 72) ageMultiplier = 0.1;

      let statusMultiplier = report.status === 'resolved' ? 0.05 : 1;

      penalty += sevPenalty * ageMultiplier * statusMultiplier;
    });

    const densityPenalty = penalty / Math.max(1, distanceKm);
    return Math.max(0, 100 - densityPenalty);
  },

  _calculateRoadClassScore(highwayTags) {
    if (!highwayTags) return null;
    if (highwayTags.length === 0) return 50; 
    
    let score = 0;
    let counts = { primary: 0, secondary: 0, residential: 0, unclassified: 0 };
    
    highwayTags.forEach(tag => {
      if (tag === 'motorway' || tag === 'trunk' || tag === 'primary') counts.primary++;
      else if (tag === 'secondary') counts.secondary++;
      else if (tag === 'tertiary' || tag === 'residential' || tag === 'living_street') counts.residential++;
      else counts.unclassified++;
    });

    const total = highwayTags.length;
    score += (counts.primary / total) * 90; 
    score += (counts.secondary / total) * 85; 
    score += (counts.residential / total) * 70;
    score += (counts.unclassified / total) * 40; 

    return Math.min(100, Math.round(score));
  },

  _calculateTransitScore(infra) {
    if (!infra || (infra.metro === null && infra.busStops === null)) return null;
    const metro = infra.metro || 0;
    const signals = infra.trafficSignals || 0;
    const bus = infra.busStops || 0;
    let score = (metro * 20) + (bus * 5) + (signals * 2);
    return Math.min(100, score);
  },

  _calculateWeatherScore(weather) {
    if (!weather) return 100;
    let score = 100;
    if (weather.isRaining) score -= 30; 
    if (weather.isFoggy) score -= 50;   
    if (weather.windSpeed > 40) score -= 20; 
    return Math.max(0, score);
  },

  _calculateIsolationScore(infra, isNightTime) {
    if (!infra || infra.parks === null || infra.commercial === null) return null;
    const parks = infra.parks || 0;
    const commercial = infra.commercial || 0;

    if (!isNightTime) return 100; 
    if (parks > 0 && commercial === 0) return 10; 
    if (parks > 0 && commercial > 0) return 60;   
    if (parks === 0 && commercial === 0) return 40; 
    return 100; 
  },

  _calculateHistoricalScore(historicalIncidents) {
    if (historicalIncidents === null || historicalIncidents === undefined) return null; 
    let penalty = historicalIncidents * 2; 
    return Math.max(0, 100 - penalty);
  },

  _generateExplanation(breakdown) {
    return {
      emergency: breakdown.emergency !== null ? `Scored ${Math.round(breakdown.emergency)}/100 based on proximity to police and hospitals.` : null,
      lighting: breakdown.lighting !== null ? `Scored ${Math.round(breakdown.lighting)}/100 based on time of day and commercial activity.` : null,
      community: breakdown.community !== null ? `Scored ${Math.round(breakdown.community)}/100 accounting for nearby hazard reports.` : null,
      roadClass: breakdown.roadClass !== null ? `Scored ${Math.round(breakdown.roadClass)}/100 derived from OpenStreetMap highway classifications.` : null,
      transit: breakdown.transit !== null ? `Scored ${Math.round(breakdown.transit)}/100 reflecting public transit and pedestrian infrastructure.` : null,
      weather: breakdown.weather !== null ? `Scored ${Math.round(breakdown.weather)}/100 based on live meteorological data.` : null,
      isolation: breakdown.isolation !== null ? `Scored ${Math.round(breakdown.isolation)}/100 analyzing risk in deserted areas at night.` : null,
      historical: breakdown.historical !== null ? `Scored ${Math.round(breakdown.historical)}/100 reflecting long-term incident trends.` : 'Historical data unavailable for this jurisdiction'
    };
  }
};
