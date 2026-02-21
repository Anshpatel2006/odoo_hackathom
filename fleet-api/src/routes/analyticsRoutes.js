const express = require('express');
const {
    getDashboardMetrics,
    exportFinancialReport,
    getDailyTrips,
    getFinancialEvolution,
    getDriverMetrics,
    getBusinessIntelligence
} = require('../controllers/analyticsController');
const { getVehicleAnalytics } = require('../controllers/vehicleController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');

const router = express.Router();

router.use(authenticate);

const allowed = authorize('Financial Analyst', 'Fleet Manager');

router.get('/dashboard', allowed, getDashboardMetrics);
router.get('/daily-trips', allowed, getDailyTrips);
router.get('/financial-evolution', allowed, getFinancialEvolution);
router.get('/driver-metrics', allowed, getDriverMetrics);
router.get('/bi', allowed, getBusinessIntelligence);
router.get('/vehicle/:id', allowed, getVehicleAnalytics);
router.get('/export', allowed, exportFinancialReport);

module.exports = router;
