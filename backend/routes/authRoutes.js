const express = require('express');
const router = express.Router();
const { login, logout, registerInitialAdmin } = require('../controllers/authController');

router.post('/login', login);
router.post('/logout', logout);

// A simple utility endpoint to help you initialize an Admin for the first time.
// Usually you'd remove this or secure it with an environment key.
router.post('/register-admin', registerInitialAdmin);

module.exports = router;