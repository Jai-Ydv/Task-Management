const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { 
    register, login, getProfile,getUserProfile 
} = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const { validateRegister, validateLogin } = require('../validators/userValidator');
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    message: 'Too many requests from this IP, please try again later.'
});
// Register a new user
router.post('/register',generalLimiter, validateRegister, register);

// Log in a user
router.post('/login',generalLimiter, validateLogin, login);

// Get the profile of an authenticated user
router.get('/profile',generalLimiter, authMiddleware, getProfile);

// Get the Usersprofile 
router.get('/usersprofile',generalLimiter, authMiddleware, getUserProfile);

module.exports = router;
