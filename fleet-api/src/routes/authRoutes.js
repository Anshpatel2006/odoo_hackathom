const express = require('express');
const { register, login, getProfile, forgotPassword } = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.get('/profile', authenticate, getProfile);

module.exports = router;
