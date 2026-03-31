const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../model/userModel');
const ChatRoom = require('../model/chatRoomModel');
const Message = require('../model/messageModel');

// Authenticate socket connection via JWT in handshake auth
async function authenticateSocket(socket, next) {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error: no token'));

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return next(new Error('Authentication error: user not found'));

    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Authentication error: invalid token'));
  }
}

function initChatSocket(io) {
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();

    // Join personal room for inbox updates and targeted read receipts
    socket.join(`user:${userId}`);

    // Join a chat room screen
    socket.on('join_room', ({ roomId }) => {
      if (roomId) socket.join(roomId);
    });

    // Leave a chat room screen (keep personal room)
    socket.on('leave_room', ({ roomId }) => {
      if (roomId) socket.leave(roomId);
    });

    // Send a message via socket (persists to DB and broadcasts)
    socket.on('send_message', async ({ roomId, text, attachmentUrl, attachmentType }) => {
      try {
        if (!roomId) return;

        const room = await ChatRoom.findById(roomId);
        if (!room) return;

        const isParticipant = room.participants.some((p) => p.toString() === userId);
        if (!isParticipant) return;

        if (!text && !attachmentUrl) return;

        const message = await Message.create({
          chatRoom: roomId,
          sender: userId,
          text: text || '',
          attachmentUrl: attachmentUrl || null,
          attachmentType: attachmentType || null,
        });

        // Update room's last message
        await ChatRoom.findByIdAndUpdate(roomId, {
          lastMessage: message._id,
          lastMessageAt: message.createdAt,
        });

        const populated = await message.populate('sender', 'firstName lastName profileImage');

        // Broadcast to everyone in the chat room
        io.to(roomId).emit('new_message', populated);

        // Notify each participant's personal room for inbox update
        room.participants.forEach((participantId) => {
          io.to(`user:${participantId.toString()}`).emit('inbox_update', {
            roomId,
            lastMessage: populated,
            lastMessageAt: message.createdAt,
          });
        });
      } catch (err) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Mark messages in a room as read
    socket.on('mark_read', async ({ roomId }) => {
      try {
        if (!roomId) return;

        const room = await ChatRoom.findById(roomId);
        if (!room) return;

        const isParticipant = room.participants.some((p) => p.toString() === userId);
        if (!isParticipant) return;

        // Find unread messages sent by the other participant
        const unreadMessages = await Message.find({
          chatRoom: roomId,
          sender: { $ne: userId },
          isRead: false,
        });

        if (unreadMessages.length === 0) return;

        await Message.updateMany(
          { chatRoom: roomId, sender: { $ne: userId }, isRead: false },
          { $set: { isRead: true } }
        );

        // Notify the sender(s) of the read receipt
        const senderIds = [...new Set(unreadMessages.map((m) => m.sender.toString()))];
        senderIds.forEach((senderId) => {
          io.to(`user:${senderId}`).emit('message_read', { roomId, readerId: userId });
        });
      } catch (err) {
        socket.emit('error', { message: 'Failed to mark messages as read' });
      }
    });

    socket.on('disconnect', () => {
      // Personal room cleanup is automatic on disconnect
    });
  });
}

module.exports = { initChatSocket };
