const express = require('express');
const router = express.Router();
const { protect } = require('../controller/authController');
const {
  getOrCreateRoom,
  getRooms,
  getMessages,
  markAsRead,
} = require('../controller/chatController');

router.use(protect);

router.route('/rooms').post(getOrCreateRoom).get(getRooms);
router.get('/rooms/:roomId/messages', getMessages);
router.patch('/rooms/:roomId/messages/read', markAsRead);

module.exports = router;
