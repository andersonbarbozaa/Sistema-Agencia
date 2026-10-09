const fs = require('fs');
let c = fs.readFileSync('app/api/calendar/route.ts', 'utf8');

c = c.replace(
  /await db\s*\.prepare\([\s\S]*?INSERT INTO calendar_events[\s\S]*?\.run\(\);/,
  (match) => {
    return `    try {
  ${match}
    } catch (dbError: any) {
      if (dbError.message && dbError.message.includes('has no column')) {
        // Auto-fix missing columns
        try { await db.prepare('ALTER TABLE calendar_events ADD COLUMN location TEXT').run(); } catch (e) {}
        try { await db.prepare('ALTER TABLE calendar_events ADD COLUMN google_event_id TEXT').run(); } catch (e) {}
        try { await db.prepare('ALTER TABLE calendar_events ADD COLUMN notes TEXT').run(); } catch (e) {}
        
        // Retry insert
        ${match}
      } else {
        throw dbError;
      }
    }`
  }
);

fs.writeFileSync('app/api/calendar/route.ts', c);
