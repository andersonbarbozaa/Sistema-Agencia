const fs = require('fs');
const glob = require('glob');

const files = glob.sync('app/api/tasks/[id]/time-logs/**/*.ts');
for (const f of files) {
  let c = fs.readFileSync(f, 'utf8');
  // Replace `{ params }: { params: { id: string... } }` with `{ params }: { params: Promise<{ id: string... }> }`
  c = c.replace(/\{ params \}: \{ params: \{([^}]+)\};? \}/g, '{ params }: { params: Promise<{$1}> }');
  // also inject `await params`
  c = c.replace(/const \{([^}]+)\} = params;/g, 'const {$1} = await params;');
  // Or if they used it directly like params.id
  c = c.replace(/params\.id/g, '(await params).id');
  c = c.replace(/params\.logId/g, '(await params).logId');
  
  fs.writeFileSync(f, c);
}
