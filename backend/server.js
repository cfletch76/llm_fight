process.removeAllListeners('warning');
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { logBackend } = require('./utils/logger');
const openAIService = require('./services/openai-service');
const anthropicService = require('./services/anthropic-service');
const llamaService = require('./services/llama-service');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(bodyParser.json());
app.use('/logs', express.static(path.join(__dirname, '../frontend/logs')));

const dbPath = path.resolve(__dirname, 'llm-fight.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    logBackend('Database', 'Error opening database', err);
  } else {
    logBackend('Database', 'Connected to SQLite database');
    db.run(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id TEXT NOT NULL,
        prompt TEXT NOT NULL,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        response TEXT NOT NULL,
        preferred_model TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `, (err) => {
      if (err) {
        logBackend('Database', 'Error creating conversations table', err);
      } else {
        logBackend('Database', 'Conversations table is ready');
      }
    });
  }
});

const modelServices = {
  openai: openAIService,
  anthropic: anthropicService,
  meta: llamaService
};

app.get('/api/models', async (req, res) => {
  try {
    const [openAIModels, anthropicModels] = await Promise.all([
      openAIService.getAvailableModels(),
      anthropicService.getAvailableModels()
    ]);

    const models = {
      openai: openAIModels,
      anthropic: anthropicModels,
      meta: {
        'llama-3-70b': 'LLaMA 3 70B',
        'llama-2-70b': 'LLaMA 2 70B',
        'llama-2-13b': 'LLaMA 2 13B'
      }
    };

    res.json(models);
  } catch (error) {
    logBackend('API', 'Error fetching models', { error });
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

app.get('/api/conversations', (req, res) => {
  const query = `
    SELECT DISTINCT
      conversation_id,
      prompt as initial_prompt,
      MIN(timestamp) as timestamp
    FROM conversations
    GROUP BY conversation_id
    ORDER BY timestamp DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      const logUrl = logBackend('Database', 'Failed to fetch conversations', { error: err });
      return res.status(500).json({ error: 'Failed to fetch data', logUrl });
    }
    res.json(rows);
  });
});

app.get('/api/conversations/:id', (req, res) => {
  const query = `
    SELECT *
    FROM conversations
    WHERE conversation_id = ?
    ORDER BY timestamp ASC
  `;

  db.all(query, [req.params.id], (err, rows) => {
    if (err) {
      const logUrl = logBackend('Database', 'Failed to fetch conversation details', { error: err });
      return res.status(500).json({ error: 'Failed to fetch data', logUrl });
    }

    const groupedResponses = rows.reduce((acc, row) => {
      if (!acc[row.prompt]) {
        acc[row.prompt] = {
          prompt: row.prompt,
          responses: {},
          preferredModel: row.preferred_model,
          timestamp: row.timestamp,
          conversation_id: row.conversation_id
        };
      }
      acc[row.prompt].responses[row.provider] = {
        id: row.id,
        model: row.model,
        response: row.response
      };
      return acc;
    }, {});

    res.json(Object.values(groupedResponses));
  });
});

app.post('/api/generate', async (req, res) => {
  const { prompt, conversationId, provider, modelVersion } = req.body;
  const actualConversationId = conversationId || uuidv4();
  
  try {
    logBackend(provider, 'Generating response', { model: modelVersion, prompt });
    const service = modelServices[provider];
    const response = await service.generateResponse(prompt, modelVersion);

    const insertQuery = `
      INSERT INTO conversations (conversation_id, prompt, provider, model, response)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.run(insertQuery, [actualConversationId, prompt, provider, response.model, response.response], function(err) {
      if (err) {
        const logUrl = logBackend('Database', 'Failed to save conversation', {
          error: err,
          query: insertQuery,
          values: [actualConversationId, prompt, provider, response.model, response.response]
        });
        return res.status(500).json({ error: 'Failed to save data', logUrl });
      }

      res.json({
        id: this.lastID,
        conversation_id: actualConversationId,
        ...response
      });
    });
  } catch (error) {
    const logUrl = logBackend('API', 'Model generation failed', { error });
    res.status(500).json({ error: 'Failed to generate response', logUrl });
  }
});

app.put('/api/conversations/:id/preferred', (req, res) => {
  const { id } = req.params;
  const { preferredModel, prompt } = req.body;

  const updateQuery = `
    UPDATE conversations
    SET preferred_model = ?
    WHERE conversation_id = (
      SELECT conversation_id FROM conversations WHERE id = ?
    )
    AND prompt = ?
  `;

  db.run(updateQuery, [preferredModel, id, prompt], function(err) {
    if (err) {
      const logUrl = logBackend('Database', 'Failed to update preferred model', {
        error: err,
        query: updateQuery,
        params: [preferredModel, id, prompt]
      });
      return res.status(500).json({ error: 'Failed to update data', logUrl });
    }

    res.json({
      message: 'Preferred model updated successfully',
      changes: this.changes,
      id,
      prompt,
      preferredModel
    });
  });
});

app.post('/api/conversations/clear', (req, res) => {
  const query = 'DELETE FROM conversations';
  db.run(query, [], (err) => {
    if (err) {
      const logUrl = logBackend('Database', 'Failed to clear conversations', { error: err });
      return res.status(500).json({ error: 'Failed to clear data', logUrl });
    }
    logBackend('Database', 'Successfully cleared all conversations');
    res.json({ message: 'All conversations cleared successfully' });
  });
});

app.listen(PORT, () => {
  const message = `Server started on port ${PORT}`;
  console.log(message);
  logBackend('Server', message);
});
