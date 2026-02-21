import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const verifyToken = async () => {
            if (token) {
                try {
                    const res = await api.get('/auth/profile');
                    setUser(res.data.user);
                } catch (e) {
                    console.error("Token verification failed", e);
                    logout();
                }
            }
            setLoading(false);
        };
        verifyToken();
    }, [token]);

    const login = async (email, password) => {
        try {
            const res = await api.post('/auth/login', { email, password });
            const { token: newToken, user: userData } = res.data;
            setToken(newToken);
            setUser(userData);
            localStorage.setItem('token', newToken);
            return true;
        } catch (error) {
            console.error('Login failed', error);
            throw error;
        }
    };

    const register = async (name, email, password, role) => {
        try {
            const res = await api.post('/auth/register', { name, email, password, role });
            // After registration, we can either auto-login or redirect to login.
            // Let's auto-login for a better UX.
            return await login(email, password);
        } catch (error) {
            console.error('Registration failed', error);
            throw error;
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
