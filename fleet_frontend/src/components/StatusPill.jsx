import React from 'react';

const StatusPill = ({ status }) => {
    const getStatusStyles = (status) => {
        switch (status?.toLowerCase()) {
            case 'available':
            case 'completed':
            case 'on duty':
                return 'bg-green-100 text-green-700 border-green-200';
            case 'on trip':
            case 'dispatched':
                return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'in shop':
            case 'maintenance':
            case 'draft':
                return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'retired':
            case 'cancelled':
            case 'off duty':
                return 'bg-gray-100 text-gray-700 border-gray-200';
            case 'expired':
                return 'bg-red-100 text-red-700 border-red-200';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusStyles(status)} uppercase tracking-wider`}>
            {status}
        </span>
    );
};

export default StatusPill;
