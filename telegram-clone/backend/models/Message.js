const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: { type: String, required: true }, // email / phone
  receiverId: { type: String, required: true }, // email / phone
  chatId: { type: String, required: true }, // either receiverId or a composite ID
  content: { type: String, required: true }, // This will be encrypted string
  timestamp: { type: Date, default: Date.now },
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  type: { type: String, default: 'text' }, // text, file, image
  fileName: { type: String },
  fileSize: { type: Number },
  fileUrl: { type: String },
  isForwarded: { type: Boolean, default: false }
}, { timestamps: true });

// Indexing for faster queries when fetching chat history
messageSchema.index({ senderId: 1, receiverId: 1 });
messageSchema.index({ chatId: 1 });

module.exports = mongoose.model('Message', messageSchema);
