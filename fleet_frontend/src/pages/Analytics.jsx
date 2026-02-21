import React, { useEffect, useState, useCallback } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import {
    Zap, TrendingUp, Globe, MapPin, Award, BarChart2,
    ChevronUp, ChevronDown, FileCode, RefreshCw, Truck,
    ShieldCheck, ShieldAlert, Users, DollarSign, Activity, Package
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../utils/api';
import { useFleet } from '../context/FleetContext';
import { useAuth } from '../context/AuthContext';

/* ─── INR Formatters ──────────────────────────────────────────── */
/** Full format with ₹ sign, crore/lakh/k shorthand */
const inr = (n) => {
    const v = Number(n || 0);
    const absV = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    let formatted = '';
    if (absV >= 10_000_000) formatted = `${(absV / 10_000_000).toFixed(2)} Cr`;
    else if (absV >= 100_000) formatted = `${(absV / 100_000).toFixed(2)} L`;
    else if (absV >= 1_000) formatted = `${(absV / 1_000).toFixed(1)}K`;
    else formatted = absV.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    return `${sign}₹${formatted}`;
};
/** Compact axis label */
const inrAxis = (n) => {
    const v = Number(n || 0);
    const absV = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    let formatted = '';
    if (absV >= 10_000_000) formatted = `${(absV / 10_000_000).toFixed(1)}Cr`;
    else if (absV >= 100_000) formatted = `${(absV / 100_000).toFixed(1)}L`;
    else if (absV >= 1_000) formatted = `${(absV / 1_000).toFixed(0)}K`;
    else formatted = `${absV}`;
    return `${sign}₹${formatted}`;
};
const fmtPct = (n, d = 1) => `${Number(n || 0).toFixed(d)}%`;

const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#06b6d4'];

/* ─── Custom Tooltip ───────────────────────────────────────────── */
const MoneyTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-100 shadow-xl rounded-xl p-3 text-xs min-w-[140px]">
            <p className="font-bold text-gray-700 mb-2">{label}</p>
            {payload.map((entry, i) => {
                const isLoss = entry.name === 'Profit' && entry.value < 0;
                const displayName = isLoss ? 'Loss' : entry.name;
                const displayValue = isLoss ? Math.abs(entry.value) : entry.value;
                const color = isLoss ? '#f43f5e' : entry.color; // Rose-500 for loss

                return (
                    <p key={i} className="font-semibold flex items-center justify-between gap-3" style={{ color }}>
                        <span className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full inline-block" style={{ background: color }} />
                            {displayName}
                        </span>
                        <span>{inr(displayValue)}</span>
                    </p>
                );
            })}
        </div>
    );
};

const CountTooltip = ({ active, payload, label, suffix = '' }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-100 shadow-xl rounded-xl p-3 text-xs">
            <p className="font-bold text-gray-700 mb-1">{label}</p>
            {payload.map((entry, i) => (
                <p key={i} className="font-semibold" style={{ color: entry.color }}>
                    {entry.name}: {Number(entry.value).toLocaleString('en-IN')}{suffix}
                </p>
            ))}
        </div>
    );
};

/* ─── Gradient Stat Card ──────────────────────────────────────── */
const StatCard = ({ title, value, sub, icon: Icon, gradient, badge }) => (
    <div className={`relative overflow-hidden rounded-2xl p-6 text-white ${gradient}`}>
        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
        <div className="absolute -right-2 -bottom-6 h-32 w-32 rounded-full bg-white/5" />
        <div className="relative z-10">
            <div className="flex items-start justify-between mb-3">
                <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                </div>
                {badge != null && (
                    <div className={`flex items-center gap-0.5 text-xs font-bold px-2 py-1 rounded-full
                        ${Number(badge) >= 0 ? 'bg-emerald-400/25 text-emerald-100' : 'bg-red-400/25 text-red-100'}`}>
                        {Number(badge) >= 0 ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {Math.abs(Number(badge)).toFixed(1)}%
                    </div>
                )}
            </div>
            <p className="text-2xl font-black tracking-tight leading-none">{value ?? '—'}</p>
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/70 mt-1.5">{title}</p>
            {sub && <p className="text-xs text-white/50 mt-0.5">{sub}</p>}
        </div>
    </div>
);

/* ─── Chart Card ──────────────────────────────────────────────── */
const ChartCard = ({ title, subtitle, action, children, className = '' }) => (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
        <div className="px-6 pt-5 pb-4 flex items-start justify-between border-b border-gray-50">
            <div>
                <h3 className="text-sm font-bold text-gray-800">{title}</h3>
                {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
            </div>
            {action}
        </div>
        <div className="p-6">{children}</div>
    </div>
);

/* ─── Empty State ─────────────────────────────────────────────── */
const EmptyState = ({ icon: Icon = BarChart2, label = 'No data available', hint = 'Data will appear once trips are completed' }) => (
    <div className="flex flex-col items-center justify-center py-14 text-center">
        <Icon className="h-10 w-10 text-gray-200 mb-3" />
        <p className="text-sm font-semibold text-gray-400">{label}</p>
        <p className="text-xs text-gray-300 mt-1 max-w-[220px]">{hint}</p>
    </div>
);

/* ─── Skeleton ─────────────────────────────────────────────────── */
const Sk = ({ h = 'h-36', r = 'rounded-2xl' }) => (
    <div className={`${h} ${r} bg-gray-100 animate-pulse`} />
);

/* ─── Main Analytics ─────────────────────────────────────────── */
const Analytics = () => {
    const { user } = useAuth();
    const { vehicles, drivers, loading: fleetLoading } = useFleet();

    const allowedRoles = ['fleet manager', 'financial analyst'];
    const isAuthorized = allowedRoles.includes(user?.role?.toLowerCase());

    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
                <div className="h-20 w-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
                    <ShieldAlert className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Access Restricted</h2>
                <p className="text-gray-500 max-w-sm">
                    Only Fleet Managers and Financial Analysts have permission to view operational and financial intelligence.
                </p>
                <button
                    onClick={() => window.location.href = '/dashboard'}
                    className="mt-8 px-6 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-lg"
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }

    /* all endpoint states */
    const [dashboard, setDashboard] = useState(null);
    const [dailyTrips, setDailyTrips] = useState([]);
    const [financials, setFinancials] = useState([]);
    const [driverMetrics, setDriverMetrics] = useState([]);
    const [bi, setBi] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastSync, setLastSync] = useState(null);

    const fetchAll = useCallback(async () => {
        const tryFetch = async (url, setter, transformer = (d) => d) => {
            try {
                const res = await api.get(url);
                setter(transformer(res.data));
            } catch (err) {
                console.error(`Fetch error for ${url}:`, err);
            }
        };

        await Promise.allSettled([
            tryFetch('/analytics/dashboard', setDashboard),
            tryFetch('/analytics/daily-trips', setDailyTrips, (data) =>
                (data || [])
                    .map(d => ({
                        ...d,
                        label: new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                    }))
                    .slice(-14)
            ),
            tryFetch('/analytics/financial-evolution', setFinancials, (data) =>
                (data || []).map(f => ({
                    ...f,
                    label: new Date(f.month + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
                    profit: Number(f.revenue || 0) - Number(f.cost || 0)
                }))
            ),
            tryFetch('/analytics/driver-metrics', setDriverMetrics, (data) =>
                (data || [])
                    .sort((a, b) => b.safetyScore - a.safetyScore)
                    .slice(0, 8)
            ),
            tryFetch('/analytics/bi', setBi)
        ]);

        setLastSync(new Date());
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchAll();
        const id = setInterval(fetchAll, 30_000);
        return () => clearInterval(id);
    }, [fetchAll]);

    /* ── Derived real-time vehicle data ── */
    const onTrip = vehicles.filter(v => v.status === 'On Trip').length;
    const available = vehicles.filter(v => v.status === 'Available').length;
    const inShop = vehicles.filter(v => v.status === 'In Shop').length;
    const total = vehicles.length;

    const utilizationData = [
        { name: 'On Trip', value: onTrip, color: '#3b82f6' },
        { name: 'Available', value: available, color: '#10b981' },
        { name: 'In Shop', value: inShop, color: '#f59e0b' },
    ].filter(d => d.value > 0);

    /* ── From /analytics/bi ── */
    // bi.highestROI  => { model, license_plate, region, revenue, totalCost, roi }
    // bi.regionalMetrics => [{ region, totalRevenue, vehicleCount, efficiency }]
    const topVehicle = bi?.highestROI;
    const regionalData = bi?.regionalMetrics || [];

    /* ── KPI values ── */
    const totalRevenue = Number(dashboard?.totalRevenue || 0);
    const totalProfit = Number(dashboard?.totalProfit || 0);
    const utilizationRate = dashboard?.utilizationRate ?? '—';
    const pendingTrips = dashboard?.pendingCargoCount ?? '—';
    const alerts = dashboard?.complianceAlertsCount ?? '—';

    const topRoi = topVehicle?.roi != null ? fmtPct(Number(topVehicle.roi) * 100) : '—';

    /* ── Export CSV ── */
    const handleExport = () => {
        if (!financials.length) { toast.error('No financial data to export'); return; }
        const rows = [
            ['Month', 'Revenue (₹)', 'Cost (₹)', 'Profit (₹)'],
            ...financials.map(f => [f.label, f.revenue, f.cost, f.profit])
        ];
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `fleet-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click(); URL.revokeObjectURL(url);
        toast.success('CSV exported');
    };

    const handleProExport = async () => {
        try {
            const res = await api.get('/analytics/export');
            // If the backend returns JSON, we download as JSON for richness, or CSV if preferred.
            // Let's do JSON for the "Pro" feel.
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

    /* ── Loading skeleton ── */
    if (loading || fleetLoading) return (
        <div className="space-y-6 pb-12">
            <div className="flex items-center justify-between">
                <Sk h="h-9" r="rounded-xl w-56" />
                <Sk h="h-9" r="rounded-xl w-32" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {[...Array(4)].map((_, i) => <Sk key={i} />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Sk h="h-80" r="rounded-2xl lg:col-span-2" />
                <Sk h="h-80" r="rounded-2xl" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Sk h="h-72" r="rounded-2xl" />
                <Sk h="h-72" r="rounded-2xl" />
            </div>
        </div>
    );

    return (
        <div className="space-y-6 pb-12">

            {/* ── Header ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight">Operational Intelligence</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className={`h-2 w-2 rounded-full ${lastSync ? 'bg-green-500 animate-pulse' : 'bg-amber-400'}`} />
                        <p className="text-xs text-gray-400">
                            {lastSync ? `Live · synced ${lastSync.toLocaleTimeString('en-IN')}` : 'Connecting...'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchAll} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors" title="Refresh">
                        <RefreshCw className="h-4 w-4" />
                    </button>
                    {['fleet manager', 'financial analyst'].includes(user?.role?.toLowerCase()) && (
                        <button onClick={handleProExport}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 hover:shadow-lg transition-all text-sm shadow-md shadow-primary-200">
                            <Zap className="h-4 w-4" /> Pro Report
                        </button>
                    )}
                    <button onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 hover:shadow-sm transition-all text-sm">
                        <FileCode className="h-4 w-4" /> Export CSV
                    </button>
                </div>
            </div>

            {/* ── KPI Row 1 — Revenue & Fleet ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard
                    title="Total Revenue"
                    value={totalRevenue > 0 ? inr(totalRevenue) : '—'}
                    sub="all trips combined"
                    icon={Zap}
                    gradient="bg-gradient-to-br from-blue-500 to-blue-700"
                />
                <StatCard
                    title={totalProfit >= 0 ? "Net Profit" : "Net Loss"}
                    value={totalProfit !== 0 ? inr(Math.abs(totalProfit)) : '—'}
                    sub="revenue − costs"
                    icon={TrendingUp}
                    gradient={totalProfit >= 0
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                        : 'bg-gradient-to-br from-red-500 to-rose-600'}
                />
                <StatCard
                    title="Fleet Utilisation"
                    value={utilizationRate}
                    sub={`${onTrip} of ${total} vehicles on trip`}
                    icon={Activity}
                    gradient="bg-gradient-to-br from-violet-500 to-purple-700"
                />
                <StatCard
                    title="Top Vehicle ROI"
                    value={topRoi}
                    sub={topVehicle?.model || 'No data yet'}
                    icon={Award}
                    gradient="bg-gradient-to-br from-amber-400 to-orange-500"
                />
            </div>

            {/* ── KPI Row 2 — Ops ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <StatCard
                    title="Pending Trips"
                    value={pendingTrips}
                    sub="draft + dispatched"
                    icon={Package}
                    gradient="bg-gradient-to-br from-sky-400 to-cyan-600"
                />
                <StatCard
                    title="Compliance Alerts"
                    value={alerts}
                    sub="expired driver licences"
                    icon={ShieldCheck}
                    gradient="bg-gradient-to-br from-rose-500 to-red-600"
                />
                <StatCard
                    title="Regions Tracked"
                    value={regionalData.length || '—'}
                    sub={regionalData.length > 0 ? `${regionalData.length} active region${regionalData.length > 1 ? 's' : ''}` : 'No regional data'}
                    icon={Globe}
                    gradient="bg-gradient-to-br from-indigo-400 to-indigo-600"
                />
            </div>

            {/* ── Charts Row 1 ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Daily Trip Volume */}
                <ChartCard
                    title="Daily Trip Volume"
                    subtitle="Last 14 days — trip count"
                    className="lg:col-span-2"
                >
                    {dailyTrips.length > 0 ? (
                        <ResponsiveContainer width="100%" height={240}>
                            <AreaChart data={dailyTrips} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="tripGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.18} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} allowDecimals={false} />
                                <Tooltip content={<CountTooltip suffix=" trips" />} />
                                <Area type="monotone" dataKey="count" name="Trips"
                                    stroke="#3b82f6" strokeWidth={2.5} fill="url(#tripGrad)"
                                    dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyState label="No trip data in the last 14 days" hint="Trip counts will appear as trips are created" />
                    )}
                </ChartCard>

                {/* Vehicle Utilisation Donut */}
                <ChartCard title="Fleet Status" subtitle={`${total} total vehicles`}>
                    {utilizationData.length > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie data={utilizationData} cx="50%" cy="50%"
                                        innerRadius={52} outerRadius={76}
                                        paddingAngle={4} dataKey="value" stroke="none">
                                        {utilizationData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                    </Pie>
                                    <Tooltip formatter={(v, n) => [`${v} vehicles`, n]} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-2.5 mt-2">
                                {utilizationData.map((e, i) => (
                                    <div key={i} className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: e.color }} />
                                            <span className="text-xs font-medium text-gray-600">{e.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-1">
                                            <div className="h-1.5 rounded-full bg-gray-100 flex-1 overflow-hidden">
                                                <div className="h-full rounded-full" style={{
                                                    width: `${total > 0 ? (e.value / total) * 100 : 0}%`,
                                                    background: e.color
                                                }} />
                                            </div>
                                            <span className="text-xs font-bold text-gray-800 w-4 text-right">{e.value}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <EmptyState icon={Truck} label="No vehicle data" hint="Add vehicles to see utilisation" />
                    )}
                </ChartCard>
            </div>

            {/* ── Charts Row 2 ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Revenue vs Cost vs Profit by Month */}
                <ChartCard title="Revenue vs Cost" subtitle="Monthly · completed trips (₹)">
                    {financials.length > 0 ? (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={financials} margin={{ top: 4, right: 8, left: -8, bottom: 0 }} barGap={3}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={inrAxis} />
                                <Tooltip content={<MoneyTooltip />} />
                                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                                <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={14} />
                                <Bar dataKey="cost" name="Cost" fill="#e5e7eb" radius={[4, 4, 0, 0]} barSize={14} />
                                <Bar dataKey="profit" name="Profit" radius={[4, 4, 0, 0]} barSize={14}>
                                    {financials.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyState label="No financial data yet" hint="Financials appear once trips are completed" />
                    )}
                </ChartCard>

                {/* Driver Safety vs Completion */}
                <ChartCard title="Driver Performance" subtitle="Safety score & completion rate (top 8)">
                    {driverMetrics.length > 0 ? (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={driverMetrics} layout="vertical" margin={{ top: 4, right: 40, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => `${v}%`} />
                                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false}
                                    tick={{ fill: '#374151', fontSize: 10 }} width={80}
                                    tickFormatter={n => n.split(' ')[0]} />
                                <Tooltip content={<CountTooltip suffix="%" />} />
                                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                                <Bar dataKey="safetyScore" name="Safety %" fill="#14b8a6" radius={[0, 4, 4, 0]} barSize={8} />
                                <Bar dataKey="completionRate" name="Completion %" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={8} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyState icon={Users} label="No driver data" hint="Assign drivers to trips to see metrics" />
                    )}
                </ChartCard>
            </div>

            {/* ── Regional Performance ── */}
            <ChartCard
                title="Regional Performance"
                subtitle="Total revenue (₹) and avg revenue per vehicle by region"
                action={
                    <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2.5 py-1 rounded-full">
                        {regionalData.length} region{regionalData.length !== 1 ? 's' : ''}
                    </span>
                }
            >
                {regionalData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={regionalData} margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="region" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={inrAxis} />
                            <Tooltip content={<MoneyTooltip />} />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                            <Bar dataKey="totalRevenue" name="Total Revenue (₹)" radius={[6, 6, 0, 0]} barSize={32}>
                                {regionalData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                            </Bar>
                            <Bar dataKey="efficiency" name="Avg ₹/Vehicle" fill="#c7d2fe" radius={[6, 6, 0, 0]} barSize={32} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <EmptyState icon={MapPin} label="No regional data yet" hint="Regions appear once vehicles have completed trips" />
                )}
            </ChartCard>

            {/* ── Top Vehicle ROI Detail Card ── */}
            {topVehicle && (
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white">
                    <div className="flex items-center gap-2 mb-5">
                        <Award className="h-5 w-5 text-amber-400" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-amber-400">Top ROI Vehicle</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Model</p>
                            <p className="text-lg font-black">{topVehicle.model}</p>
                            <p className="text-xs font-mono text-gray-400">{topVehicle.license_plate}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Region</p>
                            <p className="text-lg font-black">{topVehicle.region || '—'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Revenue</p>
                            <p className="text-lg font-black text-emerald-400">{inr(topVehicle.revenue)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">ROI</p>
                            <p className="text-2xl font-black text-amber-400">{fmtPct(Number(topVehicle.roi) * 100)}</p>
                            <p className="text-xs text-gray-400 mt-0.5">Operating cost: {inr(topVehicle.totalCost)}</p>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Analytics;
