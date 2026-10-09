const fs = require('fs');
let c = fs.readFileSync('app/api/calendar/route.ts', 'utf8');

c = c.replace(/user\.id,\s*wsId,\s*now,\s*now/g, "user.id,\n        now,\n        now");

fs.writeFileSync('app/api/calendar/route.ts', c);
