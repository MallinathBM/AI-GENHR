const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user','bot'], required: true },
  text: { type: String, required: true },
  at: { type: Date, default: Date.now }
}, { _id: false });

const ChatSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, trim: true },
  messages: { type: [MessageSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ChatSessionSchema.pre('save', function(next){ this.updatedAt = Date.now(); next(); });

ChatSessionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('ChatSession', ChatSessionSchema);
