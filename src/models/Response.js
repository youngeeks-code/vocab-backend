const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  promptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prompt', required: true },

  type: { type: String, enum: ['text', 'image'], required: true },

  // For type='text': the actual written text.
  // For type='image': a path/URL to the stored file (upload handling is a placeholder — see routes/responses.routes.js).
  content: { type: String, required: true },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Response', responseSchema);
