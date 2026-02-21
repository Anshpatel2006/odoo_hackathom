const express = require('express');
const {
    createTrip, getTrips, dispatchTrip,
    cancelTrip, finishTrip, updateTrip, deleteTrip
} = require('../controllers/tripController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');

const router = express.Router();

router.use(authenticate);

// Dispatcher only — create, dispatch, complete, update, delete trips
router.post('/', authorize('Dispatcher'), createTrip);
router.put('/:id', authorize('Dispatcher'), updateTrip);
router.delete('/:id', authorize('Dispatcher'), deleteTrip);
router.patch('/:id/dispatch', authorize('Dispatcher'), dispatchTrip);
router.post('/:id/complete', authorize('Dispatcher'), finishTrip);
router.patch('/:id/cancel', authorize('Dispatcher'), cancelTrip);

// All authenticated users — read
router.get('/', getTrips);

module.exports = router;
