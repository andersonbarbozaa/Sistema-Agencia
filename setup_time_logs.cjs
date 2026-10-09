const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const dbPath = path.resolve(__dirname, '.data', 'local.db');
console.log('Connecting to DB at:', dbPath);

const db = new DatabaseSync(dbPath);

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_time_logs (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration_seconds INTEGER,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  console.log('task_time_logs table created successfully.');
} catch (err) {
  console.error('Error creating table:', err);
} finally {
  db.close();
}
