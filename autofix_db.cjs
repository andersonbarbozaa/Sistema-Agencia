const fs = require('fs');
let c = fs.readFileSync('app/api/calendar/route.ts', 'utf8');

const insertBlock = `    await db
      .prepare(
        \`INSERT INTO calendar_events
          (id, title, description, event_date, start_time, end_time, client_id, project_id, location, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`
      )
      .bind(
        id,
        title,
        description ?? null,
        event_date,
        start_time ?? null,
        end_time ?? null,
        client_id || null,
        project_id || null,
        
        location ?? null,
        
        user.id,
        now,
        now
      )
      .run();`;

const replacement = `    try {
${insertBlock}
    } catch (dbError: any) {
      if (dbError.message && dbError.message.includes('has no column')) {
        // Auto-fix missing columns
        try { await db.prepare('ALTER TABLE calendar_events ADD COLUMN location TEXT').run(); } catch (e) {}
        try { await db.prepare('ALTER TABLE calendar_events ADD COLUMN google_event_id TEXT').run(); } catch (e) {}
        try { await db.prepare('ALTER TABLE calendar_events ADD COLUMN notes TEXT').run(); } catch (e) {}
        
        // Retry insert
${insertBlock}
      } else {
        throw dbError;
      }
    }`;

c = c.replace(insertBlock, replacement);
fs.writeFileSync('app/api/calendar/route.ts', c);
