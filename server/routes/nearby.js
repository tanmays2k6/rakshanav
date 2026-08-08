const express = require('express');
const router = express.Router();
const nearbyController = require('../controllers/nearbyController');

router.get('/', nearbyController.getNearbyHavens);

module.exports = router;
