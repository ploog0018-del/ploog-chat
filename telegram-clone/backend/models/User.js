const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true }, // we use email field for phone number right now
  name: { type: String, default: '' },
  avatar: { type: String, default: '' },
  bio: { type: String, default: 'Hey there! I am using Ploog.' },
  lastSeen: { type: Date, default: Date.now },
  privacySettings: {
    type: Object,
    default: {
      profilePhoto: 'Everybody',
      lastSeen: 'Everybody'
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
