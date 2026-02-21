const express = require('express');
const {
    addFuelLog,
    getFuelLogs,
    updateFuelLog,
    deleteFuelLog
} = require('../controllers/logController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');

const router = express.Router();

router.use(authenticate);

// Financial Analyst only — full fuel log management
router.post('/', authorize('Financial Analyst'), addFuelLog);
router.put('/:id', authorize('Financial Analyst'), updateFuelLog);
router.delete('/:id', authorize('Financial Analyst'), deleteFuelLog);

// All authenticated users — read
router.get('/', getFuelLogs);

module.exports = router;
