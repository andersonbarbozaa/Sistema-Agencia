const fs = require('fs');
const glob = require('glob');

const files = glob.sync('app/api/tasks/[id]/time-logs/**/*.ts');
for (const f of files) {
  let c = fs.readFileSync(f, 'utf8');
  
  // replace { params }: { params: { id: string } }
  c = c.replace(/\{ params \}:\s*\{\s*params:\s*\{\s*id:\s*string\s*\}\s*\}/g, '{ params }: { params: Promise<{ id: string }> }');
  
  // replace { params }: { params: { id: string; logId: string } }
  c = c.replace(/\{ params \}:\s*\{\s*params:\s*\{\s*id:\s*string;\s*logId:\s*string\s*\}?\s*\}/g, '{ params }: { params: Promise<{ id: string; logId: string }> }');

  // replace { params }: { params: { id: string, logId: string } }
  c = c.replace(/\{ params \}:\s*\{\s*params:\s*\{\s*id:\s*string,\s*logId:\s*string\s*\}?\s*\}/g, '{ params }: { params: Promise<{ id: string; logId: string }> }');

  fs.writeFileSync(f, c);
}
