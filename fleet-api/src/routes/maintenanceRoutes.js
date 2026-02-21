const express = require('express');
const {
    addMaintenanceLog,
    getMaintenanceLogs,
    updateMaintenanceLog,
    deleteMaintenanceLog
} = require('../controllers/logController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');

const router = express.Router();

router.use(authenticate);

// Fleet Manager only — full maintenance management
router.post('/', authorize('Fleet Manager'), addMaintenanceLog);
router.put('/:id', authorize('Fleet Manager'), updateMaintenanceLog);
router.delete('/:id', authorize('Fleet Manager'), deleteMaintenanceLog);

// All authenticated users — read
router.get('/', getMaintenanceLogs);

module.exports = router;
