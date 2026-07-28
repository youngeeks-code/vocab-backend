require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const express = require('express');
const cors = require('cors');

// In Docker, this comes from commit.txt (baked in at build time from whatever
// was checked out — see the Dockerfile's gitinfo stage). In plain `npm run
// dev`, there's no commit.txt, so fall back to asking the local .git directly.
function getCommit() {
  try {
    return fs.readFileSync(path.join(__dirname, '..', 'commit.txt'), 'utf8').trim();
  } catch {
    try {
      return execSync('git rev-parse --short HEAD', { cwd: path.join(__dirname, '..') }).toString().trim();
    } catch {
      return null;
    }
  }
}
const COMMIT = getCommit();

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

app.get('/api/health', (req, res) => res.json({ ok: true, commit: COMMIT }));

// Serves the built frontend (populated by the Docker build's frontend-build
// stage; absent in plain `npm run dev`, where Vite's own dev server is used
// instead, proxying /api and /uploads to this backend). Kept ahead of the
// auth gate: a plain browser navigation/refresh can't attach the
// X-App-Password header, so the HTML/JS/CSS shell itself must load
// unauthenticated — the SPA prompts for the password client-side, then
// attaches it to every subsequent /api call.
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));
app.get(/^(?!\/api|\/uploads).*/, (req, res, next) => {
  res.sendFile(path.join(publicDir, 'index.html'), (err) => {
    if (err) next();
  });
});

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
