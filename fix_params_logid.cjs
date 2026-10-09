const fs = require('fs');
const files = [
  'app/api/tasks/[id]/time-logs/[logId]/route.ts'
];

for (const f of files) {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/params\.logId/g, '(await params).logId');
  fs.writeFileSync(f, c);
}
