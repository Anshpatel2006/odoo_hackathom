const express = require('express');
const {
    createVehicle,
    getVehicles,
    updateVehicle,
    deleteVehicle,
    getVehicleAnalytics,
    retireVehicle
} = require('../controllers/vehicleController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');

const router = express.Router();

router.use(authenticate);

// Fleet Manager only — write operations
router.post('/', authorize('Fleet Manager'), createVehicle);
router.put('/:id', authorize('Fleet Manager'), updateVehicle);
router.delete('/:id', authorize('Fleet Manager'), deleteVehicle);
router.patch('/:id/retire', authorize('Fleet Manager'), retireVehicle);

// All authenticated users — read
router.get('/', getVehicles);
router.get('/:id/analytics', getVehicleAnalytics);

module.exports = router;
