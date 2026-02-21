const { supabase, supabaseAdmin } = require('../config/supabase');

const addMaintenanceLog = async (req, res, next) => {
    try {
        const { vehicle_id, service_type, cost, service_date } = req.body;

        // 1. Add log
        const { data, error } = await supabaseAdmin
            .from('maintenance_logs')
            .insert([{ vehicle_id, service_type, cost, service_date }])
            .select()
            .single();

        if (error) return res.status(400).json({ error: error.message });

        // 2. Set vehicle status to "In Shop"
        await supabaseAdmin
            .from('vehicles')
            .update({ status: 'In Shop' })
            .eq('id', vehicle_id);

        res.status(201).json(data);
    } catch (error) {
        next(error);
    }
};

const getMaintenanceLogs = async (req, res, next) => {
    try {
        const { search, type } = req.query;
        let query = supabase
            .from('maintenance_logs')
            .select('*, vehicles(model, license_plate)')
            .order('service_date', { ascending: false });

        if (type && type !== 'All') {
            query = query.eq('service_type', type);
        }

        const { data, error } = await query;
        if (error) return res.status(400).json({ error: error.message });

        if (search) {
            const term = search.toLowerCase();
            const filtered = data.filter(m =>
                m.service_type?.toLowerCase().includes(term) ||
                m.vehicles?.model?.toLowerCase().includes(term) ||
                m.vehicles?.license_plate?.toLowerCase().includes(term)
            );
            return res.json(filtered);
        }

        res.json(data);
    } catch (error) {
        next(error);
    }
};


const addFuelLog = async (req, res, next) => {
    try {
        const { vehicle_id, liters, cost, date } = req.body;
        const { data, error } = await supabaseAdmin
            .from('fuel_logs')
            .insert([{ vehicle_id, liters, cost, date }])
            .select()
            .single();

        if (error) return res.status(400).json({ error: error.message });
        res.status(201).json(data);
    } catch (error) {
        next(error);
    }
};

const getFuelLogs = async (req, res, next) => {
    try {
        const { search } = req.query;
        let query = supabase
            .from('fuel_logs')
            .select('*, vehicles(model, license_plate)')
            .order('date', { ascending: false });

        const { data, error } = await query;
        if (error) return res.status(400).json({ error: error.message });

        if (search) {
            const term = search.toLowerCase();
            const filtered = data.filter(f =>
                f.vehicles?.model?.toLowerCase().includes(term) ||
                f.vehicles?.license_plate?.toLowerCase().includes(term)
            );
            return res.json(filtered);
        }

        res.json(data);
    } catch (error) {
        next(error);
    }
};


const updateMaintenanceLog = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabaseAdmin
            .from('maintenance_logs')
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

const deleteMaintenanceLog = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { error } = await supabaseAdmin
            .from('maintenance_logs')
            .delete()
            .eq('id', id);
        if (error) return res.status(400).json({ error: error.message });
        res.json({ message: 'Maintenance log deleted' });
    } catch (error) {
        next(error);
    }
};

const updateFuelLog = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabaseAdmin
            .from('fuel_logs')
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

const deleteFuelLog = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { error } = await supabaseAdmin
            .from('fuel_logs')
            .delete()
            .eq('id', id);
        if (error) return res.status(400).json({ error: error.message });
        res.json({ message: 'Fuel log deleted' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    addMaintenanceLog,
    getMaintenanceLogs,
    updateMaintenanceLog,
    deleteMaintenanceLog,
    addFuelLog,
    getFuelLogs,
    updateFuelLog,
    deleteFuelLog
};
