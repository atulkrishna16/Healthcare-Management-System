const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * Public Routes
 */
router.get('/', doctorController.listDoctors);
router.get('/:id', doctorController.getDoctorById);
router.get('/:id/slots', doctorController.getDoctorSlots);

/**
 * Doctor-Only Schedule & Availability Routes
 */
router.get('/me/schedule', authenticate, authorize('doctor'), doctorController.getOwnSchedule);
router.put('/me/schedule', authenticate, authorize('doctor'), doctorController.updateOwnSchedule);
router.post('/me/leave', authenticate, authorize('doctor'), doctorController.addOwnLeave);
router.delete('/me/leave/:id', authenticate, authorize('doctor'), doctorController.deleteOwnLeave);

module.exports = router;
