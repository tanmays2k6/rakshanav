const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// Define routes and map to controller methods
router.post('/chat', aiController.chat);
router.post('/route-analysis', aiController.analyzeRoute);
router.post('/analyze-single-route', aiController.analyzeSingleRoute);
router.post('/summary', aiController.summarizeIncidents);
router.post('/recommendation', aiController.generateRecommendation);
router.post('/classify-hazard', aiController.classifyHazard);
router.post('/analyze-hazard-image', aiController.analyzeHazardImage);
router.post('/expand-description', aiController.expandHazardDescription);
router.post('/trip-insights', aiController.generateTripInsights);

// Independent testing route
router.get('/test-gemini', aiController.testConnection);

module.exports = router;
