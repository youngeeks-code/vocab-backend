require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const { connectDB } = require('./config/db');
const { seedPromptTemplates } = require('./config/seedPromptTemplates');
const errorHandler = require('./middleware/errorHandler');
const auth = require('./middleware/auth');

const wordsRoutes = require('./routes/words.routes');
const dictionaryRoutes = require('./routes/dictionary.routes');
const promptsRoutes = require('./routes/prompts.routes');
const promptTemplatesRoutes = require('./routes/promptTemplates.routes');
const aiSettingsRoutes = require('./routes/aiSettings.routes');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use(auth);

// Served after auth so uploaded images are gated the same as the API once APP_PASSWORD is set.
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/words', wordsRoutes);
app.use('/api/dictionary', dictionaryRoutes);
app.use('/api/prompts', promptsRoutes);
app.use('/api/prompt-templates', promptTemplatesRoutes);
app.use('/api/ai-settings', aiSettingsRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => seedPromptTemplates())
  .then(() => {
    app.listen(PORT, () => console.log(`[server] listening on :${PORT}`));
  })
  .catch((err) => {
    console.error('[db] failed to connect', err);
    process.exit(1);
  });
