const mongoose = require('mongoose');

const ALLOWED_ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const messageSchema = new mongoose.Schema({
  chatRoom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatRoom',
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    default: '',
  },
  attachmentUrl: {
    type: String,
    default: null,
  },
  attachmentType: {
    type: String,
    enum: ALLOWED_ATTACHMENT_TYPES,
    default: null,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

messageSchema.index({ chatRoom: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
module.exports.ALLOWED_ATTACHMENT_TYPES = ALLOWED_ATTACHMENT_TYPES;
