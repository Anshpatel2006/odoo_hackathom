import React, { useEffect, useState, useCallback } from 'react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend, RadarChart, Radar,
    PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell, PieChart, Pie
} from 'recharts';
import {
    Truck, AlertTriangle, Activity, Package, TrendingUp,
    TrendingDown, Users, ShieldCheck, RefreshCw, Award, DollarSign, Fuel
} from 'lucide-react';
import { useFleet } from '../context/FleetContext';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

/* ─── Helpers ─────────────────────────────────────────────────── */
const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtK = (n) => {
    const v = Number(n || 0);
    return v >= 1000 ? `₹${(v / 1000).toFixed(1)}k` : `₹${v.toFixed(0)}`;
};

const COLORS = {
    blue: '#3b82f6', green: '#22c55e', red: '#ef4444',
    amber: '#f59e0b', purple: '#8b5cf6', teal: '#14b8a6',
    gray: '#e5e7eb', muted: '#94a3b8'
};

const PALETTE = [COLORS.blue, COLORS.teal, COLORS.purple, COLORS.amber, COLORS.green, COLORS.red];

/* ─── Stat Card ───────────────────────────────────────────────── */
const StatCard = ({ title, value, sub, icon: Icon, color = 'blue', trend }) => {
    const colors = {
        blue: 'bg-blue-50 text-blue-600',
        red: 'bg-red-50 text-red-600',
        green: 'bg-green-50 text-green-600',
        amber: 'bg-amber-50 text-amber-600',
        purple: 'bg-purple-50 text-purple-600',
        teal: 'bg-teal-50 text-teal-600',
    };
    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
                <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{title}</p>
                <p className="text-2xl font-black text-gray-900 leading-tight truncate">{value ?? '—'}</p>
                {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
            </div>
            {trend != null && (
                <div className={`text-xs font-bold flex items-center gap-0.5 ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(trend)}%
                </div>
            )}
        </div>
    );
};

/* ─── Chart Card ──────────────────────────────────────────────── */
const ChartCard = ({ title, subtitle, children, className = '' }) => (
    <div className={`bg-white rounded-2xl border border-gray-100 p-6 shadow-sm ${className}`}>
        <div className="mb-4">
            <h3 className="text-base font-bold text-gray-800">{title}</h3>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {children}
    </div>
);

/* ─── Skeleton ─────────────────────────────────────────────────── */
const Skeleton = ({ className = '' }) => (
    <div className={`animate-pulse rounded-lg bg-gray-100 ${className}`} />
);

/* ─── Custom Tooltip ───────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label, prefix = '', suffix = '' }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-100 shadow-xl rounded-xl p-3 text-xs">
            <p className="font-bold text-gray-700 mb-1">{label}</p>
            {payload.map((entry, i) => (
                <p key={i} style={{ color: entry.color }} className="font-semibold">
                    {entry.name}: {prefix}{fmt(entry.value)}{suffix}
                </p>
            ))}
        </div>
    );
};

/* ─── Main Dashboard ───────────────────────────────────────────── */
const Dashboard = () => {
    const { user } = useAuth();
    const { vehicles, trips, drivers, maintenance, fuelLogs } = useFleet();
    const [metrics, setMetrics] = useState(null);
    const [dailyTrips, setDailyTrips] = useState([]);
    const [finances, setFinances] = useState([]);
    const [driverMetrics, setDriverMetrics] = useState([]);
    const [biData, setBiData] = useState(null);
    const [lastSync, setLastSync] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchAll = useCallback(async () => {
        try {
            const [mRes, dRes, fRes, drRes, biRes] = await Promise.all([
                api.get('/analytics/dashboard'),
                api.get('/analytics/daily-trips'),
                api.get('/analytics/financial-evolution'),
                api.get('/analytics/driver-metrics'),
                api.get('/analytics/bi'),
            ]);
            setMetrics(mRes.data);
            // Format dates for display
            setDailyTrips((dRes.data || []).map(d => ({
                ...d,
                date: new Date(d.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
            })).slice(-14)); // last 14 days
            setFinances((fRes.data || []).map(f => ({
                ...f,
                month: new Date(f.month + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
                profit: Number(f.revenue || 0) - Number(f.cost || 0)
            })));
            setDriverMetrics((drRes.data || []).sort((a, b) => b.safetyScore - a.safetyScore).slice(0, 8));
            setBiData(biRes.data);
            setLastSync(new Date());
        } catch (err) {
            console.error('Analytics fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
        const interval = setInterval(fetchAll, 30000);
        return () => clearInterval(interval);
    }, [fetchAll]);

    /* ── Derived from context (always real-time) ── */
    const liveVehicles = vehicles.filter(v => v.status === 'On Trip');
    const totalFuelCost = fuelLogs.reduce((s, l) => s + (l.liters * l.cost), 0);
    const totalRevenue = trips.filter(t => t.status === 'Completed').reduce((s, t) => s + Number(t.revenue || 0), 0);
    const avgSafety = drivers.length > 0
        ? Math.round(drivers.reduce((s, d) => s + (d.safety_score || 0), 0) / drivers.length)
        : 0;

    // Trip status breakdown for pie chart
    const tripStatusData = ['Draft', 'Dispatched', 'Completed', 'Cancelled'].map(status => ({
        name: status,
        value: trips.filter(t => t.status === status).length
    })).filter(d => d.value > 0);

    const PIE_COLORS = { Draft: COLORS.amber, Dispatched: COLORS.blue, Completed: COLORS.green, Cancelled: COLORS.red };

    /* ── Vehicle status breakdown ── */
    const vehicleStatusData = ['Available', 'On Trip', 'In Shop', 'Retired'].map(s => ({
        name: s,
        value: vehicles.filter(v => v.status === s).length
    })).filter(d => d.value > 0);

    const VS_COLORS = { Available: COLORS.green, 'On Trip': COLORS.blue, 'In Shop': COLORS.amber, Retired: COLORS.muted };

    if (loading) return (
        <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* ── Header bar ── */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-3 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h2 className="text-lg font-black text-gray-800">Fleet Analytics</h2>
                    <p className="text-xs text-gray-400">Real-time · refreshes every 30s</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-1.5 text-xs font-semibold ${lastSync ? 'text-green-600' : 'text-amber-500'}`}>
                        <span className={`h-2 w-2 rounded-full ${lastSync ? 'bg-green-500 animate-pulse' : 'bg-amber-400'}`} />
                        {lastSync ? `Synced ${lastSync.toLocaleTimeString()}` : 'Connecting...'}
                    </div>
                    <button onClick={fetchAll} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                        <RefreshCw className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* ── KPI Row ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Active Fleet" value={metrics?.activeFleetCount} icon={Truck} color="blue"
                    sub={`${liveVehicles.length} currently on trip`} />
                <StatCard title="Utilization" value={metrics?.utilizationRate} icon={Activity} color="teal"
                    sub="of non-retired fleet" />
                {['fleet manager', 'financial analyst'].includes(user?.role?.toLowerCase()) && (
                    <StatCard title="Total Revenue" value={`₹${fmt(totalRevenue)}`} icon={DollarSign} color="green"
                        sub="completed trips" />
                )}
                <StatCard title="Pending Trips" value={metrics?.pendingCargoCount} icon={Package} color="amber"
                    sub="draft + dispatched" />
                <StatCard title="Avg Safety Score" value={`${avgSafety}%`} icon={ShieldCheck} color="purple"
                    sub={`${drivers.length} drivers`} />
                {['fleet manager', 'financial analyst'].includes(user?.role?.toLowerCase()) && (
                    <StatCard title="Maintenance Cost" value={`₹${fmt(metrics?.totalRevenue ? (Number(metrics.totalRevenue) - Number(metrics.totalProfit)) : 0)}`}
                        icon={AlertTriangle} color="red" sub="fuel + maintenance" />
                )}
                <StatCard title="Compliance Alerts" value={metrics?.complianceAlertsCount} icon={Award} color="red"
                    sub="expired licenses" />
                {['fleet manager', 'financial analyst'].includes(user?.role?.toLowerCase()) && (
                    <StatCard title="Fuel Spend" value={`₹${fmt(totalFuelCost)}`} icon={Fuel} color="amber"
                        sub="all time" />
                )}
            </div>

            {/* ── Charts Row 1 ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Trips Over Time */}
                <ChartCard title="Daily Trip Volume" subtitle="Last 14 days" className="lg:col-span-2">
                    <ResponsiveContainer width="100%" height={240}>
                        <AreaChart data={dailyTrips} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="tripGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.15} />
                                    <stop offset="95%" stopColor={COLORS.blue} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} allowDecimals={false} />
                            <Tooltip content={<CustomTooltip suffix=" trips" />} />
                            <Area type="monotone" dataKey="count" name="Trips" stroke={COLORS.blue}
                                strokeWidth={2.5} fill="url(#tripGrad)" dot={{ r: 3, fill: COLORS.blue, strokeWidth: 0 }}
                                activeDot={{ r: 5 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Trip Status Pie */}
                <ChartCard title="Trip Status Breakdown" subtitle="All trips">
                    <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                            <Pie data={tripStatusData} cx="50%" cy="45%" innerRadius={55} outerRadius={85}
                                paddingAngle={3} dataKey="value" nameKey="name"
                                label={({ name, value }) => `${name}: ${value}`}
                                labelLine={false}
                                stroke="none">
                                {tripStatusData.map((entry) => (
                                    <Cell key={entry.name} fill={PIE_COLORS[entry.name] || COLORS.blue} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(v, n) => [v, n]} />
                        </PieChart>
                    </ResponsiveContainer>
                    {tripStatusData.length === 0 && (
                        <p className="text-center text-sm text-gray-400 py-8">No trip data yet</p>
                    )}
                </ChartCard>
            </div>

            {/* ── Charts Row 2 ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Financial Evolution */}
                {['fleet manager', 'financial analyst'].includes(user?.role?.toLowerCase()) && (
                    <ChartCard title="Revenue vs Cost" subtitle="By month · completed trips">
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={finances} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barGap={4}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }}
                                    tickFormatter={fmtK} />
                                <Tooltip content={<CustomTooltip prefix="₹" />} />
                                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                                <Bar dataKey="revenue" name="Revenue" fill={COLORS.blue} radius={[4, 4, 0, 0]} barSize={18} />
                                <Bar dataKey="cost" name="Cost" fill={COLORS.gray} radius={[4, 4, 0, 0]} barSize={18} />
                                <Bar dataKey="profit" name="Profit" fill={COLORS.green} radius={[4, 4, 0, 0]} barSize={18} />
                            </BarChart>
                        </ResponsiveContainer>
                        {finances.length === 0 && (
                            <p className="text-center text-sm text-gray-400 py-8">No financial data available</p>
                        )}
                    </ChartCard>
                )}

                {/* Driver Safety Radar */}
                <ChartCard title="Driver Performance" subtitle="Safety score vs completion rate">
                    {driverMetrics.length > 0 ? (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={driverMetrics} layout="vertical"
                                margin={{ top: 4, right: 40, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => `${v}%`} />
                                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false}
                                    tick={{ fill: '#374151', fontSize: 10 }} width={80}
                                    tickFormatter={n => n.split(' ')[0]} />
                                <Tooltip content={<CustomTooltip suffix="%" />} />
                                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                                <Bar dataKey="safetyScore" name="Safety %" fill={COLORS.teal} radius={[0, 4, 4, 0]} barSize={8} />
                                <Bar dataKey="completionRate" name="Completion %" fill={COLORS.purple} radius={[0, 4, 4, 0]} barSize={8} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-center text-sm text-gray-400 py-16">No driver data</p>
                    )}
                </ChartCard>
            </div>

            {/* ── Charts Row 3 ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Regional Efficiency */}
                {['fleet manager', 'financial analyst'].includes(user?.role?.toLowerCase()) && (
                    <ChartCard title="Regional Efficiency" subtitle="Avg revenue per vehicle by region" className="lg:col-span-2">
                        {biData?.regionalMetrics?.length > 0 ? (
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={biData.regionalMetrics} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="region" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }}
                                        tickFormatter={fmtK} />
                                    <Tooltip content={<CustomTooltip prefix="₹" />} />
                                    <Bar dataKey="efficiency" name="Avg Revenue/Vehicle" radius={[6, 6, 0, 0]} barSize={36}>
                                        {biData.regionalMetrics.map((_, index) => (
                                            <Cell key={index} fill={PALETTE[index % PALETTE.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-center text-sm text-gray-400 py-12">No regional data</p>
                        )}
                    </ChartCard>
                )}

                {/* Vehicle Status Donut */}
                <ChartCard title="Fleet Status" subtitle="Current vehicle breakdown">
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie data={vehicleStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                                paddingAngle={3} dataKey="value" stroke="none">
                                {vehicleStatusData.map((entry) => (
                                    <Cell key={entry.name} fill={VS_COLORS[entry.name] || COLORS.blue} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(v, n) => [v + ' vehicles', n]} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-2 space-y-1.5">
                        {vehicleStatusData.map(d => (
                            <div key={d.name} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full inline-block" style={{ background: VS_COLORS[d.name] }} />
                                    <span className="text-gray-600">{d.name}</span>
                                </div>
                                <span className="font-bold text-gray-800">{d.value}</span>
                            </div>
                        ))}
                    </div>
                </ChartCard>
            </div>

            {/* ── Live Vehicles ── */}
            <ChartCard title="🛰️ Live Fleet Monitoring" subtitle={`${liveVehicles.length} vehicle${liveVehicles.length !== 1 ? 's' : ''} on active trips`}>
                {liveVehicles.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {liveVehicles.map(v => (
                            <div key={v.id} className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-teal-50 border border-blue-100">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">{v.model}</p>
                                        <p className="text-xs font-mono text-blue-600">{v.license_plate}</p>
                                    </div>
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                                        <span className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse" />
                                        Live
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500 space-y-1">
                                    <div>📍 {v.current_lat?.toFixed(4)}, {v.current_lng?.toFixed(4)}</div>
                                    <div className="flex justify-between">
                                        <span>Odometer: {v.odometer?.toLocaleString()} km</span>
                                        <span className="text-gray-400">{v.last_updated ? new Date(v.last_updated).toLocaleTimeString() : '—'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-12 text-center text-gray-400">
                        <Truck className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">No vehicles currently on active trips.</p>
                    </div>
                )}
            </ChartCard>
        </div>
    );
};

export default Dashboard;
