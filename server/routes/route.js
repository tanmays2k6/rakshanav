const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');

router.get('/', routeController.getRoute);
router.post('/metrics', routeController.getRouteMetrics);
router.get('/safety/point', routeController.getPointSafety);

module.exports = router;
