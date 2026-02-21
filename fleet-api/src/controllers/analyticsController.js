const { supabase, supabaseAdmin } = require('../config/supabase');

const getDashboardMetrics = async (req, res, next) => {
    try {
        // 1. Active Fleet Count (Not Retired)
        const { count: activeFleet, error: afError } = await supabase
            .from('vehicles')
            .select('*', { count: 'exact', head: true })
            .not('status', 'eq', 'Retired');

        // 2. Maintenance Alerts (In Shop)
        const { count: maintenanceAlerts, error: maError } = await supabase
            .from('vehicles')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'In Shop');

        // 3. Utilization Rate
        const { count: onTripCount, error: otError } = await supabase
            .from('vehicles')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'On Trip');

        const utilizationRate = activeFleet > 0 ? (onTripCount / activeFleet) * 100 : 0;

        // 4. Pending cargo count
        const { count: pendingCargo, error: pcError } = await supabaseAdmin
            .from('trips')
            .select('*', { count: 'exact', head: true })
            .in('status', ['Draft', 'Dispatched']);

        // 5. Compliance Alerts (Safety Officer): Expired Driver Licenses
        const today = new Date().toISOString().split('T')[0];
        const { count: expiredLicenses, error: elError } = await supabase
            .from('drivers')
            .select('*', { count: 'exact', head: true })
            .lt('expiry_date', today);

        // 6. Financial Summary (Analyst): Total Revenue & Costs
        const { data: trips, error: trError } = await supabaseAdmin.from('trips').select('revenue');
        const { data: fuel, error: fError } = await supabase.from('fuel_logs').select('cost');
        const { data: maintenance, error: mError } = await supabase.from('maintenance_logs').select('cost');

        const totalRevenue = trips ? trips.reduce((sum, t) => sum + Number(t.revenue || 0), 0) : 0;
        const totalFuelCost = fuel ? fuel.reduce((sum, f) => sum + Number(f.cost || 0), 0) : 0;
        const totalMaintCost = maintenance ? maintenance.reduce((sum, m) => sum + Number(m.cost || 0), 0) : 0;
        const totalProfit = totalRevenue - (totalFuelCost + totalMaintCost);

        if (afError || maError || otError || pcError || elError || trError || fError || mError) {
            return res.status(400).json({ error: 'Failed to fetch metrics' });
        }

        res.json({
            activeFleetCount: activeFleet,
            maintenanceAlertsCount: maintenanceAlerts,
            utilizationRate: utilizationRate.toFixed(2) + '%',
            pendingCargoCount: pendingCargo,
            complianceAlertsCount: expiredLicenses,
            totalRevenue: totalRevenue.toFixed(2),
            totalProfit: totalProfit.toFixed(2)
        });
    } catch (error) {
        next(error);
    }
};

const getDailyTrips = async (req, res, next) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: trips, error } = await supabaseAdmin
            .from('trips')
            .select('created_at')
            .gte('created_at', thirtyDaysAgo.toISOString());

        if (error) throw error;

        // Group by day
        const counts = trips.reduce((acc, trip) => {
            const date = trip.created_at.split('T')[0];
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {});

        res.json(Object.entries(counts).map(([date, count]) => ({ date, count })));
    } catch (error) {
        next(error);
    }
};

const getFinancialEvolution = async (req, res, next) => {
    try {
        const { data: trips } = await supabaseAdmin.from('trips').select('revenue, created_at').eq('status', 'Completed');
        const { data: fuel } = await supabase.from('fuel_logs').select('cost, date');
        const { data: maintenance } = await supabase.from('maintenance_logs').select('cost, service_date');

        const evolution = {};

        trips?.forEach(t => {
            const month = t.created_at.substring(0, 7); // YYYY-MM
            evolution[month] = evolution[month] || { month, revenue: 0, cost: 0 };
            evolution[month].revenue += Number(t.revenue);
        });

        fuel?.forEach(f => {
            const month = f.date.substring(0, 7);
            evolution[month] = evolution[month] || { month, revenue: 0, cost: 0 };
            evolution[month].cost += Number(f.cost);
        });

        maintenance?.forEach(m => {
            const month = m.service_date.substring(0, 7);
            evolution[month] = evolution[month] || { month, revenue: 0, cost: 0 };
            evolution[month].cost += Number(m.cost);
        });

        res.json(Object.values(evolution).sort((a, b) => a.month.localeCompare(b.month)));
    } catch (error) {
        next(error);
    }
};

const getBusinessIntelligence = async (req, res, next) => {
    try {
        // 1. Fetch all vehicles with their aggregated financial data
        // We'll use a simplified version of ROI for the list
        const { data: vehicles, error: vError } = await supabaseAdmin
            .from('vehicles')
            .select(`
                id, model, license_plate, region, acquisition_cost,
                trips(revenue, status),
                fuel_logs(cost),
                maintenance_logs(cost)
            `);

        if (vError) throw vError;

        const processedVehicles = vehicles.map(v => {
            const completedTrips = v.trips?.filter(t => t.status === 'Completed') || [];
            const revenue = completedTrips.reduce((sum, t) => sum + Number(t.revenue || 0), 0) || 0;
            const fuelCost = v.fuel_logs?.reduce((sum, f) => sum + Number(f.cost || 0), 0) || 0;
            const maintCost = v.maintenance_logs?.reduce((sum, m) => sum + Number(m.cost || 0), 0) || 0;
            const totalCost = fuelCost + maintCost;
            const roi = v.acquisition_cost > 0 ? (revenue - totalCost) / v.acquisition_cost : 0;

            return {
                id: v.id,
                model: v.model,
                license_plate: v.license_plate,
                region: v.region,
                revenue,
                totalCost,
                roi: roi.toFixed(4)
            };
        });

        // 2. Highest ROI Vehicle
        const highestROI = [...processedVehicles].sort((a, b) => b.roi - a.roi)[0];

        // 3. Regional Efficiency (Revenue per Region)
        const regionalBreakdown = processedVehicles.reduce((acc, v) => {
            if (!acc[v.region]) acc[v.region] = { region: v.region, totalRevenue: 0, vehicleCount: 0 };
            acc[v.region].totalRevenue += v.revenue;
            acc[v.region].vehicleCount += 1;
            return acc;
        }, {});

        const regionalMetrics = Object.values(regionalBreakdown).map(r => ({
            ...r,
            efficiency: r.vehicleCount > 0 ? (r.totalRevenue / r.vehicleCount).toFixed(2) : 0
        })).sort((a, b) => b.efficiency - a.efficiency);

        res.json({
            highestROI,
            regionalMetrics,
            vehicleCount: processedVehicles.length
        });
    } catch (error) {
        next(error);
    }
};

const getDriverMetrics = async (req, res, next) => {
    try {
        const { data: drivers } = await supabase.from('drivers').select('id, name, safety_score');
        const { data: trips } = await supabaseAdmin.from('trips').select('driver_id, status');

        const metrics = drivers.map(driver => {
            const driverTrips = trips.filter(t => t.driver_id === driver.id);
            // Refined Logic: Total trips = Dispatched + Completed (Operational)
            const operationalTrips = driverTrips.filter(t => ['Dispatched', 'Completed'].includes(t.status));
            const total = operationalTrips.length;

            const completed = driverTrips.filter(t => t.status === 'Completed').length;
            const completionRate = total > 0 ? ((completed / total) * 100).toFixed(0) : 0;

            return {
                name: driver.name,
                safetyScore: driver.safety_score,
                completionRate,
                totalTrips: total
            };
        });

        res.json(metrics);
    } catch (error) {
        next(error);
    }
};

const exportFinancialReport = async (req, res, next) => {
    try {
        // Placeholder for financial report export
        const { data: trips } = await supabase.from('trips').select('*').eq('status', 'Completed');
        res.json({
            message: 'Financial report generated',
            timestamp: new Date().toISOString(),
            tripCount: trips?.length || 0,
            reportData: trips
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDashboardMetrics,
    exportFinancialReport,
    getDailyTrips,
    getFinancialEvolution,
    getDriverMetrics,
    getBusinessIntelligence
};
