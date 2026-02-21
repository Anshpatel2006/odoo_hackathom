const { supabase, supabaseAdmin } = require('../config/supabase');
const tripService = require('../services/tripService');

const createTrip = async (req, res, next) => {
    try {
        const trip = await tripService.createDraftTrip(req.body);
        res.status(201).json(trip);
    } catch (error) {
        next(error);
    }
};

const getTrips = async (req, res, next) => {
    try {
        const { search, status } = req.query;
        let query = supabaseAdmin
            .from('trips')
            .select('*, vehicles(model, license_plate), drivers(name)')
            .order('created_at', { ascending: false });

        if (status && status !== 'All') {
            query = query.eq('status', status);
        }

        const { data, error } = await query;
        if (error) return res.status(400).json({ error: error.message });

        // Post-filter by search term (supports joined fields)
        if (search) {
            const term = search.toLowerCase();
            const filtered = data.filter(t =>
                t.start_location?.toLowerCase().includes(term) ||
                t.end_location?.toLowerCase().includes(term) ||
                t.status?.toLowerCase().includes(term) ||
                t.vehicles?.model?.toLowerCase().includes(term) ||
                t.vehicles?.license_plate?.toLowerCase().includes(term) ||
                t.drivers?.name?.toLowerCase().includes(term)
            );
            return res.json(filtered);
        }

        res.json(data);
    } catch (error) {
        next(error);
    }
};


const dispatchTrip = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await tripService.dispatchTrip(id);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

const cancelTrip = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await tripService.cancelTrip(id);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

const finishTrip = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { end_odometer, revenue } = req.body;
        const result = await tripService.completeTrip(id, end_odometer, revenue);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

const updateTrip = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await tripService.updateTrip(id, req.body);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

const deleteTrip = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await tripService.deleteTrip(id);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

module.exports = { createTrip, getTrips, dispatchTrip, cancelTrip, finishTrip, updateTrip, deleteTrip };
