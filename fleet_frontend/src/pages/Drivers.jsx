import React, { useState, useEffect } from 'react';
import { useFleet } from '../context/FleetContext';
import { useAuth } from '../context/AuthContext';
import Table from '../components/Table';
import StatusPill from '../components/StatusPill';
import KPIcard from '../components/KPIcard';
import Modal from '../components/Modal';
import { Search, Award, ShieldAlert, Zap, Plus, UserCheck, Edit2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api, { getErrMsg } from '../utils/api';

const Drivers = () => {
    const { drivers, fetchDrivers, vehicles } = useFleet();
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [regionFilter, setRegionFilter] = useState('All');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingDriver, setEditingDriver] = useState(null);
    const [formData, setFormData] = useState({
        name: '', license_number: '', license_category: 'Heavy',
        expiry_date: '', safety_score: 80, region: 'North'
    });

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchDrivers(searchTerm);
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const headers = ['Driver Info', 'Compliance/Expiry', 'Safety & Performance', 'Status', 'Actions'];

    // Derive distinct values from live DB data
    const regionOptions = [...new Set([
        ...vehicles.map(v => v.region).filter(Boolean),
        ...drivers.map(d => d.region).filter(Boolean),
        'North', 'South', 'East', 'West'
    ])].sort();

    const licenseCategories = [...new Set([
        ...drivers.map(d => d.license_category).filter(Boolean),
        'Heavy', 'Light', 'Medium'
    ])].sort();

    const DRIVER_STATUSES = ['Available', 'On Duty', 'Off Duty', 'Suspended'];

    // Client-side filter — polling-safe
    const filteredDrivers = drivers.filter(d => {
        const matchesStatus = statusFilter === 'All' || d.status === statusFilter;
        const matchesRegion = regionFilter === 'All' || d.region === regionFilter;
        const term = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm ||
            d.name?.toLowerCase().includes(term) ||
            d.license_number?.toLowerCase().includes(term) ||
            d.license_category?.toLowerCase().includes(term) ||
            d.region?.toLowerCase().includes(term) ||
            d.status?.toLowerCase().includes(term);
        return matchesStatus && matchesRegion && matchesSearch;
    });

    const isExpiringSoon = (date) => {
        if (!date) return false;
        const expiry = new Date(date);
        const now = new Date();
        const diff = (expiry - now) / (1000 * 60 * 60 * 24);
        return diff < 30;
    };

    const isExpired = (date) => {
        if (!date) return false;
        return new Date(date) < new Date();
    };

    const getComplianceCount = () => drivers.filter(d => isExpired(d.expiry_date)).length;

    const handleAddDriver = async (e) => {
        e.preventDefault();
        try {
            if (editingDriver) {
                await api.put(`/drivers/${editingDriver.id}`, formData);
                toast.success('Driver updated successfully!');
            } else {
                await api.post('/drivers', formData);
                toast.success('Driver added successfully!');
            }
            setIsAddModalOpen(false);
            setEditingDriver(null);
            fetchDrivers(searchTerm);
            setFormData({ name: '', license_number: '', license_category: 'Heavy', expiry_date: '', safety_score: 80, region: 'North' });
        } catch (err) {
            toast.error(getErrMsg(err, `Failed to ${editingDriver ? 'update' : 'add'} driver`));
        }
    };

    const handleEdit = (driver) => {
        setEditingDriver(driver);
        setFormData({
            name: driver.name,
            license_number: driver.license_number,
            license_category: driver.license_category,
            expiry_date: driver.expiry_date,
            safety_score: driver.safety_score || 80,
            region: driver.region || 'North'
        });
        setIsAddModalOpen(true);
    };

    const handleStatusChange = async (driverId, newStatus) => {
        try {
            await api.patch(`/drivers/${driverId}/status`, { status: newStatus });
            toast.success(`Driver status updated to ${newStatus}`);
            fetchDrivers(searchTerm);
        } catch (err) {
            toast.error(getErrMsg(err, 'Failed to update status'));
        }
    };

    const canChangeStatus = user?.role?.toLowerCase() === 'safety officer';

    const renderRow = (driver) => (
        <>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
                        {driver.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="ml-4">
                        <div className="text-sm font-semibold text-gray-900">{driver.name}</div>
                        <div className="text-xs text-gray-500">{driver.region} Region</div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="space-y-1">
                    <div className="text-xs font-mono text-gray-700">{driver.license_number}</div>
                    <div className={`text-xs font-bold ${isExpired(driver.expiry_date) ? 'text-red-600' : isExpiringSoon(driver.expiry_date) ? 'text-yellow-600' : 'text-gray-500'}`}>
                        {isExpired(driver.expiry_date) ? '⚠ EXPIRED' : isExpiringSoon(driver.expiry_date) ? '⚠ Expiring Soon' : '✓'} {driver.expiry_date}
                    </div>
                    <div className="text-xs text-gray-400 uppercase">{driver.license_category}</div>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="space-y-2">
                    <div className="flex items-center justify-between min-w-[180px]">
                        <span className="text-[10px] uppercase font-bold text-gray-400">Activity & Success</span>
                        <span className="text-xs font-bold text-gray-700">{driver.total_trips || 0} Trips · {driver.completion_rate ?? 0}% Success</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-gray-400">Safety Score</span>
                        <span className="text-xs font-bold text-green-600">{driver.safety_score ?? 80}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1">
                        <div
                            className={`h-1 rounded-full ${driver.safety_score >= 90 ? 'bg-green-500' : driver.safety_score >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${driver.safety_score || 80}%` }}
                        ></div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <StatusPill status={driver.status} />
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm">
                <div className="flex items-center gap-2">
                    {canChangeStatus && (
                        <>
                            <select
                                className="text-xs p-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-400 font-medium"
                                value={driver.status}
                                onChange={(e) => handleStatusChange(driver.id, e.target.value)}
                            >
                                <option>Available</option>
                                <option>On Duty</option>
                                <option>Off Duty</option>
                                <option>Suspended</option>
                            </select>
                            <button
                                onClick={() => handleEdit(driver)}
                                className="p-1.5 bg-white text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all border border-gray-100"
                                title="Edit Driver Details"
                            >
                                <Edit2 className="h-3.5 w-3.5" />
                            </button>
                        </>
                    )}
                    {!canChangeStatus && <span className="text-xs text-gray-400">—</span>}
                </div>
            </td>
        </>
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPIcard
                    title="Avg Safety Score"
                    value={`${drivers.length > 0 ? Math.round(drivers.reduce((acc, d) => acc + (d.safety_score || 0), 0) / drivers.length) : 0}%`}
                    icon={Award}
                    color="green"
                />
                <KPIcard
                    title="Compliance Alerts"
                    value={getComplianceCount().toString()}
                    icon={ShieldAlert}
                    color={getComplianceCount() > 0 ? "red" : "primary"}
                />
                <KPIcard
                    title="Total Trips Driven"
                    value={drivers.reduce((acc, d) => acc + (d.total_trips || 0), 0).toString()}
                    icon={Zap}
                    color="primary"
                />
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100">
                <div className="flex flex-1 gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, license, region..."
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
                        {DRIVER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
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
                {user?.role?.toLowerCase() === 'safety officer' && (
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center px-4 py-2 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-200"
                    >
                        <Plus className="h-5 w-5 mr-2" />
                        Add Driver
                    </button>
                )}
            </div>

            <Table headers={headers} data={filteredDrivers} renderRow={renderRow} />

            {/* Add/Edit Driver Modal — Safety Officer only */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setEditingDriver(null);
                    setFormData({ name: '', license_number: '', license_category: 'Heavy', expiry_date: '', safety_score: 80, region: 'North' });
                }}
                title={editingDriver ? "Edit Driver Details" : "Register New Driver"}
            >
                <form onSubmit={handleAddDriver} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Full Name</label>
                            <input required className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                placeholder="e.g. Rajan Sharma"
                                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">License Number</label>
                            <input required className="w-full p-3 bg-gray-50 border-none rounded-lg font-mono focus:ring-2 focus:ring-primary-500"
                                placeholder="MH-DL-001"
                                value={formData.license_number} onChange={e => setFormData({ ...formData, license_number: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">License Category</label>
                            <select className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                value={formData.license_category} onChange={e => setFormData({ ...formData, license_category: e.target.value })}>
                                {licenseCategories.map(c => <option key={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">License Expiry</label>
                            <input required type="date" className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                value={formData.expiry_date} onChange={e => setFormData({ ...formData, expiry_date: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Region</label>
                            <select className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                value={formData.region} onChange={e => setFormData({ ...formData, region: e.target.value })}>
                                {regionOptions.map(r => <option key={r}>{r}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Safety Score (0–100)</label>
                            <input required type="number" min="0" max="100" className="w-full p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500"
                                value={formData.safety_score} onChange={e => setFormData({ ...formData, safety_score: parseInt(e.target.value) })} />
                        </div>
                    </div>
                    <div className="pt-4">
                        <button type="submit"
                            className="w-full py-4 bg-primary-600 text-white font-black rounded-xl hover:bg-primary-700 transition-all shadow-xl shadow-primary-100 uppercase tracking-widest flex items-center justify-center">
                            {editingDriver ? <Edit2 className="h-5 w-5 mr-2" /> : <UserCheck className="h-5 w-5 mr-2" />}
                            {editingDriver ? 'Save Changes' : 'Register Driver'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Drivers;
