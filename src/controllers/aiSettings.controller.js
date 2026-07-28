const AiSettings = require('../models/AiSettings');

// No part of a real key is ever sent back to the client — hasApiKey/apiKeySource
// are the only signal the UI gets, so a saved key can never be read back out
// through this endpoint (only replaced or cleared).
function buildResponse(stored) {
  const envAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);
  return {
    activeProvider: stored?.activeProvider || 'anthropic',
    providers: {
      anthropic: {
        model: stored?.anthropicModel || 'claude-opus-5',
        hasApiKey: Boolean(stored?.anthropicApiKey) || envAnthropicKey,
        apiKeySource: stored?.anthropicApiKey ? 'settings' : envAnthropicKey ? 'env' : null,
      },
      gemini: {
        model: stored?.geminiModel || 'gemini-2.5-pro',
        hasApiKey: Boolean(stored?.geminiApiKey),
        apiKeySource: stored?.geminiApiKey ? 'settings' : null,
      },
    },
  };
}

// GET /api/ai-settings
exports.getSettings = async (req, res, next) => {
  try {
    const stored = await AiSettings.findOne();
    res.json(buildResponse(stored));
  } catch (err) {
    next(err);
  }
};

// PUT /api/ai-settings   { activeProvider, anthropic: { apiKey, model }, gemini: { apiKey, model } }
// Send a provider's apiKey as '' or null to clear just that one.
exports.updateSettings = async (req, res, next) => {
  try {
    const { activeProvider, anthropic, gemini } = req.body;
    const updates = { updatedAt: new Date() };
    if (activeProvider !== undefined) updates.activeProvider = activeProvider;
    if (anthropic?.apiKey !== undefined) updates.anthropicApiKey = anthropic.apiKey || null;
    if (anthropic?.model !== undefined) updates.anthropicModel = anthropic.model;
    if (gemini?.apiKey !== undefined) updates.geminiApiKey = gemini.apiKey || null;
    if (gemini?.model !== undefined) updates.geminiModel = gemini.model;

    const saved = await AiSettings.findOneAndUpdate({}, updates, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });

    res.json(buildResponse(saved));
  } catch (err) {
    next(err);
  }
};
