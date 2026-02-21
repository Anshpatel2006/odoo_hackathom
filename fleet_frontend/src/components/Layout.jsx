import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const Layout = () => {
    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                <Navbar />
                <main className="flex-1 relative overflow-y-auto focus:outline-none p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
