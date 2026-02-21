const { supabase } = require('../config/supabase');

const calculateVehicleROI = async (vehicleId) => {
    // 1. Get vehicle acquisition cost
    const { data: vehicle, error: vError } = await supabase
        .from('vehicles')
        .select('acquisition_cost')
        .eq('id', vehicleId)
        .single();

    if (vError || !vehicle) throw new Error('Vehicle not found');

    // 2. Sum Revenue from Trips
    const { data: trips, error: tError } = await supabase
        .from('trips')
        .select('revenue')
        .eq('vehicle_id', vehicleId)
        .eq('status', 'Completed');

    const totalRevenue = trips?.reduce((sum, t) => sum + Number(t.revenue), 0) || 0;

    // 3. Sum Fuel Costs
    const { data: fuel, error: fError } = await supabase
        .from('fuel_logs')
        .select('cost')
        .eq('vehicle_id', vehicleId);

    const totalFuelCost = fuel?.reduce((sum, f) => sum + Number(f.cost), 0) || 0;

    // 4. Sum Maintenance Costs
    const { data: maintenance, error: mError } = await supabase
        .from('maintenance_logs')
        .select('cost')
        .eq('vehicle_id', vehicleId);

    const totalMaintenanceCost = maintenance?.reduce((sum, m) => sum + Number(m.cost), 0) || 0;

    // ROI = (Revenue - (Fuel + Maintenance)) / acquisition_cost
    const roi = (totalRevenue - (totalFuelCost + totalMaintenanceCost)) / vehicle.acquisition_cost;

    return {
        revenue: totalRevenue,
        fuelCost: totalFuelCost,
        maintenanceCost: totalMaintenanceCost,
        acquisitionCost: vehicle.acquisition_cost,
        roi: roi.toFixed(4)
    };
};

module.exports = { calculateVehicleROI };
