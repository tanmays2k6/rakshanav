const fs = require('fs');

const pathGeminiBackend = 'e:/rakshanav-main/rakshanav-main/rakshanav/server/services/geminiService.js';
let content = fs.readFileSync(pathGeminiBackend, 'utf8');

// 1. Add caching
const cacheDecl = `const MODEL_NAME = 'gemini-2.5-flash';
const FALLBACK_MODEL = 'gemini-1.5-flash';
const routeAnalysisCache = new Map();`;
content = content.replace(`const MODEL_NAME = 'gemini-2.5-flash';`, cacheDecl);

// 2. Replace analyzeSingleRoute
const oldAnalyze = `async function analyzeSingleRoute(routeData) {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  
  const prompt = \`You are the RakshaNav Route Intelligence Engine, optimized exclusively for the Bengaluru Metropolitan Region.
You will be provided with the feature vector of a SINGLE candidate route in Bengaluru, containing real computed metrics for infrastructure, lighting, weather, community reports, and road class.
Your job is to write a short, highly-specific paragraph explaining the safety characteristics of this EXACT route based ONLY on the provided JSON metrics.
DO NOT use generic safety advice (e.g., "Always stay alert").
DO NOT invent data or numbers. 
ONLY cite the factual numbers provided (e.g., exact hospital count, police count, lighting score, commercial score, weather, reports, road class, confidence).
Limit your response to 2 sentences. Explain the metrics provided.

Route Data:
\${JSON.stringify(routeData, null, 2)}\`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}`;

const newAnalyze = `function generateDeterministicFallback(route) {
  let fallback = \`This \${route.type || 'route'} covers \${route.distance || 'the distance'} in \${route.duration || 'the estimated time'}. \`;
  const score = route.safetyScore === 'Unknown' ? 0 : parseInt(route.safetyScore) || 0;
  
  if (score > 80) {
    fallback += \`It is highly safe with \${route.police} police stations and \${route.hospitals} hospitals nearby. \`;
  } else if (score > 50) {
    fallback += \`It has moderate safety. Expect \${route.communityReports} hazard reports along the way. \`;
  } else {
    fallback += \`Exercise caution. Lighting is \${route.lighting} and the safety score is \${score}/100. \`;
  }
  return fallback.trim();
}

async function analyzeSingleRoute(routeData) {
  const cacheKey = JSON.stringify(routeData);
  if (routeAnalysisCache.has(cacheKey)) {
    console.log('[Gemini SDK] Returning cached analysis for route');
    return routeAnalysisCache.get(cacheKey);
  }

  const prompt = \`You are the RakshaNav Route Intelligence Engine, optimized exclusively for the Bengaluru Metropolitan Region.
You will be provided with the feature vector of a SINGLE candidate route in Bengaluru, containing real computed metrics for infrastructure, lighting, weather, community reports, and road class.
Your job is to write a short, highly-specific paragraph explaining the safety characteristics of this EXACT route based ONLY on the provided JSON metrics.
DO NOT use generic safety advice (e.g., "Always stay alert").
DO NOT invent data or numbers. 
ONLY cite the factual numbers provided (e.g., exact hospital count, police count, lighting score, commercial score, weather, reports, road class, confidence).
Limit your response to 2 sentences. Explain the metrics provided.

Route Data:
\${JSON.stringify(routeData, null, 2)}\`;

  let responseText = "";
  let isFallback = false;
  let errorMsg = null;
  const startTime = Date.now();

  try {
    let model = genAI.getGenerativeModel({ model: MODEL_NAME });
    try {
      console.log(\`[Gemini SDK] Sending request to \${MODEL_NAME}...\`);
      const result = await model.generateContent(prompt);
      responseText = result.response.text();
    } catch (primaryError) {
      if (primaryError.status === 404) {
        console.warn(\`[Gemini SDK] \${MODEL_NAME} threw 404, falling back to \${FALLBACK_MODEL}...\`);
        model = genAI.getGenerativeModel({ model: FALLBACK_MODEL });
        const fallbackResult = await model.generateContent(prompt);
        responseText = fallbackResult.response.text();
      } else {
        throw primaryError;
      }
    }
    
    console.log(\`[Gemini SDK] Success. Latency: \${Date.now() - startTime}ms\`);
    console.log(\`[Gemini Output] \${responseText.substring(0, 50)}...\`);
  } catch (error) {
    isFallback = true;
    errorMsg = error.message;
    console.error(\`\\n==================================================\`);
    console.error(\`[Gemini SDK ERROR] AI Analysis Failed\`);
    console.error(\`Status: \${error.status || 'Unknown'}\`);
    console.error(\`Message: \${error.message}\`);
    if (error.message.includes('API key not valid')) console.error('Reason: API Key Missing or Invalid');
    else if (error.message.includes('quota')) console.error('Reason: Quota Exceeded');
    else if (error.status >= 500) console.error('Reason: Network/Server Error');
    console.error(\`Stack: \${error.stack}\`);
    console.error(\`==================================================\\n\`);
    
    responseText = generateDeterministicFallback(routeData);
    console.log(\`[Gemini SDK] Generated deterministic fallback instead.\`);
  }

  const payload = { analysis: responseText, isFallback, error: errorMsg };
  routeAnalysisCache.set(cacheKey, payload);
  if (routeAnalysisCache.size > 50) {
    routeAnalysisCache.delete(routeAnalysisCache.keys().next().value);
  }
  return payload;
}`;

content = content.replace(oldAnalyze, newAnalyze);
fs.writeFileSync(pathGeminiBackend, content, 'utf8');
console.log('Patched server/services/geminiService.js');
