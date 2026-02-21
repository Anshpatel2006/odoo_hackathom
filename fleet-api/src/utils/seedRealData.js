const { supabaseAdmin } = require('../config/supabase');

const INDIAN_CITIES = [
    { name: 'Mumbai, MH', lat: 19.0760, lng: 72.8777 },
    { name: 'Delhi, NCR', lat: 28.6139, lng: 77.2090 },
    { name: 'Bangalore, KA', lat: 12.9716, lng: 77.5946 },
    { name: 'Chennai, TN', lat: 13.0827, lng: 80.2707 },
    { name: 'Kolkata, WB', lat: 22.5726, lng: 88.3639 },
    { name: 'Hyderabad, TS', lat: 17.3850, lng: 78.4867 },
    { name: 'Ahmedabad, GJ', lat: 23.0225, lng: 72.5714 },
    { name: 'Pune, MH', lat: 18.5204, lng: 73.8567 },
    { name: 'Jaipur, RJ', lat: 26.9124, lng: 75.7873 },
    { name: 'Lucknow, UP', lat: 26.8467, lng: 80.9462 }
];

const VEHICLE_MODELS = [
    { model: 'Tata Prima 4028.S', type: 'Truck', capacity: 40000, cost: 4500000 },
    { model: 'Ashok Leyland 1618', type: 'Truck', capacity: 16000, cost: 2800000 },
    { model: 'BharatBenz 3523R', type: 'Truck', capacity: 35000, cost: 3800000 },
    { model: 'Mahindra Blazo X 49', type: 'Truck', capacity: 49000, cost: 5500000 },
    { model: 'Eicher Pro 6055', type: 'Truck', capacity: 55000, cost: 6000000 },
    { model: 'Mahindra Bolero Pik-Up', type: 'Van', capacity: 1500, cost: 850000 },
    { model: 'Force Traveller', type: 'Van', capacity: 3000, cost: 1200000 },
    { model: 'Tata Ace Gold', type: 'Van', capacity: 750, cost: 500000 },
    { model: 'Maruti Suzuki Super Carry', type: 'Van', capacity: 650, cost: 480000 }
];

const DRIVER_NAMES = [
    'Rajesh Kumar', 'Amit Singh', 'Sridhar Rao', 'Vikram Chatterjee', 'Manoj Yadav',
    'Suresh Pillai', 'Deepak Sharma', 'Rahul Verma', 'Arun Joshi', 'Sanjay Gupta',
    'Vijay Nair', 'Anil Deshmukh', 'Kishore Reddy', 'Prabhat Tiwari', 'Satish Mishra',
    'Ramesh Babu', 'Ganesh Iyer', 'Sunil Mehta', 'Pankaj Chauhan', 'Ajay Saxena'
];

const generateLicensePlate = () => {
    const states = ['MH', 'KA', 'DL', 'WB', 'TN', 'UP', 'HR', 'GJ', 'RJ', 'TS'];
    const state = states[Math.floor(Math.random() * states.length)];
    const cityCode = Math.floor(Math.random() * 99).toString().padStart(2, '0');
    const letters = String.fromCharCode(65 + Math.floor(Math.random() * 26)) + String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const numbers = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `${state}-${cityCode}-${letters}-${numbers}`;
};

const seed = async () => {
    console.log('Starting data seeding...');

    // 1. Seed Vehicles
    console.log('Seeding vehicles...');
    const vehiclesData = [];
    for (let i = 0; i < 50; i++) {
        const modelInfo = VEHICLE_MODELS[Math.floor(Math.random() * VEHICLE_MODELS.length)];
        const city = INDIAN_CITIES[Math.floor(Math.random() * INDIAN_CITIES.length)];
        vehiclesData.push({
            model: modelInfo.model,
            license_plate: generateLicensePlate(),
            vehicle_type: modelInfo.type,
            region: city.name.split(', ')[1],
            max_capacity: modelInfo.capacity,
            odometer: Math.floor(Math.random() * 100000),
            acquisition_cost: modelInfo.cost,
            status: Math.random() > 0.3 ? 'Available' : (Math.random() > 0.5 ? 'On Trip' : 'In Shop'),
            current_lat: city.lat + (Math.random() - 0.5) * 0.1,
            current_lng: city.lng + (Math.random() - 0.5) * 0.1,
            last_updated: new Date()
        });
    }
    const { data: vehicles, error: vError } = await supabaseAdmin.from('vehicles').insert(vehiclesData).select();
    if (vError) {
        console.error('Error seeding vehicles:', JSON.stringify(vError, null, 2));
        return;
    }
    console.log(`Seeded ${vehicles.length} vehicles.`);

    // 2. Seed Drivers
    console.log('Seeding drivers...');
    const driversData = [];
    for (let i = 0; i < 30; i++) {
        const name = DRIVER_NAMES[i % DRIVER_NAMES.length] + (i >= DRIVER_NAMES.length ? ` ${i}` : '');
        const city = INDIAN_CITIES[Math.floor(Math.random() * INDIAN_CITIES.length)];
        driversData.push({
            name: name,
            license_number: `IND-${Math.floor(Math.random() * 1000000000)}`,
            license_category: 'HMV/LMV',
            region: city.name.split(', ')[1],
            expiry_date: new Date(Date.now() + Math.random() * 10000000000).toISOString().split('T')[0],
            safety_score: 70 + Math.floor(Math.random() * 30),
            status: Math.random() > 0.2 ? 'On Duty' : 'Off Duty'
        });
    }
    const { data: drivers, error: dError } = await supabaseAdmin.from('drivers').insert(driversData).select();
    if (dError) {
        console.error('Error seeding drivers:', JSON.stringify(dError, null, 2));
        return;
    }
    console.log(`Seeded ${drivers.length} drivers.`);

    // 3. Seed Trips
    console.log('Seeding trips...');
    const tripsData = [];
    for (let i = 0; i < 200; i++) {
        const vehicle = vehicles[Math.floor(Math.random() * vehicles.length)];
        const driver = drivers[Math.floor(Math.random() * drivers.length)];
        const startCity = INDIAN_CITIES[Math.floor(Math.random() * INDIAN_CITIES.length)];
        const endCity = INDIAN_CITIES[Math.floor(Math.random() * INDIAN_CITIES.length)];
        const isCompleted = Math.random() > 0.3;

        tripsData.push({
            vehicle_id: vehicle.id,
            driver_id: driver.id,
            cargo_weight: Math.floor(Math.random() * vehicle.max_capacity),
            revenue: 5000 + Math.floor(Math.random() * 50000),
            start_location: startCity.name,
            end_location: endCity.name,
            start_odometer: vehicle.odometer - (isCompleted ? Math.floor(Math.random() * 1000) : 0),
            end_odometer: isCompleted ? vehicle.odometer : null,
            status: isCompleted ? 'Completed' : (Math.random() > 0.5 ? 'Dispatched' : 'Draft'),
            created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        });
    }
    const { data: trips, error: tError } = await supabaseAdmin.from('trips').insert(tripsData).select();
    if (tError) {
        console.error('Error seeding trips:', JSON.stringify(tError, null, 2));
        return;
    }
    console.log(`Seeded ${trips.length} trips.`);

    // 4. Seed Logs (Maintenance & Fuel)
    console.log('Seeding maintenance and fuel logs...');
    const maintenanceData = [];
    const fuelData = [];
    for (let i = 0; i < 100; i++) {
        const vehicle = vehicles[Math.floor(Math.random() * vehicles.length)];
        maintenanceData.push({
            vehicle_id: vehicle.id,
            service_type: ['Oil Change', 'Tire Rotation', 'Engine Tune-up', 'Brake Repair', 'Wash'][Math.floor(Math.random() * 5)],
            cost: 500 + Math.floor(Math.random() * 10000),
            service_date: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
        fuelData.push({
            vehicle_id: vehicle.id,
            liters: 20 + Math.floor(Math.random() * 200),
            cost: 2000 + Math.floor(Math.random() * 15000),
            date: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
    }
    await supabaseAdmin.from('maintenance_logs').insert(maintenanceData);
    await supabaseAdmin.from('fuel_logs').insert(fuelData);
    console.log('Seeded logs.');

    console.log('Seeding completed successfully!');
};

seed();
