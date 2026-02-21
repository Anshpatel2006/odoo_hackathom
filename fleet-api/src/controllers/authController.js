const { supabase, supabaseAdmin } = require('../config/supabase');

const register = async (req, res, next) => {
    try {
        const { email, password, name, role } = req.body;

        if (!['Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        // 1. Create and auto-confirm user in Supabase Auth using Admin client
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });

        if (authError) return res.status(400).json({ error: authError.message });

        const user = authData.user;

        // 2. Create profile entry using Admin client to bypass RLS
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert([
                { id: user.id, name, email, role }
            ]);

        if (profileError) return res.status(400).json({ error: profileError.message });

        res.status(201).json({
            message: 'User registered successfully',
            user: { id: user.id, email, name, role }
        });
    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) return res.status(401).json({ error: authError.message });

        const { data: profile } = await supabase
            .from('profiles')
            .select('name, role')
            .eq('id', authData.user.id)
            .single();

        res.json({
            message: 'Login successful',
            token: authData.session.access_token,
            user: {
                id: authData.user.id,
                email: authData.user.email,
                name: profile?.name,
                role: profile?.role
            }
        });
    } catch (error) {
        next(error);
    }
};

const getProfile = async (req, res) => {
    res.json({ user: req.user });
};

const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'http://localhost:5173/reset-password',
        });

        if (error) return res.status(400).json({ error: error.message });

        res.json({ message: 'Password reset email sent' });
    } catch (error) {
        next(error);
    }
};

module.exports = { register, login, getProfile, forgotPassword };
