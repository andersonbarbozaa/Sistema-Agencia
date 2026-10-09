const fs = require('fs');
let c = fs.readFileSync('app/api/calendar/route.ts', 'utf8');

c = c.replace(
`        client_id || null,
        project_id || null,
        
        location ?? null,
        
        user.id,
        wsId,
        now,
        now
      )`,
`        client_id || null,
        project_id || null,
        location ?? null,
        user.id,
        now,
        now
      )`
);

fs.writeFileSync('app/api/calendar/route.ts', c);
