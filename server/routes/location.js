const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');

router.get('/reverse', locationController.reverseGeocode);
router.get('/search', locationController.forwardGeocode);

module.exports = router;
