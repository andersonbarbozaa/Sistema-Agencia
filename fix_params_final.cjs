const fs = require('fs');
const files = [
  'app/api/tasks/[id]/time-logs/route.ts',
  'app/api/tasks/[id]/time-logs/[logId]/route.ts',
  'app/api/tasks/[id]/time-logs/start/route.ts',
  'app/api/tasks/[id]/time-logs/stop/route.ts'
];

for (const f of files) {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/\{\s*params\s*\}:\s*\{\s*params:\s*\{\s*id:\s*string\s*\}\s*\}/g, '{ params }: { params: Promise<{ id: string }> }');
  c = c.replace(/\{\s*params\s*\}:\s*\{\s*params:\s*\{\s*id:\s*string[;,]\s*logId:\s*string\s*\}\s*\}/g, '{ params }: { params: Promise<{ id: string; logId: string }> }');
  
  // also fix params.id
  c = c.replace(/params\.id/g, '(await params).id');
  
  fs.writeFileSync(f, c);
}
