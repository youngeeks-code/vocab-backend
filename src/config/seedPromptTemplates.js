// First-boot defaults for the two versioned template slots (see PromptTemplate.js).
// These files are only ever read here — once seeded, editing happens through
// the /api/prompt-templates API and lives in the DB, not these files. If the
// DB is ever wiped, restarting reseeds from whatever these files currently say.
const fs = require('fs');
const path = require('path');
const PromptTemplate = require('../models/PromptTemplate');

const DEFAULT_FILES = {
  ai: path.join(__dirname, 'promptTemplate.ai.txt'),
  copy: path.join(__dirname, 'promptTemplate.copy.txt'),
};

async function seedPromptTemplates() {
  for (const [type, filePath] of Object.entries(DEFAULT_FILES)) {
    const existing = await PromptTemplate.findOne({ type, active: true });
    if (existing) continue;

    const content = fs.readFileSync(filePath, 'utf8');
    await PromptTemplate.create({ type, content, active: true });
    console.log(`[seed] created default active "${type}" prompt template`);
  }
}

module.exports = { seedPromptTemplates };
