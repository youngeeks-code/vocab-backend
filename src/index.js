require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { connectDB } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const wordsRoutes = require('./routes/words.routes');
const dictionaryRoutes = require('./routes/dictionary.routes');
const promptsRoutes = require('./routes/prompts.routes');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/words', wordsRoutes);
app.use('/api/dictionary', dictionaryRoutes);
app.use('/api/prompts', promptsRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`[server] listening on :${PORT}`));
  })
  .catch((err) => {
    console.error('[db] failed to connect', err);
    process.exit(1);
  });
