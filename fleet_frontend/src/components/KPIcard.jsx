import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const KPIcard = ({ title, value, icon: Icon, trend, trendValue, color = 'primary' }) => {
    const colorMap = {
        primary: 'text-primary-600 bg-primary-50',
        green: 'text-green-600 bg-green-50',
        yellow: 'text-yellow-600 bg-yellow-50',
        red: 'text-red-600 bg-red-50',
        purple: 'text-purple-600 bg-purple-50',
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${colorMap[color] || colorMap.primary}`}>
                    <Icon className="h-6 w-6" />
                </div>
                {trend && (
                    <div className={`flex items-center text-sm font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                        {trend === 'up' ? <ArrowUpRight className="h-4 w-4 mr-1" /> : <ArrowDownRight className="h-4 w-4 mr-1" />}
                        {trendValue}%
                    </div>
                )}
            </div>
            <div>
                <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">{title}</h3>
                <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            </div>
        </div>
    );
};

export default KPIcard;
