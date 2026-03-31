const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  ],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null,
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Enforce uniqueness: sort participant IDs before saving (done in controller)
// This index ensures no duplicate rooms for the same pair
chatRoomSchema.index({ participants: 1 }, { unique: true });

module.exports = mongoose.model('ChatRoom', chatRoomSchema);
