const fs = require('fs');
let c = fs.readFileSync('app/(app)/agenda/page.tsx', 'utf8');

c = c.split('const res = await fetch(`/api/calendar?month=${month + 1}&year=${year}`);').join('const res = await fetch(`/api/calendar?month=${month + 1}&year=${year}`, { cache: "no-store" });');

fs.writeFileSync('app/(app)/agenda/page.tsx', c);
