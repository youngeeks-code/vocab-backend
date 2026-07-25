const mongoose = require('mongoose');

// Standing hints like "please ask me about food" that sit in a queue
// and get consumed the next time a prompt is generated.
const promptGuidanceSchema = new mongoose.Schema({
  note: { type: String, required: true, trim: true },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('PromptGuidance', promptGuidanceSchema);
