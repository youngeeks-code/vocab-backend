const mongoose = require('mongoose');

// Singleton document — there is only ever one of these per deployment.
// Bring-your-own-key: whoever runs this instance pastes their own Anthropic
// API key in here (via /api/ai-settings), so no key is baked into the app.
const aiSettingsSchema = new mongoose.Schema({
  provider: { type: String, default: 'anthropic' },
  apiKey: { type: String, default: null },
  model: { type: String, default: 'claude-opus-5' },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('AiSettings', aiSettingsSchema);
