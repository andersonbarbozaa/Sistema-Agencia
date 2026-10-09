const fs = require('fs');

let c = fs.readFileSync('app/api/calendar/route.ts', 'utf8');

const postStart = c.indexOf('export async function POST');
const syncStart = c.indexOf('async function syncWithGoogleCalendar');

const before = c.substring(0, postStart);
const after = c.substring(syncStart);

const newPost = `export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ADMINISTRADOR', 'COLABORADOR'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      event_date,
      start_time,
      end_time,
      client_id,
      project_id,
      location,
    } = body;

    if (!title || !event_date) {
      return NextResponse.json({ error: 'title and event_date are required' }, { status: 400 });
    }

    if (start_time && end_time && start_time >= end_time) {
      return NextResponse.json({ error: 'start_time must be before end_time' }, { status: 400 });
    }

    const db = getDb();
    const id = 'evt_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const now = new Date().toISOString();

    try {
      await db
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
        .run();
    } catch (dbError: any) {
      if (dbError.message && dbError.message.includes('has no column')) {
        try { await db.prepare('ALTER TABLE calendar_events ADD COLUMN location TEXT').run(); } catch(e){}
        try { await db.prepare('ALTER TABLE calendar_events ADD COLUMN google_event_id TEXT').run(); } catch(e){}
        try { await db.prepare('ALTER TABLE calendar_events ADD COLUMN notes TEXT').run(); } catch(e){}
        
        await db
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
          .run();
      } else {
        throw dbError;
      }
    }

    return NextResponse.json({ message: 'Event created successfully', id });
  } catch (error: any) {
    console.error('POST /api/calendar error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// `;

let fixedBefore = before;
// Also fix the corrupted GET that has `const events =     try {`
const corruptedIdx = fixedBefore.indexOf('const events =     try {');
if (corruptedIdx !== -1) {
    fixedBefore = fixedBefore.replace('const events =     try {\n  await db', 'const events = await db');
}

fs.writeFileSync('app/api/calendar/route.ts', fixedBefore + newPost + after);
`;

fs.writeFileSync('autofix_db_hardcode.cjs', c);
