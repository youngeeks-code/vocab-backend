const PromptTemplate = require('../models/PromptTemplate');
const Word = require('../models/Word');
const PromptGuidance = require('../models/PromptGuidance');
const { isDue, sortByPriorityThenNeglect } = require('../utils/dueLogic');
const { renderTemplate } = require('../utils/promptTemplate');
const { formatWordListForAI, formatWordListForCopy } = require('../services/aiService');

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

// POST /api/prompt-templates/:type/preview   { content, minWords?, maxWords?, topicRequest? }
// Framework for testing a template before saving it — renders `content`
// (not yet saved anywhere) against real current due-word data, using the
// exact same renderTemplate() call the real generation path uses. No DB
// writes, nothing activated. Does NOT call an AI provider — that's left for
// the user to do themselves for now (copy the rendered text out, same as
// the existing copy-paste flow); this is the seam a later "test live" button
// would plug into.
exports.previewTemplate = async (req, res, next) => {
  try {
    const { type } = req.params;
    const { content, minWords = 3, maxWords = 7, topicRequest = '' } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });

    const words = await Word.find();
    const dueWords = sortByPriorityThenNeglect(words.filter(isDue));

    const pendingGuidance = await PromptGuidance.find({ used: false });
    const guidanceNotes = pendingGuidance.map((g) => g.note);
    const topicGuidance = [...guidanceNotes, topicRequest].filter(Boolean).join('; ');

    const wordList = type === 'ai' ? formatWordListForAI(dueWords) : formatWordListForCopy(dueWords);

    const rendered = renderTemplate(content, {
      WORD_LIST: wordList,
      MIN_WORDS: minWords,
      MAX_WORDS: maxWords,
      TOPIC_GUIDANCE: topicGuidance,
    });

    res.json({ rendered });
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
