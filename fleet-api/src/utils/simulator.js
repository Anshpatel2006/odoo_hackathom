const { supabaseAdmin } = require('../config/supabase');

/**
 * Simulator for vehicle movement.
 * - Finds all vehicles with status 'On Trip'.
 * - Slightly updates their current_lat and current_lng.
 * - Increments odometer.
 * - Updates last_updated.
 */

const moveVehicle = (lat, lng) => {
    // Default coordinates if null (Mumbai)
    const currentLat = lat || 19.0760;
    const currentLng = lng || 72.8777;

    // Move roughly 1-2km (0.01 - 0.02 degrees)
    const deltaLat = (Math.random() - 0.5) * 0.02;
    const deltaLng = (Math.random() - 0.5) * 0.02;

    return {
        newLat: currentLat + deltaLat,
        newLng: currentLng + deltaLng,
        distance: Math.sqrt(deltaLat * deltaLat + deltaLng * deltaLng) * 111 // rough km
    };
};

const simulate = async () => {
    try {
        console.log(`[${new Date().toISOString()}] Simulation Tick Starting...`);

        // 1. Get vehicles on trip
        const { data: vehicles, error } = await supabaseAdmin
            .from('vehicles')
            .select('id, current_lat, current_lng, odometer')
            .eq('status', 'On Trip');

        if (error) {
            console.error('Error fetching vehicles:', error);
            return;
        }

        if (!vehicles || vehicles.length === 0) {
            console.log('No vehicles currently on trip.');

            // Let's activate some random vehicles if none are on trip to keep things alive
            const { data: availVehicles } = await supabaseAdmin
                .from('vehicles')
                .select('id')
                .eq('status', 'Available')
                .limit(3);

            if (availVehicles && availVehicles.length > 0) {
                console.log(`Activating ${availVehicles.length} vehicles for movement...`);
                await supabaseAdmin
                    .from('vehicles')
                    .update({ status: 'On Trip' })
                    .in('id', availVehicles.map(v => v.id));
            }
            return;
        }

        console.log(`Moving ${vehicles.length} vehicles...`);

        const updates = vehicles.map(async (v) => {
            const { newLat, newLng, distance } = moveVehicle(v.current_lat, v.current_lng);
            const currentOdo = isNaN(Number(v.odometer)) ? 0 : Number(v.odometer);

            const { error: updateError } = await supabaseAdmin
                .from('vehicles')
                .update({
                    current_lat: newLat,
                    current_lng: newLng,
                    odometer: currentOdo + distance,
                    last_updated: new Date().toISOString()
                })
                .eq('id', v.id);

            if (updateError) {
                console.error(`Error updating vehicle ${v.id}:`, updateError);
            }
        });

        await Promise.all(updates);
        console.log(`[${new Date().toISOString()}] Simulation Tick Completed.`);
    } catch (err) {
        console.error('CRITICAL: Simulation loop error:', err);
    }
};

// Run every 10 seconds
console.log('Starting Fleet Simulator (runs every 10 seconds)...');
setInterval(simulate, 10000);

// Run once immediately
simulate().catch(err => console.error('Initial simulation run failed:', err));
