const { supabase, supabaseAdmin } = require('../config/supabase');
const { calculateVehicleROI } = require('../services/vehicleService');

const createVehicle = async (req, res, next) => {
    try {
        const { model, license_plate, max_capacity, odometer, acquisition_cost, region, vehicle_type } = req.body;
        const { data, error } = await supabaseAdmin
            .from('vehicles')
            .insert([{
                model,
                license_plate,
                max_capacity,
                odometer,
                acquisition_cost,
                status: 'Available',
                region: region || 'Main',
                vehicle_type: vehicle_type || 'Truck'
            }])
            .select()
            .single();

        if (error) return res.status(400).json({ error: error.message });
        res.status(201).json(data);
    } catch (error) {
        next(error);
    }
};

const getVehicles = async (req, res, next) => {
    try {
        const { region, vehicle_type, status, search } = req.query;
        let query = supabase.from('vehicles').select('*');

        if (region) query = query.eq('region', region);
        if (vehicle_type) query = query.eq('vehicle_type', vehicle_type);
        if (status) query = query.eq('status', status);

        if (search) {
            query = query.or(`model.ilike.%${search}%,license_plate.ilike.%${search}%,region.ilike.%${search}%,status.ilike.%${search}%`);
        }

        const { data, error } = await query;
        if (error) return res.status(400).json({ error: error.message });
        res.json(data);
    } catch (error) {
        next(error);
    }
};

const updateVehicle = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabaseAdmin
            .from('vehicles')
            .update(req.body)
            .eq('id', id)
            .select()
            .single();

        if (error) return res.status(400).json({ error: error.message });
        res.json(data);
    } catch (error) {
        next(error);
    }
};

const deleteVehicle = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { error } = await supabaseAdmin
            .from('vehicles')
            .delete()
            .eq('id', id);

        if (error) return res.status(400).json({ error: error.message });
        res.json({ message: 'Vehicle deleted successfully' });
    } catch (error) {
        next(error);
    }
};

const getVehicleAnalytics = async (req, res, next) => {
    try {
        const { id } = req.params;
        const analytics = await calculateVehicleROI(id);
        res.json(analytics);
    } catch (error) {
        next(error);
    }
};

const retireVehicle = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabaseAdmin
            .from('vehicles')
            .update({ status: 'Retired' })
            .eq('id', id)
            .select()
            .single();

        if (error) return res.status(400).json({ error: error.message });
        res.json(data);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createVehicle,
    getVehicles,
    updateVehicle,
    deleteVehicle,
    getVehicleAnalytics,
    retireVehicle
};
