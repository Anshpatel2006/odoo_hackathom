const { supabase } = require('../config/supabase');

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid token' });
        }

        const token = authHeader.split(' ')[1];
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Attach user to request
        req.user = user;

        // Fetch profile for role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return res.status(403).json({ error: 'Profile not found' });
        }

        req.user.role = profile.role;
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = { authenticate };
