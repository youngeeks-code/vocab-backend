const AiSettings = require('../models/AiSettings');

// Never return the raw key — just enough to confirm one is set.
function maskKey(key) {
  if (!key) return null;
  return key.length <= 8 ? '••••' : `${key.slice(0, 7)}...${key.slice(-4)}`;
}

function buildResponse(stored) {
  const envAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);
  return {
    activeProvider: stored?.activeProvider || 'anthropic',
    providers: {
      anthropic: {
        model: stored?.anthropicModel || 'claude-opus-5',
        hasApiKey: Boolean(stored?.anthropicApiKey) || envAnthropicKey,
        apiKeySource: stored?.anthropicApiKey ? 'settings' : envAnthropicKey ? 'env' : null,
        apiKeyPreview: maskKey(stored?.anthropicApiKey),
      },
      gemini: {
        model: stored?.geminiModel || 'gemini-2.5-pro',
        hasApiKey: Boolean(stored?.geminiApiKey),
        apiKeySource: stored?.geminiApiKey ? 'settings' : null,
        apiKeyPreview: maskKey(stored?.geminiApiKey),
        note: 'Key can be stored now; live Gemini calls are not wired up yet.',
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
