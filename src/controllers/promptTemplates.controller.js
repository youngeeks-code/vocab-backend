const PromptTemplate = require('../models/PromptTemplate');

// GET /api/prompt-templates/:type/active
exports.getActive = async (req, res, next) => {
  try {
    const template = await PromptTemplate.findOne({ type: req.params.type, active: true });
    if (!template) return res.status(404).json({ error: `No active "${req.params.type}" template found` });
    res.json(template);
  } catch (err) {
    next(err);
  }
};

// GET /api/prompt-templates/:type  -> version history, newest first
exports.listVersions = async (req, res, next) => {
  try {
    const templates = await PromptTemplate.find({ type: req.params.type }).sort({ createdAt: -1 });
    res.json(templates);
  } catch (err) {
    next(err);
  }
};

// GET /api/prompt-templates/:type/:id -> one specific historical version
exports.getVersion = async (req, res, next) => {
  try {
    const template = await PromptTemplate.findOne({ _id: req.params.id, type: req.params.type });
    if (!template) return res.status(404).json({ error: 'Template version not found' });
    res.json(template);
  } catch (err) {
    next(err);
  }
};

// POST /api/prompt-templates/:type   { content }
// "Editing" = saving a new version, which becomes the active one. The
// previous active version is kept, just deactivated — still fetchable in history.
exports.saveNewVersion = async (req, res, next) => {
  try {
    const { type } = req.params;
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });

    await PromptTemplate.updateMany({ type, active: true }, { active: false });
    const created = await PromptTemplate.create({ type, content, active: true });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/prompt-templates/:type/:id/activate
// Rollback — reactivates an older version without deleting anything.
exports.activateVersion = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const target = await PromptTemplate.findOne({ _id: id, type });
    if (!target) return res.status(404).json({ error: 'Template version not found' });

    await PromptTemplate.updateMany({ type, active: true }, { active: false });
    target.active = true;
    await target.save();
    res.json(target);
  } catch (err) {
    next(err);
  }
};
