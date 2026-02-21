import React, { useState, useEffect } from 'react';
import { useFleet } from '../context/FleetContext';
import { useAuth } from '../context/AuthContext';
import Table from '../components/Table';
import StatusPill from '../components/StatusPill';
import Modal from '../components/Modal';
import { Plus, Edit2, Trash2, Search, Truck } from 'lucide-react';
import { toast } from 'react-hot-toast';

const Vehicles = () => {
    const { vehicles, fetchVehicles, addVehicle, updateVehicle } = useFleet();
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editVehicle, setEditVehicle] = useState(null);   // vehicle being edited
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [regionFilter, setRegionFilter] = useState('All');

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchVehicles(searchTerm);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const [formData, setFormData] = useState({
        model: '',
        license_plate: '',
        max_capacity: '',
        odometer: '',
        acquisition_cost: '',
        region: 'North',
        vehicle_type: 'Truck',
    });

    const VEHICLE_TYPES = ['Truck', 'Van', 'Pickup', 'Tanker', 'Trailer', 'Bus'];

    const headers = ['Model', 'License Plate', 'Capacity', 'Odometer', 'Status', 'Actions'];

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Send only the exact fields the backend expects — no stray keys
            await addVehicle({
                model: formData.model.trim(),
                license_plate: formData.license_plate.trim().toUpperCase(),
                max_capacity: parseInt(formData.max_capacity) || 0,
                odometer: parseInt(formData.odometer) || 0,
                acquisition_cost: parseFloat(formData.acquisition_cost) || 0,
                region: formData.region,
                vehicle_type: formData.vehicle_type,
            });
            toast.success('Vehicle registered successfully!');
            setIsModalOpen(false);
            setFormData({ model: '', license_plate: '', max_capacity: '', odometer: '', acquisition_cost: '', region: 'North', vehicle_type: 'Truck' });
        } catch (err) {
            const msg = err?.response?.data?.error || 'Failed to add vehicle';
            toast.error(msg);
        }
    };

    /* ── Edit handlers ── */
    const openEdit = (vehicle) => {
        setEditVehicle({
            id: vehicle.id,
            model: vehicle.model || '',
            license_plate: vehicle.license_plate || '',
            max_capacity: vehicle.max_capacity ?? '',
            odometer: vehicle.odometer ?? '',
            acquisition_cost: vehicle.acquisition_cost ?? '',
            region: vehicle.region || 'North',
            vehicle_type: vehicle.vehicle_type || 'Truck',
            status: vehicle.status || 'Available',
        });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateVehicle(editVehicle.id, {
                model: editVehicle.model.trim(),
                license_plate: editVehicle.license_plate.trim().toUpperCase(),
                max_capacity: parseInt(editVehicle.max_capacity) || 0,
                odometer: parseInt(editVehicle.odometer) || 0,
                acquisition_cost: parseFloat(editVehicle.acquisition_cost) || 0,
                region: editVehicle.region,
                vehicle_type: editVehicle.vehicle_type,
                status: editVehicle.status,
            });
            toast.success('Vehicle updated successfully!');
            setEditVehicle(null);
        } catch (err) {
            const msg = err?.response?.data?.error || 'Failed to update vehicle';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    // Derive distinct regions from live vehicle data
    const regionOptions = [...new Set([
        ...vehicles.map(v => v.region).filter(Boolean),
        'North', 'South', 'East', 'West'
    ])].sort();

    const STATUS_OPTIONS = ['Available', 'On Trip', 'In Shop', 'Retired'];

    // Client-side filter + sort
    const filteredVehicles = vehicles
        .filter(v => {
            const matchesStatus = statusFilter === 'All' || v.status === statusFilter;
            const matchesRegion = regionFilter === 'All' || v.region === regionFilter;
            const term = searchTerm.toLowerCase();
            const matchesSearch = !searchTerm ||
                v.model?.toLowerCase().includes(term) ||
                v.license_plate?.toLowerCase().includes(term) ||
                v.region?.toLowerCase().includes(term);
            return matchesStatus && matchesRegion && matchesSearch;
        });

    const renderRow = (vehicle) => (
        <>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0 rounded bg-primary-50 flex items-center justify-center">
                        <Truck className="h-5 w-5 text-primary-400" />
                    </div>
                    <div className="ml-4">
                        <div className="text-sm font-semibold text-gray-900">{vehicle.model}</div>
                        <div className="text-xs text-gray-500">{vehicle.region} Region</div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-mono text-gray-900 font-bold">{vehicle.license_plate}</div>
                {vehicle.status === 'On Trip' && vehicle.current_lat && (
                    <div className="text-[10px] text-primary-500 mt-1">
                        📍 {vehicle.current_lat.toFixed(4)}, {vehicle.current_lng.toFixed(4)}
                    </div>
                )}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {(vehicle.max_capacity / 1000).toFixed(1)}t
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {vehicle.odometer?.toLocaleString()} km
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <StatusPill status={vehicle.status} />
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                {user?.role?.toLowerCase() === 'fleet manager' && (
                    <button
                        onClick={() => openEdit(vehicle)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                    >
                        <Edit2 className="h-3.5 w-3.5" /> Edit
                    </button>
                )}
            </td>
        </>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100">
                <div className="flex flex-1 gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[180px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search vehicles..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="p-2 px-4 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500 text-sm font-bold text-gray-600"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="All">All Status</option>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select
                        className="p-2 px-4 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500 text-sm font-bold text-gray-600"
                        value={regionFilter}
                        onChange={e => setRegionFilter(e.target.value)}
                    >
                        <option value="All">All Regions</option>
                        {regionOptions.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
                {user?.role?.toLowerCase() === 'fleet manager' && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center px-4 py-2 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-200"
                    >
                        <Plus className="h-5 w-5 mr-2" />
                        Add Vehicle
                    </button>
                )}
            </div>

            <Table headers={headers} data={filteredVehicles} renderRow={renderRow} />

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register New Vehicle">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-1">Basic Info</div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Model</label>
                            <input
                                required
                                className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                placeholder="e.g. Volvo FH16"
                                value={formData.model}
                                onChange={e => setFormData({ ...formData, model: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">License Plate</label>
                            <input
                                required
                                className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500 font-mono uppercase"
                                placeholder="MH12AB1234"
                                value={formData.license_plate}
                                onChange={e => setFormData({ ...formData, license_plate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Region</label>
                            <select
                                className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                value={formData.region}
                                onChange={e => setFormData({ ...formData, region: e.target.value })}
                            >
                                {regionOptions.map(r => (
                                    <option key={r}>{r}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-span-2 text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-1 mt-4">Specifications</div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Vehicle Type</label>
                            <select
                                className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                value={formData.vehicle_type}
                                onChange={e => setFormData({ ...formData, vehicle_type: e.target.value })}
                            >
                                {VEHICLE_TYPES.map(t => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Capacity (kg)</label>
                            <input
                                required type="number" min="0"
                                className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                placeholder="e.g. 5000"
                                value={formData.max_capacity}
                                onChange={e => setFormData({ ...formData, max_capacity: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Odometer (km)</label>
                            <input
                                required type="number" min="0"
                                className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                placeholder="e.g. 0"
                                value={formData.odometer}
                                onChange={e => setFormData({ ...formData, odometer: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Acquisition Cost (₹)</label>
                            <input
                                type="number" min="0" step="0.01"
                                className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                placeholder="e.g. 1500000"
                                value={formData.acquisition_cost}
                                onChange={e => setFormData({ ...formData, acquisition_cost: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="pt-6">
                        <button
                            type="submit"
                            className="w-full py-4 bg-primary-600 text-white font-black rounded-xl hover:bg-primary-700 transition-all shadow-xl shadow-primary-100 uppercase tracking-widest"
                        >
                            Confirm Registration
                        </button>
                    </div>
                </form>
            </Modal>
            {/* ── Edit Vehicle Modal ── */}
            <Modal isOpen={!!editVehicle} onClose={() => setEditVehicle(null)} title="Edit Vehicle">
                {editVehicle && (
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-1">Basic Info</div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Model</label>
                                <input
                                    required
                                    className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                    value={editVehicle.model}
                                    onChange={e => setEditVehicle({ ...editVehicle, model: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">License Plate</label>
                                <input
                                    required
                                    className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500 font-mono uppercase"
                                    value={editVehicle.license_plate}
                                    onChange={e => setEditVehicle({ ...editVehicle, license_plate: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Region</label>
                                <select
                                    className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                    value={editVehicle.region}
                                    onChange={e => setEditVehicle({ ...editVehicle, region: e.target.value })}
                                >
                                    {regionOptions.map(r => <option key={r}>{r}</option>)}
                                </select>
                            </div>
                            <div className="col-span-2 text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-1 mt-2">Specifications</div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Vehicle Type</label>
                                <select
                                    className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                    value={editVehicle.vehicle_type}
                                    onChange={e => setEditVehicle({ ...editVehicle, vehicle_type: e.target.value })}
                                >
                                    {VEHICLE_TYPES.map(t => <option key={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Status</label>
                                <select
                                    className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                    value={editVehicle.status}
                                    onChange={e => setEditVehicle({ ...editVehicle, status: e.target.value })}
                                >
                                    {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Capacity (kg)</label>
                                <input
                                    required type="number" min="0"
                                    className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                    value={editVehicle.max_capacity}
                                    onChange={e => setEditVehicle({ ...editVehicle, max_capacity: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Odometer (km)</label>
                                <input
                                    required type="number" min="0"
                                    className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                    value={editVehicle.odometer}
                                    onChange={e => setEditVehicle({ ...editVehicle, odometer: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Acquisition Cost (₹)</label>
                                <input
                                    type="number" min="0" step="0.01"
                                    className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                    value={editVehicle.acquisition_cost}
                                    onChange={e => setEditVehicle({ ...editVehicle, acquisition_cost: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="pt-4 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setEditVehicle(null)}
                                className="flex-1 py-3 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex-1 py-3 bg-primary-600 text-white font-black rounded-xl hover:bg-primary-700 transition-all disabled:opacity-60 uppercase tracking-widest"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default Vehicles;
