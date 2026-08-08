const express = require('express');
const router = express.Router();
const geocodeController = require('../controllers/geocodeController');

router.get('/', geocodeController.forwardGeocode);

module.exports = router;
