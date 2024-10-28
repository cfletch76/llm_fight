const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { logBackend } = require('./utils/logger');

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

app.get('/api/conversations', (req, res) => {
  const query = `
    SELECT DISTINCT 
      c1.conversation_id,
      c1.prompt as initial_prompt,
      c1.timestamp
    FROM conversations c1
    INNER JOIN (
      SELECT conversation_id, MIN(timestamp) as first_timestamp
      FROM conversations
      GROUP BY conversation_id
    ) c2 ON c1.conversation_id = c2.conversation_id 
    AND c1.timestamp = c2.first_timestamp
    ORDER BY c1.timestamp DESC
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
    res.json(rows);
  });
});

app.post('/api/conversations', (req, res) => {
  const { conversation_id, prompt, model, response } = req.body;
  
  const insertQuery = `
    INSERT INTO conversations (conversation_id, prompt, model, response)
    VALUES (?, ?, ?, ?)
  `;
  
  db.run(insertQuery, [conversation_id, prompt, model, response], function(err) {
    if (err) {
      const logUrl = logBackend('Database', 'Failed to save conversation', {
        error: err,
        query: insertQuery,
        values: [conversation_id, prompt, model, response]
      });
      return res.status(500).json({ error: 'Failed to save data', logUrl });
    }
    
    res.json({
      id: this.lastID,
      conversation_id,
      prompt,
      model,
      response
    });
  });
});

app.put('/api/conversations/:id/preferred', (req, res) => {
  const { id } = req.params;
  const { preferredModel, prompt } = req.body;

  const updateQuery = `
    UPDATE conversations 
    SET preferred_model = ? 
    WHERE id = ? AND prompt = ?
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

// Add this endpoint to the existing server.js
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
