const { GoogleGenerativeAI } = require('@google/generative-ai');
const templates = require('../promptTemplates');

// 1. Explicit Validation
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('CRITICAL: GEMINI_API_KEY is not defined in environment variables. The AI server cannot start.');
}

// 2. Initialize Gemini API
const genAI = new GoogleGenerativeAI(apiKey);
// Using a robust model identifier. If flash fails, fallback to pro in older SDKs is not automatic, 
// but gemini-1.5-flash-latest usually resolves the 404.
const MODEL_NAME = 'gemini-2.5-flash';
const FALLBACK_MODEL = 'gemini-1.5-flash';
const routeAnalysisCache = new Map();

console.log('✅ [Gemini] API Key Loaded Successfully');

/**
 * Handle conversational chat (with history)
 * Supports streaming response
 */

async function generateChatResponse(history, newMessage, context, res) {
  try {
    // Inject dynamic context into the system prompt
    let dynamicSystemPrompt = templates.SAFETY_ASSISTANT_SYSTEM + `
    
CRITICAL INSTRUCTIONS FOR RAKSHANAV COPILOT:
You are not a generic chatbot. You are the RakshaNav Safety Copilot, an orchestrator of the RakshaNav application.
You MUST output XML-like action tags to navigate the user or trigger UI actions when appropriate.
These tags MUST be on their own line. The frontend will parse them and execute the actions.

Action Tags Available:
1. Navigate to Safe Navigation (when user asks for safer route, directions, etc):
   <action type="navigate" target="/dashboard/navigation" origin="[value]" destination="[value]" />
   CRITICAL RULE: You MUST NOT output this tag unless you have extracted BOTH an origin and a destination from the user's request or the current context. If either is missing, ASK A FOLLOW-UP QUESTION instead of navigating (e.g., "Where are you heading?"). If the user asks for a route from their current location, use "Current Location" as the origin.
2. Navigate to Report Hazard (when user asks to report a pothole, accident, hazard, etc):
   <action type="navigate" target="/dashboard/report" />
3. Navigate to Emergency / SOS (when user says help, SOS, emergency):
   <action type="navigate" target="/dashboard/emergency" />
4. Navigate to Live Tracking (when user says share location, track me):
   <action type="navigate" target="/dashboard/live" />

When you output an action tag, briefly explain what you are doing (e.g. "I'm opening the Safe Navigation tool for you.").
Do NOT invent fake data for nearby hospitals/police. Use ONLY the Live Context Data provided below. If it's empty, explicitly state that live data is unavailable.

LIVE CONTEXT DATA:
Location: ${context.location ? `Lat ${context.location.lat}, Lng ${context.location.lng}` : 'Unknown'}
City: Bengaluru (Default)
User Role: ${context.profile?.role || 'Citizen'}
Nearby Places: ${context.nearby ? JSON.stringify(context.nearby) : 'No data retrieved yet'}
Recent Hazards: ${context.hazards ? JSON.stringify(context.hazards) : 'None'}
Safety Score: 82/100 (Safe)
`;

    const model = genAI.getGenerativeModel({ 
      model: MODEL_NAME,
      systemInstruction: dynamicSystemPrompt
    });

    let formattedHistory = history.map(msg => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.text }],
    }));

    while (formattedHistory.length > 0 && formattedHistory[0].role !== 'user') {
      formattedHistory.shift();
    }

    const chat = model.startChat({
      history: formattedHistory
    });

    const result = await chat.sendMessageStream(newMessage);
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('[Gemini Service] Error in chat generation:', error);
    if (!res.headersSent) {
      throw error;
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message || 'Stream interrupted' })}\n\n`);
      res.end();
    }
  }
}

/**
 * Generate a route analysis explanation
 */
async function analyzeRoute(routeData) {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  
  const prompt = `${templates.ROUTE_ANALYSIS}
  
  Route Data:
  ${JSON.stringify(routeData, null, 2)}`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

/**
 * Generate a route analysis explanation for a SINGLE route
 */
function generateDeterministicFallback(route) {
  let fallback = `This ${route.type || 'route'} covers ${route.distance || 'the distance'} in ${route.duration || 'the estimated time'}. `;
  const score = route.safetyScore === 'Unknown' ? 0 : parseInt(route.safetyScore) || 0;
  
  if (score > 80) {
    fallback += `It is highly safe with ${route.police} police stations and ${route.hospitals} hospitals nearby. `;
  } else if (score > 50) {
    fallback += `It has moderate safety. Expect ${route.communityReports} hazard reports along the way. `;
  } else {
    fallback += `Exercise caution. Lighting is ${route.lighting} and the safety score is ${score}/100. `;
  }
  return fallback.trim();
}

async function analyzeSingleRoute(routeData) {
  const cacheKey = JSON.stringify(routeData);
  if (routeAnalysisCache.has(cacheKey)) {
    console.log('[Gemini SDK] Returning cached analysis for route');
    return routeAnalysisCache.get(cacheKey);
  }

  const prompt = `You are the RakshaNav Route Intelligence Engine, optimized exclusively for the Bengaluru Metropolitan Region.
You will be provided with the feature vector of a SINGLE candidate route in Bengaluru, containing real computed metrics for infrastructure, lighting, weather, community reports, and road class.
Your job is to write a short, highly-specific paragraph explaining the safety characteristics of this EXACT route based ONLY on the provided JSON metrics.
DO NOT use generic safety advice (e.g., "Always stay alert").
DO NOT invent data or numbers. 
ONLY cite the factual numbers provided (e.g., exact hospital count, police count, lighting score, commercial score, weather, reports, road class, confidence).
Limit your response to 2 sentences. Explain the metrics provided.

Route Data:
${JSON.stringify(routeData, null, 2)}`;

  let responseText = "";
  let isFallback = false;
  let errorMsg = null;
  const startTime = Date.now();

  try {
    let model = genAI.getGenerativeModel({ model: MODEL_NAME });
    try {
      console.log(`[Gemini SDK] Sending request to ${MODEL_NAME}...`);
      const result = await model.generateContent(prompt);
      responseText = result.response.text();
    } catch (primaryError) {
      if (primaryError.status === 404) {
        console.warn(`[Gemini SDK] ${MODEL_NAME} threw 404, falling back to ${FALLBACK_MODEL}...`);
        model = genAI.getGenerativeModel({ model: FALLBACK_MODEL });
        const fallbackResult = await model.generateContent(prompt);
        responseText = fallbackResult.response.text();
      } else {
        throw primaryError;
      }
    }
    
    console.log(`[Gemini SDK] Success. Latency: ${Date.now() - startTime}ms`);
    console.log(`[Gemini Output] ${responseText.substring(0, 50)}...`);
  } catch (error) {
    isFallback = true;
    errorMsg = error.message;
    console.error(`\n==================================================`);
    console.error(`[Gemini SDK ERROR] AI Analysis Failed`);
    console.error(`Status: ${error.status || 'Unknown'}`);
    console.error(`Message: ${error.message}`);
    if (error.message.includes('API key not valid')) console.error('Reason: API Key Missing or Invalid');
    else if (error.message.includes('quota')) console.error('Reason: Quota Exceeded');
    else if (error.status >= 500) console.error('Reason: Network/Server Error');
    console.error(`Stack: ${error.stack}`);
    console.error(`==================================================\n`);
    
    responseText = generateDeterministicFallback(routeData);
    console.log(`[Gemini SDK] Generated deterministic fallback instead.`);
  }

  const payload = { analysis: responseText, isFallback, error: errorMsg };
  routeAnalysisCache.set(cacheKey, payload);
  if (routeAnalysisCache.size > 50) {
    routeAnalysisCache.delete(routeAnalysisCache.keys().next().value);
  }
  return payload;
}

/**
 * Generate a summary of incidents
 */
async function summarizeIncidents(incidentsData) {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  
  const prompt = `${templates.INCIDENT_SUMMARY}
  
  Incident Data:
  ${JSON.stringify(incidentsData, null, 2)}`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

/**
 * Generate recommendation insights
 */
async function generateRecommendation(contextData, type = 'enterprise') {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  
  const systemPrompt = type === 'enterprise' ? templates.ENTERPRISE_INSIGHTS : templates.BASE_CONTEXT;
  const prompt = `${systemPrompt}
  
  Context Data:
  ${JSON.stringify(contextData, null, 2)}`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

/**
 * Mock vision classification (text-based fallback for now)
 */
async function classifyHazardTextFallback(description) {
  const model = genAI.getGenerativeModel({ 
    model: MODEL_NAME,
    generationConfig: { responseMimeType: "application/json" }
  });
  
  const prompt = `${templates.VISION_CLASSIFICATION}
  
  Description of the hazard image: "${description}"`;

  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}

/**
 * Real Vision classification for uploaded hazard photos
 */
async function analyzeHazardImage(imageBase64, mimeType) {
  const model = genAI.getGenerativeModel({ 
    model: MODEL_NAME,
    generationConfig: { responseMimeType: "application/json" }
  });
  
  const prompt = `You are a Civic Safety AI Analyzer.
Analyze the following image of a potential infrastructure hazard.
Classify the hazard into a category (e.g., "Broken Streetlight", "Pothole", "Garbage Dump", "Flooding", "Electric Hazard", "Construction Hazard", "Other").
Determine the priority level: "low", "medium", "high", or "critical".
Provide a confidence score between 0 and 100.
Return ONLY valid JSON in this exact format:
{
  "category": "Pothole",
  "priority": "high",
  "confidenceScore": 92
}`;

  const imagePart = {
    inlineData: {
      data: imageBase64,
      mimeType: mimeType || 'image/jpeg'
    }
  };

  try {
    const result = await model.generateContent([prompt, imagePart]);
    return JSON.parse(result.response.text());
  } catch (error) {
    console.error('[Gemini Vision] Image analysis failed:', error);
    return { category: 'Other', priority: 'medium', confidenceScore: 0 };
  }
}

/**
 * Expand short hazard descriptions into formal civic reports
 */
async function expandHazardDescription(shortDesc) {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  
  const prompt = `You are a professional civic safety report writer.
A citizen has provided a short, informal description of an infrastructure hazard.
Expand this into a formal, clear, and professional one-paragraph report suitable for municipal authorities.
Do not add invented facts, just rephrase professionally.
Short description: "${shortDesc}"`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('[Gemini Text] Expansion failed:', error);
    return shortDesc;
  }
}

/**
 * Generate insights based on a user's trip history
 */
async function generateTripInsights(tripStats) {
  const model = genAI.getGenerativeModel({ 
    model: MODEL_NAME,
    generationConfig: { responseMimeType: "application/json" }
  });
  
  const prompt = `You are a Smart City Mobility Assistant.
Analyze the following user trip statistics and generate an array of 3 to 4 short, insightful, and personalized sentences summarizing their travel habits.
Do not invent stats, only use the provided data.
Examples: "You travelled 18 times this month.", "Koramangala is your most visited destination.", "Your average safety score is excellent at 85/100."

Trip Stats: ${JSON.stringify(tripStats)}

Return ONLY valid JSON in this format:
["Insight 1", "Insight 2", "Insight 3"]`;

  try {
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  } catch (error) {
    console.error('[Gemini Text] Trip Insights failed:', error);
    return ["Not enough data to generate personalized insights."];
  }
}

/**
 * Independent verification test
 */
async function testConnection() {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  const result = await model.generateContent("Hello, are you online?");
  return result.response.text();
}

module.exports = {
  generateChatResponse,
  analyzeRoute,
  analyzeSingleRoute,
  summarizeIncidents,
  generateRecommendation,
  classifyHazardTextFallback,
  analyzeHazardImage,
  expandHazardDescription,
  generateTripInsights,
  testConnection
};
