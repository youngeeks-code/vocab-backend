const mongoose = require('mongoose');

// Singleton document. Credentials for multiple providers can be stored
// independently — a key can be added ahead of using it — while
// activeProvider decides which one generatePromptWithAI actually calls.
const aiSettingsSchema = new mongoose.Schema({
  activeProvider: { type: String, enum: ['anthropic', 'gemini'], default: 'anthropic' },

  anthropicApiKey: { type: String, default: null },
  anthropicModel: { type: String, default: 'claude-opus-5' },

  // Gemini key can be stored now for later — live calling isn't wired up
  // yet (see aiService.js), only Anthropic is implemented so far.
  geminiApiKey: { type: String, default: null },
  geminiModel: { type: String, default: 'gemini-2.5-pro' },

  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('AiSettings', aiSettingsSchema);
