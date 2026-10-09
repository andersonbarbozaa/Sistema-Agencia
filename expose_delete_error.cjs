const fs = require('fs');
let c = fs.readFileSync('app/api/calendar/[id]/route.ts', 'utf8');

c = c.replace(
  /return NextResponse\.json\(\{\s*error:\s*error\.message\s*\|\|\s*'Internal server error'\s*\},/g,
  "return NextResponse.json({ error: 'Server Error: ' + String(error) },"
);

fs.writeFileSync('app/api/calendar/[id]/route.ts', c);
