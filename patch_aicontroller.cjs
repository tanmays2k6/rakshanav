const fs = require('fs');
const pathAiController = 'e:/rakshanav-main/rakshanav-main/rakshanav/server/controllers/aiController.js';
let content = fs.readFileSync(pathAiController, 'utf8');

const oldAnalyzeSingleRoute = `exports.analyzeSingleRoute = async (req, res, next) => {
  try {
    console.log('[AI Controller] Analyzing SINGLE route telemetry...');
    const analysis = await geminiService.analyzeSingleRoute(req.body);
    res.json({ success: true, analysis });
  } catch (error) {
    next(error);
  }
};`;

const newAnalyzeSingleRoute = `exports.analyzeSingleRoute = async (req, res, next) => {
  try {
    console.log('[AI Controller] Analyzing SINGLE route telemetry...');
    const result = await geminiService.analyzeSingleRoute(req.body);
    // result is { analysis: string, isFallback: boolean, error: string }
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};`;

content = content.replace(oldAnalyzeSingleRoute, newAnalyzeSingleRoute);
fs.writeFileSync(pathAiController, content, 'utf8');
console.log('Patched aiController.js');
