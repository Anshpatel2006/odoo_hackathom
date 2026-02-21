import React, { useState, useEffect } from 'react';
import { useFleet } from '../context/FleetContext';
import { useAuth } from '../context/AuthContext';
import Table from '../components/Table';
import Modal from '../components/Modal';
import { Plus, Fuel, Droplet, DollarSign, PieChart, Calendar, FileCode, Zap } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api, { getErrMsg } from '../utils/api';

const Expenses = () => {
    const { fuelLogs, fetchFuelLogs, vehicles, addFuelLog } = useFleet();
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [vehicleFilter, setVehicleFilter] = useState('All');
    const [monthFilter, setMonthFilter] = useState('All');
    const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchFuelLogs(searchTerm);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const [formData, setFormData] = useState({
        vehicle_id: '',
        liters: '',
        cost: '',
        date: new Date().toISOString().split('T')[0]
    });

    const headers = ['Vehicle', 'Liters', 'Cost per unit', 'Total Cost', 'Date'];

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await addFuelLog({
                vehicle_id: formData.vehicle_id,         // UUID — do NOT parseInt
                liters: parseFloat(formData.liters),
                cost: parseFloat(formData.cost),
                date: formData.date
            });
            toast.success('Fuel log recorded successfully.');
            setIsModalOpen(false);
            setFormData({ vehicle_id: '', liters: '', cost: '', date: new Date().toISOString().split('T')[0] });
        } catch (err) {
            toast.error(getErrMsg(err, 'Failed to record fuel log'));
        }
    };

    // Derive distinct vehicles that have fuel logs
    const vehiclesWithLogs = vehicles.filter(v =>
        fuelLogs.some(l => String(l.vehicle_id) === String(v.id))
    );

    // Client-side filter + sort newest first
    const filteredFuelLogs = fuelLogs
        .filter(item => {
            const vehicle = item.vehicles || vehicles.find(v => String(v.id) === String(item.vehicle_id));
            const matchesVehicle = vehicleFilter === 'All' || String(item.vehicle_id) === vehicleFilter;

            const logDate = new Date(item.date);
            const matchesMonth = monthFilter === 'All' || (logDate.getMonth() + 1).toString() === monthFilter;
            const matchesYear = yearFilter === 'All' || logDate.getFullYear().toString() === yearFilter;

            const term = searchTerm.toLowerCase();
            const matchesSearch = !searchTerm ||
                vehicle?.model?.toLowerCase().includes(term) ||
                vehicle?.license_plate?.toLowerCase().includes(term);

            return matchesVehicle && matchesSearch && matchesMonth && matchesYear;
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    const handleExport = () => {
        if (!filteredFuelLogs.length) { toast.error('No data to export'); return; }
        const rows = [
            ['Vehicle', 'Liters', 'Cost per unit', 'Total Cost', 'Date'],
            ...filteredFuelLogs.map(item => {
                const vehicle = vehicles.find(v => v.id === item.vehicle_id);
                return [
                    `${vehicle?.model} (${vehicle?.license_plate})`,
                    item.liters,
                    item.cost,
                    (item.liters * item.cost).toFixed(2),
                    item.date
                ];
            })
        ];
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `fuel-expenses-${monthFilter}-${yearFilter}.csv`;
        a.click(); URL.revokeObjectURL(url);
        toast.success('Report downloaded');
    };

    const handleProExport = async () => {
        try {
            const res = await api.get('/analytics/export');
            const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `pro-report-${new Date().toISOString().slice(0, 10)}.json`;
            a.click(); URL.revokeObjectURL(url);
            toast.success('Professional report downloaded (JSON)');
        } catch (error) {
            toast.error('Failed to download professional report');
        }
    };

    const renderRow = (item) => {
        const vehicle = vehicles.find(v => v.id === item.vehicle_id);
        const totalCost = item.liters * item.cost;
        return (
            <>
                <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">{vehicle?.model}</div>
                    <div className="text-xs text-gray-500">{vehicle?.license_plate}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {item.liters} L
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    ₹{item.cost}/L
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary-600">
                    ₹{totalCost.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.date}
                </td>
            </>
        );
    };

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-primary-600 p-6 rounded-2xl text-white shadow-xl shadow-primary-200 relative overflow-hidden">
                    <PieChart className="absolute -right-4 -bottom-4 h-24 w-24 opacity-10" />
                    <h4 className="text-primary-100 text-sm font-bold uppercase tracking-widest">Total Fuel Spend</h4>
                    <p className="text-3xl font-black mt-2">
                        ₹{filteredFuelLogs.reduce((sum, l) => sum + (l.liters * l.cost), 0).toLocaleString()}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm col-span-2 flex items-center justify-between">
                    <div>
                        <h4 className="text-gray-400 text-xs font-bold uppercase tracking-widest">Fleet Fuel Summary</h4>
                        <p className="text-gray-600 text-sm mt-1 max-w-md">
                            {fuelLogs.length > 0
                                ? `${fuelLogs.length} fuel log${fuelLogs.length !== 1 ? 's' : ''} recorded across ${[...new Set(fuelLogs.map(l => l.vehicle_id))].length} vehicle${[...new Set(fuelLogs.map(l => l.vehicle_id))].length !== 1 ? 's' : ''}.`
                                : 'No fuel logs recorded yet. Use "Add Fuel Log" to start tracking.'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {['fleet manager', 'financial analyst'].includes(user?.role?.toLowerCase()) && (
                            <button
                                onClick={handleProExport}
                                className="flex items-center px-4 py-2.5 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all text-sm shadow-md shadow-primary-100"
                            >
                                <Zap className="h-4 w-4 mr-2" />
                                Pro Report
                            </button>
                        )}
                        <button
                            onClick={handleExport}
                            className="flex items-center px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all text-sm"
                        >
                            <FileCode className="h-4 w-4 mr-2" />
                            Export Report
                        </button>
                        {user?.role?.toLowerCase() === 'financial analyst' && (
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center px-4 py-3 bg-gray-900 text-white font-black rounded-xl hover:bg-black transition-all shadow-lg text-sm"
                            >
                                <Plus className="h-5 w-5 mr-2" />
                                Add Fuel Log
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100">
                <div className="flex flex-1 gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                        <Fuel className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by vehicle model or plate..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="p-2 px-4 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500 text-sm font-bold text-gray-600"
                        value={vehicleFilter}
                        onChange={e => setVehicleFilter(e.target.value)}
                    >
                        <option value="All">All Vehicles</option>
                        {vehiclesWithLogs.map(v => (
                            <option key={v.id} value={String(v.id)}>{v.model} ({v.license_plate})</option>
                        ))}
                    </select>
                    <div className="flex gap-2">
                        <select
                            className="p-2 px-4 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500 text-sm font-bold text-gray-600"
                            value={monthFilter}
                            onChange={e => setMonthFilter(e.target.value)}
                        >
                            <option value="All">All Months</option>
                            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                                <option key={m} value={(i + 1).toString()}>{m}</option>
                            ))}
                        </select>
                        <select
                            className="p-2 px-4 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500 text-sm font-bold text-gray-600"
                            value={yearFilter}
                            onChange={e => setYearFilter(e.target.value)}
                        >
                            <option value="All">All Years</option>
                            {[2024, 2025, 2026].map(y => (
                                <option key={y} value={y.toString()}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <Table headers={headers} data={filteredFuelLogs} renderRow={renderRow} />

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record Fuel Log">
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
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Liters (L)</label>
                                <div className="relative">
                                    <Droplet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        required type="number" step="0.01"
                                        className="w-full pl-10 p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                        value={formData.liters}
                                        onChange={e => setFormData({ ...formData, liters: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Cost per Liter (₹)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 font-bold">₹</span>
                                    <input
                                        required type="number" step="0.01"
                                        className="w-full pl-10 p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                        value={formData.cost}
                                        onChange={e => setFormData({ ...formData, cost: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Date</label>
                            <input
                                required type="date"
                                className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="pt-6">
                        <button
                            type="submit"
                            className="w-full py-4 bg-primary-600 text-white font-black rounded-xl hover:bg-primary-700 transition-all shadow-xl shadow-primary-100 uppercase tracking-widest flex items-center justify-center"
                        >
                            <Fuel className="h-5 w-5 mr-2" /> Confirm Fuel Log
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Expenses;
