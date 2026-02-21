import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Truck,
    Users,
    MapPin,
    Wrench,
    Fuel,
    BarChart3,
    LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
    const { logout, user } = useAuth();

    const allNavItems = [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst'] },
        { name: 'Vehicles', path: '/vehicles', icon: Truck, roles: ['Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst'] },
        { name: 'Drivers', path: '/drivers', icon: Users, roles: ['Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst'] },
        { name: 'Trips', path: '/trips', icon: MapPin, roles: ['Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst'] },
        { name: 'Maintenance', path: '/maintenance', icon: Wrench, roles: ['Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst'] },
        { name: 'Expenses', path: '/expenses', icon: Fuel, roles: ['Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst'] },
        { name: 'Analytics', path: '/analytics', icon: BarChart3, roles: ['Fleet Manager', 'Financial Analyst'] },
    ];

    const navItems = allNavItems.filter(item =>
        item.roles.some(role => role.toLowerCase() === user?.role?.toLowerCase())
    );

    return (
        <div className="flex flex-col h-screen w-64 bg-white border-r border-gray-200">
            <div className="flex items-center justify-center h-16 border-b border-gray-200">
                <span className="text-xl font-bold text-primary-600">FleetLogix</span>
            </div>

            <div className="flex flex-col flex-1 overflow-y-auto pt-4">
                <nav className="flex-1 px-4 space-y-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.path}
                            className={({ isActive }) =>
                                `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${isActive
                                    ? 'bg-primary-50 text-primary-700'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`
                            }
                        >
                            <item.icon className="mr-3 h-5 w-5" />
                            {item.name}
                        </NavLink>
                    ))}
                </nav>
            </div>

            <div className="p-4 border-t border-gray-200">
                <div className="flex items-center mb-4 px-4">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold uppercase">
                        {user?.email[0]}
                    </div>
                    <div className="ml-3">
                        <p className="text-sm font-medium text-gray-700 truncate">{user?.email}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.role}</p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                    <LogOut className="mr-3 h-5 w-5" />
                    Logout
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
