const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const userRole = req.user.role.toLowerCase();
        const isAllowed = allowedRoles.some(role => role.toLowerCase() === userRole);

        if (!isAllowed) {
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
        }

        next();
    };
};

module.exports = { authorize };
