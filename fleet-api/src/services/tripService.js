const { supabase, supabaseAdmin } = require('../config/supabase');

const createDraftTrip = async (tripData) => {
    const { vehicle_id, driver_id, cargo_weight, start_location, end_location, start_odometer, revenue } = tripData;

    const { data: trip, error: tError } = await supabaseAdmin
        .from('trips')
        .insert([{
            vehicle_id,
            driver_id,
            cargo_weight,
            start_location,
            end_location,
            start_odometer: start_odometer || 0,
            revenue: revenue || 0,
            status: 'Draft'
        }])
        .select()
        .single();

    if (tError) throw tError;
    return trip;
};

const dispatchTrip = async (tripId) => {
    const { data: trip, error: tError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

    if (tError || !trip) throw new Error('Trip not found');
    if (trip.status !== 'Draft') throw new Error('Only draft trips can be dispatched');

    // 1. Validate Driver
    const { data: driver, error: dError } = await supabase
        .from('drivers')
        .select('status, expiry_date')
        .eq('id', trip.driver_id)
        .single();

    if (dError || !driver) throw new Error('Driver not found');
    // Allow any active driver (not Suspended) to be dispatched
    const disallowedStatuses = ['Suspended'];
    if (disallowedStatuses.includes(driver.status)) throw new Error(`Driver is ${driver.status} and cannot be dispatched`);
    if (new Date(driver.expiry_date) < new Date()) throw new Error('Driver license expired');

    // 2. Validate Vehicle
    const { data: vehicle, error: vError } = await supabase
        .from('vehicles')
        .select('status, max_capacity')
        .eq('id', trip.vehicle_id)
        .single();

    if (vError || !vehicle) throw new Error('Vehicle not found');
    if (vehicle.status !== 'Available') throw new Error(`Vehicle is ${vehicle.status}, must be Available`);
    if (Number(trip.cargo_weight) > Number(vehicle.max_capacity)) throw new Error('Cargo weight exceeds vehicle capacity');

    // 3. Update Statuses using admin to bypass RLS
    const { data: updatedTrip, error: utError } = await supabaseAdmin
        .from('trips')
        .update({ status: 'Dispatched' })
        .eq('id', tripId)
        .select()
        .single();

    if (utError) throw utError;

    await supabaseAdmin.from('vehicles').update({ status: 'On Trip' }).eq('id', trip.vehicle_id);
    await supabaseAdmin.from('drivers').update({ status: 'On Duty' }).eq('id', trip.driver_id);

    return updatedTrip;
};

const completeTrip = async (tripId, endOdometer, revenue) => {
    const { data: trip, error: tError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

    if (tError || !trip) throw new Error('Trip not found');
    if (trip.status !== 'Dispatched') throw new Error('Only dispatched trips can be completed');

    const distance = endOdometer - trip.start_odometer;
    if (distance < 0) throw new Error('End odometer must be greater than start odometer');

    const { data: updatedTrip, error: utError } = await supabaseAdmin
        .from('trips')
        .update({
            status: 'Completed',
            end_odometer: endOdometer,
            revenue: revenue
        })
        .eq('id', tripId)
        .select()
        .single();

    if (utError) throw utError;

    // Reset statuses
    await supabaseAdmin.from('vehicles').update({ status: 'Available', odometer: endOdometer }).eq('id', trip.vehicle_id);
    await supabaseAdmin.from('drivers').update({ status: 'Available' }).eq('id', trip.driver_id);

    return { ...updatedTrip, distance };
};

const cancelTrip = async (tripId) => {
    const { data: trip, error: tError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

    if (tError || !trip) throw new Error('Trip not found');
    if (trip.status === 'Completed' || trip.status === 'Cancelled') {
        throw new Error('Completed or already cancelled trips cannot be cancelled');
    }

    const { data: updatedTrip, error: utError } = await supabaseAdmin
        .from('trips')
        .update({ status: 'Cancelled' })
        .eq('id', tripId)
        .select()
        .single();

    if (utError) throw utError;

    // If it was dispatched, release the vehicle and driver
    if (trip.status === 'Dispatched') {
        await supabaseAdmin.from('vehicles').update({ status: 'Available' }).eq('id', trip.vehicle_id);
        await supabaseAdmin.from('drivers').update({ status: 'Available' }).eq('id', trip.driver_id);
    }

    return updatedTrip;
};

const deleteTrip = async (tripId) => {
    const { data: trip, error: tError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

    if (tError || !trip) throw new Error('Trip not found');

    const { error: dError } = await supabaseAdmin
        .from('trips')
        .delete()
        .eq('id', tripId);

    if (dError) throw dError;

    // If it was dispatched, release the vehicle and driver
    if (trip.status === 'Dispatched') {
        await supabaseAdmin.from('vehicles').update({ status: 'Available' }).eq('id', trip.vehicle_id);
        await supabaseAdmin.from('drivers').update({ status: 'Available' }).eq('id', trip.driver_id);
    }

    return { success: true };
};

const updateTrip = async (tripId, tripData) => {
    const { vehicle_id, driver_id, cargo_weight, start_location, end_location, start_odometer, revenue } = tripData;

    const { data: updatedTrip, error } = await supabaseAdmin
        .from('trips')
        .update({
            vehicle_id,
            driver_id,
            cargo_weight,
            start_location,
            end_location,
            start_odometer,
            revenue
        })
        .eq('id', tripId)
        .select()
        .single();

    if (error) throw error;
    return updatedTrip;
};

module.exports = { createDraftTrip, dispatchTrip, cancelTrip, completeTrip, updateTrip, deleteTrip };
