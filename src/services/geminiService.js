/**
 * Frontend Service for interacting with RakshaNav's AI backend
 */

export const geminiService = {
  /**
   * Fetches the route analysis summary from the AI backend.
   */
  async getRouteAnalysis(routeData) {
    try {
      const response = await fetch('/api/ai/route-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(routeData)
      });
      if (!response.ok) throw new Error('Failed to analyze route');
      const data = await response.json();
      return data.analysis;
    } catch (error) {
      console.error(error);
      return "Unable to generate route analysis at this time. Please rely on standard safety metrics.";
    }
  },

  /**
   * Fetches AI analysis for a SINGLE route segment
   */
  async analyzeSingleRoute(routeData) {
    try {
      const response = await fetch('/api/ai/analyze-single-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(routeData)
      });
      if (!response.ok) throw new Error('Failed to analyze single route');
      const data = await response.json();
      return data; // Returns { success, analysis, isFallback, error }
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  /**
   * Summarizes multiple incident reports
   */
  async getIncidentSummary(incidents) {
    try {
      const response = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incidents)
      });
      if (!response.ok) throw new Error('Failed to summarize');
      const data = await response.json();
      return data.summary;
    } catch (error) {
      console.error(error);
      return "Summary unavailable.";
    }
  },

  /**
   * Generate generic recommendation/insight
   */
  async getRecommendation(context, type = 'enterprise') {
    try {
      const response = await fetch('/api/ai/recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, type })
      });
      if (!response.ok) throw new Error('Failed to get recommendation');
      const data = await response.json();
      return data.recommendation;
    } catch (error) {
      console.error(error);
      return "Recommendation unavailable.";
    }
  },

  /**
   * Classify hazard from image/text description
   */
  async classifyHazard(description) {
    try {
      const response = await fetch('/api/ai/classify-hazard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      });
      if (!response.ok) throw new Error('Failed to classify');
      const data = await response.json();
      return data.classification; // Returns { category, confidenceScore, priority }
    } catch (error) {
      console.error(error);
      return { category: 'Other', priority: 'medium', confidenceScore: 0 };
    }
  },

  /**
   * Classify hazard from image using Gemini Vision
   */
  async analyzeHazardImage(imageBase64, mimeType = 'image/jpeg') {
    try {
      const response = await fetch('/api/ai/analyze-hazard-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mimeType })
      });
      if (!response.ok) throw new Error('Failed to analyze image');
      const data = await response.json();
      return data.classification; 
    } catch (error) {
      console.error(error);
      return { category: 'Other', priority: 'medium', confidenceScore: 0 };
    }
  },

  /**
   * Expand short description to formal report
   */
  async expandHazardDescription(description) {
    try {
      const response = await fetch('/api/ai/expand-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      });
      if (!response.ok) throw new Error('Failed to expand description');
      const data = await response.json();
      return data.expanded; 
    } catch (error) {
      console.error(error);
      return description;
    }
  },

  /**
   * Generate insights based on trip history
   */
  async generateTripInsights(tripStats) {
    try {
      const response = await fetch('/api/ai/trip-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripStats })
      });
      if (!response.ok) throw new Error('Failed to generate trip insights');
      const data = await response.json();
      return data.insights;
    } catch (error) {
      console.error(error);
      return ["Not enough data to generate insights."];
    }
  }
};
