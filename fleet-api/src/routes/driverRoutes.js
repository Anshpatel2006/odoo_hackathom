const express = require('express');
const { createDriver, getDrivers, updateDriver, updateDriverStatus } = require('../controllers/driverController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');

const router = express.Router();

router.use(authenticate);

// Safety Officer only — full driver management (license, score, status)
router.post('/', authorize('Safety Officer'), createDriver);
router.put('/:id', authorize('Safety Officer'), updateDriver);
router.patch('/:id/status', authorize('Safety Officer'), updateDriverStatus);

// All authenticated users — read
router.get('/', getDrivers);

module.exports = router;
