const express = require('express');
const router = express.Router();
const { getUsers, updateUserRole, deleteUser, toggleVerifyUser } = require('../controllers/adminController');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

router.use(authenticateJWT);
router.use(authorizeRoles('admin'));

router.get('/users',                  getUsers);
router.put('/users/:id/role',         updateUserRole);
router.put('/users/:id/verify',       toggleVerifyUser);
router.delete('/users/:id',           deleteUser);

module.exports = router;
