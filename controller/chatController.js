const ChatRoom = require('../model/chatRoomModel');
const Message = require('../model/messageModel');
const User = require('../model/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// POST /api/v1/chat/rooms
// Body: { otherUserId }
exports.getOrCreateRoom = catchAsync(async (req, res, next) => {
  console.log('[getOrCreateRoom] body:', req.body, '| user:', req.user?._id);
  const currentUserId = req.user._id.toString();
  const { otherUserId } = req.body;

  if (!otherUserId) {
    return next(new AppError('otherUserId is required', 400));
  }

  if (currentUserId === otherUserId) {
    return next(new AppError('Cannot create a chat room with yourself', 400));
  }

  const otherUser = await User.findById(otherUserId);
  if (!otherUser) {
    return next(new AppError('User not found', 404));
  }

  // Sort IDs to canonical order to guarantee uniqueness
  const participants = [currentUserId, otherUserId].sort();

  let room = await ChatRoom.findOne({ participants: { $all: participants, $size: 2 } });

  if (!room) {
    try {
      room = await ChatRoom.create({ participants });
    } catch (err) {
      console.error('[getOrCreateRoom] create error:', err.code, err.message);
      // Handle race condition or duplicate key: try finding the room again
      if (err.code === 11000) {
        // The unique index stores participants as a sorted array — try both orderings
        room = await ChatRoom.findOne({ participants: { $all: participants, $size: 2 } });
        if (!room) {
          // Fallback: find any room containing both participants
          room = await ChatRoom.findOne({ participants: { $all: participants } });
        }
        if (!room) return next(new AppError('Failed to create chat room', 500));
      } else {
        return next(err);
      }
    }
  }

  // Populate lastMessage if it exists so Flutter gets the full message object
  if (room.lastMessage) {
    room = await room.populate('lastMessage');
  }

  // Return the same shape as getRooms so the Flutter ChatRoomModel parses correctly
  const unreadCount = await Message.countDocuments({
    chatRoom: room._id,
    sender: { $ne: currentUserId },
    isRead: false,
  });

  // After populate, lastMessage is either a full Message doc or still an ObjectId.
  // Only include it if it has a 'text' field (i.e. it was actually populated).
  const lastMsg = room.lastMessage && room.lastMessage.text !== undefined
    ? room.lastMessage
    : null;

  const shaped = {
    id: room._id,
    otherParticipant: {
      id: otherUser._id,
      name: `${otherUser.firstName} ${otherUser.lastName || ''}`.trim(),
      profileImage: otherUser.profileImage || null,
    },
    lastMessage: lastMsg,
    lastMessageAt: room.lastMessageAt,
    unreadCount,
  };

  res.status(200).json({
    status: 'success',
    data: { room: shaped },
  });
});

// GET /api/v1/chat/rooms
exports.getRooms = catchAsync(async (req, res) => {
  const currentUserId = req.user._id;

  const rooms = await ChatRoom.find({ participants: currentUserId })
    .populate('lastMessage')
    .populate('participants', 'firstName lastName profileImage')
    .sort({ lastMessageAt: -1 });

  // Compute unread count and shape response for each room
  const roomsWithMeta = await Promise.all(
    rooms.map(async (room) => {
      const unreadCount = await Message.countDocuments({
        chatRoom: room._id,
        sender: { $ne: currentUserId },
        isRead: false,
      });

      const otherParticipant = room.participants.find(
        (p) => p._id.toString() !== currentUserId.toString()
      );

      return {
        id: room._id,
        otherParticipant: {
          id: otherParticipant?._id,
          name: otherParticipant
            ? `${otherParticipant.firstName} ${otherParticipant.lastName || ''}`.trim()
            : 'Unknown',
          profileImage: otherParticipant?.profileImage || null,
        },
        lastMessage: room.lastMessage,
        lastMessageAt: room.lastMessageAt,
        unreadCount,
      };
    })
  );

  res.status(200).json({
    status: 'success',
    data: { rooms: roomsWithMeta },
  });
});

// GET /api/v1/chat/rooms/:roomId/messages?page=1&limit=20
exports.getMessages = catchAsync(async (req, res, next) => {
  const { roomId } = req.params;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const room = await ChatRoom.findById(roomId);
  if (!room) return next(new AppError('Chat room not found', 404));

  const isParticipant = room.participants.some(
    (p) => p.toString() === req.user._id.toString()
  );
  if (!isParticipant) return next(new AppError('Access denied', 403));

  const messages = await Message.find({ chatRoom: roomId })
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit)
    .populate('sender', 'firstName lastName profileImage');

  const total = await Message.countDocuments({ chatRoom: roomId });

  res.status(200).json({
    status: 'success',
    data: { messages, total, page, limit },
  });
});

// PATCH /api/v1/chat/rooms/:roomId/messages/read
exports.markAsRead = catchAsync(async (req, res, next) => {
  const { roomId } = req.params;
  const currentUserId = req.user._id;

  const room = await ChatRoom.findById(roomId);
  if (!room) return next(new AppError('Chat room not found', 404));

  const isParticipant = room.participants.some(
    (p) => p.toString() === currentUserId.toString()
  );
  if (!isParticipant) return next(new AppError('Access denied', 403));

  await Message.updateMany(
    { chatRoom: roomId, sender: { $ne: currentUserId }, isRead: false },
    { $set: { isRead: true } }
  );

  res.status(200).json({ status: 'success' });
});
