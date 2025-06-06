const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  room: String,
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  message: String,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Message || mongoose.model('Message', messageSchema);