import React, { useState, useEffect } from 'react';
import { useFleet } from '../context/FleetContext';
import { useAuth } from '../context/AuthContext';
import Table from '../components/Table';
import Modal from '../components/Modal';
import { Plus, Wrench, Calendar, DollarSign } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getErrMsg } from '../utils/api';

const Maintenance = () => {
    const { maintenance, fetchMaintenance, vehicles, addMaintenance } = useFleet();
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('All');

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchMaintenance(searchTerm, typeFilter);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, typeFilter]);

    const [formData, setFormData] = useState({
        vehicle_id: '',
        service_type: 'Routine Inspection',
        cost: '',
        service_date: new Date().toISOString().split('T')[0]
    });

    const headers = ['Vehicle', 'Service Type', 'Cost', 'Date'];

    // Derive distinct service types from live DB data, with fallback seeds
    const SEED_TYPES = ['Routine Inspection', 'Engine Repair', 'Tire Replacement', 'Oil Change', 'Brake Service'];
    const serviceTypeOptions = [
        ...new Set([
            ...SEED_TYPES,
            ...maintenance.map(m => m.service_type).filter(Boolean)
        ])
    ].sort();

    // Client-side filter + always sort newest date first
    const filteredMaintenance = maintenance
        .filter(m => {
            const matchesType = typeFilter === 'All' || m.service_type === typeFilter;
            const term = searchTerm.toLowerCase();
            const matchesSearch = !searchTerm ||
                m.service_type?.toLowerCase().includes(term) ||
                m.vehicles?.model?.toLowerCase().includes(term) ||
                m.vehicles?.license_plate?.toLowerCase().includes(term) ||
                vehicles.find(v => v.id === m.vehicle_id)?.model?.toLowerCase().includes(term);
            return matchesType && matchesSearch;
        })
        .sort((a, b) => new Date(b.service_date) - new Date(a.service_date));

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await addMaintenance({
                vehicle_id: formData.vehicle_id,         // UUID — do NOT parseInt
                service_type: formData.service_type,
                cost: parseFloat(formData.cost),
                service_date: formData.service_date
            });
            toast.success('Maintenance log added. Vehicle moved to In Shop status.');
            setIsModalOpen(false);
            setFormData({ vehicle_id: '', service_type: 'Routine Inspection', cost: '', service_date: new Date().toISOString().split('T')[0] });
        } catch (err) {
            toast.error(getErrMsg(err, 'Failed to add maintenance log'));
        }
    };

    const renderRow = (item) => {
        // Use joined vehicle data from API if available, else fall back to context find
        const vehicle = item.vehicles || vehicles.find(v => String(v.id) === String(item.vehicle_id));
        return (
            <>
                <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">{vehicle?.model}</div>
                    <div className="text-xs text-gray-500">{vehicle?.license_plate}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs font-bold uppercase">{item.service_type}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">
                    ₹{item.cost.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.service_date}
                </td>
            </>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100">
                <div className="flex flex-1 gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Wrench className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by vehicle or service..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="p-2 px-4 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500 text-sm font-bold text-gray-600"
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                    >
                        <option value="All">All Types</option>
                        {serviceTypeOptions.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>
                {user?.role?.toLowerCase() === 'fleet manager' && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center px-4 py-2 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-200"
                    >
                        <Plus className="h-5 w-5 mr-2" />
                        Log Maintenance
                    </button>
                )}
            </div>

            <Table headers={headers} data={filteredMaintenance} renderRow={renderRow} />

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Maintenance Record">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Vehicle</label>
                            <select
                                required
                                className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                value={formData.vehicle_id}
                                onChange={e => setFormData({ ...formData, vehicle_id: e.target.value })}
                            >
                                <option value="">Select Vehicle...</option>
                                {vehicles.map(v => (
                                    <option key={v.id} value={v.id}>{v.model} ({v.license_plate}) — {v.status}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Service Type</label>
                            <select
                                className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                value={formData.service_type}
                                onChange={e => setFormData(prev => ({ ...prev, service_type: e.target.value }))}
                            >
                                {serviceTypeOptions.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Cost (₹)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 font-bold">₹</span>
                                    <input
                                        required type="number"
                                        className="w-full pl-10 p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                        value={formData.cost}
                                        onChange={e => setFormData({ ...formData, cost: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        required type="date"
                                        className="w-full pl-10 p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                        value={formData.service_date}
                                        onChange={e => setFormData({ ...formData, service_date: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="pt-6">
                        <button
                            type="submit"
                            className="w-full py-4 bg-primary-600 text-white font-black rounded-xl hover:bg-primary-700 transition-all shadow-xl shadow-primary-100 uppercase tracking-widest flex items-center justify-center"
                        >
                            <Wrench className="h-5 w-5 mr-2" /> Save Maintenance Log
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Maintenance;
