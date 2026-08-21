const express = require('express');
const router = express.Router();
const googleCalendarController = require('../controllers/googleCalendarController');
const { authenticate } = require('../middleware/auth');
const { calendarLimiter } = require('../middleware/rateLimiter');

router.use(calendarLimiter);

router.get('/connect', authenticate, googleCalendarController.getConnectUrl);
router.get('/callback', googleCalendarController.oauthCallback);
router.get('/status', authenticate, googleCalendarController.getStatus);
router.post('/disconnect', authenticate, googleCalendarController.disconnect);

module.exports = router;
