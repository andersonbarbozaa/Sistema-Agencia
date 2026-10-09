const fs = require('fs');
let c = fs.readFileSync('app/(app)/agenda/page.tsx', 'utf8');

c = c.split("fetch('/api/calendar')").join("fetch('/api/calendar', { cache: 'no-store' })");
c = c.split("fetch('/api/tasks')").join("fetch('/api/tasks', { cache: 'no-store' })");
c = c.split("fetch('/api/clients')").join("fetch('/api/clients', { cache: 'no-store' })");

fs.writeFileSync('app/(app)/agenda/page.tsx', c);
