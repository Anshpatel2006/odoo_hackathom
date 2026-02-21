import React from 'react';
import { Bell, Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const Navbar = () => {
    const location = useLocation();
    const pageTitle = location.pathname.split('/').pop() || 'Dashboard';

    return (
        <header className="flex items-center justify-between h-16 px-8 bg-white border-b border-gray-200">
            <h1 className="text-xl font-semibold text-gray-800 capitalize">
                {pageTitle}
            </h1>

            <div className="flex items-center space-x-4">
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-5 w-5 text-gray-400" />
                    </span>
                    <input
                        className="block w-full py-2 pl-10 pr-3 leading-5 placeholder-gray-500 bg-gray-100 border border-transparent rounded-lg focus:outline-none focus:bg-white focus:border-primary-500 sm:text-sm transition-all"
                        placeholder="Search everything..."
                        type="search"
                    />
                </div>

                <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors relative">
                    <Bell className="h-6 w-6" />
                    <span className="absolute top-2 right-2 block h-2 w-2 rounded-full bg-red-500 border-2 border-white"></span>
                </button>
            </div>
        </header>
    );
};

export default Navbar;
