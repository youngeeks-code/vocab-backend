const AiSettings = require('../models/AiSettings');

// Never return the raw key — just enough to confirm one is set.
function maskKey(key) {
  if (!key) return null;
  return key.length <= 8 ? '••••' : `${key.slice(0, 7)}...${key.slice(-4)}`;
}

// GET /api/ai-settings
exports.getSettings = async (req, res, next) => {
  try {
    const stored = await AiSettings.findOne();
    const envKeyPresent = Boolean(process.env.ANTHROPIC_API_KEY);
    res.json({
      provider: stored?.provider || 'anthropic',
      model: stored?.model || 'claude-opus-5',
      hasApiKey: Boolean(stored?.apiKey) || envKeyPresent,
      apiKeySource: stored?.apiKey ? 'settings' : envKeyPresent ? 'env' : null,
      apiKeyPreview: maskKey(stored?.apiKey),
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/ai-settings   { apiKey, model, provider }
// Send apiKey: '' or null to clear it (falls back to the env var if set,
// otherwise back to template/pasted-only mode).
exports.updateSettings = async (req, res, next) => {
  try {
    const { apiKey, model, provider } = req.body;
    const updates = { updatedAt: new Date() };
    if (apiKey !== undefined) updates.apiKey = apiKey || null;
    if (model !== undefined) updates.model = model;
    if (provider !== undefined) updates.provider = provider;

    const saved = await AiSettings.findOneAndUpdate({}, updates, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });

    res.json({
      provider: saved.provider,
      model: saved.model,
      hasApiKey: Boolean(saved.apiKey) || Boolean(process.env.ANTHROPIC_API_KEY),
      apiKeyPreview: maskKey(saved.apiKey),
    });
  } catch (err) {
    next(err);
  }
};
