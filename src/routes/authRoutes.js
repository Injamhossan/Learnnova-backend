const express = require('express');
const router = express.Router();
const { authUser, registerUser, socialLogin } = require('../controllers/authController');

router.post('/login', authUser);
router.post('/register', registerUser);
router.post('/social-login', socialLogin);

module.exports = router;
