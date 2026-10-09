const Database = require('better-sqlite3');
const db = new Database('.wrangler/state/v3/d1/miniflare-D1DatabaseObject/08ba44dc-c4b6-4447-b86e-b18420ab56e3.sqlite');
console.log(db.prepare('SELECT id, title FROM calendar_events').all());
