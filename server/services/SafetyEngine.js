/**
 * RakshaNav Safety Engine V2 (Backend CJS)
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

const SafetyEngine = {
  
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
    }

    const confidence = this.calculateConfidence(confidenceMetrics);

    return {
      score,
      available: score !== null,
      breakdown,
      confidence,
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
    if (!infra || infra.status === 'unavailable' || infra.police === null) return null;
    
    let policeScore = 0;
    if (Array.isArray(infra.police)) {
      infra.police.forEach(p => {
        if (p.distanceKm <= 0.5) policeScore += 25;
        else if (p.distanceKm <= 1.0) policeScore += 15;
        else policeScore += 5;
      });
    } else {
      policeScore = (infra.police || 0) * 10;
    }

    let hospitalScore = 0;
    if (Array.isArray(infra.hospitals)) {
      infra.hospitals.forEach(h => {
        if (h.distanceKm <= 0.5) hospitalScore += 40;
        else if (h.distanceKm <= 1.0) hospitalScore += 20;
        else hospitalScore += 10;
      });
    } else {
      hospitalScore = (infra.hospitals || 0) * 20;
    }

    const pharmacies = Array.isArray(infra.pharmacies) ? infra.pharmacies.length : (infra.pharmacies || 0);
    const cctv = infra.cctv || 0;
    let score = policeScore + hospitalScore + (pharmacies * 10) + (cctv * 5);
    return Math.min(100, score);
  },

  _calculateLightingScore(infra, isNightTime) {
    if (!isNightTime) return 100;
    if (!infra || infra.status === 'unavailable' || infra.commercial === null) return null;
    const commercial = infra.commercial || 0;
    const streetlights = infra.streetlights || 0;
    let score = (commercial * 8) + (streetlights * 15);
    return Math.max(10, Math.min(100, score)); 
  },

  _calculateCommunityScore(reports, distanceKm) {
    if (reports === null || reports === undefined) return null; 
    if (reports.length === 0) return 100; 
    
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
    if (!highwayTags || highwayTags.length === 0) return null; 
    
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
    if (!infra || infra.metro === null) return null;
    const metro = infra.metro || 0;
    const signals = infra.trafficSignals || 0;
    const bus = infra.busStops || 0;
    let score = (metro * 20) + (bus * 5) + (signals * 2);
    return Math.min(100, score);
  },

  _calculateWeatherScore(weather) {
    if (!weather) return null;
    let score = 100;
    if (weather.isRaining) score -= 30; 
    if (weather.isFoggy) score -= 50;   
    if (weather.windSpeed > 40) score -= 20; 
    return Math.max(0, score);
  },

  _calculateIsolationScore(infra, isNightTime) {
    if (!isNightTime) return 100; 
    if (!infra || infra.parks === null) return null;
    const parks = infra.parks || 0;
    const commercial = infra.commercial || 0;
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
    // Helper: safely round a breakdown value that may be null (data unavailable)
    const fmt = (v) => v !== null && v !== undefined ? `${Math.round(v)}/100` : 'N/A (data unavailable)';
    return {
      emergency: `Scored ${fmt(breakdown.emergency)} based on proximity to police and hospitals.`,
      lighting: `Scored ${fmt(breakdown.lighting)} based on time of day and commercial activity.`,
      community: `Scored ${fmt(breakdown.community)} accounting for nearby hazard reports.`,
      roadClass: `Scored ${fmt(breakdown.roadClass)} derived from OpenStreetMap highway classifications.`,
      transit: `Scored ${fmt(breakdown.transit)} reflecting public transit and pedestrian infrastructure.`,
      weather: `Scored ${fmt(breakdown.weather)} based on live meteorological data.`,
      isolation: `Scored ${fmt(breakdown.isolation)} analyzing risk in deserted areas at night.`,
      historical: `Scored ${fmt(breakdown.historical)} reflecting long-term incident trends.`
    };
  }
};

module.exports = SafetyEngine;
