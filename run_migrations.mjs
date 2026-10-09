import sqlite from 'node:sqlite';
import fs from 'node:fs';

const db = new sqlite.DatabaseSync('.data/local.db');

const schema = fs.readFileSync('clean_setup.sql', 'utf8');

const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 0);

for (const stmt of statements) {
  try {
    db.exec(stmt);
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.error('Error executing statement:', stmt.substring(0, 50));
      console.error(err.message);
    }
  }
}

console.log('Database initialized successfully in .data/local.db');
