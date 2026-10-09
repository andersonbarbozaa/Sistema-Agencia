const fs = require('fs');
let c = fs.readFileSync('app/api/calendar/route.ts', 'utf8');
c = c.replace(/return NextResponse\.json\(\{\s*error:\s*'Internal server error'\s*\},/g, "return NextResponse.json({ error: String(error) },");
fs.writeFileSync('app/api/calendar/route.ts', c);
