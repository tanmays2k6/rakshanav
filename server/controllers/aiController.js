const geminiService = require('../services/geminiService');

exports.chat = async (req, res, next) => {
  try {
    const { history = [], message, context = {} } = req.body;
    
    // 1. Validation
    if (!message || typeof message !== 'string' || !message.trim()) {
      const err = new Error('The "message" string is required in the request body.');
      err.status = 400;
      throw err;
    }

    if (message.length > 2000) {
      const err = new Error('Message length exceeds maximum allowable limit of 2,000 characters.');
      err.status = 400;
      throw err;
    }

    if (!Array.isArray(history) || history.length > 50) {
      const err = new Error('Invalid or oversized history array.');
      err.status = 400;
      throw err;
    }
    
    // 2. Logging
    console.log(`[AI Controller] New chat request received. Message: "${message.substring(0, 50)}..."`);
    
    // 3. Execution (Streaming handles its own response)
    if (req.headers.accept && req.headers.accept.includes('text/event-stream')) {
      await geminiService.generateChatResponse(history, message, context, res);
    } else {
      const err = new Error('This endpoint requires SSE (Accept: text/event-stream)');
      err.status = 400;
      throw err;
    }
  } catch (error) {
    next(error);
  }
};

exports.analyzeRoute = async (req, res, next) => {
  try {
    console.log('[AI Controller] Analyzing route telemetry...');
    const analysis = await geminiService.analyzeRoute(req.body);
    res.json({ success: true, analysis });
  } catch (error) {
    next(error);
  }
};

exports.analyzeSingleRoute = async (req, res, next) => {
  try {
    console.log('[AI Controller] Analyzing SINGLE route telemetry...');
    const result = await geminiService.analyzeSingleRoute(req.body);
    // result is { analysis: string, isFallback: boolean, error: string }
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.summarizeIncidents = async (req, res, next) => {
  try {
    console.log('[AI Controller] Summarizing incidents...');
    const summary = await geminiService.summarizeIncidents(req.body);
    res.json({ success: true, summary });
  } catch (error) {
    next(error);
  }
};

exports.generateRecommendation = async (req, res, next) => {
  try {
    const { context, type } = req.body;
    console.log(`[AI Controller] Generating recommendation for type: ${type}`);
    const recommendation = await geminiService.generateRecommendation(context, type);
    res.json({ success: true, recommendation });
  } catch (error) {
    next(error);
  }
};

exports.classifyHazard = async (req, res, next) => {
  try {
    const description = (req.body.description || 'Unknown hazard').toString().slice(0, 1000);
    console.log(`[AI Controller] Classifying hazard: "${description}"`);
    const classification = await geminiService.classifyHazardTextFallback(description);
    res.json({ success: true, classification });
  } catch (error) {
    next(error);
  }
};

exports.analyzeHazardImage = async (req, res, next) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ success: false, error: 'imageBase64 string is required' });
    }

    // MIME type whitelist
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!allowedMimes.includes(mimeType.toLowerCase())) {
      return res.status(400).json({ success: false, error: 'Invalid image format. Allowed formats: JPEG, PNG, WebP, HEIC.' });
    }

    // Limit base64 length (~7MB raw file max)
    if (imageBase64.length > 10 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: 'Image payload exceeds maximum limit of 7MB.' });
    }

    console.log(`[AI Controller] Analyzing hazard image (Base64)...`);
    const classification = await geminiService.analyzeHazardImage(imageBase64, mimeType);
    res.json({ success: true, classification });
  } catch (error) {
    next(error);
  }
};

exports.expandHazardDescription = async (req, res, next) => {
  try {
    const { description } = req.body;
    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ success: false, error: 'description string is required' });
    }
    const safeDesc = description.slice(0, 1000);
    console.log(`[AI Controller] Expanding hazard description...`);
    const expanded = await geminiService.expandHazardDescription(safeDesc);
    res.json({ success: true, expanded });
  } catch (error) {
    next(error);
  }
};

exports.generateTripInsights = async (req, res, next) => {
  try {
    const { tripStats } = req.body;
    console.log('[AI Controller] Generating trip insights...');
    const insights = await geminiService.generateTripInsights(tripStats || req.body);
    res.json({ success: true, insights });
  } catch (error) {
    next(error);
  }
};

exports.testConnection = async (req, res, next) => {
  try {
    console.log('[AI Controller] Testing Gemini connectivity...');
    const response = await geminiService.testConnection();
    res.json({ success: true, response });
  } catch (error) {
    next(error);
  }
};

exports.healthCheck = async (req, res) => {
  try {
    console.log('[AI Controller] Performing Gemini health check...');
    const health = await geminiService.checkHealth();
    res.json({ success: true, ...health });
  } catch (error) {
    res.status(500).json({ success: false, connected: false, message: error.message });
  }
};
