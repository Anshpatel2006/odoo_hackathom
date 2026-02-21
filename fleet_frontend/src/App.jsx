import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { FleetProvider } from './context/FleetContext';
import ProtectedRoute from './components/ProtectedRoute';

// Layout (To be created)
import Layout from './components/Layout';

// Pages (To be created)
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Drivers from './pages/Drivers';
import Trips from './pages/Trips';
import Maintenance from './pages/Maintenance';
import Expenses from './pages/Expenses';
import Analytics from './pages/Analytics';

import { Toaster } from 'react-hot-toast';

function App() {
    return (
        <Router>
            <AuthProvider>
                <FleetProvider>
                    <Toaster position="top-right" />
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />

                        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                            <Route index element={<Navigate to="/dashboard" replace />} />
                            <Route path="dashboard" element={<Dashboard />} />
                            <Route path="vehicles" element={<Vehicles />} />
                            <Route path="drivers" element={<Drivers />} />
                            <Route path="trips" element={<Trips />} />
                            <Route path="maintenance" element={<Maintenance />} />
                            <Route path="expenses" element={<Expenses />} />
                            <Route path="analytics" element={<Analytics />} />
                        </Route>

                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </FleetProvider>
            </AuthProvider>
        </Router>
    );
}

export default App;
