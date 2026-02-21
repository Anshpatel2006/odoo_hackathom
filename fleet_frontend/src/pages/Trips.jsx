import React, { useState, useEffect } from 'react';
import { useFleet } from '../context/FleetContext';
import { useAuth } from '../context/AuthContext';
import Table from '../components/Table';
import StatusPill from '../components/StatusPill';
import Modal from '../components/Modal';
import { Plus, CheckCircle, XCircle, Navigation, MapPin, Edit2, Trash2, Calendar, Weight, Clock, ArrowRight, Eye, FileCode } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api, { getErrMsg } from '../utils/api';

const Trips = () => {
    const {
        trips, fetchTrips, vehicles, drivers, addTrip,
        dispatchTrip, completeTrip, cancelTrip, updateTrip, deleteTrip
    } = useFleet();
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [finishingTrip, setFinishingTrip] = useState(null);
    const [editingTrip, setEditingTrip] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    // Helper to find vehicle/driver for a trip record
    const tripVeh = (trip) => trip?.vehicles || vehicles.find(v => v.id === trip?.vehicle_id);
    const tripDrv = (trip) => trip?.drivers || drivers.find(d => d.id === trip?.driver_id);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchTrips(searchTerm, statusFilter);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, statusFilter]);

    const [formData, setFormData] = useState({
        vehicleId: '',
        driverId: '',
        cargoWeight: '',
        revenue: '',
        startLoc: '',
        endLoc: '',
        startOdometer: ''
    });

    // Show all vehicles that are not retired or in maintenance
    const availableVehicles = vehicles.filter(v => v.status !== 'Retired' && v.status !== 'In Shop');
    // Show all drivers that are not suspended — let dispatcher choose any active driver
    const availableDrivers = drivers.filter(d => d.status !== 'Suspended');

    const headers = ['Routing', 'Vehicle & Driver', 'Date', 'Cargo', 'Odo / Distance', 'Revenue', 'Status', 'Actions'];

    // Client-side filter — prevents polling from resetting the view
    const filteredTrips = trips
        .filter(trip => {
            const matchesStatus = statusFilter === 'All' || trip.status === statusFilter;
            const term = searchTerm.toLowerCase();
            const vehicle = trip.vehicles || vehicles.find(v => v.id === trip.vehicle_id);
            const driver = trip.drivers || drivers.find(d => d.id === trip.driver_id);
            const matchesSearch = !searchTerm ||
                trip.start_location?.toLowerCase().includes(term) ||
                trip.end_location?.toLowerCase().includes(term) ||
                vehicle?.model?.toLowerCase().includes(term) ||
                vehicle?.license_plate?.toLowerCase().includes(term) ||
                driver?.name?.toLowerCase().includes(term);
            return matchesStatus && matchesSearch;
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const handleExport = () => {
        if (!filteredTrips.length) { toast.error('No trips to export'); return; }
        const rows = [
            ['ID', 'Start', 'End', 'Vehicle', 'Plate', 'Driver', 'Status', 'Date', 'Weight (KG)', 'Revenue'],
            ...filteredTrips.map(t => {
                const v = t.vehicles || vehicles.find(veh => veh.id === t.vehicle_id);
                const d = t.drivers || drivers.find(drv => drv.id === t.driver_id);
                return [
                    t.id.substring(0, 8),
                    t.start_location,
                    t.end_location,
                    v?.model || '—',
                    v?.license_plate || '—',
                    d?.name || '—',
                    t.status,
                    new Date(t.created_at).toLocaleDateString(),
                    t.cargo_weight || 0,
                    t.revenue || 0
                ];
            })
        ];
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `trips-report-${statusFilter}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click(); URL.revokeObjectURL(url);
        toast.success('Trips report downloaded');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Use String comparison since option values and formData.vehicleId are always strings
        const vehicle = vehicles.find(v => String(v.id) === formData.vehicleId);

        if (!vehicle) {
            toast.error('Please select a vehicle');
            return;
        }

        if (formData.cargoWeight && parseInt(formData.cargoWeight) > vehicle.max_capacity) {
            toast.error(`Weight (${formData.cargoWeight}kg) exceeds vehicle capacity (${vehicle.max_capacity}kg)!`);
            return;
        }

        try {
            await addTrip({
                vehicle_id: formData.vehicleId,          // UUID — do NOT parseInt
                driver_id: formData.driverId,            // UUID — do NOT parseInt
                cargo_weight: parseInt(formData.cargoWeight) || 0,
                revenue: parseFloat(formData.revenue) || 0,
                start_location: formData.startLoc,
                end_location: formData.endLoc,
                start_odometer: parseInt(formData.startOdometer) || 0
            });
            toast.success('Trip created as Draft! Click Dispatch on the row to send it out.');
            setIsModalOpen(false);
            setFormData({ vehicleId: '', driverId: '', cargoWeight: '', revenue: '', startLoc: '', endLoc: '', startOdometer: '' });
            fetchTrips(searchTerm, statusFilter);
        } catch (err) {
            toast.error(getErrMsg(err, 'Failed to create trip'));
        }
    };

    const handleComplete = async (e) => {
        e.preventDefault();
        const { id, end_odometer, revenue } = finishingTrip;
        try {
            await completeTrip(id, parseInt(end_odometer), parseFloat(revenue));
            toast.success('Trip completed!');
            setFinishingTrip(null);
        } catch (err) {
            toast.error(getErrMsg(err, 'Failed to complete trip'));
        }
    };

    const handleCancel = async (tripId) => {
        if (!window.confirm('Are you sure you want to cancel this trip?')) return;
        try {
            await cancelTrip(tripId);
            toast.success('Trip cancelled.');
        } catch (err) {
            toast.error(getErrMsg(err, 'Failed to cancel trip'));
        }
    };

    const handleDispatch = async (tripId) => {
        try {
            await dispatchTrip(tripId);
            toast.success('Trip dispatched!');
        } catch (err) {
            toast.error(getErrMsg(err, 'Failed to dispatch trip'));
        }
    };

    const handleUpdateTrip = async (e) => {
        e.preventDefault();
        try {
            await updateTrip(editingTrip.id, {
                vehicle_id: editingTrip.vehicle_id,
                driver_id: editingTrip.driver_id,
                cargo_weight: parseInt(editingTrip.cargo_weight),
                revenue: parseFloat(editingTrip.revenue),
                start_location: editingTrip.start_location,
                end_location: editingTrip.end_location,
                start_odometer: parseInt(editingTrip.start_odometer)
            });
            toast.success('Trip updated!');
            setEditingTrip(null);
        } catch (err) {
            toast.error(getErrMsg(err, 'Failed to update trip'));
        }
    };

    const handleDelete = async (tripId) => {
        if (!window.confirm('Are you sure you want to PERMANENTLY delete this trip record?')) return;
        try {
            await deleteTrip(tripId);
            toast.success('Trip record deleted.');
        } catch (err) {
            toast.error(getErrMsg(err, 'Failed to delete trip'));
        }
    };

    const renderRow = (trip) => {
        const vehicle = tripVeh(trip);
        const driver = tripDrv(trip);
        const distance = trip.end_odometer ? trip.end_odometer - trip.start_odometer : null;

        return (
            <>
                <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col space-y-1">
                        <div className="flex items-center text-sm font-bold text-gray-900">
                            <MapPin className="h-3 w-3 text-red-500 mr-2" /> {trip.start_location}
                        </div>
                        <div className="h-3 border-l border-dashed border-gray-300 ml-1.5 my-0.5"></div>
                        <div className="flex items-center text-sm font-bold text-gray-900">
                            <Navigation className="h-3 w-3 text-primary-500 mr-2" /> {trip.end_location}
                        </div>
                    </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                        <div className="text-sm">
                            <div className="font-bold text-gray-900">{vehicle?.model}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                <span className="font-mono bg-gray-100 px-1 rounded text-[10px]">{vehicle?.license_plate}</span>
                                <span>·</span>
                                <span>{driver?.name}</span>
                            </div>
                        </div>
                    </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        {new Date(trip.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </div>
                    <div className="text-[10px] text-gray-400 flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {new Date(trip.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                        <Weight className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-sm font-bold text-gray-700">{trip.cargo_weight?.toLocaleString()} <small className="text-gray-400">KG</small></span>
                    </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-xs font-bold text-gray-700">
                        {trip.start_odometer?.toLocaleString()}
                        {trip.end_odometer ? (
                            <>
                                <ArrowRight className="inline mx-1 h-2.5 w-2.5 text-gray-300" />
                                {trip.end_odometer?.toLocaleString()}
                            </>
                        ) : ' ...'}
                    </div>
                    {distance != null && (
                        <div className="text-[10px] text-primary-600 font-bold">
                            {distance} KM traveled
                        </div>
                    )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-green-600">
                    ₹{trip.revenue?.toLocaleString() || '0'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <StatusPill status={trip.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
                        {/* Always visible: View Details */}
                        <button
                            className="h-8 w-8 bg-white text-gray-500 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-all border border-gray-200"
                            title="View Trip Details"
                            onClick={() => toast.success(`Viewing Trip ${trip.id.substring(0, 8)}...`)}
                        >
                            <Eye className="h-3.5 w-3.5" />
                        </button>

                        {/* Dispatcher specific actions: Dispatch, Edit, Finish */}
                        {user?.role?.toLowerCase() === 'dispatcher' && (
                            <>
                                {trip.status === 'Draft' && (
                                    <>
                                        <button
                                            onClick={() => handleDispatch(trip.id)}
                                            className="h-8 px-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center text-xs font-bold transition-all shadow-sm"
                                            title="Dispatch Now"
                                        >
                                            <Navigation className="h-3.5 w-3.5 mr-1" /> Dispatch
                                        </button>
                                        <button
                                            onClick={() => setEditingTrip({ ...trip, end_odometer: '', revenue: trip.revenue || '' })}
                                            className="h-8 w-8 bg-white text-gray-600 rounded-lg hover:bg-gray-50 flex items-center justify-center transition-all border border-gray-200"
                                            title="Edit Draft"
                                        >
                                            <Edit2 className="h-3.5 w-3.5" />
                                        </button>
                                    </>
                                )}
                                {trip.status === 'Dispatched' && (
                                    <button
                                        onClick={() => setFinishingTrip({ ...trip, end_odometer: '', revenue: trip.revenue || '' })}
                                        className="h-8 px-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center text-xs font-bold transition-all shadow-sm"
                                        title="Finish Trip"
                                    >
                                        <CheckCircle className="h-3.5 w-3.5 mr-1" /> Finish
                                    </button>
                                )}
                            </>
                        )}

                        {/* Cancel Action: Dispatcher only */}
                        {(trip.status === 'Draft' || trip.status === 'Dispatched') &&
                            user?.role?.toLowerCase() === 'dispatcher' && (
                                <button
                                    onClick={() => handleCancel(trip.id)}
                                    className="h-8 w-8 bg-white text-red-600 rounded-lg hover:bg-red-50 flex items-center justify-center transition-all border border-red-100"
                                    title="Cancel Trip"
                                >
                                    <XCircle className="h-3.5 w-3.5" />
                                </button>
                            )}

                        {/* Delete: Dispatcher only */}
                        {user?.role?.toLowerCase() === 'dispatcher' && (
                            <button
                                onClick={() => handleDelete(trip.id)}
                                className="h-8 w-8 bg-white text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-all border border-gray-100"
                                title="Delete Permanently"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </td>
            </>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100">
                <div className="flex flex-1 gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by driver or vehicle..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="p-2 px-4 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500 text-sm font-bold text-gray-600"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="All">All Status</option>
                        <option value="Draft">Draft</option>
                        <option value="Dispatched">Dispatched</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>
                </div>
                <div className="flex gap-2">
                    {['fleet manager', 'financial analyst'].includes(user?.role?.toLowerCase()) && (
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all text-sm"
                        >
                            <FileCode className="h-4 w-4" /> Download Report
                        </button>
                    )}
                    {user?.role?.toLowerCase() === 'dispatcher' && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center px-4 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 text-sm"
                        >
                            <Plus className="h-5 w-5 mr-1" />
                            New Trip
                        </button>
                    )}
                </div>
            </div>

            <Table headers={headers} data={filteredTrips} renderRow={renderRow} />

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Dispatch New Trip">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Select Vehicle</label>
                            <select
                                required
                                className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                value={formData.vehicleId}
                                onChange={e => {
                                    const vid = e.target.value;
                                    const veh = vehicles.find(v => String(v.id) === vid);
                                    setFormData(prev => ({ ...prev, vehicleId: vid, startOdometer: veh?.odometer != null ? String(veh.odometer) : '' }));
                                }}
                            >
                                <option value="">Choose a vehicle...</option>
                                {availableVehicles.map(v => (
                                    <option key={v.id} value={String(v.id)}>
                                        {v.model} ({v.license_plate}) — {v.max_capacity}kg · {v.status}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Select Driver</label>
                            <select
                                required
                                className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                value={formData.driverId}
                                onChange={e => setFormData(prev => ({ ...prev, driverId: e.target.value }))}
                            >
                                <option value="">Choose a driver...</option>
                                {availableDrivers.map(d => (
                                    <option key={d.id} value={String(d.id)}>
                                        {d.name} — Safety: {d.safety_score ?? 'N/A'}% | {d.license_category} | {d.region}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Cargo Weight (kg)</label>
                            <input
                                required type="number"
                                className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                value={formData.cargoWeight}
                                onChange={e => setFormData(prev => ({ ...prev, cargoWeight: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Est. Revenue (₹)</label>
                            <input
                                type="number"
                                className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                placeholder="Optional"
                                value={formData.revenue}
                                onChange={e => setFormData(prev => ({ ...prev, revenue: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">प्रारंभिक ओडोमीटर (किमी)</label>
                            <input
                                type="number"
                                className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                placeholder="Auto-filled from vehicle"
                                value={formData.startOdometer}
                                onChange={e => setFormData(prev => ({ ...prev, startOdometer: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Start Location</label>
                            <input
                                required
                                className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                placeholder="City, State"
                                value={formData.startLoc}
                                onChange={e => setFormData(prev => ({ ...prev, startLoc: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">End Location</label>
                            <input
                                required
                                className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                placeholder="City, State"
                                value={formData.endLoc}
                                onChange={e => setFormData(prev => ({ ...prev, endLoc: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div className="pt-6">
                        <button
                            type="submit"
                            className="w-full py-4 bg-primary-600 text-white font-black rounded-xl hover:bg-primary-700 transition-all shadow-xl shadow-primary-100 uppercase tracking-widest flex items-center justify-center"
                        >
                            <Navigation className="h-5 w-5 mr-2" /> Dispatch Trip
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Finish Trip Modal */}
            <Modal isOpen={!!finishingTrip} onClose={() => setFinishingTrip(null)} title="Complete Trip">
                <form onSubmit={handleComplete} className="space-y-4">
                    <div className="bg-primary-50 p-3 rounded-lg flex items-start gap-3 mb-4">
                        <MapPin className="h-5 w-5 text-primary-600 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-gray-900">{finishingTrip?.start_location} → {finishingTrip?.end_location}</p>
                            <p className="text-xs text-gray-500">Start Odometer: {finishingTrip?.start_odometer} km</p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">End Odometer (km)</label>
                        <input
                            required type="number"
                            min={finishingTrip?.start_odometer}
                            className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                            value={finishingTrip?.end_odometer || ''}
                            onChange={e => setFinishingTrip({ ...finishingTrip, end_odometer: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Final Revenue (₹)</label>
                        <input
                            required type="number"
                            className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                            value={finishingTrip?.revenue || ''}
                            onChange={e => setFinishingTrip({ ...finishingTrip, revenue: e.target.value })}
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-4 bg-green-600 text-white font-black rounded-xl hover:bg-green-700 transition-all shadow-xl shadow-green-100 uppercase tracking-widest mt-4"
                    >
                        Confirm Completion
                    </button>
                </form>
            </Modal>

            {/* Edit Trip Modal */}
            <Modal isOpen={!!editingTrip} onClose={() => setEditingTrip(null)} title="Edit Trip Details">
                {editingTrip && (
                    <form onSubmit={handleUpdateTrip} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Vehicle</label>
                                <select
                                    disabled
                                    className="w-full p-3 bg-gray-100 border-none rounded-lg text-gray-500 cursor-not-allowed"
                                    value={editingTrip.vehicle_id}
                                >
                                    <option value={editingTrip.vehicle_id}>
                                        {tripVeh(editingTrip)?.model} ({tripVeh(editingTrip)?.license_plate})
                                    </option>
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Driver</label>
                                <select
                                    className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                    value={editingTrip.driver_id}
                                    onChange={e => setEditingTrip({ ...editingTrip, driver_id: e.target.value })}
                                >
                                    {drivers.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Cargo Weight (kg)</label>
                                <input
                                    required type="number"
                                    className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                    value={editingTrip.cargo_weight}
                                    onChange={e => setEditingTrip({ ...editingTrip, cargo_weight: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Revenue (₹)</label>
                                <input
                                    required type="number"
                                    className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                    value={editingTrip.revenue}
                                    onChange={e => setEditingTrip({ ...editingTrip, revenue: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Start Odometer (km)</label>
                                <input
                                    required type="number"
                                    className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                    value={editingTrip.start_odometer}
                                    onChange={e => setEditingTrip({ ...editingTrip, start_odometer: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Start Location</label>
                                <input
                                    required
                                    className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                    value={editingTrip.start_location}
                                    onChange={e => setEditingTrip({ ...editingTrip, start_location: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">End Location</label>
                                <input
                                    required
                                    className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                    value={editingTrip.end_location}
                                    onChange={e => setEditingTrip({ ...editingTrip, end_location: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="pt-6">
                            <button
                                type="submit"
                                className="w-full py-4 bg-primary-600 text-white font-black rounded-xl hover:bg-primary-700 transition-all shadow-xl shadow-primary-100 uppercase tracking-widest"
                            >
                                Save Updates
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default Trips;
