import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';

const FleetContext = createContext();

export const FleetProvider = ({ children }) => {
    const { user, token } = useAuth();
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [trips, setTrips] = useState([]);
    const [maintenance, setMaintenance] = useState([]);
    const [fuelLogs, setFuelLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchVehicles = async (search = '') => {
        const res = await api.get('/vehicles', { params: { search } });
        setVehicles(res.data);
    };

    const fetchDrivers = async (search = '') => {
        const res = await api.get('/drivers', { params: { search } });
        setDrivers(res.data);
    };

    const fetchTrips = async (search = '', status = 'All') => {
        const res = await api.get('/trips', { params: { search, status } });
        setTrips(res.data);
    };

    const fetchMaintenance = async (search = '', type = 'All') => {
        const res = await api.get('/maintenance', { params: { search, type } });
        setMaintenance(res.data);
    };

    const fetchFuelLogs = async (search = '') => {
        const res = await api.get('/fuel', { params: { search } });
        setFuelLogs(res.data);
    };

    const fetchData = async () => {
        if (!token) return; // Prevent 401s if not logged in
        try {
            await Promise.allSettled([
                fetchVehicles().catch(e => console.error('fetchVehicles failed', e)),
                fetchDrivers().catch(e => console.error('fetchDrivers failed', e)),
                fetchTrips().catch(e => console.error('fetchTrips failed', e)),
                fetchMaintenance().catch(e => console.error('fetchMaintenance failed', e)),
                fetchFuelLogs().catch(e => console.error('fetchFuelLogs failed', e))
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchData();
            const interval = setInterval(fetchData, 10000);
            return () => clearInterval(interval);
        } else {
            // Optional: Clear state on logout to prevent data leak
            setVehicles([]);
            setDrivers([]);
            setTrips([]);
            setMaintenance([]);
            setFuelLogs([]);
            setLoading(false);
        }
    }, [token]);

    const addVehicle = async (vehicle) => {
        const res = await api.post('/vehicles', vehicle);
        setVehicles([...vehicles, res.data]);
    };

    const updateVehicle = async (id, updates) => {
        const res = await api.put(`/vehicles/${id}`, updates);
        setVehicles(vehicles.map(v => v.id === id ? res.data : v));
    };

    const addTrip = async (trip) => {
        const res = await api.post('/trips', trip);
        setTrips([res.data, ...trips]);
        fetchData(); // Refresh to get updated statuses
    };

    const dispatchTrip = async (tripId) => {
        const res = await api.patch(`/trips/${tripId}/dispatch`);
        setTrips(trips.map(t => t.id === tripId ? { ...t, status: 'Dispatched' } : t));
        fetchData();
    };

    const completeTrip = async (tripId, endOdometer, revenue) => {
        const res = await api.post(`/trips/${tripId}/complete`, { end_odometer: endOdometer, revenue });
        setTrips(trips.map(t => t.id === tripId ? { ...t, status: 'Completed', end_odometer: endOdometer, revenue } : t));
        fetchData();
    };

    const cancelTrip = async (tripId) => {
        const res = await api.patch(`/trips/${tripId}/cancel`);
        setTrips(trips.map(t => t.id === tripId ? { ...t, status: 'Cancelled' } : t));
        fetchData();
    };

    const updateTrip = async (tripId, tripData) => {
        const res = await api.put(`/trips/${tripId}`, tripData);
        setTrips(trips.map(t => t.id === tripId ? res.data : t));
        fetchData();
    };

    const deleteTrip = async (tripId) => {
        await api.delete(`/trips/${tripId}`);
        setTrips(trips.filter(t => t.id !== tripId));
    };

    const addMaintenance = async (entry) => {
        const res = await api.post('/maintenance', entry);
        setMaintenance([...maintenance, res.data]);
        fetchData();
    };

    const addFuelLog = async (log) => {
        const res = await api.post('/fuel', log);
        setFuelLogs([...fuelLogs, res.data]);
    };

    return (
        <FleetContext.Provider value={{
            vehicles,
            setVehicles,
            drivers,
            setDrivers,
            trips,
            setTrips,
            maintenance,
            fuelLogs,
            addVehicle,
            updateVehicle,
            addTrip,
            dispatchTrip,
            completeTrip,
            cancelTrip,
            updateTrip,
            deleteTrip,
            addMaintenance,
            addFuelLog,
            fetchVehicles,
            fetchDrivers,
            fetchTrips,
            fetchMaintenance,
            fetchFuelLogs,
            loading
        }}>
            {children}
        </FleetContext.Provider>
    );
};

export const useFleet = () => useContext(FleetContext);
