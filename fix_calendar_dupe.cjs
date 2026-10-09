const fs = require('fs');
let c = fs.readFileSync('app/api/calendar/route.ts', 'utf8');

c = c.replace(
  /const tasks = await db\.prepare\(`SELECT t\.id[\s\S]*?const allItems = \[\.\.\.\(events\.results \|\| \[\]\)\.map\(\(e: any\) => \(\{\.\.\.e, type: 'event'\}\)\), \.\.\.\(tasks\.results \|\| \[\]\)\];\s*return NextResponse\.json\(\{ data: allItems \}\);/,
  "return NextResponse.json({ data: events.results || [] });"
);

fs.writeFileSync('app/api/calendar/route.ts', c);
